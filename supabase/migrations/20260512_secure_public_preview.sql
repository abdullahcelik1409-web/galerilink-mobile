-- =============================================
-- Güvenli Müşteri Önizleme Linki — RPC Güncelleme
-- =============================================
-- Amaç: Public preview linkinden erişilen ilanların
-- SADECE araçla ilgili teknik bilgilerini döndür.
--
-- KALDIRILAN (hassas) alanlar:
--   ❌ price_b2b      → B2B fiyat
--   ❌ seller_id      → Satıcı kimliği
--   ❌ location_city  → Konum (İl)
--   ❌ location_district → Konum (İlçe)
--   ❌ description    → İlan açıklaması
--
-- DÖNDÜRÜLEN (güvenli) alanlar:
--   ✅ brand, model, series, year, km
--   ✅ fuel, transmission, body_type, engine
--   ✅ heavy_damage, damage_report
--   ✅ images, title, expertise
-- =============================================

-- Mevcut fonksiyonu kaldır (dönüş tipi değiştiği için zorunlu)
DROP FUNCTION IF EXISTS public.fn_get_masked_listing(UUID);

-- Güvenli versiyonu oluştur
CREATE OR REPLACE FUNCTION public.fn_get_masked_listing(p_masked_slug UUID)
RETURNS TABLE (
  brand TEXT,
  model TEXT,
  series TEXT,
  year INTEGER,
  km INTEGER,
  fuel TEXT,
  transmission TEXT,
  body_type TEXT,
  engine TEXT,
  heavy_damage TEXT,
  damage_report TEXT,
  images TEXT[],
  title TEXT,
  expertise JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.brand,
    c.model,
    c.series,
    c.year,
    c.km,
    c.fuel,
    c.transmission,
    c.body_type,
    c.engine,
    c.heavy_damage,
    c.damage_report,
    c.images,
    c.title,
    c.expertise
  FROM public.cars c
  WHERE c.masked_slug = p_masked_slug 
    AND c.is_active = true
    AND c.status = 'published'
  LIMIT 1;
END;
$$;

-- Anonim (giriş yapmamış) kullanıcılar da erişebilmeli
GRANT EXECUTE ON FUNCTION public.fn_get_masked_listing(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_get_masked_listing(UUID) TO authenticated;

-- Schema cache yenilemesi
NOTIFY pgrst, 'reload schema';
