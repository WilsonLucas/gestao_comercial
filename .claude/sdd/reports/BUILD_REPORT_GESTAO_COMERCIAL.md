# RELATORIO DE BUILD: Gestao Comercial

**Data:** 01/04/2026
**Status:** SISTEMA NO AR

---

## Resumo

| Metrica | Valor |
|---------|-------|
| Fases concluidas | Build + Migracao Supabase + Deploy |
| Arquivos JS migrados | 11 |
| HTMLs atualizados | 10 |
| Arquivos removidos (backend Node.js) | 29 |
| Arquivos criados (Supabase) | 4 |
| Frontend hospedado | Netlify |
| Banco de dados | Supabase (PostgreSQL) |

---

## Fase 1 — Build Inicial (Node.js + Express)

Sistema construido inicialmente com backend Node.js + Express + PostgreSQL.

### Backend criado e posteriormente removido

| Arquivo | Proposito |
|---------|-----------|
| `backend/package.json` | Dependencias e scripts npm |
| `backend/src/app.js` | Entry point Express |
| `backend/src/config/database.js` | Pool de conexao PostgreSQL |
| `backend/src/middleware/auth.js` | Verificacao JWT |
| `backend/src/middleware/roles.js` | Autorizacao por perfil |
| `backend/src/db/migrations/001_schema_inicial.sql` | Schema completo |
| `backend/src/controllers/*.controller.js` | 8 controllers |
| `backend/src/routes/*.routes.js` | 8 arquivos de rotas |

> Backend removido integralmente na Fase 2 (migracao para Supabase).

---

## Fase 2 — Migracao para Supabase

**Motivo:** Impossibilidade de hospedar backend Node.js no GitHub Pages.
**Solucao:** Migrar toda a logica para Supabase (PostgreSQL + RPC functions), mantendo o frontend como HTML/CSS/JS puro.

### Arquivos criados

| Arquivo | Proposito |
|---------|-----------|
| `supabase/migrations/001_schema_supabase.sql` | Schema completo com 7 tabelas e 5 RPC functions |
| `supabase/seed.sql` | 4 usuarios padrao + dados de exemplo da pastelaria |
| `assets/js/supabase-client.js` | Inicializacao do SDK Supabase via CDN |
| `.nojekyll` | Compatibilidade com GitHub Pages |
| `SUPABASE_SETUP.md` | Guia de configuracao do Supabase |

### RPC Functions no banco (substituem os controllers)

| Funcao | Equivalente anterior |
|--------|----------------------|
| `autenticar(p_email, p_senha)` | POST /api/auth/login |
| `criar_usuario(p_nome, p_email, p_senha, p_perfil)` | POST /api/usuarios |
| `alterar_senha(p_usuario_id, p_nova_senha)` | PUT /api/usuarios/:id |
| `fechar_venda(p_itens, p_operador_id)` | POST /api/vendas (atomico) |
| `dashboard_metrics()` | GET /api/dashboard |

### Arquivos JS migrados (API → Supabase)

| Arquivo | Mudanca principal |
|---------|-------------------|
| `assets/js/app.js` | Sessao via `sgc_user` no localStorage (antes: JWT) |
| `assets/js/auth.js` | Login via `db.rpc('autenticar')` (antes: POST /api/auth/login) |
| `assets/js/dashboard.js` | `db.rpc('dashboard_metrics')` + joins via Supabase |
| `assets/js/ingredientes.js` | `db.from('ingredientes')` CRUD completo |
| `assets/js/produtos.js` | `db.from('produtos').select(ficha_tecnica join)` |
| `assets/js/compras.js` | Insert compra + update estoque via Supabase |
| `assets/js/pdv.js` | `db.rpc('fechar_venda')` atomico |
| `assets/js/financeiro.js` | Joins vendas + compras, agrupamento client-side |
| `assets/js/usuarios.js` | `db.rpc('criar_usuario')` + `db.rpc('alterar_senha')` |
| `assets/js/lista-compras.js` | `db.from('ingredientes')` + filtro status client-side |
| `assets/js/historico-dia.js` | `db.from('vendas').gte/lte('data', hoje)` |

### HTMLs atualizados

Todos os 10 HTMLs com scripts substituiram:
```html
<!-- antes -->
<script src="assets/js/api.js"></script>

<!-- depois -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/supabase-client.js"></script>
```

---

## Fase 3 — Deploy

| Servico | URL | Status |
|---------|-----|--------|
| Frontend (Netlify) | deploy automatico via GitHub | ✅ No ar |
| Banco de dados (Supabase) | projeto WilsonLucas's Project | ✅ Ativo |

**Credenciais de acesso ao sistema:**

| E-mail | Senha | Perfil |
|--------|-------|--------|
| admin@admin.com | — | administrador |
| financeiro@admin.com | — | financeiro |
| estoque@admin.com | — | estoque |
| operador@admin.com | — | operador |

---

## Regras de Negocio Implementadas

| Regra | Descricao | Onde |
|-------|-----------|------|
| RN-01 | Bloquear venda se estoque insuficiente (atomico via RPC) | `fechar_venda()` no Supabase |
| RN-02 | Custo calculado com preco_compra atual do ingrediente | `fechar_venda()` no Supabase |
| RN-03 | Produto precisa de ficha tecnica para ser vendido | Validado no `fechar_venda()` |
| RN-05 | Gestao de usuarios restrita ao administrador | Menu filtrado por perfil em `app.js` |
| RN-06 | 4 usuarios padrao nao podem ser desativados | Validado em `usuarios.js` por email |
| RN-08 | Operador nao ve custo nem margem — apenas preco de venda | `pdv.js` nao exibe campos de custo |

---

## Controle de Acesso

| Perfil | Telas disponiveis |
|--------|------------------|
| administrador | dashboard, ingredientes, produtos, compras, lista-compras, pdv, financeiro, usuarios |
| financeiro | compras, financeiro |
| estoque | ingredientes, produtos, compras, lista-compras |
| operador | pdv, historico-dia |

---

## Status: SISTEMA NO AR E FUNCIONAL
