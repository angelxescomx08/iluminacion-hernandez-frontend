// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

const publicSite = process.env.PUBLIC_SITE_URL?.trim() || 'https://iluminacion-hernandez.com';

export default defineConfig({
  site: publicSite,
  output: 'server',
  adapter: node({ 
    mode: 'standalone',
  }),
  // CAMBIA ESTO: 'ignore' permite que funcione con o sin barra al final
  trailingSlash: 'ignore', 
  // CAMBIA ESTO: 'directory' es el estándar para SSR en Node
  build: {
    format: 'directory',
  },
  vite: {
    plugins: [tailwindcss()]
  }
});