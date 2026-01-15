// RegisterScreen.js (Simplified for brevity)
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';

const API_URL = 'http://192.168.0.102:3000/register'; // อัปเดต URL

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert('ข้อมูลไม่ครบ', 'กรุณากรอกข้อมูลให้ครบ');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('สำเร็จ', 'ลงทะเบียนเรียบร้อยแล้ว');
        navigation.navigate('Login'); 
      } else {
        Alert.alert('ลงทะเบียนไม่สำเร็จ', data.message || 'อีเมลนี้ถูกใช้แล้วหรือมีข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Register error:', error);
      Alert.alert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ลงทะเบียน</Text>
      <TextInput style={styles.input} placeholder="ชื่อ" value={name} onChangeText={setName} placeholderTextColor="#B0B0B0" />
      <TextInput style={styles.input} placeholder="อีเมล" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#B0B0B0" />
      <TextInput style={styles.input} placeholder="รหัสผ่าน" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#B0B0B0" />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#2C2C54" /> : <Text style={styles.buttonText}>ลงทะเบียน</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>มีบัญชีอยู่แล้ว? เข้าสู่ระบบ</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    // ใช้ styles เดียวกับ LoginScreen.js
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
      backgroundColor: '#4ECDC4',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 20,
    },
    buttonText: { color: '#2C2C54', fontSize: 18, fontWeight: 'bold' },
    link: { color: '#F7B801', fontSize: 14 },
  });
  
export default RegisterScreen;