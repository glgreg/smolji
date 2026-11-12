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
 * Custom glassmorphic dropdown select replacing native browser <select>.
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
        className={`w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all cursor-pointer border bg-zinc-50/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-100 ${
          open
            ? 'border-yellow-500 ring-2 ring-yellow-500/20'
            : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <span className="truncate">{selected?.label}</span>
          {selected?.badge && (
            <span className="shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {selected.badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-zinc-500 transition-transform duration-200 ${
            open ? 'rotate-180 text-yellow-500' : ''
          }`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={`absolute left-0 right-0 z-50 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-2xl p-1 max-h-52 overflow-y-auto ${
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
                className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 font-semibold'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className="shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400">
                      {opt.badge}
                    </span>
                  )}
                </span>
                {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-yellow-500" />}
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
 * Custom range slider with active progress track and styled thumb replacing browser defaults.
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
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-zinc-600 dark:text-zinc-400 font-medium">{label}</span>
        <button
          type="button"
          onDoubleClick={onReset}
          onClick={onReset}
          title={onReset ? 'Click to reset' : undefined}
          disabled={!onReset}
          className={`font-mono font-semibold px-1.5 py-0.5 rounded-md text-[11px] tabular-nums bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-yellow-600 dark:text-yellow-400 ${
            onReset ? 'hover:border-yellow-500/50 cursor-pointer' : 'cursor-default'
          }`}
        >
          {valueDisplay}
        </button>
      </div>
      <div className="relative h-5 flex items-center">
        <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden pointer-events-none">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-[width] duration-75"
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
          className="studio-range absolute inset-0 w-full h-full opacity-100 bg-transparent appearance-none cursor-pointer focus:outline-none"
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

const DEFAULT_COLOR_PRESETS = ['#12131a', '#ffffff', '#eab308', '#3b82f6', '#ec4899', '#10b981'];

/**
 * Custom color picker with swatch button, quick presets, and editable hex field.
 */
export function StudioColorPicker({
  label = 'Solid Color',
  value,
  onChange,
  presets = DEFAULT_COLOR_PRESETS,
}: StudioColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Choose custom color"
            aria-label="Open color picker"
            className="w-6 h-6 rounded-lg border-2 border-white dark:border-zinc-700 shadow-sm ring-1 ring-zinc-300 dark:ring-zinc-700 cursor-pointer transition-transform hover:scale-105 shrink-0"
            style={{ backgroundColor: value }}
          />
          <input
            ref={inputRef}
            type="color"
            aria-label="Color picker input"
            value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#12131a'}
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
                onChange('#12131a');
              }
            }}
            maxLength={7}
            className="w-20 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-yellow-500 focus:outline-none rounded-lg px-2 py-1 text-[11px] font-mono text-zinc-800 dark:text-zinc-200 uppercase"
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
              className={`flex-1 h-5 rounded-md border transition-all cursor-pointer ${
                isActive
                  ? 'border-yellow-500 ring-2 ring-yellow-500/30 scale-105'
                  : 'border-zinc-300/80 dark:border-zinc-700/80 hover:scale-105'
              }`}
              style={{ backgroundColor: preset }}
            />
          );
        })}
      </div>
    </div>
  );
}
