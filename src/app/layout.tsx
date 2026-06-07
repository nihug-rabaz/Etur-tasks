import type { Metadata, Viewport } from "next";
import { Geist_Mono, Heebo, Secular_One } from "next/font/google";
import { Toaster } from "sonner";
import { IntroSplash } from "@/components/intro-splash";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const secularOne = Secular_One({
  variable: "--font-secular",
  subsets: ["hebrew", "latin"],
  weight: "400",
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מערכת ניהול משימות",
  description: "ניהול משימות ידידותי ליחידה ארגונית.",
  applicationName: "משימות",
  appleWebApp: {
    capable: true,
    title: "משימות",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geistMono.variable} ${secularOne.variable} ${heebo.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col">
        <IntroSplash />
        {children}
        <PwaInstallPrompt />
        <Toaster richColors theme="light" />
      </body>
    </html>
  );
}
