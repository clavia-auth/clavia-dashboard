import "./globals.css";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import { Providers } from "@/components/shell/providers";

export const metadata: Metadata = {
  title: { default: "Clavia", template: "%s · Clavia" },
  description: "Manage the people, applications and APIs of your Clavia deployment.",
  // Files in public/ are not prefixed with the basePath for us.
  icons: { icon: "/dashboard/clavia-icon.svg" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1410" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The proxy's per-request nonce: the theme script is the one inline script we add.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-svh bg-background font-sans text-foreground antialiased">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
