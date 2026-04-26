import React from 'react';
import { Button } from '../design-system';
import { CollectionFiltersModal } from '../components/CollectionFiltersModal';
import { Icons } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import catalogSeed from '../data/catalog.seed.json';
import { LIBRARY_HUB_MOCKS, LibraryHubKind, LibraryMockItem, LibraryMockItemVariant } from '../data/library-hubs';
import { api } from '../lib/api';
import { Collection, MediaHub, MediaHubResponse, MediaItemCard, ScreenName } from '../types';

interface LibraryHubScreenProps {
  screen: LibraryHubKind;
  onNavigate: (screen: ScreenName, params?: any) => void;
}

type CatalogSeed = {
  collections?: Collection[];
};

const libraryCollectionsById = new Map(
  (((catalogSeed as CatalogSeed).collections) ?? []).map((collection) => [collection.id, collection] as const),
);
const FALLBACK_LIBRARY_COLLECTION_ID = '784b3238-0916-4922-af3c-8627d74cc16c';

const ITEM_ICONS: Record<LibraryMockItemVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  video: Icons.Video,
  track: Icons.Headphones,
  formation: Icons.BookOpen,
  material: Icons.FileText,
};

const ITEM_LABELS: Record<LibraryMockItemVariant, string> = {
  video: 'Vídeo',
  track: 'Faixa',
  formation: 'Percurso',
  material: 'Material',
};

const CARD_PREVIEW_ASPECT: Record<LibraryMockItemVariant, string> = {
  video: 'aspect-square',
  track: 'aspect-square',
  formation: 'aspect-square',
  material: 'aspect-square',
};

const FEATURED_PREVIEW_ASPECT: Record<LibraryMockItemVariant, string> = {
  video: 'aspect-[16/8.9]',
  track: 'aspect-[10/8]',
  formation: 'aspect-[16/9.6]',
  material: 'aspect-[16/9.6]',
};

const waveformBars = ['h-3', 'h-6', 'h-4', 'h-7', 'h-5', 'h-8', 'h-4', 'h-6'];

const NEUTRAL_LIBRARY_BADGE_CLASS = 'border-kaboo-primary/12 bg-white text-kaboo-primary/82 shadow-sm';
const NEUTRAL_LIBRARY_TAB_CLASS = 'border-kaboo-primary/10 bg-white text-kaboo-primary/75 hover:border-kaboo-primary/25';
const ACTIVE_LIBRARY_TAB_CLASS = 'border-kaboo-primary/14 bg-kaboo-primary/[0.08] text-kaboo-primary shadow-sm';

type CompactLibraryKind = Exclude<LibraryHubKind, 'videos'>;

const COMPACT_FILTER_LABELS: Partial<Record<CompactLibraryKind, string[]>> = {
  formations: ['Acolhimento', 'Roda', 'Conflitos', 'Percurso curto'],
  materials: ['Uso imediato', 'Planejamento', 'Convivência', 'Exploração'],
};

const getFormationStepLabel = (item: LibraryMockItem) => {
  const steps = Math.max(1, item.previewSteps ?? 1);
  return `${steps} ${steps === 1 ? 'etapa' : 'etapas'}`;
};

const getLibraryActionLabel = (item: LibraryMockItem) => {
  if (item.variant === 'material') {
    return 'Abrir PDF';
  }

  if (item.variant === 'formation') {
    return 'Ver percurso';
  }

  return item.ctaLabel;
};

type VideoLibraryFilter = 'Todos' | 'Infantil' | 'Professor' | 'Acessível';
type VideoSortMode = 'recentes' | 'titulo';

type LibraryCollectionFilterState = {
  characters: string[];
  bncc: string[];
  casel: string[];
  age: string[];
};

const INITIAL_LIBRARY_COLLECTION_FILTERS: LibraryCollectionFilterState = {
  characters: [],
  bncc: [],
  casel: [],
  age: [],
};

const LIBRARY_FILTER_AGE_ORDER = ['3 anos', '4 anos', '5 anos', '1º ano', '2º ano', '3º ano', '4º ano', '5º ano'];

const normalizeLibraryText = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const sortLibraryAgeValues = (values: string[]) => values.sort((left, right) => {
  const leftIndex = LIBRARY_FILTER_AGE_ORDER.indexOf(left);
  const rightIndex = LIBRARY_FILTER_AGE_ORDER.indexOf(right);

  if (leftIndex !== -1 && rightIndex !== -1) {
    return leftIndex - rightIndex;
  }

  if (leftIndex !== -1) {
    return -1;
  }

  if (rightIndex !== -1) {
    return 1;
  }

  return left.localeCompare(right, 'pt-BR', { numeric: true });
});

const getLinkedLibraryCollection = (item: LibraryMockItem) => {
  if (!item.collectionId) {
    return undefined;
  }

  return libraryCollectionsById.get(item.collectionId);
};

const getLibraryCollectionFilterOptions = (items: LibraryMockItem[]) => {
  const options = {
    characters: new Set<string>(),
    bncc: new Set<string>(),
    casel: new Set<string>(),
    age: new Set<string>(),
  };

  items.forEach((item) => {
    const collection = getLinkedLibraryCollection(item);
    if (!collection) {
      return;
    }

    collection.characters?.forEach((value) => options.characters.add(value));
    collection.bncc_skills?.forEach((value) => options.bncc.add(value));
    collection.casel_competencies?.forEach((value) => options.casel.add(value));
    collection.age_grade?.forEach((value) => options.age.add(value));
  });

  return {
    characters: Array.from(options.characters).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    bncc: Array.from(options.bncc).sort((left, right) => left.localeCompare(right, 'pt-BR', { numeric: true })),
    casel: Array.from(options.casel).sort((left, right) => left.localeCompare(right, 'pt-BR')),
    age: sortLibraryAgeValues(Array.from(options.age)),
  };
};

const matchesLibraryCollectionFilters = (item: LibraryMockItem, filters: LibraryCollectionFilterState) => {
  const hasActiveFilters = (Object.values(filters) as string[][]).some((values) => values.length > 0);

  if (!hasActiveFilters) {
    return true;
  }

  const collection = getLinkedLibraryCollection(item);
  if (!collection) {
    return false;
  }

  if (filters.characters.length > 0) {
    const hasCharacter = collection.characters?.some((value) => filters.characters.includes(value));
    if (!hasCharacter) {
      return false;
    }
  }

  if (filters.bncc.length > 0) {
    const hasBncc = collection.bncc_skills?.some((value) => filters.bncc.includes(value));
    if (!hasBncc) {
      return false;
    }
  }

  if (filters.casel.length > 0) {
    const hasCasel = collection.casel_competencies?.some((value) => filters.casel.includes(value));
    if (!hasCasel) {
      return false;
    }
  }

  if (filters.age.length > 0) {
    const hasAge = collection.age_grade?.some((value) => filters.age.includes(value));
    if (!hasAge) {
      return false;
    }
  }

  return true;
};

