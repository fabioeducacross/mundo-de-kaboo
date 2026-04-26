import catalogSeed from '../catalog.seed.json';
import { inferCollectionAssets } from '../../lib/collectionAssets';
import { Collection, CollectionAssetCategory } from '../../types';
import { formationsLibraryMock } from './formations.mock';
import { materialsLibraryMock } from './materials.mock';
import { musicLibraryMock } from './music.mock';
import { videosLibraryMock } from './videos.mock';
import { LibraryHubData, LibraryHubKind, LibraryMockItem } from './types';

type CatalogSeed = {
    collections?: Collection[];
};

const collectionsById = new Map(
    (((catalogSeed as CatalogSeed).collections) ?? []).map((collection) => [collection.id, collection] as const)
);

const normalizeSearchText = (...values: Array<string | undefined>): string => {
    return values
        .filter(Boolean)
        .join(' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

const TEST_LIBRARY_ASSET_URLS: Record<LibraryMockItemVariant, string[]> = {
    video: [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    ],
    track: [
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
        'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    ],
    formation: [
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'https://www.africau.edu/images/default/sample.pdf',
    ],
    material: [
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'https://www.africau.edu/images/default/sample.pdf',
    ],
};

const getAssetTypeByVariant = (variant: LibraryMockItemVariant): NonNullable<LibraryMockItem['assetType']> => {
    if (variant === 'track') {
        return 'audio';
    }

    if (variant === 'video') {
        return 'video';
    }

    return 'pdf';
};

const getStableAssetIndex = (id: string, size: number): number => {
    if (size <= 1) {
        return 0;
    }

    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
        hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
    }

    return hash % size;
};

const bindStandaloneAsset = (item: LibraryMockItem): LibraryMockItem => {
    if (item.assetType && item.assetUrl) {
        return item;
    }

    const urls = TEST_LIBRARY_ASSET_URLS[item.variant] || [];
    if (urls.length === 0) {
        return item;
    }

    const assetType = getAssetTypeByVariant(item.variant);
    const assetUrl = urls[getStableAssetIndex(item.id, urls.length)];

    return {
        ...item,
        assetType,
        assetUrl,
        assetTitle: item.assetTitle ?? item.title,
        ctaLabel: item.variant === 'formation' ? 'Abrir guia' : getAssetCtaLabel(assetType),
    };
};

const getAssetCtaLabel = (assetType: NonNullable<LibraryMockItem['assetType']>): string => {
    if (assetType === 'audio') {
        return 'Ouvir agora';
    }

    if (assetType === 'video') {
        return 'Assistir agora';
    }

    return 'Abrir PDF';
};

const getPreferredVideoCategories = (item: LibraryMockItem): CollectionAssetCategory[] => {
    const itemContext = normalizeSearchText(item.title, item.eyebrow, item.meta, item.secondaryMeta);

    if (itemContext.includes('libras')) {
        return ['accessible_video', 'animation', 'how_to_play', 'video_lesson'];
    }

    if (itemContext.includes('jogar')) {
        return ['how_to_play', 'video_lesson', 'animation', 'accessible_video'];
    }

    if (itemContext.includes('videoaula')) {
        return ['video_lesson', 'how_to_play', 'animation', 'accessible_video'];
    }

    return ['animation', 'accessible_video', 'how_to_play', 'video_lesson'];
};

const bindCollectionAsset = (item: LibraryMockItem): LibraryMockItem => {
    const standaloneItem = bindStandaloneAsset(item);
    if (standaloneItem.assetType && standaloneItem.assetUrl) {
        return standaloneItem;
    }

    if (!item.collectionId) {
        return item;
    }

    const collection = collectionsById.get(item.collectionId);
    if (!collection) {
        return item;
    }

    const assets = inferCollectionAssets(collection);

    if (item.variant === 'track') {
        const asset = assets.find((candidate) => candidate.category === 'storytelling')
            ?? assets.find((candidate) => candidate.media_type === 'audio');

        if (!asset) {
            return item;
        }

        return {
            ...standaloneItem,
            assetType: 'audio',
            assetUrl: asset.url,
            assetTitle: item.title,
            ctaLabel: getAssetCtaLabel('audio'),
        };
    }

    if (item.variant === 'material' || item.variant === 'formation') {
        const asset = assets.find((candidate) => candidate.category === 'teacher_guide')
            ?? assets.find((candidate) => candidate.scope === 'library' && candidate.media_type === 'document');

        if (!asset) {
            return item;
        }

        return {
            ...standaloneItem,
            assetType: 'pdf',
            assetUrl: asset.url,
            assetTitle: item.title,
            ctaLabel: item.variant === 'formation' ? 'Abrir guia' : getAssetCtaLabel('pdf'),
        };
    }

    const videoAssets = assets.filter((candidate) => candidate.media_type === 'video');
    if (videoAssets.length === 0) {
        return item;
    }

    const preferredAsset = getPreferredVideoCategories(item)
        .map((category) => videoAssets.find((candidate) => candidate.category === category))
        .find(Boolean) ?? videoAssets[0];

    if (!preferredAsset) {
        return item;
    }

    return {
        ...standaloneItem,
        assetType: 'video',
        assetUrl: preferredAsset.url,
        assetTitle: item.title,
        ctaLabel: getAssetCtaLabel('video'),
    };
};

const bindHubAssets = (mock: LibraryHubData): LibraryHubData => {
    return {
        ...mock,
        featured: bindCollectionAsset(mock.featured),
        rails: mock.rails.map((rail) => ({
            ...rail,
            items: rail.items.map(bindCollectionAsset),
        })),
    };
};

export type { LibraryHubData, LibraryHubKind, LibraryMockItem, LibraryMockItemAssetType, LibraryMockItemVariant, LibraryRail } from './types';

export const LIBRARY_HUB_MOCKS: Record<LibraryHubKind, LibraryHubData> = {
    videos: bindHubAssets(videosLibraryMock),
    music: bindHubAssets(musicLibraryMock),
    formations: bindHubAssets(formationsLibraryMock),
    materials: bindHubAssets(materialsLibraryMock),
};