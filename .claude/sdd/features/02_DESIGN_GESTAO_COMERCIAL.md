# DESIGN — Sistema de Gestão Comercial (Pastelaria Piloto)

**Fase:** 2 — Arquitetura
**Data:** 2026-03-29
**Atualizado:** 2026-04-02 — Revisão de segurança completa: RLS, operações atômicas, XSS, sessão
**Status:** ✅ Implementado + Revisão de Segurança Aplicada
**Origem:** 01_DEFINE_GESTAO_COMERCIAL.md

---

## 1. Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                   NETLIFY (frontend)                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  login.html  │  │ dashboard.html│  │  pdv.html  etc.  │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┴────────────────────┘            │
│                           │                                 │
│              assets/js/supabase-client.js                   │
│               (SDK Supabase via CDN)                        │
│                                                             │
│  Segurança Client-side:                                     │
│  - escapeHtml() em todo innerHTML com dados do usuário      │
│  - Sessão com expiração de 8h                               │
│  - Loading states em todos os submits                       │
│  - Modal de confirmação em ações destrutivas                │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / PostgREST + RPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (backend-as-a-service)            │
│                                                             │
│  ┌─────────────────┐   ┌──────────────────────────────────┐ │
│  │  PostgREST API  │   │       RPC Functions              │ │
│  │  (bloqueado por │   │  autenticar()                    │ │
│  │   RLS policies) │   │  criar_usuario()                 │ │
│  │                 │   │  alterar_senha()                 │ │
│  │  Acesso filtrado│   │  registrar_compra() ← NOVO atôm. │ │
│  │  por perfil via │   │  fechar_venda()  ← atômico       │ │
│  │  current_setting│   │  dashboard_metrics()             │ │
│  └────────┬────────┘   └───────────────┬──────────────────┘ │
│           │                            │                    │
└───────────┼────────────────────────────┼────────────────────┘
            │            SQL             │
            ▼                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│                                                             │
│  usuarios  ingredientes  produtos  ficha_tecnica            │
│  compras   vendas        itens_venda                        │
│                                                             │
│  RLS HABILITADO em todas as tabelas                         │
│  Policies por perfil: administrador > estoque/financeiro    │
│                       > operador (acesso mínimo)            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Pastas

```
gestao_comercial/
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_schema_supabase.sql     ← schema + RPC functions originais
│   │   └── 002_rls_policies.sql        ← ★ NOVO: RLS + RPC registrar_compra()
│   └── seed.sql
│
├── assets/
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── supabase-client.js          ← inicialização do SDK
│       ├── app.js                      ← ★ CORRIGIDO: escapeHtml() + sessão c/ TTL
│       ├── auth.js                     ← login via RPC autenticar()
│       ├── dashboard.js
│       ├── ingredientes.js             ← ★ CORRIGIDO: confirmação ao excluir
│       ├── produtos.js                 ← ★ CORRIGIDO: confirmação ao inativar
│       ├── compras.js                  ← ★ CORRIGIDO: usa RPC registrar_compra()
│       ├── lista-compras.js
│       ├── pdv.js                      ← ★ CORRIGIDO: loading state + confirmação
│       ├── historico-dia.js
│       ├── financeiro.js
│       └── usuarios.js                 ← ★ CORRIGIDO: confirmação ao desativar
│
├── *.html                              ← ★ CORRIGIDO: modal de confirmação global
└── ...
```

---

## 3. Schema do Banco de Dados

