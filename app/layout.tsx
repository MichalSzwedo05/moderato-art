import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
