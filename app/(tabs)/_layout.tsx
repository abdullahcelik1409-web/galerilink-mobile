import React, { useEffect } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { useDeviceSession } from '@/hooks/use-device-session';
import { supabase } from '@/lib/supabase';

/**
 * İkon bileşeni — Tab bar'da kullanılır.
 */
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
  size?: number;
}) {
  return (
    <FontAwesome
      size={props.size ?? 22}
      style={styles.tabIcon}
      {...props}
    />
  );
}

export default function TabLayout() {
  const { user, isTrialExpired, isLoading, signOut } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const router = useRouter();
  const segments = useSegments();
  const { registerCurrentDevice, getCurrentDeviceId, isCurrentDeviceSessionActive } = useDeviceSession();

  React.useEffect(() => {
    if (!user) return;

    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const syncDeviceSession = async () => {
      try {
        const [isActive, deviceId] = await Promise.all([
          isCurrentDeviceSessionActive(user.id),
          getCurrentDeviceId(),
        ]);
        if (!isMounted) return;

        if (!isActive) {
          await signOut();
          return;
        }

        await registerCurrentDevice(user.id);

        channel = supabase
          .channel(`user_session_${user.id}_${deviceId}`)
          .on(
            'postgres_changes',
            {
              event: 'DELETE',
              schema: 'public',
              table: 'user_sessions',
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              if (payload.old?.device_id === deviceId) {
                void signOut();
              }
            }
          )
          .subscribe();
      } catch {
        if (isMounted) {
          void registerCurrentDevice(user.id);
        }
      }
    };

    void syncDeviceSession();

    return () => {
      isMounted = false;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [getCurrentDeviceId, isCurrentDeviceSessionActive, registerCurrentDevice, signOut, user]);

  // Route koruması: Süresi dolmuş kullanıcıları abonelik sayfasına yönlendir
  useEffect(() => {
    if (isLoading) return;
    if (segments.includes('subscription' as never)) return;
    if (user && isTrialExpired) {
      router.replace('/subscription');
    }
  }, [user, isTrialExpired, isLoading, segments]);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
        freezeOnBlur: true,
        // Tab Bar Stil
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: [styles.tabBar, { 
          backgroundColor: colors.tabBarBackground, 
          borderTopColor: colors.tabBarBorder 
        }],
        tabBarLabelStyle: styles.tabBarLabel,

        // Header Stil
        headerStyle: [styles.header, { 
          backgroundColor: colors.surface, 
          borderBottomColor: colors.surfaceBorder 
        }],
        headerTitleStyle: [styles.headerTitle, { color: colors.text }],
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      {/* Tab 1: Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="home" color={color} />
          ),
        }}
      />

      {/* Tab 1.5: Fırsatlar */}
      <Tabs.Screen
        name="opportunities"
        options={{
          title: 'Fırsatlar',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="fire" color={theme === 'dark' ? '#34D399' : '#059669'} />
          ),
        }}
      />

      {/* Tab 2: İlan Çek (Scraper) */}
      <Tabs.Screen
        name="scraper"
        options={{
          title: 'İlan Çek',
          headerTitle: 'İlan Çek',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="download" color={color} />
          ),
        }}
      />

      {/* Tab 3: Taslaklar / İlanlarım */}
      <Tabs.Screen
        name="listings"
        options={{
          title: 'İlanlarım',
          headerTitle: 'Taslaklar & İlanlarım',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="list-alt" color={color} />
          ),
        }}
      />

      {/* Tab 4: Mesajlar */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          headerTitle: 'Mesajlar',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="comments" color={color} />
          ),
        }}
      />

      {/* Tab 5: Profil */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitle: 'Profil',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="user-circle" color={color} />
          ),
        }}
      />
      
      {/* Settings Screen is part of the stack or hidden from tabs */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Tab bar'da görünmesin
          headerShown: false,
        }}
      />

      {/* Verification Screen is hidden from tabs */}
      <Tabs.Screen
        name="verify"
        options={{
          href: null, // Tab bar'da görünmesin
          headerShown: false,
        }}
      />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
    elevation: 0,
    borderTopWidth: 1,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tabIcon: {
    marginBottom: -2,
  },
  header: {
    height: 50,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'lowercase',
  },
});
