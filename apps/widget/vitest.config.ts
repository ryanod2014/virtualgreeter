import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      // Use jsdom for .tsx test files (React/Preact component tests)
      ["**/*.test.tsx", "jsdom"],
    ],
  },
});

