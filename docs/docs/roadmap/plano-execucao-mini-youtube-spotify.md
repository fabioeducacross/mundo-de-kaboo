# Plano de Execucao — Mini YouTube e Mini Spotify Privados

> Data: 25/04/2026  
> Origem: delta CEO de 24/04/2026 + alinhamento de produto posterior  
> Escopo desta entrega: Videos e Musicas  
> Fora do escopo imediato: Formacoes e Materiais como experiencia completa

---

## 1. Decisao de produto

O produto deixa de tratar `Videos` e `Musicas` como anexos ocasionais de `Colecoes` e passa a tratá-los como duas bibliotecas privadas de primeira classe, com experiencia inspirada em YouTube e Spotify, mas operadas por curadoria interna, autenticacao obrigatoria e links de streaming controlados pela plataforma.

Isso implica quatro decisoes fixas para o MVP:

1. `Videos` e `Musicas` passam a ter catalogo proprio, player proprio e admin proprio.
2. O cadastro de item de midia sera por metadados + URL de streaming, nao por upload direto no app.
3. O relacionamento com `Colecoes` sera opcional, nunca obrigatorio.
4. `Formacoes` e `Materiais` ficam preparadas no backbone de dados, mas nao entram como experiencia completa nesta fase.

---

## 2. Experiencia alvo

### 2.1 Mini YouTube privado

O hub de `Videos` deve parecer uma area de descoberta audiovisual privada, com hierarquia de destaques, cards de recomendacao, historico recente e player focado em continuidade.

Padroes obrigatorios:

1. Hero ou destaque editorial acima da dobra.
2. Trilhos curtos por intencao de uso, nao por taxonomia pesada.
3. Card com thumbnail, titulo, contexto e duracao.
4. Tela de player com titulo, descricao curta, contexto pedagógico e recomendados.
5. Retomada simples: continuar de onde parou.

### 2.2 Mini Spotify privado

O hub de `Musicas` deve priorizar fluxo rapido de descoberta e reproducao, com fila leve e player persistente.

Padroes obrigatorios:

1. Destaques e listas curtas por clima, intencao ou uso em sala.
2. Linha por faixa com leitura imediata e CTA claro.
3. Player de audio com play/pause, seek, tempo atual, duracao e proxima faixa.
4. Ultimas tocadas e favoritos.
5. Continuidade de audio ao navegar dentro da area logada, quando tecnicamente seguro.

### 2.3 Regra de UX transversal

As bibliotecas gerais nao devem herdar a complexidade da area de `Livros`.

Principios:

1. Curadoria primeiro.
2. Busca leve.
3. Poucos filtros.
4. Contexto de colecao apenas quando fizer sentido real.
5. Bloqueio de acesso com linguagem clara, sem estados quebrados ou telas vazias.

---

## 3. Arquitetura funcional do MVP

### 3.1 Superficies do usuario

Entregas de frontend no MVP:

1. Hub `Videos` com destaque, trilhos e listagem.
2. Hub `Musicas` com destaque, listas e retomada.
3. `VideoPlayerScreen` privada.
4. `AudioPlayerScreen` privada.
5. Favoritos e recente basicos.
6. Gate de permissao para itens privados.

### 3.2 Superficies administrativas

Entregas de administracao no MVP:

1. Modulo novo de gestao de midia dentro do `AdminScreen`.
2. CRUD de item de midia com status `draft`, `published` e `archived`.
3. Cadastro de provider `internal` ou `youtube`.
4. Vinculo opcional com `Colecoes`.
5. Ordenacao editorial por hub e destaque.
6. Validacao minima de link antes de publicar.

### 3.3 Backend e seguranca

Entregas de backend no MVP:

1. Tabela propria para itens de midia, sem depender de `collection_resources` como nucleo.
2. Tabela de relacionamento opcional com `collections`.
3. Tabela de progresso por usuario.
4. Tabela de favoritos por usuario.
5. Politicas RLS para leitura e gestao.
6. Suporte a URLs internas e a YouTube opcional.

---

## 4. Decisao de modelagem de dados

### 4.1 Problema da estrutura atual

A tabela `collection_resources` atende bem anexos simples de colecao, mas nao deve virar a espinha dorsal do Mini YouTube ou do Mini Spotify. Ela nao expressa bem:

1. status editorial;
2. progresso por usuario;
3. provider interno versus YouTube;
4. ordenacao por hub;
5. relacionamento opcional com colecao;
6. destaque, favoritos e recente.

### 4.2 Modelo recomendado

Criar o backbone abaixo no Supabase.

#### `media_items`

Campos minimos:

