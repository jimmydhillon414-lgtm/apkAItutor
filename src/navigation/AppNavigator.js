import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';

import Navbar from '../components/Navbar';
import LoginScreen from '../screens/LoginScreen';
import AuthScreen from '../screens/AuthScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import PricingScreen from '../screens/PricingScreen';
import RoadmapScreen from '../screens/RoadmapScreen';
import TutorChatScreen from '../screens/TutorChatScreen';
import VocabularyGameScreen from '../screens/VocabularyGameScreen';
import GrammarHistoryScreen from '../screens/GrammarHistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';

export default function AppNavigator() {
  // =========================================================
  // USER
  // =========================================================
  const [user, setUser] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      try {
        const savedUser =
          sessionStorage.getItem('ai_tutor_user');

        return savedUser
          ? JSON.parse(savedUser)
          : null;
      } catch (e) {
        console.error(
          'Failed to restore user:',
          e
        );

        return null;
      }
    }

    return null;
  });

  // =========================================================
  // CURRENT SCREEN
  //
  // roadmap
  // pricing
  // chat
  // =========================================================
  const [currentStep, setCurrentStep] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      return (
        sessionStorage.getItem(
          'ai_tutor_current_step'
        ) || 'roadmap'
      );
    }

    return 'roadmap';
  });

  // =========================================================
  // SELECTED PLAN
  // =========================================================
  const [selectedPlan, setSelectedPlan] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      return (
        sessionStorage.getItem(
          'ai_tutor_selected_plan'
        ) || null
      );
    }

    return null;
  });

  // =========================================================
  // SELECTED DAY
  // =========================================================
  const [selectedDay, setSelectedDay] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      try {
        const savedDay =
          sessionStorage.getItem(
            'ai_tutor_selected_day'
          );

        return savedDay
          ? JSON.parse(savedDay)
          : null;
      } catch (e) {
        console.error(
          'Failed to restore selected day:',
          e
        );

        return null;
      }
    }

    return null;
  });

  // =========================================================
  // PAYMENT STATUS
  // =========================================================
  const [isPaid, setIsPaid] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      return (
        sessionStorage.getItem(
          'ai_tutor_is_paid'
        ) === 'true'
      );
    }

    return false;
  });

  // =========================================================
  // ACTIVE NAVBAR TAB
  // =========================================================
  const [activeTab, setActiveTab] = useState(() => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      return (
        sessionStorage.getItem(
          'ai_tutor_active_tab'
        ) || 'AI Tutor'
      );
    }

    return 'AI Tutor';
  });

  // =========================================================
  // AUTH MODAL
  // =========================================================
  const [showAuthModal, setShowAuthModal] =
    useState(false);

  const [authMode, setAuthMode] =
    useState('login');

  // =========================================================
  // SESSION STORAGE HELPER
  // =========================================================
  const updateSessionStorage = (
    key,
    value
  ) => {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      try {
        if (
          value === null ||
          value === undefined
        ) {
          sessionStorage.removeItem(key);
          return;
        }

        sessionStorage.setItem(
          key,
          typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)
        );
      } catch (e) {
        console.error(
          `Failed to update sessionStorage for ${key}:`,
          e
        );
      }
    }
  };

  // =========================================================
  // LOGIN / SIGNUP SUCCESS
  // =========================================================
  const handleLoginSuccess = (email) => {
    console.log(
      'LOGIN SUCCESS:',
      email
    );

    const userData = {
      email:
        email ||
        'Creatorstack9@gmail.com',
    };

    setUser(userData);

    updateSessionStorage(
      'ai_tutor_user',
      userData
    );

    setShowAuthModal(false);

    const nextStep = isPaid
      ? 'roadmap'
      : 'pricing';

    setCurrentStep(nextStep);

    setActiveTab('AI Tutor');

    updateSessionStorage(
      'ai_tutor_current_step',
      nextStep
    );

    updateSessionStorage(
      'ai_tutor_active_tab',
      'AI Tutor'
    );
  };

  // =========================================================
  // SIGN OUT
  // =========================================================
  const handleSignOut = () => {
    console.log(
      'SIGNING OUT'
    );

    setUser(null);

    setCurrentStep('roadmap');

    setSelectedPlan(null);

    setIsPaid(false);

    setSelectedDay(null);

    setActiveTab('AI Tutor');

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      try {
        sessionStorage.clear();
      } catch (e) {
        console.error(
          'Failed to clear sessionStorage:',
          e
        );
      }
    }
  };

  // =========================================================
  // SELECT PLAN
  // =========================================================
  const handleSelectPlan = (
    planName
  ) => {
    console.log(
      'PLAN SELECTED:',
      planName
    );

    setSelectedPlan(planName);

    setIsPaid(true);

    setCurrentStep('roadmap');

    setActiveTab('AI Tutor');

    updateSessionStorage(
      'ai_tutor_selected_plan',
      planName
    );

    updateSessionStorage(
      'ai_tutor_is_paid',
      'true'
    );

    updateSessionStorage(
      'ai_tutor_current_step',
      'roadmap'
    );

    updateSessionStorage(
      'ai_tutor_active_tab',
      'AI Tutor'
    );
  };

  // =========================================================
  // SELECT DAY
  //
  // ROADMAP -> TUTOR CHAT
  // =========================================================
  const handleSelectDay = (
    dayNumber
  ) => {
    console.log(
      '========================================'
    );

    console.log(
      'DAY CLICKED:',
      dayNumber
    );

    console.log(
      'Selected Plan:',
      selectedPlan
    );

    console.log(
      'Navigating to TutorChatScreen...'
    );

    console.log(
      '========================================'
    );

    // Save selected day
    setSelectedDay(dayNumber);

    // IMPORTANT:
    // This changes Roadmap -> TutorChat
    setCurrentStep('chat');

    // AI Tutor becomes active
    setActiveTab('AI Tutor');

    // Persist selected day
    updateSessionStorage(
      'ai_tutor_selected_day',
      dayNumber
    );

    // Persist screen
    updateSessionStorage(
      'ai_tutor_current_step',
      'chat'
    );

    // Persist active tab
    updateSessionStorage(
      'ai_tutor_active_tab',
      'AI Tutor'
    );
  };

  // =========================================================
  // BACK FROM CHAT -> ROADMAP
  // =========================================================
  // FALLING VOCABULARY GAME NAVIGATION
  const handleOpenVocabularyGame = () => {
    setCurrentStep('vocabulary-game');
    setActiveTab('AI Tutor');
    updateSessionStorage('ai_tutor_current_step', 'vocabulary-game');
    updateSessionStorage('ai_tutor_active_tab', 'AI Tutor');
  };

  const handleBackFromVocabularyGame = () => {
    setCurrentStep('chat');
    setActiveTab('AI Tutor');
    updateSessionStorage('ai_tutor_current_step', 'chat');
    updateSessionStorage('ai_tutor_active_tab', 'AI Tutor');
  };

  const handleBackToRoadmap = () => {
    console.log(
      'Returning to Roadmap'
    );

    setCurrentStep('roadmap');

    setActiveTab('AI Tutor');

    updateSessionStorage(
      'ai_tutor_current_step',
      'roadmap'
    );

    updateSessionStorage(
      'ai_tutor_active_tab',
      'AI Tutor'
    );
  };

  // =========================================================
  // NAVBAR TAB CHANGE
  //
  // THIS IS IMPORTANT
  //
  // AI Tutor  -> Roadmap
  // History   -> Grammar History
  // Profile   -> Profile
  // =========================================================
  const handleNavbarTabChange = (
    tab
  ) => {
    console.log(
      '========================================'
    );

    console.log(
      'NAVBAR TAB SELECTED:',
      tab
    );

    // Always update active tab
    setActiveTab(tab);

    updateSessionStorage(
      'ai_tutor_active_tab',
      tab
    );

    // -------------------------------------------------------
    // AI TUTOR
    // -------------------------------------------------------
    if (
      tab === 'AI Tutor'
    ) {
      console.log(
        'Opening AI Tutor Roadmap'
      );

      setCurrentStep('roadmap');

      updateSessionStorage(
        'ai_tutor_current_step',
        'roadmap'
      );

      console.log(
        '========================================'
      );

      return;
    }

    // -------------------------------------------------------
    // HISTORY
    // -------------------------------------------------------
    if (
      tab === 'History' ||
      tab === 'Grammar History'
    ) {
      console.log(
        'Opening Grammar History'
      );

      /*
       * We intentionally keep currentStep
       * independent from navbar screens.
       *
       * renderContent() checks activeTab
       * BEFORE rendering Roadmap.
       */

      console.log(
        '========================================'
      );

      return;
    }

    // -------------------------------------------------------
    // PROFILE
    // -------------------------------------------------------
    if (
      tab === 'Profile' ||
      tab === 'Profile Settings'
    ) {
      console.log(
        'Opening Profile Settings'
      );

      console.log(
        '========================================'
      );

      return;
    }

    console.log(
      'Unknown navbar tab:',
      tab
    );

    console.log(
      '========================================'
    );
  };

  // =========================================================
  // RENDER CONTENT
  // =========================================================
  const renderContent = () => {
    // =======================================================
    // NOT LOGGED IN
    // =======================================================
    if (!user) {
      return (
        <HomeScreen
          onOpenLogin={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}
          onOpenSignup={() => {
            setAuthMode('signup');
            setShowAuthModal(true);
          }}
        />
      );
    }

    // =======================================================
    // PRICING
    // =======================================================
    if (
      currentStep === 'pricing' &&
      !isPaid
    ) {
      return (
        <PricingScreen
          onSelectPlan={
            handleSelectPlan
          }
          onPaymentSuccess={
            handleSelectPlan
          }
          onSignOut={
            handleSignOut
          }
        />
      );
    }

    // =======================================================
    // CHAT
    //
    // MUST BE BEFORE ROADMAP
    // =======================================================
    if (currentStep === 'vocabulary-game') {
      return (
        <VocabularyGameScreen onBack={handleBackFromVocabularyGame} />
      );
    }

    if (
      currentStep === 'chat'
    ) {
      console.log(
        'Rendering TutorChatScreen with selectedDay:',
        selectedDay
      );

      return (
        <TutorChatScreen
          selectedDay={
            selectedDay
          }
          onBack={
            handleBackToRoadmap
          }
          onOpenVocabularyGame={handleOpenVocabularyGame}
          onSignOut={
            handleSignOut
          }
        />
      );
    }

    // =======================================================
    // HISTORY
    //
    // MUST BE BEFORE ROADMAP
    //
    // This fixes the problem where Roadmap was always
    // rendering because currentStep remained "roadmap".
    // =======================================================
    if (
      activeTab === 'History' ||
      activeTab === 'Grammar History'
    ) {
      console.log(
        'Rendering GrammarHistoryScreen'
      );

      return (
        <GrammarHistoryScreen
          user={user}
          onBack={
            handleBackToRoadmap
          }
        />
      );
    }

    // =======================================================
    // PROFILE
    //
    // MUST BE BEFORE ROADMAP
    // =======================================================
    if (
      activeTab === 'Profile' ||
      activeTab === 'Profile Settings'
    ) {
      console.log(
        'Rendering ProfileScreen'
      );

      return (
        <ProfileScreen
          user={user}
          selectedPlan={
            selectedPlan
          }
          onBack={
            handleBackToRoadmap
          }
        />
      );
    }

    // =======================================================
    // ROADMAP
    // =======================================================
    if (
      currentStep === 'roadmap'
    ) {
      console.log(
        'Rendering RoadmapScreen'
      );

      return (
        <RoadmapScreen
          selectedPlan={
            selectedPlan
          }
          onSelectDay={
            handleSelectDay
          }
          onBack={() => {
            /*
             * Paid users stay on Roadmap.
             *
             * This prevents accidentally going
             * back to pricing.
             */
            if (isPaid) {
              return;
            }

            setCurrentStep(
              'pricing'
            );

            updateSessionStorage(
              'ai_tutor_current_step',
              'pricing'
            );
          }}
        />
      );
    }

    // =======================================================
    // FALLBACK
    // =======================================================
    console.log(
      'AppNavigator fallback -> TutorChatScreen'
    );

    return (
      <TutorChatScreen
        selectedDay={
          selectedDay
        }
        onBack={
          handleBackToRoadmap
        }
        onSignOut={
          handleSignOut
        }
      />
    );
  };

  // =========================================================
  // NAVBAR VISIBILITY
  // =========================================================
  const showNavbar = !(
    user &&
    currentStep === 'pricing' &&
    !isPaid
  );

  // =========================================================
  // MAIN UI
  // =========================================================
  return (
    <View style={styles.container}>

      {/* ===================================================
          NAVBAR
      =================================================== */}
      {showNavbar && (
        <Navbar
          user={user}
          activeTab={activeTab}

          setActiveTab={
            handleNavbarTabChange
          }

          onOpenLogin={() => {
            setAuthMode('login');
            setShowAuthModal(true);
          }}

          onOpenSignup={() => {
            setAuthMode('signup');
            setShowAuthModal(true);
          }}

          onSignOut={
            handleSignOut
          }
        />
      )}

      {/* ===================================================
          CONTENT
      =================================================== */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* ===================================================
          AUTH MODAL
      =================================================== */}
      {showAuthModal && (
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalContent
            }
          >

            {/* AUTH SCREEN */}
            {authMode === 'signup' ? (
              <AuthScreen
                onAuthSuccess={
                  handleLoginSuccess
                }
                onSwitchToLogin={() =>
                  setAuthMode(
                    'login'
                  )
                }
              />
            ) : (
              <LoginScreen
                onLogin={
                  handleLoginSuccess
                }
                onSwitchToSignup={() =>
                  setAuthMode(
                    'signup'
                  )
                }
              />
            )}

            {/* CLOSE BUTTON */}
            <TouchableOpacity
              style={
                styles.closeBtn
              }
              onPress={() =>
                setShowAuthModal(
                  false
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.closeBtnText
                }
              >
                ✕
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      )}

    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor:
      '#070D10',

    position: 'relative',

    ...(Platform.OS === 'web'
      ? {
          height: '100dvh',
          maxHeight: '100dvh',
          overflowY: 'auto',
        }
      : {}),
  },

  content: {
    flex: 1,

    backgroundColor:
      'transparent',
  },

  // =======================================================
  // AUTH MODAL OVERLAY
  // =======================================================
  modalOverlay: {
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
        }
      : {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),

    backgroundColor:
      'rgba(7, 13, 16, 0.95)',

    justifyContent:
      'center',

    alignItems:
      'center',

    zIndex: 999999,

    paddingTop:
      Platform.OS === 'ios'
        ? 40
        : StatusBar.currentHeight || 24,
  },

  // =======================================================
  // AUTH MODAL CONTENT
  // =======================================================
  modalContent: {
    width: '95%',

    maxWidth: 420,

    maxHeight: '90%',

    backgroundColor:
      '#0F1715',

    borderRadius: 20,

    padding: 20,

    borderWidth: 1.5,

    borderColor:
      'rgba(255, 203, 154, 0.3)',

    position: 'relative',

    shadowColor:
      '#000',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity:
      0.5,

    shadowRadius:
      20,

    elevation: 10,
  },

  // =======================================================
  // CLOSE BUTTON
  // =======================================================
  closeBtn: {
    position: 'absolute',

    top: 15,

    right: 15,

    width: 32,

    height: 32,

    borderRadius: 16,

    backgroundColor:
      'rgba(255, 255, 255, 0.08)',

    justifyContent:
      'center',

    alignItems:
      'center',

    borderWidth: 1,

    borderColor:
      'rgba(255, 203, 154, 0.2)',

    zIndex: 1000000,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  closeBtnText: {
    color:
      '#FFCB9A',

    fontSize: 16,

    fontWeight:
      'bold',
  },
});