const buildCollectionContextSearchText = (item: LibraryMockItem) => {
  if (!item.collectionId) {
    return '';
  }

  const collection = libraryCollectionsById.get(item.collectionId);
  if (!collection) {
    return '';
  }

  return [
    collection.title,
    collection.level,
    collection.theme,
    collection.learning_objectives,
    collection.characters?.join(' '),
    collection.bncc_skills?.join(' '),
    collection.casel_competencies?.join(' '),
    collection.age_grade?.join(' '),
  ].filter(Boolean).join(' ');
};

const matchesVideoLibraryFilter = (item: LibraryMockItem, filter: VideoLibraryFilter) => {
  if (filter === 'Todos') {
    return true;
  }

  const searchableValues = [
    item.title,
    item.description,
    item.eyebrow,
    item.meta,
    item.secondaryMeta,
    item.relatedCollection,
    ...(item.chips ?? []),
  ].filter(Boolean).map((value) => normalizeLibraryText(value as string));

  if (filter === 'Acessível') {
    return searchableValues.some((value) => value.includes('acess') || value.includes('libras') || value.includes('inclus'));
  }

  const normalizedFilter = normalizeLibraryText(filter);
  return searchableValues.some((value) => value.includes(normalizedFilter));
};

const buildLibrarySearchText = (item: LibraryMockItem) => normalizeLibraryText([
  item.title,
  item.description,
  item.eyebrow,
  item.meta,
  item.secondaryMeta,
  item.relatedCollection,
  buildCollectionContextSearchText(item),
  ...(item.chips ?? []),
].filter(Boolean).join(' '));

const matchesCompactLibraryFilter = (item: LibraryMockItem, filter: string, hub: LibraryHubKind) => {
  if (filter === 'Todos') {
    return true;
  }

  const searchableText = buildLibrarySearchText(item);
  const normalizedFilter = normalizeLibraryText(filter);

  if (hub === 'music') {
    if (normalizedFilter.includes('ligad')) {
      return Boolean(item.relatedCollection);
    }

    if (normalizedFilter.includes('escuta')) {
      return searchableText.includes('escuta') || searchableText.includes('silencio') || searchableText.includes('respir') || searchableText.includes('calma');
    }

    if (normalizedFilter.includes('cantiga')) {
      return searchableText.includes('curta') || searchableText.includes('2 min') || searchableText.includes('3 min') || searchableText.includes('faixa');
    }

    if (normalizedFilter.includes('roda')) {
      return searchableText.includes('roda') || searchableText.includes('grupo');
    }
  }

  if (hub === 'formations') {
    if (normalizedFilter.includes('acolh')) {
      return searchableText.includes('acolh') || searchableText.includes('pertenc') || searchableText.includes('coragem');
    }

    if (normalizedFilter.includes('roda')) {
      return searchableText.includes('roda') || searchableText.includes('escuta');
    }

    if (normalizedFilter.includes('conflit')) {
      return searchableText.includes('conflit') || searchableText.includes('reparo') || searchableText.includes('conviv') || searchableText.includes('dialog');
    }

    if (normalizedFilter.includes('curto')) {
      return (item.previewSteps ?? 99) <= 2 || searchableText.includes('15 min');
    }
  }

  if (hub === 'materials') {
    if (normalizedFilter.includes('uso')) {
      return searchableText.includes('uso imediato') || searchableText.includes('consulta imediata') || searchableText.includes('pdf direto') || searchableText.includes('apoio de aula');
    }

    if (normalizedFilter.includes('planej')) {
      return searchableText.includes('planejamento') || searchableText.includes('consulta curta') || searchableText.includes('apoio');
    }

    if (normalizedFilter.includes('conviv')) {
      return searchableText.includes('conviv') || searchableText.includes('dialog') || searchableText.includes('conflit') || searchableText.includes('grupo');
    }

    if (normalizedFilter.includes('explora')) {
      return searchableText.includes('explora') || searchableText.includes('pistas') || searchableText.includes('cooper');
    }
  }

  return searchableText.includes(normalizedFilter)
    || normalizedFilter.split(' ').some((token) => token.length > 2 && searchableText.includes(token));
};

const cleanVideoMetaLabel = (meta: string) => meta.replace(/^vídeo\s*•\s*/i, '').trim();
const cleanTrackMetaLabel = (meta: string) => meta.replace(/^faixa\s*•\s*/i, '').trim();

const getMediaCardMetaLabel = (item: LibraryMockItem) => {
  if (item.variant === 'video') {
    const cleaned = cleanVideoMetaLabel(item.meta);
    const normalized = normalizeLibraryText(cleaned);
    return !normalized || normalized === 'video' ? '' : cleaned;
  }

  if (item.variant === 'track') {
    const cleaned = cleanTrackMetaLabel(item.meta);
    const normalized = normalizeLibraryText(cleaned);
    return !normalized || normalized === 'faixa' ? '' : cleaned;
  }

  return item.meta;
};

const getLibraryBadgeIcon = (item: LibraryMockItem) => {
  if (item.variant === 'video') {
    return Icons.Play;
  }

  if (item.variant === 'track') {
    return Icons.Headphones;
  }

  if (item.variant === 'formation') {
    return Icons.BookOpen;
  }

  return Icons.FileText;
};

const getLibraryBadgeLabel = (item: LibraryMockItem) => {
  if (item.variant === 'video') {
    return cleanVideoMetaLabel(item.meta) || 'Vídeo';
  }

  if (item.variant === 'track') {
    return cleanTrackMetaLabel(item.meta) || item.secondaryMeta || 'Faixa';
  }

  if (item.variant === 'formation') {
    return getFormationStepLabel(item);
  }

  return 'PDF';
};

const getLibrarySupportingText = (item: LibraryMockItem) => {
  if (item.variant === 'formation' || item.variant === 'material') {
    return item.description || item.relatedCollection || item.eyebrow;
  }

  return item.relatedCollection || item.description || item.eyebrow;
};

