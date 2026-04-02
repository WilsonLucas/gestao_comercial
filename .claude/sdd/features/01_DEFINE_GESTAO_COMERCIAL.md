# DEFINE — Sistema de Gestão Comercial (Pastelaria Piloto)

**Fase:** 1 — Requisitos
**Data:** 2026-03-29
**Revisado:** 2026-04-02 — Adicionados requisitos de segurança e RLS
**Status:** Aprovado — revisão de segurança concluída
**Score de Clareza:** 15/15
**Origem:** BRAINSTORM_GESTAO_COMERCIAL.md

---

## 1. Declaração do Problema

Pastelarias e pequenos comércios operam com controle de estoque e financeiro
de forma manual ou em planilhas separadas, sem visibilidade do custo real de
produção por produto. Isso impede saber com precisão quais itens dão lucro,
quando reabastecer e quanto o negócio realmente ganha.

O sistema foi implementado com Supabase como backend. A revisão pós-build
identificou que o controle de acesso estava implementado apenas no frontend
(client-side), sem enforcement no banco de dados — permitindo que qualquer
usuário autenticado acessasse todos os dados via Supabase SDK diretamente.

---

## 2. Personas e Perfis de Acesso

### Perfil 01 — Administrador
**Quem é:** Dono da empresa
**Objetivo:** Visão completa do negócio — financeiro, estoque e equipe
**Acesso:** Todos os módulos + relatórios + gestão de usuários

### Perfil 02 — Financeiro
**Quem é:** Responsável pelo controle financeiro da loja
**Objetivo:** Acompanhar entradas (compras) e saídas (vendas), analisar lucro por produto
**Acesso:** Módulo financeiro (compras realizadas, vendas realizadas, desempenho por produto)

### Perfil 03 — Estoque
**Quem é:** Gestor de inventário / responsável pelas compras de insumos
**Objetivo:** Nunca deixar faltar ingrediente, saber o que comprar e quanto
**Acesso:** Ingredientes, compras, inventário, alertas, lista de compras, ficha técnica

### Perfil 04 — Operador
**Quem é:** Caixa / atendente
**Objetivo:** Registrar pedidos rapidamente sem errar
**Acesso:** PDV (ponto de venda) — montar comanda e fechar venda

---

## 3. Objetivos do Sistema

| # | Objetivo | Perfil Beneficiado |
|---|---|---|
| O1 | Controlar estoque de ingredientes com alertas de quantidade mínima | Estoque, Admin |
| O2 | Gerar lista de compras automática quando ingrediente atinge estoque mínimo | Estoque |
| O3 | Cadastrar produtos finais com ficha técnica (receita de ingredientes) | Estoque |
| O4 | Calcular custo real e lucro por produto a partir da ficha técnica | Financeiro, Admin |
| O5 | Registrar vendas via PDV com carrinho/comanda (múltiplos produtos) | Operador |
| O6 | Descontar ingredientes do estoque automaticamente ao fechar venda | Estoque, Operador |
| O7 | Exibir desempenho financeiro por produto (lucro/prejuízo/margem) | Financeiro, Admin |
| O8 | Controlar acesso por perfil — enforcement no banco, não apenas no menu | Todos |
| O9 | Permitir ao Admin cadastrar, editar e remover usuários do sistema | Admin |

---

## 4. Requisitos Funcionais

### RF-01 — Autenticação e Controle de Acesso
- O sistema deve autenticar usuários via e-mail e senha
- Cada usuário tem um perfil: Administrador, Financeiro, Estoque ou Operador
- O menu e as rotas devem ser restritos de acordo com o perfil (client-side UX)
- **O banco de dados deve enforçar o controle de acesso via RLS (Row-Level Security)**
- Sessão mantida via localStorage com **expiração de 8 horas**
- Logout encerra a sessão imediatamente
- **Sessão expirada automaticamente detectada e redirecionada para login**

### RF-02 — Cadastro de Ingredientes (Perfil: Estoque, Admin)
- Campos obrigatórios: nome, unidade de medida (kg / g / un / litro / ml), preço de compra, estoque mínimo
- Campos calculados: estoque atual (atualizado via compras)
- Status automático baseado no estoque atual vs. estoque mínimo:
  - **Normal:** estoque_atual > estoque_minimo × 1,5
  - **Atenção:** estoque_minimo < estoque_atual ≤ estoque_minimo × 1,5
  - **Crítico:** estoque_atual ≤ estoque_minimo
- **RLS:** Somente administrador e estoque podem INSERT/UPDATE/DELETE ingredientes

### RF-03 — Registro de Compras de Ingredientes (Perfil: Estoque, Admin)
- Campos obrigatórios: ingrediente, quantidade comprada, valor unitário, data
- **Ao salvar: operação ATÔMICA via RPC `registrar_compra()` — estoque e compra em uma transação**
- Histórico de compras com filtro por data e por ingrediente
- O valor de `preco_compra` do ingrediente é atualizado com o valor da última compra
- **RLS:** financeiro pode apenas SELECT em compras; estoque e admin podem INSERT/DELETE