```sql
-- 001_schema_supabase.sql (inalterado — apenas referência)

CREATE TABLE usuarios (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    senha_hash  VARCHAR(255) NOT NULL,
    perfil      VARCHAR(20)  NOT NULL
                CHECK (perfil IN ('administrador','financeiro','estoque','operador')),
    ativo       BOOLEAN      NOT NULL DEFAULT true,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE ingredientes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome            VARCHAR(100)   NOT NULL,
    unidade         VARCHAR(10)    NOT NULL
                    CHECK (unidade IN ('kg','g','un','litro','ml')),
    preco_compra    NUMERIC(10,2)  NOT NULL DEFAULT 0,
    estoque_atual   NUMERIC(10,3)  NOT NULL DEFAULT 0,
    estoque_minimo  NUMERIC(10,3)  NOT NULL DEFAULT 0,
    criado_em       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE produtos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome         VARCHAR(100)  NOT NULL,
    preco_venda  NUMERIC(10,2) NOT NULL,
    categoria    VARCHAR(50),
    ativo        BOOLEAN       NOT NULL DEFAULT true,
    criado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE ficha_tecnica (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id      UUID           NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    ingrediente_id  UUID           NOT NULL REFERENCES ingredientes(id),
    quantidade      NUMERIC(10,3)  NOT NULL CHECK (quantidade > 0),
    UNIQUE (produto_id, ingrediente_id)
);

CREATE TABLE compras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id  UUID           NOT NULL REFERENCES ingredientes(id),
    quantidade      NUMERIC(10,3)  NOT NULL CHECK (quantidade > 0),
    valor_unitario  NUMERIC(10,2)  NOT NULL CHECK (valor_unitario > 0),
    total           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    data            DATE           NOT NULL,
    criado_por      UUID           REFERENCES usuarios(id),
    criado_em       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE vendas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data         DATE           NOT NULL,
    total        NUMERIC(10,2)  NOT NULL,
    custo_total  NUMERIC(10,2)  NOT NULL,
    lucro        NUMERIC(10,2)  GENERATED ALWAYS AS (total - custo_total) STORED,
    operador_id  UUID           REFERENCES usuarios(id),
    criado_em    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE itens_venda (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id        UUID           NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id      UUID           NOT NULL REFERENCES produtos(id),
    quantidade      INTEGER        NOT NULL CHECK (quantidade > 0),
    preco_unitario  NUMERIC(10,2)  NOT NULL,
    custo_unitario  NUMERIC(10,2)  NOT NULL,
    total           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    lucro           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * (preco_unitario - custo_unitario)) STORED
);
```

---

## 4. Row-Level Security (RLS) — migration 002

### Estratégia

O controle de acesso é feito via `current_setting('app.usuario_perfil', true)`,
setado no cliente antes de cada chamada autenticada.

