import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { supabase } from '../api/supabase';

export default function RoadmapScreen({ selectedPlan, onSelectDay, onBack }) {
  const [completedDays, setCompletedDays] = useState([]);
  const totalDays = selectedPlan === 'Base Starter' ? 30 : (selectedPlan?.includes('Pro') ? 60 : 7);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  async function fetchUserProgress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('completed_days')
        .eq('id', user.id)
        .maybeSingle();

      if (profile && profile.completed_days) {
        setCompletedDays(profile.completed_days);
      }
    } catch (err) {
      console.log('Error fetching user progress:', err);
    }
  }

  // Dynamic difficulty and scenario generation based on day number
  const daysList = Array.from({ length: totalDays }, (_, i) => {
    const dayNum = i + 1;
    let level = "Beginner (A1)";
    let title = "Basic Greetings & Self Introduction";

    if (dayNum > 10 && dayNum <= 25) {
      level = "Elementary (A2)";
      title = dayNum === 11 ? "Ordering Food & Restaurant Etiquette" : `Daily Scenario Module ${dayNum}`;
    } else if (dayNum > 25 && dayNum <= 45) {
      level = "Intermediate (B1)";
      title = dayNum === 26 ? "Job Interview: Tell Me About Yourself" : `Professional Practice ${dayNum}`;
    } else if (dayNum > 45) {
      level = "Advanced (B2/C1)";
      title = dayNum === 46 ? "Corporate Presentation & Negotiation" : `Masterclass Scenario ${dayNum}`;
    } else {
      if (dayNum === 1) title = "Introduction & Basic Greetings";
      if (dayNum === 2) title = "Asking for Directions & Travel Basics";
    }

    const isCompleted = completedDays.includes(dayNum);

    return {
      day: dayNum,
      title,
      level,
      unlocked: true,
      isCompleted,
    };
  });

  return (
    <View style={styles.mainWrapper}>
      {/* Background Image Layer */}
      <Image 
        source={require('../../assets/tutor_girl.png.png')} 
        style={styles.bgImage} 
      />
      <View style={styles.darkOverlay} />

      {/* Modern Sleek Top Bar */}
      <View style={styles.topBar}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>← Back to Plans</Text>
          </TouchableOpacity>
        )}
        <View style={styles.planPill}>
          <Text style={styles.planLabel}>Active Plan:</Text>
          <Text style={styles.planValue}>{selectedPlan || 'Free Trial'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerBox}>
          <View style={styles.glowBadge}>
            <Text style={styles.badgeText}>⚡ PROACTIVE ROLEPLAY ROADMAP ({totalDays} {totalDays === 1 ? 'Day' : 'Days'})</Text>
          </View>
          <Text style={styles.title}>Your Daily Immersive Curriculum</Text>
          <Text style={styles.subtitle}>Select a daily scenario to start your proactive AI tutoring session with real-time feedback.</Text>
        </View>

        <View style={styles.grid}>
          {daysList.map((item) => (
            <TouchableOpacity 
              key={item.day} 
              style={[styles.dayCard, item.isCompleted && styles.completedDayCard]}
              onPress={() => onSelectDay(item.day)}
              activeOpacity={0.85}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.dayBadge}>DAY {item.day}</Text>
                <Text style={styles.levelTag}>{item.level}</Text>
              </View>
              <Text style={styles.dayTitle}>{item.title}</Text>
              <View style={styles.cardFooter}>
                <Text style={[styles.statusText, item.isCompleted && { color: '#2ECC71' }]}>
                  {item.isCompleted ? '✓ Completed' : 'Start Scenario'}
                </Text>
                <Text style={[styles.arrowIcon, item.isCompleted && { color: '#2ECC71' }]}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: '100vh',
    backgroundColor: '#050B0E',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    opacity: 0.6,
  },
  darkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 11, 14, 0.45)',
    zIndex: 1,
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' } : {}),
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 35,
    paddingVertical: 16,
    zIndex: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#116466',
    backgroundColor: 'rgba(11, 25, 23, 0.95)',
  },
  backButton: {
    backgroundColor: '#116466',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCB9A',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backButtonText: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: '700',
  },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122322',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#FFCB9A',
  },
  planLabel: {
    color: '#D1E8E2',
    fontSize: 13,
    marginRight: 6,
  },
  planValue: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: '800',
  },
  container: {
    padding: '40px 20px',
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 35,
    maxWidth: 750,
  },
  glowBadge: {
    backgroundColor: 'rgba(17, 100, 102, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#FFCB9A',
    marginBottom: 16,
  },
  badgeText: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    color: '#D1E8E2',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    maxWidth: 1100,
    width: '100%',
    justifyContent: 'center',
  },
  dayCard: {
    width: 250,
    backgroundColor: 'rgba(11, 29, 27, 0.95)',
    borderRadius: 16,
    padding: 22,
    borderWidth: 2,
    borderColor: '#116466',
    justifyContent: 'space-between',
    minHeight: 160,
    ...(Platform.OS === 'web' ? { 
      cursor: 'pointer', 
      boxShadow: '0 10px 30px rgba(0,0,0,0.8)'
    } : {}),
  },
  completedDayCard: {
    borderColor: '#2ECC71',
    backgroundColor: 'rgba(18, 45, 35, 0.95)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayBadge: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  levelTag: {
    color: '#2ECC71',
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 16,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTops: 12,
    paddingTop: 12,
  },
  statusText: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: '700',
  },
  arrowIcon: {
    color: '#FFCB9A',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
