import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AS Logistics Solutions",
  description: "Commercial FMCSA carrier discovery and email enrichment SaaS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
