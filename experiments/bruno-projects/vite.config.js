import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: "esnext",
    outDir: "../../cecilia-world",
    emptyOutDir: true,
    rollupOptions: { input: { portfolio: "index.html", hub: "hub.html", haha: "haha-world.html", icod: "icod.html" } },
  },
  server: { host: "0.0.0.0", port: 5174, fs: { allow: ["../.."] } },
});