1. `id uuid primary key`
2. `hub_slug text check in ('videos', 'music', 'formations', 'materials')`
3. `media_kind text check in ('video', 'audio', 'document', 'training')`
4. `provider_type text check in ('internal', 'youtube')`
5. `title text not null`
6. `slug text unique`
7. `description text`
8. `thumbnail_url text`
9. `stream_url text`
10. `youtube_url text`
11. `duration_seconds integer`
12. `status text check in ('draft', 'published', 'archived') default 'draft'`
13. `is_private boolean default true`
14. `is_featured boolean default false`
15. `featured_order integer default 0`
16. `search_text text`
17. `created_by uuid`
18. `updated_by uuid`
19. `published_at timestamptz`
20. `created_at timestamptz default now()`
21. `updated_at timestamptz default now()`

#### `media_item_links`

Relacionamentos editoriais opcionais.

1. `id uuid primary key`
2. `media_item_id uuid not null references media_items(id) on delete cascade`
3. `collection_id uuid not null references collections(id) on delete cascade`
4. `link_type text check in ('primary', 'related', 'inspired_by') default 'related'`
5. `order_index integer default 0`

#### `user_media_progress`

1. `id uuid primary key`
2. `user_id uuid not null`
3. `media_item_id uuid not null references media_items(id) on delete cascade`
4. `progress_percent numeric(5,2) default 0`
5. `last_position_seconds integer default 0`
6. `last_played_at timestamptz`
7. `completed_at timestamptz`
8. `unique (user_id, media_item_id)`

#### `user_media_favorites`

1. `id uuid primary key`
2. `user_id uuid not null`
3. `media_item_id uuid not null references media_items(id) on delete cascade`
4. `created_at timestamptz default now()`
5. `unique (user_id, media_item_id)`

#### `media_link_health`

1. `id uuid primary key`
2. `media_item_id uuid not null references media_items(id) on delete cascade`
3. `status text check in ('ok', 'warning', 'down')`
4. `http_code integer`
5. `response_ms integer`
6. `last_checked_at timestamptz`

### 4.3 Regra de compatibilidade

Durante a transicao:

1. `collection_resources` continua existindo para legado.
2. `media_items` vira a fonte oficial de `Videos` e `Musicas`.
3. `Formacoes` e `Materiais` poderao migrar para `media_items` depois, sem reabrir o desenho estrutural.

---

## 5. Politicas de acesso

### Leitura

1. Usuario autenticado so le itens `published` autorizados pelo seu contexto de acesso.
2. Conteudo `draft` ou `archived` nunca aparece para usuario comum.
3. Links internos devem ser tratados como privados, preferencialmente com URL assinada no futuro.

### Escrita

1. Apenas `admin` e `editor` gerenciam `media_items`.
2. `viewer` nao edita nada.
3. Toda mudanca editorial critica precisa atualizar `updated_at` e `updated_by`.

### Telemetria minima do MVP

Eventos obrigatorios:

1. `media_list_view`
2. `media_item_open`
3. `media_play_start`
4. `media_play_progress`
5. `media_play_complete`
6. `media_play_fail`

---

## 6. Plano tecnico por frente

### Frente A — Banco e dominio

Objetivo: criar a base real do produto antes de sofisticar UI.

Arquivos alvo:

1. `supabase/migrations/*_media_items_core.sql` novo
2. `supabase/seed.sql`
3. `data/seed.sql`
4. `types.ts`
5. `lib/` ou `data/` para queries e adapters novos

Entregas:

1. Criar tabelas `media_items`, `media_item_links`, `user_media_progress`, `user_media_favorites`, `media_link_health`.
2. Criar RLS de leitura e escrita.
3. Popular seed com amostras reais de `video` e `audio`.
4. Tipar `hub_slug`, `provider_type` e `status` no frontend.

### Frente B — Admin de midia

Objetivo: nenhum Mini YouTube ou Mini Spotify existe sem ferramenta de cadastro.

Arquivos alvo:

1. `screens/AdminScreen.tsx`
2. novo modulo de tela, recomendado: `screens/AdminMediaScreen.tsx`
3. componentes auxiliares novos em `components/`
4. `types.ts`

Entregas:

1. Adicionar modulo `media` ao admin.
2. Criar formulario com campos editoriais e tecnicos.
3. Salvar `draft`, publicar, arquivar.
4. Validar provider interno versus YouTube.
5. Permitir vincular ou nao a uma colecao.

### Frente C — Hub de Videos

Objetivo: transformar a area atual em experiencia realmente parecida com Mini YouTube.

Arquivos alvo:

1. `screens/LibraryHubScreen.tsx`
2. `data/library-hubs/videos.mock.ts` na fase de transicao
3. `data/library-hubs/index.ts`
4. componentes novos recomendados: `VideoShelf`, `VideoFeaturedHero`, `MediaMetaRow`

Entregas:

1. Destaque editorial acima da dobra.
2. Trilhos curtos por intencao de uso.
3. Cards com duracao e contexto.
4. Secao `Continue assistindo` quando houver progresso.
5. Integracao real com `media_items` quando backend estiver habilitado.

### Frente D — Hub de Musicas

Objetivo: transformar a area atual em experiencia realmente parecida com Mini Spotify.

