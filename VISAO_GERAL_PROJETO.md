# Visão Geral do Projeto — Sistema de Gestão Comercial

**Data:** 03/04/2026
**Versão:** 1.4 — Auditoria de segurança + Módulo Cozinha
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
| Módulo Cozinha (acompanhamento de pedidos) | ✅ Concluído |
| Auditoria e correções de segurança | ✅ Concluído |
| Testes com a equipe | ⏳ Aguardando |

---

## Itens Pendentes de Definição

Os itens abaixo precisam ser respondidos pela equipe para configurar o sistema com dados reais da pastelaria.

| # | Pendência | Responsável | Status |
|---|---|---|---|
| P1 | **Nome do sistema** — como o sistema será chamado? | Sócios | ⏳ Aguardando |
| P2 | **Logo do sistema** — existe algum logo ou identidade visual definida? | Sócios | ⏳ Aguardando |
| P3 | **Usuários padrão** — 3 usuários criados automaticamente (admin, gerente, operador), senha padrão | Devs | ✅ Definido |
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
- **Módulo Cozinha** para a equipe acompanhar a fila de pedidos em tempo real
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
- Quais pedidos foram feitos e ainda precisam ser entregues

Este sistema resolve esses quatro pontos de forma automática.

---

## 3. Como o Sistema Funciona — Fluxo Principal

```
1. Gestor cadastra os INGREDIENTES
   (ex: Massa de Pastel — kg — R$ 8,00/kg)

2. Gestor cadastra os PRODUTOS com ficha técnica
   (ex: Pastel de Frango = 1 massa + 100g frango + 50g queijo)
   → sistema calcula custo automaticamente: R$ 3,20
   → margem de lucro calculada com o preço de venda informado

3. Gestor registra uma COMPRA de ingrediente
   → estoque é atualizado automaticamente

4. Sistema alerta quando ingrediente atinge o estoque mínimo
   → ingrediente aparece na Lista de Compras

5. Operador (caixa) abre o PDV, monta a COMANDA
   (ex: 3 pastéis de frango + 1 de queijo)
   → sistema verifica se há ingredientes suficientes

6. Operador fecha a venda
   → ingredientes são descontados do estoque automaticamente
   → lucro da venda é registrado
   → pedido aparece na fila da COZINHA

7. Cozinha vê o pedido na fila e clica "Entregar"
   → pedido é movido para a aba "Entregues"

8. Financeiro e Administrador visualizam o desempenho
   → lucro por produto, resumo mensal, alertas de estoque
```

---

## 4. Perfis de Acesso

Cada usuário acessa apenas o que é necessário para sua função.

### Perfil 01 — Administrador
**Quem usa:** Dono da empresa
**O que pode fazer:** Acessa tudo — estoque, financeiro, PDV, Cozinha, relatórios e cadastro de usuários

### Perfil 02 — Gerente
**Quem usa:** Responsável pelo estoque e financeiro
**O que pode fazer:** Cadastra ingredientes e produtos (com ficha técnica), registra compras, acompanha estoque, lista de compras e resultados financeiros

### Perfil 03 — Operador
**Quem usa:** Caixa / atendente
**O que pode fazer:** Monta comanda com os produtos, fecha a venda, acompanha a fila na Cozinha, vê histórico do dia

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
| **Início** | Lucro do mês, total vendido, total gasto, quantidade de ingredientes em alerta, últimas vendas |
| **Ingredientes** | Lista de todos os ingredientes com status (Normal / Atenção / Crítico), opções de cadastrar, editar e excluir |
| **Produtos** | Lista de produtos com ficha técnica, custo calculado e margem de lucro |
| **Lista de Compras** | Ingredientes abaixo do estoque mínimo com quantidade e valor da última compra |
| **Compras** | Registro de nova compra de ingrediente e histórico de compras |
| **PDV** | Tela de venda com produtos disponíveis, montagem de comanda e fechamento |
| **Cozinha** | Fila de pedidos pendentes (com tempo decorrido e alerta de urgência) + aba de entregues. Layout otimizado para tablet |
| **Financeiro** | Resumo mensal (gastos × vendas × lucro) e desempenho por produto |
| **Usuários** | Cadastro, edição e desativação de usuários do sistema |

---

### Gerente

| Tela | O que mostra |
|---|---|
| **Início** | Alertas de estoque e resumo do dia |
| **Ingredientes** | Lista com status, cadastro, edição e exclusão |
| **Produtos** | Lista de produtos com ficha técnica (ingredientes + quantidades + custo calculado + margem) |
| **Lista de Compras** | Ingredientes abaixo do mínimo com referência da última compra |
| **Compras** | Registro de nova compra + histórico |
| **Financeiro** | Resumo mensal (gastos × vendas × lucro) e desempenho por produto (lucro, prejuízo e margem %) |

