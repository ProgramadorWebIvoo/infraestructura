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
    `connect-src 'self' blob: https://infraestructuraback.ivoofix.com${isDev ? ' http://localhost:* ws://localhost:* http://10.20.16.247:* ws://10.20.16.247:*' : ''} https://sockjs-mt1.pusher.com wss://ws-mt1.pusher.com;`,
    // Incluye el origen del backend: las imágenes de propuestas de
    // proveedores (PropuestaMaterialesPublica) se sirven vía <img src=...>
    // directo desde la API (GET /public/invitations/{token}/proposal-image/{path},
    // no un blob local) — sin este origen acá, el navegador bloquea la carga
    // silenciosamente (sin excepción JS) aunque connect-src sí lo permita,
    // porque son directivas CSP independientes.
    `img-src 'self' data: blob: https://infraestructuraback.ivoofix.com${isDev ? ' http://localhost:* http://10.20.16.247:*' : ''};`,
    "font-src 'self' https://fonts.gstatic.com;",
    "form-action 'self';",
    "base-uri 'self';",
    "frame-ancestors 'none';",
    ...(isDev ? [] : ["upgrade-insecure-requests;"]),
  ].join(' ');

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@ivoo/shared': path.resolve(__dirname, './packages/shared/src'),
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
    build: {
      rollupOptions: {
        output: {
          // Sin esto, Rollup mezcla React + motion + axios + pdfjs en un
          // solo chunk (~797 KB) que se invalida completo en cada deploy —
          // separar vendor por librería permite que el navegador siga
          // cacheando react-vendor/motion-vendor entre releases que no los
          // tocan, y evita que pdfjs-dist (grande, usado solo en
          // DocumentPreviewModal) infle el chunk que carga toda la app.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('pdfjs-dist')) return 'pdf-vendor';
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('motion')) return 'motion-vendor';
            if (id.includes('axios') || id.includes('@tanstack')) return 'data-vendor';
            return 'vendor';
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      // jsdom por defecto resuelve window.location.hostname a "127.0.0.1", lo que
      // dispara la reescritura de host de resolveApiBaseUrl() en src/services/api.ts
      // (pensada para dev en red local) y hace que las URLs esperadas en los tests
      // ("localhost:8000") no coincidan con las reales ("127.0.0.1:8000").
      environmentOptions: {
        jsdom: { url: 'http://localhost:3000' },
      },
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        // Branches en 80% (no 85%) porque es el nivel real medido hoy — subirlo
        // a 85% sin escribir tests de branch adicionales rompería el build.
        thresholds: {
          lines: 85,
          functions: 85,
          branches: 80,
          statements: 85,
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
