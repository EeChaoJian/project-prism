import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Prism — Financial Decision Simulator",
  description:
    "Explore financial decisions before you make them. An AI-powered scenario simulator for SME owners.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
