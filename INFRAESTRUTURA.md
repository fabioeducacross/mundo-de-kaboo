# Documentação de Infraestrutura - Mundo de Kaboo

**Data**: 08 de abril de 2026  
**Versão**: 1.0

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitetura Geral](#arquitetura-geral)
4. [Banco de Dados](#banco-de-dados)
5. [API e Integrações](#api-e-integrações)
6. [Estrutura de Navegação e Rotas](#estrutura-de-navegação-e-rotas)
7. [Jornadas dos Usuários](#jornadas-dos-usuários)
8. [Sistema de Vouchers](#sistema-de-vouchers)
9. [Autenticação e Acesso](#autenticação-e-acesso)
10. [Modos de Execução](#modos-de-execução)
11. [Deployment e Hospedagem](#deployment-e-hospedagem)
12. [Estrutura de Diretórios](#estrutura-de-diretórios)

---

## Visão Geral do Projeto

**Mundo de Kaboo** é uma plataforma web educacional desenvolvida para professores do Ensino Fundamental, oferecendo acesso organizado a conteúdos educacionais digitais (livros em PDF, audiobooks, vídeos educacionais e materiais extras).

### 🎯 Objetivo Principal
Centralizar e simplificar o acesso a recursos educacionais de qualidade para educadores, com um fluxo de autenticação baseado em vouchers de tempo limitado.

### 📊 Estatísticas Base
- **16 coleções** de conteúdo educacional mapeadas
- **Suporte para 2 níveis**: Educação Infantil, Fundamental I
- **Tipos de mídia**: PDF, Áudio, Vídeo, Arquivos adicionais
- **Controle de acesso temporal**: Baseado em vouchers com duração variável (1, 3, 6, 9, 12 meses)

---

## Stack Tecnológico

### Frontend
| Tecnologia | Versão | Propósito |
|---|---|---|
| **React** | 19.2.3 | Framework principal para UI |
| **TypeScript** | ~5.8.2 | Tipagem estática |
| **Vite** | 6.2.0 | Build tool e dev server |
| **Tailwind CSS** | (integrado Vite) | Estilos utilitários |
| **Lucide React** | 0.561.0 | Ícones vetoriais |
| **React PDF** | 10.2.0 | Renderização de PDFs |
| **PDFjs-dist** | 5.4.296 | Motor PDF (worker threads) |
| **React Pageflip** | 2.0.3 | Efeito de flipbook |
| **React Zoom Pan Pinch** | 3.4.4 | Gestos de zoom/pan |
| **Canvas Confetti** | 1.9.2 | Animações de confete |
| **Clsx** | 2.1.0 | Utilidade de classes CSS condicionais |
| **Tailwind Merge** | 2.2.2 | Merge seguro de Tailwind classes |

### Backend
| Tecnologia | Propósito |
|---|---|
| **Supabase** | BaaS (Backend-as-a-Service) |
| **PostgreSQL 14+** | Banco de dados relacional |
| **PostgREST** | API REST automática |
| **Realtime** | Sincronização em tempo real (opcional) |
| **Auth/GoTrue** | Autenticação segura |

### DevOps & Deployment
| Tecnologia | Propósito |
|---|---|
| **Vercel** | Hosting do frontend |
| **Vercel Analytics** | Tracking de analytics |
| **NPM** | Gerenciador de pacotes |
| **Git** | Controle de versão |

---

## Arquitetura Geral

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                      Browser / Cliente                          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ React App (Vite)                                         │  │
│  │ ├─ App.tsx (Orquestrador de rotas)                      │  │
│  │ ├─ Screens/ (15+ telas da aplicação)                   │  │
│  │ ├─ Components/ (Componentes reutilizáveis)             │  │
│  │ ├─ Hooks/ (React hooks customizados)                   │  │
│  │ └─ Lib/ (Lógica de negócio)                            │  │
│  │    ├─ api.ts (Client API)                              │  │
│  │    ├─ auth.ts (Autenticação)                           │  │
│  │    ├─ access.ts (Regras de acesso)                     │  │
│  │    ├─ mockData.ts (Dados mock para dev)               │  │
│  │    ├─ mockVoucherData.ts (Mock de vouchers)            │  │
│  │    └─ supabase.ts (Configuração Supabase)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                    ↓ HTTP/HTTPS                                 │
└─────────────────────────────────────────────────────────────────┘
                           ↓
        ┌──────────────────────────────────┐
        │   API Gateway (PostgREST)        │
        │   supabase.co                    │
        └──────────────────────────────────┘
                    ↓
    ┌─────────────────────────────────────────────┐
    │      Supabase Backend                       │
    │                                             │
    │  ┌──────────────────────────────────────┐  │
    │  │ Auth / GoTrue                        │  │
    │  │ ├─ User registration                │  │
    │  │ ├─ Email confirmation               │  │
    │  │ └─ Session management               │  │
    │  └──────────────────────────────────────┘  │
    │                                             │
    │  ┌──────────────────────────────────────┐  │
    │  │ PostgreSQL Database                  │  │
    │  │ ├─ profiles (usuários)               │  │
    │  │ ├─ collections (catálogo)            │  │
    │  │ ├─ vouchers (códigos de acesso)      │  │
    │  │ ├─ user_content_grants (acesso cont)│  │
    │  │ ├─ voucher_models (modelos admin)    │  │
    │  │ ├─ voucher_batches (lotes admin)     │  │
    │  │ ├─ voucher_codes (códigos gerados)   │  │
    │  │ └─ audit_logs (rastreabilidade)      │  │
    │  └──────────────────────────────────────┘  │
    │                                             │
    │  ┌──────────────────────────────────────┐  │
    │  │ Cloud Storage                        │  │
    │  │ ├─ collections/ (covers de livros)   │  │
    │  │ ├─ recursos/ (PDFs, áudios, vídeos)  │  │
    │  │ └─ admin/ (uploads admin)            │  │
    │  └──────────────────────────────────────┘  │
    │                                             │
    │  ┌──────────────────────────────────────┐  │
    │  │ RPCs (Funções PL/pgSQL)              │  │
    │  │ ├─ validate_voucher()                │  │
    │  │ ├─ redeem_voucher()                  │  │
    │  │ └─ outras (ver seção de API)         │  │
    │  └──────────────────────────────────────┘  │
    └─────────────────────────────────────────────┘
```

### Fluxo de Dados Principal

1. **Usuário acessa o app** → React carrega com Vite
2. **App.tsx verifica sessão** → Via `api.getProfile()` ou mock
3. **Renderiza tela apropriada** → Baseado em `NavState` + `AccessStatus`
4. **Usuário interage** → Chamadas API async via `lib/api.ts`
5. **Backend processa** → RPC ou query PostgREST
6. **Resposta retorna** → Cache em `sessionStorage` (tipo-specific)
7. **Front atualiza UI** → Rerender React com novos dados

---

## Banco de Dados

### Visão Geral do Schema

#### 1. **Tabela: `profiles`** (Perfis de Usuários)
Espelha `auth.users` com dados pedagógicos e de acesso.

```sql
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY,           -- FK de auth.users
  email                 TEXT,
  full_name             TEXT,                       -- Nome completo
  school_name           TEXT,                       -- Escola do professor
  avatar_id             TEXT,                       -- Personagem selecionado (ex: "Kaboo")
  role                  TEXT DEFAULT 'viewer',      -- admin | editor | viewer
  voucher_id            UUID FK → vouchers,
  access_starts_at      TIMESTAMPTZ,                -- Início da vigência
  access_expires_at     TIMESTAMPTZ,                -- Fim da vigência
  access_status         TEXT,                       -- active | expired | pending_voucher
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: Usuário lê/escreve seu próprio perfil
```

#### 2. **Tabela: `collections`** (Catálogo de Conteúdo)
Livros, audiobooks, vídeos disponíveis na plataforma.

```sql
CREATE TABLE collections (
  id                    UUID PRIMARY KEY,
  title                 TEXT NOT NULL,
  cover_image           TEXT,                       -- URL ou path da capa
  level                 TEXT,                       -- Educação Infantil | Fundamental I
  color_theme           TEXT,                       -- Cor hexadecimal (#B9373B)
  theme                 TEXT,                       -- Tema pedagógico
  learning_objectives   TEXT,                       -- Objetivos de aprendizagem
  characters            TEXT[],                     -- Array de personagens
  bncc_skills           TEXT[],                     -- Habilidades BNCC
  casel_competencies    TEXT[],                     -- Competências CASEL
  age_grade             TEXT[],                     -- Faixa etária/série
  pdf_url               TEXT,                       -- URL do PDF
  audio_url             TEXT,                       -- URL do áudio
  video_url             TEXT,                       -- URL do vídeo
  extra_materials       TEXT[],                     -- URLs de materiais adicionais
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
-- RLS: Usuários autenticados leem; service_role escreve (seed/admin)
```

#### 3. **Tabela: `vouchers`** (Códigos de Acesso Temporário)
Gerencia códigos de acesso com validade temporal.

```sql
CREATE TABLE vouchers (
  id                    UUID PRIMARY KEY,
  code                  TEXT UNIQUE NOT NULL,       -- Ex: KABOO-3MESES-2026
  duration_months       INT CHECK (IN [1,3,6,9,12]),
  status                TEXT,                       -- active | redeemed | expired | disabled
  expires_at            TIMESTAMPTZ,                -- Quando o código expira
  consumed_by_user_id   UUID FK → auth.users,
  consumed_at           TIMESTAMPTZ,                -- Quando foi resgatado
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
-- Indices: code (uppercase), consumed_by_user_id
-- RLS: Apenas service_role gerencia
```

#### 4. **Tabela: `user_content_grants`** (Acesso a Conteúdo)
Mapeia quais usuários têm acesso a quais coleções (além do acesso universal).

```sql
CREATE TABLE user_content_grants (
  id                    UUID PRIMARY KEY,
  user_id               UUID FK → auth.users,
  collection_id         UUID FK → collections,
  voucher_id            UUID FK → vouchers,        -- Qual voucher gerou esta concessão
  granted_at            TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ,               -- Quando expire (opcional)
  UNIQUE(user_id, collection_id)
);
-- RLS: service_role gerencia
```

#### 5. **Tabela: `voucher_models`** (Modelos de Voucher CMS)
Define templates de vouchers para geração em lote.

```sql
CREATE TABLE voucher_models (
  id                    UUID PRIMARY KEY,
  name                  TEXT NOT NULL,
  description           TEXT,
  package_type          TEXT,                      -- book | collection | kit | curated_set
  duration_months       INT,
  redeem_by             TIMESTAMPTZ,               -- Prazo limite para resgate
  status                TEXT DEFAULT 'draft',      -- draft | active | archived
  created_by            UUID,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. **Tabela: `voucher_model_items`** (Itens do Modelo)
Coleções vinculadas a um modelo de voucher.

```sql
CREATE TABLE voucher_model_items (
  id                    UUID PRIMARY KEY,
  model_id              UUID FK → voucher_models,
  collection_id         UUID FK → collections,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. **Tabela: `voucher_batches`** (Lotes de Vouchers Gerados)
Agrupa vouchers por lote para rastreamento de lifecycle.

```sql
CREATE TABLE voucher_batches (
  id                    UUID PRIMARY KEY,
  model_id              UUID FK → voucher_models,
  label                 TEXT,
  quantity              INT,
  status                TEXT,                      -- generated | exported | sent | confirmed | cancelled
  model_snapshot        JSONB,                     -- Snapshot do modelo no momento da geração
  exported_at           TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  confirmed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8. **Tabela: `voucher_codes`** (Códigos Gerados)
Cada código individual com FK para seu batch.

```sql
CREATE TABLE voucher_codes (
  id                    UUID PRIMARY KEY,
  batch_id              UUID FK → voucher_batches,
  voucher_id            UUID FK → vouchers,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. **Tabela: `audit_logs`** (Rastreabilidade)
Log de todas as operações de admin (CRUD de modelos, lotes, etc).

```sql
CREATE TABLE audit_logs (
  id                    UUID PRIMARY KEY,
  actor_id              UUID,
  entity_type           TEXT,                      -- voucher_model | voucher_batch | voucher_code | collection
  entity_id             UUID,
  action                TEXT,                      -- create | update | delete | export | send | cancel
  changes               JSONB,                     -- Diff das mudanças
  created_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado:

| Tabela | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | Usuário: próprio perfil | Usuário em criação | Usuário: próprio | N/A |
| `collections` | Autenticados: todos | Service role | Service role | Service role |
| `vouchers` | Service role | Service role | Service role | Service role |
| `user_content_grants` | Service role + lógica | Service role | Service role | Service role |
| `voucher_*` | Service role + admin role | Service role | Service role | Service role |
| `audit_logs` | Admins | Service role | N/A | N/A |

### Índices Críticos

```sql
-- Vouchers
CREATE INDEX idx_vouchers_code_upper ON vouchers ((UPPER(code)));
CREATE INDEX idx_vouchers_consumed_by_user_id ON vouchers (consumed_by_user_id);

-- User Content Grants
CREATE INDEX idx_user_content_grants_user_id ON user_content_grants (user_id);
CREATE INDEX idx_user_content_grants_collection_id ON user_content_grants (collection_id);

-- Audit
CREATE INDEX idx_audit_logs_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs (entity_type);
```

---

## API e Integrações

### Camada de API (`lib/api.ts`)

#### Autenticação
```typescript
// Login
api.signIn(email, password) → Promise<{ user, session, error }>

// Registro
api.registerWithVoucher(input: RegisterWithVoucherInput) → Promise<RegisterWithVoucherResult>

// Logout
api.signOut() → Promise<{ error? }>

// Obter usuário atual
api.getCurrentUser() → Promise<User>

// Recuperação de senha
api.sendPasswordResetEmail(email) → Promise<{ error? }>
```

#### Perfil e Acesso
```typescript
// Obter perfil do usuário
api.getProfile() → Promise<UserProfile>

// Validar voucher (sem consumir)
api.validateVoucher(code) → Promise<VoucherValidationResult>

// Resgatar voucher
api.redeemVoucher(code) → Promise<VoucherRedemptionResult>

// Atualizar perfil
api.updateProfile(updates) → Promise<UserProfile>
```

#### Coleções
```typescript
// Listar todas as coleções
api.getCollections() → Promise<Collection[]>

// Get coleção por ID
api.getCollectionById(id) → Promise<Collection>

// Get recursos de coleção
api.getCollectionResources(collectionId) → Promise<CollectionResource[]>

// Get progresso do usuário
api.getUserProgress() → Promise<UserProgress[]>
```

#### Admin (Vouchers)
```typescript
// Criar modelo de voucher
api.createVoucherModel(model: VoucherModel) → Promise<VoucherModel>

// Listar modelos
api.getVoucherModels() → Promise<VoucherModel[]>

// Criar lote
api.createVoucherBatch(batch: VoucherBatch) → Promise<VoucherBatch>

// Listar lotes
api.getVoucherBatches() → Promise<VoucherBatch[]>

// Exportar CSV de códigos
api.exportBatchCodes(batchId) → Promise<Blob>

// Obter códigos de um batch
api.getBatchCodes(batchId) → Promise<VoucherCode[]>

// Atualizar status de batch
api.updateBatchStatus(batchId, status) → Promise<VoucherBatch>

// Audit logs
api.getAuditLogs(filters?) → Promise<AuditLogEntry[]>
```

### RPCs (Remote Procedure Calls) - Supabase

#### `validate_voucher(p_code TEXT): JSONB`
Valida um código de voucher sem consumi-lo.

**Entrada**:
- `p_code`: Código do voucher (normaliza para UPPERCASE)

**Saída**:
```json
{
  "success": true|false,
  "voucher": { id, code, duration_months, status, ... },
  "code": "invalid_code" | "already_redeemed" | "voucher_expired" | "voucher_disabled",
  "message": "..."
}
```

**Regras**:
- Código vazio → `invalid_code`
- Não encontrado → `invalid_code`
- Status `disabled` → `voucher_disabled`
- Já resgatado → `already_redeemed`
- Expirado → `voucher_expired`

#### `redeem_voucher(p_code TEXT): JSONB`
Resgate um voucher para o usuário autenticado, ativando seu acesso.

**Entrada**:
- `p_code`: Código do voucher

**Saída**:
```json
{
  "success": true|false,
  "profile": { id, access_expires_at, ... },
  "voucher": { ... },
  "code": "...",
  "grantedCollectionIds": ["uuid1", "uuid2", ...] // Se voucher é por conteúdo
}
```

**Ações**:
1. Valida se usuário está autenticado
2. Verifica se código é válido (como `validate_voucher`)
3. Se válido:
   - Marca voucher como `redeemed`
   - Cria/atualiza perfil do usuário
   - Calcula `access_expires_at = max(current_expiry, now) + duration_months`
   - Insere `user_content_grants` se voucher é por conteúdo
   - Loga em `audit_logs`
4. Retorna perfil atualizado

#### Outras RPCs (Previstas)
```
create_voucher_model()
create_voucher_batch()
generate_batch_codes()
export_batch_codes()
disable_voucher_code()
cancel_batch()
```

---

## Estrutura de Navegação e Rotas

### Telas Disponíveis

A navegação no Mundo de Kaboo é **baseada em estado** (não URL-based SPA). As telas disponíveis são:

```typescript
type ScreenName =
  | 'login'                  // Tela de login
  | 'forgot_password'        // Recuperação de senha
  | 'email_confirmation'     // Confirmação de email pós-cadastro
  | 'access_expired'         // Tela de acesso expirado (renewall)
  | 'home'                   // Tela principal com catálogo
  | 'search'                 // Busca de conteúdo
  | 'profile'                // Perfil do usuário
  | 'my_data'                // Meus dados (download LGPD, etc)
  | 'details'                // Detalhes de coleção
  | 'player_book'            // Player de livro (flipbook)
  | 'player_audio'           // Player de áudio
  | 'player_video'           // Player de vídeo
  | 'tools'                  // Ferramentas extras
  | 'support'                // Suporte/Help (modal/drawer)
  | 'admin'                  // Painel administrativo
```

### Fluxo de Navegação

```
┌─────────────────────────────────────────────────────────────┐
│                    APP INIT                                 │
│ (App.tsx bootstrap)                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴───────────────┐
        │ Usuário autenticado?         │
        └──────────────┬───────────────┘
                 SIM  │  NÃO
                      │      └─→ [LOGIN SCREEN]
                      │                ↓
                      │         (esqueceu senha?) → [FORGOT_PASSWORD]
                      │                ↓
                      │         (confirmar email?) → [EMAIL_CONFIRMATION]
                      │
                      ├─→ Acesso vigente? → SIM ─→ [HOME SCREEN]
                      │                             ↓
                      │                    (navegar via BottomNav)
                      │                    ├─→ [SEARCH]
                      │                    ├─→ [PROFILE]
                      │                    ├─→ [MY_DATA]
                      │                    └─→ Clicar coleção → [DETAILS]
                      │                                ↓
                      │                       (reproduzir) → [PLAYER_*]
                      │
                      └─→ Acesso expirado? → [ACCESS_EXPIRED]
                                             (renovar com novo código)
                                             → [HOME]

NOTA: [ADMIN] é acessível se role === 'admin'
```

### Componente Principal: App.tsx

Arquivo: `App.tsx` (orquestrador de rotas)

```typescript
// Fluxo principal
1. Bootstrap - carrega sessão e perfil
2. Verifica NavState em localStorage
3. Se proteged screen sem autenticação → redireciona para login
4. Se acesso expirado → redireciona para access_expired
5. Renderiza tela apropriada + componentes (PageHeader, BottomNav, etc)

// Event loops
- Monitora mudanças do Supabase Auth
- Atualiza perfil periodicamente
- Limpa cache ao logout
```

### Componentes de Layout

#### `PageHeader`
Exibe título da tela e controles de volta/menu.

```
┌─────────────────────────────────────────┐
│ ← [Título da Tela]         [Menu/More] │
└─────────────────────────────────────────┘
```

#### `BottomNav`
Navegação fixa no rodapé (desktop/mobile) com 4 abas principais:

```
┌─────────────────────────────────────────┐
│ [Home] [Buscar] [Perfil] [Mais]         │
└─────────────────────────────────────────┘
```

#### Modals/Drawers
- `CollectionModal` - Detalhes rápidos de coleção
- `FilePreviewModal` - Preview de recursos
- `CriticalConfirmationModal` - Ações irreversíveis

---

## Jornadas dos Usuários

### 1. **Jornada: Novo Usuário (Cadastro com Voucher)**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Novo Usuário visita o site                                          │
└────────────────────┬────────────────────────────────────────────────┘
                     ↓
           ┌─────────────────────┐
           │ [LOGIN SCREEN]      │
           │ Opção: Cadastrar    │
           └─────────────────────┘
                     ↓
        ┌────────────────────────────────────┐
        │ Formulário de Cadastro:            │
        │ • Email                            │
        │ • Senha                            │
        │ • Nome completo                    │
        │ • Nome da escola                   │
        │ • **Código de acesso (voucher)**   │
        └────────────────────────────────────┘
                     ↓
        ┌──────────────────────────────────────────────┐
        │ App valida voucher                          │
        │ (via api.validateVoucher)                    │
        └──────────────────────────────────────────────┘
                     ↓
             (Válido?) 
             SIM ↓ NÃO (erro)
                 │    └─→ [Mostra erro ao usuário]
                 │
                 ↓
        ┌────────────────────────────────────┐
        │ Cria usuário em auth.users         │
        │ + Cria profiles com dados          │
        │ + Resga do voucher (redeem)        │
        │ + Calcula access_expires_at        │
        └────────────────────────────────────┘
                     ↓
      (Email confirmation habilitado?)
      SIM ↓ NÃO
         │  └─→ [HOME SCREEN - Acesso total]
         │
         ↓
      ┌──────────────────────┐
      │ [EMAIL_CONFIRMATION] │
      │ "Verifique seu email"│
      │ → Link de confirmação│
      └──────────────────────┘
              ↓
      ┌──────────────────────┐
      │ [HOME SCREEN]        │
      │ (após confirmar      │
      │  email no inbox)     │
      └──────────────────────┘
```

**Duração típica**: 2-3 minutos  
**Taxa de conversão esperada**: 70% (drop-off em validação de voucher)

---

### 2. **Jornada: Usuário Existente (Login)**

```
┌──────────────────────────────────────┐
│ Usuário retorna ao site              │
└────────────┬─────────────────────────┘
             ↓
    ┌─────────────────────┐
    │ [LOGIN SCREEN]      │
    │ Email + Senha       │
    └─────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ Autentica em Supabase Auth         │
    │ (api.signIn)                       │
    └────────────────────────────────────┘
             ↓
      (Credenciais OK?)
      SIM ↓ NÃO
         │  └─→ [Mostra erro]
         │
         ↓
    ┌──────────────────────────────────┐
    │ Carrega perfil + acesso_status    │
    │ Verifica vigência do voucher      │
    └──────────────────────────────────┘
             ↓
      (Acesso vigente?)
      SIM ↓ NÃO
         │  └─→ [ACCESS_EXPIRED]
         │
         ↓
    ┌────────────────────────────────┐
    │ [HOME SCREEN]                  │
    │ Exibe todas as coleções        │
    │ + Progresso salvo              │
    └────────────────────────────────┘
```

**Duração típica**: 30 segundos  
**Entrada esperada**: Diária

---

### 3. **Jornada: Descoberta de Conteúdo (Home → Details → Player)**

```
┌──────────────────────────────────┐
│ [HOME SCREEN]                    │
│ ├─ Grid de 16 coleções          │
│ ├─ Filtro por nível              │
│ ├─ Avatar do usuário no topo     │
│ └─ BottomNav com busca           │
└─────────────────┬────────────────┘
                  ↓
     (Usuário clica em coleção)
                  ↓
    ┌────────────────────────────────┐
    │ [DETAILS SCREEN]               │
    │ Exibe:                         │
    │ • Capa + Título               │
    │ • Objetivos de aprendizagem    │
    │ • Habilidades BNCC/CASEL       │
    │ • Faixa etária                 │
    │ • Botões de ação:              │
    │   - Ler PDF (flipbook)         │
    │   - Ouvir áudio                │
    │   - Assistir vídeo             │
    │   - Materiais extras           │
    └────────────────────────────────┘
                  ↓
   (Clica em "Ler" / "Ouvir" / "Assistir")
                  ↓
    ┌────────────────────────────────┐
    │ [PLAYER_BOOK / AUDIO / VIDEO] │
    │ Reprodoz conteúdo com         │
    │ • Controles de reprodução      │
    │ • Salva progresso              │
    │ • Permite pausar/retomar       │
    └────────────────────────────────┘
                  ↓
    (Usuário volta para HOME)
                  ↓
    ┌────────────────────────────────┐
    │ [HOME SCREEN]                  │
    │ Coleção mostra progresso ✓     │
    └────────────────────────────────┘
```

**Duração típica**: 5-30 minutos (depende do conteúdo)  
**Ação chave**: Marcar progresso

---

### 4. **Jornada: Renovação de Acesso (Access Expired)**

```
┌──────────────────────────────────────┐
│ Usuário tenta acessar app            │
│ MAS acesso expirou (expired)          │
└────────────────┬──────────────────────┘
                 ↓
    ┌──────────────────────────────────┐
    │ [ACCESS_EXPIRED SCREEN]          │
    │ Mostra:                          │
    │ • "Seu acesso expirou em XX"    │
    │ • Campos para novo voucher:      │
    │   - Input: Código novo           │
    │   - Botão: Renovar acesso        │
    │ • Link: "Contato / Suporte"      │
    │ • Em DEV: Lista de codes válidos │
    └──────────────────────────────────┘
                 ↓
    (Usuário cola novo código)
                 ↓
    ┌──────────────────────────────────┐
    │ App valida + resga novo voucher  │
    │ (api.redeemVoucher)              │
    │ • Adiciona meses à vigência      │
    │   (conta a partir da data atual) │
    │ • Atualiza access_expires_at     │
    └──────────────────────────────────┘
                 ↓
         (Renovação bem-sucedida?)
         SIM ↓ NÃO
            │  └─→ [Mostra erro - tente novamente]
            │
            ↓
    ┌──────────────────────────────────┐
    │ [HOME SCREEN]                    │
    │ Acesso restaurado                │
    │ Mostra notificação de sucesso    │
    │ (animação confete opcional)      │
    └──────────────────────────────────┘
```

**Duração típica**: 1-2 minutos  
**Frequência**: ~1x/mês (dependendo da duração do voucher)

---

### 5. **Jornada: Busca de Conteúdo**

```
┌──────────────────────────────┐
│ [HOME SCREEN]                │
│ Clica em ícone de busca      │
└────────────────┬─────────────┘
                 ↓
    ┌──────────────────────────┐
    │ [SEARCH SCREEN]          │
    │ • Input: termo de busca  │
    │ • Filtros:               │
    │   - Nível (dropdown)     │
    │   - Tipo (PDF/Áudio/...)│
    │ • Grid de resultados     │
    └──────────────────────────┘
                 ↓
    (Digita "Kaboo" ou seleciona filtro)
                 ↓
    ┌──────────────────────────┐
    │ Busca em real-time       │
    │ (debounce: 300ms)        │
    │ Filtra por title +       │
    │ theme + keywords         │
    │ Mostra matches           │
    └──────────────────────────┘
                 ↓
    (Clica resultado)
                 ↓
    [DETAILS SCREEN]
```

**Duração típica**: 1-3 minutos  
**Taxa de sucesso**: 80% (encontra o que quer)

---

### 6. **Jornada: Gerenciamento de Perfil**

```
┌────────────────────────────────┐
│ [HOME SCREEN]                  │
│ BottomNav → Ícone Perfil       │
└────────────┬───────────────────┘
             ↓
┌────────────────────────────────┐
│ [PROFILE SCREEN]               │
│ Mostra:                         │
│ • Avatar + Nome                │
│ • Email                        │
│ • Escola                       │
│ • Data de acesso (vigência)    │
│ • Botão: Alterar avatar        │
│ • Botão: Editar dados          │
│ • Botão: Meus dados (LGPD)     │
│ • Botão: Logout                │
└────────────────────────────────┘
                ↓
      (Clica em alterar avatar)
                ↓
┌────────────────────────────────┐
│ Modal: Seleção de avatar       │
│ • Galeria de personagens       │
│ • Preview ao passar mouse      │
│ • Botão: Confirmar             │
└────────────────────────────────┘
                ↓
┌────────────────────────────────┐
│ Atualiza avatar_id em profiles │
│ UI atualiza logo               │
└────────────────────────────────┘
```

**Duração típica**: 1-2 minutos  
**Frequência**: 1-2x por mês (customização)

---

### 7. **Jornada: Admin - Gerenciamento de Vouchers**

```
┌──────────────────────────────────┐
│ Admin (role=admin) acessa app    │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ BottomNav mostra ícone ADMIN     │
│ Clica → [ADMIN SCREEN]           │
└────────────┬─────────────────────┘
             ↓
┌──────────────────────────────────┐
│ [ADMIN SCREEN] (VouchersModule)  │
│ 4 sub-abas:                      │
│ 1. MODELOS                       │
│ 2. LOTES                         │
│ 3. CÓDIGOS                       │
│ 4. AUDITORIA                     │
└────────────┬─────────────────────┘
             ↓
     (Admin clica "Novo Modelo")
             ↓
┌──────────────────────────────────┐
│ Modal: Criar Modelo (3 passos)   │
│                                 │
│ PASSO 1: Info Básica             │
│ • Nome do modelo                 │
│ • Descrição                      │
│ • Tipo de pacote (dropdown)      │
│ • Duração em meses (dropdown)    │
│ • Prazo de resgate (date)        │
│                                 │
│ PASSO 2: Selecionar Conteúdo    │
│ • Filtro por nível              │
│ • Checkboxes de coleções        │
│ • Preview de itens selecionados  │
│                                 │
│ PASSO 3: Review                 │
│ • Resumo de todas as seleções   │
│ • Botão: Criar Modelo           │
└──────────────────────────────────┘
             ↓
┌──────────────────────────────────┐
│ Admin volta para ABA de MODELOS  │
│ Vê novo modelo em status DRAFT   │
│ Pode editar ou deletar           │
│ Clica: "Gerar Lote"             │
└──────────────────────────────────┘
             ↓
┌──────────────────────────────────┐
│ Modal: Gerar Lote                │
│ • Quantidade de códigos          │
│ • Label do lote (ex: "Q1 2026")  │
│ • Botão: Gerar                   │
└──────────────────────────────────┘
             ↓
┌──────────────────────────────────┐
│ Sistema gera N vouchers          │
│ • Cria em DB com status=active   │
│ • Cria batch record              │
│ • Loga em audit_logs             │
└──────────────────────────────────┘
             ↓
┌──────────────────────────────────┐
│ LOTES ABA: Admin vê novo lote    │
│ • Status: GENERATED              │
│ • Botão: Exportar (CSV)          │
│ • Botão: Marcar como ENVIADO     │
│ • Botão: Marcar como CONFIRMADO  │
│ • Botão: Cancelar (com motivo)   │
└──────────────────────────────────┘
             ↓
    (Admin clica "Exportar CSV")
             ↓
┌──────────────────────────────────┐
│ Download: batch_2026-04-08.csv   │
│ Formato:                         │
│ code,duration_months,created_at  │
│ KABOO-001,3,2026-04-08          │
│ KABOO-002,3,2026-04-08          │
│ ...                              │
└──────────────────────────────────┘
```

**Duração típica**: 15-30 minutos (process completo)  
**Frequência**: 1-2x por trimestre (geração de lotes)

---

## Sistema de Vouchers

### O que é um Voucher?

Um **voucher** é um código temporário que:
1. Concede acesso a um usuário por um período (1/3/6/9/12 meses)
2. Pode ser resgatado apenas uma vez
3. Pode ter uma data de expiração do código (depois, ninguém pode resgatá-lo)
4. Pode estar ligado a conteúdo específico (grants) ou acesso universal

### Ciclo de Vida de um Voucher

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CRIAÇÃO (Admin)                                          │
│    • Define modelo (nome, duração, conteúdo)               │
│    • Define quantidade + label                             │
│    • Sistema gera códigos em batch                          │
│    Status: GENERATED                                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EXPORTAÇÃO (Admin)                                       │
│    • Download CSV com todos os códigos                      │
│    • Pronto para distribuição                              │
│    Status: EXPORTED                                         │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ENVIO (Admin)                                            │
│    • Marca em sistema como "enviado"                        │
│    • Registra data + destinatário                          │
│    Status: SENT                                             │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. DISTRIBUIÇÃO (Externo)                                  │
│    • Códigos distribuídos via email / WhatsApp / etc       │
│    • Não rastreia status no sistema aqui                    │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. CONFIRMAÇÃO (Admin)                                      │
│    • Admin marca batch como "confirmado"                    │
│    (usado no relatório de K-PI)                            │
│    Status: CONFIRMED                                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. RESGATE (Usuário Final)                                 │
│    • Usuário entra em [LOGIN] ou [ACCESS_EXPIRED]         │
│    • Cole código                                            │
│    • Sistema valida + marca como REDEEMED                  │
│    • Atualiza profile.access_expires_at                    │
│    • Insere user_content_grants (se modelo por conteúdo)   │
│    Voucher Status: REDEEMED                                │
│    Batch Status: REDEEMED (conta parcial)                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. RASTREAMENTO (Admin)                                     │
│    • Audit logs mostram: quem, quando, qual ação          │
│    • Relatórios: % resgatados, usuários por lote, etc     │
└─────────────────────────────────────────────────────────────┘
```

### Validação de Voucher

Duas funções RPC:

#### `validate_voucher(code)` (sem efeito colateral)
- Retorna se código é válido
- NÃO marca como resgat
- Usado para preview/validação antes de criar usuário

#### `redeem_voucher(code)` (com efeito colateral)
- Marca como resgat
- Cria/atualiza perfil
- Insere grants
- Retorna perfil atualizado

### Regras de Validação

```
CÓDIGO INVÁLIDO
├─ String vazia
├─ Não encontrado no DB
└─ Exemplo: "" ou "INVALIDO123"
    → Código: invalid_code
    → Mensagem: "Código de acesso inválido."

JÁ RESGATADO
├─ status = 'redeemed'
├─ consumed_by_user_id IS NOT NULL
└─ Exemplo: usuário tentando usar código 2x
    → Código: already_redeemed
    → Mensagem: "Este código já foi utilizado."

EXPIRADO
├─ status = 'expired'
├─ expires_at < NOW()
└─ Exemplo: código vencido em 31/03/2026, tentando resgatar em 08/04
    → Código: voucher_expired
    → Mensagem: "Este código de acesso expirou."

DESABILITADO
├─ status = 'disabled'
├─ Marcado pelo admin (CANCELAR batch)
└─ Exemplo: admin clicou "Desativar" em VouchersModule
    → Código: voucher_disabled
    → Mensagem: "Este código não está mais disponível."

NÃO AUTENTICADO (apenas em redeem)
├─ auth.uid() IS NULL
└─ Exemplo: usuário não logado tenta resgatar
    → Código: not_authenticated
    → Mensagem: "Faça login para ativar um novo código."
```

### Cálculo de Vigência

Quando um voucher é resgatado:

```typescript
// Se já tem acesso anterior:
base_date = MAX(current_access_expires_at, NOW())

// Senão:
base_date = NOW()

// Nova expiração:
new_expiry = base_date + duration_months
```

Exemplo:
- Usuário tem acesso até 31/05/2026 (2 meses)
- Resga voucher de 3 meses em 08/04/2026
- Nova vigência = 31/05/2026 + 3 meses = 31/08/2026 ✓ (renovação contínua)

---

## Autenticação e Acesso

### Fluxo de Autenticação

```
┌─────────────────────────────────────────┐
│ 1. SIGNUP (Novo Usuário)               │
│                                         │
│ POST /auth/v1/signup                   │
│ {                                       │
│   "email": "prof@escola.com",          │
│   "password": "***",                   │
│   "data": {                            │
│     "full_name": "Prof. Ana",         │
│     "school_name": "EMEF Kaboo"       │
│   }                                     │
│ }                                       │
│                                         │
│ Supabase cria:                          │
│ • auth.users entry                      │
│ • profiles entry (auto trigger)         │
│ • access_status = 'pending_voucher'     │
│                                         │
│ Se email confirmation = ON:             │
│ • Envia e-mail de confirmação          │
│ • Retorna { user, session: null }      │
│                                         │
│ Else:                                   │
│ • Retorna { user, session }            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 2. SIGNIN (Usuário Existente)          │
│                                         │
│ POST /auth/v1/signin                   │
│ {                                       │
│   "email": "prof@escola.com",          │
│   "password": "***"                    │
│ }                                       │
│                                         │
│ Supabase retorna:                       │
│ { user, session: { access_token, ... }}│
│                                         │
│ Frontend salva token em                 │
│ sessionStorage / localStorage           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 3. AUTHENTICATED REQUEST                │
│                                         │
│ Todos os requests incluem:              │
│ Authorization: Bearer <access_token>    │
│                                         │
│ Supabase valida token +                 │
│ PostgREST injeta auth.uid() + RLS      │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 4. REFRESH TOKEN                        │
│                                         │
│ Se access_token expira (1h):            │
│ POST /auth/v1/token?grant_type=refresh │
│ → Retorna novo access_token             │
│                                         │
│ Frontend atualiza + retry original call │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 5. LOGOUT                               │
│                                         │
│ POST /auth/v1/logout                   │
│ (invalida sessão no servidor)           │
│                                         │
│ Frontend:                               │
│ • Remove tokens                         │
│ • Limpa localStorage/sessionStorage     │
│ • Redireciona para [LOGIN]              │
└─────────────────────────────────────────┘
```

### Controle de Acesso

Dois níveis: **Autenticação** + **Autorização**

#### 1. Autenticação
- Feita pelo Supabase Auth (JWT)
- Middleware automático em PostgREST

#### 2. Autorização por Vigência

```typescript
// Em lib/access.ts

function getProfileAccessStatus(profile): AccessStatus {
  if (!profile) return 'pending_voucher'
  
  if (profile.access_expires_at) {
    return NOW() < profile.access_expires_at ? 'active' : 'expired'
  }
  
  return 'active'
}

function isAccessBlocked(profile): boolean {
  return getProfileAccessStatus(profile) !== 'active'
}

// App.tsx usa isso para bloquear telas protegidas
const PROTECTED_SCREENS = [
  'home', 'search', 'profile', 'details', 
  'player_book', 'player_audio', 'player_video', 
  'tools', 'admin'
]

// Se tela protegida + acesso bloqueado → redireciona para access_expired
```

#### 3. Autorização por Role

```typescript
// Em lib/auth.ts

async function getUserRole(): UserRole {
  if (!supabaseConfigured) {
    return getMockRole()
  }
  
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  return profile.role // 'admin' | 'editor' | 'viewer'
}

// Admin-only screens (AdminScreen)
if (role !== 'admin') {
  redirect('/home')
}
```

#### 4. Row Level Security (RLS)

PostgreSQL impõe políticas de segurança:

```sql
-- Exemplo: profiles
CREATE POLICY "Users read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Resultado: usuário só vê seu próprio perfil
SELECT * FROM profiles; -- Retorna apenas o perfil do usuário autenticado
```

---

## Modos de Execução

### Modo 1: Demonstração (DEV_MODE)

**Situação**: Não tem variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env.local`

**Comportamento**:
- ✅ Login local (via localStorage em `kaboo_mock_users`)
- ✅ Dados mock do catálogo (de `data/catalog.seed.json`)
- ✅ Vouchers mock com códigos previsíveis (`KABOO-1MES-2026`, etc)
- ✅ Sem dependência de Supabase
- ✅ Perfeito para prototipagem/demo

**Dados mock incluem**:
- admin: `demo@mundodekaboo.local` / `123456`
- 16 coleções com covers em `public/mock/covers/`
- Códigos válidos, expirados, já resgatados, bloqueados

### Modo 2: Supabase Local

**Situação**: Tem variáveis de um projeto Supabase local

**Setup**:
```bash
Copy-Item .env.local.example .env.local
./scripts/start-local.ps1  # Inicia Docker local
```

**Comportamento**:
- ✅ Supabase PostgreSQL local (Docker)
- ✅ Autenticação real
- ✅ Seed do catálogo + vouchers
- ✅ Perfeito para testes antes de produção

### Modo 3: Supabase Hospedado

**Situação**: Tem um projeto em supabase.com

**Setup (Novo Projeto)**:
```bash
./scripts/create-project.ps1
# Cria projeto automaticamente + aplica migrations + seed
```

**Setup (Projeto Existente)**:
```bash
./scripts/setup-db.ps1 -ProjectRef "seu_project_ref"
```

**Comportamento**:
- ✅ Banco de dados real na nuvem
- ✅ Autenticação com email real
- ✅ Dados persistidos
- ✅ Pronto para produção

---

## Deployment e Hospedagem

### Frontend: Vercel

**Build**:
```bash
npm run build
# Generates: dist/ (SPA estática)
```

**Deploy**:
```bash
vercel deploy dist/
# OU: push a main branch linkada ao Vercel (CI/CD automático)
```

**Resultado**:
- URL: `https://mundo-de-kaboo.vercel.app` (ou custom domain)
- CDN global automático
- Zero-downtime deployments

### Backend: Supabase Hosting

**Banco PostgreSQL**:
- Hospedado em `supabase.co` (AWS/GCP)
- Regiões disponíveis: sa-east-1 (São Paulo), us-east-1, etc
- Backups automáticos diários

**Autenticação**:
- Endpoints gerenciados: `/auth/v1/*`
- Email transacional: Supabase SMTP (limitado) ou custom SMTP

**Storage**:
- Bucket `collections/` para covers + PDFs + áudio/vídeo
- Acesso via signed URLs (expiração + controle de acesso RLS)

**Real-time (opcional)**:
- WebSocket para sincronização em tempo real
- Não implementado na v1, mas pronto para futuro

### Variáveis de Ambiente

```bash
# .env.local (NUNCA commitar)

# Supabase
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhb... (chave pública)

# Google Gemini (opcional, para future AI features)
VITE_GEMINI_API_KEY=AIzaSyD... (NÃO expor publicar)

# Vercel Analytics
VERCEL_ANALYTICS_ID=...
```

### CI/CD

**GitHub Actions** (futuro):
```yaml
on: [push, pull_request]
jobs:
  build:
    - npm install
    - npm run build
    - npm run lint (futuro)
    - npm run test (futuro)
  
  deploy:
    - vercel deploy
```

---

## Estrutura de Diretórios

```
mundo-de-kaboo-main/
│
├── 📄 Arquivos Raiz
│   ├── App.tsx                          # Orquestrador de rotas
│   ├── Index.tsx                        # Entry React
│   ├── index.html                       # HTML template
│   ├── vite.config.ts                   # Configuração Vite
│   ├── tsconfig.json                    # Configuração TypeScript
│   ├── types.ts                         # Tipos compartilhados
│   ├── constants.ts                     # Constantes da app
│   ├── metadata.json                    # Metadados de SEO
│   ├── vercel.json                      # Config Vercel
│   ├── package.json                     # Dependências
│   └── README.md                        # Documentação principal
│
├── 📁 assets/
│   └── images/
│       └── characters/                  # SVGs de personagens
│
├── 📁 components/                       # Componentes React reutilizáveis
│   ├── BottomNav.tsx                   # Navegação inferior
│   ├── Button.tsx                       # Botão estilizado
│   ├── Card3D.tsx                       # Card com efeito 3D
│   ├── CollectionCoverSection.tsx      # Cover de coleção
│   ├── CollectionModal.tsx              # Modal de detalhes
│   ├── ColorPicker.tsx                  # Seletor de cores
│   ├── ConfirmationModal.tsx            # Modal de confirmação
│   ├── CriticalConfirmationModal.tsx   # Modal crítica (irreversível)
│   ├── FilePreviewModal.tsx             # Preview de arquivo
│   ├── FileUpload.tsx                   # Upload de arquivo
│   ├── GalaxyBackground.tsx             # Background animado
│   ├── Icons.tsx                        # Ícones customizados
│   ├── ModalSkeleton.tsx                # Skeleton de modal
│   ├── MultipleFileUpload.tsx           # Upload múltiplo
│   ├── PageHeader.tsx                   # Header com título
│   ├── Tabs.tsx                         # Componente abas
│   ├── TagInput.tsx                     # Input de tags
│   ├── Toast.tsx                        # Notificação tipo toast
│   └── flipbook/
│       ├── Flipbook.tsx                 # Efeito flipbook
│       ├── FlipbookLoader.tsx           # Loader para flipbook
│       ├── FlipbookViewer.tsx           # Leitor completo
│       └── PdfPage.tsx                  # Página de PDF
│
├── 📁 data/
│   ├── catalog.seed.json                # Catálogo mock (16 coleções)
│   └── seed.sql                         # SQL seed para DB
│
├── 📁 docs/
│   ├── benchmark-fluxo-vouchers-grafica.md
│   ├── prd-vouchers-por-conteudo.md
│   └── wireframe-cms-admin.md
│
├── 📁 hooks/                            # React hooks customizados
│   ├── useDebounce.ts                   # Debounce hook
│   ├── useIsMobile.ts                   # Detector mobile
│   ├── useOrientation.ts                # Orientação do device
│   ├── useRefSize.ts                    # Tamanho de ref DOM
│   ├── useScreenSize.ts                 # Tamanho da tela
│   ├── useThemeBackground.ts            # Background theme
│   └── useToast.ts                      # Notificações toast
│
├── 📁 lib/                              # Lógica de negócio
│   ├── api.ts                           # Client API + cache
│   ├── auth.ts                          # Funções de auth
│   ├── access.ts                        # Regras de acesso
│   ├── logger.ts                        # Logger dev/prod
│   ├── mockData.ts                      # Mock local (16 cols)
│   ├── mockVoucherData.ts               # Mock de vouchers
│   ├── offline.ts                       # Suporte offline
│   ├── storage.ts                       # localStorage utils
│   ├── supabase.ts                      # Cliente Supabase
│   ├── utils.ts                         # Utilitários gerais
│   └── warning-shim.ts                  # Shim para console.warn
│
├── 📁 public/
│   ├── manifest.json                    # Web app manifest
│   ├── pdf.worker.min.mjs               # PDFjs worker
│   └── mock/
│       └── covers/                      # Covers mock de 16 coleções
│
├── 📁 screens/                          # Telas da aplicação (15+)
│   ├── AccessExpiredScreen.tsx          # Acesso expirado + renovação
│   ├── AdminScreen.tsx                  # Painel admin
│   ├── AdminCollectionsScreen.tsx       # Admin: Gerenciar coleções
│   ├── AudioPlayerScreen.tsx            # Player de áudio
│   ├── BookReaderScreen.tsx             # Leitor de PDF (flipbook)
│   ├── DetailsScreen.tsx                # Detalhes de coleção
│   ├── EmailConfirmationScreen.tsx      # Confirmação de email
│   ├── ExtraToolsScreen.tsx             # Ferramentas extras
│   ├── ForgotPasswordScreen.tsx         # Recuperação de senha
│   ├── HomeScreen.tsx                   # Tela inicial + catálogo
│   ├── LibraryScreen.tsx                # Biblioteca (se existe)
│   ├── LoginScreen.tsx                  # Login + Cadastro
│   ├── MyDataScreen.tsx                 # LGPD: Download dados
│   ├── ProfileScreen.tsx                # Perfil do usuário
│   ├── SearchScreen.tsx                 # Busca de conteúdo
│   ├── VideoPlayerScreen.tsx            # Player de vídeo
│   └── VouchersModule.tsx               # Admin: Gerenciar vouchers
│
├── 📁 scripts/                          # Scripts utilitários (PowerShell)
│   ├── configure-auth-email-testing.ps1
│   ├── confirm-auth-user.ps1
│   ├── copy-pdf-worker.mjs
│   ├── create-project.ps1               # Criar projeto Supabase
│   ├── setup-db.ps1                     # Setup DB local/remoto
│   ├── start-local.ps1                  # Inicia Supabase local
│   └── upload-character-assets.ps1
│
├── 📁 supabase/                         # Configuração Supabase
│   ├── config.toml                      # Config local
│   ├── seed.sql                         # Seed padrão
│   ├── seed.vouchers.sql                # Seed vouchers
│   └── migrations/
│       ├── 20260101000000_initial_schema.sql          # Schema base
│       ├── 20260406000100_voucher_access_control.sql  # Vouchers
│       ├── 20260407000200_storage_collections_bucket.sql
│       ├── 20260407000300_fix_redeem_voucher_current_timestamp.sql
│       ├── 20260408000400_voucher_models_batches.sql
│       └── 20260409000500_redeem_voucher_grants.sql
│
└── 📁 -p/                               # Arquivos Privados (não versionados)
    └── (dev secrets, temp files)
```

---

## Resumo Executivo

| Aspecto | Descrição |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite + Tailwind |
| **Backend** | Supabase (PostgreSQL + Auth + Storage) |
| **Banco de Dados** | 9 tabelas principais + 6 migrations |
| **Autenticação** | Email/Senha (Supabase Auth) |
| **Autorização** | Role-based (admin/editor/viewer) + Vigência temporal |
| **Telas** | 15+ screens navegáveis via estado |
| **API** | PostgREST + 2 RPCs principais (validate + redeem voucher) |
| **Modo Dev** | Mock local sem Supabase |
| **Modo Prod** | Supabase hospedado + Vercel CDN |
| **Jornadas Principais** | Signup → Redeem → Usar Conteúdo → Renovar |
| **KPIs** | Taxa resgate vouchers, tempo de acesso, conteúdo mais usado |

---

**Última atualização**: 26/06/2026, 21:47:22
**Responsável**: Equipe de Desenvolvimento
**Versão**: 1.0
