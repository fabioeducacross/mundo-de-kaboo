# Consolidado Final: Reunião 15/04/2026 + Delta Complementar 18/04/2026

> **Objetivo**: absorção exaustiva dos requisitos da reunião e dos deltas complementares posteriores, cruzamento com o código atual, e distribuição em demandas priorizadas.
>
> **Agentes consultados**: PO (Pax), UX (Uma), Analyst (Atlas), PM (Bob)
>
> **Data**: 18/04/2026 | **Confiança**: 95%

---

## 1. Cobertura — Nada escapou?

| Tópico da reunião | Coberto? | Onde |
|:---|:---:|:---|
| White label Central Coruja | ✅ | US-001, US-003 |
| Infra separada (servidor/banco) | ✅ | US-001, AR-002 |
| Conta Empatia nas lojas | ✅ | US-002 |
| Cadastro e-mail + senha | ✅ | US-005 |
| CPF (ECA digital) | ✅ | US-006 |
| Público adulto (familiar/educador) sem turma | ✅ | US-007, AS-002 |
| Coleção = kit vs livro na vitrine | ✅ | US-011, US-012 |
| Ler (flipbook) | ✅ | US-013 (já implementado) |
| Ouvir (contação de história em áudio) | ✅ | US-014 (já implementado, label parcial) |
| Assistir (vídeo cenário) | ✅ | US-015 (já implementado, label parcial) |
| Assistir Acessível (Libras) | ✅ | US-016 (ausente) |
| Assistir Animado/IA (desenho) | ✅ | US-017 (ausente) |
| Labels descritivos | ✅ | US-018, AS-006 |
| Marcação de página (bookmark) | ✅ | US-019 (futuro) |
| Materiais por componente | ✅ | US-020 (já implementado) |
| Materiais genéricos (Central/coleção) | ✅ | US-021 (ausente) |
| BNCC tooltip rico | ✅ | US-022, US-023 |
| Outros mapeamentos (CASEL, ODS) descritivos | ✅ | US-024 |
| Filtro por ano escolar | ✅ | US-025 |
| Busca unificada na home | ✅ | US-026 (já implementado) |
| Filtro por personagem com fotos | ✅ | US-027 |
| Busca dentro de coleção | ✅ | US-028 |
| Voucher 1-12 meses | ✅ | US-009 (já implementado) |
| Assinatura digital pós-voucher | ✅ | US-010 |
| App mobile publicado nas lojas | ✅ | US-004 |
| Gamificação leve adulto | ✅ | US-029 |
| Perfil infantil (adulto cadastra criança) | ✅ | US-030, US-031, US-032, US-033 |
| Interface infantil simplificada | ✅ | US-032 |
| Academia/formação professor | ✅ | US-034, US-035 |
| Login com Educa Cross (SSO futuro) | ✅ | US-008 |
| Benchmark app Edu | ✅ | Next steps (Fabio action item) |
| E-mail de ajustes (Mario → Fabio) | ✅ | Next steps (operacional) |
| Contação áudio ≠ audiodescrição por página | ✅ | AS-005 |
| Netflix de conteúdo extra (sem jogos, turmas) | ✅ | AS-001, AS-002 |
| Backoffice BNCC simples (sem CMS complexo) | ✅ | AS-004 |
| Publicação white label mesma conta (guideline) | ✅ | US-002 nota |

**Base da reunião**: 35 user stories + 6 anti-stories + 4 requisitos de arquitetura + 4 action items operacionais.

**Após o delta complementar de 18/04**: 3 novas delta stories, 11 refinamentos sobre stories existentes e 1 falso positivo puro já implementado.

---

## 1A. Delta Complementar — 18/04/2026

> **Progresso geral do delta: 100% (15/15 itens resolvidos)**

