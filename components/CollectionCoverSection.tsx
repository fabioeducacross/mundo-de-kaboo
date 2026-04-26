import React, { useState, useRef, useEffect } from 'react';
import { Collection } from '../types';
import { Icons } from './Icons';
import useIsMobile from '../hooks/useIsMobile';
import { GalaxyBackground } from './GalaxyBackground';
import { getCollectionDisplayCover, getCollectionTypeMeta } from '../lib/collectionPresentation';

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

interface CollectionCoverSectionProps {
  collection: Collection;
  headerContent?: React.ReactNode;
  isOffline?: boolean;
  headerPaddingTop?: string; // Custom padding-top for mobile (e.g., 'pt-6', 'pt-4')
  typeLabelOverride?: string;
}

export const CollectionCoverSection: React.FC<CollectionCoverSectionProps> = ({
  collection,
  headerContent,
  isOffline = false,
  headerPaddingTop = 'pt-12',
  typeLabelOverride,
}) => {
  const themeColor = collection.color_theme || '#5D1F58';
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const isMobile = useIsMobile();
  const displayCoverImage = getCollectionDisplayCover(collection) || collection.cover_image;
  const collectionTypeMeta = getCollectionTypeMeta(collection);
  const collectionTypeLabel = typeLabelOverride || collectionTypeMeta.label;

  // Smooth automatic 3D movement animation (desktop only, when not hovered)
  useEffect(() => {
    if (isMobile || isHovered) return;

    const animate = () => {
      timeRef.current += 0.01;

      // Create smooth circular/elliptical movement
      // Max 3 degrees for subtle automatic movement
      const autoTiltX = Math.sin(timeRef.current) * 3;
      const autoTiltY = Math.cos(timeRef.current * 0.8) * 3;

      setTilt({ x: autoTiltX, y: autoTiltY });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isMobile, isHovered]);

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

    // Add interaction listeners to request permission on multiple events
    const cardElement = cardRef.current;
    if (cardElement) {
      // Use capture phase but don't stop propagation - let click work normally
      // Use passive: true to avoid blocking touch events
      cardElement.addEventListener('touchstart', requestPermissionOnInteraction, { once: true, passive: true, capture: false });
      cardElement.addEventListener('touchend', requestPermissionOnInteraction, { once: true, passive: true, capture: false });
      // Also try on click as fallback
      cardElement.addEventListener('click', requestPermissionOnInteraction, { once: true, passive: true, capture: false });
    }

    // Also try to request permission when component mounts (may work on some devices)
    // This is a best-effort attempt, iOS will still require user interaction
    const tryInitialPermission = async () => {
      if (!isOrientationListenerActive && typeof DeviceOrientationEvent !== 'undefined') {
        // For Android, this should work immediately
        if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
          setupGlobalOrientationListener();
        }
      }
    };

    // Small delay to ensure component is mounted
    const timeoutId = setTimeout(tryInitialPermission, 100);

    return () => {
      orientationListeners.delete(handleOrientationUpdate);
      clearTimeout(timeoutId);
      if (cardElement) {
        cardElement.removeEventListener('touchstart', requestPermissionOnInteraction);
        cardElement.removeEventListener('touchend', requestPermissionOnInteraction);
        cardElement.removeEventListener('click', requestPermissionOnInteraction);
      }
    };
  }, [isMobile]);

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovered(true);
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
      setIsHovered(false);
      // Reset to center smoothly
      setTilt({ x: 0, y: 0 });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative md:w-1/3 h-64 md:h-full md:shrink-0 flex-shrink-0"
    >
      {/* Solid Background Container - Fills entire left column */}
      <div
        className="absolute inset-0 z-0"
        style={{ backgroundColor: themeColor }}
      />

      {/* Galaxy Effect - Using optimized component with cache */}
      <GalaxyBackground density={1.3} />

      {/* Navigation Header - Absolute positioned */}
      {headerContent && (
        <div className={`absolute top-0 left-0 right-0 z-20 px-6 ${headerPaddingTop} pb-4 md:p-8 text-white flex-shrink-0`}>
          {headerContent}
        </div>
      )}

      {/* Main Cover (Mobile & Desktop) - Full height container */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 py-6 z-30">
        <div
          ref={cardRef}
          className={`${isMobile ? 'w-48 h-48' : 'w-full'} rounded-lg shadow-2xl shadow-gray-400/60 relative group overflow-hidden shrink-0 mx-auto border border-black/10`}
          style={{
            WebkitMaskImage: '-webkit-radial-gradient(white, black)',
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1, 1, 1)`,
            transformStyle: 'preserve-3d',
            transition: isMobile
              ? 'transform 0.1s ease-out'
              : (isHovered ? 'transform 0.1s ease-out' : 'transform 0.3s ease-out'),
            touchAction: 'manipulation',
            ...(isMobile ? {} : {
              aspectRatio: '1 / 1',
              maxWidth: 'min(100%, calc(100vh - 200px))',
              width: 'min(100%, calc(100vh - 200px))',
            }),
          }}
          onMouseEnter={!isMobile ? handleMouseEnter : undefined}
          onMouseMove={!isMobile ? handleCardMouseMove : undefined}
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
            className={`absolute top-3 left-3 whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.16em] border backdrop-blur-sm ${collectionTypeMeta.coverClassName}`}
            style={{ transform: 'translateZ(30px)' }}
          >
            {collectionTypeLabel}
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
          {/* Offline Badge on Cover */}
          {isOffline && (
            <div
              className="absolute top-3 right-3 bg-kaboo-green text-white p-1.5 rounded-full shadow-md z-10 animate-in zoom-in duration-300"
              style={{
                transform: 'translateZ(30px)',
              }}
            >
              <Icons.Download size={14} strokeWidth={3} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
