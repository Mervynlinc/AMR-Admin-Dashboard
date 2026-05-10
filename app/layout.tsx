import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMR Surveillance Dashboard",
  description: "AMR Laboratory Network - Surveillance Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full antialiased bg-gray-50 text-gray-900" suppressHydrationWarning>{children}</body>
    </html>
  );
}
