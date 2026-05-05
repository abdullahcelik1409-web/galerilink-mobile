import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import Colors from '@/constants/Colors';
import ListingCard from '@/components/ListingCard';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { useFilters, INITIAL_FILTERS } from '@/hooks/use-filters';
import FilterModal from '@/components/FilterModal';

import { EmptyState } from '@/components/EmptyState';

const ITEMS_PER_PAGE = 15;

export default function DashboardScreen() {
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

  const [cars, setCars] = useState<any[]>([]);
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

  const fetchPublishedCars = async (pageNum = 0, isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsMoreLoading(true);
      } else {
        setIsLoading(true);
      }

      const from = pageNum * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Dinamik Sorgu Oluşturucu
      let baseQuery = supabase
        .from('cars')
        .select(`
          *,
          profiles:seller_id ( galeri_adi, ad_soyad, company_name, phone, city, district, hesap_durumu )
        `)
        .eq('status', 'published')
        .neq('is_opportunity', true)
        .order('created_at', { ascending: false });

      // Filtreleri Uygula
      const query = buildQuery(baseQuery, filters).range(from, to);

      const { data, error } = await query;

      if (error) throw error;
      
      const newCars = data || [];
      if (isLoadMore) {
        setCars(prev => [...prev, ...newCars]);
      } else {
        setCars(newCars);
      }
      
      setHasMore(newCars.length === ITEMS_PER_PAGE);
    } catch (e: any) {
      console.error('Fetch cars error:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsMoreLoading(false);
    }
  };

  // Ekran odağa geldiğinde verileri tazelemeye zorla (The Ghost Bug Fix)
  useFocusEffect(
    useCallback(() => {
      fetchPublishedCars(0, false);
      fetchCurrentUserProfile();
    }, [user, filters])
  );

  useEffect(() => {
    setCars([]); // Filtre değiştiğinde eski listeyi temizle
    setPage(0);
    setHasMore(true);
    fetchPublishedCars(0, false);
    fetchCurrentUserProfile();
  }, [user, filters]); // Filtreler değiştiğinde tetiklenir

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(0);
    setHasMore(true);
    fetchPublishedCars(0, false);
    fetchCurrentUserProfile();
  }, [user, filters]);

  const handleLoadMore = () => {
    if (isMoreLoading || !hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPublishedCars(nextPage, true);
  };

  const renderCarItem = ({ item }: { item: any }) => {
    const isVerified = currentUserProfile?.status === 'approved' || currentUserProfile?.hesap_durumu === 'onaylandi';
    
    return (
      <ListingCard 
        car={item} 
        onPress={() => router.push(`/listing/${item.id}`)} 
        isVerified={isVerified}
      />
    );
  };

  const renderFooter = () => {
    if (!isMoreLoading) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme === 'dark' ? colors.stitch.surface : colors.background }]}>
      {/* Manuel Güvenli Alan Duyarlı Header */}
      <View style={[
        styles.brandHeader, 
        { 
          paddingTop: insets.top,
          backgroundColor: colors.surface, 
          borderBottomColor: colors.surfaceBorder,
          zIndex: 100,
          elevation: 10
        }
      ]}>
        <Text style={[styles.brandText, { color: colors.tint }]}>GALERILINK</Text>
        
        {/* Filtreleme İkonu */}
        <TouchableOpacity 
          onPress={() => setIsModalVisible(true)}
          style={styles.filterButton}
        >
          <View style={styles.filterBadge}>
            <Ionicons name="options-outline" size={20} color={theme === 'dark' ? '#FFF' : '#000'} />
          </View>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cars}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCarItem}
        contentContainerStyle={styles.listContent}
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
            tintColor={colors.tint}
            colors={[colors.tint]}
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
  brandHeader: {
    minHeight: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: 10,
    position: 'relative',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },
  filterButton: {
    position: 'absolute',
    right: 16,
    bottom: 10,
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

