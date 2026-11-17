// Ruta de Astro /api/checkout (función en Vercel): recibe el carrito, vuelve a calcular los
// precios con el catálogo del sitio (nunca usa precios del navegador) y abre una página de
// pago de Stripe Checkout. Sin librerías: llamada directa a la API de Stripe.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY      clave secreta de Stripe (sk_live_… o sk_test_… para pruebas)
//   STRIPE_AUTOMATIC_TAX   opcional; "true" si activaste Stripe Tax para cobrar el sales tax
//                          (antes: dirección de la oficina y registro de Florida en Stripe → Tax)
// Sin STRIPE_SECRET_KEY responde 503 y el carrito ofrece enviar el pedido por WhatsApp.

import { DELIVERY, canBuy, deliveryCost, productByKey, unitPrice } from "../../data/shop";
import { ROUTES } from "../../i18n/routes";

const MAX_LINES = 50;
const MAX_QTY = 99;
// Versión fija de la API (la misma en /api/stripe-webhook) para que un cambio en la cuenta no altere las respuestas
const STRIPE_VERSION = "2026-08-26.dahlia";

export const prerender = false;

const json = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });

export const ALL = () => json(405, { ok: false }, { Allow: "POST" });

const cents = (usd) => Math.round(usd * 100);

export async function POST({ request }) {
  // Solo desde el propio sitio
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && new URL(origin).host !== host) return json(403, { ok: false });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json(503, { ok: false, error: "not_configured" });

  const body = await request.json().catch(() => null);
  const lang = body?.lang === "en" ? "en" : "es";
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length || items.length > MAX_LINES) return json(400, { ok: false, error: "empty" });

  // Cada línea se valida contra el catálogo publicado
  const lines = [];
  for (const raw of items) {
    const product = productByKey(String(raw?.id ?? ""));
    const variant = Number.isInteger(raw?.v) ? raw.v : null;
    const qty = Number.isInteger(raw?.q) ? raw.q : 0;
    if (!product || !canBuy(product) || qty < 1 || qty > MAX_QTY) return json(400, { ok: false, error: "unavailable" });
    if (product.variants.length ? !product.variants[variant] : variant !== null) return json(400, { ok: false, error: "unavailable" });
    const price = unitPrice(product, variant);
    if (price === null) return json(400, { ok: false, error: "unavailable" });
    lines.push({ product, variant, qty, price });
  }

  const delivery = DELIVERY.find((d) => d.key === body?.entrega && d.ready);
  if (!delivery) return json(400, { ok: false, error: "delivery" });
  if (delivery.key === "envio" && lines.some((l) => l.product.localOnly)) return json(400, { ok: false, error: "delivery" });

  const subtotal = lines.reduce((sum, l) => sum + cents(l.price) * l.qty, 0) / 100;
  const shipping = deliveryCost(delivery.key, subtotal);
  if (shipping === null) return json(400, { ok: false, error: "delivery" });

  const base = new URL(request.url).origin;
  const p = new URLSearchParams();
  p.append("mode", "payment");
  p.append("locale", lang);
  p.append("success_url", `${base}${ROUTES.thanks[lang]}?session_id={CHECKOUT_SESSION_ID}`);
  p.append("cancel_url", `${base}${ROUTES.cart[lang]}`);
  p.append("phone_number_collection[enabled]", "true");

  lines.forEach((l, i) => {
    const name = l.product[lang].name + (l.variant !== null ? ` (${l.product.variants[l.variant].name[lang]})` : "");
    p.append(`line_items[${i}][quantity]`, String(l.qty));
    p.append(`line_items[${i}][price_data][currency]`, "usd");
    p.append(`line_items[${i}][price_data][unit_amount]`, String(cents(l.price)));
    // Los precios no incluyen impuesto: con Stripe Tax el sales tax se suma aparte
    p.append(`line_items[${i}][price_data][tax_behavior]`, "exclusive");
    p.append(`line_items[${i}][price_data][product_data][name]`, name.slice(0, 250));
    p.append(`line_items[${i}][price_data][product_data][metadata][producto]`, l.product.key);
    if (l.product.images[0]) p.append(`line_items[${i}][price_data][product_data][images][0]`, `${base}${l.product.images[0]}`);
  });

  // La entrega va como tarifa de envío; para entregar o enviar se pide la dirección
  p.append("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  p.append("shipping_options[0][shipping_rate_data][display_name]", delivery.name[lang]);
  p.append("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(cents(shipping)));
  p.append("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "usd");
  p.append("shipping_options[0][shipping_rate_data][tax_behavior]", "exclusive");
  if (delivery.key !== "recogida") {
    p.append("shipping_address_collection[allowed_countries][0]", "US");
    const note = delivery.note[lang] || delivery.note.es;
    if (note) p.append("custom_text[shipping_address][message]", note.slice(0, 1200));
  }

  if (process.env.STRIPE_AUTOMATIC_TAX === "true") {
    p.append("automatic_tax[enabled]", "true");
    p.append("billing_address_collection", "required");
  }

  p.append("metadata[entrega]", delivery.key);
  p.append("metadata[idioma]", lang);

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_VERSION,
      },
      body: p,
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      console.error("[checkout] stripe", res.status, data.error?.message);
      return json(502, { ok: false, error: "stripe" });
    }
    return json(200, { ok: true, url: data.url });
  } catch (err) {
    console.error("[checkout] failed:", err.message);
    return json(502, { ok: false, error: "stripe" });
  }
}
