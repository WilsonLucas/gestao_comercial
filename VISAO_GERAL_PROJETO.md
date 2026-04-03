# Visão Geral do Projeto — Sistema de Gestão Comercial

**Data:** 01/04/2026
**Versão:** 1.2 — Piloto Pastelaria (sistema no ar)
**Equipe:** Douglas, Lucas, Rômulo e Wilson Lucas

---

## Status Atual do Projeto

| Marco | Status |
|---|---|
| Definição de requisitos | ✅ Concluído |
| Arquitetura e design | ✅ Concluído |
| Desenvolvimento do sistema | ✅ Concluído |
| Deploy e acesso online | ✅ **No ar — GitHub Pages + Supabase** |
| Dados reais do cardápio inseridos no sistema | ✅ Concluído |
| Melhorias de interface (UX) | ✅ Concluído |
| Testes com a equipe | ⏳ Aguardando |

---

## ⚠️ Itens Pendentes de Definição

Os itens abaixo precisam ser respondidos pela equipe para configurar o sistema com dados reais da pastelaria.

| # | Pendência | Responsável | Status |
|---|---|---|---|
| P1 | **Nome do sistema** — como o sistema será chamado? | Sócios | ⏳ Aguardando |
| P2 | **Logo do sistema** — existe algum logo ou identidade visual definida? | Sócios | ⏳ Aguardando |
| P3 | **Usuários padrão** — 4 usuários criados automaticamente (um por perfil), todos com senha padrão | Devs | ✅ Definido |
| P4 | **Produtos do cardápio** — 35 produtos inseridos com preços reais | Devs | ✅ Concluído |
| P5 | **Ingredientes** — 25 ingredientes com unidade e preço estimado | Devs | ✅ Concluído |
| P6 | **Ficha técnica** — 50g de cada recheio por pastel, definido pela equipe | Devs | ✅ Concluído |
| P7 | **Estoque mínimo** — valor simbólico (0,1) definido pela equipe para início | Devs | ✅ Concluído |

> Os dados do cardápio já estão no sistema. A equipe pode ajustar preços, quantidades e estoque mínimo diretamente pelas telas de Ingredientes e Produtos.

---

## 1. O Que É Este Sistema

Um sistema web de gestão comercial desenvolvido para a pastelaria, que reúne em um único lugar:

- **Controle de estoque** de ingredientes com alertas automáticos
- **Ficha técnica** de cada produto (receita com ingredientes e quantidades)
- **Ponto de venda (PDV)** para o caixa registrar pedidos
- **Controle financeiro** com cálculo automático de lucro e prejuízo por produto
- **Painel do administrador** com visão completa do negócio

O sistema é acessado pelo navegador (computador ou tablet), sem necessidade de instalar nada.

---

## 2. Problema que Este Sistema Resolve

Hoje a pastelaria opera sem visibilidade clara do custo real de cada produto vendido.
Não é possível saber com precisão:

- Quais pastéis dão mais lucro
- Quando um ingrediente está acabando
- Quanto o negócio realmente ganhou no mês

Este sistema resolve esses três pontos de forma automática.

---

## 3. Como o Sistema Funciona — Fluxo Principal

```
1. Gestor de Estoque cadastra os INGREDIENTES
   (ex: Massa de Pastel — kg — R$ 8,00/kg)

2. Gestor de Estoque cadastra os PRODUTOS com ficha técnica
   (ex: Pastel de Frango = 1 massa + 100g frango + 50g queijo)
   → sistema calcula custo automaticamente: R$ 3,20
   → margem de lucro calculada com o preço de venda informado

3. Gestor de Estoque registra uma COMPRA de ingrediente
   → estoque é atualizado automaticamente

4. Sistema alerta quando ingrediente atinge o estoque mínimo
   → ingrediente aparece na Lista de Compras

5. Operador (caixa) abre Vendas, monta a COMANDA
   (ex: 3 pastéis de frango + 1 de queijo)
   → sistema verifica se há ingredientes suficientes

6. Operador fecha a venda
   → ingredientes são descontados do estoque automaticamente
   → lucro da venda é registrado

7. Financeiro e Administrador visualizam o desempenho
   → lucro por produto, resumo mensal, alertas de estoque
```

---

