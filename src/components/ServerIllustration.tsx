import Image from "next/image";
import { Puzzle, Settings, Paintbrush, Box, Sparkles, CheckCircle2 } from "lucide-react";

const CHIPS = [
  { icon: Puzzle, label: "Plugins" },
  { icon: Settings, label: "Configuratie" },
  { icon: Paintbrush, label: "Branding" },
  { icon: Box, label: "Server pack" },
];

const CHECKLIST = ["Klaar om te downloaden", "Geoptimaliseerd", "Compatibiliteitscheck", "Jouw wensen, onze AI"];

export function ServerIllustration() {
  return (
    <div className="relative flex items-center justify-center py-4 lg:py-0">
      <div className="flex items-center gap-2">
        {/* Floating feature chips */}
        <div className="hidden flex-col gap-2 sm:flex">
          {CHIPS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500/40 bg-base-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg"
            >
              <Icon size={12} className="shrink-0 text-emerald-400" />
              {label}
            </div>
          ))}
        </div>

        <div className="relative h-[300px] w-[300px] shrink-0 sm:h-[360px] sm:w-[360px]">
          <Image
            src="/images/hero-island-glow.png"
            alt=""
            fill
            className="pointer-events-none scale-150 object-contain opacity-70"
          />
          <Image
            src="/images/hero-island.png"
            alt="Voxel-stijl eiland met huisje, waterval en portal — illustratie van een gegenereerd serverpack"
            fill
            className="relative object-contain drop-shadow-2xl"
          />
        </div>

        {/* Floating checklist card */}
        <div className="hidden flex-col gap-1 rounded-md border border-base-700 bg-base-900 px-2.5 py-2.5 text-[11px] leading-tight shadow-lg sm:flex">
          {CHECKLIST.map((item) => (
            <div key={item} className="flex items-center gap-1.5 whitespace-nowrap text-slate-300">
              <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Speech-bubble callout */}
      <div className="absolute -top-1 right-0 flex items-center gap-1.5 whitespace-nowrap rounded-md border border-emerald-500/40 bg-base-900 px-2.5 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg">
        <Sparkles size={12} className="text-emerald-400" />
        /build my server
      </div>
    </div>
  );
}
