import React, { useState, useContext, useCallback } from 'react'; 
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; 
import { CalorieContext } from './CalorieContext'; 
import * as Progress from 'react-native-progress';

const BASE_URL = 'http://10.96.187.1:3000'; 

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { authToken, setAuthToken, profile: contextProfile, updateProfile, loadProfileFromApi } = useContext(CalorieContext);
  
  const [profile, setProfile] = useState({
    weight: '',
    height: '',
    age: '',
    gender: '',
    bmr: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isApiLoading, setIsApiLoading] = useState(true);

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
  });

  // โหลดข้อมูลจาก Context เมื่อเข้าหน้า
  useFocusEffect(
    useCallback(() => {
      if (contextProfile && contextProfile.bmr > 0) {
        setProfile(contextProfile);
        setIsApiLoading(false);
      } else {
        loadProfileFromApiLocal();
      }
      return () => {};
    }, [contextProfile])
  );

  const loadProfileFromApiLocal = async () => {
    if (!authToken) {
      setIsApiLoading(false);
      return; 
    }
    
    setIsApiLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/profile`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
             await AsyncStorage.removeItem('userToken');
             setAuthToken(null);
             Alert.alert("Session Expired", "Please log in again.");
             return;
        }
        throw new Error(`Failed to fetch profile`);
      }
      
      const data = await res.json();
      setProfile({
        weight: data.weight ? String(data.weight) : '',
        height: data.height ? String(data.height) : '',
        age: data.age ? String(data.age) : '',
        gender: data.gender || '',
        bmr: data.bmr || 0,
      });

    } catch (err) {
      console.error('Load profile error:', err);
      Alert.alert('ผิดพลาด', 'ไม่สามารถดึงข้อมูลโปรไฟล์ได้');
    } finally {
      setIsApiLoading(false);
    }
  };

  // --- ฟังก์ชันคำนวณ BMR แบบ Manual (Mifflin-St Jeor Equation) ---
  const calculateBMR = (w, h, a, g) => {
    const weight = parseFloat(w);
    const height = parseFloat(h);
    const age = parseInt(a);
    
    if (g === 'male') {
      return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  };

  const saveProfile = async () => {
    const { weight, height, age, gender } = profile;

    if (!weight || !height || !age || !gender) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    if (!authToken) {
       Alert.alert('ผิดพลาด', 'กรุณาเข้าสู่ระบบก่อนบันทึกข้อมูล');
       return;
    }

    setLoading(true);
    try {
      // 1. คำนวณ BMR ทันที
      const calculatedBmr = calculateBMR(weight, height, age, gender);
      
      const updatedData = {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        gender: gender,
        bmr: calculatedBmr,
      };

      // 2. ส่งข้อมูลไปที่ API Backend ของเรา
      const res = await fetch(`${BASE_URL}/profile`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save profile.');
      }

      // 3. บันทึกลง Storage และ Context
      await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
      updateProfile(updatedData);
      
      // อัพเดท local state เพื่อแสดงค่า BMR ใหม่บนหน้าจอ
      setProfile(prev => ({ ...prev, bmr: calculatedBmr }));
      
      Alert.alert('สำเร็จ', 'บันทึกโปรไฟล์เรียบร้อยแล้ว');

    } catch (err) {
      console.error('Save error:', err);
      Alert.alert('ผิดพลาด', `ไม่สามารถบันทึกข้อมูลได้: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "ออกจากระบบ",
      "คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ใช่, ออกจากระบบ",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              setAuthToken(null); 
            } catch (e) {
              console.error('Logout error:', e);
            }
          }
        }
      ]
    );
  };

  if (isApiLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Progress.CircleSnail size={50} color={['#4ECDC4', '#F7B801', '#FF6B6B']} thickness={4} />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูลโปรไฟล์...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.form}>
        <Text style={styles.label}>น้ำหนัก (kg)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={profile.weight}
          onChangeText={(t) => setProfile({ ...profile, weight: t })}
        />
        <Text style={styles.label}>ส่วนสูง (cm)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={profile.height}
          onChangeText={(t) => setProfile({ ...profile, height: t })}
        />
        <Text style={styles.label}>อายุ</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={profile.age}
          onChangeText={(t) => setProfile({ ...profile, age: t })}
        />
        <Text style={styles.label}>เพศ</Text>
        <View style={styles.genderRow}>
          <TouchableOpacity
            style={[styles.genderButton, profile.gender === 'male' && styles.genderButtonActive]}
            onPress={() => setProfile({ ...profile, gender: 'male' })}
          >
            <Text style={[styles.genderText, profile.gender === 'male' && styles.genderTextActive]}>ชาย</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.genderButton, profile.gender === 'female' && styles.genderButtonActive]}
            onPress={() => setProfile({ ...profile, gender: 'female' })}
          >
            <Text style={[styles.genderText, profile.gender === 'female' && styles.genderTextActive]}>หญิง</Text>
          </TouchableOpacity>
        </View>

        {profile.bmr > 0 && (
          <View style={styles.bmrContainer}>
            <Text style={styles.bmrLabel}>BMR (Basal Metabolic Rate)</Text>
            <Text style={styles.bmrText}>{profile.bmr} kcal/วัน</Text>
            <Text style={styles.bmrDescription}>พลังงานที่ร่างกายใช้ในการดำรงชีวิตพื้นฐาน</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.bt, loading && { backgroundColor: '#666' }]}
          onPress={saveProfile}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btText}>บันทึก</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBt} onPress={handleLogout}>
          <Text style={styles.logoutBtText}>ออกจากระบบ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2A2D47' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2D47',
  },
  loadingText: {
    color: '#4ECDC4',
    marginTop: 15,
    fontSize: 16,
  },
  title: { fontSize: 24, color: '#fff', margin: 20, fontWeight: 'bold' },
  form: { backgroundColor: '#3A3D5C', margin: 15, padding: 20, borderRadius: 12 },
  label: { color: '#8B8FA3', marginBottom: 6 },
  input: {
    backgroundColor: '#4A4D6C',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 15,
  },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 5,
    backgroundColor: '#4A4D6C',
    alignItems: 'center',
  },
  genderButtonActive: { backgroundColor: '#00D4AA' },
  genderText: { color: '#8B8FA3', fontSize: 16 },
  genderTextActive: { color: '#fff', fontWeight: 'bold' },
  bmrContainer: {
    backgroundColor: '#4A4D6C',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#00D4AA',
  },
  bmrLabel: { color: '#8B8FA3', fontSize: 12, marginBottom: 5 },
  bmrText: { color: '#00D4AA', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  bmrDescription: { color: '#8B8FA3', fontSize: 11, fontStyle: 'italic' },
  bt: { backgroundColor: '#00D4AA', padding: 15, borderRadius: 10, alignItems: 'center' },
  btText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logoutBt: {
    backgroundColor: '#FF6B6B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  logoutBtText: { color: '#fff', fontWeight: 'bold' },
});

export default ProfileScreen;
