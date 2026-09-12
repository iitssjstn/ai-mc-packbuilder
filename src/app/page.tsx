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

const TRUST_ITEMS = ["Free to try", "No hosting needed", "Paper & Purpur", "Custom branding"];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "01 · AI Builder",
    text: "Describe your server in plain language. The AI turns that into a structured plan — you stay in control before anything gets generated.",
  },
  {
    icon: Settings,
    title: "02 · Compatibility",
    text: "Every plugin is checked against the Minecraft version, server software, dependencies, and conflicts before it ends up in your pack.",
  },
  {
    icon: User,
    title: "03 · Custom Branding",
    text: "Server name, logo, Discord/Twitch links — applied to the MOTD, README, and configuration of your pack.",
  },
];

const STATS = [
  { icon: Zap, label: "Fast", sub: "Ready in minutes" },
  { icon: Package, label: "Complete pack", sub: "Plugins + configs + branding" },
  { icon: Shield, label: "Safe", sub: "Compatibility checks" },
  { icon: Users, label: "For everyone", sub: "From SMP to network" },
];

export default function HomePage() {
  const user = getSessionUser();
  const primaryHref = user ? "/builder" : "/register?redirect=/builder";
  const primaryLabel = user ? "Go to AI Builder" : "Get Started";

  return (
    // Homepage-level background: one continuous layer behind hero +
    // features + CTA + USPs (not scoped to the hero alone). Breaks out
    // to full viewport width; the actual content stays in its own
    // centered max-w-[1400px] wrapper on top, same as before.
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      <div className="pointer-events-none absolute inset-0 z-0">
        <Image src="/images/hero-bg.png" alt="" fill priority className="object-cover object-top" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1400px] space-y-8 px-8 py-10 sm:px-12">
        {/* Hero — no card, no background of its own (that lives at the
            homepage level above), just content sitting on it. */}
        <section className="grid gap-3 py-2 lg:grid-cols-[11fr_9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs tracking-widest text-emerald-400">
              <Zap size={13} />
              AI-POWERED
            </span>

            <h1 className="mt-2 text-[46px] font-bold leading-[1.05] tracking-tight">
              Tell us what you want.
              <br />
              <span className="whitespace-nowrap text-emerald-400">We'll build your server.</span>
            </h1>

            <p className="mt-2 max-w-xl text-slate-400">
              AI-driven Minecraft Java server packs — plugins, configuration
              and branding assembled automatically from a simple
              conversation. No hosting: just download and run it yourself.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={primaryHref}
                className="flex items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
              >
                <Sparkles size={16} />
                {primaryLabel}
                <ArrowRight size={16} />
              </Link>
              <Link
                href={user ? "/packs" : "/register?redirect=/packs"}
                className="flex items-center gap-2 rounded-md border border-base-600 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:bg-base-800"
              >
                <FolderOpen size={16} />
                {user ? "My Server Packs" : "Sign Up"}
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
              {TRUST_ITEMS.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <ServerIllustration />
        </section>

        {/* Feature strip — a real grid, sitting on the same background;
            the panels have their own dark fill, the gaps between them
            let the homepage background show through. */}
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
              <p className="font-semibold text-emerald-400">From idea to server — in minutes.</p>
              <p className="text-sm text-slate-400">Focus on your community. Let the AI do the heavy lifting.</p>
            </div>
          </div>
          <Link
            href={primaryHref}
            className="flex shrink-0 items-center gap-2 rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-base-950 transition-colors hover:bg-emerald-400"
          >
            Start for free
            <ArrowRight size={16} />
          </Link>
        </section>

        {/* Stats row — directly on the background, no card */}
        <section className="grid gap-6 border-t border-base-700/60 pt-8 sm:grid-cols-4">
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
    </div>
  );
}
