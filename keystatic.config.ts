// Panel de administración de LED Tech Miami (Keystatic).
// Local: http://localhost:4321/keystatic (npm run dev) — guarda directo en src/content/.
// Con GitHub: definir PUBLIC_KEYSTATIC_GITHUB_REPO="usuario/repositorio" en Vercel y el panel
// guarda en el repositorio; cada cambio publica el sitio automáticamente.
//
// El diseño (colores, estructura) y las direcciones de las líneas viven en el código a propósito,
// para que editar contenido no rompa el sitio.
import { config, fields, collection, singleton } from "@keystatic/core";

const repo = import.meta.env.PUBLIC_KEYSTATIC_GITHUB_REPO as `${string}/${string}` | undefined;

const LINE_OPTIONS = [
  { label: "Letreros", value: "letreros" },
  { label: "Gráficos e impresión", value: "graficos" },
  { label: "Marino", value: "marino" },
  { label: "Fabricación a medida", value: "fabricacion" },
  { label: "Iluminación LED", value: "iluminacion" },
] as const;

const line = (label = "Línea de negocio") =>
  fields.select({ label, options: LINE_OPTIONS as unknown as { label: string; value: string }[], defaultValue: "letreros" });

// Texto en los dos idiomas
const bi = (label: string, opts: { multiline?: boolean; description?: string } = {}) =>
  fields.object(
    {
      es: fields.text({ label: "Español", multiline: opts.multiline }),
      en: fields.text({ label: "Inglés", multiline: opts.multiline }),
    },
    { label, description: opts.description }
  );

// Lista de frases en los dos idiomas
const biList = (label: string, description?: string) =>
  fields.object(
    {
      es: fields.array(fields.text({ label: "Frase" }), { label: "Español", itemLabel: (p) => p.value }),
      en: fields.array(fields.text({ label: "Frase" }), { label: "Inglés", itemLabel: (p) => p.value }),
    },
    { label, description }
  );

const lineCopy = (label: string) =>
  fields.object(
    {
      es: fields.object({
        name: fields.text({ label: "Nombre" }),
        h1: fields.text({ label: "Título principal (H1)" }),
        short: fields.text({ label: "Resumen corto", multiline: true }),
        intro: fields.text({ label: "Introducción", multiline: true }),
      }, { label: "Español" }),
      en: fields.object({
        name: fields.text({ label: "Name" }),
        h1: fields.text({ label: "Main title (H1)" }),
        short: fields.text({ label: "Short summary", multiline: true }),
        intro: fields.text({ label: "Intro", multiline: true }),
      }, { label: "Inglés" }),
    },
    { label }
  );

const seo = () =>
  fields.object(
    {
      title: bi("Título de la pestaña y de Google"),
      description: bi("Descripción para Google", { multiline: true }),
    },
    { label: "Buscadores (SEO)" }
  );

const pageHead = () =>
  fields.object(
    {
      title: bi("Título de la pestaña y de Google"),
      h1: bi("Título principal (H1)"),
      lead: bi("Texto de introducción", { multiline: true }),
    },
    { label: "Encabezado de la página" }
  );

