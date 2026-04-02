# RELATORIO DE BUILD: Gestao Comercial

**Data inicial:** 01/04/2026
**Revisao de seguranca:** 02/04/2026
**Status:** SISTEMA NO AR + CORRECOES DE SEGURANCA APLICADAS

---

## Resumo

| Metrica | Valor |
|---------|-------|
| Fases concluidas | Build + Migracao Supabase + Deploy + Revisao de Seguranca |
| Arquivos JS corrigidos (revisao) | 7 |
| Migration SQL criada (revisao) | 1 (003_security_hardening.sql) |
| Frontend hospedado | Netlify |
| Banco de dados | Supabase (PostgreSQL) |

---

## Fase 1 — Build Inicial (Node.js + Express)

Sistema construido inicialmente com backend Node.js + Express + PostgreSQL.

> Backend removido integralmente na Fase 2 (migracao para Supabase).

---

## Fase 2 — Migracao para Supabase

**Motivo:** Impossibilidade de hospedar backend Node.js no GitHub Pages.
**Solucao:** Migrar toda a logica para Supabase (PostgreSQL + RPC functions), mantendo o frontend como HTML/CSS/JS puro.

### RPC Functions no banco

| Funcao | Proposito |
|--------|-----------|
| `autenticar(p_email, p_senha)` | Login customizado com pgcrypto |
| `criar_usuario(...)` | Cadastro de usuario via admin |
| `alterar_senha(...)` | Troca de senha via admin |
| `fechar_venda(p_itens, p_operador_id)` | Venda atomica com desconto de estoque |
| `dashboard_metrics()` | Metricas consolidadas do mes |

---

## Fase 3 — Deploy

| Servico | Status |
|---------|--------|
| Frontend (Netlify) | ✅ No ar |
| Banco de dados (Supabase) | ✅ Ativo |

---

## Fase 4 — Dados Reais

Script `seed_cardapio.sql` com dados reais da pastelaria:

| Categoria | Qtd |
|-----------|-----|
| Ingredientes | 25 |
| Pasteis + porcoes + bebidas | 35 |

---

## Fase 5 — Revisao de Seguranca (02/04/2026)

### Vulnerabilidades identificadas e corrigidas

| # | Severidade | Vulnerabilidade | Arquivo | Correcao |
|---|-----------|-----------------|---------|----------|
| V1 | **CRITICO** | Policies RLS `USING(true)` — acesso irrestrito | `001_schema_supabase.sql` | `003_security_hardening.sql`: policies restritivas por tabela |
| V2 | **CRITICO** | Race condition: INSERT compra + UPDATE estoque em 2 chamadas separadas | `compras.js` | RPC atomica `registrar_compra()` |
| V3 | **ALTO** | XSS: `usuario.nome` inserido direto em `innerHTML` sem escape | `app.js:104` | Funcao `escapeHtml()` aplicada em todos os pontos |
| V4 | **ALTO** | XSS: dados de ingredientes/produtos/usuarios em `innerHTML` | varios JS | `App.escapeHtml()` aplicado em todos os templates |
| V5 | **MEDIO** | Sessao localStorage sem expiracao | `auth.js` | TTL de 8h (`expira_em`) salvo na sessao |
| V6 | **MEDIO** | Double-submit no PDV (botao sem loading state) | `pdv.js` | `App.setLoading()` no botao Finalizar |
| V7 | **MEDIO** | Acoes destrutivas sem confirmacao | varios JS | `App.confirmar()` antes de excluir/inativar |
| V8 | **BAIXO** | Label "PDV - TESTE" no menu de producao | `app.js` | Corrigido para "PDV" |
| V9 | **BAIXO** | XSS em compras.js: nomes de ingredientes sem escape | `compras.js` | `App.escapeHtml()` aplicado |

### Novos artefatos criados

| Arquivo | Proposito |
|---------|-----------|
| `supabase/migrations/003_security_hardening.sql` | Remove policies permissivas; policies restritivas para vendas/itens_venda; RPC `registrar_compra()`; RPC `excluir_compra()` |

### Arquivos JS corrigidos

| Arquivo | Mudancas |
|---------|----------|
| `assets/js/app.js` | `escapeHtml()`, `confirmar()`, `setLoading()`, `isLoggedIn()` com TTL, label PDV corrigido, XSS na sidebar/topbar |
| `assets/js/auth.js` | Sessao salva com `expira_em: Date.now() + 8h` |
| `assets/js/compras.js` | Reescrito com `db.rpc('registrar_compra')` e `db.rpc('excluir_compra')` + confirmacao |
| `assets/js/pdv.js` | `App.setLoading()` no finalizar, `App.confirmar()` antes de fechar venda, `App.escapeHtml()` nos templates |
| `assets/js/ingredientes.js` | `App.confirmar()` antes de excluir, `App.escapeHtml()` nos templates |
| `assets/js/produtos.js` | `App.confirmar()` antes de inativar, `App.escapeHtml()` em nome/categoria/ingredientes |
| `assets/js/usuarios.js` | `App.confirmar()` antes de desativar, `App.escapeHtml()` em nome/email/perfil |

### CSS adicionado

| Arquivo | Mudanca |
|---------|---------|
| `assets/css/style.css` | Estilos para `.confirm-overlay` e `.confirm-dialog` |

---

## Controle de Acesso

| Perfil | Telas disponiveis |
|--------|------------------|
| administrador | dashboard, ingredientes, produtos, compras, lista-compras, pdv, financeiro, usuarios |
| financeiro | compras, financeiro |
| estoque | ingredientes, produtos, compras, lista-compras |
| operador | pdv, historico-dia |

---

## Regras de Negocio Implementadas

| Regra | Descricao | Onde |
|-------|-----------|------|
| RN-01 | Bloquear venda se estoque insuficiente | `fechar_venda()` RPC |
| RN-02 | Custo calculado com preco_compra atual | `fechar_venda()` RPC |
| RN-03 | Produto precisa de ficha tecnica para ser vendido | `fechar_venda()` RPC |
| RN-04 | Compra atomica: INSERT + UPDATE em transacao | `registrar_compra()` RPC (NOVO) |
| RN-05 | Gestao de usuarios restrita ao administrador | Menu + RPC |
| RN-06 | 4 usuarios padrao nao podem ser desativados | `usuarios.js` EMAILS_PROTEGIDOS |
| RN-08 | Operador nao ve custo nem margem | `pdv.js` |
| RN-09 | Sessao expira apos 8h | `auth.js` + `app.js` isLoggedIn() |
| RN-10 | Acoes destrutivas requerem confirmacao | `App.confirmar()` em todos os modulos |

---

## Proximos Passos Recomendados

| Prioridade | Item |
|-----------|------|
| Alta | Aplicar `003_security_hardening.sql` no Supabase (SQL Editor) |
| Alta | Trocar senhas padrao (123456) dos usuarios de teste |
| Media | Migrar para Supabase Auth nativo (permite RLS com `auth.uid()` granular) |
| Media | Adicionar paginacao no modulo financeiro (historico cresce com o tempo) |
| Baixa | Adicionar campo de busca/filtro no PDV para facilitar selecao de produtos |
| Baixa | Exportar lista de compras em CSV para uso offline |

---

## Status: SISTEMA NO AR, CORRECOES DE SEGURANCA APLICADAS, AGUARDANDO DEPLOY DA MIGRATION 003
