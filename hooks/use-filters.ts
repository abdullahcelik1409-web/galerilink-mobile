import { useState, useCallback } from 'react';

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

  return {
    filters,
    isModalVisible,
    setIsModalVisible,
    applyFilters,
    resetFilters,
  };
}
