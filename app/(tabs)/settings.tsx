import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import React, { useContext, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import OnboardingScreen from '../../components/OnboardingScreen';
import { GoalsContext } from '../../context/GoalsContext';
import { auth } from '../../context/firebase';

function SettingRow({
  icon, iconColor = '#6366F1', label, value, onPress, danger = false, chevron = true,
  toggle, onToggle,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  iconColor?: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
  toggle?: boolean;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={toggle !== undefined ? () => onToggle?.(!toggle) : onPress}
      activeOpacity={(onPress || onToggle) ? 0.7 : 1}
      disabled={!onPress && onToggle === undefined}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[styles.rowLabel, danger && { color: '#EF4444' }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      {toggle !== undefined ? (
        <View style={[styles.toggleTrack, toggle && styles.toggleTrackOn]}>
          <View style={[styles.toggleThumb, toggle && styles.toggleThumbOn]} />
        </View>
      ) : (
        chevron && onPress && <Ionicons name="chevron-forward" size={16} color="#D1D5DB" style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

const DAY_END_OPTIONS = [
  { label: '자정 (00:00)', value: 0 },
  { label: '새벽 1시 (01:00)', value: 1 },
  { label: '새벽 2시 (02:00)', value: 2 },
  { label: '새벽 3시 (03:00)', value: 3 },
  { label: '새벽 4시 (04:00)', value: 4 },
  { label: '새벽 5시 (05:00)', value: 5 },
  { label: '새벽 6시 (06:00)', value: 6 },
];

export default function SettingsScreen() {
  const { user, syncError, setSyncError, dayEndHour, setDayEndHour, showTimeline, setShowTimeline, showRoutinesTab, setShowRoutinesTab, showProjectsTab, setShowProjectsTab, showTasksHome, setShowTasksHome, showRoutinesHome, setShowRoutinesHome, showProjectsHome, setShowProjectsHome } = useContext(GoalsContext);
  const [authModal, setAuthModal] = useState(false);
  const [dayEndModal, setDayEndModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // ── 로그인 / 회원가입 ─────────────────────────────────────────
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      setAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 틀렸습니다.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호는 6자리 이상이어야 합니다.',
      };
      Alert.alert('오류', msg[e.code] || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('이메일 입력', '비밀번호를 재설정할 이메일을 먼저 입력해주세요.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert('이메일 발송', `${email}로 재설정 링크를 보냈습니다.\n메일함을 확인해주세요.`);
      setEmail('');
      setPassword('');
    } catch (e: any) {
      Alert.alert('오류', e.message);
    }
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃하면 이 기기에서 동기화가 중단됩니다.\n(로컬 데이터는 유지됩니다)', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  // ── 온보딩 다시 보기 ──────────────────────────────────────────
  const handleShowGuide = async () => {
    await AsyncStorage.removeItem('onboardingDone');
    setShowOnboarding(true);
  };

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.headerTitle}>설정</Text>

      {/* 동기화 에러 배너 */}
      {syncError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={15} color="#FFFFFF" />
          <Text style={styles.errorText}>{syncError}</Text>
          <TouchableOpacity onPress={() => setSyncError(null)}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── 계정 섹션 ── */}
      <SectionTitle title="계정 및 동기화" />
      <View style={styles.card}>
        {user ? (
          <>
            <SettingRow
              icon="person-circle-outline"
              iconColor="#6366F1"
              label={user.email ?? ''}
              chevron={false}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="cloud-done-outline"
              iconColor="#10B981"
              label="동기화 상태"
              value="연결됨"
              chevron={false}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="log-out-outline"
              iconColor="#EF4444"
              label="로그아웃"
              danger
              onPress={handleSignOut}
            />
          </>
        ) : (
          <SettingRow
            icon="cloud-outline"
            iconColor="#6366F1"
            label="기기 동기화 설정"
            value="로그인 필요"
            onPress={() => { setIsLogin(true); setAuthModal(true); }}
          />
        )}
      </View>

      {/* ── 플래너 설정 ── */}
      <SectionTitle title="플래너 설정" />
      <View style={styles.card}>
        <SettingRow
          icon="time-outline"
          iconColor="#6366F1"
          label="하루 종료 시간"
          value={DAY_END_OPTIONS.find(o => o.value === dayEndHour)?.label ?? '자정 (00:00)'}
          onPress={() => setDayEndModal(true)}
        />
      </View>

      {/* ── 계획표 탭 표시 ── */}
      <SectionTitle title="계획표 탭 표시" />
      <View style={styles.card}>
        <SettingRow
          icon="git-branch-outline"
          iconColor="#8B5CF6"
          label="Plan Timeline"
          toggle={showTimeline}
          onToggle={setShowTimeline}
        />
      </View>

      {/* ── 목표관리 탭 표시 ── */}
      <SectionTitle title="목표관리 탭 표시" />
      <View style={styles.card}>
        <SettingRow
          icon="repeat-outline"
          iconColor="#22C55E"
          label="Routines"
          toggle={showRoutinesTab}
          onToggle={setShowRoutinesTab}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="folder-open-outline"
          iconColor="#F97316"
          label="Projects"
          toggle={showProjectsTab}
          onToggle={setShowProjectsTab}
        />
      </View>

      {/* ── 홈 탭 표시 ── */}
      <SectionTitle title="홈 탭 표시" />
      <View style={styles.card}>
        <SettingRow
          icon="checkmark-circle-outline"
          iconColor="#6366F1"
          label="Tasks"
          toggle={showTasksHome}
          onToggle={setShowTasksHome}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="repeat-outline"
          iconColor="#22C55E"
          label="Routines"
          toggle={showRoutinesHome}
          onToggle={setShowRoutinesHome}
        />
        <View style={styles.divider} />
        <SettingRow
          icon="folder-open-outline"
          iconColor="#F97316"
          label="Projects"
          toggle={showProjectsHome}
          onToggle={setShowProjectsHome}
        />
      </View>

      {/* ── 앱 섹션 ── */}
      <SectionTitle title="앱" />
      <View style={styles.card}>
        <SettingRow
          icon="book-outline"
          iconColor="#F59E0B"
          label="사용 가이드 다시 보기"
          onPress={handleShowGuide}
        />
      </View>

      {/* ── 정보 섹션 ── */}
      <SectionTitle title="정보" />
      <View style={styles.card}>
        <SettingRow icon="information-circle-outline" iconColor="#6B7280" label="버전" value="1.1.0" chevron={false} />
        <View style={styles.divider} />
        <SettingRow icon="time-outline" iconColor="#6B7280" label="데이터 보존 기간" value="1년" chevron={false} />
        <View style={styles.divider} />
        <SettingRow icon="phone-portrait-outline" iconColor="#6B7280" label="기기 제한" value="없음" chevron={false} />
      </View>

      {/* ── 하루 종료 시간 모달 ── */}
      <Modal visible={dayEndModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { paddingBottom: 36 }]}>
            <Text style={[styles.sheetTitle, { marginBottom: 6 }]}>하루 종료 시간</Text>
            <Text style={styles.sheetDesc}>
              이 시각 이전까지는 전날 날짜로 처리됩니다.{'\n'}
              예) 새벽 3시 설정 시, 3시 이전엔 어제 계획으로 표시
            </Text>
            {DAY_END_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.dayEndOption, dayEndHour === opt.value && styles.dayEndOptionActive]}
                onPress={() => { setDayEndHour(opt.value); setDayEndModal(false); }}
              >
                <Text style={[styles.dayEndOptionText, dayEndHour === opt.value && { color: '#FFFFFF' }]}>{opt.label}</Text>
                {dayEndHour === opt.value && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setDayEndModal(false)}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 로그인 모달 ── */}
      <Modal visible={authModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHeader}>
                  <Ionicons name="cloud-outline" size={26} color="#111111" />
                  <Text style={styles.sheetTitle}>기기 간 동기화</Text>
                </View>
                <Text style={styles.sheetDesc}>
                  계정에 로그인하면 모든 기기에서{'\n'}목표와 메모가 실시간으로 동기화됩니다.
                </Text>

                <View style={styles.tabRow}>
                  <TouchableOpacity style={[styles.tab, isLogin && styles.tabActive]} onPress={() => setIsLogin(true)}>
                    <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>로그인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.tab, !isLogin && styles.tabActive]} onPress={() => setIsLogin(false)}>
                    <Text style={[styles.tabText, !isLogin && styles.tabTextActive]}>회원가입</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="이메일"
                  placeholderTextColor="#A0A0A0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호 (6자리 이상)"
                  placeholderTextColor="#A0A0A0"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
                  onPress={handleAuth}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? '처리 중...' : isLogin ? '로그인' : '회원가입'}
                  </Text>
                </TouchableOpacity>

                {isLogin && (
                  <TouchableOpacity style={styles.resetBtn} onPress={handleResetPassword}>
                    <Text style={styles.resetText}>비밀번호를 잊어버렸나요?</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle-outline" size={14} color="#6B7280" />
                  <Text style={styles.infoText}>
                    기기 수 제한 없이 자유롭게 동기화됩니다.{'\n'}
                    1년 이상 지난 데이터는 자동으로 정리됩니다.
                  </Text>
                </View>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAuthModal(false); setEmail(''); setPassword(''); }}>
                  <Text style={styles.cancelText}>나중에 하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111111', marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 8, marginTop: 20, textTransform: 'uppercase' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowLabel: { fontSize: 15, color: '#111111', fontWeight: '500' },
  rowValue: { fontSize: 13, color: '#9CA3AF', maxWidth: 160, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 62 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF4444', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  errorText: { flex: 1, color: '#FFFFFF', fontSize: 12 },
  // 모달
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 44 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#111111' },
  sheetDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
  tabRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#111111' },
  tabText: { fontWeight: 'bold', color: '#9CA3AF', fontSize: 14 },
  tabTextActive: { color: '#FFFFFF' },
  input: { backgroundColor: '#F9F9F9', padding: 16, borderRadius: 12, marginBottom: 12, fontSize: 15, color: '#111111', borderWidth: 1, borderColor: '#E5E7EB' },
  primaryBtn: { backgroundColor: '#111111', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 12, marginTop: 16 },
  infoText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 18 },
  resetBtn: { marginTop: 12, padding: 10, alignItems: 'center' },
  resetText: { color: '#6366F1', fontSize: 13, fontWeight: '600' },
  cancelBtn: { marginTop: 4, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontWeight: '600', fontSize: 14 },
  dayEndOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 6, backgroundColor: '#F3F4F6' },
  dayEndOptionActive: { backgroundColor: '#111111' },
  dayEndOptionText: { fontSize: 15, fontWeight: '600', color: '#111111' },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#D1D5DB', justifyContent: 'center', paddingHorizontal: 2 },
  toggleTrackOn: { backgroundColor: '#111111' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 2 },
  toggleThumbOn: { alignSelf: 'flex-end' },
});
