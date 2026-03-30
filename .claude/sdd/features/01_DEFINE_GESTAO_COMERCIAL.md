# DEFINE — Sistema de Gestão Comercial (Pastelaria Piloto)

**Fase:** 1 — Requisitos
**Data:** 2026-03-29
**Status:** Aprovado para /projetar
**Score de Clareza:** 14/15
**Origem:** BRAINSTORM_GESTAO_COMERCIAL.md

---

## 1. Declaração do Problema

Pastelarias e pequenos comércios operam com controle de estoque e financeiro
de forma manual ou em planilhas separadas, sem visibilidade do custo real de
produção por produto. Isso impede saber com precisão quais itens dão lucro,
quando reabastecer e quanto o negócio realmente ganha.

O protótipo existente (HTML/CSS/JS com localStorage) valida a interface visual,
mas não é viável para produção: dados não persistem entre dispositivos, não há
controle real de acesso por perfil e não existe o conceito de ficha técnica
(custo de ingredientes por produto).

---

## 2. Personas e Perfis de Acesso

### Perfil 01 — Administrador
**Quem é:** Dono da empresa
**Objetivo:** Visão completa do negócio — financeiro, estoque e equipe
**Frustração atual:** Não sabe quais produtos dão mais lucro nem quando o estoque está crítico
**Acesso:** Todos os módulos + relatórios + gestão de usuários

### Perfil 02 — Financeiro
**Quem é:** Responsável pelo controle financeiro da loja
**Objetivo:** Acompanhar entradas (compras) e saídas (vendas), analisar lucro por produto
**Frustração atual:** Dados de compra e venda estão em fontes separadas
**Acesso:** Módulo financeiro (compras realizadas, vendas realizadas, desempenho por produto)

### Perfil 03 — Estoque
**Quem é:** Gestor de inventário / responsável pelas compras de insumos
**Objetivo:** Nunca deixar faltar ingrediente, saber o que comprar e quanto
**Frustração atual:** Descobre que faltou ingrediente só na hora do preparo
**Acesso:** Ingredientes, compras, inventário, alertas, lista de compras, ficha técnica

### Perfil 04 — Operador
**Quem é:** Caixa / atendente
**Objetivo:** Registrar pedidos rapidamente sem errar
**Frustração atual:** Precisa anotar no papel e depois lançar manualmente
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
| O8 | Controlar acesso por perfil — cada usuário vê apenas seu módulo | Todos |
| O9 | Permitir ao Admin cadastrar, editar e remover usuários do sistema | Admin |

---

## 4. Requisitos Funcionais

### RF-01 — Autenticação e Controle de Acesso
- O sistema deve autenticar usuários via e-mail e senha
- Cada usuário tem um perfil: Administrador, Financeiro, Estoque ou Operador
- O menu e as rotas devem ser restritos de acordo com o perfil
- Sessão mantida via JWT com expiração configurável
- Logout encerra a sessão imediatamente

### RF-02 — Cadastro de Ingredientes (Perfil: Estoque, Admin)
- Campos obrigatórios: nome, unidade de medida (kg / g / un / litro / ml), preço de compra, estoque mínimo
- Campos calculados: estoque atual (atualizado via compras)
- Status automático baseado no estoque atual vs. estoque mínimo:
  - **Normal:** estoque_atual > estoque_minimo × 1,5
  - **Atenção:** estoque_minimo < estoque_atual ≤ estoque_minimo × 1,5
  - **Crítico:** estoque_atual ≤ estoque_minimo

### RF-03 — Registro de Compras de Ingredientes (Perfil: Estoque, Financeiro, Admin)
- Campos obrigatórios: ingrediente, quantidade comprada, valor unitário, data
- Ao salvar: estoque_atual do ingrediente é incrementado pela quantidade comprada
- Histórico de compras com filtro por data e por ingrediente
- O valor de `preco_compra` do ingrediente é atualizado com o valor da última compra

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

