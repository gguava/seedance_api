import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seedance API",
  description: "Seedance API 提交页面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
