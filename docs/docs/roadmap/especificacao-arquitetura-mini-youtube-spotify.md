# Especificação de Arquitetura — Mini YouTube e Mini Spotify Privados

> Data: 25/04/2026  
> Escopo: Vídeos e Músicas como bibliotecas privadas de primeira classe  
> Base do brownfield: React + TypeScript + Vite + Supabase

---

## 1. Decisão arquitetural

`collection_resources` não deve ser o núcleo do Mini YouTube nem do Mini Spotify.

Essa estrutura atende anexos simples de coleção, mas não expressa adequadamente:

1. status editorial;
2. provider interno versus YouTube;
3. curadoria por trilhos e destaques;
4. progresso por usuário;
5. favoritos;
6. autorização privada consistente;
7. relacionamento opcional com coleção.

Decisão:

1. `collections` continua sendo o domínio principal de livros e kits.
2. `media_items` passa a ser a fonte oficial de `Videos` e `Musicas`.
3. `media_collection_links` guarda o vínculo opcional com coleção.
4. `media_shelves` e `media_shelf_items` resolvem destaque, trilhos e playlists editoriais.
5. `user_media_progress` e `user_media_favorites` resolvem estado individual do usuário.
6. assets internos devem evoluir para bucket privado com assinatura temporária de acesso.

---

## 2. Modelo de dados recomendado

### 2.1 Enums

Enums sugeridos:

1. `media_hub`: `video`, `music`, `formations`, `materials`
2. `media_status`: `draft`, `published`, `archived`
3. `media_provider`: `internal`, `youtube`, `external_audio`
4. `media_access_mode`: `active_subscription`, `linked_collection_grant`
5. `media_shelf_type`: `hero`, `rail`, `playlist`, `continue_watching`
6. `media_link_type`: `contextual`, `primary_source`, `recommended_with`

### 2.2 Tabela `media_items`

Colunas mínimas:

1. `id uuid primary key default gen_random_uuid()`
2. `hub media_hub not null`
3. `title text not null`
4. `slug text not null unique`
5. `summary text`
6. `description text`
7. `provider media_provider not null`
8. `status media_status not null default 'draft'`
9. `access_mode media_access_mode not null default 'active_subscription'`
10. `duration_seconds integer`
11. `thumbnail_path text`
12. `stream_path text`
13. `captions_path text`
14. `external_url text`
15. `external_ref text`
16. `provider_metadata jsonb not null default '{}'::jsonb`
17. `language_code text default 'pt-BR'`
18. `age_grade text[] default '{}'`
19. `tags text[] default '{}'`
20. `search_text tsvector`
21. `published_at timestamptz`
22. `created_by uuid references public.profiles(id)`
23. `updated_by uuid references public.profiles(id)`
24. `legacy_collection_resource_id uuid`
25. `created_at timestamptz not null default now()`
26. `updated_at timestamptz not null default now()`

Regras:

1. `provider = internal` usa `stream_path` e `thumbnail_path`.
2. `provider = youtube` usa `external_ref` e `external_url`.
3. `hub = music` não deve aceitar `youtube` no MVP inicial sem validação explícita do produto.

### 2.3 Tabela `media_collection_links`

Relacionamento editorial opcional com livros e kits.

1. `id uuid primary key default gen_random_uuid()`
2. `media_item_id uuid not null references public.media_items(id) on delete cascade`
3. `collection_id uuid not null references public.collections(id) on delete cascade`
4. `link_type media_link_type not null default 'contextual'`
5. `order_index integer not null default 0`
6. `created_at timestamptz not null default now()`
7. `unique(media_item_id, collection_id, link_type)`

### 2.4 Tabela `media_shelves`

Curadoria de superfície dos hubs.

1. `id uuid primary key default gen_random_uuid()`
2. `hub media_hub not null`
3. `title text not null`
4. `slug text not null unique`
5. `shelf_type media_shelf_type not null default 'rail'`
6. `description text`
7. `order_index integer not null default 0`
8. `is_published boolean not null default false`
9. `created_by uuid references public.profiles(id)`
10. `updated_by uuid references public.profiles(id)`
11. `created_at timestamptz not null default now()`
12. `updated_at timestamptz not null default now()`

### 2.5 Tabela `media_shelf_items`

1. `id uuid primary key default gen_random_uuid()`
2. `shelf_id uuid not null references public.media_shelves(id) on delete cascade`
3. `media_item_id uuid not null references public.media_items(id) on delete cascade`
4. `order_index integer not null default 0`
5. `highlight_label text`
6. `created_at timestamptz not null default now()`
7. `unique(shelf_id, media_item_id)`

### 2.6 Tabela `user_media_progress`

1. `id uuid primary key default gen_random_uuid()`
2. `user_id uuid not null references auth.users(id) on delete cascade`
3. `media_item_id uuid not null references public.media_items(id) on delete cascade`
4. `last_position_seconds integer not null default 0`
5. `progress_percent numeric(5,2) not null default 0`
6. `started_at timestamptz`
7. `last_played_at timestamptz`
8. `completed_at timestamptz`
9. `created_at timestamptz not null default now()`
10. `updated_at timestamptz not null default now()`
11. `unique(user_id, media_item_id)`

### 2.7 Tabela `user_media_favorites`

