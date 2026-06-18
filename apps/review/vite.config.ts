import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// `VITE_BASE` lets CI set the GitHub Pages base path (e.g. /e2e-review/ or a
// PR preview subdirectory). `VITE_DATA_MODE` selects where data comes from:
//   - "static" (default): bundled JSON under <base>data/ + localStorage comments
//   - "server": the Express+MCP server's REST API
const base = process.env.VITE_BASE || '/';
const dataMode = process.env.VITE_DATA_MODE || 'static';

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  define: {
    'import.meta.env.VITE_DATA_MODE': JSON.stringify(dataMode),
  },
  server: { port: 4173, strictPort: true },
});
