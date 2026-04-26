# Relatório de UX — Central Coruja v2

> Requisitos extraídos da reunião de produto em 15/04/2026  
> Autor: UX Design (Uma)  
> Data: 18/04/2026

---

## 1. Telas Impactadas

### 1.1 HomeScreen (Vitrine)

| O que existe | O que muda |
|---|---|
| Card sempre mostra `cover_image` (capa do livro) | Card deve distinguir **kit multimodal** (exibe capa da caixa/kit) vs **livro avulso** (exibe capa do livro). Requer novo campo `cover_type` ou `display_cover` na `Collection`. |
| Tabs por nível (Educação Infantil / Fundamental I) | Adicionar **filtro rápido por ano escolar** (`age_grade`) como chips horizontais abaixo da barra de busca, conforme plano de busca unificada já documentado. |
| Busca textual + filtros facetados | Integrar **filtro por personagem com avatares** (fotos/ícones, não só texto) e **campo aberto** no mesmo contexto, conforme pedido do Reginaldo. |
| Nenhuma gamificação | Adicionar superfície de **progresso/metas de leitura** no topo ou no perfil: barra de progresso geral, streak de dias, conquistas recentes. |

### 1.2 DetailsScreen (Detalhe da Coleção)

| O que existe | O que muda |
|---|---|
| Grid 2×2 fixo: Ler, Ouvir, Assistir, Materiais (`grid-cols-2 md:grid-cols-4`) | Grid adaptativo **4 a 6 botões**: Ler, Contação da História, Assistir, Assistir com Libras, Desenho Animado (IA), Materiais. Nem toda coleção terá os 6; o grid deve renderizar só os modos disponíveis. |
| Labels genéricos (Ler, Ouvir, Assistir, Materiais) | Labels descritivos: "Ler o Livro", "Contação da História", "Assistir Vídeo", "Assistir com Libras", "Desenho Animado", "Materiais de Apoio". |
| Tags BNCC como chips clicáveis (buscam na home) | **Tooltip rico** ao hover/tap: exibir código + descrição completa da habilidade BNCC (ex.: `EF15LP01 → Identificar a função social de textos...`). |
| Tags CASEL como chips clicáveis | **Tooltip rico** equivalente ao da BNCC: nome da competência + descrição. |
| Seção Materiais Extras (por componente) | Renomear para **Materiais da Coleção**, deixando "Materiais Gerais" reservado ao que for transversal à Central. |
| Não existe área de materiais genéricos | Nova seção: **"Materiais da Coleção"** ou **"Materiais Gerais"** para recursos que valem para toda a coleção ou para toda a Central. |

### 1.3 LoginScreen (Onboarding)

| O que existe | O que muda |
|---|---|
| Login por e-mail + senha; fluxo de voucher no cadastro | Possível adição de **campo CPF** no cadastro (exigência ECA digital para maior de idade). |
| Sem perfil infantil | Futuro: CTA para **"Cadastrar criança"** após login do adulto. |

### 1.4 ProfileScreen / MyDataScreen

| O que existe | O que muda |
|---|---|
| Exibe nome, e-mail, avatar, acesso | Adicionar **seção de gamificação**: metas de leitura, progresso acumulado, conquistas/selos. |
| Sem gestão de perfis dependentes | Futuro: listar **perfis infantis vinculados** com opção de criar/editar/remover. |
| Sem CPF | Exibir e permitir edição do CPF (se coletado no cadastro). |

### 1.5 Nova tela: Perfil Infantil (futuro)

- Interface simplificada, tipografia maior, paleta vibrante.
- Só conteúdo consumível (Ler, Ouvir, Assistir); sem "Materiais de Apoio".
- Navegação simplificada: sem busca avançada, sem filtros pedagógicos.
- Adulto gerencia via seu próprio perfil.

### 1.6 Nova tela/seção: Materiais Genéricos

- Acessível via BottomNav ou seção dedicada dentro da home.
- Materiais que valem para toda a Central Coruja ou para uma coleção inteira.
- Tipos: PDFs orientativos, guias de uso do kit, vídeos de formação (futura "Academia").

### 1.7 Nova tela/seção: Gamificação (Adulto)

- Dashboard de metas: "Li X livros este mês", "Y dias seguidos".
- Conquistas/selos colecionáveis (ex.: "Explorador", "Leitor Assíduo").
- Sem ranking, sem turma, sem competição; foco em autoestímulo.

---

## 2. Novos Componentes Necessários

