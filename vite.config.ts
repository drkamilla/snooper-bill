import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api/vireonix': {
        target: 'https://vireonix.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/vireonix/, ''),
      },
      '/circle-api': {
        target: 'https://api.circle.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/circle-api/, ''),
        headers: {
          'Origin': 'https://api.circle.com',
        },
      },
    },
  },
});