| Novo ponto | Status | ISS | Consolidação |
|:---|:---:|:---:|:---|
| Campo para inserir voucher | ✅ 100% | — | Já implementado antes do delta |
| Admin vouchers com usuário, e-mail e data de ativação | ✅ 100% | ISS-09 | `consumed_by_name` e `consumed_by_email` no detalhe do código e nas exportações |
| Exportar Excel para gráfica | ✅ 100% | ISS-08 | Botão "Exportar Excel" via SheetJS ao lado do CSV existente |
| Teto de vouchers em 12 meses | ✅ 100% | ISS-01 | `MAX_CUSTOM_DURATION_MONTHS` reduzido de 120 para 12 |
| Multissegmentos | ✅ 100% | ISS-10 | `segments[]` + `primary_segment` em types, mock, CMS multi-select e card |
| Renomear `nível` para `segmento` | ✅ 100% | ISS-03 | `formatSegmentLabel()` em constants, aplicado em toda a UI |
| Renomear `Fundamental I` para `E.F. Anos Iniciais` | ✅ 100% | ISS-04 | Mesmo helper, todas as telas atualizadas |
| Sinopse | ✅ 100% | ISS-06 | `synopsis` em types, mock, detalhe público e CMS admin |
| Ativos multimídia tipados: contação, animação, como jogar, videoaula | ✅ 100% | ISS-14 | `collection_assets` tipado com slots fixos no CMS, sincronização com campos legados e CTAs dinâmicos no detalhe |
| PDF de orientações para o professor | ✅ 100% | ISS-14 | Ativo dedicado `teacher_guide` no CMS e na biblioteca estruturada |
| Ocultar recurso sem arquivo | ✅ 100% | ISS-02 | Botões condicionais + flex wrap adaptativo no detalhe |
| Leitor com modo texto e zoom acessível | ✅ 100% | ISS-13 | Toggle modo texto no leitor, zoom existente preservado |
| Ordenar coleção por ano escolar | ✅ 100% | ISS-07 | Sort por `age_grade` com chip toggle na home |
| Cadastro BNCC estruturado pela planilha | ✅ 100% | ISS-11 | 1397 skills extraídas para JSON, tooltip rico no detalhe |
| Página Materiais Extras estruturados | ✅ 100% | ISS-15 | Biblioteca estruturada por categoria, tipo, descrição, preview e download, deduplicando assets e recursos legados |
| Página Personagens | ✅ 100% | ISS-12 | CharactersScreen com 8 personagens, rota, navegação e link no menu |

**Status líquido atualizado**: 15 itens resolvidos (✅), 0 itens parciais e 0 ausentes. O delta complementar de 18/04 está totalmente absorvido no produto e na documentação.

---

## 1B. Novo direcionamento CEO — 24/04/2026

> **Direção nova de produto: menu por bibliotecas + mapeamento opcional**

| Novo ponto | Tipo | Consolidação |
|:---|:---:|:---|
| Menu principal por bibliotecas (`Livros`, `Vídeos`, `Músicas`, `Formações`, `Materiais`) | DELTA-US-004 | Reorganiza a navegação e separa experiência editorial de bibliotecas gerais |
| Biblioteca geral de `Vídeos` | DELTA-US-005 | Passa a existir como área própria, não apenas como mídia vinculada a coleção |
| Biblioteca geral de `Músicas` | DELTA-US-006 | Passa a existir como área própria, com descoberta leve e curadoria simples |
| `Formações` como superfície própria | DELTA-US-007 | Entra no menu desde já, com evolução posterior para trilhas/aprendizagem guiada |
| `Materiais` como biblioteca geral enxuta | DELTA-US-008 | Deixa de depender apenas da coleção e prioriza navegação simples |
| Relacionamento opcional com livro ou kit | DELTA-US-009 | Mapeamento deixa de ser obrigatório e só aparece quando fizer sentido editorial |
| Descoberta simples nas áreas gerais | DELTA-AS-001 | `Vídeos`, `Músicas` e `Materiais` não herdam a complexidade de filtros da área de `Livros` |

**Impacto de posicionamento:** o produto deixa de ser apenas uma vitrine de coleções com mídias vinculadas e passa a prever quatro bibliotecas gerais além da área de `Livros`.

---

## 2. Matriz de Status (Analyst) — Atualizada 18/04/2026