### 2.1 `RichTooltip`
- **Propósito**: exibir descrição completa de códigos BNCC, CASEL e outros mapeamentos ao interagir com um chip.
- **Desktop**: popover posicionado ao hover (300ms delay), com seta apontando para o chip.
- **Mobile**: bottom sheet ou popover ao toque (tap), com botão de fechar e área de toque generosa (≥ 44×44px).
- **Conteúdo**: título (código), descrição (texto longo), link opcional "Saiba mais".
- **Acessibilidade**: `role="tooltip"`, `aria-describedby`, dismiss via Escape.

### 2.2 `AdaptiveResourceGrid`
- **Propósito**: renderizar de 4 a 6 botões de recurso sem quebra visual.
- **Layout mobile**: `grid-cols-2` sempre; 4 itens = 2×2, 5 itens = 2+2+1 (último centralizado ou ocupando largura dupla), 6 itens = 2×3.
- **Layout desktop**: `grid-cols-3` (2 linhas) quando ≥5 itens; `grid-cols-4` quando 4 itens.
- **Cada item**: ícone + label descritivo + estado disabled quando recurso inexistente + badge "Novo" para modos recém-adicionados.

### 2.3 `CharacterFilterChip`
- **Propósito**: chip de filtro por personagem com miniatura/avatar.
- **Anatomia**: imagem circular (32px) + nome do personagem ao lado.
- **Comportamento**: scroll horizontal, multi-select, estado ativo com borda/destaque.

### 2.4 `AgeGradeFilterBar`
- **Propósito**: linha de chips de filtragem rápida por ano escolar.
- **Valores**: 3 anos, 4 anos, 5 anos, 1º ano, 2º ano, 3º ano, 4º ano, 5º ano (já definidos em `AGE_ORDER` no código).
- **Comportamento**: multi-select, scroll horizontal em mobile, badge de contagem ativa.

### 2.5 `ProgressDashboard`
- **Propósito**: componente de gamificação leve mostrando progresso de leitura.
- **Elementos**: barra de progresso mensal, streak de dias, grade de conquistas/selos.
- **Local**: dentro de ProfileScreen e, opcionalmente, como banner na HomeScreen.

### 2.6 `GenericMaterialsSection`
- **Propósito**: listar materiais que não pertencem a uma coleção específica.
- **Layout**: lista ou grid de cards com ícone de tipo (PDF, vídeo, ZIP), título, tamanho, botão de download/visualização.

### 2.7 `CoverImage` (evolução)
- **Propósito**: resolver qual imagem exibir no card da vitrine.
- **Lógica**: se `collection.kit_cover_image` existe e `collection.type === 'kit_multimodal'`, exibir capa do kit; senão, exibir `cover_image` (capa do livro).

### 2.8 Resolução de nomenclatura na UI
- **Princípio**: coleção é a unidade de descoberta; kit e livro são os formatos que precisam ser comunicados visualmente.
- **Home**: card com badge de tipo no topo, cover coerente com o tipo e subtítulo curto confirmando a natureza do item quando necessário.
- **Detalhe**: hero repete o badge e, quando o item for kit, explicita a composição multimodal logo antes do grid de recursos.
- **Copy**: evitar usar coleção como label principal de formato. Preferir Kit, Livro, Materiais da Coleção e recursos descritivos.
- **Admin**: preview do cadastro precisa mostrar exatamente o rótulo e a capa que irão para a vitrine.

### 2.9 Mapa final de implementação

| Superfície | Arquivos | Decisão final |
|---|---|---|
| Card principal da vitrine | `components/Card3D.tsx` | Badge sempre visível para Kit e Livro, mantendo capa condicional por tipo |
| Busca resumida e trilho "Continue onde parou" | `screens/HomeScreen.tsx` | Exibir formato também nas listas compactas, não só no card grande |
| Hero do detalhe | `components/CollectionCoverSection.tsx`, `screens/DetailsScreen.tsx` | Repetir badge no cover e reforçar o formato logo abaixo do título |
| Biblioteca do item | `screens/DetailsScreen.tsx` | Renomear para "Materiais da Coleção" e reservar "Materiais Gerais" ao escopo transversal |
| Cadastro e preview no CMS | `screens/AdminCollectionsScreen.tsx` | Campo "Formato exibido na vitrine" e preview espelhando a home com badge e capa final |

### 2.10 Spec final de copy e badges

