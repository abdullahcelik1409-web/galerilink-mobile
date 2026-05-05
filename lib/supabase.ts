import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Hibrit depolama adaptörü — Supabase Auth oturum kalıcılığı.
 *
 * Native (iOS/Android): SecureStore (AES-256 şifreli, cihaz kilidine bağlı)
 * Web (SSR-safe): localStorage (typeof window kontrolüyle SSR korumalı)
 *
 * SecureStore'un 2KB limitini aşan token'lar için AsyncStorage fallback
 * mekanizması da dahil edilmiştir.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    }
    try {
      const secureItem = await SecureStore.getItemAsync(key);
      if (secureItem) return secureItem;
    } catch {
      // SecureStore hata verirse yoksay, AsyncStorage'a bak
    }
    // SecureStore'da yoksa AsyncStorage'dan getirmeyi dene (2KB limitini aşan tokenlar buradadır)
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
      return;
    }
    // SecureStore 2KB limitini korumak için, değer çok büyükse direkt AsyncStorage'a yaz
    if (value.length > 2000) {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore başarısız olursa AsyncStorage'a düş
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // no-op
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      // no-op
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Supabase bağlantı bilgilerinin varlığını kontrol eder.
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseAnonKey.length > 0;

if (!isSupabaseConfigured) {
  console.warn(
    '⚠️ Supabase yapılandırması eksik! .env dosyasına EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
  );
}

/**
 * Supabase istemcisi.
 */
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://dummy.supabase.co',
  isSupabaseConfigured
    ? supabaseAnonKey
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDAwMDAwMDAsImV4cCI6MjAwMDAwMDAwMH0.abc123',
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  }
);

