import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-nunito",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Moderato Art | Zajęcia muzyczne dla dzieci",
    template: "%s | Moderato Art",
  },
  description:
    "Zajęcia muzyczne, nauka śpiewu i rytmika dla dzieci prowadzone przez Magdalenę Warzechę.",
  openGraph: {
    locale: "pl_PL",
    type: "website",
    siteName: "Moderato Art",
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pl" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
