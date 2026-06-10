import { supabase } from '@/lib/supabase';
import { isAllowedInternalRoute } from '@/lib/security';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Uygulama ön plandayken bildirimlerin nasıl gösterileceğini yapılandırıyoruz
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Cihazdan bildirim izinlerini alır ve Expo Push Token'ı döndürür.
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      return;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
      if (!projectId) {
        console.warn('EAS Project ID bulunamadı.');
      }

      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId,
        })
      ).data;
    } catch (e) {
      console.error('Token alınırken hata oluştu:', e);
    }
  } else {
    return;
  }

  return token;
}

/**
 * Push Notification işlemleri için Custom Hook
 * 
 * @param userId - Oturum açmış kullanıcının ID'si. Verilmişse token'ı Supabase'e kaydeder.
 */
export function useNotifications(userId?: string | null) {
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (userId) {
      registerForPushNotificationsAsync().then((token) => {
        if (token && isMounted) {
          // Token'ı Supabase profiles tablosuna kaydet
          supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('id', userId)
            .then(({ error }) => {
              if (error) {
                console.error('Push token veritabanına kaydedilemedi:', error);
              } else {
                return;
              }
            });
        }
      });
    }

    // Uygulama açıkken gelen bildirimi dinleme
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      void notification;
    });

    // Kullanıcı bildirime tıkladığında dinleme
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Bildirimden gelen veriye göre yönlendirme yap (örneğin: { url: '/messages' })
      if (isAllowedInternalRoute(data?.url)) {
        try {
          router.push(data.url as any);
        } catch (error) {
          console.error('Bildirim yönlendirme hatası:', error);
        }
      }
    });

    return () => {
      isMounted = false;
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId]);

  return { registerForPushNotificationsAsync };
}
