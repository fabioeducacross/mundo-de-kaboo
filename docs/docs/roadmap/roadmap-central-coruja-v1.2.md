# Roadmap Central Coruja — Pós-Reunião 15/04/2026

> Gerado em: 18/04/2026  
> Fonte: reunião de produto 15/04/2026 + estado do código em `feature/invite-flow`  
> Responsável pelo roadmap: PM (Bob)  
> Aprovação pendente: Mario (produto), Reginaldo (direção)

---

## Visão de produto

A Central Coruja é um **"Netflix de conteúdo extra, só consumível"**: complemento digital a kits e livros físicos, acesso via voucher, cadastro adulto (familiar ou educador), sem jogos, sem turmas, sem alunos. O app deve entregar valor percebido imediato no primeiro acesso e escalar em funcionalidades de descoberta e conteúdo antes de tocar em gamificação, perfil infantil ou academia.

---

## Estado atual do código (baseline)

| Área | Status |
|------|--------|
| Auth (email+senha, mock local) | ✅ Completo |
| Voucher temporal (resgate, renovação, expiração) | ✅ Completo |
| Voucher CMS admin (modelos, lotes, códigos, auditoria) | ✅ Completo |
| Content grants (liberação por conteúdo) | ✅ Completo |
| Catálogo mock (16 coleções reais) | ✅ Completo |
| Leitor de PDF (flipbook) | ✅ Completo |
| Design system (17 componentes + Storybook) | ✅ Completo |
| Convite de colaboradores (invite flow) | ✅ Em finalização (`feature/invite-flow`) |
| Busca/filtros unificados na home | ✅ Implementado na `HomeScreen` |
| Deploy GitHub Pages (modo demo) | ✅ Configurado |
| Backend Supabase remoto | ⚠️ Preparado, não validado em produção |

### Atualização local — 19/04/2026

- `data/casel-lookup.json` e tooltip CASEL rico entregues no detalhe da coleção.
- Distinção kit vs livro entregue localmente com badge visual, `collection_type` no seed/mock e `kit_cover_image` opcional.
- Materiais da Central estruturados em modo mock/local, sem exposição fixa na home atual.
- Catálogo mock enriquecido com `collection_assets` para Libras, animação, como jogar e videoaula, usando a superfície tipada já existente.
- Especificação de UX para seleção mobile da BNCC documentada em `docs/spec-bncc-mobile-filter.md`, consolidando a direção de full-screen sheet com seleção direta na lista no lugar da grade extensa de chips.

### Atualização local — 20/04/2026

- A UX final da busca inline na Home foi fechada em `HomeScreen`: clicar na barra não abre mais uma tela intermediária errada.
- Busca textual agora funciona como overlay sobre a grade existente, com fechamento e entrada em linha no próprio campo, sem CTA redundante no header desktop.
- Quando há apenas filtros ativos, sem texto de busca, o estado final passou a mostrar diretamente a grade filtrada com a chip ativa, sem card flutuante de resultados sobreposto.
- Build e QA manual/browser foram refeitos após esse ajuste final, mantendo `v1.2 local demonstrável` em 100%.

### Atualização local — 23/04/2026

- O voucher previsível `KABOO-TEST-0001` foi versionado em mock, seed, documentação operacional e migration idempotente para homologação remota.
- A regra operacional de 1 livro por kit foi consolidada em `catalog.seed.json`, na normalização local, na hidratação remota, no CMS/admin com seleção única e em uma migration corretiva para dados já existentes.
- O modal público dos kits passou a tratar 0 ou 1 vínculo como experiência direta do próprio kit, mantendo `Leitura` e `Materiais da Coleção`; `Livros do Kit` e `Voltar ao kit` ficam reservados ao cenário multi-livro.
- A regra de apresentação dos kits foi centralizada em `lib/collectionPresentation.ts`, coberta por testes unitários e revalidada com build de produção e smoke visual no navegador.

### Direcionamento CEO — 24/04/2026

