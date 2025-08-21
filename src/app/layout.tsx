import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Formulario de Desocupación - Almacenajes SA",
  description: "Sistema de solicitud de desocupación de minidepósitos para clientes de Almacenajes SA. Gestione su salida de forma rápida y segura.",
  keywords: ["almacenajes", "minidepósitos", "desocupación", "formulario", "salida", "clientes", "Panamá"],
  authors: [{ name: "Almacenajes SA" }],
  creator: "Almacenajes SA",
  publisher: "Almacenajes SA",
  robots: "index, follow",
  openGraph: {
    title: "Formulario de Desocupación - Almacenajes SA",
    description: "Sistema de solicitud de desocupación de minidepósitos para clientes de Almacenajes SA",
    type: "website",
    locale: "es_PA",
    siteName: "Almacenajes SA",
  },
  twitter: {
    card: "summary",
    title: "Formulario de Desocupación - Almacenajes SA",
    description: "Sistema de solicitud de desocupación de minidepósitos para clientes de Almacenajes SA",
  },
  icons: {
    icon: '/favicon.ico',
  },
};

// Viewport configuration (Next.js 15+)
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