| Status | Qtd | IDs |
|:---|:---:|:---|
| ✅ Implementado | 17 | Ler, Ouvir, Assistir, Materiais/componente, Voucher, Infra separada, Busca unificada, PWA, Auth, Labels descritivos, BNCC tooltip rico, Segmentos, Sinopse, Personagens, Modo texto, Ativos tipados, Biblioteca estruturada de materiais |
| 🟡 Parcial | 2 | CASEL hover, Filtro ano escolar (sort ok, filtro avançado pendente) |
| 🔴 Ausente | 11 | Libras, Animado/IA, Academia, Kit vs Livro, Assinatura digital, CPF, App nativo, Conta lojas, Gamificação, Perfil infantil, OAuth |

**Nota**: a matriz acima cobre a extração base da reunião. O delta complementar de 18/04 está consolidado na seção **1A** para evitar contagem dupla em itens como vouchers, BNCC, materiais e taxonomia do catálogo.

---

## 3. Roadmap em 4 Fases (PM)

### Fase 1: Sprint Atual (v1.2-alpha) — "Polimento de vitrine"
> **2 semanas** | Frontend puro + dados estáticos | Responsável: Fabio

| # | Item | Tam | Critério de done |
|---|------|:---:|---|
| 1 | Merge invite-flow → v1.2 | P | Branch merged, build OK |
| 2 | JSON estático BNCC (`data/bncc-lookup.json`) | P | Códigos do catálogo com descrições oficiais |
| 3 | JSON estático CASEL (`data/casel-lookup.json`) | P | 5 competências + sub-skills |
| 4 | Renomear labels das abas de recurso | P | "Contação da História", "Leitura", etc. |
| 5 | Tooltip BNCC rico no detalhe | M | Hover/tap mostra descrição completa |
| 6 | Tooltip CASEL e outros mapeamentos | M | Mesmo padrão da BNCC |
| 7 | Distinção kit vs livro na vitrine (badge + campo mock) | M | Campo `collection_type` no seed, visual diferenciado |

**Ordem**: 1 → 2 → 3 → 4 → 5 → 6 → 7

### Repriorização CEO — 24/04/2026

- **Fase 1** permanece intacta como baseline já entregue, incluindo vouchers, kits 1:1, busca e documentação da vitrine atual.
- **Fase 2** passa a priorizar a navegação por bibliotecas e as áreas gerais de `Vídeos`, `Músicas`, `Materiais` e a entrada simples de `Formações`.
- **Fase 3** passa a cobrir modelagem, CMS e backend dessas bibliotecas gerais, com relacionamento opcional a livro ou kit.
- **Fase 4** preserva a evolução de `Formações` para trilhas guiadas e academia leve, sem antecipar esse escopo para o curto prazo.

---

## 4. UX: Componentes Novos Necessários

| Componente | Uso | Prioridade |
|---|---|---|
| `RichTooltip` | BNCC/CASEL hover (desktop: popover, mobile: bottom sheet) | Sprint 1 |
| `AdaptiveResourceGrid` | 4-6 botões de recurso no detalhe | Sprint 2 |
| `AgeGradeFilterBar` | Chips de ano escolar na home | Sprint 2 |
| `CharacterFilterChip` | Filtro por personagem com fotos | Sprint 2 |
| `GenericMaterialsSection` | Materiais de nível Central/coleção | Sprint 2 |
| `ProgressDashboard` | Gamificação leve (barra, streak, conquistas) | v2.0 |
| `ChildProfileCard` | Interface infantil simplificada | v2.0 |

---

## Documentos detalhados gerados

| Documento | Agente | Conteúdo |
|---|---|---|
| [backlog-central-coruja-15abr2026.md](backlog-central-coruja-15abr2026.md) | PO (Pax) | 35 user stories + 6 anti-stories + 4 arch requirements |
| ux-report-reuniao-15abr2026.md | UX (Uma) | 6 telas impactadas, 7 componentes, 4 fluxos, 3 riscos UX |
| [roadmap-central-coruja-v1.2.md](roadmap-central-coruja-v1.2.md) | PM (Bob) | 4 fases, sprints detalhadas, métricas, riscos |
| *(inline acima)* | Analyst (Atlas) | 25 requisitos × status × esforço × prioridade |

**Atualização 18/04**: o backlog e o roadmap acima já foram complementados com o delta posterior do usuário, incluindo DELTA-US-001 a DELTA-US-003, revisão de vouchers, taxonomia editorial e arquitetura de dados.
