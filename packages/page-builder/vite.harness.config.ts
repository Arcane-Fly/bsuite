import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: resolve(root, 'src/__tests__/fixtures'),
  server: {
    port: 4177,
    strictPort: true,
    host: '127.0.0.1',
  },
});
