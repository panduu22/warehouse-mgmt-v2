import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  title: "AdithyaTech",
  applicationName: "AdithyaTech",
  description: "AdithyaTech Warehouse Management System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AdithyaTech",
  },
  openGraph: {
    type: "website",
    siteName: "AdithyaTech",
    title: "AdithyaTech",
    description: "AdithyaTech Warehouse Management System",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AdithyaTech Warehouse Management System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AdithyaTech",
    description: "AdithyaTech Warehouse Management System",
    images: ["/twitter-image.png"],
  },
};

export const viewport = {
  themeColor: "#0F172A",
};

import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CapacitorInitializer } from "@/components/CapacitorInitializer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
          <InstallPrompt />
          <CapacitorInitializer />
        </Providers>
      </body>
    </html>
  );
}
