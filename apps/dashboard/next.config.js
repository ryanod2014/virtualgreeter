/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ghost-greeter/domain", "@ghost-greeter/ui"],
  
  // Image optimization configuration
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Production optimizations
  poweredByHeader: false,
  
  // Strict mode for catching bugs
  reactStrictMode: true,
  
  // Output standalone for better containerization (optional, useful for Railway)
  // output: "standalone",
};

module.exports = nextConfig;
