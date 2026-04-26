import { supabase, isSupabaseConfigured } from './supabase';
import { deleteFile } from './storage';
import catalogSeed from '../data/catalog.seed.json';
import { LIBRARY_HUB_MOCKS, LibraryHubKind, LibraryMockItem } from '../data/library-hubs';
import {
  Character,
  Collection,
  CollectionResource,
  CentralMaterial,
  MediaAccessMode,
  MediaHub,
  MediaHubResponse,
  MediaItemCard,
  MediaItemDetail,
  MediaKind,
  MediaPlaybackSession,
  MediaPlaybackSource,
  MediaProvider,
  MediaRelatedCollection,
  MediaShelf,
  SaveMediaProgressInput,
  RegisterWithVoucherInput,
  RegisterWithVoucherResult,
  ToggleMediaFavoriteResult,
  UserProfile,
  Voucher,
  VoucherRedemptionResult,
  VoucherValidationResult,
} from '../types';
import { logger } from './logger';
import { buildAppUrl } from './appPaths';
import {
  getMockCharactersLive,
  mockCreateCharacter,
  mockUpdateCharacter,
  normalizeCharacter,
  normalizeCharacterLookupKey,
  setCharacterRegistrySnapshot,
  syncCollectionCharacters,
} from './characters';
import { syncCollectionWithAssets } from './collectionAssets';
import { getMockCentralMaterials } from './centralMaterials';
import {
  createMockUser,
  deleteMockUserById,
  getMockAllUsers,
  updateMockUserById,
  getMockCollectionResources,
  getMockCurrentUserId,
  getMockProfile,
  getMockUserProgress,
  getMockVoucherSamples,
  redeemMockVoucher,
  saveMockProfile,
  signInMockUser,
  signOutMockUser,
  validateMockVoucher,
  mockCreateCollection,
  mockUpdateCollection,
  mockDeleteCollection,
  getMockCollectionsLive,
  getMockCollectionByIdLive,
} from './mockData';
import {
  calculateRenewedAccessExpiry,
  getProfileAccessStatus,
  getVoucherErrorMessage,
  normalizeVoucherCode,
} from './access';
import { getActiveGrantsForUser, hasGrantForCollection } from './mockVoucherData';
import { normalizeSingleKitBookIds } from './collectionPresentation';

// Cache management for collections
const COLLECTIONS_CACHE_KEY = 'kaboo_collections_cache';
const PROFILE_CACHE_KEY = 'kaboo_profile_cache';
const SESSION_KEY = 'kaboo_session_id';

// DEV-only: flag indicating we're running with a mock demo user despite Supabase being configured
// Persisted in sessionStorage so it survives HMR and page reloads
const DEV_MOCK_SESSION_KEY = 'kaboo_dev_mock_session';
let devMockSession = import.meta.env.DEV && sessionStorage.getItem(DEV_MOCK_SESSION_KEY) === '1';

function setDevMockSession(value: boolean) {
  devMockSession = value;
  if (value) {
    sessionStorage.setItem(DEV_MOCK_SESSION_KEY, '1');
  } else {
    sessionStorage.removeItem(DEV_MOCK_SESSION_KEY);
  }
}

/** Check if we're in a DEV mock session (demo user with Supabase configured) */
export function isDevMockSession(): boolean {
  return devMockSession;
}
const DEV_SUPABASE_VOUCHER_FALLBACKS: Record<string, Voucher['duration_months']> = {
  'KABOO-LIVR-0001': 3,
};

let userProgressTableAvailable: boolean | null = null;
let charactersTableAvailable: boolean | null = null;
let remoteCharactersCache: Character[] | null = null;
let mediaTablesAvailable: boolean | null = null;

type MediaItemRow = {
  id: string;
  hub: MediaHub;
  media_kind: MediaKind;
  provider: MediaProvider;
  access_mode: MediaAccessMode;
  title: string;
  summary?: string | null;
  description?: string | null;
  status: 'draft' | 'published' | 'archived' | 'failed';
  storage_bucket?: string | null;
  storage_path?: string | null;
  thumbnail_bucket?: string | null;
  thumbnail_path?: string | null;
  external_url?: string | null;
  external_ref?: string | null;
  mime_type?: string | null;
  duration_seconds?: number | null;
  featured_order?: number | null;
  metadata?: Record<string, unknown> | null;
};

const cloneCharacters = (characters: Character[]): Character[] => {
  return JSON.parse(JSON.stringify(characters)) as Character[];
};

const isMissingUserProgressError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const combinedMessage = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();

  return candidate.code === 'PGRST205'
    || candidate.code === '42P01'
    || combinedMessage.includes('user_progress');
};

const PRESENTATION_SEED_COLLECTIONS_BY_ID = new Map(
  (((catalogSeed as { collections?: Collection[] }).collections) || []).map((collection) => [collection.id, collection])
);

const hydrateCollectionPresentationFields = (collection: Collection, characters?: Character[]): Collection => {
  const seedCollection = PRESENTATION_SEED_COLLECTIONS_BY_ID.get(collection.id);
  const normalizedKitBookIds = normalizeSingleKitBookIds(collection.kit_book_ids);

  if (!seedCollection) {
    return syncCollectionCharacters(syncCollectionWithAssets({
      ...collection,
      kit_book_ids: normalizedKitBookIds,
    }), characters);
  }

  return syncCollectionCharacters(syncCollectionWithAssets({
    ...seedCollection,
    ...collection,
    collection_type: collection.collection_type ?? seedCollection.collection_type,
    kit_cover_image: collection.kit_cover_image ?? seedCollection.kit_cover_image ?? null,
    kit_book_ids: normalizedKitBookIds.length > 0
      ? normalizedKitBookIds
      : seedCollection.kit_book_ids ?? [],
    collection_assets: (collection.collection_assets?.length ?? 0) > 0
      ? collection.collection_assets
      : seedCollection.collection_assets,
  }), characters);
};

const hydrateCollectionsPresentationFields = (collections: Collection[], characters?: Character[]): Collection[] => {
  return collections.map((collection) => hydrateCollectionPresentationFields(collection, characters));
};

const sanitizeCollectionPayload = (collection: Partial<Collection>, characters?: Character[]): Partial<Collection> => {
  const syncedCollection = syncCollectionCharacters(syncCollectionWithAssets(collection), characters);

  return syncedCollection;
};

const isMissingColumnError = (error: unknown, columnName: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: string; details?: string };
  const combinedMessage = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();

  return combinedMessage.includes(columnName.toLowerCase());
};

const isMissingRelationError = (error: unknown, relationName: string): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { code?: string; message?: string; details?: string };
  const combinedMessage = `${candidate.message ?? ''} ${candidate.details ?? ''}`.toLowerCase();

  return candidate.code === 'PGRST205'
    || candidate.code === '42P01'
    || (combinedMessage.includes(relationName.toLowerCase()) && combinedMessage.includes('does not exist'))
    || (combinedMessage.includes(relationName.toLowerCase()) && combinedMessage.includes('could not find'));
};

