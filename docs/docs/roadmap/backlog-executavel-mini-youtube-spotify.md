# Backlog Executável — Mini YouTube e Mini Spotify Privados

> Data: 25/04/2026  
> Escopo desta fase: Vídeos e Músicas  
> Tipo: backlog pronto para sprint

---

## 1. Épicos

### E1. Backbone de mídia privada

Criar a espinha dorsal de vídeos e músicas fora do modelo legado de recursos por coleção.

### E2. Operação editorial de mídia

Dar ao admin um fluxo real de cadastro, publicação e arquivamento de mídia.

### E3. Mini YouTube privado

Entregar descoberta, destaque e player de vídeo com continuidade.

### E4. Mini Spotify privado

Entregar descoberta rápida, fila leve e player de áudio persistente.

### E5. Preparação estrutural para Formações e Materiais

Deixar o domínio pronto para expansão sem abrir experiência completa nesta fase.

---

## 2. Histórias P0

### P0.1 — Backbone de mídia

**Como** plataforma, **quero** criar o backbone de mídia para vídeos e músicas, **para** que o produto deixe de depender de recursos de coleção como núcleo.

**Critérios de aceite:**

1. Migration cria `media_items`, `media_collection_links`, `media_shelves`, `media_shelf_items`, `user_media_progress`, `user_media_favorites` e `media_link_health`.
2. Viewer só lê itens `published` autorizados.
3. Admin e editor gerenciam `draft`, `published` e `archived`.
4. Seed sobe pelo menos 6 vídeos e 6 músicas.
5. Tipagem do frontend reconhece `hub`, `provider`, `status` e `kind`.

**Dependências:** nenhuma.

### P0.2 — Adapter de leitura de mídia

**Como** frontend, **quero** ler vídeos e músicas por adapter próprio, **para** que hubs e players apontem para a fonte correta.

**Critérios de aceite:**

1. Camada de acesso busca `media_items` por hub.
2. Fallback legado continua intacto para livros e demais fluxos atuais.
3. Vídeos e músicas não dependem de `collection_resources` para listar catálogo.
4. Mock local continua funcionando quando o backend real não estiver ativo.
5. Erro de leitura mostra estado vazio claro, sem tela quebrada.

**Dependências:** P0.1.

### P0.3 — Admin de mídia

**Como** editor, **quero** cadastrar mídia com metadados e link de streaming, **para** operar o catálogo sem upload interno.

**Critérios de aceite:**

1. O admin lista, cria, edita, publica, arquiva e despublica itens.
2. O formulário valida provider interno ou YouTube.
3. O vínculo com coleção é opcional.
4. Existe ordenação de destaque por hub.
5. Item `draft` nunca aparece para `viewer`.
6. Publicação inválida por link vazio ou provider inconsistente é bloqueada com mensagem clara.

**Dependências:** P0.1.

### P0.4 — Hub de Vídeos

**Como** usuário autenticado, **quero** entrar no hub de Vídeos e descobrir conteúdo em formato de mini YouTube privado, **para** assistir com curadoria.

**Critérios de aceite:**

1. Existe destaque editorial acima da dobra.
2. Existem trilhos curtos por intenção de uso.
3. Cards mostram thumbnail, título, duração e contexto.
4. Clique abre item publicado corretamente.
5. Hub funciona em desktop e mobile.
6. Navegação por menu e hash chega na tela correta.

**Dependências:** P0.2.  
**Dependência recomendada para operação completa:** P0.3.

### P0.5 — Player de Vídeo com continuidade

**Como** usuário, **quero** assistir vídeos em player privado com continuidade, **para** retomar de onde parei.

**Critérios de aceite:**

1. Tela de player mostra vídeo, título, descrição curta, contexto pedagógico e recomendados.
2. Progresso salva posição atual e retoma no próximo acesso.
3. Item sem permissão ou fora do ar mostra bloqueio e erro claros.
4. Voltar do player reconstrói o fluxo sem perder contexto.
5. Evento de abertura e progresso é registrado.

**Dependências:** P0.2 e P0.4.

### P0.6 — Hub de Músicas

**Como** usuário autenticado, **quero** entrar no hub de Músicas e descobrir faixas em formato de mini Spotify privado, **para** ouvir rapidamente.

