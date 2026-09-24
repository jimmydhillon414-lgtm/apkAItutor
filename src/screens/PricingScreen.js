import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';

export default function PricingScreen({ onSelectPlan, onSignOut, onPaymentSuccess }) {
  const [processing, setProcessing] = useState(false);

  const handleGetProPlan = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      const purchasedPlan = '60-Day Pro Master';
      if (onPaymentSuccess) {
        onPaymentSuccess(purchasedPlan);
      }
      if (onSelectPlan) {
        onSelectPlan(purchasedPlan);
      }
    }, 1000);
  };

  return (
    <View style={styles.mainWrapper}>
      {/* Sharp Background Image */}
      <Image 
        source={require('../../assets/tutor_girl.png.png')} 
        style={styles.bgImage} 
      />
      
      <View style={styles.bgOverlayStyle} />

      {/* Top Bar with Sign Out button */}
      <View style={styles.topBar}>
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>🧠 AI Tutor</Text>
        </View>
        {onSignOut && (
          <TouchableOpacity onPress={onSignOut} style={styles.signOutBtn} activeOpacity={0.8}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBox}>
          <Text style={styles.badge}>⚡ CHOOSE YOUR MASTERY PATH</Text>
          <Text style={styles.title}>Unlock Your Fluent Future with AI</Text>
          <Text style={styles.subtitle}>
            Select a plan tailored to your goals with 60 days of structured daily AI coaching.
          </Text>
        </View>

        <View style={styles.pricingGrid}>
          {/* Single Pro Master Card */}
          <View style={[styles.card, styles.popularCard]}>
            <View style={styles.popularBadgeContainer}>
              <Text style={styles.popularBadgeText}>MOST POPULAR 🔥</Text>
            </View>
            <View>
              <Text style={styles.planTitle}>60-Day Pro Master</Text>
              <Text style={styles.planPrice}>₹1,799 <Text style={styles.planSub}>/ 60 days</Text></Text>
              <Text style={styles.planDesc}>Complete 60-day roadmap for true fluency.</Text>
              
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>🚀 Full 60 Days Masterclass Curriculum</Text>
                <Text style={styles.featureItem}>🎙️ Advanced AI Voice & Accent Coaching</Text>
                <Text style={styles.featureItem}>📊 Detailed Progress Analytics Dashboard</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.solidButton}
              onPress={handleGetProPlan}
              activeOpacity={0.8}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#121E1A" />
              ) : (
                <Text style={styles.solidButtonText}>Get Pro Plan (NOW FREE DEMO)</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    minHeight: '100%',
    ...(Platform.OS === 'web' ? { height: '100vh', overflowY: 'auto', overflowX: 'hidden' } : {}),
    backgroundColor: '#070D10',
    position: 'relative',
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
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' } : {}),
    zIndex: 0,
  },
  bgOverlayStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(7, 13, 16, 0.55)',
    zIndex: 1,
    ...(Platform.OS === 'web' ? { pointerEvents: 'none' } : {}),
  },
  topBar: {
    position: 'relative',
    zIndex: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 12,
    marginTop: Platform.OS === 'android' ? 35 : 15, // Pushed down enough below status bar / camera notch
  },
  logoArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  signOutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    zIndex: 2,
    paddingBottom: 40,
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 25,
    maxWidth: 700,
  },
  badge: {
    color: '#FFCB9A',
    backgroundColor: 'rgba(255, 203, 154, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: 'rgba(255, 203, 154, 0.3)',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#D1E8E2',
    fontSize: 13,
    textAlign: 'center',
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    maxWidth: 450,
    width: '100%',
  },
  card: {
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
    backgroundColor: '#12221D',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#116466',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? { boxShadow: '0 12px 36px rgba(0,0,0,0.8)' } : {}),
  },
  popularCard: {
    borderColor: '#FFCB9A',
    backgroundColor: '#162C24',
  },
  popularBadgeContainer: {
    alignSelf: 'center',
    backgroundColor: '#FFCB9A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  popularBadgeText: {
    color: '#121E1A',
    fontSize: 10,
    fontWeight: '800',
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  planPrice: {
    color: '#FFCB9A',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  planSub: {
    fontSize: 12,
    color: '#D1E8E2',
    fontWeight: 'normal',
  },
  planDesc: {
    color: '#D1E8E2',
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
    textAlign: 'center',
  },
  featureList: {
    gap: 10,
    marginBottom: 25,
  },
  featureItem: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  solidButton: {
    backgroundColor: '#FFCB9A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer', border: 'none' } : {}),
  },
  solidButtonText: {
    color: '#121E1A',
    fontSize: 14,
    fontWeight: '800',
  },
});