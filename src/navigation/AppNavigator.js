import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar } from 'react-native';
import Navbar from '../components/Navbar';
import LoginScreen from '../screens/LoginScreen';
import AuthScreen from '../screens/AuthScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PricingScreen from '../screens/PricingScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import TutorChatScreen from '../screens/TutorChatScreen';
import GrammarHistoryScreen from '../screens/GrammarHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

export default function AppNavigator() {
  const [user, setUser] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const savedUser = sessionStorage.getItem('ai_tutor_user');
        return savedUser ? JSON.parse(savedUser) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [currentStep, setCurrentStep] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return sessionStorage.getItem('ai_tutor_current_step') || 'roadmap';
    }
    return 'roadmap';
  });

  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return sessionStorage.getItem('ai_tutor_selected_plan') || null;
    }
    return null;
  });

  const [selectedDay, setSelectedDay] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const day = sessionStorage.getItem('ai_tutor_selected_day');
      return day ? JSON.parse(day) : null;
    }
    return null;
  });

  const [isPaid, setIsPaid] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return sessionStorage.getItem('ai_tutor_is_paid') === 'true';
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return sessionStorage.getItem('ai_tutor_active_tab') || 'AI Tutor';
    }
    return 'AI Tutor';
  });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const updateSessionStorage = (key, value) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (value === null) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }
  };

  const handleLoginSuccess = (email) => {
    const userData = { email: email || 'Creatorstack9@gmail.com' };
    setUser(userData);
    updateSessionStorage('ai_tutor_user', userData);
    setShowAuthModal(false);
    
    // Agar user paid nahi hai toh login ke baad pricing screen dikhao, warna roadmap
    const nextStep = isPaid ? 'roadmap' : 'pricing';
    setCurrentStep(nextStep);
    updateSessionStorage('ai_tutor_current_step', nextStep);
  };

  const handleSignOut = () => {
    setUser(null);
    setCurrentStep('roadmap');
    setSelectedPlan(null);
    setIsPaid(false);
    setSelectedDay(null);
    setActiveTab('AI Tutor');
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      sessionStorage.clear();
    }
  };

  const handleSelectPlan = (planName) => {
    setSelectedPlan(planName);
    setIsPaid(true);
    setCurrentStep('roadmap');
    
    updateSessionStorage('ai_tutor_selected_plan', planName);
    updateSessionStorage('ai_tutor_is_paid', 'true');
    updateSessionStorage('ai_tutor_current_step', 'roadmap');
  };

  const handleSelectDay = (dayNumber) => {
    setSelectedDay(dayNumber);
    setCurrentStep('chat');
    setActiveTab('AI Tutor');
    
    updateSessionStorage('ai_tutor_selected_day', dayNumber);
    updateSessionStorage('ai_tutor_current_step', 'chat');
    updateSessionStorage('ai_tutor_active_tab', 'AI Tutor');
  };

  const renderContent = () => {
    if (!user) {
      return (
        <HomeScreen 
          onOpenLogin={() => { setAuthMode('login'); setShowAuthModal(true); }} 
          onOpenSignup={() => { setAuthMode('signup'); setShowAuthModal(true); }} 
        />
      );
    }

    // Agar user ne plan nahi liya hai, toh pricing screen show hogi
    if (currentStep === 'pricing' && !isPaid) {
      return (
        <PricingScreen 
          onSelectPlan={handleSelectPlan} 
          onPaymentSuccess={handleSelectPlan}
          onSignOut={handleSignOut} 
        />
      );
    }

    if (currentStep === 'roadmap' || isPaid) {
      return (
        <RoadmapScreen 
          selectedPlan={selectedPlan}
          onSelectDay={handleSelectDay}
          onBack={() => {
            setCurrentStep('pricing');
            updateSessionStorage('ai_tutor_current_step', 'pricing');
          }}
        />
      );
    }

    switch (activeTab) {
      case 'AI Tutor':
        return (
          <TutorChatScreen 
            selectedDay={selectedDay} 
            onBack={() => {
              setCurrentStep('roadmap');
              updateSessionStorage('ai_tutor_current_step', 'roadmap');
            }}
            onSignOut={handleSignOut}
          />
        );
      case 'History': 
      case 'Grammar History':
        return <GrammarHistoryScreen />;
      case 'Profile': 
      case 'Profile Settings':
        return <ProfileScreen user={user} selectedPlan={selectedPlan} />;
      default:
        return (
          <TutorChatScreen 
            selectedDay={selectedDay} 
            onBack={() => {
              setCurrentStep('roadmap');
              updateSessionStorage('ai_tutor_current_step', 'roadmap');
            }}
            onSignOut={handleSignOut}
          />
        );
    }
  };

  const showNavbar = !(user && (currentStep === 'pricing' && !isPaid));

  return (
    <View style={styles.container}>
      {showNavbar && (
        <Navbar 
          user={user} 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            updateSessionStorage('ai_tutor_active_tab', tab);
            if (tab === 'AI Tutor' && isPaid) {
              setCurrentStep('roadmap');
              updateSessionStorage('ai_tutor_current_step', 'roadmap');
            }
          }} 
          onOpenLogin={() => { setAuthMode('login'); setShowAuthModal(true); }}
          onOpenSignup={() => { setAuthMode('signup'); setShowAuthModal(true); }}
          onSignOut={handleSignOut}
        />
      )}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {showAuthModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {authMode === 'signup' ? (
              <AuthScreen 
                onAuthSuccess={handleLoginSuccess} 
                onSwitchToLogin={() => setAuthMode('login')} 
              />
            ) : (
              <LoginScreen 
                onLogin={handleLoginSuccess} 
                onSwitchToSignup={() => setAuthMode('signup')} 
              />
            )}
            <TouchableOpacity 
              style={styles.closeBtn}
              onPress={() => setShowAuthModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070D10',
    position: 'relative',
    ...(Platform.OS === 'web' ? { height: '100dvh', maxHeight: '100dvh', overflowY: 'auto' } : {}),
  },
  content: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    ...(Platform.OS === 'web'
      ? { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }
      : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }),
    backgroundColor: 'rgba(7, 13, 16, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    paddingTop: Platform.OS === 'ios' ? 40 : (StatusBar.currentHeight || 24),
  },
  modalContent: {
    width: '95%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#0F1715',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 203, 154, 0.3)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 203, 154, 0.2)',
    zIndex: 1000000,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  closeBtnText: {
    color: '#FFCB9A',
    fontSize: 16,
    fontWeight: 'bold',
  },
});