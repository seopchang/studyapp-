import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { GoalsProvider } from '../../context/GoalsContext';

export default function TabLayout() {
  return (
    <GoalsProvider>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5', 
        tabBarInactiveTintColor: '#94A3B8', 
        tabBarStyle: {
          // 웹(인터넷) 환경일 때와 폰(앱)일 때의 높이를 다르게 줘서 찌그러짐 방지!
          height: Platform.OS === 'web' ? 60 : 70,           
          paddingBottom: Platform.OS === 'web' ? 10 : 15,    
          paddingTop: 5,
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          elevation: 0, 
          shadowOpacity: 0 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      }}>
        <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: ({color}) => <Ionicons name="home-outline" size={24} color={color} /> }} />
        <Tabs.Screen name="weekly" options={{ title: '계획표', tabBarIcon: ({color}) => <Ionicons name="calendar-outline" size={24} color={color} /> }} />
        <Tabs.Screen name="goals" options={{ title: '목표 관리', tabBarIcon: ({color}) => <Ionicons name="list-outline" size={24} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: '설정', tabBarIcon: ({color}) => <Ionicons name="settings-outline" size={24} color={color} /> }} />
      </Tabs>
    </GoalsProvider>
  );
}