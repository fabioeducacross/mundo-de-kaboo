import { Collection, CollectionAsset, CollectionType } from '../types';

type CollectionTypeMeta = {
  type: CollectionType;
  label: string;
  shortLabel: string;
  softClassName: string;
  coverClassName: string;
  detailSummary: string;
};

type CollectionPresentationCopy = {
  materialsTitle: string;
  materialsDescription: string;
  materialsEmptyState: string;
};

type KitLinkedBookState = {
  linkedBookIdsCount: number;
  linkedBooksCount: number;
  loadingLinkedBooks: boolean;
};

export const normalizeSingleKitBookIds = (value?: string[] | null): string[] => {
  return Array.from(new Set((value || []).map((id) => id?.trim()).filter(Boolean) as string[])).slice(0, 1);
};

const COLLECTION_TYPE_META: Record<CollectionType, CollectionTypeMeta> = {
  book: {
    type: 'book',
    label: 'Livro avulso',
    shortLabel: 'Livro',
    softClassName: 'bg-sky-50 text-sky-700 border-sky-100',
    coverClassName: 'bg-sky-500/90 text-white border-white/30 shadow-lg shadow-sky-950/20',
    detailSummary: 'Livro avulso com foco na leitura e nos recursos disponíveis para esta experiência.',
  },
  kit: {
    type: 'kit',
    label: 'Kit multimodal',
    shortLabel: 'Kit',
    softClassName: 'bg-amber-50 text-amber-800 border-amber-200',
    coverClassName: 'bg-amber-500/90 text-white border-white/30 shadow-lg shadow-amber-950/20',
    detailSummary: 'Kit multimodal com livro, mídia e materiais de apoio reunidos na mesma experiência.',
  },
};

const normalizeImageUrl = (value?: string | null): string => {
  return value?.trim() || '';
};

export const getCollectionType = (collection?: Partial<Collection> | null): CollectionType => {
  if (collection?.collection_type) {
    return collection.collection_type;
  }

  const hasLinkedBooks = normalizeSingleKitBookIds(collection?.kit_book_ids).length > 0;
  const hasKitCover = Boolean(normalizeImageUrl(collection?.kit_cover_image));

  return hasLinkedBooks || hasKitCover ? 'kit' : 'book';
};

export const getCollectionTypeMeta = (collection?: Partial<Collection> | null): CollectionTypeMeta => {
  return COLLECTION_TYPE_META[getCollectionType(collection)];
};

export const getCollectionPresentationCopy = (
  collection?: Partial<Collection> | null
): CollectionPresentationCopy => {
  const type = getCollectionType(collection);

  return {
    materialsTitle: 'Materiais da Coleção',
    materialsDescription: type === 'kit'
      ? 'Materiais de apoio e recursos complementares deste kit multimodal.'
      : 'Materiais de apoio e recursos complementares deste livro e da sua coleção.',
    materialsEmptyState: 'Nenhum material da coleção disponível.',
  };
};

export const getKitLinkedBookCount = ({
  linkedBookIdsCount,
  linkedBooksCount,
  loadingLinkedBooks,
}: KitLinkedBookState): number => {
  return loadingLinkedBooks ? linkedBookIdsCount : linkedBooksCount;
};

export const shouldShowKitLinkedBooksPanel = (linkedBookCount: number): boolean => {
  return linkedBookCount > 1;
};

export const getVisiblePrimaryCollectionAssets = (
  primaryAssets: CollectionAsset[],
  showLinkedBooksPanel: boolean
): CollectionAsset[] => {
  return showLinkedBooksPanel
    ? primaryAssets.filter((asset) => asset.category !== 'reading')
    : primaryAssets;
};

export const getCollectionDisplayCover = (collection?: Partial<Collection> | null): string => {
  if (!collection) {
    return '';
  }

  const kitCoverImage = normalizeImageUrl(collection.kit_cover_image);
  if (getCollectionType(collection) === 'kit' && kitCoverImage) {
    return kitCoverImage;
  }

  return normalizeImageUrl(collection.cover_image);
};