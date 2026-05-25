import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useMemo, useState } from 'react';
import {
  Alert, Dimensions, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { GoalsContext, PALETTE, getKSTDateStr } from '../../context/GoalsContext';

const SCREEN_W = Dimensions.get('window').width;
// 태블릿(768px+)이면 1.35배 스케일
const S = SCREEN_W >= 768 ? 1.35 : 1;

LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── ▲▼ 버튼 방식 순서 변경 ────────────────────────────────────────
function ReorderList({ goals, onReorder }: { goals: any[]; onReorder: (newOrder: any[]) => void }) {
  const [ordered, setOrdered] = useState<any[]>(goals);

  React.useEffect(() => { setOrdered(goals); }, [goals]);

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...ordered];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrdered(next);
    onReorder(next);
  };

  return (
    <View>
      {ordered.map((g: any, idx: number) => (
        <View key={g.id} style={styles.reorderItem}>
          <View style={[styles.reorderColorBar, { backgroundColor: g.color }]} />
          <Text style={styles.reorderName} numberOfLines={1}>{g.name}</Text>
          <View style={styles.arrowGroup}>
            <TouchableOpacity
              style={[styles.arrowBtn, idx === 0 && styles.arrowBtnDisabled]}
              onPress={() => move(idx, -1)}
              disabled={idx === 0}
            >
              <Ionicons name="chevron-up" size={18} color={idx === 0 ? '#D1D5DB' : '#111111'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowBtn, idx === ordered.length - 1 && styles.arrowBtnDisabled]}
              onPress={() => move(idx, 1)}
              disabled={idx === ordered.length - 1}
            >
              <Ionicons name="chevron-down" size={18} color={idx === ordered.length - 1 ? '#D1D5DB' : '#111111'} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

// ── 일반 목표 리스트 ──────────────────────────────────────────────
function GoalList({ goals, onEdit, onDelete, onOpenBalance }: {
  goals: any[]; onEdit: (g: any) => void; onDelete: (id: string) => void; onOpenBalance: (g: any) => void;
}) {
  return (
    <View>
      {goals.map((g: any) => {
        const rate = g.total > 0 && g.current > 0 ? Math.min(Math.round((g.current / g.total) * 100), 100) : 0;
        return (
          <View key={g.id} style={styles.goalItem}>
            <TouchableOpacity style={styles.goalInfo} onPress={() => onOpenBalance(g)} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: g.color, marginRight: 8 }} />
                <Text style={styles.goalName}>{g.name}</Text>
              </View>
              <Text style={styles.goalDetail}>Progress: {g.current} / {g.total}{g.unit}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { backgroundColor: g.color, width: `${rate}%` }]} />
                <Text style={[styles.barPercentText, rate > 50 ? { color: '#FFFFFF' } : { color: '#111111' }]}>{rate}%</Text>
              </View>
              <Text style={styles.goalDays}>{g.days.join(', ')} | Ends: {g.endDate}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(g)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={22} color="#7E7E7E" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(g.id)} style={{ marginLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={22} color="#111111" />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

// ── 메인 화면 ────────────────────────────────────────────────────
export default function GoalsScreen() {
  const { goals, routines, routineRecords, addGoal, updateGoal, deleteGoal, addRoutine, updateRoutine, deleteRoutine, updateGoalScheduleMap, reorderGoals, ddays, projects, addProject, updateProject, deleteProject, showRoutinesTab, showProjectsTab, dayOffs } = useContext(GoalsContext);

  const [activeMainTab, setActiveMainTab] = useState<'goals' | 'routines' | 'projects'>('goals');

  // 탭이 꺼지면 goals로 복귀
  React.useEffect(() => {
    if (activeMainTab === 'routines' && !showRoutinesTab) setActiveMainTab('goals');
    if (activeMainTab === 'projects' && !showProjectsTab) setActiveMainTab('goals');
  }, [showRoutinesTab, showProjectsTab]);

  const [isReorderMode, setIsReorderMode] = useState(false);
  const [completedModalVisible, setCompletedModalVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
  const [routineCalendarVisible, setRoutineCalendarVisible] = useState(false);
  const [selRoutine, setSelRoutine] = useState<any>(null);
  const [projectCalendarVisible, setProjectCalendarVisible] = useState(false);
  const [selProject, setSelProject] = useState<any>(null);
  const [projCalSelDate, setProjCalSelDate] = useState<string | null>(null);


  const [projectModalVisible, setProjectModalVisible] = useState(false);
  const [projEditingId, setProjEditingId] = useState<string | null>(null);
  const [projName, setProjName] = useState('');
  const [projColor, setProjColor] = useState(PALETTE[0]);
  const [projEndDate, setProjEndDate] = useState('');
  const [projSteps, setProjSteps] = useState<any[]>([{ id: Date.now().toString(), name: '', assignedDate: '', completed: false }]);
  const [datePickerTarget, setDatePickerTarget] = useState<string>('goal');

  const [modalOpenKey, setModalOpenKey] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [total, setTotal] = useState('');
  const [unit, setUnit] = useState('');
  const [end, setEnd] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [color, setColor] = useState(PALETTE[0]);
  const [style, setStyle] = useState('even');
  const [customQuota, setCustomQuota] = useState('');

  const [localSchedule, setLocalSchedule] = useState<any>({});
  const [pending, setPending] = useState(0);
  const [quotaModal, setQuotaModal] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editVal, setEditVal] = useState('');
  const [selGoal, setSelGoal] = useState<any>(null);

  const completedGoals = goals.filter((g: any) => g.total > 0 && g.current >= g.total);
  const activeGoals = goals.filter((g: any) => !(g.total > 0 && g.current >= g.total));

  const openRoutineCalendar = (r: any) => {
    setSelRoutine(r);
    setRoutineCalendarVisible(true);
  };

  const getRoutineStats = (r: any) => {
    const todayStr = getKSTDateStr();
    const startStr = r.startDate || todayStr;
    const endStr = r.endDate;
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let total = 0;
    let checkDate = new Date(startDate);
    while (checkDate <= endDate) {
      const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (r.days.includes(dayNames[checkDate.getDay()]) && !(dayOffs || []).includes(dStr)) {
        total++;
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }
    let completed = 0;
    Object.keys(routineRecords || {}).forEach(date => {
      if (date >= startStr && date <= endStr && (routineRecords[date] || []).includes(r.id)) {
        if (!(dayOffs || []).includes(date)) {
          completed++;
        }
      }
    });
    return { total, completed };
  };

  const openProjectCalendar = (p: any) => {
    setSelProject(p);
    setProjCalSelDate(null);
    setProjectCalendarVisible(true);
  };


  const handleSaveProject = () => {
    const validSteps = projSteps.filter(s => s.name.trim().length > 0);
    if (!projName || validSteps.length === 0) {
      Alert.alert('Notice', 'Please fill in the project name and add at least one step.');
      return;
    }

    if (projEditingId) {
      updateProject(projEditingId, { name: projName, color: projColor, steps: validSteps, endDate: projEndDate || undefined });
    } else {
      addProject({ name: projName, color: projColor, steps: validSteps, endDate: projEndDate || undefined });
    }
    setProjectModalVisible(false);
  };

  const openEdit = (g: any) => {
    setEditingId(g.id); setName(g.name); setTotal(g.total.toString());
    setUnit(g.unit); setEnd(g.endDate); setDays(g.days);
    setColor(g.color); setStyle(g.distributionStyle || 'even');
    setCustomQuota(g.customDailyQuota?.toString() || '');
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!name || !end || days.length === 0 || (activeMainTab === 'goals' && (!total || !unit))) {
      Alert.alert('Notice', 'Please fill all required fields.');
      return;
    }
    if (activeMainTab === 'routines') {
      const todayStr = getKSTDateStr();
      const data = editingId
        ? { name, endDate: end, days, color }
        : { name, endDate: end, days, color, startDate: todayStr };
      if (editingId) updateRoutine(editingId, data);
      else addRoutine(data);
      setModalVisible(false);
      return;
    }
    const totalNum = Number(total);
    const quotaNum = Number(customQuota);

    if (style === 'custom') {
      const todayStr = getKSTDateStr();
      const [ty, tm, td] = todayStr.split('-').map(Number);
      const [ey, em, ed] = end.split('-').map(Number);
      const startDate = new Date(ty, tm - 1, td);
      const endDate = new Date(ey, em - 1, ed);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      let activeDaysCount = 0;
      let checkDate = new Date(startDate);
      while (checkDate <= endDate) {
        if (days.includes(dayNames[checkDate.getDay()])) activeDaysCount++;
        checkDate.setDate(checkDate.getDate() + 1);
      }
      let remainingAmount = totalNum;
      if (editingId) {
        const currentGoal = goals.find((g: any) => g.id === editingId);
        if (currentGoal) {
          let pastTotal = 0;
          Object.keys(currentGoal.scheduleMap || {}).forEach((dateKey: string) => {
            if (dateKey < todayStr) pastTotal += Number(currentGoal.scheduleMap[dateKey] || 0);
          });
          remainingAmount = Math.max(0, totalNum - pastTotal);
        }
      }
      if ((activeDaysCount * quotaNum) < remainingAmount) {
        Alert.alert('Schedule Error', `Deadline: ${end}\nAvailable days: ${activeDaysCount} days\nMax capacity: ${activeDaysCount * quotaNum} ${unit}\n\nYou need at least ${remainingAmount} ${unit}. Please increase daily amount or extend the deadline.`);
        return;
      }
    }

    const data = { name, total: totalNum, unit, endDate: end, days, color, distributionStyle: style, customDailyQuota: quotaNum };
    if (editingId) updateGoal(editingId, data);
    else addGoal(data);
    setModalVisible(false);
  };

  const openBalance = (goal: any) => {
    setSelGoal(goal);
    setLocalSchedule({ ...goal.scheduleMap });
    setPending(0);
    setModalOpenKey(prev => prev + 1);
    setBalanceModalVisible(true);
  };

  const submitQuotaEdit = () => {
    const newVal = parseInt(editVal, 10);
    if (isNaN(newVal) || newVal < 0) { Alert.alert('Notice', 'Please enter a number 0 or greater.'); return; }
    setLocalSchedule((prev: any) => {
      const diff = (prev[editDate] || 0) - newVal;
      setPending((p: number) => p + diff);
      return { ...prev, [editDate]: newVal };
    });
    setQuotaModal(false);
  };

  const markedForUpdate = useMemo(() => {
    const marks: any = {};
    Object.keys(localSchedule).forEach(d => { marks[d] = { marked: true }; });
    return marks;
  }, [localSchedule]);

  return (
    <View style={styles.container}>
      {/* ── 헤더 ── */}
      {isReorderMode ? (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Order</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setIsReorderMode(false)}>
            <Text style={styles.addBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ marginBottom: 16 }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Plans</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => {
              if (activeMainTab === 'projects') {
                setProjEditingId(null); setProjName(''); setProjSteps([{ id: Date.now().toString(), name: '', assignedDate: '', completed: false }]); setProjColor(PALETTE[0]); setProjEndDate('');
                setProjectModalVisible(true);
              } else {
                setEditingId(null); setName(''); setTotal(''); setUnit(''); setEnd('');
                setDays([]); setColor(PALETTE[0]); setStyle('even'); setCustomQuota('');
                setModalVisible(true);
              }
            }}>
              <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.addBtnText}>New {activeMainTab === 'goals' ? 'Goal' : activeMainTab === 'routines' ? 'Routine' : 'Project'}</Text>
            </TouchableOpacity>
          </View>

          {/* 탭 스위처 */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity style={[styles.tabSwitchBtn, activeMainTab === 'goals' && styles.tabSwitchBtnActive]} onPress={() => setActiveMainTab('goals')}>
              <Text style={[styles.tabSwitchText, activeMainTab === 'goals' && styles.tabSwitchTextActive]}>Goals</Text>
            </TouchableOpacity>
            {showRoutinesTab && (
              <TouchableOpacity style={[styles.tabSwitchBtn, activeMainTab === 'routines' && styles.tabSwitchBtnActive]} onPress={() => setActiveMainTab('routines')}>
                <Text style={[styles.tabSwitchText, activeMainTab === 'routines' && styles.tabSwitchTextActive]}>Routines</Text>
              </TouchableOpacity>
            )}
            {showProjectsTab && (
              <TouchableOpacity style={[styles.tabSwitchBtn, activeMainTab === 'projects' && styles.tabSwitchBtnActive]} onPress={() => setActiveMainTab('projects')}>
                <Text style={[styles.tabSwitchText, activeMainTab === 'projects' && styles.tabSwitchTextActive]}>Projects</Text>
              </TouchableOpacity>
            )}
          </View>

          {activeMainTab === 'goals' && (
            <View style={styles.subActionRow}>
              <TouchableOpacity style={styles.subActionBtn} onPress={() => setIsReorderMode(true)}>
                <Ionicons name="swap-vertical-outline" size={15} color="#6B7280" />
                <Text style={styles.subActionText}>Edit Order</Text>
              </TouchableOpacity>
              {completedGoals.length > 0 && (
                <TouchableOpacity style={[styles.subActionBtn, styles.subActionBtnHighlight]} onPress={() => setCompletedModalVisible(true)}>
                  <Ionicons name="trophy-outline" size={15} color="#D97706" />
                  <Text style={[styles.subActionText, { color: '#D97706' }]}>Completed · {completedGoals.length}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* ── 리스트 ── */}
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {isReorderMode ? (
          <ReorderList goals={goals} onReorder={(newOrder) => reorderGoals(newOrder)} />
        ) : activeMainTab === 'goals' ? (
          <GoalList
            goals={activeGoals}
            onEdit={openEdit}
            onDelete={(id) => {
              Alert.alert('Delete', 'Are you sure you want to delete this goal?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) }
              ]);
            }}
            onOpenBalance={openBalance}
          />
        ) : activeMainTab === 'routines' ? (
          <View>
            {(routines || []).map((r: any) => {
              const { total, completed } = getRoutineStats(r);
              const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
              <TouchableOpacity key={r.id} style={styles.goalItem} onPress={() => openRoutineCalendar(r)} activeOpacity={0.7}>
                <View style={styles.goalInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: r.color, marginRight: 8 }} />
                    <Text style={styles.goalName}>{r.name}</Text>
                  </View>
                  <Text style={styles.goalDays}>{(r.days || []).join(', ')} | Ends: {r.endDate}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { backgroundColor: r.color, width: `${progressPct}%` }]} />
                    <Text style={[styles.barPercentText, progressPct > 50 ? { color: '#FFFFFF' } : { color: '#111111' }]}>
                      {completed}/{total}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => {
                  setEditingId(r.id); setName(r.name); setEnd(r.endDate); setDays(r.days); setColor(r.color);
                  setModalVisible(true);
                }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="pencil-outline" size={22} color="#7E7E7E" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  Alert.alert('Delete', 'Are you sure you want to delete this routine?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteRoutine(r.id) }
                  ]);
                }} style={{ marginLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="trash-outline" size={22} color="#111111" />
                </TouchableOpacity>
              </TouchableOpacity>
              );
            })}
          </View>
        ) : activeMainTab === 'projects' ? (
          <View>
            {(projects || []).map((p: any) => {
              const completedCount = p.steps.filter((s: any) => s.completed).length;
              const totalCount = p.steps.length;
              const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              return (
                <View key={p.id} style={styles.goalItem}>
                  <TouchableOpacity style={styles.goalInfo} onPress={() => openProjectCalendar(p)} activeOpacity={0.7}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: p.color, marginRight: 8 }} />
                      <Text style={styles.goalName} numberOfLines={1}>{p.name}</Text>
                    </View>
                    <Text style={styles.goalDays}>{p.steps.length} steps</Text>
                    <View style={styles.barBg}>
                      <View style={[styles.barFill, { backgroundColor: p.color, width: `${progressPct}%` }]} />
                      <Text style={[styles.barPercentText, progressPct > 50 ? { color: '#FFFFFF' } : { color: '#111111' }]}>
                        {completedCount}/{totalCount} steps
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setProjEditingId(p.id); setProjName(p.name); setProjColor(p.color); setProjEndDate(p.endDate || '');
                    setProjSteps(p.steps.length > 0 ? p.steps : [{ id: Date.now().toString(), name: '', assignedDate: '', completed: false }]);
                    setProjectModalVisible(true);
                  }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="pencil-outline" size={22} color="#7E7E7E" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    Alert.alert('Delete', 'Are you sure you want to delete this project?', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteProject(p.id) }
                    ]);
                  }} style={{ marginLeft: 12 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={22} color="#111111" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      {/* ── 목표 추가/수정 모달 ── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{editingId ? (activeMainTab === 'goals' ? 'Edit Goal' : 'Edit Routine') : (activeMainTab === 'goals' ? 'New Goal' : 'New Routine')}</Text>
                <TextInput style={styles.input} placeholder={activeMainTab === 'goals' ? "Goal Name *" : "Routine Name *"} placeholderTextColor="#A0A0A0" value={name} onChangeText={setName} />
                {activeMainTab === 'goals' && (
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput style={[styles.input, { flex: 2 }]} placeholder="Total *" placeholderTextColor="#A0A0A0" keyboardType="numeric" value={total} onChangeText={setTotal} />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder="Unit *" placeholderTextColor="#A0A0A0" value={unit} onChangeText={setUnit} />
                  </View>
                )}
                <TouchableOpacity style={styles.input} onPress={() => { setDatePickerTarget('goal'); setDatePickerVisible(true); }}>
                  <Text style={{ color: end ? '#111111' : '#A0A0A0' }}>{end || 'Select End Date *'}</Text>
                </TouchableOpacity>
                {activeMainTab === 'goals' && (
                  <>
                    <Text style={styles.label}>Split Method</Text>
                    <View style={styles.toggleRow}>
                      <TouchableOpacity style={[styles.toggleBtn, style === 'even' && styles.toggleActive]} onPress={() => setStyle('even')}>
                        <Text style={[styles.toggleText, style === 'even' && { color: '#FFFFFF' }]}>Evenly</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.toggleBtn, style === 'custom' && styles.toggleActive]} onPress={() => setStyle('custom')}>
                        <Text style={[styles.toggleText, style === 'custom' && { color: '#FFFFFF' }]}>Custom</Text>
                      </TouchableOpacity>
                    </View>
                    {style === 'custom' && (
                      <TextInput style={styles.input} placeholder="Daily Amount" placeholderTextColor="#A0A0A0" keyboardType="numeric" value={customQuota} onChangeText={setCustomQuota} />
                    )}
                  </>
                )}
                <Text style={styles.label}>Theme Color</Text>
                <View style={styles.palette}>
                  {PALETTE.map(c => (
                    <TouchableOpacity key={c} style={[styles.colorDot, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: '#111111' }]} onPress={() => setColor(c)} />
                  ))}
                </View>
                <Text style={styles.label}>Repeat Days *</Text>
                <View style={styles.dayRow}>
                  {DAYS.map(day => (
                    <TouchableOpacity key={day} style={[styles.dayCircle, days.includes(day) && { backgroundColor: '#111111' }]} onPress={() => setDays(days.includes(day) ? days.filter(x => x !== day) : [...days, day])}>
                      <Text style={[styles.dayText, days.includes(day) && { color: '#FFFFFF' }]}>{day}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}>
                  <Text style={styles.primaryBtnText}>{editingId ? 'Update' : activeMainTab === 'routines' ? 'Save Routine' : 'Save Goal'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.closeText}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 달성 목표 모달 ── */}
      <Modal visible={completedModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <Ionicons name="trophy" size={22} color="#F59E0B" style={{ marginRight: 8 }} />
              <Text style={styles.modalTitle}>Completed Goals</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {completedGoals.length === 0 ? (
                <Text style={{ color: '#A0A0A0', textAlign: 'center', paddingVertical: 30 }}>No completed goals yet.</Text>
              ) : (
                completedGoals.map((g: any) => (
                  <View key={g.id} style={styles.completedItem}>
                    <View style={[styles.completedBadge, { backgroundColor: g.color }]}>
                      <Text style={styles.completedBadgeText}>100%</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.completedName}>{g.name}</Text>
                      <Text style={styles.completedDetail}>{g.current} / {g.total}{g.unit} · Ends {g.endDate}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => {
                        Alert.alert('Move to Active', `Move "${g.name}" back to active goals?\nPast progress records will be kept; only the current map resets.`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Move', onPress: () => {
                              updateGoal(g.id, {
                                name: g.name, total: g.total, unit: g.unit,
                                endDate: g.endDate, days: g.days, color: g.color,
                                distributionStyle: g.distributionStyle,
                                customDailyQuota: g.customDailyQuota,
                                currentMap: {},
                              });
                            }
                          },
                        ]);
                      }}>
                        <Ionicons name="refresh-outline" size={20} color="#6366F1" />
                      </TouchableOpacity>
                      <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} onPress={() => Alert.alert('Delete', `Delete "${g.name}"?`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(g.id) },
                      ])}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => setCompletedModalVisible(false)}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 일정 편집 모달 ── */}
      <Modal visible={balanceModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {!quotaModal ? (
                <>
                  <Text style={styles.modalTitle}>Edit Schedule</Text>
                  {pending !== 0 && (
                    <View style={styles.balanceWarning}>
                      <Text style={{ color: '#111111', fontWeight: 'bold' }}>Leftover: {pending > 0 ? `+${pending}` : pending} {selGoal?.unit}</Text>
                    </View>
                  )}
                  <View style={[styles.calendarContainer, pending !== 0 && { borderColor: '#111111', borderWidth: 2 }]}>
                    <Calendar
                      key={`cal-${modalOpenKey}`}
                      current={getKSTDateStr()}
                      markedDates={markedForUpdate}
                      theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
                      dayComponent={({ date }: any) => {
                        const q = localSchedule[date.dateString] || 0;
                        const isAfterDeadline = selGoal?.endDate && date.dateString > selGoal.endDate;
                        const isPastDate = date.dateString < getKSTDateStr();
                        const isDisabled = !!isAfterDeadline || isPastDate;
                        return (
                          <TouchableOpacity
                            onPress={() => { if (isDisabled) return; setEditDate(date.dateString); setEditVal(q.toString()); setQuotaModal(true); }}
                            style={[styles.dayCell, { backgroundColor: q > 0 ? selGoal?.color : isDisabled ? '#F0F0F0' : '#F9F9F9', opacity: isDisabled ? 0.25 : 1 }]}
                            disabled={isDisabled}
                          >
                            <Text style={{ color: isDisabled ? '#CCCCCC' : q > 0 ? '#FFFFFF' : '#7E7E7E', fontSize: 13, fontWeight: q > 0 ? 'bold' : 'normal' }}>{date.day}</Text>
                            {q > 0 && <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' }}>{q}</Text>}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, pending !== 0 && { backgroundColor: '#D3D3D3' }]}
                    onPress={() => {
                      if (pending === 0) { updateGoalScheduleMap(selGoal.id, localSchedule); setBalanceModalVisible(false); }
                      else Alert.alert('Notice', 'Leftover must be 0.');
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.closeBtn} onPress={() => setBalanceModalVisible(false)}>
                    <Text style={styles.closeText}>Close</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Set Amount</Text>
                  <TextInput style={styles.input} keyboardType="numeric" value={editVal} onChangeText={setEditVal} autoFocus />
                  <TouchableOpacity style={styles.primaryBtn} onPress={submitQuotaEdit}>
                    <Text style={styles.primaryBtnText}>Update</Text>
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

      <Modal visible={isDatePickerVisible} transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.datePickerTitle}>Select Deadline</Text>
            {(() => {
              const isStepTarget = datePickerTarget !== 'goal' && datePickerTarget !== 'proj_end';
              const selectedDate = datePickerTarget === 'goal' ? end : datePickerTarget === 'proj_end' ? projEndDate : projSteps.find(s => s.id === datePickerTarget)?.assignedDate;
              // 다른 스텝들의 날짜 맵: dateString → stepIndex
              const otherStepDates: Record<string, number> = {};
              if (isStepTarget) {
                projSteps.forEach((s, idx) => {
                  if (s.id !== datePickerTarget && s.assignedDate) {
                    otherStepDates[s.assignedDate] = idx;
                  }
                });
              }
              return (
                <Calendar
                  onDayPress={(day: any) => {
                    if (datePickerTarget === 'goal') setEnd(day.dateString);
                    else if (datePickerTarget === 'proj_end') setProjEndDate(day.dateString);
                    else setProjSteps(prev => prev.map(s => s.id === datePickerTarget ? { ...s, assignedDate: day.dateString } : s));
                  }}
                  theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
                  dayComponent={({ date }: any) => {
                    const isSelected = date.dateString === selectedDate;
                    const isDday = ((ddays as any[]) || []).find((d: any) => d.date === date.dateString);
                    const otherIdx = otherStepDates[date.dateString];
                    const hasOtherStep = isStepTarget && otherIdx !== undefined;
                    return (
                      <TouchableOpacity
                        onPress={() => {
                          if (datePickerTarget === 'goal') setEnd(date.dateString);
                          else if (datePickerTarget === 'proj_end') setProjEndDate(date.dateString);
                          else setProjSteps(prev => prev.map(s => s.id === datePickerTarget ? { ...s, assignedDate: date.dateString } : s));
                        }}
                        style={[
                          styles.dayCell,
                          {
                            backgroundColor: isSelected
                              ? '#111111'
                              : hasOtherStep
                              ? projColor + '55'
                              : isDday
                              ? '#FFF0F0'
                              : '#F9F9F9',
                          }
                        ]}
                      >
                        <Text style={{
                          fontSize: 13,
                          fontWeight: isSelected || hasOtherStep ? 'bold' : 'normal',
                          color: isSelected ? '#FFFFFF' : hasOtherStep ? projColor : isDday ? '#FF3B30' : '#7E7E7E',
                        }}>
                          {date.day}
                        </Text>
                        {hasOtherStep && (
                          <Text style={{ fontSize: 9, color: projColor, fontWeight: 'bold', position: 'absolute', bottom: 2 }}>
                            {otherIdx + 1}
                          </Text>
                        )}
                        {isDday && !hasOtherStep && !isSelected && (
                          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF3B30', position: 'absolute', bottom: 3 }} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              );
            })()}
            {/* 선택한 날짜가 D-day면 이름 표시 */}
            {(() => {
              const pickedDate = datePickerTarget === 'goal' ? end : datePickerTarget === 'proj_end' ? projEndDate : projSteps.find(s => s.id === datePickerTarget)?.assignedDate;
              const ddayMatch = pickedDate && ((ddays as any[]) || []).find((d: any) => d.date === pickedDate);
              return ddayMatch ? (
                <View style={styles.ddayHint}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30' }} />
                  <Text style={styles.ddayHintText}>D-day · {ddayMatch.name}</Text>
                </View>
              ) : null;
            })()}
            {/* 스텝 날짜 선택 시 범례 */}
            {datePickerTarget !== 'goal' && datePickerTarget !== 'proj_end' && projSteps.some(s => s.id !== datePickerTarget && s.assignedDate) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: projColor + '55' }} />
                <Text style={{ fontSize: 11, color: '#7E7E7E' }}>Other steps (number = step index)</Text>
              </View>
            )}
            {(() => {
              const pickedDate = datePickerTarget === 'goal' ? end : datePickerTarget === 'proj_end' ? projEndDate : projSteps.find(s => s.id === datePickerTarget)?.assignedDate;
              return (
                <>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 4, opacity: pickedDate ? 1 : 0.4 }]}
                    onPress={() => { if (pickedDate) setDatePickerVisible(false); }}
                  >
                    <Text style={styles.primaryBtnText}>
                      {pickedDate ? `${pickedDate} Selected` : 'Select a date'}
                    </Text>
                  </TouchableOpacity>
                </>
              );
            })()}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setDatePickerVisible(false)}>
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 루틴 캘린더 모달 ── */}
      <Modal visible={routineCalendarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Routine Schedule</Text>
            <Text style={{ color: '#7E7E7E', fontSize: 13, marginBottom: 10 }}>{selRoutine?.name} (Ends: {selRoutine?.endDate})</Text>

            <View style={styles.calendarContainer}>
              <Calendar
                current={getKSTDateStr()}
                theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
                dayComponent={({ date }: any) => {
                  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                  const dateObj = new Date(date.year, date.month - 1, date.day);
                  const dayName = dayNames[dateObj.getDay()];

                  const isActiveDay = (selRoutine?.days || []).includes(dayName)
                    && date.dateString >= (selRoutine?.startDate || '0000-01-01')
                    && date.dateString <= (selRoutine?.endDate || '9999-12-31');
                  const isCompleted = ((routineRecords || {})[date.dateString] || []).includes(selRoutine?.id);

                  return (
                    <View style={[
                      styles.dayCell,
                      {
                        backgroundColor: isCompleted ? selRoutine?.color : isActiveDay ? selRoutine?.color + '40' : '#F9F9F9',
                        opacity: isActiveDay || isCompleted ? 1 : 0.3
                      }
                    ]}>
                      <Text style={{
                        color: isCompleted ? '#FFFFFF' : isActiveDay ? '#111111' : '#7E7E7E',
                        fontSize: 13,
                        fontWeight: isActiveDay || isCompleted ? 'bold' : 'normal'
                      }}>
                        {date.day}
                      </Text>
                      {isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" style={{ marginTop: 2, position: 'absolute', bottom: 2 }} />}
                    </View>
                  );
                }}
              />
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 14 }]} onPress={() => setRoutineCalendarVisible(false)}>
              <Text style={styles.primaryBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 프로젝트 캘린더 모달 ── */}
      <Modal visible={projectCalendarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Project Timeline</Text>
            <Text style={{ color: '#7E7E7E', fontSize: 13, marginBottom: 10 }}>{selProject?.name}</Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>

            <View style={styles.calendarContainer}>
              <Calendar
                current={getKSTDateStr()}
                theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
                dayComponent={({ date }: any) => {
                  const isEnd = date.dateString === selProject?.endDate;
                  const isPastOrToday = date.dateString <= getKSTDateStr();
                  const isToday = date.dateString === getKSTDateStr();
                  const stepsOnDay = (selProject?.steps || []).filter((s: any) => s.assignedDate === date.dateString);
                  const hasStep = stepsOnDay.length > 0;
                  const allDone = hasStep && stepsOnDay.every((s: any) => s.completed);
                  const isSelected = date.dateString === projCalSelDate;
                  return (
                    <TouchableOpacity
                      onPress={() => setProjCalSelDate(date.dateString === projCalSelDate ? null : date.dateString)}
                      style={[
                        styles.dayCell,
                        isSelected && { borderWidth: 2, borderColor: '#111111' },
                        {
                          backgroundColor: isEnd ? selProject?.color : allDone ? selProject?.color + 'CC' : hasStep ? selProject?.color + '55' : '#F9F9F9',
                          opacity: 1,
                        },
                      ]}
                    >
                      <Text style={{ color: isEnd || allDone ? '#FFFFFF' : isPastOrToday ? '#111111' : '#7E7E7E', fontSize: 13, fontWeight: isEnd || isToday || hasStep ? 'bold' : 'normal' }}>
                        {date.day}
                      </Text>
                      {isEnd && <Ionicons name="flag" size={10} color="#FFFFFF" style={{ position: 'absolute', bottom: 2 }} />}
                      {hasStep && !isEnd && stepsOnDay.slice(0, 2).map((s: any, i: number) => (
                        <Text key={s.id} numberOfLines={1} style={{ fontSize: 7, color: allDone ? '#FFFFFF' : '#111111', fontWeight: '600', maxWidth: 40, textAlign: 'center' }}>
                          {s.name}
                        </Text>
                      ))}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* 선택 날짜의 스텝 목록 */}
            {projCalSelDate && (
              <View style={{ marginTop: 12, backgroundColor: '#F9F9F9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EAEAEA' }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#111111', marginBottom: 8 }}>
                  {projCalSelDate}
                </Text>
                {(selProject?.steps || []).filter((s: any) => s.assignedDate === projCalSelDate).length > 0 ? (
                  (selProject?.steps || []).filter((s: any) => s.assignedDate === projCalSelDate).map((s: any) => {
                    const stepIdx = (selProject?.steps || []).findIndex((st: any) => st.id === s.id);
                    return (
                      <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <View style={[styles.checkbox, s.completed && { backgroundColor: selProject?.color, borderColor: selProject?.color }]} />
                        <Text style={{ fontSize: 13, color: s.completed ? '#A0A0A0' : '#111111', flex: 1 }}>
                          Step {stepIdx + 1}. {s.name}
                        </Text>
                        {s.completed && <Ionicons name="checkmark-circle" size={16} color={selProject?.color} />}
                      </View>
                    );
                  })
                ) : (
                  <Text style={{ fontSize: 13, color: '#A0A0A0' }}>No steps assigned to this date.</Text>
                )}
              </View>
            )}

            {/* 범례 */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: selProject?.color + '55' }} />
                <Text style={{ fontSize: 11, color: '#7E7E7E' }}>Assigned</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: selProject?.color + 'CC' }} />
                <Text style={{ fontSize: 11, color: '#7E7E7E' }}>Completed</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: selProject?.color }} />
                <Text style={{ fontSize: 11, color: '#7E7E7E' }}>Deadline</Text>
              </View>
            </View>

            </ScrollView>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={() => { setProjCalSelDate(null); setProjectCalendarVisible(false); }}>
              <Text style={styles.primaryBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 프로젝트 추가/수정 모달 ── */}
      <Modal visible={projectModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.modalTitle}>{projEditingId ? 'Edit Project' : 'New Project'}</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name</Text>
                  <TextInput style={styles.input} placeholder="Project Name (e.g. Science Fair)" value={projName} onChangeText={setProjName} />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>End Date (optional)</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => { setDatePickerTarget('proj_end'); setDatePickerVisible(true); }}
                  >
                    <Text style={{ color: projEndDate ? '#111111' : '#A0A0A0' }}>{projEndDate || 'Select end date (optional)'}</Text>
                  </TouchableOpacity>
                  {projEndDate ? (
                    <TouchableOpacity onPress={() => setProjEndDate('')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -8, marginBottom: 4 }}>
                      <Ionicons name="close-circle-outline" size={14} color="#A0A0A0" />
                      <Text style={{ fontSize: 12, color: '#A0A0A0' }}>Clear</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Steps</Text>
                  {projSteps.map((step, idx) => (
                    <View key={step.id} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0 }]}
                          placeholder={`Step ${idx + 1}`}
                          value={step.name}
                          onChangeText={text => setProjSteps(prev => prev.map(s => s.id === step.id ? { ...s, name: text } : s))}
                        />
                        <TouchableOpacity
                          style={styles.dateBtn}
                          onPress={() => { setDatePickerTarget(step.id); setDatePickerVisible(true); }}
                        >
                          <Ionicons name="calendar-outline" size={20} color={step.assignedDate ? '#111111' : '#D3D3D3'} />
                        </TouchableOpacity>
                        {projSteps.length > 1 && (
                          <TouchableOpacity
                            style={{ padding: 10, marginLeft: 4 }}
                            onPress={() => setProjSteps(prev => prev.filter(s => s.id !== step.id))}
                          >
                            <Ionicons name="close-circle-outline" size={22} color="#FF3B30" />
                          </TouchableOpacity>
                        )}
                      </View>
                      {step.assignedDate ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4 }}>
                          <Ionicons name="calendar" size={13} color="#6B7280" />
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>{step.assignedDate}</Text>
                          <TouchableOpacity onPress={() => setProjSteps(prev => prev.map(s => s.id === step.id ? { ...s, assignedDate: '' } : s))}>
                            <Ionicons name="close" size={13} color="#A0A0A0" />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, marginTop: 4, backgroundColor: '#F3F4F6', borderRadius: 8 }}
                    onPress={() => setProjSteps(prev => [...prev, { id: Date.now().toString(), name: '', assignedDate: '', completed: false }])}
                  >
                    <Ionicons name="add" size={16} color="#111111" />
                    <Text style={{ marginLeft: 6, fontWeight: 'bold', color: '#111111' }}>Add Step</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Color</Text>
                  <View style={styles.colorPalette}>
                    {PALETTE.map(c => (
                      <TouchableOpacity key={c} onPress={() => setProjColor(c)} style={[styles.colorCircle, { backgroundColor: c }, projColor === c && styles.colorCircleSelected]} />
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => setProjectModalVisible(false)}>
                    <Text style={[styles.primaryBtnText, { color: '#7E7E7E' }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { flex: 2 }]} onPress={handleSaveProject}>
                    <Text style={styles.primaryBtnText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerTitle: { fontSize: Math.round(24 * S), fontWeight: 'bold', color: '#111111' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111111', paddingHorizontal: Math.round(16 * S), paddingVertical: Math.round(10 * S), borderRadius: 20 },
  addBtnText: { fontWeight: 'bold', color: '#FFFFFF', fontSize: Math.round(13 * S) },
  subActionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  subActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F6', paddingHorizontal: Math.round(14 * S), paddingVertical: Math.round(8 * S), borderRadius: 20 },
  subActionBtnHighlight: { backgroundColor: '#FEF3C7' },
  subActionText: { fontSize: Math.round(13 * S), fontWeight: '600', color: '#6B7280' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
  tabBtnText: { fontSize: 15, fontWeight: 'bold', color: '#6B7280' },
  tabBtnTextActive: { color: '#111111' },
  tabSwitcher: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 3, alignSelf: 'flex-start', marginBottom: 12 },
  tabSwitchBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6' },
  tabSwitchBtnActive: { backgroundColor: '#111111' },
  tabSwitchText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabSwitchTextActive: { color: '#FFFFFF' },
  // 순서 변경 아이템
  reorderItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  reorderColorBar: { width: 5, height: 32, borderRadius: 3, marginRight: 14 },
  reorderName: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#111111', marginRight: 8 },
  arrowGroup: { flexDirection: 'column', gap: 4 },
  arrowBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  arrowBtnDisabled: { backgroundColor: '#F9FAFB' },
  // 일반 목표 아이템
  goalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 17, fontWeight: 'bold', color: '#111111' },
  goalDetail: { fontSize: 13, color: '#7E7E7E', fontWeight: '500' },
  barBg: { height: 16, backgroundColor: '#EAEAEA', borderRadius: 8, width: '100%', marginVertical: 10, justifyContent: 'center', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, position: 'absolute', left: 0, top: 0 },
  barPercentText: { fontSize: 10, fontWeight: 'bold', position: 'absolute', alignSelf: 'center', zIndex: 1 },
  goalDays: { fontSize: 12, color: '#A0A0A0' },
  // 달성 목표
  completedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  completedBadge: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  completedBadgeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 11 },
  completedName: { fontSize: 15, fontWeight: 'bold', color: '#111111', marginBottom: 2 },
  completedDetail: { fontSize: 12, color: '#7E7E7E' },
  // 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 15 },
  input: { backgroundColor: '#F9F9F9', padding: 16, borderRadius: 12, marginBottom: 15, color: '#111111', fontSize: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#111111', marginTop: 5, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F4F4F4', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#111111' },
  toggleText: { color: '#A0A0A0', fontWeight: 'bold' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20, gap: 8 },
  colorDot: { width: 34, height: 34, borderRadius: 17, margin: 2 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4' },
  dayText: { color: '#A0A0A0', fontWeight: 'bold', fontSize: 11 },
  primaryBtn: { backgroundColor: '#111111', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeText: { fontWeight: 'bold', color: '#7E7E7E' },
  calendarContainer: { borderRadius: 15, overflow: 'hidden', minHeight: 350 },
  balanceWarning: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#111111' },
  dayCell: { width: 42, minHeight: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 2, paddingVertical: 4 },
  datePickerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 8 },
  ddayHint: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  ddayHintText: { fontSize: 12, color: '#FF3B30' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#111111', marginBottom: 6 },
  dateBtn: { padding: 12, backgroundColor: '#EAEAEA', borderRadius: 10, marginLeft: 10 },
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorCircle: { width: 34, height: 34, borderRadius: 17 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#111111' },
  checkbox: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: '#D3D3D3', alignItems: 'center', justifyContent: 'center' },
});
