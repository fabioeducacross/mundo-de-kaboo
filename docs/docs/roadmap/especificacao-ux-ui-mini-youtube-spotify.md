# Especificação UX/UI — Mini YouTube Privado e Mini Spotify Privado

> Data: 25/04/2026  
> Contexto-base: Mundo de Kaboo / Educacross  
> Escopo: hubs de Vídeos e Músicas, seus players e os componentes mínimos para MVP  
> Premissa de implementação: reaproveitar a infraestrutura já existente de `LibraryHubScreen`, `VideoPlayerScreen`, `AudioPlayerScreen`, navegação por `App.tsx` e linguagem visual Kaboo.

---

## 1. Princípios de UX

### 1.1 Curadoria antes de volume

Os hubs não devem parecer catálogo infinito. O valor da experiência Kaboo está em parecer selecionado por alguém do time, com pouca densidade e alta legibilidade.

Diretrizes executáveis:

1. Sempre abrir com um destaque editorial real acima da dobra.
2. Limitar trilhos a poucos agrupamentos com intenção clara.
3. Evitar filtros pesados, ordenações excessivas e taxonomia profunda.
4. Priorizar conteúdo disponível de fato, sem placeholders que simulem abundância.

### 1.2 Descoberta rápida com contexto pedagógico leve

Vídeos e músicas passam a ser bibliotecas próprias, mas ainda pertencem ao ecossistema pedagógico Kaboo/Educacross.

Diretrizes executáveis:

1. Cada item deve expor título, contexto de uso e metadado curto visível sem clique.
2. O vínculo com coleção deve aparecer como contexto opcional, nunca como dependência estrutural.
3. O usuário precisa entender em até 3 segundos o que vai consumir e para que serve.

### 1.3 Continuidade sem fricção

Os hubs devem favorecer retomada, não navegação exploratória pesada.

Diretrizes executáveis:

1. Vídeos devem expor “Continuar assistindo” quando houver progresso.
2. Músicas devem expor “Continuar ouvindo”, “Tocadas recentemente” e “Favoritas”.
3. A ida para o player não pode romper a sensação de fluxo; o retorno deve preservar contexto do hub.

### 1.4 Linguagem Kaboo, não clone literal

O produto pode se inspirar em YouTube e Spotify, mas a expressão visual precisa continuar Kaboo/Educacross: acolhedora, editorial, infantil-pedagógica e confiável.

Diretrizes executáveis:

1. Manter gradientes, badges, chips e superfícies arredondadas já usados nos hubs e coleções.
2. Evitar chrome excessivamente técnico ou “streaming genérico”.
3. Dar protagonismo a capas, personagens, temas e intenções pedagógicas.

### 1.5 Clareza de estado sempre

As bibliotecas privadas não podem falhar em silêncio.

Diretrizes executáveis:

1. Todo estado vazio deve explicar por que não há conteúdo.
2. Todo estado de erro deve oferecer retry e retorno seguro.
3. Todo bloqueio deve explicar regra de acesso, sem culpar o usuário.

---

## 2. Estrutura de telas dos hubs

### 2.1 Arquitetura comum dos hubs

Os dois hubs devem reaproveitar a casca já existente de biblioteca, mas com hierarquia diferente por mídia.

Estrutura base recomendada:

1. `PageHeader` com título do hub, badge de curadoria e CTA secundário de filtros leves.
2. Hero editorial acima da dobra com item destaque e CTA principal.
3. Cards-resumo de estado da biblioteca logo abaixo do hero.
4. Busca leve inline, sem abrir experiência de busca pesada da área de Livros.
5. Trilhos ou listas principais.
6. Blocos de retomada personalizados por mídia.
7. Rodapé de contexto opcional com coleção relacionada ou nota pedagógica.

### 2.2 Hub de Vídeos: Mini YouTube privado

Objetivo da tela: descoberta audiovisual com sensação de vitrine privada e continuidade.

Estrutura recomendada:

1. Hero principal com thumbnail grande, título, descrição curta, duração e contexto pedagógico.
2. Faixa “Continuar assistindo” no topo do conteúdo scrolável quando houver progresso.
3. Trilho “Destaques de hoje” com 4 a 6 cards grandes.
4. Trilho “Por intenção de uso” com grupos como `Desenho`, `Com Libras`, `Como jogar`, `Videoaula`.
5. Trilho “Ligados a coleções” quando houver vínculo editorial real.
6. Busca leve por texto e filtros rápidos em chips.
7. Ordenação enxuta: `Recentes` e `Título` apenas.

