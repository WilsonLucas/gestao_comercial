# BRAINSTORM — Sistema de Gestão Comercial (Pastelaria Piloto)

**Data:** 2026-03-29
**Status:** Concluído — pronto para /definir
**Participantes:** 2 devs (1 engenheiro de dados + 1 dev JS) + 2 stakeholders de negócio

---

## Contexto

Sistema web de gestão comercial com piloto em uma pastelaria. O protótipo existente
(`https://romullo-dev.github.io/prototipo_financias/`) foi construído em HTML + CSS + Vanilla JS
com dados salvos em localStorage — serve como referência visual, mas precisa de backend
real para produção.

**Problema central do protótipo atual:**
- Dados não persistem entre dispositivos/usuários (localStorage)
- Controle de acesso por perfil não implementado (todos veem tudo)
- Sem conceito de ficha técnica / custo real de produção
- 3 perfis no código vs. 4 perfis no novo design
- Sem lista de compras automática

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
[Compra ingrediente] → estoque de ingredientes atualizado
[Cadastro de produto] → produto + ficha técnica (ingredientes + quantidades)
[Operador monta carrinho] → seleciona produtos e quantidades
[Fecha venda] → sistema desconta ingredientes do estoque + calcula lucro real
[Estoque mínimo atingido] → produto vai para lista de compras automática
```

### Entidades principais

```
ingredientes
  id, nome, unidade_medida (kg/un/litro/etc), preco_compra, estoque_atual, estoque_minimo

produtos
  id, nome, preco_venda

ficha_tecnica (receita do produto)
  produto_id, ingrediente_id, quantidade

compras (entrada de estoque)
  id, ingrediente_id, quantidade, valor_unitario, total, data

vendas
  id, data, total, lucro

itens_venda
  venda_id, produto_id, quantidade, preco_unitario, lucro

usuarios
  id, nome, email, senha_hash, perfil
```

### Cálculo de lucro por venda

```
custo_produto = Σ (preco_compra_ingrediente × quantidade_na_receita)
lucro_item = (preco_venda - custo_produto) × quantidade_vendida
```

---

## Funcionalidades por Perfil (MVP)

### Administrador
- Acesso a todos os módulos abaixo
- Dashboard com indicadores: lucro total, lucro mensal, estoque baixo, total vendido
- Relatório por produto: lucro, prejuízo, % de margem
- Cadastro e gerenciamento de usuários (todos os perfis)

### Financeiro
- Visualização de compras realizadas
- Visualização de vendas realizadas
- Análise de desempenho por produto (lucro/prejuízo)
- Resumo financeiro mensal (gastos × vendido × lucro)

### Estoque
- Cadastro de ingredientes (nome, unidade, preço, estoque mínimo)
- Registro de compras (entrada de ingredientes → atualiza estoque)
- Visualização de inventário com alertas (Normal / Atenção / Acabando)
- Lista de compras automática (ingredientes abaixo do mínimo)
- Cadastro de produtos finais com ficha técnica (receita)

### Operador (PDV)
- Tela de PDV: selecionar produtos e montar carrinho/comanda
- Ver quantidade disponível (baseado no estoque de ingredientes)
- Fechar venda → sistema desconta ingredientes + registra lucro
- Histórico das vendas do dia

---

## Abordagem Técnica Escolhida

### Stack: Evolução do protótipo

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Frontend | HTML + CSS + Vanilla JS | Mantém o trabalho existente, ambos os devs dominam |
| Backend | Node.js + Express | Mesmo ecossistema JS, curva mínima |
| Banco de dados | PostgreSQL | Relacional, ideal para o modelo produto-ingrediente-receita |
| Autenticação | JWT (JSON Web Tokens) | Substitui o sessionStorage inseguro do protótipo |
| Deploy | Railway ou Render | Simples, gratuito para MVP |

### Alternativa considerada (não escolhida)

**FastAPI (Python)** — faria sentido dado que um dos devs é engenheiro de dados, mas
o segundo dev é desconhecido e domina JS. Manter tudo em JS reduz o risco de fragmentação
do time. Pode ser avaliado em versão futura se o time crescer.

---

## YAGNI — Fora do MVP

| Feature | Motivo |
|---|---|
| Gráficos avançados (Chart.js, D3) | Tabelas respondem a pergunta "tá lucrando?" — gráficos são extra |
| Export PDF/Excel | Não bloqueia operação |
| Gestão de fornecedores | Não foi pedido |
| Múltiplas unidades/filiais | Piloto é uma loja só |
| App mobile nativo | Web responsiva resolve no MVP |
| Histórico de preços de ingredientes | Complexidade não justificada no piloto |
| Cupons/descontos no PDV | Fora do escopo definido |

---

## Riscos Identificados

| Risco | Impacto | Mitigação |
|---|---|---|
| Stakeholders não-técnicos têm expectativas de produto finalizado | Alto | Apresentar protótipo funcional em fases, cada fase com entrega demonstrável |
| Segundo dev tem skill desconhecida | Médio | Manter stack em JS, dividir frontend (HTML/CSS/JS) do backend (Node/Express) |
| Ficha técnica é complexa de manter | Médio | Interface clara de cadastro, validação de campos obrigatórios |
| Dados do localStorage do protótipo incompatíveis | Baixo | Migração não necessária — sistema novo começa do zero com seed data |

---

## Referência Visual

O protótipo existente serve como base para o design da UI:
- Layout sidebar + conteúdo principal: manter
- Paleta de cores e componentes: manter e evoluir
- Páginas existentes (dashboard, compras, vendas, estoque, financeiro, usuarios): refatorar para consumir a API real

---

## Próximo Passo

```
/definir .claude/sdd/features/BRAINSTORM_GESTAO_COMERCIAL.md
```

Isso vai capturar os requisitos formais por perfil, regras de negócio e critérios de aceite.
