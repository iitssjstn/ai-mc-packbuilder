import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "AI Minecraft Server Pack Builder",
  description: "Stel via een AI-chat een compleet Minecraft Java Edition serverpakket samen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="overflow-x-hidden font-sans bg-base-950 text-slate-100 min-h-screen">
        <NavBar />
        {/* No padding here — pages that need it (builder/packs/admin/
            account/login/register) apply their own. The homepage's
            full-bleed background must start immediately after the
            header with zero gap, which any padding here would create. */}
        <main className="mx-auto max-w-[1400px]">{children}</main>
      </body>
    </html>
  );
}
