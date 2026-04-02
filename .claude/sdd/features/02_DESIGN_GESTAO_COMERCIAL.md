# DESIGN — Sistema de Gestão Comercial (Pastelaria Piloto)

**Fase:** 2 — Arquitetura
**Data:** 2026-03-29
**Atualizado:** 2026-04-01
**Status:** ✅ Implementado e no ar
**Origem:** 01_DEFINE_GESTAO_COMERCIAL.md

> **Nota:** A arquitetura original previa Node.js + Express + Railway. Após decisão da equipe, o backend foi migrado para Supabase (PostgreSQL + RPC functions) e o frontend hospedado no Netlify. O design abaixo reflete a arquitetura atual implementada.

---

## 1. Diagrama de Arquitetura

> Arquitetura implementada: Supabase substitui o backend Node.js.

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
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / PostgREST + RPC
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE (backend-as-a-service)            │
│                                                             │
│  ┌─────────────────┐   ┌──────────────────────────────────┐ │
│  │  PostgREST API  │   │       RPC Functions              │ │
│  │  db.from(table) │   │  autenticar()                    │ │
│  │  .select()      │   │  criar_usuario()                 │ │
│  │  .insert()      │   │  alterar_senha()                 │ │
│  │  .update()      │   │  fechar_venda()  ← atomico       │ │
│  │  .delete()      │   │  dashboard_metrics()             │ │
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
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Pastas

```
gestao_comercial/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js          ← pool de conexão PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js              ← verifica JWT, anexa req.user
│   │   │   └── roles.js             ← verifica perfil, retorna 403
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── ingredientes.routes.js
│   │   │   ├── produtos.routes.js
│   │   │   ├── compras.routes.js
│   │   │   ├── vendas.routes.js
│   │   │   ├── financeiro.routes.js
│   │   │   └── usuarios.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── ingredientes.controller.js
│   │   │   ├── produtos.controller.js
│   │   │   ├── compras.controller.js
│   │   │   ├── vendas.controller.js
│   │   │   ├── financeiro.controller.js
│   │   │   └── usuarios.controller.js
│   │   ├── db/
│   │   │   ├── migrations/
│   │   │   │   └── 001_schema_inicial.sql
│   │   │   └── seed.js              ← admin padrão + dados de exemplo
│   │   └── app.js                   ← entry point Express
│   ├── package.json
│   └── .env.example
│
├── frontend/                        ← evolução do protótipo
│   ├── index.html                   ← redirect para login ou dashboard
│   ├── login.html
│   ├── dashboard.html               ← Admin only
│   ├── ingredientes.html            ← Estoque, Admin
│   ├── produtos.html                ← Estoque, Admin
│   ├── compras.html                 ← Estoque, Financeiro, Admin
│   ├── lista-compras.html           ← Estoque, Admin
│   ├── pdv.html                     ← Operador, Admin
│   ├── historico-dia.html           ← Operador, Admin
│   ├── financeiro.html              ← Financeiro, Admin
│   ├── usuarios.html                ← Admin only
│   └── assets/
│       ├── css/
│       │   └── style.css            ← reaproveitado do protótipo
│       └── js/
│           ├── app.js               ← shell, menu por perfil, redirect
│           ├── api.js               ← fetch wrapper com JWT (NOVO)
│           ├── auth.js              ← login/logout via API
│           ├── dashboard.js
│           ├── ingredientes.js
│           ├── produtos.js
│           ├── compras.js
│           ├── lista-compras.js
│           ├── pdv.js
│           ├── historico-dia.js
│           ├── financeiro.js
│           └── usuarios.js
│
└── README.md
```

---

## 3. Schema do Banco de Dados

