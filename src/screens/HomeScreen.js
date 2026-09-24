import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../api/supabase';

export default function HomeScreen({ navigation, onOpenLogin, onOpenSignup }) {
  const [userProfile, setUserProfile] = useState({
    target_language: 'English',
    proficiency_level: 'Beginner',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    } catch (err) {
      console.log('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.mainWrapper}>
      {/* Background Image Layer */}
      {Platform.OS === 'web' && (
        <View style={styles.bgImageWrapper}>
          <Image source={require('../../assets/tutor_girl.png.png')} style={styles.bgImageStyle} />
          <View style={styles.bgOverlay} />
        </View>
      )}

      {/* ScrollView with proper bottom spacing */}
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={true}>
        
        {/* Play Store Style Trust & Rating Header Banner */}
        <View style={styles.trustBanner}>
          <View style={styles.trustBadgeItem}>
            <Text style={styles.trustValue}>4.9 ★</Text>
            <Text style={styles.trustLabel}>User Rating</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustBadgeItem}>
            <Text style={styles.trustValue}>24/7</Text>
            <Text style={styles.trustLabel}>Personal AI Tutor</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustBadgeItem}>
            <Text style={styles.trustValue}>100k+</Text>
            <Text style={styles.trustLabel}>Active Learners</Text>
          </View>
        </View>

        {/* Main Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.aiIllustrationContainer}>
            <Image 
              source={require('../../assets/tutor_girl.png.png')} 
              style={styles.tutorHDImage} 
            />
          </View>

          <View style={styles.aiBadge}>
            <Text style={{ fontSize: 12 }}>⚡</Text>
            <Text style={styles.aiBadgeText}>INDIA'S NO.1 SPOKEN AI COACH</Text>
          </View>
          
          <Text style={styles.heroTitle}>
            Master <Text style={{ color: '#FFCB9A' }}>{userProfile.target_language || 'English'}</Text> Fast with AI
          </Text>
          
          <View style={styles.heroCenteredContainer}>
            <Text style={styles.heroSubtitleStylish}>
              Your personal 1-on-1 voice & chat companion engineered for rapid fluency at a{' '}
              <Text style={styles.highlightBadge}>
                {userProfile.proficiency_level || 'Beginner'}
              </Text>{' '}
              level.
            </Text>
          </View>

          {/* Action Buttons to trigger Login / Signup Modal */}
          <View style={styles.ctaButtonRow}>
            <TouchableOpacity 
              style={styles.primaryCtaButton} 
              onPress={onOpenSignup || onOpenLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryCtaText}>Get Started Free</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.secondaryCtaButton} 
              onPress={onOpenLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryCtaText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Interactive AI Tutor Video Demonstration */}
        <View style={styles.videoSectionCard}>
          <View style={styles.videoHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
              <Text style={styles.videoBadgeTitle}>LIVE AI TUTOR PREVIEW</Text>
            </View>
            <View style={styles.liveBadgeContainer}>
              <Text style={styles.liveDot}>●</Text>
              <Text style={styles.liveIndicator}>READY</Text>
            </View>
          </View>
          
          <View style={styles.videoWrapper}>
            {Platform.OS === 'web' ? (
              <video 
                style={styles.videoPlayer}
                controls
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              >
                <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <View style={styles.videoPlaceholder}>
                <Text style={{ fontSize: 40, marginBottom: 10 }}>▶️</Text>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Interactive AI Preview</Text>
              </View>
            )}
          </View>
          <Text style={styles.videoDescription}>
            Watch how Solarin analyzes your accent, gives instant grammar feedback, and adapts daily lessons to your pace.
          </Text>
        </View>

        {/* 4 Horizontal Advantage Boxes */}
        <View style={styles.advantagesSection}>
          <View style={styles.advantagesHeader}>
            <Text style={{ fontSize: 16 }}>💎</Text>
            <Text style={styles.advantagesHeaderText}>WHY LEARN WITH SOLARIN AI</Text>
          </View>

          <View style={styles.horizontalRow}>
            <View style={styles.horizontalSquareCard}>
              <Text style={styles.cardEmoji}>🎯</Text>
              <Text style={styles.cardTitle}>Instant Correction</Text>
              <Text style={styles.cardText}>Real-time feedback on your pronunciation & grammar.</Text>
            </View>

            <View style={styles.horizontalSquareCard}>
              <Text style={styles.cardEmoji}>🛡️</Text>
              <Text style={styles.cardTitle}>Zero Judgement</Text>
              <Text style={styles.cardText}>Practice stress-free without any hesitation.</Text>
            </View>

            <View style={styles.horizontalSquareCard}>
              <Text style={styles.cardEmoji}>📈</Text>
              <Text style={styles.cardTitle}>Adaptive Pace</Text>
              <Text style={styles.cardText}>Lessons automatically scale to your speed.</Text>
            </View>

            <View style={styles.horizontalSquareCard}>
              <Text style={styles.cardEmoji}>⚡</Text>
              <Text style={styles.cardTitle}>Rapid Fluency</Text>
              <Text style={styles.cardText}>Focus entirely on real-world spoken vocabulary.</Text>
            </View>
          </View>
        </View>

        {/* Modern Trending Footer Section */}
        <View style={styles.footerContainer}>
          <View style={styles.footerContentTop}>
            <View style={styles.footerBrandCol}>
              <View style={styles.aiBadge}>
                <Text style={{ fontSize: 12 }}>⚡</Text>
                <Text style={styles.aiBadgeText}>AI LANGUAGE TUTOR</Text>
              </View>
              <Text style={styles.footerBrandDesc}>
                Empowering millions to speak English fluently and confidently with advanced conversational AI technology.
              </Text>
            </View>

            <View style={styles.footerLinksCol}>
              <Text style={styles.footerColTitle}>Quick Links</Text>
              <Text style={styles.footerLink}>About Us</Text>
              <Text style={styles.footerLink}>Features</Text>
              <Text style={styles.footerLink}>Success Stories</Text>
            </View>

            <View style={styles.footerLinksCol}>
              <Text style={styles.footerColTitle}>Support</Text>
              <Text style={styles.footerLink}>Help Center</Text>
              <Text style={styles.footerLink}>Contact Us</Text>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </View>
          </View>

          <View style={styles.footerDivider} />

          <View style={styles.footerBottomRow}>
            <Text style={styles.copyrightText}>
              © 2026 AI Technologies. All rights reserved.
            </Text>
            <View style={styles.socialIconsRow}>
              <Text style={styles.socialIcon}>🌍</Text>
              <Text style={styles.socialIcon}>💬</Text>
              <Text style={styles.socialIcon}>📷</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    position: 'relative',
    minHeight: '100vh',
    backgroundColor: '#0F1715',
  },
  bgImageWrapper: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -1,
    overflow: 'hidden',
  },
  bgImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 21, 0.85)',
  },
  container: {
    paddingTop: 24,
    paddingBottom: 100,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  trustBanner: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#182C25',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#116466',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  trustBadgeItem: {
    alignItems: 'center',
  },
  trustValue: {
    color: '#FFCB9A',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 2,
  },
  trustLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  trustDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#116466',
  },
  heroCard: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#182C25',
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 30,
    borderWidth: 2,
    borderColor: '#116466',
    alignItems: 'center',
    marginBottom: 24,
  },
  aiIllustrationContainer: {
    width: '100%',
    height: 320,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#0A1411',
  },
  tutorHDImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
    borderRadius: 16,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#116466',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FFCB9A',
    marginBottom: 18,
  },
  aiBadgeText: {
    color: '#FFCB9A',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 38,
  },
  heroCenteredContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 20,
  },
  heroSubtitleStylish: {
    fontSize: 15,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.3,
    fontWeight: '400',
  },
  highlightBadge: {
    color: '#FFCB9A',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 203, 154, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ctaButtonRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryCtaButton: {
    backgroundColor: '#FFCB9A',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primaryCtaText: {
    color: '#0F1715',
    fontWeight: 'bold',
    fontSize: 15,
  },
  secondaryCtaButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFCB9A',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  secondaryCtaText: {
    color: '#FFCB9A',
    fontWeight: 'bold',
    fontSize: 15,
  },
  videoSectionCard: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#182C25',
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: '#116466',
    marginBottom: 24,
  },
  videoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  videoBadgeTitle: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  liveBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  liveDot: {
    color: '#4ADE80',
    fontSize: 10,
  },
  liveIndicator: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  videoWrapper: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0A1411',
    borderWidth: 1.5,
    borderColor: '#116466',
  },
  videoPlayer: {
    width: '100%',
    height: 280,
    objectFit: 'cover',
    display: 'block',
    outlineStyle: 'none',
  },
  videoPlaceholder: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDescription: {
    color: '#D1E8E2',
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  advantagesSection: {
    width: '100%',
    maxWidth: 820,
    marginBottom: 30,
  },
  advantagesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingLeft: 4,
  },
  advantagesHeaderText: {
    color: '#FFCB9A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  horizontalRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  horizontalSquareCard: {
    flex: 1,
    backgroundColor: '#182C25',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#116466',
    flexDirection: 'column',
    alignItems: 'flex-start',
    minHeight: 150,
  },
  cardEmoji: {
    fontSize: 22,
    marginBottom: 10,
    backgroundColor: 'rgba(17, 100, 102, 0.3)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#116466',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardText: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 15,
  },
  footerContainer: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#111E1A',
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#116466',
  },
  footerContentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 24,
    marginBottom: 20,
  },
  footerBrandCol: {
    flex: 2,
    minWidth: 220,
  },
  footerBrandDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  footerLinksCol: {
    flex: 1,
    minWidth: 120,
    flexDirection: 'column',
    gap: 8,
  },
  footerColTitle: {
    color: '#FFCB9A',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  footerLink: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#116466',
    marginBottom: 16,
  },
  footerBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  copyrightText: {
    color: '#64748B',
    fontSize: 11,
  },
  socialIconsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    fontSize: 14,
    backgroundColor: 'rgba(17, 100, 102, 0.3)',
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#116466',
  },
});