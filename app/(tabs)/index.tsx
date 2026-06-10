import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import ListingCard from '@/components/ListingCard';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { useFilters } from '@/hooks/use-filters';
import FilterModal from '@/components/FilterModal';
import { BlurView } from 'expo-blur';
import { SkeletonCard } from '@/components/SkeletonCard';
import { EmptyState } from '@/components/EmptyState';
import { useListingsFeed } from '@/features/listings/hooks/use-listing-feeds';

const ITEMS_PER_PAGE = 15;

export default function DashboardScreen() {
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
    items: cars,
    isRefreshing,
    isLoading,
    isMoreLoading,
    refresh,
    loadMore,
  } = useListingsFeed(filters, ITEMS_PER_PAGE);
  const isVerified = React.useMemo(
    () => profile?.status === 'approved' || profile?.hesap_durumu === 'onaylandi',
    [profile?.status, profile?.hesap_durumu]
  );

  const handleOpenListing = useCallback((id: string | number) => {
    router.push(`/listing/${id}`);
  }, [router]);

  const renderCarItem = useCallback(({ item }: { item: any }) => (
    <ListingCard
      car={item}
      onPress={() => handleOpenListing(item.id)}
      isVerified={isVerified}
    />
  ), [handleOpenListing, isVerified]);

  const renderFooter = useCallback(() => {
    if (!isMoreLoading) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  }, [colors.tint, isMoreLoading]);

  const keyExtractor = useCallback((item: any, index: number) => (
    isLoading ? `skeleton-${index}` : item.id.toString()
  ), [isLoading]);

  const renderListItem = useCallback(({ item }: { item: any }) => (
    isLoading ? <SkeletonCard /> : renderCarItem({ item })
  ), [isLoading, renderCarItem]);

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? colors.stitch.surface : colors.background }]}>
      {/* Premium Glassmorphism Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <BlurView intensity={theme === 'dark' ? 80 : 50} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={styles.brandHeader}>
          <Text style={[styles.brandText, { color: colors.text }]}>GALERILINK</Text>
          
          <TouchableOpacity 
            onPress={() => setIsModalVisible(true)}
            style={styles.filterButton}
          >
            <View style={[styles.filterBadge, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
              <Ionicons name="options-outline" size={20} color={colors.text} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={isLoading ? [1, 2, 3] : cars}
        keyExtractor={keyExtractor}
        renderItem={renderListItem}
        contentContainerStyle={[styles.listContent, { paddingTop: 100 }]}
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
            tintColor={colors.tint}
            colors={[colors.tint]}
            progressViewOffset={100}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState 
              onClearFilters={resetFilters} 
              message="Seçtiğiniz kriterlere uygun araç bulunamadı. Filtreleri temizleyerek daha fazla sonuca ulaşabilirsiniz."
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
  },
  brandHeader: {
    height: 64,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 3,
  },
  filterButton: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  filterBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  listContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});


