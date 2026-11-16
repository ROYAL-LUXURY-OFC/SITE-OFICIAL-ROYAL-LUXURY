-- ROYAL LUXURY: nome real dos candidatos no recrutamento
-- Execute no SQL Editor do Supabase antes de receber novas inscrições.

ALTER TABLE public.inscricoes_rlx
ADD COLUMN IF NOT EXISTS nome_real text;

COMMENT ON COLUMN public.inscricoes_rlx.nome_real IS
'Nome real completo informado pelo candidato no formulário de recrutamento.';
