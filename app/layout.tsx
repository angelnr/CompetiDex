import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/app/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CompetiDex",
  description:
    "Pokédex all-in-one con stats, evoluciones, habilidades, movimientos y debilidades, construida sobre PokeAPI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

function NavBar() {
  return (
    <nav className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center gap-6 px-4">
        <a href="/" className="text-sm font-semibold tracking-tight">
          CompetiDex
        </a>
        <a
          href="/equipos"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Equipos
        </a>
      </div>
    </nav>
  );
}
