import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // مجلد المشروع هو جذر Turbopack (لتفادي التقاط lockfile في مجلد أعلى)
  turbopack: { root: __dirname },
};

export default nextConfig;