### RF-04 — Lista de Compras Automática (Perfil: Estoque, Admin)
- Exibe todos os ingredientes com status Crítico ou Atenção
- Para cada ingrediente, mostra: nome, unidade, estoque atual, estoque mínimo, valor da última compra
- Permite ao gestor usar como referência para fazer o pedido (não gera pedido automático — apenas exibe)

### RF-05 — Cadastro de Produtos Finais com Ficha Técnica (Perfil: Estoque, Admin)
- Campos obrigatórios do produto: nome, preço de venda
- Ficha técnica: lista de ingredientes com quantidade utilizada por unidade do produto
- Deve ser possível adicionar, editar e remover ingredientes da ficha técnica
- O custo de produção é calculado automaticamente: `Σ (preco_compra_ingrediente × quantidade_na_receita)`
- A margem de lucro é exibida automaticamente: `((preco_venda - custo) / preco_venda) × 100`
- **RLS:** Operador pode apenas SELECT em produtos ativos; estoque e admin podem CRUD

### RF-06 — PDV / Ponto de Venda (Perfil: Operador, Admin)
- Tela de PDV exibe todos os produtos cadastrados disponíveis para venda
- O Operador monta uma comanda adicionando produtos e quantidades (carrinho)
- O sistema valida se há estoque de ingredientes suficiente para produzir a quantidade solicitada
- Ao fechar a venda:
  - Os ingredientes são descontados do estoque (proporcional à ficha técnica × quantidade vendida)
  - A venda é registrada com: produtos, quantidades, valor total, custo total, lucro
- **O botão "Finalizar Venda" é desabilitado durante o processamento (loading state)**
- O Operador pode ver o histórico de vendas do dia atual
- **RLS:** Operador pode apenas INSERT em vendas e SELECT em vendas/itens do dia; financeiro/admin têm acesso histórico completo

### RF-07 — Módulo Financeiro (Perfil: Financeiro, Admin)
- Resumo mensal: gastos em compras × total vendido × lucro líquido
- Desempenho por produto: total vendido, custo total, lucro total, margem %
- Histórico de vendas com filtro por data
- Histórico de compras com filtro por data
- **RLS:** Operador não tem acesso a dados financeiros históricos

### RF-08 — Dashboard do Administrador (Perfil: Admin)
- Indicadores principais: lucro do mês atual, total vendido no mês, total gasto no mês, produtos com estoque crítico
- Tabela de últimas vendas (5 mais recentes)
- Tabela de produtos com estoque crítico ou em atenção

### RF-09 — Gestão de Usuários (Perfil: Admin)
- Cadastrar novo usuário: nome, e-mail, senha, perfil
- Editar usuário existente (incluindo redefinir senha)
- Desativar usuário (exceto o próprio Admin logado)
- Listar todos os usuários com nome, e-mail e perfil
- **RLS:** Somente administrador pode SELECT/INSERT/UPDATE em usuários
- **Proteção de admin padrão implementada no banco (RPC), não apenas no frontend**

### RF-10 — Segurança e Integridade de Dados (NOVO)
- **Todas as tabelas devem ter Row-Level Security (RLS) habilitada**
- **As policies RLS devem usar a função `current_setting('app.usuario_id')` para identificar o usuário ativo**
- **Operações que modificam múltiplas tabelas devem ser feitas via RPC (transação atômica)**
- **Todo HTML dinâmico gerado no frontend deve sanitizar dados via `escapeHtml()`**
- **Sessão deve expirar após 8h de inatividade**
- **Ações destrutivas devem exibir modal de confirmação antes de executar**
- **Botões de submit devem ser desabilitados durante requests para prevenir double-submit**

---

## 5. Requisitos Não Funcionais

| # | Requisito | Critério |
|---|---|---|
| RNF-01 | Segurança de autenticação | Senhas armazenadas com hash (pgcrypto), sessão com expiração de 8h |
| RNF-02 | Persistência de dados | Banco de dados PostgreSQL via Supabase — dados não dependem do navegador |
| RNF-03 | Multi-usuário | Múltiplos usuários simultâneos com dados compartilhados |
| RNF-04 | Responsividade | Interface funcional em desktop e tablet (mínimo 768px) |
| RNF-05 | Performance do PDV | Fechar uma venda em no máximo 3 segundos após confirmação |
| RNF-06 | Disponibilidade | Deploy em plataforma com uptime ≥ 99% (Netlify + Supabase) |
| RNF-07 | Segurança de dados | Row-Level Security em todas as tabelas — acesso enforçado no banco |
| RNF-08 | Integridade transacional | Operações que modificam múltiplas tabelas executadas em transação atômica |
| RNF-09 | Proteção XSS | Todos os dados de usuário interpolados em HTML devem ser escapados |

---

## 6. Critérios de Sucesso (Mensuráveis)

