"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { isPlayableTrack } from "@/lib/types";
import { motion, useMotionValue, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
    Palette, Settings, Plus, Tv, Pencil, Camera, Search, Share2, LogOut
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { getThumbnailUrl } from "@/lib/jiosaavn";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal, ListMusic } from "lucide-react";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useAudioProgress } from "@/hooks/use-audio-progress";


interface BoomboxStageProps {
    currentTheme: ThemeKey;
    onThemeChange: () => void;
    onSelectTheme?: (theme: ThemeKey) => void;
    // onSwitchToMobile prop removed
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

// Draggable Polaroid component that manages its own position
export interface Position { x: number; y: number; rotation: number; }

// Draggable Polaroid component that manages its own position
function DraggablePolaroid({
    mix,
    position,
    isInsidePlayer,
    albumArt,
    playerRef,
    onDropOnPlayer,
    onHoverPlayer,
    onEditMix,
    onSnapshotMix,
    onOpenSearch,
    onShareMix,
    onPositionChange
}: {
    mix: Mix;
    position: Position;
    isInsidePlayer: boolean;
    albumArt: string | null;
    playerRef: React.RefObject<HTMLDivElement | null>;
    onDropOnPlayer: (mix: Mix) => void;
    onHoverPlayer: (isOver: boolean) => void;
    onEditMix?: (mix: Mix) => void;
    onSnapshotMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    onShareMix?: (mix: Mix) => void;
    onPositionChange: (id: string, newPos: { x: number, y: number }) => void;
}) {
    const x = useMotionValue(position.x);
    const y = useMotionValue(position.y);
    const [showButtons, setShowButtons] = useState(false);
    const [isFailed, setIsFailed] = useState(false);

    // Cache rect to avoid thrashing
    const playerRectRef = useRef<DOMRect | null>(null);

    // Sync MotionValues if parent updates (e.g. reload)
    useEffect(() => {
        x.set(position.x);
        y.set(position.y);
    }, [position.x, position.y, x, y]);

    const handleDragStart = () => {
        if (playerRef.current) {
            playerRectRef.current = playerRef.current.getBoundingClientRect();
        }
    };

    const handleDrag = (_: any, info: any) => {
        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            const isOver = info.point.x >= rect.left && info.point.x <= rect.right &&
                info.point.y >= rect.top && info.point.y <= rect.bottom;
            onHoverPlayer(isOver);
        }
    };

    const handleDragEnd = (_: any, info: any) => {
        let droppedOnPlayer = false;
        if (playerRectRef.current) {
            const rect = playerRectRef.current;
            if (info.point.x >= rect.left && info.point.x <= rect.right &&
                info.point.y >= rect.top && info.point.y <= rect.bottom) {
                onDropOnPlayer(mix);
                droppedOnPlayer = true;
            }
        }
        onHoverPlayer(false);
        playerRectRef.current = null; // Clear cache

        if (!droppedOnPlayer) {
            setIsFailed(true);
            setTimeout(() => {
                setIsFailed(false);
            }, 500);
        }

        // Persist new position
        onPositionChange(mix.id, { x: x.get(), y: y.get() });
    };

