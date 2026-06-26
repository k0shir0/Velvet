import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const API_TARGET = "http://localhost:4317";

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      "/api": { target: API_TARGET, changeOrigin: true },
      "/socket.io": { target: API_TARGET, ws: true, changeOrigin: true },
    },
  },
});
