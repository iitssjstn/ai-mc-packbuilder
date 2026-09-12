import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { Panel } from "@/components/ui";

export default function HomePage() {
  const user = getSessionUser();
  const primaryHref = user ? "/builder" : "/account";
  const primaryLabel = user ? "Ga naar de AI Builder" : "Begin met bouwen";

  return (
    <div className="space-y-16 py-6">
      {/* Hero */}
      <section className="relative overflow-hidden border border-base-700 bg-base-900 px-6 py-14 sm:px-10">
        {/* Abstract voxel-grid backdrop — deliberately not a game screenshot */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#3ecf8e 1px, transparent 1px), linear-gradient(90deg, #3ecf8e 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative">
          <p className="font-mono text-xs tracking-widest text-emerald-400">
            AI SERVERPAKKET BUILDER
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold leading-tight">
            Vertel wat je wilt.
            <br />
            <span className="text-emerald-400">Wij bouwen je server.</span>
          </h1>
          <p className="mt-4 max-w-xl text-slate-400">
            AI-gestuurde Minecraft Java-serverpakketten — plugins, configuratie
            en branding automatisch samengesteld op basis van een simpel
            gesprek. Geen hosting: downloaden en zelf starten.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="bg-emerald-500 px-5 py-2.5 text-sm font-medium text-base-950 hover:bg-emerald-400 transition-colors"
            >
              {primaryLabel}
            </Link>
            <Link
              href={user ? "/packs" : "/account"}
              className="border border-base-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-base-800 transition-colors"
            >
              {user ? "Mijn Serverpacks" : "Inloggen"}
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-slate-500">
            <span>Gratis te proberen</span>
            <span>·</span>
            <span>Geen hosting nodig</span>
            <span>·</span>
            <span>Paper &amp; Purpur</span>
            <span>·</span>
            <span>Eigen branding</span>
          </div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Panel>
          <h3 className="font-mono text-sm text-emerald-400">01 · AI Builder</h3>
          <p className="mt-2 text-sm text-slate-400">
            Beschrijf je server in gewone taal. De AI zet dat om in een
            gestructureerd plan — jij houdt de controle voordat er iets
            gegenereerd wordt.
          </p>
        </Panel>
        <Panel>
          <h3 className="font-mono text-sm text-emerald-400">02 · Compatibiliteit</h3>
          <p className="mt-2 text-sm text-slate-400">
            Elke plugin wordt gecontroleerd op Minecraft-versie, server
            software, dependencies en conflicten voordat 'ie in je pack
            terechtkomt.
          </p>
        </Panel>
        <Panel>
          <h3 className="font-mono text-sm text-emerald-400">03 · Eigen branding</h3>
          <p className="mt-2 text-sm text-slate-400">
            Servernaam, logo, Discord/Twitch-links — verwerkt in de MOTD,
            README en configuratie van je pack.
          </p>
        </Panel>
      </section>
    </div>
  );
}
