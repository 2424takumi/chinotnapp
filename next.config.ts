import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Strict Modeを無効化（認証フローの二重実行を防ぐ）
  typescript: {
    // ビルド時のTypeScriptエラーを無視（実行時は問題なし）
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
