// Ruta de Astro /api/quote (función en Vercel): cada solicitud de cotización crea una
// llamada de seguimiento en Google Calendar y avisa por WhatsApp al número de LED Tech Miami.
// El correo sigue saliendo desde el navegador con Web3Forms; esto va en paralelo.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GOOGLE_SERVICE_ACCOUNT_JSON  contenido completo del archivo JSON de la cuenta de servicio
//   GOOGLE_CALENDAR_ID           opcional; por defecto ledtechmiami@gmail.com
//   CALLMEBOT_APIKEY             clave que CallMeBot envía al activar el WhatsApp
//   CALLMEBOT_PHONE              opcional; por defecto +13058770384
// Si falta la configuración de una parte, esa parte se omite sin romper la otra.

import crypto from "node:crypto";
import type { APIContext } from "astro";

const TZ = "America/New_York";
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "ledtechmiami@gmail.com";
const WA_PHONE = process.env.CALLMEBOT_PHONE || "+13058770384";

// Horario de la llamada de seguimiento (minutos desde medianoche, hora de Miami)
const LEAD_MIN = 60;          // se agenda 1 hora después de la solicitud
const CALL_MIN = 30;          // duración del evento
const OPEN = 8 * 60;          // 8:00 AM
const CLOSE = 18 * 60;        // 6:00 PM
const MORNING = 9 * 60;       // fuera de horario → 9:00 AM

// tipo = "Línea: Servicio" (p. ej. "Marino: Pisos EVA foam para botes")
const LIMITS = { nombre: 100, telefono: 40, email: 200, tipo: 120, zona: 100, detalles: 3000 };

// Solicitud ya recortada a los límites
type Lead = Record<keyof typeof LIMITS, string> & { lang: "es" | "en" };
// Fecha y hora de pared en Miami (minutos desde medianoche)
type Slot = { y: number; m: number; d: number; min: number };
type ServiceAccount = { client_email: string; private_key: string };

/* ---------- Horario ---------- */

function wallClock(date: Date): Slot {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(date).map((x) => [x.type, x.value])
  );
  return { y: +p.year, m: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute };
}

// Devuelve la hora local de Miami de la llamada: 1 h después, redondeada al cuarto
// de hora; de madrugada pasa a las 9 AM de ese día, después del cierre a las 9 AM del siguiente.
export function nextCallSlot(now = new Date()): Slot {
  const t = wallClock(new Date(now.getTime() + LEAD_MIN * 60000));
  let { y, m, d } = t;
  let min = Math.ceil(t.min / 15) * 15;
  if (min < OPEN) {
    min = MORNING;
  } else if (min + CALL_MIN > CLOSE) {
    const next = new Date(Date.UTC(y, m - 1, d + 1));
    [y, m, d] = [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()];
    min = MORNING;
  }
  return { y, m, d, min };
}

const pad = (n: number) => String(n).padStart(2, "0");
const localIso = ({ y, m, d }: Slot, min: number) =>
  `${y}-${pad(m)}-${pad(d)}T${pad(Math.floor(min / 60))}:${pad(min % 60)}:00`;

// "mié, 10 sep, 3:15 p. m." — se formatea en UTC porque los números ya son hora de Miami
export function slotLabel(slot: Slot) {
  const asUtc = new Date(Date.UTC(slot.y, slot.m - 1, slot.d, Math.floor(slot.min / 60), slot.min % 60));
  return new Intl.DateTimeFormat("es-US", {
    timeZone: "UTC", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(asUtc);
}

const nowLabel = () =>
  new Intl.DateTimeFormat("es-US", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }).format(new Date());

/* ---------- Google Calendar (cuenta de servicio, sin librerías) ---------- */

async function googleToken(sa: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const json: { access_token?: string; error?: string } = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) throw new Error(`token ${res.status} ${json.error || ""}`);
  return json.access_token;
}