- O menu alvo passa a ser: `Livros` (com `Coleções` e `Suporte`), `Vídeos`, `Músicas`, `Formações` e `Materiais`.
- `Vídeos` deixa de ser apenas mídia derivada de livros e kits e passa a representar uma biblioteca geral curada, no formato de um mini YouTube privado.
- `Músicas` passa a existir como biblioteca geral própria, com descoberta simples, no formato de um mini Spotify enxuto.
- `Materiais` passa a ser uma área geral de consulta direta, com poucos filtros e sem exigir vínculo com coleção para existir.
- O relacionamento com livro ou kit vira opcional: quando houver vínculo real, ele aparece como contexto; quando não houver, o conteúdo continua acessível como biblioteca geral.
- `Formações` entra no menu como superfície própria desde já, mas a evolução para trilhas guiadas e academia leve continua faseada.

---

## Fase 1 — Sprint Atual (v1.2-alpha) — "Polimento de vitrine"

**Objetivo**: entregar as melhorias de UX que o usuário final percebe imediatamente, usando apenas frontend e dados estáticos. Zero dependência de backend.

**Duração estimada**: 2 semanas (19/04 → 02/05)  
**Responsável principal**: Fabio

| # | Item | Tam. | Dependência | Critério de done |
|---|------|------|-------------|------------------|
| 1 | **Renomear labels das abas de recurso** (Ler→Leitura, Ouvir→Contação da História, Assistir→Desenho Animado) | P | Nenhuma | Labels atualizados em `constants.ts` e refletidos no detalhe da coleção. Validação visual em mock. |
| 2 | **JSON estático BNCC** (códigos → descrições completas) | P | Nenhuma | Arquivo `data/bncc-lookup.json` com pelo menos os códigos usados no catálogo atual. Fonte: documento oficial da BNCC. |
| 3 | **Tooltip BNCC no detalhe** (hover mostra descrição rica) | M | Item 2 | Ao hover/tap no código BNCC, tooltip exibe campo de conhecimento, componente e descrição. Mobile: tap abre popover. Acessível (aria-describedby). |
| 4 | **JSON estático CASEL** (competências → descrições) | P | Nenhuma | Arquivo `data/casel-lookup.json` com as 5 competências CASEL + sub-skills. |
| 5 | **Tooltip descritivo para outros mapeamentos** (CASEL, ODS, etc.) | M | Item 4 | Mesma UX do tooltip BNCC para todos os chips de mapeamento no detalhe. |
| 6 | **Distinção kit vs livro na vitrine** | M | Dados mock (item 13) | Campo `collection_type: 'kit' \| 'book'` no seed. Card da home exibe badge visual diferenciador. Modal de coleção só expõe drill-down de composição quando houver mais de um livro vinculado; em kits 0 ou 1 vínculo, leitura e materiais permanecem no próprio kit. |
| 7 | **Merge branch invite-flow → v1.2** | P | Finalização do invite flow | Branch `feature/invite-flow` merged em `v1.2`. Sem conflitos. Build passa. |

**Ordem de execução recomendada**: 7 → 2 → 4 → 1 → 3 → 5 → 6

**Dados estáticos necessários (pré-requisito dos itens 2, 4, 6)**:

| # | Dado | Tam. | Responsável |
|---|------|------|-------------|
| 11 | `data/bncc-lookup.json` | P | Fabio (extrair do documento BNCC oficial) |
| 12 | `data/casel-lookup.json` | P | Fabio (fonte: casel.org) |
| 13 | Campo `collection_type` no `catalog.seed.json` | P | Fabio (Mario valida classificação) |

---

## Fase 2 — Próxima Sprint (v1.2-beta) — "Bibliotecas e Navegação"

**Objetivo**: introduzir a nova navegação principal e as bibliotecas gerais de `Vídeos`, `Músicas`, `Formações` e `Materiais`, mantendo `Livros` como a área de descoberta editorial mais rica.

**Duração estimada**: 2 semanas (03/05 → 16/05)  
**Responsável principal**: Fabio

