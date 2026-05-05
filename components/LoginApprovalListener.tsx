import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';

export function LoginApprovalListener() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [request, setRequest] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Bekleyen giriş isteklerini dinle
    const subscription = supabase
      .channel(`login_approvals_${Math.random()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'login_requests',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new.status === 'pending') {
            setRequest(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!request) return;

    const { error } = await supabase
      .from('login_requests')
      .update({ status })
      .eq('id', request.id);

    if (error) {
      Alert.alert('Hata', 'İşlem gerçekleştirilemedi.');
    } else {
      setRequest(null);
    }
  };

  if (!request) return null;

  return (
    <Modal transparent visible={!!request} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(247, 250, 252, 0.8)' }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.modalHeader}>
            <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.tint} />
            </View>
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>Giriş Onayı</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            <Text style={{ fontWeight: '800', color: colors.text }}>{request.requesting_device_name}</Text> isimli cihaz hesabınıza giriş yapmak istiyor. İzin veriyor musunuz?
          </Text>

          <View style={styles.actionsRow}>
            <Pressable 
              onPress={() => handleAction('rejected')}
              style={[styles.actionBtnOutline, { borderColor: colors.surfaceBorder }]}
            >
              <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>Reddet</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => handleAction('approved')}
              style={[styles.actionBtnPrimary, { backgroundColor: colors.tint }]}
            >
              <Text style={[styles.actionBtnPrimaryText, { color: '#fff' }]}>İzin Ver</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  modal: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#181c1e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    fontSize: 13,
    fontWeight: '800',
  },
  actionBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
  }
});
