# Sistema de Gestão Comercial

Sistema web de gestão para pequenos negócios — controle de estoque, compras, vendas e indicadores financeiros. Desenvolvido para a **Pastelaria Bom Sabor** como projeto piloto, com arquitetura desenhada para ser adaptada a outros clientes via `config.js`.

> Projeto sem fins lucrativos desenvolvido gratuitamente para uma microempresa.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML + CSS + Vanilla JS (sem frameworks) |
| Backend | Supabase (PostgreSQL + RPC functions) |
| Auth | RPC customizada `autenticar()` + `pgcrypto` |
| Hosting | GitHub Pages |
| Sessão | `localStorage` com TTL de 8h |

---

## Arquitetura do Sistema

```mermaid
graph TB
    subgraph Browser["Navegador"]
        direction TB
        INDEX["index.html\n(entry point)"]
        LOGIN["login.html"]
        COZINHA["cozinha.html\n(tablet — sem sidebar)"]
        PAGES["*.html\n(12 páginas)"]

        subgraph JS["Assets JavaScript"]
            CONFIG["config.js\nBranding multi-cliente"]
            APP["app.js\nShell, menu, sessão, perfil validation"]
            AUTH["auth.js\nLogin / guard de rota"]
            PAGES_JS["*.js por página"]
        end
    end

    subgraph Supabase["Supabase (Backend)"]
        direction TB
        subgraph RPC["RPC Functions (SECURITY DEFINER)"]
            F1["autenticar()"]
            F2["fechar_venda()"]
            F3["registrar_compra()"]
            F4["excluir_compra(chamador)"]
            F5["dashboard_metrics()"]
            F6["marcar_entregue()"]
            F7["criar_usuario(chamador)"]
            F8["alterar_senha(chamador)"]
            F9["listar_usuarios(chamador)"]
            F10["buscar_usuario(chamador)"]
            F11["atualizar_usuario(chamador)"]
            F12["desativar_usuario(chamador)"]
        end
        subgraph DB["PostgreSQL"]
            T1[("usuarios")]
            T2[("ingredientes")]
            T3[("produtos")]
            T4[("ficha_tecnica")]
            T5[("compras")]
            T6[("vendas")]
            T7[("itens_venda")]
        end
        RLS["Row Level Security\n(acesso direto bloqueado)"]
    end

    INDEX -->|redireciona| LOGIN
    LOGIN -->|"autenticar() → sessão 8h"| F1
    PAGES -->|"db.rpc()"| RPC
    COZINHA -->|"db.rpc('marcar_entregue')"| F6
    RPC --> DB
    RLS -.->|protege| DB
    APP -->|"renderAppShell()"| PAGES
    CONFIG -->|"APP_CONFIG"| APP
```

---

## Fluxo de Autenticação e Navegação

```mermaid
flowchart TD
    A([Usuário acessa o site]) --> B[index.html]
    B --> C{Sessão válida\nem localStorage?}
    C -->|Não| D[login.html]
    C -->|Sim| E[inicio.html]

    D --> F[Preenche e-mail + senha]
    F --> G["RPC autenticar()"]
    G --> H{Credenciais\ncorretas?}
    H -->|Não| I[Toast de erro]
    H -->|Sim| J["Salva sessão\n{id, nome, perfil, expira_em}"]
    J --> E

    E --> K{Perfil do usuário}
    K -->|administrador| L["8 módulos\n+ Cozinha"]
    K -->|gerente| M["5 módulos"]
    K -->|operador| N["PDV + Cozinha\n+ Histórico do Dia"]

    I --> D

    style L fill:#2d6a4f,color:#fff
    style M fill:#1d3557,color:#fff
    style N fill:#6b4226,color:#fff
```

---

## Perfis de Acesso

