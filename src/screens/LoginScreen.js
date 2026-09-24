import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';

export default function LoginScreen({ onLogin, onSwitchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLoginSubmit = () => {
    console.log('Login button pressed');
    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      return;
    }
    
    setLoading(true);
    setErrorMessage('');

    setTimeout(() => {
      setLoading(false);
      // Success par onLogin call hoga jo AppNavigator ko bata dega
      if (onLogin) {
        onLogin(email);
      }
    }, 800);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Welcome Back</Text>
      <Text style={styles.headerSubtitle}>Log in to continue your AI English mastery</Text>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          placeholderTextColor="#7A8B87"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="#7A8B87"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity 
        style={styles.submitBtn} 
        onPress={handleLoginSubmit}
        activeOpacity={0.8}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#121E1A" />
        ) : (
          <Text style={styles.submitBtnText}>Log In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>Don't have an account? </Text>
        <TouchableOpacity onPress={onSwitchToSignup}>
          <Text style={styles.switchLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#D1E8E2',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#12221D',
    borderWidth: 1,
    borderColor: '#116466',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  submitBtn: {
    backgroundColor: '#FFCB9A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  submitBtnText: {
    color: '#121E1A',
    fontSize: 15,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchText: {
    color: '#D1E8E2',
    fontSize: 13,
  },
  switchLink: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: 'bold',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
});