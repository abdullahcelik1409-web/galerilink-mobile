import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const DEVICE_ID_KEY = 'galerilink_device_id';
let webDeviceId: string | null = null;

const createDeviceId = () => {
  const randomId =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 12)}`;
  return `device_${randomId}`;
};

// Bildirimlerin uygulama aÃ§Ä±kken nasÄ±l gÃ¶rÃ¼neceÄŸini ayarla (Sadece destekleyen cihazlarda)
if (Platform.OS !== 'web' && Constants.appOwnership !== 'expo') {
  try {
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    // Sessiz geÃ§
  }
}

/**
 * Oturum YÃ¶netimi YardÄ±mcÄ± FonksiyonlarÄ±
 */
export const SessionManager = {
  /**
   * Kalici ve cihaza ozel ID al.
   */
  getDeviceId: async () => {
    if (Platform.OS === 'web') {
      webDeviceId ??= createDeviceId();
      return webDeviceId;
    }

    const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (existing) return existing;

    const next = createDeviceId();
    await SecureStore.setItemAsync(DEVICE_ID_KEY, next);
    return next;
  },

  /**
   * Cihaz bilgilerini al
   */
  getDeviceInfo: () => {
    return {
      deviceName: Device.modelName || 'Bilinmeyen Cihaz',
      deviceOs: Platform.OS,
    };
  },

  /**
   * Expo Push Token al
   */
  getPushToken: async () => {
    try {
      // Expo Go'da Android push bildirimleri SDK 53+ ile kaldÄ±rÄ±ldÄ±.
      if (!Device.isDevice || (Platform.OS === 'android' && Constants.appOwnership === 'expo')) {
        return null;
      }

      // KÃ¼tÃ¼phaneyi burada Ã§aÄŸÄ±rÄ±yoruz ki aÃ§Ä±lÄ±ÅŸta hata vermesin
      const Notifications = require('expo-notifications');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        return null;
      }

      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? 
                        Constants?.easConfig?.projectId;

      const token = (await Notifications.getExpoPushTokenAsync({
        ...(projectId ? { projectId } : {}),
      })).data;

      return token;
    } catch (e) {
      return null;
    }
  },

  /**
   * Mevcut cihaz oturumunu kaydet veya gÃ¼ncelle
   */
  upsertSession: async (userId: string) => {
    try {
      const deviceId = await SessionManager.getDeviceId();
      const { deviceName, deviceOs } = SessionManager.getDeviceInfo();
      const pushToken = await SessionManager.getPushToken();

      // 1. Cihaz oturumunu kaydet
      const { error: sessionError } = await supabase
        .from('user_sessions')
        .upsert({
          user_id: userId,
          device_id: deviceId,
          device_name: deviceName,
          device_os: deviceOs,
          is_active: true,
          last_active_at: new Date().toISOString(),
        }, { onConflict: 'user_id, device_id' });

      if (sessionError) console.warn('[SessionManager] Session upsert failed.');

      // 2. Profildeki push token'Ä± gÃ¼ncelle
      if (pushToken) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: pushToken })
          .eq('id', userId);
      }
    } catch {
      console.warn('[SessionManager] Session upsert failed.');
    }
  },

  /**
   * Aktif oturum sayÄ±sÄ±nÄ± kontrol et
   */
  checkSessionLimit: async (userId: string) => {
    // 1. Profil ve oturum sayÄ±larÄ±nÄ± al
    const { data: profile } = await supabase
      .from('profiles')
      .select('max_sessions')
      .eq('id', userId)
      .single();

    const { count } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    // 2. Bu cihaz iÃ§in yakÄ±n zamanda verilmiÅŸ bir onay var mÄ±? (PASÄ°FE ALINDI)
    /*
    const { data: approvedRequest } = await supabase
      .from('login_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('requesting_device_id', deviceId)
      .eq('status', 'approved')
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Son 5 dakika
      .maybeSingle();
    */

    return {
      limit: profile?.max_sessions || 1,
      current: count || 0,
      isExceeded: (count || 0) >= (profile?.max_sessions || 1),
      isApproved: false, // Pasife alÄ±ndÄ±ÄŸÄ± iÃ§in her zaman false
    };
  },

  /**
   * Aktif oturumlarÄ± listele
   */
  getActiveSessions: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_active_at', { ascending: false });
    
    return { data, error };
  },

  /**
   * Belirli bir cihazÄ±n oturumunu kapat
   */
  terminateSession: async (userId: string, deviceId: string) => {
    const { error } = await supabase
      .from('user_sessions')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId);
    
    return { error };
  },

  /**
   * GiriÅŸ isteÄŸi oluÅŸtur
   */
  createLoginRequest: async (userId: string) => {
    const deviceId = await SessionManager.getDeviceId();
    const { deviceName } = SessionManager.getDeviceInfo();
    const { data, error } = await supabase
      .from('login_requests')
      .insert({
        user_id: userId,
        requesting_device_id: deviceId,
        requesting_device_name: deviceName,
        status: 'pending'
      })
      .select()
      .single();
    
    return { data, error };
  },

  /**
   * GiriÅŸ isteÄŸini dinle (Realtime)
   */
  listenForApproval: (requestId: string, onUpdate: (status: string) => void) => {
    const channel = supabase
      .channel(`login_request_${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'login_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          onUpdate(payload.new.status);
        }
      )
      .subscribe();

    return channel;
  },

  /**
   * DiÄŸer cihazlara bildirim gÃ¶nder (Edge Function gerektirir veya direkt Expo API)
   */
  notifyActiveDevices: async (userId: string, requestingDeviceName: string) => {
    // 1. Aktif cihazlarÄ±n push token'larÄ±nÄ± al
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single();

    if (!profile?.expo_push_token) return;

    try {
      const { error } = await supabase.functions.invoke('push-service', {
        body: {
          type: 'LOGIN_APPROVAL',
          userId,
          requestingDeviceName,
        },
      });
      if (error) throw error;
    } catch {
      console.warn('[SessionManager] Notification request failed.');
    }
  }
};
