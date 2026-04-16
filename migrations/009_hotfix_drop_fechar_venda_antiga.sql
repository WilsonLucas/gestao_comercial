-- ============================================================
-- 009_hotfix_drop_fechar_venda_antiga.sql
-- ============================================================
-- Motivo: a migration 009_painel_cliente.sql criou
-- fechar_venda(p_itens JSONB, p_operador_id UUID, p_cliente_nome TEXT DEFAULT NULL).
-- Como a assinatura difere da versão anterior (2 args vs 3 args com default),
-- o CREATE OR REPLACE NÃO substitui — cria uma SEGUNDA função.
-- Resultado: PostgREST fica ambíguo ao dispatchar a chamada e retorna
-- "Could not choose the best candidate function between ...".
--
-- Este hotfix remove a versão antiga (2 args). A versão nova (3 args com
-- DEFAULT NULL) continua aceitando chamadas legadas sem p_cliente_nome,
-- mantendo compatibilidade.
-- ============================================================

BEGIN;

DROP FUNCTION IF EXISTS public.fechar_venda(p_itens JSONB, p_operador_id UUID);

-- Verificação (SELECT de controle, não altera estado)
-- Após este COMMIT deve restar apenas 1 função fechar_venda no schema public.
-- SELECT proname, pg_get_function_identity_arguments(oid) AS args
--   FROM pg_proc
--  WHERE proname = 'fechar_venda';

COMMIT;
