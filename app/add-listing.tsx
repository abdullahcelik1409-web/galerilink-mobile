import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Switch,
  Modal,
  FlatList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Animated, { 
  FadeIn, 
  FadeOut,
} from 'react-native-reanimated';

import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { optimizeImage } from '@/lib/image-optimizer';
import { HierarchicalSelector } from '@/components/HierarchicalSelector';
import { TURKEY_CITIES } from '@/constants/TurkeyCities';
import { TaxonomyLevel } from '@/lib/taxonomy-types';
import { ExpertiseSelector, ExpertiseData } from '@/components/ExpertiseSelector';
import { useSubscriptionLimit } from '@/hooks/use-subscription-limit';
import { imageUploadService } from '@/features/listings/api/image-upload-service';
import { listingRepository } from '@/features/listings/api/listing-repository';
import { BlockingState, ScreenLoader } from '@/components/states/BlockingState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_IMAGES = 10;

const STEPS = [
  { id: 'vision', label: 'VİZYON', icon: 'images-outline' },
  { id: 'identity', label: 'KİMLİK', icon: 'finger-print-outline' },
  { id: 'vitality', label: 'CANLILIK', icon: 'speedometer-outline' },
  { id: 'value', label: 'DEĞER', icon: 'cash-outline' },
  { id: 'appraisal', label: 'EKSPERTİZ', icon: 'document-text-outline' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 27 }, (_, i) => (CURRENT_YEAR - i).toString());

interface ImageState {
  uri: string;
  optimizedUri?: string;
  isOptimizing: boolean;
  isOptimized: boolean;
  error?: string;
}

