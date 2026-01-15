// CalorieContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CalorieContext = createContext();

const API_URL = 'http://192.168.0.102:3000'; // ⚠️ ตรวจสอบ URL API ของคุณให้ถูกต้อง

export const CalorieProvider = ({ children }) => {
  const [dailyCalorieTarget, setDailyCalorieTarget] = useState(0);
  const [todayConsumedCalories, setTodayConsumedCalories] = useState(0);
  
  // สถานะสำหรับ Authentication
  const [authToken, setAuthToken] = useState(null);
  
  // สถานะสำหรับ Profile (ข้อมูลส่วนตัวที่ Home/Profile ต้องแชร์กัน)
  const [profile, setProfile] = useState({
    weight: '',
    height: '',
    age: '',
    gender: '',
    bmr: 0,
  });

  // 🔥 ฟังก์ชันอัพเดท Profile ที่จะใช้ใน ProfileScreen
  const updateProfile = useCallback((newProfile) => {
    setProfile(newProfile);
  }, []);

  // 1. Logic ดึงข้อมูล Profile จาก Backend (ใช้ useCallback)
  const loadProfileFromApi = useCallback(async (token) => {
    // ถ้าไม่มี Token หรือ Token เป็น null/undefined ให้ตั้งค่า Profile เป็นค่าเริ่มต้น
    if (!token) {
        setProfile({ weight: '', height: '', age: '', gender: '', bmr: 0 });
        return;
    }

    try {
      // ⚠️ API_URL/profile ต้องเป็น GET request ที่รับ JWT ใน Header
      const res = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        const profileData = data.profile || data; // รองรับทั้ง { profile: {...} } และ {...}
        
        // แปลงค่าตัวเลขเป็น String ก่อนนำไปใส่ใน State (Fix TextInput issue)
        const newProfile = {
          weight: profileData.weight ? String(profileData.weight) : '',
          height: profileData.height ? String(profileData.height) : '',
          age: profileData.age ? String(profileData.age) : '',
          gender: profileData.gender || '',
          bmr: profileData.bmr || 0,
        };
        
        setProfile(newProfile);
        
        // 🔥 บันทึกลง AsyncStorage เพื่อให้ HomeScreen ดึงได้
        await AsyncStorage.setItem('userData', JSON.stringify(newProfile));
        
      } else if (res.status === 404) {
         // 404 อาจหมายถึงผู้ใช้ยังไม่เคยสร้าง Profile
         setProfile({ weight: '', height: '', age: '', gender: '', bmr: 0 });
      } else {
        console.error(`Load profile failed with status: ${res.status}`);
        setProfile({ weight: '', height: '', age: '', gender: '', bmr: 0 });
      }
    } catch (e) {
      console.error('Load profile from API error:', e);
      setProfile({ weight: '', height: '', age: '', gender: '', bmr: 0 });
    }
  }, []);

  // 2. Logic Bootstrap (ดึง Token จาก AsyncStorage เมื่อเปิดแอป)
  useEffect(() => {
    const bootstrap = async () => {
      const token = await AsyncStorage.getItem('userToken');
      setAuthToken(token);
    };
    bootstrap();
  }, []);

  // 3. Logic โหลด Profile ทุกครั้งที่ Token เปลี่ยน (เมื่อ Login/Logout)
  // **นี่คือส่วนสำคัญที่ทำให้ Home และ Profile Sync กัน**
  useEffect(() => {
    if (authToken) {
      loadProfileFromApi(authToken);
    } else {
      // เมื่อ Log Out ให้ล้างข้อมูล Profile ทันที
      setProfile({ weight: '', height: '', age: '', gender: '', bmr: 0 });
    }
  }, [authToken, loadProfileFromApi]);


  return (
    <CalorieContext.Provider
      value={{
        dailyCalorieTarget,
        setDailyCalorieTarget,
        todayConsumedCalories,
        setTodayConsumedCalories,
        
        // เพิ่ม Context สำหรับ Auth และ Profile
        authToken,
        setAuthToken,
        profile,
        setProfile,
        updateProfile, // 🔥 ฟังก์ชันใหม่สำหรับอัพเดท Profile
        loadProfileFromApi, // ฟังก์ชันสำหรับโหลด/รีเฟรชข้อมูล Profile (ใช้ใน ProfileScreen)
      }}
    >
      {children}
    </CalorieContext.Provider>
  );};