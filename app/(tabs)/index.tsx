import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';

const _W = Dimensions.get('window').width;
const S = _W >= 768 ? 1.35 : 1;
import { Calendar } from 'react-native-calendars';
import { Circle, Svg } from 'react-native-svg';
import { GoalsContext, getTodayWithEndHour, getKSTDateStr } from '../../context/GoalsContext';

// AnimatedCircle: 모듈 레벨에서 한 번만 생성 (매 렌더 시 재생성 방지)
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 전날 미완료 항목 타입
type IncompleteItem =
  | { type: 'goal'; goalId: string; goalName: string; goalColor: string; unit: string; date: string; remaining: number }
  | { type: 'memo'; memoId: string; memoText: string; date: string }
  | { type: 'routine'; routineId: string; routineName: string; date: string }
  | { type: 'project_step'; projectId: string; projectName: string; projectColor: string; stepId: string; stepName: string; date: string };

// 'YYYY-MM-DD' 문자열을 로컬 타임존 Date로 파싱 (UTC 오해석 방지)
const parseLocalDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

const HIT = { top: 12, bottom: 12, left: 12, right: 12 };

const CIRCLE_SIZE = 80;
const CIRCLE_RADIUS = 34;
const CIRCLE_STROKE = 5;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function AnimatedProgressCircle({ rate }: { rate: number }) {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  // interpolate로 dashoffset을 Animated.Value에서 직접 계산 → setState 불필요
  const dashoffsetAnim = animVal.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: rate,
      duration: 800,
      useNativeDriver: false,
    }).start(({ finished }) => {
      // 애니메이션 완료 시에만 텍스트 업데이트 (매 프레임 setState 제거)
      if (finished) setDisplayed(rate);
    });
  }, [rate]);

  const isComplete = rate >= 100;
  const arcColor = isComplete ? '#FFFFFF' : '#6366F1';
  const trackColor = isComplete ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.15)';
  const cx = CIRCLE_SIZE / 2;
  const cy = CIRCLE_SIZE / 2;

  return (
    <View style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, marginRight: 20 }}>
      <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={{ position: 'absolute' }}>
        {/* track */}
        <Circle
          cx={cx} cy={cy} r={CIRCLE_RADIUS}
          stroke={trackColor} strokeWidth={CIRCLE_STROKE} fill="none"
        />
        {/* AnimatedCircle: dashoffset을 Animated.Value로 직접 구동 */}
        <AnimatedCircle
          cx={cx} cy={cy} r={CIRCLE_RADIUS}
          stroke={arcColor} strokeWidth={CIRCLE_STROKE} fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={dashoffsetAnim as any}
          strokeLinecap="round"
          rotation="-90"
          origin={`${cx}, ${cy}`}
        />
      </Svg>
      <View style={{ position: 'absolute', width: CIRCLE_SIZE, height: CIRCLE_SIZE, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={styles.progressNumber}>
          {`${displayed}%`}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { goals, memos, routines, routineRecords, toggleMemo, toggleRoutineRecord, updateGoalCurrent, ddays, setDdays, updateGoalScheduleMap, addMemo, deleteMemo, moveMemo, dayEndHour, projects, updateProjectStep, showTasksHome, showRoutinesHome, showProjectsHome, dayOffs } = useContext(GoalsContext);

  const todayKST = getTodayWithEndHour(dayEndHour);
  const [selectedDate, setSelectedDate] = useState(() => getTodayWithEndHour(dayEndHour));

  // dayEndHour가 바뀌면 selectedDate가 todayKST와 맞지 않을 수 있으므로 동기화
  React.useEffect(() => {
    setSelectedDate(prev => prev === getKSTDateStr() ? getTodayWithEndHour(dayEndHour) : prev);
  }, [dayEndHour]);

  // dayEndHour가 지났는지: KST 실제 오늘(=getKSTDateStr)이 todayKST보다 앞서면
  // 즉, 새벽에 dayEndHour 이전이면 todayKST는 전날 → realToday > todayKST
  // dayEndHour가 지나면 오늘 goal의 완료량(-) 감소를 막음
  const realTodayKST = getKSTDateStr();
  const isDayEndPassed = dayEndHour > 0 && realTodayKST > todayKST;

  // ── 미완료 재분배 ──────────────────────────────────────────────
  // 새 방식: 목표/태스크 리스트를 한꺼번에 보여주고 각 항목을 탭해서 처리
  const [redistModalVisible, setRedistModalVisible] = useState(false);
  const [redistDate, setRedistDate] = useState('');

  // 날짜 선택 모달 (memo + project_step 공용)
  const [redistMoveItem, setRedistMoveItem] = useState<IncompleteItem | null>(null);
  const [redistPickDate, setRedistPickDate] = useState('');
  const [redistMoveModalVisible, setRedistMoveModalVisible] = useState(false);


  // 목표 balance modal (인라인)
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [balanceGoal, setBalanceGoal] = useState<any>(null);
  const [localSchedule, setLocalSchedule] = useState<any>({});
  const [balancePending, setBalancePending] = useState(0);
  const [balanceKey, setBalanceKey] = useState(0);
  const [quotaModal, setQuotaModal] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editVal, setEditVal] = useState('');

  // 요일 이름 헬퍼 (루틴 체크용)
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // 선택된 날짜의 미완료 항목 수집 (goals + memos + routines + project steps)
  const collectIncompleteItems = (dateStr: string): IncompleteItem[] => {
    const items: IncompleteItem[] = [];

    // Goals
    goals.forEach((g: any) => {
      const scheduled = Number(g.scheduleMap?.[dateStr] || 0);
      const done = Math.min(Number(g.currentMap?.[dateStr] || 0), scheduled);
      const remaining = scheduled - done;
      if (remaining > 0) {
        items.push({ type: 'goal', goalId: g.id, goalName: g.name, goalColor: g.color, unit: g.unit, date: dateStr, remaining });
      }
    });

    // Memos (Tasks) — assignedDate 기준 (없으면 날짜 키 기준, 하위 호환)
    const dateMemos = (Object.entries(memos) as [string, any[]][])
      .flatMap(([k, items]) => items.map((m: any) => ({ ...m, _originKey: k })))
      .filter((m: any) => (m.assignedDate ?? m._originKey) === dateStr);
    dateMemos.forEach((m: any) => {
      if (!m.completed) {
        items.push({ type: 'memo', memoId: m.id, memoText: m.text, date: dateStr, _originKey: m._originKey } as any);
      }
    });

    // Project steps — 해당 날짜에 assignedDate가 지정되고 미완료인 것
    (projects || []).forEach((p: any) => {
      p.steps.forEach((s: any) => {
        if (s.assignedDate === dateStr && !s.completed) {
          items.push({ type: 'project_step', projectId: p.id, projectName: p.name, projectColor: p.color, stepId: s.id, stepName: s.name, date: dateStr });
        }
      });
    });

    return items;
  };

  const isPastDate = selectedDate < todayKST;
  const incompleteItems = isPastDate ? collectIncompleteItems(selectedDate) : [];
  const hasIncomplete = incompleteItems.length > 0;

  // 재분배 필요한 과거 날짜 목록 (캘린더 빨간 점 + 홈 빨간 점 공용)
  const pastIncompleteDates = React.useMemo(() => {
    const allDates = new Set<string>();
    goals.forEach((g: any) => Object.keys(g.scheduleMap || {}).forEach((d: string) => allDates.add(d)));
    Object.keys(memos).forEach((d: string) => allDates.add(d));
    // routines: 빨간 점 대상 아님 — 루틴은 미달성해도 총량에서 감소만 됨
    // project steps: assignedDate가 있는 것
    (projects || []).forEach((p: any) => {
      p.steps.forEach((s: any) => { if (s.assignedDate) allDates.add(s.assignedDate); });
    });

    const result: string[] = [];
    allDates.forEach(d => {
      if (d >= todayKST) return;
      const hasGoalIncomplete = goals.some((g: any) => {
        const scheduled = Number(g.scheduleMap?.[d] || 0);
        const done = Math.min(Number(g.currentMap?.[d] || 0), scheduled);
        return scheduled > 0 && done < scheduled;
      });
      const hasMemoIncomplete = (Object.entries(memos) as [string, any[]][])
        .flatMap(([k, items]) => items.map((m: any) => ({ ...m, _originKey: k })))
        .some((m: any) => (m.assignedDate ?? m._originKey) === d && !m.completed);
      const hasProjectStepIncomplete = (projects || []).some((p: any) =>
        p.steps.some((s: any) => s.assignedDate === d && !s.completed)
      );
      if (hasGoalIncomplete || hasMemoIncomplete || hasProjectStepIncomplete) result.push(d);
    });
    return result;
  }, [goals, memos, projects, todayKST]);

  const hasAnyPastIncomplete = pastIncompleteDates.length > 0;

  const handleStartRedist = () => {
    setRedistDate(selectedDate);
    setRedistModalVisible(true);
  };

  // 목표 탭 → balance modal
  const handleRedistGoalOpen = (item: IncompleteItem) => {
    if (item.type !== 'goal') return;
    const goal = goals.find((g: any) => g.id === item.goalId);
    if (!goal) return;
    setBalanceGoal(goal);
    setLocalSchedule({ ...goal.scheduleMap });
    setBalancePending(0);
    setBalanceKey(k => k + 1);
    setBalanceVisible(true);
  };

  // memo / project_step 탭 → 날짜 선택 모달
  const handleRedistMoveOpen = (item: IncompleteItem) => {
    if (item.type !== 'memo' && item.type !== 'project_step') return;
    setRedistMoveItem(item);
    setRedistPickDate('');
    setRedistMoveModalVisible(true);
  };
  const handleRedistMoveConfirm = () => {
    if (!redistPickDate) { Alert.alert('Select a Date', 'Please select a date to move this item to.'); return; }
    if (redistMoveItem?.type === 'memo') {
      // originKey가 있으면 그 날짜 키의 memo를 찾아 assignedDate만 업데이트
      const memoItem = redistMoveItem as any;
      moveMemo(memoItem.memoId, memoItem._originKey ?? memoItem.date, redistPickDate);
    } else if (redistMoveItem?.type === 'project_step') {
      updateProjectStep(redistMoveItem.projectId, redistMoveItem.stepId, { assignedDate: redistPickDate });
    }
    setRedistMoveModalVisible(false);
    setRedistMoveItem(null);
  };

  // "Move All to Today" — moves every incomplete item on redistDate to today
  const handleMoveAllToToday = () => {
    const items = collectIncompleteItems(redistDate);
    const skippedGoals: string[] = [];

    items.forEach(item => {
      if (item.type === 'memo') {
        const memoItem = item as any;
        moveMemo(memoItem.memoId, memoItem._originKey ?? memoItem.date, todayKST);
      } else if (item.type === 'goal') {
        const goal = goals.find((g: any) => g.id === item.goalId);
        if (!goal) return;
        if (goal.endDate && todayKST > goal.endDate) {
          skippedGoals.push(goal.name);
          return;
        }
        const newSchedule = { ...goal.scheduleMap };
        newSchedule[todayKST] = (newSchedule[todayKST] || 0) + item.remaining;
        updateGoalScheduleMap(item.goalId, newSchedule);
      } else if (item.type === 'project_step') {
        // project step의 assignedDate를 오늘로 변경
        updateProjectStep(item.projectId, item.stepId, { assignedDate: todayKST });
      }
    });

    setRedistModalVisible(false);

    const skipMsgs: string[] = [];
    if (skippedGoals.length > 0) {
      skipMsgs.push(`Goals past deadline (edit deadline first):\n${skippedGoals.map(n => `• ${n}`).join('\n')}`);
    }
    if (skipMsgs.length > 0) {
      Alert.alert('Some Items Could Not Be Moved', skipMsgs.join('\n\n'), [{ text: 'OK' }]);
    }
  };

  // balance modal 확정
  const handleBalanceConfirm = () => {
    if (balancePending !== 0) { Alert.alert('Notice', 'Leftover must be 0.'); return; }
    updateGoalScheduleMap(balanceGoal.id, localSchedule);
    setBalanceVisible(false);
  };

  const submitQuotaEdit = () => {
    const newVal = parseInt(editVal, 10);
    if (isNaN(newVal) || newVal < 0) { Alert.alert('Notice', 'Please enter a number 0 or greater.'); return; }
    // 마감일 이후 날짜에 할당 불가
    if (balanceGoal?.endDate && editDate > balanceGoal.endDate) {
      Alert.alert('Cannot Set', `This date (${editDate}) is after the goal deadline (${balanceGoal.endDate}).`);
      setQuotaModal(false);
      return;
    }
    const diff = (localSchedule[editDate] || 0) - newVal;
    setLocalSchedule((prev: any) => ({ ...prev, [editDate]: newVal }));
    setBalancePending((p: number) => p + diff);
    setQuotaModal(false);
  };

  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [isDdayModalVisible, setDdayModalVisible] = useState(false);
  const [ddayName, setDdayName] = useState('');
  const [ddayDate, setDdayDate] = useState('');
  const [editingDdayId, setEditingDdayId] = useState<string | null>(null);

  // assignedDate 기준으로 오늘 할 일 수집 (하위 호환: assignedDate 없으면 날짜 키 사용)
  const todaysMemos = (Object.entries(memos) as [string, any[]][])
    .flatMap(([dateKey, items]) =>
      items.map((m: any) => ({ ...m, _originKey: dateKey }))
    )
    .filter((m: any) => (m.assignedDate ?? m._originKey) === selectedDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayDayName = dayNames[parseLocalDate(selectedDate).getDay()];
  const todaysRoutines = (routines || []).filter((r: any) => (r.days || []).includes(todayDayName) && r.endDate >= selectedDate && (!r.startDate || r.startDate <= selectedDate) && !(dayOffs || []).includes(selectedDate));
  const todaysRoutineRecords = (routineRecords || {})[selectedDate] || [];
  const completedMemosCount = todaysMemos.filter((m: any) => m.completed).length;
  const activeGoals = goals.filter((g: any) => (g.scheduleMap?.[selectedDate] || 0) > 0);


  let totalRecommend = 0; let totalDone = 0;
  activeGoals.forEach((goal: any) => {
    totalRecommend += Number(goal.scheduleMap[selectedDate] || 0);
    totalDone += Math.min(Number(goal.currentMap?.[selectedDate] || 0), Number(goal.scheduleMap[selectedDate] || 0));
  });

  // Projects with at least one step assigned to selectedDate
  const todaysProjects = (projects || []).filter((p: any) =>
    p.steps.some((s: any) => s.assignedDate === selectedDate)
  );
  let projectTotalSteps = 0;
  let projectDoneSteps = 0;
  todaysProjects.forEach((p: any) => {
    const assigned = p.steps.filter((s: any) => s.assignedDate === selectedDate);
    projectTotalSteps += assigned.length;
    projectDoneSteps += assigned.filter((s: any) => s.completed).length;
  });

  const totalTasks = totalRecommend
    + (showTasksHome ? todaysMemos.length : 0)
    + (showRoutinesHome ? todaysRoutines.length : 0)
    + (showProjectsHome ? projectTotalSteps : 0);
  const completedTasks = totalDone
    + (showTasksHome ? completedMemosCount : 0)
    + (showRoutinesHome ? todaysRoutines.filter((r: any) => todaysRoutineRecords.includes(r.id)).length : 0)
    + (showProjectsHome ? projectDoneSteps : 0);
  const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // BUG-24: memoize so the 3 references in the redistribution modal JSX don't triple-call
  const redistIncompleteItems = React.useMemo(
    () => (redistDate ? collectIncompleteItems(redistDate) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [redistDate, goals, memos, projects]
  );

  const handleSaveDday = () => {
    if (ddayName && ddayDate) {
      if (editingDdayId) setDdays(ddays.map((d: any) => d.id === editingDdayId ? { ...d, name: ddayName, date: ddayDate } : d));
      else setDdays([...ddays, { id: Date.now().toString(), name: ddayName, date: ddayDate }]);
      setDdayModalVisible(false); setDdayName(''); setDdayDate(''); setEditingDdayId(null);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* D-Day 바 — 날짜와 무관하게 항상 상단 표시 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ddayScroll}>
          {ddays.map((d: any) => {
            const diff = Math.round((parseLocalDate(d.date).getTime() - parseLocalDate(todayKST).getTime()) / 86400000);
            return (
              <TouchableOpacity key={d.id} style={styles.ddayBadge} onPress={() => { setEditingDdayId(d.id); setDdayName(d.name); setDdayDate(d.date); setDdayModalVisible(true); }}>
                <Text style={styles.ddayTitle}>{d.name}</Text>
                <Text style={styles.ddayCount}>{diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.ddayAddBtn} onPress={() => { setEditingDdayId(null); setDdayName(''); setDdayDate(''); setDdayModalVisible(true); }}>
            <Ionicons name="add" size={16} color="#7E7E7E" />
            <Text style={styles.ddayAddText}>Add D-Day</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 미완료 재분배 버튼 — 과거 날짜이고 미완료 있을 때만 표시 */}
        {hasIncomplete && (
          <TouchableOpacity style={styles.redistBtn} onPress={handleStartRedist}>
            <Ionicons name="refresh-circle" size={18} color="#FFFFFF" />
            <Text style={styles.redistBtnText}>Redistribute Unfinished Items</Text>
          </TouchableOpacity>
        )}

        <View style={styles.dateRow}>
          <TouchableOpacity hitSlop={HIT} onPress={() => { const d = parseLocalDate(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(getKSTDateStr(d)); }}>
            <Ionicons name="chevron-back" size={24} color="#111111" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.dateCenter}>
            <View style={{ position: 'relative' }}>
              <Text style={styles.dateText}>{selectedDate}</Text>
              {selectedDate === todayKST && hasAnyPastIncomplete && (
                <View style={styles.redDot} />
              )}
            </View>
            <Ionicons name="calendar-outline" size={16} color="#111111" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={HIT} onPress={() => { const d = parseLocalDate(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(getKSTDateStr(d)); }}>
            <Ionicons name="chevron-forward" size={24} color="#111111" />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>{selectedDate === todayKST ? "Today's Progress" : "Daily Progress"}</Text>

        <View style={styles.monochromeCard}>
          <AnimatedProgressCircle rate={rate} />
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardSubtitle}>Completion rate</Text>
            <Text style={styles.cardTitle}>{rate >= 100 ? '100% Clear' : `${rate}% Complete`}</Text>
          </View>
        </View>

        {/* Tasks 섹션 */}
        {showTasksHome && todaysMemos.length > 0 && (
          <>
            <Text style={styles.itemSectionTitle}>Tasks</Text>
            {todaysMemos.map((memo: any) => (
              <TouchableOpacity
                key={memo.id}
                style={[styles.itemCard, memo.completed && { borderColor: '#111111', borderWidth: 2 }, isPastDate && { opacity: 0.75 }]}
                onPress={() => {
                  if (isPastDate) {
                    Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" to reschedule unfinished items.');
                  } else {
                    toggleMemo(selectedDate, memo.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.itemCheckWrap}>
                  {memo.completed
                    ? <Ionicons name="checkmark-circle" size={22} color="#111111" />
                    : <Ionicons name="ellipse-outline" size={22} color="#D3D3D3" />}
                </View>
                <Text style={styles.itemName}>{memo.text}</Text>
                {isPastDate && <Text style={styles.lockedLabel}>locked</Text>}
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Routines 섹션 */}
        {showRoutinesHome && todaysRoutines.length > 0 && (
          <>
            <Text style={styles.itemSectionTitle}>Routines</Text>
            {todaysRoutines.map((routine: any) => {
              const completed = todaysRoutineRecords.includes(routine.id);
              return (
                <TouchableOpacity
                  key={routine.id}
                  style={[styles.itemCard, completed && { borderColor: '#111111', borderWidth: 2 }, isPastDate && { opacity: 0.75 }]}
                  onPress={() => {
                    if (isPastDate) {
                      Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" to reschedule unfinished items.');
                    } else {
                      toggleRoutineRecord(selectedDate, routine.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemCheckWrap}>
                    {completed
                      ? <Ionicons name="checkmark-circle" size={22} color="#111111" />
                      : <Ionicons name="ellipse-outline" size={22} color="#D3D3D3" />}
                  </View>
                  <Text style={styles.itemName}>{routine.name}</Text>
                  {isPastDate && <Text style={styles.lockedLabel}>locked</Text>}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Projects 섹션 */}
        {showProjectsHome && todaysProjects.length > 0 && (
          <>
            <Text style={styles.itemSectionTitle}>Projects</Text>
            {todaysProjects.map((p: any) => {
              const doneCount = p.steps.filter((s: any) => s.completed).length;
              const progressPct = p.steps.length > 0 ? doneCount / p.steps.length : 0;
              const isFullyCompleted = doneCount === p.steps.length;

              // 오늘 배정된 step / 나머지 step 분리
              const todaySteps = p.steps.filter((s: any) => s.assignedDate === selectedDate);
              const otherSteps = p.steps.filter((s: any) => s.assignedDate !== selectedDate);

              return (
                <View
                  key={p.id}
                  style={[styles.itemCard, { flexDirection: 'column', alignItems: 'stretch' }, isFullyCompleted && { borderColor: p.color, borderWidth: 2 }, isPastDate && { opacity: 0.75 }]}
                >
                  {/* 프로젝트 헤더 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <View style={[styles.colorIndicator, { backgroundColor: p.color }]} />
                    <Text style={styles.itemName}>{p.name}</Text>
                    {isPastDate && <Text style={styles.lockedLabel}>locked</Text>}
                  </View>

                  {/* 진행 바 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <View style={{ flex: 1, height: 3, backgroundColor: '#EAEAEA', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${progressPct * 100}%`, height: 3, backgroundColor: p.color, borderRadius: 2 }} />
                    </View>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{doneCount}/{p.steps.length}</Text>
                  </View>

                  {/* 오늘 배정된 step — 체크박스로 완료/취소 가능 */}
                  {todaySteps.length > 0 && (
                    <View style={{ gap: 6 }}>
                      {todaySteps.map((s: any, i: number) => {
                        const stepIdx = p.steps.findIndex((st: any) => st.id === s.id);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
                            onPress={() => {
                              if (isPastDate) {
                                Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" to reschedule unfinished items.');
                              } else {
                                updateProjectStep(p.id, s.id, { completed: !s.completed });
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={s.completed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={22}
                              color={s.completed ? p.color : '#D3D3D3'}
                            />
                            <Text style={{ fontSize: 13, color: s.completed ? '#9CA3AF' : '#111111', fontWeight: '600', flex: 1, textDecorationLine: s.completed ? 'line-through' : 'none' }}>
                              Step {stepIdx + 1}: {s.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* 나머지 step — 표시만 */}
                  {otherSteps.length > 0 && (
                    <View style={{ marginTop: todaySteps.length > 0 ? 8 : 0, gap: 4 }}>
                      {otherSteps.map((s: any) => {
                        const stepIdx = p.steps.findIndex((st: any) => st.id === s.id);
                        return (
                          <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2, opacity: 0.45 }}>
                            <Ionicons
                              name={s.completed ? 'checkmark-circle' : 'ellipse-outline'}
                              size={16}
                              color={s.completed ? p.color : '#D3D3D3'}
                            />
                            <Text style={{ fontSize: 12, color: s.completed ? '#9CA3AF' : '#7E7E7E', flex: 1, textDecorationLine: s.completed ? 'line-through' : 'none' }}>
                              Step {stepIdx + 1}: {s.name}
                              {s.assignedDate ? `  · ${s.assignedDate}` : '  · 미배정'}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {todaySteps.length === 0 && otherSteps.length === 0 && (
                    <Text style={{ fontSize: 12, color: '#A0A0A0' }}>No steps assigned.</Text>
                  )}
                </View>
              );
            })}
          </>
        )}

        {todaysMemos.length === 0 && todaysRoutines.length === 0 && todaysProjects.length === 0 && (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>No tasks scheduled.</Text></View>
        )}

        <Text style={styles.itemSectionTitle}>Goals</Text>
        {activeGoals.length === 0 ? (
          <View style={styles.emptyBox}><Text style={styles.emptyText}>No goals scheduled.</Text></View>
        ) : (
          activeGoals.map((goal: any) => {
            const recommend = Number(goal.scheduleMap[selectedDate] || 0);
            const current = Number(goal.currentMap?.[selectedDate] || 0);
            const isCompleted = current >= recommend && recommend > 0;
            const isPast = selectedDate < todayKST;
            // 오늘이지만 dayEndHour가 지난 경우: 완료량(-) 감소 불가, 증가(+)만 허용
            const isToday = selectedDate === todayKST;
            const isDecreaseLocked = isPast || (isToday && isDayEndPassed);

            return (
              <View key={goal.id} style={[styles.goalCard, isCompleted ? { borderColor: goal.color, borderWidth: 2 } : {}, isPast && { opacity: 0.75 }]}>
                <View style={[styles.colorIndicator, { backgroundColor: goal.color }]} />
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName}>{goal.name}</Text>
                  <Text style={styles.goalRecommend}>Amount: {recommend} {goal.unit}</Text>
                  {isPast && <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Past — locked</Text>}
                  {isToday && isDayEndPassed && !isPast && <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>Day ended — decrease locked</Text>}
                </View>
                <View style={styles.counterPill}>
                  <TouchableOpacity
                    hitSlop={HIT}
                    onPress={() => {
                      if (isPast) {
                        Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" to reschedule unfinished items.');
                      } else if (isDecreaseLocked) {
                        Alert.alert('Locked', 'The day has ended. Completed amount is fixed.\nOnly increases are allowed.');
                      } else {
                        updateGoalCurrent(goal.id, selectedDate, -1);
                      }
                    }}
                  >
                    <Ionicons name="remove" size={18} color={isDecreaseLocked ? '#D3D3D3' : '#111111'} />
                  </TouchableOpacity>
                  <Text style={styles.currentCount}>{current}</Text>
                  <TouchableOpacity
                    hitSlop={HIT}
                    onPress={() => {
                      if (isPast) {
                        Alert.alert('Day Locked', 'This day has passed and is locked.\nUse "Redistribute" to reschedule unfinished items.');
                      } else if (current >= recommend) {
                        Alert.alert('Goal Reached!', 'You have completed today\'s quota.\nTo add more, edit the schedule in the Goals tab.');
                      } else {
                        updateGoalCurrent(goal.id, selectedDate, 1);
                      }
                    }}
                  >
                    <Ionicons name="add" size={18} color={isPast ? '#D3D3D3' : '#111111'} />
                  </TouchableOpacity>
                </View>
                {isCompleted && <Ionicons name="checkmark-circle" size={28} color={goal.color} style={{ marginLeft: 15 }} />}
              </View>
            );
          })
        )}

        <Modal visible={isCalendarVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}><View style={styles.modalContent}>
            {hasAnyPastIncomplete && (
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', borderRadius: 10, padding: 10, marginBottom: 10, gap: 8 }}>
                <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                <Text style={{ fontSize: 12, color: '#FF3B30', fontWeight: '600' }}>
                  Unfinished plans remaining · {pastIncompleteDates.length} {pastIncompleteDates.length === 1 ? 'day' : 'days'}
                </Text>
              </View>
            )}
            <Calendar
              onDayPress={(day: any) => { setSelectedDate(day.dateString); setCalendarVisible(false); }}
              markedDates={pastIncompleteDates.reduce((acc: any, d) => {
                acc[d] = { marked: false };
                return acc;
              }, {})}
              theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
              dayComponent={({ date, onPress }: any) => {
                const isIncomplete = pastIncompleteDates.includes(date.dateString);
                const isSelected = date.dateString === selectedDate;
                const isToday = date.dateString === todayKST;
                return (
                  <TouchableOpacity
                    onPress={() => onPress(date)}
                    style={{
                      width: 36, height: 36, borderRadius: 18,
                      justifyContent: 'center', alignItems: 'center',
                      backgroundColor: isIncomplete ? '#FF3B30' : isSelected ? '#111111' : 'transparent',
                      borderWidth: isToday && !isIncomplete && !isSelected ? 1.5 : 0,
                      borderColor: '#111111',
                    }}
                  >
                    <Text style={{
                      fontSize: 14, fontWeight: isToday || isSelected || isIncomplete ? '700' : '400',
                      color: isIncomplete || isSelected ? '#FFFFFF' : '#111111',
                    }}>
                      {date.day}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity onPress={() => setCalendarVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
          </View></View>
        </Modal>

        {/* 재분배 모달 — 목록 방식 */}
        <Modal visible={redistModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Redistribute Unfinished Items</Text>
              <Text style={{ color: '#7E7E7E', fontSize: 13, marginBottom: 12 }}>{redistDate} · Tap an item to reschedule it</Text>
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {redistIncompleteItems.map((item, idx) => {
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.redistItemCard}
                      onPress={() => {
                        if (item.type === 'goal') handleRedistGoalOpen(item);
                        else if (item.type === 'memo') handleRedistMoveOpen(item);
                        else if (item.type === 'project_step') handleRedistMoveOpen(item);
                        else if (item.type === 'routine') {
                          Alert.alert(
                            'Routine Cannot Be Moved',
                            `"${item.routineName}" is a day-based routine and cannot be rescheduled to another date.\n\nYou can mark it complete or edit the routine's schedule in the Goals tab.`,
                            [{ text: 'OK' }]
                          );
                        }
                      }}
                    >
                      {item.type === 'goal' ? (
                        <>
                          <View style={[styles.redistColorBar, { backgroundColor: item.goalColor }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.redistItemName}>{item.goalName}</Text>
                            <Text style={styles.redistItemDetail}>Remaining: {item.remaining} {item.unit}</Text>
                          </View>
                          <Ionicons name="calendar-outline" size={18} color="#7E7E7E" />
                        </>
                      ) : item.type === 'memo' ? (
                        <>
                          <View style={[styles.redistColorBar, { backgroundColor: '#6366F1' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.redistItemName}>{item.memoText}</Text>
                            <Text style={styles.redistItemDetail}>Task · Tap to move to another date</Text>
                          </View>
                          <Ionicons name="arrow-forward-outline" size={18} color="#7E7E7E" />
                        </>
                      ) : item.type === 'routine' ? (
                        <>
                          <View style={[styles.redistColorBar, { backgroundColor: '#22C55E' }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.redistItemName}>{item.routineName}</Text>
                            <Text style={styles.redistItemDetail}>Routine · Day-based, cannot move date</Text>
                          </View>
                          <Ionicons name="information-circle-outline" size={18} color="#9CA3AF" />
                        </>
                      ) : item.type === 'project_step' ? (
                        <>
                          <View style={[styles.redistColorBar, { backgroundColor: item.projectColor }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.redistItemName}>{item.projectName}</Text>
                            <Text style={styles.redistItemDetail}>Step: {item.stepName} · Tap to move</Text>
                          </View>
                          <Ionicons name="arrow-forward-outline" size={18} color="#7E7E7E" />
                        </>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
                {redistIncompleteItems.length === 0 && (
                  <Text style={{ color: '#A0A0A0', textAlign: 'center', paddingVertical: 20 }}>All items handled!</Text>
                )}
              </ScrollView>
              {redistIncompleteItems.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtn, { marginTop: 12, flexDirection: 'row', gap: 8 }]}
                  onPress={() => {
                    Alert.alert(
                      'Move All to Today',
                      'Move all unfinished items from this day to today?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Move All', onPress: handleMoveAllToToday },
                      ]
                    );
                  }}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.btnText}>Move All to Today</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.closeBtn, { marginTop: 4 }]} onPress={() => setRedistModalVisible(false)}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 날짜 이동 모달 (Task / Project Step 공용) */}
        <Modal visible={redistMoveModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {redistMoveItem?.type === 'project_step' ? 'Move Step to Date' : 'Move Task to Date'}
              </Text>
              {redistMoveItem?.type === 'memo' && (
                <Text style={{ color: '#7E7E7E', fontSize: 13, marginBottom: 10 }}>{redistMoveItem.memoText}</Text>
              )}
              {redistMoveItem?.type === 'project_step' && (
                <Text style={{ color: '#7E7E7E', fontSize: 13, marginBottom: 10 }}>
                  {redistMoveItem.projectName} · {redistMoveItem.stepName}
                </Text>
              )}
              <Calendar
                current={todayKST}
                minDate={todayKST}
                onDayPress={(day: any) => setRedistPickDate(day.dateString)}
                markedDates={redistPickDate ? { [redistPickDate]: { selected: true, selectedColor: '#111111' } } : {}}
                theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
              />
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EAEAEA', flex: 1 }]} onPress={() => setRedistMoveModalVisible(false)}>
                  <Text style={[styles.btnText, { color: '#7E7E7E' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { flex: 2, opacity: redistPickDate ? 1 : 0.4 }]} onPress={handleRedistMoveConfirm}>
                  <Text style={styles.btnText}>Move Here</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Balance Modal (목표 재분배용) */}
        <Modal visible={balanceVisible} transparent animationType="fade">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {!quotaModal ? (
                <>
                  <Text style={styles.modalTitle}>Edit Schedule</Text>
                  <Text style={{ color: '#7E7E7E', fontSize: 13, marginBottom: 10 }}>{balanceGoal?.name}</Text>
                  {balancePending !== 0 && (
                    <View style={{ backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#111111' }}>
                      <Text style={{ color: '#111111', fontWeight: 'bold' }}>
                        Leftover: {balancePending > 0 ? `+${balancePending}` : balancePending} {balanceGoal?.unit}
                      </Text>
                    </View>
                  )}
                  <View style={{ borderRadius: 15, overflow: 'hidden', minHeight: 350, borderWidth: balancePending !== 0 ? 2 : 0, borderColor: '#111111' }}>
                    <Calendar
                      key={`balance-${balanceKey}`}
                      current={todayKST}
                      markedDates={Object.keys(localSchedule).reduce((acc: any, d) => { acc[d] = { marked: true }; return acc; }, {})}
                      theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
                      dayComponent={({ date }: any) => {
                        const q = localSchedule[date.dateString] || 0;
                        const isAfterDeadline = balanceGoal?.endDate && date.dateString > balanceGoal.endDate;
                        const isPast = date.dateString < todayKST;
                        const isDisabled = !!isAfterDeadline || isPast;
                        return (
                          <TouchableOpacity
                            onPress={() => {
                              if (isAfterDeadline) {
                                Alert.alert(
                                  'Past Deadline',
                                  `You cannot schedule tasks after the goal deadline (${balanceGoal?.endDate}).\n\nTo add tasks beyond this date, please update the goal's deadline first.`,
                                  [{ text: 'OK' }]
                                );
                                return;
                              }
                              if (isPast) return;
                              setEditDate(date.dateString);
                              setEditVal(q.toString());
                              setQuotaModal(true);
                            }}
                            disabled={isDisabled}
                            style={{ width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 2, backgroundColor: q > 0 ? balanceGoal?.color : isDisabled ? '#F0F0F0' : '#F9F9F9', opacity: isDisabled ? 0.35 : 1 }}
                          >
                            <Text style={{ color: isDisabled ? '#CCCCCC' : q > 0 ? '#FFFFFF' : '#7E7E7E', fontSize: 13, fontWeight: q > 0 ? 'bold' : 'normal' }}>{date.day}</Text>
                            {q > 0 && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>{q}</Text>}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: balancePending !== 0 ? '#D3D3D3' : '#111111', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 14 }}
                    onPress={handleBalanceConfirm}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => { setBalanceVisible(false); setRedistModalVisible(true); }}>
                    <Text style={styles.closeText}>Back</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Set Amount</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={editVal} onChangeText={setEditVal} autoFocus />
                  <TouchableOpacity style={styles.actionBtn} onPress={submitQuotaEdit}>
                    <Text style={styles.btnText}>Update</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setQuotaModal(false)}>
                    <Text style={styles.closeText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── D-Day 추가/수정 모달 (바텀시트 스타일) ── */}
        <Modal visible={isDdayModalVisible} transparent animationType="slide">
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.ddaySheetOverlay}>
              <View style={styles.ddaySheet}>

                {/* 헤더 */}
                <View style={styles.ddaySheetHeader}>
                  <View style={styles.ddaySheetHandle} />
                  <Text style={styles.ddaySheetTitle}>
                    {editingDdayId ? 'Edit D-Day' : 'Add D-Day'}
                  </Text>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* ① 이름 입력 섹션 */}
                  <View style={styles.ddaySectionBox}>
                    <Text style={styles.ddaySectionLabel}>Name</Text>
                    <TextInput
                      style={styles.ddayNameInput}
                      placeholder="e.g. SAT, Finals, Interview"
                      placeholderTextColor="#B0B0B0"
                      value={ddayName}
                      onChangeText={setDdayName}
                      autoFocus={!editingDdayId}
                      returnKeyType="done"
                    />
                    {ddayName.length > 0 && ddayDate && (
                      <View style={styles.ddayPreviewBadge}>
              <Text style={styles.ddayPreviewText}>
                          {ddayName}  {(() => {
                            const diff = Math.round((parseLocalDate(ddayDate).getTime() - parseLocalDate(todayKST).getTime()) / 86400000);
                            return diff === 0 ? 'D-Day' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`;
                          })()}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* 구분선 */}
                  <View style={styles.ddaySectionDivider} />

                  {/* ② 날짜 선택 섹션 */}
                  <View style={styles.ddaySectionBox}>
                    <Text style={styles.ddaySectionLabel}>Select Date</Text>
                    {ddayDate ? (
                      <View style={styles.ddaySelectedDateBox}>
                        <Ionicons name="calendar" size={16} color="#6366F1" />
                        <Text style={styles.ddaySelectedDateText}>{ddayDate}</Text>
                      </View>
                    ) : (
                      <Text style={styles.ddayNoDateText}>Pick a date from the calendar below</Text>
                    )}
                    <View style={{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#EAEAEA', marginTop: 10 }}>
                      <Calendar
                        onDayPress={(day: any) => setDdayDate(day.dateString)}
                        markedDates={ddayDate ? { [ddayDate]: { selected: true, selectedColor: '#6366F1' } } : {}}
                        theme={{
                          todayTextColor: '#6366F1',
                          arrowColor: '#6366F1',
                          selectedDayBackgroundColor: '#6366F1',
                          selectedDayTextColor: '#FFFFFF',
                        }}
                      />
                    </View>
                  </View>

                  {/* 버튼 영역 */}
                  <View style={styles.ddayBtnArea}>
                    {editingDdayId && (
                      <TouchableOpacity
                        style={styles.ddayDeleteBtn}
                        onPress={() => {
                          Alert.alert('Delete', `Delete "${ddayName}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => {
                              setDdays(ddays.filter((d: any) => d.id !== editingDdayId));
                              setDdayModalVisible(false);
                              setDdayName(''); setDdayDate(''); setEditingDdayId(null);
                            }},
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                        <Text style={styles.ddayDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.ddaySaveBtn, (!ddayName || !ddayDate) && { opacity: 0.4 }]}
                      onPress={handleSaveDday}
                      disabled={!ddayName || !ddayDate}
                    >
                      <Text style={styles.ddaySaveBtnText}>Save</Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={{ padding: 16, alignItems: 'center', marginBottom: 8 }}
                    onPress={() => { setDdayModalVisible(false); setDdayName(''); setDdayDate(''); setEditingDdayId(null); }}
                  >
                    <Text style={{ color: '#9CA3AF', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 20, paddingTop: 50 },
  ddayScroll: { marginBottom: 20, flexDirection: 'row', maxHeight: 45 },
  ddayBadge: { backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, marginRight: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  ddayTitle: { fontSize: 13, color: '#7E7E7E', marginRight: 8 },
  ddayCount: { fontSize: 14, fontWeight: 'bold', color: '#111111' },
  ddayAddBtn: { borderWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFFFFF', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  ddayAddText: { fontSize: 13, fontWeight: 'bold', color: '#7E7E7E', marginLeft: 4 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  dateCenter: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 16, color: '#111111', fontWeight: 'bold' },
  headerTitle: { fontSize: Math.round(24 * S), fontWeight: 'bold', color: '#111111', marginBottom: 20 },
  monochromeCard: { backgroundColor: '#111111', borderRadius: 20, padding: Math.round(25 * S), flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  progressNumber: { color: '#FFFFFF', fontSize: Math.round(13 * S), fontWeight: 'bold' },
  cardTextContainer: { justifyContent: 'center' },
  cardSubtitle: { color: '#A0A0A0', fontSize: Math.round(14 * S), marginBottom: 5 },
  cardTitle: { color: '#FFFFFF', fontSize: Math.round(20 * S), fontWeight: 'bold' },
  sectionTitle: { fontSize: Math.round(18 * S), fontWeight: 'bold', color: '#111111', marginBottom: 15, marginTop: 10 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 30, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#EAEAEA' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },
  memoContainer: { marginBottom: 30 },
  memoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  memoItemCompleted: { backgroundColor: '#F9F9F9' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D3D3D3', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxCompleted: { backgroundColor: '#111111', borderColor: '#111111' },
  memoText: { fontSize: 16, color: '#111111', flex: 1, fontWeight: '600' },
  memoTextCompleted: { color: '#A0A0A0', fontWeight: '400' },
  subSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 16, gap: 8 },
  subSectionIconWrap: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  subSectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 },
  subSectionCount: { fontSize: 12, fontWeight: '600', color: '#9CA3AF' },
  itemGroupCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8, overflow: 'hidden' },
  groupItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  groupItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  roundCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  roundCheckDone: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  groupItemText: { fontSize: 15, fontWeight: '600', color: '#111111', flex: 1 },
  groupItemTextDone: { color: '#9CA3AF', fontWeight: '400' },
  lockedLabel: { fontSize: 10, color: '#D1D5DB', marginLeft: 8 },
  groupItemDoneTask: { borderLeftWidth: 3, borderLeftColor: '#6366F1', backgroundColor: '#F9F9FF' },
  groupItemDoneRoutine: { borderLeftWidth: 3, borderLeftColor: '#22C55E', backgroundColor: '#F0FDF4' },
  groupItemDoneProject: { borderLeftWidth: 3, borderLeftColor: '#F97316', backgroundColor: '#FFF7ED' },
  itemSectionTitle: { fontSize: Math.round(16 * S), fontWeight: 'bold', color: '#111111', marginTop: 22, marginBottom: 10 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  itemCheck: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D3D3D3', marginRight: 14, justifyContent: 'center', alignItems: 'center' },
  itemCheckWrap: { marginRight: 12 },
  itemName: { fontSize: Math.round(15 * S), fontWeight: '600', color: '#111111', flex: 1 },
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  colorIndicator: { width: 4, height: '80%', borderRadius: 2, marginRight: 15 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: Math.round(16 * S), fontWeight: 'bold', color: '#111111', marginBottom: 5 },
  goalRecommend: { fontSize: Math.round(13 * S), color: '#7E7E7E' },
  counterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F4', borderRadius: 20, paddingHorizontal: Math.round(10 * S), paddingVertical: Math.round(5 * S) },
  currentCount: { fontSize: Math.round(16 * S), fontWeight: 'bold', marginHorizontal: Math.round(15 * S), minWidth: 20, textAlign: 'center', color: '#111111' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 15 },
  btnRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  actionBtn: { backgroundColor: '#111111', alignSelf: 'stretch', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeText: { fontWeight: 'bold', color: '#7E7E7E' },
  redistBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF3B30', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 16 },
  redistBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  redistProgress: { alignSelf: 'flex-end', backgroundColor: '#F4F4F4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  redistProgressText: { fontSize: 12, color: '#7E7E7E', fontWeight: 'bold' },
  redistItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EAEAEA' },
  redistColorBar: { width: 4, height: '100%', borderRadius: 2, marginRight: 12 },
  redistItemName: { fontSize: 15, fontWeight: 'bold', color: '#111111', marginBottom: 2 },
  redistItemDetail: { fontSize: 12, color: '#7E7E7E' },
  redistCalLabel: { fontSize: 14, fontWeight: 'bold', color: '#111111', marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 10, marginBottom: 15, color: '#111111', borderWidth: 1, borderColor: '#EAEAEA', fontSize: 15 },
  redDot: { position: 'absolute', top: -3, right: -8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' },
  // D-Day 바텀시트 스타일
  ddaySheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  ddaySheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%', paddingBottom: 16 },
  ddaySheetHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  ddaySheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 14 },
  ddaySheetTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  ddaySectionBox: { paddingHorizontal: 20, paddingTop: 18 },
  ddaySectionLabel: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  ddayNameInput: { backgroundColor: '#F9FAFB', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, fontWeight: '600', color: '#111111' },
  ddayPreviewBadge: { marginTop: 10, alignSelf: 'flex-start', backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  ddayPreviewText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  ddaySectionDivider: { height: 1, backgroundColor: '#F3F4F6', marginTop: 18 },
  ddaySelectedDateBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  ddaySelectedDateText: { fontSize: 14, fontWeight: '700', color: '#6366F1' },
  ddayNoDateText: { fontSize: 13, color: '#B0B0B0' },
  ddayBtnArea: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  ddayDeleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#FCA5A5', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#FFF5F5' },
  ddayDeleteText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  ddaySaveBtn: { flex: 1, backgroundColor: '#111111', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  ddaySaveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
