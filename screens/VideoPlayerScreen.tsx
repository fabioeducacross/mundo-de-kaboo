import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icons } from '../components/Icons';
import { Collection, MediaItemCard, ScreenName } from '../types';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { api } from '../lib/api';

interface VideoPlayerScreenProps {
  collection: Collection;
  mediaItemId?: string;
  assetUrl?: string;
  assetTitle?: string;
  onNavigate: (screen: ScreenName, params?: any) => void;
  onBack: () => void;
}

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

export const VideoPlayerScreen: React.FC<VideoPlayerScreenProps> = ({
  collection,
  mediaItemId,
  assetUrl,
  assetTitle,
  onNavigate,
  onBack,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [resolvedPlaybackUrl, setResolvedPlaybackUrl] = useState<string | null>(null);
  const [resolvedPlaybackTitle, setResolvedPlaybackTitle] = useState<string | null>(null);
  const [relatedItems, setRelatedItems] = useState<MediaItemCard[]>([]);
  const [itemDescription, setItemDescription] = useState<string>('');
  const [showShortcutsHint, setShowShortcutsHint] = useState(true);
  const [showMobileQueue, setShowMobileQueue] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const lastSavedAtRef = useRef(0);
  const lastSavedPositionRef = useRef(0);
  const saveInFlightRef = useRef(false);

  const themeColor = collection.color_theme || '#5D1F58';
  const resolvedVideoUrl = resolvedPlaybackUrl ?? assetUrl ?? collection.video_url;
  const resolvedTitle = resolvedPlaybackTitle ?? assetTitle ?? collection.title;
  const youtubeVideoId = getYouTubeVideoId(resolvedVideoUrl);
  const isYouTubeSource = Boolean(youtubeVideoId);
  const youtubeEmbedUrl = youtubeVideoId
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&playsinline=1&rel=0`
    : null;

  // Set browser background to black for video player
  useThemeBackground('#000000');

  useEffect(() => {
    // Hide controls initially after 3 seconds
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    setResolvedPlaybackUrl(null);
    setResolvedPlaybackTitle(null);

    if (!mediaItemId) {
      return () => {
        isActive = false;
      };
    }

    api.resolveMediaPlayback(mediaItemId)
      .then((session) => {
        if (!isActive) {
          return;
        }

        setResolvedPlaybackUrl(session.source.url ?? null);
        setResolvedPlaybackTitle(session.item.title);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setResolvedPlaybackUrl(null);
        setResolvedPlaybackTitle(null);
      });

    return () => {
      isActive = false;
    };
  }, [mediaItemId]);

  useEffect(() => {
    let isActive = true;

    setRelatedItems([]);
    setItemDescription('');

    const loadContext = async () => {
      try {
        const [hub, detail] = await Promise.all([
          api.getMediaHub('videos'),
          mediaItemId ? api.getMediaItem(mediaItemId) : Promise.resolve(null),
        ]);

        if (!isActive) {
          return;
        }

        const allItems = [
          ...(hub.hero ? [hub.hero] : []),
          ...hub.shelves.flatMap((shelf) => shelf.items),
        ];

        const unique = Array.from(new Map(allItems.map((item) => [item.id, item])).values());
        const filtered = unique
          .filter((item) => item.id !== mediaItemId)
          .slice(0, 10);

        setRelatedItems(filtered);
        setItemDescription(detail?.description ?? detail?.summary ?? collection.description ?? '');
      } catch {
        if (!isActive) {
          return;
        }

        setRelatedItems([]);
        setItemDescription(collection.description ?? '');
      }
    };

    loadContext();

    return () => {
      isActive = false;
    };
  }, [collection.description, mediaItemId]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const maybeSaveProgress = useCallback((force = false) => {
    if (!mediaItemId || saveInFlightRef.current) {
      return;
    }

    const positionSeconds = Math.max(0, Math.floor(currentTime));
    const totalDurationSeconds = Number.isFinite(duration) && duration > 0
      ? Math.floor(duration)
      : undefined;
    const progressPercent = totalDurationSeconds
      ? Math.max(0, Math.min(100, Math.round((positionSeconds / totalDurationSeconds) * 100)))
      : 0;

    if (!force) {
      const elapsedMs = Date.now() - lastSavedAtRef.current;
      const movedSeconds = Math.abs(positionSeconds - lastSavedPositionRef.current);

      if (elapsedMs < 10000 || movedSeconds < 5) {
        return;
      }
    }

    saveInFlightRef.current = true;

    api.saveMediaProgress({
      mediaItemId,
      lastPositionSeconds: positionSeconds,
      progressPercent,
      totalDurationSeconds,
      completed: totalDurationSeconds ? positionSeconds >= totalDurationSeconds - 2 : false,
    }).finally(() => {
      saveInFlightRef.current = false;
      lastSavedAtRef.current = Date.now();
      lastSavedPositionRef.current = positionSeconds;
    });
  }, [currentTime, duration, mediaItemId]);

  useEffect(() => {
    maybeSaveProgress(false);
  }, [currentTime, maybeSaveProgress]);

  useEffect(() => {
    return () => {
      maybeSaveProgress(true);
    };
  }, [maybeSaveProgress]);

  const handleBack = () => {
    maybeSaveProgress(true);
    onBack();
  };

  const togglePlay = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    if (!videoRef.current) return;
    try {
      setPlayError(null);
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        await videoRef.current.play();
        setIsPlaying(true);
      }
    } catch {
      setPlayError('Não foi possível reproduzir o vídeo. Toque novamente para tentar.');
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedData = () => {
    setIsLoading(false);
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    resetControlsTimeout();
    if (isYouTubeSource) return;
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSeekEnd = () => {
    maybeSaveProgress(true);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      if (newMutedState) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const skip = (seconds: number) => {
    resetControlsTimeout();
    if (isYouTubeSource) return;
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
    }
  };

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetControlsTimeout();
    if (isYouTubeSource) return;
    let newRate = 1.0;
    if (playbackRate === 1.0) newRate = 1.5;
    else if (playbackRate === 1.5) newRate = 2.0;
    else newRate = 1.0;

    setPlaybackRate(newRate);
    if (videoRef.current) videoRef.current.playbackRate = newRate;
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => console.log(err));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const remainingTime = Math.max(duration - currentTime, 0);
  const leadRelatedItem = relatedItems[0];

  const retryPlayback = async () => {
    resetControlsTimeout();

    if (!videoRef.current) {
      return;
    }

    setPlayError(null);
    setIsLoading(true);
    videoRef.current.load();

    try {
      await videoRef.current.play();
      setIsPlaying(true);
    } catch {
      setPlayError('Não foi possível iniciar o vídeo neste momento.');
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const openRelatedItem = (item: MediaItemCard) => {
    onNavigate('player_video', {
      collectionId: item.collectionId ?? collection.id,
      mediaItemId: item.id,
      assetTitle: item.title,
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === 'escape') {
        event.preventDefault();
        handleBack();
        return;
      }

      if (isYouTubeSource) {
        return;
      }

      if (key === ' ' || key === 'k') {
        event.preventDefault();
        togglePlay();
        return;
      }

      if (key === 'arrowleft' || key === 'j') {
        event.preventDefault();
        skip(-10);
        return;
      }

      if (key === 'arrowright' || key === 'l') {
        event.preventDefault();
        skip(10);
        return;
      }

      if (key === 'm') {
        event.preventDefault();
        if (videoRef.current) {
          const newMutedState = !isMuted;
          videoRef.current.muted = newMutedState;
          setIsMuted(newMutedState);
          if (newMutedState) {
            setVolume(0);
          } else {
            setVolume(1);
            videoRef.current.volume = 1;
          }
        }
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined);
        } else {
          document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleBack, isMuted, isYouTubeSource]);

  useEffect(() => {
    if (!showControls || !showShortcutsHint) {
      return;
    }

    const hintTimer = window.setTimeout(() => {
      setShowShortcutsHint(false);
    }, 5000);

    return () => {
      window.clearTimeout(hintTimer);
    };
  }, [showControls, showShortcutsHint]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden group"
      role="dialog"
      aria-modal="true"
      aria-label="Player de vídeo"
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      onClick={() => setShowControls(!showControls)}
    >
      {/* Dark overlay to darken background */}
      <div className="absolute inset-0 bg-black/10 z-0" />

      {/* Video Element */}
      {youtubeEmbedUrl ? (
        <iframe
          src={youtubeEmbedUrl}
          title={resolvedTitle || 'Vídeo do YouTube'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          onLoad={() => setIsLoading(false)}
        />
      ) : resolvedVideoUrl ? (
        <video
          ref={videoRef}
          src={resolvedVideoUrl}
          className="w-full h-full object-contain"
          playsInline
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          onTimeUpdate={handleTimeUpdate}
          onLoadedData={handleLoadedData}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => setIsLoading(false)}
          onPause={() => {
            setIsPlaying(false);
            maybeSaveProgress(true);
          }}
          onError={() => {
            setIsLoading(false);
            setIsPlaying(false);
            setPlayError('Não foi possível carregar o vídeo nesta conexão.');
          }}
          onEnded={() => {
            setIsPlaying(false);
            setShowControls(true);
            maybeSaveProgress(true);
          }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-white/15 bg-black/50 p-6 text-center backdrop-blur-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/70">Transmissão indisponível</p>
            <h2 className="mt-3 text-lg font-black text-white">Não conseguimos carregar este vídeo agora</h2>
            <p className="mt-2 text-sm text-white/80">
              Você pode voltar para a biblioteca ou seguir para outro conteúdo relacionado.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/20"
              >
                Voltar para biblioteca
              </button>
              {leadRelatedItem && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className="rounded-xl border border-white/20 bg-kaboo-primary/80 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-kaboo-primary"
                >
                  Tentar próximo vídeo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && (resolvedVideoUrl || youtubeEmbedUrl) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Play Error Message */}
      {playError && (
        <div className="absolute bottom-28 left-1/2 z-20 max-w-xs -translate-x-1/2 rounded-2xl border border-red-300/30 bg-red-500/85 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
          <p>{playError}</p>
          {resolvedVideoUrl && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                retryPlayback();
              }}
              className="mt-2 rounded-lg border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-white"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Overlay Gradient for controls visibility */}
      <div className={`absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 transition-opacity duration-300 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`} />

      {/* Controls Container */}
      <div className={`absolute inset-0 flex flex-col justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] md:p-6 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

        {/* Top Bar */}
        <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleBack}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
            aria-label="Voltar"
          >
            <Icons.ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          <div className="flex-1 px-3 text-center">
            <div className="inline-block max-w-[min(70vw,560px)] rounded-full border border-white/15 bg-black/30 px-4 py-2 shadow-lg backdrop-blur-md md:px-6">
              <h1 className="line-clamp-1 text-xs font-bold text-white drop-shadow-sm md:text-base">
                {resolvedTitle}
              </h1>
            </div>
          </div>

          <button
            onClick={toggleSpeed}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30 font-bold text-sm"
          >
            {playbackRate}x
          </button>
        </div>

        {showShortcutsHint && (
          <div className="pointer-events-none absolute right-4 top-16 hidden rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75 backdrop-blur-md md:block">
            Espaço/K: play, J/L: 10s, M: mute, F: full, ESC: voltar
          </div>
        )}

        {!isYouTubeSource && (
          <>
            {/* Center Play Button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-12" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => skip(-10)}
                className="text-white/70 hover:text-white transition-colors p-4 rounded-full hover:bg-white/10 active:scale-95 hidden md:block"
              >
                <div className="flex flex-col items-center">
                  <Icons.SkipBack size={32} />
                  <span className="text-[10px] font-bold">-10s</span>
                </div>
              </button>

              <button
                onClick={(e) => togglePlay(e)}
                className="w-20 h-20 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
              >
                {isPlaying ? (
                  <Icons.Pause size={36} fill="currentColor" strokeWidth={2} />
                ) : (
                  <Icons.Play size={36} fill="currentColor" strokeWidth={2} className="ml-1" />
                )}
              </button>

              <button
                onClick={() => skip(10)}
                className="text-white/70 hover:text-white transition-colors p-4 rounded-full hover:bg-white/10 active:scale-95 hidden md:block"
              >
                <div className="flex flex-col items-center">
                  <Icons.SkipForward size={32} />
                  <span className="text-[10px] font-bold">+10s</span>
                </div>
              </button>
            </div>

            {/* Bottom Control Dock */}
            <div className="w-full flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="mx-auto w-full max-w-[min(100%,980px)] rounded-2xl border border-white/20 bg-black/55 px-3 pb-3 pt-2 backdrop-blur-md shadow-[0_16px_40px_rgba(0,0,0,0.35)] md:px-4">
                <div className="flex items-center gap-2.5 text-[11px] font-bold text-white/85 md:text-xs">
                  <span className="tabular-nums">{formatTime(currentTime)}</span>
                  <div className="relative flex-1 h-4 flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={handleSeek}
                      onMouseUp={handleSeekEnd}
                      onTouchEnd={handleSeekEnd}
                      className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer focus:outline-none relative z-20 transition-all hover:h-2"
                      style={{
                        background: `linear-gradient(to right, ${themeColor} ${progressPercent}%, rgba(255,255,255,0.3) ${progressPercent}%)`
                      }}
                    />
                  </div>
                  <span className="tabular-nums text-white/70">-{formatTime(remainingTime)}</span>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 md:gap-2.5">
                    <button
                      onClick={() => skip(-10)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/90 transition-colors hover:bg-white/15"
                      aria-label="Voltar 10 segundos"
                      title="Voltar 10s (J)"
                    >
                      <Icons.SkipBack size={18} />
                    </button>
                    <button
                      onClick={(e) => togglePlay(e)}
                      className="inline-flex h-11 min-w-[52px] items-center justify-center rounded-xl border border-white/25 bg-white/10 px-3 text-white transition-colors hover:bg-white/20"
                      aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                      title="Play/Pause (Espaço ou K)"
                    >
                      {isPlaying ? <Icons.Pause size={20} fill="currentColor" /> : <Icons.Play size={20} fill="currentColor" className="ml-0.5" />}
                    </button>
                    <button
                      onClick={() => skip(10)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/90 transition-colors hover:bg-white/15"
                      aria-label="Avançar 10 segundos"
                      title="Avançar 10s (L)"
                    >
                      <Icons.SkipForward size={18} />
                    </button>
                    <p className="hidden text-xs font-bold text-white/80 sm:block">
                      <span className="tabular-nums">{formatTime(currentTime)}</span>
                      <span className="mx-1 text-white/45">/</span>
                      <span className="tabular-nums">{formatTime(duration)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2">
                    <button
                      onClick={toggleMute}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/90 transition-colors hover:bg-white/15"
                      title="Ativar/desativar som (M)"
                    >
                      {isMuted || volume === 0 ? <Icons.VolumeX size={18} /> : <Icons.Volume2 size={18} />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="hidden h-1 w-20 appearance-none rounded-lg bg-white/30 md:block"
                      style={{
                        background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.3) ${volume * 100}%)`
                      }}
                    />
                    <button
                      onClick={toggleSpeed}
                      className="inline-flex h-9 min-w-[44px] items-center justify-center rounded-lg border border-white/20 bg-white/5 px-2.5 text-xs font-black text-white transition-colors hover:bg-white/15"
                      title="Velocidade"
                    >
                      {playbackRate}x
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white/90 transition-colors hover:bg-white/15"
                      title="Tela cheia (F)"
                    >
                      {isFullscreen ? <Icons.Minimize size={18} /> : <Icons.Maximize size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {leadRelatedItem && (
                <button
                  type="button"
                  onClick={() => openRelatedItem(leadRelatedItem)}
                  className="mt-2 inline-flex w-full items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-white/85 transition-colors hover:bg-white/10 lg:hidden"
                >
                  <span className="min-w-0">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-white/60">Próximo</span>
                    <span className="mt-0.5 block truncate font-bold text-white">{leadRelatedItem.title}</span>
                  </span>
                  <Icons.ChevronRight size={14} className="shrink-0 text-white/70" />
                </button>
              )}
            </div>
          </>
        )}

        {isYouTubeSource && (
          <div className="pointer-events-auto mx-auto mb-2 w-full max-w-[min(100%,980px)] rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-xs text-white/80 backdrop-blur-md">
            Reprodução via YouTube: use os controles nativos do vídeo.
          </div>
        )}
      </div>

      {itemDescription && (
        <section className="pointer-events-auto absolute bottom-5 left-6 right-6 z-30 hidden rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-md lg:block lg:right-[380px]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Descrição</p>
          <p className="mt-2 text-sm leading-6 text-white/90 line-clamp-3">{itemDescription}</p>
        </section>
      )}

      <aside className="pointer-events-auto absolute bottom-6 right-6 top-24 z-30 hidden w-[340px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/45 backdrop-blur-md lg:flex">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
          <h2 className="mt-1 text-sm font-black text-white">Relacionados</h2>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {relatedItems.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70">
              Sem relacionados para este vídeo.
            </p>
          )}

          {relatedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => openRelatedItem(item)}
              className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10"
            >
              <div
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/10"
                style={item.thumbnailUrl ? {
                  backgroundImage: `url(${item.thumbnailUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                } : undefined}
              >
                <span className="absolute bottom-1 left-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white">
                  <Icons.Play size={10} className="ml-0.5 fill-current stroke-none" />
                </span>
              </div>

              <div className="min-w-0">
                <p className="line-clamp-2 text-[13px] font-bold leading-5 text-white">{item.title}</p>
                <p className="mt-1 text-[11px] text-white/70">{item.collectionTitle ?? 'Kaboo'}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={`pointer-events-auto absolute left-4 right-4 z-30 rounded-2xl border border-white/15 bg-black/55 p-3 backdrop-blur-md transition-all duration-300 lg:hidden ${showMobileQueue ? 'bottom-4 max-h-[52vh]' : 'bottom-20 max-h-[72px]'}`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between px-0.5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/65">Próximos vídeos</p>
          <button
            type="button"
            onClick={() => setShowMobileQueue((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-bold text-white/75"
          >
            {showMobileQueue ? 'Ocultar' : 'Mostrar'}
            <Icons.ChevronRight size={12} className={`transition-transform ${showMobileQueue ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {!showMobileQueue ? (
          <p className="text-[11px] text-white/70">
            {relatedItems.length > 0 ? `${relatedItems.length} vídeos na fila` : 'Sem vídeos na fila'}
          </p>
        ) : relatedItems.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            Sem relacionados para este vídeo.
          </p>
        ) : (
          <div className="max-h-[38vh] space-y-2 overflow-y-auto pr-0.5">
            {relatedItems.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openRelatedItem(item)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2 text-left transition-colors hover:bg-white/10"
              >
                <div
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/10"
                  style={item.thumbnailUrl ? {
                    backgroundImage: `url(${item.thumbnailUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  } : undefined}
                >
                  <span className="absolute bottom-1 left-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/65 text-white">
                    <Icons.Play size={8} className="ml-0.5 fill-current stroke-none" />
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="line-clamp-2 text-[12px] font-bold leading-4 text-white">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-white/70">{item.collectionTitle ?? 'Kaboo'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 50%;
          background: ${themeColor};
          cursor: pointer;
          margin-top: -5px; 
          box-shadow: 0 0 10px rgba(0,0,0,0.5);
          border: 2px solid white;
          transform: scale(0);
          transition: transform 0.1s;
        }
        .group:hover input[type=range]::-webkit-slider-thumb {
             transform: scale(1.2);
        }
        input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: transparent;
        }
        .group\\/vol input[type=range]::-webkit-slider-thumb {
            background: white;
            height: 12px;
            width: 12px;
            margin-top: -4px;
            border: none;
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            transform: scale(1);
        }
      `}</style>
    </div>
  );
};