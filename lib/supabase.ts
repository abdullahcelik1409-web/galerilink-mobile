import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { logDevError } from './error-utils';

const SECURE_STORE_CHUNK_SIZE = 1800;
const CHUNK_COUNT_SUFFIX = '__chunk_count';
const DEFAULT_API_TIMEOUT_MS = 15000;
const webMemoryStorage = new Map<string, string>();

const getChunkCountKey = (key: string) => `${key}:${CHUNK_COUNT_SUFFIX}`;
const getChunkKey = (key: string, index: number) => `${key}:chunk:${index}`;

const removeSecureItem = async (key: string) => {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // no-op
  }
};

const removeChunkedSecureItem = async (key: string) => {
  const countValue = await SecureStore.getItemAsync(getChunkCountKey(key));
  const count = countValue ? Number(countValue) : 0;

  await removeSecureItem(key);
  if (Number.isFinite(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) => removeSecureItem(getChunkKey(key, index)))
    );
  }
  await removeSecureItem(getChunkCountKey(key));
};

const fetchWithTimeout: typeof fetch = async (input, init = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_API_TIMEOUT_MS);

  const abortFromCaller = () => controller.abort();
  init.signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    logDevError('Supabase fetch', error);
    throw error instanceof Error && error.name === 'AbortError'
      ? new Error(`Supabase request timeout after ${DEFAULT_API_TIMEOUT_MS}ms`)
      : error;
  } finally {
    clearTimeout(timeout);
    init.signal?.removeEventListener('abort', abortFromCaller);
  }
};

/**
 * SecureStore-backed storage adapter for Supabase Auth session persistence.
 *
 * Native: stores token data in SecureStore chunks.
 * Web: keeps token data in memory for this mobile-focused app.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return webMemoryStorage.get(key) ?? null;
    }

    try {
      const countValue = await SecureStore.getItemAsync(getChunkCountKey(key));
      const chunkCount = countValue ? Number(countValue) : 0;

      if (Number.isFinite(chunkCount) && chunkCount > 0) {
        const chunks = await Promise.all(
          Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(getChunkKey(key, index)))
        );
        if (chunks.every((chunk): chunk is string => typeof chunk === 'string')) {
          return chunks.join('');
        }
        await removeChunkedSecureItem(key);
        return null;
      }

      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webMemoryStorage.set(key, value);
      return;
    }

    await removeChunkedSecureItem(key);

    if (value.length <= SECURE_STORE_CHUNK_SIZE) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_SIZE}}`, 'g')) ?? [];
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(getChunkKey(key, index), chunk))
    );
    await SecureStore.setItemAsync(getChunkCountKey(key), String(chunks.length));
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      webMemoryStorage.delete(key);
      return;
    }
    await removeChunkedSecureItem(key);
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
  const message = 'Supabase yapılandırması eksik. EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY değerlerini kontrol edin.';
  logDevError('Supabase config', message);
  throw new Error(
    message
  );
}

/**
 * Supabase istemcisi.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: fetchWithTimeout,
    },
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
