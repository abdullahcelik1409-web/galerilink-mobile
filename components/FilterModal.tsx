import React, { useCallback, useDeferredValue, useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';
import { TaxonomyFilterResolver } from '@/lib/taxonomy-resolver';
import { TaxonomyLevel } from '@/lib/taxonomy-types';
import { taxonomyCache } from '@/features/taxonomy/api/taxonomy-cache';
import { FilterState } from '@/hooks/use-filters';
import { TURKEY_CITIES } from '@/constants/TurkeyCities';
import MultiSelectModal from './MultiSelectModal';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
interface FilterModalProps {
  isVisible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export default function FilterModal({ isVisible, onClose, onApply, currentFilters }: FilterModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = Colors[theme];
  
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [isDistrictModalVisible, setIsDistrictModalVisible] = useState(false);
  const [isOpenBodyTypes, setIsOpenBodyTypes] = useState(false);
  const [isOpenDamageStatus, setIsOpenDamageStatus] = useState(false);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
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
    setLocalFilters(resetFilters);
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleTaxonomySelect = (level: TaxonomyLevel, item: { id: string, name: string }) => {
    if (level === TaxonomyLevel.KATEGORI) {
      setLocalFilters(prev => ({
        ...prev,
        selectedKategori: item,
        selectedMarka: undefined,
        selectedSeri: undefined,
        selectedModel: undefined,
        selectedMotor: undefined,
        selectedPaket: undefined,
      }));
    } else if (level === TaxonomyLevel.MARKA) {
      setLocalFilters(prev => ({
        ...prev,
        selectedMarka: item,
        selectedSeri: undefined,
        selectedModel: undefined,
        selectedMotor: undefined,
        selectedPaket: undefined,
      }));
    } else if (level === TaxonomyLevel.SERI) {
      setLocalFilters(prev => ({
        ...prev,
        selectedSeri: item,
        selectedModel: undefined,
        selectedMotor: undefined,
        selectedPaket: undefined,
      }));
    } else if (level === TaxonomyLevel.MODEL) {
      setLocalFilters(prev => ({
        ...prev,
        selectedModel: item,
        selectedMotor: undefined,
        selectedPaket: undefined,
      }));
    } else if (level === TaxonomyLevel.MOTOR) {
      setLocalFilters(prev => ({
        ...prev,
        selectedMotor: item,
        selectedPaket: undefined,
      }));
    } else if (level === TaxonomyLevel.PAKET) {
      setLocalFilters(prev => ({
        ...prev,
        selectedPaket: item,
      }));
    }
  };

  const renderSectionTitle = (title: string, icon: keyof typeof Ionicons.prototype.name) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon as any} size={16} color={colors.text} />
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  const formatNumber = (val: string) => {
    if (!val) return "";
    const num = val.toString().replace(/\D/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const renderInput = (
    placeholder: string, 
    value: string, 
    onChange: (val: string) => void, 
    keyboardType: 'default' | 'numeric' = 'default',
    icon?: keyof typeof Ionicons.prototype.name,
    isFormatted: boolean = false
  ) => (
    <View style={[styles.inputWrapper, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: colors.surfaceBorder }]}>
      {icon && <Ionicons name={icon as any} size={18} color={colors.textMuted} style={styles.inputIcon} />}
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={isFormatted ? formatNumber(value) : value}
        onChangeText={(val) => {
          if (keyboardType === 'numeric') {
            const raw = val.replace(/\D/g, '');
            onChange(raw);
          } else {
            onChange(val);
          }
        }}
        keyboardType={keyboardType}
      />
    </View>
  );

  const toggleMultiSelect = (key: 'selectedBodyTypes' | 'selectedDamageStatus', value: string) => {
    setLocalFilters(prev => {
      const current = (prev as any)[key] || [];
      const next = current.includes(value)
        ? current.filter((i: string) => i !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const FilterAccordion = ({ title, icon, children, isOpen, onToggle }: any) => (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity 
        onPress={onToggle}
        activeOpacity={0.7}
        style={[styles.accordionHeader, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: colors.surfaceBorder }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name={icon} size={18} color={colors.text} />
          <Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.accordionContent}>
          {children}
        </View>
      )}
    </View>
  );

  const CheckboxRow = ({ label, isSelected, onToggle }: any) => (
    <TouchableOpacity 
      onPress={onToggle}
      activeOpacity={0.6}
      style={styles.checkboxRow}
    >
      <Text style={[styles.checkboxLabel, { color: isSelected ? colors.text : colors.textSecondary }]}>{label}</Text>
      <View style={[
        styles.checkbox, 
        { 
          borderColor: isSelected ? colors.text : colors.surfaceBorder, 
          backgroundColor: isSelected ? colors.text : 'transparent' 
        }
      ]}>
        {isSelected && <Ionicons name="checkmark" size={14} color={theme === 'dark' ? '#09090B' : '#FAFAFA'} />}
      </View>
    </TouchableOpacity>
  );


  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#09090B' : colors.background, paddingTop: 20 }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Filtrele</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {/* Kelime Arama */}
          <View style={styles.section}>
            {renderSectionTitle('KELİME İLE ARA', 'search-outline')}
            {renderInput('Örn: Hatasız, Boyasız, Takaslık...', localFilters.search, (val) => updateFilter('search', val), 'default')}
          </View>

          {/* Marka & Model (Hiyerarşik - Etiketsiz 5 Seviye) */}
          <View style={styles.section}>
            <TaxonomyDropdown 
              level={TaxonomyLevel.MARKA} 
              value={localFilters.selectedMarka} 
              placeholder="Marka Seçiniz..."
              theme={theme}
              colors={colors}
              onSelect={(item: { id: string; name: string }) => handleTaxonomySelect(TaxonomyLevel.MARKA, item)}
              localFilters={localFilters}
            />
            <TaxonomyDropdown 
              level={TaxonomyLevel.SERI} 
              value={localFilters.selectedSeri} 
              disabled={!localFilters.selectedMarka}
              placeholder="Seri Seçiniz..."
              theme={theme}
              colors={colors}
              onSelect={(item: { id: string; name: string }) => handleTaxonomySelect(TaxonomyLevel.SERI, item)}
              localFilters={localFilters}
            />
            <TaxonomyDropdown 
              level={TaxonomyLevel.MODEL} 
              value={localFilters.selectedModel} 
              disabled={!localFilters.selectedSeri}
              placeholder="Model Seçiniz..."
              theme={theme}
              colors={colors}
              onSelect={(item: { id: string; name: string }) => handleTaxonomySelect(TaxonomyLevel.MODEL, item)}
              localFilters={localFilters}
            />
            <TaxonomyDropdown 
              level={TaxonomyLevel.MOTOR} 
              value={localFilters.selectedMotor} 
              disabled={!localFilters.selectedModel}
              placeholder="Motor Seçiniz..."
              theme={theme}
              colors={colors}
              onSelect={(item: { id: string; name: string }) => handleTaxonomySelect(TaxonomyLevel.MOTOR, item)}
              localFilters={localFilters}
            />
            <TaxonomyDropdown 
              level={TaxonomyLevel.PAKET} 
              value={localFilters.selectedPaket} 
              disabled={!localFilters.selectedMotor}
              placeholder="Paket Seçiniz..."
              theme={theme}
              colors={colors}
              onSelect={(item: { id: string; name: string }) => handleTaxonomySelect(TaxonomyLevel.PAKET, item)}
              localFilters={localFilters}
            />
          </View>

          {/* Kasa Tipi (Accordion) */}
          <View style={styles.section}>
            <FilterAccordion 
              title="KASA TİPİ" 
              icon="car-outline" 
              isOpen={isOpenBodyTypes} 
              onToggle={() => setIsOpenBodyTypes(!isOpenBodyTypes)}
            >
              <View style={styles.checkboxGrid}>
                {["Cabrio", "Coupe", "Coupe 4 kapı", "Hatchback 3 kapı", "Hatchback 5 kapı", "Sedan", "Belirtilmemiş"].map(type => (
                  <CheckboxRow 
                    key={type}
                    label={type}
                    isSelected={localFilters.selectedBodyTypes?.includes(type)}
                    onToggle={() => toggleMultiSelect('selectedBodyTypes', type)}
                  />
                ))}
              </View>
            </FilterAccordion>
          </View>

          {/* Ağır Hasar (Accordion) */}
          <View style={styles.section}>
            <FilterAccordion 
              title="AĞIR HASAR KAYITLI" 
              icon="alert-circle-outline" 
              isOpen={isOpenDamageStatus} 
              onToggle={() => setIsOpenDamageStatus(!isOpenDamageStatus)}
            >
              <View style={styles.checkboxGrid}>
                {["Evet", "Hayır"].map(status => (
                  <CheckboxRow 
                    key={status}
                    label={status}
                    isSelected={localFilters.selectedDamageStatus?.includes(status)}
                    onToggle={() => toggleMultiSelect('selectedDamageStatus', status)}
                  />
                ))}
              </View>
            </FilterAccordion>
          </View>


          {/* Fiyat Aralığı */}
          <View style={styles.section}>
            {renderSectionTitle('FİYAT ARALIĞI (₺)', 'cash-outline')}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                {renderInput('Min', localFilters.minPrice, (val) => updateFilter('minPrice', val), 'numeric', undefined, true)}
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                {renderInput('Max', localFilters.maxPrice, (val) => updateFilter('maxPrice', val), 'numeric', undefined, true)}
              </View>
            </View>
          </View>

          {/* Yıl Aralığı */}
          <View style={styles.section}>
            {renderSectionTitle('MODEL YILI', 'calendar-outline')}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                {renderInput('Min', localFilters.minYear, (val) => updateFilter('minYear', val), 'numeric')}
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                {renderInput('Max', localFilters.maxYear, (val) => updateFilter('maxYear', val), 'numeric')}
              </View>
            </View>
          </View>

          {/* Kilometre Aralığı */}
          <View style={styles.section}>
            {renderSectionTitle('KİLOMETRE', 'speedometer-outline')}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                {renderInput('Min', localFilters.minKm, (val) => updateFilter('minKm', val), 'numeric', undefined, true)}
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                {renderInput('Max', localFilters.maxKm, (val) => updateFilter('maxKm', val), 'numeric', undefined, true)}
              </View>
            </View>
          </View>

          {/* Şehir & İlçe */}
          <View style={styles.section}>
            {renderSectionTitle('LOKASYON', 'map-outline')}
            
            {/* İl Seçimi */}
            <TouchableOpacity 
              style={[styles.inputWrapper, { 
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                borderColor: localFilters.selectedCities?.length ? colors.text : colors.surfaceBorder,
                marginBottom: 12,
                justifyContent: 'space-between'
              }]}
              onPress={() => setIsCityModalVisible(true)}
            >
              <Text style={{ color: localFilters.selectedCities?.length ? colors.text : colors.textMuted, fontSize: 14, fontWeight: localFilters.selectedCities?.length ? '700' : '500' }}>
                {localFilters.selectedCities?.length 
                  ? `${localFilters.selectedCities.length} İl Seçili` 
                  : 'İl Seçiniz (Çoklu)'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>

            {/* İlçe Seçimi */}
            <TouchableOpacity 
              disabled={localFilters.selectedCities?.length !== 1}
              style={[styles.inputWrapper, { 
                backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                borderColor: localFilters.selectedDistricts?.length ? colors.text : colors.surfaceBorder,
                opacity: localFilters.selectedCities?.length === 1 ? 1 : 0.5,
                justifyContent: 'space-between'
              }]}
              onPress={() => setIsDistrictModalVisible(true)}
            >
              <Text style={{ color: localFilters.selectedDistricts?.length ? colors.text : colors.textMuted, fontSize: 14, fontWeight: localFilters.selectedDistricts?.length ? '700' : '500' }}>
                {localFilters.selectedDistricts?.length 
                  ? `${localFilters.selectedDistricts.length} İlçe Seçili` 
                  : (localFilters.selectedCities?.length === 1 ? 'İlçe Seçiniz (Çoklu)' : 'İlçe (Sadece tek il için)')}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Modallar */}
          <MultiSelectModal
            isVisible={isCityModalVisible}
            onClose={() => setIsCityModalVisible(false)}
            title="İl Seçimi"
            items={TURKEY_CITIES.map(c => c.name)}
            selectedItems={localFilters.selectedCities || []}
            onApply={(selected) => {
              setLocalFilters(prev => ({
                ...prev,
                selectedCities: selected,
                // KRİTİK: Eğer seçilen il sayısı 1 değilse ilçeleri temizle
                selectedDistricts: selected.length === 1 ? prev.selectedDistricts : []
              }));
            }}
          />

          <MultiSelectModal
            isVisible={isDistrictModalVisible}
            onClose={() => setIsDistrictModalVisible(false)}
            title="İlçe Seçimi"
            items={localFilters.selectedCities?.length === 1 
              ? TURKEY_CITIES.find(c => c.name === localFilters.selectedCities![0])?.districts || []
              : []
            }
            selectedItems={localFilters.selectedDistricts || []}
            onApply={(selected) => {
              setLocalFilters(prev => ({
                ...prev,
                selectedDistricts: selected
              }));
            }}
          />
        </ScrollView>

        {/* Footer Actions */}
        <View style={[styles.footer, { 
          backgroundColor: theme === 'dark' ? '#18181B' : colors.surface, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
          borderTopColor: colors.surfaceBorder 
        }]}>
          <TouchableOpacity onPress={handleReset} style={[styles.resetButton, { borderColor: colors.surfaceBorder }]}>
            <Text style={[styles.resetButtonText, { color: colors.text }]}>Sıfırla</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleApply} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Sonuçları Gör</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const TaxonomyDropdownRow = React.memo(({ item, isSelected, colors, onSelect }: any) => (
  <TouchableOpacity style={styles.itemRow} onPress={() => onSelect(item)}>
    <Text style={{ color: colors.text, fontSize: 16, fontWeight: isSelected ? '700' : '500' }}>
      {item.name}
    </Text>
    {isSelected && <Ionicons name="checkmark" size={20} color={colors.text} />}
  </TouchableOpacity>
));

const TaxonomyDropdown = ({ level, value, disabled, placeholder, theme, colors, onSelect, localFilters }: any) => {
  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const cacheKey = useMemo(() => {
    if (level === TaxonomyLevel.MARKA) return `${level}:all`;
    if (level === TaxonomyLevel.SERI) return `${level}:${localFilters.selectedMarka?.name ?? ''}`;
    if (level === TaxonomyLevel.MODEL) return `${level}:${localFilters.selectedMarka?.name ?? ''}:${localFilters.selectedSeri?.name ?? ''}`;
    if (level === TaxonomyLevel.MOTOR) return `${level}:${localFilters.selectedModel?.name ?? ''}`;
    if (level === TaxonomyLevel.PAKET) return `${level}:${localFilters.selectedMotor?.name ?? ''}`;
    return `${level}:unknown`;
  }, [level, localFilters.selectedMarka?.name, localFilters.selectedSeri?.name, localFilters.selectedModel?.name, localFilters.selectedMotor?.name]);

  const fetchItems = useCallback(async () => {
    if (disabled) return;
    setVisible(true);
    setLoading(true);
    try {
      const uniqueData = await taxonomyCache.get(cacheKey, async () => {
        if (level === TaxonomyLevel.MARKA) {
          return TaxonomyFilterResolver.fetchMarkalar();
        }
        if (level === TaxonomyLevel.SERI) {
          return TaxonomyFilterResolver.fetchSeriler(localFilters.selectedMarka!.name);
        }
        if (level === TaxonomyLevel.MODEL) {
          return TaxonomyFilterResolver.fetchModeller(localFilters.selectedSeri!.name, localFilters.selectedMarka!.name);
        }
        if (level === TaxonomyLevel.MOTOR) {
          return TaxonomyFilterResolver.fetchMotorlar(localFilters.selectedModel!.name);
        }
        if (level === TaxonomyLevel.PAKET) {
          return TaxonomyFilterResolver.fetchPaketler(localFilters.selectedMotor!.name);
        }
        return [];
      });
      setItems(uniqueData);
    } catch (e) {
      console.error('[FilterModal] Taxonomy sync fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, disabled, level, localFilters.selectedMarka, localFilters.selectedSeri, localFilters.selectedModel, localFilters.selectedMotor]);

  const filteredItems = useMemo(() => {
    if (!deferredSearch.trim()) return items;
    const normalizedSearch = deferredSearch.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(normalizedSearch));
  }, [items, deferredSearch]);

  const handleSelect = useCallback((item: any) => {
    onSelect(item);
    setVisible(false);
  }, [onSelect]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <TaxonomyDropdownRow
      item={item}
      isSelected={value?.id === item.id}
      colors={colors}
      onSelect={handleSelect}
    />
  ), [colors, handleSelect, value?.id]);

  return (
    <View style={{ marginBottom: 12 }}>
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={fetchItems}
        disabled={disabled}
        style={[
          styles.inputWrapper, 
          { 
            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
            borderColor: value ? colors.text : colors.surfaceBorder,
            opacity: disabled ? 0.5 : 1,
            justifyContent: 'space-between'
          }
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: 14, fontWeight: value ? '700' : '500' }}>
            {value ? value.name : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme === 'dark' ? '#18181B' : colors.background, borderTopColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }} /> 
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
              <View style={[styles.searchBar, { backgroundColor: theme === 'dark' ? '#09090B' : colors.surface, borderColor: colors.surfaceBorder }]}>
                <Ionicons name="search" size={18} color={colors.textMuted} />
                <TextInput
                  style={{ flex: 1, color: colors.text, fontSize: 14 }}
                  placeholder="Ara..."
                  placeholderTextColor={colors.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
            </View>

            {loading ? (
              <ActivityIndicator color={colors.text} style={{ marginVertical: 40 }} />
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
                renderItem={renderItem}
                initialNumToRender={12}
                maxToRenderPerBatch={8}
                updateCellsBatchingPeriod={50}
                ListEmptyComponent={
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <Text style={{ color: colors.textMuted }}>Sonuç bulunamadı.</Text>
                  </View>
                }
              />
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
    opacity: 0.8,
  },
  inputWrapper: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  resetButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  applyButton: {
    flex: 2,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981', // Premium Emerald Green
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    minHeight: '50%',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
  },
  accordionTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  accordionContent: {
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: '48%',
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