Arquivos alvo:

1. `screens/LibraryHubScreen.tsx`
2. `data/library-hubs/music.mock.ts` na fase de transicao
3. componentes novos recomendados: `AudioQueueCard`, `RecentTracksRail`, `NowPlayingBar`

Entregas:

1. Lista de faixas com prioridade de leitura rapida.
2. Destaques e secoes de uso imediato.
3. `Continue ouvindo` e `Favoritas`.
4. Barra persistente de `tocando agora`, se o fluxo de estado permitir sem regressao.

### Frente E — Players privados

Objetivo: abandonar player apenas funcional e chegar em UX de produto.

Arquivos alvo:

1. `screens/VideoPlayerScreen.tsx`
2. `screens/AudioPlayerScreen.tsx`
3. `App.tsx`
4. `types.ts`

Entregas `VideoPlayerScreen`:

1. Header limpo com contexto de retorno.
2. Player central com loading, erro e bloqueio.
3. Metadados e recomendados abaixo.
4. Persistencia de progresso.

Entregas `AudioPlayerScreen`:

1. Capa, titulo e contexto claros.
2. Controles completos de reproduzir, pausar e avançar na faixa.
3. Barra de progresso funcional.
4. Proxima faixa quando houver fila no mesmo rail.
5. Persistencia de progresso.

---

## 7. Ordem de implementacao por dia util

### Dia 1

1. Fechar schema de `media_items` e relacionamentos.
2. Revisar `types.ts` para suportar dominio de midia.
3. Escrever migration base.

### Dia 2

1. Aplicar seed inicial de videos e audios.
2. Criar adapters de leitura no frontend.
3. Garantir fallback mock enquanto backend real nao assume tudo.

### Dia 3

1. Abrir modulo `media` no admin.
2. Listar itens existentes.
3. Criar formulario de novo item.

### Dia 4

1. Publicar, editar e arquivar itens.
2. Validar links internos e YouTube.
3. Permitir vinculo opcional com colecao.

### Dia 5

1. Reestruturar hub de `Videos` em linguagem de Mini YouTube.
2. Implementar destaque, rails e `Continue assistindo`.
3. Conectar abertura ao `VideoPlayerScreen`.

### Dia 6

1. Reestruturar hub de `Musicas` em linguagem de Mini Spotify.
2. Implementar listas, destaque e `Continue ouvindo`.
3. Conectar abertura ao `AudioPlayerScreen`.

### Dia 7

1. Refatorar `VideoPlayerScreen` para experiencia privada de produto.
2. Persistir progresso real no backend.
3. Adicionar estados de erro, bloqueio e retomada.

### Dia 8

1. Refatorar `AudioPlayerScreen` com fila simples.
2. Persistir progresso e ultimas tocadas.
3. Adicionar favoritos.

### Dia 9

1. Aplicar RLS final e testes de acesso negativo.
2. Instrumentar eventos de telemetria minima.
3. Criar checagem basica de saude de link.

### Dia 10

1. Polimento de UX/UI.
2. QA funcional de fluxos completos.
3. Preparacao estrutural de `Formacoes` e `Materiais`, sem ativacao no menu principal alem do que ja existe.

---

## 8. Criterios de aceite do MVP

### Produto

1. Usuario autenticado encontra e reproduz `Videos` e `Musicas` sem depender de colecao.
2. Conteudo pode ou nao mostrar contexto de colecao, sem quebrar a descoberta.
3. O visual remete a YouTube e Spotify na dinamica, mas continua com linguagem Kaboo.

### Admin

1. Admin cria item novo sem upload direto de arquivo.
2. Admin publica e despublica com status editorial.
3. Admin escolhe provider interno ou YouTube.

### Dados

1. `media_items` funciona como fonte oficial das bibliotecas gerais.
2. Progresso e favoritos sao persistidos por usuario.
3. RLS impede leitura nao autorizada.

### UX

1. Nenhuma rota de player termina em tela branca.
2. Nenhum item publicado abre sem feedback de loading ou erro.
3. A navegacao de volta preserva contexto do hub de origem.

---

## 9. Fora do escopo desta fase

1. Upload binario direto no app.
2. Recomendacao inteligente por machine learning.
3. Academia completa para `Formacoes`.
4. Biblioteca completa de `Materiais` com exploracao profunda.
5. Compartilhamento publico de links.
6. DRM forte de video nesta primeira entrega.

---

## 10. Proximos documentos que devem nascer deste plano

Depois da aprovacao deste plano, os proximos artefatos obrigatorios sao:

1. PRD tecnico do modulo `media`.
2. Spec de schema Supabase para `media_items`.
3. Wireframe de admin de midia.
4. QA plan especifico para Mini YouTube e Mini Spotify.

Este documento passa a ser a referencia executiva para a evolucao de `Videos` e `Musicas` como bibliotecas privadas de primeira classe.