```mermaid
graph LR
    subgraph ADM["Administrador"]
        direction TB
        a1[Início] --- a2[Ingredientes]
        a2 --- a3[Produtos]
        a3 --- a4[Lista de Compras]
        a4 --- a5[Compras]
        a5 --- a6[PDV]
        a6 --- a7[Cozinha]
        a7 --- a8[Financeiro]
        a8 --- a9[Usuários]
    end

    subgraph GER["Gerente"]
        direction TB
        g1[Início] --- g2[Ingredientes]
        g2 --- g3[Produtos]
        g3 --- g4[Lista de Compras]
        g4 --- g5[Compras]
        g5 --- g6[Financeiro]
    end

    subgraph OPE["Operador"]
        direction TB
        o1[Início] --- o2[PDV]
        o2 --- o3[Cozinha]
        o3 --- o4[Histórico do Dia]
    end
```

---

## Banco de Dados — Modelo Entidade-Relacionamento

```mermaid
erDiagram
    usuarios {
        uuid id PK
        text nome
        text email UK
        text senha_hash
        text perfil
        boolean ativo
        timestamptz criado_em
    }

    ingredientes {
        uuid id PK
        text nome
        text unidade
        numeric preco_compra
        numeric estoque_atual
        numeric estoque_minimo
        timestamptz atualizado_em
    }

    produtos {
        uuid id PK
        text nome
        text categoria
        numeric preco_venda
        boolean ativo
    }

    ficha_tecnica {
        uuid id PK
        uuid produto_id FK
        uuid ingrediente_id FK
        numeric quantidade
    }

    compras {
        uuid id PK
        uuid ingrediente_id FK
        numeric quantidade
        numeric valor_unitario
        numeric total
        date data
        uuid criado_por FK
    }

    vendas {
        uuid id PK
        date data
        numeric total
        numeric custo_total
        numeric lucro
        text status
        timestamptz entregue_em
        uuid operador_id FK
    }

    itens_venda {
        uuid id PK
        uuid venda_id FK
        uuid produto_id FK
        integer quantidade
        numeric preco_unitario
        numeric custo_unitario
        text observacao
    }

    produtos ||--o{ ficha_tecnica : "tem"
    ingredientes ||--o{ ficha_tecnica : "compõe"
    ingredientes ||--o{ compras : "registrada em"
    usuarios ||--o{ compras : "registrada por"
    usuarios ||--o{ vendas : "operada por"
    vendas ||--o{ itens_venda : "contém"
    produtos ||--o{ itens_venda : "vendido em"
```

---

## Fluxo de Venda — da Abertura à Entrega

```mermaid
sequenceDiagram
    participant OP as Operador (PDV)
    participant PDV as pdv.js
    participant COZ as cozinha.js
    participant RPC as RPCs (Supabase)
    participant DB as PostgreSQL

    OP->>PDV: Monta comanda e clica "Finalizar"
    PDV->>PDV: App.confirmar() — modal
    PDV->>RPC: fechar_venda({p_itens, p_operador_id})

    loop Para cada item
        RPC->>DB: Verifica estoque (ficha_tecnica × ingredientes)
        alt Estoque insuficiente
            RPC-->>PDV: {erro: "Estoque insuficiente: ..."}
            PDV-->>OP: Toast de erro
        end
        RPC->>DB: INSERT itens_venda
        RPC->>DB: UPDATE ingredientes (desconta estoque)
    end

    RPC->>DB: INSERT vendas (status = 'pendente')
    RPC-->>PDV: {venda_id, total, lucro}
    PDV-->>OP: Toast "Venda finalizada!"

    Note over COZ: Cozinha atualiza a cada 30s
    COZ->>RPC: db.from('vendas').select(...).eq('data', hoje)
    RPC-->>COZ: Lista de pedidos pendentes

    COZ->>RPC: marcar_entregue({p_venda_id})
    RPC->>DB: UPDATE vendas SET status='entregue', entregue_em=NOW()
    RPC-->>COZ: {sucesso: true}
    COZ-->>COZ: Card animado → aba Entregues
```

---

## Arquitetura de Segurança

```mermaid
flowchart LR
    subgraph Client["Frontend (anon)"]
        JS["JavaScript\n(sem JWT)"]
    end

    subgraph Gateway["PostgREST / Supabase"]
        RLS["RLS bloqueia\nDML direto"]
        RPC["RPCs SECURITY DEFINER\nvalida p_chamador_id"]
    end

    subgraph Database["PostgreSQL"]
        T["Tabelas protegidas"]
    end

    JS -->|"db.from() SELECT"| RLS
    JS -->|"db.rpc() — passa chamador_id"| RPC
    RLS -->|SELECT autorizado| T
    RLS -->|INSERT/UPDATE/DELETE bloqueado| X["❌ 0 rows / erro"]
    RPC -->|"valida perfil='administrador'"| T

    style X fill:#c0392b,color:#fff
    style RPC fill:#27ae60,color:#fff
```

