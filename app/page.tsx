"use client";

import { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

const DeckMode = dynamic(() => import("@/components/desktop/deck/scenes/stage").then(mod => mod.WindowsStage), {
  ssr: false,
  loading: () => <SplashScreen text="LOADING DECK STUDIO..." />
});

import { SetupWizard } from "@/components/shared/SetupWizard";

export type UIMode = 'WELCOME' | 'STUDIO';

export default function Home() {
  const [mode, setMode] = useState<UIMode | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isSetupDone = localStorage.getItem('melora-deck-setup-complete') === 'true';
    if (isSetupDone) {
      setMode('STUDIO');
    } else {
      setMode('WELCOME');
    }
  }, []);

  if (!mounted || !mode) return <SplashScreen text="INITIALIZING..." />;

  // Render ONLY Deck Studio or Welcome
  return (
    <main className="w-full h-full bg-black overflow-hidden relative">
      <ErrorBoundary>
        <Suspense fallback={<SplashScreen text="LOADING..." />}>
          {mode === 'WELCOME' && (
            <SetupWizard
              onComplete={() => {
                localStorage.setItem('melora-deck-setup-complete', 'true');
                setMode('STUDIO');
              }}
            />
          )}

          {mode === 'STUDIO' && (
            <DeckMode onSwitchToMobile={() => {}} />
          )}
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
