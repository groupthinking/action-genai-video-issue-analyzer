import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "UVAI - Video-to-Agentic Action System",
  description:
    "Transform YouTube videos into executable code, structured workflows, and deployment instructions using AI.",
  keywords: [
    "video analysis",
    "AI",
    "GenAI",
    "agentic",
    "automation",
    "YouTube",
  ],
  authors: [{ name: "UVAI Team" }],
  openGraph: {
    title: "UVAI - Video-to-Agentic Action System",
    description:
      "Transform video content into actionable intelligence and automated workflows.",
    url: "https://uvai.io",
    siteName: "UVAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UVAI - Video-to-Agentic Action System",
    description:
      "Transform video content into actionable intelligence and automated workflows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
