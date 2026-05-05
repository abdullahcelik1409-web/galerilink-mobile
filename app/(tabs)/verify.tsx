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
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>HESAP ONAYI</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.warning + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
            <Ionicons name="time" size={48} color={colors.warning} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 }}>İnceleniyor</Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, fontWeight: '500' }}>
            Bilgileriniz başarıyla alındı ve ekibimiz tarafından inceleniyor. İşlem tamamlandığında size bildirim göndereceğiz.
          </Text>
          <Pressable 
            style={[styles.submitBtn, { backgroundColor: colors.surfaceElevated, marginTop: 40, width: '100%', borderWidth: 1, borderColor: colors.surfaceBorder }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.submitBtnText, { color: colors.text }]}>GERİ DÖN</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (profileStatus === 'approved') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>HESAP ONAYI</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: colors.success + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 32 }}>
            <Ionicons name="shield-checkmark" size={48} color={colors.success} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 16, textAlign: 'center', letterSpacing: -0.5 }}>Hesabınız Onaylı</Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary, textAlign: 'center', lineHeight: 24, fontWeight: '500' }}>
            Galerilink B2B ağına tam erişim hakkına sahipsiniz. Tekrar form doldurmanıza gerek yoktur.
          </Text>
          <Pressable 
            style={[styles.submitBtn, { backgroundColor: colors.surfaceElevated, marginTop: 40, width: '100%', borderWidth: 1, borderColor: colors.surfaceBorder }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.submitBtnText, { color: colors.text }]}>GERİ DÖN</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>HESAP ONAYI</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.infoBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.text} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              Galerilink B2B ağına tam erişim sağlamak için kurumsal bilgilerinizi doğrulamanız gerekmektedir.
            </Text>
          </View>

          {/* Form Group: Yetki Belgesi */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>YETKİ BELGESİ NUMARASI</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.text }]}
              placeholder="Örn: 3400001"
              placeholderTextColor={colors.textMuted}
              value={form.yetkiBelgeNo}
              onChangeText={(t) => setForm(f => ({ ...f, yetkiBelgeNo: t }))}
              keyboardType="numeric"
            />
          </View>

          {/* Form Group: Location */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>{'İL'}</Text>
              <Pressable 
                style={[styles.input, styles.pickerTrigger, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
                onPress={() => setPickerModal({ visible: true, type: 'city' })}
              >
                <Text style={[styles.pickerValue, { color: form.selectedCity ? colors.text : colors.textMuted }]}>
                  {form.selectedCity || 'Seçiniz'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>İLÇE</Text>
              <Pressable 
                style={[styles.input, styles.pickerTrigger, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: form.selectedCity ? 1 : 0.5 }]}
                onPress={() => form.selectedCity && setPickerModal({ visible: true, type: 'district' })}
              >
                <Text style={[styles.pickerValue, { color: form.selectedDistrict ? colors.text : colors.textMuted }]}>
                  {form.selectedDistrict || 'Seçiniz'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>

          {/* Form Group: Document Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>VERGİ LEVHASI (PDF/JPG)</Text>
            <Pressable 
              style={[styles.uploadBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderStyle: 'dashed' }]}
              onPress={handleDocumentPick}
            >
              {form.documentName ? (
                <View style={styles.fileInfo}>
                  <Ionicons name="document-attach" size={32} color={colors.success} />
                  <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{form.documentName}</Text>
                  <Text style={[styles.fileStatus, { color: colors.success }]}>Dosya Seçildi</Text>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.uploadText, { color: colors.textSecondary }]}>Dosya Seçmek İçin Tıklayın</Text>
                  <Text style={[styles.uploadHint, { color: colors.textMuted }]}>PDF veya Resim dosyası</Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* Submit Button */}
          <Pressable 
            style={({ pressed }) => [
              styles.submitBtn,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 },
              (loading || pressed) && { opacity: 0.8 }
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.submitBtnText, { color: colors.text }]}>BAŞVURUYU TAMAMLA</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <Modal visible={pickerModal.visible} animationType="slide" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(247, 250, 252, 0.8)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {pickerModal.type === 'city' ? 'İL SEÇİNİZ' : 'İLÇE SEÇİNİZ'}
              </Text>
              <Pressable onPress={() => setPickerModal({ ...pickerModal, visible: false })}>
                <Ionicons name="close" size={24} color={colors.text} />
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
    height: 110,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.1)',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 60,
  },
  infoBox: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
    borderRadius: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 10,
    paddingLeft: 6,
    textTransform: 'uppercase',
  },
  input: {
    height: 64,
    borderWidth: 2,
    borderRadius: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: '700',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  uploadBox: {
    height: 160,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 12,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  uploadHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  fileInfo: {
    alignItems: 'center',
    gap: 6,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '800',
    width: 220,
    textAlign: 'center',
  },
  fileStatus: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  submitBtn: {
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '75%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  pickerList: {
    paddingBottom: 40,
  },
  pickerItem: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
