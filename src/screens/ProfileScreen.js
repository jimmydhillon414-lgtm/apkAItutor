import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { supabase } from '../api/supabase';

const LANGUAGES = [
  { id: 'English', name: 'English', flag: 'ENG' },
  { id: 'Hindi', name: 'Hindi', flag: '🇮🇳' },
  { id: 'Spanish', name: 'Spanish', flag: 'SP' },
  { id: 'French', name: 'French', flag: 'FH' },
  { id: 'German', name: 'German', flag: 'GM' },
  { id: 'Japanese', name: 'Japanese', flag: '🇯🇵' },
  { id: 'Mandarin', name: 'Mandarin', flag: 'MD' },
];

const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// Main screen par dikhne wali 6 professions
const MAIN_PROFESSIONS = [
  { id: 'Student', name: 'Student', emoji: '🎓' },
  { id: 'Software Engineer', name: 'Software Engineer', emoji: '💻' },
  { id: 'Doctor / Medical', name: 'Doctor / Medical', emoji: '🩺' },
  { id: 'Business / Entrepreneur', name: 'Business / Entrepreneur', emoji: '💼' },
  { id: 'Teacher / Educator', name: 'Teacher / Educator', emoji: '📚' },
  { id: 'Artist / Designer', name: 'Artist / Designer', emoji: '🎨' },
];

// Popup window ke andar dikhne wali bachi hui other professions
const OTHER_PROFESSIONS = [
  { id: 'Actor / Performer', name: 'Actor / Performer', emoji: '🎬' },
  { id: 'Athlete / Player', name: 'Athlete / Player', emoji: '⚽' },
  { id: 'Scientist / Researcher', name: 'Scientist / Researcher', emoji: '🔬' },
  { id: 'Chef / Culinary', name: 'Chef / Culinary', emoji: '🍳' },
  { id: 'Writer / Author', name: 'Writer / Author', emoji: '✍️' },
  { id: 'Lawyer / Legal', name: 'Lawyer / Legal', emoji: '⚖️' },
  { id: 'Musician / Singer', name: 'Musician / Singer', emoji: '🎵' },
  { id: 'Freelancer / Creator', name: 'Freelancer / Creator', emoji: '🚀' },
  { id: 'Photographer', name: 'Photographer', emoji: '📷' },
];