const mapLibraryHubToMediaHub = (hub: LibraryHubKind): MediaHub => hub;

const mapMockVariantToMediaKind = (item: LibraryMockItem): MediaKind => {
  if (item.variant === 'video') {
    return 'video';
  }

  if (item.variant === 'track') {
    return 'audio';
  }

  if (item.variant === 'formation') {
    return 'training';
  }

  return 'document';
};

const mapMockAssetToProvider = (item: LibraryMockItem): MediaProvider => {
  if (item.assetType === 'audio' && item.assetUrl?.includes('youtube')) {
    return 'youtube';
  }

  if (item.assetType === 'video' && item.assetUrl?.includes('youtube')) {
    return 'youtube';
  }

  if (item.assetType === 'audio') {
    return 'external_audio';
  }

  return 'internal';
};

const buildMockMediaItemCard = (hub: MediaHub, item: LibraryMockItem): MediaItemCard => ({
  id: item.id,
  hub,
  kind: mapMockVariantToMediaKind(item),
  title: item.title,
  summary: item.meta,
  description: item.description,
  thumbnailUrl: item.coverImage ?? null,
  durationSeconds: null,
  featuredOrder: 0,
  collectionId: item.collectionId ?? null,
  collectionTitle: item.relatedCollection ?? null,
  provider: mapMockAssetToProvider(item),
  locked: false,
  isFavorite: false,
  progressPercent: item.progress ?? 0,
  lastPositionSeconds: undefined,
  badges: item.chips ?? [],
});

const buildMockMediaHubResponse = (hub: MediaHub): MediaHubResponse => {
  const mock = LIBRARY_HUB_MOCKS[hub as LibraryHubKind];
  const hero = buildMockMediaItemCard(hub, mock.featured);
  const shelves: MediaShelf[] = mock.rails.map((rail) => ({
    id: rail.id,
    hub,
    type: 'rail',
    title: rail.title,
    description: rail.description,
    items: rail.items.map((item) => buildMockMediaItemCard(hub, item)),
  }));

  return {
    hub,
    hero,
    shelves,
    counts: {
      total: shelves.reduce((accumulator, shelf) => accumulator + shelf.items.length, 0) + 1,
      favorites: 0,
      continueWatching: 0,
    },
  };
};

const findMockMediaItem = (mediaItemId: string): { hub: MediaHub; item: LibraryMockItem } | null => {
  const hubs = Object.entries(LIBRARY_HUB_MOCKS) as Array<[LibraryHubKind, typeof LIBRARY_HUB_MOCKS[LibraryHubKind]]>;

  for (const [hub, mock] of hubs) {
    if (mock.featured.id === mediaItemId) {
      return { hub: mapLibraryHubToMediaHub(hub), item: mock.featured };
    }

    for (const rail of mock.rails) {
      const match = rail.items.find((item) => item.id === mediaItemId);
      if (match) {
        return { hub: mapLibraryHubToMediaHub(hub), item: match };
      }
    }
  }

  return null;
};

const getMediaItemResolvedUrl = (item: MediaItemRow): string | null => {
  const metadata = item.metadata ?? {};
  const metadataPlaybackUrl = typeof metadata.playback_url === 'string'
    ? metadata.playback_url
    : typeof metadata.resolved_url === 'string'
      ? metadata.resolved_url
      : null;

  if (item.provider === 'internal') {
    if (item.storage_bucket && item.storage_path && isSupabaseConfigured && !devMockSession) {
      const { data } = supabase.storage
        .from(item.storage_bucket)
        .getPublicUrl(item.storage_path);

      if (data.publicUrl) {
        return data.publicUrl;
      }
    }

    return metadataPlaybackUrl;
  }

  return item.external_url ?? metadataPlaybackUrl;
};

const getYouTubeVideoId = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (shortMatch?.[1]) {
    return shortMatch[1];
  }

  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch?.[1]) {
    return watchMatch[1];
  }

  const embedMatch = value.match(/(?:embed|shorts)\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch?.[1]) {
    return embedMatch[1];
  }

  return null;
};

const isDirectImageUrl = (value?: string | null): value is string => {
  if (!value) {
    return false;
  }

  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value);
};