| Elemento | Copy final |
|---|---|
| Badge curto no cover | `Livro` ou `Kit` |
| Badge expandido em listas/detalhe | `Livro avulso` ou `Kit multimodal` |
| Resumo do detalhe, livro | `Livro avulso com foco na leitura e nos recursos disponíveis para esta experiência.` |
| Resumo do detalhe, kit | `Kit multimodal com livro, mídia e materiais de apoio reunidos na mesma experiência.` |
| CTA e tela de materiais do item | `Materiais da Coleção` |
| Campo de tipo no CMS | `Formato exibido na vitrine` |

### 2.11 Kit real no modal

- **Modelo mínimo**: `kit_book_ids` permanece como campo de vínculo, mas a regra operacional atual limita o kit a 1 livro por vez.
- **CMS**: o cadastro do kit continua no mesmo formulário da coleção, com seleção única de livro avulso existente e capa própria do kit.
- **Detalhe do kit**: com 0 ou 1 livro vinculado, o modal mantém `Leitura` nos acessos rápidos do kit; a seção `Livros do Kit` vira exceção para kits com mais de um vínculo.
- **Interação**: o drill-down interno continua disponível, mas só para cenários multi-livro.
- **Regra de clareza**: em kits 1:1, `Leitura` pertence ao próprio kit; quando houver múltiplos livros, a leitura passa a acontecer pelo livro escolhido.

---

## 3. Padrões de Interação

### 3.1 Hover/Tap Tooltip para Tags Pedagógicas
- **Desktop**: hover com 300ms de delay; persiste enquanto cursor estiver sobre chip ou tooltip; dismiss ao sair.
- **Mobile**: tap abre popover/bottom-sheet; dismiss via tap fora, swipe down ou botão ×.
- **Dados**: precisam de um dicionário BNCC (código → descrição) e CASEL (competência → descrição) carregado no frontend, provavelmente via arquivo JSON estático ou lookup no Supabase.

### 3.2 Grid Responsivo 4–6 Itens
- **Princípio**: "mostre só o que existe". Botões de recursos inexistentes não devem aparecer (não apenas ficar disabled).
- **Mobile 2-col**: se 5 itens, o último item ocupa `col-span-2` para evitar orfandade visual. Alternativa: centralizar o 5º.
- **Desktop 3-col**: 6 itens = 2 linhas perfeitas; 5 itens = 3+2 (últimos dois centralizados); 4 itens = 2+2 ou 4-col single row.
- **Transição**: animação sutil de entrada (`animate-in`, escalonada 50ms por item).

### 3.3 Filtro por Ano Escolar
- **Posição**: abaixo da barra de busca, acima dos cards.
- **Interação**: tap/click para toggle; "Limpar filtros" visível quando ≥1 filtro ativo.
- **Persistência**: manter filtro ao voltar de uma coleção (conforme plano de busca unificada).

### 3.4 Filtro por Personagem com Avatares
- **Posição**: dentro do painel de filtros avançados ou como carrossel horizontal na home.
- **Visual**: foto circular (32–40px) + nome; destaque com borda colorida quando ativo.
- **Dados**: imagens de personagem já parcialmente disponíveis via `getCharacterImageUrl()` em `constants.ts`.

### 3.5 Gamificação Passiva
- **Tracking**: registrar evento `collection_opened`, `book_read_complete`, `audio_listened`, `video_watched`.
- **Metas**: definir no perfil (ex.: "ler 3 livros/mês"); exibir progresso como fração e barra.
- **Conquistas**: unlock automático ao atingir thresholds (1ª leitura, 5 leituras, 7 dias seguidos, todos os personagens).
- **Feedback**: micro-celebração (confetti já existe no código; animação de selo).

---

## 4. Fluxos Novos

### 4.1 Onboarding Adulto com CPF

```
[Tela Inicial]
  → CTA "Tenho um voucher" ou "Já tenho conta"
    → Validar voucher
      → Formulário: Nome, E-mail, Senha, CPF (opcional? obrigatório?)
        → Confirmação de e-mail
          → Home
```

**Decisões pendentes**:
- CPF é obrigatório ou opcional? Obrigatório melhora compliance ECA, mas aumenta atrito.
- Validação de CPF: apenas formato (11 dígitos + check digit) ou consulta ativa?
- Mascarar input: `XXX.XXX.XXX-XX` com formatação automática.

### 4.2 Perfil Infantil (futuro)

```
[Perfil do Adulto]
  → "Adicionar criança"
    → Nome, idade, avatar (personagem Kaboo)
      → Perfil criado
        → Switch: adulto pode alternar para interface infantil
          → Home infantil (simplificada, sem materiais, sem busca avançada)
            → Voltar ao perfil adulto (gate por PIN ou gesture)
```

