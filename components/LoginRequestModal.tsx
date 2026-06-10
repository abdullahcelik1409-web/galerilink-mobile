import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SessionManager } from '@/lib/session-manager';
import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';

interface LoginRequestModalProps {
  visible: boolean;
  userId: string;
  onApproved: () => void;
  onCancel: () => void;
}

export function LoginRequestModal({ visible, userId, onApproved, onCancel }: LoginRequestModalProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const { signOut } = useAuth();
  
  const [step, setStep] = useState<'limit_exceeded' | 'waiting' | 'rejected' | 'timeout'>('limit_exceeded');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [maxSessions, setMaxSessions] = useState(1);
  const approvalChannelRef = useRef<ReturnType<typeof SessionManager.listenForApproval> | null>(null);

  useEffect(() => {
    return () => {
      approvalChannelRef.current?.unsubscribe();
      approvalChannelRef.current = null;
    };
  }, []);

  useEffect(() => {
    const fetchLimit = async () => {
      const { limit } = await SessionManager.checkSessionLimit(userId);
      setMaxSessions(limit);
    };
    fetchLimit();
  }, [userId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (step === 'waiting' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && step === 'waiting') {
      approvalChannelRef.current?.unsubscribe();
      approvalChannelRef.current = null;
      setStep('timeout');
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleRequestApproval = async () => {
    setLoading(true);
    try {
      const { data, error } = await SessionManager.createLoginRequest(userId);
      
      if (error || !data) {
        console.error('Login request error:', error);
        throw new Error(error?.message || 'İstek oluşturulamadı');
      }

      const { deviceName } = SessionManager.getDeviceInfo();
      await SessionManager.notifyActiveDevices(userId, deviceName);

      setStep('waiting');

      // Onay dinle
      approvalChannelRef.current?.unsubscribe();
      approvalChannelRef.current = SessionManager.listenForApproval(data.id, (status) => {
        if (status === 'approved') {
          approvalChannelRef.current?.unsubscribe();
          approvalChannelRef.current = null;
          onApproved();
        } else if (status === 'rejected') {
          approvalChannelRef.current?.unsubscribe();
          approvalChannelRef.current = null;
          setStep('rejected');
        }
      });
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'İstek gönderilemedi. Lütfen veritabanı tablolarını kontrol edin.');
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    onCancel();
  };

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={[styles.overlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(247, 250, 252, 0.8)' }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {step === 'limit_exceeded' && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(186, 26, 26, 0.1)' }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.error} />
                </View>
                <Pressable onPress={handleCancel} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Oturum Sınırı Aşıldı</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {maxSessions === 1 
                  ? 'Hesabınız şu an başka bir cihazda açık. Sınırınız 1 cihaz olduğu için yeni giriş yapamazsınız. Lütfen diğer cihazdan çıkış yapın.' 
                  : 'Aynı anda açabileceğiniz maksimum oturum sayısına ulaştınız. Giriş yapmak için diğer cihazlarınızdan onay almanız gerekiyor.'}
              </Text>
              
              <View style={styles.actionsRow}>
                <Pressable onPress={handleCancel} style={[styles.actionBtnOutline, { borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>İptal</Text>
                </Pressable>
                {maxSessions > 1 && (
                  <Pressable 
                    onPress={handleRequestApproval}
                    disabled={loading}
                    style={[styles.actionBtnPrimary, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.text} size="small" />
                    ) : (
                      <Text style={[styles.actionBtnPrimaryText, { color: colors.text }]}>Onay İste</Text>
                    )}
                  </Pressable>
                )}
              </View>
            </>
          )}

          {step === 'waiting' && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
                  <ActivityIndicator size="small" color={colors.tint} />
                </View>
                <Pressable onPress={handleCancel} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Onay Bekleniyor ({timeLeft}s)</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Diğer aktif cihazlarınıza bir onay bildirimi gönderildi. Lütfen bekleyin.
              </Text>
              <View style={styles.actionsRow}>
                <Pressable onPress={handleCancel} style={[styles.actionBtnOutline, { borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.actionBtnOutlineText, { color: colors.text }]}>İptal Et</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'timeout' && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.iconContainer, { backgroundColor: colors.textMuted + '20' }]}>
                  <Ionicons name="time" size={20} color={colors.textMuted} />
                </View>
                <Pressable onPress={handleCancel} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Zaman Aşımı</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Onay süresi doldu. Lütfen tekrar deneyin veya diğer cihazlarınızdan birini kapatın.
              </Text>
              <View style={styles.actionsRow}>
                <Pressable onPress={handleCancel} style={[styles.actionBtnPrimary, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
                  <Text style={[styles.actionBtnPrimaryText, { color: colors.text }]}>Anladım</Text>
                </Pressable>
              </View>
            </>
          )}

          {step === 'rejected' && (
            <>
              <View style={styles.modalHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(186, 26, 26, 0.1)' }]}>
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                </View>
                <Pressable onPress={handleCancel} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={colors.textMuted} />
                </Pressable>
              </View>
              <Text style={[styles.title, { color: colors.text }]}>İstek Reddedildi</Text>
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                Giriş isteğiniz diğer cihaz tarafından reddedildi.
              </Text>
              <View style={styles.actionsRow}>
                <Pressable onPress={handleCancel} style={[styles.actionBtnPrimary, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
                  <Text style={[styles.actionBtnPrimaryText, { color: colors.text }]}>Geri Dön</Text>
                </Pressable>
              </View>
            </>
          )}
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
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
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
