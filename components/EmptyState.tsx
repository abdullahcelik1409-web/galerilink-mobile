import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: keyof typeof Ionicons.prototype.name;
  onClearFilters?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Sonuç Bulunamadı',
  message = 'Kriterlerinize uygun ilan bulunamadı. Lütfen filtreleri güncelleyerek tekrar deneyin.',
  icon = 'search-outline',
  onClearFilters,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]}>
        <Ionicons name={icon as any} size={64} color={colors.textMuted} style={{ opacity: 0.5 }} />
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

      {onClearFilters && (
        <Pressable 
          onPress={onClearFilters}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>Filtreleri Temizle</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 80,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  button: {
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
