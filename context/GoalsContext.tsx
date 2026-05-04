import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getKSTDateStr = (date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
};

export const PALETTE = [
  '#FF6B6B', '#FF9F43', '#FDCB6E', '#1DD1A1', '#00D2D3',
  '#48DBFB', '#54A0FF', '#5F27CD', '#8E44AD', '#FD79A8',
  '#FF9FF3', '#F368E0', '#FF4757', '#FFA502', '#2ED573',
  '#7BED9F', '#70A1FF', '#5352ED', '#3742FA', '#A4B0BE'
];

export const GoalsContext = createContext<any>(null);

export const GoalsProvider = ({ children }: { children: React.ReactNode }) => {
  const [goals, setGoals] = useState<any[]>([]);
  const [memos, setMemos] = useState<any>({});
  const [ddays, setDdays] = useState<any[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedGoals, savedMemos, savedDdays] = await Promise.all([
          AsyncStorage.getItem('goals'), AsyncStorage.getItem('memos'), AsyncStorage.getItem('ddays')
        ]);
        if (savedGoals) setGoals(JSON.parse(savedGoals));
        if (savedMemos) setMemos(JSON.parse(savedMemos));
        if (savedDdays) setDdays(JSON.parse(savedDdays));
      } catch (e) { console.error('Data Load Error', e); }
      finally { setIsDataLoaded(true); }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      AsyncStorage.setItem('goals', JSON.stringify(goals));
      AsyncStorage.setItem('memos', JSON.stringify(memos));
      AsyncStorage.setItem('ddays', JSON.stringify(ddays));
    }
  }, [goals, memos, ddays, isDataLoaded]);

  const distribute = (amount: number, startStr: string, endStr: string, daysArr: string[], style: string, customDailyQuota: number) => {
    const map: any = {};
    if (!endStr || !daysArr || daysArr.length === 0) return map;
    
    const activeDates: string[] = [];
    let temp = new Date(startStr);
    temp.setHours(0, 0, 0, 0);
    const [y, m, d] = endStr.split('-');
    const end = new Date(Number(y), Number(m) - 1, Number(d));
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    while (temp <= end) {
      if (daysArr.includes(dayNames[temp.getDay()])) activeDates.push(getKSTDateStr(temp));
      temp.setDate(temp.getDate() + 1);
    }
    activeDates.sort();

    let rem = amount;
    if (activeDates.length > 0 && rem > 0) {
      if (style === 'custom') {
        activeDates.forEach(date => {
          let alloc = Math.min(rem, customDailyQuota || 0);
          map[date] = alloc;
          rem -= alloc;
        });
      } else { 
        const base = Math.floor(rem / activeDates.length);
        const remainder = rem % activeDates.length;
        activeDates.forEach((date, idx) => {
          map[date] = idx < remainder ? base + 1 : base;
        });
      }
    } else if (activeDates.length > 0) {
      activeDates.forEach(date => { map[date] = 0; });
    }
    return map;
  };

  const processedGoals = goals.map(g => {
    let currentTotal = 0;
    const clampedCurrentMap: any = {};

    Object.keys(g.currentMap || {}).forEach(date => {
      const maxAllowed = Number(g.scheduleMap?.[date] || 0);
      const actualDone = Number(g.currentMap[date] || 0);
      const clamped = Math.min(actualDone, maxAllowed);
      clampedCurrentMap[date] = clamped;
      currentTotal += clamped;
    });

    return { ...g, currentMap: clampedCurrentMap, current: currentTotal };
  });

  return (
    <GoalsContext.Provider value={{
      goals: processedGoals, memos, ddays, setDdays,
      addGoal: (data: any) => {
        const scheduleMap = distribute(data.total, getKSTDateStr(), data.endDate, data.days, data.distributionStyle, data.customDailyQuota);
        setGoals([...goals, { ...data, id: Date.now().toString(), currentMap: {}, scheduleMap }]);
      },
      updateGoal: (id: string, data: any) => {
        setGoals(goals.map(g => {
          if (g.id === id) {
            const todayKST = getKSTDateStr();
            let pastScheduleMap: any = {};
            let pastAllocated = 0;
            
            Object.keys(g.scheduleMap || {}).forEach(d => {
              if (d < todayKST) {
                pastScheduleMap[d] = g.scheduleMap[d];
                pastAllocated += g.scheduleMap[d];
              }
            });
            const remainingTotal = Math.max(0, data.total - pastAllocated);
            const futureScheduleMap = distribute(remainingTotal, todayKST, data.endDate, data.days, data.distributionStyle, data.customDailyQuota);
            
            return { ...g, ...data, scheduleMap: { ...pastScheduleMap, ...futureScheduleMap }, customSchedule: {} };
          }
          return g;
        }));
      },
      deleteGoal: (id: string) => setGoals(goals.filter(g => g.id !== id)),

      updateGoalCurrent: (id: string, date: string, amount: number) => {
        setGoals(goals.map(g => {
          if (g.id !== id) return g;

          const scheduledToday = Number(g.scheduleMap[date] || 0);
          const oldCurrent = Number(g.currentMap?.[date] || 0);
          const amountNum = Number(amount);

          const newCurrent = Math.max(0, Math.min(scheduledToday, oldCurrent + amountNum));

          if (newCurrent === oldCurrent) return g;

          const newCurrentMap = { ...g.currentMap, [date]: newCurrent };
          return { ...g, currentMap: newCurrentMap };
        }));
      },

      updateGoalScheduleMap: (id: string, newScheduleMap: any) => {
        setGoals(goals.map(g => g.id === id ? { ...g, scheduleMap: newScheduleMap } : g));
      },
      addMemo: (date: string, text: string) => setMemos((prev: any) => ({ ...prev, [date]: [...(prev[date] || []), { id: Date.now().toString(), text, completed: false }] })),
      deleteMemo: (date: string, id: string) => setMemos((prev: any) => ({ ...prev, [date]: prev[date].filter((m: any) => m.id !== id) })),
      toggleMemo: (date: string, id: string) => setMemos((prev: any) => ({ ...prev, [date]: prev[date].map((m: any) => m.id === id ? { ...m, completed: !m.completed } : m) }))
    }}>
      {children}
    </GoalsContext.Provider>
  );
};