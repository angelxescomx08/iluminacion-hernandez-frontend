// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
// Evita 404 en hosts estáticos: con `directory` la salida es `nuevo/index.html` y
// muchas plataformas no resuelven `/ruta` → carpeta. `file` + `never` genera
// `nuevo.html` mapeable en `/admin/productos/nuevo` (ver docs: build.format + trailingSlash).
export default defineConfig({
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});