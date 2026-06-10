import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

interface ListingCardProps {
  car: any;
  onPress: () => void;
  isVerified?: boolean;
}

const getFirstImageUrl = (images: unknown) => {
  if (!Array.isArray(images)) return null;
  const imageUrl = images.find((url): url is string => typeof url === 'string' && url.trim().length > 0);
  return imageUrl?.trim() ?? null;
};

/**
 * ListingCard Component — Forensic Architect Design
 */
function ListingCard({ car, onPress, isVerified = false }: ListingCardProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const sellerProfile = car.profiles;
  const sellerCity = sellerProfile?.city || car.location_city || '';
  const isSellerVerified = sellerProfile?.hesap_durumu === 'onaylandi';
  const isOpportunity = car.is_opportunity === true;
  const imageUrl = car.thumbnail_url ?? getFirstImageUrl(car.images);
  const hasImages = !!imageUrl;

  return (
    <Pressable 
      style={[
        styles.card, 
        { 
          backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLowest : colors.surface,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 5,
        },
        isOpportunity && { borderColor: colors.success, borderWidth: 1 }
      ]} 
      onPress={onPress}
    >
      {/* Hero Image Area */}
      <View style={[styles.imageWrapper, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
        {hasImages ? (
          <Image 
            source={{ uri: imageUrl }} 
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
          <BlurView intensity={40} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.statusBadge}>
            <Text style={[styles.statusText, { color: theme === 'dark' ? '#FFFFFF' : '#000000' }]}>
              {isOpportunity ? '🔥 FIRSAT' : 'YAYINDA'}
            </Text>
          </BlurView>
        </View>

        {isOpportunity && (
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={12} color="#FFF" />
            <Text style={styles.vipText}>PREMIUM SEÇİM</Text>
          </View>
        )}
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {/* Header Info */}
        <Text style={[styles.title, { color: theme === 'dark' ? colors.stitch.primary : colors.text }]} numberOfLines={1}>
          {car.title}
        </Text>

        {/* Key Specs Matrix */}
        <View style={styles.specsMatrix}>
          <View style={[styles.specBox, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>KM</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>{car.km?.toLocaleString('tr-TR')}</Text>
          </View>
          <View style={[styles.specBox, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>VİTES</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>{car.transmission || 'Otomatik'}</Text>
          </View>
          <View style={[styles.specBox, { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated }]}>
            <Text style={[styles.specLabel, { color: colors.textMuted }]}>YAKIT</Text>
            <Text style={[styles.specValue, { color: colors.text }]}>{car.fuel || 'Benzin'}</Text>
          </View>
        </View>

        {/* Pricing Block */}
        <View style={[styles.pricingBlock, { borderTopColor: colors.surfaceBorder }]}>
          <View style={styles.priceContainer}>
             <Text style={[styles.priceLabel, { color: colors.textMuted }]}>B2B FİYAT</Text>
             <Text style={[styles.priceValue, { color: isOpportunity ? colors.success : colors.text }]}>
               {isVerified ? car.price_b2b?.toLocaleString('tr-TR') : '?.???'} ₺
             </Text>
          </View>
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.locationText, { color: colors.textMuted }]}>{sellerCity}</Text>
          </View>

          {!isVerified && (
            <View style={StyleSheet.absoluteFill}>
              <BlurView intensity={90} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.85)' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.warning + '20', justifyContent: 'center', alignItems: 'center', marginLeft: 8 }}>
                  <FontAwesome name="lock" size={14} color={colors.warning} />
                </View>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '800', marginLeft: 10 }}>Onaylayın</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default React.memo(ListingCard);

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32, // Dinamik genişlik (cihaz genişliği - kenar boşlukları)
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'center', // Kartı ekranda ortalar
  },
  imageWrapper: {
    height: 220,
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
    top: 16,
    right: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  vipBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  vipText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  specsMatrix: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  specBox: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 9,
    fontWeight: '900',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  pricingBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 20,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
