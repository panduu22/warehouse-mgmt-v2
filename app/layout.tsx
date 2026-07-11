import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";
import SplashWrapper from "@/components/SplashWrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Warehouse Manager",
  description: "Stock tracking and logistics management system",
};

import { Toaster } from "sonner";

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
          <SplashWrapper>
            {children}
          </SplashWrapper>
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  );
}