const getMediaItemThumbnailUrl = (item: MediaItemRow): string | null => {
  const metadata = item.metadata ?? {};
  const metadataThumbnail = [
    metadata.thumbnail_url,
    metadata.thumbnailUrl,
    metadata.poster_url,
    metadata.posterUrl,
    metadata.image_url,
    metadata.imageUrl,
    metadata.cover_image,
    metadata.coverImage,
  ].find((value): value is string => typeof value === 'string' && value.length > 0) ?? null;

  if (item.thumbnail_bucket && item.thumbnail_path && isSupabaseConfigured && !devMockSession) {
    const { data } = supabase.storage
      .from(item.thumbnail_bucket)
      .getPublicUrl(item.thumbnail_path);

    if (data.publicUrl) {
      return data.publicUrl;
    }
  }

  if (metadataThumbnail) {
    return metadataThumbnail;
  }

  const youtubeVideoId = getYouTubeVideoId(item.external_url ?? item.external_ref ?? null);
  if (youtubeVideoId) {
    return `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;
  }

  if (isDirectImageUrl(item.external_url)) {
    return item.external_url;
  }

  return null;
};

const toMediaItemCard = (
  item: MediaItemRow,
  options?: {
    progressByItemId?: Record<string, { progressPercent: number; lastPositionSeconds: number }>;
    favoriteIds?: Set<string>;
    relatedCollections?: MediaRelatedCollection[];
  },
): MediaItemCard => {
  const progress = options?.progressByItemId?.[item.id];
  const primaryCollection = options?.relatedCollections?.[0];

  return {
    id: item.id,
    hub: item.hub,
    kind: item.media_kind,
    title: item.title,
    summary: item.summary ?? null,
    description: item.description ?? null,
    thumbnailUrl: getMediaItemThumbnailUrl(item),
    durationSeconds: item.duration_seconds ?? null,
    featuredOrder: item.featured_order ?? 0,
    collectionId: primaryCollection?.collectionId ?? null,
    collectionTitle: primaryCollection?.title ?? null,
    provider: item.provider,
    locked: false,
    isFavorite: options?.favoriteIds?.has(item.id) ?? false,
    progressPercent: progress?.progressPercent ?? 0,
    lastPositionSeconds: progress?.lastPositionSeconds,
    badges: [],
  };
};

const getCurrentUserId = async (): Promise<string | null> => {
  if (!isSupabaseConfigured || devMockSession) {
    return getMockCurrentUserId();
  }

  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
};

const getRemoteMediaUserState = async (userId: string) => {
  const [progressResult, favoritesResult] = await Promise.all([
    supabase
      .from('user_media_progress')
      .select('media_item_id, progress_percent, last_position_seconds, last_played_at')
      .eq('user_id', userId)
      .order('last_played_at', { ascending: false }),
    supabase
      .from('user_media_favorites')
      .select('media_item_id')
      .eq('user_id', userId),
  ]);

  const progressByItemId: Record<string, { progressPercent: number; lastPositionSeconds: number }> = {};
  const favoriteIds = new Set<string>();
  const continueItemIds: string[] = [];

  if (!progressResult.error) {
    (progressResult.data || []).forEach((entry: any) => {
      progressByItemId[entry.media_item_id] = {
        progressPercent: entry.progress_percent ?? 0,
        lastPositionSeconds: entry.last_position_seconds ?? 0,
      };

      if ((entry.progress_percent ?? 0) > 0 && (entry.progress_percent ?? 0) < 100) {
        continueItemIds.push(entry.media_item_id);
      }
    });
  }

  if (!favoritesResult.error) {
    (favoritesResult.data || []).forEach((entry: any) => {
      favoriteIds.add(entry.media_item_id);
    });
  }

  return { progressByItemId, favoriteIds, continueItemIds };
};

const loadRemoteCharacters = async (forceRefresh: boolean = false): Promise<Character[] | null> => {
  if (!isSupabaseConfigured || devMockSession || charactersTableAvailable === false) {
    return null;
  }

  if (!forceRefresh && remoteCharactersCache) {
    return cloneCharacters(remoteCharactersCache);
  }

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    if (isMissingRelationError(error, 'characters')) {
      charactersTableAvailable = false;
      logger.warn('characters table unavailable; falling back to local registry for this session.', error);
      return null;
    }

    logger.error('Error fetching characters:', error);
    return null;
  }

  const remoteCharacters = ((data || []) as Character[]).map((character) => normalizeCharacter(character));
  charactersTableAvailable = true;
  remoteCharactersCache = cloneCharacters(remoteCharacters);
  setCharacterRegistrySnapshot(remoteCharacters);

  return cloneCharacters(remoteCharacters);
};

const getSupabaseDevFallbackVoucher = (voucherCode: string): Voucher | null => {
  if (!import.meta.env.DEV || !isSupabaseConfigured) {
    return null;
  }

  const normalizedCode = normalizeVoucherCode(voucherCode);
  const durationMonths = DEV_SUPABASE_VOUCHER_FALLBACKS[normalizedCode];
  if (!durationMonths) {
    return null;
  }

  return {
    id: `dev-fallback-${normalizedCode.toLowerCase()}`,
    code: normalizedCode,
    duration_months: durationMonths,
    status: 'active',
    expires_at: null,
    consumed_at: null,
    consumed_by_user_id: null,
  };
};

const normalizeProfile = (profile: UserProfile): UserProfile => {
  return {
    ...profile,
    access_status: getProfileAccessStatus(profile)
  };
};

// Get or create session ID (unique per browser session)
const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// Clear collections cache
export const clearCollectionsCache = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(COLLECTIONS_CACHE_KEY);
  }
};

// Clear profile cache
export const clearProfileCache = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
  }
};

// Clear all user-related caches (profile, collections, session ID, and offline collections)
// This should be called when logging out to prevent showing previous user's data
export const clearAllUserCache = (): void => {
  if (typeof window !== 'undefined') {
    // Clear sessionStorage caches
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    sessionStorage.removeItem(COLLECTIONS_CACHE_KEY);
    sessionStorage.removeItem(SESSION_KEY);

    // Clear offline collections list (user-specific)
    localStorage.removeItem('offline_collections');

    // Clear Cache API (offline assets)
    if ('caches' in window) {
      caches.delete('kaboo-offline-v1').catch(err => {
        logger.error('Error clearing offline cache:', err);
      });
    }
  }
};

// Get cached collections if available
const getCachedCollections = (): Collection[] | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(COLLECTIONS_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    // Verify it's from the current session
    if (parsed.sessionId === getSessionId()) {
      const hydratedCollections = hydrateCollectionsPresentationFields(parsed.collections || []);

      if (JSON.stringify(hydratedCollections) !== JSON.stringify(parsed.collections || [])) {
        saveCollectionsCache(hydratedCollections);
      }

      return hydratedCollections;
    }
    // If session changed, clear old cache
    sessionStorage.removeItem(COLLECTIONS_CACHE_KEY);
    return null;
  } catch (error) {
    logger.error('Error reading collections cache:', error);
    return null;
  }
};

// Export function to get cached collections synchronously (for initial state)
export const getCachedCollectionsSync = (): Collection[] | null => {
  return getCachedCollections();
};

// Get cached profile if available
const getCachedProfile = async (): Promise<UserProfile | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    // Verify it's from the current session
    if (parsed.sessionId !== getSessionId()) {
      // If session changed, clear old cache
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    if (!isSupabaseConfigured) {
      const currentMockUserId = getMockCurrentUserId();
      if (!currentMockUserId || parsed.userId !== currentMockUserId) {
        sessionStorage.removeItem(PROFILE_CACHE_KEY);
        return null;
      }
      return parsed.profile;
    }

    // Verify the cached profile belongs to the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || parsed.userId !== user.id) {
      // User ID doesn't match - clear cache
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }

    return parsed.profile;
  } catch (error) {
    logger.error('Error reading profile cache:', error);
    return null;
  }
};

// Export function to get cached profile synchronously (for initial state)
// Note: This doesn't validate user ID, so it should only be used for initial display
// The actual profile fetch will validate and update if needed
export const getCachedProfileSync = (): UserProfile | null => {
  if (typeof window === 'undefined') return null;

  try {
    const cached = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    // Only verify session ID synchronously - user ID check happens async
    if (parsed.sessionId === getSessionId()) {
      if (!isSupabaseConfigured) {
        const currentMockUserId = getMockCurrentUserId();
        if (!currentMockUserId || parsed.userId !== currentMockUserId) {
          sessionStorage.removeItem(PROFILE_CACHE_KEY);
          return null;
        }
      }
      return parsed.profile;
    }
    // If session changed, clear old cache
    sessionStorage.removeItem(PROFILE_CACHE_KEY);
    return null;
  } catch (error) {
    logger.error('Error reading profile cache:', error);
    return null;
  }
};

// Save profile to cache
const saveProfileCache = async (profile: UserProfile): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    let userId = getMockCurrentUserId() || 'mock-anonymous';

    if (isSupabaseConfigured && !devMockSession) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;
    }

    const cacheData = {
      profile,
      userId,
      sessionId: getSessionId(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error saving profile cache:', error);
  }
};

// Save collections to cache
const saveCollectionsCache = (collections: Collection[]): void => {
  if (typeof window === 'undefined') return;

  try {
    const cacheData = {
      collections,
      sessionId: getSessionId(),
      timestamp: Date.now()
    };
    sessionStorage.setItem(COLLECTIONS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error saving collections cache:', error);
  }
};

export const api = {
  async signIn(email: string, password: string): Promise<{ success: boolean; profile?: UserProfile | null; error?: string }> {
    if (!isSupabaseConfigured) {
      const result = signInMockUser(email, password);
      if (result.success && result.profile) {
        await saveProfileCache(normalizeProfile(result.profile));
      }

      return {
        success: result.success,
        profile: result.profile || null,
        error: result.error
      };
    }

    // DEV-only: allow demo credentials even when Supabase is configured
    if (import.meta.env.DEV && isSupabaseConfigured) {
      const mockResult = signInMockUser(email, password);
      if (mockResult.success && mockResult.profile) {
        logger.warn('DEV: using mock demo user bypass for', email);
        setDevMockSession(true);
        clearCollectionsCache();
        await saveProfileCache(normalizeProfile(mockResult.profile));
        return { success: true, profile: mockResult.profile };
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        error: error.message
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: 'Nao foi possivel iniciar a sessao.'
      };
    }

    const profile = await this.getProfile(true);
    return {
      success: true,
      profile
    };
  },

  async signOut(): Promise<void> {
    const wasMockSession = devMockSession;
    clearAllUserCache();
    setDevMockSession(false);

    if (!isSupabaseConfigured) {
      signOutMockUser();
      return;
    }

    // Clean up mock session state if we were in a dev mock session
    if (wasMockSession) {
      signOutMockUser();
    }

    await supabase.auth.signOut();
  },

  async getVoucherSamples(): Promise<Voucher[]> {
    if (!isSupabaseConfigured || devMockSession) {
      return getMockVoucherSamples();
    }

    return [];
  },

  async validateVoucher(voucherCode: string): Promise<VoucherValidationResult> {
    if (!voucherCode.trim()) {
      return {
        success: false,
        code: 'invalid_code',
        message: getVoucherErrorMessage('invalid_code')
      };
    }

    if (!isSupabaseConfigured || devMockSession) {
      return validateMockVoucher(voucherCode);
    }

    try {
      const { data, error } = await supabase.rpc('validate_voucher', {
        p_code: normalizeVoucherCode(voucherCode)
      });

      if (error) {
        logger.error('Error validating voucher:', error);
        return {
          success: false,
          code: 'unknown',
          message: getVoucherErrorMessage('unknown', error.message)
        };
      }

      if (!data?.success) {
        const fallbackVoucher = data?.code === 'invalid_code'
          ? getSupabaseDevFallbackVoucher(voucherCode)
          : null;

        if (fallbackVoucher) {
          logger.warn('Using DEV Supabase voucher fallback during validation:', fallbackVoucher.code);
          return {
            success: true,
            voucher: fallbackVoucher,
          };
        }

        return {
          success: false,
          code: data?.code || 'unknown',
          message: getVoucherErrorMessage(data?.code) || data?.message
        };
      }

      return {
        success: true,
        voucher: data.voucher as Voucher | undefined
      };
    } catch (error: any) {
      logger.error('Unexpected voucher validation error:', error);
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown', error?.message)
      };
    }
  },

  async redeemVoucher(voucherCode: string): Promise<VoucherRedemptionResult> {
    if (!voucherCode.trim()) {
      return {
        success: false,
        code: 'invalid_code',
        message: getVoucherErrorMessage('invalid_code')
      };
    }

    if (!isSupabaseConfigured || devMockSession) {
      const result = redeemMockVoucher(voucherCode);
      if (result.success && result.profile) {
        await saveProfileCache(normalizeProfile(result.profile));
      }
      return result;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        code: 'not_authenticated',
        message: getVoucherErrorMessage('not_authenticated')
      };
    }

    try {
      const { data, error } = await supabase.rpc('redeem_voucher', {
        p_code: normalizeVoucherCode(voucherCode)
      });

      if (error) {
        logger.error('Error redeeming voucher:', error);
        return {
          success: false,
          code: 'unknown',
          message: getVoucherErrorMessage('unknown', error.message)
        };
      }

      if (!data?.success) {
        const fallbackVoucher = data?.code === 'invalid_code'
          ? getSupabaseDevFallbackVoucher(voucherCode)
          : null;

        if (fallbackVoucher) {
          logger.warn('Using DEV Supabase voucher fallback during redemption:', fallbackVoucher.code);
          return this.redeemSupabaseDevFallbackVoucher(fallbackVoucher);
        }

        return {
          success: false,
          code: data?.code || 'unknown',
          message: getVoucherErrorMessage(data?.code) || data?.message
        };
      }

      const profile = await this.getProfile(true);
      return {
        success: true,
        profile,
        voucher: data.voucher as Voucher | undefined,
        message: data?.message
      };
    } catch (error: any) {
      logger.error('Unexpected voucher redemption error:', error);
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown', error?.message)
      };
    }
  },

  async redeemSupabaseDevFallbackVoucher(voucher: Voucher): Promise<VoucherRedemptionResult> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        code: 'not_authenticated',
        message: getVoucherErrorMessage('not_authenticated')
      };
    }

    const currentProfile = await this.getProfile(true);
    const now = new Date();
    const nextProfile = await this.updateProfile({
      access_status: 'active',
      access_starts_at: currentProfile?.access_starts_at ?? now.toISOString(),
      access_expires_at: calculateRenewedAccessExpiry(currentProfile, voucher.duration_months, now),
    });

    if (!nextProfile) {
      return {
        success: false,
        code: 'unknown',
        message: getVoucherErrorMessage('unknown')
      };
    }

    return {
      success: true,
      profile: nextProfile,
      voucher,
    };
  },

  async registerWithVoucher(input: RegisterWithVoucherInput): Promise<RegisterWithVoucherResult> {
    const validation = await this.validateVoucher(input.voucherCode);
    if (!validation.success) {
      return {
        success: false,
        error: validation.message || getVoucherErrorMessage(validation.code)
      };
    }

    if (!isSupabaseConfigured) {
      const creation = createMockUser({
        email: input.email,
        password: input.password,
        full_name: input.full_name,
        role: 'viewer',
        signIn: true,
      });

      if (!creation.success || !creation.userId) {
        return {
          success: false,
          error: creation.error || 'Nao foi possivel criar sua conta.'
        };
      }

      const redemption = redeemMockVoucher(input.voucherCode);
      if (!redemption.success || !redemption.profile) {
        return {
          success: false,
          error: redemption.message || getVoucherErrorMessage(redemption.code)
        };
      }

      await saveProfileCache(normalizeProfile(redemption.profile));

      return {
        success: true,
        profile: redemption.profile
      };
    }

    try {
      const emailRedirectTo = typeof window !== 'undefined'
        ? buildAppUrl('?confirmation=success')
        : undefined;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          emailRedirectTo,
          data: {
            full_name: input.full_name,
          }
        }
      });

      if (signUpError) {
        logger.error('Error signing up with voucher:', signUpError);
        return { success: false, error: signUpError.message };
      }

      if (!signUpData.user) {
        return { success: false, error: 'Nao foi possivel criar a conta.' };
      }

      // O perfil inicial é criado pelo trigger handle_new_user no banco.
      // Evita erro de RLS quando o sign-up ainda não abriu sessão autenticada.

      if (!signUpData.session) {
        return {
          success: true,
          requiresLogin: true,
          requiresEmailConfirmation: true,
          email: input.email,
          message: 'Conta criada. Confirme seu e-mail para concluir o cadastro e depois faça login para ativar seu codigo de acesso.'
        };
      }

      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: signUpData.session.access_token,
        refresh_token: signUpData.session.refresh_token,
      });

      if (setSessionError) {
        logger.error('Error persisting session after sign up:', setSessionError);
        return {
          success: false,
          error: 'Conta criada, mas nao foi possivel finalizar a ativacao automaticamente. Tente entrar novamente para continuar.'
        };
      }

      let redemption = await this.redeemVoucher(input.voucherCode);
      if (!redemption.success && redemption.code === 'not_authenticated') {
        await new Promise((resolve) => setTimeout(resolve, 150));
        redemption = await this.redeemVoucher(input.voucherCode);
      }

      if (!redemption.success) {
        return {
          success: false,
          error: redemption.message || getVoucherErrorMessage(redemption.code)
        };
      }

      return {
        success: true,
        profile: redemption.profile || undefined
      };
    } catch (error: any) {
      logger.error('Unexpected registerWithVoucher error:', error);
      return {
        success: false,
        error: error?.message || 'Ocorreu um erro ao criar a conta.'
      };
    }
  },

  /**
   * Fetch all collections/books (with cache support)
   * @param forceRefresh - If true, bypass cache and fetch from server
   */
  async getCollections(forceRefresh: boolean = false): Promise<Collection[]> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedCollections();
      if (cached) {
        await loadRemoteCharacters();
        return cached;
      }
    }

    if (!isSupabaseConfigured || devMockSession) {
      const collections = getMockCollectionsLive();
      saveCollectionsCache(collections);
      return collections;
    }

    const remoteCharacters = await loadRemoteCharacters(forceRefresh);

    // Fetch from server
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching collections:', error);
      return [];
    }

    const collections = hydrateCollectionsPresentationFields((data || []) as Collection[], remoteCharacters ?? undefined);

    // Save to cache
    saveCollectionsCache(collections);

    return collections;
  },

  /**
   * Fetch a single collection by ID
   */
  async getCollectionById(id: string): Promise<Collection | null> {
    if (!isSupabaseConfigured || devMockSession) {
      return getMockCollectionByIdLive(id);
    }

    const remoteCharacters = await loadRemoteCharacters();

    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return hydrateCollectionPresentationFields(data as Collection, remoteCharacters ?? undefined);
  },

  /**
   * Fetch resources (files) for a specific collection
   */
  async getCollectionResources(collectionId: string): Promise<CollectionResource[]> {
    if (!isSupabaseConfigured) {
      return getMockCollectionResources(collectionId);
    }

    const { data, error } = await supabase
      .from('collection_resources')
      .select('*')
      .eq('collection_id', collectionId);

    if (error) return [];
    return data || [];
  },

  async getMediaHub(hub: MediaHub): Promise<MediaHubResponse> {
    if (!isSupabaseConfigured || devMockSession || mediaTablesAvailable === false) {
      return buildMockMediaHubResponse(hub);
    }

    const { data: items, error: itemsError } = await supabase
      .from('media_items')
      .select('*')
      .eq('hub', hub)
      .eq('status', 'published')
      .order('featured_order', { ascending: true })
      .order('published_at', { ascending: false });

    if (itemsError) {
      if (isMissingRelationError(itemsError, 'media_items')) {
        mediaTablesAvailable = false;
        return buildMockMediaHubResponse(hub);
      }

      logger.error('Error fetching media hub items:', itemsError);
      return buildMockMediaHubResponse(hub);
    }

    mediaTablesAvailable = true;

    const { data: shelves, error: shelvesError } = await supabase
      .from('media_shelves')
      .select('*')
      .eq('hub', hub)
      .eq('is_published', true)
      .order('order_index', { ascending: true });

    if (shelvesError && !isMissingRelationError(shelvesError, 'media_shelves')) {
      logger.error('Error fetching media shelves:', shelvesError);
    }

    const shelfIds = (shelves || []).map((shelf: any) => shelf.id);
    const { data: shelfItems } = shelfIds.length > 0
      ? await supabase
        .from('media_shelf_items')
        .select('*')
        .in('shelf_id', shelfIds)
        .order('order_index', { ascending: true })
      : { data: [] as any[] };

    const currentUserId = await getCurrentUserId();
    const { progressByItemId, favoriteIds, continueItemIds } = currentUserId
      ? await getRemoteMediaUserState(currentUserId)
      : { progressByItemId: {}, favoriteIds: new Set<string>(), continueItemIds: [] as string[] };

    const itemRows = ((items || []) as MediaItemRow[]);
    const itemsById = new Map(itemRows.map((item) => [item.id, item]));
    const hero = itemRows[0] ? toMediaItemCard(itemRows[0], { progressByItemId, favoriteIds }) : null;

    const mappedShelves: MediaShelf[] = (shelves || []).map((shelf: any) => {
      const itemsForShelf = (shelfItems || [])
        .filter((entry: any) => entry.shelf_id === shelf.id)
        .map((entry: any) => itemsById.get(entry.media_item_id))
        .filter(Boolean)
        .map((item) => toMediaItemCard(item as MediaItemRow, { progressByItemId, favoriteIds }));

      return {
        id: shelf.id,
        hub,
        type: shelf.shelf_type,
        title: shelf.title,
        description: shelf.description,
        items: itemsForShelf,
      };
    }).filter((shelf) => shelf.items.length > 0);

    const continueItems = continueItemIds
      .map((itemId) => itemsById.get(itemId))
      .filter(Boolean)
      .map((item) => toMediaItemCard(item as MediaItemRow, { progressByItemId, favoriteIds }));

    const continueShelf = continueItems.length > 0
      ? {
        id: `${hub}-continue-watching`,
        hub,
        type: 'continue_watching' as const,
        title: hub === 'music' ? 'Continue ouvindo' : 'Continue assistindo',
        description: 'Retome de onde parou.',
        items: continueItems,
      }
      : null;

    const orderedShelves: MediaShelf[] = continueShelf
      ? [continueShelf, ...mappedShelves.filter((shelf) => shelf.type !== 'continue_watching')]
      : mappedShelves;

    const fallbackShelf: MediaShelf[] = orderedShelves.length > 0
      ? orderedShelves
      : [{
        id: `${hub}-all-items`,
        hub,
        type: 'rail',
        title: 'Catálogo',
        description: 'Itens publicados desta biblioteca.',
        items: itemRows.map((item) => toMediaItemCard(item, { progressByItemId, favoriteIds })),
      }];

    return {
      hub,
      hero,
      shelves: fallbackShelf,
      counts: {
        total: itemRows.length,
        favorites: favoriteIds.size,
        continueWatching: Object.values(progressByItemId).filter((entry) => entry.progressPercent > 0 && entry.progressPercent < 100).length,
      },
    };
  },

  async getMediaItem(mediaItemId: string): Promise<MediaItemDetail | null> {
    if (!isSupabaseConfigured || devMockSession || mediaTablesAvailable === false) {
      const mockMatch = findMockMediaItem(mediaItemId);
      if (!mockMatch) {
        return null;
      }

      const relatedCollections: MediaRelatedCollection[] = mockMatch.item.collectionId
        ? [{
          collectionId: mockMatch.item.collectionId,
          title: mockMatch.item.relatedCollection ?? mockMatch.item.title,
          linkType: 'contextual',
        }]
        : [];

      return {
        ...buildMockMediaItemCard(mockMatch.hub, mockMatch.item),
        accessMode: 'active_subscription',
        metadata: {},
        relatedCollections,
      };
    }

    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaItemId)
      .single();

    if (error || !data) {
      if (error && isMissingRelationError(error, 'media_items')) {
        mediaTablesAvailable = false;
      }
      return null;
    }

    const { data: links } = await supabase
      .from('media_collection_links')
      .select('collection_id, link_type, collections(id, title)')
      .eq('media_item_id', mediaItemId);

    const relatedCollections: MediaRelatedCollection[] = ((links || []) as any[]).map((link) => ({
      collectionId: link.collection_id,
      title: link.collections?.title ?? 'Coleção relacionada',
      linkType: link.link_type,
    }));

    const currentUserId = await getCurrentUserId();
    const { progressByItemId, favoriteIds } = currentUserId
      ? await getRemoteMediaUserState(currentUserId)
      : { progressByItemId: {}, favoriteIds: new Set<string>(), continueItemIds: [] as string[] };

    return {
      ...toMediaItemCard(data as MediaItemRow, { progressByItemId, favoriteIds, relatedCollections }),
      accessMode: (data as MediaItemRow).access_mode,
      metadata: ((data as MediaItemRow).metadata ?? {}) as Record<string, unknown>,
      relatedCollections,
    };
  },

  async resolveMediaPlayback(mediaItemId: string): Promise<MediaPlaybackSession | null> {
    const item = await this.getMediaItem(mediaItemId);
    if (!item) {
      return null;
    }

    if (!isSupabaseConfigured || devMockSession || mediaTablesAvailable === false) {
      const mockMatch = findMockMediaItem(mediaItemId);
      if (!mockMatch) {
        return null;
      }

      const source: MediaPlaybackSource = {
        url: mockMatch.item.assetUrl ?? null,
        provider: buildMockMediaItemCard(mockMatch.hub, mockMatch.item).provider,
        mimeType: null,
      };

      return {
        item,
        source,
        canPlay: Boolean(source.url),
      };
    }

    const { data, error } = await supabase
      .from('media_items')
      .select('*')
      .eq('id', mediaItemId)
      .single();

    if (error || !data) {
      return null;
    }

    const row = data as MediaItemRow;
    const source: MediaPlaybackSource = {
      url: getMediaItemResolvedUrl(row),
      provider: row.provider,
      mimeType: row.mime_type ?? null,
      externalRef: row.external_ref ?? null,
      storageBucket: row.storage_bucket ?? null,
      storagePath: row.storage_path ?? null,
    };

    return {
      item,
      source,
      canPlay: Boolean(source.url || (source.storageBucket && source.storagePath)),
    };
  },

  async saveMediaProgress(input: SaveMediaProgressInput): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured || devMockSession) {
      return { ok: true };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return { ok: false, error: 'Usuário não autenticado.' };
    }

    const { error } = await supabase
      .from('user_media_progress')
      .upsert({
        user_id: userId,
        media_item_id: input.mediaItemId,
        last_position_seconds: input.lastPositionSeconds,
        progress_percent: input.progressPercent,
        completed_at: input.completed ? new Date().toISOString() : null,
        last_played_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,media_item_id',
      });

    if (error) {
      if (isMissingRelationError(error, 'user_media_progress')) {
        logger.warn('user_media_progress unavailable; skipping remote progress persistence for this environment.', error);
        return { ok: true };
      }

      logger.error('Error saving media progress:', error);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  },

  async toggleMediaFavorite(mediaItemId: string, shouldFavorite?: boolean): Promise<ToggleMediaFavoriteResult | null> {
    if (!isSupabaseConfigured || devMockSession) {
      return {
        mediaItemId,
        isFavorite: shouldFavorite ?? true,
      };
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return null;
    }

    let nextFavoriteState = shouldFavorite;

    if (typeof nextFavoriteState !== 'boolean') {
      const { data } = await supabase
        .from('user_media_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('media_item_id', mediaItemId)
        .maybeSingle();

      nextFavoriteState = !data;
    }

    if (nextFavoriteState) {
      const { error } = await supabase
        .from('user_media_favorites')
        .upsert({
          user_id: userId,
          media_item_id: mediaItemId,
        }, {
          onConflict: 'user_id,media_item_id',
        });

      if (error) {
        logger.error('Error favoriting media item:', error);
        return null;
      }
    } else {
      const { error } = await supabase
        .from('user_media_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('media_item_id', mediaItemId);

      if (error) {
        logger.error('Error unfavoriting media item:', error);
        return null;
      }
    }

    return {
      mediaItemId,
      isFavorite: nextFavoriteState,
    };
  },

  async getCentralMaterials(): Promise<CentralMaterial[]> {
    return getMockCentralMaterials();
  },

  async getCharacters(): Promise<Character[]> {
    if (!isSupabaseConfigured || devMockSession) {
      return getMockCharactersLive();
    }

    const remoteCharacters = await loadRemoteCharacters();
    return remoteCharacters ?? getMockCharactersLive();
  },

  async createCharacter(character: Partial<Character> & { name: string }): Promise<Character | null> {
    if (!isSupabaseConfigured || devMockSession) {
      try {
        return mockCreateCharacter(character);
      } catch (error) {
        logger.error('Error creating character:', error);
        return null;
      }
    }

    try {
      const payload = normalizeCharacter(character);
      const { data, error } = await supabase
        .from('characters')
        .insert(payload)
        .select()
        .single();

      if (error) {
        if (isMissingRelationError(error, 'characters')) {
          charactersTableAvailable = false;
          return mockCreateCharacter(character);
        }

        logger.error('Error creating character:', error);
        return null;
      }

      const nextCharacter = normalizeCharacter(data as Character);
      await loadRemoteCharacters(true);
      clearCollectionsCache();
      return nextCharacter;
    } catch (error) {
      logger.error('Error creating character:', error);
      return null;
    }
  },

  async updateCharacter(id: string, updates: Partial<Character>): Promise<Character | null> {
    if (!isSupabaseConfigured || devMockSession) {
      try {
        return mockUpdateCharacter(id, updates);
      } catch (error) {
        logger.error('Error updating character:', error);
        return null;
      }
    }

    try {
      const currentCharacters = await this.getCharacters();
      const currentCharacter = currentCharacters.find((character) => character.id === id);

      if (!currentCharacter) {
        return null;
      }

      const requestedName = updates.name?.trim() || currentCharacter.name;
      const hasRenamedCharacter =
        normalizeCharacterLookupKey(requestedName) !== normalizeCharacterLookupKey(currentCharacter.name);
      const aliases = hasRenamedCharacter
        ? [...(currentCharacter.aliases || []), ...(updates.aliases || []), currentCharacter.name]
        : updates.aliases ?? currentCharacter.aliases;

      const payload = normalizeCharacter({
        ...currentCharacter,
        ...updates,
        id,
        name: requestedName,
        aliases,
      });

      const { data, error } = await supabase
        .from('characters')
        .update({
          name: payload.name,
          description: payload.description,
          traits: payload.traits,
          aliases: payload.aliases || [],
          image_url: payload.image_url,
          status: payload.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isMissingRelationError(error, 'characters')) {
          charactersTableAvailable = false;
          return mockUpdateCharacter(id, updates);
        }

        logger.error('Error updating character:', error);
        return null;
      }

      const nextCharacter = normalizeCharacter(data as Character);
      await loadRemoteCharacters(true);
      clearCollectionsCache();
      return nextCharacter;
    } catch (error) {
      logger.error('Error updating character:', error);
      return null;
    }
  },

  /**
   * Fetch user progress (Merged logic would go here in a real app)
   * For now, returns a simple dictionary of { collection_id: percent }
   */
  async getUserProgress(): Promise<Record<string, number>> {
    if (!isSupabaseConfigured) {
      return getMockUserProgress();
    }

    if (userProgressTableAvailable === false) {
      return {};
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return {};

    const { data, error } = await supabase
      .from('user_progress')
      .select('collection_id, progress_percent')
      .eq('user_id', user.id);

    // The current branch can run against remotes that do not have this table yet.
    if (error) {
      if (isMissingUserProgressError(error)) {
        userProgressTableAvailable = false;
        logger.warn('user_progress table unavailable; skipping progress fetches for this session.', error);
      }
      return {};
    }

    userProgressTableAvailable = true;

    const progressMap: Record<string, number> = {};
    data?.forEach((p: any) => {
      progressMap[p.collection_id] = p.progress_percent;
    });
    return progressMap;
  },

  /**
   * Create a new collection (Admin/Editor only)
   */
  async createCollection(collection: Partial<Collection>): Promise<Collection | null> {
    if (!isSupabaseConfigured) {
      return mockCreateCollection(collection);
    }
    const payload = sanitizeCollectionPayload(collection, (await loadRemoteCharacters()) ?? undefined);
    let { data, error } = await supabase
      .from('collections')
      .insert(payload)
      .select()
      .single();

    if (error && isMissingColumnError(error, 'character_ids')) {
      const { character_ids, ...legacyPayload } = payload;
      ({ data, error } = await supabase
        .from('collections')
        .insert(legacyPayload)
        .select()
        .single());
    }

    if (error) {
      logger.error('Error creating collection:', error);
      return null;
    }

    // Clear cache after creation
    clearCollectionsCache();

    return data;
  },

  /**
   * Update an existing collection (Admin/Editor only)
   */
  async updateCollection(id: string, updates: Partial<Collection>): Promise<Collection | null> {
    if (!isSupabaseConfigured) {
      return mockUpdateCollection(id, updates);
    }
    const payload = sanitizeCollectionPayload(updates, (await loadRemoteCharacters()) ?? undefined);
    // First, verify the collection exists and we can access it
    const existing = await this.getCollectionById(id);
    if (!existing) {
      logger.error('Collection not found or no access:', id);
      return null;
    }

    // Perform the update
    let { data, error } = await supabase
      .from('collections')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && isMissingColumnError(error, 'character_ids')) {
      const { character_ids, ...legacyPayload } = payload;
      ({ data, error } = await supabase
        .from('collections')
        .update(legacyPayload)
        .eq('id', id)
        .select()
        .single());
    }

    if (error) {
      logger.error('Error updating collection:', error);
      logger.error('Update details:', { id, payload, error });

      // Check for RLS policy error
      if (error.code === 'PGRST116' || error.message?.includes('0 rows')) {
        logger.error('RLS Policy Issue: Update matched 0 rows. Check RLS policies for UPDATE on collections table.');
        return null;
      }

      return null;
    }

    if (!data) {
      logger.error('Update succeeded but no data returned. RLS might be blocking SELECT after UPDATE.');
      // Try to fetch the updated collection
      const fetched = await this.getCollectionById(id);
      // Clear cache after update
      clearCollectionsCache();
      return fetched;
    }

    // Clear cache after update
    clearCollectionsCache();

    return data;
  },

  /**
   * Delete a collection (Admin only) — cascata: resources + storage + collection
   */
  async deleteCollection(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      return mockDeleteCollection(id);
    }

    // 1. Buscar todos os recursos associados antes de deletar
    const { data: resources, error: resourcesError } = await supabase
      .from('collection_resources')
      .select('id, url')
      .eq('collection_id', id);

    if (resourcesError) {
      logger.error('Error fetching collection resources before delete:', resourcesError);
      return false;
    }

    // 2. Deletar arquivos do Storage (best-effort: continua mesmo se algum falhar)
    if (resources && resources.length > 0) {
      const deleteResults = await Promise.allSettled(
        resources
          .filter(r => r.url)
          .map(r => deleteFile(r.url))
      );

      const failures = deleteResults.filter(r => r.status === 'rejected').length;
      if (failures > 0) {
        logger.warn(`deleteCollection: ${failures}/${resources.length} storage files failed to delete`);
      }

      // 3. Deletar registros de collection_resources
      const { error: resourcesDeleteError } = await supabase
        .from('collection_resources')
        .delete()
        .eq('collection_id', id);

      if (resourcesDeleteError) {
        logger.error('Error deleting collection resources:', resourcesDeleteError);
        return false;
      }
    }

    // 4. Deletar a coleção
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting collection:', error);
      return false;
    }

    // Clear cache after deletion
    clearCollectionsCache();

    return true;
  },

  /**
   * Fetch user profile (with cache support)
   * @param forceRefresh - If true, bypass cache and fetch from server
   */
  async getProfile(forceRefresh: boolean = false): Promise<UserProfile | null> {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedProfile();
      if (cached) {
        return cached;
      }
    }

    if (!isSupabaseConfigured) {
      const currentUserId = getMockCurrentUserId();
      if (!currentUserId) {
        clearProfileCache();
        return null;
      }

      const mockProfile = getMockProfile();
      if (!mockProfile) {
        clearProfileCache();
        return null;
      }

      const profile = normalizeProfile(mockProfile);

      await saveProfileCache(profile);
      return profile;
    }

    // Fetch from server
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching profile:', error);
      return null;
    }

    let profile: UserProfile | null = null;

    if (data) {
      profile = normalizeProfile(data);
    } else {
      // Profile doesn't exist, create it from auth metadata
      profile = normalizeProfile({
        id: user.id,
        full_name: user.user_metadata?.full_name || 'Professor(a)',
        email: user.email || null,
        avatar_id: null,
        access_status: 'pending_voucher',
        voucher_id: null,
        access_starts_at: null,
        access_expires_at: null
      });
    }

    // Save to cache
    if (profile) {
      await saveProfileCache(profile);
    }

    return profile;
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) {
      const saved = saveMockProfile(updates);
      if (!saved) {
        return null;
      }

      const profile = normalizeProfile(saved);
      await saveProfileCache(profile);
      return profile;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...updates,
        school_name: null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Error updating profile:', error);
      return null;
    }

    // Update cache
    if (data) {
      await saveProfileCache(normalizeProfile(data));
    }

    return data ? normalizeProfile(data) : null;
  },

  /**
   * Get all users/profiles (Admin only)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    if (!isSupabaseConfigured) {
      return getMockAllUsers();
    }

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('admin-list-users');

      if (fnError) {
        logger.error('Error invoking admin-list-users function:', fnError);
        throw fnError;
      }

      if (!fnData?.success || !Array.isArray(fnData.users)) {
        const errMsg = fnData?.error ?? 'Erro ao listar usuários do administrador';
        logger.error('admin-list-users function returned error:', errMsg);
        throw new Error(errMsg);
      }

      return fnData.users.map((user: UserProfile) => normalizeProfile(user));
    } catch (error) {
      logger.error('Unexpected error fetching admin-list-users:', error);
      throw error;
    }
  },

  /**
   * Create a new user (Admin only)
   */
  async createUser(userData: {
    email: string;
    full_name: string;
    role?: 'admin' | 'editor' | 'viewer';
  }): Promise<{ success: boolean; error?: string; userId?: string }> {
    const assignedRole = userData.role || 'viewer';
    const isOperationalRole = assignedRole === 'admin' || assignedRole === 'editor';

    if (!isSupabaseConfigured) {
      // Em modo mock, gera senha aleatória internamente — o colaborador nunca a vê
      const mockPassword = crypto.randomUUID();
      const result = createMockUser({
        email: userData.email,
        password: mockPassword,
        full_name: userData.full_name,
        role: assignedRole,
        signIn: false,
        created_by: getMockCurrentUserId(),
      });

      return {
        success: result.success,
        error: result.error,
        userId: result.userId,
      };
    }

    try {
      // Usa a Edge Function invite-user que roda com service_role no servidor.
      // Isso garante segurança (service_role nunca exposta ao browser) e usa
      // admin.inviteUserByEmail() que cria o usuário e envia um único e-mail de convite.
      const redirectTo = buildAppUrl();

      const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-user', {
        body: {
          email: userData.email,
          full_name: userData.full_name,
          role: assignedRole,
          redirect_to: redirectTo,
        },
      });

      if (fnError) {
        logger.error('Error invoking invite-user function:', fnError);
        return { success: false, error: fnError.message };
      }

      if (!fnData?.success) {
        const errMsg = fnData?.error ?? 'Erro ao convidar usuário';
        logger.error('invite-user function returned error:', errMsg);
        return { success: false, error: errMsg };
      }

      return { success: true, userId: fnData.userId };
    } catch (error: any) {
      logger.error('Error creating user:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  },

  /**
   * Get active content grants for the current user.
   * Returns collection IDs the user has been granted access to via content-based vouchers.
   */
  async getUserContentGrants(): Promise<import('../types').UserContentGrant[]> {
    if (!isSupabaseConfigured) {
      const userId = getMockCurrentUserId();
      if (!userId) return [];
      return getActiveGrantsForUser(userId);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_content_grants')
      .select('*')
      .eq('user_id', user.id)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      logger.error('Error fetching user content grants:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Update any user profile by ID (Admin only)
   */
  async updateUser(
    userId: string,
    updates: { full_name?: string; role?: 'admin' | 'editor' | 'viewer' }
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const updated = updateMockUserById(userId, updates);
      return updated ? { success: true } : { success: false, error: 'Usuário não encontrado.' };
    }

    const nextProfileUpdates: Record<string, unknown> = {
      ...updates,
      school_name: null,
      updated_at: new Date().toISOString(),
    };

    if (updates.role) {
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('voucher_id, access_expires_at, access_starts_at')
        .eq('id', userId)
        .single();

      if (profileError) {
        logger.error('Error fetching current user profile before update:', profileError);
        return { success: false, error: profileError.message };
      }

      const isOperationalRole = updates.role === 'admin' || updates.role === 'editor';
      if (isOperationalRole) {
        nextProfileUpdates.access_status = 'active';
        nextProfileUpdates.access_starts_at = currentProfile?.access_starts_at || new Date().toISOString();
      } else if (!currentProfile?.voucher_id && !currentProfile?.access_expires_at) {
        nextProfileUpdates.access_status = 'pending_voucher';
        nextProfileUpdates.access_starts_at = null;
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update(nextProfileUpdates)
      .eq('id', userId);

    if (error) {
      logger.error('Error updating user:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      return deleteMockUserById(userId);
    }

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (fnError) {
        logger.error('Error invoking delete-user function:', fnError);
        return { success: false, error: fnError.message };
      }

      if (!fnData?.success) {
        const errMsg = fnData?.error ?? 'Erro ao excluir usuário';
        logger.error('delete-user function returned error:', errMsg);
        return { success: false, error: errMsg };
      }

      return { success: true };
    } catch (error: any) {
      logger.error('Error deleting user:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  },

  /**
   * Check if current user has a grant for a specific collection.
   */
  async hasContentGrant(collectionId: string): Promise<boolean> {
    if (!isSupabaseConfigured) {
      const userId = getMockCurrentUserId();
      if (!userId) return false;
      return hasGrantForCollection(userId, collectionId);
    }

    const grants = await this.getUserContentGrants();
    return grants.some(g => g.collection_id === collectionId);
  },
};