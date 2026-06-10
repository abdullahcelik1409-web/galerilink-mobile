import type {
  Car as DatabaseCar,
  CarTaxonomy,
  Conversation,
  Message,
  Profile,
} from './database';

export type { Conversation, Message, Profile };

export type Car = DatabaseCar & {
  series?: string | null;
  fuel?: string | null;
  transmission?: string | null;
  body_type?: string | null;
  engine?: string | null;
  heavy_damage?: string | null;
  package_id?: string | null;
  thumbnail_url?: string | null;
};

export type CarDraft = Partial<Car> & {
  id: string;
  seller_id: string;
  status?: 'draft' | 'published' | string | null;
};

export type TaxonomyNode = CarTaxonomy;

export type SellerProfile = Pick<
  Profile,
  'id' | 'galeri_adi' | 'ad_soyad' | 'company_name' | 'phone' | 'city' | 'district' | 'hesap_durumu'
>;

export type ListingWithSeller = Car & {
  profiles?: SellerProfile | null;
};

export type ListingSourceTable = 'cars' | 'cars_drafts';

export type DraftWithSeller = CarDraft & {
  profiles?: SellerProfile | null;
};

export type ListingDetailRecord = ListingWithSeller | DraftWithSeller;
