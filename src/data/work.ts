// Trabajos (fotos) que se muestran en Inicio, en cada línea y en Proyectos.
// Se editan en el panel: Trabajos (fotos). Sin foto se ve un espacio PENDIENTE.
import type { LineKey } from "./config";
import { WORK_ENTRIES } from "./content";

export interface Work {
  line: LineKey;
  src?: string;
  featured: boolean;
  es: { caption: string; alt?: string };
  en: { caption: string; alt?: string };
}

export const WORK: Work[] = [...WORK_ENTRIES]
  .sort((a, b) => a.orden - b.orden)
  .map((e) => ({
    line: e.linea,
    src: e.imagen || undefined,
    featured: e.destacado,
    es: { caption: e.titulo, alt: e.alt.es || e.titulo },
    en: { caption: e.captionEn || e.titulo, alt: e.alt.en || e.captionEn || e.titulo },
  }));

// Hasta 5 para el mosaico del inicio: primero los destacados, luego el resto
export const FEATURED_WORK: Work[] = [...WORK.filter((w) => w.featured), ...WORK.filter((w) => !w.featured)].slice(0, 5);
