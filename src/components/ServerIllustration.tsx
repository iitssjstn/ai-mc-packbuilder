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
    <div className="relative flex items-center justify-center py-6 lg:py-0">
      <div className="flex items-center gap-3">
        {/* Floating feature chips */}
        <div className="hidden flex-col gap-3 sm:flex">
          {CHIPS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 border border-emerald-500/40 bg-base-900 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg"
            >
              <Icon size={14} className="text-emerald-400" />
              {label}
            </div>
          ))}
        </div>

        <div className="relative h-56 w-56 shrink-0 sm:h-64 sm:w-64">
          <Image
            src="/images/hero-island.png"
            alt="Voxel-stijl eiland met huisje, waterval en portal — illustratie van een gegenereerd serverpack"
            fill
            className="object-contain drop-shadow-2xl"
          />
        </div>

        {/* Floating checklist card */}
        <div className="hidden flex-col gap-1.5 border border-base-700 bg-base-900 px-3 py-3 text-xs shadow-lg sm:flex">
          {CHECKLIST.map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-slate-300">
              <CheckCircle2 size={13} className="shrink-0 text-emerald-400" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Speech-bubble callout */}
      <div className="absolute -top-2 right-2 flex items-center gap-1.5 border border-emerald-500/40 bg-base-900 px-3 py-2 text-xs font-medium text-slate-200 shadow-lg sm:right-6">
        <Sparkles size={13} className="text-emerald-400" />
        /build my server
      </div>
    </div>
  );
}
