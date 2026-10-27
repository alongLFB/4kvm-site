import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";
import { FloatingActions } from "@/components/FloatingActions";

export const viewport: Viewport = {
  themeColor: "#050811",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "4KVM 在线影视 - 4K高清电影与电视剧点播",
  description: "4KVM 聚合全网高清影视、电影、电视剧、动漫点播平台，免VIP无广告急速秒播。",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "4KVM影视",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

import { DownloadProvider } from "@/contexts/DownloadContext";
import { GlobalDownloadCenter } from "@/components/DownloadManagerDrawer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="4KVM影视" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#06070a] text-gray-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-300 relative overflow-x-hidden" suppressHydrationWarning>
        {/* Subtle Ambient Cosmic Glow at top of viewport */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[360px] bg-gradient-to-b from-cyan-500/10 via-indigo-500/5 to-transparent blur-[120px] pointer-events-none -z-10" />

        <DownloadProvider>
          <PwaRegister />
          <Navbar />
          <main className="flex-1 max-w-[1600px] w-full mx-auto px-3.5 sm:px-6 lg:px-10 py-4 sm:py-7 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-16 pl-[max(0.875rem,env(safe-area-inset-left,0.875rem))] pr-[max(0.875rem,env(safe-area-inset-right,0.875rem))]">
            {children}
          </main>
          <FloatingActions />
          <Footer />
          <GlobalDownloadCenter />
        </DownloadProvider>
      </body>
    </html>
  );
}