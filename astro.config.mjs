import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    vue({
      app: (app) => {
        // App-level Vue config if needed
      }
    }),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  server: {
    port: 4321,
    host: true
  },
  vite: {
    server: {
      watch: {
        ignored: ['**/android/**', '**/.wrangler/**']
      }
    }
  }
});
