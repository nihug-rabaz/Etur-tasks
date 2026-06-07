import type { Metadata } from "next";
import { Assistant, Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { IntroSplash } from "@/components/intro-splash";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  title: "מערכת ניהול משימות",
  description: "ניהול משימות ידידותי ליחידה ארגונית.",
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
      className={`${geistSans.variable} ${geistMono.variable} ${assistant.variable} h-full antialiased`}
      style={{ colorScheme: "light" }}
    >
      <body className="min-h-full flex flex-col">
        <IntroSplash />
        {children}
        <Toaster richColors theme="light" />
      </body>
    </html>
  );
}
