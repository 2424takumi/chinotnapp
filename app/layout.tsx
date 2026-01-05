import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小じゃみチントン生産管理",
  description: "小じゃみチントンの生産実績記録・管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
