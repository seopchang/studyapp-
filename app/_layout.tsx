import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        // 아이콘 폰트를 강제로 다운로드 시도합니다.
        await Font.loadAsync(Ionicons.font);
      } catch (error) {
        console.warn('아이콘 로딩 지연 (무시하고 앱을 실행합니다):', error);
      } finally {
        // 🌟 핵심 안전장치: 성공하든 실패하든 무조건 로딩 화면을 끝내고 앱을 켭니다!
        setFontsLoaded(true);
      }
    }
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}