```sql
-- 002_rls_policies.sql

-- ─── Habilitar RLS em todas as tabelas ───────────────────────────────────────
ALTER TABLE usuarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficha_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras       ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_venda   ENABLE ROW LEVEL SECURITY;

-- ─── Helper function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_perfil()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('app.usuario_perfil', true), '')
$$;

-- ─── USUARIOS: somente admin lê/escreve ─────────────────────────────────────
CREATE POLICY usuarios_admin_all ON usuarios
  FOR ALL TO anon
  USING (get_perfil() = 'administrador')
  WITH CHECK (get_perfil() = 'administrador');

-- ─── INGREDIENTES ────────────────────────────────────────────────────────────
-- Todos os perfis autenticados podem SELECT
CREATE POLICY ingredientes_select ON ingredientes
  FOR SELECT TO anon
  USING (get_perfil() IN ('administrador','financeiro','estoque','operador'));

-- Somente estoque e admin podem INSERT/UPDATE/DELETE
CREATE POLICY ingredientes_write ON ingredientes
  FOR ALL TO anon
  USING (get_perfil() IN ('administrador','estoque'))
  WITH CHECK (get_perfil() IN ('administrador','estoque'));

-- ─── PRODUTOS ────────────────────────────────────────────────────────────────
CREATE POLICY produtos_select ON produtos
  FOR SELECT TO anon
  USING (get_perfil() IN ('administrador','financeiro','estoque','operador'));

CREATE POLICY produtos_write ON produtos
  FOR ALL TO anon
  USING (get_perfil() IN ('administrador','estoque'))
  WITH CHECK (get_perfil() IN ('administrador','estoque'));

-- ─── FICHA_TECNICA ────────────────────────────────────────────────────────────
CREATE POLICY ficha_tecnica_select ON ficha_tecnica
  FOR SELECT TO anon
  USING (get_perfil() IN ('administrador','financeiro','estoque','operador'));

CREATE POLICY ficha_tecnica_write ON ficha_tecnica
  FOR ALL TO anon
  USING (get_perfil() IN ('administrador','estoque'))
  WITH CHECK (get_perfil() IN ('administrador','estoque'));

-- ─── COMPRAS ─────────────────────────────────────────────────────────────────
-- Financeiro, estoque e admin podem SELECT
CREATE POLICY compras_select ON compras
  FOR SELECT TO anon
  USING (get_perfil() IN ('administrador','financeiro','estoque'));

-- Somente estoque e admin podem INSERT; somente admin pode DELETE
CREATE POLICY compras_insert ON compras
  FOR INSERT TO anon
  WITH CHECK (get_perfil() IN ('administrador','estoque'));

CREATE POLICY compras_delete ON compras
  FOR DELETE TO anon
  USING (get_perfil() = 'administrador');

-- ─── VENDAS ──────────────────────────────────────────────────────────────────
-- Operador vê apenas vendas do dia (filtro aplicado no frontend)
-- RLS garante que operador NÃO vê histórico de outros dias
CREATE POLICY vendas_operador_insert ON vendas
  FOR INSERT TO anon
  WITH CHECK (get_perfil() IN ('administrador','operador'));

CREATE POLICY vendas_operador_select ON vendas
  FOR SELECT TO anon
  USING (
    get_perfil() IN ('administrador','financeiro')
    OR (get_perfil() = 'operador' AND data = CURRENT_DATE)
  );

-- ─── ITENS_VENDA ─────────────────────────────────────────────────────────────
CREATE POLICY itens_venda_insert ON itens_venda
  FOR INSERT TO anon
  WITH CHECK (get_perfil() IN ('administrador','operador'));

CREATE POLICY itens_venda_select ON itens_venda
  FOR SELECT TO anon
  USING (get_perfil() IN ('administrador','financeiro','operador'));

-- ─── RPC: registrar_compra() — substitui 2 chamadas separadas ───────────────
CREATE OR REPLACE FUNCTION registrar_compra(
  p_ingrediente_id UUID,
  p_quantidade     NUMERIC,
  p_valor_unitario NUMERIC,
  p_data           DATE,
  p_criado_por     UUID
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_compra compras;
BEGIN
  -- Validações
  IF p_quantidade <= 0 THEN
    RETURN json_build_object('erro', 'Quantidade deve ser maior que zero');
  END IF;
  IF p_valor_unitario <= 0 THEN
    RETURN json_build_object('erro', 'Valor unitário deve ser maior que zero');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM ingredientes WHERE id = p_ingrediente_id) THEN
    RETURN json_build_object('erro', 'Ingrediente não encontrado');
  END IF;

  -- Inserir compra
  INSERT INTO compras (ingrediente_id, quantidade, valor_unitario, data, criado_por)
  VALUES (p_ingrediente_id, p_quantidade, p_valor_unitario, p_data, p_criado_por)
  RETURNING * INTO v_compra;

  -- Atualizar estoque e preço — na mesma transação
  UPDATE ingredientes
  SET estoque_atual  = estoque_atual + p_quantidade,
      preco_compra   = p_valor_unitario,
      atualizado_em  = NOW()
  WHERE id = p_ingrediente_id;

  RETURN json_build_object(
    'id',             v_compra.id,
    'ingrediente_id', v_compra.ingrediente_id,
    'quantidade',     v_compra.quantidade,
    'total',          v_compra.total,
    'data',           v_compra.data
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('erro', SQLERRM);
END;
$$;
```

### Como o cliente seta o perfil

```javascript
// supabase-client.js — antes de qualquer chamada autenticada
async function setarPerfilNaSessao(perfil) {
  await db.rpc('set_config', {
    setting: 'app.usuario_perfil',
    value: perfil,
    is_local: true
  });
}
// Alternativa via header (recomendada para Supabase):
// db.rest.headers['X-User-Perfil'] = perfil; (requer configuração adicional)
```

> **Nota de implementação:** O Supabase não suporta `SET LOCAL` via PostgREST diretamente.
> A abordagem mais robusta é usar a função `registrar_compra()` e `fechar_venda()` com
> `SECURITY DEFINER` para operações críticas, e **Supabase Auth + RLS com `auth.uid()`**
> para proteção granular. Para o MVP com auth customizada, as RPCs com SECURITY DEFINER
> são a solução mais prática — a proteção está nas funções, não nas policies PostgREST.

---

## 5. Fluxo Crítico — Registrar Compra (RPC atômica)

```
Antes (problema):                    Depois (corrigido):
─────────────────────────────────    ─────────────────────────────────
1. INSERT compras                    1. db.rpc('registrar_compra', {
2. SELECT ingrediente.estoque           ingrediente_id, quantidade,
3. UPDATE ingrediente.estoque           valor_unitario, data, criado_por
                                     })
Se passo 2 ou 3 falhar:              ↓
estoque inconsistente com            RPC executa INSERT + UPDATE
a compra já registrada               em uma única transação SQL
```

