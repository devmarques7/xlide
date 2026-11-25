import path from "node:path";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API = `http://localhost:${process.env.API_PORT ?? 3001}`;

/** XLIDE v2 (public/v2, HTML + JS sem build) lê a URL e a chave anon do Supabase em /v2/config.js. */
function v2Config(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const js = `window.XCFG=${JSON.stringify({ url: env.VITE_SUPABASE_URL || "", key: env.VITE_SUPABASE_ANON_KEY || "" })};\n`;
  return {
    name: "xlide-v2-config",
    configureServer(server) {
      server.middlewares.use("/v2/config.js", (_req, res) => {
        res.setHeader("Content-Type", "application/javascript");
        res.setHeader("Cache-Control", "no-store");
        res.end(js);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "v2/config.js", source: js });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), v2Config(mode)],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  server: {
    port: 5173,
    proxy: {
      "/api": API,
      "/ws": { target: API.replace("http", "ws"), ws: true },
    },
  },
}));
