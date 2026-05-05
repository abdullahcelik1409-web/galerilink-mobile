import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { LoginApprovalListener } from '@/components/LoginApprovalListener';
import { useAuth } from '@/lib/auth-context';
import { SessionManager } from '@/lib/session-manager';

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
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  React.useEffect(() => {
    if (user) {
      SessionManager.upsertSession(user.id);
    }
  }, [user]);

  return (
    <View style={{ flex: 1 }}>
      {/* <LoginApprovalListener /> (Cihaz onay sistemi pasife alındı) */}
      <Tabs
        screenOptions={{
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

      {/* Tab 4: Profil */}
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
