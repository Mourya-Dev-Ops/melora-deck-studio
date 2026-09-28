"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Disc, Play } from "lucide-react";
import { usePlayback, useLibrary, Mix } from "@/components/providers/playback-context";
import { searchUnified } from "@/lib/unified-search";
import { PlayableTrack } from "@/lib/types";
import { decodeHtml } from "@/lib/utils";
import { CDRow } from "@/components/shared/CDRow";
import { PlaylistStore, Playlist } from "@/lib/playlist-store";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

interface GlassSearchProps {
    onClose?: () => void;
    initialQuery?: string;
    onSongSelect?: (track: PlayableTrack) => void;
    desktopMode?: boolean;
}

/* -------------------------------------------------------------------------- */
/*                                  COMPONENT                                 */
/* -------------------------------------------------------------------------- */

export function GlassSearch({ onClose, initialQuery = "", onSongSelect, desktopMode = true }: GlassSearchProps) {
    const { playInstantMix, activeMixId } = usePlayback();
    const { mixes, updateMix } = useLibrary();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<PlayableTrack[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [addingToTrackId, setAddingToTrackId] = useState<string | null>(null);

    // Playlist Selection State
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState<{ x: number, y: number, track: PlayableTrack } | null>(null);

    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Load Playlists
    useEffect(() => {
        setPlaylists(PlaylistStore.getPlaylists());
        const handleUpdate = () => setPlaylists(PlaylistStore.getPlaylists());
        window.addEventListener('melora-playlists-update', handleUpdate);
        return () => window.removeEventListener('melora-playlists-update', handleUpdate);
    }, []);

    // --- SEARCH LOGIC ---
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (!query.trim()) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                const searchResults = await searchUnified(query, 'song');
                setResults(searchResults);
            } catch (e) {
                console.error("Search failed:", e);
            } finally {
                setIsLoading(false);
            }
        }, 500); // Debounce 500ms

        return () => clearTimeout(timeoutId);
    }, [query]);


    // --- PLAYBACK ---
    const handlePlay = useCallback((track: PlayableTrack) => {
        if (onSongSelect) {
            onSongSelect(track);
            return;
        }

        // Create Instant Mix
        const mix: Mix = {
            id: `search-instant-${track.id}`,
            title: decodeHtml(track.title),
            color: 'blue',
            songs: [track],
            currentSongIndex: 0
        };

        // Queue subsequent results
        const index = results.findIndex(r => r.id === track.id);
        if (index !== -1) {
            mix.songs = results;
            mix.currentSongIndex = index;
        }

        playInstantMix(mix);
    }, [onSongSelect, playInstantMix, results]);


    const [trackToAdd, setTrackToAdd] = useState<PlayableTrack | null>(null);

    const handleAddAction = useCallback((e: React.MouseEvent, track: PlayableTrack) => {
        e.stopPropagation();
        setTrackToAdd(track);
    }, []);

    const addToTape = useCallback((mix: Mix) => {
        if (!trackToAdd) return;
        updateMix(mix.id, { songs: [...mix.songs, trackToAdd] });
        showToast(`Added to "${mix.title}"`, 'success');
        setTrackToAdd(null);
    }, [trackToAdd, updateMix]);


    // --- KEYBOARD SHORTCUTS ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && onClose) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);


    return (
        <div className="w-full h-full flex flex-col relative overflow-hidden bg-black/50 backdrop-blur-sm">

            {/* CLOSE BUTTON (Top Right) */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-8 right-8 z-50 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all shadow-lg backdrop-blur-md"
                >
                    <X size={24} />
                </button>
            )}

            {/* 1. HEADER: SEARCH PILL - REDUCED PADDING */}
            <div className="relative z-20 pt-6 pb-2 px-6 flex justify-center">
                <div className="relative group w-full max-w-2xl perspective-1000">
                    {/* GLOW BEHIND */}
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-6 py-4 shadow-2xl hover:bg-white/10 transition-colors">
                        <Search className="text-white/40 mr-4" size={24} />
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search the Universe..."
                            className="flex-1 bg-transparent border-none text-xl font-medium text-white placeholder:text-white/20 focus:outline-none focus:ring-0 tracking-wide"
                        />
                        {query && (
                            <button onClick={() => setQuery("")} className="absolute right-4 p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. RESULTS LIST */}
            <div className="flex-1 overflow-y-auto px-4 pb-32 no-scrollbar">
                <div className="w-full max-w-3xl mx-auto space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                            <span className="text-xs uppercase tracking-[0.2em] font-medium">Scanning...</span>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((track, i) => (
                            <motion.div
                                key={track.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                                className="transform-gpu"
                            >
                                <CDRow
                                    track={track}
                                    onPlay={() => handlePlay(track)}
                                    onAdd={(e) => handleAddAction(e!, track)}
                                />
                            </motion.div>
                        ))
                    ) : query && (
                        <div className="text-center py-20 opacity-30">
                            <p className="text-lg">No signals found in deep space.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- TAPE SELECTOR MODAL --- */}
            <AnimatePresence>
                {trackToAdd && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md"
                        onClick={() => setTrackToAdd(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm max-h-[80vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-white">Add to Tape</h3>
                                <button onClick={() => setTrackToAdd(null)} className="p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-white/50 mb-4 truncate">Selecting tape for: {decodeHtml(trackToAdd.title)}</p>
                            <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar pr-2">
                                {mixes.filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id)).length > 0 ? (
                                    mixes.filter(m => m.pinned && !['search-results', 'quick-play', 'otg-tape', 'discovery-mix'].includes(m.id)).map(mix => (
                                        <button
                                            key={mix.id}
                                            onClick={() => addToTape(mix)}
                                            className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-colors text-left"
                                        >
                                            <span className="font-medium text-white text-sm truncate">{mix.title}</span>
                                            <span className="text-xs text-white/40">{mix.songs.length} songs</span>
                                        </button>
                                    ))
                                ) : (
                                    <p className="text-center text-white/40 text-sm py-4">No custom tapes available.</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- TOAST NOTIFICATION --- */}
            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-3"
                    >
                        <div className={`w-3 h-3 rounded-full ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-sm font-medium text-white">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
}
