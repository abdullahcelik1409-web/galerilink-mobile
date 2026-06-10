import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ────────────────────────────────────────────────────
// Abonelik Paketleri Verileri
// ────────────────────────────────────────────────────
interface SubscriptionPlan {
  id: string;
  name: string;
  subtitle: string;
  price: string;
  period: string;
  features: string[];
  ctaLabel: string;
  isPopular: boolean;
  isDisabled: boolean;
  icon: 'bolt' | 'fire' | 'diamond' | 'rocket';
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'trial',
    name: 'DENEME SÜRÜMÜ',
    subtitle: 'SİSTEMİ KEŞFEDİN',
    price: '₺0',
    period: 'AYLIK',
    features: [
      '5 Aktif İlan Hakkı',
      'İlan Aktarımı Erişimi',
      'B2B İlan Portalı',
      '14 Günlük Süre',
    ],
    ctaLabel: 'DENEME BAŞLATILDI',
    isPopular: false,
    isDisabled: true,
    icon: 'bolt',
  },
  {
    id: 'lite',
    name: 'LİTE PAKET',
    subtitle: 'BİREYSEL GALERİLER',
    price: '₺849',
    period: 'AYLIK',
    features: [
      '10 Aktif İlan Hakkı',
      'İlan Aktarımı Erişimi',
      'B2B İlan Portalı',
      'Standart Destek Hattı',
    ],
    ctaLabel: 'ABONELİĞİ BAŞLAT',
    isPopular: false,
    isDisabled: false,
    icon: 'bolt',
  },
  {
    id: 'pro',
    name: 'PRO PAKET',
    subtitle: 'AKTİF TİCARET',
    price: '₺1.249',
    period: 'AYLIK',
    features: [
      '30 Aktif İlan Hakkı',
      'Fırsat Havuzunda Vitrin',
      'Sınırsız İlan Aktarımı',
      'VIP İlan Analiz',
      'Öncelikli Destek',
    ],
    ctaLabel: 'HEMEN KATIL',
    isPopular: true,
    isDisabled: false,
    icon: 'fire',
  },
  {
    id: 'enterprise',
    name: 'KURUMSAL',
    subtitle: 'SINIRSIZ TİCARET',
    price: '₺1.999',
    period: 'AYLIK',
    features: [
      'Sınırsız İlan Yükleme',
      'Fırsat Havuzu (Vitrini)',
      'Sınırsız İlan Aktarımı',
      'Çoklu Kullanıcı Desteği',
      '7/24 VIP Destek Hattı',
    ],
    ctaLabel: 'SINIRSIZ BAŞLA',
    isPopular: false,
    isDisabled: false,
    icon: 'rocket',
  },
];

// ────────────────────────────────────────────────────
// Animated Pressable Bileşeni
// ────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────
// Checkmark İkonu
// ────────────────────────────────────────────────────
function CheckIcon({ highlighted, colors }: { highlighted: boolean, colors: any }) {
  return (
    <View
      style={[
        styles.checkCircle,
        { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.3)' },
        highlighted && { backgroundColor: colors.success, borderColor: colors.success },
      ]}
    >
      <FontAwesome
        name="check"
        size={10}
        color={highlighted ? '#09090B' : '#FAFAFA'}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────
// Plan Kartı Bileşeni
// ────────────────────────────────────────────────────
function PlanCard({ plan, colors, theme }: { plan: SubscriptionPlan, colors: any, theme: any }) {
  const iconMap: Record<string, string> = {
    bolt: 'bolt',
    fire: 'fire',
    diamond: 'diamond',
    rocket: 'rocket',
  };

  return (
    <AnimatedPressable
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        plan.isPopular && [styles.cardPopular, { backgroundColor: colors.surfaceElevated, borderColor: colors.tint }],
      ]}
    >
      {/* Popüler Badge */}
      {plan.isPopular && (
        <View style={[styles.popularBadge, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
          <Text style={[styles.popularBadgeText, { color: colors.text }]}>EN POPÜLER</Text>
        </View>
      )}

      {/* İkon */}
      <View style={styles.cardIconWrap}>
        <FontAwesome
          name={iconMap[plan.icon] as any}
          size={18}
          color={plan.isPopular ? colors.success : colors.textMuted}
        />
      </View>

      {/* Plan İsmi ve Alt Başlık */}
      <Text
        style={[
          styles.planName,
          { color: colors.text },
          plan.isPopular && styles.planNamePopular,
        ]}
      >
        {plan.name}
      </Text>
      <Text style={[styles.planSubtitle, { color: colors.textMuted }]}>{plan.subtitle}</Text>

      {/* Fiyat */}
      <View style={styles.priceRow}>
        <Text
          style={[
            styles.priceValue,
            { color: colors.text },
            plan.isPopular && styles.priceValuePopular,
          ]}
        >
          {plan.price}
        </Text>
        <Text style={[styles.pricePeriod, { color: colors.textMuted }]}>/ {plan.period}</Text>
      </View>

      {/* Ayırıcı çizgi */}
      <View style={[styles.separator, { backgroundColor: colors.surfaceBorder }]} />

      {/* Özellikler Listesi */}
      <View style={styles.featuresList}>
        {plan.features.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <CheckIcon highlighted={plan.isPopular} colors={colors} />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>{feature}</Text>
          </View>
        ))}
      </View>

      {/* CTA Butonu */}
      <Pressable
        style={({ pressed }) => [
          styles.ctaButton,
          { borderColor: colors.surfaceBorder },
          plan.isPopular && [styles.ctaButtonPrimary, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }],
          plan.isDisabled && [styles.ctaButtonDisabled, { borderColor: colors.surfaceBorder }],
          pressed && !plan.isDisabled && styles.ctaButtonPressed,
        ]}
        disabled={plan.isDisabled}
      >
        <Text
          style={[
            styles.ctaButtonText,
            { color: colors.text },
            plan.isPopular && [styles.ctaButtonTextPrimary, { color: colors.text }],
            plan.isDisabled && [styles.ctaButtonTextDisabled, { color: colors.textMuted }],
          ]}
        >
          {plan.ctaLabel}
        </Text>
      </Pressable>
    </AnimatedPressable>
  );
}

