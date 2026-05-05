import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G, Circle } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';

type ExpertiseState = 'changed' | 'painted' | 'local_painted' | 'original';

interface ExpertiseData {
  [key: string]: ExpertiseState;
}

// Renk haritası (Kullanıcının Web Projesine Göre)
const STATE_COLORS: Record<string, string> = {
  original: '#334155',         // Slate 700 (Koyu Gri) - Orijinal
  local_painted: '#f97316',    // Orange 500 (Turuncu) - Lokal Boyalı
  painted: '#3b82f6',          // Blue 500 (Mavi) - Boyalı
  changed: '#ef4444',          // Red 500 (Kırmızı) - Değişen
};

const STATE_LABELS: Record<string, string> = {
  original: 'Orijinal',
  local_painted: 'Lokal Boyalı',
  painted: 'Boyalı',
  changed: 'Değişen',
};

// Web projesindeki path verileri
const PATH_DATA: Record<string, { d: string; transform: string }> = {
  on_tampon: {
    d: 'M 98 60.08 C 101.01 61.32 104.19 62 107.45 62 L 120.16 62 C 122.78 62 124.95 59.8 125.07 57.0 L 125.63 43.99 C 126 30.41 126 16.4 126 16.31 C 126 16.23 126 16.11 126 16 C 126 1.78 125.67 -11.91 125.07 -25.0 C 124.95 -27.8 122.78 -30 120.16 -30 L 107.45 -30 C 104.19 -30 101.01 -29.36 98 -28.08 L 98 60.08 Z',
    transform: 'translate(112 16) rotate(-90) translate(-112 -16)',
  },
  on_kaput: {
    d: 'M 83 55 C 83 55 94.89 86.4 83 122 L 125.9 122 C 125.9 122 142.31 115.72 140.91 88.88 C 139.51 62.04 125.9 55 125.9 55 L 83 55 Z',
    transform: 'translate(112 88.5) rotate(-90) translate(-112 -88.5)',
  },
  tavan: {
    d: 'M 87.1 151 C 87.1 151 78.51 172.53 86.18 200 L 136.89 200 C 136.89 200 143.88 175.1 136.89 151 L 87.1 151 Z',
    transform: 'translate(111.5 175.5) rotate(-90) translate(-111.5 -175.5)',
  },
  arka_bagaj: {
    d: 'M 126 205.02 L 106.68 205.02 C 106.68 205.02 98 204.01 98 215.13 C 98 226.26 98 266.16 98 266.16 C 98 266.16 99.37 273 104.85 273 C 110.33 273 126 273 126 273 C 126 273 119.1 243.66 126 205.02 Z',
    transform: 'translate(112 239) rotate(-90) translate(-112 -239)',
  },
  arka_tampon: {
    d: 'M 126 241.91 C 122.98 240.67 119.8 240 116.54 240 L 103.83 240 C 101.21 240 99.04 242.19 98.92 244.99 C 98.36 258.00 98 271.58 98 285.68 C 98 285.76 98 285.88 98 286 C 98 300.21 98.32 313.91 98.92 327.00 C 99.04 329.80 101.21 332 103.83 332 L 116.54 332 C 119.8 332 122.98 331.36 126 330.08 L 126 241.91 Z',
    transform: 'translate(112 286) rotate(-90) translate(-112 -286)',
  },
  // Sol taraf
  on_sol: {
    d: 'M 14.5 52 L 57.19 45.05 C 57.19 45.05 69.23 41.61 70.49 38.37 C 71.74 35.12 72.39 32.97 71.74 30.59 C 71.1 28.21 69.46 22.51 69.46 22.51 C 69.46 22.51 72.12 17.75 68.97 17.75 C 65.81 17.75 56.17 17 56.17 17 C 56.17 17 58.03 41.98 35.69 42.31 C 15.18 42.62 15.71 20.28 15.71 20.28 L 11 20.28 C 11 20.28 15.59 38.14 11 52 L 14.5 52 Z',
    transform: 'translate(31.52 155.5) scale(-1 1) translate(-31.52 -155.5) translate(0.02 52) translate(41.5 34.5) scale(-1 1) rotate(-90) translate(-41.5 -34.5)',
  },
  on_sol_kapi: {
    d: 'M 6.98 98.12 L 6.98 118 L 52.62 118 C 53.3 118 53.9 117.5 54.01 116.82 L 54.24 115.5 C 55.67 106.43 55.06 97.02 52.51 88.21 C 51.61 85.15 49.61 82.55 46.91 80.88 C 34.31 73.25 19.95 68.86 5.33 68.11 L 3 68 L 5.4 80.84 C 6.45 86.51 6.98 92.33 6.98 98.12 Z',
    transform: 'translate(31.52 155.5) scale(-1 1) translate(-31.52 -155.5) translate(0.02 52) translate(29 93) rotate(-90) translate(-29 -93)',
  },
  arka_sol_kapi: {
    d: 'M 13.05 141.69 L 13.08 141.77 C 14.88 144.79 17.18 147.47 19.88 149.69 C 21.27 150.83 22.47 152.11 23.45 153.47 C 24.42 154.79 24.95 155.88 25.51 157.01 C 26 157.96 26.49 158.98 27.28 160.22 C 28.06 161.43 28.93 162.6 29.87 163.69 C 31.07 165.09 32.61 165.92 34.07 165.96 C 36.02 166 38.73 166 42.14 166 C 46.57 166 51.08 165.96 53 165.96 L 53 146.11 C 53 140.45 52.47 134.79 51.42 129.24 L 48.94 116 L 38.28 116 C 29.72 116 21.19 118.11 13.61 122.07 L 9.93 124 C 8.13 124.94 6.81 126.49 6.14 128.41 C 5.87 129.16 5.99 130 6.4 130.71 L 13.05 141.69 Z',
    transform: 'translate(31.52 155.5) scale(-1 1) translate(-31.52 -155.5) translate(0.02 52) translate(29.5 141) rotate(-90) translate(-29.5 -141)',
  },
  arka_sol: {
    d: 'M 13.91 168.01 C 13.91 168.01 19.05 166.4 26.95 167.20 L 31.46 166.96 C 31.46 166.96 39.21 160.76 41.58 161.00 C 43.95 161.28 48.06 167.97 48.06 167.97 L 57 184.07 C 56.88 183.87 44.23 181.25 38.38 185.23 C 33.32 188.70 29.40 194.17 28.73 199.97 L 28.06 203.99 C 28.06 203.99 20.23 204.31 17.70 198.56 C 15.17 192.80 12.21 190.75 12.21 190.75 C 12.21 190.75 11.42 181.97 12.88 179.80 C 14.3 177.67 13.91 168.01 13.91 168.01 Z',
    transform: 'translate(31.52 155.5) scale(-1 1) translate(-31.52 -155.5) translate(0.02 52) translate(34.5 182.5) rotate(-90) translate(-34.5 -182.5)',
  },
  // Sağ taraf
  on_sag: {
    d: 'M 14.5 52 L 57.19 45.05 C 57.19 45.05 69.23 41.61 70.49 38.37 C 71.74 35.12 72.39 32.97 71.74 30.59 C 71.1 28.21 69.46 22.51 69.46 22.51 C 69.46 22.51 72.12 17.75 68.97 17.75 C 65.81 17.75 56.17 17 56.17 17 C 56.17 17 58.03 41.98 35.69 42.31 C 15.18 42.62 15.71 20.28 15.71 20.28 L 11 20.28 C 11 20.28 15.59 38.14 11 52 L 14.5 52 Z',
    transform: 'translate(162 52) translate(41.5 34.5) scale(-1 1) rotate(-90) translate(-41.5 -34.5)',
  },
  on_sag_kapi: {
    d: 'M 6.98 98.12 L 6.98 118 L 52.62 118 C 53.3 118 53.9 117.5 54.01 116.82 L 54.24 115.5 C 55.67 106.43 55.06 97.02 52.51 88.21 C 51.61 85.15 49.61 82.55 46.91 80.88 C 34.31 73.25 19.95 68.86 5.33 68.11 L 3 68 L 5.4 80.84 C 6.45 86.51 6.98 92.33 6.98 98.12 Z',
    transform: 'translate(162 52) translate(29 93) rotate(-90) translate(-29 -93)',
  },
  arka_sag_kapi: {
    d: 'M 13.05 141.69 L 13.08 141.77 C 14.88 144.79 17.18 147.47 19.88 149.69 C 21.27 150.83 22.47 152.11 23.45 153.47 C 24.42 154.79 24.95 155.88 25.51 157.01 C 26 157.96 26.49 158.98 27.28 160.22 C 28.06 161.43 28.93 162.6 29.87 163.69 C 31.07 165.09 32.61 165.92 34.07 165.96 C 36.02 166 38.73 166 42.14 166 C 46.57 166 51.08 165.96 53 165.96 L 53 146.11 C 53 140.45 52.47 134.79 51.42 129.24 L 48.94 116 L 38.28 116 C 29.72 116 21.19 118.11 13.61 122.07 L 9.93 124 C 8.13 124.94 6.81 126.49 6.14 128.41 C 5.87 129.16 5.99 130 6.4 130.71 L 13.05 141.69 Z',
    transform: 'translate(162 52) translate(29.5 141) rotate(-90) translate(-29.5 -141)',
  },
  arka_sag: {
    d: 'M 13.91 168.01 C 13.91 168.01 19.05 166.4 26.95 167.20 L 31.46 166.96 C 31.46 166.96 39.21 160.76 41.58 161.00 C 43.95 161.28 48.06 167.97 48.06 167.97 L 57 184.07 C 56.88 183.87 44.23 181.25 38.38 185.23 C 33.32 188.70 29.40 194.17 28.73 199.97 L 28.06 203.99 C 28.06 203.99 20.23 204.31 17.70 198.56 C 15.17 192.80 12.21 190.75 12.21 190.75 C 12.21 190.75 11.42 181.97 12.88 179.80 C 14.3 177.67 13.91 168.01 13.91 168.01 Z',
    transform: 'translate(162 52) translate(34.5 182.5) rotate(-90) translate(-34.5 -182.5)',
  },
};

