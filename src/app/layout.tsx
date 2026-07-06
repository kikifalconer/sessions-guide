import type { Metadata } from "next";
import "./globals.css";
import SiteFooter from "@/components/site-footer";
import { getSiteUrl } from "@/lib/siteUrl";
import { JsonLd, organizationJsonLd, webSiteJsonLd } from "@/lib/seo/structuredData";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "sessions.guide",
  description: "Find a practitioner who actually gets it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/zlm6tfg.css" />
      </head>
      <body>
        <JsonLd data={[organizationJsonLd(), webSiteJsonLd()]} />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
