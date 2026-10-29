import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "esnext",
    outDir: "../../bruno-preview",
    emptyOutDir: true,
    rollupOptions: { input: { portfolio: "index.html", hub: "hub.html" } },
  },
  server: { host: "0.0.0.0", port: 5174, fs: { allow: ["../.."] } },
});
