import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import React, { useContext, useEffect, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { GoalsContext } from '../context/GoalsContext';
import { auth } from '../context/firebase';

const SAVED_EMAIL_KEY = 'saved_email';
// ※ 보안상 비밀번호는 저장하지 않습니다 (이메일만 저장)

export default function AuthScreen() {
  const { user, syncError, setSyncError } = useContext(GoalsContext);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saveCredentials, setSaveCredentials] = useState(false);
  const [loading, setLoading] = useState(false);

  // 저장된 이메일 불러오기 (비밀번호는 보안상 저장하지 않음)
  useEffect(() => {
    AsyncStorage.getItem(SAVED_EMAIL_KEY).then(savedEmail => {
      if (savedEmail) { setEmail(savedEmail); setSaveCredentials(true); }
    });
  }, []);

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      // 이메일만 저장 (비밀번호는 보안상 저장 안 함)
      if (saveCredentials) {
        await AsyncStorage.setItem(SAVED_EMAIL_KEY, email);
      } else {
        await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
      }
      setModalVisible(false);
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
        'auth/wrong-password': '비밀번호가 틀렸습니다.',
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
      Alert.alert('이메일 발송 완료', `${email}로 비밀번호 재설정 링크를 보냈습니다.\n메일함을 확인해주세요.`);
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
        'auth/user-not-found': '등록되지 않은 이메일입니다.',
      };
      Alert.alert('오류', msg[e.code] || e.message);
    }
  };

  const handleSignOut = () => {
    Alert.alert('로그아웃', '로그아웃하면 이 기기에서 동기화가 중단됩니다.\n(로컬 데이터는 유지됩니다)', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  return (
    <>
      {/* 기기 초과 에러 배너 */}
      {syncError && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
          <Text style={styles.errorText}>{syncError}</Text>
          <TouchableOpacity onPress={() => setSyncError(null)}>
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* 동기화 상태 표시 버튼 */}
      <TouchableOpacity
        style={[styles.syncBadge, user ? styles.syncBadgeOn : styles.syncBadgeOff]}
        onPress={() => user ? handleSignOut() : setModalVisible(true)}
        activeOpacity={0.75}
      >
        <View style={[styles.syncDot, { backgroundColor: user ? '#10B981' : '#D1D5DB' }]} />
        <Text style={[styles.syncText, user ? { color: '#065F46' } : { color: '#6B7280' }]} numberOfLines={1}>
          {user ? user.email : '동기화 설정'}
        </Text>
        {user
          ? <Ionicons name="log-out-outline" size={14} color="#065F46" />
          : <Ionicons name="chevron-forward" size={14} color="#9CA3AF" />
        }
      </TouchableOpacity>

      {/* 로그인/회원가입 모달 */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={styles.overlay}>
            <View style={styles.sheet}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.sheetHeader}>
                  <Ionicons name="cloud-outline" size={28} color="#111111" />
                  <Text style={styles.sheetTitle}>기기 간 동기화</Text>
                </View>
                <Text style={styles.sheetDesc}>
                  계정에 로그인하면 모든 기기에서{'\n'}목표와 메모가 실시간으로 동기화됩니다.
                </Text>

                <View style={styles.tabRow}>
                  <TouchableOpacity
                    style={[styles.tab, isLogin && styles.tabActive]}
                    onPress={() => setIsLogin(true)}
                  >
                    <Text style={[styles.tabText, isLogin && styles.tabTextActive]}>로그인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tab, !isLogin && styles.tabActive]}
                    onPress={() => setIsLogin(false)}
                  >
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

                {/* 아이디/비밀번호 저장 토글 */}
                <TouchableOpacity
                  style={styles.saveRow}
                  onPress={() => setSaveCredentials(v => !v)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.saveCheck, saveCredentials && styles.saveCheckOn]}>
                    {saveCredentials && <Ionicons name="checkmark" size={13} color="#fff" />}
                  </View>
                  <Text style={styles.saveLabel}>이 기기에 이메일 저장</Text>
                </TouchableOpacity>

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
                    1년 이상 지난 데이터는 자동으로 정리됩니다.{'\n'}
                    기기 수 제한 없이 자유롭게 동기화됩니다.
                  </Text>
                </View>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>나중에 하기</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10 },
  errorText: { flex: 1, color: '#FFFFFF', fontSize: 12 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  syncBadgeOn: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  syncBadgeOff: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB' },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 12, fontWeight: '600', maxWidth: 160 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 40 },
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
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  saveCheck: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  saveCheckOn: { backgroundColor: '#111111', borderColor: '#111111' },
  saveLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
});
