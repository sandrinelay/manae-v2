import type { Metadata } from "next";
import { Geist, Geist_Mono, Quicksand } from "next/font/google";
import "../styles/globals.css";
import AuthInitializer from "@/components/auth/AuthInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manae",
  description: "Manae",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${quicksand.variable} antialiased`}
      >
        <AuthInitializer />
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