export default function AddListingScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrialExpired } = useAuth();
  const colors = Colors[theme];
  const { height: windowHeight } = useWindowDimensions();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectorKey, setSelectorKey] = useState(0);
  const isMountedRef = useRef(true);
  
  const { isLimitReached, maxListings, isLoading, refreshLimit } = useSubscriptionLimit();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Ekran her odağa geldiğinde hiyerarşiyi tazelemeye zorla (Admin onayı sonrası anlık veri için) ve limiti güncelle
  useFocusEffect(
    useCallback(() => {
      setSelectorKey(prev => prev + 1);
      refreshLimit();
    }, [refreshLimit])
  );
  
  // Form State
  const [images, setImages] = useState<ImageState[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    package_id: '',
    brand: '',
    model: '',
    year: '2024',
    km: '',
    price: '',
    city: '',
    district: '',
    isOpportunity: false,
    opportunityReason: 'Nakit İhtiyacı',
    opportunityExpires: '48',
    damageReport: '',
    description: '',
    manualData: {
      marka: '',
      seri: '', // 4. Seviye (Eski Model)
      yakit: 'Benzin',
      kasa: 'Sedan',
      sanziman: 'Otomatik',
      model: '', // 8. Seviye (Yeni)
      motor: '',
      paket: '',
      heavy_damage: 'Hayır',
    },
    selections: [] as any[],
    expertise: [] as any[],
    manualLevel: null as TaxonomyLevel | null,
  });

  const progress = (currentStep + 1) / STEPS.length;

  if (isLoading) {
    return <ScreenLoader colors={colors} />;
  }

  if (isTrialExpired) {
    return (
      <BlockingState
        colors={colors}
        icon="time"
        iconColor="#EF4444"
        title="Deneme S�resi Doldu"
        message="Deneme s�reniz doldu, devam etmek i�in bir paket se�in."
        primaryLabel="PAKET SE�"
        onPrimaryPress={() => router.push('/subscription')}
        onSecondaryPress={() => router.back()}
      />
    );
  }

  if (isLimitReached && maxListings !== Infinity) {
    return (
      <BlockingState
        colors={colors}
        icon="flame"
        iconColor="#F59E0B"
        title="�lan Limitine Ula��ld�"
        message={`Mevcut paketinizin izin verdi�i maksimum ilan say�s�na ula�t�n�z (${maxListings} �lan). Daha fazla ilan eklemek i�in paketinizi y�kseltin veya eski ilanlar�n�z� pasife al�n.`}
        primaryLabel="��MD� PAKET� Y�KSELT"
        onPrimaryPress={() => router.push('/subscription')}
        onSecondaryPress={() => router.back()}
      />
    );
  }
  // --- Handlers ---

  const handlePickImages = async () => {
    const remainingSlots = Math.max(0, MAX_IMAGES - images.length);
    if (remainingSlots === 0) {
      Alert.alert('Limit', `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz.`);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remainingSlots,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedAssets = result.assets.slice(0, remainingSlots);
      if (result.assets.length > remainingSlots) {
        Alert.alert('Limit', `İlk ${remainingSlots} fotoğraf eklendi. En fazla ${MAX_IMAGES} fotoğraf kullanabilirsiniz.`);
      }

      const newImages: ImageState[] = selectedAssets.map(asset => ({
        uri: asset.uri,
        isOptimizing: true,
        isOptimized: false,
      }));

      setImages(prev => [...prev, ...newImages]);

      for (const img of newImages) {
        const optimizationResult = await optimizeImage(img.uri);
        if (!isMountedRef.current) return;

        setImages(prev => {
          const updated = [...prev];
          const globalIdx = prev.findIndex(item => item.uri === img.uri);
          if (globalIdx !== -1) {
            updated[globalIdx] = {
              ...updated[globalIdx],
              optimizedUri: optimizationResult.uri,
              isOptimizing: false,
              isOptimized: optimizationResult.isOptimized,
              error: optimizationResult.error,
            };
          }
          return updated;
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => {
    // Adım Bazlı Validasyon
    if (currentStep === 0) {
      if (!formData.title.trim()) {
        Alert.alert("Eksik Bilgi", "Lütfen ilan başlığını giriniz.");
        return;
      }
    }

    if (currentStep === 1 && isManualMode) {
      const { marka, seri, sanziman, model } = formData.manualData;
      if (!marka || !seri || !model) {
        Alert.alert("Eksik Bilgi", "Lütfen Marka, Seri ve Model bilgilerini doldurunuz.");
        return;
      }
    }

    if (currentStep === 2) {
      if (!formData.km || !formData.city || !formData.district) {
        Alert.alert("Eksik Bilgi", "Lütfen Kilometre, Şehir ve İlçe bilgilerini doldurunuz.");
        return;
      }
    }

    if (currentStep === 3) {
      if (!formData.price) {
        Alert.alert("Eksik Bilgi", "Lütfen satış fiyatını giriniz.");
        return;
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  };

  const toSlug = (text: string) => {
    if (!text) return "";
    return text.toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const uploadCarImage = useCallback((uri: string) => (
    imageUploadService.uploadCarImage({ uri })
  ), []);

  const handleSubmit = async () => {
    // 1. UI Kilidi ve Loading State (Hemen tetiklenir)
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Oturum bulunamadı. Lütfen tekrar giriş yapınız.");

      // 2. Fotoğrafları Yükle ve Taxonomy'yi Hazırla
      
      // Sadece optimize edilmiş veya orijinal URI'si olanları filtrele
      const validImages = images.filter(img => img.optimizedUri || img.uri);
      const uploadTasks = validImages.map(img => uploadCarImage(img.optimizedUri || img.uri));
      
      let taxonomyTask = Promise.resolve(formData.package_id);
      if (isManualMode) {
        taxonomyTask = (async () => {
          // ... (taxonomy mantığı aynı kalıyor)
          let currentParentId = formData.selections.length > 0 
            ? formData.selections[formData.selections.length - 1].resolvedId 
            : null;
          
          const levelsToFill = [
            TaxonomyLevel.KATEGORI, TaxonomyLevel.YIL, TaxonomyLevel.MARKA, TaxonomyLevel.SERI, 
            TaxonomyLevel.YAKIT, TaxonomyLevel.KASA, TaxonomyLevel.SANZIMAN, TaxonomyLevel.MODEL, 
            TaxonomyLevel.MOTOR, TaxonomyLevel.PAKET
          ];
          
          const startIndex = levelsToFill.indexOf(formData.manualLevel || TaxonomyLevel.KATEGORI);
          let finalId = '';

          for (let i = startIndex; i < levelsToFill.length; i++) {
            const levelName = levelsToFill[i];
            let entryName = "";
            
            if (levelName === TaxonomyLevel.KATEGORI) entryName = "Otomobil";
            else if (levelName === TaxonomyLevel.YIL) entryName = formData.year;
            else if (levelName === TaxonomyLevel.MARKA) entryName = formData.manualData.marka;
            else if (levelName === TaxonomyLevel.SERI) entryName = formData.manualData.seri;
            else if (levelName === TaxonomyLevel.YAKIT) entryName = formData.manualData.yakit;
            else if (levelName === TaxonomyLevel.KASA) entryName = formData.manualData.kasa;
            else if (levelName === TaxonomyLevel.SANZIMAN) entryName = formData.manualData.sanziman;
            else if (levelName === TaxonomyLevel.MODEL) entryName = formData.manualData.model;
            else if (levelName === TaxonomyLevel.MOTOR) entryName = formData.manualData.motor;
            else if (levelName === TaxonomyLevel.PAKET) entryName = formData.manualData.paket;

            if (!entryName) continue;

            if (levelName !== TaxonomyLevel.KATEGORI && !currentParentId) {
              throw new Error(`Kritik Hata: ${levelName} seviyesi için üst kategori bulunamadı.`);
            }

            const { data: newNode, error: upsertError } = await supabase
              .from('car_taxonomy')
              .upsert({
                name: entryName,
                level: levelName,
                parent_id: currentParentId,
                slug: toSlug(`${entryName}-${levelName}-${currentParentId ? String(currentParentId).substring(0,4) : 'root'}`),
                status: 'pending'
              }, { onConflict: 'parent_id, name' })
              .select()
              .single();

            if (upsertError) throw upsertError;
            currentParentId = newNode.id;
            finalId = newNode.id;
          }
          return finalId;
        })();
      }

      // Tüm asenkron görevlerin bitmesini bekle
      const results = await Promise.all([
        Promise.all(uploadTasks),
        taxonomyTask
      ]);

      const imageUrls = results[0];
      const finalPackageId = results[1];

      // KRİTİK: Yerel URI sızıntısını engelle
      const filteredImageUrls = imageUrls.filter(url => url && url.startsWith('http'));
      
      if (images.length > 0 && filteredImageUrls.length === 0) {
        throw new Error("Fotoğraflar yüklenemedi. Lütfen internet bağlantınızı kontrol edin.");
      }

      if (!finalPackageId) throw new Error("İlan kaydı için paket bilgisi eksik.");

      // 3. Ana İlan Kaydı (Database Insert)
      const carPayload = {
        seller_id: user.id,
        title: formData.title,
        brand: formData.brand || formData.manualData.marka,
        model: formData.model || formData.manualData.seri,
        year: parseInt(formData.year),
        km: parseInt(formData.km),
        damage_report: formData.damageReport,
        description: formData.description,
        price_b2b: parseFloat(formData.price),
        location_city: formData.city,
        location_district: formData.district,
        images: filteredImageUrls,
        is_active: true,
        package_id: finalPackageId,
        expertise: formData.expertise,
        heavy_damage: formData.manualData.heavy_damage || 'Hayır',
        transmission: isManualMode ? formData.manualData.sanziman : (formData.selections.find(s => s.level === TaxonomyLevel.SANZIMAN)?.name || null),
        fuel: isManualMode ? formData.manualData.yakit : (formData.selections.find(s => s.level === TaxonomyLevel.YAKIT)?.name || null),
        body_type: isManualMode ? formData.manualData.kasa : (formData.selections.find(s => s.level === TaxonomyLevel.KASA)?.name || null),
        status: 'published',
        is_opportunity: !!formData.isOpportunity,
        opportunity_reason: formData.isOpportunity 
          ? (String(formData.opportunityReason).includes('Stok') ? 'Stok Yenileme' : 
             String(formData.opportunityReason).includes('Dükkan') ? 'Dükkan Değişikliği' : 
             String(formData.opportunityReason).includes('Diğer') ? 'Diğer' : 'Nakit İhtiyacı')
          : null,
        opportunity_expires_at: formData.isOpportunity 
          ? new Date(Date.now() + (parseInt(formData.opportunityExpires) || 48) * 60 * 60 * 1000).toISOString()
          : null,
      };

      await listingRepository.createPublished(carPayload);

      // 4. Başarı Bildirimi
      Alert.alert("Başarılı", "İlanınız yıldırım hızıyla yayınlandı.");
      router.replace('/(tabs)');

    } catch (e: any) {
      // Kurşun Geçirmez Hata Bildirimi (UI'a Yansıtma)
      console.warn('[AddListing] Submit failed.');
      Alert.alert(
        "İlan Yayınlama Hatası", 
        `Teknik Detay: ${e.message || "Bilinmeyen bir hata oluştu."}\n\nLütfen internet bağlantınızı kontrol edip tekrar deneyiniz.`
      );
    } finally {
      // Mutlaka butonu tekrar aktifleştir
      setIsSubmitting(false);
    }
  };

  // --- Render Steps ---

  const renderVision = () => (
    <ScrollView 
      contentContainerStyle={[styles.stepContent, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>1. VİZYON</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>İlan başlığını ve görsellerini ekleyin.</Text>
      
      <View style={{ marginBottom: 24 }}>
        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 8 }]}>İLAN BAŞLIĞI</Text>
        <TextInput 
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.surfaceBorder, height: 56, paddingHorizontal: 16 }]}
          placeholder="Örn: Hatasız Boyasız"
          placeholderTextColor={colors.textMuted}
          value={formData.title}
          onChangeText={(t) => setFormData(p => ({ ...p, title: t }))}
        />
      </View>

      <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 12 }]}>FOTOĞRAFLAR</Text>
      <View style={styles.imageGrid}>
        {images.map((img, i) => (
          <View key={i} style={[styles.imageCard, { backgroundColor: colors.surface }]}>
            <Image
              source={{ uri: img.optimizedUri ?? img.uri }}
              style={styles.imagePreview}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            {img.isOptimizing && (
              <View style={styles.imageOverlay}>
                <ActivityIndicator color="#FFFFFF" size="small" />
              </View>
            )}
            {img.isOptimized && (
              <View style={[styles.badge, { backgroundColor: colors.success }]}>
                <Ionicons name="checkmark-circle" size={10} color="#FFFFFF" />
                <Text style={styles.badgeText}>HD OPTIMIZE</Text>
              </View>
            )}
            <Pressable onPress={() => removeImage(i)} style={styles.removeBtn}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </Pressable>
          </View>
        ))}
        <Pressable onPress={handlePickImages} style={[styles.addBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
          <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
          <Text style={[styles.addBtnText, { color: colors.textMuted }]}>FOTOĞRAF EKLE</Text>
        </Pressable>
      </View>
    </ScrollView>
  );

  const renderIdentity = () => (
    <View style={[styles.stepContent, { flex: 1 }]}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>2. KİMLİK</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Model tanımı ve hiyerarşi.</Text>
      
      <View style={styles.modeSwitch}>
        <Pressable 
          onPress={() => {
            setIsManualMode(false);
            // Manuel moddan çıkarken verileri temizle (Güvenlik ve temiz state için)
            setFormData(p => ({
              ...p,
              manualLevel: null,
              manualData: {
                marka: '',
                seri: '',
                yakit: 'Benzin',
                kasa: 'Sedan',
                sanziman: 'Otomatik',
                model: '',
                motor: '',
                paket: '',
                heavy_damage: 'Hayır',
              }
            }));
          }} 
          style={[styles.modeTab, !isManualMode && { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}
        >
          <Text style={[styles.modeTabText, !isManualMode ? { color: colors.text } : { color: colors.textMuted }]}>HİYERARŞİK</Text>
        </Pressable>
        <Pressable 
          onPress={() => setIsManualMode(true)} 
          style={[styles.modeTab, isManualMode && { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}
        >
          <Text style={[styles.modeTabText, isManualMode ? { color: colors.text } : { color: colors.textMuted }]}>MANUEL</Text>
        </Pressable>
      </View>

      {isManualMode ? (
        <ScrollView 
          contentContainerStyle={[styles.stepContent, { flexGrow: 1, padding: 0 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.manualForm}>
            <Input label="MARKA" value={formData.manualData.marka} onChangeText={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, marka: t } }))} />
            <Input label="SERİ" value={formData.manualData.seri} onChangeText={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, seri: t } }))} />
            
            <DropdownInput 
              label="YAKIT TİPİ" 
              value={formData.manualData.yakit} 
              items={["Benzin", "Dizel", "Benzin & LPG", "Hibrit", "Elektrik"]} 
              onSelect={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, yakit: t } }))} 
            />

            <DropdownInput 
              label="KASA TİPİ" 
              value={formData.manualData.kasa} 
              items={["Sedan", "Hatchback", "SUV", "Coupe", "Cabrio", "Station Wagon"]} 
              onSelect={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, kasa: t } }))} 
            />

            <DropdownInput 
              label="ŞANZIMAN" 
              value={formData.manualData.sanziman} 
              items={["Otomatik", "Manuel", "Yarı Otomatik"]} 
              onSelect={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, sanziman: t } }))} 
            />

            <Input label="MODEL" value={formData.manualData.model} onChangeText={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, model: t } }))} />

            <Input label="MOTOR" value={formData.manualData.motor} onChangeText={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, motor: t } }))} />
            <Input label="PAKET İSMİ" value={formData.manualData.paket} onChangeText={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, paket: t } }))} />
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
          <HierarchicalSelector 
            key={selectorKey}
            onComplete={(id, sels) => {
              setFormData(p => ({ 
                ...p, 
                package_id: id, 
                selections: sels, 
                brand: sels.find(s => s.level === 'marka')?.name || '',
                seri: sels.find(s => s.level === 'seri')?.name || '',
                model: sels.find(s => s.level === 'model')?.name || '',
                year: sels.find(s => s.level === 'yil')?.name || p.year,
              }));
              nextStep();
            }}
            onManualMode={(level, path) => {
              setFormData(p => ({
                ...p,
                manualLevel: level,
                selections: path,
                manualData: {
                  ...p.manualData,
                  marka: path.find(s => s.level === 'marka')?.name || '',
                  seri: path.find(s => s.level === 'seri')?.name || '',
                  model: path.find(s => s.level === 'model')?.name || '',
                }
              }));
              setIsManualMode(true);
            }}
          />
        </View>
      )}
    </View>
  );

  const renderVitality = () => (
    <ScrollView 
      contentContainerStyle={[styles.stepContent, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>3. CANLILIK</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Kullanım ve lokasyon bilgileri.</Text>
      
      <View style={styles.formSection}>
        <Input 
          label="KİLOMETRE" 
          value={formatNumber(formData.km)} 
          onChangeText={(t: string) => {
            const raw = t.replace(/\D/g, "");
            setFormData(p => ({ ...p, km: raw }));
          }} 
          keyboardType="numeric" 
          placeholder="0"
          suffix="KM"
        />

        {isManualMode && (
          <DropdownInput 
            label="YIL" 
            value={formData.year} 
            items={YEARS} 
            onSelect={(t: string) => setFormData(p => ({ ...p, year: t }))} 
          />
        )}

        <DropdownInput 
          label="ŞEHİR" 
          value={formData.city} 
          disabled={!formData.km || (isManualMode && !formData.year)}
          items={TURKEY_CITIES.map(c => c.name)} 
          onSelect={(t: string) => setFormData(p => ({ ...p, city: t, district: '' }))} 
          placeholder={!formData.km ? "Önce Kilometre Giriniz" : (isManualMode && !formData.year) ? "Önce Yıl Seçiniz" : "Şehir Seçiniz"}
        />

        <DropdownInput 
          label="İLÇE" 
          value={formData.district} 
          disabled={!formData.city}
          items={TURKEY_CITIES.find(c => c.name === formData.city)?.districts || []} 
          onSelect={(t: string) => setFormData(p => ({ ...p, district: t }))} 
          placeholder={formData.city ? "İlçe Seçiniz" : "Önce Şehir Seçiniz"}
        />
      </View>
    </ScrollView>
  );

  const renderValue = () => (
    <ScrollView 
      contentContainerStyle={[styles.stepContent, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="always"
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>4. DEĞER</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Fiyatlandırma ve fırsat durumu.</Text>
      
      <View style={styles.formSection}>
        <Input 
          label="B2B FİYAT (₺)" 
          value={formatNumber(formData.price)} 
          onChangeText={(t: string) => {
            const raw = t.replace(/\D/g, "");
            setFormData(p => ({ ...p, price: raw }));
          }} 
          keyboardType="numeric" 
          placeholder="0"
          suffix="TL"
        />
        
        <View style={[styles.toggleContainer, { backgroundColor: colors.surface }]}>
          <View>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>FIRSAT İLANI</Text>
            <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Acil satılık olarak işaretle.</Text>
          </View>
          <Switch 
            value={formData.isOpportunity} 
            onValueChange={(v) => setFormData(p => ({ ...p, isOpportunity: v }))}
            trackColor={{ false: colors.surfaceElevated, true: colors.success }}
          />
        </View>

        {formData.isOpportunity && (
          <Animated.View entering={FadeIn} style={styles.opportunityForm}>
            <DropdownInput 
              label="FIRSAT NEDENİ" 
              value={formData.opportunityReason} 
              items={[
                "Nakit İhtiyacı",
                "Stok Yenileme",
                "Dükkan Değişikliği",
                "Diğer"
              ]} 
              onSelect={(t: string) => setFormData(p => ({ ...p, opportunityReason: t }))} 
              placeholder="Neden Seçiniz"
            />
            <DropdownInput 
              label="BİTİŞ SÜRESİ (SAAT)" 
              value={formData.opportunityExpires ? `${formData.opportunityExpires} SAAT` : ""} 
              items={["24 SAAT", "48 SAAT"]} 
              onSelect={(t: string) => setFormData(p => ({ ...p, opportunityExpires: t.split(' ')[0] }))} 
              placeholder="Süre Seçiniz"
            />
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );

  const renderAppraisal = () => (
    <ScrollView 
      style={{ flex: 1 }}
      contentContainerStyle={[styles.stepContent, { flexGrow: 1, minHeight: windowHeight, paddingBottom: 150 }]}
      keyboardShouldPersistTaps="always"
      nestedScrollEnabled={true}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.stepTitle, { color: colors.text }]}>5. EKSPERTİZ</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Araç durumunu işaretleyin ve yayınlayın.</Text>
      
      <View style={[styles.formSection, { backgroundColor: 'transparent' }]}>
        <ExpertiseSelector 
          value={formData.expertise}
          onChange={(data) => setFormData(p => ({ ...p, expertise: data }))}
        />

        <View style={{ marginTop: 20 }}>
          <DropdownInput 
            label="AĞIR HASAR KAYDI" 
            value={formData.manualData.heavy_damage} 
            items={["Evet", "Hayır"]} 
            onSelect={(t: string) => setFormData(p => ({ ...p, manualData: { ...p.manualData, heavy_damage: t } }))} 
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>İLAN AÇIKLAMASI</Text>
          <TextInput 
            multiline
            numberOfLines={10}
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.surfaceBorder, height: 150, paddingTop: 12 }]}
            placeholder="Araç hakkında detaylı açıklama giriniz..."
            placeholderTextColor={colors.textMuted}
            value={formData.description}
            onChangeText={(t) => setFormData(p => ({ ...p, description: t }))}
          />
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>HASAR KAYDI / EK NOTLAR</Text>
          <TextInput 
            multiline
            numberOfLines={4}
            style={[styles.textArea, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.surfaceBorder, height: 80, paddingTop: 12 }]}
            placeholder="Ekspertiz durumunu ve araç hakkındaki diğer detayları yazınız..."
            placeholderTextColor={colors.textMuted}
            value={formData.damageReport}
            onChangeText={(t) => setFormData(p => ({ ...p, damageReport: t }))}
          />
        </View>
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="shield-checkmark" size={24} color={colors.success} />
        <Text style={[styles.summaryText, { color: colors.text }]}>İlanınız B2B ağında doğrulanmış galeriler tarafından görülecektir.</Text>
      </View>
    </ScrollView>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={prevStep} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{STEPS[currentStep].label}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceElevated }]}>
            <View style={[styles.progressBarFill, { backgroundColor: colors.tint, width: `${progress * 100}%` }]} />
          </View>
          <View style={styles.stepLabels}>
            {STEPS.map((s, i) => (
              <Ionicons key={i} name={s.icon as any} size={14} color={i <= currentStep ? colors.tint : colors.textMuted} />
            ))}
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} collapsable={false}>
        <View style={{ flex: 1 }} collapsable={false}>
          <Animated.View 
            entering={FadeIn.duration(200)} 
            exiting={FadeOut.duration(150)}
            style={{ flex: 1 }}
            collapsable={false}
          >
            {currentStep === 0 && renderVision()}
            {currentStep === 1 && renderIdentity()}
            {currentStep === 2 && renderVitality()}
            {currentStep === 3 && renderValue()}
            {currentStep === 4 && renderAppraisal()}
          </Animated.View>
        </View>

        {(currentStep !== 1 || isManualMode) && (
          <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]} pointerEvents="box-none">
            <Pressable 
              disabled={isSubmitting}
              onPress={currentStep === STEPS.length - 1 ? handleSubmit : nextStep} 
              style={[styles.mainBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1, opacity: isSubmitting ? 0.6 : 1 }]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Text style={[styles.mainBtnText, { color: colors.text }]}>
                    {currentStep === STEPS.length - 1 ? 'İLANIN YAYINLA' : 'DEVAM ET'}
                  </Text>
                  <Ionicons name={currentStep === STEPS.length - 1 ? 'cloud-upload-outline' : 'arrow-forward'} size={20} color={colors.text} />
                </>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// --- Helpers ---

