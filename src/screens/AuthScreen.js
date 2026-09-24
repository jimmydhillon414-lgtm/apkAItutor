import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { supabase } from '../api/supabase';

export default function AuthScreen({ onAuthSuccess, onSwitchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState('');

  const handleSignup = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        alert(error.message || 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      if (!data.user) {
        alert('Signup failed. User could not be created.');
        setLoading(false);
        return;
      }

      setSuccessBanner('Account Created Successfully');
      setTimeout(() => {
        if (onSwitchToLogin) {
          onSwitchToLogin();
        }
      }, 1500);

    } catch (err) {
      console.log('Signup error:', err);
      alert('An unexpected error occurred during signup.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.keyboardView}
    >
      {Platform.OS === 'web' && (
        <style type="text/css">{`
          input:-webkit-autofill,
          input:-webkit-autofill:hover, 
          input:-webkit-autofill:focus, 
          input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px rgba(0, 0, 0, 0.4) inset !important;
            -webkit-text-fill-color: #FFFFFF !important;
            transition: background-color 5000s ease-in-out 0s;
          }
        `}</style>
      )}
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>CREATE ACCOUNT</Text>

          {successBanner ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successBanner}</Text>
            </View>
          ) : null}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#8FA39D"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              multiline={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
                placeholderTextColor="#8FA39D"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                multiline={false}
              />
              <TouchableOpacity 
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                placeholderTextColor="#8FA39D"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                multiline={false}
              />
              <TouchableOpacity 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.signupButton, loading && { opacity: 0.7 }]} 
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    width: '100%',
    maxHeight: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 5,
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    padding: 5,
    width: '100%',
  },
  title: {
    color: '#FFCB9A',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 1,
  },
  successBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  successText: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#E8B486',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 5,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 203, 154, 0.35)',
    fontSize: 15,
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
    } : {}),
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 203, 154, 0.35)',
    height: 48,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingHorizontal: 16,
    height: '100%',
    fontSize: 15,
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      backgroundColor: 'transparent',
    } : {}),
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  eyeText: {
    fontSize: 16,
  },
  signupButton: {
    backgroundColor: 'rgba(255, 203, 154, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 203, 154, 0.6)',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  signupButtonText: {
    color: '#FFCB9A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#A3B8B0',
    fontSize: 13,
  },
  loginLink: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: 'bold',
  },
});