| # | Item | Tam. | Dependência | Critério de done |
|---|------|------|-------------|------------------|
| NAV | **Navegação lateral por bibliotecas** | M | Mock do menu aprovado | Menu passa a expor `Livros` com `Coleções` e `Suporte`, além de `Vídeos`, `Músicas`, `Formações` e `Materiais`, com navegação consistente em desktop e mobile. |
| BF | **Busca rica restrita à área de Livros** | M | Plano de busca/filtros já aprovado | A busca avançada, chips e filtros detalhados continuam centrados em `Livros`; as áreas gerais usam descoberta mais enxuta. |
| 4h | **Filtro rápido por ano escolar na home** | M | Plano de busca/filtros (session plan) | Chip de ano escolar funcional dentro da área de `Livros`. Filtra catálogo por metadado de faixa etária/série e persiste ao voltar de coleção. |
| VID | **Biblioteca geral de Vídeos** | G | Curadoria inicial definida | Nova área de `Vídeos` no formato de mini YouTube privado, com cards, destaques e busca leve. |
| MUS | **Biblioteca geral de Músicas** | G | Curadoria inicial definida | Nova área de `Músicas` no formato de mini Spotify simples, com descoberta leve e organização básica. |
| MAT | **Biblioteca geral de Materiais** | M | Curadoria mínima definida | Área de `Materiais` com navegação direta, poucos filtros e sem exigir vínculo com coleção para existir. |
| FOR | **Entrada simples de Formações** | M | Diretriz de produto aprovada | `Formações` entra como superfície própria no menu, com página inicial simples e sem ainda entregar trilhas completas. |
| 8 | **Grid adaptativo para 4-6 botões no detalhe** | M | Nenhuma | Grid responsivo no detalhe da coleção comporta até 6 botões de recurso sem quebra de layout. Testado em 320px, 375px, 768px e 1024px. |
| 6v | **Conteúdo de vídeo contextual ao livro/kit** | M | Nenhuma (frontend puro, campo mock) | Botões como `Assistir Acessível` continuam aparecendo no detalhe apenas quando houver relação real com o livro ou kit. |
| 7v | **Conteúdo animado contextual ao livro/kit** | M | Nenhuma (frontend puro, campo mock) | Conteúdo animado contextual continua disponível no detalhe quando houver vínculo real com o conteúdo editorial. |

**Ordem de execução recomendada**: NAV → BF → 4h → MAT → VID → MUS → FOR → 8 → 6v → 7v

---

## Fase 3 — Backlog Curto Prazo (v1.2-rc → v1.3) — "Modelagem e Catálogo"

**Objetivo**: validar o backend real e modelar as novas bibliotecas gerais, deixando explícito que o vínculo com livro ou kit é opcional e só aparece quando fizer sentido editorial.

**Duração estimada**: 3-4 semanas (17/05 → 13/06)  
**Responsáveis**: Fabio (frontend-backend integration), Maxwell (infra), Mario (validação)

| # | Item | Tam. | Responsável | Dependência |
|---|------|------|-------------|-------------|
| 14 | **Tabela BNCC no Supabase** (migrar JSON para banco) | M | Fabio | Supabase remoto validado |
| 15 | **Campos de vídeo contextual ao livro/kit** (`accessible_video_url`, `animated_video_url`) | P | Fabio | Migration Supabase |
| 16 | **Biblioteca geral de Vídeos no backend/CMS** | G | Fabio | Modelagem aprovada para catálogo geral |
| 17 | **Biblioteca geral de Músicas no backend/CMS** | G | Fabio | Modelagem aprovada para catálogo geral |
| 18 | **Biblioteca geral de Materiais no backend/CMS** | M | Fabio | Decisão de curadoria e metadados mínimos |
| REL | **Relacionamento opcional com livro ou kit** | M | Fabio | Definir esquema que permita vínculo opcional sem obrigar mapeamento rígido |
| FOR | **Catálogo simples de Formações** | M | Fabio + Mario | Curadoria inicial aprovada |
| 10 | **Campo CPF opcional no cadastro** | M | Fabio | Validação jurídica (ECA digital) |
| 19 | **Assinatura digital pós-voucher** | G | Fabio + Mario | Definição de fluxo de UX |
| 22 | **Servidor/banco separado para Central Coruja** | G | Maxwell | Conta Empatia definida |
| 20 | **Conta Empatia nas lojas Google/Apple** | M | Maxwell + Douglas + Rafael | Decisão de conta confirmada |
| 21 | **Build nativo (Capacitor/Expo)** | G | Douglas + Rafael | Conta nas lojas + build estável |

