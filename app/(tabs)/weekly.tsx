import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useMemo, useState } from 'react';
import {
  Alert, Dimensions, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { GoalsContext, getTodayWithEndHour, getKSTDateStr } from '../../context/GoalsContext';

LocaleConfig.locales['en'] = {
  monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  dayNamesShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

const SCREEN_W = Dimensions.get('window').width;

// ─── 날짜 헬퍼 ──────────────────────────────────────────────────
function parseLocalDate(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return getKSTDateStr(d);
}
function fmtMD(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}/${parseInt(d)}`;
}
function fmtDay(dateStr: string): string {
  const days = ['일','월','화','수','목','금','토'];
  // UTC 오해석 방지: 로컬 타임존 기준으로 파싱
  const [y, m, d] = dateStr.split('-').map(Number);
  return days[new Date(y, m - 1, d).getDay()];
}

// ─── 시각화: 타임라인 뷰 (앞으로의 계획) ───────────────────────
function TimelineView({ goals, memos, ddays, todayKST, dayOffs, projects, routines, routineRecords }: any) {
  const SCREEN_W2 = Dimensions.get('window').width - 32;
  const LABEL_W = SCREEN_W2 >= 600 ? 120 : 90;
  const BAR_W = SCREEN_W2 - LABEL_W - 24;

  const futureDates = (goals as any[])
    .filter(g => g.endDate && g.endDate >= todayKST)
    .map(g => g.endDate);
  const maxDate = futureDates.length > 0
    ? futureDates.reduce((a: string, b: string) => (a > b ? a : b))
    : addDays(todayKST, 30);
  const rangeEnd = maxDate > addDays(todayKST, 30) ? maxDate : addDays(todayKST, 30);

  const startD = parseLocalDateTL(todayKST);
  const endD = parseLocalDateTL(rangeEnd);
  const totalDays = Math.max(1, Math.round((endD.getTime() - startD.getTime()) / 86400000));

  function parseLocalDateTL(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function dayOffset(dateStr: string): number {
    const d = parseLocalDateTL(dateStr);
    return Math.round((d.getTime() - startD.getTime()) / 86400000);
  }
  function pctOf(dateStr: string): number {
    return Math.max(0, Math.min(1, dayOffset(dateStr) / totalDays));
  }

  const activeGoals = (goals as any[]).filter(g =>
    g.endDate && g.endDate >= todayKST
  );

  const activeRoutines = (routines as any[] || []).filter(r =>
    r.endDate && r.endDate >= todayKST
  );

  const futureDdays = ((ddays as any[]) || []).filter((d: any) => d.date >= todayKST && d.date <= rangeEnd);

  const monthMarks: { label: string; pct: number }[] = [];
  {
    const cur = new Date(startD);
    cur.setDate(1);
    while (true) {
      cur.setMonth(cur.getMonth() + 1);
      const s = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-01`;
      if (s > rangeEnd) break;
      const p = pctOf(s);
      const mo = cur.getMonth() + 1;
      const label = mo === 1 ? `${cur.getFullYear()}\n${mo}월` : `${mo}월`;
      monthMarks.push({ label, pct: p });
    }
  }

  const weekMarks: number[] = [];
  for (let i = 7; i < totalDays; i += 7) weekMarks.push(i / totalDays);

  const futureMemoSummary: { date: string; count: number }[] = [];
  const memoKeys = Object.keys(memos as Record<string, any[]>)
    .filter(k => k >= todayKST && k <= rangeEnd)
    .sort();
  memoKeys.forEach(k => {
    const remaining = ((memos as any)[k] as any[]).filter((m: any) => !m.completed).length;
    if (remaining > 0) futureMemoSummary.push({ date: k, count: remaining });
  });

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      <Text style={vizStyles.sectionLabel}>Upcoming Plan Timeline</Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>Today  {todayKST}</Text>
        </View>
        <Text style={{ fontSize: 10, color: '#9CA3AF', alignSelf: 'center' }}>{rangeEnd}</Text>
      </View>

      <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingTop: 10, paddingBottom: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 16, width: SCREEN_W2 }}>

        {activeGoals.length === 0 && activeRoutines.length === 0 ? (
          <View style={vizStyles.emptyCard}>
            <Text style={vizStyles.emptyText}>No upcoming goals or routines set</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 4 }}>
              <View style={{ width: LABEL_W }} />
              <View style={{ width: BAR_W, height: 28, position: 'relative' }}>
                {weekMarks.map((p, i) => (
                  <View key={i} style={{ position: 'absolute', left: p * BAR_W, top: 0, bottom: 0, width: 1, backgroundColor: '#E5E7EB' }} />
                ))}
                {monthMarks.map((m, i) => (
                  <Text key={i} style={{ position: 'absolute', left: m.pct * BAR_W - 8, top: 0, fontSize: 9, color: '#9CA3AF', fontWeight: '700', lineHeight: 11 }}>{m.label}</Text>
                ))}
                {futureDdays.map((dd: any) => {
                  const p = pctOf(dd.date);
                  return (
                    <Text key={dd.id} style={{ position: 'absolute', left: p * BAR_W - 8, top: 17, fontSize: 8, color: '#FF3B30', fontWeight: '700' }} numberOfLines={1}>{dd.name}</Text>
                  );
                })}
              </View>
            </View>

            {activeGoals.map((g: any) => {
              const gStart = g.startDate && g.startDate >= todayKST ? g.startDate : todayKST;
              const gEnd = g.endDate;
              const leftPct = pctOf(gStart);
              const rightPct = pctOf(gEnd);
              const widthPct = Math.max(0.02, rightPct - leftPct);

              let totalSched = 0, totalDone = 0;
              Object.keys(g.scheduleMap || {}).forEach(d => {
                if (d >= todayKST) {
                  totalSched += Number(g.scheduleMap[d] || 0);
                  totalDone += Math.min(Number(g.currentMap?.[d] || 0), Number(g.scheduleMap[d] || 0));
                }
              });
              const donePct = totalSched > 0 ? totalDone / totalSched : 0;
              const daysLeft = Math.max(0, Math.round(
                (parseLocalDateTL(gEnd).getTime() - parseLocalDateTL(todayKST).getTime()) / 86400000
              ));

              return (
                <View key={g.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: LABEL_W, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: g.color }} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#111', flex: 1 }} numberOfLines={1}>{g.name}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: '#9CA3AF' }}>D-{daysLeft}  {fmtMD(gEnd)}</Text>
                  </View>

                  <View style={{ width: BAR_W, height: 32, position: 'relative', justifyContent: 'center' }}>
                    {weekMarks.map((p, i) => (
                      <View key={i} style={{ position: 'absolute', left: p * BAR_W, top: 0, bottom: 0, width: 1, backgroundColor: '#F3F4F6' }} />
                    ))}
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 12, backgroundColor: '#F3F4F6', borderRadius: 6 }} />
                    <View style={{
                      position: 'absolute',
                      left: leftPct * BAR_W,
                      width: widthPct * BAR_W,
                      top: 10, height: 12,
                      backgroundColor: g.color + '33',
                      borderRadius: 6,
                      overflow: 'hidden',
                    }}>
                      <View style={{ width: `${Math.round(donePct * 100)}%`, height: '100%', backgroundColor: g.color, borderRadius: 6 }} />
                    </View>
                    <View style={{ position: 'absolute', left: rightPct * BAR_W - 1.5, top: 6, width: 3, height: 20, backgroundColor: g.color, borderRadius: 2 }} />
                    {futureDdays.map((dd: any) => {
                      const p = pctOf(dd.date);
                      return (
                        <View key={dd.id} style={{ position: 'absolute', left: p * BAR_W - 0.5, top: 6, width: 1.5, height: 20, backgroundColor: '#FF3B30' }} />
                      );
                    })}
                    {donePct > 0 && (
                      <Text style={{ position: 'absolute', left: leftPct * BAR_W + 4, top: 11, fontSize: 8, color: donePct > 0.4 ? '#fff' : g.color, fontWeight: '700' }}>
                        {Math.round(donePct * 100)}%
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            {activeRoutines.map((r: any) => {
              const rStart = r.startDate && r.startDate >= todayKST ? r.startDate : todayKST;
              const rEnd = r.endDate;
              const leftPct = pctOf(rStart);
              const rightPct = pctOf(rEnd);
              const widthPct = Math.max(0.02, rightPct - leftPct);

              let rSched = 0, rDone = 0;
              const startDt = parseLocalDateTL(rStart);
              const endDt = parseLocalDateTL(rEnd);
              for (let d = new Date(startDt); d <= endDt; d.setDate(d.getDate() + 1)) {
                const dStr = getKSTDateStr(d);
                const isOff = (dayOffs || []).includes(dStr);
                const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                if (!isOff && (r.days || []).includes(dayName)) {
                  rSched++;
                  if (((routineRecords || {})[dStr] || []).includes(r.id)) {
                    rDone++;
                  }
                }
              }
              const donePct = rSched > 0 ? rDone / rSched : 0;
              const daysLeft = Math.max(0, Math.round(
                (endDt.getTime() - parseLocalDateTL(todayKST).getTime()) / 86400000
              ));

              return (
                <View key={`rt-${r.id}`} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: LABEL_W, paddingRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <Ionicons name="repeat-outline" size={10} color={r.color || '#6366F1'} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#111', flex: 1 }} numberOfLines={1}>{r.name}</Text>
                    </View>
                    <Text style={{ fontSize: 9, color: '#9CA3AF' }}>D-{daysLeft}  {fmtMD(rEnd)}</Text>
                  </View>

                  <View style={{ width: BAR_W, height: 32, position: 'relative', justifyContent: 'center' }}>
                    {weekMarks.map((p, i) => (
                      <View key={i} style={{ position: 'absolute', left: p * BAR_W, top: 0, bottom: 0, width: 1, backgroundColor: '#F3F4F6' }} />
                    ))}
                    <View style={{ position: 'absolute', left: 0, right: 0, top: 10, height: 12, backgroundColor: '#F3F4F6', borderRadius: 6 }} />
                    <View style={{
                      position: 'absolute',
                      left: leftPct * BAR_W,
                      width: widthPct * BAR_W,
                      top: 10, height: 12,
                      backgroundColor: (r.color || '#6366F1') + '15',
                      borderRadius: 6,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: (r.color || '#6366F1') + '33',
                    }}>
                      <View style={{ width: `${Math.round(donePct * 100)}%`, height: '100%', backgroundColor: (r.color || '#6366F1') + '66', borderRadius: 6 }} />
                    </View>
                    <View style={{ position: 'absolute', left: rightPct * BAR_W - 1.5, top: 6, width: 3, height: 20, backgroundColor: (r.color || '#6366F1') + '66', borderRadius: 2 }} />
                    {futureDdays.map((dd: any) => {
                      const p = pctOf(dd.date);
                      return (
                        <View key={dd.id} style={{ position: 'absolute', left: p * BAR_W - 0.5, top: 6, width: 1.5, height: 20, backgroundColor: '#FF3B30' }} />
                      );
                    })}
                    {rSched > 0 && (
                      <Text style={{ position: 'absolute', left: leftPct * BAR_W + 4, top: 11, fontSize: 8, color: '#111', fontWeight: '700' }}>
                        {rDone}/{rSched}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}

            <View style={{ position: 'absolute', left: LABEL_W + 12, top: 0, bottom: 0, width: 2, backgroundColor: '#EF4444', borderRadius: 1 }} pointerEvents="none" />
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {[
          { color: '#374151', label: 'Goal range (remaining)' },
          { color: '#22C55E', label: 'Completed portion' },
          { color: '#EF4444', label: 'Today' },
          { color: '#FF3B30', label: 'D-day' },
        ].map(({ color, label }) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
            <Text style={{ fontSize: 10, color: '#6B7280' }}>{label}</Text>
          </View>
        ))}
      </View>

      {futureDdays.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 16 }}>
          <Text style={[vizStyles.sectionLabel, { marginBottom: 6 }]}>D-day Schedule</Text>
          {futureDdays.map((dd: any) => {
            const diff = Math.round((parseLocalDateTL(dd.date).getTime() - parseLocalDateTL(todayKST).getTime()) / 86400000);
            return (
              <View key={dd.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B30' }} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111', flex: 1 }}>{dd.name}</Text>
                <Text style={{ fontSize: 12, color: '#FF3B30', fontWeight: '700' }}>
                  {diff === 0 ? 'D-Day' : `D-${diff}`}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{dd.date}</Text>
              </View>
            );
          })}
        </View>
      )}

      {futureMemoSummary.length > 0 && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 16 }}>
          <Text style={[vizStyles.sectionLabel, { marginBottom: 6 }]}>Upcoming Tasks</Text>
          {futureMemoSummary.slice(0, 10).map(({ date, count }) => (
            <View key={date} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#374151' }} />
              <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>{date}  {fmtDay(date)}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#111' }}>{count} tasks</Text>
            </View>
          ))}
          {futureMemoSummary.length > 10 && (
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>+{futureMemoSummary.length - 10} more days</Text>
          )}
        </View>
      )}

      {activeGoals.length > 0 && (
        <>
          <Text style={[vizStyles.sectionLabel, { marginTop: 4 }]}>Goal Remaining</Text>
          {activeGoals.map((g: any) => {
            let totalSched = 0, totalDone = 0;
            Object.keys(g.scheduleMap || {}).forEach(d => {
              if (d >= todayKST) {
                totalSched += Number(g.scheduleMap[d] || 0);
                totalDone += Math.min(Number(g.currentMap?.[d] || 0), Number(g.scheduleMap[d] || 0));
              }
            });
            const remaining = Math.max(0, totalSched - totalDone);
            const pct = totalSched > 0 ? Math.round((totalDone / totalSched) * 100) : 0;
            const daysLeft = Math.max(0, Math.round(
              (parseLocalDateTL(g.endDate).getTime() - parseLocalDateTL(todayKST).getTime()) / 86400000
            ));
            return (
              <View key={g.id} style={vizStyles.goalBar}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <View style={[vizStyles.colorDot, { backgroundColor: g.color }]} />
                  <Text style={vizStyles.goalName}>{g.name}</Text>
                  <Text style={[vizStyles.goalAmt, { color: '#EF4444', fontWeight: '700' }]}>D-{daysLeft}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Remaining: <Text style={{ color: '#111', fontWeight: '700' }}>{remaining} {g.unit}</Text></Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Due: {g.endDate}</Text>
                </View>
                <View style={vizStyles.barBg}>
                  <View style={[vizStyles.barFill, { backgroundColor: g.color, width: `${pct}%` as any }]} />
                  <Text style={[vizStyles.barPct, pct > 50 ? { color: '#fff' } : { color: '#111' }]}>{pct}%</Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────
export default function WeeklyScreen() {
  const [selDate, setSelDate] = useState(getKSTDateStr());
  const [memo, setMemo] = useState('');
  const [activeTab, setActiveTab] = useState<'schedule' | 'timeline'>('schedule');

  const { goals, memos, routines, routineRecords, addMemo, deleteMemo, toggleMemo, toggleRoutineRecord, updateProjectStep, dayOffs, toggleDayOff, ddays, dayEndHour, showTimeline, projects } = useContext(GoalsContext);

  const todayKST = getTodayWithEndHour(dayEndHour);
  const isPastDate = selDate < todayKST;
  // BUG-01/11: use assignedDate for currentMemos (with originKey for delete)
  const currentMemos = (Object.entries(memos) as [string, any[]][])
    .flatMap(([k, items]) => items.map((m: any) => ({ ...m, _originKey: k })))
    .filter((m: any) => (m.assignedDate ?? m._originKey) === selDate);
  const activeGoals = goals.filter((g: any) => (g.scheduleMap?.[selDate] || 0) > 0);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const selDayName = dayNames[new Date(selDate.split('-').map(Number)[0], Number(selDate.split('-')[1])-1, Number(selDate.split('-')[2])).getDay()];
  const isDayOff = (dayOffs || []).includes(selDate);
  const currentRoutines = (routines || []).filter((r: any) => (r.days || []).includes(selDayName) && r.endDate >= selDate && (!r.startDate || r.startDate <= selDate) && !isDayOff);
  const currentRoutineRecords = (routineRecords || {})[selDate] || [];
  const ddayDates = new Set(((ddays as any[]) || []).map((d: any) => d.date));

  // 탭이 설정에서 꺼지면 schedule로 복귀
  React.useEffect(() => {
    if (activeTab === 'timeline' && !showTimeline) setActiveTab('schedule');
  }, [showTimeline]);

  const handleToggleDayOff = () => {
    if (!isDayOff) {
      if (activeGoals.length > 0 || currentMemos.length > 0) {
        const lines: string[] = [];
        if (activeGoals.length > 0)
          activeGoals.forEach((g: any) => lines.push(`• [Goal] ${g.name} (${g.scheduleMap[selDate]}${g.unit})`));
        if (currentMemos.length > 0)
          currentMemos.forEach((m: any) => lines.push(`• [Task] ${m.text}`));
        Alert.alert('Cannot Set Day-off', `There are remaining plans on ${selDate}:\n\n${lines.join('\n')}\n\nPlease clear all plans before setting a day-off.`, [{ text: 'OK' }]);
        return;
      }
      Alert.alert('Set Day-off', `Setting ${selDate} as a day-off will exclude it from goal distribution.\nContinue?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Set', onPress: () => toggleDayOff(selDate) },
      ]);
    } else {
      toggleDayOff(selDate);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {/* ── 탭 전환 헤더 ── */}
      <View style={styles.tabHeader}>
        <Text style={styles.headerTitle}>Planner</Text>
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'schedule' && styles.tabBtnActive]}
            onPress={() => setActiveTab('schedule')}
          >
            <Ionicons name="calendar-outline" size={13} color={activeTab === 'schedule' ? '#fff' : '#6B7280'} style={{ marginRight: 4 }} />
            <Text style={[styles.tabBtnText, activeTab === 'schedule' && styles.tabBtnTextActive]}>Schedule</Text>
          </TouchableOpacity>
          {showTimeline && (
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive]}
              onPress={() => setActiveTab('timeline')}
            >
              <Ionicons name="git-branch-outline" size={13} color={activeTab === 'timeline' ? '#fff' : '#6B7280'} style={{ marginRight: 4 }} />
              <Text style={[styles.tabBtnText, activeTab === 'timeline' && styles.tabBtnTextActive]}>Timeline</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── 계획표 탭 ── */}
      {activeTab === 'schedule' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            style={styles.wrapper}
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Calendar
              current={selDate}
              onDayPress={(day: any) => setSelDate(day.dateString)}
              theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
              style={styles.calendar}
              dayComponent={({ date, state }: any) => {
                const dStr = date.dateString;
                const dMemos = memos[dStr] || [];
                const dGoals = goals.filter((g: any) => (g.scheduleMap?.[dStr] || 0) > 0);
                const isOff = (dayOffs as string[]).includes(dStr);
                const isDday = ddayDates.has(dStr);
                const isPast = dStr < todayKST;

                let dayTotal = 0, dayDone = 0;
                dGoals.forEach((g: any) => {
                  dayTotal += g.scheduleMap[dStr];
                  dayDone += Math.min(g.currentMap?.[dStr] || 0, g.scheduleMap[dStr]);
                });

                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayName = dayNames[new Date(dStr.split('-').map(Number)[0], Number(dStr.split('-')[1])-1, Number(dStr.split('-')[2])).getDay()];
                const dRoutines = (routines || []).filter((r: any) => (r.days || []).includes(dayName) && r.endDate >= dStr && (!r.startDate || r.startDate <= dStr) && !(dayOffs as string[]).includes(dStr));
                const rDone = dRoutines.filter((r: any) => ((routineRecords || {})[dStr] || []).includes(r.id)).length;

                const dAssignedSteps = (projects || []).flatMap((p: any) =>
                  p.steps.filter((s: any) => s.assignedDate === dStr)
                );
                const pDone = dAssignedSteps.filter((s: any) => s.completed).length;

                const memoDone = dMemos.filter((m: any) => m.completed).length;
                const totalCount = dayTotal + dMemos.length + dRoutines.length + dAssignedSteps.length;
                const doneCount = dayDone + memoDone + rDone + pDone;
                const rate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                const isSelected = dStr === selDate;
                const isIncomplete = isPast && !isOff && totalCount > 0 && rate < 100;
                const isComplete = isPast && !isOff && totalCount > 0 && rate >= 100;

                const dAssignedProjects = (projects || []).filter((p: any) => p.steps.some((s: any) => s.assignedDate === dStr));

                return (
                  <TouchableOpacity
                    onPress={() => setSelDate(dStr)}
                    style={[
                      styles.dayWrapper,
                      isSelected && styles.daySelected,
                      isComplete && styles.dayComplete,
                      isIncomplete && styles.dayIncomplete,
                      isOff && styles.dayOffWrapper,
                    ]}
                  >
                    {isDday && <View style={styles.ddayDot} />}
                    <Text style={{
                      color: isOff ? '#FF3B30' : state === 'disabled' ? '#D3D3D3' : isComplete ? '#16A34A' : '#111111',
                      fontWeight: isSelected || isComplete ? 'bold' : 'normal',
                      fontSize: 13,
                    }}>
                      {date.day}
                    </Text>
                    {isOff ? (
                      <Text style={styles.dayOffLabel}>OFF</Text>
                    ) : isComplete ? (
                      <Text style={{ fontSize: 9, color: '#16A34A', fontWeight: 'bold' }}>100%</Text>
                    ) : isIncomplete ? (
                      <Text style={{ fontSize: 9, color: '#111111', fontWeight: 'bold' }}>{rate}%</Text>
                    ) : (
                      <View style={styles.markerContainer}>
                        {dMemos.length > 0 && <View style={styles.dotMarker} />}
                        {dGoals.length > 0 && (
                          <View style={[styles.barMarker, { backgroundColor: '#111111' }]}>
                            <Text style={{ fontSize: 7, color: '#FFFFFF', fontWeight: 'bold' }}>{dGoals.length} Goals</Text>
                          </View>
                        )}
                        {dRoutines.length > 0 && (
                          <View style={[styles.barMarker, { backgroundColor: '#4B5563' }]}>
                            <Text style={{ fontSize: 7, color: '#FFFFFF', fontWeight: 'bold' }}>{dRoutines.length} Routines</Text>
                          </View>
                        )}
                        {dAssignedProjects.length > 0 && (
                          <View style={[styles.barMarker, { backgroundColor: '#6B7280' }]}>
                            <Text style={{ fontSize: 7, color: '#FFFFFF', fontWeight: 'bold' }}>{dAssignedProjects.length} Projects</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              style={[styles.dayOffBtn, isDayOff && styles.dayOffBtnActive]}
              onPress={handleToggleDayOff}
            >
              <Text style={[styles.dayOffBtnText, isDayOff && { color: '#FFFFFF' }]}>
                {isDayOff ? `${selDate} — Remove Day-off` : 'Set Day-off'}
              </Text>
            </TouchableOpacity>

            <View style={styles.memoSection}>
              <Text style={styles.memoTitle}>
                Plan for {selDate}
                {isDayOff && <Text style={styles.dayOffTag}> · Day Off</Text>}
              </Text>
              {ddayDates.has(selDate) && (() => {
                const matched = ((ddays as any[]) || []).filter((d: any) => d.date === selDate);
                return matched.length > 0 ? (
                  <View style={styles.ddayInfoBox}>
                    <View style={styles.ddayInfoDot} />
                    <Text style={styles.ddayInfoText}>{matched.map((d: any) => d.name).join(', ')}</Text>
                  </View>
                ) : null;
              })()}

              {!isDayOff && activeGoals.length > 0 && (
                <>
                  <Text style={styles.planItemSectionTitle}>Goals</Text>
                  {activeGoals.map((g: any) => {
                    const done = g.currentMap?.[selDate] || 0;
                    const total = g.scheduleMap[selDate];
                    const isGoalDone = done >= total;
                    return (
                      <View
                        key={g.id}
                        style={[styles.planItemCard, isGoalDone && { borderColor: g.color, borderWidth: 2 }]}
                      >
                        <View style={[styles.planColorIndicator, { backgroundColor: g.color }]} />
                        <Text style={styles.planItemName} numberOfLines={1}>{g.name}</Text>
                        <View style={[styles.planBadge, isGoalDone && { backgroundColor: g.color + '20', borderColor: g.color + '40' }]}>
                          <Text style={[styles.planBadgeText, isGoalDone && { color: g.color }]}>{done} / {total}{g.unit}</Text>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              <View style={styles.divider} />

              <Text style={styles.planItemSectionTitle}>Tasks</Text>
              {!isPastDate && (
                <View style={styles.memoInputRow}>
                  <TextInput
                    style={styles.memoInput}
                    placeholder="Add a task"
                    value={memo}
                    onChangeText={setMemo}
                  />
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => { if (memo.trim()) { addMemo(selDate, memo); setMemo(''); } }}
                  >
                    <Ionicons name="add" size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
              {currentMemos.map((m: any) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.planItemCard, m.completed && { borderColor: '#111111', borderWidth: 2 }, isPastDate && { opacity: 0.75 }]}
                  onPress={() => {
                    if (isPastDate) {
                      Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" on the Home tab to reschedule unfinished items.');
                    } else {
                      toggleMemo(selDate, m.id);
                    }
                  }}
                >
                  <View style={styles.planCheckWrap}>
                    {m.completed
                      ? <Ionicons name="checkmark-circle" size={22} color="#111111" />
                      : <Ionicons name="ellipse-outline" size={22} color="#D3D3D3" />}
                  </View>
                  <Text style={styles.planItemName} numberOfLines={1}>{m.text}</Text>
                  {isPastDate
                    ? <Ionicons name="lock-closed-outline" size={14} color="#D1D5DB" />
                    : (
                      <TouchableOpacity onPress={() => deleteMemo(m._originKey, m.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="trash-outline" size={16} color="#D1D5DB" />
                      </TouchableOpacity>
                    )
                  }
                </TouchableOpacity>
              ))}

              {currentRoutines.length > 0 && (
                <>
                  <Text style={styles.planItemSectionTitle}>Routines</Text>
                  {currentRoutines.map((r: any) => {
                    const completed = currentRoutineRecords.includes(r.id);
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[styles.planItemCard, completed && { borderColor: '#111111', borderWidth: 2 }, isPastDate && { opacity: 0.75 }]}
                        onPress={() => {
                          if (isPastDate) {
                            Alert.alert('Day Locked', 'This day has passed and is locked.\nRoutines cannot be rescheduled to another date.');
                          } else {
                            toggleRoutineRecord(selDate, r.id);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.planCheckWrap}>
                          {completed
                            ? <Ionicons name="checkmark-circle" size={22} color="#111111" />
                            : <Ionicons name="ellipse-outline" size={22} color="#D3D3D3" />}
                        </View>
                        <Text style={styles.planItemName} numberOfLines={1}>{r.name}</Text>
                        {isPastDate && <Ionicons name="lock-closed-outline" size={14} color="#D1D5DB" />}
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}

              {(projects || []).filter((p: any) => p.steps.some((s: any) => s.assignedDate === selDate)).length > 0 && (
                <>
                  <Text style={styles.planItemSectionTitle}>Projects</Text>
                  {(projects || []).filter((p: any) => p.steps.some((s: any) => s.assignedDate === selDate)).map((p: any) => {
                    const assignedSteps = p.steps.filter((s: any) => s.assignedDate === selDate);
                    const doneCnt = assignedSteps.filter((s: any) => s.completed).length;
                    const allDone = doneCnt === assignedSteps.length;
                    return (
                      <View
                        key={p.id}
                        style={[styles.planItemCard, { flexDirection: 'column', alignItems: 'stretch' }, allDone && { borderColor: p.color, borderWidth: 2 }, isPastDate && { opacity: 0.75 }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: assignedSteps.length > 0 ? 8 : 0 }}>
                          <View style={[styles.planColorIndicator, { backgroundColor: p.color }]} />
                          <Text style={[styles.planItemName, { fontWeight: '700' }]} numberOfLines={1}>{p.name}</Text>
                          <View style={[styles.planBadge, allDone && { backgroundColor: p.color + '20', borderColor: p.color + '40' }]}>
                            <Text style={[styles.planBadgeText, allDone && { color: p.color }]}>{doneCnt}/{assignedSteps.length}</Text>
                          </View>
                        </View>
                        {assignedSteps.map((s: any) => {
                          const stepIdx = p.steps.findIndex((st: any) => st.id === s.id);
                          return (
                            <TouchableOpacity
                              key={s.id}
                              style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6 }}
                              onPress={() => {
                                if (isPastDate) {
                                  Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" on the Home tab to reschedule unfinished steps.');
                                } else {
                                  updateProjectStep(p.id, s.id, { completed: !s.completed });
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={{ marginRight: 10 }}>
                                {s.completed
                                  ? <Ionicons name="checkmark-circle" size={18} color={p.color} />
                                  : <Ionicons name="ellipse-outline" size={18} color="#D3D3D3" />}
                              </View>
                              <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500', flex: 1 }} numberOfLines={1}>
                                Step {stepIdx + 1}. {s.name}
                              </Text>
                              {isPastDate && <Ionicons name="lock-closed-outline" size={12} color="#D1D5DB" />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── 계획 시각화 (타임라인) 탭 ── */}
      {activeTab === 'timeline' && (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
          <TimelineView
            goals={goals}
            memos={memos}
            ddays={ddays}
            todayKST={todayKST}
            dayOffs={dayOffs}
            projects={projects}
            routines={routines}
            routineRecords={routineRecords}
          />
        </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  tabHeader: { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 12, backgroundColor: '#FAFAFA' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111111', marginBottom: 10 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, alignSelf: 'flex-start' },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#111111' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabBtnTextActive: { color: '#FFFFFF' },
  wrapper: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 150 },
  calendar: { marginBottom: 12, borderRadius: 15, backgroundColor: '#FFFFFF', padding: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  dayWrapper: { width: 44, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  daySelected: { borderWidth: 2, borderColor: '#111111' },
  dayComplete: { borderWidth: 2, borderColor: '#22C55E', borderRadius: 10 },
  dayIncomplete: { borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 10 },
  dayOffWrapper: { backgroundColor: '#FFF0F0', borderRadius: 10 },
  dayOffLabel: { fontSize: 8, fontWeight: 'bold', color: '#FF3B30' },
  markerContainer: { marginTop: 2, width: '100%', alignItems: 'center', gap: 2 },
  dotMarker: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#111111' },
  barMarker: { width: '90%', height: 11, borderRadius: 3, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  colorDot: { width: 5, height: 5, borderRadius: 3 },
  ddayDot: { position: 'absolute', top: 4, left: 4, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FF3B30' },
  dayOffBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#FF3B30', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 20 },
  dayOffBtnActive: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  dayOffBtnText: { fontSize: 14, fontWeight: 'bold', color: '#FF3B30' },
  memoSection: { paddingBottom: 30 },
  memoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#111111' },
  dayOffTag: { color: '#FF3B30', fontSize: 16 },
  ddayInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  ddayInfoDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF3B30' },
  ddayInfoText: { fontSize: 13, color: '#FF3B30', fontWeight: '600' },
  goalListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EAEAEA' },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  goalListText: { fontSize: 16, fontWeight: 'bold', color: '#111111', flex: 1 },
  goalBadge: { backgroundColor: '#F9F9F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  goalBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#111111' },
  divider: { height: 1, backgroundColor: '#EAEAEA', marginVertical: 15 },
  memoInputRow: { flexDirection: 'row', marginBottom: 20 },
  memoInput: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginRight: 10, borderWidth: 1, borderColor: '#EAEAEA', color: '#111111' },
  addBtn: { backgroundColor: '#111111', width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  memoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  memoTextRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D3D3D3', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  memoText: { fontSize: 16, color: '#111111', fontWeight: '600', flex: 1 },
  planSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4, gap: 8 },
  planSectionIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  planSectionTitle: { fontSize: 13, fontWeight: '700', color: '#374151', flex: 1 },
  planSectionCount: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  planGroupCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 4, overflow: 'hidden' },
  planGroupItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  planGroupItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  planRoundCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  planColorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  planItemText: { fontSize: 15, fontWeight: '500', color: '#111111', flex: 1 },
  planBadge: { backgroundColor: '#F9F9F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  planBadgeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  planItemSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginTop: 22, marginBottom: 10 },
  planItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  planCheckWrap: { marginRight: 12 },
  planItemName: { fontSize: 15, fontWeight: '600', color: '#111111', flex: 1 },
  planColorIndicator: { width: 4, height: '80%', borderRadius: 2, marginRight: 15 },
  // 시각화
  vizModeRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 10, backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3 },
  vizModeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  vizModeBtnActive: { backgroundColor: '#111111' },
  vizModeBtnText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  vizModeBtnTextActive: { color: '#FFFFFF' },
  vizNavRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  vizNavLabel: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#111' },
  vizTodayBtn: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  vizTodayBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
});

const vizStyles = StyleSheet.create({
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#6B7280', marginBottom: 10, marginTop: 4 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 12 },
  emptyText: { color: '#A0A0A0', fontSize: 14 },
  offBadge: { backgroundColor: '#FFF0F0', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 10 },
  goalBar: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  goalName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#111' },
  goalAmt: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  barBg: { height: 18, backgroundColor: '#F3F4F6', borderRadius: 9, overflow: 'hidden', justifyContent: 'center' },
  barFill: { position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 9 },
  barPct: { position: 'absolute', alignSelf: 'center', fontSize: 10, fontWeight: '700', zIndex: 1 },
  memoCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  memoCardTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 8 },
  memoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D3D3D3', marginRight: 8, justifyContent: 'center', alignItems: 'center' },
  memoText: { fontSize: 13, color: '#111', fontWeight: '500', flex: 1 },
  // 주간
  weekHeader: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA', gap: 4 },
  weekDayCol: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  weekDayLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 2 },
  weekDateLabel: { fontSize: 10, color: '#9CA3AF', marginBottom: 6 },
  weekBarBg: { width: 20, height: 60, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  weekBarFill: { width: '100%', borderRadius: 10 },
  weekPctLabel: { fontSize: 9, fontWeight: '700', color: '#374151', marginTop: 4 },
  daySquare: { flex: 1, aspectRatio: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', padding: 2 },
  // 월간 히트맵
  heatmapWrap: { backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EAEAEA', marginBottom: 12 },
  heatmapRow: { flexDirection: 'row', marginBottom: 3 },
  heatmapDayHdr: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: '#9CA3AF', paddingBottom: 4 },
  heatCell: { flex: 1, aspectRatio: 1, borderRadius: 6, margin: 1.5, alignItems: 'center', justifyContent: 'center' },
  heatCellDay: { fontSize: 10, fontWeight: '700', color: '#374151' },
  heatCellPct: { fontSize: 7, color: '#374151' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendLabel: { fontSize: 10, color: '#6B7280' },
});
