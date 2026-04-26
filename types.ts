
export type MediaType = 'book' | 'audio' | 'video' | 'extra';

export interface Author {
  name: string;
}

export type AccessStatus = 'active' | 'expired' | 'pending_voucher';

export type UserRole = 'admin' | 'editor' | 'viewer';

export type UserAuthStatus = 'invite_pending' | 'confirmed' | 'authenticated' | 'created';

// Duration in months. UI/business rules should validate allowed range.
export type VoucherDurationMonths = number;

export type VoucherStatus = 'active' | 'redeemed' | 'expired' | 'disabled';

export type VoucherErrorCode =
  | 'invalid_code'
  | 'already_redeemed'
  | 'voucher_expired'
  | 'voucher_disabled'
  | 'not_authenticated'
  | 'unknown';

export interface Voucher {
  id: string;
  code: string;
  duration_months: VoucherDurationMonths;
  status: VoucherStatus;
  expires_at?: string | null;
  consumed_at?: string | null;
  consumed_by_user_id?: string | null;
  consumed_by_name?: string | null;
  consumed_by_email?: string | null;
}

export interface VoucherValidationResult {
  success: boolean;
  voucher?: Voucher;
  code?: VoucherErrorCode;
  message?: string;
}

export interface VoucherRedemptionResult {
  success: boolean;
  profile?: UserProfile;
  voucher?: Voucher;
  code?: VoucherErrorCode;
  message?: string;
  /** Collection IDs granted by this redemption (content-based vouchers) */
  grantedCollectionIds?: string[];
}

export interface RegisterWithVoucherInput {
  email: string;
  password: string;
  full_name: string;
  voucherCode: string;
}

export interface RegisterWithVoucherResult {
  success: boolean;
  profile?: UserProfile;
  error?: string;
  message?: string;
  requiresLogin?: boolean;
  requiresEmailConfirmation?: boolean;
  email?: string;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_id: string | null; // Stores the character name (e.g. "Kaboo") or null for initials
  created_by?: string | null;
  role?: UserRole | null;
  voucher_id?: string | null;
  access_starts_at?: string | null;
  access_expires_at?: string | null;
  access_status?: AccessStatus | null;
  created_at?: string | null;
  updated_at?: string | null;
  invited_at?: string | null;
  confirmed_at?: string | null;
  last_sign_in_at?: string | null;
  auth_status?: UserAuthStatus | null;
}

export interface UserProgress {
  collection_id: string;
  progress_percent: number;
}

export type CharacterStatus = 'active' | 'inactive';

export interface Character {
  id: string;
  name: string;
  description: string;
  traits: string[];
  aliases?: string[];
  image_url?: string | null;
  status?: CharacterStatus;
}

export interface CollectionResource {
  id: string;
  collection_id: string;
  title: string;
  type: 'pdf' | 'audio' | 'video' | 'zip';
  url: string;
  size: string;
}

export type CollectionAssetMediaType = 'document' | 'audio' | 'video';

export type CollectionType = 'book' | 'kit';

export type CentralMaterialPreviewType = 'pdf' | 'audio' | 'video' | 'image' | 'other';

export type CentralMaterialCategory = 'guide' | 'tutorial' | 'family_support' | 'catalog';

export type CentralMaterialAudience = 'all' | 'educator' | 'family';

export type CollectionAssetCategory =
  | 'reading'
  | 'storytelling'
  | 'animation'
  | 'accessible_video'
  | 'how_to_play'
  | 'video_lesson'
  | 'teacher_guide'
  | 'extra_material';

export interface CollectionAsset {
  id: string;
  category: CollectionAssetCategory;
  media_type: CollectionAssetMediaType;
  title: string;
  url: string;
  description?: string | null;
  scope?: 'primary' | 'library';
}

export interface Collection {
  id: string;
  title: string;
  cover_image: string; // Mapped from DB snake_case
  collection_type?: CollectionType;
  kit_cover_image?: string | null;
  kit_book_ids?: string[];
  level: 'Educação Infantil' | 'Fundamental I';
  // Multissegmentos (aditivo, retrocompat)
  segments?: string[];
  primary_segment?: string;
  progress?: number;
  duration?: string;
  current_position?: string;
  total_pages?: number;
  current_page?: number;
  color_theme?: string;
  synopsis?: string | null;

  // New fields for media files
  pdf_url?: string;
  audio_url?: string;
  video_url?: string;
  text_content?: string | null;
}

// Extend Collection with new pedagogical fields
export interface Collection {
  theme?: string;
  learning_objectives?: string;
  characters?: string[];
  character_ids?: string[];
  bncc_skills?: string[];
  casel_competencies?: string[];
  age_grade?: string[]; // New field: Idade-série
  extra_materials?: string[]; // New field: Materiais Extras (array of file URLs)
  collection_assets?: CollectionAsset[];
}

