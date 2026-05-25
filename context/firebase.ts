import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyC5NA56HsHU3cKZU9JT3G5OPnoej5xL4mQ',
  authDomain: 'studyapp-7cca2.firebaseapp.com',
  projectId: 'studyapp-7cca2',
  storageBucket: 'studyapp-7cca2.firebasestorage.app',
  messagingSenderId: '283405174063',
  appId: '1:283405174063:web:928d99affbe2b72f4ecdda',
};

const app = initializeApp(firebaseConfig);

// getAuth() 대신 initializeAuth + getReactNativePersistence 사용
// → 앱 재시작 후에도 AsyncStorage에 세션 유지 (매번 로그인 불필요)
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

