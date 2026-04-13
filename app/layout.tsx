import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "myformsvault",
  description: "Create form workflows, publish intake pages, and track submissions from one dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="app-body">{children}</body>
    </html>
  );
}
