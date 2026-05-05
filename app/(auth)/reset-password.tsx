import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Hata', 'Şifreniz en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor.');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        Alert.alert('Hata', error.message);
      } else {
        Alert.alert(
          'Başarılı',
          'Şifreniz başarıyla güncellendi. Giriş yapabilirsiniz.',
          [{ text: 'Tamam', onPress: () => router.replace('/(auth)/login') }]
        );
      }
    } catch (e: any) {
      Alert.alert('Bağlantı Hatası', 'İşlem gerçekleştirilemedi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerSection}>
          <Text style={[styles.brand, { color: colors.tint }]}>GALERILINK</Text>
          <Text style={[styles.title, { color: colors.text }]}>Şifre Sıfırlama</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Lütfen yeni şifrenizi belirleyin.</Text>
        </View>

        <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Yeni Şifre</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Şifre Tekrar</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.resetButton,
              { backgroundColor: colors.tint },
              pressed && !isLoading && { backgroundColor: colors.tintMuted },
              isLoading && styles.resetButtonDisabled,
            ]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Text style={[styles.resetButtonText, { color: colors.textInverse }]}>Şifreyi Güncelle</Text>
            )}
          </Pressable>
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
  resetButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
