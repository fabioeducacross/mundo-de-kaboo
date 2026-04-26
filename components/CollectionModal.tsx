import React, { useEffect, useRef, useState } from 'react';
import { Icons } from './Icons';
import { Collection, ScreenName } from '../types';
import { DetailsScreen } from '../screens/DetailsScreen';
import { ModalSkeleton } from './ModalSkeleton';
import { api } from '../lib/api';

interface CollectionModalProps {
  collection: Collection | null;
  isOpen: boolean;
  initialStackIds?: string[];
  onClose: () => void;
  onNavigate: (screen: ScreenName, params?: any) => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({
  collection,
  isOpen,
  initialStackIds,
  onClose,
  onNavigate
}) => {
  const [showContent, setShowContent] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [collectionStack, setCollectionStack] = useState<Collection[]>([]);
  const activeCollection = collectionStack[collectionStack.length - 1] || collection;
  const parentCollection = collectionStack.length > 1 ? collectionStack[collectionStack.length - 2] : null;
  // Keep a stable ref to onClose so the escape handler always calls the latest version
  // without causing Effect 1 to re-run (and reset state) on every parent render
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  // Reset state and manage body scroll when modal opens/closes
  // NOTE: onClose intentionally excluded from deps — use onCloseRef instead
  useEffect(() => {
    let isCancelled = false;

    if (isOpen && collection) {
      const normalizedStackIds = Array.isArray(initialStackIds) && initialStackIds.length > 0
        ? initialStackIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
        : [collection.id];

      const orderedStackIds = [
        collection.id,
        ...normalizedStackIds.filter((id) => id !== collection.id),
      ];
      const extraCollectionIds = orderedStackIds.slice(1);

      setCollectionStack([collection]);

      if (extraCollectionIds.length === 0) {
        return () => {
          isCancelled = true;
        };
      }

      Promise.all(extraCollectionIds.map(async (id) => {
        try {
          return await api.getCollectionById(id);
        } catch {
          return null;
        }
      })).then((resolvedCollections) => {
        if (isCancelled) {
          return;
        }

        const nextStack = [
          collection,
          ...resolvedCollections.filter((item): item is Collection => Boolean(item)),
        ];

        setCollectionStack(nextStack);
      });

      return () => {
        isCancelled = true;
      };
    }

    if (!isOpen) {
      setCollectionStack([]);
    }
  }, [isOpen, collection?.id, initialStackIds?.join('|')]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Reset states when modal opens
      setShowSkeleton(true);
      setShowContent(false);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle smooth transition from skeleton to content
  useEffect(() => {
    if (!isOpen) {
      setShowContent(false);
      setShowSkeleton(true);
      return;
    }

    if (!activeCollection) {
      setShowContent(false);
      setShowSkeleton(true);
      return;
    }

    // Small delay to ensure smooth transition each time the modal reopens.
    const skeletonTimer = window.setTimeout(() => {
      setShowSkeleton(false);
    }, 50);

    const contentTimer = window.setTimeout(() => {
      setShowContent(true);
    }, 150);

    return () => {
      window.clearTimeout(skeletonTimer);
      window.clearTimeout(contentTimer);
    };
  }, [isOpen, activeCollection?.id]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={(e) => {
        // Close when clicking backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-100" />

      {/* Modal Content */}
      <div className="relative w-full max-w-6xl h-[90vh] md:h-[95vh] bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col">
        {/* Close Button - Always visible on all screen sizes */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-gray-700 flex items-center justify-center hover:bg-white transition-all active:scale-95 border border-gray-200"
          aria-label="Fechar"
        >
          <Icons.X size={20} />
        </button>

        {/* Modal Body - Full Height Container */}
        <div className="flex-1 overflow-hidden flex min-h-0 relative">
          {/* Skeleton - fades out when content loads */}
          {showSkeleton && (
            <div className={`absolute inset-0 ${activeCollection ? 'skeleton-fade-out' : ''}`}>
              <ModalSkeleton />
            </div>
          )}

          {/* Content - fades in when ready */}
          {activeCollection && showContent && (
            <div className="flex-1 content-fade-in">
              <DetailsScreen
                collection={activeCollection}
                onNavigate={(screen, params) => {
                  // Close modal when navigating to player screens
                  if (['player_book', 'player_audio', 'player_video'].includes(screen)) {
                    onClose();
                  }
                  onNavigate(screen, ['player_book', 'player_audio', 'player_video'].includes(screen)
                    ? {
                      ...params,
                      returnToModal: {
                        stackIds: collectionStack.map((item) => item.id),
                      },
                    }
                    : params);
                }}
                onBack={() => {
                  if (collectionStack.length > 1) {
                    setCollectionStack((currentStack) => currentStack.slice(0, -1));
                    return;
                  }

                  onClose();
                }}
                onOpenCollection={(nextCollection) => {
                  setCollectionStack((currentStack) => [...currentStack, nextCollection]);
                }}
                parentCollection={parentCollection}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
