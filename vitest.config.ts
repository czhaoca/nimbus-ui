import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig sets jsx: "preserve" for Next's compiler; the react plugin
  // transforms JSX for .tsx tests (vitest's bundler honors the preserve
  // setting otherwise and fails to parse them).
  plugins: [react()],
  test: {
    // jsdom over happy-dom (issue #3 DEC-A, panel-confirmed): the component
    // surface is portal/focus-heavy radix-ui — exactly where happy-dom has
    // documented DOM-API gaps. Override per-file if a test needs otherwise.
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/__tests__/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
