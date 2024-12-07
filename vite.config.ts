import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path"
export default defineConfig({
  base: "/",
  server: {
    port: 6006,
  },
  plugins: [nodePolyfills(), react()],
  build: {
    outDir: "dist",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["@agoralabs-sh/avm-web-provider"],
  },
});