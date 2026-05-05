import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Bildirimlerin uygulama açıkken nasıl görüneceğini ayarla (Sadece destekleyen cihazlarda)
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
    // Sessiz geç
  }
}

/**
 * Oturum Yönetimi Yardımcı Fonksiyonları
 */
export const SessionManager = {
  /**
   * Cihaz bilgilerini al
   */
  getDeviceInfo: () => {
    return {
      deviceId: Device.osBuildId || Device.modelName || 'unknown_device',
      deviceName: Device.modelName || 'Bilinmeyen Cihaz',
      deviceOs: Platform.OS,
    };
  },

  /**
   * Expo Push Token al
   */
  getPushToken: async () => {
    try {
      // Expo Go'da Android push bildirimleri SDK 53+ ile kaldırıldı.
      if (!Device.isDevice || (Platform.OS === 'android' && Constants.appOwnership === 'expo')) {
        return null;
      }

      // Kütüphaneyi burada çağırıyoruz ki açılışta hata vermesin
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
   * Mevcut cihaz oturumunu kaydet veya güncelle
   */
  upsertSession: async (userId: string) => {
    try {
      const { deviceId, deviceName, deviceOs } = SessionManager.getDeviceInfo();
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

      if (sessionError) console.error('Oturum kaydı hatası (Tabloyu kontrol edin):', sessionError);

      // 2. Profildeki push token'ı güncelle
      if (pushToken) {
        await supabase
          .from('profiles')
          .update({ expo_push_token: pushToken })
          .eq('id', userId);
      }
    } catch (e) {
      console.error('upsertSession kritik hata:', e);
    }
  },

  /**
   * Aktif oturum sayısını kontrol et
   */
  checkSessionLimit: async (userId: string) => {
    const { deviceId } = SessionManager.getDeviceInfo();

    // 1. Profil ve oturum sayılarını al
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

    // 2. Bu cihaz için yakın zamanda verilmiş bir onay var mı? (PASİFE ALINDI)
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
      isApproved: false, // Pasife alındığı için her zaman false
    };
  },

  /**
   * Aktif oturumları listele
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
   * Belirli bir cihazın oturumunu kapat
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
   * Giriş isteği oluştur
   */
  createLoginRequest: async (userId: string) => {
    const { deviceId, deviceName } = SessionManager.getDeviceInfo();
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
   * Giriş isteğini dinle (Realtime)
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
   * Diğer cihazlara bildirim gönder (Edge Function gerektirir veya direkt Expo API)
   */
  notifyActiveDevices: async (userId: string, requestingDeviceName: string) => {
    // 1. Aktif cihazların push token'larını al
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', userId)
      .single();

    if (!profile?.expo_push_token) return;

    // 2. Expo Push API'sine istek at (Not: Bu normalde bir backend işlemidir)
    // Fiziksel cihazda denemek için şimdilik log basıyoruz
    console.log(`Bildirim gönderiliyor: ${profile.expo_push_token}`);
    
    // Expo Push API çağrısı (Client side'da yapılması önerilmez ama test için):
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: profile.expo_push_token,
          title: 'Giriş Onayı Gerekli',
          body: `${requestingDeviceName} cihazı hesabınıza girmek istiyor.`,
          data: { type: 'login_request' },
        }),
      });
    } catch (e) {
      console.error('Bildirim gönderme hatası:', e);
    }
  }
};
