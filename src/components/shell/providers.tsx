"use client";

import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

/** What every page shares on the client: the colour scheme, tooltips and toasts. */
export function Providers({ nonce, children }: { nonce: string | undefined; children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster position="bottom-right" closeButton />
      </TooltipProvider>
    </ThemeProvider>
  );
}