const renderMinimalLibraryCardBody = (item: LibraryMockItem) => {
  const BadgeIcon = getLibraryBadgeIcon(item);
  const ActionIcon = item.variant === 'material' ? Icons.ExternalLink : Icons.ChevronRight;
  const badgeLabel = getLibraryBadgeLabel(item);
  const supportingText = getLibrarySupportingText(item);

  return (
    <>
      <div className="min-w-0 flex-1">
        <h3 className="text-[0.94rem] font-black leading-[1.1] tracking-[-0.03em] text-kaboo-primary line-clamp-2">
          {item.title}
        </h3>

        {supportingText && (
          <p className="mt-1.5 text-[12px] leading-5 text-gray-500 line-clamp-2">
            {supportingText}
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-kaboo-primary/10 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-kaboo-primary/72 shadow-sm">
            <BadgeIcon size={12} className={item.variant === 'video' ? 'fill-current stroke-none' : 'stroke-[2.1px]'} />
            {badgeLabel}
          </span>
        </div>
      </div>

      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.03] text-kaboo-primary/35 transition-colors duration-200 group-hover:bg-kaboo-primary/[0.08] group-hover:text-kaboo-primary">
        <ActionIcon
          size={16}
          className={item.variant === 'material' ? '' : 'transition-transform duration-200 group-hover:translate-x-0.5'}
        />
      </span>
    </>
  );
};

const buildUniqueLibraryItems = (items: LibraryMockItem[]) => Array.from(
  new Map(
    items.map((item) => [
      `${item.collectionId ?? item.relatedCollection ?? 'sem-colecao'}::${item.title.toLowerCase()}`,
      item,
    ]),
  ).values(),
);

const formatLibraryDurationLabel = (durationSeconds?: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) {
    return '';
  }

  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  return `${totalMinutes} min`;
};

const adaptMediaCardToLibraryItem = (card: MediaItemCard): LibraryMockItem => {
  const isVideo = card.kind === 'video';
  const durationLabel = formatLibraryDurationLabel(card.durationSeconds);
  const clampedProgress = Math.max(0, Math.min(100, Math.round(card.progressPercent ?? 0)));
  const showVideoProgress = isVideo && clampedProgress > 0 && clampedProgress < 100;
  const chips = Array.from(new Set([
    ...(card.badges ?? []),
    ...(showVideoProgress ? ['Em andamento'] : []),
  ]));

  return {
    id: card.id,
    variant: isVideo ? 'video' : 'track',
    eyebrow: card.collectionTitle ?? (isVideo ? 'Vídeo' : 'Faixa'),
    title: card.title,
    description: card.description ?? card.summary ?? '',
    meta: `${isVideo ? 'vídeo' : 'faixa'}${durationLabel ? ` • ${durationLabel}` : ''}`,
    secondaryMeta: card.summary ?? undefined,
    relatedCollection: card.collectionTitle ?? undefined,
    collectionId: card.collectionId ?? undefined,
    coverImage: card.thumbnailUrl ?? undefined,
    progress: isVideo ? card.progressPercent : undefined,
    chips,
    ctaLabel: isVideo ? 'Assistir agora' : 'Ouvir agora',
    assetType: isVideo ? 'video' : 'audio',
    assetTitle: card.title,
  };
};

const flattenMediaHubResponseToLibraryItems = (hub: MediaHubResponse): LibraryMockItem[] => {
  const continueItems = hub.shelves
    .filter((shelf) => shelf.type === 'continue_watching')
    .flatMap((shelf) => shelf.items);
  const regularShelfItems = hub.shelves
    .filter((shelf) => shelf.type !== 'continue_watching')
    .flatMap((shelf) => shelf.items);

  const items = [
    ...continueItems,
    ...(hub.hero ? [hub.hero] : []),
    ...regularShelfItems,
  ];

  return Array.from(new Map(items.map((item) => [item.id, item])).values()).map(adaptMediaCardToLibraryItem);
};

const adaptMediaShelvesToLibraryItems = (
  hub: MediaHubResponse,
  allowedItemIds: Set<string>,
  heroItemId?: string,
) => hub.shelves
  .map((shelf) => ({
    id: shelf.id,
    type: shelf.type,
    title: shelf.title,
    description: shelf.description,
    items: shelf.items
      .map(adaptMediaCardToLibraryItem)
      .filter((item) => allowedItemIds.has(item.id) && item.id !== heroItemId),
  }))
  .filter((shelf) => shelf.items.length > 0);

const DEFAULT_LIBRARY_SURFACE = {
  page: 'bg-[radial-gradient(circle_at_top_right,rgba(93,31,88,0.1),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(78,168,222,0.08),transparent_26%),linear-gradient(180deg,#ffffff_0%,#fcfbfd_100%)]',
  stage: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,246,251,0.94))]',
  hero: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,245,251,0.96))]',
  rail: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,248,252,0.98))]',
  stat: 'border-[#ead9e8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,246,252,0.95))]',
  card: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,246,252,0.96))]',
} as const;

const SCREEN_SURFACE_CLASSES: Record<LibraryHubKind, {
  page: string;
  stage: string;
  hero: string;
  rail: string;
  stat: string;
  card: string;
}> = {
  videos: DEFAULT_LIBRARY_SURFACE,
  music: DEFAULT_LIBRARY_SURFACE,
  formations: DEFAULT_LIBRARY_SURFACE,
  materials: DEFAULT_LIBRARY_SURFACE,
};

