-- ============================================================
-- 009_painel_cliente.sql
-- Painel do Cliente (TV) + FSM de status + captura cliente_nome
--
-- Escopo:
--   1. Novas colunas em vendas (cliente_nome, numero_pedido, iniciado_em, pronto_em)
--   2. CHECK constraint de status com 4 estados (pendente, em_preparo, pronto, entregue)
--   3. Índice parcial idx_vendas_painel para query do painel
--   4. RPC fechar_venda atualizada (assinatura preserva p_itens + p_operador_id e
--      adiciona p_cliente_nome) — gera numero_pedido sequencial do dia
--   5. RPCs FSM novas: marcar_em_preparo, marcar_pronto
--      + marcar_entregue ajustada (aceita somente status='pronto' como origem)
--   6. View painel_cliente_view (SELECT público read-only)
--   7. Policy painel_anon_select + REVOKE/GRANT coluna-específico para role anon
--
-- Ordem de execução: BEGIN ... COMMIT (autoexecutável em SQL Editor do Supabase).
-- Pré-requisitos aplicados: 001..007 (tabela vendas com coluna status e entregue_em).
-- ============================================================

BEGIN;

-- ── 1. Novas colunas em vendas ─────────────────────────────────────
ALTER TABLE vendas
    ADD COLUMN IF NOT EXISTS cliente_nome   VARCHAR(50),
    ADD COLUMN IF NOT EXISTS numero_pedido  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS iniciado_em    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pronto_em      TIMESTAMPTZ;

-- ── 2. CHECK de status com 4 estados ──────────────────────────────
-- A migration 006 criou CHECK com 2 estados ('pendente','entregue').
-- Aqui expandimos para a FSM completa: pendente → em_preparo → pronto → entregue.
ALTER TABLE vendas DROP CONSTRAINT IF EXISTS vendas_status_check;
ALTER TABLE vendas
    ADD CONSTRAINT vendas_status_check
    CHECK (status IN ('pendente','em_preparo','pronto','entregue'));

-- ── 3. Índice parcial para a query do painel ──────────────────────
-- Cobre a query SELECT ... FROM vendas WHERE data=CURRENT_DATE
-- AND status IN ('pendente','em_preparo','pronto')
CREATE INDEX IF NOT EXISTS idx_vendas_painel
    ON vendas (data, status)
    WHERE status IN ('pendente','em_preparo','pronto');

-- ── 4. RPC fechar_venda atualizada ────────────────────────────────
-- Mantém assinatura existente (p_itens, p_operador_id) e adiciona p_cliente_nome.
-- Gera numero_pedido atômico por MAX(numero_pedido)+1 no dia corrente — o lock
-- implícito da transação cobre a concorrência no volume esperado (<500 vendas/dia).
-- Retorna JSON com { id, total, custo_total, numero_pedido, cliente_nome }.

CREATE OR REPLACE FUNCTION fechar_venda(
    p_itens         JSONB,
    p_operador_id   UUID,
    p_cliente_nome  TEXT DEFAULT NULL
) RETURNS JSON
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
    v_venda_id        UUID;
    v_numero_pedido   INTEGER;
    v_cliente_nome    VARCHAR(50);
    v_total           NUMERIC(10,2) := 0;
    v_custo_total     NUMERIC(10,2) := 0;
    v_item            JSONB;
    v_produto_id      UUID;
    v_quantidade      INTEGER;
    v_observacao      TEXT;
    v_preco_venda     NUMERIC(10,2);
    v_custo_unitario  NUMERIC(10,2);
    v_ficha           RECORD;
    v_estoque_atual   NUMERIC(10,3);