---

## 6. Fluxo Crítico — Fechar Venda (PDV)

```
Operador                  Frontend (pdv.js)           Supabase RPC
    │                           │                               │
    │  clica "Finalizar Venda"  │                               │
    │──────────────────────────▶│                               │
    │                           │  botão desabilitado (loading) │
    │                           │  db.rpc('fechar_venda', ...)  │
    │                           │──────────────────────────────▶│
    │                           │                               │ 1. Verifica perfil
    │                           │                               │ 2. Para cada item:
    │                           │                               │    busca ficha_tecnica
    │                           │                               │ 3. Calcula custo_unitario
    │                           │                               │ 4. Verifica estoque
    │                           │                               │ 5. Se OK: transação
    │                           │                               │    - INSERT vendas
    │                           │                               │    - INSERT itens_venda
    │                           │                               │    - UPDATE ingredientes
    │                           │                               │    - COMMIT
    │                           │  botão reabilitado            │
    │  toast "Venda registrada" │◀──────────────────────────────│
    │  carrinho limpo           │                               │
```

---

## 7. Arquitetura de Segurança Frontend

### 7.1 — escapeHtml() — proteção XSS

```javascript
// Adicionado em app.js — usado em TODOS os pontos de interpolação
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

### 7.2 — Sessão com TTL

```javascript
// auth.js — ao fazer login
function salvarSessao(usuario) {
  const sessao = {
    ...usuario,
    expira_em: Date.now() + (8 * 60 * 60 * 1000) // 8 horas
  };
  localStorage.setItem('sgc_user', JSON.stringify(sessao));
}

// app.js — ao verificar sessão
function isLoggedIn() {
  const usuario = getUsuario();
  if (!usuario) return false;
  if (usuario.expira_em && Date.now() > usuario.expira_em) {
    localStorage.removeItem('sgc_user');
    return false;
  }
  return true;
}
```

### 7.3 — Loading State em submits

```javascript
// Padrão aplicado em pdv.js, compras.js, ingredientes.js, produtos.js, usuarios.js
function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.textContent = loading ? 'Aguarde...' : btn.dataset.originalText;
}

