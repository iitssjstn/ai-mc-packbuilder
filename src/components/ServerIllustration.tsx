import Image from "next/image";
import { Puzzle, Settings, Paintbrush, Box, Sparkles, CheckCircle2 } from "lucide-react";

const CHIPS = [
  { icon: Puzzle, label: "Plugins" },
  { icon: Settings, label: "Configuratie" },
  { icon: Paintbrush, label: "Branding" },
  { icon: Box, label: "Server pack" },
];

const CHECKLIST = ["Klaar om te downloaden", "Geoptimaliseerd", "Compatibiliteitscheck", "Jouw wensen, onze AI"];

/**
 * Chips/checklist/callout are absolutely positioned over the island
 * (not laid out as separate flex columns) — that's both what the
 * reference actually shows (they overlap the island's edges) and the
 * only way to let the island itself be large without the labels eating
 * into the same width budget and getting clipped.
 */
export function ServerIllustration() {
  return (
    <div className="relative mx-auto h-[365px] w-full max-w-[400px]">
      {/* Glow burst behind the island */}
      <Image
        src="/images/hero-island-glow.png"
        alt=""
        fill
        className="pointer-events-none scale-125 object-contain opacity-70"
      />
      {/* Island — large, centered, transparent background, no frame */}
      <Image
        src="/images/hero-island.png"
        alt="Voxel-stijl eiland met huisje, waterval en portal — illustratie van een gegenereerd serverpack"
        fill
        className="relative object-contain drop-shadow-2xl"
      />

      {/* Floating feature chips — left edge, overlapping the island */}
      <div className="absolute left-0 top-[12%] hidden flex-col gap-2 sm:flex">
        {CHIPS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500/40 bg-base-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg"
          >
            <Icon size={12} className="shrink-0 text-emerald-400" />
            {label}
          </div>
        ))}
      </div>

      {/* Floating checklist card — right edge, overlapping the island */}
      <div className="absolute bottom-[10%] right-0 hidden flex-col gap-1 rounded-md border border-base-700 bg-base-900/90 px-2.5 py-2.5 text-[11px] leading-tight shadow-lg sm:flex">
        {CHECKLIST.map((item) => (
          <div key={item} className="flex items-center gap-1.5 whitespace-nowrap text-slate-300">
            <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
            {item}
          </div>
        ))}
      </div>

      {/* Speech-bubble callout — top right */}
      <div className="absolute right-2 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500/40 bg-base-900/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg">
        <Sparkles size={12} className="text-emerald-400" />
        /build my server
      </div>
    </div>
  );
}
