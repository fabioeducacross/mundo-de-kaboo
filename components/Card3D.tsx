import React, { useState, useRef, useEffect } from 'react';
import { Collection } from '../types';
import useIsMobile from '../hooks/useIsMobile';
import { formatSegmentLabel } from '../constants';
import { getCollectionDisplayCover, getCollectionTypeMeta } from '../lib/collectionPresentation';

interface Card3DProps {
  collection: Collection & { progress?: number };
  onCollectionClick: (collection: Collection) => void;
  locked?: boolean;
}

// Global state for device orientation (shared across all cards)
let globalOrientation: { beta: number; gamma: number } | null = null;
let orientationListeners: Set<(orientation: { beta: number; gamma: number }) => void> = new Set();
let isOrientationListenerActive = false;
let orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

const setupGlobalOrientationListener = () => {
  if (isOrientationListenerActive || orientationHandler) return;

  orientationHandler = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;

    globalOrientation = { beta: e.beta, gamma: e.gamma };

    // Notify all listeners
    orientationListeners.forEach(listener => {
      listener(globalOrientation!);
    });
  };

  // For Android and older iOS (no permission needed)
  if (typeof DeviceOrientationEvent !== 'undefined') {
    window.addEventListener('deviceorientation', orientationHandler, { passive: true });
    isOrientationListenerActive = true;
    console.log('Device orientation listener activated');
  }
};

const requestIOSPermission = async (): Promise<boolean> => {
  if (typeof DeviceOrientationEvent === 'undefined') {
    console.log('DeviceOrientationEvent not available');
    return false;
  }

  if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
    try {
      console.log('Requesting device orientation permission...');
      const response = await (DeviceOrientationEvent as any).requestPermission();
      console.log('Permission response:', response);
      if (response === 'granted') {
        setupGlobalOrientationListener();
        return true;
      }
      return false;
    } catch (error) {
      console.log('Device orientation permission error:', error);
      return false;
    }
  } else {
    // No permission needed, setup directly
    setupGlobalOrientationListener();
    return true;
  }
};

