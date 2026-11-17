// Ruta de Astro /api/stripe-webhook (función en Vercel): Stripe la llama cuando se paga un
// pedido y aquí se avisa por WhatsApp (CallMeBot) con el cliente, los productos y la entrega.
// Stripe además manda el recibo al cliente y un correo a la cuenta de la tienda.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   STRIPE_WEBHOOK_SECRET  "Signing secret" (whsec_…) del webhook creado en Stripe
//   STRIPE_SECRET_KEY      la misma de /api/checkout (para leer los productos del pedido y
//                          marcar el pago como avisado, así un evento repetido no avisa dos veces)
//   CALLMEBOT_APIKEY       la misma de /api/quote; CALLMEBOT_PHONE opcional
// En Stripe: Developers → Webhooks → Add endpoint → https://<dominio>/api/stripe-webhook
// con los eventos checkout.session.completed y checkout.session.async_payment_succeeded.

import crypto from "node:crypto";
import type { APIContext } from "astro";

// Solo los campos de Stripe que se usan aquí
type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string };
type Session = {
  id: string;
  payment_status?: string;
  payment_intent?: string | { id: string } | null;
  amount_total?: number | null;
  metadata?: { entrega?: string } | null;
  customer_details?: { name?: string; phone?: string; email?: string } | null;
  collected_information?: { shipping_details?: { address?: Address } | null } | null;
  shipping_details?: { address?: Address } | null; // versiones anteriores de la API
};
type StripeEvent = { type?: string; data?: { object?: Session } };

const WA_PHONE = process.env.CALLMEBOT_PHONE || "+13058770384";
const TOLERANCE_S = 300;
const STRIPE_VERSION = "2026-08-26.dahlia"; // la misma que en /api/checkout
const DELIVERY_ES: Record<string, string> = { recogida: "Recoge en el taller", local: "Entrega local", envio: "Envío por paquetería" };
// Marca en el PaymentIntent para no mandar dos veces el aviso si Stripe repite el evento
const NOTIFIED_KEY = "aviso_whatsapp";

// Zona de entrega local (Miami-Dade y Broward), aproximada por ZIP. Fuera de estos rangos,
// o en ZIP de los Cayos (Monroe), el aviso pide revisar la dirección antes de entregar.
const LOCAL_ZIPS: [number, number][] = [
  [33004, 33299],
  [33301, 33394],
  [33441, 33443],
];
const KEYS_ZIPS: [number, number][] = [[33001, 33001], [33036, 33037], [33040, 33052], [33070, 33070]];
const inRanges = (zip: number, ranges: [number, number][]) => ranges.some(([from, to]) => zip >= from && zip <= to);

export function inLocalZone(address?: Address | null) {
  const zip = Number(String(address?.postal_code ?? "").slice(0, 5));
  if (address?.state !== "FL" || !zip) return false;
  return inRanges(zip, LOCAL_ZIPS) && !inRanges(zip, KEYS_ZIPS);
}

// Respuesta de Stripe sin tipar: de cada una se leen solo uno o dos campos
const stripeApi = async (path: string, init: RequestInit = {}): Promise<any> => {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Stripe-Version": STRIPE_VERSION,
      ...(init.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${path.split("/")[0]} ${res.status}`);
  return res.json();
};

export const prerender = false;

const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

export const ALL = () => json(405, { ok: false });

// Firma de Stripe: HMAC-SHA256 de "timestamp.cuerpo" con el signing secret
export function verifySignature(payload: string, header: string | null, secret: string, now = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = header.split(",").map((kv) => kv.split("="));
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !signatures.length || Math.abs(now - t) > TOLERANCE_S) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex"));
  return signatures.some((s) => {
    const got = Buffer.from(s);
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

const usd = (amount: number) => `$${(amount / 100).toFixed(2)}`;

type LineItem = { quantity: number; description: string };

async function lineItems(sessionId: string): Promise<LineItem[]> {
  if (!process.env.STRIPE_SECRET_KEY) return [];
  return (await stripeApi(`checkout/sessions/${encodeURIComponent(sessionId)}/line_items?limit=100`)).data ?? [];
}

async function notify(session: Session) {
  if (!process.env.CALLMEBOT_APIKEY) return "not_configured";

  // ¿Ya se avisó de este pago? (Stripe puede entregar el mismo evento más de una vez)
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const canMark = Boolean(pi && process.env.STRIPE_SECRET_KEY);
  if (canMark) {
    const intent = await stripeApi(`payment_intents/${encodeURIComponent(pi!)}`).catch((err: Error) => {
      console.error("[stripe-webhook] payment intent failed:", err.message);
      return null;
    });
    if (intent?.metadata?.[NOTIFIED_KEY]) return "duplicate";
  }

  const items = await lineItems(session.id).catch((err: Error) => {
    console.error("[stripe-webhook] line items failed:", err.message);
    return [];
  });
  const who: NonNullable<Session["customer_details"]> = session.customer_details ?? {};
  const ship = session.collected_information?.shipping_details ?? session.shipping_details;
  const a = ship?.address;
  const address = a ? [a.line1, a.line2, a.city, a.state, a.postal_code].filter(Boolean).join(", ") : "";
  const outOfZone = session.metadata?.entrega === "local" && !inLocalZone(a);

  const text = [
    "🛒 Nuevo pedido pagado, LED Tech Miami",
    `Cliente: ${who.name || "—"}`,
    `Tel: ${who.phone || "—"}`,
    `Email: ${who.email || "—"}`,
    ...items.map((i) => `• ${i.quantity} × ${i.description}`),
    `Entrega: ${DELIVERY_ES[session.metadata?.entrega] || "—"}${address ? `, ${address}` : ""}`,
    ...(outOfZone ? ["⚠️ La dirección parece estar fuera de Miami-Dade/Broward: revisar antes de entregar."] : []),
    `Total: ${usd(session.amount_total ?? 0)}`,
    "Los detalles están en Stripe.",
  ].join("\n");

  const url = "https://api.callmebot.com/whatsapp.php?" + new URLSearchParams({ phone: WA_PHONE, text, apikey: process.env.CALLMEBOT_APIKEY! });
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`callmebot ${res.status}`);

  // Se marca solo después de enviar, para que un fallo no deje el pedido sin aviso
  if (canMark) {
    const body = new URLSearchParams({ [`metadata[${NOTIFIED_KEY}]`]: new Date().toISOString() });
    await stripeApi(`payment_intents/${encodeURIComponent(pi!)}`, { method: "POST", body }).catch((err: Error) =>
      console.error("[stripe-webhook] mark notified failed:", err.message),
    );
  }
  return "ok";
}

export async function POST({ request }: APIContext) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return json(503, { ok: false, error: "not_configured" });

  const payload = await request.text();
  if (!verifySignature(payload, request.headers.get("stripe-signature"), secret)) return json(400, { ok: false });

  const event: StripeEvent = JSON.parse(payload);
  const session = event.data?.object;
  const paid =
    (event.type === "checkout.session.completed" && session?.payment_status === "paid") ||
    event.type === "checkout.session.async_payment_succeeded";

  if (paid) {
    try {
      await notify(session as Session);
    } catch (err) {
      // Se responde 200 igual: el pago ya está en Stripe y así no llegan avisos repetidos
      console.error("[stripe-webhook] notify failed:", (err as Error).message);
    }
  }
  return json(200, { received: true });
}
