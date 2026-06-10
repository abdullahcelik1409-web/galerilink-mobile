import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInRight, 
  FadeOutLeft, 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

import { useTheme } from '@/lib/theme-context';
import Colors from '@/constants/Colors';
import { TaxonomyResolver } from '@/lib/taxonomy-resolver';
import { TaxonomyLevel } from '@/lib/taxonomy-types';

const LEVELS = [
  { key: TaxonomyLevel.KATEGORI, title: 'Kategori' },
  { key: TaxonomyLevel.YIL, title: 'Yıl' },
  { key: TaxonomyLevel.MARKA, title: 'Marka' },
  { key: TaxonomyLevel.SERI, title: 'Seri' },
  { key: TaxonomyLevel.YAKIT, title: 'Yakıt Tipi' },
  { key: TaxonomyLevel.KASA, title: 'Kasa Tipi' },
  { key: TaxonomyLevel.SANZIMAN, title: 'Şanzıman' },
  { key: TaxonomyLevel.MODEL, title: 'Model' },
  { key: TaxonomyLevel.MOTOR, title: 'Motor' },
  { key: TaxonomyLevel.PAKET, title: 'Paket' },
];
const TAXONOMY_ROW_HEIGHT = 74;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TaxonomyItemCard = React.memo(({ item, onSelect }: { item: any; onSelect: (item: any) => void }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withSpring(0.97))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={() => onSelect(item)}
      style={[
        styles.itemCard,
        { backgroundColor: theme === 'dark' ? '#131316' : '#F1F4F6' },
        animatedStyle,
      ]}
    >
      <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </AnimatedPressable>
  );
});

interface HierarchicalSelectorProps {
  onComplete: (packageId: string, selections: any[]) => void;
  onCancel?: () => void;
  onManualMode?: (level: TaxonomyLevel, path: any[]) => void;
}

export const HierarchicalSelector: React.FC<HierarchicalSelectorProps> = ({ onComplete, onCancel, onManualMode }) => {
  const { theme } = useTheme();
  const colors = Colors[theme];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selections, setSelections] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<string[]>([]);


  const currentLevel = LEVELS[currentStepIndex];

  const fetchItems = useCallback(async (levelKey: TaxonomyLevel, parentId: string | null = null) => {
    setIsLoading(true);
    try {
      const data = await TaxonomyResolver.fetchItems(levelKey, parentId);
      setItems(data);
    } catch (e: any) {
      console.error('[HierarchicalSelector] Fetch error:', e.message);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(LEVELS[0].key as TaxonomyLevel);
  }, []);

  const handleSelect = useCallback(async (item: any) => {
    const nextStepIndex = currentStepIndex + 1;
    const categoryId = selections.length > 0 ? selections[0].id : (currentStepIndex === 0 ? item.id : null);
    
    setIsLoading(true);
    
    try {
      const effectiveId = await TaxonomyResolver.resolveBridge(
        currentLevel.key as TaxonomyLevel,
        item,
        categoryId!
      );

      const newSelections = [...selections, { ...item, resolvedId: effectiveId }];
      const newBreadcrumbs = [...breadcrumbs, item.name];

      setSelections(newSelections);
      setBreadcrumbs(newBreadcrumbs);

      if (nextStepIndex < LEVELS.length) {
        setCurrentStepIndex(nextStepIndex);
        await fetchItems(LEVELS[nextStepIndex].key as TaxonomyLevel, effectiveId);
      } else {
        onComplete(effectiveId, newSelections);
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentStepIndex, selections, breadcrumbs, currentLevel, fetchItems, onComplete]);

  const handleBack = () => {
    if (currentStepIndex === 0) {
      onCancel?.();
      return;
    }

    const prevStepIndex = currentStepIndex - 1;
    const newSelections = selections.slice(0, -1);
    const newBreadcrumbs = breadcrumbs.slice(0, -1);
    
    setSelections(newSelections);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentStepIndex(prevStepIndex);

    const parentId = prevStepIndex > 0 ? newSelections[newSelections.length - 1].resolvedId : null;
    fetchItems(LEVELS[prevStepIndex].key as TaxonomyLevel, parentId);
  };

  const keyExtractor = useCallback((item: any, index: number) => (
    String(item.id ?? `${currentLevel.key}-${item.name}-${index}`)
  ), [currentLevel.key]);

  const renderTaxonomyItem = useCallback(({ item }: { item: any }) => (
    <TaxonomyItemCard item={item} onSelect={handleSelect} />
  ), [handleSelect]);

  const getItemLayout = useCallback((_: ArrayLike<any> | null | undefined, index: number) => ({
    length: TAXONOMY_ROW_HEIGHT,
    offset: TAXONOMY_ROW_HEIGHT * index,
    index,
  }), []);



  const progress = (currentStepIndex + 1) / LEVELS.length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>{currentLevel.title.toUpperCase()}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Text style={styles.breadcrumbText}>
            {breadcrumbs.join('  ›  ')}
          </Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            ADIM <Text style={{ color: '#FFFFFF' }}>{currentStepIndex + 1}</Text> / {LEVELS.length}
          </Text>
        </View>
      </View>


      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <Animated.View 
          key={currentStepIndex} 
          entering={FadeInRight.duration(300)} 
          exiting={FadeOutLeft.duration(300)}
          style={{ flex: 1, width: '100%' }}
        >
          <FlatList
            style={{ flex: 1, width: '100%' }}
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderTaxonomyItem}
            getItemLayout={getItemLayout}
            initialNumToRender={12}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={50}
            contentContainerStyle={[styles.listContent, { flexGrow: 1, paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="always"
            ListFooterComponent={
              !isLoading && items.length > 0 ? (
                <Pressable
                  onPress={() => onManualMode?.(currentLevel.key as TaxonomyLevel, selections)}
                  style={[styles.manualBtn, { borderColor: theme === 'dark' ? '#18181B' : '#E4E4E7' }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.text} />
                  <Text style={[styles.manualBtnText, { color: colors.text }]}>ARACIMI BULAMADIM</Text>
                </Pressable>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={[styles.emptyText, { marginBottom: 16 }]}>Sonuç bulunamadı.</Text>
                <Pressable
                  onPress={() => onManualMode?.(currentLevel.key as TaxonomyLevel, selections)}
                  style={[styles.manualBtn, { borderColor: theme === 'dark' ? '#18181B' : '#E4E4E7', width: '80%' }]}
                >
                  <Ionicons name="create-outline" size={18} color={colors.text} />
                  <Text style={[styles.manualBtnText, { color: colors.text }]}>MANUEL OLARAK GİR</Text>
                </Pressable>
              </View>
            }
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#09090B',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  breadcrumbText: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
  },
  progressContainer: {
    gap: 8,
  },
  progressBarBg: {
    height: 4,
    backgroundColor: '#18181B',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressLabel: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },

  listContent: {
    padding: 20,
    gap: 10,
    paddingBottom: 40,
  },
  itemCard: {
    height: 64,
    borderRadius: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#71717A',
    fontSize: 14,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    marginTop: 10,
    gap: 8,
  },
  manualBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