Regras de layout:

1. O hero deve manter proporção widescreen, com thumbnail dominante.
2. Os cards de vídeo devem privilegiar imagem e duração, não descrição longa.
3. O bloco de retomada deve aparecer antes dos trilhos de descoberta.

### 2.3 Hub de Músicas: Mini Spotify privado

Objetivo da tela: iniciar reprodução rápido, com senso de clima, sequência e continuidade.

Estrutura recomendada:

1. Hero principal com faixa ou seleção destaque e CTA de play imediato.
2. Barra “Tocando agora” ou “Continuar ouvindo” acima da primeira lista, quando houver estado ativo.
3. Lista principal de faixas com leitura instantânea.
4. Bloco “Sequências curtas” para playlists ou agrupamentos leves.
5. Bloco “Ligadas a obras” quando a relação com coleção enriquecer a descoberta.
6. Bloco “Favoritas” e “Últimas tocadas”.
7. Filtros rápidos por clima ou uso, não por taxonomia técnica.

Regras de layout:

1. A unidade dominante deve ser linha de faixa, não card reaproveitado de vídeo.
2. A informação crítica precisa caber em uma linha principal e uma secundária.
3. O CTA de play deve estar sempre visível sem hover.

### 2.4 Navegação e retorno

Regras transversais:

1. Entrar em vídeo ou música a partir do hub deve preservar o contexto para retorno ao mesmo ponto.
2. Quando o item tiver coleção relacionada, o CTA de coleção deve abrir a coleção como contexto opcional, sem sequestrar a navegação principal do hub.
3. A navegação entre hubs precisa continuar consistente com `BottomNav` e o switch de telas atual.

---

## 3. Estrutura dos players

### 3.1 Player de Vídeo

O player atual já cobre reprodução, seek, volume, fullscreen e velocidade. A evolução de UX deve focar em enquadramento, continuidade e contexto.

Estrutura recomendada:

1. Header flutuante com voltar, título e velocidade.
2. Palco de vídeo central com loading e fallback robustos.
3. Faixa inferior com progresso, tempo, volume e fullscreen.
4. Painel contextual abaixo ou lateral em desktop com descrição curta, coleção relacionada, chips pedagógicos e próximos recomendados.
5. Estado de “próximo vídeo” ao final da reprodução.

Regras executáveis:

1. O player deve continuar em tela imersiva, mas não pode esconder totalmente o contexto do item.
2. O título do ativo deve ter prioridade sobre o nome genérico da coleção quando houver `assetTitle`.
3. Recomendações devem vir do mesmo hub e, em segundo nível, da mesma coleção relacionada.
4. O botão de voltar deve restaurar o hub de origem, não cair na home seca.

### 3.2 Player de Música

O player atual já tem identidade forte com disco girando. Isso deve ser preservado e refinado como assinatura Kaboo, em vez de trocado por uma UI genérica de streaming.

Estrutura recomendada:

1. Header com voltar, título e velocidade.
2. Capa/disco central como elemento emocional principal.
3. Bloco de título, subtítulo e contexto de coleção/uso.
4. Barra de progresso com tempo atual e duração.
5. Controles principais: voltar 15s, play/pause, avançar 15s.
6. Controles secundários: velocidade, favorito, próxima faixa, fila.
7. Mini fila ou bloco “próximas faixas” abaixo da dobra.

Regras executáveis:

1. O player precisa privilegiar play imediato e retomada, não configuração avançada.
2. O estado “tocando agora” deve ser compartilhável com o hub quando tecnicamente seguro.
3. Favoritar não pode competir visualmente com o play principal.
4. A próxima faixa deve ser opcional, mas a estrutura da UI já deve nascer pronta para isso.

### 3.3 Comportamentos comuns dos players

1. Persistir progresso por usuário.
2. Exibir feedback claro quando o streaming falhar.
3. Não retornar `null` em estados intermediários de carregamento.
4. Suportar deep link futuro sem depender apenas de estado em memória.

---

