import type { Metadata } from "next";
import { Nunito, Quicksand } from "next/font/google";
import "../styles/globals.css";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://manae.app"),
  title: "Manae",
  description: "Organise ta vie de parent sereinement",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Manae",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Manae",
    description: "Organise ta vie de parent sereinement",
    url: "https://manae.app",
    siteName: "Manae",
    locale: "fr_FR",
    type: "website",
    images: [
      {
        url: "/icons/og-image.png",
        width: 1200,
        height: 630,
        alt: "Manae - Organise ta vie de parent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Manae",
    description: "Organise ta vie de parent sereinement",
    images: ["/icons/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <meta name="theme-color" content="#14B8A6" />
      </head>
      <body
        className={`${nunito.variable} ${quicksand.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
