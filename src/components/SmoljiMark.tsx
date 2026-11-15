import React from 'react';

interface SmoljiMarkProps {
  className?: string;
  decorative?: boolean;
  label?: string;
}

/**
 * Handcrafted risograph-inspired sticker logo mark with a folded peel corner.
 */
export function SmoljiMark({
  className = 'w-9 h-9',
  decorative = true,
  label = 'Smolji',
}: SmoljiMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
    >
      {!decorative && <title>{label}</title>}
      {/* Outer sticker card silhouette with dog-eared bottom-right corner */}
      <path
        d="M10 4H30C33.3137 4 36 6.68629 36 10V24.5L24.5 36H10C6.68629 36 4 33.3137 4 30V10C4 6.68629 6.68629 4 10 4Z"
        className="fill-[#FDFBF7] dark:fill-[#26231F] stroke-[#1B1917] dark:stroke-[#F4EFE6]"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Vermilion ink folded corner peel */}
      <path
        d="M24.5 36V28.5C24.5 26.2909 26.2909 24.5 28.5 24.5H36L24.5 36Z"
        className="fill-[#C23E1A] dark:fill-[#E66037] stroke-[#1B1917] dark:stroke-[#F4EFE6]"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Stamp eye marks (left wink + crisp dot) */}
      <circle cx="14.5" cy="16" r="2" className="fill-[#1B1917] dark:fill-[#F4EFE6]" />
      <path
        d="M22.5 16C23.4 14.8 25.1 14.8 26 16"
        className="stroke-[#1B1917] dark:stroke-[#F4EFE6]"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Tactile stamp smile in vermilion */}
      <path
        d="M14 21.8C15.8 24.4 20.6 24.8 23.2 22.1"
        className="stroke-[#C23E1A] dark:stroke-[#F06A43]"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
