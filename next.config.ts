import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // 关闭开发模式下左下角的 Next.js Dev Tools 浮动徽章
  devIndicators: false,
};

export default nextConfig;
