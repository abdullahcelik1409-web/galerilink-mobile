/**
 * Galerilink — Pure Noir Design System
 * Koyu tema ağırlıklı, premium hissiyat veren renk paleti.
 */

const tintColorDark = '#FFFFFF'; // Premium Dark Mode (Beyaz / Platin)
const tintColorLight = '#1A1A2E';

export default {
  // Uygulama genelinde Dark mode zorunlu
  dark: {
    // Arka planlar (değiştirmiyoruz çok şık)
    background: '#09090B',        // Koyu siyah/çinko
    surface: '#18181B',           // Zinc yüzey
    surfaceElevated: '#27272A',   // Yükseltilmiş zinc
    surfaceBorder: '#3F3F46',     // Kenarlık

    // Metin
    text: '#FAFAFA',              // Bembeyaz metin
    textSecondary: '#A1A1AA',     // Gümüş / Çinko metin
    textMuted: '#71717A',         // Soluk metin
    textInverse: '#09090B',       // Siyah metin (beyaz butonlar için)

    // Marka renkleri
    tint: tintColorDark,          // Ana vurgu (Beyaz/Platin)
    tintMuted: '#A1A1AA',         // Koyu platin
    tintLight: 'rgba(255, 255, 255, 0.1)', // Saydam beyaz


    // Tab bar
    tabIconDefault: '#5A5A6A',
    tabIconSelected: tintColorDark,
    tabBarBackground: '#0D0D14',
    tabBarBorder: '#1A1A28',

    // Durumlar
    success: '#34D399',
    warning: '#FBBF24',
    error: '#EF4444',
    info: '#60A5FA',

    // Özel
    scraper: '#8B5CF6',           // İlan Çek sayfası — mor vurgu
    overlay: 'rgba(0, 0, 0, 0.7)',

    // Stitch Design System — "The Forensic Architect"
    stitch: {
      primary: '#FAFAFA',         // Near-White
      primaryContainer: '#27272A', // Elevated Zinc
      primaryFixedDim: 'rgba(250, 250, 250, 0.1)',
      surface: '#09090B',         // Deep Zinc-Black
      surfaceContainerLow: '#18181B', // Zinc Surface
      surfaceContainerLowest: '#09090B', // Base Canvas
      error: '#EF4444',
    }
  },

  light: {
    background: '#F9FAFB',        // Canvas White
    surface: '#FFFFFF',           // Pure Surface
    surfaceElevated: '#F3F4F6',   // Soft Gray Surface
    surfaceBorder: '#E5E7EB',     // Whisper Border (Zinc-200)
    
    text: '#09090B',              // Charcoal Ink
    textSecondary: '#4B5563',     // Muted Slate
    textMuted: '#9CA3AF',         // Soft Gray
    textInverse: '#FAFAFA',       // White text for dark buttons
    
    tint: '#09090B',              // Monolith Black accent
    tintMuted: '#6B7280',         // Steel Gray
    tintLight: 'rgba(9, 9, 11, 0.05)', // Subtle ink overlay
    
    tabIconDefault: '#9CA3AF',
    tabIconSelected: '#09090B',
    tabBarBackground: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    
    success: '#10B981',           // Emerald Accent
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    scraper: '#7C3AED',
    overlay: 'rgba(0, 0, 0, 0.4)',

    // Stitch Design System — Light Fallback
    stitch: {
      primary: '#09090B',
      primaryContainer: '#F3F4F6',
      primaryFixedDim: 'rgba(9, 9, 11, 0.1)',
      surface: '#F9FAFB',
      surfaceContainerLow: '#F3F4F6',
      surfaceContainerLowest: '#FFFFFF',
      error: '#EF4444',
    }
  },
};
