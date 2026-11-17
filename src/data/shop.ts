// Tienda: productos (src/content/productos/*.json), categorías y formas de entrega
// (src/content/tienda.json). Lo usan las páginas y también /api/checkout, que vuelve a
// calcular los precios en el servidor: el precio que manda el navegador nunca se usa.
import type { Lang } from "./site";
import type { LineKey } from "./config";
import { ROUTES } from "../i18n/routes";
import { PRODUCT_ENTRIES, SHOP_SETTINGS, type Bi } from "./content";

export type CategoryKey = "led" | "taller" | "marino";
export type DeliveryKey = "recogida" | "local" | "envio";

// Cada categoría toma el color y el dibujo de una línea de negocio
export const CATEGORIES: { key: CategoryKey; line: LineKey; name: Bi }[] = [
  { key: "led", line: "iluminacion", name: { es: "Productos LED", en: "LED products" } },
  { key: "taller", line: "fabricacion", name: { es: "Hecho en nuestro taller", en: "Made in our shop" } },
  { key: "marino", line: "marino", name: { es: "Accesorios marinos", en: "Marine accessories" } },
];

export interface Variant {
  name: Bi;
  price: number | null;
}

interface ProductCopy {
  name: string;
  short: string;
  description: string;
  specs: string[];
}

export interface Product {
  key: string;
  slug: Record<Lang, string>;
  category: CategoryKey;
  price: number | null;
  variants: Variant[];
  images: string[];
  localOnly: boolean; // no se envía por paquetería
  soldOut: boolean;
  example: boolean; // producto de muestra: se ve pero no se vende
  es: ProductCopy;
  en: ProductCopy;
}

const catOrder = (key: CategoryKey) => CATEGORIES.findIndex((c) => c.key === key);

export const PRODUCTS: Product[] = PRODUCT_ENTRIES.filter((e) => e.publicado)
  .sort((a, b) => catOrder(a.categoria) - catOrder(b.categoria) || a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  .map((e) => ({
    key: e.slug,
    slug: { es: e.slug, en: e.slugEn || e.slug },
    category: e.categoria,
    price: e.precio,
    variants: e.variantes.map((v) => ({ name: { es: v.nombre.es, en: v.nombre.en || v.nombre.es }, price: v.precio })),
    images: e.imagenes.filter((i): i is string => Boolean(i)),
    localOnly: e.soloLocal,
    soldOut: e.agotado,
    example: e.ejemplo,
    es: { name: e.nombre, short: e.short.es, description: e.descripcion.es, specs: e.specs.es },
    en: {
      name: e.nameEn || e.nombre,
      short: e.short.en || e.short.es,
      description: e.descripcion.en || e.descripcion.es,
      specs: e.specs.en.length ? e.specs.en : e.specs.es,
    },
  }));

export const productByKey = (key: string) => PRODUCTS.find((p) => p.key === key);
export const categoryOf = (p: Product) => CATEGORIES.find((c) => c.key === p.category)!;
export const productsOf = (key: CategoryKey) => PRODUCTS.filter((p) => p.category === key);
export const productUrl = (p: Product, lang: Lang) => `${ROUTES.shop[lang]}${p.slug[lang]}/`;

// Precio de una unidad; null = esa opción no se puede comprar todavía
export const unitPrice = (p: Product, variant: number | null) => {
  if (!p.variants.length) return p.price;
  const v = variant === null ? undefined : p.variants[variant];
  return v ? (v.price ?? p.price) : null;
};

const prices = (p: Product) =>
  (p.variants.length ? p.variants.map((_, i) => unitPrice(p, i)) : [p.price]).filter((n): n is number => n !== null);

// Precio más bajo (para "desde $…") y si hay más de uno
export const priceRange = (p: Product) => {
  const list = prices(p);
  return list.length ? { from: Math.min(...list), varies: new Set(list).size > 1 } : null;
};

export const canBuy = (p: Product) => !p.example && !p.soldOut && prices(p).length > 0;

export const money = (n: number, lang: Lang) =>
  new Intl.NumberFormat(lang === "es" ? "es-US" : "en-US", { style: "currency", currency: "USD" }).format(n);

export const SHOP = SHOP_SETTINGS;

type Delivery = { key: DeliveryKey; name: Bi; note: Bi; price: number | null; freeFrom: number | null; ready: boolean };

// Formas de entrega activas. `ready` = tiene costo definido, así que ya se puede pagar.
const ALL_DELIVERY: Delivery[] = [
  {
    key: "recogida",
    name: { es: "Recoger en el taller", en: "Pick up at our shop" },
    note: SHOP.recogida.nota,
    price: 0,
    freeFrom: null,
    ready: SHOP.recogida.activo,
  },
  {
    key: "local",
    name: { es: "Entrega local", en: "Local delivery" },
    note: SHOP.local.nota,
    price: SHOP.local.precio,
    freeFrom: null,
    ready: SHOP.local.activo && SHOP.local.precio !== null,
  },
  {
    key: "envio",
    name: { es: "Envío por paquetería", en: "Shipping" },
    note: SHOP.envio.nota,
    price: SHOP.envio.precio,
    freeFrom: SHOP.envio.gratisDesde,
    ready: SHOP.envio.activo && SHOP.envio.precio !== null,
  },
];
export const DELIVERY = ALL_DELIVERY.filter((d) => SHOP[d.key].activo);

// Costo de entrega para un subtotal
export const deliveryCost = (key: DeliveryKey, subtotal: number) => {
  const d = DELIVERY.find((x) => x.key === key);
  if (!d || d.price === null) return null;
  return d.freeFrom !== null && subtotal >= d.freeFrom ? 0 : d.price;
};
