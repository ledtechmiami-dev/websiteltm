// Después de `astro build`: las redirecciones de astro.config.mjs salen para Vercel como
// "^/ruta$" (sin barra final), pero las páginas del sitio terminan en "/". Aquí se cambian a
// "^/ruta/?$" para que funcionen con y sin barra. Solo toca rutas literales; Vercel ignora
// los "redirects" de vercel.json cuando el adaptador de Astro genera .vercel/output.
import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../.vercel/output/config.json", import.meta.url);

let config;
try {
  config = JSON.parse(await readFile(file, "utf8"));
} catch {
  console.log("redirect-slash: no hay .vercel/output/config.json, nada que hacer");
  process.exit(0);
}

const literal = /^\^\/[\w\-/.~%]+\$$/;
let changed = 0;
for (const route of config.routes ?? []) {
  const isRedirect = route.headers?.Location && route.status >= 300 && route.status < 400;
  if (isRedirect && literal.test(route.src) && !route.src.endsWith("/$")) {
    route.src = route.src.replace(/\$$/, "/?$");
    changed++;
  }
}

await writeFile(file, JSON.stringify(config, null, "\t"));
console.log(`redirect-slash: ${changed} redirecciones aceptan barra final`);
