import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { SessionManager } from '@/lib/session-manager';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }
    if (!password) {
      Alert.alert('Hata', 'Lütfen şifrenizi girin.');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const { error } = await signIn(trimmedEmail, password);

      if (error) {
        let message = error.message;
        if (message.includes('Invalid login credentials')) {
          message = 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.';
        } else if (message.includes('Email not confirmed')) {
          message = 'E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.';
        } else if (message.includes('Too many requests')) {
          message = 'Çok fazla deneme yaptınız. Lütfen birkaç dakika bekleyin.';
        }
        Alert.alert('Giriş Başarısız', message);
      } else {
        // Giriş başarılı, şimdi oturum sınırını kontrol et
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { isExceeded } = await SessionManager.checkSessionLimit(user.id);
          const { deviceId } = SessionManager.getDeviceInfo();
          
          // Cihaz zaten kayıtlı mı bak?
          const { data: sessions } = await SessionManager.getActiveSessions(user.id);
          const isAlreadyRegistered = sessions?.some(s => s.device_id === deviceId);

          if (isExceeded && !isAlreadyRegistered) {
            // Katı Cihaz Sınırı: Limiti aşan cihazı anında dışarı atıyoruz.
            await supabase.auth.signOut();
            Alert.alert(
              'Oturum Sınırı Aşıldı',
              'Hesabınıza tanımlı maksimum cihaz sınırına ulaştınız. Giriş yapabilmek için lütfen uygulamanın açık olduğu diğer bir cihazdan oturumunuzu kapatın.'
            );
          }
        }
      }
    } catch (e: any) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.tintLight, borderColor: colors.tint }]}>
            <Text style={styles.logoIcon}>🚗</Text>
          </View>
          <Text style={[styles.brand, { color: colors.tint }]}>GALERILINK</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>B2B Oto Galeri Platformu</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Giriş Yap</Text>
          <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
            Galeri hesabınızla devam edin
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-posta</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="ornek@galeri.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Şifre</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                ref={passwordRef}
                style={[styles.textInput, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!isLoading}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              { backgroundColor: colors.tint },
              pressed && !isLoading && { backgroundColor: colors.tintMuted },
              isLoading && styles.loginButtonDisabled,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.loginButtonText, { color: colors.textInverse }]}>Giriş Yap</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Hesabınız yok mu? </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.tint }]}>Kayıt Olun</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    fontSize: 32,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  loginButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 50,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});

