import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';

interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
}

interface TaxonomyPickerProps {
  items: TaxonomyItem[];
  onSelect: (item: TaxonomyItem) => void;
  currentLevel: number;
  totalLevels: number;
  breadcrumbs: string[];
  isLoading: boolean;
  onBack: () => void;
  title: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TaxonomyItemRow = React.memo(({ item, onSelect }: { item: TaxonomyItem; onSelect: (item: TaxonomyItem) => void }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => {
    scale.value = withSpring(0.97, { stiffness: 300, damping: 20 });
  };

  const onPressOut = () => {
    scale.value = withSpring(1, { stiffness: 300, damping: 20 });
  };

  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={() => onSelect(item)}
      style={[
        styles.itemCard,
        { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated },
        animatedStyle,
      ]}
    >
      <View style={styles.itemContent}>
        <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </AnimatedPressable>
  );
});

export const TaxonomyPicker: React.FC<TaxonomyPickerProps> = ({
  items,
  onSelect,
  currentLevel,
  totalLevels,
  breadcrumbs,
  isLoading,
  onBack,
  title,
}) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const filteredItems = useMemo(() => {
    if (!deferredSearchQuery) return items;
    const normalizedQuery = deferredSearchQuery.toLowerCase();
    return items.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery)
    );
  }, [items, deferredSearchQuery]);

  const progress = currentLevel / totalLevels;
  const renderItem = useCallback(({ item }: { item: TaxonomyItem }) => (
    <TaxonomyItemRow item={item} onSelect={onSelect} />
  ), [onSelect]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Dynamic Header */}
      <View style={styles.headerContainer}>
        <View style={styles.topRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title.toUpperCase()}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBarBackground, { backgroundColor: colors.surfaceBorder }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.text,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: colors.textMuted }]}>
            ADIM <Text style={{ color: colors.text }}>{currentLevel}</Text> / {totalLevels}
          </Text>
        </View>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <View style={styles.breadcrumbContainer}>
            <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>
              {breadcrumbs.join('  ›  ')}
            </Text>
          </View>
        )}

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme === 'dark' ? colors.stitch.surfaceContainerLow : colors.surfaceElevated },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            placeholder={`${title} ara...`}
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* List Section */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sonuç bulunamadı.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  breadcrumbContainer: {
    marginBottom: 20,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  listContent: {
    padding: 20,
    gap: 12,
    paddingBottom: 100,
  },
  itemCard: {
    height: 64,
    borderRadius: 12,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
