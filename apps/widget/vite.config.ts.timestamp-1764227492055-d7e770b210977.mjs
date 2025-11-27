// vite.config.ts
import { defineConfig } from "file:///Users/ryanodonnell/projects/Digital_greeter/node_modules/.pnpm/vite@5.4.21_@types+node@20.19.25/node_modules/vite/dist/node/index.js";
import preact from "file:///Users/ryanodonnell/projects/Digital_greeter/node_modules/.pnpm/@preact+preset-vite@2.10.2_@babel+core@7.28.5_preact@10.27.2_vite@5.4.21/node_modules/@preact/preset-vite/dist/esm/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/Users/ryanodonnell/projects/Digital_greeter/apps/widget";
var vite_config_default = defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src"),
      react: "preact/compat",
      "react-dom": "preact/compat"
    }
  },
  build: {
    lib: {
      entry: path.resolve(__vite_injected_original_dirname, "src/main.tsx"),
      name: "GhostGreeter",
      fileName: "ghost-greeter",
      formats: ["iife"]
      // Single file for embedding
    },
    rollupOptions: {
      output: {
        // Ensure everything is bundled into a single file
        inlineDynamicImports: true
      }
    },
    minify: "esbuild"
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    global: "globalThis"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvcnlhbm9kb25uZWxsL3Byb2plY3RzL0RpZ2l0YWxfZ3JlZXRlci9hcHBzL3dpZGdldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL3J5YW5vZG9ubmVsbC9wcm9qZWN0cy9EaWdpdGFsX2dyZWV0ZXIvYXBwcy93aWRnZXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL3J5YW5vZG9ubmVsbC9wcm9qZWN0cy9EaWdpdGFsX2dyZWV0ZXIvYXBwcy93aWRnZXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHByZWFjdCBmcm9tIFwiQHByZWFjdC9wcmVzZXQtdml0ZVwiO1xuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3ByZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBcIjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCIuL3NyY1wiKSxcbiAgICAgIHJlYWN0OiBcInByZWFjdC9jb21wYXRcIixcbiAgICAgIFwicmVhY3QtZG9tXCI6IFwicHJlYWN0L2NvbXBhdFwiLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvbWFpbi50c3hcIiksXG4gICAgICBuYW1lOiBcIkdob3N0R3JlZXRlclwiLFxuICAgICAgZmlsZU5hbWU6IFwiZ2hvc3QtZ3JlZXRlclwiLFxuICAgICAgZm9ybWF0czogW1wiaWlmZVwiXSwgLy8gU2luZ2xlIGZpbGUgZm9yIGVtYmVkZGluZ1xuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIC8vIEVuc3VyZSBldmVyeXRoaW5nIGlzIGJ1bmRsZWQgaW50byBhIHNpbmdsZSBmaWxlXG4gICAgICAgIGlubGluZUR5bmFtaWNJbXBvcnRzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICAgIG1pbmlmeTogXCJlc2J1aWxkXCIsXG4gIH0sXG4gIGRlZmluZToge1xuICAgIFwicHJvY2Vzcy5lbnYuTk9ERV9FTlZcIjogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPz8gXCJwcm9kdWN0aW9uXCIpLFxuICAgIGdsb2JhbDogXCJnbG9iYWxUaGlzXCIsXG4gIH0sXG59KTtcblxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwVixTQUFTLG9CQUFvQjtBQUN2WCxPQUFPLFlBQVk7QUFDbkIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxPQUFPLENBQUM7QUFBQSxFQUNsQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsTUFDcEMsT0FBTztBQUFBLE1BQ1AsYUFBYTtBQUFBLElBQ2Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxLQUFLO0FBQUEsTUFDSCxPQUFPLEtBQUssUUFBUSxrQ0FBVyxjQUFjO0FBQUEsTUFDN0MsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsU0FBUyxDQUFDLE1BQU07QUFBQTtBQUFBLElBQ2xCO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUE7QUFBQSxRQUVOLHNCQUFzQjtBQUFBLE1BQ3hCO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLEVBQ1Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLHdCQUF3QixLQUFLLFVBQVUsUUFBUSxJQUFJLFlBQVksWUFBWTtBQUFBLElBQzNFLFFBQVE7QUFBQSxFQUNWO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