/**
 * Ekspertiz Şeması — Kuşbakışı SVG araç diyagramı (Web Projesi Birebir Port)
 */
export default function ExpertiseSchema({ expertise = {} }: { expertise?: ExpertiseData }) {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const getPartColor = (partId: string) => {
    const state = expertise[partId];
    return state ? STATE_COLORS[state] : STATE_COLORS.original;
  };

  const renderPath = (partId: string) => {
    const data = PATH_DATA[partId];
    if (!data) return null;

    return (
      <Path
        key={partId}
        d={data.d}
        fill={getPartColor(partId)}
        stroke={theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
        strokeWidth="0.8"
        transform={data.transform}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>EKSPERTİZ ŞEMASI</Text>

      {/* Şema Kartı (Koyu arka plan ve SVG) */}
      <View style={[styles.schemaCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        {/* Legend */}
        <View style={styles.legendContainer}>
          {(Object.entries(STATE_LABELS) as [string, string][]).map(([key, label]) => (
            <View key={key} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: STATE_COLORS[key] },
                ]}
              />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* SVG Araç Şeması */}
        <View style={styles.svgContainer}>
          <Svg viewBox="0 0 227 303" width="100%" height={320}>
            <G transform="translate(1.0, 1.0)">
              {/* Orta (Ön, Tavan, Bagaj) */}
              {renderPath('on_tampon')}
              {renderPath('on_kaput')}
              {renderPath('tavan')}
              {renderPath('arka_bagaj')}
              {renderPath('arka_tampon')}

              {/* Sol Taraf */}
              <G transform="translate(16, 0)">
                {renderPath('on_sol')}
                {renderPath('on_sol_kapi')}
                {renderPath('arka_sol_kapi')}
                {renderPath('arka_sol')}
              </G>

              {/* Sağ Taraf */}
              <G transform="translate(-16, 0)">
                {renderPath('on_sag')}
                {renderPath('on_sag_kapi')}
                {renderPath('arka_sag_kapi')}
                {renderPath('arka_sag')}
              </G>

              {/* Tekerlekler */}
              <G fill={theme === 'dark' ? '#222' : '#CCC'} opacity={0.6}>
                <Circle cx="37" cy="95" r="14" />
                <Circle cx="190" cy="95" r="14" />
                <Circle cx="37" cy="225" r="14" />
                <Circle cx="190" cy="225" r="14" />
              </G>
            </G>
          </Svg>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  schemaCard: {
    borderRadius: 32, // rounded-[2.5rem]
    borderWidth: 1,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  svgContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

