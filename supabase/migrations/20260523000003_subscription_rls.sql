-- ============================================================
-- Subscription RLS — cars & cars_drafts INSERT politikaları
-- Sadece aktif aboneliği veya geçerli trial'ı olan kullanıcılar
-- ilan ekleyebilir.
-- ============================================================

-- 1. RLS'in açık olduğundan emin ol
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cars_drafts ENABLE ROW LEVEL SECURITY;

-- 2. Varsa eski politikaları temizle (idempotent)
DROP POLICY IF EXISTS "subscription_insert_cars" ON public.cars;
DROP POLICY IF EXISTS "subscription_insert_cars_drafts" ON public.cars_drafts;

-- 3. cars tablosu — INSERT politikası (Restrictive)
CREATE POLICY "subscription_insert_cars"
  ON public.cars
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.subscription_status = 'active'
          OR (
            profiles.subscription_status = 'trial'
            AND profiles.trial_ends_at > now()
          )
        )
    )
  );

-- 4. cars_drafts tablosu — INSERT politikası (Restrictive)
CREATE POLICY "subscription_insert_cars_drafts"
  ON public.cars_drafts
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.subscription_status = 'active'
          OR (
            profiles.subscription_status = 'trial'
            AND profiles.trial_ends_at > now()
          )
        )
    )
  );
