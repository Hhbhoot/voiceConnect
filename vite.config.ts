import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0", // This allows access from any IP on the network
    port: 5173,
    // Temporarily disable HTTPS for easier development
    // https: true, // Enable HTTPS for WebRTC
  },
  plugins: [
    react(),
    // basicSsl(), // Generates self-signed certificates automatically
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
