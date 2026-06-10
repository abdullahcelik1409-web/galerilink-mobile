import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface SellerContactCardProps {
  profile: {
    galeri_adi?: string | null;
    company_name?: string | null;
    ad_soyad?: string | null;
    phone?: string | null;
    city?: string | null;
    district?: string | null;
    hesap_durumu?: string | null;
  };
  colors: any;
  theme: 'light' | 'dark';
  containerStyle?: any;
}

export default function SellerContactCard({ profile, colors, theme, containerStyle }: SellerContactCardProps) {
  const galeriAdi = profile?.galeri_adi || profile?.company_name || profile?.ad_soyad || 'Bilinmeyen Satıcı';
  const adSoyad = profile?.ad_soyad || '';
  const phone = profile?.phone || '';
  const city = profile?.city || '';
  const district = profile?.district || '';
  const isVerified = profile?.hesap_durumu === 'onaylandi';
  const avatarInitial = galeriAdi.charAt(0).toUpperCase();
  const locationText = [city, district].filter(Boolean).join(', ') || 'Konum Bilinmiyor';

  const handleCall = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.sellerCard, { backgroundColor: colors.surface }, containerStyle]}>
      {/* Seller Header */}
      <View style={styles.sellerCardHeader}>
        <View style={[styles.sellerCardAvatar, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(9,9,11,0.06)' }]}>
          <Text style={[styles.sellerCardAvatarText, { color: theme === 'dark' ? '#FAFAFA' : '#09090B' }]}>
            {avatarInitial}
          </Text>
        </View>
        <View style={styles.sellerCardInfo}>
          <View style={styles.sellerCardNameRow}>
            <Text style={[styles.sellerCardName, { color: colors.text }]} numberOfLines={1}>
              {galeriAdi}
            </Text>
            {isVerified && (
              <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}>
                <Ionicons name="shield-checkmark" size={10} color="#34D399" />
                <Text style={styles.verifiedBadgeText}>ONAYLI</Text>
              </View>
            )}
          </View>
          {adSoyad && adSoyad !== galeriAdi ? (
            <Text style={[styles.sellerCardSub, { color: colors.textMuted }]}>{adSoyad}</Text>
          ) : null}
          <View style={styles.sellerCardLocationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.sellerCardLocation, { color: colors.textSecondary }]}>{locationText}</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.sellerCardActions}>
        {/* Arama Yap Button */}
        {phone ? (
          <Pressable
            style={({ pressed }) => [
              styles.sellerActionBtn,
              { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 },
              pressed && { opacity: 0.85 }
            ]}
            onPress={handleCall}
          >
            <Ionicons name="call-outline" size={18} color={colors.text} />
            <Text style={[styles.sellerActionBtnText, { color: colors.text }]}>ARAMA YAP</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sellerCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  sellerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sellerCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerCardAvatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  sellerCardInfo: {
    flex: 1,
  },
  sellerCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sellerCardName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  sellerCardSub: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  sellerCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sellerCardLocation: {
    fontSize: 12,
    fontWeight: '600',
  },
  sellerCardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  sellerActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 8,
  },
  sellerActionBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
