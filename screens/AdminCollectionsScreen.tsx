import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Icons } from '../components/Icons';
import { Character, Collection, CollectionAsset, CollectionAssetCategory, ScreenName, UserAuthStatus, UserProfile, UserRole } from '../types';
import { api } from '../lib/api';
import { canEditCollections, isAdmin } from '../lib/auth';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../design-system';
import { FileUpload } from '../components/FileUpload';
import { TagInput } from '../components/TagInput';
import { Tabs } from '../components/Tabs';
import { MultipleFileUpload } from '../components/MultipleFileUpload';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { ColorPicker } from '../components/ColorPicker';
import { CharacterAvatar } from '../components/CharacterAvatar';
import { formatSegmentLabel, AVAILABLE_SEGMENTS } from '../constants';
import useIsMobile from '../hooks/useIsMobile';
import { placeholderImageUrl } from '../lib/appPaths';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAccessDate, getAccessStatusLabel, getProfileAccessStatus } from '../lib/access';
import { normalizeCharacterLookupKey, resolveCharacterNamesFromIds, syncCollectionCharacters } from '../lib/characters';
import { COLLECTION_ASSET_META, inferCollectionAssets, syncCollectionWithAssets } from '../lib/collectionAssets';
import { getCollectionDisplayCover, getCollectionTypeMeta, normalizeSingleKitBookIds } from '../lib/collectionPresentation';

interface AdminCollectionsScreenProps {
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
  initialTab?: 'collections' | 'users';
  initialLibraryArea?: 'videos' | 'music' | 'formations' | 'materials';
}

export interface AdminCollectionsHandle {
  hasUnsavedChanges: () => boolean;
}

type CollectionFormData = Partial<Collection> & {
  collection_assets: CollectionAsset[];
};

type FixedMediaSlotCategory = Exclude<CollectionAssetCategory, 'extra_material'>;

type FixedMediaSlot = {
  category: FixedMediaSlotCategory;
  label: string;
  folder: 'pdfs' | 'audio' | 'video';
  accept: string;
  allowMetadata?: boolean;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
};

const EMPTY_COLLECTION_FORM_DATA: CollectionFormData = {
  title: '',
  collection_type: 'book',
  kit_cover_image: null,
  kit_book_ids: [],
  level: 'Educação Infantil',
  segments: [],
  primary_segment: '',
  cover_image: placeholderImageUrl,
  pdf_url: '',
  audio_url: '',
  video_url: '',
  color_theme: '#5D1F58',
  synopsis: '',
  theme: '',
  learning_objectives: '',
  characters: [],
  character_ids: [],
  bncc_skills: [],
  casel_competencies: [],
  age_grade: [],
  extra_materials: [],
  collection_assets: [],
};

const createAssetId = (category: CollectionAssetCategory) => {
  return `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const inferAssetMediaTypeFromUrl = (url: string): CollectionAsset['media_type'] => {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.match(/\.(mp3|wav|ogg|m4a|aac)$/)) {
    return 'audio';
  }

  if (lowerUrl.match(/\.(mp4|webm|mov|avi|m4v)$/)) {
    return 'video';
  }

  return 'document';
};

const normalizeAssetTitle = (url: string, fallback: string) => {
  const fileName = url.split('/').pop() || fallback;

  return fileName
    .replace(/^\d+-[a-z0-9]+-/i, '')
    .replace(/\.[a-z0-9]{1,6}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || fallback;
};

const normalizeKitBookIds = (value?: string[] | null): string[] => {
  return normalizeSingleKitBookIds(value);
};

const buildCollectionFormData = (collection?: Partial<Collection>): CollectionFormData => {
  const normalizedCollection = syncCollectionCharacters(syncCollectionWithAssets({
    ...EMPTY_COLLECTION_FORM_DATA,
    ...collection,
    collection_assets: inferCollectionAssets(collection ?? {}),
  }));

  return {
    ...normalizedCollection,
    collection_type: normalizedCollection.collection_type || 'book',
    kit_cover_image: normalizedCollection.kit_cover_image || null,
    kit_book_ids: normalizeKitBookIds(normalizedCollection.kit_book_ids),
    segments: [...(normalizedCollection.segments || [])],
    characters: [...(normalizedCollection.characters || [])],
    character_ids: [...(normalizedCollection.character_ids || [])],
    bncc_skills: [...(normalizedCollection.bncc_skills || [])],
    casel_competencies: [...(normalizedCollection.casel_competencies || [])],
    age_grade: [...(normalizedCollection.age_grade || [])],
    extra_materials: [...(normalizedCollection.extra_materials || [])],
    collection_assets: [...(normalizedCollection.collection_assets || [])],
  };
};

const FIXED_MEDIA_SLOTS: FixedMediaSlot[] = [
  {
    category: 'reading',
    label: COLLECTION_ASSET_META.reading.label,
    folder: 'pdfs',
    accept: 'application/pdf',
  },
  {
    category: 'storytelling',
    label: COLLECTION_ASSET_META.storytelling.label,
    folder: 'audio',
    accept: 'audio/*',
  },
  {
    category: 'animation',
    label: COLLECTION_ASSET_META.animation.label,
    folder: 'video',
    accept: 'video/*',
  },
  {
    category: 'accessible_video',
    label: COLLECTION_ASSET_META.accessible_video.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Vídeo com Libras',
    descriptionPlaceholder: 'Descrição opcional para orientar o uso deste material.',
  },
  {
    category: 'how_to_play',
    label: COLLECTION_ASSET_META.how_to_play.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Tutorial rápido',
    descriptionPlaceholder: 'Descreva o foco do vídeo de como jogar.',
  },
  {
    category: 'video_lesson',
    label: COLLECTION_ASSET_META.video_lesson.label,
    folder: 'video',
    accept: 'video/*',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Videoaula introdutória',
    descriptionPlaceholder: 'Descreva o conteúdo pedagógico desta videoaula.',
  },
  {
    category: 'teacher_guide',
    label: COLLECTION_ASSET_META.teacher_guide.label,
    folder: 'pdfs',
    accept: 'application/pdf',
    allowMetadata: true,
    titlePlaceholder: 'Ex.: Guia do Professor',
    descriptionPlaceholder: 'Descreva brevemente o conteúdo do guia.',
  },
];

const LIBRARY_AREA_LABEL: Record<NonNullable<AdminCollectionsScreenProps['initialLibraryArea']>, string> = {
  videos: 'Vídeos',
  music: 'Músicas',
  formations: 'Formações',
  materials: 'Materiais',
};

const LIBRARY_AREA_PRIMARY_SLOTS: Record<NonNullable<AdminCollectionsScreenProps['initialLibraryArea']>, FixedMediaSlotCategory[]> = {
  videos: ['animation', 'accessible_video', 'how_to_play', 'video_lesson'],
  music: ['storytelling'],
  formations: ['teacher_guide', 'video_lesson'],
  materials: ['reading'],
};

// Componente interno para card com efeito 3D
const Card3DCover: React.FC<{
  imageUrl: string;
  alt: string;
  level?: string;
  collectionTypeLabel?: string;
  collectionTypeBadgeClassName?: string;
  actionsButton?: React.ReactNode;
}> = ({ imageUrl, alt, level, collectionTypeLabel, collectionTypeBadgeClassName, actionsButton }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    const rotateX = (mouseY / (rect.height / 2)) * -8;
    const rotateY = (mouseX / (rect.width / 2)) * 8;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div className="aspect-square mb-3 relative">
      <div
        ref={cardRef}
        className="w-full h-full rounded-lg overflow-hidden relative group shadow-md shadow-gray-100"
        style={{
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isMobile
            ? 'transform 0.1s ease-out'
            : (tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'),
          touchAction: 'manipulation',
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover bg-gray-200"
          style={{
            transform: 'translateZ(20px)',
          }}
        />
        {/* Light reflection effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(${135 + (tilt.y * 2)
              }deg, 
              transparent 0%, 
              rgba(255, 255, 255, 0.3) ${50 + (tilt.x * 0.5) + (tilt.y * 0.5)}%, 
              transparent 100%
            )`,
            transform: `translateZ(25px) translateX(${tilt.y * 2}px) translateY(${tilt.x * 2}px)`,
            transition: 'background 0.1s ease-out, transform 0.1s ease-out',
            mixBlendMode: 'overlay',
          }}
        />
        {/* Secondary light reflection */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at ${50 + (tilt.y * 1.5)}% ${50 + (tilt.x * 1.5)}%, 
              rgba(255, 255, 255, 0.4) 0%, 
              transparent 60%
            )`,
            transform: 'translateZ(30px)',
            transition: 'background 0.1s ease-out',
            mixBlendMode: 'soft-light',
          }}
        />
        {collectionTypeLabel && collectionTypeBadgeClassName && (
          <div
            className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] border backdrop-blur-sm ${collectionTypeBadgeClassName}`}
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            {collectionTypeLabel}
          </div>
        )}
        {level && (
          <div
            className="absolute bottom-2 right-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-lg text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50"
            style={{
              transform: 'translateZ(30px)',
            }}
          >
            {formatSegmentLabel(level)}
          </div>
        )}
      </div>
      {actionsButton && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {actionsButton}
        </div>
      )}
    </div>
  );
};

