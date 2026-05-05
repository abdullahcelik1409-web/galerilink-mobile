import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { SessionManager } from './session-manager';

/**
 * Auth State Tipleri
 */
interface AuthContextType {
  /** Mevcut oturum (null = giriş yapılmamış) */
  session: Session | null;
  /** Mevcut kullanıcı nesnesi */
  user: User | null;
  /** Auth durumu yükleniyor mu? */
  isLoading: boolean;
  /** E-posta + şifre ile giriş */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  /** Galeri bilgileriyle yeni kayıt */
  signUp: (
    email: string,
    password: string,
    metadata: {
      ad_soyad: string;
      galeri_adi: string;
      phone: string;
    }
  ) => Promise<{ error: Error | null }>;
  /** Oturumu kapat */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider — Uygulama genelinde auth state yönetimi.
 * Root layout'ta sarmalayıcı olarak kullanılır.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // İlk yüklemede mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Auth değişikliklerini dinle (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: { ad_soyad: string; galeri_adi: string; phone: string }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // handle_new_user() trigger'ı bu metadata'yı alacak
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (session?.user) {
      const { deviceId } = SessionManager.getDeviceInfo();
      await SessionManager.terminateSession(session.user.id, deviceId);
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        isLoading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Auth context tüketici hook'u.
 * AuthProvider dışında kullanılırsa hata fırlatır.
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
