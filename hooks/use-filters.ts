import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface FilterState {
  search: string;
  minPrice: string;
  maxPrice: string;
  minYear: string;
  maxYear: string;
  minKm: string;
  maxKm: string;
  city: string;
  brand: string;
  model: string;
  // Taxonomy Hierarchical Selections (MARKA -> MODEL -> MOTOR -> PAKET)
  selectedKategori?: { id: string, name: string };
  selectedMarka?: { id: string, name: string };
  selectedSeri?: { id: string, name: string };
  selectedModel?: { id: string, name: string };
  selectedMotor?: { id: string, name: string };
  selectedPaket?: { id: string, name: string };
  selectedCities?: string[];
  selectedDistricts?: string[];
  selectedBodyTypes?: string[];
  selectedDamageStatus?: string[];
}

export const INITIAL_FILTERS: FilterState = {
  search: '',
  minPrice: '',
  maxPrice: '',
  minYear: '',
  maxYear: '',
  minKm: '',
  maxKm: '',
  city: '',
  brand: '',
  model: '',
  selectedKategori: undefined,
  selectedMarka: undefined,
  selectedSeri: undefined,
  selectedModel: undefined,
  selectedMotor: undefined,
  selectedPaket: undefined,
  selectedCities: [],
  selectedDistricts: [],
  selectedBodyTypes: [],
  selectedDamageStatus: [],
};

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const applyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const buildQuery = useCallback((baseQuery: any, currentFilters: FilterState) => {
    let query = baseQuery;

    // Numerical Filters
    if (currentFilters.minPrice) query = query.gte('price_b2b', parseInt(currentFilters.minPrice));
    if (currentFilters.maxPrice) query = query.lte('price_b2b', parseInt(currentFilters.maxPrice));
    if (currentFilters.minYear) query = query.gte('year', parseInt(currentFilters.minYear));
    if (currentFilters.maxYear) query = query.lte('year', parseInt(currentFilters.maxYear));
    if (currentFilters.minKm) query = query.gte('km', parseInt(currentFilters.minKm));
    if (currentFilters.maxKm) query = query.lte('km', parseInt(currentFilters.maxKm));

    // Location Filters (Multi-select)
    if (currentFilters.selectedCities && currentFilters.selectedCities.length > 0) {
      query = query.in('location_city', currentFilters.selectedCities);
    } else if (currentFilters.city) {
      query = query.ilike('location_city', `%${currentFilters.city}%`);
    }

    if (currentFilters.selectedDistricts && currentFilters.selectedDistricts.length > 0) {
      query = query.in('location_district', currentFilters.selectedDistricts);
    }
    
    // Taxonomy Hierarchy Filter (Using names since 'cars' table mostly has string columns)
    if (currentFilters.selectedKategori) {
      // Logic for category if needed
    }
    
    if (currentFilters.selectedMarka) {
      query = query.ilike('brand', `%${currentFilters.selectedMarka.name}%`);
    } else if (currentFilters.brand) {
      query = query.ilike('brand', `%${currentFilters.brand}%`);
    }

    if (currentFilters.selectedSeri) {
      query = query.ilike('model', `%${currentFilters.selectedSeri.name}%`);
    } else if (currentFilters.selectedModel) {
      query = query.ilike('model', `%${currentFilters.selectedModel.name}%`);
    } else if (currentFilters.model) {
      query = query.ilike('model', `%${currentFilters.model}%`);
    }

    if (currentFilters.selectedMotor) {
      const motorStr = `%${currentFilters.selectedMotor.name}%`;
      query = query.or(`title.ilike.${motorStr},description.ilike.${motorStr}`);
    }

    if (currentFilters.selectedPaket) {
      const paketStr = `%${currentFilters.selectedPaket.name}%`;
      query = query.or(`title.ilike.${paketStr},description.ilike.${paketStr}`);
    }

    // Kasa Tipi Filter (Multi-select - Case Insensitive & Trimmed)
    if (currentFilters.selectedBodyTypes && currentFilters.selectedBodyTypes.length > 0) {
      const bodyTypeFilters = currentFilters.selectedBodyTypes
        .map(type => `body_type.ilike.%${type.trim()}%`)
        .join(',');
      query = query.or(bodyTypeFilters);
    }

    // Ağır Hasar Filter (Direct Column)
    if (currentFilters.selectedDamageStatus && currentFilters.selectedDamageStatus.length > 0) {
      const hasEvet = currentFilters.selectedDamageStatus.includes('Evet');
      const hasHayir = currentFilters.selectedDamageStatus.includes('Hayır');

      if (hasEvet && !hasHayir) {
        query = query.eq('heavy_damage', 'Evet');
      } else if (!hasEvet && hasHayir) {
        query = query.eq('heavy_damage', 'Hayır');
      }
    }

    // Keyword Search (Multi-column)
    if (currentFilters.search) {
      const searchStr = `%${currentFilters.search}%`;
      query = query.or(`title.ilike.${searchStr},brand.ilike.${searchStr},model.ilike.${searchStr}`);
    }

    return query;
  }, []);

  return {
    filters,
    isModalVisible,
    setIsModalVisible,
    applyFilters,
    resetFilters,
    buildQuery,
  };
}
