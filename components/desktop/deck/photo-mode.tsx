"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, Maximize2, Minimize2, Mic2 } from "lucide-react";
import { JioSaavnSong } from "@/lib/jiosaavn";
import { get, set } from "idb-keyval";
import { LyricsView } from "@/components/ui/lyrics-view";
import { useAudioProgress } from "@/hooks/use-audio-progress";
import { usePlayback } from "@/components/providers/playback-context";

interface PhotoModeProps {
    isOpen: boolean;
    onClose: () => void;
    currentSong: JioSaavnSong | null;
    isPlaying: boolean;
    className?: string;
    showCloseButton?: boolean;
    onPlayPause?: () => void;
    onNext?: () => void;
    onPrev?: () => void;
}

const DEFAULT_HERO_IMAGES = [
    "/hero-images/hero1.png",
    "/hero-images/hero2.jpg",
    "/hero-images/hero3.jpg",
    "/hero-images/hero4.jpg",
    "/hero-images/hero5.jpg",
];

const DB_KEY = "melora-photo-mode-images";

type LyricsSize = 'hidden' | 'small' | 'medium' | 'large';

export function PhotoModeDesktop({
    isOpen,
    onClose,
    currentSong,
    isPlaying,
    className,
    showCloseButton = false,
}: PhotoModeProps) {
    const [images, setImages] = useState<string[]>(DEFAULT_HERO_IMAGES);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Lyrics State
    const [lyricsSize, setLyricsSize] = useState<LyricsSize>('medium');
    const { progress } = useAudioProgress();
    const { duration } = usePlayback();
    
    // Assuming duration is needed but LyricsView can get it from context.
    const [currentTime, setCurrentTime] = useState(0);
    
    // Simple mock for currentTime, we can use useAudioProgress hook.
    // Assuming useAudioProgress is available or we use a ref.
    
    useEffect(() => {
        // Load custom images
        get<string[]>(DB_KEY).then(val => {
            if (val && val.length > 0) {
                setImages(val);
            }
        });
    }, []);

    // Slideshow effect
    useEffect(() => {
        if (!isOpen || images.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % images.length);
        }, 8000);

        return () => clearInterval(interval);
    }, [isOpen, images]);

    if (!isOpen) return null;

    const decodeHtmlEntities = (text: string) => {
        return text
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const newImages: string[] = [];
        let loadedCount = 0;

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    newImages.push(ev.target.result as string);
                }
                loadedCount++;
                if (loadedCount === files.length) {
                    const updatedImages = images === DEFAULT_HERO_IMAGES ? [...newImages] : [...images, ...newImages];
                    setImages(updatedImages);
                    set(DB_KEY, updatedImages).catch(err => console.error("Failed to save images to IDB", err));
                    setCurrentImageIndex(updatedImages.length - newImages.length); // jump to first new
                }
            };
            reader.readAsDataURL(file);
        });
        
        e.target.value = "";
    };

    const handleDeleteCurrent = () => {
        if (images === DEFAULT_HERO_IMAGES) return; // Cannot delete default images

        const updated = images.filter((_, i) => i !== currentImageIndex);
        if (updated.length === 0) {
            setImages(DEFAULT_HERO_IMAGES);
            set(DB_KEY, []).catch(console.error);
            setCurrentImageIndex(0);
        } else {
            setImages(updated);
            set(DB_KEY, updated).catch(console.error);
            setCurrentImageIndex((prev) => (prev >= updated.length ? 0 : prev));
        }
    };

    const cycleLyricsSize = () => {
        const sizes: LyricsSize[] = ['hidden', 'small', 'medium', 'large'];
        setLyricsSize(prev => sizes[(sizes.indexOf(prev) + 1) % sizes.length]);
    };

    const getLyricsClassName = () => {
        switch (lyricsSize) {
            case 'small': return "absolute bottom-12 right-12 w-96 h-96 z-40 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl transition-all duration-500";
            case 'medium': return "absolute top-0 bottom-0 right-0 w-1/2 z-40 flex flex-col items-center justify-center p-8 bg-black/50 backdrop-blur-lg overflow-hidden border-l border-white/10 shadow-2xl transition-all duration-500";
            case 'large': return "absolute inset-0 z-40 flex flex-col items-center justify-center p-12 bg-black/70 backdrop-blur-xl overflow-hidden transition-all duration-500";
            default: return "hidden";
        }
    };

    // Calculate actual time if duration is known. For LyricsView, it needs currentTime in seconds.
    // We can assume duration is passed, but actually LyricsView inside uses `usePlayback` for seek, but it requires `currentTime` as prop.
    // Let's grab duration from window or just pass 0 if we don't have it, wait... we don't have duration in props.
    // I'll grab duration from usePlayback.

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`bg-black flex flex-col overflow-hidden ${className || 'fixed inset-0 z-[100]'}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Background Slideshow */}
            <div className="absolute inset-0 overflow-hidden">
                <AnimatePresence mode="popLayout">
                    <motion.img
                        key={currentImageIndex}
                        src={images[currentImageIndex]}
                        alt="Background"
                        className="absolute inset-0 w-full h-full object-cover"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: "easeInOut" }}
                    />
                </AnimatePresence>
            </div>

            {/* Lyrics View */}
            <AnimatePresence>
                {lyricsSize !== 'hidden' && (
                    <LyricsView 
                        currentSong={currentSong || undefined} 
                        currentTime={progress * duration}
                        onClose={() => setLyricsSize('hidden')} 
                        className={getLyricsClassName()}
                        transparentBg={true}
                    />
                )}
            </AnimatePresence>

            {/* UI Overlay */}
            <AnimatePresence>
                {isHovering && (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 pointer-events-none"
                    >
                        {/* Top Toolbar */}
                        <div className="absolute top-8 left-8 z-50 flex gap-4 pointer-events-auto">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all border border-white/20 shadow-xl"
                                title="Upload Photos"
                            >
                                <Upload size={20} />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                accept="image/*" 
                                onChange={handleFileUpload} 
                            />

                            {images !== DEFAULT_HERO_IMAGES && (
                                <button
                                    onClick={handleDeleteCurrent}
                                    className="p-3 bg-red-500/40 hover:bg-red-500/60 backdrop-blur-md rounded-full text-white transition-all border border-red-500/20 shadow-xl"
                                    title="Delete Current Photo"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}

                            <button
                                onClick={cycleLyricsSize}
                                className="p-3 bg-blue-500/40 hover:bg-blue-500/60 backdrop-blur-md rounded-full text-white transition-all border border-blue-500/20 shadow-xl"
                                title="Toggle Lyrics Size"
                            >
                                <Mic2 size={20} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Container (Bottom Text & Close) */}
            <div className="relative z-[60] flex-1 flex flex-col p-12 pointer-events-none">
                {/* Close Button */}
                {showCloseButton && (
                    <div className="absolute top-8 right-8 pointer-events-auto">
                        <button
                            onClick={onClose}
                            className="p-3 bg-white/10 hover:bg-white/20 hover:scale-110 backdrop-blur-md rounded-full text-white transition-all border border-white/10 shadow-2xl group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                )}

                {/* Song Info at bottom */}
                <div className="flex-1 flex flex-col justify-end pb-12">
                    {currentSong && lyricsSize !== 'large' && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            key={currentSong.id}
                            className="max-w-3xl pointer-events-auto"
                        >
                            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                                {decodeHtmlEntities(currentSong.name)}
                            </h1>
                            <p className="text-lg md:text-2xl text-white/80 font-medium drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                {decodeHtmlEntities(currentSong.primaryArtists)}
                            </p>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
