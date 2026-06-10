import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { ThemeProvider as AppThemeProvider, useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { SessionManager } from '@/lib/session-manager';
import { useNotifications } from '@/hooks/use-notifications';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Splash screen'i font yüklenene kadar göster
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...Ionicons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </AppThemeProvider>
  );
}

/**
 * Auth durumuna göre yönlendirme yapan navigasyon bileşeni.
 */
function RootLayoutNav() {
  const { session, isLoading, user, isTrialExpired } = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  const [isSessionAllowed, setIsSessionAllowed] = useState<boolean | null>(null);

  // Push Notifications entegrasyonu (Kullanıcı ID ile dinler)
  useNotifications(user?.id);


  const navigationTheme = useMemo(() => ({
    dark: theme === 'dark',
    colors: {
      primary: Colors[theme].tint,
      background: Colors[theme].background,
      card: Colors[theme].surface,
      text: Colors[theme].text,
      border: Colors[theme].surfaceBorder,
      notification: Colors[theme].error,
    },
    fonts: {
      regular: { fontFamily: 'System', fontWeight: 'normal' as const },
      medium: { fontFamily: 'System', fontWeight: '500' as const },
      bold: { fontFamily: 'System', fontWeight: 'bold' as const },
      heavy: { fontFamily: 'System', fontWeight: '900' as const },
    },
  }), [theme]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isResetPassword = segments[1] === 'reset-password';

    // PASSWORD_RECOVERY durumunu dinle ve yönlendir
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        router.replace('/(auth)/reset-password');
      }
    });

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !isResetPassword) {
      // Oturum sınırını kontrol et
      let isMounted = true;
      const checkAccess = async () => {
        if (!user) return;
        
        try {
          const { isExceeded, isApproved } = await SessionManager.checkSessionLimit(user.id);
          const deviceId = await SessionManager.getDeviceId();
          const { data: sessions } = await SessionManager.getActiveSessions(user.id);
          const isAlreadyRegistered = sessions?.some(s => s.device_id === deviceId);

          if (isExceeded && !isAlreadyRegistered && !isApproved) {
            if (isMounted) {
              setIsSessionAllowed(false);
              router.replace('/sessions');
            }
          } else {
            if (isMounted) {
              setIsSessionAllowed(true);
              router.replace('/(tabs)');
            }
          }
        } catch (e) {
          console.error('Session check error:', e);
          if (isMounted) router.replace('/(tabs)');
        }
      };

      checkAccess();
      return () => { isMounted = false; subscription.unsubscribe(); };
    }

    return () => subscription.unsubscribe();
  }, [session, isLoading, segments, user]);

  // Route koruması: Süresi dolmuş kullanıcıları abonelik sayfasına yönlendir
  useEffect(() => {
    if (isLoading) return;
    if (segments.includes('subscription' as never)) return;
    if (user && isTrialExpired) {
      router.replace('/subscription');
    }
  }, [user, isTrialExpired, isLoading, segments]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="sessions" 
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom'
          }} 
        />
        <Stack.Screen 
          name="listing/[id]" 
          options={{
            animation: 'none',
            presentation: 'fullScreenModal',
            headerShown: false,
            contentStyle: { backgroundColor: theme === 'dark' ? 'black' : 'white' }
          }}
        />
        <Stack.Screen
          name="add-listing"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'fullScreenModal',
            headerShown: false,
            contentStyle: { backgroundColor: theme === 'dark' ? 'black' : 'white' },
          }}
        />
        <Stack.Screen
          name="subscription"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="messages/[id]"
          options={{
            headerShown: true,
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
