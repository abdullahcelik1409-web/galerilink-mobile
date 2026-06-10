import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';
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
  /** Kullanıcı profili */
  profile: any;
  /** Deneme süresi bitiş tarihi */
  trialEndDate: string | null;
  /** Deneme süresine kalan gün sayısı */
  daysRemaining: number | null;
  /** Deneme süresi doldu mu? */
  isTrialExpired: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider — Uygulama genelinde auth state yönetimi.
 * Root layout'ta sarmalayıcı olarak kullanılır.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingUsers = useRef<string | null>(null);

  const fetchProfile = async (userId: string) => {
    if (fetchingUsers.current === userId) {
      return;
    }
    fetchingUsers.current = userId;
    try {
      // Sunucu saatini ve profili paralel olarak çek (güvenlik için istemci saati yerine)
      const [profileResult, serverTimeResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.rpc('fn_get_server_time')
      ]);

      const { data, error } = profileResult;
      const serverNow = serverTimeResult.data ? new Date(serverTimeResult.data).getTime() : Date.now();

      if (data) {
        setProfile(data);
        // trial_ends_at yoksa created_at'tan hesapla
        const trialEndDateVal = data.trial_ends_at ?? 
          (data.created_at 
            ? new Date(
                new Date(data.created_at).getTime() + 14 * 24 * 60 * 60 * 1000
              ).toISOString()
            : null);
        
        const safeParsDate = (dateStr: string | null): number | null => {
          if (!dateStr) return null;
          const parsed = Date.parse(dateStr);
          if (isNaN(parsed)) return null;
          return parsed;
        };

        const trialEndTimestamp = safeParsDate(trialEndDateVal);

        const daysRemainingVal = trialEndTimestamp !== null
          ? Math.max(0, Math.ceil(
              (trialEndTimestamp - serverNow) / (1000 * 60 * 60 * 24)
            ))
          : null;

        const isTrialExpiredVal =
          data.subscription_status === 'expired' ||
          (trialEndDateVal !== null && daysRemainingVal === 0);

        setTrialEndDate(trialEndDateVal);
        setDaysRemaining(daysRemainingVal);
        setIsTrialExpired(isTrialExpiredVal);

        if (isTrialExpiredVal && data.subscription_status === 'trial') {
          await supabase
            .from('profiles')
            .update({ subscription_status: 'expired' })
            .eq('id', data.id);
          setProfile((prev: any) => prev ? { ...prev, subscription_status: 'expired' } : null);
        }
      }
    } catch (e) {
      console.error('Error fetching profile:', e);
    } finally {
      fetchingUsers.current = null;
    }
  };

  useEffect(() => {
    // İlk yüklemede mevcut oturumu kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setTrialEndDate(null);
        setDaysRemaining(null);
        setIsTrialExpired(false);
      }
      setIsLoading(false);
    });

    // Auth değişikliklerini dinle (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      }
      if (event === 'SIGNED_OUT' || !session?.user) {
        setProfile(null);
        setTrialEndDate(null);
        setDaysRemaining(null);
        setIsTrialExpired(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  }, []);

  const signUp = useCallback(async (
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
  }, []);

  const signOut = useCallback(async () => {
    if (session?.user) {
      const deviceId = await SessionManager.getDeviceId();
      await SessionManager.terminateSession(session.user.id, deviceId);
    }
    await supabase.auth.signOut();
  }, [session?.user]);

  const authValue = useMemo(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    signIn,
    signUp,
    signOut,
    profile,
    trialEndDate,
    daysRemaining,
    isTrialExpired,
  }), [
    daysRemaining,
    isLoading,
    isTrialExpired,
    profile,
    session,
    signIn,
    signOut,
    signUp,
    trialEndDate,
  ]);

  return (
    <AuthContext.Provider value={authValue}>
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
