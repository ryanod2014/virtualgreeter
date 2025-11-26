/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ghost-greeter/domain", "@ghost-greeter/ui"],
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;

