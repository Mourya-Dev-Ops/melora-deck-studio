"use client";

import { useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import {
    Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, LogOut,
    Palette, Settings, Plus, Pencil, Camera, Search, Share2,
    Mic2, SlidersHorizontal, ListMusic, Disc3, Sparkles, Activity
} from "lucide-react";
import { ThemeKey } from "@/components/ui/desktop-player";
import { useAudio } from "@/hooks/use-audio";
import { decodeHtml } from "@/lib/utils";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { getThumbnailUrl } from "@/lib/jiosaavn";
import { LyricsView } from "@/components/ui/lyrics-view";
import { EqualizerView } from "@/components/ui/equalizer-view";
import { TapeRackModal } from "@/components/desktop/deck/modals/TapeRackModal";
import { Visualizer } from "@/components/ui/visualizer";
import { QualityBadge } from "@/components/shared/QualityBadge";
import { useAudioProgress } from "@/hooks/use-audio-progress";

interface SilverFrostStageProps {
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

export function SilverFrostStage({
    onOpenSettings,
    onEditMix,
    onOpenSearch,
    onCreateMix,
    onCinemaMode,
    onOpenThemeSelector,
    onSnapshotMix,
    onShareMix
}: SilverFrostStageProps) {
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
        setVolume,
        isLoaded,
        seek,
        shuffle,
        setShuffle,
        repeat,
        setRepeat,
        eq,
        activeQuality,
        play,
        unlockAudio
    } = usePlayback();
    const { mixes } = useLibrary();
    const { progress } = useAudioProgress();

    const { playClick, playClunk, playEject } = useAudio();
    const activeMix = useMemo(() => mixes.find(m => m.id === activeMixId) || null, [mixes, activeMixId]);
    const [hoveredMix, setHoveredMix] = useState<string | null>(null);
    const [showLyrics, setShowLyrics] = useState(false);
    const [showEq, setShowEq] = useState(false);
    const [isRackOpen, setIsRackOpen] = useState(false);

    const safeDuration = duration > 0 ? duration : (currentSong && currentSong.duration ? parseInt(currentSong.duration.toString()) : 0);
    const safeProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0;

    const formatTime = (seconds: number) => {
        if (!Number.isFinite(seconds) || isNaN(seconds)) return "00:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getMixImage = (mix: Mix): string | null => {
        if (mix.songs.length > 0) {
            const firstItem = mix.songs[0];
            const actualSong = (firstItem as any)?.song || firstItem;
            return getThumbnailUrl(actualSong);
        }
        return null;
    };

    // Cryogenic Reel Spool Physics
    const leftTapeRadius = 14 + Math.sqrt(Math.max(0, 1 - safeProgress)) * 22;
    const rightTapeRadius = 14 + Math.sqrt(Math.max(0, safeProgress)) * 22;

    return (
        <div
            ref={containerRef}
            className="flex h-screen w-full flex-col overflow-hidden bg-[#eef3f7] select-none text-slate-800"
            style={{
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(0,170,255,0.08) 0%, transparent 60%), radial-gradient(rgba(0,170,255,0.03) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 24px 24px'
            }}
        >
            <style jsx global>{`
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(0, 170, 255, 0.2); border-radius: 10px; }
            `}</style>

            {/* Header */}
            <header className="flex items-center justify-between px-8 py-3.5 border-b border-white/60 bg-white/70 backdrop-blur-xl z-50 shadow-xs">
                <div className="flex items-center gap-6">
                    <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl font-mono font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            <Sparkles size={16} className="text-[#00aaff]" />
                            QUALIA // SILVERFROST
                        </span>
                        <span className="text-[10px] font-mono tracking-[0.25em] uppercase px-2 py-0.5 rounded-full bg-[#00aaff]/10 text-[#0088cc] font-semibold border border-[#00aaff]/20">
                            CRYOGENIC AUDIO LAB
                        </span>
                    </div>

                    <nav className="hidden md:flex items-center gap-6 ml-6 border-l border-slate-300/60 pl-6">
                        <button onClick={onCinemaMode} className="text-xs font-mono font-semibold tracking-wider text-slate-600 hover:text-[#00aaff] transition-colors flex items-center gap-1.5 uppercase"><Camera size={13} /> Photo Mode</button>
                        <button onClick={() => onOpenSearch?.('')} className="text-xs font-mono font-semibold tracking-wider text-slate-600 hover:text-[#00aaff] transition-colors flex items-center gap-1.5 uppercase"><Search size={13} /> Search</button>
                        <button onClick={() => setIsRackOpen(true)} className="text-xs font-mono font-semibold tracking-wider text-slate-600 hover:text-[#00aaff] transition-colors flex items-center gap-1.5 uppercase"><ListMusic size={13} /> Vault</button>
                        <button onClick={onCreateMix} className="text-xs font-mono font-semibold tracking-wider text-slate-600 hover:text-[#00aaff] transition-colors flex items-center gap-1.5 uppercase"><Plus size={13} /> New Tape</button>
                    </nav>
                </div>

                <div className="flex items-center gap-2.5">
                    <button onClick={onOpenThemeSelector} className="size-9 rounded-xl border border-white/80 bg-white/80 hover:bg-white shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95" title="Theme"><Palette size={15} className="text-slate-700" /></button>
                    <button onClick={onOpenSettings} className="size-9 rounded-xl border border-white/80 bg-white/80 hover:bg-white shadow-xs flex items-center justify-center transition-all hover:scale-105 active:scale-95" title="Settings"><Settings size={15} className="text-slate-700" /></button>
                    <button onClick={() => { if (!showLyrics) setShowEq(false); setShowLyrics(prev => !prev); }} className={clsx("size-9 rounded-xl border shadow-xs flex items-center justify-center transition-all", showLyrics ? 'bg-[#00aaff] text-white border-[#00aaff]' : 'bg-white/80 border-white/80 text-slate-700 hover:bg-white')} title="Lyrics"><Mic2 size={15} /></button>
                    <button onClick={() => { if (!showEq) setShowLyrics(false); setShowEq(prev => !prev); }} className={clsx("size-9 rounded-xl border shadow-xs flex items-center justify-center transition-all", showEq ? 'bg-[#00aaff] text-white border-[#00aaff]' : 'bg-white/80 border-white/80 text-slate-700 hover:bg-white')} title="Equalizer"><SlidersHorizontal size={15} /></button>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                {/* Sidebar: Frosted Aluminum Mixtape Vault */}
                <aside
                    className="w-80 border-r border-white/50 flex flex-col p-5 relative overflow-hidden shrink-0 shadow-[inset_-10px_0_30px_rgba(0,0,0,0.03)] backdrop-blur-md"
                    style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(224,233,242,0.6) 100%)' }}
                >
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/60">
                        <div>
                            <h3 className="text-xs font-mono font-bold text-slate-700 uppercase tracking-[0.2em]">Archival Bay</h3>
                            <p className="text-[10px] text-[#00aaff] font-mono font-semibold">FROST RESIN MATRIX</p>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-white/80 shadow-xs">
                            {mixes.filter(m => m.pinned).length} TAPES
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                        {mixes
                            .filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id))
                            .map((mix) => {
                                const isActive = activeMixId === mix.id && isLoaded;
                                const albumArt = getMixImage(mix);

                                return (
                                    <div
                                        key={mix.id}
                                        onClick={() => { playClick(); unlockAudio(); loadMix(mix.id); setTimeout(() => play(), 800); }}
                                        onMouseEnter={() => setHoveredMix(mix.id)}
                                        onMouseLeave={() => setHoveredMix(null)}
                                        className={clsx(
                                            "p-2.5 rounded-xl cursor-pointer transition-all duration-300 relative overflow-hidden",
                                            "bg-white/60 backdrop-blur-md border shadow-sm",
                                            isActive
                                                ? "border-[#00aaff]/60 shadow-[0_4px_20px_rgba(0,170,255,0.25)] ring-2 ring-[#00aaff]/30"
                                                : "border-white/80 hover:bg-white/90 hover:border-[#00aaff]/30"
                                        )}
                                    >
                                        <div className="h-20 w-full rounded-lg mb-2 relative overflow-hidden bg-gradient-to-tr from-slate-200 to-slate-100 border border-white/40 shadow-inner">
                                            {albumArt ? (
                                                <img
                                                    src={albumArt}
                                                    alt={mix.title}
                                                    className="w-full h-full object-cover"
                                                    draggable={false}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#cde0ec] to-[#9cb8cc]">
                                                    <Disc3 size={24} className="text-white/60" />
                                                </div>
                                            )}

                                            {/* Micro-Reel Simulation on Thumbnail */}
                                            <div className="absolute inset-0 bg-black/25 flex items-center justify-around px-4 pointer-events-none">
                                                <div className="size-5 rounded-full border border-white/60 bg-white/20 backdrop-blur-xs flex items-center justify-center">
                                                    <div className="size-1.5 rounded-full bg-white" />
                                                </div>
                                                <div className="size-5 rounded-full border border-white/60 bg-white/20 backdrop-blur-xs flex items-center justify-center">
                                                    <div className="size-1.5 rounded-full bg-white" />
                                                </div>
                                            </div>

                                            {isActive && (
                                                <span className="absolute bottom-1.5 left-1.5 bg-[#00aaff] text-white text-[8px] font-mono font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider">
                                                    PLAYING
                                                </span>
                                            )}

                                            {hoveredMix === mix.id && !isActive && (
                                                <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center gap-1.5 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); onEditMix?.(mix); }} className="size-6 rounded-full bg-white text-slate-800 flex items-center justify-center hover:scale-110 shadow" title="Edit"><Pencil size={11} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onSnapshotMix?.(mix); }} className="size-6 rounded-full bg-white text-slate-800 flex items-center justify-center hover:scale-110 shadow" title="Snapshot"><Camera size={11} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onShareMix?.(mix); }} className="size-6 rounded-full bg-white text-slate-800 flex items-center justify-center hover:scale-110 shadow" title="Share"><Share2 size={11} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); onOpenSearch?.(mix.id); }} className="size-6 rounded-full bg-white text-slate-800 flex items-center justify-center hover:scale-110 shadow" title="Add Tracks"><Search size={11} /></button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between px-1">
                                            <p className="text-xs font-mono font-bold text-slate-800 truncate">{mix.title}</p>
                                            <span className="text-[9px] font-mono text-slate-500 font-semibold">{mix.songs.length} T</span>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/60">
                        <button
                            onClick={onCreateMix}
                            className="w-full py-2.5 bg-gradient-to-r from-[#00aaff] to-[#0088cc] text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl shadow-[0_4px_16px_rgba(0,170,255,0.35)] flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all"
                        >
                            <Plus size={14} /> NEW FROST TAPE
                        </button>
                    </div>
                </aside>

                {/* Main Cryogenic Audio Chamber */}
                <section className="flex-1 p-6 md:p-10 flex flex-col items-center justify-center relative overflow-hidden min-h-0">
                    {/* Atmospheric Cryo-Glow Aura */}
                    <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#00aaff]/10 rounded-full blur-[140px] pointer-events-none" />
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-slate-300/30 rounded-full blur-[100px] pointer-events-none" />

                    {/* Stage Header */}
                    <div className="text-center mb-6 z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 backdrop-blur-md border border-white/90 rounded-full text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-[#0088cc] mb-2 shadow-xs">
                            <Activity size={11} className="text-[#00aaff] animate-pulse" />
                            OPTICAL TRANSDUCER ACTIVE // CH-1
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">
                            {isLoaded ? (currentSong ? decodeHtml(currentSong.name) : activeMix?.title) : 'MOUNT CASSETTE TO PLAY'}
                        </h1>
                        <p className="text-slate-500 font-mono text-[11px] tracking-widest uppercase">
                            {isLoaded && currentSong?.primaryArtists ? decodeHtml(currentSong.primaryArtists) : 'CRYOGENIC SPECTRAL ANALYSIS READY'}
                        </p>
                    </div>

                    {/* Luxury Frosted Acrylic Player Enclosure */}
                    <motion.div
                        drag
                        dragMomentum={true}
                        dragElastic={0.1}
                        className="w-full max-w-[720px] bg-gradient-to-b from-white/75 via-white/50 to-white/40 backdrop-blur-2xl border border-white/80 rounded-3xl p-6 relative z-10 shadow-[0_30px_70px_rgba(0,170,255,0.12),inset_0_1px_2px_rgba(255,255,255,0.9)] cursor-grab active:cursor-grabbing overflow-hidden"
                    >
                        {/* Screws */}
                        <div className="absolute top-3.5 left-3.5 size-2 rounded-full border border-slate-300 bg-white/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] bg-[#00aaff]" /></div>
                        <div className="absolute top-3.5 right-3.5 size-2 rounded-full border border-slate-300 bg-white/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] -rotate-45 bg-[#00aaff]" /></div>
                        <div className="absolute bottom-3.5 left-3.5 size-2 rounded-full border border-slate-300 bg-white/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] rotate-30 bg-[#00aaff]" /></div>
                        <div className="absolute bottom-3.5 right-3.5 size-2 rounded-full border border-slate-300 bg-white/80 flex items-center justify-center opacity-60"><div className="w-1 h-[0.5px] -rotate-60 bg-[#00aaff]" /></div>

                        {/* Top Frost Glare */}
                        <div className="absolute -top-10 -left-10 w-60 h-60 bg-gradient-to-br from-white/60 to-transparent rounded-full blur-2xl pointer-events-none" />

                        <div className="flex flex-col lg:flex-row gap-6 items-stretch relative z-10">
                            {/* Dual Spool Cassette Bay with Dynamic Tape Pack Physics */}
                            <div className="flex-1 bg-gradient-to-b from-[#0f141c] to-[#080b0f] rounded-2xl p-5 relative min-h-[220px] flex flex-col justify-between border border-white/20 shadow-[inset_0_8px_24px_rgba(0,0,0,0.8)] overflow-hidden">
                                {/* Ice Blue Halo Backlight */}
                                <div className={clsx(
                                    "absolute inset-0 pointer-events-none transition-opacity duration-700",
                                    isPlaying ? "opacity-100" : "opacity-35",
                                    "bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,170,255,0.2)_0%,transparent_70%)]"
                                )} />

                                {/* Top Bay Label */}
                                <div className="flex justify-between items-center z-10">
                                    <div className="flex items-center gap-1.5">
                                        <span className={clsx("size-2 rounded-full", isPlaying ? "bg-[#00aaff] shadow-[0_0_8px_rgba(0,170,255,0.8)]" : "bg-slate-700")} />
                                        <span className="font-mono text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                            QUALIA CRYSTAL DRIVE
                                        </span>
                                    </div>
                                    <span className="font-mono text-[8px] text-[#00aaff] tracking-wider uppercase font-semibold">
                                        DUAL CAPSTAN
                                    </span>
                                </div>

                                {/* Physical Dual Spool Mechanism */}
                                <div className="flex items-center justify-between px-6 my-auto z-10 relative">
                                    {/* Left Feed Spool */}
                                    <div className="relative flex items-center justify-center">
                                        {/* Dynamic Oxide Tape Pack */}
                                        <div
                                            className="rounded-full absolute transition-all duration-300"
                                            style={{
                                                width: `${leftTapeRadius * 2}px`,
                                                height: `${leftTapeRadius * 2}px`,
                                                background: "radial-gradient(circle, #332014 30%, #160e08 90%)",
                                                boxShadow: "0 0 8px rgba(0,0,0,0.9)"
                                            }}
                                        />
                                        {/* Precision Cryo-Spool */}
                                        <motion.div
                                            animate={isPlaying ? { rotate: 360 } : {}}
                                            transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                            className="size-16 rounded-full border-2 border-white/60 bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center relative shadow-lg"
                                        >
                                            <div className="absolute inset-1 rounded-full border border-dashed border-[#00aaff]/40" />
                                            <div className="size-4 rounded-full border border-[#00aaff] bg-slate-900 flex items-center justify-center">
                                                <div className="size-1.5 rounded-full bg-[#00aaff] shadow-[0_0_6px_rgba(0,170,255,0.8)]" />
                                            </div>
                                        </motion.div>
                                    </div>

                                    {/* Center Tape Bridge & Head Assembly */}
                                    <div className="flex flex-col items-center justify-center opacity-80">
                                        <div className="w-16 h-1 bg-[#00aaff]/80 rounded-full mb-1 shadow-[0_0_6px_rgba(0,170,255,0.6)]" />
                                        <span className="font-mono text-[7px] text-slate-400 tracking-widest uppercase">
                                            AMORPHOUS HEAD
                                        </span>
                                    </div>

                                    {/* Right Take-Up Spool */}
                                    <div className="relative flex items-center justify-center">
                                        {/* Dynamic Oxide Tape Pack */}
                                        <div
                                            className="rounded-full absolute transition-all duration-300"
                                            style={{
                                                width: `${rightTapeRadius * 2}px`,
                                                height: `${rightTapeRadius * 2}px`,
                                                background: "radial-gradient(circle, #332014 30%, #160e08 90%)",
                                                boxShadow: "0 0 8px rgba(0,0,0,0.9)"
                                            }}
                                        />
                                        {/* Precision Cryo-Spool */}
                                        <motion.div
                                            animate={isPlaying ? { rotate: 360 } : {}}
                                            transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
                                            className="size-16 rounded-full border-2 border-white/60 bg-gradient-to-tr from-slate-800 to-slate-700 flex items-center justify-center relative shadow-lg"
                                        >
                                            <div className="absolute inset-1 rounded-full border border-dashed border-[#00aaff]/40" />
                                            <div className="size-4 rounded-full border border-[#00aaff] bg-slate-900 flex items-center justify-center">
                                                <div className="size-1.5 rounded-full bg-[#00aaff] shadow-[0_0_6px_rgba(0,170,255,0.8)]" />
                                            </div>
                                        </motion.div>
                                    </div>
                                </div>

                                {/* HUD Overlay Footer */}
                                <div className="flex justify-between items-end z-10 pt-2 border-t border-white/10">
                                    <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-white/10">
                                        <p className="text-[8px] text-[#00aaff] font-mono font-bold uppercase tracking-wider">AUDIO ENGINE</p>
                                        {activeQuality ? <QualityBadge quality={activeQuality} variant="mini" /> : <p className="text-xs text-white font-mono">DSD-MASTER</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-mono font-black text-white leading-none">
                                            {formatTime(Math.max(0, safeDuration - (safeProgress * safeDuration)))}
                                        </p>
                                        <p className="text-[8px] text-slate-400 font-mono uppercase tracking-wider">REMAINING</p>
                                    </div>
                                </div>
                            </div>

                            {/* Controls Column */}
                            <div className="w-full lg:w-60 flex flex-col justify-between gap-3">
                                {/* Real-time Acoustic Spectrum Visualizer */}
                                <div className="bg-[#0b0e14] rounded-xl p-2.5 h-20 flex flex-col justify-between border border-white/20 shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <span className="font-mono text-[7px] font-bold text-[#00aaff] uppercase tracking-wider">SPECTRUM FLUX</span>
                                        <span className="font-mono text-[7px] text-slate-400">96 kHz / 24-BIT</span>
                                    </div>
                                    <div className="h-10 w-full overflow-hidden">
                                        {isLoaded ? (
                                            <Visualizer isPlaying={isPlaying} accentColor="#00aaff" className="w-full h-full opacity-90" />
                                        ) : (
                                            <div className="w-full h-0.5 bg-slate-800 my-auto" />
                                        )}
                                    </div>
                                </div>

                                {/* Tactile Machined Transport Buttons */}
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => { playClick(); prev(); }}
                                        className="bg-white/80 border border-white aspect-square rounded-xl flex items-center justify-center hover:bg-white transition-all shadow-xs active:scale-95"
                                        title="Previous"
                                    >
                                        <SkipBack size={18} className="text-slate-700" />
                                    </button>

                                    {/* Master Cyan Play Button */}
                                    <button
                                        onClick={() => { playClick(); togglePlay(); }}
                                        className="bg-gradient-to-b from-[#00aaff] to-[#0088cc] aspect-square rounded-xl flex items-center justify-center shadow-[0_4px_16px_rgba(0,170,255,0.4)] text-white hover:brightness-105 active:scale-95 transition-all"
                                        title={isPlaying ? "Pause" : "Play"}
                                    >
                                        {isPlaying ? <Pause size={22} /> : <Play size={22} className="pl-0.5" />}
                                    </button>

                                    <button
                                        onClick={() => { playClick(); next(); }}
                                        className="bg-white/80 border border-white aspect-square rounded-xl flex items-center justify-center hover:bg-white transition-all shadow-xs active:scale-95"
                                        title="Next"
                                    >
                                        <SkipForward size={18} className="text-slate-700" />
                                    </button>
                                </div>

                                {/* Master Gain Control */}
                                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-2.5 border border-white/80 flex flex-col gap-1 shadow-xs">
                                    <div className="flex justify-between text-[9px] font-mono font-bold text-slate-600 uppercase">
                                        <span>GAIN ATTENUATOR</span>
                                        <span className="text-[#0088cc]">{Math.round(volume * 100)}%</span>
                                    </div>
                                    <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-sky-400 to-[#00aaff] rounded-full" style={{ width: `${volume * 100}%` }} />
                                        <input
                                            type="range" min="0" max="1" step="0.05" value={volume}
                                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                                            className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                            title={`Volume: ${Math.round(volume * 100)}%`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* High-Precision Progress Timeline */}
                        <div className="mt-5 pt-3.5 border-t border-slate-200/80">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-mono font-bold text-slate-600 w-12">{formatTime(safeProgress * safeDuration)}</span>
                                <div
                                    className="flex-1 h-2 bg-slate-200/90 rounded-full relative cursor-pointer overflow-hidden p-0.5"
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        seek(Math.min(Math.max(p, 0), 1));
                                    }}
                                >
                                    <div
                                        className="h-full bg-[#00aaff] rounded-full shadow-[0_0_8px_rgba(0,170,255,0.7)] transition-all"
                                        style={{ width: `${Math.min(safeProgress * 100, 100)}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-600 w-12 text-right">{formatTime(safeDuration)}</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Laboratory Status Telemetry */}
                    <div className="mt-6 w-full max-w-[720px] grid grid-cols-2 md:grid-cols-4 gap-3 z-10">
                        {[
                            { label: 'OUTPUT DENSITY', value: '384 kHz / 32-BIT' },
                            { label: 'THERMAL STATUS', value: 'CRYOGENIC 14°K' },
                            { label: 'OPTICAL BUFFER', value: 'FLUX COMPENSATED' },
                            { label: 'HARMONIC THD', value: '< 0.00018%' },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/60 backdrop-blur-md border border-white/80 p-2.5 rounded-xl flex flex-col gap-0.5 shadow-xs">
                                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-slate-500">{item.label}</span>
                                <span className="text-[11px] font-mono font-black uppercase text-slate-800">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="h-12 bg-white/70 backdrop-blur-xl border-t border-white/60 flex items-center justify-between px-8 z-50 shrink-0">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => { playClick(); setShuffle(!shuffle); }}
                        className={clsx(
                            "flex items-center gap-1.5 transition-colors font-mono text-xs uppercase tracking-wider font-semibold",
                            shuffle ? 'text-[#00aaff]' : 'text-slate-600 hover:text-[#00aaff]'
                        )}
                        title={shuffle ? 'Shuffle: ON' : 'Shuffle: OFF'}
                    >
                        <Shuffle size={14} />
                        <span>Shuffle</span>
                    </button>
                    <button
                        onClick={() => { playClick(); setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off'); }}
                        className={clsx(
                            "flex items-center gap-1.5 transition-colors font-mono text-xs uppercase tracking-wider font-semibold",
                            repeat !== 'off' ? 'text-[#00aaff]' : 'text-slate-600 hover:text-[#00aaff]'
                        )}
                        title={`Repeat: ${repeat.toUpperCase()}`}
                    >
                        <Repeat size={14} />
                        <span>Repeat{repeat === 'one' ? ' 1' : ''}</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {isLoaded && (
                        <button
                            onClick={() => { playEject(); loadMix(""); }}
                            className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-500 hover:text-red-500 transition-colors uppercase tracking-widest"
                        >
                            <LogOut size={12} /> Eject
                        </button>
                    )}
                    <span className="font-mono text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {isLoaded ? `NOW STREAMING: ${currentSong ? decodeHtml(currentSong.name) : activeMix?.title}` : 'LABORATORY SYSTEM STANDBY'}
                    </span>
                </div>
            </footer>

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
        </div>
    );
}