## 4. Perfis de Acesso

Cada usuário acessa apenas o que é necessário para sua função.

### Perfil 01 — Administrador
**Quem usa:** Dono da empresa
**O que pode fazer:** Acessa tudo — estoque, financeiro, Vendas, relatórios e cadastro de usuários


### Perfil 02 — Financeiro
**Quem usa:** Responsável pelo financeiro
**O que pode fazer:** Visualiza compras realizadas e analisa lucro/prejuízo por produto e por mês


### Perfil 03 — Estoque
**Quem usa:** Gestor de inventário
**O que pode fazer:** Cadastra ingredientes e produtos (com ficha técnica), registra compras, acompanha estoque e lista de compras


### Perfil 04 — Operador
**Quem usa:** Caixa / atendente
**O que pode fazer:** Monta comanda com os produtos, fecha a venda, vê histórico do dia


---

## 5. Telas do Sistema por Perfil

### Tela de Login — todos os perfis
| O que tem | Descrição |
|---|---|
| Nome | ⏳ Pendente de definição (P1) |
| Logo | ⏳ Pendente de definição (P2) |
| Formulário | Campo de e-mail + campo de senha + botão Entrar |
| Segurança | Cada usuário acessa apenas as telas do seu perfil |

---

### Administrador — acesso completo

| Tela | O que mostra |
|---|---|
| **Dashboard** | Lucro do mês, total vendido, total gasto, quantidade de ingredientes em alerta, últimas vendas |
| **Ingredientes** | Lista de todos os ingredientes com status (Normal / Atenção / Crítico), opções de cadastrar, editar e excluir |
| **Produtos** | Lista de produtos com ficha técnica, custo calculado e margem de lucro |
| **Compras** | Registro de nova compra de ingrediente e histórico de compras |
| **Lista de Compras** | Ingredientes abaixo do estoque mínimo com quantidade e valor da última compra |
| **Vendas** | Tela de venda com produtos disponíveis, montagem de comanda e fechamento |
| **Financeiro** | Resumo mensal (gastos × vendas × lucro) e desempenho por produto |
| **Usuários** | Cadastro, edição e remoção de usuários do sistema |

---

### Financeiro

| Tela | O que mostra |
|---|---|
| **Compras** | Histórico de compras de ingredientes (somente visualização) |
| **Financeiro** | Resumo mensal (gastos × vendas × lucro) e desempenho por produto (lucro, prejuízo e margem %) |

---

### Estoque

| Tela | O que mostra |
|---|---|
| **Ingredientes** | Lista com status (Normal / Atenção / Crítico), cadastro, edição e exclusão |
| **Produtos** | Lista de produtos com ficha técnica (ingredientes + quantidades + custo calculado + margem) |
| **Compras** | Registro de nova compra + histórico |
| **Lista de Compras** | Ingredientes abaixo do mínimo com referência da última compra |

---

### Operador

| Tela | O que mostra |
|---|---|
| **PDV** | Produtos disponíveis, montagem de comanda com múltiplos itens, fechamento de venda |
| **Histórico do Dia** | Vendas registradas no dia atual |

---

## 6. Regras do Negócio

| # | Regra |
|---|---|
| RN-01 | Não é possível vender um produto se faltar ingrediente no estoque |
| RN-02 | O custo de cada produto é calculado sempre com base no preço da última compra do ingrediente |
| RN-03 | Todo produto precisa ter pelo menos um ingrediente na ficha técnica para poder ser vendido |
| RN-04 | Registrar uma compra sempre aumenta o estoque — o estoque nunca é diminuído manualmente |
| RN-05 | Apenas o Administrador pode cadastrar, editar ou remover usuários |
| RN-06 | Os 4 usuários padrão não podem ser desativados |
| RN-07 | Vendas registradas não podem ser canceladas nesta versão |
| RN-08 | O Operador não vê valores de custo nem margem de lucro — apenas o preço de venda |

---

## 7. O Que Não Estará na Primeira Versão

