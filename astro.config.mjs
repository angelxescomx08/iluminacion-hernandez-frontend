// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

const publicSite = process.env.PUBLIC_SITE_URL?.trim();

// https://astro.build/config
// Evita 404 en hosts estáticos: con `directory` la salida es `nuevo/index.html` y
// muchas plataformas no resuelven `/ruta` → carpeta. `file` + `never` genera
// `nuevo.html` mapeable en `/admin/productos/nuevo` (ver docs: build.format + trailingSlash).
export default defineConfig({
  site: publicSite,
  output: 'server',
  adapter: node({ 
    mode: 'standalone',
  }),
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
