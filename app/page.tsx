"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const DeckMode = dynamic(() => import("@/components/desktop/deck/scenes/stage").then(mod => mod.WindowsStage), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING DECK STUDIO..." />
});

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <SplashScreen text="INITIALIZING..." />;

  // Render ONLY Deck Studio
  return (
    <main className="w-full h-full bg-black overflow-hidden relative">
      <ErrorBoundary>
        <Suspense fallback={<SplashScreen text="LOADING..." />}>
          <DeckMode onSwitchToMobile={() => {}} />
        </Suspense>
      </ErrorBoundary>
    </main>
  );
}

function SplashScreen({ text }: { text: string }) {
  return (
    <div className="fixed inset-0 bg-black text-zinc-500 flex items-center justify-center font-mono text-xs tracking-[0.2em] animate-pulse">
      {text}
    </div>
  );
}
