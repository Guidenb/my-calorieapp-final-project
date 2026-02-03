import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalorieContext } from './CalorieContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// ⚠️ คำเตือน: หลังจากทดสอบเสร็จ อย่าลืมไป Regenerate Key ใหม่เพื่อความปลอดภัย
const GEMINI_API_KEY = 'AIzaSyDrQEjzMbzyiSef0ZqCNUj6SYrxyiLp26Y';

// ✅ ย้าย MealCard ออกมาข้างนอก เพื่อประสิทธิภาพที่ดีขึ้น
const MealCard = ({ title, mealType, meal, onDelete, onImagePress }) => (
  <View style={styles.mealCard}>
    <View style={styles.mealHeader}>
      <Text style={styles.mealTitle}>{title}</Text>
      {meal.image && (
        <TouchableOpacity onPress={() => onDelete(mealType)}>
          <Text style={styles.deleteButton}>ลบ</Text>
        </TouchableOpacity>
      )}
    </View>
    
    <TouchableOpacity
      style={styles.imageButton}
      onPress={() => onImagePress(mealType)}
      disabled={meal.analyzing}
      activeOpacity={0.7}
    >
      {meal.image ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: meal.image }} style={styles.foodImage} />
          {meal.analyzing && (
            <View style={styles.analyzingOverlay}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.analyzingText}>กำลังวิเคราะห์...</Text>
              <Text style={styles.analyzingSubText}>กรุณารอสักครู่</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.placeholderContainer}>
          <Text style={styles.cameraIcon}>📷</Text>
          <Text style={styles.placeholderText}>แตะเพื่อถ่ายรูปหรือเลือกรูป</Text>
          <Text style={styles.placeholderSubText}>AI จะวิเคราะห์แคลอรี่ให้</Text>
        </View>
      )}
    </TouchableOpacity>

    <View style={styles.calorieDisplay}>
      <Text style={styles.calorieLabel}>แคลอรี่:</Text>
      <Text style={styles.calorieValue}>{meal.calories} kcal</Text>
    </View>
  </View>
);