| Item | Motivo |
|---|---|
| Gráficos e charts visuais | As tabelas já respondem as perguntas principais |
| Exportar para PDF ou Excel | Não é necessário para operar o dia a dia |
| Cadastro de fornecedores | Não foi solicitado nesta fase |
| Suporte a múltiplas lojas/filiais | O piloto é para uma loja |
| Aplicativo para celular | O sistema funcionará no navegador do celular ou tablet |
| Cancelamento de venda | Será avaliado em versão futura |
| Descontos e cupons em Vendas | Fora do escopo desta versão |

---

## 8. Como o Sistema Calcula o Lucro

Exemplo prático com um **Pastel de Frango**:

```
Ficha técnica do Pastel de Frango:
  - 1 unidade de massa de pastel  → custo: R$ 0,80
  - 100g de frango desfiado       → custo: R$ 1,50
  - 50g de queijo                 → custo: R$ 0,90

Custo total de produção = R$ 3,20
Preço de venda = R$ 8,00

Lucro por unidade = R$ 8,00 - R$ 3,20 = R$ 4,80
Margem de lucro   = 60%
```

Quando o preço de um ingrediente mudar (nova compra com valor diferente),
o sistema atualiza o custo automaticamente a partir da próxima venda.

---

## 9. Alertas de Estoque

| Status | Quando acontece | O que fazer |
|---|---|---|
| 🟢 **Normal** | Estoque está acima de 150% do mínimo | Nenhuma ação necessária |
| 🟡 **Atenção** | Estoque entre 100% e 150% do mínimo | Planejar reposição em breve |
| 🔴 **Crítico** | Estoque igual ou abaixo do mínimo | Ingrediente aparece na Lista de Compras |

---

## 10. Tecnologia Utilizada

| Parte do sistema | Tecnologia | Por quê |
|---|---|---|
| Telas (frontend) | HTML + CSS + JavaScript | Mesma base do protótipo já desenvolvido |
| Banco de dados | PostgreSQL (Supabase) | Banco relacional robusto, gerenciado na nuvem |
| Autenticação | pgcrypto (senha hasheada no banco) | Sem dependência de serviço externo de auth |
| Backend / API | Supabase (RPC functions + REST) | Elimina a necessidade de servidor próprio |
| Hospedagem frontend | GitHub Pages | Deploy automático via GitHub, sem custo |

**Como funciona na prática:**
O frontend (HTML/CSS/JS) é hospedado no GitHub Pages e acessa o banco Supabase diretamente pelo navegador, sem servidor intermediário. Isso permite que qualquer membro da equipe acesse o sistema de qualquer dispositivo com internet.

---

## 11. Próximos Passos

| Etapa | O que acontece | Status |
|---|---|---|
| **Nome e logo** | Equipe define nome e identidade visual (P1 e P2) | ⏳ Aguardando |
| **Testes com a equipe** | Cada membro acessa com seu perfil e valida o fluxo real de operação | ⏳ Aguardando |
| **Ajustar preços de compra** | Registrar as primeiras compras reais para corrigir os preços dos ingredientes | ⏳ Aguardando |
| **Ajustes pós-teste** | Correções e melhorias identificadas durante os testes | ⬜ |
| **Operação do piloto** | Sistema em uso real na pastelaria | ⬜ |

---

## 12. Melhorias de Interface Implementadas

| Melhoria | Descrição |
|---|---|
| **Modal de cadastro — Produtos** | Formulário abre em janela modal ao clicar em "+ Novo produto" ou "Editar". Tabela ocupa largura total. |
| **Modal de cadastro — Ingredientes** | Mesmo padrão: formulário em modal, tabela em largura total. |
| **Ficha técnica expandível** | Botão ☰ em cada produto expande sub-tabela com ingredientes, quantidades, custos e margem de lucro. |
| **Botão casinha (⌂)** | Aparece na topbar em todas as telas exceto na inicial. Leva ao início do perfil logado. |
| **Coluna Categoria — Produtos** | Tabela de produtos exibe a categoria com badge colorido. Categorias: Pastéis Salgados, Pastéis Doces, Porções, Misto Quente, Bebidas. |
| **Filtros avançados — Produtos** | Barra de filtros com busca por nome, ingrediente, e multi-select por categoria e status (Ativo/Inativo). Filtragem client-side sem recarregar página. |
| **HTMLs na raiz do projeto** | Todas as páginas movidas para a raiz (sem pasta `pages/`), mantendo compatibilidade com as URLs do GitHub Pages. |
