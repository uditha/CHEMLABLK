import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { StoreHydration } from "@/components/providers/StoreHydration";

export const metadata: Metadata = {
  title: {
    default: "ChemLab LK — Virtual Chemistry Laboratory",
    template: "%s | ChemLab LK",
  },
  description:
    "All 43 Sri Lanka NIE A/L Chemistry practicals simulated. For 300,000+ students who deserve a real lab experience.",
  keywords: [
    "Sri Lanka",
    "A/L Chemistry",
    "virtual lab",
    "NIE",
    "chemistry practical",
    "flame test",
    "titration",
  ],
  authors: [{ name: "ChemLab LK" }],
  creator: "ChemLab LK",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#050810",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-deep text-white antialiased min-h-screen">
        <SessionProvider>
          <StoreHydration>{children}</StoreHydration>
        </SessionProvider>
      </body>
    </html>
  );
}
