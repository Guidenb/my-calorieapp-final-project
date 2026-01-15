// LoginScreen.js
import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalorieContext } from './CalorieContext'; 

// ⚠️ อัปเดต URL นี้เป็นที่อยู่ IP ของเครื่องคอมพิวเตอร์ที่รัน Backend
const API_URL = 'http://192.168.0.102:3000/login';

const LoginScreen = ({ navigation }) => { 
  // 🛑 ใช้ Context เพื่อดึง setAuthToken
  const { setAuthToken } = useContext(CalorieContext); 

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('ผิดพลาด', 'กรุณากรอกอีเมลและรหัสผ่านให้ครบ');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (response.ok && data.token) {
        // 🛑 บันทึก JWT Token
        await AsyncStorage.setItem('userToken', data.token);
        // 🛑 อัปเดต Context ทันที! (แก้ปัญหา RESET Navigation)
        setAuthToken(data.token); 
        
        Alert.alert('สำเร็จ', 'เข้าสู่ระบบเรียบร้อย');
        
      } else {
        Alert.alert('เข้าสู่ระบบไม่สำเร็จ', data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>เข้าสู่ระบบ</Text>
      <TextInput
        style={styles.input}
        placeholder="อีเมล"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholderTextColor="#B0B0B0"
      />
      <TextInput
        style={styles.input}
        placeholder="รหัสผ่าน"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholderTextColor="#B0B0B0"
      />
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#2C2C54" /> : <Text style={styles.buttonText}>เข้าสู่ระบบ</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>ยังไม่มีบัญชี? ลงทะเบียน</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2C2C54', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 30 },
  input: {
    width: '100%',
    backgroundColor: '#40407A',
    borderRadius: 8,
    padding: 15,
    color: 'white',
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    width: '100%',
    backgroundColor: '#F7B801',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: { color: '#2C2C54', fontSize: 18, fontWeight: 'bold' },
  link: { color: '#4ECDC4', fontSize: 14 },
});

export default LoginScreen;
