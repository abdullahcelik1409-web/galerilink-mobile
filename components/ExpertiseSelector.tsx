import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

export type ExpertiseState = 'ORIJINAL' | 'BOYALI' | 'LOKAL_BOYALI' | 'DEGISEN';

export type ExpertiseData = any;

export interface ExpertiseItem {
  id: string;
  status: ExpertiseState;
}

const PART_LABELS: Record<string, string> = {
  on_tampon: 'Ön Tampon',
  on_kaput: 'Motor Kaputu',
  tavan: 'Tavan',
  arka_bagaj: 'Bagaj Kapağı',
  arka_tampon: 'Arka Tampon',
  on_sol: 'Sol Ön Çamurluk',
  on_sol_kapi: 'Sol Ön Kapı',
  arka_sol_kapi: 'Sol Arka Kapı',
  arka_sol: 'Sol Arka Çamurluk',
  on_sag: 'Sağ Ön Çamurluk',
  on_sag_kapi: 'Sağ Ön Kapı',
  arka_sag_kapi: 'Sağ Arka Kapı',
  arka_sag: 'Sağ Arka Çamurluk',
};

const getColorPalette = (theme: 'light' | 'dark'): Record<string, string> => ({
  ORIJINAL: theme === 'dark' ? '#3F3F46' : '#E5E7EB', // Premium theme-aware gray (increased contrast in dark mode)
  BOYALI: theme === 'dark' ? '#3B82F6' : '#2563EB',   // Premium blue
  LOKAL_BOYALI: '#fbbf24', // Same local-painted amber as ExpertiseSchema
  DEGISEN: theme === 'dark' ? '#EF4444' : '#DC2626',   // Premium red
});

const STATE_LABELS: Record<ExpertiseState, string> = {
  ORIJINAL: 'Orijinal',
  BOYALI: 'Boyalı',
  LOKAL_BOYALI: 'Lokal Boyalı',
  DEGISEN: 'Değişen',
};

interface ExpertiseSelectorProps {
  value: any;
  onChange: (value: any) => void;
}

