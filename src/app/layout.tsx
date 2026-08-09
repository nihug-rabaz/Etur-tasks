import type { Metadata, Viewport } from "next";
import { Fredoka, Geist_Mono, Heebo, Secular_One } from "next/font/google";
import { Toaster } from "sonner";
import { IntroSplash } from "@/components/intro-splash";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { FontScaleRoot } from "@/components/ui/font-scale-root";
import { AuthorizationService } from "@/services/authorization.service";
import { ProfileService } from "@/services/profile.service";
import { getFontScaleOption } from "@/lib/ui/font-scale";
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

const fredoka = Fredoka({
  variable: "--font-plan-hand",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
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
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/favicon-16.png?v=3", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png?v=3", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico?v=3",
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
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await new AuthorizationService().getCurrentProfile();
  const fontScale = profile
    ? await new ProfileService().getFontScale(profile.id)
    : getFontScaleOption("default");

  return (
    <html
      lang="he"
      dir="rtl"
      className={`${geistMono.variable} ${secularOne.variable} ${heebo.variable} ${fredoka.variable} h-full antialiased`}
      data-font-scale={fontScale.preset}
      suppressHydrationWarning
      style={{
        colorScheme: "light",
        fontSize: `${16 * fontScale.scale}px`,
        ["--app-font-scale" as string]: String(fontScale.scale),
      }}
    >
      <body className="min-h-full flex flex-col">
        <FontScaleRoot initialPreset={fontScale.preset} />
        <IntroSplash />
        {children}
        <PwaInstallPrompt />
        <Toaster richColors theme="light" />
      </body>
    </html>
  );
}
