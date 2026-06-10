-- trial_ends_at NULL olan kayıtları created_at + 14 gün ile doldur
UPDATE public.profiles
SET trial_ends_at = created_at + interval '14 days'
WHERE trial_ends_at IS NULL;

-- Gelecekte NULL kalmasın
ALTER TABLE public.profiles
ALTER COLUMN trial_ends_at
SET DEFAULT (now() + interval '14 days');
