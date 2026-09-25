import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';

import { supabase } from '../api/supabase';

export default function RoadmapScreen({
  selectedPlan,
  onSelectDay,
  onBack,
}) {
  const [completedDays, setCompletedDays] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
   * Determine number of days from selected plan
   */
  const totalDays =
    selectedPlan === 'Base Starter'
      ? 30
      : selectedPlan?.includes('Pro')
        ? 60
        : 7;

  /*
   * Load user's completed days
   */
  useEffect(() => {
    fetchUserProgress();
  }, []);

  async function fetchUserProgress() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.log('Auth user error:', userError);
        return;
      }

      if (!user) {
        console.log('No logged-in user found.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('completed_days')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.log(
          'Error loading completed days:',
          profileError
        );
        return;
      }

      if (
        profile &&
        Array.isArray(profile.completed_days)
      ) {
        setCompletedDays(profile.completed_days);
      } else {
        setCompletedDays([]);
      }
    } catch (err) {
      console.log(
        'Error fetching user progress:',
        err
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Generate roadmap days
   */
  const daysList = Array.from(
    { length: totalDays },
    (_, i) => {
      const dayNum = i + 1;

      let level = 'Beginner (A1)';
      let title = 'Basic Greetings & Self Introduction';

      if (dayNum > 10 && dayNum <= 25) {
        level = 'Elementary (A2)';

        title =
          dayNum === 11
            ? 'Ordering Food & Restaurant Etiquette'
            : `Daily Scenario Module ${dayNum}`;
      } else if (dayNum > 25 && dayNum <= 45) {
        level = 'Intermediate (B1)';

        title =
          dayNum === 26
            ? 'Job Interview: Tell Me About Yourself'
            : `Professional Practice ${dayNum}`;
      } else if (dayNum > 45) {
        level = 'Advanced (B2/C1)';

        title =
          dayNum === 46
            ? 'Corporate Presentation & Negotiation'
            : `Masterclass Scenario ${dayNum}`;
      } else {
        if (dayNum === 1) {
          title = 'Introduction & Basic Greetings';
        }

        if (dayNum === 2) {
          title =
            'Asking for Directions & Travel Basics';
        }
      }

      const isCompleted =
        completedDays.includes(dayNum);

      return {
        day: dayNum,
        title,
        level,
        unlocked: true,
        isCompleted,
      };
    }
  );

  /*
   * Day click handler
   */
  const handleDayPress = (dayNumber) => {
    console.log(
      '================================='
    );

    console.log(
      `DAY ${dayNumber} PRESSED`
    );

    console.log(
      'Selected Plan:',
      selectedPlan
    );

    console.log(
      'Calling onSelectDay...'
    );

    console.log(
      '================================='
    );

    if (onSelectDay) {
      onSelectDay(dayNumber);
    } else {
      console.log(
        'WARNING: onSelectDay prop is not provided.'
      );
    }
  };

  /*
   * Back button
   */
  const handleBack = () => {
    console.log('Back to Plans pressed.');

    if (onBack) {
      onBack();
    }
  };

  return (
    <View style={styles.mainWrapper}>

      {/* 
        Background layer.
        pointerEvents="none" is VERY IMPORTANT.
        It prevents the background from blocking touches.
      */}
      <View
        style={styles.bgImageLayer}
        pointerEvents="none"
      />

      <View
        style={styles.darkOverlay}
        pointerEvents="none"
      />

      {/* TOP BAR */}
      <View style={styles.topBar}>

        {onBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            android_ripple={{
              color: 'rgba(255,255,255,0.15)',
            }}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.backButtonText}>
              ← Back to Plans
            </Text>
          </Pressable>
        ) : (
          <View />
        )}

        <View style={styles.planPill}>
          <Text style={styles.planLabel}>
            Active Plan:
          </Text>

          <Text style={styles.planValue}>
            {selectedPlan || 'Free Trial'}
          </Text>
        </View>

      </View>

      {/* MAIN SCROLL AREA */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
      >

        {/* HEADER */}
        <View style={styles.headerBox}>

          <View style={styles.glowBadge}>
            <Text style={styles.badgeText}>
              ⚡ PROACTIVE ROLEPLAY ROADMAP (
              {totalDays}{' '}
              {totalDays === 1
                ? 'Day'
                : 'Days'}
              )
            </Text>
          </View>

          <Text style={styles.title}>
            Your Daily Immersive Curriculum
          </Text>

          <Text style={styles.subtitle}>
            Select a daily scenario to start your
            proactive AI tutoring session with
            real-time feedback.
          </Text>

        </View>

        {/* LOADING */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color="#FFCB9A"
            />

            <Text style={styles.loadingText}>
              Loading your roadmap...
            </Text>
          </View>
        ) : (

          /* DAYS GRID */
          <View style={styles.grid}>

            {daysList.map((item) => (

              <Pressable
                key={item.day}
                onPress={() =>
                  handleDayPress(item.day)
                }
                onPressIn={() =>
                  console.log(
                    `Touch detected on Day ${item.day}`
                  )
                }
                disabled={!item.unlocked}
                hitSlop={5}
                android_ripple={{
                  color:
                    'rgba(255,203,154,0.15)',
                }}
                style={({ pressed }) => [
                  styles.dayCard,

                  item.isCompleted &&
                    styles.completedDayCard,

                  pressed &&
                    styles.dayCardPressed,

                  !item.unlocked &&
                    styles.lockedDayCard,
                ]}
              >

                {/* CARD HEADER */}
                <View style={styles.cardHeader}>

                  <Text style={styles.dayBadge}>
                    DAY {item.day}
                  </Text>

                  <Text style={styles.levelTag}>
                    {item.level}
                  </Text>

                </View>

                {/* TITLE */}
                <Text style={styles.dayTitle}>
                  {item.title}
                </Text>

                {/* FOOTER */}
                <View style={styles.cardFooter}>

                  <Text style={styles.statusText}>
                    {item.isCompleted
                      ? '✓ Completed'
                      : 'Start Scenario'}
                  </Text>

                  <Text style={styles.arrowIcon}>
                    →
                  </Text>

                </View>

              </Pressable>

            ))}

          </View>
        )}

      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({

  /*
   * MAIN SCREEN
   */
  mainWrapper: {
    flex: 1,
    backgroundColor: '#050B0E',
  },

  /*
   * BACKGROUND
   *
   * This is deliberately non-interactive.
   */
  bgImageLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor: '#071513',

    opacity: 0.6,
  },

  /*
   * DARK OVERLAY
   *
   * pointerEvents="none" is applied in JSX.
   */
  darkOverlay: {
    position: 'absolute',

    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor:
      'rgba(5, 11, 14, 0.45)',
  },

  /*
   * SCROLL VIEW
   */
  scrollView: {
    flex: 1,
  },

  /*
   * TOP BAR
   */
  topBar: {
    flexDirection: 'row',

    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 20,
    paddingVertical: 16,

    borderBottomWidth: 1.5,
    borderBottomColor: '#116466',

    backgroundColor:
      'rgba(11, 25, 23, 0.95)',

    zIndex: 100,
    elevation: 20,
  },

  /*
   * BACK BUTTON
   */
  backButton: {
    backgroundColor: '#116466',

    paddingHorizontal: 16,
    paddingVertical: 9,

    borderRadius: 10,

    borderWidth: 1,
    borderColor: '#FFCB9A',

    minHeight: 42,

    justifyContent: 'center',

    elevation: 5,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  backButtonText: {
    color: '#FFCB9A',

    fontSize: 13,

    fontWeight: '700',
  },

  /*
   * PLAN PILL
   */
  planPill: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#122322',

    paddingHorizontal: 16,
    paddingVertical: 8,

    borderRadius: 20,

    borderWidth: 1.5,
    borderColor: '#FFCB9A',

    maxWidth: '65%',
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

  /*
   * MAIN CONTENT
   */
  container: {
    paddingHorizontal: 20,

    paddingTop: 30,

    paddingBottom: 60,

    alignItems: 'center',

    flexGrow: 1,
  },

  /*
   * HEADER
   */
  headerBox: {
    alignItems: 'center',

    marginBottom: 35,

    width: '100%',

    maxWidth: 750,
  },

  /*
   * BADGE
   */
  glowBadge: {
    backgroundColor:
      'rgba(17, 100, 102, 0.85)',

    paddingHorizontal: 16,
    paddingVertical: 7,

    borderRadius: 30,

    borderWidth: 1.5,
    borderColor: '#FFCB9A',

    marginBottom: 16,

    elevation: 4,
  },

  badgeText: {
    color: '#FFCB9A',

    fontSize: 12,

    fontWeight: '900',

    letterSpacing: 1.2,

    textAlign: 'center',
  },

  /*
   * TITLE
   */
  title: {
    color: '#FFFFFF',

    fontSize: 32,

    fontWeight: '900',

    textAlign: 'center',

    marginBottom: 12,

    textShadowColor:
      'rgba(0, 0, 0, 0.75)',

    textShadowOffset: {
      width: 0,
      height: 2,
    },

    textShadowRadius: 4,
  },

  /*
   * SUBTITLE
   */
  subtitle: {
    color: '#D1E8E2',

    fontSize: 14,

    textAlign: 'center',

    lineHeight: 20,

    maxWidth: 700,

    textShadowColor:
      'rgba(0, 0, 0, 0.75)',

    textShadowOffset: {
      width: 0,
      height: 1,
    },

    textShadowRadius: 3,
  },

  /*
   * LOADING
   */
  loadingContainer: {
    alignItems: 'center',

    justifyContent: 'center',

    paddingVertical: 60,
  },

  loadingText: {
    color: '#D1E8E2',

    fontSize: 14,

    marginTop: 15,
  },

  /*
   * DAYS GRID
   */
  grid: {
    width: '100%',

    maxWidth: 1100,

    flexDirection: 'row',

    flexWrap: 'wrap',

    justifyContent: 'center',

    gap: 20,
  },

  /*
   * DAY CARD
   */
  dayCard: {
    width: 250,

    minHeight: 160,

    backgroundColor:
      'rgba(11, 29, 27, 0.95)',

    borderRadius: 16,

    padding: 22,

    borderWidth: 2,

    borderColor: '#116466',

    justifyContent: 'space-between',

    elevation: 8,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          boxShadow:
            '0 10px 30px rgba(0,0,0,0.8)',
        }
      : {}),
  },

  /*
   * PRESSED STATE
   */
  dayCardPressed: {
    opacity: 0.7,

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  /*
   * COMPLETED DAY
   */
  completedDayCard: {
    borderColor: '#2ECC71',

    backgroundColor:
      'rgba(18, 45, 35, 0.95)',
  },

  /*
   * LOCKED DAY
   */
  lockedDayCard: {
    opacity: 0.5,
  },

  /*
   * CARD HEADER
   */
  cardHeader: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginBottom: 10,
  },

  /*
   * DAY NUMBER
   */
  dayBadge: {
    color: '#FFCB9A',

    fontSize: 12,

    fontWeight: '900',

    letterSpacing: 1,
  },

  /*
   * LEVEL
   */
  levelTag: {
    color: '#2ECC71',

    fontSize: 10,

    fontWeight: '700',

    backgroundColor:
      'rgba(46, 204, 113, 0.15)',

    paddingHorizontal: 6,
    paddingVertical: 2,

    borderRadius: 6,

    overflow: 'hidden',
  },

  /*
   * DAY TITLE
   */
  dayTitle: {
    color: '#FFFFFF',

    fontSize: 15,

    fontWeight: 'bold',

    marginBottom: 16,

    lineHeight: 22,
  },

  /*
   * CARD FOOTER
   */
  cardFooter: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    borderTopWidth: 1,

    borderTopColor:
      'rgba(255,255,255,0.15)',

    paddingTop: 12,
  },

  /*
   * STATUS
   */
  statusText: {
    color: '#FFCB9A',

    fontSize: 13,

    fontWeight: '700',
  },

  /*
   * ARROW
   */
  arrowIcon: {
    color: '#FFCB9A',

    fontSize: 18,

    fontWeight: 'bold',
  },

  /*
   * GENERAL BUTTON PRESSED STATE
   */
  buttonPressed: {
    opacity: 0.7,
  },
});