**Princípios aplicados:**
- Todo `INSERT`, `UPDATE` e `DELETE` sensível passa por RPC com `SECURITY DEFINER`
- RPCs que alteram dados exigem `p_chamador_id` (UUID do usuário logado) validado contra a tabela `usuarios`
- Nenhuma policy de `DELETE` direta existe em tabelas críticas (`compras`, `vendas`, `usuarios`)
- `isLoggedIn()` rejeita sessões com `perfil` fora do conjunto `{administrador, gerente, operador}`
- Todos os valores do banco inseridos via `innerHTML` passam por `App.escapeHtml()` (XSS prevention)

---

## Módulos — O que cada página faz

| Página | Perfis | Função |
|--------|--------|--------|
| **Início** | Todos | Hub de navegação adaptado por perfil; alertas de estoque para gerente e admin |
| **Ingredientes** | Admin, Gerente | CRUD completo com controle de estoque, preço de compra e status |
| **Produtos** | Admin, Gerente | Cadastro com ficha técnica, custo calculado, margem de lucro e filtros avançados |
| **Lista de Compras** | Admin, Gerente | Ingredientes com estoque crítico ou em atenção que precisam reposição |
| **Compras** | Admin, Gerente | Registro de entradas no estoque — atualiza `estoque_atual` via RPC atômica |
| **PDV (Vendas)** | Admin, Operador | Totem de vendas: categorias → cards de produto → carrinho → finalizar |
| **Cozinha** | Admin, Operador | Acompanhamento de pedidos em tempo real: fila pendente + entregues; botão "Entregar" |
| **Financeiro** | Admin, Gerente | Indicadores do mês + histórico mensal + últimas vendas |
| **Histórico do Dia** | Admin, Operador | Vendas realizadas hoje com total e lucro |
| **Usuários** | Admin | Gerenciamento de usuários e perfis via RPCs autorizadas |

---

## RPC Functions (Supabase)

| Função | Auth exigida | Descrição |
|--------|-------------|-----------|
| `autenticar(email, senha)` | — | Login via `pgcrypto` — retorna dados do usuário ou erro |
| `fechar_venda(itens, operador_id)` | — | Fecha venda atomicamente: valida estoque, insere venda + itens, desconta ingredientes |
| `registrar_compra(...)` | — | Registra compra e incrementa `estoque_atual` do ingrediente |
| `excluir_compra(id, chamador_id)` | admin | Exclui compra e reverte estoque — operação atômica |
| `marcar_entregue(venda_id)` | — | Atualiza `status='entregue'` e `entregue_em=NOW()` |
| `dashboard_metrics()` | — | Retorna lucro, receita, gastos do mês e estoque crítico |
| `criar_usuario(nome, email, senha, perfil, chamador_id)` | admin | Cria usuário com senha hasheada via `bcrypt` |
| `alterar_senha(usuario_id, nova_senha, chamador_id)` | admin ou próprio | Atualiza senha com novo hash |
| `listar_usuarios(chamador_id)` | admin | SELECT seguro — sem policy direta na tabela |
| `buscar_usuario(id, chamador_id)` | admin | SELECT por ID via RPC |
| `atualizar_usuario(id, nome, email, perfil, chamador_id)` | admin | UPDATE com validação de perfil |
| `desativar_usuario(id, chamador_id)` | admin | Soft delete — impede auto-desativação |

---

## Estrutura de Arquivos

