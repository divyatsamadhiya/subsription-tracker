import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import { RegisterSW } from "@/lib/register-sw";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pulseboard — Subscription Tracker",
  description: "Track every dollar you subscribe to.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pulseboard",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1625" },
  ],
};

/**
 * Inline script to apply dark class before React hydrates (prevents FOUC).
 * Reads from localStorage; falls back to system preference.
 */
const themeScript = `(function(){try{var t=localStorage.getItem("pulseboard-theme");if(t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${plusJakarta.variable} ${spaceGrotesk.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          {children}
          <RegisterSW />
        </ThemeProvider>
      </body>
    </html>
  );
}