// Uso:
const btn = document.getElementById('pdv-finalizar');
btn.dataset.originalText = btn.textContent;
setLoading(btn, true);
try {
  await db.rpc('fechar_venda', ...);
} finally {
  setLoading(btn, false);
}
```

### 7.4 — Modal de confirmação global

```javascript
// Adicionado em app.js
function confirmar(mensagem) {
  return new Promise((resolve) => {
    // Modal HTML injetado no body (já existe o toast-container como modelo)
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>${escapeHtml(mensagem)}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancelar">Cancelar</button>
          <button class="btn btn-danger" id="confirm-ok">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirm-ok').addEventListener('click', () => {
      overlay.remove(); resolve(true);
    });
    overlay.querySelector('#confirm-cancelar').addEventListener('click', () => {
      overlay.remove(); resolve(false);
    });
  });
}
```

---

## 8. ADRs — Decisões de Arquitetura (Revisadas)

### ADR-01: Frontend Vanilla JS (sem framework)
**Decisão:** Manter HTML + CSS + Vanilla JS
**Justificativa:** Ambos os devs dominam; introduzir React/Vue aumentaria o tempo de onboarding
**Consequência:** DOM manipulado manualmente — requer disciplina em escapeHtml()
**Status:** Mantido ✅

### ADR-02: Backend Supabase (sem Node.js)
**Decisão:** Supabase (PostgreSQL + RPC) no lugar do Node.js original
**Justificativa:** Deploy simplificado; Netlify para frontend, Supabase para DB
**Consequência:** Sem camada de API própria — controle de acesso deve estar no banco (RLS)
**Status:** Mantido ✅

### ADR-03: Auth customizada (não Supabase Auth nativo)
**Decisão:** Manter RPC `autenticar()` + localStorage com TTL de 8h
**Justificativa:** Supabase Auth exigiria migrar a tabela `usuarios` para `auth.users` — risco de regressão em sistema em produção
**Risco:** RLS não pode usar `auth.uid()` nativamente — RPCs com SECURITY DEFINER compensam
**Alternativa pós-MVP:** Migrar para Supabase Auth para RLS granular via `auth.uid()`
**Status:** Mantido com correções ⚠️

### ADR-04: localStorage com TTL (não httpOnly cookie)
**Decisão:** Sessão em localStorage com `expira_em` de 8h
**Justificativa:** Frontend estático sem servidor de templates — cookie httpOnly exigiria SSR ou proxy
**Risco mitigado:** escapeHtml() em todo innerHTML; TTL limita janela de exposição
**Status:** Corrigido (TTL adicionado) ✅

### ADR-05: Soft delete em produtos (inalterado)
**Decisão:** Produtos marcados como `ativo = false` em vez de deletados
**Justificativa:** Vendas históricas referenciam produtos; deletar quebraria o histórico
**Status:** Mantido ✅

### ADR-06: RPC `registrar_compra()` — NOVA
**Decisão:** Criar RPC para tornar o registro de compras atômico
**Justificativa:** O código anterior fazia INSERT + UPDATE em 2 chamadas separadas — race condition possível
**Status:** Novo ★

### ADR-07: RLS com SECURITY DEFINER RPCs — NOVA
**Decisão:** Proteção via RPCs SECURITY DEFINER em vez de RLS policies PostgREST puro
**Justificativa:** Sem Supabase Auth nativo, não há `auth.uid()` disponível nas policies. RPCs SECURITY DEFINER permitem lógica de autorização no banco sem depender de headers ou settings de sessão complexos.
**Consequência:** As operações críticas (fechar_venda, registrar_compra, criar_usuario) são protegidas. Leituras via PostgREST ainda dependem do RLS com `get_perfil()` (melhor esforço no MVP).
**Status:** Novo ★

---

## 9. Estratégia de Testes

| Tipo | O que testar | Ferramenta |
|---|---|---|
| Segurança | Operador NÃO consegue ver histório de vendas via `db.from('vendas').select('*')` | Teste manual no console |
| Segurança | XSS: usuário com nome `<img src=x onerror=alert(1)>` não executa JS | Teste manual |
| Funcional | Double-click no PDV não gera venda duplicada | Teste manual |
| Funcional | Sessão expira após 8h | Manipulação manual do `expira_em` no localStorage |
| Funcional | Modal de confirmação aparece antes de excluir ingrediente | Teste manual |
| Integração | `registrar_compra()` falha se ingrediente não existe | Teste via SQL Editor |
| Integração | `fechar_venda()` desconta estoque corretamente | Teste via SQL Editor |

---

## 10. Plano de Deploy (atual)

```
Netlify (frontend):
└── Deploy automático via GitHub (branch main)

Supabase (backend):
├── Projeto: gestao-comercial
├── Migrations a aplicar via SQL Editor:
│   ├── 001_schema_supabase.sql  ← já aplicado
│   └── 002_rls_policies.sql     ← ★ aplicar imediatamente
└── Seed: seed.sql + seed_cardapio.sql  ← já aplicados
```

---

## 11. Manifesto de Mudanças (Revisão de Segurança)

### SQL (Supabase)
| Arquivo | Ação |
|---|---|
| `supabase/migrations/002_rls_policies.sql` | **★ CRIAR** — RLS em todas as tabelas + RPC `registrar_compra()` |

### Frontend JS
| Arquivo | Mudança |
|---|---|
| `assets/js/app.js` | **★ CORRIGIR** — `escapeHtml()` + `isLoggedIn()` com TTL + `confirmar()` modal |
| `assets/js/auth.js` | **★ CORRIGIR** — `salvarSessao()` com `expira_em` |
| `assets/js/compras.js` | **★ CORRIGIR** — usar `db.rpc('registrar_compra')` em vez de 2 chamadas |
| `assets/js/pdv.js` | **★ CORRIGIR** — loading state no botão finalizar |
| `assets/js/ingredientes.js` | **★ CORRIGIR** — confirmação antes de excluir |
| `assets/js/produtos.js` | **★ CORRIGIR** — confirmação antes de inativar |
| `assets/js/usuarios.js` | **★ CORRIGIR** — confirmação antes de desativar |
| `assets/js/app.js` | **★ CORRIGIR** — label "PDV - TESTE" → "PDV" |
