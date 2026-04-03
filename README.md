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
        LOGIN["pages/login.html"]
        PAGES["pages/*.html\n(12 páginas)"]

        subgraph JS["Assets JavaScript"]
            CONFIG["config.js\nBranding multi-cliente"]
            APP["app.js\nShell, menu, sessão"]
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
            F4["excluir_compra()"]
            F5["dashboard_metrics()"]
            F6["criar_usuario()"]
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
        RLS["Row Level Security"]
    end

    INDEX -->|redireciona| LOGIN
    LOGIN -->|"autenticar() → sessão 8h"| F1
    PAGES -->|"db.rpc() / db.from()"| RPC
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
    C -->|Não| D[pages/login.html]
    C -->|Sim| E[pages/inicio.html]

    D --> F[Preenche e-mail + senha]
    F --> G["RPC autenticar()"]
    G --> H{Credenciais\ncorretas?}
    H -->|Não| I[Toast de erro]
    H -->|Sim| J["Salva sessão\n{id, nome, perfil, expira_em}"]
    J --> E

    E --> K{Perfil do usuário}
    K -->|administrador| L[8 módulos disponíveis]
    K -->|gerente| M[5 módulos disponíveis]
    K -->|operador| N[PDV + Histórico do Dia]

    I --> D
```

---

## Perfis de Acesso

```mermaid
graph LR
    subgraph ADM["👑 Administrador"]
        direction TB
        a1[Início] --- a2[Ingredientes]
        a2 --- a3[Produtos]
        a3 --- a4[Lista de Compras]
        a4 --- a5[Compras]
        a5 --- a6[PDV]
        a6 --- a7[Financeiro]
        a7 --- a8[Usuários]
    end

    subgraph GER["🧑‍💼 Gerente"]
        direction TB
        g1[Início] --- g2[Ingredientes]
        g2 --- g3[Produtos]
        g3 --- g4[Lista de Compras]
        g4 --- g5[Compras]
        g5 --- g6[Financeiro]
    end

    subgraph OPE["🧑‍💻 Operador"]
        direction TB
        o1[Início] --- o2[PDV]
        o2 --- o3[Histórico do Dia]
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

## Fluxo de Venda — RPC `fechar_venda()`

```mermaid
sequenceDiagram
    participant C as Operador (PDV)
    participant JS as pdv.js
    participant RPC as fechar_venda()
    participant DB as PostgreSQL

    C->>JS: Clica "Finalizar venda"
    JS->>JS: App.confirmar() — modal de confirmação
    JS->>RPC: db.rpc('fechar_venda', {p_itens, p_operador_id})

    loop Para cada item
        RPC->>DB: Verificar estoque (ficha_tecnica × ingredientes)
        DB-->>RPC: estoque_atual vs. qtd_necessaria
        alt Estoque insuficiente
            RPC-->>JS: {erro: "Estoque insuficiente: ..."}
            JS-->>C: Toast de erro
        end
    end

    RPC->>DB: INSERT INTO vendas
    loop Para cada item
        RPC->>DB: INSERT INTO itens_venda
        RPC->>DB: UPDATE ingredientes (desconta estoque)
    end

    RPC-->>JS: {venda_id, total, lucro}
    JS-->>C: Toast "Venda finalizada! Total: R$ X,XX"
```

---

## Estrutura de Arquivos

```
gestao_comercial/
├── index.html                  # Entry point — redireciona para pages/
├── pages/                      # Todas as páginas da aplicação
│   ├── login.html
│   ├── inicio.html             # Hub pós-login (layout por perfil)
│   ├── ingredientes.html
│   ├── produtos.html
│   ├── lista-compras.html
│   ├── compras.html
│   ├── pdv.html                # Totem de vendas (3 colunas)
│   ├── historico-dia.html
│   ├── financeiro.html         # Indicadores + histórico mensal
│   └── usuarios.html
├── assets/
│   ├── css/
│   │   └── style.css           # Único arquivo de estilos
│   └── js/
│       ├── config.js           # Branding do cliente (única fonte de verdade)
│       ├── app.js              # Shell, menu, sessão, utilitários
│       ├── auth.js             # Login e guard de rotas
│       ├── supabase-client.js  # Inicialização do Supabase
│       ├── inicio.js
│       ├── ingredientes.js
│       ├── produtos.js
│       ├── lista-compras.js
│       ├── compras.js
│       ├── pdv.js
│       ├── historico-dia.js
│       ├── financeiro.js
│       └── usuarios.js
└── supabase/
    ├── migrations/
    │   ├── 001_schema_supabase.sql     # Schema inicial + RPCs
    │   ├── 002_add_categoria_produtos.sql
    │   ├── 003_security_hardening.sql
    │   ├── 004_perfil_gerente.sql
    │   └── 005_observacao_itens_venda.sql
    ├── seed.sql                # Usuários padrão
    └── seed_cardapio.sql       # Produtos e ingredientes de exemplo
```

---

## Módulos — O que cada página faz

| Página | Perfis | Função |
|--------|--------|--------|
| **Início** | Todos | Hub de navegação adaptado por perfil; gerente vê alertas de estoque em tempo real |
| **Ingredientes** | Admin, Gerente | CRUD completo de ingredientes com controle de estoque e preço de compra |
| **Produtos** | Admin, Gerente | Cadastro de produtos com ficha técnica de ingredientes e preço de venda |
| **Lista de Compras** | Admin, Gerente | Ingredientes com estoque crítico ou em atenção que precisam reposição |
| **Compras** | Admin, Gerente | Registro de entradas no estoque — atualiza `estoque_atual` automaticamente |
| **PDV** | Admin, Operador | Totem de vendas: categorias → cards de produto → carrinho → finalizar |
| **Financeiro** | Admin, Gerente | Indicadores do mês + histórico mensal + últimas 5 vendas + gráfico |
| **Histórico do Dia** | Admin, Operador | Vendas realizadas hoje com total e lucro do dia |
| **Usuários** | Admin | Gerenciamento de usuários e perfis de acesso |

---

## RPC Functions (Supabase)

| Função | Descrição |
|--------|-----------|
| `autenticar(email, senha)` | Login customizado via `pgcrypto` — retorna dados do usuário ou erro |
| `fechar_venda(itens, operador_id)` | Fecha venda atomicamente: valida estoque, insere venda + itens, desconta ingredientes |
| `registrar_compra(...)` | Registra compra e incrementa `estoque_atual` do ingrediente |
| `excluir_compra(id)` | Exclui compra e reverte o estoque — operação atômica |
| `dashboard_metrics()` | Retorna lucro, receita e gastos do mês + contagem de estoque crítico |
| `criar_usuario(...)` | Cria usuário com senha hasheada via `bcrypt` |
| `alterar_senha(id, nova_senha)` | Atualiza senha com novo hash |

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
   ```
3. Execute `seed.sql` para criar os usuários padrão
4. _(Opcional)_ Execute `seed_cardapio.sql` para dados de exemplo
5. Atualize `assets/js/supabase-client.js` com a URL e chave anon do seu projeto

---

## Decisões de Arquitetura

- **Sem React/Vue** — Vanilla JS intencional; ambos os devs dominam a stack
- **Sem Supabase Auth nativo** — autenticação customizada via `pgcrypto` para controle total
- **Sem Node.js** — Supabase substitui completamente qualquer backend
- **RPC SECURITY DEFINER** — operações críticas (venda, compra) rodam com permissões elevadas no servidor, não expostas ao cliente
- **Soft delete em produtos** — `ativo = false` preserva histórico financeiro
- **`config.js` como única fonte de verdade** — sistema desenhado para multi-cliente