export default config({
  storage: repo ? { kind: "github", repo } : { kind: "local" },
  ui: {
    brand: { name: "LED Tech Miami" },
    navigation: {
      "Catálogo": ["servicios", "lineas", "trabajos"],
      "Tienda": ["productos", "tienda"],
      "Páginas": ["inicio", "nosotros", "paginaServicios", "paginaProyectos", "paginaCotizar"],
      "Confianza": ["clientes"],
      "Negocio": ["contacto"],
    },
  },

  collections: {
    servicios: collection({
      label: "Servicios",
      slugField: "nombre",
      path: "src/content/servicios/*",
      format: { data: "json" },
      columns: ["nombre", "linea"],
      schema: {
        nombre: fields.slug({
          name: { label: "Nombre (español)" },
          slug: {
            label: "Dirección web en español",
            description: "Aparece en el enlace: /servicios/<línea>/<dirección>/. Cambiarla rompe enlaces ya compartidos.",
          },
        }),
        linea: line(),
        orden: fields.integer({ label: "Orden dentro de la línea", defaultValue: 1 }),
        padre: fields.text({
          label: "Va dentro de (opcional)",
          description:
            "Dirección web del servicio que lo agrupa, por ejemplo marketing-digital. Así aparece en el menú como submenú de ese servicio. Déjalo vacío si es un servicio principal de la línea.",
          validation: { isRequired: false, pattern: { regex: /^[a-z0-9]*(?:-[a-z0-9]+)*$/, message: "Solo minúsculas, números y guiones" } },
        }),
        nameEn: fields.text({ label: "Nombre (inglés)" }),
        slugEn: fields.text({
          label: "Dirección web en inglés",
          description: "Solo minúsculas, números y guiones. Ej.: boat-letters",
          validation: { isRequired: true, pattern: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "Solo minúsculas, números y guiones" } },
        }),
        short: bi("Resumen corto (tarjetas)", { multiline: true }),
        intro: bi("Introducción (portada del servicio)", { multiline: true }),
        includes: biList("Qué incluye"),
        uses: biList("Ideal para"),
        note: bi("Nota adicional (opcional)", { multiline: true }),
        kelvin: fields.conditional(
          fields.checkbox({ label: "Mostrar escala de temperatura de color (solo iluminación)", defaultValue: false }),
          {
            true: fields.object({
              from: fields.integer({ label: "Desde (K)", defaultValue: 2700 }),
              to: fields.integer({ label: "Hasta (K)", defaultValue: 4000 }),
              label: fields.text({ label: "Etiqueta", defaultValue: "2700–4000 K" }),
              rgb: fields.checkbox({ label: "Incluye RGB", defaultValue: false }),
            }),
            false: fields.empty(),
          }
        ),
      },
    }),

    productos: collection({
      label: "Productos",
      slugField: "nombre",
      path: "src/content/productos/*",
      format: { data: "json" },
      columns: ["nombre", "categoria", "precio"],
      schema: {
        nombre: fields.slug({
          name: { label: "Nombre (español)" },
          slug: {
            label: "Dirección web en español",
            description: "Aparece en el enlace: /tienda/<dirección>/. No uses \"carrito\" ni \"gracias\". Cambiarla rompe enlaces ya compartidos.",
          },
        }),
        nameEn: fields.text({ label: "Nombre (inglés)" }),
        slugEn: fields.text({
          label: "Dirección web en inglés",
          description: "Solo minúsculas, números y guiones. No uses \"cart\" ni \"thank-you\". Ej.: rgb-controller",
          validation: { isRequired: true, pattern: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: "Solo minúsculas, números y guiones" } },
        }),
        categoria: fields.select({
          label: "Categoría",
          options: [
            { label: "Productos LED", value: "led" },
            { label: "Hecho en nuestro taller", value: "taller" },
            { label: "Accesorios marinos", value: "marino" },
          ],
          defaultValue: "led",
        }),
        orden: fields.integer({ label: "Orden dentro de la categoría", defaultValue: 1 }),
        precio: fields.number({
          label: "Precio (USD)",
          step: 0.01,
          validation: { min: 0 },
          description: "Ej.: 24.99. Vacío = se muestra PENDIENTE y no se puede comprar.",
        }),
        variantes: fields.array(
          fields.object({
            nombre: bi("Opción", { description: "Ej.: 5 m (16 ft), Blanco cálido, Grande" }),
            precio: fields.number({ label: "Precio de esta opción (USD)", step: 0.01, validation: { min: 0 }, description: "Vacío = usa el precio del producto." }),
          }),
          { label: "Opciones (tamaño, color…)", description: "Opcional. Si hay opciones, el cliente elige una antes de comprar.", itemLabel: (p) => p.fields.nombre.fields.es.value }
        ),
        short: bi("Resumen corto (tarjetas)", { multiline: true }),
        descripcion: bi("Descripción", { multiline: true, description: "Separa los párrafos con una línea en blanco." }),
        specs: biList("Características", "Ej.: 12 V, luz blanca cálida 3000 K"),
        imagenes: fields.array(
          fields.image({
            label: "Foto",
            directory: "public/pictures/shop",
            publicPath: "/pictures/shop/",
          }),
          { label: "Fotos", description: "La primera es la principal. Cuadradas, de al menos 1200 px. Sin fotos se muestra un espacio PENDIENTE.", itemLabel: (p) => p.value?.filename ?? "Foto" }
        ),
        soloLocal: fields.checkbox({ label: "Solo recogida o entrega local (no se envía por paquetería)", defaultValue: false }),
        agotado: fields.checkbox({ label: "Agotado", defaultValue: false }),
        ejemplo: fields.checkbox({ label: "Producto de ejemplo (se ve con la marca PENDIENTE y no se vende)", defaultValue: false }),
        publicado: fields.checkbox({ label: "Mostrar en la tienda", defaultValue: true }),
      },
    }),

    trabajos: collection({
      label: "Trabajos (fotos)",
      slugField: "titulo",
      path: "src/content/trabajos/*",
      format: { data: "json" },
      columns: ["titulo", "linea"],
      schema: {
        titulo: fields.slug({ name: { label: "Descripción corta (español)", description: "Ej.: Channel letters en fachada" } }),
        captionEn: fields.text({ label: "Descripción corta (inglés)" }),
        linea: line(),
        imagen: fields.image({
          label: "Foto",
          description: "JPG o WebP, idealmente horizontal y de al menos 1600 px de ancho. Sin foto se muestra un espacio PENDIENTE.",
          directory: "public/pictures/work",
          publicPath: "/pictures/work/",
        }),
        alt: bi("Qué se ve en la foto (para personas con lectores de pantalla y para Google)"),
        destacado: fields.checkbox({ label: "Mostrar en el inicio", description: "Se muestran hasta 5 en el inicio.", defaultValue: false }),
        orden: fields.integer({ label: "Orden", defaultValue: 1 }),
      },
    }),
  },

  singletons: {
    tienda: singleton({
      label: "Ajustes de la tienda",
      path: "src/content/tienda",
      format: { data: "json" },
      schema: {
        head: pageHead(),
        recogida: fields.object(
          {
            activo: fields.checkbox({ label: "Ofrecer recogida en el taller (gratis)", defaultValue: true }),
            nota: bi("Nota (opcional)", { description: "Ej.: horario para recoger." }),
          },
          { label: "Recogida en el taller" }
        ),
        local: fields.object(
          {
            activo: fields.checkbox({ label: "Ofrecer entrega local", defaultValue: true }),
            precio: fields.number({ label: "Costo de la entrega (USD)", step: 0.01, validation: { min: 0 }, description: "Vacío = se muestra como PENDIENTE y todavía no se puede pagar." }),
            nota: bi("Zona de entrega", { description: "Ej.: Miami-Dade y Broward" }),
          },
          { label: "Entrega local" }
        ),
        envio: fields.object(
          {
            activo: fields.checkbox({ label: "Ofrecer envío por paquetería", defaultValue: true }),
            precio: fields.number({ label: "Costo del envío (USD)", step: 0.01, validation: { min: 0 }, description: "Tarifa fija por pedido. Vacío = PENDIENTE." }),
            gratisDesde: fields.number({ label: "Envío gratis desde (USD, opcional)", step: 0.01, validation: { min: 0 } }),
            nota: bi("Nota (opcional)", { description: "Ej.: A todo EE.UU." }),
          },
          { label: "Envío por paquetería" }
        ),
        politicas: bi("Cambios, devoluciones y garantía", { multiline: true, description: "Separa los párrafos con una línea en blanco. Vacío = PENDIENTE." }),
      },
    }),

    contacto: singleton({
      label: "Contacto y redes",
      path: "src/content/contacto",
      format: { data: "json" },
      schema: {
        phone: fields.text({ label: "Teléfono / WhatsApp", description: "Formato 305-877-0384", validation: { isRequired: true } }),
        email: fields.text({ label: "Correo", validation: { isRequired: true } }),
        street: fields.text({ label: "Dirección (calle)" }),
        city: fields.text({ label: "Ciudad" }),
        state: fields.text({ label: "Estado", defaultValue: "FL" }),
        zip: fields.text({ label: "Código postal" }),
        hours: bi("Horario"),
        social: fields.array(
          fields.object({
            network: fields.select({
              label: "Red",
              options: [
                { label: "Instagram", value: "instagram" },
                { label: "Facebook", value: "facebook" },
                { label: "TikTok", value: "tiktok" },
                { label: "YouTube", value: "youtube" },
              ],
              defaultValue: "instagram",
            }),
            url: fields.url({ label: "Enlace", validation: { isRequired: true } }),
          }),
          { label: "Redes sociales", itemLabel: (p) => p.fields.network.value }
        ),
      },
    }),

    lineas: singleton({
      label: "Líneas de negocio",
      path: "src/content/lineas",
      format: { data: "json" },
      schema: {
        letreros: lineCopy("Letreros"),
        graficos: lineCopy("Gráficos e impresión"),
        marino: lineCopy("Marino"),
        fabricacion: lineCopy("Fabricación a medida"),
        iluminacion: lineCopy("Iluminación LED"),
      },
    }),

    inicio: singleton({
      label: "Inicio",
      path: "src/content/inicio",
      format: { data: "json" },
      schema: {
        seo: seo(),
        hero: fields.object(
          {
            h1: bi("Título principal (H1)"),
            lead: bi("Texto debajo del título", { multiline: true }),
            note: bi("Nota pequeña"),
          },
          { label: "Portada" }
        ),
        strip: fields.array(bi("Beneficio"), { label: "Franja de beneficios (4)", itemLabel: (p) => p.fields.es.value }),
        lines: fields.object({ title: bi("Título"), text: bi("Texto", { multiline: true }) }, { label: "Sección: líneas de negocio" }),
        packs: fields.object(
          {
            title: bi("Título"),
            text: bi("Texto", { multiline: true }),
            items: fields.array(
              fields.object({
                line: line("Línea (color y dibujo)"),
                name: bi("Nombre del paquete"),
                items: biList("Qué incluye"),
                price: fields.text({ label: "Precio desde", description: "Ej.: $1,200. Vacío = se muestra PENDIENTE." }),
              }),
              { label: "Paquetes", itemLabel: (p) => p.fields.name.fields.es.value }
            ),
          },
          { label: "Sección: paquetes" }
        ),
        work: fields.object({ title: bi("Título") }, { label: "Sección: trabajos recientes" }),
        steps: fields.object(
          {
            title: bi("Título"),
            items: fields.array(
              fields.object({ title: bi("Paso"), text: bi("Descripción", { multiline: true }) }),
              { label: "Pasos", itemLabel: (p) => p.fields.title.fields.es.value }
            ),
          },
          { label: "Sección: cómo trabajamos" }
        ),
        trust: fields.object({ title: bi("Título: logos"), reviewsTitle: bi("Título: reseñas") }, { label: "Sección: confianza" }),
      },
    }),

    nosotros: singleton({
      label: "Nosotros",
      path: "src/content/nosotros",
      format: { data: "json" },
      schema: {
        head: pageHead(),
        storyTitle: bi("Título: historia"),
        story: bi("Nuestra historia", { multiline: true, description: "Separa los párrafos con una línea en blanco. Vacío = PENDIENTE." }),
        experience: bi("Experiencia", { description: "Ej.: 10 años. Vacío = PENDIENTE." }),
        license: fields.text({ label: "Número de licencia", description: "Vacío = PENDIENTE." }),
        insurance: bi("Seguro", { description: "Vacío = PENDIENTE." }),
        zones: bi("Zonas de servicio"),
        valuesTitle: bi("Título: cómo trabajamos"),
        values: fields.array(
          fields.object({ title: bi("Título"), text: bi("Texto", { multiline: true }) }),
          { label: "Cómo trabajamos", itemLabel: (p) => p.fields.title.fields.es.value }
        ),
      },
    }),

    clientes: singleton({
      label: "Clientes y reseñas",
      path: "src/content/clientes",
      format: { data: "json" },
      schema: {
        googleRating: fields.text({ label: "Calificación en Google", description: "Ej.: 4.9. Vacío = no se muestra." }),
        googleCount: fields.integer({ label: "Número de reseñas en Google", validation: { isRequired: false } }),
        googleUrl: fields.url({ label: "Enlace a las reseñas de Google" }),
        reviews: fields.array(
          fields.object({
            author: fields.text({ label: "Nombre del cliente", description: "Solo con su permiso." }),
            business: fields.text({ label: "Negocio o ciudad (opcional)" }),
            text: bi("Reseña", { multiline: true }),
          }),
          { label: "Reseñas", itemLabel: (p) => p.fields.author.value }
        ),
        logos: fields.array(
          fields.object({
            name: fields.text({ label: "Nombre del cliente" }),
            image: fields.image({ label: "Logo", directory: "public/pictures/clients", publicPath: "/pictures/clients/" }),
          }),
          { label: "Logos de clientes", description: "Solo con su permiso.", itemLabel: (p) => p.fields.name.value }
        ),
      },
    }),

    paginaServicios: singleton({
      label: "Página: Servicios",
      path: "src/content/pagina-servicios",
      format: { data: "json" },
      schema: { head: pageHead() },
    }),
    paginaProyectos: singleton({
      label: "Página: Proyectos",
      path: "src/content/pagina-proyectos",
      format: { data: "json" },
      schema: {
        head: pageHead(),
        ctaTitle: bi("Título del cierre"),
        ctaText: bi("Texto del cierre", { multiline: true }),
      },
    }),
    paginaCotizar: singleton({
      label: "Página: Cotizar",
      path: "src/content/pagina-cotizar",
      format: { data: "json" },
      schema: { head: pageHead(), formTitle: bi("Título del formulario") },
    }),
  },
});
