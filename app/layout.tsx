import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/lib/notifications/realtime-notifications";
import { DemoModeProvider } from "@/lib/demo/demo-context";
import { DemoBanner } from "@/components/demo/demo-banner";
import { ChatWidget } from "@/components/ai-chat/chat-widget";
import { ServiceWorkerRegistration, InstallPrompt } from "@/components/pwa/service-worker-registration";
import { MobileBottomNav, MobileFAB } from "@/components/layout/mobile-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { LiveNotifications } from "@/components/collaboration/LiveNotifications";
import { RBACProvider } from "@/lib/rbac/rbac-context";
import { CommandBar } from "@/components/command-bar/command-bar";
import { CommandBarProvider } from "@/hooks/use-command-bar";
import { CommandBarHint } from "@/components/command-bar/command-bar-hint";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3b82f6',
};

export const metadata: Metadata = {
  title: "oppSpot - Discover UK & Ireland Business Opportunities",
  description: "AI-powered business intelligence platform for finding and analyzing UK & Ireland business opportunities",
  keywords: "business intelligence, UK business, Ireland business, B2B leads, market research",
  authors: [{ name: "oppSpot" }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'oppSpot',
    startupImage: [
      {
        url: '/icons/splash-640x1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-750x1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/icons/splash-1125x2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/icons/icon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: "oppSpot - Discover UK & Ireland Business Opportunities",
    description: "AI-powered business intelligence platform",
    url: "https://oppspot.com",
    siteName: "oppSpot",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "oppSpot",
    description: "Discover UK & Ireland business opportunities with AI",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="oppSpot" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider defaultTheme="system" storageKey="oppspot-ui-theme">
          <RBACProvider>
            <DemoModeProvider>
              <NotificationProvider>
                <CommandBarProvider>
                  <ServiceWorkerRegistration />
                  <InstallPrompt />
                  <DemoBanner />
                  <LiveNotifications />
                  <CommandBar />
                  <CommandBarHint />
                  {children}
                  <MobileBottomNav />
                  <MobileFAB />
                  <ChatWidget position="bottom-right" />
                </CommandBarProvider>
              </NotificationProvider>
            </DemoModeProvider>
          </RBACProvider>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
