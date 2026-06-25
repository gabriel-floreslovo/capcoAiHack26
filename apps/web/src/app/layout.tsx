import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sprint Wrap-Up Buddy",
  description:
    "An AI-native workspace for sprint recaps, stakeholder-ready updates, and repo onboarding.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