### RF-06 — PDV / Ponto de Venda (Perfil: Operador, Admin)
- Tela de PDV exibe todos os produtos cadastrados disponíveis para venda
- O Operador monta uma comanda adicionando produtos e quantidades (carrinho)
- O sistema valida se há estoque de ingredientes suficiente para produzir a quantidade solicitada
- Ao fechar a venda:
  - Os ingredientes são descontados do estoque (proporcional à ficha técnica × quantidade vendida)
  - A venda é registrada com: produtos, quantidades, valor total, custo total, lucro
- O Operador pode ver o histórico de vendas do dia atual

### RF-07 — Módulo Financeiro (Perfil: Financeiro, Admin)
- Resumo mensal: gastos em compras × total vendido × lucro líquido
- Desempenho por produto: total vendido, custo total, lucro total, margem %
- Histórico de vendas com filtro por data
- Histórico de compras com filtro por data

### RF-08 — Dashboard do Administrador (Perfil: Admin)
- Indicadores principais: lucro do mês atual, total vendido no mês, total gasto no mês, produtos com estoque crítico
- Tabela de últimas vendas (5 mais recentes)
- Tabela de produtos com estoque crítico ou em atenção

### RF-09 — Gestão de Usuários (Perfil: Admin)
- Cadastrar novo usuário: nome, e-mail, senha, perfil
- Editar usuário existente (incluindo redefinir senha)
- Remover usuário (exceto o próprio Admin logado)
- Listar todos os usuários com nome, e-mail e perfil

---

## 5. Requisitos Não Funcionais

| # | Requisito | Critério |
|---|---|---|
| RNF-01 | Segurança de autenticação | Senhas armazenadas com hash (bcrypt), tokens JWT com expiração |
| RNF-02 | Persistência de dados | Banco de dados PostgreSQL — dados não dependem do navegador |
| RNF-03 | Multi-usuário | Múltiplos usuários simultâneos com dados compartilhados em tempo real |
| RNF-04 | Responsividade | Interface funcional em desktop e tablet (mínimo 768px) |
| RNF-05 | Performance do PDV | Fechar uma venda em no máximo 3 segundos após confirmação |
| RNF-06 | Disponibilidade | Deploy em plataforma com uptime ≥ 99% (Railway/Render) |

---

## 6. Critérios de Sucesso (Mensuráveis)

| Critério | Como medir |
|---|---|
| Operador consegue registrar uma venda com 3+ produtos em menos de 2 minutos | Teste com usuário real |
| Gestor de estoque recebe alerta visual de ingrediente crítico sem precisar verificar manualmente | Inspecionar a tela de inventário |
| Administrador visualiza lucro por produto sem cálculo manual | Acessar o módulo financeiro |
| Dados persistem entre sessões e dispositivos diferentes | Logar em dois navegadores diferentes |
| Cada perfil acessa apenas seu módulo (403 em rotas não autorizadas) | Teste de acesso com cada perfil |
| Sistema suporta pelo menos 4 usuários simultâneos sem erro | Teste de carga básico |

---

## 7. Regras de Negócio

| # | Regra |
|---|---|
| RN-01 | Não é possível vender um produto se o estoque de algum ingrediente da ficha técnica for insuficiente |
| RN-02 | O preço de custo usado no cálculo de lucro é sempre o preço da última compra do ingrediente |
| RN-03 | Todo produto deve ter ao menos um ingrediente na ficha técnica para poder ser vendido |
| RN-04 | Ao registrar uma compra, o estoque atual do ingrediente é sempre incrementado (nunca decrementado manualmente) |
| RN-05 | Apenas o Administrador pode cadastrar, editar ou remover usuários |
| RN-06 | O Administrador padrão (criado no seed) não pode ser removido |
| RN-07 | Uma venda não pode ser estornada na versão MVP — apenas registrada |
| RN-08 | O Operador não tem acesso a valores de custo ou margem — apenas ao preço de venda |

---

## 8. Fora do Escopo (MVP)

| Item | Motivo |
|---|---|
| Gráficos e charts visuais | Tabelas respondem às perguntas do negócio — gráficos são incremento |
| Export PDF/Excel | Não bloqueia operação no piloto |
| Gestão de fornecedores | Não foi requisitado |
| Múltiplas filiais/unidades | Piloto é uma loja |
| App mobile nativo | Web responsiva atende |
| Cupons e descontos no PDV | Fora do escopo definido |
| Estorno/cancelamento de venda | Complexidade pós-MVP |
| Histórico de variação de preço de ingredientes | Não requisitado |
| Relatórios em PDF/gráficos avançados | Pós-MVP |

