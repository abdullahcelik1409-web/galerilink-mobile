import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@galerilink_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<'light' | 'dark'>(systemColorScheme ?? 'dark');

  useEffect(() => {
    // Kayıtlı temayı yükle
    const loadTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedMode) {
          setModeState(savedMode as ThemeMode);
        }
      } catch (e) {
        console.error('Tema yüklenirken hata oluştu:', e);
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    // Mod değiştiğinde veya sistem teması değiştiğinde aktif temayı güncelle
    if (mode === 'system') {
      setTheme(systemColorScheme ?? 'dark');
    } else {
      setTheme(mode);
    }
  }, [mode, systemColorScheme]);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch (e) {
      console.error('Tema kaydedilirken hata oluştu:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