---

### Operador

| Tela | O que mostra |
|---|---|
| **Início** | Atalhos para PDV e Cozinha |
| **PDV** | Produtos disponíveis, montagem de comanda com múltiplos itens, fechamento de venda |
| **Cozinha** | Fila de pedidos para preparar e entregar; botão "Entregar" por pedido |
| **Histórico do Dia** | Vendas registradas no dia atual |

---

## 6. Módulo Cozinha

A Cozinha é uma tela dedicada para uso em tablet, acessível pelos perfis Administrador e Operador.

**Funcionalidades:**
- Exibe todos os pedidos do dia em tempo real (atualiza a cada 30 segundos)
- Aba **Fila** — pedidos pendentes com tempo decorrido desde a abertura:
  - Badge **NOVO** para pedidos com menos de 5 minutos
  - Destaque **amarelo** para pedidos entre 15 e 30 minutos
  - Destaque **vermelho** para pedidos acima de 30 minutos
- Aba **Entregues** — pedidos já finalizados no dia com horário de entrega
- Botão **Entregar** em cada card: marca o pedido como entregue via RPC atômica

---

## 7. Regras do Negócio

| # | Regra |
|---|---|
| RN-01 | Não é possível vender um produto se faltar ingrediente no estoque |
| RN-02 | O custo de cada produto é calculado com base no preço da última compra do ingrediente |
| RN-03 | Todo produto precisa ter pelo menos um ingrediente na ficha técnica para poder ser vendido |
| RN-04 | Registrar uma compra sempre aumenta o estoque — o estoque nunca é diminuído manualmente |
| RN-05 | Apenas o Administrador pode cadastrar, editar ou desativar usuários |
| RN-06 | Usuário não pode desativar a própria conta |
| RN-07 | Vendas registradas não podem ser canceladas nesta versão |
| RN-08 | O Operador não vê valores de custo nem margem de lucro — apenas o preço de venda |
| RN-09 | Exclusão de compra reverte o estoque do ingrediente — operação atômica |
| RN-10 | Todas as operações de escrita sensíveis exigem validação do usuário chamador no servidor |

---

## 8. O Que Não Estará na Primeira Versão

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

## 9. Como o Sistema Calcula o Lucro

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

## 10. Alertas de Estoque

| Status | Quando acontece | O que fazer |
|---|---|---|
| **Normal** | Estoque está acima de 150% do mínimo | Nenhuma ação necessária |
| **Atenção** | Estoque entre 100% e 150% do mínimo | Planejar reposição em breve |
| **Crítico** | Estoque igual ou abaixo do mínimo | Ingrediente aparece na Lista de Compras |

---

## 11. Tecnologia Utilizada

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

## 12. Segurança do Sistema

O sistema foi submetido a auditoria de segurança (Migration 008, Abril/2026). Os principais controles implementados:

| Controle | Descrição |
|---|---|
| **RLS (Row Level Security)** | DML direto bloqueado para todas as tabelas críticas |
| **RPCs com chamador_id** | Toda operação sensível valida o perfil do usuário no servidor |
| **XSS prevention** | Todos os dados do banco inseridos via `innerHTML` passam por `App.escapeHtml()` |
| **Validação de sessão** | `isLoggedIn()` rejeita tokens com perfil fora do conjunto válido |
| **Soft delete** | Usuários são desativados, nunca excluídos — histórico preservado |
| **Sem auto-desativação** | Sistema impede que um usuário desative a própria conta |

---

## 13. Próximos Passos

| Etapa | O que acontece | Status |
|---|---|---|
| **Nome e logo** | Equipe define nome e identidade visual (P1 e P2) | ⏳ Aguardando |
| **Testes com a equipe** | Cada membro acessa com seu perfil e valida o fluxo real de operação | ⏳ Aguardando |
| **Ajustar preços de compra** | Registrar as primeiras compras reais para corrigir os preços dos ingredientes | ⏳ Aguardando |
| **Ajustes pós-teste** | Correções e melhorias identificadas durante os testes | ⬜ |
| **Operação do piloto** | Sistema em uso real na pastelaria | ⬜ |

---

## 14. Histórico de Versões

| Versão | Data | O que mudou |
|---|---|---|
| 1.0 | Mar/2026 | Sistema base: ingredientes, produtos, PDV, compras, financeiro, usuários |
| 1.1 | Mar/2026 | RLS + security hardening (migration 003); perfil gerente (migration 004) |
| 1.2 | Abr/2026 | Melhorias de UX: modais, filtros avançados, HTMLs na raiz |
| 1.3 | Abr/2026 | Módulo Cozinha: acompanhamento de pedidos em tempo real, status de vendas |
| 1.4 | Abr/2026 | Auditoria de segurança: RPCs com chamador_id, XSS fixes, validação de perfil |