export default function ProfileScreen() {
  const [fullName, setFullName] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [proficiencyLevel, setProficiencyLevel] = useState('Beginner');
  const [professionCategory, setProfessionCategory] = useState('Student');
  const [avatarType, setAvatarType] = useState('🎓');
  
  // Popup Modal visibility state
  const [otherModalVisible, setOtherModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  async function fetchUserProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        if (data.full_name) setFullName(data.full_name);
        if (data.target_language) setTargetLanguage(data.target_language);
        if (data.proficiency_level) setProficiencyLevel(data.proficiency_level);
        if (data.profession_category) setProfessionCategory(data.profession_category);
        if (data.avatar_type) setAvatarType(data.avatar_type);
      }
    } catch (err) {
      console.log('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSelectProfession(profName, emoji) {
    setProfessionCategory(profName);
    setAvatarType(emoji);
  }

  async function handleSavePreferences() {
    setSaving(true);
    setMessage('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates = {
        id: user.id,
        full_name: fullName,
        target_language: targetLanguage,
        proficiency_level: proficiencyLevel,
        profession_category: professionCategory,
        avatar_type: avatarType,
        updated_at: new Date(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .upsert(updates);

      if (error) throw error;
      setMessage('Preferences saved successfully! 🎉');
    } catch (err) {
      console.log('Error saving profile:', err);
      setMessage('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centerLoader}>
        <ActivityIndicator size="large" color="#FFCB9A" />
      </View>
    );
  }

  const isOtherSelected = !MAIN_PROFESSIONS.some((p) => p.name === professionCategory);

  return (
    <View style={styles.mainWrapper}>
      {Platform.OS === 'web' && (
        <div style={styles.bgImageWrapper}>
          <img src={require('../../assets/tutor_girl.png.png')} style={styles.bgImageStyle} alt="Background" />
          <div style={styles.bgOverlay} />
        </div>
      )}

      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={true}
        style={styles.scrollViewStyle}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.headerIcon}>⚙️</Text>
            <Text style={styles.headerTitle}>TUTOR PREFERENCES & GOALS</Text>
          </View>

          {/* Modern Profile Preview Header */}
          <View style={styles.modernProfileCard}>
            <View style={styles.avatarGlowWrapper}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarEmoji}>{avatarType || '🎓'}</Text>
              </View>
            </View>
            <View style={styles.profileInfoBox}>
              <Text style={styles.profilePreviewName} numberOfLines={1}>
                {fullName.trim() !== '' ? fullName : 'Your Name'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.professionBadge}>
                  <Text style={styles.professionBadgeText}>{professionCategory}</Text>
                </View>
                <View style={styles.langBadge}>
                  <Text style={styles.langBadgeText}>🌐 {targetLanguage}</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionSubtitle}>
            Update your profile name, profession, avatar, and language preferences to personalize your AI sessions.
          </Text>

          {/* Profile Name Input */}
          <Text style={styles.label}>Profile Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#888888"
            value={fullName}
            onChangeText={setFullName}
          />

          {/* Profession & Avatar Selection */}
          <Text style={styles.label}>Select Profession & Avatar</Text>
          <View style={styles.gridContainer}>
            {MAIN_PROFESSIONS.map((prof) => {
              const isSelected = professionCategory === prof.name;
              return (
                <TouchableOpacity
                  key={prof.id}
                  style={[
                    styles.optionCard,
                    isSelected && styles.selectedOptionCard,
                  ]}
                  onPress={() => handleSelectProfession(prof.name, prof.emoji)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.flagEmoji}>{prof.emoji}</Text>
                  <Text style={[styles.optionText, isSelected && styles.selectedOptionText]} numberOfLines={1}>
                    {prof.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Dedicated Full-Width "Other / Custom Role" Button */}
          <TouchableOpacity
            style={[
              styles.otherOptionButton,
              isOtherSelected && styles.selectedOptionCard,
            ]}
            onPress={() => setOtherModalVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.flagEmoji}>{isOtherSelected ? avatarType : ''}</Text>
            <Text style={[styles.optionText, isOtherSelected && styles.selectedOptionText]}>
              {isOtherSelected ? professionCategory : 'Other / Custom Role'}
            </Text>
            <Text style={styles.dropdownArrow}>▼</Text>
          </TouchableOpacity>

          {/* Target Languages Grid */}
          <Text style={[styles.label, { marginTop: 16 }]}>Select Target Language</Text>
          <View style={styles.gridContainer}>
            {LANGUAGES.map((lang) => {
              const isSelected = targetLanguage === lang.id;
              return (
                <TouchableOpacity
                  key={lang.id}
                  style={[styles.optionCard, isSelected && styles.selectedOptionCard]}
                  onPress={() => setTargetLanguage(lang.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.flagEmoji}>{lang.flag}</Text>
                  <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Proficiency Levels */}
          <Text style={styles.label}>Select Proficiency Level</Text>
          <View style={styles.levelRow}>
            {LEVELS.map((lvl) => {
              const isSelected = proficiencyLevel === lvl;
              return (
                <TouchableOpacity
                  key={lvl}
                  style={[styles.levelCard, isSelected && styles.selectedLevelCard]}
                  onPress={() => setProficiencyLevel(lvl)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.levelText, isSelected && styles.selectedLevelText]}>
                    {lvl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {message ? (
            <Text style={styles.messageText}>{message}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSavePreferences}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Preferences 🚀'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* OTHER PROFESSIONS POPUP MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={otherModalVisible}
        onRequestClose={() => setOtherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>✨ Select Custom / Other Role</Text>
              <TouchableOpacity onPress={() => setOtherModalVisible(false)}>
                <Text style={styles.closeModalText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubText}>Choose from our extended list of professions and roles:</Text>

            <ScrollView contentContainerStyle={styles.modalGridContainer} showsVerticalScrollIndicator={false}>
              {OTHER_PROFESSIONS.map((item) => {
                const isSelected = professionCategory === item.name;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.modalOptionCard,
                      isSelected && styles.selectedOptionCard,
                    ]}
                    onPress={() => {
                      handleSelectProfession(item.name, item.emoji);
                      setOtherModalVisible(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.flagEmoji}>{item.emoji}</Text>
                    <Text style={[styles.optionText, isSelected && styles.selectedOptionText]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setOtherModalVisible(false)}
            >
              <Text style={styles.modalCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    position: 'relative',
    height: '100vh',
    maxHeight: '100vh',
    backgroundColor: '#0F1715',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { display: 'flex', flexDirection: 'column' } : {}),
  },
  scrollViewStyle: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web' ? { overflowY: 'auto', WebkitOverflowScrolling: 'touch' } : {}),
  },
  bgImageWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    overflow: 'hidden',
  },
  bgImageStyle: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 21, 0.55)',
  },
  centerLoader: {
    flex: 1,
    backgroundColor: '#0F1715',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: '30px 16px 60px 16px',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 720,
    backgroundColor: 'rgba(20, 38, 32, 0.95)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 2,
    borderColor: '#116466',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(17, 100, 102, 0.25)',
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    color: '#FFCB9A',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  modernProfileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 20, 17, 0.75)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#116466',
    marginBottom: 18,
    gap: 18,
  },
  avatarGlowWrapper: {
    position: 'relative',
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#12221D',
    borderWidth: 2.5,
    borderColor: '#FFCB9A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFCB9A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  avatarEmoji: {
    fontSize: 32,
  },
  profileInfoBox: {
    flex: 1,
    justifyContent: 'center',
  },
  profilePreviewName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  professionBadge: {
    backgroundColor: 'rgba(255, 203, 154, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFCB9A50',
  },
  professionBadgeText: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: '700',
  },
  langBadge: {
    backgroundColor: 'rgba(17, 100, 102, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#116466',
  },
  langBadgeText: {
    color: '#D1E8E2',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: '#B2D8D8',
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 18,
  },
  label: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0A1411',
    borderWidth: 1.5,
    borderColor: '#116466',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 20,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  optionCard: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: '#0A1411',
    borderWidth: 1.5,
    borderColor: '#116466',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  otherOptionButton: {
    width: '100%',
    backgroundColor: '#0A1411',
    borderWidth: 1.5,
    borderColor: '#116466',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    position: 'relative',
    zIndex: 99,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', pointerEvents: 'auto', transition: 'all 0.2s ease' } : {}),
  },
  dropdownArrow: {
    color: '#FFCB9A',
    fontSize: 12,
  },
  selectedOptionCard: {
    backgroundColor: 'rgba(255, 203, 154, 0.2)',
    borderColor: '#FFCB9A',
  },
  flagEmoji: {
    fontSize: 22,
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: '#FFCB9A',
    fontWeight: 'bold',
  },
  levelRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  levelCard: {
    flex: 1,
    backgroundColor: '#0A1411',
    borderWidth: 1.5,
    borderColor: '#116466',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    zIndex: 5,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  selectedLevelCard: {
    backgroundColor: 'rgba(255, 203, 154, 0.2)',
    borderColor: '#FFCB9A50',
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedLevelText: {
    color: '#FFCB9A',
    fontWeight: 'bold',
  },
  messageText: {
    color: '#4ADE80',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#FFCB9A',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFCB9A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', border: 'none' } : {}),
  },
  saveButtonText: {
    color: '#121E1A',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    backgroundColor: '#12221D',
    borderRadius: 22,
    padding: 24,
    borderWidth: 2,
    borderColor: '#FFCB9A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: '#FFCB9A',
    fontSize: 18,
    fontWeight: '800',
  },
  closeModalText: {
    color: '#B2D8D8',
    fontSize: 18,
    fontWeight: 'bold',
    padding: 4,
  },
  modalSubText: {
    color: '#B2D8D8',
    fontSize: 13,
    marginBottom: 18,
  },
  modalGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 10,
  },
  modalOptionCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#0A1411',
    borderWidth: 1.5,
    borderColor: '#116466',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: '#FFCB9A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#121E1A',
    fontSize: 14,
    fontWeight: '800',
  },
});
