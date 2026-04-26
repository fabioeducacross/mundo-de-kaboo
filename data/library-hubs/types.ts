export type LibraryHubKind = 'videos' | 'music' | 'formations' | 'materials';

export type LibraryMockItemVariant = 'video' | 'track' | 'formation' | 'material';

export type LibraryMockItemAssetType = 'audio' | 'video' | 'pdf';

export interface LibraryStatCard {
    id: string;
    eyebrow: string;
    value: string;
    title: string;
    description: string;
}

export interface LibraryMockItem {
    id: string;
    variant: LibraryMockItemVariant;
    eyebrow: string;
    title: string;
    description: string;
    meta: string;
    previewSteps?: number;
    secondaryMeta?: string;
    relatedCollection?: string;
    collectionId?: string;
    coverImage?: string;
    progress?: number;
    chips?: string[];
    ctaLabel: string;
    assetType?: LibraryMockItemAssetType;
    assetUrl?: string;
    assetTitle?: string;
}

export interface LibraryRail {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    items: LibraryMockItem[];
}

export interface LibraryHubData {
    title: string;
    eyebrow: string;
    badge: string;
    heroTitle: string;
    description: string;
    supportNote: string;
    accentClassName: string;
    accentSoftClassName: string;
    quickFilters: string[];
    statCards: LibraryStatCard[];
    featured: LibraryMockItem;
    rails: LibraryRail[];
}