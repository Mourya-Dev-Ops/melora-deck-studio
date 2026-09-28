"use client";

import { useRef, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, LogOut,
    Palette, Settings, Pencil, Camera, Search, Share2, Plus, Shuffle, Repeat,
    Mic2, SlidersHorizontal, ListMusic, Disc, Gauge, Activity
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { Visualizer } from "@/components/ui/visualizer";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useAudioProgress } from "@/hooks/use-audio-progress";

interface OpenDeckStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
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

export function OpenDeckStage({
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    onSnapshotMix,
    onShareMix
}: OpenDeckStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const ghostRef = useRef<HTMLDivElement>(null);

    // Drag State
    const [dragPosition, setDragPosition] = useState<{ x: number, y: number } | null>(null);
    const [failedMixId, setFailedMixId] = useState<string | null>(null);
    const [draggingMix, setDraggingMix] = useState<{ mix: Mix, index: number } | null>(null);
    const [isOverPlayer, setIsOverPlayer] = useState(false);

    // Cache rect to avoid thrashing
    const playerRectRef = useRef<DOMRect | null>(null);

    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);

    const {
        activeMixId,
        isPlaying,
        currentSong,
        volume,
        duration,
        loadMix,
        togglePlay,
        next,
        prev,
        setVolume,
        isLoaded,
        seek,
        eq,
        activeQuality,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        play,
        unlockAudio
    } = usePlayback();
    const { mixes } = useLibrary();
    const { progress } = useAudioProgress();

    const { playClick, playEject, playInsert } = useAudio();
    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    const safeDuration = duration > 0 ? duration : (currentSong && currentSong.duration ? parseInt(currentSong.duration.toString()) : 0);
    const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Open-Reel Dynamic Spool Dimensions
    const leftTapeRadius = 16 + Math.sqrt(Math.max(0, 1 - safeProgress)) * 26;
    const rightTapeRadius = 16 + Math.sqrt(Math.max(0, safeProgress)) * 26;

    const cassettePalettes = [
        {
            shell: "from-[#242b26] to-[#171b18]",
            rim: "border-[#384a3e]",
            labelBg: "bg-[#e8ece9]",
            labelText: "text-[#1b261e]",
            badge: "bg-[#2d8652] text-white",
            accent: "#2d8652"
        },
        {
            shell: "from-[#2a2c30] to-[#1c1d21]",
            rim: "border-[#40434b]",
            labelBg: "bg-[#f1efe9]",
            labelText: "text-[#222326]",
            badge: "bg-[#b45309] text-white",
            accent: "#d97706"
        },
        {
            shell: "from-[#1e2329] to-[#14181c]",
            rim: "border-[#313a44]",
            labelBg: "bg-[#e2e7ec]",
            labelText: "text-[#182028]",
            badge: "bg-[#0369a1] text-white",
            accent: "#0284c7"
        }
    ];

    const getStyleForMix = (index: number) => cassettePalettes[index % cassettePalettes.length];

    const handleDragStart = useCallback((mix: Mix, index: number, e: React.PointerEvent) => {
        setDraggingMix({ mix, index });
        setDragPosition({ x: e.clientX, y: e.clientY });

        e.currentTarget.setPointerCapture(e.pointerId);

        if (playerRef.current) {
            playerRectRef.current = playerRef.current.getBoundingClientRect();
        }
    }, []);

    const handleDragMove = useCallback((e: React.PointerEvent) => {
        if (!draggingMix) return;

        setDragPosition({ x: e.clientX, y: e.clientY });

        if (ghostRef.current) {
            ghostRef.current.style.transform = `translate(${e.clientX - 90}px, ${e.clientY - 55}px) rotate(4deg) scale(1.05)`;
        }

        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            const isOver = e.clientX >= rect.left && e.clientX <= rect.right &&
                e.clientY >= rect.top && e.clientY <= rect.bottom;
            setIsOverPlayer(prev => prev !== isOver ? isOver : prev);
        }
    }, [draggingMix]);

    const handleDragEnd = useCallback(() => {
        if (!draggingMix) return;

        if (isOverPlayer) {
            playInsert();
            unlockAudio();
            loadMix(draggingMix.mix.id);
            setTimeout(() => play(), 800);
        } else {
            setFailedMixId(draggingMix.mix.id);
            setTimeout(() => {
                setFailedMixId(null);
            }, 500);
        }

        setDraggingMix(null);
        setDragPosition(null);
        setIsOverPlayer(false);
    }, [draggingMix, isOverPlayer, playInsert, loadMix, setFailedMixId, play, unlockAudio]);

    return (
        <div
            ref={containerRef}
            className="w-full h-screen font-sans overflow-hidden relative flex flex-col select-none [&::-webkit-scrollbar]:hidden"
            style={{
                backgroundColor: '#edece8',
                backgroundImage: 'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.7) 0%, rgba(237,236,232,0.9) 70%), radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 20px 20px',
                fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, sans-serif'
            }}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerLeave={handleDragEnd}
        >
            <style>{`
                @keyframes opendeck-shake {
                    0%, 100% { transform: translateX(0); }
                    12.5% { transform: translateX(-8px); }
                    25% { transform: translateX(8px); }
                    37.5% { transform: translateX(-8px); }
                    50% { transform: translateX(8px); }
                    62.5% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                    87.5% { transform: translateX(-2px); }
                    93.75% { transform: translateX(2px); }
                }
                .opendeck-shake {
                    animation: opendeck-shake 0.5s ease-in-out;
                }
            `}</style>

            {/* Header */}
            <header className="flex items-center justify-between px-8 py-4 shrink-0 border-b border-[#dedcd5]/80 bg-[#edece8]/80 backdrop-blur-sm z-30">
                <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl font-bold font-mono tracking-tighter text-[#1c221e]">
                            REVOX // OPENDECK
                        </span>
                        <span className="text-[10px] font-mono tracking-[0.25em] uppercase px-2 py-0.5 rounded bg-[#2d8652]/10 text-[#2d8652] font-semibold border border-[#2d8652]/20">
                            STUDIO MASTER 15 IPS
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-5">
                    <nav className="hidden md:flex items-center gap-6">
                        <button onClick={onCinemaMode} className="text-[#323b35] text-[11px] font-mono font-semibold tracking-wider uppercase hover:text-[#2d8652] transition-colors flex items-center gap-1.5"><Camera size={13} /> Photo Mode</button>
                        <button onClick={() => onOpenSearch?.('')} className="text-[#323b35] text-[11px] font-mono font-semibold tracking-wider uppercase hover:text-[#2d8652] transition-colors flex items-center gap-1.5"><Search size={13} /> Search</button>
                        <button onClick={() => setIsRackOpen(true)} className="text-[#323b35] text-[11px] font-mono font-semibold tracking-wider uppercase hover:text-[#2d8652] transition-colors flex items-center gap-1.5"><ListMusic size={13} /> Master Vault</button>
                        <button onClick={onCreateMix} className="text-[#323b35] text-[11px] font-mono font-semibold tracking-wider uppercase hover:text-[#2d8652] transition-colors flex items-center gap-1.5"><Plus size={13} /> Cut New Reel</button>
                    </nav>

                    <div className="flex items-center gap-2 border-l border-[#d3d0c7] pl-4">
                        <button onClick={onOpenThemeSelector} className="size-8 rounded-lg bg-white/80 border border-[#d6d4cb] hover:bg-white hover:border-[#2d8652] transition-all flex items-center justify-center shadow-xs" title="Change Theme"><Palette size={14} className="text-[#333a35]" /></button>
                        <button onClick={onOpenSettings} className="size-8 rounded-lg bg-white/80 border border-[#d6d4cb] hover:bg-white hover:border-[#2d8652] transition-all flex items-center justify-center shadow-xs" title="Deck Settings"><Settings size={14} className="text-[#333a35]" /></button>
                        <button onClick={() => { if (!showLyrics) setShowEq(false); setShowLyrics(prev => !prev); }} className={clsx("size-8 rounded-lg border transition-all flex items-center justify-center shadow-xs", showLyrics ? 'bg-[#2d8652] text-white border-[#2d8652]' : 'bg-white/80 text-[#333a35] border-[#d6d4cb] hover:border-[#2d8652]')} title="Lyrics"><Mic2 size={14} /></button>
                        <button onClick={() => { if (!showEq) setShowLyrics(false); setShowEq(prev => !prev); }} className={clsx("size-8 rounded-lg border transition-all flex items-center justify-center shadow-xs", showEq ? 'bg-[#2d8652] text-white border-[#2d8652]' : 'bg-white/80 text-[#333a35] border-[#d6d4cb] hover:border-[#2d8652]')} title="Equalizer"><SlidersHorizontal size={14} /></button>
                    </div>
                </div>
            </header>

            {/* Main Stage Grid */}
            <main className="flex-1 grid grid-cols-12 px-8 py-5 gap-6 min-h-0">
                {/* Left: Open-Reel Master Tape Archives */}
                <div className="col-span-3 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#2d8652]" />
                            <p className="text-[11px] font-mono font-bold tracking-[0.2em] text-[#242b26] uppercase">Master Reels</p>
                        </div>
                        <span className="text-[9px] font-mono text-[#6c756e] tracking-wider uppercase">ARCHIVAL RACK</span>
                    </div>

                    <div className="flex-1 overflow-y-auto min-h-0 pr-1.5 space-y-3">
                        {mixes
                            .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                            .map((mix, index) => {
                                const palette = getStyleForMix(index);
                                const isInsidePlayer = isLoaded && activeMixId === mix.id;
                                const isDragging = draggingMix?.mix.id === mix.id;
                                const isFailed = failedMixId === mix.id;

                                return (
                                    <div
                                        key={mix.id}
                                        onPointerDown={(e) => { if (!isInsidePlayer) handleDragStart(mix, index, e); }}
                                        onClick={() => { if (!isInsidePlayer && !draggingMix) { playClick(); loadMix(mix.id); } }}
                                        className={clsx(
                                            "select-none shrink-0 transition-all duration-300",
                                            isInsidePlayer ? "opacity-35 cursor-default scale-95" : "cursor-grab active:cursor-grabbing hover:-translate-y-0.5",
                                            isDragging && "opacity-20",
                                            isFailed && "opendeck-shake"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-full h-28 rounded-xl p-3 flex flex-col justify-between relative overflow-hidden transition-all shadow-[0_8px_20px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] border",
                                            `bg-gradient-to-br ${palette.shell} ${palette.rim}`,
                                            isFailed && "border-red-500 ring-4 ring-red-500/50"
                                        )}>
                                            {/* Top Archival Header */}
                                            <div className="flex items-center justify-between z-10">
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx("text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider", palette.badge)}>
                                                        1/4 INCH MASTER
                                                    </span>
                                                    <span className="text-[8px] font-mono text-white/50 tracking-widest">38 CM/S</span>
                                                </div>
                                                <span className="text-[9px] font-mono font-semibold text-white/80">{mix.songs.length} TRACKS</span>
                                            </div>

                                            {/* Center Window with Spool Cutouts */}
                                            <div className="flex items-center justify-between px-2 py-1 my-1 bg-black/40 rounded-lg border border-white/5 relative">
                                                <div className="size-6 rounded-full border border-white/30 flex items-center justify-center bg-white/5">
                                                    <div className="size-2 rounded-full border border-white/50" />
                                                </div>
                                                <div className="h-1 flex-1 mx-3 bg-[#422919] rounded-full opacity-70" />
                                                <div className="size-6 rounded-full border border-white/30 flex items-center justify-center bg-white/5">
                                                    <div className="size-2 rounded-full border border-white/50" />
                                                </div>
                                            </div>

                                            {/* Tape Label */}
                                            <div className={clsx("rounded px-2.5 py-1 z-10 shadow-xs flex items-center justify-between", palette.labelBg)}>
                                                <p className={clsx("text-[11px] font-mono font-bold tracking-tight truncate", palette.labelText)}>
                                                    {mix.title}
                                                </p>
                                                <span className="text-[7px] font-mono text-black/40 tracking-wider uppercase shrink-0 ml-2">STUDIO A</span>
                                            </div>

                                            {isInsidePlayer && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs z-20">
                                                    <span className="text-[9px] font-mono font-bold text-white tracking-[0.2em] uppercase px-3 py-1 rounded bg-[#2d8652]/80">
                                                        LOADED IN BAY
                                                    </span>
                                                </div>
                                            )}

                                            {/* Hover Actions */}
                                            {!isInsidePlayer && !isDragging && (
                                                <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity z-20">
                                                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="p-1.5 bg-white text-black rounded-full hover:scale-110 shadow" title="Edit"><Pencil size={11} /></button>
                                                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="p-1.5 bg-white text-black rounded-full hover:scale-110 shadow" title="Snapshot"><Camera size={11} /></button>
                                                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="p-1.5 bg-white text-black rounded-full hover:scale-110 shadow" title="Share"><Share2 size={11} /></button>
                                                    <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="p-1.5 bg-white text-black rounded-full hover:scale-110 shadow" title="Add Tracks"><Plus size={11} /></button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Center: Open-Deck Master Reel Tape Mechanism */}
                <div className="col-span-6 flex flex-col items-center justify-center min-h-0 relative">
                    <motion.div
                        ref={playerRef}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum={true}
                        dragElastic={0.1}
                        className="w-full max-w-[540px] cursor-grab active:cursor-grabbing"
                    >
                        <div className={clsx(
                            "bg-gradient-to-b from-[#faf9f7] via-[#f2f0eb] to-[#e4e1d9] rounded-2xl p-5 border border-[#cfcbbe] shadow-[0_30px_70px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.1)] flex flex-col transition-all duration-300 relative",
                            isOverPlayer && "ring-4 ring-[#2d8652]/40 scale-[1.01]",
                            isPlaying && "shadow-[0_30px_80px_rgba(45,134,82,0.22)]"
                        )}>
                            {/* Precision Torx Screws */}
                            <div className="absolute top-3 left-3 size-2.5 rounded-full border border-[#b8b4a7] bg-[#e8e6de] flex items-center justify-center opacity-60"><div className="w-1.5 h-[0.5px] bg-[#666]" /></div>
                            <div className="absolute top-3 right-3 size-2.5 rounded-full border border-[#b8b4a7] bg-[#e8e6de] flex items-center justify-center opacity-60"><div className="w-1.5 h-[0.5px] -rotate-45 bg-[#666]" /></div>
                            <div className="absolute bottom-3 left-3 size-2.5 rounded-full border border-[#b8b4a7] bg-[#e8e6de] flex items-center justify-center opacity-60"><div className="w-1.5 h-[0.5px] rotate-30 bg-[#666]" /></div>
                            <div className="absolute bottom-3 right-3 size-2.5 rounded-full border border-[#b8b4a7] bg-[#e8e6de] flex items-center justify-center opacity-60"><div className="w-1.5 h-[0.5px] -rotate-60 bg-[#666]" /></div>

                            {/* Deck Top Inscription */}
                            <div className="flex items-center justify-between mb-3 px-2">
                                <div className="flex items-center gap-2">
                                    <div className={clsx("size-2 rounded-full", isPlaying ? "bg-[#2d8652] shadow-[0_0_8px_rgba(45,134,82,0.8)]" : "bg-[#9da49e]")} />
                                    <span className="font-mono text-[9px] font-bold tracking-[0.25em] text-[#3c463f] uppercase">
                                        STUDER-REVOX B-77 // DIRECT DRIVE MASTER DECK
                                    </span>
                                </div>
                                <span className="font-mono text-[8px] font-semibold text-[#7a857d] tracking-widest uppercase">
                                    NAB EQUALIZATION
                                </span>
                            </div>

                            {/* Open Reel Spool Chamber */}
                            <div className="w-full aspect-[1.8/1] rounded-xl bg-gradient-to-b from-[#181d1a] to-[#0f1210] p-4 border border-[#2b332d] shadow-[inset_0_8px_24px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col justify-between">
                                {/* Ambient Warm Halogen Indicator Glow */}
                                <div className={clsx(
                                    "absolute inset-0 pointer-events-none transition-opacity duration-700",
                                    isPlaying ? "opacity-100" : "opacity-30",
                                    "bg-[radial-gradient(ellipse_at_50%_0%,rgba(45,134,82,0.18)_0%,transparent_70%)]"
                                )} />

                                {/* Tension Arms and Capstan Assembly at Top */}
                                <div className="flex justify-between items-center z-10 px-6 pt-1">
                                    {/* Left Tension Roller */}
                                    <div className="flex items-center gap-1.5">
                                        <div className="size-4 rounded-full border-2 border-[#8e9891] bg-[#434b45] shadow-xs flex items-center justify-center">
                                            <div className="size-1 rounded-full bg-white/70" />
                                        </div>
                                        <span className="font-mono text-[6px] text-white/40 tracking-widest uppercase">TENSION L</span>
                                    </div>

                                    {/* Center Magnetic Head Assembly */}
                                    <div className="flex items-center gap-2 bg-[#252c27] px-3 py-1 rounded-md border border-white/10 shadow-inner">
                                        <div className="flex items-center gap-1">
                                            <span className="size-1.5 rounded-full bg-amber-500/80" />
                                            <span className="font-mono text-[7px] text-white/70 tracking-wider">ERASE</span>
                                        </div>
                                        <div className="h-2 w-px bg-white/20" />
                                        <div className="flex items-center gap-1">
                                            <span className="size-1.5 rounded-full bg-emerald-400" />
                                            <span className="font-mono text-[7px] text-white font-bold tracking-wider">REC/PLAY</span>
                                        </div>
                                        <div className="h-2 w-px bg-white/20" />
                                        <div className="flex items-center gap-1">
                                            <span className="size-1.5 rounded-full bg-sky-400" />
                                            <span className="font-mono text-[7px] text-white/70 tracking-wider">MONITOR</span>
                                        </div>
                                    </div>

                                    {/* Right Capstan & Pinch Roller */}
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-mono text-[6px] text-white/40 tracking-widest uppercase">CAPSTAN R</span>
                                        <div className="size-4 rounded-full border-2 border-[#8e9891] bg-[#434b45] shadow-xs flex items-center justify-center">
                                            <div className="size-1.5 rounded-full bg-amber-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Exposed Open Reels Mechanism */}
                                <div className="flex items-center justify-between px-10 my-auto relative z-10">
                                    {/* Left Feed Reel */}
                                    <div className="relative flex items-center justify-center">
                                        {/* Physical Dynamic Oxide Tape Pack */}
                                        <div
                                            className="rounded-full absolute transition-all duration-300"
                                            style={{
                                                width: `${leftTapeRadius * 2.2}px`,
                                                height: `${leftTapeRadius * 2.2}px`,
                                                background: "radial-gradient(circle, #3d291a 20%, #20150d 85%)",
                                                boxShadow: "0 0 10px rgba(0,0,0,0.9)"
                                            }}
                                        />
                                        {/* Perforated Open Reel Aluminum Spool */}
                                        <motion.div
                                            animate={isPlaying ? { rotate: 360 } : {}}
                                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                            className="size-24 rounded-full border-2 border-[#b0b8b2] bg-gradient-to-tr from-[#3b443e] to-[#252b27] flex items-center justify-center relative shadow-lg"
                                        >
                                            {/* Precision Trident Cutouts */}
                                            <div className="absolute inset-2 rounded-full border border-dashed border-white/20 pointer-events-none" />
                                            <div className="absolute w-2 h-full bg-[#181d1a] opacity-80" />
                                            <div className="absolute w-2 h-full bg-[#181d1a] opacity-80 rotate-60" />
                                            <div className="absolute w-2 h-full bg-[#181d1a] opacity-80 -rotate-60" />
                                            {/* Center Hub CNC Disc */}
                                            <div className="size-8 rounded-full border-2 border-white/60 bg-[#1c221e] flex items-center justify-center z-10 shadow-inner">
                                                <div className="size-2.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-600 shadow-xs" />
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Center Tape Path & Bridge Line */}
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-28 h-0.5 bg-[#422c1d] opacity-90 shadow-[0_0_4px_rgba(0,0,0,0.8)]" />
                                        <span className="font-mono text-[8px] text-white/50 tracking-[0.2em] mt-2 uppercase">
                                            {isLoaded ? (activeMix?.title || "MASTER TAPE") : "BAY EMPTY"}
                                        </span>
                                    </div>

                                    {/* Right Take-Up Reel */}
                                    <div className="relative flex items-center justify-center">
                                        {/* Physical Dynamic Oxide Tape Pack */}
                                        <div
                                            className="rounded-full absolute transition-all duration-300"
                                            style={{
                                                width: `${rightTapeRadius * 2.2}px`,
                                                height: `${rightTapeRadius * 2.2}px`,
                                                background: "radial-gradient(circle, #3d291a 20%, #20150d 85%)",
                                                boxShadow: "0 0 10px rgba(0,0,0,0.9)"
                                            }}
                                        />
                                        {/* Perforated Open Reel Aluminum Spool */}
                                        <motion.div
                                            animate={isPlaying ? { rotate: 360 } : {}}
                                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                                            className="size-24 rounded-full border-2 border-[#b0b8b2] bg-gradient-to-tr from-[#3b443e] to-[#252b27] flex items-center justify-center relative shadow-lg"
                                        >
                                            {/* Precision Trident Cutouts */}
                                            <div className="absolute inset-2 rounded-full border border-dashed border-white/20 pointer-events-none" />
                                            <div className="absolute w-2 h-full bg-[#181d1a] opacity-80" />
                                            <div className="absolute w-2 h-full bg-[#181d1a] opacity-80 rotate-60" />
                                            <div className="absolute w-2 h-full bg-[#181d1a] opacity-80 -rotate-60" />
                                            {/* Center Hub CNC Disc */}
                                            <div className="size-8 rounded-full border-2 border-white/60 bg-[#1c221e] flex items-center justify-center z-10 shadow-inner">
                                                <div className="size-2.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-600 shadow-xs" />
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Bottom Track Readout */}
                                <div className="flex items-center justify-between px-2 pt-2 border-t border-white/10 z-10">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[9px] text-[#2d8652] font-bold">▶</span>
                                        <p className="font-mono text-[10px] text-white/90 truncate max-w-[260px]">
                                            {isLoaded && currentSong ? decodeHtml(currentSong.name) : "AWAITING REEL INJECTION"}
                                        </p>
                                    </div>
                                    <span className="font-mono text-[9px] text-white/40 tracking-wider">
                                        {formatTime(safeProgress * safeDuration)} / {formatTime(safeDuration)}
                                    </span>
                                </div>
                            </div>

                            {/* Precision Linear Tape Transport Slider */}
                            <div className="my-3 px-1">
                                <div
                                    className="h-2 rounded-full bg-[#dcd8ce] border border-[#beb9ab] relative overflow-hidden cursor-pointer p-0.5"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        if (!isLoaded) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div
                                        className="h-full rounded-full bg-[#2d8652] shadow-[0_0_6px_rgba(45,134,82,0.6)] transition-all"
                                        style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Heavy Studio Mechanical Transport Controls */}
                            <div className="flex items-center justify-between pt-2 border-t border-[#d8d4c9]">
                                <div className="flex items-center gap-3">
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => { playClick(); setShuffle(!shuffle); }}
                                        className={clsx(
                                            "size-9 rounded-lg border flex items-center justify-center transition-all",
                                            shuffle
                                                ? "bg-[#2d8652] text-white border-[#2d8652] shadow-sm"
                                                : "bg-[#e8e6de] text-[#4b554e] border-[#cdc9be] hover:bg-[#dfdcd3]"
                                        )}
                                        title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                                    >
                                        <Shuffle size={14} />
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => { playClick(); prev(); }}
                                        disabled={!isLoaded}
                                        className={clsx(
                                            "size-10 rounded-xl border flex items-center justify-center transition-all active:translate-y-0.5 shadow-sm",
                                            isLoaded
                                                ? "bg-[#e8e6de] text-[#242b26] border-[#cdc9be] hover:bg-[#dedbd1]"
                                                : "bg-[#dedbd1] text-[#9ba39d] border-[#dedbd1] opacity-50 cursor-not-allowed"
                                        )}
                                        title="Previous Track"
                                    >
                                        <SkipBack size={16} className="fill-current" />
                                    </button>

                                    {/* Big Master Solenoid Play Button */}
                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => { playClick(); togglePlay(); }}
                                        className="size-13 rounded-2xl bg-gradient-to-b from-[#349b60] to-[#236e43] text-white border border-[#1f623b] shadow-[0_6px_16px_rgba(45,134,82,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] flex items-center justify-center hover:brightness-105 active:scale-95 transition-all"
                                        title={isPlaying ? "Pause" : "Play"}
                                    >
                                        {isPlaying ? <Pause size={22} className="fill-current" /> : <Play size={22} className="fill-current pl-0.5" />}
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => { playClick(); next(); }}
                                        disabled={!isLoaded}
                                        className={clsx(
                                            "size-10 rounded-xl border flex items-center justify-center transition-all active:translate-y-0.5 shadow-sm",
                                            isLoaded
                                                ? "bg-[#e8e6de] text-[#242b26] border-[#cdc9be] hover:bg-[#dedbd1]"
                                                : "bg-[#dedbd1] text-[#9ba39d] border-[#dedbd1] opacity-50 cursor-not-allowed"
                                        )}
                                        title="Next Track"
                                    >
                                        <SkipForward size={16} className="fill-current" />
                                    </button>

                                    <button
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                                        className={clsx(
                                            "size-9 rounded-lg border flex items-center justify-center transition-all relative",
                                            repeat !== 'off'
                                                ? "bg-[#2d8652] text-white border-[#2d8652] shadow-sm"
                                                : "bg-[#e8e6de] text-[#4b554e] border-[#cdc9be] hover:bg-[#dfdcd3]"
                                        )}
                                        title={`Repeat: ${repeat.toUpperCase()}`}
                                    >
                                        <Repeat size={14} />
                                        {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-[#2d8652] text-white px-1 rounded-full">1</span>}
                                    </button>
                                </div>

                                {/* Master Volume Rotary Potentiometer Slider */}
                                <div className="flex items-center gap-2.5 ml-4">
                                    <span className="font-mono text-[9px] font-bold text-[#555f58] tracking-widest uppercase">GAIN</span>
                                    <div className="relative h-2 w-20 bg-[#dcd8ce] border border-[#beb9ab] rounded-full overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
                                        <div className="absolute inset-y-0 left-0 bg-[#2d8652] rounded-full" style={{ width: `${volume * 100}%` }} />
                                        <input
                                            type="range" min="0" max="1" step="0.05" value={volume}
                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                            title={`Gain: ${Math.round(volume * 100)}%`}
                                        />
                                    </div>
                                    <span className="font-mono text-[9px] font-bold text-[#353e37] min-w-[28px]">{Math.round(volume * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Eject / Tape Status Footnote */}
                    {isLoaded && (
                        <button
                            onClick={() => { playEject(); loadMix(""); }}
                            className="mt-3 flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest text-[#59635b] hover:text-[#2d8652] uppercase px-3 py-1 rounded bg-[#dedbd1]/60 hover:bg-[#dedbd1] transition-all"
                        >
                            <LogOut size={12} /> EJECT MASTER REEL
                        </button>
                    )}
                </div>

                {/* Right: Studio VU Meter & Telemetry Console */}
                <div className="col-span-3 flex flex-col justify-between min-h-0 bg-[#f4f2ec] rounded-2xl p-5 border border-[#d6d2c4] shadow-md">
                    <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#dedbd1]">
                            <div className="flex items-center gap-2">
                                <Activity size={14} className="text-[#2d8652]" />
                                <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#242b26] uppercase">Telemetry</span>
                            </div>
                            <span className="font-mono text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#2d8652]/10 text-[#2d8652]">
                                {isLoaded ? (isPlaying ? "RUNNING" : "STANDBY") : "OFFLINE"}
                            </span>
                        </div>

                        {/* Analog Studio VU Meter */}
                        <div className="mt-4 p-3 bg-[#161a18] rounded-xl border border-[#2b332d] shadow-inner">
                            <div className="flex justify-between items-center text-[8px] font-mono text-white/50 mb-1">
                                <span>-20</span>
                                <span>-10</span>
                                <span>-5</span>
                                <span>0</span>
                                <span className="text-red-400 font-bold">+3dB</span>
                            </div>
                            {/* Dual Needle Level Bars */}
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[8px] text-white/60 w-3">CH1</span>
                                    <div className="h-1.5 flex-1 bg-black/60 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-full transition-all duration-100"
                                            style={{ width: isPlaying ? `${Math.min(100, Math.max(15, (volume * 85) + (Math.sin(safeProgress * 50) * 15)))}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-[8px] text-white/60 w-3">CH2</span>
                                    <div className="h-1.5 flex-1 bg-black/60 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 rounded-full transition-all duration-100"
                                            style={{ width: isPlaying ? `${Math.min(100, Math.max(10, (volume * 80) + (Math.cos(safeProgress * 45) * 18)))}%` : '0%' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Current Reel Specifications */}
                        <div className="mt-4 space-y-2.5">
                            <div>
                                <span className="font-mono text-[8px] tracking-widest text-[#727c75] uppercase">NOW MOUNTED</span>
                                <p className="font-mono font-bold text-xs text-[#1e2521] truncate mt-0.5">
                                    {activeMix ? activeMix.title : "NO TAPE IN SLED"}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#dedbd1]">
                                <div>
                                    <span className="font-mono text-[8px] tracking-widest text-[#727c75] uppercase">SPEED</span>
                                    <p className="font-mono text-[11px] font-bold text-[#1e2521]">15.0 IPS</p>
                                </div>
                                <div>
                                    <span className="font-mono text-[8px] tracking-widest text-[#727c75] uppercase">FORMAT</span>
                                    <p className="font-mono text-[11px] font-bold text-[#1e2521]">2-TRACK STEREO</p>
                                </div>
                                <div>
                                    <span className="font-mono text-[8px] tracking-widest text-[#727c75] uppercase">CALIBRATION</span>
                                    <p className="font-mono text-[11px] font-bold text-[#2d8652]">320 nWb/m</p>
                                </div>
                                <div>
                                    <span className="font-mono text-[8px] tracking-widest text-[#727c75] uppercase">QUALITY</span>
                                    <div className="mt-0.5">{activeQuality ? <QualityBadge quality={activeQuality} variant="mini" /> : <span className="font-mono text-[10px] text-[#727c75]">STUDIO</span>}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Embedded Spectrum Visualizer */}
                    <div className="mt-4 pt-3 border-t border-[#dedbd1]">
                        <span className="font-mono text-[8px] tracking-widest text-[#727c75] uppercase block mb-1.5">REAL-TIME FLUX DENSITY</span>
                        <div className="h-10 w-full bg-[#1b201d] rounded-lg p-1.5 border border-[#2b332d] overflow-hidden">
                            <Visualizer isPlaying={isPlaying} accentColor="#2d8652" className="w-full h-full opacity-80" />
                        </div>
                    </div>
                </div>
            </main>

            {/* FLOATING DRAG GHOST */}
            {draggingMix && (
                <div
                    ref={ghostRef}
                    className="fixed pointer-events-none top-0 left-0 z-[99999]"
                    style={{
                        transform: dragPosition
                            ? `translate(${dragPosition.x - 90}px, ${dragPosition.y - 55}px) rotate(4deg) scale(1.05)`
                            : 'none'
                    }}
                >
                    {(() => {
                        const palette = getStyleForMix(draggingMix.index);
                        return (
                            <div className={clsx("w-56 h-28 rounded-xl p-3 flex flex-col justify-between shadow-2xl border", `bg-gradient-to-br ${palette.shell} ${palette.rim}`)}>
                                <div className="flex items-center justify-between">
                                    <span className={clsx("text-[8px] font-mono font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider", palette.badge)}>
                                        1/4 INCH MASTER
                                    </span>
                                    <span className="text-[8px] font-mono text-white/50 tracking-widest">DRAGGING</span>
                                </div>
                                <div className={clsx("rounded px-2.5 py-1 shadow-xs", palette.labelBg)}>
                                    <p className={clsx("text-[11px] font-mono font-bold tracking-tight truncate", palette.labelText)}>
                                        {draggingMix.mix.title}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Overlays */}
            <div className="relative z-[10000]">
                <AnimatePresence>
                    {showLyrics && (
                        <LyricsView
                            currentSong={currentSong}
                            currentTime={progress * duration}
                            onClose={() => setShowLyrics(false)}
                        />
                    )}
                    {showEq && (
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
                    )}
                </AnimatePresence>
            </div>

            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div>
    );
}
