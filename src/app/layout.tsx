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
      <body className="font-sans bg-base-950 text-slate-100 min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
