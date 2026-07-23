import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  const isDev = mode === 'development';

  const csp = [
    "default-src 'self';",
    `script-src 'self'${isDev ? " 'unsafe-inline'" : ''};`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
    "connect-src 'self' https://infraestructuraback.ivoofix.com http://localhost:* ws://localhost:*;",
    "img-src 'self' data:;",
    "font-src 'self' https://fonts.gstatic.com;",
    "form-action 'self';",
    "base-uri 'self';",
    "frame-ancestors 'none';",
  ].join(' ');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      headers: {
        'Content-Security-Policy': csp,
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        thresholds: {
          lines: 70,
          functions: 70,
          branches: 70,
          statements: 70,
        },
        exclude: [
          'node_modules/',
          'dist/',
          'src/test/',
          'src/__tests__/',
          'src/main.tsx',
          'src/vite-env.d.ts',
          '**/*.d.ts',
          '**/*.config.*',
          '**/index.ts',
        ],
      },
    },
  };
});
