import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { TURKEY_CITIES } from '@/constants/TurkeyCities';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';

import * as ImageManipulator from 'expo-image-manipulator';

export default function VerificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [loading, setLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<string | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const [form, setForm] = useState({
    yetkiBelgeNo: '',
    selectedCity: '',
    selectedDistrict: '',
    documentUri: '',
    documentName: '',
  });

  const [pickerModal, setPickerModal] = useState<{ visible: boolean; type: 'city' | 'district' }>({
    visible: false,
    type: 'city',
  });

  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setIsCheckingStatus(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('status, hesap_durumu, vergi_levhasi_url')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          const hasUploaded = !!data.vergi_levhasi_url;
          
          if (data.hesap_durumu === 'onaylandi') {
            setProfileStatus('approved');
          } else if (hasUploaded && (data.hesap_durumu === 'beklemede' || data.status === 'pending_approval')) {
            setProfileStatus('pending');
          } else {
            setProfileStatus('unverified');
          }
        } else {
            setIsCheckingStatus(false);
        }
      } catch (err) {
        console.error('Status check error', err);
      } finally {
        setIsCheckingStatus(false);
      }
    };
    checkStatus();
  }, [user]);

  useEffect(() => {
    if (form.selectedCity) {
      const cityData = TURKEY_CITIES.find((c) => c.name === form.selectedCity);
      setDistricts(cityData ? cityData.districts : []);
      setForm(f => ({ ...f, selectedDistrict: '' }));
    }
  }, [form.selectedCity]);

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        let uri = result.assets[0].uri;
        let fileName = result.assets[0].name;

        // Eğer görsel ise WebP'ye dönüştür
        if (result.assets[0].mimeType?.startsWith('image/') || 
            fileName.toLowerCase().endsWith('.jpg') || 
            fileName.toLowerCase().endsWith('.jpeg') || 
            fileName.toLowerCase().endsWith('.png')) {
          
          const manipResult = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1200 } }], // Boyutu optimize et
            { compress: 0.8, format: ImageManipulator.SaveFormat.WEBP }
          );
          uri = manipResult.uri;
          fileName = fileName.replace(/\.[^/.]+$/, "") + ".webp";
        }

        setForm(f => ({
          ...f,
          documentUri: uri,
          documentName: fileName,
        }));
      }
    } catch (err) {
      console.error('Document pick error:', err);
      Alert.alert('Hata', 'Dosya seçilemedi.');
    }
  };

  const uploadFile = async (uri: string, fileName: string) => {
    if (!user) return null;
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const filePath = `${user.id}/${Date.now()}_${fileName}`;
      
      let contentType = 'application/octet-stream';
      if (fileName.endsWith('.pdf')) contentType = 'application/pdf';
      else if (fileName.endsWith('.webp')) contentType = 'image/webp';
      else if (fileName.match(/\.(jpg|jpeg)$/i)) contentType = 'image/jpeg';
      else if (fileName.endsWith('.png')) contentType = 'image/png';

      const { data, error } = await supabase.storage
        .from('verifications')
        .upload(filePath, decode(base64), {
          contentType: contentType,
          upsert: true,
        });

      if (error) throw error;
      
      // Private bucket olduğu için public URL yerine dosyanın path bilgisini veritabanına kaydediyoruz.
      // Admin paneli bu path'i kullanarak süreli (signed) URL oluşturacak.
      return data.path;
    } catch (err) {
      console.error('Upload error:', err);
      throw new Error('Dosya yüklenemedi.');
    }
  };

  const handleSubmit = async () => {
    if (!form.yetkiBelgeNo || !form.selectedCity || !form.selectedDistrict || !form.documentUri) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun ve vergi levhasını yükleyin.');
      return;
    }

    setLoading(true);
    try {
      // 1. Belgeyi yükle
      const vergiLevhasiUrl = await uploadFile(form.documentUri, form.documentName);

      // 2. Profili güncelle
      const { error } = await supabase
        .from('profiles')
        .update({
          yetki_belge_no: form.yetkiBelgeNo,
          city: form.selectedCity,
          district: form.selectedDistrict,
          vergi_levhasi_url: vergiLevhasiUrl,
          status: 'pending_approval',
          hesap_durumu: 'beklemede'
        })
        .eq('id', user?.id);

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('Bu yetki belgesi numarası zaten başka bir hesapta kayıtlı.');
        }
        throw error;
      }

      setProfileStatus('pending');
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPickerItem = ({ item }: { item: string }) => (
    <Pressable
      style={[styles.pickerItem, { borderBottomColor: colors.surfaceBorder }]}
      onPress={() => {
        if (pickerModal.type === 'city') {
          setForm(f => ({ ...f, selectedCity: item }));
        } else {
          setForm(f => ({ ...f, selectedDistrict: item }));
        }
        setPickerModal({ ...pickerModal, visible: false });
      }}
    >
      <Text style={[styles.pickerItemText, { color: colors.text }]}>{item.toUpperCase()}</Text>
      {(pickerModal.type === 'city' ? form.selectedCity : form.selectedDistrict) === item && (
        <Ionicons name="checkmark" size={20} color={colors.text} />
      )}
    </Pressable>
  );

  if (isCheckingStatus) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  if (profileStatus === 'pending') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerMinimal}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.statusContent}>
          <View style={[styles.statusIconBox, { backgroundColor: colors.warning + '15' }]}>
            <Ionicons name="time" size={48} color={colors.warning} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>İnceleniyor</Text>
          <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
            Belgeleriniz başarıyla yüklendi. Ekibimiz şu an inceleme yapıyor. Genellikle 24 saat içinde sonuçlandırıyoruz.
          </Text>
          
          <View style={styles.progressFull}>
             <View style={[styles.progressTrack, { backgroundColor: theme === 'dark' ? '#27272A' : '#E2E8F0' }]}>
                <View style={[styles.progressBar, { backgroundColor: colors.warning, width: '65%' }]} />
             </View>
             <Text style={[styles.progressLabel, { color: colors.warning }]}>%65 TAMAMLANDI</Text>
          </View>

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.text, marginTop: 40 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.primaryBtnText, { color: colors.background }]}>ANLAŞILDI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (profileStatus === 'approved') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.headerMinimal}>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.statusContent}>
          <View style={[styles.statusIconBox, { backgroundColor: colors.success + '15' }]}>
            <Ionicons name="shield-checkmark" size={48} color={colors.success} />
          </View>
          <Text style={[styles.statusTitle, { color: colors.text }]}>Hesabınız Onaylı</Text>
          <Text style={[styles.statusDesc, { color: colors.textSecondary }]}>
            Galerilink B2B ağına tam erişim hakkına sahipsiniz. Tüm ilan detaylarını ve özel fiyatları görebilirsiniz.
          </Text>

          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.success, marginTop: 40 }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.primaryBtnText, { color: '#FFFFFF' }]}>DEVAM ET</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>HESAP DOĞRULAMA</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.heroInfo, { backgroundColor: theme === 'dark' ? '#18181B' : '#F8FAFC', borderColor: colors.surfaceBorder }]}>
            <View style={[styles.infoIconBox, { backgroundColor: colors.tint + '15' }]}>
              <Ionicons name="document-text" size={24} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoTitle, { color: colors.text }]}>Kurumsal Doğrulama</Text>
              <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                B2B ağına erişmek için lütfen aşağıdaki kurumsal bilgileri doldurun.
              </Text>
            </View>
          </View>

          {/* Form Groups */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>YETKİ BELGESİ NUMARASI</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme === 'dark' ? '#18181B' : '#F4F4F5', borderColor: colors.surfaceBorder }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Örn: 3400001"
                  placeholderTextColor={colors.textMuted}
                  value={form.yetkiBelgeNo}
                  onChangeText={(t) => setForm(f => ({ ...f, yetkiBelgeNo: t }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>İL</Text>
                <TouchableOpacity 
                  style={[styles.inputWrapper, { backgroundColor: theme === 'dark' ? '#18181B' : '#F4F4F5', borderColor: colors.surfaceBorder }]}
                  onPress={() => setPickerModal({ visible: true, type: 'city' })}
                >
                  <Text style={[styles.pickerText, { color: form.selectedCity ? colors.text : colors.textMuted }]}>
                    {form.selectedCity || 'Seçiniz'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>İLÇE</Text>
                <TouchableOpacity 
                  style={[styles.inputWrapper, { backgroundColor: theme === 'dark' ? '#18181B' : '#F4F4F5', borderColor: colors.surfaceBorder, opacity: form.selectedCity ? 1 : 0.5 }]}
                  onPress={() => form.selectedCity && setPickerModal({ visible: true, type: 'district' })}
                >
                  <Text style={[styles.pickerText, { color: form.selectedDistrict ? colors.text : colors.textMuted }]}>
                    {form.selectedDistrict || 'Seçiniz'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textMuted }]}>VERGİ LEVHASI</Text>
              <TouchableOpacity 
                style={[styles.uploadBox, { backgroundColor: theme === 'dark' ? '#18181B' : '#F4F4F5', borderColor: colors.surfaceBorder }]}
                onPress={handleDocumentPick}
              >
                {form.documentName ? (
                  <View style={styles.uploadResult}>
                    <View style={[styles.fileIconBox, { backgroundColor: colors.success + '15' }]}>
                      <Ionicons name="document-attach" size={28} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{form.documentName}</Text>
                      <Text style={[styles.fileStatus, { color: colors.success }]}>Belge yüklendi</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  </View>
                ) : (
                  <View style={styles.uploadPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.uploadTitle, { color: colors.text }]}>Dosya Seçin</Text>
                    <Text style={[styles.uploadSub, { color: colors.textSecondary }]}>PDF veya WebP/JPG formatında</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.primaryBtn, { backgroundColor: colors.text, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.background }]}>BAŞVURUYU GÖNDER</Text>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.footerHint, { color: colors.textMuted }]}>
            Verileriniz KVKK kapsamında korunmakta ve sadece doğrulama için kullanılmaktadır.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <Modal visible={pickerModal.visible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {pickerModal.type === 'city' ? 'İL SEÇİNİZ' : 'İLÇE SEÇİNİZ'}
              </Text>
              <Pressable onPress={() => setPickerModal({ ...pickerModal, visible: false })} style={[styles.closeBtn, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={pickerModal.type === 'city' ? TURKEY_CITIES.map(c => c.name) : districts}
              keyExtractor={(item) => item}
              renderItem={renderPickerItem}
              contentContainerStyle={styles.pickerList}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    height: 115,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerMinimal: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  heroInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    marginBottom: 32,
  },
  infoIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  infoSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 18,
  },
  formSection: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    paddingLeft: 4,
  },
  inputWrapper: {
    height: 60,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  uploadBox: {
    height: 120,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  uploadSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  uploadResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '800',
  },
  fileStatus: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  primaryBtn: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  footerHint: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 24,
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  // Status Pages
  statusContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  statusIconBox: {
    width: 100,
    height: 100,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 12,
  },
  statusDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  progressFull: {
    width: '100%',
    marginTop: 40,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerList: {
    paddingBottom: 40,
  },
  pickerItem: {
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
