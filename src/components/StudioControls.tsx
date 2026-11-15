"use client";

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  badge?: string;
}

interface StudioSelectProps<T extends string | number> {
  id?: string;
  ariaLabel?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placement?: 'bottom' | 'top';
}

/**
 * Custom architectural dropdown select replacing native browser <select>.
 */
export function StudioSelect<T extends string | number>({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  placement = 'bottom',
}: StudioSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const listboxId = `${id ?? generatedId}-listbox`;

  const selected = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full min-h-9 flex items-center justify-between gap-2 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border bg-[#FDFBF7] dark:bg-[#1F1D1A] text-[#1B1917] dark:text-[#F4EFE6] ${
          open
            ? 'border-[#C23E1A] dark:border-[#F06A43] ring-2 ring-[#C23E1A]/20 dark:ring-[#F06A43]/25'
            : 'border-[#8F8578] dark:border-[#756C61] hover:border-[#5B534B] dark:hover:border-[#9E958A]'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <span className="truncate">{selected?.label}</span>
          {selected?.badge && (
            <span className="shrink-0 text-[0.6875rem] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-[#EDE7DC] dark:bg-[#292622] text-[#5B534B] dark:text-[#B8AFA4]">
              {selected.badge}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 shrink-0 text-[#5B534B] dark:text-[#B8AFA4] transition-transform duration-150 ${
            open ? 'rotate-180 text-[#B93815] dark:text-[#F06A43]' : ''
          }`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 z-50 rounded-xl border border-[#8F8578] dark:border-[#756C61] bg-[#FDFBF7] dark:bg-[#1F1D1A] shadow-xl p-1 max-h-56 overflow-y-auto ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full min-h-8 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-[#C23E1A]/12 dark:bg-[#F06A43]/15 text-[#B93815] dark:text-[#F06A43] font-semibold'
                    : 'text-[#1B1917] dark:text-[#E7E0D5] hover:bg-[#EDE7DC] dark:hover:bg-[#292622]'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className="shrink-0 text-[0.6875rem] font-mono px-1.5 py-0.5 rounded bg-[#EDE7DC] dark:bg-[#292622] text-[#5B534B] dark:text-[#B8AFA4]">
                      {opt.badge}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-[#B93815] dark:text-[#F06A43]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface StudioSliderProps {
  label: string;
  valueDisplay: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onReset?: () => void;
  className?: string;
}

/**
 * Custom range slider with active vermilion track and clickable value badge reset.
 */
export function StudioSlider({
  label,
  valueDisplay,
  min,
  max,
  step = 1,
  value,
  onChange,
  onReset,
  className = '',
}: StudioSliderProps) {
  const clamped = Math.max(min, Math.min(max, value));
  const percent = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-[#5B534B] dark:text-[#B8AFA4] font-medium">{label}</span>
        <button
          type="button"
          onDoubleClick={onReset}
          onClick={onReset}
          title={onReset ? 'Click to reset' : undefined}
          disabled={!onReset}
          className={`font-mono font-semibold px-1.5 py-0.5 rounded-md text-[0.6875rem] tabular-nums bg-[#EDE7DC] dark:bg-[#292622] border border-[#8F8578] dark:border-[#756C61] text-[#B93815] dark:text-[#F06A43] ${
            onReset ? 'hover:border-[#C23E1A] dark:hover:border-[#F06A43] cursor-pointer' : 'cursor-default'
          }`}
        >
          {valueDisplay}
        </button>
      </div>
      <div className="relative h-6 flex items-center">
        <div className="w-full h-1.5 rounded-full bg-[#DFD7CA] dark:bg-[#332E28] overflow-hidden pointer-events-none">
          <div
            className="h-full rounded-full bg-[#C23E1A] dark:bg-[#F06A43] transition-[width] duration-75"
            style={{ width: `${percent}%` }}
          />
        </div>
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="studio-range absolute inset-0 w-full h-full opacity-100 bg-transparent appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
}

interface StudioColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}

const DEFAULT_COLOR_PRESETS = ['#1C1917', '#FDFBF7', '#C23E1A', '#2D6A4F', '#2563EB', '#10b981'];

/**
 * Custom color picker with ink swatch button, curated swatches, and editable hex input.
 */
export function StudioColorPicker({
  label = 'Solid Color',
  value,
  onChange,
  presets = DEFAULT_COLOR_PRESETS,
}: StudioColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-3 rounded-xl bg-[#EDE7DC]/70 dark:bg-[#292622]/75 border border-[#C7BEB1] dark:border-[#4D463E] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#5B534B] dark:text-[#B8AFA4]">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Choose custom color"
            aria-label="Open color picker"
            className="w-7 h-7 rounded-lg border-2 border-[#FDFBF7] dark:border-[#1F1D1A] shadow-sm ring-1 ring-[#8F8578] dark:ring-[#756C61] cursor-pointer transition-transform hover:scale-105 shrink-0"
            style={{ backgroundColor: value, forcedColorAdjust: 'none' }}
          />
          <input
            ref={inputRef}
            type="color"
            aria-label="Color picker input"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#1C1917'}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <input
            type="text"
            aria-label="Hex color code"
            value={value.toUpperCase()}
            onChange={(e) => {
              const next = e.target.value.trim();
              if (/^#[0-9a-fA-F]{0,6}$/.test(next)) {
                onChange(next);
              }
            }}
            onBlur={() => {
              if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
                onChange('#1C1917');
              }
            }}
            maxLength={7}
            className="w-22 min-h-8 bg-[#FDFBF7] dark:bg-[#161513] border border-[#8F8578] dark:border-[#756C61] focus:border-[#C23E1A] dark:focus:border-[#F06A43] rounded-lg px-2 py-1 text-xs font-mono text-[#1B1917] dark:text-[#F4EFE6] uppercase"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-1.5">
        {presets.map((preset) => {
          const isActive = value.toLowerCase() === preset.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              title={preset}
              aria-label={`Select color ${preset}`}
              aria-pressed={isActive}
              className={`flex-1 min-h-6 rounded-md border transition-all cursor-pointer flex items-center justify-center ${
                isActive
                  ? 'border-[#1B1917] dark:border-[#F4EFE6] ring-2 ring-[#C23E1A] dark:ring-[#F06A43] scale-105'
                  : 'border-[#8F8578] dark:border-[#756C61] hover:scale-105'
              }`}
              style={{ backgroundColor: preset, forcedColorAdjust: 'none' }}
            >
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-white ring-1 ring-black/40" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
