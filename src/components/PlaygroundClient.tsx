"use client";

import dynamic from 'next/dynamic';
import { SmoljiMark } from './SmoljiMark';

const StudioApp = dynamic(() => import('../App'), {
  ssr: false,
  loading: () => (
    <main className="w-screen min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#EDE7DC] dark:bg-[#161513] text-[#1B1917] dark:text-[#F4EFE6] font-sans p-6">
      <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-2xl bg-[#FDFBF7] dark:bg-[#1F1D1A] border border-[#C7BEB1] dark:border-[#49433B] shadow-sm min-w-64 text-center">
        <div className="flex items-center gap-2.5">
          <SmoljiMark className="w-8 h-8 shrink-0" decorative />
          <span className="font-display text-lg font-extrabold tracking-tight">Smolji</span>
        </div>
        <p className="text-xs text-[#5B534B] dark:text-[#B8AFA4] font-mono">
          Preparing 512×512 artboard...
        </p>
        <progress
          aria-label="Loading sticker workbench"
          className="w-full h-1.5 rounded-full overflow-hidden accent-[#C23E1A]"
        />
      </div>
    </main>
  ),
});

export default function PlaygroundClient() {
  return <StudioApp />;
}
