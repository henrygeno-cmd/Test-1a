import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: {
    default: "LeadFlow AI – AI Lead Generation for Local Service Businesses",
    template: "%s | LeadFlow AI",
  },
  description:
    "Automatically capture, qualify, and convert leads for your HVAC, roofing, landscaping, or home service business. Powered by AI.",
  keywords: [
    "lead generation",
    "HVAC leads",
    "home service CRM",
    "AI lead qualification",
    "local business automation",
    "roofing leads",
    "landscaping leads",
  ],
  authors: [{ name: "LeadFlow AI" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "LeadFlow AI",
    title: "LeadFlow AI – AI Lead Generation for Local Service Businesses",
    description: "Turn website visitors into booked jobs — automatically.",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadFlow AI",
    description: "AI-powered lead generation for local service businesses",
  },
  robots: { index: true, follow: true },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
