import type { Lang } from "../data/site";

// Cada página tiene su dirección en español y en inglés.
export const ROUTES = {
  home: { es: "/", en: "/en/" },
  services: { es: "/servicios/", en: "/en/services/" },
  projects: { es: "/proyectos/", en: "/en/projects/" },
  about: { es: "/nosotros/", en: "/en/about/" },
  quote: { es: "/cotizar/", en: "/en/quote/" },
  shop: { es: "/tienda/", en: "/en/shop/" },
  cart: { es: "/tienda/carrito/", en: "/en/shop/cart/" },
  thanks: { es: "/tienda/gracias/", en: "/en/shop/thank-you/" },
} satisfies Record<string, Record<Lang, string>>;

export type PageKey = keyof typeof ROUTES;

export const alternatesOf = (key: PageKey) => ROUTES[key];
