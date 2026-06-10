import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

const NOTIFICATION_PREFS_KEY = 'galerilink_notification_preferences';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, mode, setMode } = useTheme();
  const { user, signOut } = useAuth();
  const colors = Colors[theme];

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifsEnabled, setNotifsEnabled] = useState(true);
  const [priceAlertsEnabled, setPriceAlertsEnabled] = useState(false);
  const prefsHydratedRef = useRef(false);
  
  // Password States
  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    fetchProfile();
    loadNotificationPreferences();
  }, []);

  useEffect(() => {
    if (!prefsHydratedRef.current) return;
    AsyncStorage.setItem(
      NOTIFICATION_PREFS_KEY,
      JSON.stringify({ notifsEnabled, priceAlertsEnabled })
    ).catch(() => {});
  }, [notifsEnabled, priceAlertsEnabled]);

  const loadNotificationPreferences = async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw);
      setNotifsEnabled(Boolean(prefs.notifsEnabled));
      setPriceAlertsEnabled(Boolean(prefs.priceAlertsEnabled));
    } catch {
      // Tercihler okunamazsa varsayilanlar kullanilir.
    } finally {
      prefsHydratedRef.current = true;
    }
  };

  const fetchProfile = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (err: any) {
      console.error('Settings fetch profile error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert("Hata", "Lütfen tüm alanları doldurun.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert("Hata", "Yeni şifreler eşleşmiyor.");
      return;
    }

    setLoading(true);
    try {
      // 1. Mevcut şifreyi doğrula
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email!,
        password: passwordForm.oldPassword,
      });

      if (signInError) {
        Alert.alert("Hata", "Mevcut şifreniz hatalı.");
        setLoading(false);
        return;
      }

      // 2. Yeni şifreyi güncelle
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (updateError) throw updateError;

      Alert.alert("Başarılı", "Şifreniz başarıyla güncellendi.");
      setIsPasswordModalVisible(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      Alert.alert("Hata", "İşlem başarısız: " + err.message);
    } finally {
      setLoading(false);
    }
  };


  const handlePolicyPress = (title: string) => {
    Alert.alert(title, "Bu özellik çok yakında eklenecektir.", [{ text: "Tamam" }]);
  };

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: colors.text }]}>{title}</Text>
  );

  if (loading && !isPasswordModalVisible) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AYARLAR</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Appearance */}
        <View style={styles.section}>
          {renderSectionHeader('GÖRÜNÜM')}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.row}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Tema Seçimi</Text>
            </View>
            <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceElevated }]}>
              {(['light', 'dark', 'system'] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[
                    styles.segment,
                    mode === m && [styles.activeSegment, { backgroundColor: colors.surfaceBorder }],
                  ]}
                >
                  <Text style={[styles.segmentText, { color: mode === m ? colors.text : colors.textMuted }]}>
                    {m === 'light' ? 'AÇIK' : m === 'dark' ? 'KOYU' : 'SİSTEM'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          {renderSectionHeader('HESAP')}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: colors.tintLight }]}>
                <Text style={[styles.avatarText, { color: colors.tint }]}>
                  {(profile?.ad_soyad || user?.email)?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={[styles.profileName, { color: colors.text }]}>
                  {(profile?.ad_soyad || user?.email?.split('@')[0])?.toUpperCase() ?? 'KULLANICI'}
                </Text>
                <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
                  {user?.email ?? 'bilinmiyor@galerilink.com'}
                </Text>
              </View>
            </View>

            <Pressable style={[styles.actionButton, { backgroundColor: colors.surfaceElevated }]} onPress={() => setIsPasswordModalVisible(true)}>
              <Text style={[styles.actionButtonText, { color: colors.text }]}>ŞİFRE GÜNCELLE</Text>
            </Pressable>
          </View>
        </View>

        {/* Security & Sessions */}
        <View style={styles.section}>
          {renderSectionHeader('GÜVENLİK VE OTURUMLAR')}
          {profile?.subscription_status === 'enterprise' ? (
            <View style={[styles.premiumCard, { backgroundColor: colors.surface }]}>
              {/* Machined Selector Section */}
              <View style={styles.machinedRow}>
                <View style={styles.menuItemText}>
                  <Text style={[styles.technicalTitle, { color: colors.text }]}>MAKSİMUM OTURUM</Text>
                  <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>Eşzamanlı aktif cihaz sınırı</Text>
                </View>
                <View style={[styles.machinedSelector, { backgroundColor: colors.surfaceElevated }]}>
                  {[1, 2, 3].map((num) => {
                    const isActive = profile?.max_sessions === num;
                    return (
                      <Pressable 
                        key={num}
                        onPress={async () => {
                          try {
                            const { error } = await supabase.from('profiles').update({ max_sessions: num }).eq('id', user?.id);
                            if (error) throw error;
                            fetchProfile();
                          } catch (error) {
                            Alert.alert('Hata', 'Oturum limiti guncellenemedi.');
                          }
                        }}
                        style={[
                          styles.machinedOption, 
                          isActive && { backgroundColor: colors.background, borderColor: colors.success, borderWidth: 1.5 }
                        ]}
                      >
                        <Text style={[
                          styles.machinedOptionText, 
                          { color: isActive ? colors.success : colors.textMuted }
                        ]}>
                          0{num}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Active Devices Tonal Card */}
              <Pressable 
                style={[styles.tonalItem, { backgroundColor: colors.surfaceElevated }]} 
                onPress={() => router.push('/sessions')}
              >
                <View style={styles.tonalItemContent}>
                  <View style={[styles.tonalIcon, { backgroundColor: colors.tintLight }]}>
                    <Ionicons name="phone-portrait-outline" size={18} color={colors.text} />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={[styles.technicalTitle, { color: colors.text }]}>AKTİF CİHAZLAR</Text>
                    <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>Oturum açılmış cihazların listesi</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </Pressable>
            </View>
          ) : (
            <View style={[styles.premiumCard, { backgroundColor: colors.surface }]}>
              <View style={{ padding: 24, alignItems: 'center', gap: 16 }}>
                <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.warning + '15', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="lock-closed" size={28} color={colors.warning} />
                </View>
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.technicalTitle, { color: colors.text, fontSize: 14, textAlign: 'center' }]}>KURUMSAL PAKETE ÖZEL</Text>
                  <Text style={[styles.menuItemSub, { color: colors.textMuted, textAlign: 'center', lineHeight: 18 }]}>
                    Çoklu cihaz oturum yönetimi ve aktif cihaz kontrolü sadece Kurumsal paket abonelerine özeldir.
                  </Text>
                </View>
                <Pressable 
                  style={({ pressed }) => [{ 
                    width: '100%', 
                    height: 48, 
                    borderRadius: 12, 
                    backgroundColor: colors.surfaceElevated, 
                    borderColor: colors.surfaceBorder, 
                    borderWidth: 1,
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 8,
                    opacity: pressed ? 0.7 : 1,
                  }]}
                  onPress={() => router.push('/subscription')}
                >
                  <Ionicons name="diamond-outline" size={16} color={colors.text} />
                  <Text style={{ color: colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>PAKETİ YÜKSELT</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          {renderSectionHeader('BİLDİRİMLER')}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, padding: 0 }]}>
            <View style={[styles.menuItem, { borderBottomColor: colors.surfaceBorder }]}>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>YENİ İLAN BİLDİRİMLERİ</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>Yeni araçlar için anlık bildirim.</Text>
              </View>
              <Switch value={notifsEnabled} onValueChange={setNotifsEnabled} trackColor={{ false: colors.surfaceElevated, true: colors.tint }} thumbColor="#FFF" />
            </View>
            <View style={styles.menuItem}>
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>FİYAT DEĞİŞİMLERİ</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>Favoriler için fiyat uyarıları.</Text>
              </View>
              <Switch value={priceAlertsEnabled} onValueChange={setPriceAlertsEnabled} trackColor={{ false: colors.surfaceElevated, true: colors.tint }} thumbColor="#FFF" />
            </View>
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          {renderSectionHeader('DESTEK')}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, padding: 0 }]}>
            <Pressable style={[styles.menuItem, { borderBottomColor: colors.surfaceBorder }]} onPress={() => handlePolicyPress("Kullanım Koşulları")}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Kullanım Koşulları</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable style={[styles.menuItem, { borderBottomColor: colors.surfaceBorder }]} onPress={() => handlePolicyPress("Gizlilik Politikası")}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Gizlilik Politikası</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <View style={styles.menuItem}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Versiyon</Text>
              <Text style={[styles.versionText, { color: colors.textMuted }]}>V1.0.0 (B2B)</Text>
            </View>
          </View>
        </View>

        {/* Logout */}
        <Pressable
          style={[styles.logoutButton, { borderColor: colors.error + '40' }]}
          onPress={signOut}
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>HESAPTAN ÇIKIŞ YAP</Text>
        </Pressable>
      </ScrollView>

      {/* Password Modal */}
      <Modal
        visible={isPasswordModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsPasswordModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(247, 250, 252, 0.8)' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>ŞİFREYİ DEĞİŞTİR</Text>
                <Pressable onPress={() => setIsPasswordModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </Pressable>
              </View>
              <View style={styles.modalForm}>
                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalInputLabel, { color: colors.textMuted }]}>MEVCUT ŞİFRE</Text>
                  <View style={[styles.passwordInputContainer, { backgroundColor: colors.surfaceElevated }]}>
                    <TextInput 
                      style={[styles.modalInput, { color: colors.text }]} 
                      secureTextEntry={!showOldPassword} 
                      value={passwordForm.oldPassword} 
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, oldPassword: t }))}
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable onPress={() => setShowOldPassword(!showOldPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showOldPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalInputLabel, { color: colors.textMuted }]}>YENİ ŞİFRE</Text>
                  <View style={[styles.passwordInputContainer, { backgroundColor: colors.surfaceElevated }]}>
                    <TextInput 
                      style={[styles.modalInput, { color: colors.text }]} 
                      secureTextEntry={!showNewPassword} 
                      value={passwordForm.newPassword} 
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, newPassword: t }))}
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable onPress={() => setShowNewPassword(!showNewPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalInputLabel, { color: colors.textMuted }]}>YENİ ŞİFRE (TEKRAR)</Text>
                  <View style={[styles.passwordInputContainer, { backgroundColor: colors.surfaceElevated }]}>
                    <TextInput 
                      style={[styles.modalInput, { color: colors.text }]} 
                      secureTextEntry={!showConfirmPassword} 
                      value={passwordForm.confirmPassword} 
                      onChangeText={(t) => setPasswordForm(p => ({ ...p, confirmPassword: t }))}
                      placeholderTextColor={colors.textMuted}
                    />
                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
                    </Pressable>
                  </View>
                </View>
                <Pressable style={[styles.modalSubmitButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]} onPress={handlePasswordUpdate} disabled={loading}>
                  {loading ? <ActivityIndicator color={colors.text} /> : <Text style={[styles.modalSubmitText, { color: colors.text }]}>GÜNCELLE</Text>}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 100,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
    paddingLeft: 4,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
  },
  actionButton: {
    margin: 16,
    height: 48,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  segmentedControl: {
    flexDirection: 'row',
    margin: 8,
    padding: 4,
    borderRadius: 6,
  },
  segment: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  activeSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  menuItemSub: {
    fontSize: 11,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sessionControl: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionNum: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionNumText: {
    fontSize: 12,
    fontWeight: '800',
  },
  logoutButton: {
    width: '100%',
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
  },
  modalContent: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  modalForm: {
    gap: 16,
  },
  modalInputGroup: {
    gap: 8,
  },
  modalInputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 4,
    paddingRight: 8,
  },
  modalInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 15,
  },
  eyeIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotLink: {
    alignSelf: 'flex-start',
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalSubmitButton: {
    height: 52,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // Premium Security Styles
  premiumCard: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 1, // Tonal separation
  },
  machinedRow: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  technicalTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  machinedSelector: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
    gap: 4,
  },
  machinedOption: {
    width: 44,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  machinedOptionText: {
    fontSize: 14,
    fontWeight: '900',
  },
  tonalItem: {
    padding: 16,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 12,
  },
  tonalItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  tonalIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