// ────────────────────────────────────────────────────
// Ana Sayfa Bileşeni
// ────────────────────────────────────────────────────
export default function SubscriptionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { isTrialExpired } = useAuth();
  const colors = Colors[theme];

  // Android geri tuşunu engelle (expired kullanıcılar için)
  useEffect(() => {
    if (!isTrialExpired) return;
    const onBackPress = () => true; // true = geri gitmeyi engelle
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isTrialExpired]);

  const handleBack = () => {
    if (isTrialExpired) return; // expired kullanıcı geri dönemez
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          gestureEnabled: !isTrialExpired,
        }}
      />
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable
          style={[styles.backButton, isTrialExpired && { opacity: 0.3 }]}
          onPress={handleBack}
          hitSlop={12}
        >
          <FontAwesome name="arrow-left" size={14} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>GERİ DÖN</Text>
        </Pressable>

        <Pressable style={styles.exitButton} hitSlop={12}>
          <Text style={[styles.exitText, { color: colors.textMuted }]}>ÇIKIŞ YAP</Text>
        </Pressable>
      </View>

      {/* Scrollable İçerik */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Başlık */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>ABONELİK{'\n'}PLANI</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Ticaret ağındaki yerinizi{' '}
            <Text style={[styles.heroSubtitleBold, { color: colors.text }]}>profesyonel paketlerle</Text>
            {' '}sabitleyin.
          </Text>
        </View>

        {/* Plan Kartları */}
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} colors={colors} theme={theme} />
        ))}

        {/* Footer Notu */}
        <View style={styles.footerNote}>
          <FontAwesome
            name="shield"
            size={14}
            color={colors.textMuted}
          />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Tüm paketler aylık faturalandırılır. İstediğiniz zaman iptal
            edebilirsiniz.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ────────────────────────────────────────────────────
// Stiller — Pure Noir + Stitch "Kinetic Monolith" Design System
// ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  exitButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  exitText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  // ── ScrollView ──
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Hero ──
  heroSection: {
    marginBottom: 28,
    marginTop: 8,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '900',
    fontStyle: 'italic',
    letterSpacing: -0.5,
    lineHeight: 44,
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  heroSubtitleBold: {
    fontWeight: '700',
    fontStyle: 'italic',
  },

  // ── Plan Card ──
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
  },
  cardPopular: {
    borderWidth: 1.5,
    // Hafif parlak gölge efekti
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
  },

  // ── Popüler Badge ──
  popularBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 16,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // ── İkon ──
  cardIconWrap: {
    marginBottom: 12,
  },

  // ── Plan İsmi ──
  planName: {
    fontSize: 22,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  planNamePopular: {
    fontSize: 24,
  },
  planSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // ── Fiyat ──
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  priceValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  priceValuePopular: {
    fontSize: 36,
  },
  pricePeriod: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  // ── Ayırıcı ──
  separator: {
    height: 1,
    marginBottom: 20,
    opacity: 0.5,
  },

  // ── Özellikler ──
  featuresList: {
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // ── CTA Button ──
  ctaButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  ctaButtonPrimary: {
  },
  ctaButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    opacity: 0.5,
  },
  ctaButtonPressed: {
    opacity: 0.8,
  },
  ctaButtonText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  ctaButtonTextPrimary: {
  },
  ctaButtonTextDisabled: {
  },

  // ── Footer ──
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  footerText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
});

