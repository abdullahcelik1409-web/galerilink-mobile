import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import ListingCard from '@/components/ListingCard';
import { useFilters, INITIAL_FILTERS } from '@/hooks/use-filters';
import FilterModal from '@/components/FilterModal';
import { EmptyState } from '@/components/EmptyState';

const ITEMS_PER_PAGE = 15;

export default function OpportunitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = Colors[theme];

  const { 
    filters, 
    isModalVisible, 
    setIsModalVisible, 
    applyFilters, 
    resetFilters,
    buildQuery 
  } = useFilters();

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const fetchCurrentUserProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('status, hesap_durumu')
        .eq('id', user.id)
        .single();
      if (!error) setCurrentUserProfile(data);
    } catch (e) {
      console.error('Error fetching profile for feed gatekeeping:', e);
    }
  };

  const fetchOpportunities = async (pageNum = 0, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsMoreLoading(true);
      } else {
        setIsLoading(true);
        setOpportunities([]); // Clear for ghosting protection
      }

      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // 1. Build Query Chain
      let query = supabase
        .from('cars')
        .select(`
          *,
          profiles:seller_id (
            galeri_adi,
            company_name,
            ad_soyad,
            phone,
            city,
            district,
            hesap_durumu
          )
        `)
        .eq('status', 'published')
        .eq('is_opportunity', true);

      // Body Type Filter
      if (filters.selectedBodyTypes && filters.selectedBodyTypes.length > 0) {
        query = query.in('body_type', filters.selectedBodyTypes);
      }

      // Heavy Damage Filter
      if (filters.selectedDamageStatus && filters.selectedDamageStatus.length > 0) {
        const hasEvet = filters.selectedDamageStatus.includes('Evet');
        const hasHayir = filters.selectedDamageStatus.includes('Hayır');
        if (hasEvet && !hasHayir) query = query.eq('heavy_damage', 'Evet');
        else if (!hasEvet && hasHayir) query = query.eq('heavy_damage', 'Hayır');
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      
      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        title: row.title || 'İsimsiz İlan',
        brand: row.brand || '',
        model: row.model || '',
        year: row.year || '',
        km: row.km || 0,
        price_b2b: row.price_b2b || 0,
        images: row.images || [],
        damage_report: row.damage_report || '',
        expertise: row.expertise || {},
        location_city: row.location_city || '',
        location_district: row.location_district || '',
        is_active: row.is_active,
        seller_id: row.seller_id,
        seller_company_name: row.profiles?.galeri_adi || row.profiles?.company_name || row.profiles?.ad_soyad || 'Bilinmeyen Galeri',
        seller_city: row.profiles?.city || row.location_city || '',
        seller_district: row.profiles?.district || row.location_district || '',
        seller_phone: row.profiles?.phone || '',
        is_opportunity: row.is_opportunity,
        opportunity_reason: row.opportunity_reason || 'Özel Fırsat',
        opportunity_expires_at: row.opportunity_expires_at,
        is_trade_closed: row.is_trade_closed || false,
        offer_count: row.offer_count ?? 0,
      }));

      if (isLoadMore) {
        setOpportunities(prev => [...prev, ...mapped]);
      } else {
        setOpportunities(mapped);
      }

      setHasMore(mapped.length === ITEMS_PER_PAGE);
    } catch (e: any) {
      console.error('[Opportunities] Fetch Error:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsMoreLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOpportunities(0, false);
      fetchCurrentUserProfile();
    }, [user, filters])
  );

  useEffect(() => {
    setOpportunities([]);
    setPage(0);
    setHasMore(true);
    fetchOpportunities(0, false);
    fetchCurrentUserProfile();
  }, [user, filters]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchOpportunities(0, false);
    fetchCurrentUserProfile();
  }, [user, filters]);

  const handleLoadMore = () => {
    if (isMoreLoading || !hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchOpportunities(nextPage, true);
  };

  const handleCardPress = (item: any) => {
    if (!item.id) {
      console.warn('[Opportunities] Attempted navigation with undefined ID, skipping.');
      return;
    }
    router.push(`/listing/${item.id}`);
  };

  const renderOpportunityItem = ({ item }: { item: any }) => {
    const isVerified = currentUserProfile?.status === 'approved' || currentUserProfile?.hesap_durumu === 'onaylandi';
    return (
      <ListingCard 
        car={item} 
        onPress={() => handleCardPress(item)} 
        isVerified={isVerified}
      />
    );
  };

  const renderFooter = () => {
    if (!isMoreLoading) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme === 'dark' ? '#34D399' : '#059669'} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.header, 
        { 
          backgroundColor: theme === 'dark' ? '#064E3B' : '#ECFDF5',
          paddingTop: insets.top + 16
        }
      ]}>
         <View style={styles.headerRow}>
           <View style={styles.headerLeft}>
             <View style={styles.headerTop}>
               <Ionicons name="flame" size={24} color={theme === 'dark' ? '#34D399' : '#059669'} />
               <Text style={[styles.headerTitle, { color: theme === 'dark' ? '#34D399' : '#059669' }]}>Fırsat Havuzu</Text>
             </View>
             <Text style={[styles.headerSubtitle, { color: theme === 'dark' ? '#A7F3D0' : '#047857' }]}>Acil ihtiyaçtan veya özel fiyatlı B2B fırsatları</Text>
           </View>
           
           <TouchableOpacity 
             onPress={() => setIsModalVisible(true)}
             style={styles.filterButton}
           >
             <View style={styles.filterBadge}>
               <Ionicons name="options-outline" size={20} color="#FFF" />
             </View>
           </TouchableOpacity>
         </View>
      </View>

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderOpportunityItem}
        contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        // Optimizations
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={11}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor={theme === 'dark' ? '#34D399' : '#059669'}
            colors={[theme === 'dark' ? '#34D399' : '#059669']}
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(52, 211, 153, 0.2)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