const MealScreen = () => {
  const { dailyCalorieTarget, todayConsumedCalories, setTodayConsumedCalories } = useContext(CalorieContext);
  
  const [meals, setMeals] = useState({
    breakfast: { calories: 0, image: null, analyzing: false },
    lunch: { calories: 0, image: null, analyzing: false },
    dinner: { calories: 0, image: null, analyzing: false },
  });

  useEffect(() => {
    loadMealData();
    requestPermissions();
  }, []);

  useEffect(() => {
    const total = meals.breakfast.calories + meals.lunch.calories + meals.dinner.calories;
    setTodayConsumedCalories(total);
    saveMealData();
  }, [meals]);

  const requestPermissions = async () => {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงกล้องและคลังรูปภาพเพื่อใช้งานฟีเจอร์นี้');
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  const loadMealData = async () => {
    try {
      const today = new Date().toDateString();
      const mealData = await AsyncStorage.getItem(`mealData_${today}`);
      
      if (mealData) {
        const data = JSON.parse(mealData);
        setMeals({
          breakfast: data.breakfast || { calories: 0, image: null, analyzing: false },
          lunch: data.lunch || { calories: 0, image: null, analyzing: false },
          dinner: data.dinner || { calories: 0, image: null, analyzing: false },
        });
      }
    } catch (error) {
      console.log('Error loading meal data:', error);
    }
  };

  const saveMealData = async () => {
    try {
      const today = new Date().toDateString();
      const mealData = {
        breakfast: { calories: meals.breakfast.calories, image: meals.breakfast.image },
        lunch: { calories: meals.lunch.calories, image: meals.lunch.image },
        dinner: { calories: meals.dinner.calories, image: meals.dinner.image },
        date: today,
      };
      await AsyncStorage.setItem(`mealData_${today}`, JSON.stringify(mealData));
    } catch (error) {
      console.log('Error saving meal data:', error);
    }
  };

  const analyzeImageWithGemini = async (imageUri) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('YOUR_GEMINI_API_KEY')) {
      throw new Error('กรุณาใส่ Gemini API Key');
    }

    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // ✅ ใช้ v1beta และรุ่น 2.5-flash ถูกต้องแล้ว
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      const requestBody = {
        contents: [{
          parts: [
            { text: "วิเคราะห์รูปอาหารนี้และประมาณค่าแคลอรี่รวมของอาหารทั้งหมดในรูป ตอบเป็นตัวเลขเท่านั้น (หน่วยเป็น kcal) โดยไม่ต้องมีคำอธิบายหรือข้อความอื่น ตัวอย่าง: 450" },
            { inline_data: { mime_type: "image/jpeg", data: base64 } }
          ]
        }]
      };
      
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      const data = await apiResponse.json();
      
      if (!apiResponse.ok) {
        throw new Error(data.error?.message || 'API Error');
      }
      
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '0';
      const calorieMatch = text.match(/\d+/);
      const calories = calorieMatch ? parseInt(calorieMatch[0]) : 350; // Default fallback
      
      return calories > 5000 ? 5000 : (calories < 50 ? 50 : calories);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  };

  const handleImagePicker = async (mealType, source) => {
    try {
      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // ✅ ลด quality ลงเล็กน้อยเพื่อให้ upload เร็วขึ้น
      };

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets?.[0]) {
        const imageUri = result.assets[0].uri;
        
        setMeals(prev => ({
          ...prev,
          [mealType]: { ...prev[mealType], image: imageUri, analyzing: true },
        }));

        try {
          const calories = await analyzeImageWithGemini(imageUri);
          
          setMeals(prev => ({
            ...prev,
            [mealType]: { calories, image: imageUri, analyzing: false },
          }));

          Alert.alert('✅ สำเร็จ', `แคลอรี่ประมาณ ${calories} kcal`);
        } catch (error) {
          Alert.alert('❌ ผิดพลาด', 'วิเคราะห์รูปไม่ได้ กรุณาลองใหม่');
          setMeals(prev => ({
            ...prev,
            [mealType]: { ...prev[mealType], analyzing: false },
          }));
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'เกิดข้อผิดพลาดในการเลือกรูป');
    }
  };

  const showImageOptions = (mealType) => {
    Alert.alert(
      'เลือกรูปภาพ',
      'เลือกแหล่งที่มาของรูปภาพ',
      [
        { text: '📷 ถ่ายรูป', onPress: () => handleImagePicker(mealType, 'camera') },
        { text: '🖼️ คลังรูปภาพ', onPress: () => handleImagePicker(mealType, 'library') },
        { text: 'ยกเลิก', style: 'cancel' },
      ]
    );
  };

  const deleteMeal = (mealType) => {
    Alert.alert(
      'ยืนยัน',
      'ลบข้อมูลมื้อนี้?',
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'ลบ', 
          style: 'destructive', 
          onPress: () => setMeals(prev => ({
            ...prev, 
            [mealType]: { calories: 0, image: null, analyzing: false } 
          })) 
        },
      ]
    );
  };

  // คำนวณ UI
  const percentage = dailyCalorieTarget > 0 ? (todayConsumedCalories / dailyCalorieTarget) * 100 : 0;
  let status = 'พอดี';
  let statusColor = '#4ECDC4';
  if (percentage < 95) { status = 'ขาด'; statusColor = '#45B7D1'; }
  else if (percentage > 105) { status = 'เกิน'; statusColor = '#FF6B6B'; }
  
  const remaining = dailyCalorieTarget - todayConsumedCalories;

  return (
    <LinearGradient colors={['#2C2C54', '#40407A', '#706FD3']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>บันทึกมื้ออาหาร</Text>
            <Text style={styles.subtitle}>ใช้ AI วิเคราะห์แคลอรี่จากรูปภาพ</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>มื้ออาหาร</Text>
            {/* ✅ เรียกใช้ MealCard แบบส่ง Props */}
            <MealCard 
              title="อาหารเช้า (kcal)" 
              mealType="breakfast" 
              meal={meals.breakfast} 
              onDelete={deleteMeal} 
              onImagePress={showImageOptions} 
            />
            <MealCard 
              title="อาหารกลางวัน (kcal)" 
              mealType="lunch" 
              meal={meals.lunch} 
              onDelete={deleteMeal} 
              onImagePress={showImageOptions} 
            />
            <MealCard 
              title="อาหารเย็น (kcal)" 
              mealType="dinner" 
              meal={meals.dinner} 
              onDelete={deleteMeal} 
              onImagePress={showImageOptions} 
            />
          </View>

          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>รวมวันนี้:</Text>
              <Text style={styles.resultValue}>{todayConsumedCalories} kcal</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>เป้า:</Text>
              <Text style={styles.resultValue}>{dailyCalorieTarget} kcal</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>{remaining >= 0 ? 'เหลือ:' : 'เกิน:'}</Text>
              <Text style={[styles.resultValue, { color: remaining >= 0 ? '#4ECDC4' : '#FF6B6B' }]}>
                {Math.abs(remaining)} kcal
              </Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.statusContainer}>
              <Text style={styles.statusLabel}>สถานะ:</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <View style={[styles.progressBarFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: statusColor }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  title: { fontSize: 28, color: '#fff', marginBottom: 5, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#B0B0B0', marginTop: 5 },
  section: { marginHorizontal: 20, backgroundColor: 'rgba(44, 44, 84, 0.7)', borderRadius: 12, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  mealCard: { marginBottom: 20 },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mealTitle: { color: '#B0B0B0', fontSize: 14 },
  deleteButton: { color: '#FF6B6B', fontSize: 12 },
  imageButton: { borderRadius: 8, overflow: 'hidden', marginBottom: 8 },
  imageContainer: { position: 'relative' },
  foodImage: { width: '100%', height: 150, borderRadius: 8 },
  analyzingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  analyzingText: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: 'bold' },
  analyzingSubText: { color: '#B0B0B0', marginTop: 5, fontSize: 12 },
  placeholderContainer: { backgroundColor: '#2C2C54', height: 150, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#40407A', borderStyle: 'dashed' },
  cameraIcon: { fontSize: 40, marginBottom: 8 },
  placeholderText: { color: '#B0B0B0', fontSize: 14, textAlign: 'center' },
  placeholderSubText: { color: '#707070', fontSize: 12, marginTop: 4 },
  calorieDisplay: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2C2C54', padding: 12, borderRadius: 8 },
  calorieLabel: { color: '#B0B0B0', fontSize: 14 },
  calorieValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: { backgroundColor: 'rgba(44, 44, 84, 0.7)', borderRadius: 12, padding: 20, marginHorizontal: 20, marginBottom: 20 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultLabel: { color: '#B0B0B0', fontSize: 16 },
  resultValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#40407A', marginVertical: 15 },
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  statusLabel: { color: '#B0B0B0', fontSize: 16 },
  statusBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  statusText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  progressBarContainer: { marginBottom: 10 },
  progressBarBackground: { height: 12, backgroundColor: '#2C2C54', borderRadius: 6, overflow: 'hidden', marginBottom: 5 },
  progressBarFill: { height: '100%', borderRadius: 6 },
  progressText: { color: '#B0B0B0', fontSize: 12, textAlign: 'right' },
  hint: { color: '#B0B0B0', fontSize: 13, fontStyle: 'italic', textAlign: 'center', marginTop: 10, lineHeight: 18 },
});

export default MealScreen;
