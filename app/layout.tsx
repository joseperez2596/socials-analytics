import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/nav/sidebar";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Render at request time so DASHBOARD_TITLE (and DB data) are read at runtime, not baked into the build.
export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return {
    title: process.env.DASHBOARD_TITLE ?? "Social Analytics",
    description: "Social analytics dashboard",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex h-screen overflow-hidden bg-paper text-ink">
        <Sidebar />
        <div className="flex-1 min-w-0 overflow-auto flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
