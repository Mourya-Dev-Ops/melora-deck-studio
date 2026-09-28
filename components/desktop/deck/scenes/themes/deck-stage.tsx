"use client";

import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { clsx } from "clsx";
import { usePlayback, useLibrary } from "@/components/providers/playback-context";
import { useAudio } from "@/hooks/use-audio";
import { ThemeConfig, ThemeKey, THEMES } from "@/components/ui/desktop-player";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { decodeHtml } from "@/lib/utils";
import { Settings, Camera, Share2, Palette, Plus, Pencil, Search, ListMusic, Play, Pause, SkipBack, SkipForward, Volume2, Disc, Sun, Moon, Shuffle, Repeat } from "lucide-react";
import { Visualizer } from "@/components/ui/visualizer";
import { Mix } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { Mic2, SlidersHorizontal } from "lucide-react";
import { useAudioProgress } from "@/hooks/use-audio-progress";

interface DeckStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme?: (theme: ThemeKey) => void;
    isMobileDevice?: boolean;
    // onSwitchToMobile prop removed
    onOpenSettings?: () => void;
    onEditMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    onCreateMix?: () => void;
    onCinemaMode?: () => void;
    onOpenThemeSelector?: () => void;
    onSnapshotMix?: (mix: Mix) => void;
    onShowLyrics?: () => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: Mix) => void;
}

interface DragPosition { x: number; y: number; }

