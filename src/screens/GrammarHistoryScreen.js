import React, {
  useState,
  useEffect,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Alert,
  Platform,
} from 'react-native';

import { supabase } from '../api/supabase';

const BACKGROUND_IMAGE = require('../../assets/tutor_girl.png.png');

export default function GrammarHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [corrections, setCorrections] =
    useState([]);

  const [filter, setFilter] =
    useState('ALL');

  useEffect(() => {
    fetchCorrections();
  }, []);

  async function fetchCorrections() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.log(
          'History auth error:',
          authError.message
        );
      }

      if (!user) {
        setCorrections([]);
        return;
      }

      const {
        data,
        error,
      } = await supabase
        .from('grammar_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const formattedList = [];

      if (data) {
        data.forEach((item) => {
          const hasCorrection = Boolean(
            item.corrected_text &&
              item.corrected_text.trim() !== ''
          );

          formattedList.push({
            id: item.id,

            originalText:
              item.original_text || '',

            correctedText:
              item.corrected_text || '',

            explanation:
              item.explanation || '',

            hasCorrection,

            createdAt:
              item.created_at,
          });
        });
      }

      setCorrections(formattedList);
    } catch (err) {
      console.error(
        'Error fetching history:',
        err
      );
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem(id) {
    try {
      setCorrections((prev) =>
        prev.filter(
          (item) => item.id !== id
        )
      );

      const { error } =
        await supabase
          .from('grammar_history')
          .delete()
          .eq('id', id);

      if (error) {
        console.error(
          'Supabase delete error:',
          error.message
        );

        showMessage(
          'Failed to delete from database: ' +
            error.message
        );

        fetchCorrections();
      }
    } catch (err) {
      console.error(
        'Delete exception:',
        err
      );

      showMessage(
        'Failed to delete item due to an error.'
      );

      fetchCorrections();
    }
  }

  function showMessage(message) {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert(
        'AI Tutor',
        message
      );
    }
  }

  function confirmDelete(id) {
    if (Platform.OS === 'web') {
      const confirmed =
        window.confirm(
          'Delete this grammar record?'
        );

      if (confirmed) {
        deleteItem(id);
      }

      return;
    }

    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this grammar record?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteItem(id),
        },
      ]
    );
  }

  const filteredCorrections =
    corrections.filter((item) => {
      if (filter === 'MISTAKES') {
        return item.hasCorrection;
      }

      if (filter === 'TIPS') {
        return (
          !item.hasCorrection &&
          item.explanation
        );
      }

      return true;
    });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator
          size="large"
          color="#FFCB9A"
        />

        <Text style={styles.loadingText}>
          Loading learning history...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <ImageBackground
        source={BACKGROUND_IMAGE}
        resizeMode="cover"
        style={styles.backgroundImage}
      >
        <View style={styles.bgOverlay}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.container}>
              {/* HEADER */}
              <View style={styles.headerRow}>
                <Text
                  style={styles.headerTitle}
                >
                  Grammar & Learning History
                </Text>

                <TouchableOpacity
                  style={
                    styles.refreshButton
                  }
                  onPress={fetchCorrections}
                  activeOpacity={0.7}
                >
                  <Text
                    style={
                      styles.refreshButtonText
                    }
                  >
                    🔄 Refresh
                  </Text>
                </TouchableOpacity>
              </View>

              {/* FILTERS */}
              <View style={styles.filterRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filter === 'ALL' &&
                      styles.activeFilterChip,
                  ]}
                  onPress={() =>
                    setFilter('ALL')
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === 'ALL' &&
                        styles.activeFilterText,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filter === 'MISTAKES' &&
                      styles.activeFilterChip,
                  ]}
                  onPress={() =>
                    setFilter('MISTAKES')
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === 'MISTAKES' &&
                        styles.activeFilterText,
                    ]}
                  >
                    Corrections
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filter === 'TIPS' &&
                      styles.activeFilterChip,
                  ]}
                  onPress={() =>
                    setFilter('TIPS')
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === 'TIPS' &&
                        styles.activeFilterText,
                    ]}
                  >
                    Tips
                  </Text>
                </TouchableOpacity>
              </View>

              {/* EMPTY */}
              {filteredCorrections.length ===
              0 ? (
                <View
                  style={
                    styles.emptyContainer
                  }
                >
                  <Text
                    style={styles.emptyIcon}
                  >
                    📚
                  </Text>

                  <Text
                    style={styles.emptyText}
                  >
                    No grammar records found
                    yet.
                  </Text>

                  <Text
                    style={
                      styles.emptySubText
                    }
                  >
                    Chat with the tutor to log
                    corrections!
                  </Text>
                </View>
              ) : (
                <View
                  style={
                    styles.listContainer
                  }
                >
                  {filteredCorrections.map(
                    (item) => (
                      <View
                        key={item.id}
                        style={styles.card}
                      >
                        {/* CARD HEADER */}
                        <View
                          style={
                            styles.cardHeader
                          }
                        >
                          <Text
                            style={
                              styles.cardBadge
                            }
                          >
                            {item.hasCorrection
                              ? '⚠️ Grammar Correction'
                              : '💡 Tutor Tip'}
                          </Text>

                          <TouchableOpacity
                            onPress={() =>
                              confirmDelete(
                                item.id
                              )
                            }
                            style={
                              styles.deleteButton
                            }
                            activeOpacity={0.7}
                          >
                            <Text
                              style={
                                styles.deleteButtonText
                              }
                            >
                              🗑️
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* ORIGINAL */}
                        {item.originalText ? (
                          <Text
                            style={
                              styles.errorText
                            }
                          >
                            ❌{' '}
                            {item.originalText}
                          </Text>
                        ) : null}

                        {/* CORRECTED */}
                        {item.correctedText ? (
                          <Text
                            style={
                              styles.fixedText
                            }
                          >
                            ✅{' '}
                            {item.correctedText}
                          </Text>
                        ) : null}

                        {/* EXPLANATION */}
                        {item.explanation ? (
                          <Text
                            style={
                              styles.explanationText
                            }
                          >
                            ℹ️{' '}
                            {item.explanation}
                          </Text>
                        ) : null}
                      </View>
                    )
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0F1715',
  },

  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  bgOverlay: {
    flex: 1,
    backgroundColor:
      'rgba(15, 23, 21, 0.45)',
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 80,
  },

  loaderContainer: {
    flex: 1,

    backgroundColor: '#0F1715',

    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: '#D1E8E2',
    marginTop: 12,
    fontSize: 14,
  },

  container: {
    width: '100%',
    maxWidth: 800,

    alignSelf: 'center',

    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 80,
  },

  headerRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 20,
    marginTop: 10,
  },

  headerTitle: {
    color: '#FFFFFF',

    fontSize: 24,
    fontWeight: '800',

    flex: 1,

    marginRight: 12,
  },

  refreshButton: {
    backgroundColor: '#116466',

    borderWidth: 1,
    borderColor: '#FFCB9A',

    paddingHorizontal: 12,
    paddingVertical: 7,

    borderRadius: 8,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  refreshButtonText: {
    color: '#FFCB9A',

    fontWeight: 'bold',
    fontSize: 12,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',

    marginBottom: 24,
  },

  filterChip: {
    backgroundColor:
      'rgba(11, 29, 27, 0.9)',

    paddingHorizontal: 18,
    paddingVertical: 8,

    borderRadius: 12,

    borderWidth: 1.5,
    borderColor: '#116466',

    marginRight: 10,
    marginBottom: 8,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  activeFilterChip: {
    backgroundColor: '#116466',
    borderColor: '#FFCB9A',
  },

  filterText: {
    color: '#D1E8E2',
    fontSize: 14,
    fontWeight: '600',
  },

  activeFilterText: {
    color: '#FFCB9A',
  },

  emptyContainer: {
    alignItems: 'center',

    marginTop: 60,

    paddingHorizontal: 20,
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 14,
  },

  emptyText: {
    color: '#D1E8E2',

    fontSize: 16,
    fontWeight: '700',

    textAlign: 'center',
  },

  emptySubText: {
    color: '#8FA39D',

    fontSize: 14,

    textAlign: 'center',

    marginTop: 8,
  },

  listContainer: {
    width: '100%',
  },

  card: {
    backgroundColor:
      'rgba(24, 44, 37, 0.95)',

    borderRadius: 16,

    padding: 20,

    borderWidth: 1.5,
    borderColor: '#116466',

    marginBottom: 16,

    elevation: 5,
  },

  cardHeader: {
    flexDirection: 'row',

    justifyContent: 'space-between',
    alignItems: 'center',

    marginBottom: 12,
  },

  cardBadge: {
    color: '#FFCB9A',

    fontSize: 12,
    fontWeight: '700',

    letterSpacing: 0.5,

    flex: 1,
  },

  deleteButton: {
    backgroundColor: 'transparent',

    padding: 5,

    borderRadius: 6,

    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
        }
      : {}),
  },

  deleteButtonText: {
    fontSize: 15,
  },

  errorText: {
    color: '#f87171',

    fontSize: 15,

    marginBottom: 8,

    lineHeight: 22,

    fontWeight: '600',
  },

  fixedText: {
    color: '#4ade80',

    fontSize: 15,

    fontWeight: '700',

    marginBottom: 10,

    lineHeight: 22,
  },

  explanationText: {
    color: '#FFFFFF',

    fontSize: 14,

    lineHeight: 20,
  },
});