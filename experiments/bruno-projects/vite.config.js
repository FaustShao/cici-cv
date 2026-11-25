import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    target: ["safari15.4", "firefox102", "chrome100"],
    outDir: "../../cecilia-world",
    emptyOutDir: true,
    rollupOptions: { input: { portfolio: "index.html", hub: "hub.html", haha: "haha-world.html", icod: "icod.html", sonicsense: "sonicsense.html" } },
  },
  server: { host: "0.0.0.0", port: 5174, fs: { allow: ["../.."] } },
});
