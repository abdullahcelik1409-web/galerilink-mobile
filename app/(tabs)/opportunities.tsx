import React, { useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity,
  Platform 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import ListingCard from '@/components/ListingCard';
import { useFilters } from '@/hooks/use-filters';
import FilterModal from '@/components/FilterModal';
import { BlurView } from 'expo-blur';
import { SkeletonCard } from '@/components/SkeletonCard';
import { EmptyState } from '@/components/EmptyState';
import { useOpportunitiesFeed } from '@/features/listings/hooks/use-listing-feeds';

const ITEMS_PER_PAGE = 15;

export default function OpportunitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const colors = Colors[theme];

  const {
    filters,
    isModalVisible,
    setIsModalVisible,
    applyFilters,
    resetFilters,
  } = useFilters();

  const {
    items: opportunities,
    isRefreshing,
    isLoading,
    isMoreLoading,
    refresh,
    loadMore,
  } = useOpportunitiesFeed(filters, ITEMS_PER_PAGE);
  const isVerified = React.useMemo(
    () => profile?.status === 'approved' || profile?.hesap_durumu === 'onaylandi',
    [profile?.status, profile?.hesap_durumu]
  );

  const handleCardPress = useCallback((id: string | number | undefined) => {
    if (!id) {
      console.warn('[Opportunities] Attempted navigation with undefined ID, skipping.');
      return;
    }
    router.push(`/listing/${id}`);
  }, [router]);

  const renderOpportunityItem = useCallback(({ item }: { item: any }) => (
    <ListingCard 
      car={item} 
      onPress={() => handleCardPress(item.id)} 
      isVerified={isVerified}
    />
  ), [handleCardPress, isVerified]);

  const renderFooter = useCallback(() => {
    if (!isMoreLoading) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme === 'dark' ? '#34D399' : '#059669'} />
      </View>
    );
  }, [isMoreLoading, theme]);

  const keyExtractor = useCallback((item: any, index: number) => (
    isLoading ? `skeleton-${index}` : item.id.toString()
  ), [isLoading]);

  const renderListItem = useCallback(({ item }: { item: any }) => (
    isLoading ? <SkeletonCard /> : renderOpportunityItem({ item })
  ), [isLoading, renderOpportunityItem]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Premium Blur Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTop}>
              <Ionicons name="flame" size={24} color="#059669" />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Fırsat Havuzu</Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Acil ihtiyaçtan veya özel fiyatlı B2B fırsatları</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => setIsModalVisible(true)}
            style={styles.filterButton}
          >
            <View style={[styles.filterBadge, { backgroundColor: 'rgba(5, 150, 105, 0.1)', borderColor: 'rgba(5, 150, 105, 0.2)' }]}>
              <Ionicons name="options-outline" size={20} color="#059669" />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={isLoading ? [1, 2, 3] : opportunities}
        keyExtractor={keyExtractor}
        renderItem={renderListItem}
        contentContainerStyle={[styles.listContent, { paddingTop: 120 }]}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        // Optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={11}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={refresh} 
            tintColor="#059669"
            colors={["#059669"]}
            progressViewOffset={120}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState 
              onClearFilters={resetFilters} 
              message="Seçtiğiniz kriterlere uygun fırsat bulunamadı. Filtreleri temizleyerek daha fazla sonuca ulaşabilirsiniz."
            />
          ) : null
        }
      />

      <FilterModal 
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onApply={applyFilters}
        currentFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: 'hidden',
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerLeft: {
    flex: 1,
  },
  filterButton: {
    marginLeft: 16,
  },
  filterBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    gap: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});

