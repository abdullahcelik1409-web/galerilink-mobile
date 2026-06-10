-- ============================================================
-- Sunucu Saati RPC Fonksiyonu
-- İstemci tarafında güvenli süre hesaplamaları için
-- ============================================================

-- Sunucu saatini döndüren RPC fonksiyonu
CREATE OR REPLACE FUNCTION public.fn_get_server_time()
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT now();
$$;

-- Authenticated ve anonymous kullanıcılar erişebilir
GRANT EXECUTE ON FUNCTION public.fn_get_server_time() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_server_time() TO anon;
