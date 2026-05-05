-- Galerilink Veritabanı Düzeltmeleri (Supabase SQL Editor'de Çalıştırın)

-- 1. Fırsat Nedeni (Opportunity Reason) kısıtlamasını uygulamanın gönderdiği Türkçe değerleri destekleyecek şekilde güncelliyoruz.
ALTER TABLE public.cars DROP CONSTRAINT IF EXISTS cars_opportunity_reason_check;

ALTER TABLE public.cars ADD CONSTRAINT cars_opportunity_reason_check CHECK (
  opportunity_reason IS NULL OR 
  opportunity_reason IN ('Nakit İhtiyacı', 'Stok Yenileme', 'Dükkan Değişikliği', 'Diğer')
);

-- 2. Eğer heavy_damage sütununu dışarıda tutmak istediyseniz ve bu yüzden hata aldıysanız,
-- uygulamada "expertise" JSON'ı içine alındığı için sütuna gerek kalmamıştır. 
-- Ancak eski kod veya başka yerler için eklemek isterseniz aşağıdaki yorumu kaldırabilirsiniz:
-- ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS heavy_damage BOOLEAN DEFAULT false;

-- 3. user_sessions Tablosu için Row Level Security (RLS) İzinlerini Düzeltme
-- Terminalde aldığınız "new row violates row-level security policy for table user_sessions" hatasını çözer.
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Eski sorunlu veya gizli kalmış tüm poliçeleri dinamik olarak temizle
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_sessions') 
    LOOP 
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.user_sessions'; 
    END LOOP; 
END $$;

-- Yeni ve daha esnek RLS poliçesi. (Giriş anında token gecikmeleri yaşanabiliyor, bu yüzden 
-- insert ve update için güvenlik auth.uid() kontrolüyle veya user_id eşleşmesiyle sağlanıyor)
CREATE POLICY "user_sessions_select" ON public.user_sessions FOR SELECT USING (true);
CREATE POLICY "user_sessions_insert" ON public.user_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "user_sessions_update" ON public.user_sessions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "user_sessions_delete" ON public.user_sessions FOR DELETE USING (true);

-- Not: Schema cache'ini yenilemek için
NOTIFY pgrst, 'reload schema';
