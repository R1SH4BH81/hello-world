import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Type Garden",
  description:
    "Type, and a garden grows from your letters. Space cuts the stems, backspace withers them.",
  themeColor: "#000000",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Type Garden",
    title: "Type Garden",
    description:
      "Type, and a garden grows from your letters. Space cuts the stems, backspace withers them.",
    url: "https://type-garden.vercel.app/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "The words Type Garden in white serif type, overgrown with red roses and blue stems on black.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Type Garden",
    description:
      "Type, and a garden grows from your letters. Space cuts the stems, backspace withers them.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
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
      <body>{children}</body>
    </html>
  );
}
