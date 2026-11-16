-- ROYAL LUXURY: hierarquia administrativa
-- Execute este arquivo no SQL Editor do Supabase antes de usar a aba ADMINS.

ALTER TABLE public.admins_rlx
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS nick text,
  ADD COLUMN IF NOT EXISTS cargo text NOT NULL DEFAULT 'Administrador',
  ADD COLUMN IF NOT EXISTS criado_em timestamptz NOT NULL DEFAULT now();

UPDATE public.admins_rlx a
SET email = u.email
FROM auth.users u
WHERE a.user_id = u.id AND a.email IS NULL;

-- Vincula as duas contas informadas. A migration falha com aviso se uma conta ainda não existir no Auth.
DO $$
DECLARE leader_id uuid;
DECLARE interim_id uuid;
BEGIN
  SELECT id INTO leader_id FROM auth.users WHERE lower(email) = lower('thaliacristinalacerdarodrigues@gmail.com') LIMIT 1;
  SELECT id INTO interim_id FROM auth.users WHERE lower(email) = lower('fernandon4321@gmail.com') LIMIT 1;

  IF leader_id IS NULL THEN
    RAISE EXCEPTION 'A conta do líder (LDZ POCOYO) ainda não existe no Supabase Auth. Crie a conta primeiro.';
  END IF;
  IF interim_id IS NULL THEN
    RAISE EXCEPTION 'A conta do líder interino ainda não existe no Supabase Auth. Crie a conta primeiro.';
  END IF;

  INSERT INTO public.admins_rlx (user_id, email, nick, cargo)
  VALUES (leader_id, 'thaliacristinalacerdarodrigues@gmail.com', 'LDZ POCOYO', 'Líder')
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, nick = EXCLUDED.nick, cargo = EXCLUDED.cargo;

  INSERT INTO public.admins_rlx (user_id, email, nick, cargo)
  VALUES (interim_id, 'fernandon4321@gmail.com', 'Líder interino', 'Líder interino')
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, nick = EXCLUDED.nick, cargo = EXCLUDED.cargo;
END $$;

ALTER TABLE public.admins_rlx ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.listar_admins_rlx()
RETURNS TABLE (user_id uuid, email text, nick text, cargo text, criado_em timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admins_rlx WHERE admins_rlx.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;
  RETURN QUERY
    SELECT a.user_id, a.email, a.nick, a.cargo, a.criado_em
    FROM public.admins_rlx a
    ORDER BY CASE a.cargo
      WHEN 'Líder' THEN 1 WHEN 'Líder interino' THEN 2
      WHEN 'Vice-líder' THEN 3 ELSE 4 END, a.nick;
END;
$$;

CREATE OR REPLACE FUNCTION public.gerenciar_admin_rlx(
  p_email text,
  p_nick text DEFAULT NULL,
  p_cargo text DEFAULT NULL,
  p_acao text DEFAULT 'salvar'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE actor_role text;
DECLARE target_id uuid;
DECLARE target_role text;
DECLARE normalized_email text := lower(trim(p_email));
BEGIN
  SELECT cargo INTO actor_role
  FROM public.admins_rlx WHERE user_id = auth.uid();

  IF actor_role IS NULL OR actor_role NOT IN ('Líder', 'Líder interino') THEN
    RAISE EXCEPTION 'Seu cargo não permite gerenciar administradores.';
  END IF;

  IF p_acao NOT IN ('salvar', 'remover') THEN
    RAISE EXCEPTION 'Ação inválida.';
  END IF;

  SELECT id INTO target_id FROM auth.users WHERE lower(email) = normalized_email LIMIT 1;
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'Não existe uma conta com esse e-mail no Supabase Auth.';
  END IF;

  SELECT cargo INTO target_role FROM public.admins_rlx WHERE user_id = target_id;

  IF actor_role = 'Líder interino' AND target_role IN ('Líder', 'Líder interino') THEN
    RAISE EXCEPTION 'Líder interino não pode alterar cargos de liderança.';
  END IF;

  IF p_acao = 'remover' THEN
    IF target_role = 'Líder' THEN
      RAISE EXCEPTION 'O líder principal não pode ser removido por esta tela.';
    END IF;
    IF actor_role = 'Líder interino' AND target_role = 'Líder interino' THEN
      RAISE EXCEPTION 'Você não pode remover seu próprio cargo de liderança.';
    END IF;
    DELETE FROM public.admins_rlx WHERE user_id = target_id;
    RETURN 'Acesso administrativo removido.';
  END IF;

  IF p_cargo NOT IN ('Líder', 'Líder interino', 'Vice-líder', 'Administrador') THEN
    RAISE EXCEPTION 'Cargo inválido.';
  END IF;

  IF actor_role = 'Líder interino' AND p_cargo IN ('Líder', 'Líder interino') THEN
    RAISE EXCEPTION 'Líder interino só pode atribuir Vice-líder ou Administrador.';
  END IF;

  IF p_cargo = 'Líder' AND actor_role <> 'Líder' THEN
    RAISE EXCEPTION 'Somente o líder principal pode atribuir o cargo de líder.';
  END IF;

  IF p_cargo = 'Líder' AND EXISTS (
    SELECT 1 FROM public.admins_rlx WHERE cargo = 'Líder' AND user_id <> target_id
  ) THEN
    RAISE EXCEPTION 'Já existe um líder principal cadastrado.';
  END IF;

  INSERT INTO public.admins_rlx (user_id, email, nick, cargo)
  VALUES (target_id, normalized_email, COALESCE(NULLIF(trim(p_nick), ''), normalized_email), p_cargo)
  ON CONFLICT (user_id) DO UPDATE
    SET email = EXCLUDED.email, nick = EXCLUDED.nick, cargo = EXCLUDED.cargo;

  RETURN 'Cargo administrativo atualizado.';
END;
$$;

REVOKE ALL ON FUNCTION public.listar_admins_rlx() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.gerenciar_admin_rlx(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.listar_admins_rlx() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gerenciar_admin_rlx(text, text, text, text) TO authenticated;
