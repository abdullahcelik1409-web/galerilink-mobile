import ExpertiseSchema from '@/components/ExpertiseSchema';
import { ExpertiseSelector } from '@/components/ExpertiseSelector';
import SellerContactCard from '@/components/SellerContactCard';
import Colors from '@/constants/Colors';
import { useAuth } from '@/lib/auth-context';
import { useSubscriptionLimit } from '@/hooks/use-subscription-limit';
import { getRouteParam } from '@/lib/security';
import { useTheme } from '@/lib/theme-context';
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { listingRepository } from '@/features/listings/api/listing-repository';
import { prepareListingImages, useListingDetail } from '@/features/listings/hooks/use-listing-detail';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function SpecItem({ label, value, colors }: { label: string; value: string; colors: any }) {
  if (!value || value === '—') return null;
  return (
    <View style={[styles.specItem, { backgroundColor: colors.surface }]}>
      <Text style={[styles.specLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.specValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function HeroGallery({ car, statusColor, statusLabel, onBack, colors }: { car: any, statusColor: string, statusLabel: string, onBack: () => void, colors: any }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = car.images || [];

  return (
    <View style={[styles.heroContainer, { backgroundColor: colors.surface }]}>
      {images.length > 0 ? (
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(uri, index) => `${uri}-${index}`}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentImageIndex(nextIndex);
          }}
          renderItem={({ item }) => (
            <View style={styles.heroImageSlide}>
              <Image
                source={{ uri: item as string }}
                style={styles.heroImage}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={150}
              />
            </View>
          )}
        />
      ) : (
        <View style={styles.noImage}>
          <FontAwesome name="camera" size={32} color={colors.textMuted} />
          <Text style={[styles.noImageText, { color: colors.textMuted }]}>Görsel Yok</Text>
        </View>
      )}

      <Pressable style={styles.backBtn} onPress={onBack} hitSlop={12}>
        <FontAwesome name="arrow-left" size={16} color="#FFFFFF" />
      </Pressable>

      <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: colors.surface }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {images.length > 0 && (
        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {currentImageIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
}

function ListingDetailSkeleton({ colors }: { colors: any }) {
  return (
    <View style={[styles.skeletonContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.skeletonHero, { backgroundColor: colors.surface }]} />
      <View style={styles.skeletonDetailContent}>
        <View style={[styles.detailSkeletonLineLg, { backgroundColor: colors.surface }]} />
        <View style={[styles.detailSkeletonLineMd, { backgroundColor: colors.surface }]} />
        <View style={styles.detailSkeletonGrid}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={[styles.detailSkeletonBox, { backgroundColor: colors.surface }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = getRouteParam(params.id) ?? '';
  const router = useRouter();
  const { user, profile, isTrialExpired } = useAuth();
  const { canAdd } = useSubscriptionLimit();
  const { theme } = useTheme();
  const colors = Colors[theme];

  const { car, setCar, sourceTable, isLoading, updateExpertise } = useListingDetail(id);
  const [priceStr, setPriceStr] = useState('');
  const [description, setDescription] = useState('');
  const [damageReport, setDamageReport] = useState('');
  const [expertise, setExpertise] = useState<any>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [isOpportunity, setIsOpportunity] = useState(false);
  const [opportunityReason, setOpportunityReason] = useState('');
  const [opportunityExpires, setOpportunityExpires] = useState('48');

  useEffect(() => {
    if (!car) return;
    setExpertise(car.expertise || {});
    setIsOpportunity(car.is_opportunity ?? false);
    setOpportunityReason(car.opportunity_reason || '');
    setOpportunityExpires(car.opportunity_expires_at ? '48' : '48');
    setPriceStr(car.price_b2b ? Number(car.price_b2b).toLocaleString('tr-TR') : '');
    setDescription(car.description || '');
    setDamageReport(car.damage_report || '');
  }, [car]);

  const handlePriceChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    if (!numericText) {
      setPriceStr('');
      return;
    }
    const formatted = parseInt(numericText, 10).toLocaleString('tr-TR');
    setPriceStr(formatted);
  };

  const handleExpertiseChange = async (value: any) => {
    try {
      const updatedExpertise = await updateExpertise(value);
      setExpertise(updatedExpertise);
    } catch (error) {
      setExpertise(car?.expertise || {});
      console.error('Ekspertiz guncelleme hatasi:', error);
      Alert.alert('Hata', 'Ekspertiz bilgisi guncellenemedi.');
    }
  };

  const handlePublish = async () => {
    if (!canAdd || isTrialExpired) {
      router.push('/subscription');
      return;
    }

    if (!car) return;
    const numericPrice = parseInt(priceStr.replace(/[^0-9]/g, ''), 10) || 0;
    if (numericPrice <= 0) {
      Alert.alert('Hata', 'Geçerli bir B2B fiyatı giriniz.');
      return;
    }
    setIsPublishing(true);
    try {
      const newImageUrls = await prepareListingImages(car);

      if (sourceTable === 'cars_drafts') {
        await listingRepository.publishDraft({
          draftId: id,
          numericPrice,
          description,
          damageReport,
          images: newImageUrls,
          isOpportunity,
          opportunityReason,
          opportunityExpiresHours: parseInt(opportunityExpires, 10) || 48,
        });
      } else {
        await listingRepository.updatePublished(car.id, {
          price_b2b: numericPrice,
          description,
          damage_report: damageReport,
          images: newImageUrls,
          status: 'published',
          is_active: true,
          is_opportunity: isOpportunity,
          opportunity_reason: isOpportunity ? opportunityReason : null,
          opportunity_expires_at: isOpportunity
            ? new Date(Date.now() + (parseInt(opportunityExpires, 10) || 48) * 60 * 60 * 1000).toISOString()
            : null,
        });
      }

      Alert.alert('Yayınlandı', 'İlan yayınlandı.', [{ text: 'Tamam', onPress: () => router.replace('/(tabs)' as any) }]);
    } catch (error: any) {
      Alert.alert('Hata', error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return <ListingDetailSkeleton colors={colors} />;
  }

  if (!car) return null;

  const isEditable = user && car.seller_id === user.id && car.status === 'draft';
  const isVerified = profile?.status === 'approved' || profile?.hesap_durumu === 'onaylandi' || (user && car.seller_id === user.id);
  const statusColor = car.status === 'published' ? colors.success : colors.warning;
  const statusLabel = car.status === 'published' ? 'YAYINDA' : 'TASLAK';
  const expertiseData = expertise || car.expertise || {};
  const expertiseCount = Object.keys(expertiseData).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} hidden={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeroGallery car={car} statusColor={statusColor} statusLabel={statusLabel} onBack={() => router.back()} colors={colors} />

        <View style={styles.infoSection}>
          <Text style={[styles.vehicleTitle, { color: colors.text }]}>{car.title || `${car.brand} ${car.model}`}</Text>
          <View style={styles.vehicleMeta}>
            <View style={styles.vehicleMetaRow}>
              <Text style={[styles.vehicleMetaLabel, { color: colors.textMuted }]}>Marka:</Text>
              <Text style={[styles.vehicleMetaValue, { color: colors.text }]}>{car.brand || '—'}</Text>
            </View>
            <View style={styles.vehicleMetaRow}>
              <Text style={[styles.vehicleMetaLabel, { color: colors.textMuted }]}>Seri:</Text>
              <Text style={[styles.vehicleMetaValue, { color: colors.text }]}>{car.series || '—'}</Text>
            </View>
            <View style={styles.vehicleMetaRow}>
              <Text style={[styles.vehicleMetaLabel, { color: colors.textMuted }]}>Model:</Text>
              <Text style={[styles.vehicleMetaValue, { color: colors.text }]}>{car.model || '—'}</Text>
            </View>
          </View>
          <Text style={[styles.vehicleSubText, { color: colors.textSecondary }]}>{car.year} • {car.km?.toLocaleString('tr-TR')} KM</Text>
        </View>

        <View style={styles.specsGrid}>
          <SpecItem label="Yakıt" value={car.fuel || '—'} colors={colors} />
          <SpecItem label="Vites" value={car.transmission || '—'} colors={colors} />
          <SpecItem label="Kasa" value={car.body_type || '—'} colors={colors} />
          <SpecItem label="Motor" value={car.engine || '—'} colors={colors} />
          <SpecItem label="Ağır Hasar" value={car.heavy_damage || '—'} colors={colors} />
        </View>

        <View style={{ position: 'relative', marginHorizontal: 20, marginBottom: 24, borderRadius: 16, overflow: 'hidden' }}>
          <View style={[styles.priceCard, { backgroundColor: colors.surface, marginHorizontal: 0, marginBottom: 0 }]}>
            <Text style={[styles.priceLabel, { color: colors.textMuted }]}>B2B SATIŞ FİYATI</Text>
            {isEditable ? (
              <View style={styles.priceInputRow}>
                <Text style={[styles.priceCurrency, { color: colors.tint }]}>₺</Text>
                <TextInput style={[styles.priceInput, { color: colors.tint }]} value={priceStr} onChangeText={handlePriceChange} keyboardType="numeric" placeholder="Fiyat girin" placeholderTextColor={colors.textMuted} />
              </View>
            ) : (
              <View>
                <Text style={[styles.priceStatic, { color: colors.success }]}>₺{isVerified || isEditable ? car.price_b2b?.toLocaleString('tr-TR') : '?.???.???'}</Text>
              </View>
            )}
            <Text style={[styles.priceHint, { color: colors.textMuted }]}>Galericiler arası satış fiyatı</Text>
          </View>

          {car.profiles && !(user && car.seller_id === user.id) && (
            <SellerContactCard 
              profile={isVerified || isEditable ? car.profiles : { galeri_adi: 'Gizli Galeri', company_name: 'Gizli Firma', ad_soyad: 'Gizli İsim', phone: '05?? ??? ?? ??', city: 'Gizli', district: 'Konum' }} 
              colors={colors} 
              theme={theme} 
              containerStyle={{ marginHorizontal: 0, marginTop: 12, marginBottom: 0 }} 
            />
          )}

          {!isVerified && !isEditable && (
            <View style={StyleSheet.absoluteFill}>
              <BlurView intensity={Platform.OS === 'ios' ? 80 : 100} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.85)', padding: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.warning + '20', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
                  <FontAwesome name="lock" size={28} color={colors.warning} />
                </View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 }}>
                  Fiyat ve İletişim Bilgileri Gizli
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '500', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
                  Bu bilgileri görebilmek için galerici hesabınızı doğrulamanız gerekmektedir.
                </Text>
                <Pressable 
                  style={({ pressed }) => [{ backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
                  onPress={() => router.push('/(tabs)/verify' as any)}
                >
                  <Text style={{ color: colors.text, fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>HESABI DOĞRULA</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {(description || isEditable) && (
          <View style={[styles.descriptionCard, { backgroundColor: colors.surface, marginTop: -10, marginBottom: 24 }]}>
            <Text style={[styles.cardHeader, { color: colors.textMuted }]}>İLAN AÇIKLAMASI</Text>
            {isEditable ? (
              <TextInput
                multiline
                style={[styles.descriptionInput, { color: colors.textSecondary, borderColor: colors.surfaceBorder }]}
                value={description}
                onChangeText={setDescription}
                placeholder="İlan açıklaması giriniz..."
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{description}</Text>
            )}
          </View>
        )}

        {(damageReport || isEditable) && (
          <View style={[styles.descriptionCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.cardHeader, { color: colors.textMuted }]}>HASAR KAYDI / EK NOTLAR</Text>
            {isEditable ? (
              <TextInput
                multiline
                style={[styles.descriptionInput, { color: colors.textSecondary, borderColor: colors.surfaceBorder }]}
                value={damageReport}
                onChangeText={setDamageReport}
                placeholder="Hasar kaydı ve ek notlar..."
                placeholderTextColor={colors.textMuted}
              />
            ) : (
              <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{damageReport}</Text>
            )}
          </View>
        )}

        <View style={styles.expertiseSection}>
          <Text style={[styles.cardHeader, { color: colors.textMuted }]}>EKSPERTİZ DURUMU</Text>
          {car.status === 'draft' ? (
            <ExpertiseSelector value={expertiseData} onChange={handleExpertiseChange} />
          ) : (
            <ExpertiseSchema expertise={expertiseData} />
          )}
          {expertiseCount > 0 && (
            <View style={styles.expertiseSummary}>
              <FontAwesome name="info-circle" size={13} color={colors.textMuted} />
              <Text style={[styles.expertiseSummaryText, { color: colors.textMuted }]}>{expertiseCount} panel üzerinde hasar kaydı tespit edildi.</Text>
            </View>
          )}
        </View>

        {car.status === 'draft' && (
          <View style={styles.actionSection}>
            <View style={[styles.toggleContainer, { backgroundColor: colors.surface }]}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>FIRSAT İLANI</Text>
                <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>Acil satılık olarak işaretle.</Text>
              </View>
              <Switch
                value={isOpportunity}
                onValueChange={setIsOpportunity}
                trackColor={{ false: colors.surfaceElevated, true: colors.success }}
              />
            </View>

            {isOpportunity && (
              <View style={styles.opportunityForm}>
                <View>
                  <Text style={[styles.opportunityLabel, { color: colors.textSecondary }]}>FIRSAT NEDENİ</Text>
                  <View style={styles.chipRow}>
                    {['Nakit İhtiyacı', 'Stok Yenileme', 'Dükkan Değişikliği', 'Diğer'].map((reason) => (
                      <Pressable
                        key={reason}
                        onPress={() => setOpportunityReason(reason)}
                        style={[styles.chip, { backgroundColor: opportunityReason === reason ? colors.tint + '20' : colors.surface, borderColor: opportunityReason === reason ? colors.tint : colors.surfaceBorder }]}
                      >
                        <Text style={[styles.chipText, { color: opportunityReason === reason ? colors.tint : colors.textMuted }]}>{reason}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
                <View>
                  <Text style={[styles.opportunityLabel, { color: colors.textSecondary }]}>BİTİŞ SÜRESİ</Text>
                  <View style={styles.chipRow}>
                    {[{ label: '24 SAAT', value: '24' }, { label: '48 SAAT', value: '48' }].map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => setOpportunityExpires(opt.value)}
                        style={[styles.chip, { backgroundColor: opportunityExpires === opt.value ? colors.tint + '20' : colors.surface, borderColor: opportunityExpires === opt.value ? colors.tint : colors.surfaceBorder }]}
                      >
                        <Text style={[styles.chipText, { color: opportunityExpires === opt.value ? colors.tint : colors.textMuted }]}>{opt.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            )}

            <Pressable style={({ pressed }) => [styles.publishBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }, (isPublishing || !canAdd || isTrialExpired) && { opacity: 0.5 }, pressed && !isPublishing && { opacity: 0.85, transform: [{ scale: 0.98 }] }]} onPress={handlePublish} disabled={isPublishing}>
              {isPublishing ? (
                <View style={styles.publishBtnInner}>
                  <ActivityIndicator size="small" color={colors.text} />
                  <Text style={[styles.publishBtnText, { color: colors.text }]}>Lütfen Bekleyin...</Text>
                </View>
              ) : (
                <Text style={[styles.publishBtnText, { color: colors.text }]}>İLANI YAYINLA</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}



const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 13 },
  skeletonContainer: { flex: 1 },
  skeletonHero: { height: 280 },
  skeletonDetailContent: { padding: 20, gap: 14 },
  detailSkeletonLineLg: { width: '80%', height: 24, borderRadius: 12 },
  detailSkeletonLineMd: { width: '52%', height: 16, borderRadius: 8 },
  detailSkeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  detailSkeletonBox: { width: '47%', height: 70, borderRadius: 12 },
  heroContainer: { height: 280, position: 'relative', overflow: 'hidden', backgroundColor: '#333' },
  heroImageSlide: { width: SCREEN_WIDTH, height: 280, backgroundColor: '#333' },
  heroImage: { width: '100%', height: '100%' },
  noImage: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  noImageText: { fontSize: 13 },
  backBtn: { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  statusBadge: { position: 'absolute', top: 56, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  imageCounter: { position: 'absolute', bottom: 14, right: 16, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  imageCounterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  infoSection: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  vehicleTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  vehicleMeta: { marginBottom: 8 },
  vehicleMetaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  vehicleMetaLabel: { fontSize: 13, fontWeight: '700', width: 72 },
  vehicleMetaValue: { fontSize: 13, fontWeight: '500' },
  vehicleSubText: { fontSize: 14, fontWeight: '500' },
  specsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 10, marginBottom: 20 },
  specItem: { width: '47%', borderRadius: 12, padding: 14 },
  specLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  specValue: { fontSize: 15, fontWeight: '700' },
  priceCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 24 },
  priceLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceCurrency: { fontSize: 24, fontWeight: '700' },
  priceInput: { flex: 1, fontSize: 28, fontWeight: '900', paddingVertical: 4 },
  priceStatic: { fontSize: 28, fontWeight: '900' },
  priceHint: { fontSize: 12, marginTop: 8 },
  descriptionCard: { marginHorizontal: 20, borderRadius: 16, padding: 20, marginBottom: 24 },
  descriptionText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  descriptionInput: { fontSize: 14, lineHeight: 22, fontWeight: '500', minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8 },
  cardHeader: { fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },
  expertiseSection: { paddingHorizontal: 20, marginBottom: 24 },
  expertiseSummary: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 4 },
  expertiseSummaryText: { fontSize: 12, flex: 1 },
  blurredPriceContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  lockText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '800' },
  toggleSub: { fontSize: 11, fontWeight: '500' },
  opportunityForm: { gap: 16, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.05)', marginBottom: 16 },
  opportunityLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '700' },
  actionSection: { paddingHorizontal: 20, marginBottom: 20 },
  publishBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  publishBtnDisabled: { opacity: 0.6 },
  publishBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  publishBtnText: { fontWeight: '800', fontSize: 14, letterSpacing: 1 },

});

