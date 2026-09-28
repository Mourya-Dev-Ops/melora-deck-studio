"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Share2, Palette, Settings, Plus, Camera, Search, Pencil, Mic2, SlidersHorizontal, Sun, Moon, ListMusic, Shuffle, Repeat, Disc3, Radio } from "lucide-react";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { Visualizer } from "@/components/ui/visualizer";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useAudioProgress } from "@/hooks/use-audio-progress";

interface ZenStageProps {
    currentTheme?: ThemeKey;
    onThemeChange?: () => void;
    onSelectTheme?: (theme: ThemeKey) => void;
    onOpenSettings?: () => void;
    onEditMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    onCreateMix?: () => void;
    onCinemaMode?: () => void;
    onOpenThemeSelector?: () => void;
    onSnapshotMix?: (mix: Mix) => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: Mix) => void;
}

export function ZenStage({
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    onShareMix,
    onSnapshotMix
}: ZenStageProps) {
    const playerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Cache player rect for drag target detection
    const playerRectRef = useRef<DOMRect | null>(null);

    const {
        activeMixId,
        isPlaying,
        currentSong,
        currentTrack,
        volume,
        duration,
        loadMix,
        togglePlay,
        next,
        prev,
        seek,
        setVolume,
        isLoaded,
        eq,
        activeQuality,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        play,
        unlockAudio
    } = usePlayback();
    const { mixes, isDownloaded } = useLibrary();
    const { progress } = useAudioProgress();

    const { playClick, playClunk, playEject } = useAudio();

    // Zen Mode Persistence
    const [isDark, setIsDark] = useState(true);
    useEffect(() => {
        const savedMode = localStorage.getItem('melora-zen-mode');
        if (savedMode) {
            setIsDark(savedMode === 'dark');
        }
    }, []);

    const toggleZenMode = useCallback(() => {
        const newMode = !isDark;
        setIsDark(newMode);
        localStorage.setItem('melora-zen-mode', newMode ? 'dark' : 'light');
        playClick();
    }, [isDark, playClick]);

    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);
    const [failedMixId, setFailedMixId] = useState<string | null>(null);

    // Drag Logic Helpers
    const isDraggingRef = useRef(false);

    const handleDragStart = useCallback(() => {
        isDraggingRef.current = true;
        if (playerRef.current) {
            playerRectRef.current = playerRef.current.getBoundingClientRect();
        }
    }, []);

    const handleDragEnd = useCallback((_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo, mixId: string) => {
        setTimeout(() => { isDraggingRef.current = false; }, 50);

        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            const pt = info.point;
            if (pt.x >= rect.left && pt.x <= rect.right && pt.y >= rect.top && pt.y <= rect.bottom) {
                playClunk();
                unlockAudio();
                loadMix(mixId);
                setTimeout(() => play(), 800);
            } else {
                setFailedMixId(mixId);
                setTimeout(() => {
                    setFailedMixId(null);
                }, 500);
            }
        }
    }, [playClunk, loadMix, setFailedMixId, play, unlockAudio]);

    const handleClick = useCallback((callback: () => void) => {
        if (!isDraggingRef.current) callback();
    }, []);

    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    // Format time
    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const safeDuration = duration > 0 ? duration : 0;
    const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

    // Physical dynamic tape pack dimensions
    const leftTapeRadius = 14 + Math.sqrt(Math.max(0, 1 - safeProgress)) * 20;
    const rightTapeRadius = 14 + Math.sqrt(Math.max(0, safeProgress)) * 20;

    return (
        <div
            ref={containerRef}
            className={clsx(
                "w-full h-screen font-sans overflow-hidden relative transition-colors duration-700 cursor-default select-none",
                isDark
                    ? "bg-[#0b0c0e] text-[#f1f2f4] selection:bg-white selection:text-black"
                    : "bg-[#f4f5f7] text-[#111215] selection:bg-black selection:text-white"
            )}
        >
            <style jsx global>{`
                ::-webkit-scrollbar { display: none; }
                * { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>

            {/* Subtle engineering grid & soft studio lighting */}
            <div
                className={clsx(
                    "fixed inset-0 pointer-events-none z-0 transition-opacity duration-700",
                    isDark ? "opacity-35" : "opacity-25"
                )}
                style={{
                    backgroundImage: isDark
                        ? `radial-gradient(circle at 50% 10%, rgba(255,255,255,0.06) 0%, transparent 60%), radial-gradient(#ffffff 0.5px, transparent 0.5px)`
                        : `radial-gradient(circle at 50% 10%, rgba(0,0,0,0.03) 0%, transparent 60%), radial-gradient(#000000 0.5px, transparent 0.5px)`,
                    backgroundSize: "100% 100%, 24px 24px"
                }}
            />

            <div className="w-full h-full px-5 py-5 relative z-10 flex flex-col justify-between max-w-[1600px] mx-auto">
                {/* Header */}
                <header className="flex justify-between items-center mb-4 pointer-events-none shrink-0">
                    <motion.div
                        drag
                        dragConstraints={containerRef}
                        className="flex items-center gap-4 pointer-events-auto cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-baseline gap-2.5">
                            <span className={clsx(
                                "text-2xl font-semibold tracking-tighter uppercase font-mono transition-colors",
                                isDark ? "text-white" : "text-zinc-900"
                            )}>
                                MELORA
                            </span>
                            <span className={clsx(
                                "text-[11px] font-mono tracking-[0.25em] uppercase px-1.5 py-0.5 rounded border transition-colors",
                                isDark ? "text-white/60 border-white/15 bg-white/[0.04]" : "text-black/60 border-black/15 bg-black/[0.04]"
                            )}>
                                TP-ZEN // VER 2.0
                            </span>
                        </div>
                    </motion.div>

                    <motion.nav
                        drag
                        dragConstraints={containerRef}
                        className="flex items-center gap-4 md:gap-6 pointer-events-auto cursor-grab active:cursor-grabbing"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={onCinemaMode}
                            className={clsx(
                                "hidden md:flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase transition-all pb-1 border-b border-transparent",
                                isDark ? "text-white/50 hover:text-white hover:border-white/40" : "text-black/50 hover:text-black hover:border-black/40"
                            )}
                        >
                            <Camera size={13} /> Photo Mode
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => onOpenSearch?.('')}
                            className={clsx(
                                "hidden md:flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase transition-all pb-1 border-b border-transparent",
                                isDark ? "text-white/50 hover:text-white hover:border-white/40" : "text-black/50 hover:text-black hover:border-black/40"
                            )}
                        >
                            <Search size={13} /> Search
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={() => setIsRackOpen(true)}
                            className={clsx(
                                "hidden md:flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase transition-all pb-1 border-b border-transparent",
                                isDark ? "text-white/50 hover:text-white hover:border-white/40" : "text-black/50 hover:text-black hover:border-black/40"
                            )}
                        >
                            <ListMusic size={13} /> Rack
                        </button>
                        <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={onCreateMix}
                            className={clsx(
                                "hidden md:flex items-center gap-1.5 font-mono text-[11px] tracking-widest uppercase transition-all pb-1 border-b border-transparent",
                                isDark ? "text-white/50 hover:text-white hover:border-white/40" : "text-black/50 hover:text-black hover:border-black/40"
                            )}
                        >
                            <Plus size={13} /> New Tape
                        </button>

                        <div className={clsx("flex items-center gap-2 border-l pl-4 transition-colors", isDark ? "border-white/10" : "border-black/10")}>
                            {/* Theme Selector */}
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={() => onOpenThemeSelector?.()}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all hover:scale-105 active:scale-95",
                                    isDark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-black/50 hover:text-black hover:bg-black/5"
                                )}
                                title="Change Theme"
                            >
                                <Palette size={17} />
                            </button>

                            {/* Dark/Light Zen Mode Toggle */}
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={toggleZenMode}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all hover:scale-105 active:scale-95",
                                    isDark ? "text-white/50 hover:text-amber-300 hover:bg-white/5" : "text-black/50 hover:text-indigo-600 hover:bg-black/5"
                                )}
                                title={isDark ? "Switch to Light Ceramic Mode" : "Switch to Dark Obsidian Mode"}
                            >
                                {isDark ? <Sun size={17} /> : <Moon size={17} />}
                            </button>

                            {/* Settings */}
                            <button
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={onOpenSettings}
                                className={clsx(
                                    "p-1.5 rounded-md transition-all hover:scale-105 active:scale-95",
                                    isDark ? "text-white/50 hover:text-white hover:bg-white/5" : "text-black/50 hover:text-black hover:bg-black/5"
                                )}
                                title="Deck Settings"
                            >
                                <Settings size={17} />
                            </button>
                        </div>
                    </motion.nav>
                </header>

                <main className="grid lg:grid-cols-12 gap-6 flex-grow items-start h-full relative">
                    {/* Left Column: Minimalist Ceramic / Basalt Mixtapes */}
                    <section className="lg:col-span-7 h-full flex flex-col relative z-50">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <motion.div drag dragConstraints={containerRef} className="cursor-grab active:cursor-grabbing">
                                <h2 className={clsx(
                                    "font-mono text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-2",
                                    isDark ? "text-white/70" : "text-black/70"
                                )}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Archive Tapes // Physical Storage
                                </h2>
                            </motion.div>
                            <span className={clsx("font-mono text-[10px] tracking-wider", isDark ? "text-white/30" : "text-black/30")}>
                                DRAG TAPE TO DECK BAY
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pb-4 overflow-y-auto max-h-[calc(100vh-140px)] pr-1">
                            {mixes
                                .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                                .map((mix) => {
                                    if (mix.id === activeMixId) return null;
                                    const isFailed = failedMixId === mix.id;

                                    return (
                                        <motion.div
                                            key={mix.id}
                                            layout
                                            drag
                                            dragConstraints={containerRef}
                                            dragElastic={0.2}
                                            dragMomentum
                                            onDragStart={handleDragStart}
                                            onDragEnd={(e, info) => handleDragEnd(e, info, mix.id)}
                                            initial={{ opacity: 0, scale: 0.94 }}
                                            animate={isFailed ? {
                                                opacity: 1,
                                                scale: 1,
                                                x: [0, -8, 8, -8, 8, -4, 4, 0]
                                            } : {
                                                opacity: 1,
                                                scale: 1,
                                                x: 0
                                            }}
                                            transition={isFailed ? { duration: 0.4 } : undefined}
                                            whileHover={{ scale: 1.03, y: -2, zIndex: 50, transition: { duration: 0.15 } }}
                                            whileDrag={{ scale: 1.08, zIndex: 100, rotate: 2, cursor: "grabbing" }}
                                            onClick={() => handleClick(() => {
                                                playClunk();
                                                unlockAudio();
                                                loadMix(mix.id);
                                            })}
                                            className={clsx(
                                                "group relative w-full aspect-[1.58/1] rounded-lg p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden transition-all duration-300",
                                                isDark
                                                    ? "bg-[#141519] border border-white/[0.08] shadow-[0_12px_24px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-white/20"
                                                    : "bg-[#ffffff] border border-black/[0.08] shadow-[0_10px_20px_rgba(0,0,0,0.07),inset_0_1px_0_rgba(255,255,255,0.8)] hover:border-black/20",
                                                isFailed && "border-red-500 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                                            )}
                                        >
                                            {/* Micro corner screws */}
                                            <div className={clsx("absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}>
                                                <div className={clsx("w-1 h-[0.5px] rotate-45", isDark ? "bg-white/30" : "bg-black/30")} />
                                            </div>
                                            <div className={clsx("absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}>
                                                <div className={clsx("w-1 h-[0.5px] -rotate-45", isDark ? "bg-white/30" : "bg-black/30")} />
                                            </div>
                                            <div className={clsx("absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}>
                                                <div className={clsx("w-1 h-[0.5px] -rotate-45", isDark ? "bg-white/30" : "bg-black/30")} />
                                            </div>
                                            <div className={clsx("absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full flex items-center justify-center", isDark ? "bg-white/10" : "bg-black/10")}>
                                                <div className={clsx("w-1 h-[0.5px] rotate-45", isDark ? "bg-white/30" : "bg-black/30")} />
                                            </div>

                                            {/* Matte Archival Label */}
                                            <div className={clsx(
                                                "relative mx-0.5 mt-0.5 rounded px-2 py-1.5 flex flex-col justify-between transition-colors shadow-sm",
                                                isDark
                                                    ? "bg-[#202228] text-white/90 border border-white/[0.08]"
                                                    : "bg-[#f8f9fa] text-zinc-900 border border-black/[0.07]"
                                            )}>
                                                <div className="flex items-center justify-between text-[7px] font-mono tracking-widest opacity-60">
                                                    <span>SIDE A</span>
                                                    <span>CrO2 // 70μs</span>
                                                </div>
                                                <h3 className="font-mono font-medium text-xs tracking-tight line-clamp-1 truncate my-0.5">
                                                    {mix.title}
                                                </h3>
                                                <div className="flex items-center justify-between text-[7px] font-mono tracking-wider opacity-45">
                                                    <span>MELORA AUDIO LABS</span>
                                                    <span>{mix.songs.length} TRACKS</span>
                                                </div>
                                            </div>

                                            {/* Minimalist Spools Bay */}
                                            <div className={clsx(
                                                "mx-1 my-1 h-7 rounded-sm flex items-center justify-between px-3 relative border",
                                                isDark ? "bg-black/40 border-white/[0.06]" : "bg-black/[0.04] border-black/[0.06]"
                                            )}>
                                                {/* Left Reel */}
                                                <div className={clsx(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center relative transition-transform duration-700 group-hover:rotate-180",
                                                    isDark ? "border-white/30 bg-white/5" : "border-black/30 bg-black/5"
                                                )}>
                                                    <div className={clsx("w-1 h-1 rounded-full", isDark ? "bg-white" : "bg-black")} />
                                                    <div className={clsx("absolute inset-0 border border-dashed rounded-full", isDark ? "border-white/20" : "border-black/20")} />
                                                </div>

                                                {/* Center Tape Window / Guide */}
                                                <div className="flex items-center gap-1 opacity-40">
                                                    <div className="w-1.5 h-1 rounded-sm bg-current" />
                                                    <span className="font-mono text-[7px] tracking-widest uppercase">NORM</span>
                                                    <div className="w-1.5 h-1 rounded-sm bg-current" />
                                                </div>

                                                {/* Right Reel */}
                                                <div className={clsx(
                                                    "w-5 h-5 rounded-full border flex items-center justify-center relative transition-transform duration-700 group-hover:rotate-180",
                                                    isDark ? "border-white/30 bg-white/5" : "border-black/30 bg-black/5"
                                                )}>
                                                    <div className={clsx("w-1 h-1 rounded-full", isDark ? "bg-white" : "bg-black")} />
                                                    <div className={clsx("absolute inset-0 border border-dashed rounded-full", isDark ? "border-white/20" : "border-black/20")} />
                                                </div>
                                            </div>

                                            {/* Action Buttons Overlay */}
                                            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="p-1 bg-white text-black rounded-full shadow hover:scale-110 transition-transform" title="Edit"><Pencil size={9} /></button>
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="p-1 bg-white text-black rounded-full shadow hover:scale-110 transition-transform" title="Snapshot"><Camera size={9} /></button>
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="p-1 bg-white text-black rounded-full shadow hover:scale-110 transition-transform" title="Share"><Share2 size={9} /></button>
                                                <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="p-1 bg-white text-black rounded-full shadow hover:scale-110 transition-transform" title="Add Songs"><Plus size={9} /></button>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                            {/* Create Tape Slot */}
                            <div
                                onClick={onCreateMix}
                                className={clsx(
                                    "w-full aspect-[1.58/1] rounded-lg border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group gap-1.5",
                                    isDark
                                        ? "border-white/15 hover:border-white/40 hover:bg-white/[0.03]"
                                        : "border-black/15 hover:border-black/40 hover:bg-black/[0.03]"
                                )}
                            >
                                <div className={clsx(
                                    "p-2 rounded-full transition-all group-hover:scale-110",
                                    isDark ? "bg-white/5 group-hover:bg-white/10" : "bg-black/5 group-hover:bg-black/10"
                                )}>
                                    <Plus size={16} className={clsx("transition-colors", isDark ? "text-white/40 group-hover:text-white" : "text-black/40 group-hover:text-black")} />
                                </div>
                                <span className={clsx(
                                    "font-mono text-[10px] uppercase tracking-widest font-medium transition-colors",
                                    isDark ? "text-white/40 group-hover:text-white" : "text-black/40 group-hover:text-black"
                                )}>
                                    Create Tape
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Right Column: High-End Japanese Zen Deck Player */}
                    <motion.section
                        ref={playerRef}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum={false}
                        onDragStart={handleDragStart}
                        dragElastic={0.08}
                        className="lg:col-span-5 w-full flex justify-center sticky top-4 h-fit z-40 cursor-grab active:cursor-grabbing"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className={clsx(
                            "w-full max-w-[380px] p-6 rounded-2xl relative overflow-hidden transition-all duration-500",
                            isDark
                                ? "bg-gradient-to-b from-[#18191e] to-[#0f1013] border border-white/[0.12] shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.6)]"
                                : "bg-gradient-to-b from-[#fbfbfc] to-[#edf0f4] border border-black/[0.12] shadow-[0_25px_60px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.06)]"
                        )}>
                            {/* Precision Countersunk Torx Machine Screws */}
                            <div className="absolute top-3.5 left-3.5 w-3 h-3 rounded-full flex items-center justify-center opacity-40 shadow-inner">
                                <div className={clsx("w-2 h-2 rounded-full border flex items-center justify-center", isDark ? "border-white/30 bg-black/60" : "border-black/30 bg-white/60")}>
                                    <div className={clsx("w-1 h-[0.8px] rotate-12", isDark ? "bg-white/60" : "bg-black/60")} />
                                </div>
                            </div>
                            <div className="absolute top-3.5 right-3.5 w-3 h-3 rounded-full flex items-center justify-center opacity-40 shadow-inner">
                                <div className={clsx("w-2 h-2 rounded-full border flex items-center justify-center", isDark ? "border-white/30 bg-black/60" : "border-black/30 bg-white/60")}>
                                    <div className={clsx("w-1 h-[0.8px] -rotate-45", isDark ? "bg-white/60" : "bg-black/60")} />
                                </div>
                            </div>
                            <div className="absolute bottom-3.5 left-3.5 w-3 h-3 rounded-full flex items-center justify-center opacity-40 shadow-inner">
                                <div className={clsx("w-2 h-2 rounded-full border flex items-center justify-center", isDark ? "border-white/30 bg-black/60" : "border-black/30 bg-white/60")}>
                                    <div className={clsx("w-1 h-[0.8px] -rotate-30", isDark ? "bg-white/60" : "bg-black/60")} />
                                </div>
                            </div>
                            <div className="absolute bottom-3.5 right-3.5 w-3 h-3 rounded-full flex items-center justify-center opacity-40 shadow-inner">
                                <div className={clsx("w-2 h-2 rounded-full border flex items-center justify-center", isDark ? "border-white/30 bg-black/60" : "border-black/30 bg-white/60")}>
                                    <div className={clsx("w-1 h-[0.8px] rotate-60", isDark ? "bg-white/60" : "bg-black/60")} />
                                </div>
                            </div>

                            {/* Deck Top Plate Branding & Silk Screen */}
                            <div className="flex justify-between items-center mb-4 px-2">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("w-2 h-2 rounded-full", isPlaying ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : (isDark ? "bg-white/20" : "bg-black/20"))} />
                                    <span className={clsx(
                                        "font-mono text-[9px] font-semibold tracking-[0.2em] uppercase",
                                        isDark ? "text-white/60" : "text-black/60"
                                    )}>
                                        DIRECT DRIVE DUAL CAPSTAN
                                    </span>
                                </div>
                                <span className={clsx(
                                    "font-mono text-[8px] tracking-widest uppercase opacity-40",
                                    isDark ? "text-white" : "text-black"
                                )}>
                                    TP-ZEN // CH-1
                                </span>
                            </div>

                            {/* Cassette Bay Window with Physical Reels & Smoked Glass */}
                            <div className={clsx(
                                "w-full aspect-[1.62/1] rounded-xl relative mb-4 flex items-center justify-center overflow-hidden transition-all duration-300",
                                isDark
                                    ? "bg-[#08080a] border border-white/[0.08] shadow-[inset_0_4px_16px_rgba(0,0,0,0.9),0_1px_0_rgba(255,255,255,0.05)]"
                                    : "bg-[#e5e7eb] border border-black/[0.08] shadow-[inset_0_4px_12px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.8)]"
                            )}>
                                {/* Internal Halogen / LED Diffuser Glow */}
                                <div className={clsx(
                                    "absolute inset-0 pointer-events-none transition-opacity duration-700",
                                    isPlaying ? "opacity-100" : "opacity-40",
                                    isDark
                                        ? "bg-gradient-to-b from-amber-500/[0.07] via-transparent to-amber-500/[0.04]"
                                        : "bg-gradient-to-b from-sky-400/[0.06] via-transparent to-transparent"
                                )} />

                                {/* Anti-Reflective Optical Glass Diagonal Highlight */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] via-transparent to-transparent pointer-events-none z-30" />

                                {isLoaded && activeMix ? (
                                    <motion.div
                                        initial={{ scale: 0.96, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={clsx(
                                            "w-[94%] h-[92%] rounded-lg p-3 flex flex-col justify-between relative z-10 transition-colors shadow-2xl",
                                            isDark
                                                ? "bg-gradient-to-b from-[#1b1c22] to-[#121317] border border-white/[0.12]"
                                                : "bg-gradient-to-b from-[#ffffff] to-[#f4f5f7] border border-black/[0.1]"
                                        )}
                                    >
                                        {/* Cassette Header Bar & Label */}
                                        <div className={clsx(
                                            "relative rounded px-3 py-1.5 shadow-sm flex flex-col justify-center items-center z-10 transition-colors",
                                            isDark ? "bg-[#252830] border border-white/[0.08]" : "bg-[#f9fafb] border border-black/[0.08]"
                                        )}>
                                            <div className="w-full flex items-center justify-between text-[7px] font-mono tracking-widest opacity-60">
                                                <span>SIDE A</span>
                                                <span>TYPE II HIGH BIAS</span>
                                            </div>
                                            <h3 className={clsx(
                                                "font-mono font-medium text-xs tracking-tight text-center line-clamp-1 w-full truncate py-0.5",
                                                isDark ? "text-white" : "text-zinc-900"
                                            )}>
                                                {currentSong ? decodeHtml(currentSong.name) : activeMix.title}
                                            </h3>
                                            <div className="w-full flex items-center justify-between text-[7px] font-mono tracking-wider opacity-40">
                                                <span>44.1 kHz MASTER</span>
                                                <span>70μs EQ</span>
                                            </div>
                                        </div>

                                        {/* Physical Cassette Tape Reels Bay */}
                                        <div className={clsx(
                                            "h-14 rounded-md flex items-center justify-between px-4 relative overflow-hidden border",
                                            isDark ? "bg-[#0b0c0f] border-white/[0.06]" : "bg-[#e5e7eb] border-black/[0.06]"
                                        )}>
                                            {/* Left Tape Reel Spool with Dynamic Tape Roll */}
                                            <div className="relative flex items-center justify-center">
                                                {/* Left Dynamic Tape Pack */}
                                                <div
                                                    className="rounded-full absolute transition-all duration-300"
                                                    style={{
                                                        width: `${leftTapeRadius * 2}px`,
                                                        height: `${leftTapeRadius * 2}px`,
                                                        background: "radial-gradient(circle, #3d2a1d 30%, #1a120c 90%)",
                                                        boxShadow: "0 0 6px rgba(0,0,0,0.8)"
                                                    }}
                                                />
                                                {/* Left Rotating Spool Hub */}
                                                <motion.div
                                                    className={clsx(
                                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center relative z-10",
                                                        isDark ? "border-white/70 bg-[#1e2025]" : "border-black/70 bg-[#f4f5f7]"
                                                    )}
                                                    animate={isPlaying ? { rotate: 360 } : {}}
                                                    transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                                >
                                                    <div className={clsx("w-2 h-2 rounded-full", isDark ? "bg-white" : "bg-black")} />
                                                    {/* 3 Spoke Teeth */}
                                                    <div className={clsx("absolute w-0.5 h-full", isDark ? "bg-white/40" : "bg-black/40")} />
                                                    <div className={clsx("absolute w-0.5 h-full rotate-60", isDark ? "bg-white/40" : "bg-black/40")} />
                                                    <div className={clsx("absolute w-0.5 h-full -rotate-60", isDark ? "bg-white/40" : "bg-black/40")} />
                                                </motion.div>
                                            </div>

                                            {/* Center Guide Bridge / Head Block */}
                                            <div className="flex flex-col items-center justify-center z-10 opacity-70">
                                                <div className={clsx("w-8 h-2 rounded-sm border mb-0.5 flex items-center justify-center", isDark ? "bg-white/10 border-white/20" : "bg-black/10 border-black/20")}>
                                                    <div className="w-2 h-1 bg-amber-400/80 rounded-[1px]" />
                                                </div>
                                                <span className={clsx("font-mono text-[6px] tracking-widest uppercase", isDark ? "text-white/40" : "text-black/40")}>
                                                    REC HEAD
                                                </span>
                                            </div>

                                            {/* Right Tape Reel Spool with Dynamic Tape Roll */}
                                            <div className="relative flex items-center justify-center">
                                                {/* Right Dynamic Tape Pack */}
                                                <div
                                                    className="rounded-full absolute transition-all duration-300"
                                                    style={{
                                                        width: `${rightTapeRadius * 2}px`,
                                                        height: `${rightTapeRadius * 2}px`,
                                                        background: "radial-gradient(circle, #3d2a1d 30%, #1a120c 90%)",
                                                        boxShadow: "0 0 6px rgba(0,0,0,0.8)"
                                                    }}
                                                />
                                                {/* Right Rotating Spool Hub */}
                                                <motion.div
                                                    className={clsx(
                                                        "w-7 h-7 rounded-full border-2 flex items-center justify-center relative z-10",
                                                        isDark ? "border-white/70 bg-[#1e2025]" : "border-black/70 bg-[#f4f5f7]"
                                                    )}
                                                    animate={isPlaying ? { rotate: 360 } : {}}
                                                    transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                                >
                                                    <div className={clsx("w-2 h-2 rounded-full", isDark ? "bg-white" : "bg-black")} />
                                                    {/* 3 Spoke Teeth */}
                                                    <div className={clsx("absolute w-0.5 h-full", isDark ? "bg-white/40" : "bg-black/40")} />
                                                    <div className={clsx("absolute w-0.5 h-full rotate-60", isDark ? "bg-white/40" : "bg-black/40")} />
                                                    <div className={clsx("absolute w-0.5 h-full -rotate-60", isDark ? "bg-white/40" : "bg-black/40")} />
                                                </motion.div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-1.5 opacity-35">
                                        <Disc3 size={24} className="animate-spin" style={{ animationDuration: "10s" }} />
                                        <span className="font-mono text-[9px] tracking-[0.25em] uppercase font-medium">NO CASSETTE LOADED</span>
                                    </div>
                                )}
                            </div>

                            {/* High-Contrast Crisp OLED Status Matrix */}
                            <div className={clsx(
                                "h-9 w-full rounded-lg border flex items-center px-3 mb-3.5 shadow-inner transition-colors overflow-hidden whitespace-nowrap",
                                isDark
                                    ? "bg-[#090a0d] border-white/[0.1] text-white/90"
                                    : "bg-[#e2e5eb] border-black/[0.1] text-zinc-900"
                            )}>
                                <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider truncate flex-1 min-w-0">
                                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", isPlaying ? "bg-emerald-400" : "bg-zinc-500")} />
                                    {currentSong ? (
                                        <>
                                            {isDownloaded(currentTrack?.id || currentSong.id) && (
                                                <span className={clsx("px-1 py-0.2 rounded text-[8px] font-bold tracking-wider", isDark ? "bg-white/15" : "bg-black/15")}>
                                                    FLAC
                                                </span>
                                            )}
                                            <span className="truncate">{decodeHtml(currentSong.name)}</span>
                                        </>
                                    ) : (
                                        <span className="opacity-50">SYSTEM READY // IDLE</span>
                                    )}
                                </div>
                                {activeQuality && <QualityBadge quality={activeQuality} variant="mini" className="ml-2 shrink-0" />}
                            </div>

                            {/* Recessed Acoustic Spectrum Visualizer */}
                            <div className={clsx(
                                "w-full h-7 rounded-md mb-4 p-1 flex items-center overflow-hidden border",
                                isDark ? "bg-[#090a0c] border-white/[0.08]" : "bg-[#dfe2e8] border-black/[0.08]"
                            )}>
                                {isLoaded ? (
                                    <Visualizer
                                        isPlaying={isPlaying}
                                        accentColor={isDark ? "#ffffff" : "#111215"}
                                        className="w-full h-full opacity-60"
                                    />
                                ) : (
                                    <div className="w-full h-0.5 bg-current opacity-15 rounded-full" />
                                )}
                            </div>

                            {/* Precision Linear Time & Fader Progress Track */}
                            <div className="mb-5 px-0.5">
                                <div className={clsx("flex justify-between text-[10px] font-mono tracking-wider mb-1.5", isDark ? "text-white/40" : "text-black/40")}>
                                    <span>{formatTime(safeProgress * safeDuration)}</span>
                                    <span className="text-[8px] tracking-widest uppercase opacity-60">LINEAR TAPE COUNTER</span>
                                    <span>{formatTime(safeDuration)}</span>
                                </div>
                                <div
                                    className={clsx(
                                        "h-2 rounded-full relative overflow-hidden cursor-pointer group p-0.5 border",
                                        isDark ? "bg-black/60 border-white/[0.08]" : "bg-black/[0.08] border-black/[0.08]"
                                    )}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        if (safeDuration && isLoaded) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - rect.left) / rect.width;
                                            seek(Math.min(Math.max(percent, 0), 1));
                                        }
                                    }}
                                >
                                    <motion.div
                                        className={clsx(
                                            "h-full rounded-full transition-all relative",
                                            isDark ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]" : "bg-black shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                                        )}
                                        style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Tactile Machined Push Buttons - Hardware Controls */}
                            <div className="flex items-center justify-between mb-6 px-1">
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleClick(() => { playClick(); setShuffle(!shuffle); })}
                                    className={clsx(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all border",
                                        shuffle
                                            ? (isDark ? "bg-white text-black border-white" : "bg-black text-white border-black")
                                            : (isDark ? "bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white hover:bg-white/[0.08]" : "bg-black/[0.04] text-black/50 border-black/[0.08] hover:text-black hover:bg-black/[0.08]")
                                    )}
                                    title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                                >
                                    <Shuffle size={14} />
                                </button>

                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleClick(() => { playClick(); prev(); })}
                                    className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all border shadow-sm active:translate-y-0.5",
                                        isDark
                                            ? "bg-[#21232b] text-white/80 border-white/[0.12] hover:text-white hover:bg-[#282a34]"
                                            : "bg-[#e5e8ee] text-black/80 border-black/[0.1] hover:text-black hover:bg-[#dce0e8]"
                                    )}
                                    title="Previous Track"
                                >
                                    <SkipBack size={17} className="fill-current" />
                                </button>

                                {/* Iconic Machined Master Play Button */}
                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleClick(() => { playClick(); togglePlay(); })}
                                    className={clsx(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 border",
                                        isDark
                                            ? "bg-gradient-to-b from-white to-[#d4d4d8] text-black border-white shadow-[0_8px_20px_rgba(255,255,255,0.15)] hover:brightness-105"
                                            : "bg-gradient-to-b from-[#18191d] to-[#0a0a0c] text-white border-black shadow-[0_8px_20px_rgba(0,0,0,0.25)] hover:brightness-110"
                                    )}
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current pl-1" />}
                                </button>

                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleClick(() => { playClick(); next(); })}
                                    className={clsx(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all border shadow-sm active:translate-y-0.5",
                                        isDark
                                            ? "bg-[#21232b] text-white/80 border-white/[0.12] hover:text-white hover:bg-[#282a34]"
                                            : "bg-[#e5e8ee] text-black/80 border-black/[0.1] hover:text-black hover:bg-[#dce0e8]"
                                    )}
                                    title="Next Track"
                                >
                                    <SkipForward size={17} className="fill-current" />
                                </button>

                                <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => handleClick(() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); })}
                                    className={clsx(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all relative border",
                                        repeat !== 'off'
                                            ? (isDark ? "bg-white text-black border-white" : "bg-black text-white border-black")
                                            : (isDark ? "bg-white/[0.04] text-white/50 border-white/[0.08] hover:text-white hover:bg-white/[0.08]" : "bg-black/[0.04] text-black/50 border-black/[0.08] hover:text-black hover:bg-black/[0.08]")
                                    )}
                                    title={`Repeat: ${repeat.toUpperCase()}`}
                                >
                                    <Repeat size={14} />
                                    {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>}
                                </button>
                            </div>

                            {/* Lower Bar: Eject, Lyrics, EQ & Volume Knurled Slider */}
                            <div className={clsx(
                                "flex justify-between items-center pt-3.5 border-t",
                                isDark ? "border-white/[0.08]" : "border-black/[0.08]"
                            )}>
                                <div className="flex items-center gap-3">
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => handleClick(() => { playEject(); loadMix(""); })}
                                        className={clsx(
                                            "flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest uppercase transition-colors px-1.5 py-1 rounded",
                                            isDark ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5"
                                        )}
                                        title="Eject Cassette"
                                    >
                                        <LogOut size={11} /> EJECT
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => {
                                            if (!showLyrics) setShowEq(false);
                                            setShowLyrics(prev => !prev);
                                        }}
                                        className={clsx(
                                            "flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest uppercase transition-colors px-1.5 py-1 rounded",
                                            showLyrics
                                                ? (isDark ? "text-white bg-white/10" : "text-black bg-black/10")
                                                : (isDark ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5")
                                        )}
                                    >
                                        <Mic2 size={11} /> LYRICS
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => {
                                            if (!showEq) setShowLyrics(false);
                                            setShowEq(prev => !prev);
                                        }}
                                        className={clsx(
                                            "flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-widest uppercase transition-colors px-1.5 py-1 rounded",
                                            showEq
                                                ? (isDark ? "text-white bg-white/10" : "text-black bg-black/10")
                                                : (isDark ? "text-white/40 hover:text-white hover:bg-white/5" : "text-black/40 hover:text-black hover:bg-black/5")
                                        )}
                                    >
                                        <SlidersHorizontal size={11} /> EQ
                                    </button>
                                </div>

                                {/* Precision Master Volume Slider */}
                                <div className="flex items-center gap-2 group cursor-pointer relative" onPointerDown={(e) => e.stopPropagation()}>
                                    <Volume2 size={13} className={clsx("transition-colors", isDark ? "text-white/40 group-hover:text-white" : "text-black/40 group-hover:text-black")} />
                                    <div className={clsx(
                                        "w-16 h-1.5 rounded-full relative overflow-hidden border",
                                        isDark ? "bg-black/60 border-white/[0.08]" : "bg-black/[0.08] border-black/[0.08]"
                                    )}>
                                        <div
                                            className={clsx(
                                                "absolute left-0 top-0 bottom-0 rounded-full transition-all",
                                                isDark ? "bg-white group-hover:bg-white" : "bg-black group-hover:bg-black"
                                            )}
                                            style={{ width: `${volume * 100}%` }}
                                        />
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.05" value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        title={`Volume: ${Math.round(volume * 100)}%`}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Overlays */}
                    <AnimatePresence>
                        {showLyrics && (
                            <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                                <div className="pointer-events-auto w-full h-full max-w-2xl max-h-[80vh]">
                                    <LyricsView
                                        currentSong={currentSong}
                                        currentTime={progress * duration}
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
                </main>

                <footer className="w-full text-center py-1 pointer-events-none">
                    <span className={clsx("font-mono text-[9px] tracking-[0.3em] uppercase", isDark ? "text-white/20" : "text-black/20")}>
                        MELORA AUDIO ENGINEERING // TOKYO • STOCKHOLM
                    </span>
                </footer>
            </div>

            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div>
    );
}
