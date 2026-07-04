import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During dev, proxy /api to the FastAPI backend so the frontend can call
// relative URLs identically in dev and production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