## 4. Componentes novos recomendados

### 4.1 Para o hub de Vídeos

1. `VideoFeaturedHero`
Finalidade: hero editorial com thumbnail, duração, descrição e CTA principal.

2. `VideoShelf`
Finalidade: trilho horizontal de vídeos com título, descrição curta e cards consistentes.

3. `VideoCard`
Finalidade: card especializado para vídeo, com thumbnail widescreen, duração, tipo e contexto.

4. `ContinueWatchingRail`
Finalidade: trilho de retomada baseado em progresso.

5. `MediaMetaRow`
Finalidade: linha compacta para duração, coleção relacionada, acessibilidade, faixa etária ou intenção pedagógica.

### 4.2 Para o hub de Músicas

1. `TrackRow`
Finalidade: linha de faixa com play, título, subtítulo, duração e favorito.

2. `NowPlayingBar`
Finalidade: barra persistente com faixa atual, progresso resumido e CTA de expandir player.

3. `RecentTracksRail`
Finalidade: superfície horizontal ou vertical curta para retomada.

4. `PlaylistStrip`
Finalidade: agrupamento leve de faixas por clima, uso ou sequência.

5. `AudioQueueCard`
Finalidade: bloco compacto para próxima faixa e fila.

### 4.3 Componentes compartilhados

1. `MediaHubSearchBar`
Busca leve e inline para hubs gerais, distinta da busca rica de Livros.

2. `MediaEmptyState`
Componente padrão para vazio, erro e biblioteca sem resultados.

3. `MediaAccessGate`
Superfície reutilizável para bloqueios de permissão, assinatura ou conteúdo indisponível.

4. `MediaContextBadge`
Badge para exibir `Ligado à coleção`, `Com Libras`, `Sequência curta`, `Uso em roda`, `Favorita`.

5. `MediaProgressPill`
Indicador curto de progresso para cards, trilhos e listas.

Observação de implementação:

1. O shell visual deve continuar dentro de `LibraryHubScreen`, mas os blocos acima devem sair para componentes próprios para reduzir condicionais por tipo de hub.

---

## 5. Estados vazios, erro e bloqueio

### 5.1 Estado vazio do hub

Vídeos:

1. Mensagem: “Ainda não há vídeos liberados para esta biblioteca.”
2. Submensagem: “Quando novos conteúdos forem publicados, eles aparecerão aqui com destaque e retomada.”
3. CTA: `Voltar para Livros`.

Músicas:

1. Mensagem: “Ainda não há músicas liberadas para esta biblioteca.”
2. Submensagem: “Assim que novas faixas forem publicadas, você verá aqui escutas, sequências e retomadas.”
3. CTA: `Explorar Livros`.

### 5.2 Estado sem resultados de busca/filtro

1. Mensagem curta: “Nenhum resultado com os filtros atuais.”
2. Ação principal: `Limpar filtros`.
3. Ação secundária: `Voltar ao destaque`.
4. Deve manter o contexto do hub visível ao fundo, sem parecer tela morta.

### 5.3 Estado de erro de carregamento

1. Mensagem: “Não foi possível carregar esta biblioteca agora.”
2. Motivo opcional amigável: “Sua conexão oscilou ou o conteúdo ficou temporariamente indisponível.”
3. Ações: `Tentar novamente` e `Voltar`.
4. Skeleton deve aparecer antes do erro sempre que houver tentativa real de fetch.

### 5.4 Estado de erro de reprodução

Vídeo:

1. Mostrar banner ou toast persistente dentro do player.
2. Ações: `Tentar reproduzir novamente` e `Voltar ao hub`.

Música:

1. Mostrar erro acima dos controles principais.
2. Ações: `Tentar novamente` e `Pular para próxima`, quando houver fila.

### 5.5 Estado de bloqueio de acesso

Quando o item existir, mas o usuário não tiver permissão:

1. Mensagem: “Este conteúdo faz parte de um acervo privado.”
2. Submensagem: “Seu acesso atual não inclui este item ou sua liberação ainda não foi concluída.”
3. Ações possíveis: `Ver meu acesso`, `Usar voucher`, `Voltar ao hub`.
4. Nunca esconder o item silenciosamente se ele já apareceu em contexto editorial; preferir card bloqueado com explicação.