**Decisões pendentes**:
- Como proteger a saída do perfil infantil? PIN de 4 dígitos, gesture de adulto, ou botão escondido?
- A criança tem acesso ao mesmo catálogo ou a um subconjunto curado?
- Progressão/gamificação infantil é diferente da adulta?

### 4.3 Gamificação Leve (Adulto)

```
[Home]
  → Banner "Sua meta: ler 3 livros este mês (1/3)"
    → Tap → Tela de Progresso/Conquistas
      → Metas configuráveis
      → Histórico de leitura/escuta
      → Selos colecionados
```

### 4.4 Materiais Genéricos

```
[Home ou BottomNav]
  → "Materiais" (seção/tab)
    → Lista de materiais por categoria (guias, formação, orientações)
      → Tap → Preview (PDF inline ou download)
```

---

## 5. Riscos de UX

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| 1 | **Grid com 5 botões (ímpar)**: o layout 2-col deixa um botão órfão, quebrando simetria visual | Média | Usar `col-span-2` no último item ou layout 3-col em mobile para 5+ itens |
| 2 | **Tooltip em mobile (sem hover)**: padrão de hover não funciona em touch devices | Alta | Substituir por tap-to-reveal com popover/bottom-sheet; garantir área de toque ≥ 44px |
| 3 | **CPF no cadastro**: atrito adicional no onboarding, risco de abandono | Alta | Tornar CPF opcional no cadastro e solicitar depois (progressive disclosure); ou explicitar por que é necessário (compliance ECA) |
| 4 | **Dicionário BNCC/CASEL no frontend**: volume de dados pode ser grande (~600 habilidades BNCC) | Média | Carregar como JSON estático por nível/ano; lazy load ao abrir DetailsScreen; cache em memória |
| 5 | **Labels longos nos botões de recurso**: "Contação da História" ou "Assistir com Libras" podem truncar em telas pequenas | Média | Usar label curto + subtitle (2 linhas) ou tooltip no label longo; testar em viewport 320px |
| 6 | **Perfil infantil sem gate de saída**: criança pode sair do perfil infantil e acessar materiais de apoio do adulto | Alta | Implementar PIN ou gesture de adulto para trocar de perfil |
| 7 | **Gamificação pode parecer vazia no início**: adulto sem histórico vê dashboard zerado | Baixa | Onboarding de gamificação com "primeira meta sugerida" e celebração ao completar primeira ação |
| 8 | **Materiais genéricos vs. materiais por componente**: confusão sobre onde encontrar o que | Média | Hierarquia clara: materiais dentro da coleção (específicos) vs. seção dedicada na home/nav (genéricos); labels distintos |
| 9 | **Filtro por personagem com fotos**: nem todos os personagens têm imagem cadastrada | Baixa | Fallback para iniciais ou ícone genérico; verificar `getCharacterImageUrl()` |
| 10 | **6 modos de mídia aumentam carga cognitiva**: adulto pode não saber a diferença entre "Assistir", "Assistir com Libras" e "Desenho Animado" | Média | Usar ícones distintos + sublabel explicativo; agrupar visualmente as 3 variantes de vídeo |

---

## 6. Recomendações de Prioridade

### Prioridade 1 — Impacto imediato na experiência core

| # | Item | Justificativa |
|---|---|---|
| 1 | **Grid adaptativo 4–6 botões** na DetailsScreen | Blocker: novos tipos de mídia não cabem no grid 2×2 fixo atual |
| 2 | **Labels descritivos** nos botões de recurso | Baixo esforço, alto ganho de clareza; evita confusão "Ouvir" vs. "Assistir" |
| 3 | **Tooltip rico BNCC/CASEL** | Pedido explícito do stakeholder; exige dicionário de dados, mas o componente UI é simples |
| 4 | **Capa kit vs. capa livro** na vitrine | Pedido direto; requer campo no modelo + lógica condicional no Card3D |

### Prioridade 2 — Experiência de descoberta melhorada

| # | Item | Justificativa |
|---|---|---|
| 5 | **Filtro por ano escolar** (chips na home) | Alinhado com plano de busca unificada já documentado; facilita descoberta pedagógica |
| 6 | **Filtro por personagem com avatares** | Diferencial visual, pedido do Reginaldo; dados já parcialmente disponíveis |
| 7 | **Seção de materiais genéricos** | Desbloqueia conteúdo que hoje não tem onde morar na UI |

