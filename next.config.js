/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"]
  },
  outputFileTracingExcludes: {
    "*": ["./repos/**", "./ai-memory/**"]
  }
};

module.exports = nextConfig;
