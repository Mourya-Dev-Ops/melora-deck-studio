"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { clsx } from "clsx";
import { Play, Pause, SkipBack, SkipForward, Volume2, LogOut, Share2, Palette, Settings, Plus, Camera, Search, Pencil, Shuffle, Repeat } from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { Mic2, SlidersHorizontal, ListMusic, Disc3, CircleDot } from "lucide-react";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { Visualizer } from "@/components/ui/visualizer";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useAudioProgress } from "@/hooks/use-audio-progress";

export interface Position { x: number; y: number; rotation: number; }

interface BauhausStageProps {
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

// Extracted Draggable Card
function DraggableMixCard({
    mix,
    position,
    isActive,
    playerRef,
    onDragEnd,
    onEditMix,
    onSnapshotMix,
    onShareMix,
    onOpenSearch,
    loadMix,
    playClick,
    unlockAudio,
    play
}: {
    mix: Mix;
    position: Position;
    isActive: boolean;
    containerRef: React.RefObject<HTMLDivElement | null>;
    playerRef: React.RefObject<HTMLDivElement>;
    onDragEnd: (id: string, pos: Position) => void;
    onEditMix?: (mix: Mix) => void;
    onSnapshotMix?: (mix: Mix) => void;
    onShareMix?: (mix: Mix) => void;
    onOpenSearch?: (mixId: string) => void;
    loadMix: (id: string) => void;
    playClick: () => void;
    unlockAudio: () => void;
    play: () => void;
}) {
    const x = useMotionValue(position.x);
    const y = useMotionValue(position.y);
    const [isFailed, setIsFailed] = useState(false);

    useEffect(() => {
        x.set(position.x);
        y.set(position.y);
    }, [position.x, position.y, x, y]);

    // Deterministic Bauhaus Color Mapping: Strict Theme Palette
    const colorScheme = useMemo(() => {
        const schemes = [
            { bg: "bg-[#d62828]", text: "text-white", accent: "bg-[#003049]", border: "border-[#d62828]", tag: "ROT // A" },
            { bg: "bg-[#003566]", text: "text-white", accent: "bg-[#ffd60a]", border: "border-[#003566]", tag: "BLAU // B" },
            { bg: "bg-[#ffb703]", text: "text-[#121212]", accent: "bg-[#d62828]", border: "border-[#ffb703]", tag: "GELB // C" }
        ];
        let hash = 0;
        for (let i = 0; i < mix.id.length; i++) hash = mix.id.charCodeAt(i) + ((hash << 5) - hash);
        return schemes[Math.abs(hash) % schemes.length];
    }, [mix.id]);

    return (
        <motion.div
            style={{ x, y, rotate: position.rotation }}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            whileDrag={{ scale: 1.05, zIndex: 100, rotate: 0 }}
            whileHover={{ scale: 1.03, zIndex: 50 }}
            animate={isFailed ? {
                x: [x.get(), x.get() - 8, x.get() + 8, x.get() - 8, x.get() + 8, x.get() - 4, x.get() + 4, x.get()]
            } : undefined}
            transition={isFailed ? { duration: 0.4 } : undefined}
            className={clsx(
                "absolute top-0 left-0 cursor-grab active:cursor-grabbing w-[210px] group select-none",
                isActive && "opacity-45 pointer-events-none grayscale"
            )}
            onDragEnd={(_e, info) => {
                let droppedOnPlayer = false;
                if (playerRef.current) {
                    const rect = playerRef.current.getBoundingClientRect();
                    const { x: dropX, y: dropY } = info.point;
                    if (dropX >= rect.left && dropX <= rect.right && dropY >= rect.top && dropY <= rect.bottom) {
                        playClick();
                        unlockAudio();
                        loadMix(mix.id);
                        setTimeout(() => play(), 800);
                        droppedOnPlayer = true;
                    }
                }
                if (!droppedOnPlayer) {
                    setIsFailed(true);
                    setTimeout(() => {
                        setIsFailed(false);
                    }, 500);
                }
                onDragEnd(mix.id, { x: x.get(), y: y.get(), rotation: position.rotation });
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Bauhaus Designer Cassette Shell */}
            <div
                id={`mix-card-${mix.id}`}
                className={clsx(
                    "relative p-3 rounded-md transition-all aspect-[1.55/1] flex flex-col justify-between overflow-hidden",
                    "border-2 border-[#121212] shadow-[6px_6px_0px_0px_#121212]",
                    colorScheme.bg,
                    isFailed && "border-red-600 ring-4 ring-red-600/50"
                )}
            >
                {/* Micro corner screws */}
                <div className="absolute top-1.5 left-1.5 size-1.5 rounded-full border border-black/40 bg-white/40 flex items-center justify-center"><div className="w-1 h-[0.5px] bg-black/60" /></div>
                <div className="absolute top-1.5 right-1.5 size-1.5 rounded-full border border-black/40 bg-white/40 flex items-center justify-center"><div className="w-1 h-[0.5px] -rotate-45 bg-black/60" /></div>
                <div className="absolute bottom-1.5 left-1.5 size-1.5 rounded-full border border-black/40 bg-white/40 flex items-center justify-center"><div className="w-1 h-[0.5px] rotate-45 bg-black/60" /></div>
                <div className="absolute bottom-1.5 right-1.5 size-1.5 rounded-full border border-black/40 bg-white/40 flex items-center justify-center"><div className="w-1 h-[0.5px] -rotate-45 bg-black/60" /></div>

                {/* Action Buttons Floating On Hover */}
                <div className="absolute top-2 right-2 flex flex-row gap-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-white border-2 border-black p-1 shadow-md pointer-events-auto rounded">
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="p-1 hover:bg-[#ffb703] transition-colors"><Pencil size={10} className="text-black" /></button>
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="p-1 hover:bg-[#ffb703] transition-colors"><Camera size={10} className="text-black" /></button>
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="p-1 hover:bg-[#ffb703] transition-colors"><Share2 size={10} className="text-black" /></button>
                    <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="p-1 hover:bg-[#ffb703] transition-colors"><Plus size={10} className="text-black" /></button>
                </div>

                {/* Tape Header */}
                <div className="flex justify-between items-center z-10 px-0.5">
                    <span className="font-mono text-[9px] font-black tracking-widest uppercase bg-black text-white px-1.5 py-0.5 rounded-xs">
                        {colorScheme.tag}
                    </span>
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider opacity-70">
                        BAUHAUS 60 MIN
                    </span>
                </div>

                {/* Archival Label */}
                <div className="bg-[#fafaf7] relative px-2 py-1.5 border-2 border-[#121212] shadow-xs mx-0.5 z-10 rounded-xs">
                    <p className="font-mono text-center text-xs font-black text-[#121212] tracking-tight truncate uppercase">
                        {mix.title}
                    </p>
                    <div className="w-full h-0.5 bg-[#121212]/20 my-0.5" />
                    <div className="flex justify-between text-[7px] font-mono text-black/50 tracking-wider">
                        <span>STUDIO NORM</span>
                        <span>{mix.songs.length} WERKE</span>
                    </div>
                </div>

                {/* Spools Cutout */}
                <div className="flex justify-between items-center bg-[#121212]/15 rounded px-2 py-1 border border-black/20 z-10">
                    <div className="flex gap-2 items-center">
                        <div className="size-5 rounded-full border-2 border-[#121212] bg-white flex items-center justify-center">
                            <div className="w-full h-0.5 bg-[#121212]" />
                        </div>
                        <div className="w-10 h-1 bg-[#121212]/30 rounded-full" />
                        <div className="size-5 rounded-full border-2 border-[#121212] bg-white flex items-center justify-center">
                            <div className="w-full h-0.5 bg-[#121212]" />
                        </div>
                    </div>
                    <span className="bg-[#121212] text-white px-1.5 py-0.5 text-[8px] font-mono font-bold rounded-xs">
                        {mix.songs.length}
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

export function BauhausStage({
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    onShareMix,
    onSnapshotMix
}: BauhausStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<HTMLDivElement>(null!);

    const [positions, setPositions] = useState<Record<string, Position>>({});

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
    const { mixes } = useLibrary();
    const { progress } = useAudioProgress();

    const { playClick, playEject } = useAudio();
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);

    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);

    // Initialize Grid Positions
    useEffect(() => {
        setPositions(prev => {
            const nextState = { ...prev };
            let hasChanges = false;
            const cols = 3;

            mixes.forEach((mix, i) => {
                if (!nextState[mix.id]) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    nextState[mix.id] = {
                        x: 40 + (col * 230),
                        y: 110 + (row * 160),
                        rotation: -2 + Math.random() * 4
                    };
                    hasChanges = true;
                }
            });
            return hasChanges ? nextState : prev;
        });
    }, [mixes]);

    const handlePosChange = (id: string, pos: Position) => {
        setPositions(prev => ({ ...prev, [id]: pos }));
    };

    const formatTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const toggleLyrics = () => {
        if (!showLyrics) setShowEq(false);
        setShowLyrics(!showLyrics);
    };

    const toggleEq = () => {
        if (!showEq) setShowLyrics(false);
        setShowEq(!showEq);
    };

    const safeProgress = Math.min(Math.max(progress || 0, 0), 1);
    const leftTapeRadius = 14 + Math.sqrt(Math.max(0, 1 - safeProgress)) * 20;
    const rightTapeRadius = 14 + Math.sqrt(Math.max(0, safeProgress)) * 20;

    return (
        <div
            ref={containerRef}
            className="bg-[#f0ede6] text-[#121212] h-screen flex flex-col font-sans overflow-hidden selection:bg-[#003049] selection:text-white relative select-none"
        >
            {/* Precise Dieter Rams Bauhaus Architectural Grid */}
            <div
                className="absolute inset-0 pointer-events-none opacity-45 z-0"
                style={{
                    backgroundImage: `linear-gradient(#dedad0 1px, transparent 1px), linear-gradient(90deg, #dedad0 1px, transparent 1px)`,
                    backgroundSize: '36px 36px'
                }}
            />

            <div className="w-full h-full mx-auto p-0 relative z-10 flex flex-col">
                {/* Header */}
                <header className="w-full px-6 py-4 flex flex-col md:flex-row justify-between items-center bg-[#fafaf7] border-b-4 border-[#121212] relative z-40 gap-4 shadow-[6px_6px_0px_0px_#121212]">
                    <div className="flex items-center gap-3 select-none">
                        <span className="w-4 h-4 bg-[#d62828] rounded-xs border-2 border-black" />
                        <span className="w-4 h-4 bg-[#ffd60a] rounded-full border-2 border-black" />
                        <span className="w-4 h-4 bg-[#003566] border-2 border-black" />
                        <h1 className="text-2xl font-mono font-black tracking-tighter uppercase pl-2">
                            BRAUN // BAUHAUS MODUL 4
                        </h1>
                    </div>

                    <div className="flex items-center gap-3.5 flex-wrap justify-center font-mono font-bold text-xs">
                        <button
                            onClick={onCinemaMode}
                            className="hidden md:flex items-center gap-2 bg-[#003566] text-white px-3.5 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_#121212] hover:translate-y-0.5 hover:shadow-xs transition-all border-2 border-[#121212]"
                        >
                            <Camera size={13} /> Photo Mode
                        </button>
                        <button
                            onClick={() => onOpenSearch?.('')}
                            className="hidden md:flex items-center gap-2 bg-white text-[#121212] px-3.5 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_#121212] hover:translate-y-0.5 hover:shadow-xs transition-all border-2 border-[#121212]"
                        >
                            <Search size={13} /> Search
                        </button>
                        <button
                            onClick={() => setIsRackOpen(true)}
                            className="flex items-center gap-2 bg-white text-[#121212] border-2 border-[#121212] px-3.5 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_#121212] hover:translate-y-0.5 hover:shadow-xs transition-all"
                        >
                            <ListMusic size={13} /> Rack
                        </button>
                        <button
                            onClick={onCreateMix}
                            className="flex items-center gap-2 bg-[#ffd60a] text-[#121212] border-2 border-[#121212] px-3.5 py-2 uppercase tracking-wider shadow-[3px_3px_0px_0px_#121212] hover:translate-y-0.5 hover:shadow-xs transition-all"
                        >
                            <Plus size={13} /> New Tape
                        </button>
                        <button
                            onClick={() => onOpenThemeSelector?.()}
                            className="p-2.5 bg-white border-2 border-[#121212] hover:bg-gray-100 shadow-[3px_3px_0px_0px_#121212] transition-all"
                            title="Theme Palette"
                        >
                            <Palette size={16} />
                        </button>
                        <button
                            onClick={onOpenSettings}
                            className="p-2.5 bg-white border-2 border-[#121212] hover:bg-gray-100 shadow-[3px_3px_0px_0px_#121212] transition-all"
                            title="Settings"
                        >
                            <Settings size={16} />
                        </button>
                    </div>
                </header>

                <main className="h-full relative overflow-hidden">
                    {/* Free Floating Tapes */}
                    {mixes
                        .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                        .slice(0, 9)
                        .map(mix => {
                            if (!positions[mix.id]) return null;
                            return (
                                <DraggableMixCard
                                    key={mix.id}
                                    mix={mix}
                                    position={positions[mix.id]}
                                    isActive={activeMixId === mix.id}
                                    containerRef={containerRef}
                                    playerRef={playerRef}
                                    onDragEnd={handlePosChange}
                                    loadMix={loadMix}
                                    playClick={playClick}
                                    unlockAudio={unlockAudio}
                                    play={play}
                                    onEditMix={onEditMix}
                                    onSnapshotMix={onSnapshotMix}
                                    onShareMix={onShareMix}
                                    onOpenSearch={onOpenSearch}
                                />
                            );
                        })}

                    {/* Right Column: Bauhaus Master Deck (Dieter Rams / Braun Aesthetic) */}
                    <motion.section
                        ref={playerRef}
                        id="stereo-player"
                        drag
                        dragMomentum={true}
                        dragElastic={0.15}
                        dragConstraints={containerRef}
                        whileDrag={{ scale: 1.02, zIndex: 100 }}
                        className="absolute right-8 top-6 w-full max-w-[370px] bg-[#fafaf7] border-4 border-[#121212] p-5 flex flex-col gap-3.5 shadow-[12px_12px_0px_0px_#121212] z-30 cursor-move rounded-md"
                    >
                        {/* Screws */}
                        <div className="absolute top-2 left-2 text-black/30 font-mono text-xs">+</div>
                        <div className="absolute top-2 right-2 text-black/30 font-mono text-xs">+</div>
                        <div className="absolute bottom-2 left-2 text-black/30 font-mono text-xs">+</div>
                        <div className="absolute bottom-2 right-2 text-black/30 font-mono text-xs">+</div>

                        {/* Deck Branding */}
                        <div className="flex items-center justify-between border-b-2 border-[#121212] pb-2">
                            <div>
                                <h3 className="text-xl font-mono font-black uppercase tracking-tight text-[#121212]">
                                    BRAUN TG 60
                                </h3>
                                <p className="text-[9px] font-mono text-black/60 uppercase tracking-[0.25em]">
                                    DESIGN DIETER RAMS // 1965
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className={clsx("size-2.5 rounded-full border border-black", isPlaying ? "bg-[#d62828] animate-pulse" : "bg-black/20")} />
                                <span className="font-mono text-[9px] font-bold uppercase tracking-wider">
                                    {isPlaying ? "RUN" : "STOP"}
                                </span>
                            </div>
                        </div>

                        {/* Cassette Bay Window with Functional Geometric Reels */}
                        <div className="bg-[#121212] rounded border-2 border-[#121212] h-44 flex flex-col items-center justify-center relative shadow-inner overflow-hidden select-none p-3">
                            {/* Smoked Acrylic Glass Glare */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.08] via-transparent to-transparent pointer-events-none z-20" />

                            {isLoaded && activeMix ? (
                                <motion.div layoutId={activeMix.id} className="w-full h-full flex flex-col justify-between relative z-10">
                                    {/* Cassette Top Banner */}
                                    <div className="bg-white border border-black px-2.5 py-1 flex items-center justify-between shadow-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-[9px] font-black bg-[#d62828] text-white px-1 rounded-xs">A</span>
                                            <span className="font-mono text-xs font-black truncate max-w-[200px] text-[#121212]">
                                                {currentSong ? decodeHtml(currentSong.name) : activeMix.title}
                                            </span>
                                        </div>
                                        <span className="font-mono text-[8px] font-bold text-black/50">CrO2</span>
                                    </div>

                                    {/* Mechanical Rotating Spools with dynamic tape rolls */}
                                    <div className="flex items-center justify-between px-6 py-2 bg-black/60 rounded border border-white/10 my-auto">
                                        {/* Left Reel */}
                                        <div className="relative flex items-center justify-center">
                                            <div
                                                className="rounded-full absolute transition-all duration-300"
                                                style={{
                                                    width: `${leftTapeRadius * 2}px`,
                                                    height: `${leftTapeRadius * 2}px`,
                                                    background: "radial-gradient(circle, #3d2a1d 30%, #1a120c 90%)"
                                                }}
                                            />
                                            <motion.div
                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                                className="size-10 rounded-full border-2 border-white bg-[#222] flex items-center justify-center relative z-10"
                                            >
                                                <div className="w-full h-0.5 bg-white" />
                                                <div className="size-2 rounded-full bg-white z-10" />
                                            </motion.div>
                                        </div>

                                        {/* Center Optical Head Block */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-1 bg-[#ffd60a] rounded-full mb-1" />
                                            <span className="font-mono text-[7px] text-white/50 tracking-widest uppercase">STEREO HEAD</span>
                                        </div>

                                        {/* Right Reel */}
                                        <div className="relative flex items-center justify-center">
                                            <div
                                                className="rounded-full absolute transition-all duration-300"
                                                style={{
                                                    width: `${rightTapeRadius * 2}px`,
                                                    height: `${rightTapeRadius * 2}px`,
                                                    background: "radial-gradient(circle, #3d2a1d 30%, #1a120c 90%)"
                                                }}
                                            />
                                            <motion.div
                                                animate={isPlaying ? { rotate: 360 } : {}}
                                                transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                                                className="size-10 rounded-full border-2 border-white bg-[#222] flex items-center justify-center relative z-10"
                                            >
                                                <div className="w-full h-0.5 bg-white" />
                                                <div className="size-2 rounded-full bg-white z-10" />
                                            </motion.div>
                                        </div>
                                    </div>

                                    {/* Bottom Information */}
                                    <div className="flex items-center justify-between text-[8px] font-mono text-white/60 px-1">
                                        <span>4 TRACK STEREO</span>
                                        <span>DIN 45500 HI-FI</span>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 text-white/40">
                                    <Disc3 size={28} className="animate-spin" style={{ animationDuration: "8s" }} />
                                    <span className="font-mono text-xs font-bold tracking-widest uppercase">KEINE KASSETTE</span>
                                </div>
                            )}
                        </div>

                        {/* Status Bar */}
                        <div className="flex gap-2">
                            <div className="flex-1 bg-[#e8e6df] p-2.5 border-2 border-[#121212] font-mono flex justify-between items-center">
                                <span className="text-[#121212] font-black tracking-wider text-xs uppercase truncate">
                                    {isLoaded ? (currentSong ? decodeHtml(currentSong.name) : "BEREIT") : "LEER"}
                                </span>
                                {isLoaded && activeQuality && <QualityBadge quality={activeQuality} variant="mini" />}
                            </div>
                            <div className="w-12 bg-[#121212] flex items-center justify-center border-2 border-[#121212]">
                                <span className="font-black text-white text-base">A</span>
                            </div>
                        </div>

                        {/* Integrated Visualizer */}
                        <div className="w-full h-6 bg-[#e8e6df] border-2 border-[#121212] p-1 overflow-hidden">
                            {isLoaded ? (
                                <Visualizer isPlaying={isPlaying} accentColor="#003566" className="w-full h-full opacity-80" />
                            ) : (
                                <div className="w-full h-0.5 bg-black/20 my-auto" />
                            )}
                        </div>

                        {/* Progress Bar with Dieter Rams High-Contrast Fader */}
                        <div className="space-y-1">
                            <div className="flex justify-between font-mono text-[9px] text-black/60 font-bold uppercase tracking-wider">
                                <span>{formatTime(safeProgress * duration)}</span>
                                <span>BANDLÄNGE</span>
                                <span>{formatTime(duration || 0)}</span>
                            </div>
                            <div
                                className="h-4 bg-[#e8e6df] w-full border-2 border-[#121212] relative cursor-pointer"
                                onClick={(e) => {
                                    if (duration && isLoaded) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const percent = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(percent, 0), 1));
                                    }
                                }}
                            >
                                <motion.div
                                    className="h-full bg-[#003566] relative"
                                    style={{ width: `${safeProgress * 100}%` }}
                                >
                                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-[#d62828] border-l border-black" />
                                </motion.div>
                            </div>
                        </div>

                        {/* Mechanical Tactile Primary Buttons */}
                        <div className="flex justify-between items-center pt-1">
                            <button
                                onClick={() => { playClick(); setShuffle(!shuffle); }}
                                className={clsx(
                                    "size-8 rounded-full border-2 border-[#121212] flex items-center justify-center transition-all shadow-[2px_2px_0px_0px_#121212] active:translate-y-0.5 active:shadow-none",
                                    shuffle ? "bg-[#003566] text-white" : "bg-white hover:bg-gray-100"
                                )}
                                title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                            >
                                <Shuffle size={13} />
                            </button>

                            <button
                                onClick={() => { playClick(); prev(); }}
                                className="size-9 rounded-full border-2 border-[#121212] bg-white flex items-center justify-center hover:bg-gray-100 transition-all shadow-[2px_2px_0px_0px_#121212] active:translate-y-0.5 active:shadow-none"
                                title="Previous"
                            >
                                <SkipBack size={15} className="fill-current" />
                            </button>

                            {/* Master Play Button: Iconic Cobalt Circle */}
                            <button
                                onClick={() => { playClick(); togglePlay(); }}
                                className="size-13 bg-[#003566] text-white rounded-full border-3 border-[#121212] shadow-[3px_3px_0px_0px_#121212] hover:translate-y-0.5 hover:shadow-xs active:scale-95 transition-all flex items-center justify-center"
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-0.5" />}
                            </button>

                            <button
                                onClick={() => { playClick(); next(); }}
                                className="size-9 rounded-full border-2 border-[#121212] bg-white flex items-center justify-center hover:bg-gray-100 transition-all shadow-[2px_2px_0px_0px_#121212] active:translate-y-0.5 active:shadow-none"
                                title="Next"
                            >
                                <SkipForward size={15} className="fill-current" />
                            </button>

                            <button
                                onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                                className={clsx(
                                    "size-8 rounded-full border-2 border-[#121212] flex items-center justify-center relative transition-all shadow-[2px_2px_0px_0px_#121212] active:translate-y-0.5 active:shadow-none",
                                    repeat !== 'off' ? "bg-[#003566] text-white" : "bg-white hover:bg-gray-100"
                                )}
                                title={`Repeat: ${repeat.toUpperCase()}`}
                            >
                                <Repeat size={13} />
                                {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[7px] font-bold bg-[#d62828] text-white rounded-full size-3 flex items-center justify-center border border-[#121212]">1</span>}
                            </button>
                        </div>

                        {/* Lower Controls & Volume Attenuator */}
                        <div className="flex items-center justify-between pt-2 border-t-2 border-[#121212] text-xs font-mono font-bold">
                            <button
                                onClick={() => { playEject(); loadMix(""); }}
                                className="flex items-center gap-1 hover:text-[#d62828] transition-colors"
                            >
                                <LogOut size={13} />
                                <span className="tracking-widest text-[8px]">AUSWURF</span>
                            </button>

                            <button
                                onClick={toggleLyrics}
                                className={clsx("flex items-center gap-1 transition-colors", showLyrics ? "text-[#003566]" : "hover:text-[#003566]")}
                            >
                                <Mic2 size={13} />
                                <span className="tracking-widest text-[8px]">TEXT</span>
                            </button>

                            <button
                                onClick={toggleEq}
                                className={clsx("flex items-center gap-1 transition-colors", showEq ? "text-[#003566]" : "hover:text-[#003566]")}
                            >
                                <SlidersHorizontal size={13} />
                                <span className="tracking-widest text-[8px]">KLANG</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                                <Volume2 size={13} className="text-black/60" />
                                <div
                                    className="h-2.5 w-16 bg-[#e8e6df] rounded-full relative cursor-pointer border border-[#121212] overflow-hidden"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        setVolume(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div className="absolute top-0 left-0 bottom-0 bg-[#ffd60a]" style={{ width: `${volume * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    </motion.section>
                </main>

                <AnimatePresence>
                    {showLyrics && (
                        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                            <div className="pointer-events-auto w-full h-full max-w-2xl max-h-[80vh]">
                                <LyricsView currentSong={currentSong} currentTime={progress * duration} onClose={() => setShowLyrics(false)} />
                            </div>
                        </div>
                    )}
                    {showEq && (
                        <div className="fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center">
                            <div className="pointer-events-auto">
                                <EqualizerView onClose={() => setShowEq(false)} bands={eq.bands} setBand={eq.setBand} isEnabled={eq.isEnabled} setIsEnabled={eq.setIsEnabled} currentPreset={eq.currentPreset} setPreset={eq.setPreset} presets={eq.presets} />
                            </div>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            <TapeRackModal isOpen={isRackOpen} onClose={() => setIsRackOpen(false)} />
        </div>
    );
}
