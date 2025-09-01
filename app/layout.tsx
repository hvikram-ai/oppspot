import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/lib/notifications/realtime-notifications";
import { DemoModeProvider } from "@/lib/demo/demo-context";
import { DemoBanner } from "@/components/demo/demo-banner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "oppSpot - Discover UK & Ireland Business Opportunities",
  description: "AI-powered business intelligence platform for finding and analyzing UK & Ireland business opportunities",
  keywords: "business intelligence, UK business, Ireland business, B2B leads, market research",
  authors: [{ name: "oppSpot" }],
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
      <body className={`${inter.className} antialiased`}>
        <DemoModeProvider>
          <NotificationProvider>
            <DemoBanner />
            {children}
          </NotificationProvider>
        </DemoModeProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
