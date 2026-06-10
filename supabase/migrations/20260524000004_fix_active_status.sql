-- ============================================================
-- 'active' Status Temizliği
-- 'active' status hiçbir yerde kullanılmadığı için RLS'den kaldırılıyor
-- Sadece trial (süre kontrolü ile) ve ücretli paketler (lite, pro, enterprise) kalıyor
-- ============================================================

-- 1. Varsa eski politikaları temizle
DROP POLICY IF EXISTS "subscription_insert_cars" ON public.cars;
DROP POLICY IF EXISTS "subscription_insert_cars_drafts" ON public.cars_drafts;

-- 2. cars tablosu — INSERT politikası ('active' olmadan)
CREATE POLICY "subscription_insert_cars"
  ON public.cars
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          (
            profiles.subscription_status = 'trial'
            AND profiles.trial_ends_at > now()
          )
          OR profiles.subscription_status IN ('lite', 'pro', 'enterprise')
        )
    )
  );

-- 3. cars_drafts tablosu — INSERT politikası ('active' olmadan)
CREATE POLICY "subscription_insert_cars_drafts"
  ON public.cars_drafts
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          (
            profiles.subscription_status = 'trial'
            AND profiles.trial_ends_at > now()
          )
          OR profiles.subscription_status IN ('lite', 'pro', 'enterprise')
        )
    )
  );
