-- ROYAL LUXURY: capas das lines e armazenamento de imagens
ALTER TABLE public.lines_rlx
ADD COLUMN IF NOT EXISTS capa_url text;

-- Bucket público para exibir as capas no site.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'line-covers',
  'line-covers',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Qualquer visitante pode visualizar as capas.
DROP POLICY IF EXISTS "Capas RLX publicas para leitura" ON storage.objects;
CREATE POLICY "Capas RLX publicas para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'line-covers');

-- Somente administradores autenticados podem enviar, alterar ou excluir capas.
DROP POLICY IF EXISTS "Admins RLX podem enviar capas" ON storage.objects;
CREATE POLICY "Admins RLX podem enviar capas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'line-covers' AND public.is_admin_rlx());

DROP POLICY IF EXISTS "Admins RLX podem atualizar capas" ON storage.objects;
CREATE POLICY "Admins RLX podem atualizar capas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'line-covers' AND public.is_admin_rlx())
WITH CHECK (bucket_id = 'line-covers' AND public.is_admin_rlx());

DROP POLICY IF EXISTS "Admins RLX podem excluir capas" ON storage.objects;
CREATE POLICY "Admins RLX podem excluir capas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'line-covers' AND public.is_admin_rlx());