```sql
-- 001_schema_inicial.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Usuários do sistema
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

-- Ingredientes / matérias-primas
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

-- Produtos finais (ex: Pastel de Frango)
CREATE TABLE produtos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome         VARCHAR(100)  NOT NULL,
    preco_venda  NUMERIC(10,2) NOT NULL,
    ativo        BOOLEAN       NOT NULL DEFAULT true,
    criado_em    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Ficha técnica: ingredientes de cada produto
CREATE TABLE ficha_tecnica (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id      UUID           NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
    ingrediente_id  UUID           NOT NULL REFERENCES ingredientes(id),
    quantidade      NUMERIC(10,3)  NOT NULL,
    UNIQUE (produto_id, ingrediente_id)
);

-- Compras de ingredientes (entrada de estoque)
CREATE TABLE compras (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id  UUID           NOT NULL REFERENCES ingredientes(id),
    quantidade      NUMERIC(10,3)  NOT NULL,
    valor_unitario  NUMERIC(10,2)  NOT NULL,
    total           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    data            DATE           NOT NULL,
    criado_por      UUID           REFERENCES usuarios(id),
    criado_em       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Vendas (cabeçalho da comanda)
CREATE TABLE vendas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data         DATE           NOT NULL,
    total        NUMERIC(10,2)  NOT NULL,
    custo_total  NUMERIC(10,2)  NOT NULL,
    lucro        NUMERIC(10,2)  GENERATED ALWAYS AS (total - custo_total) STORED,
    operador_id  UUID           REFERENCES usuarios(id),
    criado_em    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- Itens de cada venda
CREATE TABLE itens_venda (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id        UUID           NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
    produto_id      UUID           NOT NULL REFERENCES produtos(id),
    quantidade      INTEGER        NOT NULL,
    preco_unitario  NUMERIC(10,2)  NOT NULL,
    custo_unitario  NUMERIC(10,2)  NOT NULL,
    total           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * preco_unitario) STORED,
    lucro           NUMERIC(10,2)  GENERATED ALWAYS AS (quantidade * (preco_unitario - custo_unitario)) STORED
);

-- Índices para performance
CREATE INDEX idx_compras_ingrediente   ON compras(ingrediente_id);
CREATE INDEX idx_compras_data          ON compras(data);
CREATE INDEX idx_vendas_data           ON vendas(data);
CREATE INDEX idx_itens_venda_venda     ON itens_venda(venda_id);
CREATE INDEX idx_itens_venda_produto   ON itens_venda(produto_id);
CREATE INDEX idx_ficha_produto         ON ficha_tecnica(produto_id);
```

---

## 4. Rotas da API

### Autenticação
```
POST   /api/auth/login          → { email, senha } → { token, usuario }
```

### Ingredientes — perfis: estoque, administrador
```
GET    /api/ingredientes                → lista todos com status calculado
POST   /api/ingredientes                → cadastra novo
PUT    /api/ingredientes/:id            → edita
DELETE /api/ingredientes/:id            → remove (impede se houver ficha_tecnica)
```

### Produtos — perfis: estoque, operador (GET), administrador
```
GET    /api/produtos                    → lista todos ativos
POST   /api/produtos                    → cadastra com ficha_tecnica[]
PUT    /api/produtos/:id                → atualiza produto + ficha_tecnica
DELETE /api/produtos/:id                → desativa (soft delete)
GET    /api/produtos/:id/custo          → calcula custo e margem atuais
```

### Compras — perfis: estoque, financeiro (GET), administrador
```
GET    /api/compras                     → histórico (query: ?data_inicio, ?data_fim, ?ingrediente_id)
POST   /api/compras                     → registra + incrementa estoque + atualiza preco_compra
DELETE /api/compras/:id                 → remove (admin only) + reverte estoque
```

### Lista de Compras — perfis: estoque, administrador
```
GET    /api/lista-compras               → ingredientes com status crítico ou atenção
```

### Vendas — perfis: operador (POST), financeiro (GET), administrador
```
POST   /api/vendas                      → fecha comanda + desconta estoque
GET    /api/vendas                      → histórico (query: ?data_inicio, ?data_fim)
GET    /api/vendas/hoje                 → vendas do dia atual
```

### Financeiro — perfis: financeiro, administrador
```
GET    /api/financeiro/resumo-mensal    → gastos × vendas × lucro por mês
GET    /api/financeiro/desempenho       → lucro/custo/margem agrupado por produto
```

### Dashboard — perfil: administrador
```
GET    /api/dashboard                   → métricas consolidadas do mês atual
```

### Usuários — perfil: administrador
```
GET    /api/usuarios                    → lista todos
POST   /api/usuarios                    → cadastra novo
PUT    /api/usuarios/:id                → edita (inclusive senha)
DELETE /api/usuarios/:id                → desativa (não remove admin padrão)
```

---

