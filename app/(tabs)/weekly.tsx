import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';
import { GoalsContext, getKSTDateStr } from '../../context/GoalsContext';

LocaleConfig.locales['en'] = {
  monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  today: 'Today'
};
LocaleConfig.defaultLocale = 'en';

export default function WeeklyScreen() {
  const [selDate, setSelDate] = useState(getKSTDateStr());
  const [memo, setMemo] = useState('');
  const { goals, memos, addMemo, deleteMemo, toggleMemo } = useContext(GoalsContext);

  const currentMemos = memos[selDate] || [];
  const activeGoals = goals.filter((g: any) => (g.scheduleMap?.[selDate] || 0) > 0);

  return (
    <ScrollView style={styles.wrapper} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>Weekly Schedule</Text>
      
      <Calendar 
        current={selDate}
        onDayPress={(day: any) => setSelDate(day.dateString)}
        theme={{ todayTextColor: '#111111', arrowColor: '#111111' }}
        style={styles.calendar} 
        dayComponent={({date, state}: any) => {
          const dStr = date.dateString;
          const dMemos = memos[dStr] || [];
          const dGoals = goals.filter((g: any) => (g.scheduleMap?.[dStr] || 0) > 0);
          
          let dayTotal = 0; let dayDone = 0;
          dGoals.forEach((g: any) => { 
            dayTotal += g.scheduleMap[dStr]; 
            dayDone += Math.min(g.currentMap?.[dStr] || 0, g.scheduleMap[dStr]); 
          });
          
          const memoDone = dMemos.filter((m: any) => m.completed).length;
          const totalCount = dayTotal + dMemos.length;
          const doneCount = dayDone + memoDone;
          const rate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
          const isSelected = dStr === selDate;

          return (
            <TouchableOpacity onPress={() => setSelDate(dStr)} style={[styles.dayWrapper, isSelected && styles.daySelected, rate >= 100 && totalCount > 0 && {backgroundColor: '#F0F0F0'}]}>
              <Text style={{color: state === 'disabled' ? '#D3D3D3' : '#111111', fontWeight: isSelected ? 'bold' : 'normal', fontSize: 13}}>{date.day}</Text>
              {totalCount > 0 && <Text style={{fontSize: 9, color: '#111111', fontWeight: 'bold'}}>{rate}%</Text>}
              <View style={styles.markerContainer}>
                {dMemos.length > 0 && <View style={styles.dotMarker} />}
                {dGoals.map((g:any) => <View key={g.id} style={[styles.barMarker, {backgroundColor: g.color}]} />)}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <View style={styles.memoSection}>
        <Text style={styles.memoTitle}>Plan for {selDate}</Text>
        
        {activeGoals.map((g: any) => (
          <View key={g.id} style={styles.goalListItem}>
            <View style={[styles.colorDot, {backgroundColor: g.color}]} />
            <Text style={styles.goalListText}>{g.name}</Text>
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>{g.currentMap?.[selDate] || 0} / {g.scheduleMap[selDate]}{g.unit}</Text>
            </View>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.memoInputRow}>
          <TextInput style={styles.memoInput} placeholder="Add a task" value={memo} onChangeText={setMemo} />
          <TouchableOpacity style={styles.addBtn} onPress={() => { if(memo.trim()){ addMemo(selDate, memo); setMemo(''); } }}><Ionicons name="add" size={24} color="#FFFFFF" /></TouchableOpacity>
        </View>

        {currentMemos.map((m: any) => (
          <View key={m.id} style={[styles.memoItem, m.completed && {backgroundColor: '#F9F9F9'}]}>
            <TouchableOpacity onPress={() => toggleMemo(selDate, m.id)} style={styles.memoTextRow}>
              <View style={[styles.checkbox, m.completed && {backgroundColor: '#111111', borderColor: '#111111'}]}>{m.completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}</View>
              <Text style={[styles.memoText, m.completed && {color: '#A0A0A0', fontWeight: '400'}]}>{m.text}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMemo(selDate, m.id)}><Ionicons name="trash-outline" size={18} color="#111111" /></TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#FAFAFA' },
  scrollContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 50, paddingBottom: 150 }, 
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111111', marginBottom: 20 },
  calendar: { marginBottom: 20, borderRadius: 15, backgroundColor: '#FFFFFF', padding: 10, borderWidth: 1, borderColor: '#EAEAEA' },
  dayWrapper: { width: 44, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  daySelected: { borderWidth: 2, borderColor: '#111111' },
  markerContainer: { marginTop: 4, width: '100%', alignItems: 'center', gap: 2 },
  dotMarker: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#111111' },
  barMarker: { width: '60%', height: 3, borderRadius: 2 },
  memoSection: { paddingBottom: 30 }, 
  memoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#111111' },
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
  memoText: { fontSize: 16, color: '#111111', fontWeight: '600', flex: 1 }
});