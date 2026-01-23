import "./globals.css";
import { Oxanium, Sora } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

const display = Oxanium({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"]
});

const body = Sora({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata = {
  title: {
    default: "Petalytix",
    template: "%s | Petalytix"
  },
  description: "Location based portfolio for Petalytix.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://petalytix.id"),
  openGraph: {
    images: ["/images/og.png"]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