    return (
        <motion.div
            drag={!isInsidePlayer}
            dragMomentum={false} // Disable momentum for precise drops
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onMouseEnter={() => setShowButtons(true)}
            onMouseLeave={() => setShowButtons(false)}
            style={{ x, y, rotate: position.rotation }}
            animate={isFailed ? {
                x: [x.get(), x.get() - 8, x.get() + 8, x.get() - 8, x.get() + 8, x.get() - 4, x.get() + 4, x.get()]
            } : undefined}
            transition={isFailed ? { duration: 0.4 } : undefined}
            className={clsx(
                "absolute top-0 left-0 cursor-grab active:cursor-grabbing select-none z-20",
                isInsidePlayer && "opacity-50 cursor-default" // Stuck in player
            )}
            whileDrag={{ scale: 1.1, zIndex: 100, rotate: 0 }}
            whileHover={{ scale: 1.05, zIndex: 50 }}
        >
            {!isInsidePlayer && (
                <div className={clsx("p-2 pb-6 shadow-lg transition-all duration-300 border",
                    isFailed 
                        ? "bg-red-50 border-red-500 ring-4 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.8)]" 
                        : "bg-white border-transparent"
                )}>
                    <div className="w-24 h-24 relative overflow-hidden">
                        {albumArt ? (
                            <img
                                src={albumArt}
                                alt={mix.title}
                                className="w-full h-full object-cover filter sepia-[0.2] contrast-[1.1]"
                                draggable={false}
                            />
                        ) : (
                            <div className="bg-neutral-800 w-full h-full flex items-center justify-center">
                                <div className="flex gap-4">
                                    <div className="w-4 h-4 rounded-full bg-white/20" />
                                    <div className="w-4 h-4 rounded-full bg-white/20" />
                                </div>
                            </div>
                        )}
                        {showButtons && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-1">
                                {/* Stop Propagation on pointer events to prevent drag start */}
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Edit Mix"><Pencil size={12} className="text-gray-700" /></button>
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Snapshot"><Camera size={12} className="text-gray-700" /></button>
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Share"><Share2 size={12} className="text-gray-700" /></button>
                                <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center hover:bg-white" title="Add Songs"><Search size={12} className="text-gray-700" /></button>
                            </div>
                        )}
                    </div>
                    <p className="text-gray-800 text-[9px] font-bold text-center mt-1 truncate max-w-[96px]" style={{ fontFamily: "'Permanent Marker', cursive" }}>
                        {mix.title}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

// Generate single random position
const generatePosition = (index: number): Position => {
    const side = index % 4;
    let x, y;
    if (side === 0) { x = 40 + Math.random() * 150; y = 120 + Math.random() * 200; }
    else if (side === 1) { x = 40 + Math.random() * 180; y = 400 + Math.random() * 120; }
    else if (side === 2) { x = 680 + Math.random() * 200; y = 100 + Math.random() * 180; }
    else { x = 650 + Math.random() * 250; y = 400 + Math.random() * 120; }
    return { x, y, rotation: -12 + Math.random() * 24 };
};

export function BoomboxStage({
    currentTheme, onThemeChange, onSelectTheme, onOpenSettings,
    onEditMix, onOpenSearch, onCreateMix, onCinemaMode, onOpenThemeSelector, onSnapshotMix, onShowQueue, onShareMix
}: BoomboxStageProps) {
    const playerRef = useRef<HTMLDivElement>(null!); // Corrected type safety
    const [isOverPlayer, setIsOverPlayer] = useState(false);

    // State Refactor: Record<mixId, Position>
    const [positions, setPositions] = useState<Record<string, Position>>({});

    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);

    const { activeMixId, isPlaying, currentSong, volume, duration, loadMix, togglePlay, next, prev, setVolume, isLoaded, seek, shuffle, setShuffle, repeat, setRepeat, eq, activeQuality, play, unlockAudio } = usePlayback();
    const { mixes } = useLibrary();
    const { progress } = useAudioProgress();

    const { playClick, playInsert } = useAudio();

    // Memoized active mix check
    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    // Robust Initialization & Sync
    useEffect(() => {
        setPositions(prev => {
            const nextState = { ...prev };
            let hasChanges = false;

            mixes.forEach((mix, index) => {
                if (!nextState[mix.id]) {
                    nextState[mix.id] = generatePosition(index);
                    hasChanges = true;
                }
            });

            return hasChanges ? nextState : prev;
        });
    }, [mixes]); // Runs when mixes change (add/remove)

    const updatePosition = (id: string, newPos: { x: number, y: number }) => {
        setPositions(prev => ({
            ...prev,
            [id]: { ...prev[id], ...newPos }
        }));
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getMixImage = (mix: Mix): string | null => {
        if (mix.songs.length > 0) {
            const item = mix.songs[0];
            const song = isPlayableTrack(item) ? item.song : item;
            if (song) return getThumbnailUrl(song);
        }
        return null;
    };

    const handleDropOnPlayer = (mix: Mix) => {
        playInsert();
        unlockAudio();
        loadMix(mix.id);
        setTimeout(() => play(), 800);
        setIsOverPlayer(false); // Reset hover
    };

    // Exclusive Overlay Toggles
    const toggleLyrics = () => {
        if (!showLyrics) setShowEq(false); // Close others
        setShowLyrics(!showLyrics);
    };

    const toggleEq = () => {
        if (!showEq) setShowLyrics(false); // Close others
        setShowEq(!showEq);
    };

    // Safe Progress
    const safeProgress = Math.min(Math.max(progress || 0, 0), 1);
    const displayedTime = formatTime(Math.min(safeProgress * duration, duration));

    return (
        <div
            className="w-full h-screen overflow-hidden relative"
            style={{
                fontFamily: "'Space Grotesk', sans-serif",
                backgroundColor: '#3e2f24',
                backgroundImage: 'radial-gradient(#4a3b32 15%, transparent 16%), radial-gradient(#36281e 15%, transparent 16%)',
                backgroundSize: '60px 60px',
                backgroundPosition: '0 0, 30px 30px'
            }}
        >
            <style jsx global>{`::-webkit-scrollbar { display: none; } * { -ms-overflow-style: none; scrollbar-width: none; }`}</style>

            {/* Header */}
            <header className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-30">
                <div className="transform -rotate-2 bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 py-2 shadow-lg border-2 border-white/20"
                    style={{ clipPath: 'polygon(5% 0%, 100% 0%, 100% 85%, 95% 100%, 0% 100%, 0% 15%)' }}>
                    <div className="flex items-center gap-2">
                        <span className="text-yellow-300 text-2xl">📻</span>
                        <h1 className="font-black tracking-tighter text-xl italic uppercase">Melora Tunes</h1>
                    </div>
                </div>
                <nav className="hidden md:flex gap-4 items-center">
                    <button onClick={onCinemaMode} className="bg-white/30 backdrop-blur-sm px-5 py-1 text-white font-bold text-sm transform -rotate-1 shadow hover:-translate-y-1 transition-transform">
                        <Camera size={14} className="inline mr-1" /> Photo Mode
                    </button>
                    <button onClick={() => setIsRackOpen(true)} className="bg-white/30 backdrop-blur-sm px-5 py-1 text-white font-bold text-sm transform rotate-1 shadow hover:-translate-y-1 transition-transform border border-white/20">
                        <ListMusic size={14} className="inline mr-1" /> Rack
                    </button>
                    <button onClick={() => onOpenSearch?.('')} className="bg-white/30 backdrop-blur-sm px-5 py-1 text-white font-bold text-sm transform -rotate-1 shadow hover:-translate-y-1 transition-transform">
                        <Search size={14} className="inline mr-1" /> Search
                    </button>
                    <button onClick={onCreateMix} className="bg-white/30 backdrop-blur-sm px-5 py-1 text-white font-bold text-sm transform rotate-1 shadow hover:-translate-y-1 transition-transform">
                        <Plus size={14} className="inline mr-1" /> New Tape
                    </button>
                    {/* Slot Indicator */}
                    <span className="bg-black/30 backdrop-blur-sm px-3 py-1 text-white/80 text-xs font-bold rounded transform rotate-1">
                        {mixes.filter(m => m.pinned).length}/8 Pinned
                    </span>
                </nav>
                <div className="flex gap-2">
                    <button onClick={onOpenThemeSelector} className="bg-neutral-800 border-2 border-neutral-600 rounded-full p-2 hover:border-yellow-400 transition-colors shadow-lg"><Palette size={18} className="text-white" /></button>
                    <button onClick={onOpenSettings} className="bg-neutral-800 border-2 border-neutral-600 rounded-full p-2 hover:border-yellow-400 transition-colors shadow-lg"><Settings size={18} className="text-white" /></button>
                </div>
            </header>

            {/* Sticky Note */}
            <div className="absolute top-20 left-6 z-20 bg-[#fef08a] text-neutral-900 p-4 shadow-[0_8px_20px_rgba(0,0,0,0.35),0_2px_4px_rgba(0,0,0,0.2)] transform rotate-1 max-w-[190px] rounded-sm border-t border-white/60" style={{ fontFamily: "'Permanent Marker', cursive" }}>
                {/* 3D Pushpin with shadow */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-tr from-red-700 via-red-500 to-red-300 shadow-[0_4px_8px_rgba(0,0,0,0.5)] border border-red-800 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                </div>
                <p className="text-sm leading-tight drop-shadow-sm">Drag tapes anywhere! Drop on boombox to play 🎵</p>
            </div>

            {/* BOOMBOX */}
            <div ref={playerRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full max-w-[550px] px-4 select-none">
                {/* Heavy Molded Carry Handle */}
                <div className="absolute -top-11 left-1/2 -translate-x-1/2 w-[55%] h-16 border-[14px] border-neutral-800 rounded-t-[32px] -z-10 shadow-[0_8px_20px_rgba(0,0,0,0.7)] flex items-center justify-center">
                    {/* Ribbed Center Hand-Grip */}
                    <div className="w-32 h-3.5 bg-neutral-900 rounded-full border border-neutral-700 shadow-inner flex items-center justify-around px-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="w-1.5 h-full bg-neutral-950 rounded-sm" />
                        ))}
                    </div>
                    {/* Left Pivot Hinge Bolt */}
                    <div className="absolute -left-3.5 bottom-0 w-4 h-4 rounded-full bg-gradient-to-tr from-neutral-600 via-neutral-400 to-neutral-200 border border-neutral-700 shadow-md flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    </div>
                    {/* Right Pivot Hinge Bolt */}
                    <div className="absolute -right-3.5 bottom-0 w-4 h-4 rounded-full bg-gradient-to-tr from-neutral-600 via-neutral-400 to-neutral-200 border border-neutral-700 shadow-md flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                    </div>
                </div>

                <div className={clsx(
                    "bg-[#f59e0b] w-full rounded-[34px] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.85),0_6px_12px_rgba(0,0,0,0.6)] border-b-[10px] border-r-[8px] border-black/30 transition-all duration-200",
                    isOverPlayer && "ring-4 ring-blue-500/70 scale-[1.02]"
                )}>
                    {/* Inner Molded Chassis */}
                    <div className="bg-[#fbbf24] border-[10px] border-neutral-800 rounded-[26px] p-4 flex flex-col gap-3 relative overflow-hidden shadow-inner">
                        {/* 4 Heavy-Duty Countersunk Hex Corner Bolts */}
                        {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
                            <div key={i} className={`absolute ${pos} w-3.5 h-3.5 bg-gradient-to-tr from-neutral-500 via-neutral-300 to-neutral-200 rounded-full flex items-center justify-center shadow-inner border border-neutral-600`}>
                                <div className="w-1.5 h-1.5 bg-neutral-900 rounded-sm rotate-45" />
                            </div>
                        ))}

                        {/* Speaker Grilles & Center Deck Section */}
                        <div className="flex gap-3 items-center">
                            {/* Left High-Output Speaker Grille */}
                            <div className="hidden md:flex w-24 h-24 rounded-full border-[6px] border-neutral-800 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_4px_8px_rgba(0,0,0,0.5)] bg-neutral-950 relative overflow-hidden shrink-0 items-center justify-center">
                                {/* Woofer Cone with Bass Pulsing Vibration */}
                                <motion.div
                                    animate={isPlaying ? { scale: [1, 1.03, 0.98, 1.025, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 0.55, ease: "easeInOut" }}
                                    className="w-18 h-18 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 border-2 border-neutral-800 flex items-center justify-center shadow-inner"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-neutral-700 via-neutral-500 to-neutral-300 border border-neutral-600 shadow-md" />
                                </motion.div>
                                <div className="absolute inset-0 opacity-75 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 35%, transparent 36%)', backgroundSize: '4px 4px' }} />
                                <div className="absolute inset-0 rounded-full border border-neutral-700/60 pointer-events-none" />
                            </div>

                            {/* Center Deck Chamber */}
                            <div className="flex-1 bg-neutral-900 p-2.5 rounded-xl border-4 border-neutral-800 shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)] flex flex-col gap-2">
                                {/* LCD Multi-Function Segment Display */}
                                <div className="relative h-14 rounded-md border-2 border-neutral-700 shadow-[inset_0_2px_8px_rgba(0,0,0,0.85)] overflow-hidden" style={{ background: '#9ea792' }}>
                                    <div className="absolute inset-0 pointer-events-none opacity-20" style={{
                                        background: 'linear-gradient(to bottom, rgba(0,0,0,0) 50%, rgba(0,0,0,0.2) 50%)',
                                        backgroundSize: '100% 3px'
                                    }} />
                                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                                    <div className="absolute inset-0 flex justify-between items-end p-2 text-neutral-900 select-none">
                                        <div className="flex flex-col">
                                            <span className="text-[7.5px] font-black uppercase opacity-70 tracking-widest">TRACK</span>
                                            <span className="text-xl font-bold font-mono leading-none drop-shadow-sm">
                                                {isLoaded ? String(mixes.findIndex(m => m.id === activeMixId) + 1).padStart(2, '0') : '--'}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-center flex-1 mx-2 min-w-0">
                                            <span className="text-[10px] font-mono font-bold uppercase truncate max-w-[170px] drop-shadow-sm">
                                                {isLoaded ? (currentSong ? decodeHtml(currentSong.name) : activeMix?.title) : 'INSERT TAPE'}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="text-[7px] font-mono font-bold px-1 rounded bg-black/10 border border-black/10">STEREO</span>
                                                {isLoaded && activeQuality && <QualityBadge quality={activeQuality} variant="mini" />}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[7.5px] font-black uppercase opacity-70 tracking-widest">TIME</span>
                                            <span className="text-base font-bold font-mono leading-none drop-shadow-sm">{displayedTime}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Smoked Transparent Cassette Well with Dynamic Reel Physics */}
                                <div className="bg-[#0b0c0f] rounded-lg border border-neutral-700/80 h-16 relative flex items-center justify-between px-6 overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.95)]">
                                    {/* Smoked glass reflection */}
                                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />
                                    {/* Printed tape run scale */}
                                    <div className="absolute inset-x-10 top-1 flex justify-between text-[6px] font-mono text-neutral-500 pointer-events-none">
                                        <span>MIN</span>
                                        <span>50</span>
                                        <span>MAX</span>
                                    </div>

                                    {isLoaded && activeMix ? (() => {
                                        const leftRadius = 6 + Math.sqrt(Math.max(0, 1 - safeProgress)) * 9;
                                        const rightRadius = 6 + Math.sqrt(Math.max(0, safeProgress)) * 9;

                                        return (
                                            <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full flex items-center justify-between z-10">
                                                {/* Left Spool */}
                                                <div className="relative flex items-center justify-center">
                                                    <div
                                                        className="rounded-full bg-[#291c14] border border-[#422e20] flex items-center justify-center transition-all duration-200"
                                                        style={{ width: `${leftRadius * 2}px`, height: `${leftRadius * 2}px` }}
                                                    >
                                                        <motion.div
                                                            animate={isPlaying ? { rotate: 360 } : {}}
                                                            transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
                                                            className="w-5 h-5 rounded-full bg-white/30 border border-white/40 shadow-inner flex items-center justify-center"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                                                        </motion.div>
                                                    </div>
                                                </div>

                                                {/* Center Tape Bridge & Run Indicator */}
                                                <div className="flex-grow h-3 mx-2 flex flex-col items-center justify-center">
                                                    <div className="w-full h-0.5 bg-[#422e20] mb-0.5" />
                                                    <span className="text-[6.5px] text-amber-300 font-mono font-bold">
                                                        {Math.round(safeProgress * 100)}%
                                                    </span>
                                                </div>

                                                {/* Right Spool */}
                                                <div className="relative flex items-center justify-center">
                                                    <div
                                                        className="rounded-full bg-[#291c14] border border-[#422e20] flex items-center justify-center transition-all duration-200"
                                                        style={{ width: `${rightRadius * 2}px`, height: `${rightRadius * 2}px` }}
                                                    >
                                                        <motion.div
                                                            animate={isPlaying ? { rotate: 360 } : {}}
                                                            transition={{ repeat: Infinity, duration: 2.8, ease: "linear" }}
                                                            className="w-5 h-5 rounded-full bg-white/30 border border-white/40 shadow-inner flex items-center justify-center"
                                                        >
                                                            <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                                                        </motion.div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })() : (
                                        <div className="w-full flex flex-col items-center justify-center">
                                            <span className="text-white/40 text-[10px] font-mono font-bold uppercase tracking-widest">NO CASSETTE</span>
                                            <span className="text-white/20 text-[7.5px] font-mono">DROP TAPE HERE</span>
                                        </div>
                                    )}

                                    {/* Electric Cyan LED Head Illumination Strip */}
                                    {isLoaded && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-20 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />}
                                </div>
                            </div>

                            {/* Right High-Output Speaker Grille */}
                            <div className="hidden md:flex w-24 h-24 rounded-full border-[6px] border-neutral-800 shadow-[inset_0_4px_12px_rgba(0,0,0,0.9),0_4px_8px_rgba(0,0,0,0.5)] bg-neutral-950 relative overflow-hidden shrink-0 items-center justify-center">
                                {/* Woofer Cone with Bass Pulsing Vibration */}
                                <motion.div
                                    animate={isPlaying ? { scale: [1, 1.03, 0.98, 1.025, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 0.55, ease: "easeInOut" }}
                                    className="w-18 h-18 rounded-full bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-700 border-2 border-neutral-800 flex items-center justify-center shadow-inner"
                                >
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-neutral-700 via-neutral-500 to-neutral-300 border border-neutral-600 shadow-md" />
                                </motion.div>
                                <div className="absolute inset-0 opacity-75 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 35%, transparent 36%)', backgroundSize: '4px 4px' }} />
                                <div className="absolute inset-0 rounded-full border border-neutral-700/60 pointer-events-none" />
                            </div>
                        </div>

                        {/* Lower Controls & Transport Section */}
                        <div className="bg-neutral-900 rounded-xl p-2.5 border border-neutral-800 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] flex flex-col gap-2.5">
                            {/* Tape Progress Track */}
                            <div
                                className="relative w-full h-4 flex items-center px-1 cursor-pointer overflow-hidden rounded-full bg-neutral-950 border border-neutral-800 shadow-inner"
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const p = (e.clientX - rect.left) / rect.width;
                                    seek(Math.min(Math.max(p, 0), 1));
                                }}
                            >
                                <div className="absolute w-full h-1.5 bg-neutral-950 rounded-full shadow-inner" />
                                <div className="absolute h-1.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full shadow-[0_0_6px_#3b82f6]" style={{ width: `${safeProgress * 100}%` }} />
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 w-2 h-3.5 bg-white rounded-sm shadow-md border border-neutral-400 pointer-events-none"
                                    style={{ left: `calc(${safeProgress * 100}% - 4px)` }}
                                />
                            </div>

                            {/* Transport & Control Buttons */}
                            <div className="flex justify-between items-center px-1">
                                {/* Secondary Function Buttons */}
                                <div className="flex gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); setShuffle(!shuffle); }}
                                        className={clsx(
                                            "w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow-md active:translate-y-0.5 transition-all",
                                            shuffle ? 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                                        )}
                                        title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                                    >
                                        <Shuffle size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                                        className={clsx(
                                            "relative w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow-md active:translate-y-0.5 transition-all",
                                            repeat !== 'off' ? 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                                        )}
                                        title={`Repeat: ${repeat.toUpperCase()}`}
                                    >
                                        <Repeat size={13} />
                                        {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[7px] font-black bg-blue-400 text-neutral-950 rounded-full w-3 h-3 flex items-center justify-center">1</span>}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); toggleLyrics(); }}
                                        className={clsx(
                                            "w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow-md active:translate-y-0.5 transition-all",
                                            showLyrics ? 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                                        )}
                                        title="Lyrics"
                                    >
                                        <Mic2 size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); toggleEq(); }}
                                        className={clsx(
                                            "w-8 h-8 rounded-full border-b-2 border-black flex items-center justify-center shadow-md active:translate-y-0.5 transition-all",
                                            showEq ? 'bg-blue-500 text-white shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
                                        )}
                                        title="Equalizer"
                                    >
                                        <SlidersHorizontal size={13} />
                                    </button>
                                </div>

                                {/* Primary Transport Buttons (Prev / Play / Next) */}
                                <div className="flex gap-2 items-center">
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); prev(); }}
                                        className="w-10 h-10 rounded-lg bg-gradient-to-b from-neutral-600 via-neutral-700 to-neutral-800 border-b-4 border-neutral-950 text-white flex items-center justify-center shadow-md active:translate-y-1 hover:brightness-110"
                                    >
                                        <SkipBack size={18} className="fill-current" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); togglePlay(); }}
                                        className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-400 via-blue-500 to-blue-700 border-b-[5px] border-blue-950 text-white flex items-center justify-center shadow-xl active:translate-y-[5px] hover:brightness-110"
                                    >
                                        {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current pl-0.5" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); next(); }}
                                        className="w-10 h-10 rounded-lg bg-gradient-to-b from-neutral-600 via-neutral-700 to-neutral-800 border-b-4 border-neutral-950 text-white flex items-center justify-center shadow-md active:translate-y-1 hover:brightness-110"
                                    >
                                        <SkipForward size={18} className="fill-current" />
                                    </button>
                                </div>

                                {/* Tactile Volume Rotary Dial */}
                                <div className="hidden md:flex flex-col items-center gap-0.5 relative">
                                    <div
                                        className="w-10 h-10 rounded-full bg-gradient-to-tr from-neutral-800 via-neutral-700 to-neutral-600 border-2 border-black shadow-[0_4px_8px_rgba(0,0,0,0.6)] relative flex items-center justify-center cursor-pointer transition-transform"
                                        style={{ transform: `rotate(${volume * 270 - 135}deg)` }}
                                    >
                                        <div className="w-1 h-3 bg-amber-400 absolute top-1 rounded-full shadow-[0_0_4px_#f59e0b]" />
                                    </div>
                                    <span className="text-[7.5px] font-mono font-bold uppercase text-neutral-400">VOL</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={volume}
                                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>

                                {/* Eject Button */}
                                {isLoaded && (
                                    <button
                                        type="button"
                                        onClick={() => { playClick(); loadMix(""); }}
                                        className="w-8 h-8 rounded bg-gradient-to-b from-red-800 to-red-950 border-b-4 border-black text-white/80 flex items-center justify-center shadow-md active:translate-y-1 hover:brightness-110 ml-2"
                                        title="Eject Tape"
                                    >
                                        <LogOut size={13} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Molded Sports Chassis Emblem */}
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 font-black italic text-neutral-800/30 text-xs tracking-widest uppercase">
                            SHOCK WAVE SPORT SERIES 9000
                        </span>
                    </div>
                </div>
            </div>

            {/* DRAGGABLE POLAROIDS - Each manages its own position from persisted state */}
            {mixes
                .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                .slice(0, 9) // Allow 9 polaroids (Discovery + 8 Pinned)
                .map((mix) => {
                    const pos = positions[mix.id];
                    if (!pos) return null; // Wait for init

                    return (
                        <DraggablePolaroid
                            key={mix.id}
                            mix={mix}
                            position={pos}
                            isInsidePlayer={isLoaded && activeMixId === mix.id}
                            albumArt={getMixImage(mix)}
                            playerRef={playerRef}
                            onDropOnPlayer={handleDropOnPlayer}
                            onHoverPlayer={setIsOverPlayer}
                            onEditMix={onEditMix}
                            onSnapshotMix={onSnapshotMix}
                            onOpenSearch={onOpenSearch}
                            onShareMix={onShareMix}
                            onPositionChange={updatePosition}
                        />
                    );
                })}

            {/* Overlays */}
            {/* Overlays */}
            <AnimatePresence>
                {showLyrics && (
                    <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                        <div className="pointer-events-auto">
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

            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div >
    );
}
