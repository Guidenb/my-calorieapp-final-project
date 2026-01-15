import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CalorieContext } from './CalorieContext';

const MealScreen = () => {
  const { dailyCalorieTarget, todayConsumedCalories, setTodayConsumedCalories } = useContext(CalorieContext);
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [dinner, setDinner] = useState('');

  // โหลดข้อมูลเมื่อเปิดหน้า
  useEffect(() => {
    loadMealData();
  }, []);

  // อัปเดต Context และ AsyncStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    const total =
      (parseInt(breakfast) || 0) +
      (parseInt(lunch) || 0) +
      (parseInt(dinner) || 0);
    
    // อัปเดต Context ทันที
    setTodayConsumedCalories(total);
    
    // บันทึกลง AsyncStorage
    saveMealData(total);
  }, [breakfast, lunch, dinner]);

  const loadMealData = async () => {
    try {
      const mealData = await AsyncStorage.getItem('mealData');
      if (mealData) {
        const data = JSON.parse(mealData);
        setBreakfast(data.breakfast || '');
        setLunch(data.lunch || '');
        setDinner(data.dinner || '');
      }
    } catch (error) {
      console.log('Error loading meal data:', error);
    }
  };

  const saveMealData = async (total) => {
    try {
      const mealData = {
        breakfast,
        lunch,
        dinner,
        consumedCalories: total,
        dailyTarget: dailyCalorieTarget,
      };
      await AsyncStorage.setItem('mealData', JSON.stringify(mealData));
    } catch (error) {
      console.log('Error saving meal data:', error);
    }
  };

  // คำนวณสถานะ
  let status = 'พอดี';
  let statusColor = '#4ECDC4'; // เขียว
  const percentage = dailyCalorieTarget > 0 ? (todayConsumedCalories / dailyCalorieTarget) * 100 : 0;
  
  if (percentage < 95) {
    status = 'ขาด';
    statusColor = '#45B7D1'; // น้ำเงิน
  } else if (percentage > 105) {
    status = 'เกิน';
    statusColor = '#FF6B6B'; // แดง
  }

  const remaining = dailyCalorieTarget - todayConsumedCalories;

  return (
    <LinearGradient colors={['#2C2C54', '#40407A', '#706FD3']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>SaveMeal</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>มื้ออาหาร</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>อาหารเช้า (kcal)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={breakfast}
                onChangeText={setBreakfast}
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>อาหารกลางวัน (kcal)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={lunch}
                onChangeText={setLunch}
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>อาหารเย็น (kcal)</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                keyboardType="numeric"
                value={dinner}
                onChangeText={setDinner}
                placeholderTextColor="#666"
              />
            </View>
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
              <Text style={styles.resultLabel}>
                {remaining >= 0 ? 'เหลือ:' : 'เกิน:'}
              </Text>
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
                <View 
                  style={[ 
                    styles.progressBarFill, 
                    { 
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: statusColor 
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
            </View>

            <Text style={styles.hint}>
              {status === 'ขาด' && 'ควรเพิ่มการบริโภคอาหารให้ครบตามเป้าหมาย'}
              {status === 'พอดี' && 'การบริโภคอยู่ในเกณฑ์ที่เหมาะสม'}
              {status === 'เกิน' && 'การบริโภคเกินเป้าหมาย ควรระวังการทานมากเกินไป'}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  title: { 
    fontSize: 28, 
    color: '#fff', 
    marginBottom: 5,
    fontWeight: 'bold',
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(44, 44, 84, 0.7)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#2C2C54',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#40407A',
  },
  resultCard: {
    backgroundColor: 'rgba(44, 44, 84, 0.7)',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: { 
    color: '#B0B0B0', 
    fontSize: 16,
  },
  resultValue: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#40407A',
    marginVertical: 15,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusLabel: {
    color: '#B0B0B0',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginBottom: 10,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#2C2C54',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    color: '#B0B0B0',
    fontSize: 12,
    textAlign: 'right',
  },
  hint: {
    color: '#B0B0B0',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
});

export default MealScreen;