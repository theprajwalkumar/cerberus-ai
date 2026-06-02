import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip bundling heavy server-side Node.js modules - they stay as native requires
  serverExternalPackages: [
    "prisma",
    "@prisma/client",
    "child_process",
    "fs",
    "path",
    "os",
    "dns",
    "zlib",
    "stream",
  ],
};

export default nextConfig;