export const AdminCollectionsScreen = forwardRef<AdminCollectionsHandle, AdminCollectionsScreenProps>(({ onNavigate, onBack, initialTab, initialLibraryArea }, ref) => {
  // Main tab — driven by initialTab prop (key remount in AdminScreen)
  const mainTab = initialTab || 'collections';
  const isLibraryAreaMode = Boolean(initialLibraryArea);
  const defaultCollectionTab: 'identification' | 'media' = isLibraryAreaMode ? 'media' : 'identification';

  // Collections state
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'identification' | 'media'>(defaultCollectionTab);
  const [isSaving, setIsSaving] = useState(false);
  const [availableCharacters, setAvailableCharacters] = useState<Character[]>([]);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    full_name: '',
    role: 'viewer' as UserRole,
  });
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [userErrorMsg, setUserErrorMsg] = useState<string | null>(null);
  const [userSuccessMsg, setUserSuccessMsg] = useState<string | null>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserFormData, setEditUserFormData] = useState<{ full_name: string; role: UserRole }>({ full_name: '', role: 'viewer' });
  const [editUserRoleDropdownOpen, setEditUserRoleDropdownOpen] = useState(false);
  const [loadingUserEdit, setLoadingUserEdit] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [editUserErrorMsg, setEditUserErrorMsg] = useState<string | null>(null);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const editUserRoleRef = useRef<HTMLDivElement>(null);
  const [originalFormData, setOriginalFormData] = useState<CollectionFormData | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const { toast, showToast, hideToast } = useToast();
  const [searchFilter, setSearchFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'Educação Infantil' | 'Fundamental I'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [showFormLevelDropdown, setShowFormLevelDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openActionsDropdown, setOpenActionsDropdown] = useState<string | null>(null);
  const [showHeaderActionsDropdown, setShowHeaderActionsDropdown] = useState(false);
  const headerActionsRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);
  const formLevelDropdownRef = useRef<HTMLDivElement>(null);
  const actionsDropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [formData, setFormData] = useState<CollectionFormData>(buildCollectionFormData());

  const activeLibraryAreaLabel = initialLibraryArea ? LIBRARY_AREA_LABEL[initialLibraryArea] : null;

  useEffect(() => {
    if (mainTab !== 'collections') {
      return;
    }

    setActiveTab(defaultCollectionTab);
  }, [defaultCollectionTab, mainTab]);

  useEffect(() => {
    if (mainTab !== 'collections' || !initialLibraryArea) {
      return;
    }

    const emptyFormData = buildCollectionFormData();
    setEditingId(null);
    setShowCreateForm(true);
    setFormData(emptyFormData);
    setOriginalFormData(emptyFormData);
    setActiveTab('media');
  }, [initialLibraryArea, mainTab]);

  const accessSummary = users.reduce((summary, user) => {
    const status = getProfileAccessStatus(user);
    summary.total += 1;
    summary[status] += 1;
    return summary;
  }, {
    total: 0,
    active: 0,
    expired: 0,
    pending_voucher: 0,
  });

  const getAccessBadgeClasses = (user: UserProfile) => {
    const status = getProfileAccessStatus(user);

    if (status === 'active') {
      return 'bg-emerald-100 text-emerald-700';
    }

    if (status === 'expired') {
      return 'bg-orange-100 text-orange-700';
    }

    return 'bg-amber-100 text-amber-700';
  };

  const getUserAuthStatus = (user: UserProfile): UserAuthStatus => {
    if (user.auth_status) {
      return user.auth_status;
    }

    if (user.last_sign_in_at) {
      return 'authenticated';
    }

    if (user.confirmed_at) {
      return 'confirmed';
    }

    if (user.invited_at) {
      return 'invite_pending';
    }

    return 'created';
  };

  const getAuthBadgeMeta = (user: UserProfile) => {
    const status = getUserAuthStatus(user);

    switch (status) {
      case 'authenticated':
        return {
          label: 'Já acessou',
          classes: 'bg-emerald-100 text-emerald-700',
        };
      case 'confirmed':
        return {
          label: 'Convite confirmado',
          classes: 'bg-sky-100 text-sky-700',
        };
      case 'invite_pending':
        return {
          label: 'Esperando autenticação',
          classes: 'bg-amber-100 text-amber-700',
        };
      default:
        return {
          label: 'Conta criada',
          classes: 'bg-slate-100 text-slate-700',
        };
    }
  };

  const formatAdminDateTime = (value?: string | null) => {
    if (!value) {
      return 'Nunca acessou';
    }

    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return 'Data indisponível';
    }
  };

  const pendingInviteCount = users.filter((user) => getUserAuthStatus(user) === 'invite_pending').length;
  const editingUser = editingUserId ? users.find((user) => user.id === editingUserId) ?? null : null;

  const updateFormWithAssets = (assets: CollectionAsset[]) => {
    setFormData((currentFormData) => buildCollectionFormData({
      ...currentFormData,
      collection_assets: assets,
    }));
  };

  const getAssetByCategory = (category: CollectionAssetCategory) => {
    return formData.collection_assets.find((asset) => asset.category === category);
  };

  const setAssetUrl = (category: FixedMediaSlotCategory, url: string) => {
    const trimmedUrl = url.trim();
    const currentAsset = getAssetByCategory(category);
    const nextAssets = formData.collection_assets.filter((asset) => asset.category !== category);

    if (trimmedUrl) {
      const meta = COLLECTION_ASSET_META[category];
      nextAssets.push({
        id: currentAsset?.id || createAssetId(category),
        category,
        media_type: meta.mediaType,
        title: currentAsset?.title?.trim() || meta.label,
        url: trimmedUrl,
        description: currentAsset?.description?.trim() || null,
        scope: meta.scope,
      });
    }

    updateFormWithAssets(nextAssets);
  };

  const setAssetTitle = (category: FixedMediaSlotCategory, title: string) => {
    const currentAsset = getAssetByCategory(category);
    if (!currentAsset) {
      return;
    }

    updateFormWithAssets(
      formData.collection_assets.map((asset) =>
        asset.category === category ? { ...asset, title } : asset
      )
    );
  };

  const setAssetDescription = (category: FixedMediaSlotCategory, description: string) => {
    const currentAsset = getAssetByCategory(category);
    if (!currentAsset) {
      return;
    }

    updateFormWithAssets(
      formData.collection_assets.map((asset) =>
        asset.category === category ? { ...asset, description } : asset
      )
    );
  };

  const removeAsset = (category: FixedMediaSlotCategory) => {
    updateFormWithAssets(formData.collection_assets.filter((asset) => asset.category !== category));
  };

  const extraMaterialAssets = formData.collection_assets.filter((asset) => asset.category === 'extra_material');
  const availableKitBooks = collections
    .filter((collection) => collection.id !== editingId && getCollectionTypeMeta(collection).type === 'book')
    .sort((firstCollection, secondCollection) => (firstCollection.title || '').localeCompare(secondCollection.title || '', 'pt-BR'));
  const selectedKitBookIds = normalizeKitBookIds(formData.kit_book_ids);
  const selectedCharacterIds = Array.from(new Set(formData.character_ids || []));
  const selectedCharacterNames = resolveCharacterNamesFromIds(selectedCharacterIds);
  const unmappedLegacyCharacters = (formData.characters || []).filter(
    (characterName) => !selectedCharacterNames.some(
      (selectedCharacterName) => normalizeCharacterLookupKey(selectedCharacterName) === normalizeCharacterLookupKey(characterName)
    )
  );
  const selectableCharacters = [...availableCharacters].sort((firstCharacter, secondCharacter) => {
    const firstSelected = selectedCharacterIds.includes(firstCharacter.id) ? 1 : 0;
    const secondSelected = selectedCharacterIds.includes(secondCharacter.id) ? 1 : 0;

    if (firstSelected !== secondSelected) {
      return secondSelected - firstSelected;
    }

    return firstCharacter.name.localeCompare(secondCharacter.name, 'pt-BR');
  });

  const toggleKitBookSelection = (bookId: string) => {
    setFormData((currentFormData) => {
      const currentKitBookIds = normalizeKitBookIds(currentFormData.kit_book_ids);
      const nextKitBookIds = currentKitBookIds.includes(bookId) ? [] : [bookId];

      return {
        ...currentFormData,
        kit_book_ids: nextKitBookIds,
      };
    });
  };

  const toggleCharacterSelection = (characterId: string) => {
    setFormData((currentFormData) => {
      const currentIds = Array.from(new Set(currentFormData.character_ids || []));
      const currentSelectedNames = resolveCharacterNamesFromIds(currentIds);
      const nextIds = currentIds.includes(characterId)
        ? currentIds.filter((id) => id !== characterId)
        : [...currentIds, characterId];

      const preservedLegacyCharacters = (currentFormData.characters || []).filter(
        (characterName) => !currentSelectedNames.some(
          (selectedCharacterName) => normalizeCharacterLookupKey(selectedCharacterName) === normalizeCharacterLookupKey(characterName)
        )
      );

      return {
        ...currentFormData,
        character_ids: nextIds,
        characters: [...resolveCharacterNamesFromIds(nextIds), ...preservedLegacyCharacters],
      };
    });
  };

  const setLegacyCharacterNames = (legacyCharacters: string[]) => {
    const normalizedLegacyCharacters = Array.from(new Set(legacyCharacters.map((character) => character.trim()).filter(Boolean)));

    setFormData((currentFormData) => ({
      ...currentFormData,
      characters: [...resolveCharacterNamesFromIds(currentFormData.character_ids || []), ...normalizedLegacyCharacters],
    }));
  };

  const setExtraMaterialUrls = (urls: string[]) => {
    const assetsWithoutExtras = formData.collection_assets.filter((asset) => asset.category !== 'extra_material');

    const nextExtraAssets = urls.reduce<CollectionAsset[]>((assets, url, index) => {
      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        return assets;
      }

      const currentAsset = extraMaterialAssets.find((asset) => asset.url === trimmedUrl);

      assets.push({
        id: currentAsset?.id || createAssetId('extra_material'),
        category: 'extra_material' as const,
        media_type: currentAsset?.media_type || inferAssetMediaTypeFromUrl(trimmedUrl),
        title: currentAsset?.title?.trim() || normalizeAssetTitle(trimmedUrl, `Material Extra ${index + 1}`),
        url: trimmedUrl,
        description: currentAsset?.description?.trim() || null,
        scope: 'library' as const,
      });

      return assets;
    }, []);

    updateFormWithAssets([...assetsWithoutExtras, ...nextExtraAssets]);
  };

  useEffect(() => {
    checkPermission();
    loadCharacters();
    if (mainTab === 'collections') {
      loadCollections();
    } else if (mainTab === 'users') {
      loadUsers();
    }
  }, []);

  // Double fetch guard: mainTab useEffect already handles initial load

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false);
      }
      if (levelDropdownRef.current && !levelDropdownRef.current.contains(event.target as Node)) {
        setShowLevelDropdown(false);
      }
      if (formLevelDropdownRef.current && !formLevelDropdownRef.current.contains(event.target as Node)) {
        setShowFormLevelDropdown(false);
      }
      if (headerActionsRef.current && !headerActionsRef.current.contains(event.target as Node)) {
        setShowHeaderActionsDropdown(false);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setShowRoleDropdown(false);
      }
      if (editUserRoleRef.current && !editUserRoleRef.current.contains(event.target as Node)) {
        setEditUserRoleDropdownOpen(false);
      }

      // Close actions dropdowns
      Object.keys(actionsDropdownRefs.current).forEach(key => {
        const ref = actionsDropdownRefs.current[key];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenActionsDropdown(null);
        }
      });
    };

    if (showSortDropdown || showLevelDropdown || showFormLevelDropdown || openActionsDropdown || showHeaderActionsDropdown || showRoleDropdown || editUserRoleDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortDropdown, showLevelDropdown, showFormLevelDropdown, openActionsDropdown, showHeaderActionsDropdown, showRoleDropdown, editUserRoleDropdownOpen]);

  const checkPermission = async () => {
    setCheckingPermission(true);
    try {
      const canEdit = await canEditCollections();
      const admin = await isAdmin();
      setHasPermission(canEdit);
      setIsAdminUser(admin);
      if (!canEdit) {
        onBack();
      }
    } catch (error) {
      console.error('Error checking permission:', error);
      showToast('Erro ao verificar permissões.', 'error');
    } finally {
      setCheckingPermission(false);
    }
  };

  const loadCollections = async () => {
    setLoading(true);
    try {
      const data = await api.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Error loading collections:', error);
      showToast('Erro ao carregar coleções.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCharacters = async () => {
    try {
      const data = await api.getCharacters();
      setAvailableCharacters(data);
    } catch (error) {
      console.error('Error loading characters:', error);
      showToast('Erro ao carregar personagens.', 'error');
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await api.getAllUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isAdminUser) {
      setUserErrorMsg('Apenas administradores podem criar usuários.');
      return;
    }

    if (!acceptedTerms) {
      setUserErrorMsg('Você precisa aceitar a política de privacidade para continuar.');
      return;
    }

    if (!userFormData.email || !userFormData.full_name) {
      setUserErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    setIsCreatingUser(true);
    setUserErrorMsg(null);
    setUserSuccessMsg(null);

    try {
      const result = await api.createUser({
        email: userFormData.email,
        full_name: userFormData.full_name,
        role: userFormData.role,
      });

      if (result.success) {
        showToast(`Convite enviado para ${userFormData.email}!`, 'success');
        setShowUserForm(false);
        setUserFormData({ email: '', full_name: '', role: 'viewer' });
        setAcceptedTerms(false);
        setUserSuccessMsg(null);
        loadUsers();
      } else {
        let msg = result.error || 'Erro ao criar usuário.';
        if (msg === 'User already registered') msg = 'Este e-mail já está cadastrado.';
        setUserErrorMsg(msg);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      showToast('Erro ao criar usuário. Tente novamente.', 'error');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const clearUserError = () => {
    if (userErrorMsg) setUserErrorMsg(null);
  };

  const handleEditUserOpen = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditUserFormData({
      full_name: user.full_name || '',
      role: (user.role as UserRole) || 'viewer',
    });
    setEditUserErrorMsg(null);
  };

  const handleEditUserSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    if (!editUserFormData.full_name.trim()) {
      setEditUserErrorMsg('Nome completo é obrigatório.');
      return;
    }
    setLoadingUserEdit(true);
    setEditUserErrorMsg(null);
    try {
      const result = await api.updateUser(editingUserId, {
        full_name: editUserFormData.full_name.trim(),
        role: editUserFormData.role,
      });
      if (result.success) {
        showToast('Usuário atualizado com sucesso!', 'success');
        setEditingUserId(null);
        loadUsers();
      } else {
        setEditUserErrorMsg(result.error || 'Erro ao atualizar usuário.');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Erro ao atualizar usuário. Tente novamente.', 'error');
    } finally {
      setLoadingUserEdit(false);
    }
  };

  const handleDeleteUserClick = (user: UserProfile) => {
    if (!isAdminUser) {
      showToast('Apenas administradores podem excluir usuários.', 'error');
      return;
    }

    setUserToDelete(user);
    setShowDeleteUserModal(true);
    setEditUserErrorMsg(null);
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete || deletingUser) return;

    setDeletingUser(true);

    try {
      const result = await api.deleteUser(userToDelete.id);

      if (result.success) {
        showToast(`Usuário ${userToDelete.email ?? userToDelete.full_name ?? ''} excluído com sucesso!`, 'success');
        setShowDeleteUserModal(false);
        setUserToDelete(null);
        setEditingUserId((current) => (current === userToDelete.id ? null : current));
        loadUsers();
      } else {
        const message = result.error || 'Erro ao excluir usuário.';
        setEditUserErrorMsg(message);
        showToast(message, 'error');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Erro ao excluir usuário. Tente novamente.', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const handleEdit = (collection: Collection) => {
    const initialData = buildCollectionFormData({
      ...collection,
      collection_assets: inferCollectionAssets(collection),
    });
    setEditingId(collection.id);
    setActiveTab(defaultCollectionTab);
    setFormData(initialData);
    setOriginalFormData(initialData);
  };

  const handleDeleteClick = (id: string) => {
    if (!isAdminUser) {
      showToast('Apenas administradores podem excluir coleções.', 'error');
      return;
    }
    setCollectionToDelete(id);
    setShowDeleteModal(true);
    setOpenActionsDropdown(null);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const success = await api.deleteCollection(collectionToDelete);
      if (success) {
        if (editingId === collectionToDelete) {
          setEditingId(null);
          setShowCreateForm(false);
          setActiveTab(defaultCollectionTab);
          resetForm();
        }
        showToast('Coleção excluída com sucesso!', 'success');
        loadCollections();
      } else {
        showToast('Erro ao excluir coleção.', 'error');
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      showToast('Erro ao excluir coleção. Tente novamente.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setCollectionToDelete(null);
    }
  };

  const buildCollectionPayload = (data: Partial<Collection>): Partial<Collection> => {
    const payload: Partial<Collection> = { ...data };

    if (payload.primary_segment) {
      if (payload.primary_segment === 'Educação Infantil') {
        payload.level = 'Educação Infantil';
      } else {
        payload.level = 'Fundamental I';
      }
    }

    payload.collection_type = payload.collection_type || 'book';
    payload.kit_cover_image = payload.collection_type === 'kit'
      ? payload.kit_cover_image?.trim() || null
      : null;
    payload.kit_book_ids = payload.collection_type === 'kit'
      ? normalizeKitBookIds(payload.kit_book_ids)
      : [];

    return syncCollectionWithAssets(payload);
  };

  const handleSave = async () => {
    if (!formData.title) {
      showToast('Título é obrigatório.', 'error');
      return;
    }

    const normalizedDataToSave = buildCollectionPayload(formData);

    setIsSaving(true);
    let success = false;
    let errorMessage = '';

    if (editingId) {
      const updated = await api.updateCollection(editingId, normalizedDataToSave);
      success = !!updated;
      if (!success) {
        errorMessage = 'Erro ao atualizar coleção. Verifique suas permissões e tente novamente.';
      }
    } else {
      const created = await api.createCollection(normalizedDataToSave);
      success = !!created;
      if (!success) {
        errorMessage = 'Erro ao criar coleção. Verifique suas permissões e tente novamente.';
      }
    }

    if (success) {
      setOriginalFormData(buildCollectionFormData(normalizedDataToSave));
      showToast(editingId ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!', 'success');
      setEditingId(null);
      setShowCreateForm(false);
      setActiveTab(defaultCollectionTab);
      resetForm();
      loadCollections();
    } else {
      showToast(errorMessage || 'Erro ao salvar coleção. Tente novamente.', 'error');
    }
    setIsSaving(false);
  };

  const hasUnsavedChanges = (): boolean => {
    if (!originalFormData) return false;

    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  useImperativeHandle(ref, () => ({
    hasUnsavedChanges,
  }));

  const resetForm = () => {
    setFormData(buildCollectionFormData());
    setOriginalFormData(null);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setPendingAction(() => () => {
        setEditingId(null);
        setShowCreateForm(false);
        setActiveTab(defaultCollectionTab);
        resetForm();
      });
      setShowUnsavedChangesModal(true);
    } else {
      setEditingId(null);
      setShowCreateForm(false);
      setActiveTab(defaultCollectionTab);
      resetForm();
    }
  };

  const handleConfirmLeave = () => {
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
    setShowUnsavedChangesModal(false);
  };

  const handleBackClick = () => {
    // If we're in edit/create mode, go back to the list view
    if (editingId || showCreateForm) {
      if (hasUnsavedChanges()) {
        setPendingAction(() => () => {
          setEditingId(null);
          setShowCreateForm(false);
          setActiveTab(defaultCollectionTab);
          resetForm();
        });
        setShowUnsavedChangesModal(true);
      } else {
        setEditingId(null);
        setShowCreateForm(false);
        setActiveTab(defaultCollectionTab);
        resetForm();
      }
    } else {
      // If we're already on the list view, go back to previous screen
      onBack();
    }
  };

  const getFilteredAndSortedCollections = (): Collection[] => {
    let filtered = [...collections];

    // Apply search filter
    if (searchFilter.trim()) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(collection =>
        collection.title?.toLowerCase().includes(searchLower) ||
        collection.theme?.toLowerCase().includes(searchLower)
      );
    }

    // Apply level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(collection => collection.level === levelFilter);
    }

    // Apply alphabetical sorting
    if (sortOrder) {
      filtered.sort((a, b) => {
        const titleA = (a.title || '').toLowerCase();
        const titleB = (b.title || '').toLowerCase();
        const comparison = titleA.localeCompare(titleB, 'pt-BR');
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  };

  // Only show permission error if we've finished checking and user doesn't have permission
  if (!checkingPermission && !hasPermission) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8">
          <Icons.AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 font-bold">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white pb-24 md:pb-0">
      <PageHeader
        title="Gerenciar"
        onBack={handleBackClick}
        rightContent={
          mainTab === 'collections' && editingId ? (
            <div className="flex items-center gap-2">
              <div className="relative" ref={headerActionsRef}>
                <button
                  onClick={() => setShowHeaderActionsDropdown(!showHeaderActionsDropdown)}
                  className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-all active:scale-95"
                  aria-label="Ações da coleção"
                >
                  <Icons.MoreHorizontal size={20} className="text-gray-600" />
                </button>

                {showHeaderActionsDropdown && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                    {isAdminUser && (
                      <button
                        onClick={() => {
                          if (editingId) {
                            handleDeleteClick(editingId);
                            setShowHeaderActionsDropdown(false);
                          }
                        }}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl text-red-500 hover:bg-red-50 font-medium"
                      >
                        <Icons.Trash2 size={18} />
                        <span>Excluir Coleção</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null
        }
      />

      {/* Collections Tab Content */}
      {mainTab === 'collections' && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : editingId || showCreateForm ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {!isLibraryAreaMode && (
                  <Tabs
                    tabs={[
                      { id: 'identification', label: 'Dados da Coleção' },
                      { id: 'media', label: 'Arquivos de Mídia' }
                    ]}
                    activeTab={activeTab}
                    onChange={(tabId) => setActiveTab(tabId as any)}
                  />
                )}

                <div className="space-y-6">
                  {/* Tab: Dados da Coleção */}
                  {!isLibraryAreaMode && activeTab === 'identification' && (
                    <>
                      {/* Informações de Identificação Title */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Informações de Identificação</h3>
                      </div>

                      {/* 1.3. Título */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Título *</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
                          placeholder="Título da coleção"
                        />
                      </div>


                      {/* 1.1. Imagem de Capa and 1.2. Cor da Coleção in same row */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Formato exibido na vitrine</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(['book', 'kit'] as const).map((type) => {
                            const typeMeta = getCollectionTypeMeta({ collection_type: type });
                            const isActive = (formData.collection_type || 'book') === type;

                            return (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, collection_type: type })}
                                className={`w-full rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${isActive
                                  ? `${typeMeta.softClassName} shadow-sm`
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                  }`}
                              >
                                <span className="block text-sm font-black uppercase tracking-[0.14em]">{typeMeta.shortLabel}</span>
                                <span className="block text-xs mt-1 opacity-80">{typeMeta.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          Escolha se este item deve aparecer como livro avulso ou kit multimodal. Para kits, você pode enviar uma capa própria de vitrine; sem ela, a interface reaproveita a capa principal.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <FileUpload
                            label="Imagem de Capa"
                            value={formData.cover_image || placeholderImageUrl}
                            onChange={(url) => setFormData({ ...formData, cover_image: url })}
                            folder="covers"
                            accept="image/*"
                            collectionId={editingId || undefined}
                            hideUrlInput={true}
                          />
                        </div>

                        <div>
                          <ColorPicker
                            label="Cor da Coleção"
                            value={formData.color_theme || '#5D1F58'}
                            onChange={(color) => setFormData({ ...formData, color_theme: color })}
                          />
                        </div>
                      </div>

                      {formData.collection_type === 'kit' && (
                        <>
                          <div>
                            <FileUpload
                              label="Imagem da Capa do Kit"
                              value={formData.kit_cover_image || ''}
                              onChange={(url) => setFormData({ ...formData, kit_cover_image: url || null })}
                              folder="covers"
                              accept="image/*"
                              collectionId={editingId || undefined}
                              hideUrlInput={true}
                            />
                          </div>

                          <div className="rounded-2xl border border-gray-200 p-4 bg-white space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-gray-800">Livro do Kit</h4>
                                <p className="text-xs text-gray-500 mt-1">
                                  Selecione o livro avulso que faz parte deste kit. Ao escolher outro, ele substitui o vínculo anterior.
                                </p>
                              </div>
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black uppercase tracking-[0.12em] border border-amber-200 whitespace-nowrap">
                                {selectedKitBookIds.length === 1 ? '1 livro' : '0 livro'}
                              </span>
                            </div>

                            {availableKitBooks.length === 0 ? (
                              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                                Cadastre pelo menos um livro avulso para montar este kit.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {availableKitBooks.map((book) => {
                                  const isSelected = selectedKitBookIds.includes(book.id);
                                  const displayCoverImage = getCollectionDisplayCover(book) || book.cover_image;

                                  return (
                                    <button
                                      key={book.id}
                                      type="button"
                                      onClick={() => toggleKitBookSelection(book.id)}
                                      aria-pressed={isSelected}
                                      className={`w-full rounded-2xl border px-3 py-3 transition-all active:scale-[0.99] ${isSelected
                                        ? 'border-kaboo-primary bg-kaboo-primary/5 shadow-sm'
                                        : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <img
                                          src={displayCoverImage}
                                          alt=""
                                          aria-hidden="true"
                                          className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-gray-100 flex-shrink-0"
                                        />

                                        <div className="min-w-0 flex-1 text-left">
                                          <p className="text-sm font-bold text-gray-800 line-clamp-1">{book.title}</p>
                                          <p className="text-xs text-gray-500 line-clamp-1 mt-1">
                                            {formatSegmentLabel(book.level)}
                                            {book.theme ? ` • ${book.theme}` : ''}
                                          </p>
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected
                                            ? 'border-kaboo-primary bg-kaboo-primary text-white'
                                            : 'border-gray-300 bg-white text-transparent'
                                            }`}>
                                            <Icons.Check size={14} />
                                          </span>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* 1.10. Personagens */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Personagens</label>
                          <p className="text-xs text-gray-500 mb-3">
                            Selecione os personagens cadastrados para manter a coleção sincronizada com a vitrine pública.
                          </p>

                          {selectableCharacters.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                              Nenhum personagem cadastrado ainda. Use o módulo Personagens para criar o catálogo.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {selectableCharacters.map((character) => {
                                const isSelected = selectedCharacterIds.includes(character.id);
                                return (
                                  <button
                                    key={character.id}
                                    type="button"
                                    onClick={() => toggleCharacterSelection(character.id)}
                                    className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.99] ${isSelected
                                      ? 'border-kaboo-primary bg-kaboo-primary/5 shadow-sm'
                                      : 'border-gray-200 bg-white hover:bg-gray-50'
                                      } ${(character.status || 'active') === 'inactive' ? 'opacity-70' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <CharacterAvatar
                                        name={character.name}
                                        className="h-12 w-12 shrink-0 rounded-2xl"
                                        imageClassName="absolute inset-0 h-full w-full object-cover"
                                        initialClassName="absolute inset-0 flex items-center justify-center text-sm font-black text-white/80"
                                      />

                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <span className="truncate text-sm font-bold text-gray-800">{character.name}</span>
                                          {(character.status || 'active') === 'inactive' && (
                                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-600">
                                              Inativo
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                          {character.description || 'Sem descrição cadastrada.'}
                                        </p>
                                      </div>

                                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${isSelected ? 'border-kaboo-primary bg-kaboo-primary text-white' : 'border-gray-300 text-transparent'}`}>
                                        <Icons.Check size={14} />
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <TagInput
                          label="Nomes legados não mapeados"
                          value={unmappedLegacyCharacters}
                          onChange={setLegacyCharacterNames}
                          placeholder="Digite um nome legado e pressione Enter"
                        />
                      </div>

                      {/* Separation line */}
                      <div className="border-t border-gray-200 my-6"></div>

                      {/* Informações Pedagógicas Title */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Informações Pedagógicas</h3>
                      </div>

                      {/* 1.4. Segmento */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Segmento</label>
                        <div className="relative" ref={formLevelDropdownRef}>
                          <button
                            onClick={() => setShowFormLevelDropdown(!showFormLevelDropdown)}
                            className="w-full h-14 bg-white border border-gray-200 rounded-2xl px-4 flex items-center justify-between transition-all active:scale-95 shadow-sm font-bold text-sm text-gray-800 hover:bg-gray-50"
                          >
                            <span>{formatSegmentLabel(formData.level)}</span>
                            <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showFormLevelDropdown ? 'rotate-180' : ''}`} />
                          </button>

                          {showFormLevelDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top">
                              <button
                                onClick={() => {
                                  setFormData({ ...formData, level: 'Educação Infantil' });
                                  setShowFormLevelDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${formData.level === 'Educação Infantil'
                                  ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 font-medium'
                                  }`}
                              >
                                <span>Educação Infantil</span>
                                {formData.level === 'Educação Infantil' && <Icons.Check size={18} className="ml-auto" />}
                              </button>
                              <button
                                onClick={() => {
                                  setFormData({ ...formData, level: 'Fundamental I' });
                                  setShowFormLevelDropdown(false);
                                }}
                                className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${formData.level === 'Fundamental I'
                                  ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                                  : 'text-gray-700 hover:bg-gray-50 font-medium'
                                  }`}
                              >
                                <span>E.F. Anos Iniciais</span>
                                {formData.level === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Multissegmentos */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Segmentos</label>
                        <div className="space-y-2">
                          {AVAILABLE_SEGMENTS.map((seg) => {
                            const checked = formData.segments?.includes(seg) ?? false;
                            const isPrimary = formData.primary_segment === seg;
                            return (
                              <div key={seg} className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const prev = formData.segments || [];
                                      let next: string[];
                                      if (checked) {
                                        next = prev.filter(s => s !== seg);
                                        // If removing the primary, pick the first remaining or clear
                                        if (isPrimary) {
                                          setFormData({ ...formData, segments: next, primary_segment: next[0] || '' });
                                          return;
                                        }
                                      } else {
                                        next = [...prev, seg];
                                        // Auto-set primary if first segment
                                        if (next.length === 1) {
                                          setFormData({ ...formData, segments: next, primary_segment: seg });
                                          return;
                                        }
                                      }
                                      setFormData({ ...formData, segments: next });
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-kaboo-primary focus:ring-kaboo-primary"
                                  />
                                  <span className="text-sm text-gray-800">{seg}</span>
                                </label>
                                {checked && (
                                  <label className="flex items-center gap-1 cursor-pointer text-xs text-gray-500 shrink-0">
                                    <input
                                      type="radio"
                                      name="primary_segment"
                                      checked={isPrimary}
                                      onChange={() => setFormData({ ...formData, primary_segment: seg })}
                                      className="w-3 h-3 text-kaboo-primary focus:ring-kaboo-primary"
                                    />
                                    <span className={isPrimary ? 'font-bold text-kaboo-primary' : ''}>Principal</span>
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ano Escolar */}
                      <div>
                        <TagInput
                          label="Ano Escolar"
                          value={formData.age_grade || []}
                          onChange={(tags) => setFormData({ ...formData, age_grade: tags })}
                          placeholder="Digite um ano escolar e pressione Enter"
                        />
                      </div>

                      {/* 1.6. Sinopse */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Sinopse</label>
                        <textarea
                          value={formData.synopsis || ''}
                          onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none min-h-[80px]"
                          placeholder="Sinopse editorial da coleção (opcional)"
                        />
                      </div>

                      {/* 1.7. Tema */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Tema</label>
                        <input
                          type="text"
                          value={formData.theme}
                          onChange={(e) => setFormData({ ...formData, theme: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
                          placeholder="Tema da coleção"
                        />
                      </div>

                      {/* 1.7. Objetivos de Aprendizado */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Objetivos de Aprendizado</label>
                        <textarea
                          value={formData.learning_objectives}
                          onChange={(e) => setFormData({ ...formData, learning_objectives: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none min-h-[100px]"
                          placeholder="Objetivos de aprendizado..."
                        />
                      </div>

                      {/* 1.8. Habilidades BNCC */}
                      <div>
                        <TagInput
                          label="Habilidades BNCC"
                          value={formData.bncc_skills || []}
                          onChange={(tags) => setFormData({ ...formData, bncc_skills: tags })}
                          placeholder="Digite uma habilidade BNCC e pressione Enter"
                        />
                      </div>

                      {/* 1.9. Competências Casel */}
                      <div>
                        <TagInput
                          label="Competências Casel"
                          value={formData.casel_competencies || []}
                          onChange={(tags) => setFormData({ ...formData, casel_competencies: tags })}
                          placeholder="Digite uma competência Casel e pressione Enter"
                        />
                      </div>
                    </>
                  )}

                  {/* Tab: Arquivos de Mídia */}
                  {activeTab === 'media' && (
                    <>
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Arquivos de Mídia</h3>
                        {activeLibraryAreaLabel && (
                          <div className="rounded-2xl border border-kaboo-primary/20 bg-kaboo-primary/5 px-4 py-3 text-sm text-kaboo-primary mb-4">
                            <span className="font-bold">Área de cadastro: {activeLibraryAreaLabel}.</span> Os campos destacados são os mais usados para esta biblioteca.
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {FIXED_MEDIA_SLOTS.map((slot) => {
                          const asset = getAssetByCategory(slot.category);
                          const isPrimaryForArea = Boolean(
                            initialLibraryArea && LIBRARY_AREA_PRIMARY_SLOTS[initialLibraryArea].includes(slot.category)
                          );

                          return (
                            <div
                              key={slot.category}
                              className={`rounded-2xl border p-4 space-y-3 bg-white ${isPrimaryForArea ? 'border-kaboo-primary/35 bg-kaboo-primary/[0.03]' : 'border-gray-200'}`}
                            >
                              {isPrimaryForArea && (
                                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-kaboo-primary">Prioritário para {activeLibraryAreaLabel}</p>
                              )}
                              <FileUpload
                                label={slot.label}
                                value={asset?.url || ''}
                                onChange={(url) => {
                                  if (!url) {
                                    removeAsset(slot.category);
                                    return;
                                  }

                                  setAssetUrl(slot.category, url);
                                }}
                                folder={slot.folder}
                                accept={slot.accept}
                                collectionId={editingId || undefined}
                                showAsIcon={true}
                              />

                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                  Ou cole um link (YouTube ou arquivo direto)
                                </label>
                                <input
                                  type="url"
                                  value={asset?.url || ''}
                                  onChange={(event) => {
                                    const nextUrl = event.target.value;
                                    if (!nextUrl.trim()) {
                                      removeAsset(slot.category);
                                      return;
                                    }

                                    setAssetUrl(slot.category, nextUrl);
                                  }}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none"
                                />
                              </div>

                              {slot.allowMetadata && (
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Título opcional</label>
                                    <input
                                      type="text"
                                      value={asset?.title || ''}
                                      onChange={(event) => setAssetTitle(slot.category, event.target.value)}
                                      disabled={!asset?.url}
                                      placeholder={slot.titlePlaceholder}
                                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none disabled:opacity-60"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Descrição opcional</label>
                                    <textarea
                                      value={asset?.description || ''}
                                      onChange={(event) => setAssetDescription(slot.category, event.target.value)}
                                      disabled={!asset?.url}
                                      placeholder={slot.descriptionPlaceholder}
                                      className="w-full min-h-[96px] resize-y bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none disabled:opacity-60"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                          {initialLibraryArea === 'materials' && (
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-kaboo-primary mb-3">Prioritário para Materiais</p>
                          )}
                          <MultipleFileUpload
                            label="Materiais da Coleção"
                            value={extraMaterialAssets.map((asset) => asset.url)}
                            onChange={setExtraMaterialUrls}
                            folder="extras"
                            accept="*/*"
                            collectionId={editingId || undefined}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4 border-t border-gray-200">
                    <Button variant="secondary" fullWidth onClick={handleCancel} disabled={isSaving}>
                      Cancelar
                    </Button>
                    <Button variant="primary" fullWidth onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Coleção')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              {collections.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">Nenhuma coleção encontrada.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Filtros e Ordenação */}
                  <div className="flex flex-col md:flex-row gap-3">
                    {/* Campo de Busca */}
                    <div className="flex-1">
                      <div className="relative">
                        <Icons.Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          placeholder="Buscar por título ou tema..."
                          className="w-full bg-gray-100 border-none rounded-2xl pl-12 pr-4 py-3 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all font-medium"
                        />
                      </div>
                    </div>

                    {/* Filtro de Segmento com Dropdown */}
                    <div className="md:w-48 relative" ref={levelDropdownRef}>
                      <button
                        onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                        className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm w-full justify-between ${levelFilter !== 'all'
                          ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-kaboo-primary/20'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                          }`}
                      >
                        <span className="truncate">
                          {levelFilter === 'all' ? 'Todos os segmentos' : formatSegmentLabel(levelFilter)}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showLevelDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showLevelDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                          <button
                            onClick={() => {
                              setLevelFilter('all');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${levelFilter === 'all'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Todos os segmentos</span>
                            {levelFilter === 'all' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setLevelFilter('Educação Infantil');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${levelFilter === 'Educação Infantil'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Educação Infantil</span>
                            {levelFilter === 'Educação Infantil' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setLevelFilter('Fundamental I');
                              setShowLevelDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${levelFilter === 'Fundamental I'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>E.F. Anos Iniciais</span>
                            {levelFilter === 'Fundamental I' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão de Ordenação com Dropdown */}
                    <div className="relative" ref={sortDropdownRef}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowSortDropdown(!showSortDropdown)}
                          className={`h-11 px-4 rounded-2xl flex items-center gap-2 border transition-all active:scale-95 shadow-sm font-bold text-sm ${sortOrder
                            ? 'bg-kaboo-primary text-white border-kaboo-primary shadow-kaboo-primary/20'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                          {sortOrder === 'asc' ? (
                            <>
                              <span className="hidden md:inline-block">A - Z</span>
                            </>
                          ) : sortOrder === 'desc' ? (
                            <>
                              <span className="hidden md:inline-block">Z - A</span>
                            </>
                          ) : (
                            <>
                              <Icons.ArrowUpDown size={18} />
                              <span>Ordenar</span>
                            </>
                          )}
                          <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showSortDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {sortOrder && (
                          <button
                            onClick={() => setSortOrder(null)}
                            className="h-11 w-11 rounded-2xl flex items-center justify-center border border-kaboo-primary bg-kaboo-primary text-white hover:bg-opacity-90 transition-all active:scale-95 shadow-sm shadow-kaboo-primary/20"
                            title="Remover ordenação"
                          >
                            <Icons.X size={18} />
                          </button>
                        )}
                      </div>

                      {showSortDropdown && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top-right">
                          <button
                            onClick={() => {
                              setSortOrder('asc');
                              setShowSortDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${sortOrder === 'asc'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <Icons.ArrowDown size={18} />
                            <span>Crescente (A - Z)</span>
                            {sortOrder === 'asc' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            onClick={() => {
                              setSortOrder('desc');
                              setShowSortDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${sortOrder === 'desc'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <Icons.ArrowUp size={18} />
                            <span>Decrescente (Z - A)</span>
                            {sortOrder === 'desc' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Botão Nova Coleção */}
                    {!editingId && !showCreateForm && (
                      <button
                        onClick={() => {
                          if (hasUnsavedChanges()) {
                            setPendingAction(() => () => {
                              const emptyFormData = buildCollectionFormData();
                              setShowCreateForm(true);
                              setActiveTab(defaultCollectionTab);
                              setFormData(emptyFormData);
                              setOriginalFormData(emptyFormData);
                            });
                            setShowUnsavedChangesModal(true);
                          } else {
                            const emptyFormData = buildCollectionFormData();
                            setShowCreateForm(true);
                            setActiveTab(defaultCollectionTab);
                            setFormData(emptyFormData);
                            setOriginalFormData(emptyFormData);
                          }
                        }}
                        className="h-11 px-6 rounded-2xl bg-kaboo-primary text-white flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 shadow-sm font-bold text-sm whitespace-nowrap"
                      >
                        <Icons.Plus size={18} />
                        <span>Nova Coleção</span>
                      </button>
                    )}
                  </div>

                  {/* Lista de Coleções */}
                  {getFilteredAndSortedCollections().length === 0 ? (
                    <div className="text-center py-12">
                      <Icons.BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
                      <p className="text-gray-500 font-bold">
                        {collections.length > 0 ? 'Nenhuma coleção corresponde aos filtros.' : 'Nenhuma coleção encontrada.'}
                      </p>
                      {collections.length > 0 && (searchFilter || levelFilter !== 'all' || sortOrder) && (
                        <button
                          onClick={() => { setSearchFilter(''); setLevelFilter('all'); setSortOrder(null); }}
                          className="mt-3 text-sm font-bold text-kaboo-primary hover:underline"
                        >
                          Limpar filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                      {getFilteredAndSortedCollections().map((collection) => {
                        const actionsButton = (
                          <div
                            className="actions-button"
                            ref={(el) => {
                              actionsDropdownRefs.current[collection.id] = el;
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setOpenActionsDropdown(openActionsDropdown === collection.id ? null : collection.id);
                              }}
                              className="w-8 h-8 rounded-full bg-white/90 hover:bg-white border border-gray-200 flex items-center justify-center transition-all shadow-sm hover:shadow-md"
                              aria-label="Ações da coleção"
                            >
                              <Icons.MoreHorizontal size={18} className="text-gray-600" />
                            </button>

                            {openActionsDropdown === collection.id && (
                              <div
                                className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] animate-fade-in-up origin-top-right actions-dropdown"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                {isAdminUser && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      handleDeleteClick(collection.id);
                                      setOpenActionsDropdown(null);
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl text-red-500 hover:bg-red-50 font-medium"
                                  >
                                    <Icons.Trash2 size={18} />
                                    <span>Excluir</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );

                        return (
                          <div
                            key={collection.id}
                            className="cursor-pointer active:scale-95 transition-transform touch-manipulation"
                            style={{ touchAction: 'manipulation' }}
                            onClick={(e) => {
                              // Não abrir edição se clicar no botão de ações ou dropdown
                              const target = e.target as HTMLElement;
                              if (
                                target.closest('.actions-button') ||
                                target.closest('.actions-dropdown') ||
                                target.tagName === 'BUTTON' ||
                                target.closest('button')
                              ) {
                                e.stopPropagation();
                                return;
                              }
                              if (hasUnsavedChanges()) {
                                setPendingAction(() => () => {
                                  const initialData = buildCollectionFormData({
                                    ...collection,
                                    collection_assets: inferCollectionAssets(collection),
                                  });
                                  setEditingId(collection.id);
                                  setActiveTab(defaultCollectionTab);
                                  setFormData(initialData);
                                  setOriginalFormData(initialData);
                                });
                                setShowUnsavedChangesModal(true);
                              } else {
                                handleEdit(collection);
                              }
                            }}
                          >
                            {collection.cover_image && (() => {
                              const collectionTypeMeta = getCollectionTypeMeta(collection);
                              const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;

                              return (
                                <Card3DCover
                                  imageUrl={displayCoverImage}
                                  alt={collection.title}
                                  level={collection.level}
                                  collectionTypeLabel={collectionTypeMeta.shortLabel}
                                  collectionTypeBadgeClassName={collectionTypeMeta.coverClassName}
                                  actionsButton={actionsButton}
                                />
                              );
                            })()}

                            {collection.title && (
                              <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2 mt-3">
                                {collection.title}
                              </h3>
                            )}

                            <div className="mb-2">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.14em] ${getCollectionTypeMeta(collection).softClassName}`}>
                                {getCollectionTypeMeta(collection).label}
                              </span>
                            </div>

                            {collection.theme && collection.theme.trim() !== '' && (
                              <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">
                                {collection.theme}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Users Tab Content */}
      {mainTab === 'users' && (
        <>
          {editingUserId ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setEditingUserId(null)}
                    className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                  >
                    <Icons.ChevronLeft size={20} />
                  </button>
                  <h2 className="text-xl font-black text-gray-800">Editar Usuário</h2>
                </div>

                <form onSubmit={handleEditUserSave} className="space-y-5">
                  {/* Nome */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Nome completo</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editUserFormData.full_name}
                        onChange={(e) => { setEditUserFormData({ ...editUserFormData, full_name: e.target.value }); setEditUserErrorMsg(null); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                        placeholder="Nome completo do usuário"
                        required
                      />
                      <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Papel */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Papel</label>
                    <div className="relative" ref={editUserRoleRef}>
                      <button
                        type="button"
                        onClick={() => setEditUserRoleDropdownOpen(!editUserRoleDropdownOpen)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 pr-4 flex items-center justify-between text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      >
                        <span className="text-left">
                          {editUserFormData.role === 'admin' ? 'Administrador' : editUserFormData.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${editUserRoleDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <Icons.User className="absolute left-4 top-4 text-gray-400 pointer-events-none" size={20} />
                      {editUserRoleDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50">
                          {(['viewer', 'editor', 'admin'] as UserRole[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => { setEditUserFormData({ ...editUserFormData, role: r }); setEditUserRoleDropdownOpen(false); }}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl ${editUserFormData.role === r ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold' : 'text-gray-700 hover:bg-gray-50 font-medium'
                                }`}
                            >
                              <span>{r === 'admin' ? 'Administrador' : r === 'editor' ? 'Editor' : 'Visualizador'}</span>
                              {editUserFormData.role === r && <Icons.Check size={16} className="ml-auto" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {editUserErrorMsg && (
                    <div role="alert" className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center">
                      {editUserErrorMsg}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3">
                    {editingUser && (
                      <Button
                        type="button"
                        variant="danger"
                        fullWidth
                        onClick={() => handleDeleteUserClick(editingUser)}
                        disabled={loadingUserEdit || deletingUser}
                      >
                        {deletingUser && userToDelete?.id === editingUser.id ? 'Excluindo...' : 'Excluir usuário'}
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <Button type="submit" fullWidth disabled={loadingUserEdit}>
                      {loadingUserEdit ? 'Salvando...' : 'Salvar alterações'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : showUserForm ? (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserForm(false);
                      setUserFormData({
                        email: '',
                        full_name: '',
                        role: 'viewer',
                      });
                      setAcceptedTerms(false);
                      setUserErrorMsg(null);
                      setUserSuccessMsg(null);
                    }}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors text-gray-700"
                  >
                    <Icons.ChevronLeft size={24} />
                  </button>
                  <h1 className="text-xl font-bold text-gray-800 flex-1">Convidar colaborador</h1>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  {/* Registration Fields */}
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 ml-2">Nome Completo</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={userFormData.full_name}
                          onChange={(e) => { setUserFormData({ ...userFormData, full_name: e.target.value }); clearUserError(); }}
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                          placeholder="Seu nome"
                          required
                        />
                        <Icons.User className="absolute left-4 top-4 text-gray-400" size={20} />
                      </div>
                    </div>

                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">E-mail</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={userFormData.email}
                        onChange={(e) => { setUserFormData({ ...userFormData, email: e.target.value }); clearUserError(); }}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                        placeholder="email@exemplo.com.br"
                        required
                      />
                      <Icons.Mail className="absolute left-4 top-4 text-gray-400" size={20} />
                    </div>
                  </div>

                  {/* Password Field removed — collaborator sets password via invite email */}

                  {/* Role Field */}
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-600 ml-2">Função</label>
                    <div className="relative" ref={roleDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 pr-4 flex items-center justify-between text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none transition-all"
                      >
                        <span className="text-left">
                          {userFormData.role === 'admin' ? 'Administrador' :
                            userFormData.role === 'editor' ? 'Editor' : 'Visualizador'}
                        </span>
                        <Icons.ChevronDown size={16} className={`transition-transform flex-shrink-0 ${showRoleDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showRoleDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 animate-fade-in-up origin-top">
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'viewer' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors first:rounded-t-2xl ${userFormData.role === 'viewer'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Visualizador</span>
                            {userFormData.role === 'viewer' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'editor' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${userFormData.role === 'editor'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Editor</span>
                            {userFormData.role === 'editor' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUserFormData({ ...userFormData, role: 'admin' });
                              setShowRoleDropdown(false);
                            }}
                            className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors last:rounded-b-2xl ${userFormData.role === 'admin'
                              ? 'bg-kaboo-primary/10 text-kaboo-primary font-bold'
                              : 'text-gray-700 hover:bg-gray-50 font-medium'
                              }`}
                          >
                            <span>Administrador</span>
                            {userFormData.role === 'admin' && <Icons.Check size={18} className="ml-auto" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isSupabaseConfigured ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 leading-relaxed flex items-start gap-2">
                      <Icons.Mail size={14} className="mt-0.5 shrink-0" />
                      <span>Um e-mail de convite será enviado automaticamente para que o colaborador defina a própria senha no primeiro acesso.</span>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs text-sky-800 leading-relaxed">
                      {userFormData.role === 'viewer'
                        ? 'No modo demonstração, o e-mail de convite não é enviado. O colaborador pode usar "Esqueci minha senha" na tela de login para definir a senha.'
                        : 'No modo demonstração, editores e administradores criados por aqui entram com acesso ativo para fins operacionais.'}
                    </div>
                  )}

                  {/* Privacy Policy Checkbox */}
                  <div className="flex items-center gap-3 px-2 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="relative flex items-center justify-center shrink-0">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={acceptedTerms}
                        onChange={(e) => {
                          setAcceptedTerms(e.target.checked);
                          clearUserError();
                        }}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border-2 border-gray-300 transition-all checked:border-kaboo-primary checked:bg-kaboo-primary focus:ring-2 focus:ring-kaboo-primary/30 outline-none"
                      />
                      <Icons.Check
                        size={14}
                        strokeWidth={4}
                        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity"
                      />
                    </div>
                    <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer select-none leading-tight">
                      Li e concordo com a <button type="button" className="text-kaboo-primary font-bold hover:underline">política de privacidade</button> do Mundo de Kaboo.
                    </label>
                  </div>

                  {/* Error Message */}
                  {userErrorMsg && (
                    <div className="bg-red-50 text-red-500 text-sm p-3 rounded-xl font-medium text-center animate-in fade-in" role="alert">
                      {userErrorMsg}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button type="submit" fullWidth disabled={isCreatingUser}>
                      {isCreatingUser ? 'Enviando convite...' : 'Enviar convite por e-mail'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-6 pt-0">
              {isAdminUser && (
                <div className="mb-6">
                  <button
                    onClick={() => { setUserErrorMsg(null); setUserSuccessMsg(null); setShowUserForm(true); }}
                    className="h-11 px-6 rounded-2xl bg-kaboo-primary text-white flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95 shadow-sm font-bold text-sm"
                  >
                    <Icons.Plus size={18} />
                    <span>Novo Usuário</span>
                  </button>
                </div>
              )}
              {loadingUsers ? (
                <div className="flex items-center justify-center h-64">
                  <div className="w-8 h-8 border-4 border-kaboo-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Icons.User size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500 font-bold">Nenhum usuário encontrado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    {[
                      { label: 'Total', value: accessSummary.total, tone: 'bg-gray-100 text-gray-700' },
                      { label: 'Ativos', value: accessSummary.active, tone: 'bg-emerald-100 text-emerald-700' },
                      { label: 'Aguardando acesso', value: pendingInviteCount, tone: 'bg-amber-100 text-amber-700' },
                      { label: 'Aguardando voucher', value: accessSummary.pending_voucher, tone: 'bg-yellow-100 text-yellow-700' },
                      { label: 'Expirados', value: accessSummary.expired, tone: 'bg-orange-100 text-orange-700' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-gray-500 mb-2">{item.label}</p>
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-black ${item.tone}`}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {users.map((user) => (
                    (() => {
                      const authBadge = getAuthBadgeMeta(user);
                      const isWaitingFirstAccess = !user.last_sign_in_at && Boolean(user.invited_at);

                      return (
                        <div
                          key={user.id}
                          className={`rounded-2xl p-4 border transition-all ${isWaitingFirstAccess
                            ? 'bg-gray-50/80 border-gray-300 border-dashed opacity-80'
                            : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-800 text-base mb-1">
                                {user.full_name || 'Sem nome'}
                              </h3>
                              <p className="text-sm text-gray-600 mb-1">{user.email}</p>
                              <p className="text-xs text-gray-500">
                                Último acesso: {formatAdminDateTime(user.last_sign_in_at)}
                              </p>
                              {user.invited_at && !user.last_sign_in_at && (
                                <p className="text-xs text-gray-400 mt-1">
                                  Convite enviado em {formatAdminDateTime(user.invited_at)}
                                </p>
                              )}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${getAccessBadgeClasses(user)}`}>
                                  {getAccessStatusLabel(getProfileAccessStatus(user))}
                                </span>
                                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${authBadge.classes}`}>
                                  {authBadge.label}
                                </span>
                                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                                  Vigencia: {formatAccessDate(user.access_expires_at)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4 flex flex-col items-end gap-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : user.role === 'editor'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                                }`}>
                                {user.role === 'admin' ? 'Admin' :
                                  user.role === 'editor' ? 'Editor' : 'Visualizador'}
                              </span>
                              {isAdminUser && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleEditUserOpen(user)}
                                    className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-kaboo-primary transition-colors"
                                    title="Editar usuário"
                                  >
                                    <Icons.Edit size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUserClick(user)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Excluir usuário"
                                  >
                                    <Icons.Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Excluir Coleção"
        message="Tem certeza que deseja excluir esta coleção? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (isDeleting) return;
          setShowDeleteModal(false);
          setCollectionToDelete(null);
        }}
        danger={true}
        loading={isDeleting}
      />

      <ConfirmationModal
        isOpen={showDeleteUserModal}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir ${userToDelete?.email ?? userToDelete?.full_name ?? 'este usuário'}? Esta ação remove o acesso e apaga o usuário do banco.`}
        confirmText="Excluir usuário"
        cancelText="Cancelar"
        onConfirm={handleDeleteUserConfirm}
        onCancel={() => {
          if (deletingUser) return;
          setShowDeleteUserModal(false);
          setUserToDelete(null);
        }}
        danger={true}
        loading={deletingUser}
      />

      {/* Unsaved Changes Modal */}
      <ConfirmationModal
        isOpen={showUnsavedChangesModal}
        title="Alterações não salvas"
        message="Deseja salvar suas alterações antes de sair?"
        confirmText="Salvar e Sair"
        cancelText="Descartar Alterações"
        onConfirm={async () => {
          // Save first, then execute pending action
          if (!formData.title) {
            showToast('Título é obrigatório para salvar.', 'error');
            setShowUnsavedChangesModal(false);
            setPendingAction(null);
            return;
          }

          let success = false;
          const payload = buildCollectionPayload(formData);

          if (editingId) {
            const updated = await api.updateCollection(editingId, payload);
            success = !!updated;
          } else {
            const created = await api.createCollection(payload);
            success = !!created;
          }

          if (success) {
            setShowUnsavedChangesModal(false);
            showToast(editingId ? 'Coleção atualizada com sucesso!' : 'Coleção criada com sucesso!', 'success');
            // Update original to reflect saved state
            setOriginalFormData(buildCollectionFormData(payload));
            // Execute pending action (navigate away, etc.)
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
            // Reset form and reload
            resetForm();
            loadCollections();
          } else {
            showToast('Erro ao salvar. As alterações não foram salvas.', 'error');
            setShowUnsavedChangesModal(false);
            setPendingAction(null);
          }
        }}
        onCancel={() => {
          setShowUnsavedChangesModal(false);
          // Execute pending action without saving
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
        }}
      />
    </div>
  );
});
