import {
    Collection,
    CollectionAsset,
    CollectionAssetCategory,
    CollectionAssetMediaType,
} from '../types';

type CollectionAssetScope = NonNullable<CollectionAsset['scope']>;

type CollectionAssetMeta = {
    label: string;
    mediaType: CollectionAssetMediaType;
    scope: CollectionAssetScope;
};

export const COLLECTION_ASSET_META: Record<CollectionAssetCategory, CollectionAssetMeta> = {
    reading: { label: 'Leitura', mediaType: 'document', scope: 'primary' },
    storytelling: { label: 'Audiolivro', mediaType: 'audio', scope: 'primary' },
    music: { label: 'Música', mediaType: 'audio', scope: 'primary' },
    animation: { label: 'Desenho Animado', mediaType: 'video', scope: 'primary' },
    accessible_video: { label: 'Com Libras', mediaType: 'video', scope: 'primary' },
    how_to_play: { label: 'Como Jogar', mediaType: 'video', scope: 'library' },
    video_lesson: { label: 'Videoaula', mediaType: 'video', scope: 'library' },
    formation: { label: 'Formação', mediaType: 'video', scope: 'library' },
    story_video: { label: 'Contação de Histórias', mediaType: 'video', scope: 'primary' },
    teacher_guide: { label: 'Guia do Professor', mediaType: 'document', scope: 'library' },
    extra_material: { label: 'Material Extra', mediaType: 'document', scope: 'library' },
};

const COLLECTION_ASSET_ORDER: CollectionAssetCategory[] = [
    'reading',
    'storytelling',
    'music',
    'animation',
    'accessible_video',
    'story_video',
    'how_to_play',
    'video_lesson',
    'formation',
    'teacher_guide',
    'extra_material',
];

const LEGACY_VIDEO_PRIORITY: CollectionAssetCategory[] = [
    'animation',
    'story_video',
    'accessible_video',
    'how_to_play',
    'video_lesson',
    'formation',
];

const normalizeText = (value?: string | null): string => (value ?? '').trim();

const normalizeUrl = (value?: string | null): string => (value ?? '').trim();

const normalizeSearchText = (...values: Array<string | null | undefined>): string => {
    return values
        .map((value) => normalizeText(value))
        .filter(Boolean)
        .join(' ')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

const createStableHash = (value: string): string => {
    let hash = 0;

    for (let index = 0; index < value.length; index += 1) {
        hash = (hash << 5) - hash + value.charCodeAt(index);
        hash |= 0;
    }

    return Math.abs(hash).toString(36);
};

const getUrlFileName = (url: string): string => {
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
        return '';
    }

    const withoutQuery = normalizedUrl.split('#')[0]?.split('?')[0] ?? normalizedUrl;
    const fileName = withoutQuery.split('/').pop() ?? '';

    return fileName.replace(/^\d+-[a-z0-9]+-/i, '');
};

