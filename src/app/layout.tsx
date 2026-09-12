import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LOGICTRADERSLTD - Master the Markets with Logic & Precision",
  description: "Premium trading education, signals, and automation tools. Learn to trade forex, crypto, and stocks with professional strategies.",
  keywords: "trading, forex, crypto, trading signals, trading bots, trading courses, investment",
  authors: [{ name: "LOGICTRADERSLTD" }],
  openGraph: {
    title: "LOGICTRADERSLTD - Master the Markets",
    description: "Premium trading education, signals, and automation tools.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f0f11" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased min-h-screen bg-dark-950 text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
