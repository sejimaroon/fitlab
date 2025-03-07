import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173, // `PORT` を数値に変換
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 5173,
  },
});
