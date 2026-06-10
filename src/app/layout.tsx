import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "ContentForge AI — AI-Powered SEO Content at Scale",
    template: "%s | ContentForge AI",
  },
  description:
    "Generate SEO-optimized articles in minutes with AI. Keyword research, content scoring, and automated publishing all in one platform.",
  keywords: ["AI content", "SEO content generator", "AI writing tool", "content marketing"],
  authors: [{ name: "ContentForge AI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: "ContentForge AI — AI-Powered SEO Content at Scale",
    description: "Generate SEO-optimized articles in minutes with AI.",
    siteName: "ContentForge AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContentForge AI",
    description: "Generate SEO-optimized articles in minutes with AI.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
