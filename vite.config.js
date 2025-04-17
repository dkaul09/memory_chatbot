import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/message': {
        target: 'https://qxibbabcdttyzkcmvohc.supabase.co/functions/v1/process-message',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/message/, '')
      }
    }
  }
});