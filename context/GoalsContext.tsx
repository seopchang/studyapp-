import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  doc, onSnapshot, setDoc, Timestamp
} from 'firebase/firestore';
import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { auth, db } from './firebase';

export const getKSTDateStr = (date = new Date()) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
};

// dayEndHour: 0=자정, 1~6=다음날 새벽 N시까지를 전날로 봄
export const getTodayWithEndHour = (dayEndHour: number): string => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (3600000 * 9));
  if (dayEndHour > 0 && kst.getHours() < dayEndHour) {
    kst.setDate(kst.getDate() - 1);
  }
  return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, '0')}-${String(kst.getDate()).padStart(2, '0')}`;
};

export const isPastDateFn = (dateStr: string, dayEndHour: number): boolean => {
  return dateStr < getTodayWithEndHour(dayEndHour);
};

// 'YYYY-MM-DD' 문자열을 로컬 타임존 기준 Date로 파싱 (UTC 오해석 방지)
export const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const PALETTE = [
  '#FF3B30', '#FF6B6B', '#FF4757', '#C0392B',
  '#FF9500', '#FF9F43', '#FFA502', '#F39C12',
  '#34C759', '#2ED573', '#1DD1A1', '#27AE60',
  '#007AFF', '#54A0FF', '#00D2D3', '#2980B9',
  '#AF52DE', '#5F27CD', '#FD79A8', '#E91E63',
  '#636E72', '#2C3E50',
];

export const GoalsContext = createContext<any>(null);

// 일별 달성률 스냅샷 타입
export type DailyStatEntry = {
  overall: number;  // 전체 달성률 (0~100, -1 = 계획 없음)
  goals: number;
  tasks: number;
  routines: number;
  projects: number; // BUG-20 수정: projectRate 필드 추가
};

// 프로젝트 타입 정의
export type ProjectStep = {
  id: string;
  name: string;
  assignedDate: string;
  completed: boolean;
};

export type Project = {
  id: string;
  name: string;
  color: string;
  endDate: string;
  steps: ProjectStep[];
};

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
function pruneOldData(memos: any): any {
  const cutoff = getKSTDateStr(new Date(Date.now() - ONE_YEAR_MS));
  const pruned: any = {};
  Object.keys(memos).forEach(date => {
    if (date >= cutoff) pruned[date] = memos[date];
  });
  return pruned;
}

export const GoalsProvider = ({ children }: { children: React.ReactNode }) => {
  const [goals, setGoals] = useState<any[]>([]);
  const [memos, setMemos] = useState<any>({});
  const [routines, setRoutines] = useState<any[]>([]);
  const [routineRecords, setRoutineRecords] = useState<any>({});
  const [ddays, setDdays] = useState<any[]>([]);
  const [dayOffs, setDayOffs] = useState<string[]>([]);
  const [dayEndHour, setDayEndHour] = useState<number>(0);
  const [showTimeline, setShowTimeline] = useState<boolean>(true);
  const [showRoutinesTab, setShowRoutinesTab] = useState<boolean>(true);
  const [showProjectsTab, setShowProjectsTab] = useState<boolean>(true);
  const [showTasksHome, setShowTasksHome] = useState<boolean>(true);
  const [showRoutinesHome, setShowRoutinesHome] = useState<boolean>(true);
  const [showProjectsHome, setShowProjectsHome] = useState<boolean>(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStatEntry>>({});

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const remoteUpdateCountRef = useRef(0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        subscribeToFirestore(u.uid);
      } else {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        loadLocal();
      }
    });
    return () => unsub();
  }, []);

  const subscribeToFirestore = (uid: string) => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    const dataRef = doc(db, 'users', uid, 'data', 'main');
    const unsub = onSnapshot(dataRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (snap.metadata.hasPendingWrites) {
          setIsDataLoaded(true);
          return;
        }
        remoteUpdateCountRef.current += 1;
        const token = remoteUpdateCountRef.current;
        if (d.goals) setGoals(d.goals);
        if (d.memos) setMemos(d.memos);
        if (d.routines) setRoutines(d.routines);
        if (d.routineRecords) setRoutineRecords(d.routineRecords);
        if (d.ddays) setDdays(d.ddays);
        if (d.dayOffs) setDayOffs(d.dayOffs);
        if (d.dayEndHour !== undefined) setDayEndHour(d.dayEndHour);
        if (d.showTimeline !== undefined) setShowTimeline(d.showTimeline);
        if (d.showRoutinesTab !== undefined) setShowRoutinesTab(d.showRoutinesTab);
        if (d.showProjectsTab !== undefined) setShowProjectsTab(d.showProjectsTab);
        if (d.showTasksHome !== undefined) setShowTasksHome(d.showTasksHome);
        if (d.showRoutinesHome !== undefined) setShowRoutinesHome(d.showRoutinesHome);
        if (d.showProjectsHome !== undefined) setShowProjectsHome(d.showProjectsHome);
        if (d.dailyStats) setDailyStats(d.dailyStats);
        if (d.projects) setProjects(d.projects);
        setTimeout(() => {
          if (remoteUpdateCountRef.current === token) {
            remoteUpdateCountRef.current = 0;
          }
        }, 0);
      }
      setIsDataLoaded(true);
    }, () => {
      loadLocal();
    });
    unsubscribeRef.current = unsub;
  };

  const loadLocal = async () => {
    try {
      const [sg, sm, sr, srr, sd, sdo, sdeh, stl, srt, spt, sth, srh, sph, sds, sproj] = await Promise.all([
        AsyncStorage.getItem('goals'),
        AsyncStorage.getItem('memos'),
        AsyncStorage.getItem('routines'),
        AsyncStorage.getItem('routineRecords'),
        AsyncStorage.getItem('ddays'),
        AsyncStorage.getItem('dayOffs'),
        AsyncStorage.getItem('dayEndHour'),
        AsyncStorage.getItem('showTimeline'),
        AsyncStorage.getItem('showRoutinesTab'),
        AsyncStorage.getItem('showProjectsTab'),
        AsyncStorage.getItem('showTasksHome'),
        AsyncStorage.getItem('showRoutinesHome'),
        AsyncStorage.getItem('showProjectsHome'),
        AsyncStorage.getItem('dailyStats'),
        AsyncStorage.getItem('projects'),
      ]);
      try { if (sg) setGoals(JSON.parse(sg)); } catch {}
      try { if (sm) setMemos(JSON.parse(sm)); } catch {}
      try { if (sr) setRoutines(JSON.parse(sr)); } catch {}
      try { if (srr) setRoutineRecords(JSON.parse(srr)); } catch {}
      try { if (sd) setDdays(JSON.parse(sd)); } catch {}
      try { if (sdo) setDayOffs(JSON.parse(sdo)); } catch {}
      try { if (sdeh !== null) setDayEndHour(JSON.parse(sdeh)); } catch {}
      try { if (stl !== null) setShowTimeline(JSON.parse(stl)); } catch {}
      try { if (srt !== null) setShowRoutinesTab(JSON.parse(srt)); } catch {}
      try { if (spt !== null) setShowProjectsTab(JSON.parse(spt)); } catch {}
      try { if (sth !== null) setShowTasksHome(JSON.parse(sth)); } catch {}
      try { if (srh !== null) setShowRoutinesHome(JSON.parse(srh)); } catch {}
      try { if (sph !== null) setShowProjectsHome(JSON.parse(sph)); } catch {}
      try { if (sds) setDailyStats(JSON.parse(sds)); } catch {}
      try { if (sproj) setProjects(JSON.parse(sproj)); } catch {}
    } catch (e) { console.error('Local load error', e); }
    finally { setIsDataLoaded(true); }
  };

  // ── 스냅샷 로직 ────────────────────────────────────────────────
  useEffect(() => {
    if (!isDataLoaded) return;

    const today = getTodayWithEndHour(dayEndHour);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const allDates = new Set<string>();
    goals.forEach(g => Object.keys(g.scheduleMap || {}).forEach(d => allDates.add(d)));
    // memos: assignedDate 기준으로 날짜 수집 (이동된 메모 포함)
    Object.values(memos as Record<string, any[]>).forEach(items =>
      items.forEach((m: any) => { if (m.assignedDate) allDates.add(m.assignedDate); })
    );
    Object.keys(memos).forEach(d => allDates.add(d));
    projects.forEach(p => p.steps.forEach(s => { if (s.assignedDate) allDates.add(s.assignedDate); }));

    let changed = false;
    const newStats = { ...dailyStats };

    allDates.forEach(date => {
      if (date >= today) return;
      if (newStats[date] !== undefined) return;

      // 목표 달성률
      let goalSched = 0, goalDone = 0;
      goals.forEach(g => {
        const s = Number(g.scheduleMap?.[date] || 0);
        const done = Math.min(Number(g.currentMap?.[date] || 0), s);
        goalSched += s;
        goalDone += done;
      });
      const goalRate = goalSched > 0 ? Math.round((goalDone / goalSched) * 100) : -1;

      // 태스크 달성률 (assignedDate 기준 통일)
      const dateMemos = (Object.entries(memos) as [string, any[]][])
        .flatMap(([k, items]) => items.map((m: any) => ({ ...m, _originKey: k })))
        .filter((m: any) => (m.assignedDate ?? m._originKey) === date);
      const taskRate = dateMemos.length > 0
        ? Math.round((dateMemos.filter((m: any) => m.completed).length / dateMemos.length) * 100)
        : -1;

      // 루틴 달성률 (dayOff 포함 체크)
      const [y, mo, d] = date.split('-').map(Number);
      const dayName = dayNames[new Date(y, mo - 1, d).getDay()];
      const isDayOff = (dayOffs || []).includes(date);
      const dayRoutines = isDayOff ? [] : routines.filter(r =>
        r.days.includes(dayName) && r.endDate >= date && (!r.startDate || r.startDate <= date)
      );
      const dRecords = routineRecords[date] || [];
      const routineRate = dayRoutines.length > 0
        ? Math.round((dayRoutines.filter(r => dRecords.includes(r.id)).length / dayRoutines.length) * 100)
        : -1;

      // 프로젝트 스텝 달성률 (BUG-20 수정: projectRate 계산 및 저장)
      const dateSteps = projects.flatMap(p => p.steps.filter(s => s.assignedDate === date));
      const projectRate = dateSteps.length > 0
        ? Math.round((dateSteps.filter(s => s.completed).length / dateSteps.length) * 100)
        : -1;

      // 전체 달성률
      let allTotal = 0, allDone = 0;
      if (goalSched > 0) { allTotal += goalSched; allDone += goalDone; }
      if (dateMemos.length > 0) { allTotal += dateMemos.length; allDone += dateMemos.filter((m: any) => m.completed).length; }
      if (dayRoutines.length > 0) { allTotal += dayRoutines.length; allDone += dayRoutines.filter(r => dRecords.includes(r.id)).length; }
      if (dateSteps.length > 0) { allTotal += dateSteps.length; allDone += dateSteps.filter(s => s.completed).length; }
      const overallRate = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : -1;

      if (overallRate < 0) return;

      newStats[date] = {
        overall: overallRate,
        goals: goalRate,
        tasks: taskRate,
        routines: routineRate,
        projects: projectRate, // BUG-20 수정
      };
      changed = true;
    });

    if (changed) setDailyStats(newStats);
  }, [isDataLoaded, goals, memos, routines, routineRecords, projects, dayEndHour, dayOffs, dailyStats]);

  // ── 저장/동기화 ────────────────────────────────────────────────
  useEffect(() => {
    if (!isDataLoaded || remoteUpdateCountRef.current > 0) return;

    AsyncStorage.setItem('goals', JSON.stringify(goals)).catch(console.error);
    AsyncStorage.setItem('memos', JSON.stringify(memos)).catch(console.error);
    AsyncStorage.setItem('routines', JSON.stringify(routines)).catch(console.error);
    AsyncStorage.setItem('routineRecords', JSON.stringify(routineRecords)).catch(console.error);
    AsyncStorage.setItem('ddays', JSON.stringify(ddays)).catch(console.error);
    AsyncStorage.setItem('dayOffs', JSON.stringify(dayOffs)).catch(console.error);
    AsyncStorage.setItem('dayEndHour', JSON.stringify(dayEndHour)).catch(console.error);
    AsyncStorage.setItem('showTimeline', JSON.stringify(showTimeline)).catch(console.error);
    AsyncStorage.setItem('showRoutinesTab', JSON.stringify(showRoutinesTab)).catch(console.error);
    AsyncStorage.setItem('showProjectsTab', JSON.stringify(showProjectsTab)).catch(console.error);
    AsyncStorage.setItem('showTasksHome', JSON.stringify(showTasksHome)).catch(console.error);
    AsyncStorage.setItem('showRoutinesHome', JSON.stringify(showRoutinesHome)).catch(console.error);
    AsyncStorage.setItem('showProjectsHome', JSON.stringify(showProjectsHome)).catch(console.error);
    AsyncStorage.setItem('dailyStats', JSON.stringify(dailyStats)).catch(console.error);
    AsyncStorage.setItem('projects', JSON.stringify(projects)).catch(console.error);

    if (user) {
      const prunedMemos = pruneOldData(memos);
      const dataRef = doc(db, 'users', user.uid, 'data', 'main');
      setDoc(dataRef, {
        goals,
        memos: prunedMemos,
        routines,
        routineRecords,
        ddays,
        dayOffs,
        dayEndHour,
        showTimeline,
        showRoutinesTab,
        showProjectsTab,
        showTasksHome,
        showRoutinesHome,
        showProjectsHome,
        dailyStats,
        projects,
        updatedAt: Timestamp.now(),
      }, { merge: true }).catch(console.error);
    }
  }, [goals, memos, routines, routineRecords, ddays, dayOffs, dayEndHour, showTimeline, showRoutinesTab, showProjectsTab, showTasksHome, showRoutinesHome, showProjectsHome, dailyStats, projects, isDataLoaded]);

  // ── 분배 로직 ─────────────────────────────────────────────────
  const distribute = (amount: number, startStr: string, endStr: string, daysArr: string[], style: string, customDailyQuota: number, excludeDates: string[] = []) => {
    const map: any = {};
    if (!endStr || !startStr || !daysArr || daysArr.length === 0) return map;
    const safeAmount = isNaN(amount) || amount < 0 ? 0 : amount;
    const safeQuota = isNaN(customDailyQuota) || customDailyQuota <= 0 ? 0 : customDailyQuota;

    const activeDates: string[] = [];
    let temp = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);
    if (temp > end) return map;

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    while (temp <= end) {
      const dateStr = `${temp.getFullYear()}-${String(temp.getMonth() + 1).padStart(2, '0')}-${String(temp.getDate()).padStart(2, '0')}`;
      if (daysArr.includes(dayNames[temp.getDay()]) && !excludeDates.includes(dateStr)) {
        activeDates.push(dateStr);
      }
      temp.setDate(temp.getDate() + 1);
    }
    activeDates.sort();

    let rem = safeAmount;
    if (activeDates.length > 0 && rem > 0) {
      if (style === 'custom') {
        activeDates.forEach(date => {
          const alloc = safeQuota > 0 ? Math.min(rem, safeQuota) : 0;
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

  const needsRedistribute = (oldGoal: any, newData: any) => {
    return (
      oldGoal.total !== newData.total ||
      oldGoal.endDate !== newData.endDate ||
      JSON.stringify([...oldGoal.days].sort()) !== JSON.stringify([...newData.days].sort()) ||
      oldGoal.distributionStyle !== newData.distributionStyle ||
      oldGoal.customDailyQuota !== newData.customDailyQuota
    );
  };

  const processedGoals = useMemo(() => goals.map(g => {
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
  }), [goals]);

  return (
    <GoalsContext.Provider value={{
      goals: processedGoals,
      memos,
      routines,
      routineRecords,
      ddays,
      setDdays,
      dayOffs,
      dayEndHour,
      setDayEndHour,
      showTimeline,
      setShowTimeline,
      showRoutinesTab,
      setShowRoutinesTab,
      showProjectsTab,
      setShowProjectsTab,
      showTasksHome,
      setShowTasksHome,
      showRoutinesHome,
      setShowRoutinesHome,
      showProjectsHome,
      setShowProjectsHome,
      user,
      syncError,
      setSyncError,
      dailyStats,

      projects,
      addProject: (data: Omit<Project, 'id'>) => {
        setProjects(prev => [...prev, { ...data, id: Date.now().toString() }]);
      },
      updateProject: (id: string, data: Partial<Project>) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      },
      deleteProject: (id: string) => {
        setProjects(prev => prev.filter(p => p.id !== id));
      },
      addProjectStep: (projectId: string, stepName: string) => {
        setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          const newStep: ProjectStep = {
            id: Date.now().toString(),
            name: stepName,
            assignedDate: '',
            completed: false,
          };
          return { ...p, steps: [...p.steps, newStep] };
        }));
      },
      updateProjectStep: (projectId: string, stepId: string, data: Partial<ProjectStep>) => {
        setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, steps: p.steps.map(s => s.id === stepId ? { ...s, ...data } : s) };
        }));
      },
      deleteProjectStep: (projectId: string, stepId: string) => {
        setProjects(prev => prev.map(p => {
          if (p.id !== projectId) return p;
          return { ...p, steps: p.steps.filter(s => s.id !== stepId) };
        }));
      },
      reorderProjectSteps: (projectId: string, newSteps: ProjectStep[]) => {
        setProjects(prev => prev.map(p => p.id === projectId ? { ...p, steps: newSteps } : p));
      },

      toggleDayOff: (dateStr: string) => {
        setDayOffs(prev =>
          prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]
        );
      },

      // BUG-23 수정: addGoal 시 getTodayWithEndHour 사용
      addGoal: (data: any) => {
        const startStr = getTodayWithEndHour(dayEndHour);
        const scheduleMap = distribute(data.total, startStr, data.endDate, data.days, data.distributionStyle, data.customDailyQuota);
        setGoals(prev => [...prev, { ...data, id: Date.now().toString(), currentMap: {}, scheduleMap }]);
      },

      // BUG-19 수정: updateGoal 시 getTodayWithEndHour 사용, 오늘 달성량도 pastAllocated에 포함
      updateGoal: (id: string, data: any) => {
        setGoals(prev => prev.map(g => {
          if (g.id !== id) return g;
          if (!needsRedistribute(g, data)) {
            return { ...g, ...data, scheduleMap: g.scheduleMap };
          }
          const todayStr = getTodayWithEndHour(dayEndHour);
          let pastScheduleMap: any = {};
          let pastAllocated = 0;
          Object.keys(g.scheduleMap || {}).forEach(d => {
            if (d < todayStr) {
              pastScheduleMap[d] = g.scheduleMap[d];
              pastAllocated += Math.min(Number(g.currentMap?.[d] || 0), Number(g.scheduleMap[d] || 0));
            }
          });
          // 오늘 달성량도 차감 대상에 포함
          const todayDone = Math.min(Number(g.currentMap?.[todayStr] || 0), Number(g.scheduleMap?.[todayStr] || 0));
          pastAllocated += todayDone;
          const remainingTotal = Math.max(0, data.total - pastAllocated);
          const futureScheduleMap = distribute(remainingTotal, todayStr, data.endDate, data.days, data.distributionStyle, data.customDailyQuota);
          return { ...g, ...data, scheduleMap: { ...pastScheduleMap, ...futureScheduleMap }, customSchedule: {} };
        }));
      },

      deleteGoal: (id: string) => setGoals(prev => prev.filter(g => g.id !== id)),

      reorderGoals: (newOrder: any[]) => {
        setGoals(prev => newOrder.map(g => {
          const original = prev.find((og: any) => og.id === g.id);
          return original || g;
        }));
      },

      updateGoalCurrent: (id: string, date: string, amount: number) => {
        if (date < getTodayWithEndHour(dayEndHour)) return;
        setGoals(prev => prev.map(g => {
          if (g.id !== id) return g;
          const scheduledToday = Number(g.scheduleMap?.[date] || 0);
          const oldCurrent = Number(g.currentMap?.[date] || 0);
          const newCurrent = Math.max(0, Math.min(scheduledToday, oldCurrent + Number(amount)));
          if (newCurrent === oldCurrent) return g;
          return { ...g, currentMap: { ...g.currentMap, [date]: newCurrent } };
        }));
      },

      updateGoalScheduleMap: (id: string, newScheduleMap: any) => {
        setGoals(prev => prev.map(g => {
          if (g.id !== id) return g;
          const clamped: any = {};
          Object.keys(newScheduleMap).forEach(d => {
            clamped[d] = newScheduleMap[d];
          });
          return { ...g, scheduleMap: clamped };
        }));
      },

      addMemo: (date: string, text: string) => setMemos((prev: any) => ({
        ...prev, [date]: [...(prev[date] || []), { id: Date.now().toString(), text, completed: false, assignedDate: date }]
      })),
      // BUG-01 수정: originKey 기준으로 삭제
      deleteMemo: (originKey: string, id: string) => setMemos((prev: any) => ({
        ...prev, [originKey]: (prev[originKey] || []).filter((m: any) => m.id !== id)
      })),
      toggleMemo: (_date: string, id: string) => setMemos((prev: any) => {
        for (const key of Object.keys(prev)) {
          const idx = prev[key].findIndex((m: any) => m.id === id);
          if (idx !== -1) {
            const updated = prev[key].map((m: any) => m.id === id ? { ...m, completed: !m.completed } : m);
            return { ...prev, [key]: updated };
          }
        }
        return prev;
      }),
      moveMemo: (memoId: string, originDate: string, targetDate: string) => setMemos((prev: any) => ({
        ...prev,
        [originDate]: (prev[originDate] || []).map((m: any) =>
          m.id === memoId ? { ...m, assignedDate: targetDate } : m
        ),
      })),
      addRoutine: (data: any) => setRoutines((prev: any[]) => [...prev, { ...data, id: Date.now().toString() }]),
      updateRoutine: (id: string, data: any) => setRoutines((prev: any[]) => prev.map(r => r.id === id ? { ...r, ...data } : r)),
      deleteRoutine: (id: string) => setRoutines((prev: any[]) => prev.filter(r => r.id !== id)),
      toggleRoutineRecord: (date: string, id: string) => setRoutineRecords((prev: any) => {
        const list = prev[date] || [];
        const newList = list.includes(id) ? list.filter((x: string) => x !== id) : [...list, id];
        return { ...prev, [date]: newList };
      }),
    }}>
      {children}
    </GoalsContext.Provider>
  );
};
