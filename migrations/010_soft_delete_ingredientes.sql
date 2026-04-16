-- ============================================================
-- 010_soft_delete_ingredientes.sql
-- ============================================================
-- Motivo: remover um ingrediente fisicamente via DELETE dispara o FK
-- ficha_tecnica_ingrediente_id_fkey quando o ingrediente ja foi usado
-- em alguma ficha tecnica (seja de produto ativo ou inativo). Alem disso,
-- DELETE fisico quebraria historico de compras (tabela compras tambem
-- referencia ingredientes). A semantica correta e soft delete — mesmo
-- padrao ja adotado para produtos (ADR-05).
--
-- Escopo:
--   1. Adiciona coluna ativo BOOLEAN NOT NULL DEFAULT true em ingredientes
--   2. Ingredientes existentes ficam ativos (DEFAULT true)
--
-- O frontend passa a:
--   - Botao "Inativar" (no lugar de "Excluir") faz UPDATE ativo=false
--   - Filtro padrao na listagem: somente ativos
--   - Consumidores (compras, produtos, lista-compras, inicio) filtram ativos
--   - Botao "Reativar" em ingredientes inativos reverte o estado
-- ============================================================

BEGIN;

ALTER TABLE ingredientes
    ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;

-- Verificacao pos-commit (informativa):
-- SELECT nome, ativo FROM ingredientes ORDER BY nome;

COMMIT;