| Critério | Como medir |
|---|---|
| Operador consegue registrar uma venda com 3+ produtos em menos de 2 minutos | Teste com usuário real |
| Gestor de estoque recebe alerta visual de ingrediente crítico sem precisar verificar manualmente | Inspecionar a tela de inventário |
| Administrador visualiza lucro por produto sem cálculo manual | Acessar o módulo financeiro |
| Dados persistem entre sessões e dispositivos diferentes | Logar em dois navegadores diferentes |
| Cada perfil acessa apenas seu módulo — **verificado também via chamadas diretas ao Supabase SDK** | Teste de acesso via browser console com cada perfil |
| Sistema suporta pelo menos 4 usuários simultâneos sem erro | Teste de carga básico |
| **Operador NÃO consegue ver dados de vendas históricas via console** | `db.from('vendas').select('*')` retorna 0 rows para operador |
| **Double-click no PDV não gera venda duplicada** | Teste de duplo clique em "Finalizar Venda" |

---

## 7. Regras de Negócio

| # | Regra |
|---|---|
| RN-01 | Não é possível vender um produto se o estoque de algum ingrediente da ficha técnica for insuficiente |
| RN-02 | O preço de custo usado no cálculo de lucro é sempre o preço da última compra do ingrediente |
| RN-03 | Todo produto deve ter ao menos um ingrediente na ficha técnica para poder ser vendido |
| RN-04 | Ao registrar uma compra, o estoque atual do ingrediente é sempre incrementado via transação atômica |
| RN-05 | Apenas o Administrador pode cadastrar, editar ou remover usuários |
| RN-06 | O Administrador padrão não pode ser removido — validado no banco (RPC), não apenas no frontend |
| RN-07 | Uma venda não pode ser estornada na versão MVP — apenas registrada |
| RN-08 | O Operador não tem acesso a valores de custo ou margem — apenas ao preço de venda |
| RN-09 | **A sessão expira automaticamente após 8 horas** |
| RN-10 | **Ações destrutivas (excluir, inativar) requerem confirmação explícita do usuário** |
| RN-11 | **O operador só vê vendas do dia corrente; não tem acesso ao histórico financeiro completo** |

---

## 8. Fora do Escopo (MVP)

| Item | Motivo |
|---|---|
| Gráficos e charts visuais avançados | Tabelas respondem às perguntas do negócio |
| Export PDF/Excel | Não bloqueia operação no piloto |
| Gestão de fornecedores | Não foi requisitado |
| Múltiplas filiais/unidades | Piloto é uma loja |
| App mobile nativo | Web responsiva atende |
| Cupons e descontos no PDV | Fora do escopo definido |
| Estorno/cancelamento de venda | Complexidade pós-MVP |
| Histórico de variação de preço de ingredientes | Não requisitado |
| Supabase Auth nativo | Risco de regressão em sistema em produção — pós-MVP |
| Rate limiting no login | Supabase gerencia isso na camada de API |

---

## 9. Tela Inicial — Login

### RF-10 — Tela de Login (pública, sem autenticação)
- Exibe logo do sistema
- Campo e-mail (obrigatório)
- Campo senha (obrigatório, mascarado)
- Botão "Entrar"
- Mensagem de erro em caso de credenciais inválidas
- Redirecionamento automático para a tela inicial do perfil após login bem-sucedido

---

## 10. Mapa de Telas por Perfil

### Perfil Administrador — acesso completo

| Tela | Conteúdo |
|---|---|
| **Dashboard** | Lucro do mês, total vendido, total gasto, nº de produtos críticos, últimas 5 vendas, ingredientes em alerta |
| **Ingredientes** | Listagem com status (Normal/Atenção/Crítico), cadastro/edição/exclusão, filtro por status |
| **Produtos** | Listagem de produtos finais, cadastro com ficha técnica |
| **Compras** | Registro de nova compra de ingrediente (via RPC atômica), histórico |
| **Lista de Compras** | Ingredientes em status Crítico ou Atenção |
| **PDV** | Produtos disponíveis, montagem de carrinho, fechamento de venda |
| **Financeiro** | Resumo mensal, desempenho por produto |
| **Usuários** | Listagem, cadastro, edição e desativação |

### Perfil Financeiro

| Tela | Conteúdo |
|---|---|
| **Compras** | Histórico de compras (somente visualização) |
| **Financeiro** | Resumo mensal, desempenho por produto |

### Perfil Estoque

| Tela | Conteúdo |
|---|---|
| **Ingredientes** | Listagem com status, cadastro/edição/exclusão |
| **Produtos** | Listagem, cadastro com ficha técnica |
| **Compras** | Registro + histórico |
| **Lista de Compras** | Ingredientes abaixo do mínimo |

### Perfil Operador

| Tela | Conteúdo |
|---|---|
| **PDV** | Produtos disponíveis, montagem de carrinho, fechamento de venda |
| **Histórico do Dia** | Vendas registradas no dia atual (somente visualização) |

---

## 11. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + Vanilla JS |
| Backend | Supabase (PostgreSQL + RPC functions) |
| Banco de Dados | PostgreSQL com RLS habilitado em todas as tabelas |
| Auth | RPC customizada `autenticar()` + localStorage com expiração de 8h |
| Deploy | Netlify (frontend) + Supabase (DB) |
