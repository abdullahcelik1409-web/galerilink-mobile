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
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const router = useRouter();

  // Form State
  const [adSoyad, setAdSoyad] = useState('');
  const [galeriAdi, setGaleriAdi] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Focus Refs
  const galeriAdiRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleRegister = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!adSoyad.trim()) return Alert.alert('Hata', 'Lütfen adınızı ve soyadınızı girin.');
    if (!galeriAdi.trim()) return Alert.alert('Hata', 'Lütfen galeri adınızı girin.');
    if (!phone.trim()) return Alert.alert('Hata', 'Lütfen telefon numaranızı girin.');
    if (!trimmedEmail) return Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
    if (password.length < 6) return Alert.alert('Hata', 'Şifreniz en az 6 karakter olmalıdır.');

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const { error } = await signUp(trimmedEmail, password, {
        ad_soyad: adSoyad.trim(),
        galeri_adi: galeriAdi.trim(),
        phone: phone.trim(),
      });

      if (error) {
        let message = error.message;
        if (message.includes('User already registered')) {
          message = 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.';
        }
        Alert.alert('Kayıt Başarısız', message);
      } else {
        Alert.alert(
          'Kayıt Başarılı',
          'Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.',
          [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }]
        );
      }
    } catch (e) {
      Alert.alert('Bağlantı Hatası', 'Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={[styles.brand, { color: colors.tint }]}>GALERILINK</Text>
          <Text style={[styles.title, { color: colors.text }]}>Galeri Kaydı Oluştur</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>B2B ağına katılmak için bilgilerinizi eksiksiz doldurun.</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Ad Soyad</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Örn: Ahmet Yılmaz"
                placeholderTextColor={colors.textMuted}
                value={adSoyad}
                onChangeText={setAdSoyad}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => galeriAdiRef.current?.focus()}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Galeri Adı</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>🏢</Text>
              <TextInput
                ref={galeriAdiRef}
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Örn: Yılmaz Motors"
                placeholderTextColor={colors.textMuted}
                value={galeriAdi}
                onChangeText={setGaleriAdi}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => phoneRef.current?.focus()}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Cep Telefonu</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                ref={phoneRef}
                style={[styles.textInput, { color: colors.text }]}
                placeholder="05XX XXX XX XX"
                placeholderTextColor={colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                returnKeyType="next"
                onSubmitEditing={() => emailRef.current?.focus()}
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>E-posta</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                ref={emailRef}
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
                placeholder="En az 6 karakter"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
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
              styles.registerButton,
              { backgroundColor: colors.tint },
              pressed && !isLoading && { backgroundColor: colors.tintMuted },
              isLoading && styles.registerButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.registerButtonText, { color: colors.textInverse }]}>Hesap Oluştur</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Zaten hesabınız var mı? </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.tint }]}>Giriş Yapın</Text>
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 32,
  },
  brand: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 16,
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
  registerButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '700',
  },
});

