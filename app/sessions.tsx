import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { SessionManager } from '@/lib/session-manager';

export default function SessionsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const colors = Colors[theme];
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState('');

  useEffect(() => {
    const { deviceId } = SessionManager.getDeviceInfo();
    setCurrentDeviceId(deviceId);
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

  const renderItem = ({ item }: { item: any }) => {
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
  };

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
