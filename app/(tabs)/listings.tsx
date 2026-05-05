import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Dimensions, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';

const { width } = Dimensions.get('window');

type TabType = 'draft' | 'published';

export default function ListingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = Colors[theme];
  
  const [cars, setCars] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('draft');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Delete State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [carToDelete, setCarToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMyCars = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCars(data || []);
    } catch (e: any) {
      console.error('Fetch my cars error:', e.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyCars();
  }, [user]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchMyCars();
  }, [user]);

  const handleDeleteListing = async () => {
    if (!carToDelete) return;
    setIsDeleting(true);
    try {
      // 1. Storage'dan fotoğrafları sil
      if (carToDelete.images && carToDelete.images.length > 0) {
        const filePaths = carToDelete.images
          .map((url: string) => {
            const match = url.match(/car_images\/(.+)$/);
            return match ? match[1] : null;
          })
          .filter(Boolean) as string[];

        if (filePaths.length > 0) {
          await supabase.storage.from('car_images').remove(filePaths);
        }
      }

      // 2. Veritabanından ilanı kalıcı olarak sil
      const { error } = await supabase
        .from('cars')
        .delete()
        .eq('id', carToDelete.id);

      if (error) throw error;

      // 3. UI'ı anında güncelle
      setCars(currentCars => currentCars.filter(c => c.id !== carToDelete.id));
      setDeleteModalVisible(false);
      setCarToDelete(null);
    } catch (e: any) {
      console.error('Error deleting listing:', e.message);
      alert('İlan silinirken bir hata oluştu.');
    } finally {
      setIsDeleting(false);
    }
  };

  const displayedCars = cars.filter(c => c.status === activeTab);

  const renderCarItem = ({ item }: { item: any }) => {
    const isDraft = item.status === 'draft';
    
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.carCard,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          pressed && { transform: [{ scale: 0.98 }] }
        ]}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        <View style={[styles.imageContainer, { backgroundColor: colors.surfaceElevated }]}>
          {item.images && item.images.length > 0 ? (
            <Image 
              source={{ uri: item.images[0] }} 
              style={styles.carImage} 
              contentFit="cover" 
              transition={200}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.noImage}>
              <FontAwesome name="car" size={24} color={colors.surfaceBorder} />
              <Text style={[styles.noImageText, { color: colors.textMuted }]}>Görsel Yok</Text>
            </View>
          )}
          {!isDraft && (
            <View style={[styles.publishedBadge, { backgroundColor: colors.success }]}>
              <Text style={styles.publishedBadgeText}>YAYINDA</Text>
            </View>
          )}
        </View>

        <View style={styles.carInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.carTitle, { color: colors.text }]} numberOfLines={1}>
              {item.brand} {item.model}
            </Text>
          </View>
          <Text style={[styles.carMeta, { color: colors.textSecondary }]}>
            {item.year} • {item.km?.toLocaleString('tr-TR')} KM
          </Text>

          <View style={[styles.actionRow, { flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-end' }]}>
            <Pressable 
              onPress={(e) => {
                e.stopPropagation();
                setCarToDelete(item);
                setDeleteModalVisible(true);
              }}
              style={({ pressed }) => [
                styles.deleteButtonCard,
                { borderColor: colors.error },
                pressed && { backgroundColor: 'rgba(186, 26, 26, 0.1)' }
              ]}
            >
              <FontAwesome name="trash-o" size={16} color={colors.error} />
            </Pressable>

            {isDraft ? (
              <View style={[styles.ctaButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 }]}>
                <Text style={[styles.ctaButtonText, { color: colors.text }]}>FİYAT BELİRLE</Text>
                <FontAwesome name="chevron-right" size={10} color={colors.text} />
              </View>
            ) : (
              <View style={styles.priceContainer}>
                <Text style={[styles.priceLabel, { color: colors.textMuted }]}>B2B FİYAT</Text>
                <Text style={[styles.priceValue, { color: colors.tint }]}>₺{item.price_b2b?.toLocaleString('tr-TR')}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder }]}>
         <Text style={[styles.headerTitle, { color: colors.text }]}>İlanlarım</Text>
         <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Araç envanterinizi yönetin</Text>
         
         <View style={[styles.tabContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder }]}>
           <Pressable 
             style={[styles.tabButton, activeTab === 'draft' && [styles.tabButtonActive, { backgroundColor: colors.surface }]]}
             onPress={() => setActiveTab('draft')}
           >
             <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'draft' && [styles.tabTextActive, { color: colors.text }]]}>
               Taslak İlanlar
             </Text>
           </Pressable>
           <Pressable 
             style={[styles.tabButton, activeTab === 'published' && [styles.tabButtonActive, { backgroundColor: colors.surface }]]}
             onPress={() => setActiveTab('published')}
           >
             <Text style={[styles.tabText, { color: colors.textMuted }, activeTab === 'published' && [styles.tabTextActive, { color: colors.text }]]}>
               Yayındaki İlanlar
             </Text>
           </Pressable>
         </View>
      </View>

      <FlatList
        data={displayedCars}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCarItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        maxToRenderPerBatch={5}
        windowSize={11}
        removeClippedSubviews={false}
        refreshControl={
          <RefreshControl 
            refreshing={isRefreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.tint}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <FontAwesome name="inbox" size={32} color={colors.textMuted} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeTab === 'draft' ? 'Taslak İlan Yok' : 'Yayında İlan Yok'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                {activeTab === 'draft' 
                  ? 'Sahibinden üzerinden ilan çekerek taslak oluşturabilirsiniz.' 
                  : 'Fiyat belirleyip yayınladığınız araçlar burada listelenir.'}
              </Text>
            </View>
          ) : null
        }
      />

      <Pressable 
        style={({ pressed }) => [
          styles.fab, 
          { backgroundColor: colors.surfaceElevated, borderColor: colors.surfaceBorder, borderWidth: 1 },
          pressed && { transform: [{ scale: 0.95 }] }
        ]}
        onPress={() => router.push('/add-listing')}
      >
        <FontAwesome name="plus" size={24} color={colors.text} />
      </Pressable>

      {/* Delete Confirmation Modal - Forensic Architect Style */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeleteModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(247, 250, 252, 0.8)' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(186, 26, 26, 0.1)' }]}>
                <FontAwesome name="exclamation-triangle" size={20} color={colors.error} />
              </View>
              <Pressable
                onPress={() => !isDeleting && setDeleteModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <FontAwesome name="times" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Content */}
            <Text style={[styles.modalTitle, { color: colors.text }]}>İlanı Kalıcı Olarak Sil</Text>
            <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
              <Text style={{ fontWeight: '800', color: colors.text }}>{carToDelete?.brand} {carToDelete?.model}</Text> ilanı ve tüm görselleri kalıcı olarak silinecektir. Bu işlem geri alınamaz.
            </Text>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnOutline,
                  { borderColor: colors.surfaceBorder },
                  pressed && { backgroundColor: colors.surfaceElevated }
                ]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={[styles.modalBtnOutlineText, { color: colors.text }]}>Vazgeç</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalBtnPrimary,
                  { backgroundColor: colors.error },
                  pressed && { opacity: 0.9 }
                ]}
                onPress={handleDeleteListing}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <FontAwesome name="trash" size={14} color="#ffffff" />
                    <Text style={styles.modalBtnPrimaryText}>Sil</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  carCard: {
    flexDirection: 'row',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    height: 120,
  },
  imageContainer: {
    width: 120,
    position: 'relative',
  },
  carImage: {
    width: '100%',
    height: '100%',
  },
  noImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  noImageText: {
    fontSize: 11,
    fontWeight: '600',
  },
  publishedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  publishedBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  carInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  titleRow: {
    marginBottom: 2,
  },
  carTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  carMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  actionRow: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  ctaButtonText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  deleteButtonCard: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#181c1e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnOutline: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnOutlineText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalBtnPrimary: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  }
});
