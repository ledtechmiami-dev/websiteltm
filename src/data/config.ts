// Configuración fija del sitio (no editable desde el panel a propósito:
// cambiarla afecta el diseño, los enlaces o el envío del formulario).
import type { Lang } from "./site";

export const SITE_URL = "https://ledtechmiami.vercel.app";
// Web3Forms: clave pública por diseño; entrega las solicitudes a ledtechmiami@gmail.com
export const WEB3FORMS_KEY = "031fda50-2c0d-423e-9051-0ddb439ad8cd";

export type LineKey = "letreros" | "graficos" | "marino" | "fabricacion" | "iluminacion";

// Orden, colores y direcciones web de las 5 líneas
export const LINE_STYLE: { key: LineKey; color: string; tint: string; ground: string; slug: Record<Lang, string> }[] = [
  { key: "letreros", color: "#ED1B24", tint: "#FDE3E4", ground: "#1D1F22", slug: { es: "letreros", en: "signs" } },
  { key: "graficos", color: "#99C941", tint: "#ECF5DE", ground: "#DDEDC6", slug: { es: "graficos-impresion", en: "graphics-print" } },
  { key: "marino", color: "#0094DA", tint: "#DDF1FB", ground: "#C7E7F7", slug: { es: "marino", en: "marine" } },
  { key: "fabricacion", color: "#59626D", tint: "#E8EBEE", ground: "#D5DAE0", slug: { es: "fabricacion", en: "fabrication" } },
  { key: "iluminacion", color: "#FFCA09", tint: "#FFF4C7", ground: "#FFE9A3", slug: { es: "iluminacion-led", en: "led-lighting" } },
];

export const SOCIAL_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
};
