import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // The importer accepts files up to 8 MB, so allow a little overhead for multipart form data.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
