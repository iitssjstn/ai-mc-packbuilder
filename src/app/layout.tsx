import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { Panel } from "@/components/ui";

export const metadata: Metadata = {
  title: "AI Minecraft Server Pack Builder",
  description: "Build a complete Minecraft Java Edition server pack through an AI chat.",
};

async function isMaintenanceMode(): Promise<boolean> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: "maintenanceMode" } });
    return row?.value === "true";
  } catch {
    // A DB error here shouldn't take the whole site down harder than it
    // already is — fail open (maintenance mode off) rather than compound
    // the outage with a broken layout.
    return false;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = getSessionUser();
  const maintenance = await isMaintenanceMode();
  const isAdmin = user && (user.role === "ADMIN" || user.role === "OWNER");

  return (
    <html lang="en">
      <body className="overflow-x-hidden font-sans bg-base-950 text-slate-100 min-h-screen">
        <NavBar />
        {/* No padding here — pages that need it (builder/packs/admin/
            account/login/register) apply their own. The homepage's
            full-bleed background must start immediately after the
            header with zero gap, which any padding here would create. */}
        <main className="mx-auto max-w-[1400px]">
          {maintenance && !isAdmin ? (
            <div className="mx-auto max-w-md space-y-4 px-6 py-20 text-center">
              <Panel>
                <h1 className="text-lg font-semibold">Under Maintenance</h1>
                <p className="mt-2 text-sm text-slate-400">
                  We're performing scheduled maintenance right now. Please check back shortly.
                </p>
              </Panel>
            </div>
          ) : (
            children
          )}
        </main>
      </body>
    </html>
  );
}