async function createEvent(q: Lead, slot: Slot) {
  // Solo se llama cuando la variable existe (ver POST)
  const sa: ServiceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const token = await googleToken(sa);

  const description = [
    `Nombre: ${q.nombre}`,
    `Teléfono: ${q.telefono}`,
    `Email: ${q.email}`,
    `Tipo de proyecto: ${q.tipo}`,
    `Ciudad / zona: ${q.zona || "—"}`,
    `Idioma del cliente: ${q.lang === "en" ? "Inglés" : "Español"}`,
    `Recibida: ${nowLabel()}`,
    "",
    "Detalles:",
    q.detalles,
  ].join("\n");

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: `Llamar a ${q.nombre} (cotización ${q.tipo})`,
        description,
        location: q.zona || undefined,
        start: { dateTime: localIso(slot, slot.min), timeZone: TZ },
        end: { dateTime: localIso(slot, slot.min + CALL_MIN), timeZone: TZ },
        reminders: { useDefault: true },
      }),
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) throw new Error(`calendar ${res.status} ${(await res.text()).slice(0, 200)}`);
}

/* ---------- WhatsApp (CallMeBot) ---------- */

async function sendWhatsApp(q: Lead, slot: Slot) {
  const text = [
    "🔔 Nueva cotización, LED Tech Miami",
    `Cliente: ${q.nombre}`,
    `Tel: ${q.telefono}`,
    `Proyecto: ${q.tipo}${q.zona ? `, ${q.zona}` : ""}`,
    `Llamada agendada: ${slotLabel(slot)}`,
    "Los detalles están en el calendario y en tu correo.",
  ].join("\n");

  // Solo se llama cuando CALLMEBOT_APIKEY existe (ver POST)
  const url = "https://api.callmebot.com/whatsapp.php?" + new URLSearchParams({
    phone: WA_PHONE,
    text,
    apikey: process.env.CALLMEBOT_APIKEY!,
  });
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`callmebot ${res.status}`);
}

/* ---------- Handler ---------- */

function clean(body: Record<string, unknown>): Lead {
  const q = {} as Lead;
  for (const [key, max] of Object.entries(LIMITS) as [keyof typeof LIMITS, number][]) {
    q[key] = String(body[key] ?? "").trim().slice(0, max);
  }
  q.lang = body.lang === "en" ? "en" : "es";
  return q;
}

// Se ejecuta en cada solicitud (no se genera al publicar)
export const prerender = false;

const json = (status: number, data: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });

export const ALL = () => json(405, { ok: false }, { Allow: "POST" });

export async function POST({ request }: APIContext) {
  // Solo se aceptan envíos desde el propio sitio (sirve también con dominio propio)
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && new URL(origin).host !== host) return json(403, { ok: false });

  const raw = await request.json().catch(() => null);
  const body: Record<string, unknown> = raw && typeof raw === "object" ? raw : {};
  if (body.botcheck) return json(200, { ok: true }); // trampa anti-spam

  const q = clean(body);
  if (!q.nombre || !q.telefono || !q.email || !q.tipo || !q.detalles) {
    return json(400, { ok: false, error: "missing_fields" });
  }

  const slot = nextCallSlot();
  const tasks: Record<"calendar" | "whatsapp", Promise<void> | null> = {
    calendar: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? createEvent(q, slot) : null,
    whatsapp: process.env.CALLMEBOT_APIKEY ? sendWhatsApp(q, slot) : null,
  };

  const result: Record<string, "ok" | "error" | "not_configured"> = {};
  await Promise.all(
    Object.entries(tasks).map(async ([name, task]) => {
      if (!task) return (result[name] = "not_configured");
      try {
        await task;
        result[name] = "ok";
      } catch (err) {
        console.error(`[quote] ${name} failed:`, (err as Error).message);
        result[name] = "error";
      }
    })
  );

  const values = Object.values(result);
  const status = values.includes("ok") ? 200 : values.includes("error") ? 502 : 503;
  return json(status, { ok: status === 200, ...result, slot: localIso(slot, slot.min) });
}
