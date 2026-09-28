import React from 'react';
import {
  StyleSheet,
  View,
  Platform,
  ImageBackground,
} from 'react-native';

export default function AppBackground({ children }) {
  // =========================================================
  // WEB
  // =========================================================
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <ImageBackground
          source={require('../../assets/tutor_girl.png.png')}
          style={styles.webBackground}
          imageStyle={styles.webBackgroundImage}
          resizeMode="cover"
        >
          <View style={styles.webOverlay}>
            {children}
          </View>
        </ImageBackground>
      </View>
    );
  }

  // =========================================================
  // NATIVE
  // =========================================================
  return (
    <ImageBackground
      source={require('../../assets/tutor_girl.png.png')}
      style={styles.container}
      imageStyle={styles.nativeBackgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {children}
      </View>
    </ImageBackground>
  );
}

// ===========================================================
// STYLES
// ===========================================================

const styles = StyleSheet.create({
  // ---------------------------------------------------------
  // WEB OUTER CONTAINER
  // ---------------------------------------------------------
  webContainer: {
    width: '100%',
    height: 'calc(100vh - 56px)',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: '#0F1715',
    boxSizing: 'border-box',
  },

  // ---------------------------------------------------------
  // WEB BACKGROUND
  // ---------------------------------------------------------
  webBackground: {
    width: '100%',
    height: '100%',
    flex: 1,
  },

  webBackgroundImage: {
    width: '100%',
    height: '100%',
  },

  // ---------------------------------------------------------
  // WEB DARK OVERLAY
  // ---------------------------------------------------------
  webOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor:
      'rgba(15, 23, 21, 0.75)',
  },

  // ---------------------------------------------------------
  // NATIVE BACKGROUND
  // ---------------------------------------------------------
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0F1715',
  },

  nativeBackgroundImage: {
    width: '100%',
    height: '100%',
  },

  // ---------------------------------------------------------
  // NATIVE DARK OVERLAY
  // ---------------------------------------------------------
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor:
      'rgba(15, 23, 21, 0.75)',
  },
});