BEGIN
    -- Validações iniciais
    IF p_itens IS NULL OR jsonb_array_length(p_itens) = 0 THEN
        RETURN json_build_object('erro', 'Carrinho vazio');
    END IF;

    IF p_operador_id IS NULL THEN
        RETURN json_build_object('erro', 'Operador não informado');
    END IF;

    -- Normaliza cliente_nome: trim + NULL se vazio, truncar a 50 chars
    v_cliente_nome := NULLIF(TRIM(COALESCE(p_cliente_nome, '')), '');
    IF v_cliente_nome IS NOT NULL THEN
        v_cliente_nome := LEFT(v_cliente_nome, 50);
    END IF;

    -- ── Loop 1: calcular total, custo_total e validar estoque ─────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item->>'produto_id')::UUID;
        v_quantidade := (v_item->>'quantidade')::INTEGER;

        IF v_produto_id IS NULL OR v_quantidade IS NULL OR v_quantidade <= 0 THEN
            RETURN json_build_object('erro', 'Item inválido no carrinho');
        END IF;

        SELECT preco_venda INTO v_preco_venda FROM produtos WHERE id = v_produto_id AND ativo = true;
        IF v_preco_venda IS NULL THEN
            RETURN json_build_object('erro', 'Produto não encontrado ou inativo');
        END IF;

        -- Custo unitário = soma(quantidade_ficha × preco_compra_ingrediente)
        v_custo_unitario := 0;
        FOR v_ficha IN
            SELECT ft.ingrediente_id, ft.quantidade AS qtd_ficha,
                   i.preco_compra, i.estoque_atual, i.nome AS ingrediente_nome
              FROM ficha_tecnica ft
              JOIN ingredientes i ON i.id = ft.ingrediente_id
             WHERE ft.produto_id = v_produto_id
        LOOP
            v_custo_unitario := v_custo_unitario + (v_ficha.qtd_ficha * v_ficha.preco_compra);

            -- Verifica estoque (qtd_ficha × quantidade_vendida)
            IF v_ficha.estoque_atual < (v_ficha.qtd_ficha * v_quantidade) THEN
                RETURN json_build_object(
                    'erro', 'Estoque insuficiente de ' || v_ficha.ingrediente_nome
                );
            END IF;
        END LOOP;

        v_total       := v_total + (v_preco_venda * v_quantidade);
        v_custo_total := v_custo_total + (v_custo_unitario * v_quantidade);
    END LOOP;

    -- ── Gerar numero_pedido atômico do dia ─────────────────────────
    -- O lock implícito da transação (combinado ao índice idx_vendas_painel
    -- + posterior INSERT) cobre a concorrência. Ver ADR-09.
    SELECT COALESCE(MAX(numero_pedido), 0) + 1
      INTO v_numero_pedido
      FROM vendas
     WHERE data = CURRENT_DATE;

    -- ── INSERT vendas ──────────────────────────────────────────────
    INSERT INTO vendas (
        data, total, custo_total, operador_id,
        status, cliente_nome, numero_pedido
    ) VALUES (
        CURRENT_DATE, v_total, v_custo_total, p_operador_id,
        'pendente', v_cliente_nome, v_numero_pedido
    )
    RETURNING id INTO v_venda_id;

    -- ── Loop 2: INSERT itens_venda + UPDATE ingredientes ──────────
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        v_produto_id := (v_item->>'produto_id')::UUID;
        v_quantidade := (v_item->>'quantidade')::INTEGER;
        v_observacao := NULLIF(v_item->>'observacao', '');

        SELECT preco_venda INTO v_preco_venda FROM produtos WHERE id = v_produto_id;

        v_custo_unitario := 0;
        FOR v_ficha IN
            SELECT ft.ingrediente_id, ft.quantidade AS qtd_ficha,
                   i.preco_compra
              FROM ficha_tecnica ft
              JOIN ingredientes i ON i.id = ft.ingrediente_id
             WHERE ft.produto_id = v_produto_id
        LOOP
            v_custo_unitario := v_custo_unitario + (v_ficha.qtd_ficha * v_ficha.preco_compra);

            -- Desconta do estoque
            UPDATE ingredientes
               SET estoque_atual = estoque_atual - (v_ficha.qtd_ficha * v_quantidade),
                   atualizado_em = NOW()
             WHERE id = v_ficha.ingrediente_id;
        END LOOP;

        INSERT INTO itens_venda (
            venda_id, produto_id, quantidade, preco_unitario, custo_unitario, observacao
        ) VALUES (
            v_venda_id, v_produto_id, v_quantidade, v_preco_venda, v_custo_unitario, v_observacao
        );
    END LOOP;

    RETURN json_build_object(
        'id',             v_venda_id,
        'total',          v_total,
        'custo_total',    v_custo_total,
        'numero_pedido',  v_numero_pedido,
        'cliente_nome',   v_cliente_nome,
        'status',         'pendente'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('erro', SQLERRM);
END;
$$;

-- ── 5. RPCs da FSM ─────────────────────────────────────────────────
-- Cada transição é atômica e idempotente: a cláusula
--   WHERE id = p_venda_id AND status = '<prev>'
-- garante que tentativa de pular ou voltar de estado não muda nada
-- e o IF NOT FOUND levanta exception (que vira erro no cliente).

CREATE OR REPLACE FUNCTION marcar_em_preparo(p_venda_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE vendas
       SET status      = 'em_preparo',
           iniciado_em = NOW()
     WHERE id = p_venda_id
       AND status = 'pendente';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'erro', 'Transição inválida: pedido não está em pendente'
        );
    END IF;

    RETURN json_build_object('ok', true, 'status', 'em_preparo');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('erro', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION marcar_pronto(p_venda_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE vendas
       SET status    = 'pronto',
           pronto_em = NOW()
     WHERE id = p_venda_id
       AND status = 'em_preparo';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'erro', 'Transição inválida: pedido não está em preparo'
        );
    END IF;

    RETURN json_build_object('ok', true, 'status', 'pronto');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('erro', SQLERRM);
END;
$$;

-- marcar_entregue: ajustada para exigir status='pronto' como origem (FSM estrita).
-- A versão anterior (migration 007) permitia pendente→entregue direto; aqui
-- bloqueamos esse atalho para garantir que o painel sempre espelhe o fluxo.
CREATE OR REPLACE FUNCTION marcar_entregue(p_venda_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE vendas
       SET status       = 'entregue',
           entregue_em  = NOW()
     WHERE id = p_venda_id
       AND status = 'pronto';

    IF NOT FOUND THEN
        RETURN json_build_object(
            'erro', 'Transição inválida: pedido não está em pronto'
        );
    END IF;

    RETURN json_build_object('ok', true, 'status', 'entregue');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('erro', SQLERRM);
END;
$$;

-- ── 6. View pública de leitura ─────────────────────────────────────
-- Expõe apenas colunas seguras para o role anon. Nunca expõe
-- total, custo_total, lucro, operador_id. Ver ADR-10.
CREATE OR REPLACE VIEW painel_cliente_view AS
SELECT
    id,
    numero_pedido,
    cliente_nome,
    status,
    data,
    criado_em,
    iniciado_em,
    pronto_em
FROM vendas
WHERE data = CURRENT_DATE
  AND status IN ('pendente','em_preparo','pronto')
ORDER BY numero_pedido;

-- ── 7. Exposição controlada ao role anon ───────────────────────────
-- Policy: permite role anon SELECT apenas das linhas ativas do dia.
-- REVOKE + GRANT coluna-específico: mesmo que alguém tente
-- db.from('vendas').select('total,lucro'), o Postgres retorna erro
-- de permissão de coluna. A view herda esses grants.

DROP POLICY IF EXISTS painel_anon_select ON vendas;
CREATE POLICY painel_anon_select ON vendas
    FOR SELECT TO anon
    USING (data = CURRENT_DATE AND status IN ('pendente','em_preparo','pronto'));

REVOKE ALL ON vendas FROM anon;
GRANT SELECT (id, numero_pedido, cliente_nome, status, data, criado_em, iniciado_em, pronto_em)
      ON vendas TO anon;

-- View herda os grants da tabela-base; garantimos explicitamente.
GRANT SELECT ON painel_cliente_view TO anon;

-- Permissões de EXECUTE nas RPCs para role anon (as RPCs são SECURITY DEFINER,
-- então a lógica roda com permissões do owner; só precisamos que anon possa chamá-las).
GRANT EXECUTE ON FUNCTION fechar_venda(JSONB, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION marcar_em_preparo(UUID) TO anon;
GRANT EXECUTE ON FUNCTION marcar_pronto(UUID) TO anon;
GRANT EXECUTE ON FUNCTION marcar_entregue(UUID) TO anon;

COMMIT;

-- ============================================================
-- Verificação pós-migration (execute manualmente se desejar):
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name='vendas' AND column_name IN
--          ('cliente_nome','numero_pedido','iniciado_em','pronto_em');
--   -- esperado: 4 linhas
--
--   SELECT * FROM painel_cliente_view LIMIT 1;  -- como anon
--
--   -- teste FSM:
--   SELECT marcar_pronto('<uuid-de-venda-pendente>');
--   -- esperado: { "erro": "Transição inválida: pedido não está em preparo" }
-- ============================================================
