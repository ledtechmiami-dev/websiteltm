// Piezas que repiten los constructores de diseño (src/components/*Builder.astro).
// Cada constructor conserva sus opciones, su dibujo y su resumen; aquí solo va lo idéntico.

// Leer el formulario: la opción marcada de un grupo y el texto de un campo
export const formReaders = (form: HTMLFormElement) => ({
  val: (name: string) => (form.elements.namedItem(name) as RadioNodeList).value,
  text: (name: string) => (form.elements.namedItem(name) as HTMLInputElement).value.trim(),
});

// Marca la opción que viene en la dirección, si existe
export const setRadio = (form: HTMLFormElement, name: string, v: string | null) => {
  if (!v) return;
  const input = form.querySelector<HTMLInputElement>(`input[name='${name}'][value='${CSS.escape(v)}']`);
  if (input) input.checked = true;
};

// Enlace para compartir el diseño: la misma página, con las opciones en la dirección
export const shareLink = (p: URLSearchParams) => `${location.origin}${location.pathname}?${p}#disena`;

// Actualiza la dirección mientras el cliente edita, sin llenar el historial
export const urlSync = (url: () => string) => {
  let timer = 0;
  return () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => history.replaceState(null, "", url()), 400);
  };
};

// Enlace de WhatsApp con el resumen del diseño
export const waHref = (phone: string, intro: string, summary: string) =>
  `https://wa.me/${phone}?text=${encodeURIComponent(`${intro}\n\n${summary}`)}`;

// Ajusta el lienzo a su tamaño en pantalla (máx. 2× de densidad) y lo limpia.
// Devuelve null si el lienzo no se ve todavía.
export const fitCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (!cw || !ch) return null;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  return { cw, ch, dpr };
};

// Cambios en el diseño (no en los datos de contacto)
export const onDesignEdit = (form: HTMLFormElement, contactBox: HTMLElement, fn: () => void) => {
  const handler = (e: Event) => {
    if (contactBox.contains(e.target as Node)) return;
    fn();
  };
  form.addEventListener("change", handler);
  form.addEventListener("input", handler);
};

// Vuelve a dibujar cuando cargan las fuentes de la vista previa
export const afterFonts = (fonts: string[], fn: () => void) =>
  Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => []))).then(() => fn());
