import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the home directory makes Turbopack infer the
  // wrong workspace root. Pin it to this project.
  turbopack: { root: import.meta.dirname },

  // The dev badge sits in the lower left, on top of the system log and the
  // permanent disclosure line. Compile and runtime errors still surface.
  devIndicators: false,
};

export default nextConfig;
