// components/RoleplaySelector.jsx

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';

const SCENARIOS = [
  {
    id: 'business',
    title: '💼 Business Meeting',
    prompt:
      'Act as a senior manager conducting a performance review.',
  },
  {
    id: 'travel',
    title: '✈️ Airport Check-in',
    prompt:
      'Act as an airline gate agent handling baggage issues.',
  },
  {
    id: 'casual',
    title: '☕ Coffee Shop Chat',
    prompt:
      'Act as a friendly barista chatting about local events.',
  },
];

export default function RoleplaySelector({
  onSelectScenario,
}) {
  const handleScenarioPress = (scenario) => {
    console.log(
      'ROLEPLAY SCENARIO SELECTED:',
      scenario.id
    );

    console.log(
      'ROLEPLAY PROMPT:',
      scenario.prompt
    );

    if (
      typeof onSelectScenario === 'function'
    ) {
      onSelectScenario(scenario);
    }
  };

  return (
    <View style={styles.container}>

      {/* =================================================
          TITLE
      ================================================= */}
      <Text style={styles.title}>
        Choose a Practice Scenario
      </Text>

      {/* =================================================
          SCENARIOS
      ================================================= */}
      <View style={styles.scenariosContainer}>
        {SCENARIOS.map((scenario) => (
          <TouchableOpacity
            key={scenario.id}
            style={styles.scenarioButton}
            onPress={() =>
              handleScenarioPress(
                scenario
              )
            }
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={
              scenario.title
            }
          >
            <Text
              style={
                styles.scenarioButtonText
              }
            >
              {scenario.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
}

// =========================================================
// STYLES
// =========================================================

const styles = StyleSheet.create({
  // -------------------------------------------------------
  // MAIN CONTAINER
  // -------------------------------------------------------
  container: {
    padding: 16,

    width: '100%',

    backgroundColor:
      'transparent',

    boxSizing:
      Platform.OS === 'web'
        ? 'border-box'
        : undefined,
  },

  // -------------------------------------------------------
  // TITLE
  // -------------------------------------------------------
  title: {
    color: '#FFFFFF',

    fontSize: 18,

    fontWeight: '700',

    marginBottom: 12,

    lineHeight: 24,
  },

  // -------------------------------------------------------
  // SCENARIOS CONTAINER
  // -------------------------------------------------------
  scenariosContainer: {
    flexDirection: 'row',

    flexWrap: 'wrap',

    gap: 12,

    width: '100%',
  },

  // -------------------------------------------------------
  // SCENARIO BUTTON
  // -------------------------------------------------------
  scenarioButton: {
    paddingVertical: 12,

    paddingHorizontal: 16,

    borderRadius: 12,

    backgroundColor: '#116466',

    borderWidth: 1,

    borderColor: '#FFCB9A',

    minHeight: 44,

    justifyContent: 'center',

    alignItems: 'center',

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  // -------------------------------------------------------
  // BUTTON TEXT
  // -------------------------------------------------------
  scenarioButtonText: {
    color: '#FFCB9A',

    fontSize: 14,

    fontWeight: '600',

    textAlign: 'center',

    lineHeight: 20,
  },
});