### Prioridade 3 — Engajamento e retenção

| # | Item | Justificativa |
|---|---|---|
| 8 | **Gamificação leve** (metas, progresso, conquistas) | Aumenta retenção, mas exige tracking de eventos e UI dedicada |
| 9 | **CPF no onboarding** | Compliance pode exigir, mas risco de atrito; implementar como progressive disclosure |

### Prioridade 4 — Roadmap futuro

| # | Item | Justificativa |
|---|---|---|
| 10 | **Perfil infantil** | Escopo grande (nova UI, gate de segurança, catálogo curado); planejar como fase separada |
| 11 | **Academia / formação** | Mencionado como futuro; depende de produção de conteúdo |

---

## Apêndice: Tipos e Campos Impactados no Modelo de Dados

```typescript
// Campos novos sugeridos em Collection
interface Collection {
  // ...campos existentes...
  cover_type?: 'book' | 'kit';          // define qual cover mostrar na vitrine
  kit_cover_image?: string;              // URL da capa do kit (quando cover_type='kit')
  libras_video_url?: string;             // vídeo com Libras
  animated_video_url?: string;           // desenho animado gerado por IA
  narration_audio_url?: string;          // contação de história (diferente de audio_url)
  generic_materials?: string[];          // materiais genéricos da coleção inteira
}

// Novo tipo para recursos multimídia expandidos
type ResourceMode = 
  | 'read'               // Ler o Livro
  | 'narration'          // Contação da História
  | 'video'              // Assistir Vídeo
  | 'video_libras'       // Assistir com Libras
  | 'animated'           // Desenho Animado
  | 'materials';         // Materiais de Apoio

// Dicionário pedagógico (novo)
interface BnccDescriptor {
  code: string;          // ex: EF15LP01
  description: string;   // texto completo da habilidade
  area: string;          // Linguagens, Matemática, etc.
  year_range: string;    // 1º ao 5º ano, etc.
}

interface CaselDescriptor {
  competency: string;    // ex: Autoconhecimento
  description: string;   // texto descritivo
}

// Gamificação
interface ReadingGoal {
  user_id: string;
  target_count: number;  // livros/mês
  current_count: number;
  period: 'weekly' | 'monthly';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked_at?: string;
}

// Perfil infantil (futuro)
interface ChildProfile {
  id: string;
  parent_user_id: string;
  name: string;
  age: number;
  avatar_character: string;  // personagem Kaboo
  created_at: string;
}
```

---

## Apêndice: Wireframe ASCII — Grid Adaptativo de Recursos

### Mobile (2-col) — 4 itens
```
┌─────────────┐ ┌─────────────┐
│  📖 Ler o   │ │  🎧 Contação│
│    Livro    │ │ da História │
└─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│  🎬 Assistir│ │  📎 Materiais│
│    Vídeo    │ │  de Apoio   │
└─────────────┘ └─────────────┘
```

### Mobile (2-col) — 6 itens
```
┌─────────────┐ ┌─────────────┐
│  📖 Ler o   │ │  🎧 Contação│
│    Livro    │ │ da História │
└─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│  🎬 Assistir│ │  🤟 Assistir│
│    Vídeo    │ │  com Libras │
└─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│  🎨 Desenho │ │  📎 Materiais│
│   Animado   │ │  de Apoio   │
└─────────────┘ └─────────────┘
```

### Mobile (2-col) — 5 itens (caso ímpar)
```
┌─────────────┐ ┌─────────────┐
│  📖 Ler o   │ │  🎧 Contação│
│    Livro    │ │ da História │
└─────────────┘ └─────────────┘
┌─────────────┐ ┌─────────────┐
│  🎬 Assistir│ │  🤟 Assistir│
│    Vídeo    │ │  com Libras │
└─────────────┘ └─────────────┘
┌─────────────────────────────┐
│      📎 Materiais de Apoio  │
│         (col-span-2)        │
└─────────────────────────────┘
```

### Desktop (3-col) — 6 itens
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📖 Ler o │ │ 🎧 Conta-│ │ 🎬 Assis-│
│   Livro  │ │ção Histó.│ │tir Vídeo │
└──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🤟 Libras│ │ 🎨 Desen.│ │ 📎 Mater.│
│          │ │ Animado  │ │ de Apoio  │
└──────────┘ └──────────┘ └──────────┘
```

---

*Documento gerado como insumo para planejamento de sprint. Não constitui decisão final de design; requer validação com stakeholders e prototipação.*
