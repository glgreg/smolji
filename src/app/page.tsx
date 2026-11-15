import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  Download,
  Layers,
  ShieldCheck,
  Sparkles,
  Stamp,
} from 'lucide-react';
import { EMOJI_STYLES, getEmojiUrl } from '../utils/emoji';
import { SiteHeader } from '../components/SiteHeader';
import { LandingSpecimen } from '../components/LandingSpecimen';
import { SmoljiMark } from '../components/SmoljiMark';

const STYLE_LICENSES: Record<string, { label: string; open: boolean }> = {
  apple: { label: 'Personal Reference', open: false },
  google: { label: 'Apache 2.0 / OFL', open: true },
  'microsoft-3D-fluent': { label: 'MIT Open License', open: true },
  twitter: { label: 'MIT Open License', open: true },
  openmoji: { label: 'CC BY-SA 4.0', open: true },
  'toss-face': { label: 'Apache 2.0', open: true },
  whatsapp: { label: 'Personal Reference', open: false },
  facebook: { label: 'Personal Reference', open: false },
  'animated-noto-color-emoji': { label: 'Apache 2.0', open: true },
  telegram: { label: 'Open Attribution', open: true },
  serenityos: { label: 'BSD-2-Clause', open: true },
};

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Collect & Paste',
    detail:
      'Type Discord-style :shortcodes: like :rocket: or :fire:, search keywords across the full gemoji index, or paste multi-emoji strings straight from your clipboard.',
    note: 'Supports ZWJ sequences & flags',
  },
  {
    step: '02',
    title: 'Layer & Transform',
    detail:
      'Mix glyphs from multiple emoji sets on one 512×512 artboard. Scale, rotate from the canvas handle, skew along X/Y, flip, toggle visibility, and dial in drop shadows.',
    note: 'Full Ctrl+Z / Ctrl+Y undo history',
  },
  {
    step: '03',
    title: 'Cut & Export',
    detail:
      'Pick invisible transparency, solid ink, or risograph gradients with 0%–100% die-cut corner radii. Export 128px to 1024px PNGs, copy to clipboard, or bundle all 11 styles into a ZIP.',
    note: 'Zero server uploads required',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Do I need an account or login to open the Playground?',
    answer:
      'No. Smolji opens straight into the canvas studio with zero sign-up, zero waitlists, and zero watermarks. Just open the playground and start stacking layers.',
  },
  {
    question: 'Which emoji sets are licensed for commercial sticker packs?',
    answer:
      'Microsoft Fluent 3D (MIT), Twitter Twemoji (MIT), Google Noto Color (Apache 2.0 / OFL), Toss Face (Apache 2.0), SerenityOS (BSD-2-Clause), and OpenMoji (CC BY-SA 4.0 with attribution) permit derivative commercial creations. Proprietary sets such as Apple, WhatsApp, and Facebook are included strictly for personal or educational reference.',
  },
  {
    question: 'Can I size stickers for Discord, Slack, and Telegram?',
    answer:
      'Yes. Set the artboard background to Invisible for clean transparency, switch corner rounding between 0% and 100%, and export directly at 128px, 256px, 512px, or 1024px—or bundle every foundry style into one ZIP download.',
  },
  {
    question: 'Where do my compositions and optional upload keys live?',
    answer:
      'Everything renders locally inside your browser using 2D Canvas. Your designs never leave your machine unless you opt in to browser-side ImgBB or Imgur uploads using your own keys stored only in localStorage.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#F6F2EA] dark:bg-[#161513] text-[#1B1917] dark:text-[#F4EFE6]">
      <a href="#main-content" className="skip-link visually-hidden">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main-content" className="flex-1">
        {/* Hero Print Desk */}
        <section
          aria-labelledby="main-heading"
          className="relative border-b border-[#D8D0C3] dark:border-[#3A352F] paper-grid-bg"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C7BEB1] dark:border-[#49433B] bg-[#FDFBF7] dark:bg-[#1F1D1A] text-xs font-mono font-semibold text-[#B93815] dark:text-[#F06A43]">
                <Stamp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Printmaker&apos;s Stamp Foundry · Zero Login</span>
              </div>

              <h1
                id="main-heading"
                tabIndex={-1}
                className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.05] text-[#1B1917] dark:text-[#F4EFE6]"
              >
                Layer emojis into sharp{' '}
                <span className="text-[#B93815] dark:text-[#F06A43]">PNG stickers</span> right on your
                desk.
              </h1>

              <p className="prose-pretty max-w-[60ch] text-base sm:text-lg text-[#5B534B] dark:text-[#B8AFA4] leading-relaxed">
                Compose multi-layer stickers across eleven emoji foundries, adjust tilt, skew, corner
                cuts, and ink shadows on a 512×512 artboard, and export crisp assets in one click.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/playground"
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-2xl bg-[#C23E1A] hover:bg-[#A83314] text-white font-bold text-sm sm:text-base shadow-sm transition-colors"
                >
                  <span>Open Playground</span>
                  <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
                </Link>
                <a
                  href="#styles"
                  className="inline-flex items-center justify-center gap-2 min-h-12 px-5 py-3 rounded-2xl border border-[#8F8578] dark:border-[#756C61] bg-[#FDFBF7] dark:bg-[#1F1D1A] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] text-[#1B1917] dark:text-[#F4EFE6] font-semibold text-sm sm:text-base transition-colors"
                >
                  <span>Inspect 11 Foundry Styles</span>
                </a>
              </div>

              {/* Grounded factual press specs */}
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#D8D0C3] dark:border-[#3A352F]">
                <div>
                  <dt className="font-mono text-xs uppercase tracking-wider text-[#5B534B] dark:text-[#B8AFA4]">
                    Access
                  </dt>
                  <dd className="font-display text-lg font-bold text-[#1B1917] dark:text-[#F4EFE6] mt-0.5">
                    Instant / No Auth
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-wider text-[#5B534B] dark:text-[#B8AFA4]">
                    Output Sizes
                  </dt>
                  <dd className="font-display text-lg font-bold text-[#1B1917] dark:text-[#F4EFE6] mt-0.5">
                    128px to 1024px PNG
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-xs uppercase tracking-wider text-[#5B534B] dark:text-[#B8AFA4]">
                    Batch Export
                  </dt>
                  <dd className="font-display text-lg font-bold text-[#1B1917] dark:text-[#F4EFE6] mt-0.5">
                    11-Style ZIP Bundle
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-5">
              <LandingSpecimen />
            </div>
          </div>
        </section>

        {/* Section 01: Specimen Foundry Catalog */}
        <section
          id="styles"
          aria-labelledby="styles-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#D8D0C3] dark:border-[#3A352F]">
            <div className="space-y-2">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#B93815] dark:text-[#F06A43]">
                01 / Specimen Catalog
              </span>
              <h2
                id="styles-heading"
                className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1917] dark:text-[#F4EFE6]"
              >
                One character, eleven foundries
              </h2>
              <p className="prose-pretty max-w-[62ch] text-sm sm:text-base text-[#5B534B] dark:text-[#B8AFA4]">
                Every emoji layer renders independently—pair a 3D Fluent foreground with an OpenMoji
                badge or pixel-art SerenityOS accent inside the same sticker.
              </p>
            </div>
            <Link
              href="/playground"
              className="inline-flex items-center gap-1.5 min-h-10 px-4 py-2 rounded-xl border border-[#8F8578] dark:border-[#756C61] bg-[#FDFBF7] dark:bg-[#1F1D1A] hover:border-[#C23E1A] dark:hover:border-[#F06A43] text-xs sm:text-sm font-bold text-[#1B1917] dark:text-[#F4EFE6] shrink-0 transition-colors self-start md:self-auto"
            >
              <span>Mix Styles in Playground</span>
              <ArrowRight className="w-4 h-4 text-[#B93815] dark:text-[#F06A43]" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-8">
            {EMOJI_STYLES.map((style) => {
              const license = STYLE_LICENSES[style.id] ?? {
                label: 'Reference',
                open: false,
              };
              return (
                <article
                  key={style.id}
                  className="specimen-reveal rounded-2xl border border-[#C7BEB1] dark:border-[#49433B] bg-[#FDFBF7] dark:bg-[#1F1D1A] p-4 flex flex-col justify-between gap-4 hover:border-[#8F8578] dark:hover:border-[#756C61] transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`font-mono text-[0.6875rem] font-semibold px-2 py-0.5 rounded-md ${
                          license.open
                            ? 'bg-[#EDE7DC] dark:bg-[#292622] text-[#2D6A4F] dark:text-[#74C69D]'
                            : 'bg-[#EDE7DC] dark:bg-[#292622] text-[#5B534B] dark:text-[#B8AFA4]'
                        }`}
                      >
                        {license.label}
                      </span>
                      <span className="font-mono text-[0.6875rem] font-semibold text-[#5B534B] dark:text-[#B8AFA4]">
                        {style.format}
                      </span>
                    </div>

                    <div className="flex items-center gap-3.5 pt-1">
                      <div className="w-14 h-14 rounded-xl bg-[#EDE7DC] dark:bg-[#292622] border border-[#D8D0C3] dark:border-[#3A352F] flex items-center justify-center shrink-0">
                        <img
                          src={getEmojiUrl('🚀', style.id)}
                          alt={`${style.name} specimen of rocket emoji`}
                          width={44}
                          height={44}
                          loading="lazy"
                          className="w-11 h-11 object-contain"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-base font-bold text-[#1B1917] dark:text-[#F4EFE6] truncate">
                          {style.name}
                        </h3>
                        <p className="text-xs text-[#5B534B] dark:text-[#B8AFA4] leading-snug mt-0.5">
                          {style.desc}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-[#D8D0C3] dark:border-[#3A352F] flex items-center justify-between">
                    <span className="font-mono text-[0.6875rem] text-[#5B534B] dark:text-[#B8AFA4] truncate">
                      {style.id}
                    </span>
                    <Link
                      href="/playground"
                      className="inline-flex items-center gap-1 min-h-7 px-2 py-1 rounded-lg text-xs font-bold text-[#B93815] dark:text-[#F06A43] hover:bg-[#EDE7DC] dark:hover:bg-[#292622] transition-colors shrink-0"
                    >
                      <span>Use style</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Section 02: Three-Pass Print Workflow */}
        <section
          id="workflow"
          aria-labelledby="workflow-heading"
          className="border-y border-[#D8D0C3] dark:border-[#3A352F] bg-[#EDE7DC]/60 dark:bg-[#1B1917]"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20">
            <div className="space-y-2 max-w-[60ch]">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#B93815] dark:text-[#F06A43]">
                02 / Bench Workflow
              </span>
              <h2
                id="workflow-heading"
                className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1917] dark:text-[#F4EFE6]"
              >
                From shortcode to trimmed pack in three passes
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-8">
              {WORKFLOW_STEPS.map((item, idx) => (
                <article
                  key={item.step}
                  className="specimen-reveal rounded-2xl border border-[#C7BEB1] dark:border-[#49433B] bg-[#FDFBF7] dark:bg-[#1F1D1A] p-6 flex flex-col justify-between gap-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold px-2.5 py-1 rounded-lg bg-[#EDE7DC] dark:bg-[#292622] text-[#B93815] dark:text-[#F06A43]">
                        PASS {item.step}
                      </span>
                      {idx === 0 && (
                        <Sparkles className="w-4 h-4 text-[#5B534B] dark:text-[#B8AFA4]" aria-hidden="true" />
                      )}
                      {idx === 1 && (
                        <Layers className="w-4 h-4 text-[#5B534B] dark:text-[#B8AFA4]" aria-hidden="true" />
                      )}
                      {idx === 2 && (
                        <Download className="w-4 h-4 text-[#5B534B] dark:text-[#B8AFA4]" aria-hidden="true" />
                      )}
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#1B1917] dark:text-[#F4EFE6]">
                      {item.title}
                    </h3>
                    <p className="prose-pretty text-sm text-[#5B534B] dark:text-[#B8AFA4] leading-relaxed">
                      {item.detail}
                    </p>
                  </div>

                  <p className="font-mono text-xs text-[#5B534B] dark:text-[#B8AFA4] pt-3 border-t border-[#D8D0C3] dark:border-[#3A352F]">
                    {item.note}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Section 03: FAQ + Closing Direct Playground CTA */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 space-y-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-3">
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#B93815] dark:text-[#F06A43]">
                03 / Practical Details
              </span>
              <h2
                id="faq-heading"
                className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1B1917] dark:text-[#F4EFE6]"
              >
                Common questions before you export
              </h2>
              <p className="prose-pretty text-sm sm:text-base text-[#5B534B] dark:text-[#B8AFA4]">
                Transparent answers on licensing, Discord/Telegram readiness, and client-side privacy.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-[#5B534B] dark:text-[#B8AFA4]">
                <ShieldCheck className="w-4 h-4 text-[#B93815] dark:text-[#F06A43] shrink-0" aria-hidden="true" />
                <span>Opens MIT-licensed Microsoft Fluent 3D by default.</span>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.question}
                  className="faq-item rounded-2xl border border-[#C7BEB1] dark:border-[#49433B] bg-[#FDFBF7] dark:bg-[#1F1D1A] px-5 py-4"
                >
                  <summary className="flex items-center gap-3 cursor-pointer text-sm sm:text-base font-bold text-[#1B1917] dark:text-[#F4EFE6] select-none">
                    <ChevronRight
                      className="faq-chevron w-4 h-4 text-[#B93815] dark:text-[#F06A43] shrink-0"
                      aria-hidden="true"
                    />
                    <span>{item.question}</span>
                  </summary>
                  <p className="prose-pretty mt-3 pl-7 text-sm text-[#5B534B] dark:text-[#B8AFA4] leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>

          {/* Closing Print Bench CTA Card */}
          <div className="rounded-3xl bg-[#1B1917] dark:bg-[#24211D] border border-[#3A352F] text-[#F4EFE6] p-7 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
            <div className="flex items-start gap-4 max-w-[54ch]">
              <SmoljiMark className="w-11 h-11 shrink-0 mt-0.5" decorative />
              <div className="space-y-1.5">
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F4EFE6]">
                  Step straight onto the cutting mat.
                </h2>
                <p className="prose-pretty text-sm sm:text-base text-[#C8BFB3]">
                  Zero accounts, zero paywalls—launch the interactive studio and export your first
                  transparent sticker pack in under a minute.
                </p>
              </div>
            </div>
            <Link
              href="/playground"
              className="inline-flex items-center justify-center gap-2 min-h-12 px-6 py-3 rounded-2xl bg-[#C23E1A] hover:bg-[#A83314] text-white font-bold text-sm sm:text-base shadow-sm shrink-0 transition-colors"
            >
              <span>Enter Playground</span>
              <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#D8D0C3] dark:border-[#3A352F] bg-[#EDE7DC]/55 dark:bg-[#161513] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#5B534B] dark:text-[#B8AFA4]">
          <div className="flex items-center gap-2.5">
            <SmoljiMark className="w-6 h-6 shrink-0" decorative />
            <span className="font-display font-bold text-sm text-[#1B1917] dark:text-[#F4EFE6]">
              Smolji
            </span>
            <span>· Browser-local sticker composition utility</span>
          </div>

          <p className="prose-pretty max-w-[68ch]">
            Emoji artworks belong to their creators: Microsoft Fluent (MIT), Google Noto Color
            (Apache 2.0 / OFL), Twitter Twemoji (MIT), OpenMoji (CC BY-SA 4.0), and proprietary
            vendor designs retained for personal reference.
          </p>

          <div className="flex items-center gap-4 shrink-0 font-semibold">
            <Link href="/" className="hover:text-[#1B1917] dark:hover:text-[#F4EFE6] min-h-6 inline-flex items-center">
              Home
            </Link>
            <Link
              href="/playground"
              className="text-[#B93815] dark:text-[#F06A43] hover:underline min-h-6 inline-flex items-center"
            >
              Playground
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
