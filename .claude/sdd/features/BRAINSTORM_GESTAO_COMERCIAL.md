# BRAINSTORM — Sistema de Gestão Comercial (Pastelaria Piloto)

**Data:** 2026-03-29
**Revisado:** 2026-04-02
**Status:** Re-analisado com expertise de segurança e boas práticas 2026
**Participantes:** 2 devs (1 engenheiro de dados + 1 dev JS) + 2 stakeholders de negócio

---

## Contexto

Sistema web de gestão comercial com piloto em uma pastelaria. O protótipo existente
foi construído em HTML + CSS + Vanilla JS com dados salvos em localStorage — serve
como referência visual. O sistema foi implementado com Supabase como backend
(PostgreSQL + RPC functions) e está no ar no Netlify.

**Problema central do protótipo original (resolvido):**
- ✅ Dados não persistem entre dispositivos/usuários (localStorage)
- ✅ Controle de acesso por perfil não implementado
- ✅ Sem conceito de ficha técnica / custo real de produção
- ✅ Sem lista de compras automática

**Problemas críticos identificados na revisão pós-build:**
- ❌ Zero Row-Level Security (RLS) no Supabase
- ❌ Controle de acesso 100% client-side (bypassável via console)
- ❌ XSS em app.js (interpolação direta de dados do usuário em innerHTML)
- ❌ Race condition em compras.js (2 operações separadas, não atômicas)
- ❌ Chave anon Supabase hardcoded no JS
- ❌ Sessão localStorage sem expiração
- ❌ Label "PDV - TESTE" no menu de produção

---

## Perfis de Acesso (4 perfis definidos)

| Perfil | Responsabilidade | Acessos |
|---|---|---|
| **Administrador** | Dono da empresa | Tudo + relatórios + cadastro de usuários |
| **Financeiro** | Controle financeiro | Compras, vendas, análise de lucro/prejuízo |
| **Estoque** | Gestor de inventário | Ingredientes, compras, alertas, lista de compras |
| **Operador** | Caixa / atendente | PDV com carrinho → fecha venda |

---

## Modelo de Dados Central

### Fluxo de valor

```
[Compra ingrediente] → estoque de ingredientes atualizado (via RPC atômica)
[Cadastro de produto] → produto + ficha técnica (ingredientes + quantidades)
[Operador monta carrinho] → seleciona produtos e quantidades
[Fecha venda] → sistema desconta ingredientes do estoque + calcula lucro real (via RPC atômica)
[Estoque mínimo atingido] → produto vai para lista de compras automática
```

### Entidades principais

```
usuarios
  id, nome, email, senha_hash, perfil, ativo, criado_em

ingredientes
  id, nome, unidade_medida, preco_compra, estoque_atual, estoque_minimo, criado_em, atualizado_em

produtos
  id, nome, preco_venda, categoria, ativo, criado_em

ficha_tecnica (receita do produto)
  produto_id, ingrediente_id, quantidade

compras (entrada de estoque)
  id, ingrediente_id, quantidade, valor_unitario, total (gerado), data, criado_por, criado_em

vendas
  id, data, total, custo_total, lucro (gerado), operador_id, criado_em

itens_venda
  venda_id, produto_id, quantidade, preco_unitario, custo_unitario, total (gerado), lucro (gerado)
```

---

## Vulnerabilidades e Riscos de Segurança

### Críticos (devem ser corrigidos antes de qualquer uso real)

| # | Vulnerabilidade | Impacto | Correção |
|---|---|---|---|
| V1 | **Zero RLS no Supabase** | Qualquer pessoa com a anon key acessa todas as tabelas sem restrição | Implementar RLS policies por perfil em todas as tabelas |
| V2 | **Controle de acesso client-side** | Operador pode chamar `db.from('vendas').select('*')` no console e ver dados financeiros | RLS enforcement no banco, não só no menu |
| V3 | **XSS em app.js** | `usuario.nome` interpolado direto em innerHTML — usuário malicioso com nome `<script>...` pode executar JS | Função `escapeHtml()` em todo innerHTML com dados do usuário |
| V4 | **Race condition em compras.js** | INSERT compra + UPDATE estoque são 2 chamadas separadas: se a segunda falhar, estoque fica desatualizado | Migrar para RPC `registrar_compra()` atômica (como `fechar_venda()`) |

### Altos

| # | Vulnerabilidade | Impacto | Correção |
|---|---|---|---|
| V5 | **Sessão sem expiração** | Token/sessão nunca expira, mesmo com inatividade longa | Salvar `expirado_em` junto ao usuário; verificar a cada request |
| V6 | **Proteção de admin hardcoded no frontend** | Lista de e-mails protegidos em `usuarios.js` — bypassável via console | Validar no RLS/RPC, não no JS |
| V7 | **Senhas padrão 123456 documentadas** | Credenciais de acesso publicadas no repo/docs | Remover dos docs; forçar troca no primeiro login |

