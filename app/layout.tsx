import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable-latin.woff2",
  variable: "--font-jetbrains-mono",
  weight: "300 400",
  display: "swap",
});

const ebGaramond = localFont({
  src: "./fonts/EBGaramond-Variable-latin.woff2",
  variable: "--font-eb-garamond",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OmniWatch — Perfect enforcement simulation",
  description: "A deterministic historical simulation of prevention through prediction.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${ebGaramond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
