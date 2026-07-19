import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AS Logistics Solutions LLC", description: "Build filtered carrier lists from FMCSA SAFER snapshots." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