const formatNumber = (val: string) => {
  if (!val) return "";
  const num = val.replace(/\D/g, "");
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// --- Sub Components ---

const DropdownOption = React.memo(({ item, isSelected, colors, onSelect }: any) => (
  <Pressable
    onPress={() => onSelect(item)}
    style={({ pressed }) => ({
      paddingVertical: 14,
      paddingHorizontal: 12,
      marginBottom: 2,
      borderRadius: 10,
      backgroundColor: isSelected
        ? (colors.tint + '15')
        : pressed ? (colors.surface) : 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    })}
  >
    <Text style={{
      color: isSelected ? colors.tint : colors.text,
      fontSize: 16,
      fontWeight: isSelected ? '800' : '500'
    }}>
      {item}
    </Text>
    {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.tint} />}
  </Pressable>
));

const DropdownInput = ({ label, value, items, onSelect, disabled, placeholder }: any) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = React.useDeferredValue(search);

  const filteredItems = React.useMemo(() => {
    if (!deferredSearch.trim()) return items;
    const normalizedSearch = deferredSearch.toLowerCase();
    return items.filter((item: string) => item.toLowerCase().includes(normalizedSearch));
  }, [items, deferredSearch]);

  const handleOpen = () => {
    if (disabled) return;
    setSearch('');
    setVisible(true);
  };

  const handleSelect = React.useCallback((item: string) => {
    onSelect(item);
    setVisible(false);
  }, [onSelect]);

  const renderItem = React.useCallback(({ item }: { item: string }) => (
    <DropdownOption
      item={item}
      isSelected={value === item}
      colors={colors}
      onSelect={handleSelect}
    />
  ), [colors, handleSelect, value]);

  return (
    <View style={styles.inputContainer}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable 
        disabled={disabled}
        onPress={handleOpen}
        style={[
          styles.input, 
          { 
            backgroundColor: colors.surface, 
            borderColor: value ? colors.tint + '40' : colors.surfaceBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: disabled ? 0.4 : 1
          }
        ]}
      >
        <Text style={{ 
          color: value ? colors.text : colors.textMuted, 
          fontSize: 16, 
          fontWeight: value ? '700' : '500',
          flex: 1,
        }} numberOfLines={1}>
          {value || placeholder || 'Seçiniz'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={disabled ? colors.textMuted : colors.tint} />
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable 
          style={{ flex: 1, backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
          onPress={() => setVisible(false)}
        >
          <Pressable 
            style={{ 
              backgroundColor: colors.background, 
              borderTopLeftRadius: 28, 
              borderTopRightRadius: 28, 
              maxHeight: '70%',
              minHeight: '40%',
            }}
            onPress={() => {}} // Prevent close on inner press
          >
            {/* Handle Bar */}
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.textMuted + '40' }} />
            </View>

            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 0.5 }}>{label}</Text>
              <Pressable onPress={() => setVisible(false)} hitSlop={12} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={28} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Search Bar — only for lists with 8+ items */}
            {items.length >= 8 && (
              <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: colors.surface, 
                  borderRadius: 12, 
                  borderWidth: 1,
                  borderColor: colors.surfaceBorder,
                  paddingHorizontal: 14, 
                  height: 44,
                  gap: 8,
                }}>
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: '500' }}
                    placeholder="Ara..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                    autoFocus={false}
                  />
                  {search.length > 0 && (
                    <Pressable onPress={() => setSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* Options List */}
            <FlatList
              data={filteredItems}
              keyExtractor={(item: string, index: number) => `${item}-${index}`}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
              initialNumToRender={12}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={50}
              ListEmptyComponent={
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                  <Text style={{ color: colors.textMuted, fontSize: 14, marginTop: 8 }}>Sonuç bulunamadı.</Text>
                </View>
              }
              renderItem={renderItem}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const Input = ({ label, value, onChangeText, keyboardType, suffix, placeholder }: any) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={[styles.inputContainer, { zIndex: 1, elevation: 1 }]}>
      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, flexDirection: 'row', alignItems: 'center' }]}>
        <TextInput 
          style={{ flex: 1, color: colors.text, fontSize: 16, fontWeight: '600', height: '100%' }}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
        />
        {suffix && (
          <Text style={{ color: colors.textMuted, fontWeight: '800', marginLeft: 8 }}>{suffix}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  progressContainer: {
    gap: 12,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  stepContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  stepSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 24,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    aspectRatio: 4/3,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  addBtn: {
    width: (SCREEN_WIDTH - 52) / 2,
    aspectRatio: 4/3,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeTab: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  manualForm: {
    gap: 16,
    paddingBottom: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '600',
  },
  chipScroll: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  formSection: {
    gap: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  toggleSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  opportunityForm: {
    gap: 16,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    fontWeight: '500',
    textAlignVertical: 'top',
  },
  summaryCard: {
    marginTop: 30,
    padding: 20,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  footer: {
    padding: 20,
    borderTopWidth: 0.5,
    // Touch-safe footer: no transparent bg that creates invisible hit layer
  },
  mainBtn: {
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 9999,
    elevation: 10,
  },
  mainBtnText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
});


