import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { NO_FLASH_SCRIPT } from "@/lib/theme/apply";
import { Providers } from "@/components/shell/Providers";

export const metadata: Metadata = {
  title: "Le Monde Hello Kitty d’Isabelle",
  description: "Le petit univers tout doux d’Isabelle 🎀",
  applicationName: "Monde d’Isabelle",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Monde d’Isabelle", statusBarStyle: "default" },
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF0F6" },
    { media: "(prefers-color-scheme: dark)", color: "#2A1530" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={fontVariables} suppressHydrationWarning data-card="sticker" data-button="bubbly" data-pattern="hearts" data-anim="normal" data-mode="light">
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