### 5.6 Estado de link quebrado ou provider indisponível

1. Mostrar status “Temporariamente indisponível”.
2. Remover CTA de play imediato quando o health-check souber que o link caiu.
3. Oferecer fallback de conteúdo relacionado do mesmo hub.

---

## 6. Prioridades de implementação

### Prioridade 1 — Estrutura do produto visível

1. Consolidar anatomia dos hubs em `LibraryHubScreen` com cascas distintas para `videos` e `music`.
2. Extrair componentes dedicados de hero, lista/trilho e empty state.
3. Garantir retorno estável hub → player → hub.

Critério de pronto:

1. Usuário autenticado entra nos hubs e entende a proposta em uma primeira dobra.

### Prioridade 2 — Player com continuidade

1. Ajustar `VideoPlayerScreen` para incluir contexto e recomendados.
2. Ajustar `AudioPlayerScreen` para suportar favorita, próxima faixa e fila leve.
3. Persistir progresso mínimo por usuário.

Critério de pronto:

1. Vídeo e música deixam de ser players isolados e passam a parecer produto.

### Prioridade 3 — Estado e curadoria

1. Implementar `ContinueWatchingRail`, `RecentTracksRail` e `NowPlayingBar`.
2. Expor favoritos e últimas tocadas.
3. Refinar cópia de vazio, erro e bloqueio.

Critério de pronto:

1. A biblioteca deixa de ser apenas vitrine estática e ganha sensação de uso contínuo.

### Prioridade 4 — Integração com backend editorial

1. Conectar hubs ao backbone de `media_items` em vez de depender só dos mocks.
2. Ligar progresso, favoritos e health-check.
3. Substituir gradualmente mocks por catálogo real curado.

Critério de pronto:

1. O conteúdo real controla destaque, listas e ordem editorial sem retrabalho de frontend.

### Prioridade 5 — Polimento de identidade

1. Afinar ícones, badges, estados hover/focus e microcopy.
2. Garantir responsividade em mobile, tablet e desktop.
3. Validar acessibilidade de teclado, contraste, foco e leitura de rótulos.

Critério de pronto:

1. A experiência parece Kaboo/Educacross, não tema genérico de streaming.

---

## 7. Diferenças entre vídeo e música

### 7.1 Diferença de descoberta

Vídeo:

1. Descoberta mais visual e baseada em thumbnail.
2. Hero maior e trilhos mais cinematográficos.
3. Duração e tipo do vídeo são sinais primários.

Música:

1. Descoberta mais textual e sequencial.
2. Hero pode ser mais compacto e afetivo.
3. Play imediato e leitura rápida da faixa têm prioridade.

### 7.2 Diferença de unidade de interface

Vídeo:

1. Unidade principal é card com capa ampla.

Música:

1. Unidade principal é linha de faixa ou mini card de playlist.

### 7.3 Diferença de continuidade

Vídeo:

1. Continuidade gira em torno de “de onde parou”.
2. O final da reprodução deve sugerir o próximo item.

Música:

1. Continuidade gira em torno de fila, sequência e ambiente sonoro.
2. O player persistente tem mais valor do que uma tela de detalhe pesada.

### 7.4 Diferença de contexto pedagógico

Vídeo:

1. Contexto deve explicar formato e finalidade: animação, Libras, mediação, como jogar.

Música:

1. Contexto deve explicar clima e uso: acolhimento, roda, respiração, escuta, transição.

### 7.5 Diferença de prioridade visual

Vídeo:

1. A imagem manda.

Música:

1. O ritmo de interação manda.

---

## Fechamento executivo

Esta especificação assume que o projeto já possui uma base válida para hubs gerais e players, mas ainda com linguagem de protótipo. O caminho recomendado não é criar telas paralelas; é especializar a superfície já existente para que `Vídeos` e `Músicas` virem bibliotecas privadas de primeira classe, com identidade Kaboo, continuidade real e carga cognitiva baixa.

## Arquivos-base para implementação

1. `screens/LibraryHubScreen.tsx`
2. `data/library-hubs/videos.mock.ts`
3. `data/library-hubs/music.mock.ts`
4. `screens/VideoPlayerScreen.tsx`
5. `screens/AudioPlayerScreen.tsx`
6. `App.tsx`
7. `types.ts`
