import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { isValidUuid, normalizeScrapedImageUrls } from '@/lib/security';
import { processMultipleImages } from '@/lib/image-processor';
import { ListingDetailRecord, ListingSourceTable } from '@/types/domain';
import { listingRepository } from '../api/listing-repository';

const normalizeStatus = (status: string) => {
  const lower = status?.toString().toLowerCase();
  if (lower === 'lokal_boyali' || lower === 'local_painted' || lower === 'local') return 'local';
  if (lower === 'boyali' || lower === 'painted') return 'painted';
  if (lower === 'degisen' || lower === 'changed') return 'changed';
  if (lower === 'orijinal' || lower === 'original') return 'original';
  return lower || 'original';
};

export function normalizeExpertise(value: unknown) {
  const updatedExpertise: Record<string, string> = {};
  if (Array.isArray(value)) {
    value.forEach((item: any) => {
      if (item?.id && item?.status) {
        updatedExpertise[item.id] = normalizeStatus(item.status);
      }
    });
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, status]) => {
      updatedExpertise[key] = normalizeStatus(status as string);
    });
  }
  return updatedExpertise;
}

export function useListingDetail(id: string) {
  const router = useRouter();
  const [car, setCar] = useState<ListingDetailRecord | null>(null);
  const [sourceTable, setSourceTable] = useState<ListingSourceTable>('cars');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCarDetails = useCallback(async () => {
    if (!isValidUuid(id)) {
      Alert.alert('Hata', 'Gecersiz ilan baglantisi.');
      router.replace('/(tabs)' as any);
      return null;
    }

    try {
      const result = await listingRepository.getDetail(id);
      setSourceTable(result.sourceTable);
      setCar(result.record);
      return result;
    } catch (error: any) {
      Alert.alert('Hata', 'İlan detayları yüklenemedi: ' + error.message);
      router.back();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void fetchCarDetails();
  }, [fetchCarDetails]);

  const updateExpertise = useCallback(async (value: unknown) => {
    const updatedExpertise = normalizeExpertise(value);
    await listingRepository.updateExpertise(sourceTable, id, updatedExpertise);
    setCar((prev: ListingDetailRecord | null) => prev ? { ...prev, expertise: updatedExpertise } : prev);
    return updatedExpertise;
  }, [id, sourceTable]);

  return {
    car,
    setCar,
    sourceTable,
    isLoading,
    refetch: fetchCarDetails,
    updateExpertise,
  };
}

export async function prepareListingImages(car: ListingDetailRecord) {
  let newImageUrls = (car.images || []) as string[];
  const hasExternalImages = newImageUrls.some((url: string) => !url.includes('supabase.co'));
  if (!hasExternalImages) return newImageUrls;

  const imagesToProcess = normalizeScrapedImageUrls(newImageUrls);
  if (imagesToProcess.length === 0) {
    throw new Error('Gecersiz gorsel kaynaklari tespit edildi.');
  }

  newImageUrls = await processMultipleImages(imagesToProcess, car.id);
  if (newImageUrls.length === 0) {
    throw new Error('Gorseller yuklenemedi. Lutfen tekrar deneyin.');
  }
  return newImageUrls;
}
