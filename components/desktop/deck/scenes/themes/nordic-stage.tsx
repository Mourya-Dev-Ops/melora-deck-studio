"use client";

import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    SkipBack, SkipForward, Volume2, LogOut,
    Palette, Settings, Plus, Camera, Share2, Play, Pause, Shuffle, Repeat, Search,
    Mic2, SlidersHorizontal, ListMusic, Disc3, Sparkles
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

interface NordicStageProps {
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
    onShowLyrics?: () => void;
    onShowQueue?: () => void;
    onShareMix?: (mix: Mix) => void;
}

export function NordicStage({
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    onSnapshotMix,
    onShareMix
}: NordicStageProps) {
    const containerRef = useRef<HTMLDivElement>(null);
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

    const safeDuration = duration > 0 ? duration : (currentSong && currentSong.duration ? parseInt(currentSong.duration.toString()) : 0);
    const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Dynamic Spool Physics
    const leftTapeRadius = 14 + Math.sqrt(Math.max(0, 1 - safeProgress)) * 22;
    const rightTapeRadius = 14 + Math.sqrt(Math.max(0, safeProgress)) * 22;

    return (
        <div
            ref={containerRef}
            className="w-full h-full font-sans overflow-hidden relative bg-[#0f1115] text-slate-200 select-none [&::-webkit-scrollbar]:hidden"
            style={{
                backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(56,189,248,0.06) 0%, transparent 75%), radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 28px 28px'
            }}
        >
            <div className="max-w-7xl mx-auto px-6 py-6 relative z-10 flex flex-col h-screen w-full justify-between">
                {/* Header */}
                <header className="flex justify-between items-center mb-6 shrink-0 border-b border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl font-mono font-bold tracking-tight text-white flex items-center gap-2">
                                <Sparkles size={16} className="text-sky-400" />
                                BEOSOUND // NORDIC
                            </span>
                            <span className="text-[10px] font-mono tracking-[0.25em] uppercase px-2 py-0.5 rounded bg-sky-950/60 text-sky-400 border border-sky-800/40">
                                ARCTIC MONOLITH 9000
                            </span>
                        </div>
                    </div>

                    <nav className="flex items-center gap-5">
                        <button
                            onClick={onCinemaMode}
                            className="hidden md:flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase hover:text-sky-400 transition-colors text-slate-400 pb-1"
                        >
                            <Camera size={13} /> Photo Mode
                        </button>
                        <button
                            onClick={() => onOpenSearch?.('')}
                            className="hidden md:flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase hover:text-sky-400 transition-colors text-slate-400 pb-1"
                        >
                            <Search size={13} /> Search
                        </button>
                        <button
                            onClick={() => setIsRackOpen(true)}
                            className="hidden md:flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase hover:text-sky-400 transition-colors text-slate-400 pb-1"
                        >
                            <ListMusic size={13} /> Vault
                        </button>
                        <button
                            onClick={onCreateMix}
                            className="hidden md:flex items-center gap-1.5 font-mono text-xs tracking-widest uppercase hover:text-sky-400 transition-colors text-slate-400 pb-1"
                        >
                            <Plus size={13} /> New Tape
                        </button>

                        <div className="flex items-center gap-2 ml-3 border-l border-slate-800 pl-4">
                            <button
                                onClick={onOpenThemeSelector}
                                className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-sky-500/40 transition-all"
                                title="Change Theme"
                            >
                                <Palette size={16} />
                            </button>
                            <button
                                onClick={onOpenSettings}
                                className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-slate-400 hover:text-white hover:border-sky-500/40 transition-all"
                                title="Deck Settings"
                            >
                                <Settings size={16} />
                            </button>
                        </div>
                    </nav>
                </header>

                {/* Main Content */}
                <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden min-h-0 items-start">
                    {/* Left Column: Nordic Archival Tapes */}
                    <section className="lg:col-span-7 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="size-2 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                                <h2 className="font-mono text-xs tracking-[0.2em] text-slate-400 uppercase font-semibold">
                                    Scandinavian Archival Tapes
                                </h2>
                            </div>
                            <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest">
                                CLICK TO INSERT
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-3 space-y-3 [&::-webkit-scrollbar]:hidden">
                            {mixes
                                .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                                .map((mix) => {
                                    const isCurrent = mix.id === activeMixId;

                                    return (
                                        <div
                                            key={mix.id}
                                            onClick={() => {
                                                if (activeMixId === mix.id) return;
                                                playClick();
                                                unlockAudio();
                                                loadMix(mix.id);
                                                setTimeout(() => play(), 800);
                                            }}
                                            className={clsx(
                                                "group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-300 border relative overflow-hidden",
                                                isCurrent
                                                    ? "bg-gradient-to-r from-slate-900 to-slate-800 border-sky-500/60 shadow-[0_4px_20px_rgba(56,189,248,0.15)] ring-1 ring-sky-500/30"
                                                    : "bg-slate-900/40 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700"
                                            )}
                                        >
                                            {/* Left Edge Accent Bar */}
                                            {isCurrent && <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />}

                                            <div className="flex items-center gap-4">
                                                {/* Realistic Mini Nordic Cassette Graphic */}
                                                <div className="w-14 h-9 rounded-md bg-gradient-to-b from-[#1c222b] to-[#12161c] border border-slate-700/60 flex flex-col justify-between p-1 shadow-sm shrink-0">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[6px] font-mono font-bold text-sky-400">A</span>
                                                        <span className="text-[5px] font-mono text-slate-500">CrO2</span>
                                                    </div>
                                                    <div className="h-3 bg-black/50 rounded flex items-center justify-around px-1">
                                                        <div className="size-2 rounded-full border border-sky-400/50 bg-slate-800 flex items-center justify-center">
                                                            <div className="size-0.5 rounded-full bg-white" />
                                                        </div>
                                                        <div className="size-2 rounded-full border border-sky-400/50 bg-slate-800 flex items-center justify-center">
                                                            <div className="size-0.5 rounded-full bg-white" />
                                                        </div>
                                                    </div>
                                                    <div className="text-[5px] font-mono text-slate-400 text-center truncate">
                                                        BEOSOUND
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className={clsx(
                                                        "font-mono font-semibold text-sm transition-colors",
                                                        isCurrent ? "text-sky-300" : "text-white group-hover:text-slate-200"
                                                    )}>
                                                        {mix.title}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                                        <span>{mix.songs.length} Tracks</span>
                                                        <span>•</span>
                                                        <span className="text-slate-500">High Bias 70μs</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Hover Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }}
                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700/50"
                                                    title="Settings"
                                                >
                                                    <Settings size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }}
                                                    className="p-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition-colors shadow-sm"
                                                    title="Add Songs"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }}
                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700/50"
                                                    title="Snapshot"
                                                >
                                                    <Camera size={13} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }}
                                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors border border-slate-700/50"
                                                    title="Share"
                                                >
                                                    <Share2 size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </section>

                    {/* Right Column: High-End Nordic Monolith Deck */}
                    <section className="lg:col-span-5 w-full flex justify-center">
                        <motion.div
                            drag
                            dragConstraints={containerRef}
                            dragMomentum={true}
                            dragElastic={0.1}
                            whileDrag={{ scale: 1.02, zIndex: 50 }}
                            className="w-full max-w-[440px] bg-gradient-to-b from-[#1c212a] to-[#13161c] p-6 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.08)] border border-slate-700/60 cursor-grab active:cursor-grabbing relative overflow-hidden"
                        >
                            {/* Precision Hex Machine Screws */}
                            <div className="absolute top-3 left-3 size-2 rounded-full border border-slate-600 bg-slate-800/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] bg-sky-300" /></div>
                            <div className="absolute top-3 right-3 size-2 rounded-full border border-slate-600 bg-slate-800/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] -rotate-45 bg-sky-300" /></div>
                            <div className="absolute bottom-3 left-3 size-2 rounded-full border border-slate-600 bg-slate-800/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] rotate-30 bg-sky-300" /></div>
                            <div className="absolute bottom-3 right-3 size-2 rounded-full border border-slate-600 bg-slate-800/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] -rotate-60 bg-sky-300" /></div>

                            {/* Deck Monolith Header */}
                            <div className="flex justify-between items-center mb-4 px-1">
                                <div>
                                    <h2 className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-slate-400">
                                        BEOCASSETTE 9000 // MONOLITH
                                    </h2>
                                    <p className="font-mono text-[8px] text-slate-500 uppercase tracking-widest">
                                        COPENHAGEN ACOUSTIC LAB
                                    </p>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                    <div className={clsx("size-2 rounded-full", isPlaying ? "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" : "bg-slate-700")} />
                                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wide">
                                        {isLoaded ? (isPlaying ? "RUNNING" : "LOADED") : "STANDBY"}
                                    </span>
                                </div>
                            </div>

                            {/* Arctic Smoked Glass Cassette Chamber */}
                            <div className="bg-[#0b0d11] rounded-xl p-4 mb-4 border border-slate-800 shadow-inner h-40 flex flex-col justify-between relative overflow-hidden">
                                {/* Ice Blue Halo Backlight */}
                                <div className={clsx(
                                    "absolute inset-0 pointer-events-none transition-opacity duration-700",
                                    isPlaying ? "opacity-100" : "opacity-30",
                                    "bg-[radial-gradient(ellipse_at_50%_0%,rgba(56,189,248,0.12)_0%,transparent_70%)]"
                                )} />

                                {isLoaded && activeMix ? (
                                    <>
                                        {/* Tape Header Details */}
                                        <div className="flex justify-between items-center px-1 z-10">
                                            <span className="font-mono text-[8px] font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-800/40">
                                                SIDE A // MASTER
                                            </span>
                                            <span className="font-mono text-[8px] text-slate-400">
                                                {formatTime(safeProgress * safeDuration)} / {formatTime(safeDuration)}
                                            </span>
                                        </div>

                                        {/* Physical Tape Spools Area */}
                                        <div className="flex items-center justify-between px-6 py-2 bg-black/40 rounded-lg border border-white/5 my-auto z-10">
                                            {/* Left Spool */}
                                            <div className="relative flex items-center justify-center">
                                                <div
                                                    className="rounded-full absolute transition-all duration-300"
                                                    style={{
                                                        width: `${leftTapeRadius * 2}px`,
                                                        height: `${leftTapeRadius * 2}px`,
                                                        background: "radial-gradient(circle, #382416 30%, #150d07 90%)",
                                                        boxShadow: "0 0 6px rgba(0,0,0,0.8)"
                                                    }}
                                                />
                                                <motion.div
                                                    animate={isPlaying ? { rotate: 360 } : {}}
                                                    transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                                    className="size-9 rounded-full border-2 border-sky-400/80 bg-[#161b22] flex items-center justify-center relative z-10 shadow-md"
                                                >
                                                    <div className="size-2.5 rounded-full bg-white/80" />
                                                    <div className="absolute inset-0 border border-dashed border-sky-300/30 rounded-full" />
                                                </motion.div>
                                            </div>

                                            {/* Center Tape Window & Magnetic Head */}
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-14 h-1 bg-sky-500/60 rounded-full mb-1" />
                                                <span className="font-mono text-[7px] text-slate-400 tracking-widest uppercase">
                                                    FERRO-CHROME
                                                </span>
                                            </div>

                                            {/* Right Spool */}
                                            <div className="relative flex items-center justify-center">
                                                <div
                                                    className="rounded-full absolute transition-all duration-300"
                                                    style={{
                                                        width: `${rightTapeRadius * 2}px`,
                                                        height: `${rightTapeRadius * 2}px`,
                                                        background: "radial-gradient(circle, #382416 30%, #150d07 90%)",
                                                        boxShadow: "0 0 6px rgba(0,0,0,0.8)"
                                                    }}
                                                />
                                                <motion.div
                                                    animate={isPlaying ? { rotate: 360 } : {}}
                                                    transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                                    className="size-9 rounded-full border-2 border-sky-400/80 bg-[#161b22] flex items-center justify-center relative z-10 shadow-md"
                                                >
                                                    <div className="size-2.5 rounded-full bg-white/80" />
                                                    <div className="absolute inset-0 border border-dashed border-sky-300/30 rounded-full" />
                                                </motion.div>
                                            </div>
                                        </div>

                                        {/* Bottom Track Readout */}
                                        <div className="flex items-center justify-between px-1 z-10">
                                            <div className="flex items-center gap-2 truncate max-w-[240px]">
                                                <span className="text-sky-400 font-bold text-xs">▶</span>
                                                <p className="font-mono text-[11px] text-slate-200 font-medium truncate">
                                                    {currentSong ? decodeHtml(currentSong.name) : activeMix.title}
                                                </p>
                                            </div>
                                            {activeQuality && <QualityBadge quality={activeQuality} variant="mini" />}
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-500 my-auto">
                                        <Disc3 size={28} className="animate-spin" style={{ animationDuration: "10s" }} />
                                        <span className="font-mono text-xs tracking-widest uppercase">NO CASSETTE LOADED</span>
                                    </div>
                                )}
                            </div>

                            {/* Spectrum Visualizer Frame */}
                            <div className="h-7 w-full bg-[#0d1015] rounded-lg p-1 border border-slate-800 mb-3.5 overflow-hidden">
                                {isLoaded ? (
                                    <Visualizer isPlaying={isPlaying} accentColor="#38bdf8" className="w-full h-full opacity-80" />
                                ) : (
                                    <div className="w-full h-0.5 bg-slate-800 my-auto" />
                                )}
                            </div>

                            {/* Linear Fader Progress Bar */}
                            <div className="mb-5">
                                <div className="flex justify-between text-[9px] font-mono text-slate-400 mb-1.5">
                                    <span>{formatTime(safeProgress * safeDuration)}</span>
                                    <span className="text-[8px] tracking-widest uppercase text-slate-500">DIGITAL TIME CODE</span>
                                    <span>{formatTime(safeDuration)}</span>
                                </div>
                                <div
                                    className="h-2 w-full bg-[#0d1015] border border-slate-800 rounded-full cursor-pointer group relative p-0.5 overflow-hidden"
                                    onClick={(e) => {
                                        if (safeDuration && isLoaded) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const percent = (e.clientX - rect.left) / rect.width;
                                            seek(Math.max(0, Math.min(1, percent)));
                                        }
                                    }}
                                >
                                    <div
                                        className="h-full bg-gradient-to-r from-sky-600 to-sky-400 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.6)] transition-all"
                                        style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Tactile Machined Disc Transport Controls */}
                            <div className="flex items-center justify-between mb-6 px-1">
                                <button
                                    onClick={() => { playClick(); setShuffle(!shuffle); }}
                                    className={clsx(
                                        "size-9 rounded-xl border flex items-center justify-center transition-all",
                                        shuffle ? "text-sky-300 bg-sky-950/60 border-sky-500/50 shadow-sm" : "text-slate-400 bg-slate-800/40 border-slate-700/60 hover:text-white"
                                    )}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                                >
                                    <Shuffle size={14} />
                                </button>

                                <button
                                    onClick={() => { playClick(); prev(); }}
                                    className="size-11 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all active:translate-y-0.5 shadow-sm"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title="Previous Track"
                                >
                                    <SkipBack className="fill-current" size={18} />
                                </button>

                                {/* Center Nordic Jewel Play Button */}
                                <button
                                    onClick={() => { playClick(); togglePlay(); }}
                                    className="size-14 rounded-2xl bg-gradient-to-b from-sky-500 to-sky-700 text-white border border-sky-400/50 shadow-[0_0_24px_rgba(56,189,248,0.4)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title={isPlaying ? "Pause" : "Play"}
                                >
                                    {isPlaying ? <Pause className="fill-current" size={24} /> : <Play className="fill-current pl-1" size={24} />}
                                </button>

                                <button
                                    onClick={() => { playClick(); next(); }}
                                    className="size-11 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all active:translate-y-0.5 shadow-sm"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title="Next Track"
                                >
                                    <SkipForward className="fill-current" size={18} />
                                </button>

                                <button
                                    onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                                    className={clsx(
                                        "size-9 rounded-xl border flex items-center justify-center transition-all relative",
                                        repeat !== 'off' ? "text-sky-300 bg-sky-950/60 border-sky-500/50 shadow-sm" : "text-slate-400 bg-slate-800/40 border-slate-700/60 hover:text-white"
                                    )}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    title={`Repeat: ${repeat.toUpperCase()}`}
                                >
                                    <Repeat size={14} />
                                    {repeat === 'one' && <span className="absolute -top-1 -right-1 text-[8px] font-bold text-sky-400 bg-sky-950 px-1 rounded-full border border-sky-500/50">1</span>}
                                </button>
                            </div>

                            {/* Footer Controls: Eject, Lyrics, EQ & Gain */}
                            <div className="flex justify-between items-center pt-4 border-t border-slate-800/80">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => { playEject(); loadMix(""); }}
                                        className="flex items-center gap-1.5 text-[9px] font-mono font-bold text-slate-400 hover:text-sky-400 transition-colors uppercase tracking-widest"
                                    >
                                        <LogOut size={12} />
                                        Eject
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (!showLyrics) setShowEq(false);
                                            setShowLyrics(prev => !prev);
                                        }}
                                        className={clsx(
                                            "flex items-center gap-1 text-[9px] font-mono font-bold transition-colors uppercase tracking-widest",
                                            showLyrics ? 'text-sky-400' : 'text-slate-400 hover:text-sky-400'
                                        )}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <Mic2 size={12} />
                                        Lyrics
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (!showEq) setShowLyrics(false);
                                            setShowEq(prev => !prev);
                                        }}
                                        className={clsx(
                                            "flex items-center gap-1 text-[9px] font-mono font-bold transition-colors uppercase tracking-widest",
                                            showEq ? 'text-sky-400' : 'text-slate-400 hover:text-sky-400'
                                        )}
                                        onPointerDown={(e) => e.stopPropagation()}
                                    >
                                        <SlidersHorizontal size={12} />
                                        EQ
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 relative">
                                    <Volume2 size={14} className="text-slate-400" />
                                    <div className="w-18 h-1.5 bg-[#0b0d11] border border-slate-800 rounded-full relative overflow-hidden">
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-sky-400 rounded-full"
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
                        </motion.div>
                    </section>
                </main>
            </div>

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
