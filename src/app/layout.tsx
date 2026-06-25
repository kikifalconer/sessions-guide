import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
      <body>{children}</body>
    </html>
  );
}
