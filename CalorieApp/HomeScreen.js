import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { CalorieContext } from './CalorieContext';

const HomeScreen = ({ navigation }) => {
  // 🔥 ดึง profile จาก Context
  const { 
    dailyCalorieTarget, 
    setDailyCalorieTarget, 
    todayConsumedCalories, 
    setTodayConsumedCalories,
    profile: contextProfile // ดึง profile จาก Context
  } = useContext(CalorieContext);
  
  const [userInfo, setUserInfo] = useState({
    weight: '',
    height: '',
    age: '',
    gender: '',
    bmr: 0,
  });
  const [targetWeight, setTargetWeight] = useState('65');
  const [targetDays, setTargetDays] = useState('30');
  const [activityLevel, setActivityLevel] = useState(1.2);
  const [activityText, setActivityText] = useState('นั่งทำงาน/ไม่ออกกำลังกาย (1.2)');
  const [showActivityModal, setShowActivityModal] = useState(false);

  const [tdee, setTdee] = useState(0);
  const [weightDifference, setWeightDifference] = useState(0);
  const [dailyEnergyDifference, setDailyEnergyDifference] = useState(0);
  const [calorieStatus, setCalorieStatus] = useState('ขาด');

  const activityLevels = [
    { value: 1.2, text: 'นั่งทำงาน/ไม่ออกกำลังกาย ' },
    { value: 1.375, text: 'ออกกำลังกายเบา 1-3 วัน/สัปดาห์ ' },
    { value: 1.55, text: 'ออกกำลังกายปานกลาง 3-5 วัน/สัปดาห์ ' },
    { value: 1.725, text: 'ออกกำลังกายหนัก 6-7 วัน/สัปดาห์ ' },
    { value: 1.9, text: 'ออกกำลังกายหนักมาก/งานหนัก ' },
  ];

  // 🔥 อัพเดท userInfo ทุกครั้งที่ contextProfile เปลี่ยน
  useEffect(() => {
    if (contextProfile && contextProfile.bmr > 0) {
      setUserInfo(contextProfile);
    }
  }, [contextProfile]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );
  

  useEffect(() => {
    if (userInfo.bmr > 0) {
      calculateCalories();
    }
  }, [userInfo, targetWeight, targetDays, activityLevel]);

  useEffect(() => {
    if (dailyCalorieTarget > 0) {
      const percentage = (todayConsumedCalories / dailyCalorieTarget) * 100;
      if (percentage < 95) {
        setCalorieStatus('ขาด');
      } else if (percentage <= 105) {
        setCalorieStatus('พอดี');
      } else {
        setCalorieStatus('เกิน');
      }
    }
  }, [todayConsumedCalories, dailyCalorieTarget]);

  const loadData = async () => {
    try {
      // 🔥 โหลดจาก AsyncStorage (เป็น backup)
      const userData = await AsyncStorage.getItem('userData');
      const homeData = await AsyncStorage.getItem('homeData');
      const mealData = await AsyncStorage.getItem('mealData');

      if (userData) {
        const data = JSON.parse(userData);
        // 🔥 ถ้า Context ยังไม่มีข้อมูล ให้ใช้จาก AsyncStorage
        if (!contextProfile || contextProfile.bmr === 0) {
          setUserInfo(data);
        }
      }

      if (homeData) {
        const data = JSON.parse(homeData);
        setTargetWeight(data.targetWeight || '65');
        setTargetDays(data.targetDays || '30');
        setActivityLevel(data.activityLevel || 1.2);
        setActivityText(data.activityText || activityLevels[0].text);
      }

      if (mealData) {
        const data = JSON.parse(mealData);
        const consumed = data.consumedCalories || 0;
        setTodayConsumedCalories(consumed);
      }
    } catch (error) {
      console.log('Error loading data:', error);
    }
  };

  const calculateCalories = () => {
    const weight = parseFloat(userInfo.weight) || 70;
    const targetWt = parseFloat(targetWeight) || 65;
    const days = parseFloat(targetDays) || 30;

    const calculatedBMR = parseFloat(userInfo.bmr) || 0;
    const calculatedTDEE = calculatedBMR * activityLevel;
    const wtDifference = weight - targetWt;
    const totalCaloriesDifference = wtDifference * 7700;
    const dailyEnergyDiff = totalCaloriesDifference / days;
    const dailyTarget = calculatedTDEE - dailyEnergyDiff;

    setTdee(Math.round(calculatedTDEE));
    const roundedTarget = Math.round(dailyTarget);
    
    setDailyCalorieTarget(roundedTarget);
    
    setWeightDifference(wtDifference);
    setDailyEnergyDifference(Math.round(dailyEnergyDiff));

    syncDataToOtherScreens(roundedTarget, calculatedBMR, calculatedTDEE);
  };

  const syncDataToOtherScreens = async (target, bmr, tdeeValue) => {
    try {
      const syncData = {
        bmr: bmr || userInfo.bmr,
        tdee: tdeeValue || tdee,
        dailyCalorieTarget: target,
        activityLevel,
        activityText,
      };
      
      await AsyncStorage.setItem(
        'homeData',
        JSON.stringify({ 
          targetWeight, 
          targetDays, 
          activityLevel, 
          activityText, 
          ...syncData 
        })
      );

      const mealData = await AsyncStorage.getItem('mealData') || '{}';
      const currentMealData = JSON.parse(mealData);
      await AsyncStorage.setItem(
        'mealData',
        JSON.stringify({ 
          ...currentMealData, 
          dailyTarget: target 
        })
      );
    } catch (error) {
      console.log('Error syncing data:', error);
    }
  };

  const CalorieCard = ({ title, value, unit, subtitle, color, status }) => (
    <View style={[styles.calorieCard, { borderLeftColor: color }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value} {unit}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {status && (
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'ขาด': return '#45B7D1';
      case 'พอดี': return '#4ECDC4';
      case 'เกิน': return '#FF6B6B';
      default: return '#666';
    }
  };

  const hasProfile = userInfo.bmr > 0 && userInfo.weight && userInfo.height && userInfo.age;

  return (
    <LinearGradient colors={['#2C2C54', '#40407A', '#706FD3']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>CalorieApp</Text>
            <Text style={styles.headerSubtitle}>ภาพรวมและการตั้งค่า</Text>
          </View>

          {!hasProfile ? (
            <View style={styles.noProfileContainer}>
              <Ionicons name="person-circle-outline" size={80} color="#4ECDC4" />
              <Text style={styles.noProfileTitle}>ยังไม่มีข้อมูลโปรไฟล์</Text>
              <Text style={styles.noProfileText}>
                กรุณาไปที่หน้า Profile เพื่อกรอกข้อมูลส่วนตัว{'\n'}
                (น้ำหนัก, ส่วนสูง, อายุ, เพศ)
              </Text>
              <TouchableOpacity 
                style={styles.goToProfileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.goToProfileButtonText}>ไปที่ Profile</Text>
                <Ionicons name="arrow-forward" size={20} color="#2C2C54" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.cardsContainer}>
                <CalorieCard
                  title="BMR"
                  value={userInfo.bmr}
                  unit="kcal"
                  subtitle="จาก Profile"
                  color="#4ECDC4"
                />
                <CalorieCard
                  title="TDEE"
                  value={tdee}
                  unit="kcal"
                  subtitle={`กิจกรรม ${activityLevel}`}
                  color="#45B7D1"
                />
                <CalorieCard
                  title="เป้าแคลอรี่/วัน"
                  value={dailyCalorieTarget}
                  unit="kcal"
                  subtitle="คำนวณจากเป้าหมาย"
                  color="#F7B801"
                  status={calorieStatus}
                />
              </View>

              {/* 🔥 แสดงข้อความอัพเดทแบบเรียลไทม์ */}
              {contextProfile && contextProfile.bmr > 0 && (
                <View style={styles.realtimeIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#4ECDC4" />
                  <Text style={styles.realtimeText}>
                    ข้อมูลอัพเดทแบบเรียลไทม์จาก Profile
                  </Text>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>ข้อมูลจากโปรไฟล์</Text>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => navigation.navigate('Profile')}
                  >
                    <Ionicons name="create-outline" size={18} color="#4ECDC4" />
                    <Text style={styles.editButtonText}>แก้ไข</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.profileInfoGrid}>
                  <View style={styles.profileInfoItem}>
                    <Text style={styles.profileInfoLabel}>น้ำหนัก</Text>
                    <Text style={styles.profileInfoValue}>{userInfo.weight} กก.</Text>
                  </View>
                  <View style={styles.profileInfoItem}>
                    <Text style={styles.profileInfoLabel}>ส่วนสูง</Text>
                    <Text style={styles.profileInfoValue}>{userInfo.height} ซม.</Text>
                  </View>
                  <View style={styles.profileInfoItem}>
                    <Text style={styles.profileInfoLabel}>อายุ</Text>
                    <Text style={styles.profileInfoValue}>{userInfo.age} ปี</Text>
                  </View>
                  <View style={styles.profileInfoItem}>
                    <Text style={styles.profileInfoLabel}>เพศ</Text>
                    <Text style={styles.profileInfoValue}>
                      {userInfo.gender === 'male' ? 'ชาย' : 'หญิง'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ระดับกิจกรรม</Text>
                <TouchableOpacity style={styles.activitySelector} onPress={() => setShowActivityModal(true)}>
                  <Text style={styles.activityText}>{activityText}</Text>
                  <Ionicons name="chevron-down" size={20} color="#4ECDC4" />
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ตั้งเป้าหมายน้ำหนัก</Text>
                <View style={styles.goalInputs}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>น้ำหนักเป้าหมาย (กก.)</Text>
                    <TextInput
                      style={styles.goalInput}
                      value={targetWeight}
                      onChangeText={setTargetWeight}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>จำนวนวัน</Text>
                    <TextInput
                      style={styles.goalInput}
                      value={targetDays}
                      onChangeText={setTargetDays}
                      keyboardType="numeric"
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>การวิเคราะห์</Text>
                <View style={styles.analysisGrid}>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>ส่วนต่างพลังงาน/วัน</Text>
                    <Text style={[styles.analysisValue, { color: dailyEnergyDifference > 0 ? '#FF6B6B' : '#4ECDC4' }]}>
                      {dailyEnergyDifference > 0 ? '-' : '+'}{Math.abs(dailyEnergyDifference)} kcal
                    </Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>เป้าแคลอรี่ที่คำนวณได้</Text>
                    <Text style={styles.analysisValue}>{dailyCalorieTarget} kcal</Text>
                  </View>
                  <View style={styles.analysisItem}>
                    <Text style={styles.analysisLabel}>สถานะวันนี้</Text>
                    <Text style={[styles.analysisValue, { color: getStatusColor(calorieStatus) }]}>
                      {calorieStatus}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ข้อมูลเชิงลึก</Text>
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>สรุปเป้าหมาย</Text>
                  <Text style={styles.insightText}>
                    {weightDifference > 0 ? 'ลด' : 'เพิ่ม'}น้ำหนัก {Math.abs(weightDifference).toFixed(1)} กก. ใน {targetDays} วัน
                  </Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>แคลอรี่ที่กินวันนี้</Text>
                  <Text style={styles.insightText}>{todayConsumedCalories} kcal</Text>
                </View>
                <View style={styles.insightItem}>
                  <Text style={styles.insightLabel}>คำแนะนำ</Text>
                  <Text style={styles.insightText}>
                    {calorieStatus === 'ขาด' && 'ควรเพิ่มการบริโภคอาหารให้เพียงพอ'}
                    {calorieStatus === 'พอดี' && 'การบริโภคอยู่ในเกณฑ์ที่เหมาะสม'}
                    {calorieStatus === 'เกิน' && 'ควรลดการบริโภคหรือเพิ่มการออกกำลังกาย'}
                  </Text>
                </View>
              </View>
            </>
          )}

          {showActivityModal && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>เลือกระดับกิจกรรม</Text>
                {activityLevels.map((level, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.modalOption, activityLevel === level.value && styles.modalOptionActive]}
                    onPress={() => {
                      setActivityLevel(level.value);
                      setActivityText(level.text);
                      setShowActivityModal(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, activityLevel === level.value && styles.modalOptionTextActive]}>
                      {level.text}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowActivityModal(false)}
                >
                  <Text style={styles.modalCloseText}>ปิด</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: 20, paddingTop: 10 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#B0B0B0' },
  realtimeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 15,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
  },
  realtimeText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },
  noProfileContainer: {
    marginHorizontal: 20,
    marginTop: 40,
    backgroundColor: 'rgba(44, 44, 84, 0.7)',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  noProfileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  noProfileText: {
    fontSize: 14,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  goToProfileButton: {
    flexDirection: 'row',
    backgroundColor: '#F7B801',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    gap: 10,
  },
  goToProfileButtonText: {
    color: '#2C2C54',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
  calorieCard: {
    flex: 1,
    backgroundColor: '#2C2C54',
    borderRadius: 12,
    padding: 15,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    position: 'relative',
  },
  cardTitle: { fontSize: 14, color: '#B0B0B0', marginBottom: 5 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 5 },
  cardSubtitle: { fontSize: 10, color: '#B0B0B0' },
  statusBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  section: { marginHorizontal: 20, backgroundColor: 'rgba(44, 44, 84, 0.7)', borderRadius: 12, padding: 20, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#40407A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 5,
  },
  editButtonText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  profileInfoItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#40407A',
    borderRadius: 8,
    padding: 12,
  },
  profileInfoLabel: {
    color: '#B0B0B0',
    fontSize: 12,
    marginBottom: 5,
  },
  profileInfoValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  activitySelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#40407A', padding: 15, borderRadius: 8 },
  activityText: { color: 'white', fontSize: 16, flex: 1 },
  goalInputs: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#B0B0B0', fontSize: 12, marginBottom: 5 },
  goalInput: { backgroundColor: '#2C2C54', color: 'white', borderRadius: 8, padding: 10, fontSize: 14 },
  analysisGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 },
  analysisItem: { flex: 1, minWidth: '30%', backgroundColor: '#40407A', borderRadius: 8, padding: 10 },
  analysisLabel: { color: '#B0B0B0', fontSize: 12 },
  analysisValue: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 5 },
  insightItem: { marginBottom: 10 },
  insightLabel: { color: '#B0B0B0', fontSize: 12 },
  insightText: { color: 'white', fontSize: 14, marginTop: 2 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#2C2C54', padding: 20, borderRadius: 12, width: '80%', maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 15 },
  modalOption: { padding: 12, borderRadius: 8, marginBottom: 10, backgroundColor: '#40407A' },
  modalOptionActive: { backgroundColor: '#4ECDC4' },
  modalOptionText: { color: 'white' },
  modalOptionTextActive: { color: 'black', fontWeight: 'bold' },
  modalCloseButton: { marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: '#F7B801', alignItems: 'center' },
  modalCloseText: { color: '#2C2C54', fontWeight: 'bold' },
});

export default HomeScreen;