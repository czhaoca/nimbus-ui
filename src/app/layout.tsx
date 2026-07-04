import type { Metadata } from "next";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nimbus",
  description: "Multi-cloud orchestration platform",
  manifest: "/manifest.webmanifest",
  icons: [
    { rel: "icon", url: "/nimbus.svg" },
    { rel: "apple-touch-icon", url: "/nimbus-192.png" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
