"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EMOJI_STYLES, GRADIENTS, getEmojiUrl } from '../utils/emoji';

const SPECIMEN_EMOJIS = ['🚀', '🔥', '🫶', '🦋', '💎', '🥑'];

const SPECIMEN_STYLE_IDS = [
  'microsoft-3D-fluent',
  'google',
  'twitter',
  'openmoji',
  'apple',
  'serenityos',
] as const;

const STYLE_LICENSES: Record<string, string> = {
  'microsoft-3D-fluent': 'MIT Open License',
  google: 'Apache 2.0 / OFL',
  twitter: 'MIT Open License',
  openmoji: 'CC BY-SA 4.0',
  apple: 'Personal Reference',
  serenityos: 'BSD-2-Clause',
};

const FINISH_PRESETS = [
  { name: GRADIENTS[1].name, value: GRADIENTS[1].value, dotClass: 'bg-[#C23E1A]' },
  { name: GRADIENTS[4].name, value: GRADIENTS[4].value, dotClass: 'bg-[#2D6A4F]' },
  { name: GRADIENTS[3].name, value: GRADIENTS[3].value, dotClass: 'bg-[#FB923C]' },
  { name: GRADIENTS[6].name, value: GRADIENTS[6].value, dotClass: 'bg-[#292524]' },
  { name: 'Transparent', value: 'transparent', dotClass: 'bg-[#E2DBD0] dark:bg-[#2B2824]' },
];

const CUT_OPTIONS = [
  { label: 'Die-Cut', value: 25 },
  { label: 'Square', value: 0 },
  { label: 'Circle', value: 50 },
];

/**
 * Interactive printmaker proof sheet letting visitors inspect live emoji families and finishes before entering /playground.
 */