export const Card3D: React.FC<Card3DProps> = ({ collection, onCollectionClick, locked }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;
  const collectionTypeMeta = getCollectionTypeMeta(collection);

  // Gyroscope effect for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleOrientationUpdate = (orientation: { beta: number; gamma: number }) => {
      // Convert device orientation to card tilt
      // beta: -180 to 180 (front-back tilt, 0 = flat)
      // gamma: -90 to 90 (left-right tilt, 0 = centered)
      // Increased rotation for more visible effect (max 25 degrees for mobile)
      const normalizedBeta = Math.max(-90, Math.min(90, orientation.beta));
      const normalizedGamma = Math.max(-90, Math.min(90, orientation.gamma));

      // More pronounced rotation for better visibility
      const rotateX = (normalizedBeta / 90) * -25; // Invert for natural feel, increased from 12 to 25
      const rotateY = (normalizedGamma / 90) * 25; // Increased from 12 to 25

      setTilt({
        x: Math.max(-25, Math.min(25, rotateX)),
        y: Math.max(-25, Math.min(25, rotateY))
      });
    };

    // Register this card's listener
    orientationListeners.add(handleOrientationUpdate);

    // Try to setup listener (works for Android immediately)
    setupGlobalOrientationListener();

    // If we already have orientation data, use it immediately
    if (globalOrientation) {
      handleOrientationUpdate(globalOrientation);
    }

    // Request permission on user interaction (iOS requires this)
    const requestPermissionOnInteraction = async (e: Event) => {
      // Don't stop propagation - let the click event bubble to the parent onClick
      // Only request permission if not already active
      if (!isOrientationListenerActive) {
        console.log('User interaction detected, requesting permission...');
        // Use setTimeout to avoid blocking the click event
        setTimeout(async () => {
          await requestIOSPermission();
        }, 0);
      }
    };

    // Add interaction listeners to request permission
    const cardElement = cardRef.current;
    if (cardElement) {
      // Use capture phase but don't stop propagation - let click work normally
      // Use passive: true to avoid blocking touch events
      cardElement.addEventListener('touchstart', requestPermissionOnInteraction, { once: true, passive: true, capture: false });
      // Don't add click listener - it interferes with the parent onClick
      // Permission will be requested on touchstart which is sufficient
    }

    return () => {
      orientationListeners.delete(handleOrientationUpdate);
      if (cardElement) {
        cardElement.removeEventListener('touchstart', requestPermissionOnInteraction);
      }
    };
  }, [isMobile]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only use mouse movement on desktop
    if (isMobile || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Normalize to -1 to 1 range and apply subtle rotation (max 8 degrees)
    const rotateX = (mouseY / (rect.height / 2)) * -8; // Max 8 degrees for subtlety
    const rotateY = (mouseX / (rect.width / 2)) * 8; // Max 8 degrees for subtlety

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    // Only reset on desktop
    if (!isMobile) {
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div
      key={collection.id}
      onClick={() => onCollectionClick(collection)}
      className="cursor-pointer active:scale-95 transition-transform touch-manipulation flex h-full flex-col w-full"
      style={{
        touchAction: 'manipulation',
      }}
    >
      <div
        ref={cardRef}
        className="mb-3 rounded-lg overflow-hidden relative group shadow-md shadow-gray-100 w-full"
        style={{
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
          transformStyle: 'preserve-3d',
          transition: isMobile
            ? 'transform 0.1s ease-out'
            : (tilt.x === 0 && tilt.y === 0 ? 'transform 0.5s ease-out' : 'transform 0.1s ease-out'),
          touchAction: 'manipulation',
          aspectRatio: '1 / 1',
          width: '100%',
          height: 'auto',
        }}
        onMouseMove={!isMobile ? handleMouseMove : undefined}
        onMouseLeave={!isMobile ? handleMouseLeave : undefined}
      >
        <img
          src={displayCoverImage}
          alt={collection.title}
          className="w-full h-full object-cover bg-gray-200"
          style={{
            transform: 'translateZ(20px)',
          }}
        />
        <div
          className={`absolute top-2 left-2 whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.14em] border backdrop-blur-sm ${collectionTypeMeta.coverClassName}`}
          style={{ transform: 'translateZ(30px)' }}
        >
          {collectionTypeMeta.shortLabel}
        </div>
        {/* Light reflection effect - moves based on tilt */}
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
        {/* Secondary light reflection for more realism */}
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Lock overlay for content-gated collections */}
        {locked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center" style={{ transform: 'translateZ(35px)' }}>
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-600">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
        )}

        {(() => {
          const segments = collection.segments;
          if (segments && segments.length > 1) {
            const visible = segments.slice(0, 2);
            const extra = segments.length - 2;
            return (
              <div className="absolute bottom-2 right-2 flex gap-1" style={{ transform: 'translateZ(30px)' }}>
                {visible.map((seg) => (
                  <span key={seg} className="px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50">
                    {formatSegmentLabel(seg)}
                  </span>
                ))}
                {extra > 0 && (
                  <span className="px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50">
                    +{extra}
                  </span>
                )}
              </div>
            );
          }
          const label = collection.level;
          if (!label) return null;
          return (
            <div
              className="absolute bottom-2 right-2 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-[10px] font-bold text-kaboo-primary shadow-sm border border-white/50"
              style={{ transform: 'translateZ(30px)' }}
            >
              {formatSegmentLabel(label)}
            </div>
          );
        })()}
      </div>

      {collection.title && (
        <h3 className="font-bold text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
          {collection.title}
        </h3>
      )}

      {collection.theme && collection.theme.trim() !== '' && (
        <p className="text-xs text-gray-500 line-clamp-1 mb-2 font-medium">
          {collection.theme}
        </p>
      )}

      {collection.progress !== undefined && collection.progress > 0 && (
        <div className="text-xs font-bold text-kaboo-light flex items-center gap-1 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-kaboo-light" />
          Em andamento
        </div>
      )}
    </div>
  );
};
