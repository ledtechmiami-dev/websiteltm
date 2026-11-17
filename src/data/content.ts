// Contenido editable desde el panel (Keystatic guarda estos JSON en src/content/).
// Se importan directo para que en `npm run dev` los cambios del panel se vean al instante.
import contacto from "../content/contacto.json";
import lineas from "../content/lineas.json";
import inicio from "../content/inicio.json";
import nosotros from "../content/nosotros.json";
import clientes from "../content/clientes.json";
import paginaServicios from "../content/pagina-servicios.json";
import paginaProyectos from "../content/pagina-proyectos.json";
import paginaCotizar from "../content/pagina-cotizar.json";
import tienda from "../content/tienda.json";
import type { LineKey } from "./config";

export type Bi<T = string> = { es: T; en: T };

export interface ServiceEntry {
  slug: string;
  nombre: string;
  linea: LineKey;
  orden: number;
  // Dirección web del servicio del que depende, si cuelga de otro (ej.: marketing-digital)
  padre?: string;
  nameEn: string;
  slugEn: string;
  short: Bi;
  intro: Bi;
  includes: Bi<string[]>;
  uses: Bi<string[]>;
  note: Bi;
  kelvin: { discriminant: boolean; value?: { from: number; to: number; label: string; rgb: boolean } };
}

export interface WorkEntry {
  slug: string;
  titulo: string;
  captionEn: string;
  linea: LineKey;
  imagen: string | null;
  alt: Bi;
  destacado: boolean;
  orden: number;
}

export interface ProductEntry {
  slug: string;
  nombre: string;
  nameEn: string;
  slugEn: string;
  categoria: "led" | "taller" | "marino";
  orden: number;
  precio: number | null;
  variantes: { nombre: Bi; precio: number | null }[];
  short: Bi;
  descripcion: Bi;
  specs: Bi<string[]>;
  imagenes: (string | null)[];
  soloLocal: boolean;
  agotado: boolean;
  ejemplo: boolean;
  publicado: boolean;
}

export interface PageHead {
  title: Bi;
  h1: Bi;
  lead: Bi;
}

const byFile = <T>(files: Record<string, Omit<T, "slug">>) =>
  Object.entries(files).map(([path, data]) => ({ ...data, slug: path.split("/").pop()!.replace(/\.json$/, "") }) as T);

export const SERVICE_ENTRIES = byFile<ServiceEntry>(
  import.meta.glob("../content/servicios/*.json", { eager: true, import: "default" })
);
export const WORK_ENTRIES = byFile<WorkEntry>(
  import.meta.glob("../content/trabajos/*.json", { eager: true, import: "default" })
);
export const PRODUCT_ENTRIES = byFile<ProductEntry>(
  import.meta.glob("../content/productos/*.json", { eager: true, import: "default" })
);

export const CONTACT = contacto as {
  phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  hours: Bi;
  social: { network: string; url: string }[];
};

export const LINE_COPY = lineas as Record<LineKey, Bi<{ name: string; h1: string; short: string; intro: string }>>;

export const HOME = inicio as {
  seo: { title: Bi; description: Bi };
  hero: { h1: Bi; lead: Bi; note: Bi };
  strip: Bi[];
  lines: { title: Bi; text: Bi };
  packs: { title: Bi; text: Bi; items: { line: LineKey; name: Bi; items: Bi<string[]>; price: string }[] };
  work: { title: Bi };
  steps: { title: Bi; items: { title: Bi; text: Bi }[] };
  trust: { title: Bi; reviewsTitle: Bi };
};

export const ABOUT = nosotros as {
  head: PageHead;
  storyTitle: Bi;
  story: Bi;
  experience: Bi;
  license: string;
  insurance: Bi;
  zones: Bi;
  valuesTitle: Bi;
  values: { title: Bi; text: Bi }[];
};

export const CLIENTS = clientes as {
  googleRating: string;
  googleCount: number | null;
  googleUrl: string | null;
  reviews: { author: string; business: string; text: Bi }[];
  logos: { name: string; image: string | null }[];
};

export const PAGES = {
  services: paginaServicios as { head: PageHead },
  projects: paginaProyectos as { head: PageHead; ctaTitle: Bi; ctaText: Bi },
  quote: paginaCotizar as { head: PageHead; formTitle: Bi },
};

// Ajustes de la tienda. Un costo vacío (null) = esa forma de entrega aún no se puede pagar.
export const SHOP_SETTINGS = tienda as {
  head: PageHead;
  recogida: { activo: boolean; nota: Bi };
  local: { activo: boolean; precio: number | null; nota: Bi };
  envio: { activo: boolean; precio: number | null; gratisDesde: number | null; nota: Bi };
  politicas: Bi;
};

// Párrafos separados por una línea en blanco
export const paragraphs = (text: string) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