export function LandingSpecimen() {
  const [emoji, setEmoji] = useState('🚀');
  const [styleId, setStyleId] = useState<string>('microsoft-3D-fluent');
  const [finishIndex, setFinishIndex] = useState(0);
  const [radiusPct, setRadiusPct] = useState(25);
  const [failedKeys, setFailedKeys] = useState<Record<string, boolean>>({});

  const activeStyle = EMOJI_STYLES.find((s) => s.id === styleId) ?? EMOJI_STYLES[2];
  const activeFinish = FINISH_PRESETS[finishIndex] ?? FINISH_PRESETS[0];
  const imageKey = `${styleId}:${emoji}`;
  const hasFailed = Boolean(failedKeys[imageKey]);

  return (
    <aside
      aria-label="Interactive Sticker Specimen Proof"
      className="relative rounded-3xl bg-[#FDFBF7] dark:bg-[#1F1D1A] border border-[#C7BEB1] dark:border-[#49433B] p-5 sm:p-6 shadow-md"
    >
      {/* Printmaker registration header */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#D8D0C3] dark:border-[#3A352F]">
        <span className="font-mono text-xs uppercase tracking-wider text-[#5B534B] dark:text-[#B8AFA4]">
          Proof Sheet · 512×512
        </span>
        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-[#EDE7DC] dark:bg-[#292622] text-[#B93815] dark:text-[#F06A43] font-semibold">
          {STYLE_LICENSES[styleId] ?? 'Reference'}
        </span>
      </div>

      {/* Live cropped artboard stage */}
      <div className="relative my-5 py-6 px-4 rounded-2xl bg-[#EDE7DC] dark:bg-[#161513] border border-[#D8D0C3] dark:border-[#3A352F] flex items-center justify-center paper-grid-bg">
        {/* Corner registration ticks */}
        <span aria-hidden="true" className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-[#8F8578] dark:border-[#756C61]" />
        <span aria-hidden="true" className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-[#8F8578] dark:border-[#756C61]" />
        <span aria-hidden="true" className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-[#8F8578] dark:border-[#756C61]" />
        <span aria-hidden="true" className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-[#8F8578] dark:border-[#756C61]" />

        <div
          className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center shadow-lg border border-[#1B1917]/15 dark:border-[#F4EFE6]/15 transition-all duration-200 overflow-hidden"
          style={{
            borderRadius: `${radiusPct}%`,
            background:
              activeFinish.value === 'transparent'
                ? 'repeating-conic-gradient(#d8d0c3 0% 25%, #fdfbf7 0% 50%) 50% / 20px 20px'
                : activeFinish.value,
          }}
        >
          {hasFailed ? (
            <span className="text-7xl select-none leading-none" role="img" aria-label={emoji}>
              {emoji}
            </span>
          ) : (
            <img
              src={getEmojiUrl(emoji, styleId)}
              alt={`${emoji} rendered in ${activeStyle.name} sticker style`}
              width={128}
              height={128}
              fetchPriority="high"
              onError={() => setFailedKeys((prev) => ({ ...prev, [imageKey]: true }))}
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-[0_12px_18px_rgba(27,25,23,0.35)] select-none"
            />
          )}
        </div>
      </div>

      {/* Controls stack */}
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#5B534B] dark:text-[#B8AFA4]">Stamp</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Sample emojis">
            {SPECIMEN_EMOJIS.map((item) => {
              const isSelected = emoji === item;
              return (
                <button
                  key={item}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setEmoji(item)}
                  className={`min-w-9 min-h-9 rounded-lg border text-lg flex items-center justify-center transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#C23E1A] dark:border-[#F06A43] bg-[#C23E1A]/10 dark:bg-[#F06A43]/15'
                      : 'border-[#C7BEB1] dark:border-[#49433B] bg-[#FDFBF7] dark:bg-[#161513] hover:border-[#8F8578]'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-semibold text-[#5B534B] dark:text-[#B8AFA4] block">
            Visual Style
          </span>
          <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Preview emoji styles">
            {SPECIMEN_STYLE_IDS.map((id) => {
              const style = EMOJI_STYLES.find((s) => s.id === id);
              if (!style) return null;
              const isSelected = styleId === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setStyleId(id)}
                  className={`min-h-9 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer truncate ${
                    isSelected
                      ? 'bg-[#C23E1A] text-white border-[#C23E1A]'
                      : 'bg-[#EDE7DC]/70 dark:bg-[#292622] border-[#C7BEB1] dark:border-[#49433B] text-[#1B1917] dark:text-[#E7E0D5] hover:border-[#8F8578]'
                  }`}
                >
                  {style.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5" role="group" aria-label="Artboard finish presets">
            <span className="text-xs font-semibold text-[#5B534B] dark:text-[#B8AFA4] mr-1">Finish</span>
            {FINISH_PRESETS.map((preset, idx) => {
              const isSelected = finishIndex === idx;
              return (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.name}
                  aria-label={`Finish: ${preset.name}`}
                  aria-pressed={isSelected}
                  onClick={() => setFinishIndex(idx)}
                  style={{ forcedColorAdjust: 'none' }}
                  className={`min-w-7 min-h-7 rounded-full border transition-transform cursor-pointer flex items-center justify-center ${
                    preset.dotClass
                  } ${
                    isSelected
                      ? 'border-[#1B1917] dark:border-[#F4EFE6] ring-2 ring-[#C23E1A] dark:ring-[#F06A43] scale-110'
                      : 'border-[#8F8578] dark:border-[#756C61] hover:scale-105'
                  }`}
                />
              );
            })}
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Corner cut radius">
            {CUT_OPTIONS.map((cut) => {
              const isSelected = radiusPct === cut.value;
              return (
                <button
                  key={cut.label}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setRadiusPct(cut.value)}
                  className={`min-h-7 px-2 py-1 rounded-lg border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#C23E1A] dark:border-[#F06A43] bg-[#C23E1A]/10 dark:bg-[#F06A43]/15 text-[#B93815] dark:text-[#F06A43]'
                      : 'border-[#C7BEB1] dark:border-[#49433B] text-[#5B534B] dark:text-[#B8AFA4] hover:text-[#1B1917] dark:hover:text-[#F4EFE6]'
                  }`}
                >
                  {cut.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-3 border-t border-[#D8D0C3] dark:border-[#3A352F] flex items-center justify-between gap-3">
          <span className="text-xs text-[#5B534B] dark:text-[#B8AFA4]">
            Want multi-layer stacking &amp; 1024px export?
          </span>
          <Link
            href="/playground"
            className="inline-flex items-center gap-1.5 shrink-0 text-xs font-bold text-[#B93815] dark:text-[#F06A43] hover:underline"
          >
            <span>Open in Playground</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
