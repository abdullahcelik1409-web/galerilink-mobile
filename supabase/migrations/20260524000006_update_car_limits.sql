-- ============================================================
-- ABONELİK PAKETİ LİMİT KONTROLÜ GÜNCELLEMESİ
-- Güncel limitler: trial=5, lite=10, pro=30, enterprise=sınırsız
-- ============================================================

-- Mevcut trigger'ı kaldır
DROP TRIGGER IF EXISTS trg_check_car_listing_limit ON public.cars;

-- Mevcut fonksiyonu kaldır
DROP FUNCTION IF EXISTS public.fn_check_car_listing_limit();

-- Yeni fonksiyon: Güncellenmiş limitler ve Enterprise bypass
CREATE OR REPLACE FUNCTION public.fn_check_car_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_subscription_status TEXT;
  v_active_car_count INTEGER;
  v_max_limit INTEGER;
BEGIN
  -- Sadece yeni eklemeleri kontrol et
  IF TG_OP = 'INSERT' THEN

    -- Kullanıcının abonelik paketini al
    SELECT subscription_status INTO v_subscription_status
    FROM public.profiles
    WHERE id = NEW.seller_id;

    -- Eğer değer yoksa varsayılan olarak 'trial' kabul et
    IF v_subscription_status IS NULL THEN
      v_subscription_status := 'trial';
    END IF;

    -- Enterprise kullanıcılar için limit kontrolünü tamamen atla
    IF v_subscription_status = 'enterprise' THEN
      RETURN NEW;
    END IF;

    -- Kullanıcının mevcut aktif ilan sayısını bul
    SELECT COUNT(*) INTO v_active_car_count
    FROM public.cars
    WHERE seller_id = NEW.seller_id
      AND is_active = true;

    -- Paketlere göre limit belirle (Enterprise hariç, zaten yukarıda bypass edildi)
    CASE v_subscription_status
      WHEN 'trial' THEN v_max_limit := 5;
      WHEN 'lite' THEN v_max_limit := 10;
      WHEN 'pro' THEN v_max_limit := 30;
      ELSE v_max_limit := 5;  -- Bilinmeyen paketler için varsayılan
    END CASE;

    -- Limit aşımı kontrolü
    IF v_active_car_count >= v_max_limit THEN
      RAISE EXCEPTION 'İlan sınırınıza (% ilan) ulaştınız. Lütfen paketinizi yükseltin.', v_max_limit;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı yeniden oluştur
CREATE TRIGGER trg_check_car_listing_limit
  BEFORE INSERT ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_car_listing_limit();
