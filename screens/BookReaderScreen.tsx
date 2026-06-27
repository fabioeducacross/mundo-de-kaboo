import React, { useState, useRef } from 'react';
import { Icons } from '../components/Icons';
import { Collection } from '../types';
import FlipbookViewer from '../components/flipbook/FlipbookViewer';
import useOrientation from '../hooks/useOrientation';
import useIsMobile from '../hooks/useIsMobile';
import { useThemeBackground } from '../hooks/useThemeBackground';
import { GalaxyBackground } from '../components/GalaxyBackground';
import { useOfflineDownload } from '../hooks/useOfflineDownload';

interface BookReaderScreenProps {
  collection: Collection;
  onBack: () => void;
  collectionTitle?: string;
  bookTitle?: string;
}

export const BookReaderScreen: React.FC<BookReaderScreenProps> = ({ collection, onBack, collectionTitle, bookTitle }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forcePortrait, setForcePortrait] = useState(false);
  const flipbookRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const readingKey = `kaboo_reading_${collection.id}_page`;
  const [currentPage, setCurrentPage] = useState(() => parseInt(localStorage.getItem(readingKey) ?? '0', 10));
  const [totalPages, setTotalPages] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const themeColor = collection.color_theme || '#5D1F58';
  const isLandscape = useOrientation();
  const isMobile = useIsMobile();
  const isMobileLandscape = isMobile && isLandscape;
  const readingAsset = collection.collection_assets?.find((asset) => asset.category === 'reading');
  const pdfUrl = readingAsset?.url?.trim() || collection.pdf_url?.trim() || '';
  const storytellingAsset = collection.collection_assets?.find((asset) => asset.category === 'storytelling');
  const audioUrl = storytellingAsset?.url?.trim() || '';
  const audioTitle = storytellingAsset?.title?.trim() || collection.title;
  const {
    isAvailable: canDownloadOffline,
    isDownloaded: isOfflineDownloaded,
    isDownloading: isOfflineDownloading,
    downloadError: offlineDownloadError,
    handleDownload: handleOfflineDownload,
    handleRemove: handleOfflineRemove,
  } = useOfflineDownload(
    collection,
    pdfUrl ? [pdfUrl] : [],
    readingAsset?.offline_available
  );
  
  // Set browser background to match theme color
  useThemeBackground(themeColor);
  
  // Helper function to get pagination text
  const getPaginationText = () => {
    if (totalPages === 0) return 'Carregando...';
    
    // currentPage is 0-based index from react-pageflip
    // Page 0 = first page (page 1 of PDF)
    // Page 1 = shows pages 2 and 3
    // Page 2 = shows pages 4 and 5
    // etc.
    
    if (currentPage === 0) {
      // First page shows single page
      return `1 de ${totalPages}`;
    }
    
    // For other pages, calculate which PDF pages are shown
    // react-pageflip shows 2 pages side by side (except first page)
    const firstPageNum = currentPage * 2; // Page 1 → 2, Page 2 → 4, etc.
    const secondPageNum = firstPageNum + 1;
    
    if (secondPageNum <= totalPages) {
      return `${firstPageNum} e ${secondPageNum} de ${totalPages}`;
    } else {
      // Last page might be single
      return `${firstPageNum} de ${totalPages}`;
    }
  };

  const formatAudioTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isAudioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsAudioPlaying(!isAudioPlaying);
  };

  const flipNext = () => {
    try {
      // Use the exposed flipNext method
      if (flipbookRef.current?.flipNext) {
        flipbookRef.current.flipNext();
      }
    } catch (error) {
      console.error('Error flipping next:', error);
    }
  };

  const flipPrev = () => {
    try {
      // Use the exposed flipPrev method
      if (flipbookRef.current?.flipPrev) {
        flipbookRef.current.flipPrev();
      }
    } catch (error) {
      console.error('Error flipping prev:', error);
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') flipPrev();
      if (e.key === 'ArrowRight') flipNext();
      if (e.key === 'Escape') onBack();
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);


  if (!pdfUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ height: '100dvh', width: '100vw' }}>
        <div className="relative z-10 p-6 pt-12">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg text-gray-700 flex items-center justify-center hover:bg-white transition-all active:scale-95"
          >
            <Icons.ChevronLeft size={24} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="text-center p-8">
            <Icons.BookOpen size={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-bold text-gray-700 mb-2">PDF não disponível</p>
            <p className="text-sm text-gray-500">Este livro não possui versão em PDF publicada.</p>
          </div>
        </div>
      </div>
    );
  }

  // Convert hex color to RGB for gradient
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 93, g: 31, b: 88 }; // Default color
  };

  const rgb = hexToRgb(themeColor);
  const bgColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const showOrientationPrompt = !isLandscape && !forcePortrait;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col overflow-hidden" 
      style={{ 
        height: '100dvh', 
        width: '100vw',
        backgroundColor: bgColor
      }}
    >
      {/* Galaxy Effect - Only show after book is loaded and not on mobile */}
      {!isLoading && !isMobile && <GalaxyBackground />}
      
      {/* Dark overlay to darken background - Works on both desktop and mobile */}
      <div className={`absolute inset-0 ${isMobile ? 'bg-black/20' : 'bg-black/10'}`} style={{ zIndex: 1 }} />

      {showOrientationPrompt && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-black/35 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Gire seu dispositivo"
        >
          <button 
            onClick={onBack}
            className="absolute left-4 top-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-white/20 text-white shadow-xl backdrop-blur-md transition-all hover:bg-white/30 active:scale-95"
            aria-label="Voltar"
          >
            <Icons.ChevronLeft size={24} strokeWidth={2.5} />
          </button>

          <div className="text-center p-8 max-w-md mx-auto relative z-10">
            <style>{`
              @keyframes rotatePhone {
                0% {
                  transform: rotate(0deg);
                }
                50% {
                  transform: rotate(90deg);
                }
                100% {
                  transform: rotate(0deg);
                }
              }
              .phone-rotate-animation {
                animation: rotatePhone 3s ease-in-out infinite;
                transform-origin: center center;
              }
            `}</style>
            <div className="mb-6 flex justify-center">
              <Icons.Smartphone 
                size={80} 
                className="text-white/90 phone-rotate-animation" 
                strokeWidth={2}
              />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4 drop-shadow-lg">
              Gire seu dispositivo
            </h2>
            <p className="text-lg text-white/90 mb-6 drop-shadow-md">
              Para uma melhor experiência de leitura, gire seu dispositivo para o modo horizontal.
            </p>
            <button
              onClick={() => setForcePortrait(true)}
              className="text-sm text-white/60 underline underline-offset-2 hover:text-white/90 transition-colors mt-2"
            >
              Continuar em retrato mesmo assim
            </button>
          </div>
        </div>
      )}

      {/* Header - Hidden on mobile landscape */}
      {!showOrientationPrompt && !isMobileLandscape && (
        <div className="relative z-20 p-4 flex items-center justify-between flex-shrink-0">
          <button 
            onClick={onBack}
            className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
            aria-label="Voltar"
          >
            <Icons.ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          
          <div className="flex-1 text-center">
            <div className="inline-block bg-black/20 backdrop-blur-md px-6 py-2 rounded-full shadow-lg border border-white/10">
              {bookTitle ? (
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] md:text-xs text-white/70 font-semibold leading-none">
                    Coleção: {collectionTitle || collection.title}
                  </span>
                  <span className="text-sm md:text-base font-bold text-white drop-shadow-sm leading-none">
                    {bookTitle}
                  </span>
                </div>
              ) : (
                <h1 className="text-sm md:text-base font-bold text-white drop-shadow-sm">
                  {collection.title}
                </h1>
              )}
            </div>
          </div>

          <div className="flex min-w-[104px] items-center justify-end gap-2">
            {canDownloadOffline && (
              <button
                type="button"
                onClick={isOfflineDownloaded ? handleOfflineRemove : handleOfflineDownload}
                disabled={isOfflineDownloading}
                aria-label={isOfflineDownloaded ? 'Remover download offline' : 'Baixar livro para offline'}
                className={`h-10 inline-flex items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors backdrop-blur-md disabled:cursor-default ${
                  isOfflineDownloaded
                    ? 'border-red-300/50 bg-red-500/20 text-red-200 hover:bg-red-500/35'
                    : isOfflineDownloading
                      ? 'border-white/30 bg-white/15 text-white/90'
                      : 'border-white/25 bg-black/30 text-white/90 hover:bg-black/45'
                }`}
              >
                {isOfflineDownloading ? (
                  <Icons.RotateCw size={13} className="animate-spin" />
                ) : isOfflineDownloaded ? (
                  <Icons.Trash2 size={13} />
                ) : (
                  <Icons.Download size={13} />
                )}
                <span className="hidden sm:inline">
                  {isOfflineDownloaded ? 'Remover offline' : isOfflineDownloading ? 'Baixando...' : 'Baixar offline'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Back button for mobile landscape - Floating top left */}
      {!showOrientationPrompt && isMobileLandscape && (
        <button 
          onClick={onBack}
          className="fixed top-4 left-4 z-30 w-12 h-12 rounded-full bg-black/20 backdrop-blur-md shadow-xl text-white flex items-center justify-center hover:bg-black/30 transition-all active:scale-95 border border-white/30"
          aria-label="Voltar"
        >
          <Icons.ChevronLeft size={24} strokeWidth={2.5} />
        </button>
      )}

      {/* Offline button for mobile landscape - Floating top right */}
      {!showOrientationPrompt && isMobileLandscape && (
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2">
          {canDownloadOffline && (
            <button
              type="button"
              onClick={isOfflineDownloaded ? handleOfflineRemove : handleOfflineDownload}
              disabled={isOfflineDownloading}
              aria-label={isOfflineDownloaded ? 'Remover download offline' : 'Baixar livro para offline'}
              className={`h-10 inline-flex items-center gap-1.5 rounded-full border px-3 text-[11px] font-bold transition-colors backdrop-blur-md disabled:cursor-default ${
                isOfflineDownloaded
                  ? 'border-red-300/50 bg-red-500/20 text-red-200 hover:bg-red-500/35'
                  : isOfflineDownloading
                    ? 'border-white/30 bg-white/15 text-white/90'
                    : 'border-white/25 bg-black/30 text-white/90 hover:bg-black/45'
              }`}
            >
              {isOfflineDownloading ? (
                <Icons.RotateCw size={13} className="animate-spin" />
              ) : isOfflineDownloaded ? (
                <Icons.Trash2 size={13} />
              ) : (
                <Icons.Download size={13} />
              )}
              <span className="hidden sm:inline">
                {isOfflineDownloaded ? 'Remover offline' : isOfflineDownloading ? 'Baixando...' : 'Baixar offline'}
              </span>
            </button>
          )}
        </div>
      )}

      {offlineDownloadError && (
        <div className="relative z-20 px-4 pb-2">
          <div className="mx-auto max-w-md rounded-2xl border border-red-300/35 bg-red-500/80 px-4 py-2 text-center text-xs text-white backdrop-blur-md shadow-lg">
            {offlineDownloadError}
          </div>
        </div>
      )}

      {/* Book Container - Full screen centered for mobile landscape */}
      <div
        className={`${isMobileLandscape ? 'fixed inset-0 flex items-center justify-center z-10' : 'flex-1 flex flex-col z-10 overflow-hidden'} ${showOrientationPrompt ? 'pointer-events-none opacity-0' : ''}`}
        style={isMobileLandscape ? { minHeight: 0 } : { minHeight: 0 }}
      >
        {error ? (
          <div className="text-center p-8 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl max-w-md mx-auto mt-20">
            <Icons.AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
            <p className="font-bold text-lg text-gray-800 mb-2">Erro ao carregar PDF</p>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setIsLoading(true);
                window.location.reload();
              }}
              className="px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Recarregar página
            </button>
          </div>
        ) : (
          <>
            {/* audio element (non-visual) */}
            {audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
                onTimeUpdate={(e) => setAudioCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => setIsAudioPlaying(false)}
              />
            )}

            {/* Flipbook area — flex-1 so expanded player pushes it up instead of overlapping */}
            <div className={isMobileLandscape ? 'relative w-full h-full' : 'relative flex-1 min-h-0 overflow-hidden'}>
              <FlipbookViewer
                ref={flipbookRef}
                pdfUrl={pdfUrl}
                className="h-full w-full"
                themeColor={themeColor}
                onLoadSuccess={() => {
                  setIsLoading(false);
                  setError(null);
                }}
                onLoadError={(err: any) => {
                  setIsLoading(false);
                  setError(`Erro ao carregar PDF: ${err?.message || 'Erro desconhecido'}`);
                }}
                onPageChange={(currentPage, totalPages) => {
                  setCurrentPage(currentPage);
                  setTotalPages(totalPages);
                  localStorage.setItem(readingKey, String(currentPage));
                }}
              />

              {/* Collapsed pill — stays overlaying the book corner */}
              {audioUrl && !isPlayerExpanded && (
                <button
                  onClick={() => setIsPlayerExpanded(true)}
                  className="absolute bottom-4 right-4 z-20 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 py-2 pl-2 pr-3 shadow-lg backdrop-blur-md transition-all hover:bg-black/70 active:scale-95"
                  aria-label="Abrir player de narração"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white transition-all ${isAudioPlaying ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-black/60' : ''}`}
                    style={{ color: themeColor }}
                  >
                    {isAudioPlaying
                      ? <Icons.Pause size={11} className="fill-current stroke-none" />
                      : <Icons.Play size={11} className="fill-current stroke-none ml-0.5" />}
                  </div>
                  <span className="text-[11px] font-semibold text-white/80">Narração</span>
                </button>
              )}

              {/* Page nav buttons */}
              {!isMobileLandscape && !showOrientationPrompt && (
                <>
                  <button
                    onClick={flipPrev}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                    aria-label="Página anterior"
                  >
                    <Icons.ChevronLeft size={28} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={flipNext}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30 hover:scale-110"
                    aria-label="Próxima página"
                  >
                    <Icons.ChevronLeft size={28} className="rotate-180" strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>

            {/* Expanded player — sits BELOW the flipbook area, not on top of it */}
            {audioUrl && isPlayerExpanded && (
              <div className={`${isMobileLandscape ? 'absolute bottom-0 left-0 right-0' : 'flex-shrink-0'} z-20 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md`}>
                <div className="flex items-center gap-3">
                  {/* Play/pause */}
                  <button
                    onClick={toggleAudio}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-white/90 active:scale-95"
                    style={{ color: themeColor }}
                    aria-label={isAudioPlaying ? 'Pausar narração' : 'Ouvir narração'}
                  >
                    {isAudioPlaying
                      ? <Icons.Pause size={18} className="fill-current stroke-none" />
                      : <Icons.Play size={18} className="fill-current stroke-none ml-0.5" />}
                  </button>
                  {/* Content: row 1 = title + time, row 2 = seekbar */}
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-[12px] font-semibold text-white/90">{audioTitle}</span>
                        <span className="shrink-0 rounded-full bg-violet-500/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-200">narração</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-[11px] text-white/50">{formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}</span>
                        <button
                          onClick={() => setIsPlayerExpanded(false)}
                          className="text-[10px] text-white/30 transition-colors hover:text-white/60"
                          aria-label="Recolher player"
                        >
                          recolher ↑
                        </button>
                      </div>
                    </div>
                    {/* Seekbar */}
                    <div
                      className="relative h-2 cursor-pointer rounded-full bg-white/20"
                      onClick={(e) => {
                        if (!audioRef.current || !audioDuration) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioDuration;
                      }}
                    >
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-white/80"
                        style={{ width: audioDuration ? `${(audioCurrentTime / audioDuration) * 100}%` : '0%' }}
                      />
                      <div
                        className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow"
                        style={{ left: audioDuration ? `calc(${(audioCurrentTime / audioDuration) * 100}% - 7px)` : '-7px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation Controls - mobile landscape only */}
      {!showOrientationPrompt && isMobileLandscape && (
        <>
          <button
            onClick={flipPrev}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30"
            aria-label="Página anterior"
          >
            <Icons.ChevronLeft size={28} strokeWidth={2.5} />
          </button>
          <button
            onClick={flipNext}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-30 w-14 h-14 rounded-full bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center text-white border border-white/30 transition-all active:scale-95 hover:bg-black/30"
            aria-label="Próxima página"
          >
            <Icons.ChevronLeft size={28} className="rotate-180" strokeWidth={2.5} />
          </button>
        </>
      )}
    </div>
  );
};
