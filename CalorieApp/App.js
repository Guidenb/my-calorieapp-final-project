// App.js (ฉบับแก้ไข)
import React, { useContext } from 'react'; // 🛑 นำเข้า useContext
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native'; 
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
// 🛑 ลบ AsyncStorage ออกจากตรงนี้
// import AsyncStorage from '@react-native-async-storage/async-storage'; 
import HomeScreen from './HomeScreen';
import MealScreen from './MealScreen';
import ProfileScreen from './ProfileScreen';
import LoginScreen from './LoginScreen'; 
import RegisterScreen from './RegisterScreen'; 
// 🛑 นำเข้า CalorieProvider และ CalorieContext
import { CalorieProvider, CalorieContext } from './CalorieContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// 1. ฟังก์ชัน MainTabs (รวม Bottom Tabs เดิม)
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: '#2A2D47' },
      tabBarActiveTintColor: '#4ECDC4',
      tabBarInactiveTintColor: '#8B8FA3',
      tabBarIcon: ({ color, size }) => {
        let iconName;
        if (route.name === 'Home') iconName = 'home';
        else if (route.name === 'Meal') iconName = 'restaurant';
        else if (route.name === 'Profile') iconName = 'person';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Meal" component={MealScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);


// 🛑 แยก logic การตัดสินใจ Navigation ออกมาเป็น RootNavigator
const RootNavigator = () => {
  // 🛑 ใช้ authToken จาก Context
  const { authToken } = useContext(CalorieContext);

  // เนื่องจากเราโหลด Token ใน Context แล้ว แต่เราต้องรอให้การโหลดครั้งแรกเสร็จสิ้น
  // เราใช้ authToken == null && isLoading === true เพื่อแสดง Loading (ถ้าคุณใช้ isLoading ใน App)
  // แต่เนื่องจาก logic loadToken ถูกย้ายไปที่ Context แล้ว เราสามารถใช้ authToken เป็นตัวตัดสินได้เลย 
  // โดย Context จะมีค่าเริ่มต้นเป็น null และเปลี่ยนเมื่อโหลดเสร็จ

  // เราจะถือว่าถ้า authToken เป็น null ให้แสดง Auth Stack
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        {authToken == null ? (
          // ผู้ใช้ยังไม่เข้าสู่ระบบ: แสดง Auth Stack
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : (
          // ผู้ใช้เข้าสู่ระบบแล้ว: แสดง App Tabs
          // การที่ authToken เปลี่ยนค่า จะทำให้ Navigator ถูกวาดใหม่โดยอัตโนมัติ
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
  );
};


// 2. ฟังก์ชัน App (จัดการสถานะการล็อกอิน)
export default function App() {
  // 🛑 ลบ isLoading, userToken และ useEffect ออกจาก App component

  return (
    <CalorieProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </CalorieProvider>
  );
}
