import type { Metadata } from "next";
import { Toaster } from "sonner";
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
      <body>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
