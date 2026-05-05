import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';

interface ListingCardProps {
  car: any;
  onPress: () => void;
  isVerified?: boolean;
}

/**
 * ListingCard Component — Forensic Architect Design
 */
export default function ListingCard({ car, onPress, isVerified = false }: ListingCardProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const sellerProfile = car.profiles;
  const galeriAdi = sellerProfile?.galeri_adi || sellerProfile?.company_name || sellerProfile?.ad_soyad || 'Bilinmeyen Satıcı';
  const sellerCity = sellerProfile?.city || car.location_city || '';
  const isSellerVerified = sellerProfile?.hesap_durumu === 'onaylandi';
  const avatarInitial = galeriAdi.charAt(0).toUpperCase();
  const hasImages = car.images && car.images.length > 0;
  
  return (
    <Pressable style={[styles.card, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLowest : colors.surface }]} onPress={onPress}>
      {/* Hero Image Area */}
      <View style={[styles.imageWrapper, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
        {hasImages ? (
          <Image 
            source={{ uri: car.images[0] }} 
            style={styles.image} 
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.noImage}>
            <FontAwesome name="camera" size={32} color={colors.textMuted} />
          </View>
        )}
        
        {/* Glassmorphism Status Badge */}
        <View style={styles.statusBadgeWrapper}>
          <BlurView intensity={30} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}>YAYINDA</Text>
          </BlurView>
        </View>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {/* Header Info */}
        <Text style={[styles.title, { color: theme === 'dark' ? colors.stitch.primary : colors.text }]} numberOfLines={1}>
          {car.year} {car.brand} {car.series} {car.model}
        </Text>

        {/* Key Specs Matrix */}
        <View style={styles.specsMatrix}>
          <View style={[styles.specBox, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>KM</Text>
            <Text style={[styles.specValue, { color: theme === 'dark' ? colors.stitch.primary : colors.text }]}>{car.km?.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={[styles.specBox, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>VİTES</Text>
            <Text style={[styles.specValue, { color: theme === 'dark' ? colors.stitch.primary : colors.text }]}>{car.transmission || 'Otomatik'}</Text>
          </View>
          <View style={[styles.specBox, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>YAKIT</Text>
            <Text style={[styles.specValue, { color: theme === 'dark' ? colors.stitch.primary : colors.text }]}>{car.fuel || 'Benzin'}</Text>
          </View>
        </View>

        {/* Appraisal Highlights */}
        <View style={[styles.appraisalChip, { backgroundColor: theme === 'dark' ? colors.stitch.primaryFixedDim : colors.tintLight }]}>
          <FontAwesome name="check-circle" size={14} color={theme === 'dark' ? colors.stitch.primary : colors.tint} />
          <Text style={[styles.appraisalText, { color: theme === 'dark' ? colors.stitch.primary : colors.tint }]}>Ekspertiz Raporu Mevcut</Text>
        </View>

        {/* Pricing Block */}
        <View style={[styles.pricingBlock, { borderTopColor: colors.surfaceBorder, position: 'relative', overflow: 'hidden' }]}>
          <View style={styles.priceContainer}>
             <Text style={[styles.priceLabel, { color: colors.textMuted }]}>B2B FİYAT</Text>
             <Text style={[styles.priceValue, { color: theme === 'dark' ? colors.stitch.primary : colors.text }]}>
               {isVerified ? car.price_b2b?.toLocaleString('tr-TR') : '?.???'} ₺
             </Text>
          </View>
          
          {!isVerified && (
            <View style={StyleSheet.absoluteFill}>
              <BlurView intensity={90} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.warning + '20', justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}>
                  <FontAwesome name="lock" size={14} color={colors.warning} />
                </View>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginLeft: 10 }}>Fiyatı Görmek İçin Onaylayın</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageWrapper: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeWrapper: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  specsMatrix: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  specBox: {
    flex: 1,
    padding: 8,
    borderRadius: 2,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 8,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  appraisalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  appraisalText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pricingBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  lockedPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  sellerBlock: {
    alignItems: 'flex-end',
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sellerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerAvatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sellerInfo: {
    alignItems: 'flex-end',
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  galeriName: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 100,
  },
});
