import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/admin/user-guide": ["./USER_GUIDE.md"],
    "/api/admin/gallery/\\[id\\]/complete": [
      "./node_modules/sharp/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linuxmusl-x64/**/*",
      "./node_modules/@img/sharp-linuxmusl-x64/**/*",
    ],
  },
};

export default nextConfig;