const CardContainer: React.FC<{
  item: LibraryMockItem;
  className: string;
  onOpen: (item: LibraryMockItem) => void;
  children: React.ReactNode;
}> = ({ item, className, onOpen, children }) => {
  if (!item.collectionId && !item.assetUrl) {
    return <article className={className}>{children}</article>;
  }

  if (item.assetType === 'pdf' && item.assetUrl) {
    return (
      <a
        href={item.assetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} block cursor-pointer text-left`}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`${className} cursor-pointer text-left`}
    >
      {children}
    </button>
  );
};

const renderItemPreview = (item: LibraryMockItem, featured: boolean = false) => {
  const PreviewIcon = getLibraryBadgeIcon(item);
  const aspectClassName = featured ? FEATURED_PREVIEW_ASPECT[item.variant] : CARD_PREVIEW_ASPECT[item.variant];
  const hasCover = Boolean(item.coverImage);

  return (
    <div
      className={`relative overflow-hidden rounded-[1rem] ${aspectClassName} border ${hasCover ? 'border-kaboo-primary/8 bg-slate-900' : 'border-kaboo-primary/10 bg-[linear-gradient(180deg,#ffffff,#f7f3f9)]'}`}
      style={hasCover ? { backgroundImage: `linear-gradient(180deg,rgba(15,23,42,0.06),rgba(15,23,42,0.16)), url(${item.coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
    >
      <div className={`absolute inset-0 ${hasCover ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(15,23,42,0.18))]' : 'bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.1),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.28),rgba(255,255,255,0.02))]'}`} />
      <span className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${hasCover ? 'bg-white/84 text-kaboo-primary shadow-sm' : 'border border-kaboo-primary/10 bg-white text-kaboo-primary/70 shadow-sm'}`}>
        <PreviewIcon size={14} className={item.variant === 'video' ? 'fill-current stroke-none' : 'stroke-[2.1px]'} />
      </span>
    </div>
  );
};

export const LibraryHubScreen: React.FC<LibraryHubScreenProps> = ({ screen, onNavigate }) => {
  const config = LIBRARY_HUB_MOCKS[screen];
  const screenSurface = SCREEN_SURFACE_CLASSES[screen];
  const isVideoHub = screen === 'videos';
  const isMusicHub = screen === 'music';
  const shouldUseMediaApi = isVideoHub || isMusicHub;
  const isMaterialsHub = screen === 'materials';
  const isFormationsHub = screen === 'formations';
  const [showLibraryFilters, setShowLibraryFilters] = React.useState(false);
  const [showLibraryBnccPicker, setShowLibraryBnccPicker] = React.useState(false);
  const [libraryBnccQuery, setLibraryBnccQuery] = React.useState('');
  const [libraryCollectionFilters, setLibraryCollectionFilters] = React.useState<LibraryCollectionFilterState>(INITIAL_LIBRARY_COLLECTION_FILTERS);
  const [videoQuery, setVideoQuery] = React.useState('');
  const [videoActiveFilter, setVideoActiveFilter] = React.useState<VideoLibraryFilter>('Todos');
  const [videoSortMode, setVideoSortMode] = React.useState<VideoSortMode>('recentes');
  const [compactQuery, setCompactQuery] = React.useState('');
  const [compactActiveFilter, setCompactActiveFilter] = React.useState('Todos');
  const [compactSortMode, setCompactSortMode] = React.useState<VideoSortMode>('recentes');
  const [mediaDrivenItems, setMediaDrivenItems] = React.useState<LibraryMockItem[]>([]);
  const [mediaHubData, setMediaHubData] = React.useState<MediaHubResponse | null>(null);
  const [mediaSourceStatus, setMediaSourceStatus] = React.useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle');
  const mockFlattenedItems = React.useMemo(
    () => buildUniqueLibraryItems([config.featured, ...config.rails.flatMap((rail) => rail.items)]),
    [config],
  );

  React.useEffect(() => {
    setShowLibraryFilters(false);
    setShowLibraryBnccPicker(false);
    setLibraryBnccQuery('');
    setLibraryCollectionFilters(INITIAL_LIBRARY_COLLECTION_FILTERS);
    setVideoQuery('');
    setVideoActiveFilter('Todos');
    setVideoSortMode('recentes');
    setCompactQuery('');
    setCompactActiveFilter('Todos');
    setCompactSortMode('recentes');
  }, [screen]);

  React.useEffect(() => {
    let isActive = true;

    if (!shouldUseMediaApi) {
      setMediaDrivenItems([]);
      setMediaHubData(null);
      setMediaSourceStatus('idle');
      return () => {
        isActive = false;
      };
    }

    setMediaDrivenItems(mockFlattenedItems);
    setMediaHubData(null);
    setMediaSourceStatus('loading');

    api.getMediaHub(screen as MediaHub)
      .then((response) => {
        if (!isActive) {
          return;
        }

        const nextItems = flattenMediaHubResponseToLibraryItems(response);
        if (nextItems.length > 0) {
          setMediaDrivenItems(nextItems);
          setMediaHubData(response);
          setMediaSourceStatus('ready');
          return;
        }

        setMediaDrivenItems(mockFlattenedItems);
        setMediaHubData(null);
        setMediaSourceStatus('fallback');
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setMediaDrivenItems(mockFlattenedItems);
        setMediaHubData(null);
        setMediaSourceStatus('fallback');
      });

    return () => {
      isActive = false;
    };
  }, [mockFlattenedItems, screen, shouldUseMediaApi]);

  const videoLibraryItems = isVideoHub
    ? (shouldUseMediaApi ? mediaDrivenItems : mockFlattenedItems)
    : [];
  const compactLibraryItems = !isVideoHub
    ? (shouldUseMediaApi ? mediaDrivenItems : mockFlattenedItems)
    : [];
  const currentLibraryItems = isVideoHub ? videoLibraryItems : compactLibraryItems;
  const availableCollectionFilterOptions = getLibraryCollectionFilterOptions(currentLibraryItems);
  const activeLibraryFilterCount = (Object.values(libraryCollectionFilters) as string[][]).reduce((total, values) => total + values.length, 0);
  const hasLibraryFiltersApplied = activeLibraryFilterCount > 0;
  const normalizedLibraryBnccQuery = normalizeLibraryText(libraryBnccQuery.trim());
  const filteredLibraryBnccOptions = availableCollectionFilterOptions.bncc.filter((code) => {
    if (!normalizedLibraryBnccQuery) {
      return true;
    }

    return normalizeLibraryText(code).includes(normalizedLibraryBnccQuery);
  });
  const normalizedVideoQuery = normalizeLibraryText(videoQuery.trim());
  const filteredVideoItems = isVideoHub
    ? videoLibraryItems.filter((item) => {
      if (!matchesLibraryCollectionFilters(item, libraryCollectionFilters)) {
        return false;
      }

      if (!matchesVideoLibraryFilter(item, videoActiveFilter)) {
        return false;
      }

      if (!normalizedVideoQuery) {
        return true;
      }

      return buildLibrarySearchText(item).includes(normalizedVideoQuery);
    })
    : [];
  const sortedVideoItems = isVideoHub
    ? [...filteredVideoItems].sort((left, right) => {
      if (videoSortMode === 'titulo') {
        return left.title.localeCompare(right.title, 'pt-BR');
      }

      return 0;
    })
    : [];
  const videoFilterTabs = isVideoHub
    ? [
      { label: 'Todos' as VideoLibraryFilter, count: videoLibraryItems.length, active: videoActiveFilter === 'Todos' },
      { label: 'Infantil' as VideoLibraryFilter, count: videoLibraryItems.filter((item) => matchesVideoLibraryFilter(item, 'Infantil')).length, active: videoActiveFilter === 'Infantil' },
      { label: 'Professor' as VideoLibraryFilter, count: videoLibraryItems.filter((item) => matchesVideoLibraryFilter(item, 'Professor')).length, active: videoActiveFilter === 'Professor' },
      { label: 'Acessível' as VideoLibraryFilter, count: videoLibraryItems.filter((item) => matchesVideoLibraryFilter(item, 'Acessível')).length, active: videoActiveFilter === 'Acessível' },
    ]
    : [];
  const normalizedCompactQuery = normalizeLibraryText(compactQuery.trim());
  const compactFilterSource = !isVideoHub
    ? COMPACT_FILTER_LABELS[screen as CompactLibraryKind] ?? config.quickFilters
    : [];
  const compactFilterLabels = !isVideoHub ? ['Todos', ...compactFilterSource] : [];
  const filteredCompactItems = !isVideoHub
    ? compactLibraryItems.filter((item) => {
      if (!matchesLibraryCollectionFilters(item, libraryCollectionFilters)) {
        return false;
      }

      if (!matchesCompactLibraryFilter(item, compactActiveFilter, screen)) {
        return false;
      }

      if (!normalizedCompactQuery) {
        return true;
      }

      return buildLibrarySearchText(item).includes(normalizedCompactQuery);
    })
    : [];
  const sortedCompactItems = !isVideoHub
    ? [...filteredCompactItems].sort((left, right) => {
      if (compactSortMode === 'titulo') {
        return left.title.localeCompare(right.title, 'pt-BR');
      }

      return 0;
    })
    : [];
  const currentFilteredItems = isVideoHub ? sortedVideoItems : sortedCompactItems;
  const filteredMediaItemIds = React.useMemo(
    () => new Set(currentFilteredItems.map((item) => item.id)),
    [currentFilteredItems],
  );
  const mediaHeroItem = React.useMemo(() => {
    if (!mediaHubData?.hero) {
      return null;
    }

    const adaptedHero = adaptMediaCardToLibraryItem(mediaHubData.hero);
    return filteredMediaItemIds.has(adaptedHero.id) ? adaptedHero : null;
  }, [filteredMediaItemIds, mediaHubData]);
  const mediaRailSections = React.useMemo(() => {
    if (!mediaHubData) {
      return [];
    }

    return adaptMediaShelvesToLibraryItems(mediaHubData, filteredMediaItemIds, mediaHeroItem?.id);
  }, [filteredMediaItemIds, mediaHeroItem?.id, mediaHubData]);
  const compactFilterTabs = !isVideoHub
    ? compactFilterLabels.map((label) => ({
      label,
      count: label === 'Todos'
        ? compactLibraryItems.length
        : compactLibraryItems.filter((item) => matchesCompactLibraryFilter(item, label, screen)).length,
      active: compactActiveFilter === label,
    }))
    : [];
  const compactSectionTitle = isMaterialsHub
    ? 'Documentos para abrir agora.'
    : isFormationsHub
      ? 'Escolha o roteiro pelo momento da conversa.'
      : `${sortedCompactItems.length} entradas disponíveis para explorar.`;
  const compactGridClassName = 'md:grid-cols-2';
  const toggleLibraryCollectionFilter = (category: keyof LibraryCollectionFilterState, value: string) => {
    setLibraryCollectionFilters((prev) => {
      const currentValues = prev[category];
      const hasValue = currentValues.includes(value);

      return {
        ...prev,
        [category]: hasValue
          ? currentValues.filter((entry) => entry !== value)
          : [...currentValues, value],
      };
    });
  };
  const clearLibraryFilters = () => {
    setLibraryCollectionFilters(INITIAL_LIBRARY_COLLECTION_FILTERS);
  };
  const clearLibraryBnccFilters = () => {
    setLibraryCollectionFilters((prev) => ({
      ...prev,
      bncc: [],
    }));
  };
  const closeLibraryBnccPicker = () => {
    setShowLibraryBnccPicker(false);
    setLibraryBnccQuery('');
  };
  const openCollection = (collectionId?: string) => {
    if (!collectionId) {
      return;
    }

    onNavigate('home', { collectionId });
  };

  const openItem = async (item: LibraryMockItem) => {
    const fallbackCollectionId = item.collectionId || FALLBACK_LIBRARY_COLLECTION_ID;

    const resolvedPlayback = (item.assetType === 'audio' || item.assetType === 'video')
      ? await api.resolveMediaPlayback(item.id)
      : null;

    const resolvedUrl = resolvedPlayback?.source.url ?? item.assetUrl;
    const resolvedTitle = resolvedPlayback?.item.title ?? item.assetTitle ?? item.title;

    if (item.assetType === 'audio' && resolvedUrl) {
      onNavigate('player_audio', {
        collectionId: fallbackCollectionId,
        mediaItemId: item.id,
        assetUrl: resolvedUrl,
        assetTitle: resolvedTitle,
      });
      return;
    }

    if (item.assetType === 'video' && resolvedUrl) {
      onNavigate('player_video', {
        collectionId: fallbackCollectionId,
        mediaItemId: item.id,
        assetUrl: resolvedUrl,
        assetTitle: resolvedTitle,
      });
      return;
    }

    openCollection(item.collectionId);
  };

  const LibraryFilterDrawer = () => (
    <CollectionFiltersModal
      availableOptions={availableCollectionFilterOptions}
      activeFilters={libraryCollectionFilters}
      onToggleFilter={toggleLibraryCollectionFilter}
      onClear={clearLibraryFilters}
      onClose={() => setShowLibraryFilters(false)}
      resultsCount={currentLibraryItems.length === 0 ? 0 : (isVideoHub ? sortedVideoItems.length : sortedCompactItems.length)}
      onOpenBncc={() => setShowLibraryBnccPicker(true)}
    />
  );

  const LibraryBnccPicker = () => (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={closeLibraryBnccPicker} />

      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#fcfbff] shadow-2xl md:h-[82vh] md:w-[720px] md:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-5 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-green-600">Filtro pedagógico</p>
            <h2 className="mt-1 text-xl font-black text-gray-800">Selecionar BNCC</h2>
            <p className="mt-1 text-sm text-gray-500">
              Encontre habilidades por código para refinar os itens desta biblioteca.
            </p>
          </div>

          <button
            type="button"
            onClick={closeLibraryBnccPicker}
            aria-label="Fechar seletor de BNCC"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200"
          >
            <Icons.X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 md:px-6">
          <div className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
            <label className="flex items-center gap-3 rounded-[20px] border border-gray-200 bg-white px-4 py-3 shadow-sm transition-colors focus-within:border-green-300 focus-within:ring-2 focus-within:ring-green-100">
              <Icons.Search size={16} className="text-gray-400" />
              <input
                type="search"
                value={libraryBnccQuery}
                onChange={(event) => setLibraryBnccQuery(event.target.value)}
                placeholder="Pesquisar código BNCC"
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {filteredLibraryBnccOptions.map((code) => {
              const isActive = libraryCollectionFilters.bncc.includes(code);

              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleLibraryCollectionFilter('bncc', code)}
                  className={`rounded-xl border px-4 py-2 text-sm font-bold transition-all active:scale-95 ${isActive
                    ? 'bg-green-500 text-white border-green-500 shadow-md shadow-green-500/20'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-green-500/30'
                    }`}
                >
                  {code}
                </button>
              );
            })}
          </div>

          {filteredLibraryBnccOptions.length === 0 && (
            <div className="mt-6 rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
              Nenhuma habilidade encontrada para esse termo.
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex gap-4">
          <button
            type="button"
            onClick={clearLibraryBnccFilters}
            className="px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Limpar
          </button>
          <Button fullWidth onClick={closeLibraryBnccPicker}>
            <Icons.Check size={20} />
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );

  const renderLibraryGridCard = (item: LibraryMockItem, itemIndex: number, cardClassName: string) => {
    if (isVideoHub || isMusicHub) {
      const HoverIcon = isVideoHub ? Icons.Play : Icons.Headphones;
      const mediaMetaLabel = getMediaCardMetaLabel(item);
      const videoProgressPercent = isVideoHub
        ? Math.max(0, Math.min(100, Math.round(item.progress ?? 0)))
        : 0;
      const hasVideoProgress = isVideoHub && videoProgressPercent > 0;

      return (
        <CardContainer
          key={`${item.id}-${itemIndex}`}
          item={item}
          onOpen={openItem}
          className={cardClassName}
        >
          <div className="relative aspect-square overflow-hidden rounded-[1rem] border border-kaboo-primary/10 bg-slate-100">
            {item.coverImage ? (
              <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_left,rgba(93,31,88,0.14),transparent_55%),linear-gradient(180deg,#f8f4fa,#f2ebf5)]" />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.34))]" />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-200 group-hover:bg-black/24" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-black/60 text-white opacity-0 scale-95 shadow-lg backdrop-blur-[2px] transition-all duration-200 group-hover:opacity-100 group-hover:scale-100">
                <HoverIcon size={18} className={isVideoHub ? 'fill-current stroke-none' : 'stroke-[2.2px]'} />
              </span>
            </span>

            {hasVideoProgress && (
              <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block h-1 bg-black/25">
                <span
                  className="block h-full bg-red-500"
                  style={{ width: `${videoProgressPercent}%` }}
                  aria-label={`Assistido ${videoProgressPercent}%`}
                />
              </span>
            )}
          </div>

          <div className="mt-2.5 min-w-0">
            <h3 className="line-clamp-2 text-[0.95rem] font-black leading-[1.2] tracking-[-0.02em] text-kaboo-primary">
              {item.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-[12px] text-gray-500">{item.relatedCollection || item.eyebrow}</p>
            {mediaMetaLabel && (
              <p className="mt-1 line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-kaboo-primary/65">{mediaMetaLabel}</p>
            )}
          </div>
        </CardContainer>
      );
    }

    return (
      <CardContainer
        key={`${item.id}-${itemIndex}`}
        item={item}
        onOpen={openItem}
        className={cardClassName}
      >
        <div className="w-20 shrink-0">
          {renderItemPreview(item)}
        </div>

        {renderMinimalLibraryCardBody(item)}
      </CardContainer>
    );
  };

  const renderMediaRailBlocks = (
    cardClassName: string,
    gridClassName: string,
    emptyTitle: string,
    options?: {
      compactMode?: boolean;
      flatItems?: LibraryMockItem[];
    },
  ) => {
    if (options?.compactMode) {
      const flatItems = options.flatItems ?? [];

      if (flatItems.length > 0) {
        return (
          <section className="mt-3">
            <div className="mb-3 flex items-start justify-between gap-3 px-1">
              <div>
                <h3 className="text-[0.98rem] font-black tracking-[-0.03em] text-kaboo-primary">
                  Todos os conteúdos ({flatItems.length})
                </h3>
                <p className="mt-1 text-[12px] leading-5 text-gray-500">
                  Ordenado por relevância pedagógica, use filtros para refinar.
                </p>
              </div>
            </div>

            <div className={`grid gap-3 ${gridClassName}`}>
              {flatItems.map((item, itemIndex) => renderLibraryGridCard(item, itemIndex, cardClassName))}
            </div>
          </section>
        );
      }

      return (
        <div className="mt-4 rounded-[1.35rem] border border-dashed border-kaboo-primary/18 bg-white/90 px-5 py-8 text-center shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/55">Nenhum resultado</p>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {emptyTitle}
          </p>
        </div>
      );
    }

    if (mediaHeroItem) {
      return (
        <>
          <section className="mt-3">
            <div className="mb-4 flex items-center justify-between gap-3 px-1">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/60">Em destaque</p>
                <h3 className="mt-1 text-[1rem] font-black tracking-[-0.03em] text-kaboo-primary">Destaque da semana</h3>
              </div>
              <span className="inline-flex items-center rounded-full border border-kaboo-primary/12 bg-white/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-kaboo-primary/75 shadow-sm">
                Curadoria Kaboo
              </span>
            </div>

            <div className={`grid gap-3 ${gridClassName}`}>
              {renderLibraryGridCard(mediaHeroItem, 0, cardClassName)}
            </div>
          </section>

          {mediaRailSections.map((shelf) => (
            <section key={shelf.id} className="mt-6">
              <div className="mb-3 flex items-start justify-between gap-3 px-1">
                <div>
                  <h3 className="text-[0.98rem] font-black tracking-[-0.03em] text-kaboo-primary">{shelf.title}</h3>
                  {shelf.description && (
                    <p className="mt-1 text-[12px] leading-5 text-gray-500">{shelf.description}</p>
                  )}
                </div>
                {shelf.type === 'continue_watching' && (
                  <span className="inline-flex items-center rounded-full border border-kaboo-primary/10 bg-kaboo-primary/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-kaboo-primary shadow-sm">
                    {isMusicHub ? 'Continue ouvindo' : 'Continue assistindo'}
                  </span>
                )}
              </div>

              <div className={`grid gap-3 ${gridClassName}`}>
                {shelf.items.map((item, itemIndex) => renderLibraryGridCard(item, itemIndex, cardClassName))}
              </div>
            </section>
          ))}
        </>
      );
    }

    if (mediaRailSections.length > 0) {
      return (
        <>
          {mediaRailSections.map((shelf) => (
            <section key={shelf.id} className="mt-6">
              <div className="mb-3 flex items-start justify-between gap-3 px-1">
                <div>
                  <h3 className="text-[0.98rem] font-black tracking-[-0.03em] text-kaboo-primary">{shelf.title}</h3>
                  {shelf.description && (
                    <p className="mt-1 text-[12px] leading-5 text-gray-500">{shelf.description}</p>
                  )}
                </div>
                {shelf.type === 'continue_watching' && (
                  <span className="inline-flex items-center rounded-full border border-kaboo-primary/10 bg-kaboo-primary/[0.08] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-kaboo-primary shadow-sm">
                    {isMusicHub ? 'Continue ouvindo' : 'Continue assistindo'}
                  </span>
                )}
              </div>

              <div className={`grid gap-3 ${gridClassName}`}>
                {shelf.items.map((item, itemIndex) => renderLibraryGridCard(item, itemIndex, cardClassName))}
              </div>
            </section>
          ))}
        </>
      );
    }

    return (
      <div className="mt-4 rounded-[1.35rem] border border-dashed border-kaboo-primary/18 bg-white/90 px-5 py-8 text-center shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/55">Nenhum resultado</p>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          {emptyTitle}
        </p>
      </div>
    );
  };

  return (
    <div className={`flex h-full flex-col ${screenSurface.page} pb-24 md:pb-0`}>
      <PageHeader
        title={config.title}
        onBack={() => onNavigate('home')}
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8 md:px-8 md:pb-12">
        <div className="mx-auto max-w-6xl">
          {isVideoHub ? (
            <>
              <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/55 animate-fade-in-up">
                <span>Bibliotecas</span>
                <span className="text-kaboo-primary/25">/</span>
                <span className="text-kaboo-primary/72">Vídeos</span>
              </div>

              <section className="animate-fade-in-up rounded-[1.35rem] border border-kaboo-primary/10 bg-white/92 px-4 py-3.5 shadow-[0_16px_34px_rgba(93,31,88,0.04)] md:px-5">
                <div className="flex w-full flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="flex flex-1 items-center gap-3 rounded-[0.95rem] border border-kaboo-primary/10 bg-white px-3 py-2.5 text-sm text-gray-500 shadow-sm transition-colors focus-within:border-kaboo-primary/30 focus-within:ring-2 focus-within:ring-kaboo-primary/10">
                      <Icons.Search size={16} className="text-kaboo-primary/55" />
                      <input
                        type="search"
                        value={videoQuery}
                        onChange={(event) => setVideoQuery(event.target.value)}
                        placeholder="Pesquisar por título, coleção ou contexto de uso"
                        aria-label="Pesquisar vídeos"
                        className="min-w-0 flex-1 bg-transparent text-[14px] text-kaboo-primary outline-none placeholder:text-gray-400"
                      />
                      <span className="ml-auto inline-flex items-center rounded-full bg-kaboo-primary/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-kaboo-primary/72">
                        {sortedVideoItems.length} resultados
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowLibraryFilters(true)}
                      className={`inline-flex h-10 items-center gap-2 rounded-[20px] border px-3 md:px-4 shadow-sm transition-all active:scale-95 ${activeLibraryFilterCount > 0 || showLibraryFilters
                        ? 'border-kaboo-primary bg-kaboo-primary text-white shadow-kaboo-primary/20'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-kaboo-primary/20 hover:bg-white'}`}
                      title="Refinar busca"
                    >
                      <Icons.Filter size={18} strokeWidth={activeLibraryFilterCount > 0 || showLibraryFilters ? 2.5 : 2} />
                      <span className="hidden text-sm font-bold md:inline">Filtros</span>
                      {activeLibraryFilterCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black text-white">
                          {activeLibraryFilterCount}
                        </span>
                      )}
                    </button>

                  </div>

                  {hasLibraryFiltersApplied && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {libraryCollectionFilters.characters.map((value) => (
                        <button
                          key={`character-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('characters', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.bncc.map((value) => (
                        <button
                          key={`bncc-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('bncc', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.casel.map((value) => (
                        <button
                          key={`casel-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('casel', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.age.map((value) => (
                        <button
                          key={`age-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('age', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                    </div>
                  )}

                  {videoFilterTabs.length > 0 && (
                    <div className="-mx-0.5 flex items-center gap-2 overflow-x-auto px-0.5 pb-0.5 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {videoFilterTabs.map((filter) => (
                        <button
                          key={`video-filter-${filter.label}`}
                          type="button"
                          onClick={() => setVideoActiveFilter(filter.label)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${filter.active
                            ? ACTIVE_LIBRARY_TAB_CLASS
                            : NEUTRAL_LIBRARY_TAB_CLASS}`}
                        >
                          <span>{filter.label}</span>
                          <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[9px] leading-none text-kaboo-primary/70">
                            {filter.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-4 animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0 }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-[1.08rem] font-black leading-[1] tracking-[-0.03em] text-kaboo-primary md:text-[1.2rem]">
                      {sortedVideoItems.length} entradas disponíveis para explorar.
                    </h2>
                    {mediaSourceStatus === 'loading' && (
                      <p className="mt-1 text-xs font-semibold text-kaboo-primary/55">
                        Atualizando catálogo de vídeos.
                      </p>
                    )}
                    {mediaSourceStatus === 'fallback' && (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Exibindo catálogo de apoio enquanto os dados remotos não respondem.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setVideoSortMode('recentes')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${videoSortMode === 'recentes' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS}`}
                    >
                      <Icons.ArrowUpDown size={14} />
                      Mais recentes
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSortMode('titulo')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${videoSortMode === 'titulo' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS}`}
                    >
                      <Icons.Type size={14} />
                      A-Z
                    </button>
                  </div>
                </div>

                {shouldUseMediaApi && mediaSourceStatus !== 'fallback'
                  ? renderMediaRailBlocks(
                    'group rounded-[1.2rem] border border-[#eaddeb] bg-white p-2.5 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(93,31,88,0.08)] active:scale-[0.995]',
                    'sm:grid-cols-2 xl:grid-cols-3',
                    'Ajuste a busca ou limpe os filtros para voltar ao acervo completo.',
                    {
                      compactMode: videoActiveFilter === 'Todos' && sortedVideoItems.length <= 10,
                      flatItems: sortedVideoItems,
                    },
                  )
                  : (
                    <>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {sortedVideoItems.map((item, itemIndex) => renderLibraryGridCard(
                          item,
                          itemIndex,
                          'group rounded-[1.2rem] border border-[#eaddeb] bg-white p-2.5 shadow-[0_10px_24px_rgba(93,31,88,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(93,31,88,0.08)] active:scale-[0.995]',
                        ))}
                      </div>

                      {sortedVideoItems.length === 0 && (
                        <div className="mt-4 rounded-[1.35rem] border border-dashed border-kaboo-primary/18 bg-white/90 px-5 py-8 text-center shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/55">Nenhum resultado</p>
                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            Ajuste a busca ou limpe os filtros para voltar ao acervo completo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
              </section>
            </>
          ) : (
            <>
              <div className="mb-4 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/55 animate-fade-in-up">
                <span>Bibliotecas</span>
                <span className="text-kaboo-primary/25">/</span>
                <span className="text-kaboo-primary/72">{config.title}</span>
              </div>

              <section className="animate-fade-in-up rounded-[1.35rem] border border-kaboo-primary/10 bg-white/92 px-4 py-3.5 shadow-[0_16px_34px_rgba(27,31,35,0.04)] md:px-5">
                <div className="flex w-full flex-col gap-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <label className="flex flex-1 items-center gap-3 rounded-[0.95rem] border border-kaboo-primary/10 bg-white px-3 py-2.5 text-sm text-gray-500 shadow-sm transition-colors focus-within:border-kaboo-primary/30 focus-within:ring-2 focus-within:ring-kaboo-primary/10">
                      <Icons.Search size={16} className="text-kaboo-primary/55" />
                      <input
                        type="search"
                        value={compactQuery}
                        onChange={(event) => setCompactQuery(event.target.value)}
                        placeholder="Pesquisar por título, coleção ou contexto de uso"
                        aria-label={`Pesquisar em ${config.title}`}
                        className="min-w-0 flex-1 bg-transparent text-[14px] text-kaboo-primary outline-none placeholder:text-gray-400"
                      />
                      <span className="ml-auto inline-flex items-center rounded-full bg-kaboo-primary/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-kaboo-primary/72">
                        {sortedCompactItems.length} resultados
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowLibraryFilters(true)}
                      className={`inline-flex h-10 items-center gap-2 rounded-[20px] border px-3 md:px-4 shadow-sm transition-all active:scale-95 ${activeLibraryFilterCount > 0 || showLibraryFilters
                        ? 'border-kaboo-primary bg-kaboo-primary text-white shadow-kaboo-primary/20'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-kaboo-primary/20 hover:bg-white'}`}
                      title="Refinar busca"
                    >
                      <Icons.Filter size={18} strokeWidth={activeLibraryFilterCount > 0 || showLibraryFilters ? 2.5 : 2} />
                      <span className="hidden text-sm font-bold md:inline">Filtros</span>
                      {activeLibraryFilterCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black text-white">
                          {activeLibraryFilterCount}
                        </span>
                      )}
                    </button>

                  </div>

                  {hasLibraryFiltersApplied && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {libraryCollectionFilters.characters.map((value) => (
                        <button
                          key={`compact-character-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('characters', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.bncc.map((value) => (
                        <button
                          key={`compact-bncc-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('bncc', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.casel.map((value) => (
                        <button
                          key={`compact-casel-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('casel', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                      {libraryCollectionFilters.age.map((value) => (
                        <button
                          key={`compact-age-${value}`}
                          type="button"
                          onClick={() => toggleLibraryCollectionFilter('age', value)}
                          className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          {value}
                          <Icons.X size={12} />
                        </button>
                      ))}
                    </div>
                  )}

                  {compactFilterTabs.length > 0 && (
                    <div className="-mx-0.5 flex items-center gap-2 overflow-x-auto px-0.5 pb-0.5 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                      {compactFilterTabs.map((filter) => (
                        <button
                          key={`compact-filter-${filter.label}`}
                          type="button"
                          onClick={() => setCompactActiveFilter(filter.label)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition-all duration-200 ${filter.active
                            ? ACTIVE_LIBRARY_TAB_CLASS
                            : NEUTRAL_LIBRARY_TAB_CLASS}`}
                        >
                          <span>{filter.label}</span>
                          <span className="rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[9px] leading-none text-kaboo-primary/70">
                            {filter.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="mt-4 animate-fade-in-up" style={{ animationDelay: '100ms', opacity: 0 }}>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-[1.08rem] font-black leading-[1] tracking-[-0.03em] text-kaboo-primary md:text-[1.2rem]">
                      {compactSectionTitle}
                    </h2>
                    {isMusicHub && mediaSourceStatus === 'loading' && (
                      <p className="mt-1 text-xs font-semibold text-kaboo-primary/55">
                        Atualizando catálogo de músicas.
                      </p>
                    )}
                    {isMusicHub && mediaSourceStatus === 'fallback' && (
                      <p className="mt-1 text-xs font-semibold text-amber-700">
                        Exibindo catálogo de apoio enquanto os dados remotos não respondem.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setCompactSortMode('recentes')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${compactSortMode === 'recentes' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS}`}
                    >
                      <Icons.ArrowUpDown size={14} />
                      Recomendados
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompactSortMode('titulo')}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all duration-200 ${compactSortMode === 'titulo' ? ACTIVE_LIBRARY_TAB_CLASS : NEUTRAL_LIBRARY_TAB_CLASS}`}
                    >
                      <Icons.Type size={14} />
                      A-Z
                    </button>
                  </div>
                </div>

                {isMusicHub && shouldUseMediaApi && mediaSourceStatus !== 'fallback'
                  ? renderMediaRailBlocks(
                    `group rounded-[1.2rem] border border-kaboo-primary/10 p-2.5 shadow-[0_10px_24px_rgba(27,31,35,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(27,31,35,0.08)] active:scale-[0.995] ${screenSurface.card}`,
                    'sm:grid-cols-2 xl:grid-cols-3',
                    'Ajuste a busca ou limpe os filtros para voltar ao acervo completo.',
                    {
                      compactMode: compactActiveFilter === 'Todos' && sortedCompactItems.length <= 10,
                      flatItems: sortedCompactItems,
                    },
                  )
                  : (
                    <>
                      <div className={`mt-3 grid gap-3 ${isMusicHub ? 'sm:grid-cols-2 xl:grid-cols-3' : compactGridClassName}`}>
                        {sortedCompactItems.map((item, itemIndex) => renderLibraryGridCard(
                          item,
                          itemIndex,
                          `group ${isMusicHub ? 'rounded-[1.2rem] p-2.5' : 'flex items-center gap-3 rounded-[1.2rem] p-3'} border border-kaboo-primary/10 shadow-[0_10px_24px_rgba(27,31,35,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(27,31,35,0.08)] active:scale-[0.995] ${screenSurface.card}`,
                        ))}
                      </div>

                      {sortedCompactItems.length === 0 && (
                        <div className="mt-4 rounded-[1.35rem] border border-dashed border-kaboo-primary/18 bg-white/90 px-5 py-8 text-center shadow-sm">
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-kaboo-primary/55">Nenhum resultado</p>
                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            Ajuste a busca ou limpe os filtros para voltar ao acervo completo.
                          </p>
                        </div>
                      )}
                    </>
                  )}
              </section>
            </>
          )}
        </div>
      </div>

      {showLibraryFilters && <LibraryFilterDrawer />}
      {showLibraryBnccPicker && <LibraryBnccPicker />}
    </div>
  );
};