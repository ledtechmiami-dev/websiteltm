import { defineConfig } from "astro/config";
import { loadEnv } from "vite";
import sitemap from "@astrojs/sitemap";
import react from "@astrojs/react";
import keystatic from "@keystatic/astro";
import vercel from "@astrojs/vercel";

// Sitio estático (páginas generadas al publicar) + funciones en Vercel para /api/quote
// y, cuando está conectado a GitHub, para el panel de administración (/keystatic).
// Español en la raíz, inglés bajo /en/ (rutas en src/i18n/routes.ts).
// Cuando se conecte el dominio propio, cambiar `site` (y url en src/data/config.ts).

const env = loadEnv(process.env.NODE_ENV ?? "", process.cwd(), "");
const isDev = process.argv.includes("dev");
// Sin GitHub, el panel solo existe en `npm run dev` (en Vercel no podría guardar).
const withPanel = isDev || Boolean(env.PUBLIC_KEYSTATIC_GITHUB_REPO);

export default defineConfig({
  site: "https://ledtechmiami.vercel.app",
  adapter: vercel(),
  // Servicios que cambiaron de línea: la dirección vieja lleva a la nueva.
  // Astro solo genera la versión sin barra final; la versión con "/" está en vercel.json.
  redirects: {
    "/servicios/marino/tablas-de-cortar": "/servicios/fabricacion/tablas-de-cortar/",
    "/en/services/marine/cutting-boards": "/en/services/fabrication/cutting-boards/",
  },
  integrations: [
    // El carrito y la página de gracias no van al mapa del sitio
    sitemap({ filter: (page) => !/\/(tienda\/(carrito|gracias)|en\/shop\/(cart|thank-you))\/$/.test(page) }),
    ...(withPanel ? [react(), keystatic()] : []),
  ],
});