const humanizeFileName = (url: string): string => {
    const fileName = getUrlFileName(url);
    if (!fileName) {
        return '';
    }

    return fileName
        .replace(/\.[a-z0-9]{1,6}$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const inferMediaTypeFromUrl = (
    url?: string | null,
    fallback: CollectionAssetMediaType = 'document'
): CollectionAssetMediaType => {
    const fileName = getUrlFileName(url ?? '').toLowerCase();

    if (/(\.mp3|\.wav|\.ogg|\.m4a|\.aac)$/i.test(fileName)) {
        return 'audio';
    }

    if (/(\.mp4|\.webm|\.mov|\.avi|\.m4v)$/i.test(fileName)) {
        return 'video';
    }

    return fallback;
};

const inferCategoryFromContext = (params: {
    url?: string | null;
    title?: string | null;
    scope?: CollectionAssetScope;
    mediaType?: CollectionAssetMediaType;
    fallbackCategory?: CollectionAssetCategory;
}): CollectionAssetCategory => {
    const { url, title, scope, mediaType, fallbackCategory } = params;
    const normalizedSource = normalizeSearchText(url, title);

    if (scope === 'library' || fallbackCategory === 'how_to_play' || fallbackCategory === 'video_lesson' || fallbackCategory === 'teacher_guide' || fallbackCategory === 'extra_material') {
        if (normalizedSource.includes('guia')) {
            return 'teacher_guide';
        }

        if (normalizedSource.includes('como jogar') || normalizedSource.includes('como_jogar')) {
            return 'how_to_play';
        }

        if (normalizedSource.includes('videoaula') || normalizedSource.includes('video aula') || normalizedSource.includes('video_aula')) {
            return 'video_lesson';
        }

        return fallbackCategory ?? 'extra_material';
    }

    if (normalizedSource.includes('libras')) {
        return 'accessible_video';
    }

    if (fallbackCategory) {
        return fallbackCategory;
    }

    if (mediaType === 'audio') {
        return 'storytelling';
    }

    if (mediaType === 'video') {
        return 'animation';
    }

    return 'reading';
};

const buildFallbackTitle = (category: CollectionAssetCategory, url: string): string => {
    const fileTitle = humanizeFileName(url);

    if (fileTitle && category === 'extra_material') {
        return fileTitle;
    }

    if (fileTitle && category === 'teacher_guide') {
        return COLLECTION_ASSET_META.teacher_guide.label;
    }

    return fileTitle || COLLECTION_ASSET_META[category].label;
};

const sortAssets = (assets: CollectionAsset[]): CollectionAsset[] => {
    return [...assets].sort((left, right) => {
        const orderDiff = COLLECTION_ASSET_ORDER.indexOf(left.category) - COLLECTION_ASSET_ORDER.indexOf(right.category);

        if (orderDiff !== 0) {
            return orderDiff;
        }

        const titleDiff = left.title.localeCompare(right.title, 'pt-BR');
        if (titleDiff !== 0) {
            return titleDiff;
        }

        return left.url.localeCompare(right.url, 'pt-BR');
    });
};

const normalizeAsset = (
    asset: Partial<CollectionAsset>,
    fallbackCategory?: CollectionAssetCategory
): CollectionAsset | null => {
    const url = normalizeUrl(asset.url);
    if (!url) {
        return null;
    }

    const mediaType = asset.media_type ?? inferMediaTypeFromUrl(url);
    const category = asset.category ?? inferCategoryFromContext({
        url,
        title: asset.title,
        scope: asset.scope,
        mediaType,
        fallbackCategory,
    });
    const meta = COLLECTION_ASSET_META[category];

    return {
        id: normalizeText(asset.id) || `${category}-${createStableHash(`${url}:${normalizeText(asset.title)}`)}`,
        category,
        media_type: asset.media_type ?? inferMediaTypeFromUrl(url, meta.mediaType),
        title: asset.title?.trim() ? asset.title : buildFallbackTitle(category, url),
        url,
        description: asset.description?.trim() ? asset.description : null,
        scope: asset.scope ?? meta.scope,
        lyrics_url: normalizeText(asset.lyrics_url) || null,
        ...(normalizeText(asset.cover_image) ? { cover_image: normalizeText(asset.cover_image) } : {}),
        // Preserve per-asset flags; undefined means "not set" (inherit / backward-compat default).
        ...(asset.offline_available !== undefined && asset.offline_available !== null
            ? { offline_available: asset.offline_available }
            : {}),
        ...(asset.is_published !== undefined && asset.is_published !== null
            ? { is_published: asset.is_published }
            : {}),
        ...(asset.download_available !== undefined && asset.download_available !== null
            ? { download_available: asset.download_available }
            : {}),
    };
};

const mergeAssetCandidate = (
    current: CollectionAsset | undefined,
    candidate: Partial<CollectionAsset>,
    fallbackCategory?: CollectionAssetCategory
): CollectionAsset | null => {
    return normalizeAsset(
        {
            id: current?.id ?? candidate.id,
            category: current?.category ?? candidate.category,
            media_type: current?.media_type ?? candidate.media_type,
            title: current?.title?.trim() ? current.title : candidate.title,
            url: candidate.url ?? current?.url,
            description: current?.description?.trim() ? current.description : candidate.description,
            scope: current?.scope ?? candidate.scope,
            lyrics_url: current?.lyrics_url ?? candidate.lyrics_url,
            cover_image: current?.cover_image ?? candidate.cover_image,
            // Per-asset flags: prefer current (already-stored) value over candidate
            offline_available: current?.offline_available ?? candidate.offline_available,
            is_published: current?.is_published ?? candidate.is_published,
            download_available: current?.download_available ?? candidate.download_available,
        },
        fallbackCategory ?? current?.category ?? candidate.category
    );
};

/**
 * Whether an asset/material may be downloaded by the end user.
 *
 * HARD RULE: videos can NEVER be downloaded, regardless of any flag. For every other
 * media type (PDF, slides, docs, images, audio…) download is allowed unless the admin
 * explicitly turned it off via `download_available === false`.
 *
 * Use this single function everywhere a download control is rendered so the rule
 * cannot drift between the storefront, the book view and the materials list.
 */
export const canDownloadCollectionAsset = (asset: {
    media_type?: CollectionAssetMediaType | null;
    download_available?: boolean | null;
}): boolean => {
    if (asset.media_type === 'video') {
        return false;
    }
    return asset.download_available !== false;
};

const addAssetCandidate = (
    assetsByUrl: Map<string, CollectionAsset>,
    candidate: Partial<CollectionAsset>,
    fallbackCategory?: CollectionAssetCategory
): void => {
    const url = normalizeUrl(candidate.url);
    if (!url) {
        return;
    }

    const mergedAsset = mergeAssetCandidate(assetsByUrl.get(url), { ...candidate, url }, fallbackCategory);
    if (mergedAsset) {
        assetsByUrl.set(url, mergedAsset);
    }
};

export const inferCollectionAssets = (collection: Partial<Collection>): CollectionAsset[] => {
    const assetsByUrl = new Map<string, CollectionAsset>();

    (collection.collection_assets ?? []).forEach((asset) => {
        addAssetCandidate(assetsByUrl, asset);
    });

    addAssetCandidate(assetsByUrl, {
        category: 'reading',
        media_type: 'document',
        title: COLLECTION_ASSET_META.reading.label,
        url: collection.pdf_url,
        scope: 'primary',
    }, 'reading');

    addAssetCandidate(assetsByUrl, {
        category: 'storytelling',
        media_type: 'audio',
        title: COLLECTION_ASSET_META.storytelling.label,
        url: collection.audio_url,
        scope: 'primary',
    }, 'storytelling');

    addAssetCandidate(assetsByUrl, {
        category: 'animation',
        media_type: 'video',
        title: COLLECTION_ASSET_META.animation.label,
        url: collection.video_url,
        scope: 'primary',
    }, 'animation');

    (collection.extra_materials ?? []).forEach((url) => {
        const inferredCategory = inferCategoryFromContext({
            url,
            scope: 'library',
            mediaType: inferMediaTypeFromUrl(url, 'document'),
        });

        addAssetCandidate(assetsByUrl, {
            category: inferredCategory,
            media_type: inferMediaTypeFromUrl(url, COLLECTION_ASSET_META[inferredCategory].mediaType),
            title: buildFallbackTitle(inferredCategory, url),
            url,
            scope: 'library',
        }, inferredCategory);
    });

    return sortAssets(Array.from(assetsByUrl.values()));
};

/**
 * After a new collection is saved and we have the collectionId,
 * move all assets from temp/ paths to permanent collectionId-scoped paths.
 * Returns updated CollectionAsset[] with permanent URLs.
 */
export async function promoteCollectionAssets(
    collectionId: string,
    assets: CollectionAsset[],
): Promise<CollectionAsset[]> {
    const promoted: CollectionAsset[] = [];

    for (const asset of assets) {
        if (!asset.url || !asset.url.includes('/temp/')) {
            // Already permanent or no URL - keep as-is
            promoted.push(asset);
            continue;
        }

        // Determine folder from URL path
        const urlPath = new URL(asset.url).pathname;
        const afterBucket = urlPath.split('/object/public/collections/')[1] ?? '';
        const folderMatch = afterBucket.match(/^([^/]+)\/temp\/(.+)$/);
        if (!folderMatch) {
            promoted.push(asset);
            continue;
        }

        const folder = folderMatch[1]; // e.g. 'audio', 'covers', 'pdfs'
        const fileName = folderMatch[2]; // original filename
        const newPath = `${folder}/${collectionId}/${fileName}`;

        const { moveFile } = await import('./storage');
        const newUrl = await moveFile(asset.url, newPath);

        promoted.push({ ...asset, url: newUrl ?? asset.url });
    }

    return promoted;
}

export const syncCollectionWithAssets = <T extends Partial<Collection>>(collectionLike: T) => {
    const collectionAssets = inferCollectionAssets(collectionLike);
    const firstReading = collectionAssets.find((asset) => asset.category === 'reading');
    const firstStorytelling = collectionAssets.find((asset) => asset.category === 'storytelling');
    const firstVideo = LEGACY_VIDEO_PRIORITY
        .map((category) => collectionAssets.find((asset) => asset.category === category))
        .find(Boolean);
    const libraryUrls = Array.from(
        new Set(
            collectionAssets
                .filter((asset) => asset.scope === 'library')
                .map((asset) => asset.url)
        )
    );

    return {
        ...collectionLike,
        collection_assets: collectionAssets,
        pdf_url: firstReading?.url ?? '',
        audio_url: firstStorytelling?.url ?? '',
        video_url: firstVideo?.url ?? '',
        extra_materials: libraryUrls,
    };
};
