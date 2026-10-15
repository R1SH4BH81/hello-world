import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bloom",
  description:
    "Type, and a garden grows from your letters. Space cuts the stems, backspace withers them.",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "Bloom",
    title: "Bloom",
    description:
      "Type, and a garden grows from your letters. Space cuts the stems, backspace withers them.",
    url: "https://heybloom.vercel.app/",
    images: [
      {
        url: "https://res.cloudinary.com/at8kgfnv/image/upload/v1792081960/garden_1_1.avif",
        width: 1200,
        height: 630,
        alt: "Bloom - Procedural generative botanical typography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bloom",
    description:
      "Type, and a garden grows from your letters. Space cuts the stems, backspace withers them.",
    images: ["https://res.cloudinary.com/at8kgfnv/image/upload/v1792081960/garden_1_1.avif"],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