```
gestao_comercial/
├── index.html                  # Entry point — redireciona para inicio ou login
├── login.html
├── inicio.html                 # Hub pós-login (layout por perfil)
├── ingredientes.html
├── produtos.html
├── lista-compras.html
├── compras.html
├── pdv.html                    # Totem de vendas (3 colunas)
├── cozinha.html                # Layout tablet — sem sidebar
├── historico-dia.html
├── financeiro.html             # Indicadores + histórico mensal
├── usuarios.html
├── estoque.html
├── assets/
│   ├── css/
│   │   └── style.css           # Único arquivo de estilos
│   └── js/
│       ├── config.js           # Branding do cliente (única fonte de verdade)
│       ├── app.js              # Shell, menu, sessão, perfil validation
│       ├── auth.js             # Login e guard de rotas
│       ├── supabase-client.js  # Inicialização do Supabase
│       ├── api.js              # Funções de acesso ao banco reutilizáveis
│       ├── inicio.js
│       ├── ingredientes.js
│       ├── produtos.js
│       ├── lista-compras.js
│       ├── compras.js
│       ├── pdv.js
│       ├── cozinha.js          # Polling 30s, tabs Fila/Entregues, RPC marcar_entregue
│       ├── historico-dia.js
│       ├── financeiro.js
│       └── usuarios.js         # Toda gestão via RPCs autorizadas
└── supabase/
    ├── migrations/
    │   ├── 001_schema_supabase.sql         # Schema inicial + RPCs base
    │   ├── 002_add_categoria_produtos.sql  # Coluna categoria em produtos
    │   ├── 003_security_hardening.sql      # RLS + remoção de policies permissivas
    │   ├── 004_perfil_gerente.sql          # Perfil gerente
    │   ├── 005_observacao_itens_venda.sql  # Campo observação por item
    │   ├── 006_status_vendas.sql           # Coluna status + entregue_em em vendas
    │   ├── 007_rpc_marcar_entregue.sql     # RPC para atualização de status da cozinha
    │   └── 008_security_fixes.sql          # Auditoria: chamador_id, XSS, policies
    ├── seed.sql                            # Usuários padrão (3 perfis)
    └── seed_cardapio.sql                   # Produtos e ingredientes de exemplo
```

---

## Configuração para Novo Cliente

Edite apenas `assets/js/config.js`:

```javascript
const APP_CONFIG = {
  nome: 'Nome do Negócio',       // exibido na sidebar e login
  slogan: 'Subtítulo opcional',
  logo: null,                    // ou 'assets/img/logo.png'
  logoAlturaSidebar: 48,
  logoAlturaLogin: 72,
  descricaoLogin: 'Descrição curta do sistema.',
  featuresLogin: [
    'Funcionalidade 1',
    'Funcionalidade 2',
  ],
};
```

Nenhum outro arquivo precisa ser alterado para rebrand.

---

## Setup — Banco de Dados (Supabase)

1. Crie um projeto no [Supabase](https://supabase.com)
2. Execute as migrations em ordem no **SQL Editor**:
   ```
   001_schema_supabase.sql
   002_add_categoria_produtos.sql
   003_security_hardening.sql
   004_perfil_gerente.sql
   005_observacao_itens_venda.sql
   006_status_vendas.sql
   007_rpc_marcar_entregue.sql
   008_security_fixes.sql
   ```
3. Execute `seed.sql` para criar os usuários padrão
4. _(Opcional)_ Execute `seed_cardapio.sql` para dados de exemplo
5. Atualize `assets/js/supabase-client.js` com a URL e chave anon do seu projeto

---

## Decisões de Arquitetura

- **Sem React/Vue** — Vanilla JS intencional; o time domina a stack sem overhead de framework
- **Sem Supabase Auth nativo** — autenticação customizada via `pgcrypto` para controle total dos perfis
- **Sem Node.js** — Supabase substitui completamente qualquer backend intermediário
- **RPC SECURITY DEFINER** — operações críticas (venda, compra, cozinha) rodam com permissões elevadas no servidor
- **`p_chamador_id` em RPCs sensíveis** — autorização server-side; o frontend não pode falsificar o chamador sem ter o UUID real da sessão
- **Soft delete em produtos** — `ativo = false` preserva histórico financeiro
- **`config.js` como única fonte de verdade** — sistema desenhado para multi-cliente sem reescrita de código
- **Polling na Cozinha** — atualização automática a cada 30s; sem WebSocket para manter a stack simples
