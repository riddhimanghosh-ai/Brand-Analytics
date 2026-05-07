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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Anti-flash: read saved theme before first paint — suppressHydrationWarning on <html> allows this */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme')||'dark';document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
