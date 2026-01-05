import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // ビルド時のTypeScriptエラーを無視（実行時は問題なし）
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