export const ExpertiseSelector: React.FC<ExpertiseSelectorProps> = ({ value, onChange }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const colorPalette = getColorPalette(theme);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [carStatus, setCarStatus] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const statusObj: Record<string, string> = {};
    if (Array.isArray(value)) {
      value.forEach((item: any) => {
        if (item && item.id) {
          statusObj[item.id] = item.status;
        } else if (item && item.parcaId) {
          let mappedStatus = 'ORIJINAL';
          if (item.durum === 'boyali' || item.durum === 'painted' || item.durum === 'BOYALI') mappedStatus = 'BOYALI';
          else if (item.durum === 'degisen' || item.durum === 'changed' || item.durum === 'DEGISEN') mappedStatus = 'DEGISEN';
          else if (
            item.durum === 'lokal_boyali' ||
            item.durum === 'local_painted' ||
            item.durum === 'local' ||
            item.durum === 'LOKAL_BOYALI' ||
            item.durum === 'LOCAL'
          ) mappedStatus = 'LOKAL_BOYALI';
          statusObj[item.parcaId] = mappedStatus;
        }
      });
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([key, val]: [string, any]) => {
        let mappedStatus = 'ORIJINAL';
        if (val === 'boyali' || val === 'painted' || val === 'BOYALI') mappedStatus = 'BOYALI';
        else if (val === 'degisen' || val === 'changed' || val === 'DEGISEN') mappedStatus = 'DEGISEN';
        else if (
          val === 'lokal_boyali' ||
          val === 'local_painted' ||
          val === 'local' ||
          val === 'LOKAL_BOYALI' ||
          val === 'LOCAL'
        ) mappedStatus = 'LOKAL_BOYALI';
        else if (typeof val === 'string') mappedStatus = val.toUpperCase();
        statusObj[key] = mappedStatus;
      });
    }
    setCarStatus(statusObj);
  }, [value]);

  const handlePartPress = (id: string) => {
    setActivePart(id);
    setModalVisible(true);
  };

  const handleSelectState = (state: ExpertiseState) => {
    if (!activePart) return;
    
    const updatedStatus = { ...carStatus, [activePart]: state };
    if (state === 'ORIJINAL') {
      delete updatedStatus[activePart];
    }
    
    const newValue = Object.entries(updatedStatus).map(([id, status]) => ({
      id,
      status
    }));
    
    onChange(newValue);
    setModalVisible(false);
    setActivePart(null);
  };

  const renderPart = (id: string, pathData: string, transform?: string) => {
    const color = colorPalette[carStatus[id] || 'ORIJINAL'];

    return (
      <G
        id={id}
        key={id}
        onPress={() => handlePartPress(id)}
        transform={transform}
        pointerEvents="auto"
      >
        <Path
          d={pathData}
          fill={color}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
        />
      </G>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {/* Legend */}
      <View style={styles.legend}>
        {(Object.entries(STATE_LABELS) as [string, string][]).map(([key, label]) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colorPalette[key] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {/* Car Diagram — pointerEvents="box-none" allows touches to pass through empty SVG areas */}
      <View style={styles.diagramContainer} pointerEvents="box-none">
        <Svg viewBox="0 0 227 303" width="100%" height={320} pointerEvents="box-none">
          <G transform="translate(1.0, 1.0)">
             {renderPart("on_tampon", "M98,60.08 C101.01,61.32 104.19,62 107.45,62 L120.16,62 C122.78,62 124.95,59.8 125.07,57.0 L125.63,43.99 C126,30.41 126,16.4 126,16.31 C126,16.23 126,16.11 126,16 C126,1.78 125.67,-11.91 125.07,-25.0 C124.95,-27.8 122.78,-30 120.16,-30 L107.45,-30 C104.19,-30 101.01,-29.36 98,-28.08 L98,60.08 Z", "translate(112, 16) rotate(-90) translate(-112, -16)")}{renderPart("on_kaput", "M83,55 C83,55 94.89,86.4 83,122 L125.9,122 C125.9,122 142.31,115.72 140.91,88.88 C139.51,62.04 125.9,55 125.9,55 L83,55 Z", "translate(112, 88.5) rotate(-90) translate(-112, -88.5)")}{renderPart("tavan", "M87.1,151 C87.1,151 78.51,172.53 86.18,200 L136.89,200 C136.89,200 143.88,175.1 136.89,151 L87.1,151 Z", "translate(111.5, 175.5) rotate(-90) translate(-111.5, -175.5)")}{renderPart("arka_bagaj", "M126,205.02 L106.68,205.02 C106.68,205.02 98,204.01 98,215.13 C98,226.26 98,266.16 98,266.16 C98,266.16 99.37,273 104.85,273 C110.33,273 126,273 126,273 C126,273 119.1,243.66 126,205.02 Z", "translate(112, 239) rotate(-90) translate(-112, -239)")}{renderPart("arka_tampon", "M126,241.91 C122.98,240.67 119.8,240 116.54,240 L103.83,240 C101.21,240 99.04,242.19 98.92,244.99 C98.36,258.00 98,271.58 98,285.68 C98,285.76 98,285.88 98,286 C98,300.21 98.32,313.91 98.92,327.00 C99.04,329.80 101.21,332 103.83,332 L116.54,332 C119.8,332 122.98,331.36 126,330.08 L126,241.91 Z", "translate(112, 286) rotate(-90) translate(-112, -286)")}<G transform="translate(16, 0)">{renderPart("on_sol", "M14.5,52 L57.19,45.05 C57.19,45.05 69.23,41.61 70.49,38.37 C71.74,35.12 72.39,32.97 71.74,30.59 C71.1,28.21 69.46,22.51 69.46,22.51 C69.46,22.51 72.12,17.75 68.97,17.75 C65.81,17.75 56.17,17 56.17,17 C56.17,17 58.03,41.98 35.69,42.31 C15.18,42.62 15.71,20.28 15.71,20.28 L11,20.28 C11,20.28 15.59,38.14 11,52 L14.5,52 Z", "translate(31.52, 155.5) scale(-1, 1) translate(-31.52, -155.5) translate(0.02, 52) translate(41.5, 34.5) scale(-1, 1) rotate(-90) translate(-41.5 -34.5)")}{renderPart("on_sol_kapi", "M6.98,98.12 L6.98,118 L52.62,118 C53.3,118 53.9,117.5 54.01,116.82 L54.24,115.5 C55.67,106.43 55.06,97.02 52.51,88.21 C51.61,85.15 49.61,82.55 46.91,80.88 C34.31,73.25 19.95,68.86 5.33,68.11 L3,68 L5.4,80.84 C6.45,86.51 6.98,92.33 6.98,98.12 Z", "translate(31.52, 155.5) scale(-1, 1) translate(-31.52, -155.5) translate(0.02, 52) translate(29, 93) rotate(-90) translate(-29 -93)")}{renderPart("arka_sol_kapi", "M13.05,141.69 L13.08,141.77 C14.88,144.79 17.18,147.47 19.88,149.69 C21.27,150.83 22.47,152.11 23.45,153.47 C24.42,154.79 24.95,155.88 25.51,157.01 C26,157.96 26.49,158.98 27.28,160.22 C28.06,161.43 28.93,162.6 29.87,163.69 C31.07,165.09 32.61,165.92 34.07,165.96 C36.02,166 38.73,166 42.14,166 C46.57,166 51.08,165.96 53,165.96 L53,146.11 C53,140.45 52.47,134.79 51.42,129.24 L48.94,116 L38.28,116 C29.72,116 21.19,118.11 13.61,122.07 L9.93,124 C8.13,124.94 6.81,126.49 6.14,128.41 C5.87,129.16 5.99,130 6.4,130.71 L13.05,141.69 Z", "translate(31.52, 155.5) scale(-1, 1) translate(-31.52, -155.5) translate(0.02, 52) translate(29.5, 141) rotate(-90) translate(-29.5 -141)")}{renderPart("arka_sol", "M13.91,168.01 C13.91,168.01 19.05,166.4 26.95,167.20 L31.46,166.96 C31.46,166.96 39.21,160.76 41.58,161.00 C43.95,161.28 48.06,167.97 48.06,167.97 L57,184.07 C56.88,183.87 44.23,181.25 38.38,185.23 C33.32,188.70 29.40,194.17 28.73,199.97 L28.06,203.99 C28.06,203.99 20.23,204.31 17.70,198.56 C15.17,192.80 12.21,190.75 12.21,190.75 C12.21,190.75 11.42,181.97 12.88,179.80 C14.3,177.67 13.91,168.01 13.91,168.01 Z", "translate(31.52, 155.5) scale(-1, 1) translate(-31.52, -155.5) translate(0.02, 52) translate(34.5, 182.5) rotate(-90) translate(-34.5 -182.5)")}</G><G transform="translate(-16, 0)">{renderPart("on_sag", "M14.5,52 L57.19,45.05 C57.19,45.05 69.23,41.61 70.49,38.37 C71.74,35.12 72.39,32.97 71.74,30.59 C71.1,28.21 69.46,22.51 69.46,22.51 C69.46,22.51 72.12,17.75 68.97,17.75 C65.81,17.75 56.17,17 56.17,17 C56.17,17 58.03,41.98 35.69,42.31 C15.18,42.62 15.71,20.28 15.71,20.28 L11,20.28 C11,20.28 15.59,38.14 11,52 L14.5,52 Z", "translate(162, 52) translate(41.5, 34.5) scale(-1, 1) rotate(-90) translate(-41.5 -34.5)")}{renderPart("on_sag_kapi", "M6.98,98.12 L6.98,118 L52.62,118 C53.3,118 53.9,117.5 54.01,116.82 L54.24,115.5 C55.67,106.43 55.06,97.02 52.51,88.21 C51.61,85.15 49.61,82.55 46.91,80.88 C34.31,73.25 19.95,68.86 5.33,68.11 L3,68 L5.4,80.84 C6.45,86.51 6.98,92.33 6.98,98.12 Z", "translate(162, 52) translate(29, 93) rotate(-90) translate(-29 -93)")}{renderPart("arka_sag_kapi", "M13.05,141.69 L13.08,141.77 C14.88,144.79 17.18,147.47 19.88,149.69 C21.27,150.83 22.47,152.11 23.45,153.47 C24.42,154.79 24.95,155.88 25.51,157.01 C26,157.96 26.49,158.98 27.28,160.22 C28.06,161.43 28.93,162.6 29.87,163.69 C31.07,165.09 32.61,165.92 34.07,165.96 C36.02,166 38.73,166 42.14,166 C46.57,166 51.08,165.96 53,165.96 L53,146.11 C53,140.45 52.47,134.79 51.42,129.24 L48.94,116 L38.28,116 C29.72,116 21.19,118.11 13.61,122.07 L9.93,124 C8.13,124.94 6.81,126.49 6.14,128.41 C5.87,129.16 5.99,130 6.4,130.71 L13.05,141.69 Z", "translate(162, 52) translate(29.5, 141) rotate(-90) translate(-29.5 -141)")}{renderPart("arka_sag", "M13.91,168.01 C13.91,168.01 19.05,166.4 26.95,167.20 L31.46,166.96 C31.46,166.96 39.21,160.76 41.58,161.00 C43.95,161.28 48.06,167.97 48.06,167.97 L57,184.07 C56.88,183.87 44.23,181.25 38.38,185.23 C33.32,188.70 29.40,194.17 28.73,199.97 L28.06,203.99 C28.06,203.99 20.23,204.31 17.70,198.56 C15.17,192.80 12.21,190.75 12.21,190.75 C12.21,190.75 11.42,181.97 12.88,179.80 C14.3,177.67 13.91,168.01 13.91,168.01 Z", "translate(162, 52) translate(34.5, 182.5) rotate(-90) translate(-34.5 -182.5)")}</G><G fill="rgba(255,255,255,0.05)"><Circle cx="37" cy="95" r="14" /><Circle cx="190" cy="95" r="14" /><Circle cx="37" cy="225" r="14" /><Circle cx="190" cy="225" r="14" /></G>
          </G>
        </Svg>
      </View>

      {/* State Picker Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(247, 250, 252, 0.8)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {activePart ? PART_LABELS[activePart].toUpperCase() : ''} SEÇİMİ
              </Text>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.stateList}>
              {(Object.entries(STATE_LABELS) as [ExpertiseState, string][]).map(([state, label]) => {
                const isSelected = (carStatus[activePart!] || 'ORIJINAL') === state;

                return (
                  <Pressable
                    key={state}
                    onPress={() => handleSelectState(state)}
                    style={[
                      styles.stateItem,
                      { borderBottomColor: colors.surfaceBorder },
                      isSelected && { backgroundColor: colors.tintLight }
                    ]}
                  >
                    <View style={styles.stateItemLeft}>
                      <View style={[styles.stateDot, { backgroundColor: colorPalette[state] }]} />
                      <Text style={[styles.stateLabel, { color: isSelected ? colors.tint : colors.text }]}>
                        {label}
                      </Text>
                    </View>
                    {isSelected && <Ionicons name="checkmark" size={20} color={colors.tint} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // NOT: flex:1 ScrollView içinde kullanılmamalı — bounding box çökmesine neden olur
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 20,
    gap: 20,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  diagramContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    // minHeight ensures the full SVG bounding box is contained; overflow visible prevents touch clipping
    minHeight: 500,
    overflow: 'visible',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  closeButton: {
    padding: 4,
  },
  stateList: {
    gap: 4,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderRadius: 12,
  },
  stateItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  stateLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