export function DeckStage({ currentTheme, onThemeChange, onSelectTheme, onOpenSettings, onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onShowLyrics, onShowQueue, onShareMix, isMobileDevice }: DeckStageProps) {
    const [viewMode, setViewMode] = useState<'split' | 'rack' | 'player'>('split');
    const [isCompact, setIsCompact] = useState(false);
    const [failedMixId, setFailedMixId] = useState<string | null>(null);

    // Drag Persistence State
    const [positions, setPositions] = useState<Record<string, DragPosition>>({});

    const updatePosition = useCallback((id: string, info: PanInfo) => {
        setPositions(prev => ({
            ...prev,
            [id]: { x: (prev[id]?.x || 0) + info.offset.x, y: (prev[id]?.y || 0) + info.offset.y }
        }));
    }, []);

    // Guardrail Logic
    // Guardrail Logic (Pure Responsive)
    // Guardrail Logic (Pure Responsive) - Fixed Loop
    useEffect(() => {
        const checkGuardrail = () => {
            // Only run client-side
            if (typeof window === 'undefined') return;

            const width = window.innerWidth;
            const isSmall = width < 780; // Small Monitor

            if (isSmall) {
                // Safety: Force view mode if too small
                if (viewMode === 'split') setViewMode('rack');
                setIsCompact(false);
            } else {
                // Wide enough
                if (viewMode === 'split' && width < 1024) {
                    if (!isCompact) setIsCompact(true);
                } else if (isCompact && width >= 1024) {
                    setIsCompact(false);
                }
            }
        };

        checkGuardrail();
        window.addEventListener('resize', checkGuardrail);
        return () => window.removeEventListener('resize', checkGuardrail);
    }, [viewMode, isCompact]);

    // Metal Theme Specific State
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        if (currentTheme === 'METAL') {
            const savedMode = localStorage.getItem('melora-metal-mode');
            if (savedMode) {
                setIsDarkMode(savedMode === 'dark');
            }
        }
    }, [currentTheme]);

    const toggleMetalMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('melora-metal-mode', newMode ? 'dark' : 'light');
        playClick();
    };

    const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isEjecting, setIsEjecting] = useState(false);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const { currentSong, currentTrack, currentTrackMetadata, isPlaying, togglePlay, next, prev, seek, volume, setVolume, duration, shuffle, setShuffle, repeat, setRepeat, loadMix, activeMixId, play, eq, activeQuality, playbackState, unlockAudio } = usePlayback();
    const { mixes, addMix, updateMix, deleteMix, likedSongs, toggleLike, isLiked, recentlyPlayed, isDownloaded, removeDownload } = useLibrary();
    const { downloadSong } = usePlayback();
    const { progress } = useAudioProgress();
    const { playClick, playClunk, playEject, playInsert } = useAudio();

    const isDraggingRef = useRef(false);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input
            if (['INPUT', 'TEXTAREA'].includes((document.activeElement as HTMLElement)?.tagName)) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    playClick();
                    togglePlay();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    seek(Math.max(0, progress - 0.05));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    seek(Math.min(1, progress + 0.05));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setVolume(Math.min(1, volume + 0.05));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setVolume(Math.max(0, volume - 0.05));
                    break;
                case 'KeyM':
                    e.preventDefault();
                    // Toggle mute (restore to 0.7 if muted)
                    setVolume(volume === 0 ? 0.7 : 0);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, seek, progress, volume, setVolume, playClick]);

    const handleDragStart = () => {
        isDraggingRef.current = true;
    };

    const handleDragEndAction = () => {
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 50);
    };

    const handleClick = (callback: () => void) => {
        if (!isDraggingRef.current) {
            callback();
        }
    };

    const theme = THEMES[currentTheme];

    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId), [mixes, activeMixId]);
    const hasCassette = !!activeMix;

    const formatTime = (seconds: number) => {
        if (typeof window === 'undefined') return "0:00"; // SSR guard
        if (typeof seconds !== 'number' || isNaN(seconds) || !isFinite(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const songDuration = duration > 0 ? duration : (currentSong?.duration ? parseInt(currentSong.duration.toString()) : 0);
    const currentTime = progress * songDuration;

    const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, id: string, isMix: boolean = false) => {
        // Persist Position
        updatePosition(id, info);
        handleDragEndAction();

        // Check Player Drop (Only for Mixes)
        if (isMix && playerRef.current) {
            // Optimization: Cache rect if needed, but for single drop event getBoundingClientRect is acceptable
            // The bug report mentioned caching strict rects, but memoizing the handler is a start.
            // true-fix: cache rect on DragStart. 
            // For now, let's just make it work safely.
            const playerRect = playerRef.current.getBoundingClientRect();
            const { x, y } = info.point;

            if (
                x >= playerRect.left &&
                x <= playerRect.right &&
                y >= playerRect.top &&
                y <= playerRect.bottom
            ) {
                // Determine mixId from explicit ID passed
                if (activeMixId !== id.replace('mix-', '')) {
                    playInsert();
                    unlockAudio();
        loadMix(id.replace('mix-', ''));
                    // Play after a slight delay to let the insert sound play
                    setTimeout(() => play(), 800);
                } else {
                    play();
                }
            } else {
                setFailedMixId(id);
                setTimeout(() => {
                    setFailedMixId(null);
                }, 500);
            }
        }
    }, [activeMixId, playInsert, loadMix, updatePosition, setFailedMixId, play, unlockAudio]);

    const cassetteColors: Record<string, string> = {
        purple: "bg-purple-600",
        orange: "bg-orange-500",
        green: "bg-green-600",
        red: "bg-red-600",
        white: "bg-zinc-200",
        blue: "bg-blue-600",
        yellow: "bg-yellow-500",
        cyan: "bg-cyan-500",
        pink: "bg-pink-500",
        black: "bg-zinc-800"
    };

    const accentColors: Record<string, string> = {
        purple: "bg-purple-300",
        orange: "bg-orange-300",
        green: "bg-green-300",
        red: "bg-red-300",
        white: "bg-zinc-400",
        blue: "bg-blue-300",
        yellow: "bg-yellow-300",
        cyan: "bg-cyan-300",
        pink: "bg-pink-300",
        black: "bg-zinc-600"
    };

    return (
        <div ref={containerRef} className={clsx(
            "min-h-screen flex flex-col font-sans overflow-x-hidden selection:bg-purple-500 selection:text-white transition-colors duration-500",
            currentTheme === 'METAL'
                ? (isDarkMode ? "bg-black" : "bg-zinc-200")
                : theme.bodyGradient
        )}>
            <style jsx global>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            {/* Header - Consolidated Layout but Individually Draggable Items */}
            <header className="w-full px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 z-50 relative pointer-events-none">
                {/* Title Section */}
                <motion.div
                    className="flex items-center gap-3 select-none pointer-events-auto transform-gpu cursor-move"
                    drag
                    dragMomentum={false}
                    animate={{ x: positions['header-title']?.x || 0, y: positions['header-title']?.y || 0 }}
                    dragConstraints={containerRef}
                    dragElastic={0.2}
                    onDragStart={handleDragStart}
                    onDragEnd={(e, info) => handleDragEnd(e, info, 'header-title')}
                >
                    {currentTheme !== 'METAL' && (
                        <img src="/cassette-icon.png" alt="Cassette" className="w-10 h-10 pointer-events-none" />
                    )}
                    <h1 className={clsx("text-4xl tracking-tighter mt-1 transition-colors",
                        currentTheme === 'METAL' ? "font-['Pacifico'] tracking-normal text-3xl" : "font-display",
                        currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' || currentTheme === 'SILVERFROST' || (currentTheme === 'METAL' && !isDarkMode) ? "text-gray-900" : "text-white"
                    )}>
                        Melora Tunes
                    </h1>
                </motion.div>

                {/* Toolbar Section */}
                <div className="flex items-center gap-4 pointer-events-auto">
                    {/* Settings Button */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        animate={{ x: positions['header-settings']?.x || 0, y: positions['header-settings']?.y || 0 }}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'header-settings')}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onOpenSettings?.(); })}
                            className={clsx("p-2 rounded-full transition-colors",
                                currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' ? "text-gray-500 hover:bg-black/5" : "text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                            title="Settings"
                            onPointerDown={(e) => e.stopPropagation()}
                        >
                            <Settings size={20} />
                        </button>
                    </motion.div>

                    {/* Theme Palette Button */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        animate={{ x: positions['header-palette']?.x || 0, y: positions['header-palette']?.y || 0 }}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'header-palette')}
                        className="relative transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onOpenThemeSelector?.(); })}
                            className={clsx("p-2 rounded-full transition-colors",
                                currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' || (currentTheme === 'METAL' && !isDarkMode) ? "text-gray-500 hover:bg-black/5" : "text-gray-400 hover:text-white hover:bg-white/10"
                            )}
                            title="Change Theme"
                        >
                            <Palette size={20} />
                        </button>
                    </motion.div>

                    {/* Metal Mode Toggle */}
                    {currentTheme === 'METAL' && (
                        <motion.div
                            drag
                            dragMomentum={false}
                            animate={{ x: positions['header-metal']?.x || 0, y: positions['header-metal']?.y || 0 }}
                            dragConstraints={containerRef}
                            dragElastic={0.2}
                            onDragStart={handleDragStart}
                            onDragEnd={(e, info) => handleDragEnd(e, info, 'header-metal')}
                            className="relative transform-gpu cursor-move"
                        >
                            <button
                                onClick={() => handleClick(toggleMetalMode)}
                                className={clsx("p-2 rounded-full transition-colors",
                                    !isDarkMode ? "text-yellow-600 hover:bg-black/5" : "text-blue-300 hover:text-white hover:bg-white/10"
                                )}
                                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                            >
                                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                        </motion.div>
                    )}

                    {/* Photo Mode */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        animate={{ x: positions['header-cinema']?.x || 0, y: positions['header-cinema']?.y || 0 }}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'header-cinema')}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onCinemaMode?.(); })}
                            className="hidden md:flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                        >
                            <Camera size={16} />
                            Photo Mode
                        </button>
                    </motion.div>

                    {/* Search */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        animate={{ x: positions['header-search']?.x || 0, y: positions['header-search']?.y || 0 }}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'header-search')}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onOpenSearch?.(''); })}
                            className="hidden md:flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                        >
                            <Search size={16} />
                            Search
                        </button>
                    </motion.div>

                    {/* Manage Rack (Tape Rack Manager) */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        animate={{ x: positions['header-rack']?.x || 0, y: positions['header-rack']?.y || 0 }}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'header-rack')}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); setIsRackOpen(true); })}
                            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider border border-zinc-700"
                        >
                            <ListMusic size={16} />
                            Rack
                        </button>
                    </motion.div>

                    {/* Create Mix */}
                    <motion.div
                        drag
                        dragMomentum={false}
                        animate={{ x: positions['header-create']?.x || 0, y: positions['header-create']?.y || 0 }}
                        dragConstraints={containerRef}
                        dragElastic={0.2}
                        onDragStart={handleDragStart}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'header-create')}
                        className="transform-gpu cursor-move"
                    >
                        <button
                            onClick={() => handleClick(() => { playClick(); onCreateMix?.(); })}
                            className="flex items-center gap-2 bg-gray-200 hover:bg-white text-black font-bold py-2 px-4 rounded shadow-lg active:scale-95 transition-all uppercase text-sm tracking-wider"
                        >
                            <Plus size={16} />
                            New Tape
                        </button>
                    </motion.div>
                </div>
            </header>

            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />

            {/* Main Content - Grid Layout */}
            <main className={clsx(
                "flex-grow w-full max-w-7xl mx-auto p-4 transition-all duration-300 items-start relative",
                isCompact ? "gap-2 p-1" : "gap-12 lg:p-8",
                viewMode === 'split' ? "grid grid-cols-1 lg:grid-cols-12" : "flex flex-col"
            )}>
                {/* Navigation Controls (Guardrail Mode Only) */}
                {viewMode !== 'split' && (
                    <div className="w-full flex justify-center gap-4 mb-4 sticky top-0 z-[60] py-2 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-md rounded-xl">
                        <button
                            onClick={() => { playClick(); setViewMode('rack'); }}
                            className={clsx("px-6 py-2 rounded-full font-bold shadow-lg transition-all border-2",
                                viewMode === 'rack' ? "bg-white text-black border-white scale-105" : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                            )}
                        >
                            Tape Rack
                        </button>
                        <button
                            onClick={() => { playClick(); setViewMode('player'); }}
                            className={clsx("px-6 py-2 rounded-full font-bold shadow-lg transition-all border-2",
                                viewMode === 'player' ? "bg-white text-black border-white scale-105" : "bg-black/50 text-white border-white/20 hover:bg-black/70"
                            )}
                        >
                            Go to Player
                        </button>
                    </div>
                )}

                {/* Left Column: Mixtapes */}
                {viewMode !== 'player' && (
                    <section className={clsx(
                        "flex flex-col gap-8 transition-all",
                        viewMode === 'split' ? "lg:col-span-7" : "w-full"
                    )}>
                        {viewMode === 'split' && (
                            <motion.h2
                                className={clsx("font-display text-2xl md:text-3xl uppercase tracking-widest mb-4 opacity-80 pl-2 cursor-move transform-gpu inline-block",
                                    currentTheme === 'ZEN' || currentTheme === 'BAUHAUS' || (currentTheme === 'METAL' && !isDarkMode) ? "text-gray-800" : "text-gray-600"
                                )}
                                drag
                                dragMomentum={false}
                                animate={{ x: positions['title-tapes']?.x || 0, y: positions['title-tapes']?.y || 0 }}
                                dragConstraints={containerRef}
                                onDragEnd={(e, info) => handleDragEnd(e, info, 'title-tapes')}
                            >
                                Your Mixtapes
                            </motion.h2>
                        )}
                        <div className={clsx(
                            "grid gap-4 pb-12",
                            isCompact ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-2 md:grid-cols-3"
                        )}>
                            {mixes
                                .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                                .slice(0, 8) // Visual Guardrail: Only show top 8 tapes in the rack
                                .map((mix, i) => {
                                    if (mix.id === activeMixId) return null;

                                    const isOTG = mix.id === 'otg-tape';
                                    // Special Glass Style for OTG
                                    const bgColor = isOTG
                                        ? "bg-white/20 backdrop-blur-md border border-white/30 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]"
                                        : (cassetteColors[mix.color] || "bg-orange-500");

                                    const accentColor = isOTG
                                        ? "bg-white/40"
                                        : (accentColors[mix.color] || "bg-orange-300");

                                    const isFailed = failedMixId === `mix-${mix.id}`;
                                    const xPos = positions[`mix-${mix.id}`]?.x || 0;
                                    const yPos = positions[`mix-${mix.id}`]?.y || 0;

                                    return (
                                        <motion.div
                                            key={mix.id}
                                            drag={viewMode === 'split'} // Disable drag in Rack Mode (Click only)
                                            dragConstraints={containerRef}
                                            dragElastic={0.2}
                                            dragMomentum={false} // False for strict persistence
                                            animate={isFailed ? {
                                                x: [xPos, xPos - 8, xPos + 8, xPos - 8, xPos + 8, xPos - 4, xPos + 4, xPos],
                                                y: yPos
                                            } : {
                                                x: xPos,
                                                y: yPos
                                            }}
                                            transition={isFailed ? { duration: 0.4 } : undefined}
                                            onDragEnd={(e, info) => handleDragEnd(e, info, `mix-${mix.id}`, true)}
                                            // Click handler for Guardrail (Rack Mode)
                                            onClick={() => {
                                                if (viewMode === 'rack') {
                                                    playClunk();
                                                    unlockAudio();
        loadMix(mix.id);
                                                    setViewMode('player'); // Auto-switch
                                                    setToast(`Loading ${mix.title}...`);
                                                }
                                            }}
                                            whileDrag={{ zIndex: 9999, scale: 1.1, cursor: "grabbing" }}
                                            className={clsx(
                                                "group relative w-full aspect-[3/2] rounded-lg shadow-lg hover:shadow-xl p-2 flex flex-col justify-between cursor-grab active:cursor-grabbing transform-gpu will-change-transform border transition-all",
                                                bgColor,
                                                isFailed ? "border-red-500 ring-4 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.8)]" : "border-transparent"
                                            )}
                                            id={`studio-mix-${mix.id}`}
                                            style={{ backgroundImage: isOTG ? 'url("/glass-noise.png"), linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)' : 'repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 2px, transparent 2px, transparent 4px)' }}
                                        >
                                            {/* Realistic Metallic Countersunk Screws */}
                                            <div className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-neutral-400 via-neutral-200 to-neutral-100 border border-neutral-600 shadow-inner flex items-center justify-center">
                                                <div className="w-1.5 h-0.5 bg-neutral-700 rotate-45" />
                                            </div>
                                            <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-neutral-400 via-neutral-200 to-neutral-100 border border-neutral-600 shadow-inner flex items-center justify-center">
                                                <div className="w-1.5 h-0.5 bg-neutral-700 -rotate-45" />
                                            </div>
                                            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-neutral-400 via-neutral-200 to-neutral-100 border border-neutral-600 shadow-inner flex items-center justify-center">
                                                <div className="w-1.5 h-0.5 bg-neutral-700 rotate-12" />
                                            </div>
                                            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-neutral-400 via-neutral-200 to-neutral-100 border border-neutral-600 shadow-inner flex items-center justify-center">
                                                <div className="w-1.5 h-0.5 bg-neutral-700 -rotate-12" />
                                            </div>

                                            {/* Label */}
                                            <div className={clsx(
                                                "relative mx-2 mt-1 h-20 rounded-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.15)] p-1.5 transform rotate-0 group-hover:rotate-[0.5deg] transition-transform duration-500 flex flex-col justify-between items-center border border-black/10",
                                                isOTG ? "bg-white/80 backdrop-blur-sm" : "bg-amber-50"
                                            )}>
                                                <div className={clsx("absolute top-0 inset-x-0 h-3 flex items-center justify-between px-2 shadow-sm", accentColor)}>
                                                    <span className="font-mono text-[7px] font-black text-white/90">SIDE A</span>
                                                    <span className="font-mono text-[6px] font-bold text-white/80 tracking-wider">70µs EQ</span>
                                                </div>
                                                <div className="mt-3 w-full px-1">
                                                    <h3 className="font-hand font-bold text-xs text-neutral-900 tracking-tight text-center line-clamp-1">
                                                        {mix.title}
                                                    </h3>
                                                </div>
                                                <div className="w-full flex items-center justify-between px-1 border-t border-neutral-200/80 pt-0.5">
                                                    <span className="font-mono text-[7px] text-neutral-500 font-bold uppercase tracking-widest">
                                                        {isOTG ? "MASTER TAPE" : "MELORA HIGH BIAS"}
                                                    </span>
                                                    <span className="font-mono text-[7px] text-neutral-600 font-bold">
                                                        TYPE II
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Reels */}
                                            <div className="mx-4 mb-1 h-8 bg-neutral-950/60 rounded-full flex items-center justify-between px-2 relative backdrop-blur-sm border border-black/30 shadow-inner">
                                                {/* Left Reel */}
                                                <div className={clsx(
                                                    "w-7 h-7 bg-neutral-100 rounded-full border border-neutral-800 flex items-center justify-center relative shadow-sm",
                                                    "group-hover:animate-spin"
                                                )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                                    <div className="w-5 h-5 rounded-full border border-dashed border-neutral-400"></div>
                                                    <div className="absolute w-1.5 h-1.5 bg-neutral-900 rounded-full"></div>
                                                </div>

                                                <div className="flex-grow h-4 mx-1 flex flex-col items-center justify-center">
                                                    <div className="w-full h-0.5 bg-[#3a271c] mb-0.5" />
                                                    <span className="text-[6px] text-white/70 font-mono font-bold tracking-widest">CH A</span>
                                                </div>

                                                {/* Right Reel */}
                                                <div className={clsx(
                                                    "w-7 h-7 bg-neutral-100 rounded-full border border-neutral-800 flex items-center justify-center relative shadow-sm",
                                                    "group-hover:animate-spin"
                                                )} style={{ animationDuration: '4s', animationTimingFunction: 'linear' }}>
                                                    <div className="w-5 h-5 rounded-full border border-dashed border-neutral-400"></div>
                                                    <div className="absolute w-1.5 h-1.5 bg-neutral-900 rounded-full"></div>
                                                </div>
                                            </div>

                                            {/* Song Count Badge */}
                                            <div className="absolute -right-1 top-2/3 bg-black text-white text-[9px] font-bold py-0.5 px-2 rounded shadow-md border border-gray-700">
                                                {mix.songs.length} SONGS
                                            </div>

                                            {/* Action Buttons (Edit/Share/Add) */}
                                            <div className="absolute -top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 group-hover:-translate-y-1 transition-all duration-300 ease-out no-snapshot z-50" onPointerDown={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }}
                                                    className="flex items-center justify-center w-6 h-7 bg-[#fef3c7] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                                    title="Edit Mix"
                                                >
                                                    <Pencil size={12} className="text-blue-900" />
                                                </button>
                                                {!isOTG && (
                                                    <>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const sharePayload = {
                                                                    id: mix.id,
                                                                    title: mix.title,
                                                                    songs: mix.songs.map((song: any) => ({
                                                                        id: song.song?.id || song.id,
                                                                        name: song.song?.name || song.name,
                                                                        artists: song.song?.primaryArtists || song.primaryArtists
                                                                    }))
                                                                };
                                                                const bytes = new TextEncoder().encode(JSON.stringify(sharePayload));
                                                                let binary = "";
                                                                bytes.forEach((byte) => {
                                                                    binary += String.fromCharCode(byte);
                                                                });
                                                                const encoded = encodeURIComponent(btoa(binary));
                                                                const shareUrl = `${window.location.origin}/share?mix=${encoded}`;

                                                                const node = document.getElementById(`studio-mix-${mix.id}`);
                                                                if (node) {
                                                                    import('html-to-image').then(({ toPng }) => {
                                                                        toPng(node, {
                                                                            filter: (n) => !n.classList?.contains('no-snapshot'),
                                                                            pixelRatio: 2,
                                                                            cacheBust: true,
                                                                            fontEmbedCSS: ''
                                                                        })
                                                                            .then((dataUrl) => {
                                                                                const link = document.createElement('a');
                                                                                link.download = `melora-studio-${mix.title.replace(/\s+/g, '-').toLowerCase()}.png`;
                                                                                link.href = dataUrl;
                                                                                link.click();
                                                                                navigator.clipboard.writeText(shareUrl);
                                                                                setToast("Snapshot saved! Link copied 📸");
                                                                                setTimeout(() => setToast(null), 3000);
                                                                            })
                                                                            .catch((err) => {
                                                                                console.error("Snapshot failed", err);
                                                                                navigator.clipboard.writeText(shareUrl);
                                                                                setToast("Snapshot failed. Link copied!");
                                                                                setTimeout(() => setToast(null), 3000);
                                                                            });
                                                                    });
                                                                }
                                                            }}
                                                            className="flex items-center justify-center w-6 h-7 bg-[#f4f4f5] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                                            title="Share Snapshot"
                                                        >
                                                            <Camera size={12} className="text-zinc-800" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }}
                                                            className="flex items-center justify-center w-6 h-7 bg-[#e0f2fe] shadow-md hover:-translate-y-0.5 transition-transform"
                                                            title="Share Mix"
                                                        >
                                                            <Share2 size={12} className="text-blue-900" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }}
                                                    className="flex items-center justify-center w-6 h-7 bg-[#dcfce7] shadow-md hover:-translate-y-0.5 transition-transform rounded-t-sm"
                                                    title="Add Songs"
                                                >
                                                    <Plus size={12} className="text-green-900" strokeWidth={3} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                        </div>
                    </section>
                )}

                {/* Right Column: Player */}
                {viewMode !== 'rack' && (
                    <motion.section
                        className={clsx(
                            "sticky top-8 z-40 transform-gpu will-change-transform",
                            viewMode === 'split' ? "lg:col-span-5" : "w-full flex justify-center"
                        )}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum={false}
                        dragElastic={0.2}
                        animate={{ x: positions['player']?.x || 0, y: positions['player']?.y || 0 }}
                        onDragEnd={(e, info) => handleDragEnd(e, info, 'player')}
                        whileDrag={{ zIndex: 100, cursor: "grabbing" }}
                        style={{ cursor: "grab" }}
                        onPointerDown={(e) => e.stopPropagation()} // Prevent interfering with parent gestures if any
                    >
                        <div
                            ref={playerRef}
                            className={clsx(
                                "rounded-2xl p-4 md:p-5 relative overflow-hidden transition-all duration-300 select-none",
                                isCompact ? "max-w-full w-full" : "max-w-[340px]",
                                isDarkMode
                                    ? "bg-[#16171b] text-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.95),inset_0_1px_1px_rgba(255,255,255,0.22),inset_0_-2px_4px_rgba(0,0,0,0.85)] border-2 border-neutral-700/80"
                                    : "bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] text-neutral-900 shadow-[0_16px_40px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(0,0,0,0.2)] border-2 border-neutral-300"
                            )}
                            style={{
                                backgroundImage: isDarkMode
                                    ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 3px)'
                                    : 'repeating-linear-gradient(90deg, rgba(0,0,0,0.015) 0px, rgba(0,0,0,0.015) 1px, transparent 1px, transparent 3px)'
                            }}
                        >
                            {/* Realistic Precision Countersunk Screws in 4 Corners */}
                            <div className="absolute top-3 left-3 w-3 h-3 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-300 to-neutral-200 border border-neutral-600 shadow-inner flex items-center justify-center">
                                <div className="w-1.5 h-0.5 bg-neutral-700 rotate-45" />
                            </div>
                            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-300 to-neutral-200 border border-neutral-600 shadow-inner flex items-center justify-center">
                                <div className="w-1.5 h-0.5 bg-neutral-700 -rotate-45" />
                            </div>
                            <div className="absolute bottom-3 left-3 w-3 h-3 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-300 to-neutral-200 border border-neutral-600 shadow-inner flex items-center justify-center">
                                <div className="w-1.5 h-0.5 bg-neutral-700 rotate-12" />
                            </div>
                            <div className="absolute bottom-3 right-3 w-3 h-3 rounded-full bg-gradient-to-tr from-neutral-500 via-neutral-300 to-neutral-200 border border-neutral-600 shadow-inner flex items-center justify-center">
                                <div className="w-1.5 h-0.5 bg-neutral-700 -rotate-12" />
                            </div>

                            {/* Title */}
                            {!isCompact && (
                                <div className="text-center mb-3">
                                    <h2 className={clsx(
                                        "font-display text-base md:text-lg uppercase tracking-wider",
                                        isDarkMode ? "text-neutral-100 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" : "text-neutral-800"
                                    )}>
                                        Stereo Cassette Player
                                    </h2>
                                    <p className="text-[9px] font-mono tracking-[0.25em] mt-0.5 text-neutral-400 font-bold uppercase">
                                        AUTO REVERSE • DIRECT DRIVE
                                    </p>
                                </div>
                            )}

                            {/* Screen / Cassette Bay Window */}
                            <div className={clsx(
                                "relative w-full rounded-xl overflow-hidden mb-3 border transition-colors duration-300 flex items-center justify-center",
                                isCompact ? "h-32" : "aspect-[16/9]",
                                isDarkMode
                                    ? "bg-[#0b0c0f] border-neutral-700/80 shadow-[inset_0_4px_16px_rgba(0,0,0,0.95)]"
                                    : "bg-[#18191d] border-neutral-600/70 shadow-[inset_0_4px_16px_rgba(0,0,0,0.85)]"
                            )}>
                                {/* Internal Warm Backlight Chamber Glow when playing */}
                                <div className={clsx(
                                    "absolute inset-0 transition-opacity duration-700 pointer-events-none z-0",
                                    isPlaying ? "bg-amber-500/[0.12] opacity-100" : "opacity-0"
                                )} />

                                {/* Glass Reflection & Scanline Overlay */}
                                <div className="absolute inset-0 z-20 pointer-events-none opacity-15" style={{
                                    background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
                                    backgroundSize: '100% 4px'
                                }} />
                                <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/[0.08] to-transparent z-20 pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent z-20 pointer-events-none" />

                                {hasCassette && activeMix ? (
                                    <motion.div
                                        className="w-[95%] h-[92%] rounded-md shadow-2xl border-t border-l border-white/20 border-b border-r border-black/50 p-1.5 flex flex-col justify-between relative z-10 overflow-hidden"
                                        style={{
                                            backgroundColor: activeMix.color === 'purple' ? '#1f132b' :
                                                activeMix.color === 'orange' ? '#2b170c' :
                                                    activeMix.color === 'green' ? '#0f2619' :
                                                        activeMix.color === 'red' ? '#2b1012' :
                                                            activeMix.color === 'blue' ? '#0e1f38' :
                                                                activeMix.color === 'yellow' ? '#2e270e' :
                                                                    activeMix.color === 'cyan' ? '#0c272e' :
                                                                        activeMix.color === 'pink' ? '#2e1224' :
                                                                            activeMix.color === 'black' ? '#18181b' :
                                                                                '#27272a',
                                            backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)'
                                        }}
                                    >
                                        {/* Precision Corner Screws on Cassette Shell */}
                                        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-sm flex items-center justify-center"><div className="w-1.5 h-[0.5px] bg-neutral-700 rotate-45" /></div>
                                        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-sm flex items-center justify-center"><div className="w-1.5 h-[0.5px] bg-neutral-700 -rotate-45" /></div>
                                        <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-sm flex items-center justify-center"><div className="w-1.5 h-[0.5px] bg-neutral-700 rotate-12" /></div>
                                        <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-neutral-400 border border-neutral-600 shadow-sm flex items-center justify-center"><div className="w-1.5 h-[0.5px] bg-neutral-700 -rotate-12" /></div>

                                        {/* J-Card Label */}
                                        <div className="relative bg-amber-50 mx-1 mt-0.5 h-15 rounded-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.15)] p-1 flex flex-col justify-between items-center border border-black/10">
                                            <div className="w-full flex items-center justify-between px-1.5 py-0.5 rounded-t-[2px] bg-neutral-900 text-white">
                                                <span className="font-mono text-[7px] font-black text-amber-300">SIDE A</span>
                                                <span className="font-mono text-[6px] tracking-wider text-neutral-300">DOLBY B-C NR</span>
                                                <span className="font-mono text-[7px] font-bold text-neutral-300">70µs</span>
                                            </div>
                                            <h3 className="font-hand font-bold text-xs text-neutral-900 tracking-tight text-center line-clamp-1 px-1">
                                                {currentSong ? decodeHtml(currentSong.name) : activeMix.title}
                                            </h3>
                                            <div className="w-full flex items-center justify-between px-1 border-t border-neutral-200 pt-0.5">
                                                <span className="font-mono text-[6.5px] text-neutral-500 uppercase tracking-widest font-bold">
                                                    Melora High Bias
                                                </span>
                                                <span className="font-mono text-[6.5px] text-neutral-600 font-bold">
                                                    TYPE II
                                                </span>
                                            </div>
                                        </div>

                                        {/* Reels with Dynamic Tape Spool Winding Physics */}
                                        {(() => {
                                            const leftSpoolRadius = 8 + Math.sqrt(Math.max(0, 1 - progress)) * 10;
                                            const rightSpoolRadius = 8 + Math.sqrt(Math.max(0, progress)) * 10;

                                            return (
                                                <div className="mx-2 mb-0.5 h-7 bg-neutral-950/80 rounded-full flex items-center justify-between px-2 relative border border-black/40 shadow-inner">
                                                    {/* Left Spool (Supply) */}
                                                    <div className="relative flex items-center justify-center">
                                                        <div
                                                            className="rounded-full bg-[#241710] border border-[#3d271c] flex items-center justify-center transition-all duration-200"
                                                            style={{ width: `${leftSpoolRadius * 2}px`, height: `${leftSpoolRadius * 2}px` }}
                                                        >
                                                            <motion.div
                                                                className="w-5 h-5 bg-neutral-100 rounded-full border border-neutral-800 flex items-center justify-center relative shadow-sm"
                                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                                transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                                            >
                                                                <div className="w-3.5 h-3.5 rounded-full border border-dashed border-neutral-400" />
                                                                <div className="absolute w-1.5 h-1.5 bg-neutral-900 rounded-full" />
                                                            </motion.div>
                                                        </div>
                                                    </div>

                                                    {/* Center Tape Bridge & Run Indicator */}
                                                    <div className="flex-grow h-3 mx-1 flex flex-col items-center justify-center">
                                                        <div className="w-full h-0.5 bg-[#3a271c] mb-0.5" />
                                                        <span className="text-[6px] text-amber-300 font-mono font-bold tracking-widest">
                                                            {Math.round(progress * 100)}%
                                                        </span>
                                                    </div>

                                                    {/* Right Spool (Take-up) */}
                                                    <div className="relative flex items-center justify-center">
                                                        <div
                                                            className="rounded-full bg-[#241710] border border-[#3d271c] flex items-center justify-center transition-all duration-200"
                                                            style={{ width: `${rightSpoolRadius * 2}px`, height: `${rightSpoolRadius * 2}px` }}
                                                        >
                                                            <motion.div
                                                                className="w-5 h-5 bg-neutral-100 rounded-full border border-neutral-800 flex items-center justify-center relative shadow-sm"
                                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                                transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                                            >
                                                                <div className="w-3.5 h-3.5 rounded-full border border-dashed border-neutral-400" />
                                                                <div className="absolute w-1.5 h-1.5 bg-neutral-900 rounded-full" />
                                                            </motion.div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Song Count Badge */}
                                        <div className="absolute -right-1 top-2/3 bg-neutral-950 text-white text-[7.5px] font-black py-0 px-1.5 rounded shadow-md border border-neutral-700">
                                            {activeMix.songs.length} SONGS
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-1 z-10">
                                        <p className="font-mono text-neutral-500 font-bold text-xs tracking-[0.2em] uppercase">NO CASSETTE</p>
                                        <span className="text-[8px] font-mono text-neutral-600">DROP TAPE TO PLAY</span>
                                    </div>
                                )}
                            </div>

                            {/* LCD Display */}
                            <div className={clsx(
                                "h-10 w-full rounded-lg shadow-[inset_0_2px_6px_rgba(0,0,0,0.8)] mb-3 flex items-center px-3 border overflow-hidden whitespace-nowrap transition-colors",
                                isDarkMode
                                    ? "bg-[#0a0c0f] border-neutral-800 text-amber-400 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)]"
                                    : "bg-[#9da793] border-[#7d8773] text-[#1c2217]"
                            )}>
                                <span className={clsx(
                                    "font-mono font-bold tracking-widest text-xs flex items-center gap-2 flex-1 min-w-0",
                                    isDarkMode && "drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                                )}>
                                    {currentSong ? (
                                        <>
                                            {isDownloaded(currentTrack?.id || currentSong.id) && <span className="bg-black/20 px-1 rounded text-[9px] border border-black/10">OFFLINE</span>}
                                            <span className={`truncate ${(playbackState === 'buffering' || playbackState === 'stalled' || playbackState === 'loading') ? 'animate-pulse' : ''}`}>
                                                {(playbackState === 'buffering' || playbackState === 'loading') ? 'BUFFERING...' : playbackState === 'stalled' ? 'STALLED...' : `▶ ${decodeHtml(currentSong.name)}`}
                                            </span>
                                        </>
                                    ) : (
                                        "MELORA • READY"
                                    )}
                                </span>
                                {/* LCD Metadata & Quality Badge */}
                                <div className="ml-2 scale-90 origin-right flex items-center gap-1.5 flex-shrink-0">
                                    {currentTrackMetadata && (
                                        <div className="flex gap-1 mr-1">
                                            <span className="bg-black/20 text-black/80 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] tracking-widest">
                                                {currentTrackMetadata.bpm} BPM
                                            </span>
                                            <span className="bg-black/20 text-black/80 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-black/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] tracking-widest">
                                                {currentTrackMetadata.key}
                                            </span>
                                        </div>
                                    )}
                                    <QualityBadge quality={activeQuality} variant="full" />
                                </div>
                            </div>

                            {/* Visualizer */}
                            <div className="p-0.5 rounded-lg bg-black/60 border border-neutral-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)] mb-3 overflow-hidden">
                                <Visualizer isPlaying={isPlaying} accentColor="#22c55e" className="w-full h-7 rounded opacity-90" />
                            </div>

                            {/* Progress Bar / Tape Counter Track */}
                            <div className="mb-4 px-1">
                                <div className="flex justify-between text-[9px] font-mono font-bold text-neutral-400 mb-1">
                                    <span>{formatTime(currentTime)}</span>
                                    <span className="text-[8px] tracking-[0.2em] uppercase opacity-70">TAPE COUNTER</span>
                                    <span>{formatTime(songDuration)}</span>
                                </div>
                                <div
                                    className={clsx(
                                        "h-2.5 rounded-full overflow-hidden shadow-inner cursor-pointer p-0.5 border transition-colors",
                                        isDarkMode ? "bg-neutral-950 border-neutral-700/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.9)]" : "bg-neutral-300 border-neutral-400 shadow-inner"
                                    )}
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] relative"
                                        style={{ width: `${progress * 100}%` }}
                                    >
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-3 bg-white rounded-sm shadow-md border border-neutral-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Playback Controls (Heavy Tactile Milled Aluminum Push-Buttons) */}
                            <div className="flex justify-center items-center gap-3.5 mb-5">
                                {/* Shuffle */}
                                <button
                                    type="button"
                                    onClick={() => { playClick(); setShuffle(!shuffle); }}
                                    className={clsx(
                                        "w-9 h-9 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] active:translate-y-0.5 active:shadow-inner transition-all flex items-center justify-center border",
                                        shuffle
                                            ? "bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                            : (isDarkMode ? "bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 text-neutral-300 border-neutral-600 hover:text-white" : "bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-400 text-neutral-700 border-neutral-300")
                                    )}
                                    title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                                >
                                    <Shuffle size={14} />
                                </button>

                                {/* Prev */}
                                <button
                                    type="button"
                                    onClick={() => { playClick(); prev(); }}
                                    className={clsx(
                                        "w-11 h-11 rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-inner transition-all flex items-center justify-center border",
                                        isDarkMode
                                            ? "bg-gradient-to-b from-neutral-600 via-neutral-700 to-neutral-800 text-neutral-200 border-neutral-500/70 hover:brightness-110"
                                            : "bg-gradient-to-b from-neutral-100 via-neutral-200 to-neutral-300 text-neutral-800 border-neutral-400 shadow-md hover:brightness-105"
                                    )}
                                >
                                    <SkipBack size={18} />
                                </button>

                                {/* Play / Pause */}
                                <button
                                    type="button"
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className={clsx(
                                        "w-14 h-14 rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] active:translate-y-1 active:shadow-inner transition-all flex items-center justify-center border-2 z-10",
                                        isPlaying
                                            ? "bg-gradient-to-b from-amber-500 via-amber-600 to-amber-700 text-neutral-950 border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.5)]"
                                            : (isDarkMode
                                                ? "bg-gradient-to-b from-neutral-600 via-neutral-700 to-neutral-800 text-neutral-100 border-neutral-400 hover:brightness-110"
                                                : "bg-gradient-to-b from-neutral-100 via-neutral-200 to-neutral-300 text-neutral-900 border-neutral-400 hover:brightness-105")
                                    )}
                                >
                                    {isPlaying ? <Pause size={24} /> : <Play size={24} className="pl-0.5" />}
                                </button>

                                {/* Next */}
                                <button
                                    type="button"
                                    onClick={() => { playClick(); next(); }}
                                    className={clsx(
                                        "w-11 h-11 rounded-full shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] active:translate-y-0.5 active:shadow-inner transition-all flex items-center justify-center border",
                                        isDarkMode
                                            ? "bg-gradient-to-b from-neutral-600 via-neutral-700 to-neutral-800 text-neutral-200 border-neutral-500/70 hover:brightness-110"
                                            : "bg-gradient-to-b from-neutral-100 via-neutral-200 to-neutral-300 text-neutral-800 border-neutral-400 shadow-md hover:brightness-105"
                                    )}
                                >
                                    <SkipForward size={18} />
                                </button>

                                {/* Repeat */}
                                <button
                                    type="button"
                                    onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                                    className={clsx(
                                        "w-9 h-9 rounded-full shadow-[0_4px_8px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] active:translate-y-0.5 active:shadow-inner transition-all flex items-center justify-center border relative",
                                        repeat !== 'off'
                                            ? "bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]"
                                            : (isDarkMode ? "bg-gradient-to-b from-neutral-700 via-neutral-800 to-neutral-900 text-neutral-300 border-neutral-600 hover:text-white" : "bg-gradient-to-b from-neutral-200 via-neutral-300 to-neutral-400 text-neutral-700 border-neutral-300")
                                    )}
                                    title={`Repeat: ${repeat.toUpperCase()}`}
                                >
                                    <Repeat size={14} />
                                    {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[7px] font-black bg-amber-500 text-black rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                                </button>
                            </div>

                            {/* Footer Controls */}
                            <div className="flex items-center justify-between px-2 text-xs font-mono text-neutral-400 font-bold border-t border-neutral-700/40 pt-3">
                                {!isCompact && (
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5">
                                            <div className={clsx(
                                                "w-2.5 h-2.5 rounded-full border border-black/60 transition-all",
                                                isPlaying ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-neutral-700"
                                            )} />
                                            <span className="text-[9px] tracking-wider">REC</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] border border-black/60" />
                                            <span className="text-[9px] tracking-wider">BATT</span>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        playEject();
                                        setIsEjecting(true);
                                        setTimeout(() => {
                                            loadMix("");
                                            setIsEjecting(false);
                                            if (viewMode === 'player') setViewMode('rack');
                                        }, 500);
                                    }}
                                    disabled={isEjecting}
                                    className={`flex flex-col items-center cursor-pointer hover:text-amber-400 transition-colors ${isEjecting ? 'opacity-50' : ''}`}
                                >
                                    <Disc size={14} />
                                    <span className="mt-0.5 tracking-widest text-[8px] font-bold">EJECT</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!showLyrics) setShowEq(false);
                                        setShowLyrics(prev => !prev);
                                    }}
                                    className={`flex flex-col items-center cursor-pointer transition-colors ${showLyrics ? 'text-blue-400' : 'hover:text-blue-400'}`}
                                >
                                    <Mic2 size={14} />
                                    <span className="mt-0.5 tracking-widest text-[8px] font-bold">LYRICS</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!showEq) setShowLyrics(false);
                                        setShowEq(prev => !prev);
                                    }}
                                    className={`flex flex-col items-center cursor-pointer transition-colors ${showEq ? 'text-purple-400' : 'hover:text-purple-400'}`}
                                >
                                    <SlidersHorizontal size={14} />
                                    <span className="mt-0.5 tracking-widest text-[8px] font-bold">EQ</span>
                                </button>

                                <div className="flex items-center gap-2 w-32 ml-2">
                                    <span className="text-[9px] font-bold text-neutral-400 tracking-wider font-mono shrink-0">VOL</span>
                                    <Volume2 size={14} className="text-neutral-400 shrink-0" />
                                    <div
                                        className={clsx(
                                            "h-2 flex-grow rounded-full relative cursor-pointer z-50 group border transition-all shadow-inner",
                                            isDarkMode ? "bg-neutral-950 border-neutral-700/60" : "bg-neutral-300 border-neutral-400"
                                        )}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const p = (e.clientX - rect.left) / rect.width;
                                            setVolume(Math.min(Math.max(p, 0), 1));
                                        }}
                                    >
                                        <div
                                            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-600 to-amber-400 rounded-full pointer-events-none transition-all shadow-[0_0_6px_rgba(245,158,11,0.5)]"
                                            style={{ width: `${volume * 100}%` }}
                                        />
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-gradient-to-b from-white via-neutral-200 to-neutral-400 border border-neutral-500 rounded-full shadow-md pointer-events-none transition-transform group-hover:scale-110 flex items-center justify-center"
                                            style={{ left: `calc(${volume * 100}% - 6px)` }}
                                        >
                                            <div className="w-1 h-1 rounded-full bg-amber-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>
                )}
            </main>
            {/* Overlays */}
            {/* Overlays */}
            <div className="relative z-[10000]">
                <AnimatePresence>
                    {showLyrics && (
                        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                            <div className="pointer-events-auto w-full h-full max-w-2xl max-h-[80vh]">
                                <LyricsView
                                    currentSong={currentSong}
                                    currentTime={progress * songDuration}
                                    onClose={() => setShowLyrics(false)}
                                />
                            </div>
                        </div>
                    )}
                    {showEq && (
                        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                            <div className="pointer-events-auto">
                                <EqualizerView
                                    onClose={() => setShowEq(false)}
                                    bands={eq.bands}
                                    setBand={eq.setBand}
                                    isEnabled={eq.isEnabled}
                                    setIsEnabled={eq.setIsEnabled}
                                    currentPreset={eq.currentPreset}
                                    setPreset={eq.setPreset}
                                    presets={eq.presets}
                                />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
}
