CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS usuarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    senha_hash  VARCHAR(255) NOT NULL,
    perfil      VARCHAR(20)  NOT NULL CHECK (perfil IN ('administrador','financeiro','estoque','operador')),
    ativo       BOOLEAN      NOT NULL DEFAULT true,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredientes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(100)   NOT NULL,
    unidade         VARCHAR(10)    NOT NULL CHECK (unidade IN ('kg','g','un','litro','ml')),
    preco_compra    NUMERIC(10,2)  NOT NULL DEFAULT 0,
    estoque_atual   NUMERIC(10,3)  NOT NULL DEFAULT 0,
    estoque_minimo  NUMERIC(10,3)  NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS produtos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome         VARCHAR(100)  NOT NULL,
    preco_venda  NUMERIC(10,2) NOT NULL,
    ativo        BOOLEAN       NOT NULL DEFAULT true,
    criado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ficha_tecnica (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id      UUID           NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    ingrediente_id  UUID           NOT NULL REFERENCES ingredientes(id),
    quantidade      NUMERIC(10,3)  NOT NULL,
    UNIQUE (produto_id, ingrediente_id)
);

CREATE TABLE IF NOT EXISTS compras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id  UUID           NOT NULL REFERENCES ingredientes(id),
    quantidade      NUMERIC(10,3)  NOT NULL,
    valor_unitario  NUMERIC(10,2)  NOT NULL,
    total           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    data            DATE           NOT NULL,
    criado_por      UUID           REFERENCES usuarios(id),
    criado_em       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data         DATE           NOT NULL,
    total        NUMERIC(10,2)  NOT NULL,
    custo_total  NUMERIC(10,2)  NOT NULL,
    lucro        NUMERIC(10,2)  GENERATED ALWAYS AS (total - custo_total) STORED,
    operador_id  UUID           REFERENCES usuarios(id),
    criado_em    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_venda (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id        UUID           NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id      UUID           NOT NULL REFERENCES produtos(id),
    quantidade      INTEGER        NOT NULL,
    preco_unitario  NUMERIC(10,2)  NOT NULL,
    custo_unitario  NUMERIC(10,2)  NOT NULL,
    total           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    lucro           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * (preco_unitario - custo_unitario)) STORED
);

CREATE INDEX IF NOT EXISTS idx_compras_ingrediente ON compras(ingrediente_id);
CREATE INDEX IF NOT EXISTS idx_compras_data        ON compras(data);
CREATE INDEX IF NOT EXISTS idx_vendas_data         ON vendas(data);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda   ON itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_itens_venda_produto ON itens_venda(produto_id);
CREATE INDEX IF NOT EXISTS idx_ficha_produto       ON ficha_tecnica(produto_id);
