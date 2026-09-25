import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';

export default function PricingScreen({
  onSelectPlan,
  onSignOut,
  onPaymentSuccess,
}) {
  const [processing, setProcessing] = useState(false);

  const handleGetProPlan = () => {
    console.log('=================================');
    console.log('GET PRO BUTTON PRESSED');
    console.log('Get Pro Plan button clicked successfully!');
    console.log('=================================');

    if (processing) {
      return;
    }

    setProcessing(true);

    setTimeout(() => {
      const purchasedPlan = '60-Day Pro Master';

      console.log('Payment demo completed');
      console.log('Purchased Plan:', purchasedPlan);

      setProcessing(false);

      if (onPaymentSuccess) {
        console.log('Calling onPaymentSuccess...');
        onPaymentSuccess(purchasedPlan);
      }

      if (onSelectPlan) {
        console.log('Calling onSelectPlan...');
        onSelectPlan(purchasedPlan);
      }
    }, 1000);
  };

  return (
    <View style={styles.mainWrapper}>

      {/* Background overlay - DOES NOT RECEIVE TOUCHES */}
      <View
        style={styles.bgOverlayStyle}
        pointerEvents="none"
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>
            AI Tutor
          </Text>
        </View>

        {onSignOut ? (
          <Pressable
            onPress={onSignOut}
            style={styles.signOutBtn}
          >
            <Text style={styles.signOutText}>
              Sign Out
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* HEADER */}
        <View style={styles.headerBox}>

          <Text style={styles.badge}>
            CHOOSE YOUR MASTERY PATH
          </Text>

          <Text style={styles.title}>
            Unlock Your Fluent Future with AI
          </Text>

          <Text style={styles.subtitle}>
            Select a plan tailored to your goals with 60 days
            of structured daily AI coaching.
          </Text>

        </View>

        {/* PRICING AREA */}
        <View style={styles.pricingGrid}>

          {/* MOST POPULAR */}
          <View style={styles.popularBadgeContainer}>
            <Text style={styles.popularBadgeText}>
              MOST POPULAR
            </Text>
          </View>

          {/* PRICING CARD */}
          <View style={styles.card}>

            <Text style={styles.planTitle}>
              60-Day Pro Master
            </Text>

            <Text style={styles.planPrice}>
              Rs. 1,799
              <Text style={styles.planSub}>
                {' '} / 60 days
              </Text>
            </Text>

            <Text style={styles.planDesc}>
              Complete 60-day roadmap for true fluency.
            </Text>

            {/* FEATURES */}
            <View style={styles.featureList}>

              <Text style={styles.featureItem}>
                ✓ Full 60 Days Masterclass Curriculum
              </Text>

              <Text style={styles.featureItem}>
                ✓ Advanced AI Voice and Accent Coaching
              </Text>

              <Text style={styles.featureItem}>
                ✓ Detailed Progress Analytics Dashboard
              </Text>

            </View>

            {/* GET PRO BUTTON */}
            <Pressable
              onPress={handleGetProPlan}
              onPressIn={() => {
                console.log('GET PRO BUTTON TOUCH DETECTED');
              }}
              disabled={processing}
              hitSlop={10}
              android_ripple={{
                color: 'rgba(0, 0, 0, 0.15)',
              }}
              style={({ pressed }) => [
                styles.solidButton,
                pressed && styles.solidButtonPressed,
              ]}
            >

              {processing ? (
                <ActivityIndicator
                  size="small"
                  color="#121E1A"
                />
              ) : (
                <Text style={styles.solidButtonText}>
                  Get Pro Plan (NOW FREE DEMO)
                </Text>
              )}

            </Pressable>

          </View>

        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  /* MAIN SCREEN */
  mainWrapper: {
    flex: 1,
    backgroundColor: '#070D10',
  },

  /* BACKGROUND OVERLAY */
  bgOverlayStyle: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(7, 13, 16, 0.55)',
  },

  /* SCROLL VIEW */
  scrollView: {
    flex: 1,
  },

  /* TOP BAR */
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: 0,
    right: 0,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 25,

    zIndex: 100,
    elevation: 20,
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

  /* SIGN OUT */
  signOutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',

    paddingHorizontal: 16,
    paddingVertical: 8,

    borderRadius: 10,

    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',

    elevation: 5,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  signOutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* MAIN CONTENT */
  container: {
    flexGrow: 1,

    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 50,

    alignItems: 'center',
  },

  /* HEADER */
  headerBox: {
    alignItems: 'center',

    marginBottom: 25,

    width: '100%',
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

    overflow: 'hidden',
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

    lineHeight: 19,

    maxWidth: 600,
  },

  /* PRICING GRID */
  pricingGrid: {
    width: '100%',
    maxWidth: 450,

    alignItems: 'center',
  },

  /* MOST POPULAR */
  popularBadgeContainer: {
    alignSelf: 'center',

    backgroundColor: '#FFCB9A',

    paddingHorizontal: 10,
    paddingVertical: 4,

    borderRadius: 8,

    marginBottom: 10,

    elevation: 3,
  },

  popularBadgeText: {
    color: '#121E1A',

    fontSize: 10,

    fontWeight: '800',
  },

  /* CARD */
  card: {
    width: '100%',

    backgroundColor: '#162C24',

    borderRadius: 20,

    padding: 24,

    borderWidth: 1.5,
    borderColor: '#FFCB9A',

    elevation: 8,
  },

  /* PLAN TITLE */
  planTitle: {
    color: '#FFFFFF',

    fontSize: 20,

    fontWeight: 'bold',

    marginBottom: 4,

    textAlign: 'center',
  },

  /* PRICE */
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

  /* DESCRIPTION */
  planDesc: {
    color: '#D1E8E2',

    fontSize: 13,

    marginBottom: 20,

    lineHeight: 18,

    textAlign: 'center',
  },

  /* FEATURES */
  featureList: {
    width: '100%',

    marginBottom: 25,

    gap: 10,
  },

  featureItem: {
    color: '#FFFFFF',

    fontSize: 13,

    lineHeight: 20,
  },

  /* PRO BUTTON */
  solidButton: {
    backgroundColor: '#FFCB9A',

    width: '100%',

    minHeight: 52,

    paddingVertical: 14,
    paddingHorizontal: 15,

    borderRadius: 12,

    alignItems: 'center',
    justifyContent: 'center',

    elevation: 10,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  solidButtonPressed: {
    opacity: 0.7,
  },

  /* BUTTON TEXT */
  solidButtonText: {
    color: '#121E1A',

    fontSize: 14,

    fontWeight: '800',

    textAlign: 'center',
  },

});