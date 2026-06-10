-- profiles tablosunda trial_ends_at sütununa varsayılan değer tanımlıyoruz
ALTER TABLE public.profiles 
ALTER COLUMN trial_ends_at 
SET DEFAULT (now() + interval '14 days');

-- Mevcut NULL olan kayıtları created_at üzerinden dolduruyoruz
UPDATE public.profiles 
SET trial_ends_at = created_at + interval '14 days'
WHERE trial_ends_at IS NULL;

-- handle_new_user fonksiyonunu güncelleyip trial_ends_at ve subscription_status alanlarını entegre ediyoruz
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    ad_soyad, 
    galeri_adi, 
    phone, 
    hesap_durumu, 
    status, 
    trial_ends_at, 
    subscription_status
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'ad_soyad',
    new.raw_user_meta_data->>'galeri_adi',
    new.raw_user_meta_data->>'phone',
    'beklemede',
    'pending_approval',
    now() + interval '14 days',
    'trial'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    trial_ends_at = COALESCE(public.profiles.trial_ends_at, EXCLUDED.trial_ends_at),
    subscription_status = COALESCE(public.profiles.subscription_status, EXCLUDED.subscription_status);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