---

## Fase 4 — Backlog Longo Prazo (v2.0+) — "Expansão"

**Objetivo**: evoluir as novas bibliotecas gerais para experiências guiadas, curadoria mais rica e progressão leve.

| # | Item | Tam. | Responsável | Pré-condição |
|---|------|------|-------------|--------------|
| 23 | **Formações leves → trilhas guiadas / academia enxuta** | XG | Fabio + Mario | v1.3 estável, conteúdo de formação produzido e catálogo simples já disponível |
| 24 | **Gamificação adulto** (metas, progresso, conquistas) | G | Fabio | v1.3 estável, design de mecânicas aprovado |
| 25 | **Perfil infantil** (cadastro criança, interface infantil) | G | Fabio | Validação jurídica ECA, design infantil |
| 26 | **Login com Educa Cross (OAuth)** | M | Fabio + Maxwell | API de OAuth do Educa Cross disponível |

---

## Métricas de entrega

### O que define "v1.2 entregue"

- [x] Convite de colaboradores funcionando (invite flow merged)
- [x] Labels de abas renomeados
- [x] Tooltips BNCC e CASEL funcionando com dados estáticos
- [x] Distinção kit vs livro visível na vitrine
- [x] Voucher previsível de QA versionado para mock, seed e homologação remota
- [x] Regra 1 livro por kit validada no seed, no CMS/admin, na hidratação remota e no modal público
- [x] Busca + filtros unificados na home
- [x] Botões de vídeo acessível e animado presentes no detalhe
- [x] Grid adaptativo para 4-6 recursos
- [x] Build de produção atual passa, com QA manual validado em modo mock local
- [x] Catálogo mock atualizado com todos os novos campos

**Definição**: v1.2 é a versão "vitrine completa" que pode ser demonstrada para stakeholders e testada por usuários beta via voucher, sem depender de backend real.

---

## Riscos e mitigações

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|---------------|---------|-----------|
| R1 | **Dados BNCC incompletos ou imprecisos** — o JSON precisa cobrir os códigos usados no catálogo | Média | Alto | Fabio extrai do documento oficial; Mario valida uma amostra. Se faltar código, tooltip mostra "Descrição não disponível" como fallback. |
| R2 | **Conta Empatia nas lojas demora** — depende de Douglas/Rafael/Maxwell e aprovação das lojas | Alta | Alto | Iniciar processo de registro na semana de 21/04. Não bloqueia v1.2 (que roda em demo/web). |
| R3 | **Fabio é gargalo único no frontend** — todo item de código depende dele | Alta | Crítico | Priorização rígida: sprint atual contém apenas itens P e M. Itens G ficam na sprint seguinte. Nenhum item G em paralelo. |
| R4 | **Backend Supabase com migrations divergentes** — histórico remoto pode conflitar com local | Média | Médio | Antes de rodar migrations remotas, fazer `supabase db diff` e alinhar. Manter fallback mock funcional. |
| R5 | **Escopo creep de produto** — reunião mencionou academia, gamificação, perfil infantil | Média | Médio | Todos classificados como v2.0. Qualquer promoção de item precisa de aprovação explícita do Mario com re-estimativa. |
| R6 | **Classificação kit vs livro ambígua** — nem toda coleção tem classificação clara | Baixa | Baixo | Mario classifica manualmente as 16 coleções atuais. Campo aceita null como "não classificado". |
| R7 | **Busca/filtros unificados estouram a sprint** — item G com várias superfícies | Média | Médio | Dividir em 2 PRs: (1) migração de lógica, (2) redesign da barra + chips. Se estourar, finalizar na sprint seguinte sem bloquear release dos tooltips. |

---

*Documento vivo. Atualizar a cada sprint review com itens concluídos, re-estimativas e mudanças de prioridade.*