**Critérios de aceite:**

1. A tela traz destaque e listas curtas por clima ou uso.
2. Cada linha de faixa mostra título, duração e CTA claro.
3. Existe seção de `Continue ouvindo` quando houver progresso.
4. Abertura de faixa funciona sem depender de coleção.
5. A experiência permanece simples, com poucos filtros.

**Dependências:** P0.2.  
**Dependência recomendada para operação completa:** P0.3.

### P0.7 — Player de Áudio com fila leve

**Como** usuário, **quero** ouvir áudio com player persistente e fila leve, **para** navegar sem perder a reprodução.

**Critérios de aceite:**

1. O player mostra play, pause, seek, tempo atual, duração e próxima faixa.
2. Fila simples funciona dentro da prateleira ou lista de origem.
3. Progresso salva última posição.
4. Erro de stream não trava a navegação.
5. Ao trocar entre telas logadas da área de músicas, a reprodução continua quando tecnicamente seguro.

**Dependências:** P0.2 e P0.6.

---

## 3. Histórias P1

### P1.1 — Favoritos e recentes

**Como** usuário, **quero** favoritos e recentes básicos entre vídeos e músicas, **para** retomar e guardar conteúdo útil.

**Critérios de aceite:**

1. Favoritar e desfavoritar funciona em vídeo e áudio.
2. Hubs exibem recentes e favoritos quando houver dados.
3. A mesma mídia não duplica no histórico.
4. Usuário só manipula seus próprios registros.

**Dependências:** P0.5 e P0.7.

### P1.2 — Saúde de links e telemetria

**Como** operação, **quero** saúde mínima de links e telemetria básica, **para** saber se o catálogo está publicável e sendo usado.

**Critérios de aceite:**

1. Existem eventos `media_list_view`, `media_item_open`, `media_play_start`, `media_play_progress`, `media_play_complete` e `media_play_fail`.
2. Health check grava status, código HTTP e data da última verificação.
3. O admin enxerga alerta simples para item `warning` ou `down`.

**Dependências:** P0.1 e P0.3.

### P1.3 — Preparação estrutural para Formações e Materiais

**Como** produto, **quero** deixar Formações e Materiais preparados no mesmo backbone, **para** não reabrir arquitetura depois.

**Critérios de aceite:**

1. `hub_slug` já aceita `formations` e `materials`.
2. O admin suporta esses tipos ao menos em nível de domínio e status.
3. Nenhum fluxo novo interfere no MVP de vídeos e músicas.
4. A documentação explicita que a UX completa dessas áreas ficou fora da fase atual.

**Dependências:** P0.1 e P0.3.

---

## 4. Dependências críticas

1. P0.1 é a fundação do produto.
2. P0.2 destrava os hubs.
3. P0.3 destrava a operação editorial real.
4. P0.5 depende do hub de vídeos navegável.
5. P0.7 depende do hub de músicas navegável.
6. P1.1 só faz sentido após ambos os players persistirem progresso.
7. P1.3 só entra depois que vídeos e músicas estiverem estáveis.

---

## 5. Sequência sugerida em 2 sprints

### Sprint 1

Foco: fundação e catálogo navegável.

1. Fechar P0.1.
2. Fechar P0.2.
3. Fechar P0.3.
4. Abrir P0.4 e P0.6 em paralelo.

**Resultado esperado:** catálogo real de vídeos e músicas publicável, navegável e visível ao usuário.

### Sprint 2

Foco: consumo completo e robustez mínima.

1. Fechar P0.5.
2. Fechar P0.7.
3. Fechar P1.1.
4. Fechar P1.2.
5. Usar sobra de capacidade para P1.3.

**Resultado esperado:** Mini YouTube e Mini Spotify privados utilizáveis de ponta a ponta, com progresso, favoritos básicos, observabilidade mínima e backbone pronto para expansão futura.

---

## 6. Definição de pronto da fase

1. Vídeos e músicas deixam de depender do modelo legado como fonte principal.
2. Hubs funcionam com leitura real de mídia publicada.
3. Players salvam progresso e preservam contexto de navegação.
4. O admin consegue operar o catálogo sem intervenção manual no banco.
5. O produto fica pronto para iniciar a próxima fase de formações e materiais sem refazer a arquitetura.