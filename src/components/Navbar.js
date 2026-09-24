import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';

export default function Navbar({ user, activeTab, setActiveTab, onOpenLogin, onOpenSignup, onSignOut }) {
  // If user is NOT logged in (Public Home Page Navbar)
  if (!user) {
    return (
      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          <View style={styles.logoIconBox}>
            <Text style={styles.logoEmoji}>🧠✨</Text>
          </View>
          <View>
            <Text style={styles.logoText}>AI TUTOR</Text>
            <Text style={styles.logoSubtitle}>Language Companion</Text>
          </View>
        </View>
        <View style={styles.navRight}>
          <TouchableOpacity 
            style={styles.btnLogin} 
            onPress={() => {
              console.log('Login button pressed');
              if (onOpenLogin) onOpenLogin();
            }} 
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.btnLoginText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.btnSignup} 
            onPress={() => {
              console.log('Signup button pressed');
              if (onOpenSignup) onOpenSignup();
            }} 
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text style={styles.btnSignupText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // If user IS logged in (Personalized Environment Navbar)
  return (
    <View style={styles.navbar}>
      <View style={styles.navLeft}>
        <View style={styles.logoIconBox}>
          <Text style={styles.logoEmoji}>🧠✨</Text>
        </View>

        <TouchableOpacity 
          style={[styles.navBtn, activeTab === 'AI Tutor' && styles.activeNavBtn]}
          onPress={() => setActiveTab('AI Tutor')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navBtnText, activeTab === 'AI Tutor' && styles.activeNavBtnText]}>AI Tutor</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navBtn, activeTab === 'Grammar History' && styles.activeNavBtn]}
          onPress={() => setActiveTab('Grammar History')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navBtnText, activeTab === 'Grammar History' && styles.activeNavBtnText]}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.navBtn, activeTab === 'Profile Settings' && styles.activeNavBtn]}
          onPress={() => setActiveTab('Profile Settings')}
          activeOpacity={0.7}
        >
          <Text style={[styles.navBtnText, activeTab === 'Profile Settings' && styles.activeNavBtnText]}>Profile</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.navRight}>
        <TouchableOpacity style={styles.signOutBtn} onPress={onSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    // Added platform-specific padding top to move it safely below the device status bar / battery icon
    paddingTop: Platform.OS === 'ios' ? 44 : (StatusBar.currentHeight || 24) + 8,
    paddingBottom: 12,
    backgroundColor: 'rgba(10, 15, 14, 0.98)',
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255, 203, 154, 0.2)',
    zIndex: 99999, // Maximized zIndex to guarantee click priority
    elevation: 20,  // High elevation for Android touch responsiveness
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
    } : {
      position: 'relative',
    }),
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 203, 154, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 203, 154, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 2,
  },
  logoEmoji: {
    fontSize: 16,
  },
  logoText: {
    color: '#FFCB9A',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 1,
  },
  logoSubtitle: {
    color: '#8FA39D',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 203, 154, 0.2)',
  },
  activeNavBtn: {
    backgroundColor: 'rgba(255, 203, 154, 0.15)',
    borderColor: '#FFCB9A',
  },
  navBtnText: {
    color: '#cbd5e0',
    fontSize: 12,
    fontWeight: '600',
  },
  activeNavBtnText: {
    color: '#FFCB9A',
    fontWeight: 'bold',
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnLogin: {
    borderWidth: 1.5,
    borderColor: 'rgba(255, 203, 154, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    zIndex: 100000,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  btnLoginText: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: '600',
  },
  btnSignup: {
    backgroundColor: '#FFCB9A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFCB9A',
    shadowColor: '#FFCB9A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100000,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  btnSignupText: {
    color: '#0F1715',
    fontSize: 13,
    fontWeight: 'bold',
  },
  signOutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 203, 154, 0.2)',
    zIndex: 100000,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  signOutText: {
    color: '#cbd5e0',
    fontSize: 12,
    fontWeight: '600',
  },
});