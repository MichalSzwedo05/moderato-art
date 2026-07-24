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
      <body>
        {children}
        <noscript
          dangerouslySetInnerHTML={{
            __html: "<style>.reveal{opacity:1!important;transform:none!important}@media(max-width:760px){.mobile-menu-button{display:none!important}.mobile-navigation nav[hidden]{position:static!important;display:grid!important;width:100%!important;margin-top:.5rem;padding:.55rem;opacity:1!important;pointer-events:auto!important;transform:none!important}.mobile-navigation nav[hidden] a{padding:.8rem;color:inherit;text-decoration:none}}</style>",
          }}
        />
      </body>
    </html>
  );
}
