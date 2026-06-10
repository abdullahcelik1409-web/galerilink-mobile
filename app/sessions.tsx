import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { SessionManager } from '@/lib/session-manager';

const SESSION_ROW_HEIGHT = 104;

export default function SessionsScreen() {
  const { user, profile: authProfile } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const colors = Colors[theme];
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState('');

  useEffect(() => {
    SessionManager.getDeviceId().then(setCurrentDeviceId);
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await SessionManager.getActiveSessions(user.id);
    if (error) {
      Alert.alert('Hata', 'Oturumlar yüklenemedi.');
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const handleTerminate = async (deviceId: string) => {
    if (!user) return;

    Alert.alert(
      'Oturumu Kapat',
      'Bu cihazdaki oturumu kapatmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Oturumu Kapat', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await SessionManager.terminateSession(user.id, deviceId);
            if (error) {
              Alert.alert('Hata', 'Oturum kapatılamadı.');
            } else {
              fetchSessions();
            }
          }
        }
      ]
    );
  };

  const renderItem = useCallback(({ item }: { item: any }) => {
    const isCurrent = item.device_id === currentDeviceId;
    
    return (
      <View style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.sessionInfo}>
          <View style={[styles.deviceIcon, { backgroundColor: colors.surfaceBorder }]}>
            <Ionicons 
              name={item.device_os === 'ios' ? 'logo-apple' : 'logo-android'} 
              size={24} 
              color={colors.text} 
            />
          </View>
          <View style={styles.details}>
            <View style={styles.nameRow}>
              <Text style={[styles.deviceName, { color: colors.text }]}>{item.device_name}</Text>
              {isCurrent && (
                <View style={[styles.currentBadge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.currentBadgeText, { color: colors.success }]}>BU CİHAZ</Text>
                </View>
              )}
            </View>
            <Text style={[styles.lastActive, { color: colors.textSecondary }]}>
              Son Aktivite: {new Date(item.last_active_at).toLocaleString('tr-TR')}
            </Text>
          </View>
        </View>
        
        {!isCurrent && (
          <Pressable 
            onPress={() => handleTerminate(item.device_id)}
            style={[styles.terminateBtn, { borderColor: colors.error + '40' }]}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.error} />
          </Pressable>
        )}
      </View>
    );
  }, [colors, currentDeviceId, handleTerminate]);

  const getItemLayout = useCallback((_: ArrayLike<any> | null | undefined, index: number) => ({
    length: SESSION_ROW_HEIGHT,
    offset: SESSION_ROW_HEIGHT * index,
    index,
  }), []);

  if (authProfile?.subscription_status !== 'enterprise') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AKTİF OTURUMLAR</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: colors.warning + '15', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Ionicons name="lock-closed" size={40} color={colors.warning} />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.text, marginBottom: 12, textAlign: 'center', letterSpacing: -0.5, textTransform: 'uppercase' }}>
            Kurumsal Pakete Özel
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 32, lineHeight: 22, fontWeight: '500' }}>
            Çoklu cihaz oturum yönetimi ve aktif cihaz kontrolü sadece Kurumsal paket abonelerine özeldir.
          </Text>
          <Pressable
            style={({ pressed }) => [{
              width: '100%',
              height: 56,
              backgroundColor: colors.tint,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 10,
              opacity: pressed ? 0.8 : 1,
            }]}
            onPress={() => router.push('/subscription')}
          >
            <Ionicons name="diamond-outline" size={20} color={colors.textInverse} />
            <Text style={{ color: colors.textInverse, fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>KURUMSAL PAKETE GEÇ</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [{ marginTop: 16, opacity: pressed ? 0.5 : 1 }]}
            onPress={() => router.back()}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '800', letterSpacing: 1 }}>GERİ DÖN</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>AKTİF OTURUMLAR</Text>
        <Pressable onPress={fetchSessions} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.infoSection}>
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>
          Hesabınızın açık olduğu tüm cihazları burada görebilir ve yönetebilirsiniz.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.text} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          getItemLayout={getItemLayout}
          removeClippedSubviews={Platform.OS === 'android'}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aktif oturum bulunamadı.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 100,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  infoSection: {
    padding: 20,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '700',
  },
  currentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  lastActive: {
    fontSize: 12,
  },
  terminateBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  }
});
