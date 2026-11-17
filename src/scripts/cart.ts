// Carrito de la tienda. Vive en este navegador (localStorage); si el navegador no deja
// guardar (modo privado estricto), funciona en memoria mientras la página esté abierta.
// Solo guarda qué producto, qué opción y cuántos: los precios siempre salen del catálogo.
export type CartLine = { id: string; v: number | null; q: number };

const KEY = "ltm-cart";
const EVENT = "ltm-cart-change";
export const MAX_QTY = 99;

let memory: CartLine[] = [];

const sanitize = (raw: unknown): CartLine[] =>
  Array.isArray(raw)
    ? raw
        .filter((l) => l && typeof l.id === "string" && Number.isInteger(l.q) && l.q > 0)
        .map((l) => ({ id: l.id, v: Number.isInteger(l.v) ? l.v : null, q: Math.min(MAX_QTY, l.q) }))
    : [];

export function readCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw === null ? memory : sanitize(JSON.parse(raw));
  } catch {
    return memory;
  }
}

function write(lines: CartLine[]) {
  memory = lines.filter((l) => l.q > 0);
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

const same = (l: CartLine, id: string, v: number | null) => l.id === id && l.v === v;

export function addToCart(id: string, v: number | null, q: number) {
  const lines = readCart();
  const line = lines.find((l) => same(l, id, v));
  if (line) line.q = Math.min(MAX_QTY, line.q + q);
  else lines.push({ id, v, q: Math.min(MAX_QTY, q) });
  write(lines);
}

export function setQty(id: string, v: number | null, q: number) {
  write(readCart().map((l) => (same(l, id, v) ? { ...l, q: Math.max(0, Math.min(MAX_QTY, q)) } : l)));
}

export const removeLine = (id: string, v: number | null) => write(readCart().filter((l) => !same(l, id, v)));
export const clearCart = () => write([]);
export const cartCount = () => readCart().reduce((n, l) => n + l.q, 0);

// Avisa cuando cambia el carrito, también desde otra pestaña
export function onCartChange(fn: () => void) {
  window.addEventListener(EVENT, fn);
  window.addEventListener("storage", (e) => { if (e.key === KEY || e.key === null) fn(); });
}
