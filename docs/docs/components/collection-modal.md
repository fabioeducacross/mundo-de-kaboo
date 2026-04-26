---
id: collection-modal
title: CollectionModal
sidebar_position: 3
---

# CollectionModal

**Arquivo:** `components/CollectionModal.tsx`

## Descrição

Modal exibido ao clicar em uma coleção nas telas `home` ou `search`. Apresenta os detalhes completos do item, repetindo o formato visual de descoberta com badge de `Kit` ou `Livro` e os botões de acesso ao conteúdo disponível.

## Props

```typescript
interface CollectionModalProps {
  collection: Collection | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenName, params?: any) => void;
}
```

## Funcionamento

O modal é controlado pelo estado `params.collectionId` do `App.tsx`:

```typescript
// Modal abre quando collectionId está presente nas telas home/search
const isModalOpen =
  !!navState.params?.collectionId &&
  ['home', 'search'].includes(navState.currentScreen);
```

## Conteúdo exibido

- **Capa condicional** do item, respeitando `kit_cover_image` quando o formato for kit
- **Badge de formato** para distinguir `Kit multimodal` e `Livro avulso`
- **Seção "Livros do Kit"** apenas quando o kit tiver mais de um livro vinculado
- **Título e nível escolar**
- **Tema e objetivos de aprendizagem**
- **Personagens** da história
- **Habilidades BNCC** relacionadas
- **Competências CASEL**
- **Faixa etária / série**
- **Botões de acesso** ao conteúdo disponível

## Botões de acesso

| Botão | Navega para | Condição |
|-------|------------|---------|
| Leitura | `player_book` | ativo tipado `reading` disponível |
| Contação da História | `player_audio` | ativo tipado `storytelling` disponível |
| Desenho Animado / Com Libras | `player_video` | ativo tipado de vídeo disponível |
| Materiais da Coleção | preview e download local | biblioteca tipada ou `extra_materials` não vazio |

## Loading state

O modal abre imediatamente quando `collectionId` está nos params, mas exibe um skeleton (`ModalSkeleton`) enquanto os dados da coleção ainda estão sendo carregados.

## Drill-down interno

- Kits reais continuam usando `kit_book_ids`, mas a UX agora trata 0 ou 1 vínculo como experiência direta do próprio kit.
- Quando houver só 1 livro vinculado, o CTA raiz de `Leitura` permanece nos acessos rápidos do kit e não existe drill-down intermediário.
- O drill-down interno e o CTA `Voltar ao kit` ficam reservados para kits com mais de um livro vinculado.

## Subcomponentes

- `CollectionCoverSection` — renderiza a seção de capa
- `ModalSkeleton` — exibe skeleton durante o carregamento