export interface CentralMaterial {
  id: string;
  title: string;
  description?: string | null;
  category: CentralMaterialCategory;
  audience?: CentralMaterialAudience;
  preview_type: CentralMaterialPreviewType;
  url: string;
  cta_label?: string | null;
}

export type MediaHub = 'videos' | 'music' | 'formations' | 'materials';

export type MediaKind = 'video' | 'audio' | 'document' | 'training';

export type MediaProvider = 'internal' | 'youtube' | 'external_audio';

export type MediaAccessMode = 'active_subscription' | 'linked_collection_grant';

export type MediaShelfType = 'hero' | 'rail' | 'playlist' | 'continue_watching';

export interface MediaItemCard {
  id: string;
  hub: MediaHub;
  kind: MediaKind;
  title: string;
  summary?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
  featuredOrder?: number;
  collectionId?: string | null;
  collectionTitle?: string | null;
  provider: MediaProvider;
  locked: boolean;
  isFavorite: boolean;
  progressPercent: number;
  lastPositionSeconds?: number;
  badges?: string[];
}

export interface MediaRelatedCollection {
  collectionId: string;
  title: string;
  linkType: 'contextual' | 'primary_source' | 'recommended_with';
}

export interface MediaItemDetail extends MediaItemCard {
  accessMode: MediaAccessMode;
  metadata: Record<string, unknown>;
  relatedCollections?: MediaRelatedCollection[];
}

export interface MediaPlaybackSource {
  url?: string | null;
  expiresAt?: string | null;
  mimeType?: string | null;
  provider: MediaProvider;
  externalRef?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
}

export interface MediaPlaybackSession {
  item: MediaItemDetail;
  source: MediaPlaybackSource;
  canPlay: boolean;
}

export interface MediaShelf {
  id: string;
  hub: MediaHub;
  type: MediaShelfType;
  title: string;
  description?: string | null;
  items: MediaItemCard[];
}

export interface MediaHubResponse {
  hub: MediaHub;
  hero?: MediaItemCard | null;
  shelves: MediaShelf[];
  counts?: {
    total: number;
    favorites: number;
    continueWatching: number;
  };
}

export interface SaveMediaProgressInput {
  mediaItemId: string;
  lastPositionSeconds: number;
  progressPercent: number;
  totalDurationSeconds?: number;
  completed?: boolean;
}

export interface ToggleMediaFavoriteResult {
  mediaItemId: string;
  isFavorite: boolean;
}

// ── Voucher Models, Batches & Grants ──────────────────────

export type VoucherPackageType = 'book' | 'collection' | 'kit' | 'curated_set';

export type VoucherModelStatus = 'draft' | 'active' | 'archived';

export type VoucherBatchStatus = 'generated' | 'exported' | 'sent' | 'confirmed' | 'cancelled';

export interface VoucherModel {
  id: string;
  name: string;
  description?: string | null;
  package_type: VoucherPackageType;
  duration_months: VoucherDurationMonths;
  redeem_by?: string | null;
  status: VoucherModelStatus;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Populated by joins / mock — items linked to this model */
  items?: VoucherModelItem[];
}

export interface VoucherModelItem {
  id: string;
  model_id: string;
  collection_id: string;
  created_at: string;
  /** Populated by join */
  collection?: Collection;
}

export interface VoucherBatch {
  id: string;
  model_id: string;
  label?: string | null;
  quantity: number;
  status: VoucherBatchStatus;
  model_snapshot: VoucherModelSnapshot;
  exported_at?: string | null;
  exported_by?: string | null;
  sent_at?: string | null;
  sent_by?: string | null;
  sent_to?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Populated by aggregation */
  redeemed_count?: number;
  available_count?: number;
}

export interface VoucherModelSnapshot {
  name: string;
  package_type: VoucherPackageType;
  duration_months: VoucherDurationMonths;
  redeem_by?: string | null;
  items: Array<{ collection_id: string; title: string; cover_image?: string }>;
}

export interface UserContentGrant {
  id: string;
  user_id: string;
  collection_id: string;
  voucher_id?: string | null;
  granted_at: string;
  expires_at?: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown>;
  created_at: string;
}

// ── Screens ───────────────────────────────────────────────

export type ScreenName =
  | 'login'
  | 'forgot_password'
  | 'set_password'
  | 'access_expired'
  | 'home'
  | 'search'
  | 'videos'
  | 'music'
  | 'formations'
  | 'materials'
  | 'profile'
  | 'my_data'
  | 'details'
  | 'player_book'
  | 'player_audio'
  | 'player_video'
  | 'tools'
  | 'support'
  | 'email_confirmation'
  | 'admin'
  | 'design_system'
  | 'characters';

export type AdminModule =
  | 'collections'
  | 'videos'
  | 'music'
  | 'formations'
  | 'materials'
  | 'users'
  | 'vouchers'
  | 'characters';

export interface NavState {
  currentScreen: ScreenName;
  params?: any;
}