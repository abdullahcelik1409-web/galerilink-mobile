import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import SellerContactCard from './SellerContactCard';

interface OpportunityCardProps {
  car: any;
  onPress: () => void;
}

export default function OpportunityCard({ car, onPress }: OpportunityCardProps) {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const galeriAdi = car.seller_company_name || 'Bilinmiyor';
  const hasImages = car.images && car.images.length > 0;
  
  // Calculate expiry
  const isExpiringSoon = car.opportunity_expires_at 
    ? new Date(car.opportunity_expires_at).getTime() - new Date().getTime() < 86400000 * 2 // 2 days
    : false;

  return (
    <Pressable style={[styles.card, { 
      backgroundColor: theme === 'dark' ? '#091A14' : '#F0FDF4',
      borderColor: theme === 'dark' ? '#064E3B' : '#A7F3D0',
      borderWidth: 1,
    }]} onPress={onPress}>
      
      {/* Top Banner for Opportunity Reason */}
      <View style={[styles.reasonBanner, { backgroundColor: theme === 'dark' ? '#064E3B' : '#D1FAE5' }]}>
        <Ionicons name="flame" size={14} color={theme === 'dark' ? '#34D399' : '#059669'} />
        <Text style={[styles.reasonText, { color: theme === 'dark' ? '#34D399' : '#059669' }]}>
          {car.opportunity_reason?.toUpperCase() || 'ÖZEL FIRSAT'}
        </Text>
      </View>

      {/* Hero Image Area */}
      <View style={[styles.imageWrapper, { backgroundColor: theme === 'dark' ? '#064E3B' : '#A7F3D0' }]}>
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
            <Ionicons name="car" size={48} color={theme === 'dark' ? '#065F46' : '#6EE7B7'} />
          </View>
        )}
        
        {/* Active Offers Badge */}
        {car.offer_count > 0 && (
          <View style={styles.offersBadgeWrapper}>
            <BlurView intensity={30} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.offersBadge}>
              <Ionicons name="flash" size={12} color="#34D399" />
              <Text style={[styles.offersText, { color: '#FFFFFF' }]}>{car.offer_count} TEKLİF</Text>
            </BlurView>
          </View>
        )}

        {/* Expiry Badge */}
        {isExpiringSoon && (
          <View style={[styles.expiryBadge, { backgroundColor: '#EF4444' }]}>
             <Text style={styles.expiryText}>SÜRESİ DOLUYOR</Text>
          </View>
        )}
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {/* Header Info */}
        <Text style={[styles.title, { color: theme === 'dark' ? '#E4E4E7' : '#18181B' }]} numberOfLines={1}>
          {car.year} {car.brand} {car.model}
        </Text>

        {/* Seller Contact Card — Stitch Premium */}
        <SellerContactCard 
          profile={{
            company_name: car.seller_company_name,
            phone: car.seller_phone,
            city: car.seller_city,
            district: car.seller_district
          }}
          colors={colors}
          theme={theme as any}
          containerStyle={{ marginTop: 0, marginBottom: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme === 'dark' ? '#064E3B' : '#A7F3D0' }}
        />



        {/* Pricing Block - The core of the opportunity */}
        <View style={styles.pricingBlock}>
          <View style={styles.priceContainer}>
             <Text style={[styles.priceLabel, { color: theme === 'dark' ? '#34D399' : '#059669' }]}>B2B FIRSAT FİYATI</Text>
             <Text style={[styles.priceValue, { color: theme === 'dark' ? '#10B981' : '#047857' }]}>
               {car.price_b2b?.toLocaleString('tr-TR')} ₺
             </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.actionRow, { borderTopColor: theme === 'dark' ? '#064E3B' : '#A7F3D0' }]}>
          <Text style={[styles.actionText, { color: theme === 'dark' ? '#34D399' : '#059669' }]}>FIRSATI İNCELE</Text>
          <Ionicons name="arrow-forward" size={16} color={theme === 'dark' ? '#34D399' : '#059669'} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  reasonBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  imageWrapper: {
    height: 180,
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
  offersBadgeWrapper: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  offersBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  offersText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  expiryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  expiryText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  pricingBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  }
});
