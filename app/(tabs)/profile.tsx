import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const colors = Colors[theme];
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!error) setProfile(data);
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const isVerified = profile?.hesap_durumu === 'onaylandi' || profile?.status === 'approved';
  const hasUploaded = !!profile?.vergi_levhasi_url;
  const isPending = !isVerified && hasUploaded && (profile?.hesap_durumu === 'beklemede' || profile?.status === 'pending_approval');

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const MenuCard = ({ icon, title, onPress, showBorder = true }: any) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuCard,
        { 
          backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
          borderColor: colors.surfaceBorder,
          marginBottom: 12
        }
      ]}
      onPress={onPress}
    >
      <View style={styles.menuCardLeft}>
        <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
          <Ionicons name={icon} size={20} color={colors.textSecondary} />
        </View>
        <Text style={[styles.menuCardText, { color: colors.text }]}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profil</Text>
      </View>

      {/* User Hero Section */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={[styles.avatarContainer, { borderColor: colors.surfaceBorder }]}>
          <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated }]}>
            <Text style={[styles.avatarText, { color: colors.text }]}>
              {profile?.ad_soyad?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.userName, { color: colors.text }]}>
          {profile?.ad_soyad?.toUpperCase() ?? 'KULLANICI'}
        </Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
          {user?.email ?? 'Bilinmiyor'}
        </Text>

        <View style={[styles.badge, { borderColor: isVerified ? colors.success : isPending ? colors.warning : colors.surfaceBorder }]}>
          <View style={[styles.badgeDot, { backgroundColor: isVerified ? colors.success : isPending ? colors.warning : colors.textMuted }]} />
          <Text style={[styles.badgeText, { color: isVerified ? colors.success : isPending ? colors.warning : colors.textMuted }]}>
            {isVerified ? 'ONAYLI HESAP' : isPending ? 'ONAY BEKLENİYOR' : 'ONAYSIZ HESAP'}
          </Text>
        </View>
      </View>

      {/* Verification Prompt */}
      {/* Verification Prompts */}
      {!isVerified && !isPending && (
        <Pressable 
          style={({ pressed }) => [
            styles.verifyPrompt, 
            { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1, overflow: 'hidden' },
            pressed && { transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => router.push('/(tabs)/verify')}
        >
          <View style={StyleSheet.absoluteFill}>
             <View style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} />
             <View style={{ position: 'absolute', right: 60, bottom: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }} />
          </View>
          <View style={styles.verifyPromptContent}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="shield-checkmark" size={24} color={colors.text} />
            </View>
            <View style={styles.verifyPromptText}>
              <Text style={[styles.verifyPromptTitle, { color: colors.text }]}>HESABINI DOĞRULA</Text>
              <Text style={[styles.verifyPromptSub, { color: colors.textSecondary }]}>
                İlan detaylarını ve B2B fiyatlarını görmek için hemen onay başvurusunda bulun.
              </Text>
            </View>
          </View>
        </Pressable>
      )}

      {isPending && (
        <Pressable 
          style={({ pressed }) => [
            styles.verifyPrompt, 
            { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.warning },
            pressed && { transform: [{ scale: 0.98 }] }
          ]}
          onPress={() => router.push('/(tabs)/verify')}
        >
          <View style={styles.verifyPromptContent}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.warning + '20', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="time" size={24} color={colors.warning} />
            </View>
            <View style={styles.verifyPromptText}>
              <Text style={[styles.verifyPromptTitle, { color: colors.text }]}>ONAY SÜRECİNDE</Text>
              <Text style={[styles.verifyPromptSub, { color: colors.textSecondary }]}>
                Belgeleriniz ekibimiz tarafından inceleniyor. Durumu kontrol etmek için dokunun.
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Action List */}
      <View style={styles.listSection}>
        <MenuCard 
          icon="business-outline" 
          title="Galeri Bilgileri" 
          onPress={() => {}} 
        />
        <MenuCard 
          icon="call-outline" 
          title="İletişim Bilgileri" 
          onPress={() => {}} 
        />
        <MenuCard 
          icon="diamond-outline" 
          title="Abonelik" 
          onPress={() => router.push('/subscription')} 
        />
        <MenuCard 
          icon="settings-outline" 
          title="Ayarlar" 
          onPress={() => router.push('/(tabs)/settings')} 
        />
      </View>

      {/* Sign Out */}
      <Pressable
        style={({ pressed }) => [
          styles.signOutBtn,
          { 
            borderColor: colors.error,
            backgroundColor: pressed ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
          }
        ]}
        onPress={signOut}
      >
        <Text style={[styles.signOutBtnText, { color: colors.error }]}>Çıkış Yap</Text>
      </Pressable>

      <Text style={[styles.footerText, { color: colors.textMuted }]}>
        Galerilink v1.0.0
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: Platform.OS === 'ios' ? '900' : 'bold',
    letterSpacing: -1,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    padding: 4,
    borderWidth: 1,
    borderRadius: 100,
    marginBottom: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 20,
    opacity: 0.8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    gap: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  verifyPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderRadius: 24,
    marginBottom: 32,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  verifyPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  verifyPromptText: {
    flex: 1,
  },
  verifyPromptTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  verifyPromptSub: {
    fontSize: 12,
    marginTop: 2,
  },
  listSection: {
    marginBottom: 32,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCardText: {
    fontSize: 16,
    fontWeight: '600',
  },
  signOutBtn: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 24,
  },
  signOutBtnText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
  },
});

