import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PwaRegister } from "@/components/PwaRegister";

export const viewport: Viewport = {
  themeColor: "#050811",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="4KVM影视" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-dark-950 text-gray-100 min-h-screen flex flex-col antialiased">
        <PwaRegister />
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}