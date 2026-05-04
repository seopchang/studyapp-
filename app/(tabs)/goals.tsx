import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { GoalsContext, PALETTE, getKSTDateStr } from '../../context/GoalsContext';

LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GoalsScreen() {
  const { goals, addGoal, updateGoal, deleteGoal, updateGoalScheduleMap } = useContext(GoalsContext);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [balanceModalVisible, setBalanceModalVisible] = useState(false);
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

  const openEdit = (g: any) => {
    setEditingId(g.id); setName(g.name); setTotal(g.total.toString());
    setUnit(g.unit); setEnd(g.endDate); setDays(g.days);
    setColor(g.color); setStyle(g.distributionStyle || 'even');
    setCustomQuota(g.customDailyQuota?.toString() || '');
    setModalVisible(true);
  };

  const handleSave = () => {
    // 1. 필수 입력값 체크
    if (!name || !total || !end || days.length === 0) { 
      Alert.alert('Notice', 'Please fill all required fields.'); 
      return; 
    }
    
    // 2. 숫자로 강제 변환하여 데이터 타입 오류 완벽 차단
    const totalNum = Number(total);
    const quotaNum = Number(customQuota);

    // 3. Custom 모드 시 물리적 달성 가능 여부 철저 검증 (알림창 자물쇠 로직)
    if (style === 'custom') {
      const todayStr = getKSTDateStr();
      const [ty, tm, td] = todayStr.split('-').map(num => Number(num));
      const [ey, em, ed] = end.split('-').map(num => Number(num));

      const startDate = new Date(ty, tm - 1, td);
      const endDate = new Date(ey, em - 1, ed);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      let activeDaysCount = 0;
      let checkDate = new Date(startDate);
      
      while (checkDate <= endDate) {
        const dayName = dayNames[checkDate.getDay()];
        if (days.includes(dayName)) activeDaysCount++;
        checkDate.setDate(checkDate.getDate() + 1);
      }

      let remainingAmount = totalNum;
      if (editingId) {
        const currentGoal = goals.find((g: any) => g.id === editingId);
        if (currentGoal) {
          let pastTotal = 0;
          Object.keys(currentGoal.scheduleMap || {}).forEach(dateKey => {
            if (dateKey < todayStr) pastTotal += Number(currentGoal.scheduleMap[dateKey] || 0);
          });
          remainingAmount = Math.max(0, totalNum - pastTotal);
        }
      }

      // 🌟 [최종 방어벽] 남은 날짜 대비 할당량이 부족하면 무조건 저장을 차단
      if ((activeDaysCount * quotaNum) < remainingAmount) {
        Alert.alert(
          'Schedule Error',
          `Deadline: ${end}\nAvailable days: ${activeDaysCount} days\nMax capacity: ${activeDaysCount * quotaNum} ${unit}\n\nYou need at least ${remainingAmount} ${unit}. Please increase daily amount or extend the deadline.`
        );
        return; 
      }
    }

    // 검증 통과 시에만 저장 진행
    const data = { 
      name, total: totalNum, unit, endDate: end, days, color, 
      distributionStyle: style, customDailyQuota: quotaNum 
    };
    
    if (editingId) updateGoal(editingId, data);
    else addGoal(data);
    
    setModalVisible(false);
  };

  const openBalance = (goal: any) => {
    setSelGoal(goal); 
    setLocalSchedule({...goal.scheduleMap}); 
    setPending(0); 
    setModalOpenKey(prev => prev + 1); 
    setBalanceModalVisible(true); 
  };

  const closeBalance = () => {
    setBalanceModalVisible(false);
  };

  const submitQuotaEdit = () => {
    const newVal = parseInt(editVal);
    if (isNaN(newVal) || newVal < 0) { Alert.alert('Notice', 'Invalid amount.'); return; }
    const diff = (localSchedule[editDate] || 0) - newVal;
    setLocalSchedule({ ...localSchedule, [editDate]: newVal });
    setPending(pending + diff);
    setQuotaModal(false);
  };

  const markedForUpdate = useMemo(() => {
    const marks: any = {};
    Object.keys(localSchedule).forEach(d => { marks[d] = { marked: true }; });
    return marks;
  }, [localSchedule]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Goals</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setEditingId(null); setName(''); setTotal(''); setUnit(''); setEnd(''); setDays([]); setColor(PALETTE[0]); setStyle('even'); setCustomQuota(''); setModalVisible(true); }}>
          <Text style={styles.addBtnText}>Add Goal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {goals.map((g: any) => {
          const rate = g.total > 0 ? Math.min(Math.round((g.current / g.total) * 100), 100) : 0;
          return (
            <TouchableOpacity key={g.id} style={styles.goalItem} onPress={() => openBalance(g)}>
              <View style={styles.goalInfo}>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4}}>
                  <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: g.color, marginRight: 8}} />
                  <Text style={styles.goalName}>{g.name}</Text>
                </View>
                <Text style={styles.goalDetail}>Progress: {g.current} / {g.total}{g.unit}</Text>
                <View style={styles.barBg}>
                  <View style={[styles.barFill, { backgroundColor: g.color, width: `${rate}%` }]} />
                  <Text style={[styles.barPercentText, rate > 50 ? {color: '#FFFFFF'} : {color: '#111111'}]}>{rate}%</Text>
                </View>
                <Text style={styles.goalDays}>{g.days.join(', ')} | Ends: {g.endDate}</Text>
              </View>
              <TouchableOpacity onPress={() => openEdit(g)}><Ionicons name="pencil-outline" size={22} color="#7E7E7E" /></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteGoal(g.id)} style={{marginLeft: 12}}><Ionicons name="trash-outline" size={22} color="#111111" /></TouchableOpacity>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}><ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.modalTitle}>{editingId ? 'Edit Goal' : 'New Goal'}</Text>
          <TextInput style={styles.input} placeholder="Goal Name" value={name} onChangeText={setName} />
          <View style={{flexDirection: 'row', gap: 10}}>
            <TextInput style={[styles.input, {flex: 2}]} placeholder="Total" keyboardType="numeric" value={total} onChangeText={setTotal} />
            <TextInput style={[styles.input, {flex: 1}]} placeholder="Unit" value={unit} onChangeText={setUnit} />
          </View>
          <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisible(true)}><Text style={{ color: end ? '#111111' : '#A0A0A0' }}>{end || 'Select End Date'}</Text></TouchableOpacity>
          <Text style={styles.label}>Split Method</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, style === 'even' && styles.toggleActive]} onPress={() => setStyle('even')}><Text style={[styles.toggleText, style === 'even' && {color: '#FFFFFF'}]}>Evenly</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, style === 'custom' && styles.toggleActive]} onPress={() => setStyle('custom')}><Text style={[styles.toggleText, style === 'custom' && {color: '#FFFFFF'}]}>Custom</Text></TouchableOpacity>
          </View>
          {style === 'custom' && <TextInput style={styles.input} placeholder="Daily Amount" keyboardType="numeric" value={customQuota} onChangeText={setCustomQuota} />}
          <Text style={styles.label}>Theme Color</Text>
          <View style={styles.palette}>{PALETTE.map(c => <TouchableOpacity key={c} style={[styles.colorDot, {backgroundColor: c}, color === c && {borderWidth: 3, borderColor: '#111111'}]} onPress={() => setColor(c)} />)}</View>
          <Text style={styles.label}>Repeat Days</Text>
          <View style={styles.dayRow}>
            {DAYS.map(day => (
              <TouchableOpacity key={day} style={[styles.dayCircle, days.includes(day) && {backgroundColor: '#111111'}]} onPress={() => setDays(days.includes(day) ? days.filter(x => x !== day) : [...days, day])}>
                <Text style={[styles.dayText, days.includes(day) && {color: '#FFFFFF'}]}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSave}><Text style={styles.primaryBtnText}>Save Goal</Text></TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
        </ScrollView></View></View>
      </Modal>

      <Modal visible={balanceModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Schedule</Text>
          {pending !== 0 && <View style={styles.balanceWarning}><Text style={{color: '#111111', fontWeight:'bold'}}>Leftover: {pending > 0 ? `+${pending}` : pending} {selGoal?.unit}</Text></View>}
          <View style={[styles.calendarContainer, pending !== 0 && { borderColor: '#111111', borderWidth: 2 }]}>
            <Calendar key={`cal-stable-${modalOpenKey}`} current={getKSTDateStr()} markedDates={markedForUpdate} theme={{todayTextColor: '#111111', arrowColor: '#111111'}} dayComponent={({date}: any) => {
                const q = localSchedule[date.dateString] || 0;
                return (
                  <TouchableOpacity onPress={() => { setEditDate(date.dateString); setEditVal(q.toString()); setQuotaModal(true); }} style={[styles.dayCell, {backgroundColor: q > 0 ? selGoal?.color : '#F9F9F9'}]}>
                    <Text style={{color: q > 0 ? '#FFFFFF' : '#7E7E7E', fontSize: 13, fontWeight: q > 0 ? 'bold' : 'normal'}}>{date.day}</Text>
                    {q > 0 && <Text style={{color: '#FFFFFF', fontSize: 11, fontWeight: 'bold'}}>{q}</Text>}
                  </TouchableOpacity>
                );
              }} 
            />
          </View>
          <TouchableOpacity style={[styles.primaryBtn, pending !== 0 && {backgroundColor: '#D3D3D3'}]} onPress={() => { if(pending === 0) { updateGoalScheduleMap(selGoal.id, localSchedule); closeBalance(); } else Alert.alert('Notice', 'Leftover must be 0.'); }}><Text style={styles.primaryBtnText}>Confirm</Text></TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={closeBalance}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={quotaModal} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={[styles.modalContent, {maxHeight: '30%'}]}>
          <Text style={styles.modalTitle}>Set Amount</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={editVal} onChangeText={setEditVal} autoFocus />
          <TouchableOpacity style={styles.primaryBtn} onPress={submitQuotaEdit}><Text style={styles.primaryBtnText}>Update</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={isDatePickerVisible} transparent><View style={styles.modalOverlay}><View style={styles.modalContent}><Calendar onDayPress={(day: any) => { setEnd(day.dateString); setDatePickerVisible(false); }} theme={{todayTextColor: '#111111', arrowColor: '#111111'}} /></View></View></Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 20, paddingTop: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111111' },
  addBtn: { backgroundColor: '#111111', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { fontWeight: 'bold', color: '#FFFFFF', fontSize: 13 },
  goalItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 17, fontWeight: 'bold', color: '#111111' },
  goalDetail: { fontSize: 13, color: '#7E7E7E', fontWeight: '500' },
  barBg: { height: 16, backgroundColor: '#EAEAEA', borderRadius: 8, width: '100%', marginVertical: 10, justifyContent: 'center', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 8, position: 'absolute', left: 0, top: 0 },
  barPercentText: { fontSize: 10, fontWeight: 'bold', position: 'absolute', alignSelf: 'center', zIndex: 1 },
  goalDays: { fontSize: 12, color: '#A0A0A0' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 15 },
  input: { backgroundColor: '#F9F9F9', padding: 16, borderRadius: 12, marginBottom: 15, color: '#111111', fontSize: 15, borderWidth: 1, borderColor: '#EAEAEA' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#111111', marginTop: 5, marginBottom: 10 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#F4F4F4', borderRadius: 10, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#111111' },
  toggleText: { color: '#A0A0A0', fontWeight: 'bold' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16, margin: 6 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  dayCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F4F4' },
  dayText: { color: '#A0A0A0', fontWeight: 'bold' },
  primaryBtn: { backgroundColor: '#111111', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeText: { fontWeight: 'bold', color: '#7E7E7E' },
  calendarContainer: { borderRadius: 15, overflow: 'hidden', minHeight: 350 },
  balanceWarning: { backgroundColor: '#F9F9F9', padding: 12, borderRadius: 10, marginBottom: 15, alignItems: 'center', borderWidth: 1, borderColor: '#111111' },
  dayCell: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 2 }
});