import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Pressable,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useTheme } from '@/lib/theme-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MultiSelectModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  items: string[];
  selectedItems: string[];
  onApply: (selected: string[]) => void;
  placeholder?: string;
}

export default function MultiSelectModal({
  isVisible,
  onClose,
  title,
  items,
  selectedItems: initialSelected,
  onApply,
  placeholder = "Ara...",
}: MultiSelectModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = Colors[theme];

  const [tempSelected, setTempSelected] = useState<string[]>(initialSelected);
  const [search, setSearch] = useState('');

  // Sync state when modal opens
  React.useEffect(() => {
    if (isVisible) {
      setTempSelected(initialSelected);
      setSearch('');
    }
  }, [isVisible, initialSelected]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter(item => 
      item.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR'))
    );
  }, [items, search]);

  const toggleItem = (item: string) => {
    setTempSelected(prev => {
      if (prev.includes(item)) {
        return prev.filter(i => i !== item);
      } else {
        return [...prev, item];
      }
    });
  };

  const handleApply = () => {
    onApply(tempSelected);
    onClose();
  };

  const handleClear = () => {
    setTempSelected([]);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable 
          style={[
            styles.content, 
            { 
              backgroundColor: theme === 'dark' ? '#18181B' : colors.background,
              paddingBottom: insets.bottom + 20
            }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: colors.textSecondary, fontSize: 16 }}>İptal</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={handleApply}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Uygula</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: theme === 'dark' ? '#27272A' : colors.surface, borderColor: colors.surfaceBorder }]}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={placeholder}
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoFocus={false}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Selected Count & Clear */}
          <View style={styles.infoRow}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {tempSelected.length} Seçili
            </Text>
            {tempSelected.length > 0 && (
              <TouchableOpacity onPress={handleClear}>
                <Text style={{ color: '#EF4444', fontSize: 13, fontWeight: '600' }}>Temizle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filteredItems}
            keyExtractor={item => item}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = tempSelected.includes(item);
              return (
                <TouchableOpacity 
                  style={[styles.itemRow, { borderBottomColor: colors.surfaceBorder + '40' }]} 
                  onPress={() => toggleItem(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.itemText, { color: isSelected ? colors.text : colors.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>
                    {item}
                  </Text>
                  <View style={[
                    styles.checkbox, 
                    { 
                      borderColor: isSelected ? colors.text : colors.textMuted + '40',
                      backgroundColor: isSelected ? colors.text : 'transparent'
                    }
                  ]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={theme === 'dark' ? '#09090B' : '#FAFAFA'} />}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 64,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  itemText: {
    fontSize: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
