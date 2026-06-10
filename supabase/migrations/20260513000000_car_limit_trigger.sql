-- ============================================================
-- ABONELİK PAKETİ LİMİT KONTROLÜ MİGRATION (DB SEVİYESİ)
-- ============================================================

-- 1. FONKSİYON: Kullanıcının mevcut paket limitini aşmasını engeller
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

    -- Kullanıcının mevcut aktif ilan sayısını bul
    SELECT COUNT(*) INTO v_active_car_count
    FROM public.cars
    WHERE seller_id = NEW.seller_id
      AND is_active = true;

    -- Paketlere göre limit belirle
    CASE v_subscription_status
      WHEN 'trial' THEN v_max_limit := 5;
      WHEN 'lite' THEN v_max_limit := 10;
      WHEN 'pro' THEN v_max_limit := 30;
      WHEN 'enterprise' THEN v_max_limit := 999999;
      ELSE v_max_limit := 5;
    END CASE;

    -- Limit aşımı kontrolü
    IF v_active_car_count >= v_max_limit THEN
      RAISE EXCEPTION 'İlan sınırınıza (% ilan) ulaştınız. Lütfen paketinizi yükseltin.', v_max_limit;
    END IF;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. TRIGGER: cars tablosunda INSERT öncesi limit kontrolü yapar
DROP TRIGGER IF EXISTS trg_check_car_listing_limit ON public.cars;
CREATE TRIGGER trg_check_car_listing_limit
  BEFORE INSERT ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_car_listing_limit();
