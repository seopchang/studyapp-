import { Ionicons } from '@expo/vector-icons';
import React, { useContext, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { GoalsContext, getKSTDateStr } from '../../context/GoalsContext';

export default function HomeScreen() {
  const { goals, memos, toggleMemo, updateGoalCurrent, ddays, setDdays } = useContext(GoalsContext);
  
  const todayKST = getKSTDateStr();
  const [selectedDate, setSelectedDate] = useState(todayKST);
  const [isCalendarVisible, setCalendarVisible] = useState(false);
  const [isDdayModalVisible, setDdayModalVisible] = useState(false);
  const [ddayName, setDdayName] = useState('');
  const [ddayDate, setDdayDate] = useState('');
  const [editingDdayId, setEditingDdayId] = useState<string | null>(null);

  const todaysMemos = memos[selectedDate] || [];
  const completedMemosCount = todaysMemos.filter((m: any) => m.completed).length;
  const activeGoals = goals.filter((g: any) => (g.scheduleMap?.[selectedDate] || 0) > 0);

  let totalRecommend = 0; let totalDone = 0;   
  activeGoals.forEach((goal: any) => {
    totalRecommend += Number(goal.scheduleMap[selectedDate] || 0);
    totalDone += Math.min(Number(goal.currentMap?.[selectedDate] || 0), Number(goal.scheduleMap[selectedDate] || 0));
  });

  const totalTasks = totalRecommend + todaysMemos.length;
  const completedTasks = totalDone + completedMemosCount;
  const rate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleSaveDday = () => {
    if(ddayName && ddayDate) {
      if(editingDdayId) setDdays(ddays.map((d: any) => d.id === editingDdayId ? { ...d, name: ddayName, date: ddayDate } : d));
      else setDdays([...ddays, { id: Date.now().toString(), name: ddayName, date: ddayDate }]);
      setDdayModalVisible(false); setDdayName(''); setDdayDate(''); setEditingDdayId(null);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {selectedDate === todayKST && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ddayScroll}>
          {ddays.map((d: any) => {
            const diff = Math.ceil((new Date(d.date).getTime() - new Date(todayKST).getTime()) / 86400000);
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
      )}

      <View style={styles.dateRow}>
        <TouchableOpacity onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-1); setSelectedDate(getKSTDateStr(d)); }}>
          <Ionicons name="chevron-back" size={24} color="#111111" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setCalendarVisible(true)} style={styles.dateCenter}>
          <Text style={styles.dateText}>{selectedDate}</Text>
          <Ionicons name="calendar-outline" size={16} color="#111111" style={{marginLeft: 6}} />
        </TouchableOpacity>
        <TouchableOpacity disabled={selectedDate === todayKST} onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+1); setSelectedDate(getKSTDateStr(d)); }}>
          <Ionicons name="chevron-forward" size={24} color={selectedDate === todayKST ? "#D3D3D3" : "#111111"} />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.headerTitle}>{selectedDate === todayKST ? "Today's Progress" : "Daily Progress"}</Text>

      <View style={styles.monochromeCard}>
        <View style={[styles.progressCircle, rate >= 100 ? styles.progressCircleComplete : {}]}>
          <Text style={styles.progressNumber}>{rate >= 100 ? 'Clear' : `${rate}%`}</Text>
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.cardSubtitle}>Completion rate</Text>
          <Text style={styles.cardTitle}>{rate >= 100 ? '100% Clear' : `${rate}% Complete`}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Tasks</Text>
      {todaysMemos.length === 0 ? (
        <View style={styles.emptyBox}><Text style={styles.emptyText}>No tasks scheduled.</Text></View>
      ) : (
        <View style={styles.memoContainer}>
          {todaysMemos.map((memo: any) => (
            <TouchableOpacity key={memo.id} style={[styles.memoItem, memo.completed ? styles.memoItemCompleted : {}]} onPress={() => toggleMemo(selectedDate, memo.id)}>
              <View style={[styles.checkbox, memo.completed ? styles.checkboxCompleted : {}]}>{memo.completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}</View>
              <Text style={[styles.memoText, memo.completed ? styles.memoTextCompleted : {}]}>{memo.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Goals</Text>
      {activeGoals.length === 0 ? (
        <View style={styles.emptyBox}><Text style={styles.emptyText}>No goals scheduled.</Text></View>
      ) : (
        activeGoals.map((goal: any) => {
          const recommend = Number(goal.scheduleMap[selectedDate] || 0);
          const current = Number(goal.currentMap?.[selectedDate] || 0);
          const isCompleted = current >= recommend && recommend > 0; 

          return (
            <View key={goal.id} style={[styles.goalCard, isCompleted ? { borderColor: goal.color, borderWidth: 2 } : {}]}>
              <View style={[styles.colorIndicator, {backgroundColor: goal.color}]} />
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>{goal.name}</Text>
                <Text style={styles.goalRecommend}>Amount: {recommend} {goal.unit}</Text>
              </View>
              <View style={styles.counterPill}>
                <TouchableOpacity onPress={() => updateGoalCurrent(goal.id, selectedDate, -1)}>
                  <Ionicons name="remove" size={18} color="#111111" />
                </TouchableOpacity>
                <Text style={styles.currentCount}>{current}</Text>
                <TouchableOpacity onPress={() => {
                  if (current >= recommend) {
                    Alert.alert(
                      'Goal Reached!', 
                      '오늘 할당량을 모두 달성했습니다.\n목표량을 늘리고 싶다면 [목표 관리] 탭에서 일정을 수정해주세요.'
                    );
                  } else {
                    updateGoalCurrent(goal.id, selectedDate, 1);
                  }
                }}>
                  <Ionicons name="add" size={18} color="#111111" />
                </TouchableOpacity>
              </View>
              {isCompleted && <Ionicons name="checkmark-circle" size={28} color={goal.color} style={{marginLeft: 15}} />}
            </View>
          );
        })
      )}

      <Modal visible={isCalendarVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Calendar onDayPress={(day: any) => { setSelectedDate(day.dateString); setCalendarVisible(false); }} theme={{todayTextColor: '#111111', arrowColor: '#111111'}} />
          <TouchableOpacity onPress={() => setCalendarVisible(false)} style={styles.closeBtn}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={isDdayModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}><View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editingDdayId ? 'Edit D-Day' : 'Add D-Day'}</Text>
          <TextInput style={styles.input} placeholder="Name" value={ddayName} onChangeText={setDdayName} />
          <Calendar onDayPress={(day: any) => setDdayDate(day.dateString)} markedDates={{[ddayDate]: {selected: true, selectedColor: '#111111'}}} theme={{todayTextColor: '#111111', arrowColor: '#111111'}} />
          <View style={styles.btnRow}>
            {editingDdayId && <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#111111'}]} onPress={() => { setDdays(ddays.filter((d: any) => d.id !== editingDdayId)); setDdayModalVisible(false); }}><Text style={[styles.btnText, {color: '#111111'}]}>Delete</Text></TouchableOpacity>}
            <TouchableOpacity style={[styles.actionBtn, {flex: 2}]} onPress={handleSaveDday}><Text style={styles.btnText}>Save</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setDdayModalVisible(false)}><Text style={styles.closeText}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>
    </ScrollView>
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
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111111', marginBottom: 20 },
  monochromeCard: { backgroundColor: '#111111', borderRadius: 20, padding: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  progressCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#4A4A4A', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  progressCircleComplete: { borderColor: '#FFFFFF' },
  progressNumber: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  cardTextContainer: { justifyContent: 'center' },
  cardSubtitle: { color: '#A0A0A0', fontSize: 14, marginBottom: 5 },
  cardTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 15, marginTop: 10 },
  emptyBox: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 30, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#EAEAEA' },
  emptyText: { color: '#A0A0A0', fontSize: 14 },
  memoContainer: { marginBottom: 30 },
  memoItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  memoItemCompleted: { backgroundColor: '#F9F9F9' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D3D3D3', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxCompleted: { backgroundColor: '#111111', borderColor: '#111111' },
  memoText: { fontSize: 16, color: '#111111', flex: 1, fontWeight: '600' },
  memoTextCompleted: { color: '#A0A0A0', fontWeight: '400' }, 
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  colorIndicator: { width: 4, height: '80%', borderRadius: 2, marginRight: 15 },
  goalInfo: { flex: 1 },
  goalName: { fontSize: 16, fontWeight: 'bold', color: '#111111', marginBottom: 5 },
  goalRecommend: { fontSize: 13, color: '#7E7E7E' },
  counterPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F4F4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  currentCount: { fontSize: 16, fontWeight: 'bold', marginHorizontal: 15, minWidth: 20, textAlign: 'center', color: '#111111' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111111', marginBottom: 15 },
  input: { backgroundColor: '#F9F9F9', padding: 15, borderRadius: 10, marginBottom: 15, color: '#111111', borderWidth: 1, borderColor: '#EAEAEA' },
  btnRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
  actionBtn: { backgroundColor: '#111111', flex: 1, padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
  closeText: { fontWeight: 'bold', color: '#7E7E7E' }
});