1. `id uuid primary key default gen_random_uuid()`
2. `user_id uuid not null references auth.users(id) on delete cascade`
3. `media_item_id uuid not null references public.media_items(id) on delete cascade`
4. `created_at timestamptz not null default now()`
5. `unique(user_id, media_item_id)`

### 2.8 Tabela `media_link_health`

1. `id uuid primary key default gen_random_uuid()`
2. `media_item_id uuid not null references public.media_items(id) on delete cascade`
3. `status text check (status in ('ok', 'warning', 'down'))`
4. `http_code integer`
5. `response_ms integer`
6. `last_checked_at timestamptz`

---

## 3. Índices recomendados

1. `media_items`: índice em `hub, status, published_at desc`
2. `media_items`: índice em `provider, status`
3. `media_items`: GIN em `tags`
4. `media_items`: GIN em `age_grade`
5. `media_items`: GIN em `search_text`
6. `media_collection_links`: índice em `collection_id, link_type`
7. `media_collection_links`: índice em `media_item_id`
8. `media_shelves`: índice em `hub, is_published, order_index`
9. `media_shelf_items`: índice em `shelf_id, order_index`
10. `user_media_progress`: índice em `user_id, last_played_at desc`
11. `user_media_favorites`: índice em `user_id, created_at desc`

---

## 4. Políticas RLS mínimas

### 4.1 Convenções

Manter o padrão já usado no projeto com `profiles.role`.

Funções auxiliares recomendadas:

1. `is_admin_or_editor(user_id uuid)`
2. `has_active_access(user_id uuid)`
3. `has_collection_grant(user_id uuid, collection_id uuid)`

### 4.2 `media_items`

Regras mínimas:

1. `SELECT` para usuário autenticado quando `status = 'published'` e o usuário tiver acesso ativo.
2. Se `access_mode = 'linked_collection_grant'`, exigir grant válido para alguma coleção relacionada.
3. `INSERT`, `UPDATE`, `DELETE` apenas para `admin` e `editor`.
4. `service_role` mantém acesso total.

### 4.3 `media_collection_links`, `media_shelves` e `media_shelf_items`

1. Leitura apenas quando ligados a itens publicados visíveis.
2. Escrita apenas para `admin` e `editor`.

### 4.4 `user_media_progress` e `user_media_favorites`

1. Usuário só lê e escreve seus próprios registros.
2. `service_role` mantém acesso operacional total.

### 4.5 Segurança de streaming

RLS não basta para proteger ativo binário. Regra obrigatória:

1. não persistir URL pública final de assets internos;
2. persistir `path` de storage;
3. emitir URL assinada sob demanda via função segura.

---

## 5. Estratégia de migração do legado

### Fase 0 — Preparação

1. Criar novas tabelas, índices e RLS.
2. Não alterar `collections` nem `collection_resources` ainda.
3. Popular seed inicial de vídeos e músicas no novo modelo.

### Fase 1 — Backfill controlado

Migrar para `media_items`:

1. `collection_resources.type in ('audio', 'video')`
2. `collections.audio_url`
3. `collections.video_url`

Preservações:

1. preencher `legacy_collection_resource_id` quando aplicável;
2. criar `media_collection_links` com a coleção de origem;
3. definir `access_mode` explicitamente, sem herança implícita.

### Fase 2 — Leitura dupla

1. Hubs `Videos` e `Musicas` passam a ler `media_items`.
2. `DetailsScreen` continua lendo o legado enquanto a transição termina.
3. Relacionados podem usar `media_collection_links` sem derrubar o fluxo atual.

### Fase 3 — Admin novo

1. CRUD de mídia passa a gravar apenas em `media_items`.
2. `collection_resources` deixa de receber novos vídeos e áudios.
3. A tabela antiga fica para documentos e anexos simples.

### Fase 4 — Limpeza

1. Remover dependência residual de vídeo e áudio do legado.
2. Manter `collection_resources` apenas para extras documentais de coleção.

---

## 6. Riscos técnicos

1. Persistir URL pública de stream interno e chamar isso de privado.
2. Misturar autorização de mídia com autorização de coleção só no frontend.
3. Manter montagem editorial de trilhos inteiramente no client.
4. Duplicar itens entre domínio legado e domínio novo sem rastreamento.
5. Escalar busca sem índice de texto nem normalização mínima.
6. Continuar acoplando player ao detalhe de coleção em vez do item de mídia.

---

## 7. Ordem recomendada de implementação

1. Criar schema novo, índices, RLS e função segura de playback.
2. Tipar domínio de mídia em `types.ts`.
3. Expor adapters novos em `lib/api.ts`.
4. Fazer hubs `Videos` e `Musicas` lerem `media_items`.
5. Criar módulo `AdminMedia` para operação editorial real.
6. Refatorar `VideoPlayerScreen` e `AudioPlayerScreen` para usar `media_item_id` como chave principal.
7. Persistir progresso, favoritos e recentes.
8. Endurecer storage privado e health checks.

---

## 8. Decisão operacional final

Para este MVP:

1. `Videos` e `Musicas` nascem no novo backbone.
2. `Formacoes` e `Materiais` herdam a mesma arquitetura depois.
3. `collection_resources` não deve ser expandida para absorver o novo produto.

Este documento serve como referência técnica para a futura migration do Supabase e para o refactor do frontend.