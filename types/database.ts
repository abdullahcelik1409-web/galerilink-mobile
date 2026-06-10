/**
 * Galerilink — Supabase Veritabanı Tipleri
 * Mevcut şemaya uygun TypeScript arayüzleri.
 */

/** Galericinin profil bilgileri */
export interface Profile {
  id: string;
  ad_soyad: string | null;
  galeri_adi: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  tax_no: string | null;
  yetki_belge_no: string | null;
  vergi_levhasi_url: string | null;
  city: string | null;
  district: string | null;
  hesap_durumu: 'beklemede' | 'onaylandi' | 'reddedildi';
  status: 'pending_approval' | 'approved' | 'rejected';
  subscription_status: 'trial' | 'lite' | 'pro' | 'enterprise' | 'expired';
  trial_ends_at: string | null;
  max_sessions?: number;
  expo_push_token?: string | null;
  created_at: string;
}

/** Araç ilanı */
export interface Car {
  id: string;
  seller_id: string;
  brand: string;
  model: string;
  year: number;
  km: number;
  damage_report: string | null;
  price_b2b: number;
  images: string[];
  location_city: string | null;
  location_district: string | null;
  title: string | null;
  expertise: Record<string, unknown>;
  description: string | null;
  status: 'draft' | 'published';
  is_active?: boolean;
  is_opportunity?: boolean;
  opportunity_reason?: string | null;
  opportunity_expires_at?: string | null;
  is_trade_closed?: boolean;
  created_at: string;
}

/** Mesajlaşma — Konuşma */
export interface Conversation {
  id: string;
  car_id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  created_at: string;
}

/** Mesajlaşma — Tekil mesaj */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/** Engelleme kaydı */
export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/** Araç taksonomi düğümü */
export interface CarTaxonomy {
  id: string;
  parent_id: string | null;
  level: number;
  name: string;
  slug: string;
  status: 'active' | 'pending';
  created_at: string;
}
