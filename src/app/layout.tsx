import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brand Analytics — E-Commerce Dashboard",
  description: "Multi-brand e-commerce analytics dashboard for Shopify, Google Analytics, Meta Ads, and Google Ads with AI-powered consulting insights.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
