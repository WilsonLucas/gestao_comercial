# Visão Geral do Projeto — Sistema de Gestão Comercial

**Data:** 29/03/2026
**Versão:** 1.0 — Piloto Pastelaria
**Equipe:** Douglas, Lucas, Rômulo e Wilson Lucas

---

## ⚠️ Itens Pendentes de Definição

Os itens abaixo precisam ser decididos pela equipe antes do início do desenvolvimento.
Por favor, respondam cada ponto para que possamos avançar.

| # | Pendência | Responsável | Status |
|---|---|---|---|
| P1 | **Nome do sistema** — como o sistema será chamado? (ex: "GestãoPro", "Minha Gestão", nome da pastelaria…) | Sócios | ⏳ Aguardando |
| P2 | **Logo do sistema** — existe algum logo ou identidade visual definida? | Sócios | ⏳ Aguardando |
| P3 | **Nome e e-mail do administrador padrão** — quem será o primeiro usuário admin criado no sistema? | Sócios | ⏳ Aguardando |
| P4 | **Quais são os produtos vendidos na pastelaria?** — precisamos de uma lista inicial (nome + preço de venda) para configurar o sistema | Sócios | ⏳ Aguardando |
| P5 | **Quais são os ingredientes utilizados?** — lista dos insumos com unidade de medida (kg, unidade, litro…) e preço aproximado de compra | Sócios | ⏳ Aguardando |
| P6 | **Ficha técnica dos produtos** — quais ingredientes e em quais quantidades compõem cada produto? (ex: "Pastel de Frango usa 1 unidade de massa, 100g de frango, 50g de queijo") | Sócios | ⏳ Aguardando |
| P7 | **Estoque mínimo por ingrediente** — a partir de qual quantidade o sistema deve alertar para reabastecer? | Sócios | ⏳ Aguardando |

> Essas informações serão usadas para configurar o sistema desde o início, com dados reais da pastelaria.

---

## 1. O Que É Este Sistema

Um sistema web de gestão comercial desenvolvido para a pastelaria, que reúne em um único lugar:

- **Controle de estoque** de ingredientes com alertas automáticos
- **Ficha técnica** de cada produto (receita com ingredientes e quantidades)
- **Ponto de venda (PDV)** para o caixa registrar pedidos
- **Controle financeiro** com cálculo automático de lucro e prejuízo por produto
- **Painel do administrador** com visão completa do negócio

O sistema será acessado pelo navegador (computador ou tablet), sem necessidade de instalar nada.

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

5. Operador (caixa) abre o PDV, monta a COMANDA
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
**O que pode fazer:** Acessa tudo — estoque, financeiro, PDV, relatórios e cadastro de usuários

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
| Logo + nome | ⏳ Pendente de definição (P1 e P2) |
| Formulário | Campo de e-mail + campo de senha + botão Entrar |
| Segurança | Cada usuário acessa apenas as telas do seu perfil |

---

### Administrador — acesso completo

| Tela | O que mostra |
|---|---|
| **Dashboard** | Lucro do mês, total vendido, total gasto, quantidade de ingredientes em alerta, últimas 5 vendas |
| **Ingredientes** | Lista de todos os ingredientes com status (Normal / Atenção / Crítico), opções de cadastrar, editar e excluir |
| **Produtos** | Lista de produtos com ficha técnica, custo calculado e margem de lucro |
| **Compras** | Registro de nova compra de ingrediente e histórico de compras |
| **Lista de Compras** | Ingredientes abaixo do estoque mínimo com quantidade e valor da última compra |
| **PDV** | Tela de venda com produtos disponíveis, montagem de comanda e fechamento |
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

Estas são as regras que o sistema vai seguir automaticamente:

| # | Regra |
|---|---|
| RN-01 | Não é possível vender um produto se faltar ingrediente no estoque |
| RN-02 | O custo de cada produto é calculado sempre com base no preço da última compra do ingrediente |
| RN-03 | Todo produto precisa ter pelo menos um ingrediente na ficha técnica para poder ser vendido |
| RN-04 | Registrar uma compra sempre aumenta o estoque — o estoque nunca é diminuído manualmente |
| RN-05 | Apenas o Administrador pode cadastrar, editar ou remover usuários |
| RN-06 | O usuário Administrador padrão não pode ser removido do sistema |
| RN-07 | Vendas registradas não podem ser canceladas nesta versão |
| RN-08 | O Operador não vê valores de custo nem margem de lucro — apenas o preço de venda |

---

## 7. O Que Não Estará na Primeira Versão

Os itens abaixo foram avaliados e deixados para versões futuras, para manter o foco no essencial:

| Item | Motivo |
|---|---|
| Gráficos e charts visuais | As tabelas já respondem as perguntas principais — gráficos ficam para a próxima versão |
| Exportar para PDF ou Excel | Não é necessário para operar o dia a dia |
| Cadastro de fornecedores | Não foi solicitado nesta fase |
| Suporte a múltiplas lojas/filiais | O piloto é para uma loja |
| Aplicativo para celular | O sistema funcionará no navegador do celular ou tablet |
| Cancelamento de venda | Será avaliado em versão futura |
| Descontos e cupons no PDV | Fora do escopo desta versão |

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

O sistema classifica cada ingrediente em três níveis:

| Status | Quando acontece | O que fazer |
|---|---|---|
| 🟢 **Normal** | Estoque está acima de 150% do mínimo | Nenhuma ação necessária |
| 🟡 **Atenção** | Estoque entre 100% e 150% do mínimo | Planejar reposição em breve |
| 🔴 **Crítico** | Estoque igual ou abaixo do mínimo | Ingrediente aparece na Lista de Compras |

> Os limites de estoque mínimo por ingrediente serão definidos pela equipe (Pendência P7).

---

## 10. Tecnologia Utilizada

Esta seção é informativa para a equipe técnica entender o que será construído.

| Parte do sistema | Tecnologia | Por quê |
|---|---|---|
| Telas (frontend) | HTML + CSS + JavaScript | Mesma base do protótipo já desenvolvido |
| Servidor (backend) | Node.js + Express | Mesmo ecossistema do frontend, curva mínima de aprendizado |
| Banco de dados | PostgreSQL | Banco relacional robusto, ideal para o modelo de dados do sistema |
| Autenticação | JWT (token seguro) | Substitui o sistema inseguro do protótipo (que usava o navegador) |
| Hospedagem | Railway ou Render | Plataformas simples e de baixo custo para o piloto |

**Diferença principal em relação ao protótipo atual:**
O protótipo salva os dados no navegador — se limpar o cache ou usar outro dispositivo, os dados somem.
O sistema real salva os dados em um servidor, acessível por qualquer dispositivo, por qualquer usuário autorizado.

---

## 11. Próximos Passos

| Etapa | O que acontece |
|---|---|
| **1. Definições pendentes** | Equipe responde os itens da seção ⚠️ (P1 a P7) |
| **2. Validação deste documento** | Todos confirmam que o descrito reflete o esperado |
| **3. Início do desenvolvimento** | Desenvolvedores iniciam a construção com base neste documento |
| **4. Entrega parcial** | Demonstração das primeiras telas funcionando com dados reais |
| **5. Ajustes e testes** | Equipe do negócio testa e aponta correções |
| **6. Lançamento do piloto** | Sistema em uso na pastelaria |
