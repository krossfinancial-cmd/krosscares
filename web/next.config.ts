import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    // Onboarding and admin enrollment submit two file inputs in one multipart request.
    // The default proxy body limit is 10 MB, which is too tight for two 5 MB files plus form overhead.
    proxyClientMaxBodySize: "16mb",
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