### Médios

| # | Vulnerabilidade | Impacto | Correção |
|---|---|---|---|
| V8 | **Chave anon exposta no código** | A anon key é pública por design do Supabase, mas sem RLS isso equivale a acesso total | RLS torna a exposição da anon key aceitável |
| V9 | **Double-click em botões** | Usuário pode cadastrar compra/venda em duplicidade | Desabilitar botão durante request (loading state) |
| V10 | **Sem confirmação em ações destrutivas** | Deleção de ingrediente/inativação de produto/usuário acontece sem confirmação | Modal de confirmação antes de ações irreversíveis |
| V11 | **Sem validação server-side de inputs** | Supabase RPC aceita valores negativos, strings muito longas etc. | Adicionar CHECK constraints e validação nas RPC functions |

---

## Melhorias Identificadas na Revisão

### Segurança (obrigatórias)
1. **RLS policies** — controle de acesso real no banco
2. **RPC `registrar_compra()`** — operação atômica como `fechar_venda()`
3. **Escape de HTML** — proteção XSS em todos os pontos de interpolação
4. **Expiração de sessão** — TTL de 8h na sessão localStorage
5. **Confirmação antes de ações destrutivas**
6. **Loading states** — prevenção de double-submit

### UX / Operacional
7. **Label "PDV - TESTE"** → "PDV" no menu de produção
8. **Feedback visual durante carregamento** — skeleton ou spinner
9. **Validação de formulários mais clara** — mensagens de erro por campo
10. **Paginação no financeiro** — evitar carregar todo histórico

### Técnicas
11. **RLS `administrador` pode fazer tudo** — granularidade adequada por perfil
12. **RLS `operador`** só pode inserir vendas, não ver histórico financeiro
13. **RLS `financeiro`** vê compras e vendas mas não consegue inserir/deletar

---

## Abordagem Técnica Definida

### Stack: Mantida (sem alterações)

| Camada | Tecnologia | Status |
|---|---|---|
| Frontend | HTML + CSS + Vanilla JS | Mantida — ambos os devs dominam |
| Backend | Supabase (PostgreSQL + RPC) | Mantida — substitui o Node.js original |
| Auth | RPC customizada `autenticar()` + localStorage | Mantida — migrações incrementais preferidas |
| Deploy | Netlify (frontend) + Supabase (DB) | No ar |

### Por que não migrar para Supabase Auth?

A migração para `supabase.auth.signIn()` (Supabase Auth nativo) seria a correção ideal
para auth, mas requereria:
- Migrar tabela `usuarios` para `auth.users`
- Reescrever toda a lógica de auth no frontend
- Risco de regressão em um sistema já em produção

**Decisão:** Manter auth customizada + corrigir via RLS e expiração de sessão.
Supabase Auth pode ser avaliado na próxima versão maior.

---

## YAGNI — Fora do MVP (inalterado)

| Feature | Motivo |
|---|---|
| Gráficos avançados (Chart.js já integrado, YAGNI para dashboards complexos) | Tabelas respondem a pergunta "tá lucrando?" |
| Export PDF/Excel | Não bloqueia operação |
| Gestão de fornecedores | Não foi pedido |
| Múltiplas unidades/filiais | Piloto é uma loja só |
| App mobile nativo | Web responsiva resolve no MVP |
| Histórico de preços de ingredientes | Complexidade não justificada no piloto |
| Cupons/descontos no PDV | Fora do escopo definido |
| Supabase Auth nativo | Regressão em sistema em produção — pós-MVP |

---

## Riscos Identificados (Revisados)

| Risco | Impacto | Status | Mitigação |
|---|---|---|---|
| Dados financeiros expostos sem RLS | **Crítico** | ❌ Aberto | Implementar RLS imediatamente |
| XSS via nome de usuário | **Alto** | ❌ Aberto | Adicionar escapeHtml() |
| Race condition em compras | **Alto** | ❌ Aberto | Criar RPC `registrar_compra()` |
| Sessão sem expiração | **Médio** | ❌ Aberto | Adicionar TTL ao localStorage |
| Double-submit em PDV | **Médio** | ❌ Aberto | Loading state no botão finalizar |
| Senha padrão 123456 documentada | **Médio** | ❌ Aberto | Remover de documentação pública |
| Stakeholders com expectativas de produto finalizado | Médio | ✅ Mitigado | Sistema no ar com dados reais |
| Segundo dev com skill desconhecida | Médio | ✅ Mitigado | Stack em JS, estrutura clara |
| Ficha técnica complexa de manter | Médio | ✅ Mitigado | Modal com interface clara implementado |

---

## Referência Visual

O sistema está implementado e no ar. Design de UI mantido com:
- Layout sidebar + conteúdo principal
- Modais para cadastro/edição
- Tabelas com filtros (produtos, ingredientes)
- Ficha técnica expansível inline (botão hamburger)
- Botão casinha na topbar para navegação
