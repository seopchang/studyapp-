import 'react-native-get-random-values';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import OnboardingScreen from '../components/OnboardingScreen';

export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await Font.loadAsync(Ionicons.font);
      } catch (error) {
        console.warn('아이콘 로딩 지연:', error);
      }
      const done = await AsyncStorage.getItem('onboardingDone');
      setShowOnboarding(done !== 'true');
      setFontsLoaded(true);
    }
    init();
  }, []);

  if (!fontsLoaded || showOnboarding === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onDone={() => setShowOnboarding(false)} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