---

## 9. Tela Inicial — Login

**Status do nome/logo:** Placeholder — a ser definido pelo time antes da Fase 3 (construção)

### RF-10 — Tela de Login (pública, sem autenticação)
- Exibe logo do sistema (placeholder até definição)
- Exibe nome do sistema (placeholder: "Sistema de Gestão Comercial")
- Campo e-mail (obrigatório)
- Campo senha (obrigatório, mascarado)
- Botão "Entrar"
- Mensagem de erro em caso de credenciais inválidas
- Redirecionamento automático para a tela inicial do perfil após login bem-sucedido

---

## 10. Mapa de Telas por Perfil

### Tela de Login — pública (sem perfil)
| Elemento | Descrição |
|---|---|
| Logo | Placeholder — a definir |
| Nome | Placeholder — a definir |
| Formulário | E-mail + senha + botão entrar |

---

### Perfil Administrador — acesso completo

| Tela | Conteúdo |
|---|---|
| **Dashboard** | Lucro do mês, total vendido, total gasto, nº de produtos críticos, últimas 5 vendas, ingredientes em alerta |
| **Ingredientes** | Listagem com status (Normal/Atenção/Crítico), cadastro/edição/exclusão, filtro por status |
| **Produtos** | Listagem de produtos finais, cadastro com ficha técnica (ingredientes + quantidades + margem calculada automaticamente) |
| **Compras** | Registro de nova compra de ingrediente, histórico com filtro por data e por ingrediente |
| **Lista de Compras** | Ingredientes em status Crítico ou Atenção com última quantidade comprada e último valor pago |
| **PDV** | Produtos disponíveis para venda, montagem de carrinho/comanda, fechamento de venda |
| **Financeiro** | Resumo mensal (gastos × vendas × lucro), desempenho por produto (lucro/prejuízo/margem %) |
| **Usuários** | Listagem de usuários, cadastro, edição e remoção |

---

### Perfil Financeiro

| Tela | Conteúdo |
|---|---|
| **Compras** | Histórico de compras de ingredientes (somente visualização, sem edição) |
| **Financeiro** | Resumo mensal (gastos × vendas × lucro), desempenho por produto (lucro/prejuízo/margem %) |

---

### Perfil Estoque

| Tela | Conteúdo |
|---|---|
| **Ingredientes** | Listagem com status (Normal/Atenção/Crítico), cadastro/edição/exclusão |
| **Produtos** | Listagem de produtos finais, cadastro com ficha técnica (ingredientes + quantidades + margem calculada) |
| **Compras** | Registro de nova compra de ingrediente + histórico |
| **Lista de Compras** | Ingredientes abaixo do mínimo com referência da última quantidade e valor comprado |

---

### Perfil Operador

| Tela | Conteúdo |
|---|---|
| **PDV** | Produtos disponíveis para venda, montagem de carrinho/comanda, fechamento de venda |
| **Histórico do Dia** | Vendas registradas no dia atual (somente visualização) |

---

## 11. Stack Técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + Vanilla JS (evolução do protótipo existente) |
| Backend | Node.js + Express (API REST) |
| Banco de Dados | PostgreSQL |
| Autenticação | JWT (bcrypt para hash de senha) |
| Deploy | Railway ou Render (frontend + backend + DB) |

---

## 12. Mapa do Workflow

```
✅ Fase 0: /explorar   → BRAINSTORM_GESTAO_COMERCIAL.md
✅ Fase 1: /definir    → 01_DEFINE_GESTAO_COMERCIAL.md  ← CONCLUÍDA
➡️ Fase 2: /projetar  → 02_DESIGN_GESTAO_COMERCIAL.md
⬜ Fase 3: /construir
⬜ Fase 4: /entregar
```

**Próximo passo:**
```
/projetar .claude/sdd/features/01_DEFINE_GESTAO_COMERCIAL.md
```
