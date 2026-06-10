import React, { useEffect, useState, memo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Platform, TouchableOpacity, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useSubscriptionLimit } from '@/hooks/use-subscription-limit';

export default function ProfileScreen() {
  const { user, signOut, trialEndDate, daysRemaining, isTrialExpired } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const colors = Colors[theme];
  
  const { currentCount, maxListings, isLoading: isLimitLoading } = useSubscriptionLimit();
  
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Hesabım</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Profil ve ayarlarınızı yönetin</Text>
      </View>

      {/* User Hero Section - Premium Flat Card */}
      <View style={[styles.heroCard, { backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF', borderColor: colors.surfaceBorder }]}>
        <View style={styles.heroRow}>
          <View style={[styles.avatarBox, { backgroundColor: colors.tint + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.tint }]}>
              {profile?.ad_soyad?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {profile?.ad_soyad?.toUpperCase() ?? 'KULLANICI'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user?.email ?? 'Bilinmiyor'}
            </Text>
          </View>
        </View>

        <View style={[styles.statusLine, { backgroundColor: colors.surfaceBorder }]} />

        <View style={styles.badgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: isVerified ? colors.success + '15' : isPending ? colors.warning + '15' : colors.error + '15' }]}>
            <View style={[styles.badgeDot, { backgroundColor: isVerified ? colors.success : isPending ? colors.warning : colors.error }]} />
            <Text style={[styles.badgeText, { color: isVerified ? colors.success : isPending ? colors.warning : colors.error }]}>
              {isVerified ? 'ONAYLI GALERİ' : isPending ? 'ONAY BEKLENİYOR' : 'ONAYSIZ HESAP'}
            </Text>
          </View>
          {isVerified && (
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          )}
        </View>
      </View>

      {/* Trial Status Banner */}
      {profile?.subscription_status === 'trial' && daysRemaining !== null && (
        <View style={{
          backgroundColor: isTrialExpired
            ? '#DC2626'
            : daysRemaining <= 3 ? '#F97316' : '#EAB308',
          borderRadius: 16,
          padding: 16,
          marginBottom: 24,
        }}>
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
            {daysRemaining === 0
              ? 'Trial süreniz doldu. Devam etmek için planınızı yükseltin.'
              : `Trial süreniz: ${daysRemaining} gün kaldı`}
          </Text>
          {daysRemaining > 0 && trialEndDate && (
            <Text style={{ color: 'white', fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              {`Bitiş tarihi: ${new Date(
                trialEndDate.replace(' ', 'T').split('.')[0] + 'Z'
              ).toLocaleDateString('tr-TR')}`}
            </Text>
          )}
        </View>
      )}

      {/* Active Listings Limit Card */}
      <TouchableOpacity
        style={[
          styles.limitCard, 
          { 
            backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF', 
            borderColor: (currentCount >= maxListings || isTrialExpired) ? colors.error + '40' : colors.surfaceBorder 
          }
        ]}
        onPress={() => router.push('/subscription')}
        activeOpacity={0.8}
      >
        {isLimitLoading ? (
          <View style={styles.limitLoadingContainer}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
            <Text style={[styles.limitLoadingText, { color: colors.textSecondary }]}>
              Limit bilgileri yükleniyor...
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.limitHeader}>
              <View style={[styles.limitIconBox, { backgroundColor: colors.tint + '10' }]}>
                <Ionicons 
                  name="car-sport-outline" 
                  size={20} 
                  color={(currentCount >= maxListings || isTrialExpired) ? colors.error : colors.tint} 
                />
              </View>
              <View style={styles.limitTextContainer}>
                <Text style={[styles.limitTitle, { color: colors.textSecondary }]}>Aktif İlan Limiti</Text>
                <Text style={[styles.limitValue, { color: colors.text }]}>
                  {maxListings === Infinity 
                    ? `${currentCount} / Sınırsız Aktif İlan` 
                    : `${currentCount} / ${maxListings} Aktif İlan`}
                </Text>
              </View>
              {maxListings !== Infinity && (
                <View style={[
                  styles.limitBadge, 
                  { 
                    backgroundColor: (currentCount >= maxListings || isTrialExpired)
                      ? colors.error + '15' 
                      : currentCount >= maxListings * 0.8 
                        ? colors.warning + '15' 
                        : colors.success + '15' 
                  }
                ]}>
                  <Text style={[
                    styles.limitBadgeText, 
                    { 
                      color: (currentCount >= maxListings || isTrialExpired)
                        ? colors.error 
                        : currentCount >= maxListings * 0.8 
                          ? colors.warning 
                          : colors.success 
                    }
                  ]}>
                    {isTrialExpired 
                      ? 'Süre Doldu' 
                      : currentCount >= maxListings 
                        ? 'Dolu' 
                        : `%${Math.round((currentCount / maxListings) * 100)}`}
                  </Text>
                </View>
              )}
            </View>
            
            <View style={[styles.progressBarContainerLimit, { backgroundColor: theme === 'dark' ? '#27272A' : '#E2E8F0' }]}>
              <View 
                style={[
                  styles.progressBarLimit, 
                  { 
                    backgroundColor: isTrialExpired
                      ? colors.error
                      : maxListings === Infinity
                        ? colors.success
                        : currentCount >= maxListings 
                          ? colors.error 
                          : currentCount >= maxListings * 0.8 
                            ? colors.warning 
                            : colors.tint,
                    width: maxListings === Infinity 
                      ? '100%' 
                      : `${Math.min((currentCount / maxListings) * 100, 100)}%` 
                  }
                ]} 
              />
            </View>
            
            {(currentCount >= maxListings || isTrialExpired) && (
              <View style={styles.limitFooter}>
                <Ionicons name="arrow-forward" size={14} color={colors.error} />
                <Text style={[styles.limitFooterText, { color: colors.error }]}>
                  {isTrialExpired 
                    ? 'İlan eklemeye devam etmek için planınızı yükseltin' 
                    : 'Limitiniz doldu. Ek ilan kapasitesi için paketinizi yükseltin'}
                </Text>
              </View>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Verification Prompts - Dynamic CTA Banner */}
      {!isVerified && !isPending && (
        <TouchableOpacity 
          style={[styles.ctaBanner, { backgroundColor: colors.text }]}
          onPress={() => router.push('/(tabs)/verify')}
          activeOpacity={0.9}
        >
          <View style={styles.ctaContent}>
            <View style={[styles.ctaIconBox, { backgroundColor: colors.background + '20' }]}>
              <Ionicons name="shield-checkmark" size={24} color={colors.background} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaTitle, { color: colors.background }]}>Ayrıcalıkları Aç</Text>
              <Text style={[styles.ctaSub, { color: colors.background, opacity: 0.8 }]}>
                B2B fiyatları ve ilan detayları için hemen doğrula.
              </Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </View>
        </TouchableOpacity>
      )}

      {isPending && (
        <View style={[styles.pendingBanner, { backgroundColor: colors.surfaceElevated, borderColor: colors.warning }]}>
          <View style={styles.pendingHeader}>
            <Ionicons name="time" size={20} color={colors.warning} />
            <Text style={[styles.pendingTitle, { color: colors.text }]}>Onay Bekleniyor</Text>
          </View>
          <View style={[styles.progressBarContainer, { backgroundColor: theme === 'dark' ? '#27272A' : '#E2E8F0' }]}>
            <View style={[styles.progressBar, { backgroundColor: colors.warning, width: '65%' }]} />
          </View>
          <Text style={[styles.pendingInfo, { color: colors.textSecondary }]}>Belgeleriniz inceleniyor, genellikle 24 saat içinde tamamlanır.</Text>
        </View>
      )}

      {/* Action List - Minimalist Flat Design */}
      <View style={styles.sectionLabelContainer}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>KURUMSAL</Text>
      </View>
      
      <View style={[styles.menuContainer, { backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF', borderColor: colors.surfaceBorder }]}>
        <MenuCard icon="business-outline" title="Galeri Bilgileri" onPress={() => {}} />
        <View style={[styles.menuDivider, { backgroundColor: colors.surfaceBorder }]} />
        <MenuCard icon="call-outline" title="İletişim Bilgileri" onPress={() => {}} />
        <View style={[styles.menuDivider, { backgroundColor: colors.surfaceBorder }]} />
        <MenuCard icon="diamond-outline" title="Abonelik" onPress={() => router.push('/subscription')} />
        <View style={[styles.menuDivider, { backgroundColor: colors.surfaceBorder }]} />
        <MenuCard icon="settings-outline" title="Ayarlar" onPress={() => router.push('/(tabs)/settings')} />
      </View>

      {/* Logout Button - Consistent Theme */}
      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF', borderColor: colors.error + '40' }]}
        onPress={signOut}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Oturumu Kapat</Text>
      </TouchableOpacity>

      <Text style={[styles.versionText, { color: colors.textMuted }]}>Versiyon 1.2.0 • Premium B2B</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    paddingBottom: 60,
  },
  header: {
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
    opacity: 0.7,
  },
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
  },
  heroInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
    opacity: 0.6,
  },
  statusLine: {
    height: 1,
    marginVertical: 20,
    opacity: 0.5,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 8,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ctaBanner: {
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
  },
  ctaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  ctaIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  ctaSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pendingBanner: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 32,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  pendingInfo: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
  },
  sectionLabelContainer: {
    marginBottom: 12,
    paddingLeft: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  menuContainer: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuCardText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 20,
    opacity: 0.3,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    marginBottom: 32,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.5,
  },
  limitCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  limitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  limitIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  limitTextContainer: {
    flex: 1,
  },
  limitTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  limitValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  limitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  limitBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBarContainerLimit: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarLimit: {
    height: '100%',
    borderRadius: 3,
  },
  limitLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  limitLoadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  limitFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  limitFooterText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

