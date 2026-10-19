import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor="#121E1A" />

          <SafeAreaView
            style={styles.safeArea}
            edges={['bottom']}
          >
            <AppNavigator />
          </SafeAreaView>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121E1A',
    ...(Platform.OS === 'web'
      ? {
          height: '100vh',
          width: '100vw',
          overflow: 'hidden',
        }
      : {}),
  },

  safeArea: {
    flex: 1,
    backgroundColor: '#070D10',
  },
});