## 5. Controle de Acesso por Rota

| Perfil | Rotas permitidas |
|---|---|
| `administrador` | Todas |
| `financeiro` | GET /compras, GET+POST /vendas, GET /financeiro/*, GET /lista-compras |
| `estoque` | CRUD /ingredientes, CRUD /produtos, POST+GET /compras, GET /lista-compras |
| `operador` | GET /produtos, POST /vendas, GET /vendas/hoje |

---

## 6. Fluxo Crítico — Fechar Venda (PDV)

```
Operador                  Frontend (pdv.js)           Backend (vendas.controller)
    │                           │                               │
    │  clica "Fechar Venda"     │                               │
    │──────────────────────────▶│                               │
    │                           │  POST /api/vendas             │
    │                           │  { itens: [{produto_id,       │
    │                           │    quantidade}] }             │
    │                           │──────────────────────────────▶│
    │                           │                               │ 1. Para cada item:
    │                           │                               │    busca ficha_tecnica
    │                           │                               │ 2. Calcula custo_unitario
    │                           │                               │    = Σ(preco_compra × qty)
    │                           │                               │ 3. Verifica estoque
    │                           │                               │    suficiente p/ todos
    │                           │                               │ 4. Se OK: inicia transação
    │                           │                               │    - INSERT vendas
    │                           │                               │    - INSERT itens_venda
    │                           │                               │    - UPDATE ingredientes
    │                           │                               │      (desconta estoque)
    │                           │                               │    - COMMIT
    │                           │  { venda_id, total, lucro }  │
    │                           │◀──────────────────────────────│
    │  toast "Venda registrada" │                               │
    │◀──────────────────────────│                               │
    │  carrinho limpo           │                               │
```

**Transação atômica:** Se qualquer ingrediente não tiver estoque suficiente, nenhum desconto é feito e a venda não é registrada (rollback).

---

## 7. Arquitetura do Frontend

### Mudança principal em relação ao protótipo

```
PROTÓTIPO (antes)               SISTEMA REAL (depois)
─────────────────────────────   ──────────────────────────────
App.read(StorageKeys.*)     →   API.get('/ingredientes')
App.write(StorageKeys.*)    →   API.post('/compras', data)
sessionStorage (auth)       →   localStorage token JWT
Sem controle de acesso      →   menu filtrado por perfil
```

### api.js — wrapper de fetch (novo arquivo)

```javascript
const API = (() => {
  const BASE = '/api';

  const getToken = () => localStorage.getItem('sgc_token');

  const headers = () => ({
    'Content-Type': 'application/json',
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  });

  const handleResponse = async (res) => {
    if (res.status === 401) { window.location.href = 'login.html'; return; }
    if (!res.ok) throw await res.json();
    return res.json();
  };

  return {
    get:    (path)         => fetch(`${BASE}${path}`, { headers: headers() }).then(handleResponse),
    post:   (path, body)   => fetch(`${BASE}${path}`, { method: 'POST',   headers: headers(), body: JSON.stringify(body) }).then(handleResponse),
    put:    (path, body)   => fetch(`${BASE}${path}`, { method: 'PUT',    headers: headers(), body: JSON.stringify(body) }).then(handleResponse),
    delete: (path)         => fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() }).then(handleResponse),
  };
})();
```

### app.js — menu por perfil (atualizado)

```javascript
const MENU_POR_PERFIL = {
  administrador: [
    ['dashboard',      'Dashboard',       '🏠', 'dashboard.html'],
    ['ingredientes',   'Ingredientes',    '🧂', 'ingredientes.html'],
    ['produtos',       'Produtos',        '🥟', 'produtos.html'],
    ['compras',        'Compras',         '🛒', 'compras.html'],
    ['lista-compras',  'Lista de Compras','📋', 'lista-compras.html'],
    ['pdv',            'PDV',             '💳', 'pdv.html'],
    ['financeiro',     'Financeiro',      '📈', 'financeiro.html'],
    ['usuarios',       'Usuários',        '👥', 'usuarios.html'],
  ],
  financeiro: [
    ['compras',    'Compras',    '🛒', 'compras.html'],
    ['financeiro', 'Financeiro', '📈', 'financeiro.html'],
  ],
  estoque: [
    ['ingredientes',  'Ingredientes',     '🧂', 'ingredientes.html'],
    ['produtos',      'Produtos',         '🥟', 'produtos.html'],
    ['compras',       'Compras',          '🛒', 'compras.html'],
    ['lista-compras', 'Lista de Compras', '📋', 'lista-compras.html'],
  ],
  operador: [
    ['pdv',           'PDV',              '💳', 'pdv.html'],
    ['historico-dia', 'Histórico do Dia', '📅', 'historico-dia.html'],
  ],
};
```

---

## 8. Padrão de Controller (Backend)

```javascript
// Exemplo: compras.controller.js
const db = require('../config/database');

async function criar(req, res) {
  const { ingrediente_id, quantidade, valor_unitario, data } = req.body;
  const criado_por = req.user.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const compra = await client.query(
      `INSERT INTO compras (ingrediente_id, quantidade, valor_unitario, data, criado_por)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [ingrediente_id, quantidade, valor_unitario, data, criado_por]
    );

    await client.query(
      `UPDATE ingredientes
       SET estoque_atual  = estoque_atual + $1,
           preco_compra   = $2,
           atualizado_em  = NOW()
       WHERE id = $3`,
      [quantidade, valor_unitario, ingrediente_id]
    );

    await client.query('COMMIT');
    res.status(201).json(compra.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ erro: 'Erro ao registrar compra' });
  } finally {
    client.release();
  }
}
```

---

## 9. Cálculo de Status do Ingrediente

```javascript
// Calculado no backend ao retornar ingredientes
function calcularStatus(ingrediente) {
  const { estoque_atual, estoque_minimo } = ingrediente;
  if (estoque_atual <= estoque_minimo)               return 'critico';
  if (estoque_atual <= estoque_minimo * 1.5)         return 'atencao';
  return 'normal';
}
```

---

## 10. ADRs — Decisões de Arquitetura

### ADR-01: Frontend Vanilla JS (sem framework)
**Decisão:** Manter HTML + CSS + Vanilla JS do protótipo
**Justificativa:** Ambos os devs dominam a stack atual; introduzir React/Vue aumentaria o tempo de onboarding sem benefício real no MVP
**Consequência:** Sem reatividade automática — DOM manipulado manualmente por cada page script

### ADR-02: Backend Node.js + Express (monolito)
**Decisão:** API REST única com Express
**Justificativa:** Stack unificada em JS; Express é mínimo e conhecido; escopo do piloto não justifica microserviços
**Consequência:** Se o sistema escalar para múltiplas lojas, precisará ser revisitado

### ADR-03: PostgreSQL como banco único
**Decisão:** PostgreSQL com colunas GENERATED para totais e lucros
**Justificativa:** Modelo relacional é ideal para produto-ingrediente-receita; colunas geradas evitam inconsistências em cálculos
**Consequência:** Requer PostgreSQL 12+ (suportado em Railway/Render/Supabase)

### ADR-04: JWT armazenado em localStorage
**Decisão:** Token JWT salvo em localStorage (não httpOnly cookie)
**Justificativa:** Frontend é HTML puro servido estático — sem servidor de template para setar cookies httpOnly
**Risco:** Vulnerável a XSS; mitigado por não injetar HTML de usuário e Content Security Policy
**Alternativa rejeitada:** Cookie httpOnly exigiria proxy ou SSR

### ADR-05: Soft delete em produtos
**Decisão:** Produtos marcados como `ativo = false` em vez de deletados
**Justificativa:** Vendas históricas referenciam produtos; deletar quebraria o histórico financeiro
**Consequência:** Listagem de PDV filtra `WHERE ativo = true`

---

## 11. Variáveis de Ambiente (.env.example)

```
# Banco de dados
DATABASE_URL=postgresql://usuario:senha@host:5432/gestao_comercial

# JWT
JWT_SECRET=troque_por_string_aleatoria_segura
JWT_EXPIRES_IN=8h

# Servidor
PORT=3000
NODE_ENV=development

# CORS (URL do frontend em produção)
FRONTEND_URL=https://seu-frontend.railway.app
```

---

## 12. Estratégia de Testes

| Tipo | O que testar | Ferramenta |
|---|---|---|
| Unitário | Cálculo de custo/lucro, cálculo de status de ingrediente | Jest |
| Integração | POST /api/vendas desconta estoque corretamente | Jest + supertest + DB de teste |
| Integração | POST /api/compras incrementa estoque | Jest + supertest |
| Integração | Rota 403 para perfil não autorizado | Jest + supertest |
| Manual | Fluxo completo do Operador (PDV → fechamento) | Teste com usuário real |
| Manual | Alerta de estoque crítico aparece na tela | Inspeção visual |

---

## 13. Plano de Deploy

```
Railway (recomendado para MVP):
├── Serviço 1: Backend Node.js (auto-deploy via GitHub)
├── Serviço 2: PostgreSQL (plugin Railway)
└── Serviço 3: Frontend HTML estático (ou mesmo serviço backend servindo /public)

Alternativa: Render.com
├── Web Service: Node.js backend
├── PostgreSQL: Managed DB
└── Static Site: Frontend HTML
```

**Estratégia de servir o frontend:**
O backend Express serve os arquivos HTML estáticos via `express.static('frontend')`,
eliminando a necessidade de um serviço separado no MVP.

---

## 14. Manifesto de Arquivos a Criar

### Backend (novos)
| Arquivo | Descrição |
|---|---|
| `backend/src/app.js` | Entry point Express, middlewares globais, rotas |
| `backend/src/config/database.js` | Pool de conexão pg |
| `backend/src/middleware/auth.js` | Verifica JWT |
| `backend/src/middleware/roles.js` | Verifica perfil |
| `backend/src/routes/*.routes.js` | 7 arquivos de rotas |
| `backend/src/controllers/*.controller.js` | 7 arquivos de controllers |
| `backend/src/db/migrations/001_schema_inicial.sql` | Schema completo |
| `backend/src/db/seed.js` | Admin padrão + dados de exemplo |
| `backend/package.json` | Dependências: express, pg, bcrypt, jsonwebtoken, dotenv, cors |
| `backend/.env.example` | Template de variáveis |

### Frontend (reaproveitados + modificados)
| Arquivo | Ação |
|---|---|
| `frontend/assets/css/style.css` | Reaproveitado do protótipo |
| `frontend/assets/js/app.js` | Refatorado: menu por perfil, JWT check |
| `frontend/assets/js/api.js` | **Novo:** fetch wrapper com JWT |
| `frontend/assets/js/auth.js` | Refatorado: usa API em vez de localStorage |
| `frontend/assets/js/dashboard.js` | Refatorado: consome GET /api/dashboard |
| `frontend/assets/js/ingredientes.js` | Refatorado: CRUD via API |
| `frontend/assets/js/produtos.js` | Refatorado: CRUD + ficha técnica via API |
| `frontend/assets/js/compras.js` | Refatorado: registro + histórico via API |
| `frontend/assets/js/lista-compras.js` | **Novo:** consome GET /api/lista-compras |
| `frontend/assets/js/pdv.js` | **Novo:** carrinho + POST /api/vendas |
| `frontend/assets/js/historico-dia.js` | **Novo:** consome GET /api/vendas/hoje |
| `frontend/assets/js/financeiro.js` | Refatorado: consome /api/financeiro/* |
| `frontend/assets/js/usuarios.js` | Refatorado: CRUD via API |
| `frontend/*.html` | Refatorados: removem referências ao localStorage |
| `frontend/lista-compras.html` | **Novo** (não existia no protótipo) |
| `frontend/pdv.html` | **Novo** (não existia no protótipo) |
| `frontend/historico-dia.html` | **Novo** (não existia no protótipo) |

---

## 15. Mapa do Workflow

```
✅ Fase 0: /explorar   → BRAINSTORM_GESTAO_COMERCIAL.md
✅ Fase 1: /definir    → 01_DEFINE_GESTAO_COMERCIAL.md
✅ Fase 2: /projetar   → 02_DESIGN_GESTAO_COMERCIAL.md
✅ Fase 3: /construir  → BUILD_REPORT_GESTAO_COMERCIAL.md
✅ Deploy              → Netlify + Supabase — SISTEMA NO AR
⬜ Fase 4: /entregar   → apos validacao com dados reais da pastelaria
```

**Status atual:** Sistema funcionando em producao. Aguardando dados reais (P4-P7) para iniciar operacao do piloto.
