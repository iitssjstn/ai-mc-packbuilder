import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Sparkles,
  ArrowRight,
  FolderOpen,
  CheckCircle2,
  MessageSquare,
  Settings,
  User,
  Box,
  Package,
  Shield,
  Users,
} from "lucide-react";
import { getSessionUser } from "@/lib/session";
import { Panel } from "@/components/ui";
import { ServerIllustration } from "@/components/ServerIllustration";

const TRUST_ITEMS = ["Gratis te proberen", "Geen hosting nodig", "Paper & Purpur", "Eigen branding"];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "01 · AI Builder",
    text: "Beschrijf je server in gewone taal. De AI zet dat om in een gestructureerd plan — jij houdt de controle voordat er iets gegenereerd wordt.",
  },
  {
    icon: Settings,
    title: "02 · Compatibiliteit",
    text: "Elke plugin wordt gecontroleerd op Minecraft-versie, server software, dependencies en conflicten voordat 'ie in je pack terechtkomt.",
  },
  {
    icon: User,
    title: "03 · Eigen branding",
    text: "Servernaam, logo, Discord/Twitch-links — verwerkt in de MOTD, README en configuratie van je pack.",
  },
];

const STATS = [
  { icon: Zap, label: "Snel", sub: "Binnen enkele minuten" },
  { icon: Package, label: "Volledig pack", sub: "Plugins + configs + branding" },
  { icon: Shield, label: "Veilig", sub: "Compatibiliteitschecks" },
  { icon: Users, label: "Voor iedereen", sub: "Van SMP tot netwerk" },
];

export default function HomePage() {
  const user = getSessionUser();
  const primaryHref = user ? "/builder" : "/login?redirect=/builder";
  const primaryLabel = user ? "Ga naar de AI Builder" : "Aan de slag";

  return (
    <div className="space-y-10">
      {/* Hero — NOT a card: no border, no rounded corners, no background
          color of its own. The background image breaks out to full
          viewport width (independent of the 1400px content container);
          the actual content sits in its own centered wrapper on top. */}
      <section className="relative left-1/2 w-screen -translate-x-1/2">
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image src="/images/hero-bg.png" alt="" fill priority className="object-cover object-center" />
        </div>

        <div className="relative z-10 mx-auto max-w-[1400px] px-8 py-14 sm:px-12">
          <div className="grid gap-4 lg:grid-cols-[11fr_9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs tracking-widest text-emerald-400">
              <Zap size={13} />
              AI-POWERED
            </span>

            <h1 className="mt-3 text-[52px] font-bold leading-[1.05] tracking-tight">
              Vertel wat je wilt.
              <br />
              <span className="whitespace-nowrap text-emerald-400">Wij bouwen je server.</span>
            </h1>

            <p className="mt-3 max-w-xl text-slate-400">
              AI-gestuurde Minecraft Java-serverpakketten — plugins, configuratie
              en branding automatisch samengesteld op basis van een simpel
              gesprek. Geen hosting: downloaden en zelf starten.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
              >
                <Sparkles size={16} />
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={user ? "/packs" : "/login?redirect=/packs"}
                className="flex items-center gap-2 rounded-md border border-base-600 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-base-800"
              >
                <FolderOpen size={16} />
                {user ? "Mijn Serverpacks" : "Inloggen"}
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ServerIllustration />
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <Panel key={title}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
              <Icon size={17} />
            </span>
            <h3 className="mt-3 font-mono text-sm text-emerald-400">{title}</h3>
            <p className="mt-2 text-sm text-slate-400">{text}</p>
          </Panel>
        ))}
      </section>

      {/* Bottom CTA banner */}
      <section className="flex flex-col gap-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            <Box size={20} />
          </span>
          <div>
            <p className="font-semibold text-emerald-400">Van idee naar server — in minuten.</p>
            <p className="text-sm text-slate-400">Focus op je community. Laat de AI het zware werk doen.</p>
          </div>
        </div>
        <Link
          href={primaryHref}
          className="flex shrink-0 items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
        >
          Begin nu gratis
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* Stats row */}
      <section className="grid gap-6 border-t border-base-700 pt-8 sm:grid-cols-4">
        {STATS.map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon size={18} className="text-emerald-400" />
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
