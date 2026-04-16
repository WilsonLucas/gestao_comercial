-- ============================================================
-- 009_hotfix2_restore_vendas_grants.sql
-- ============================================================
-- Motivo: a migration 009_painel_cliente.sql executou
-- REVOKE ALL ON vendas FROM anon + GRANT SELECT (colunas_especificas).
-- A intencao era defesa em profundidade para o painel TV publico, mas o
-- restante do sistema (Cozinha, PDV, Financeiro, Dashboard) tambem usa o
-- role 'anon' porque o projeto NAO usa Supabase Auth nativo (ver ADR-03).
--
-- Consequencia: qualquer SELECT em vendas que leia colunas fora da lista
-- branca (total, custo_total, lucro, operador_id, observacao via itens_venda)
-- retorna "permission denied for table vendas" — quebrando cozinha.js,
-- historico-dia.js e financeiro.js.
--
-- Este hotfix restaura os grants amplos em vendas. A protecao do painel
-- TV publico continua garantida por:
--   1. A view painel_cliente_view expoe apenas colunas seguras
--   2. A policy RLS painel_anon_select restringe linhas (hoje + ativas)
--   3. As RPCs de transicao (marcar_*) continuam SECURITY DEFINER
--
-- Defesa-em-profundidade em nivel de coluna so faz sentido quando houver
-- separacao real de roles (Supabase Auth) — pos-MVP.
-- ============================================================

BEGIN;

-- Restaura grants amplos em vendas para o role anon
GRANT SELECT, INSERT, UPDATE ON vendas TO anon;

-- itens_venda segue o mesmo principio — garantimos acesso amplo
GRANT SELECT, INSERT ON itens_venda TO anon;

-- A view painel_cliente_view ja tem SELECT para anon (migration 009)
-- e expoe apenas colunas seguras — mantida como esta.

-- Policy painel_anon_select continua existindo e restringe as linhas
-- que o role anon consegue ler na tabela vendas a pedidos ativos do dia.
-- Outras policies (vendas_operador_insert, vendas_operador_select) continuam
-- controlando escritas e leituras por perfil via get_perfil().

-- Verificacao pos-commit (informativa):
-- SELECT grantee, privilege_type, column_name
--   FROM information_schema.column_privileges
--  WHERE table_name = 'vendas' AND grantee = 'anon'
--  ORDER BY column_name;
-- Esperado: todas as colunas de vendas listadas com SELECT/INSERT/UPDATE.

COMMIT;
