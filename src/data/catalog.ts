// Catálogo de LED Tech Miami: 5 líneas de negocio y sus servicios.
// Los textos y los servicios se editan en el panel (src/content/lineas.json y
// src/content/servicios/*.json); los colores y direcciones de las líneas, en config.ts.
import type { Lang } from "./site";
import { ROUTES } from "../i18n/routes";
import { LINE_STYLE, type LineKey } from "./config";
import { LINE_COPY, SERVICE_ENTRIES } from "./content";

export type { LineKey };

interface LineCopy {
  name: string;
  h1: string;
  short: string;
  intro: string;
}

export interface Line {
  key: LineKey;
  color: string;
  tint: string;
  ground: string;
  slug: Record<Lang, string>;
  es: LineCopy;
  en: LineCopy;
}

interface ServiceCopy {
  name: string;
  short: string;
  intro: string;
  includes: string[];
  uses: string[];
  note?: string;
}

export interface Service {
  key: string;
  line: LineKey;
  // Servicio del que cuelga, si es uno de un grupo (ej.: los impresos de Marketing Digital)
  parent?: string;
  slug: Record<Lang, string>;
  kelvin?: { from: number; to: number; label: string; rgb?: boolean };
  es: ServiceCopy;
  en: ServiceCopy;
}

export const LINES: Line[] = LINE_STYLE.map((l) => ({ ...l, es: LINE_COPY[l.key].es, en: LINE_COPY[l.key].en }));

const lineOrder = (key: LineKey) => LINE_STYLE.findIndex((l) => l.key === key);

export const SERVICES: Service[] = [...SERVICE_ENTRIES]
  .sort((a, b) => lineOrder(a.linea) - lineOrder(b.linea) || a.orden - b.orden || a.nombre.localeCompare(b.nombre))
  .map((e) => ({
    key: e.slug,
    line: e.linea,
    parent: e.padre || undefined,
    slug: { es: e.slug, en: e.slugEn || e.slug },
    kelvin: e.kelvin?.discriminant && e.kelvin.value ? e.kelvin.value : undefined,
    es: {
      name: e.nombre,
      short: e.short.es,
      intro: e.intro.es,
      includes: e.includes.es,
      uses: e.uses.es,
      note: e.note.es || undefined,
    },
    en: {
      name: e.nameEn || e.nombre,
      short: e.short.en || e.short.es,
      intro: e.intro.en || e.intro.es,
      includes: e.includes.en.length ? e.includes.en : e.includes.es,
      uses: e.uses.en.length ? e.uses.en : e.uses.es,
      note: e.note.en || undefined,
    },
  }));

export const lineByKey = (key: LineKey) => LINES.find((l) => l.key === key)!;
export const lineOf = (s: Service) => lineByKey(s.line);
export const servicesOf = (l: Line) => SERVICES.filter((s) => s.line === l.key);
// Los que se enseñan como servicios de la línea: los que cuelgan de otro van dentro de su padre
export const topServicesOf = (l: Line) => servicesOf(l).filter((s) => !s.parent);
export const childrenOf = (s: Service) => SERVICES.filter((x) => x.parent === s.key);
export const parentOf = (s: Service) => (s.parent ? SERVICES.find((x) => x.key === s.parent) : undefined);

export const lineUrl = (l: Line, lang: Lang) => `${ROUTES.services[lang]}${l.slug[lang]}/`;
export const serviceUrl = (s: Service, lang: Lang) => `${lineUrl(lineOf(s), lang)}${s.slug[lang]}/`;

// Valor que llega en el correo y en la agenda (siempre en español)
export const formValue = (s: Service) => `${lineOf(s).es.name}: ${s.es.name}`;
export const lineFormValue = (l: Line) => `${l.es.name}: otro / no estoy seguro`;
