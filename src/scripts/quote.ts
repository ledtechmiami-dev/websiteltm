// Envío de solicitudes de cotización, compartido por el formulario y el constructor de neón.
// Correo (Web3Forms) y agenda + WhatsApp (/api/quote) van en paralelo:
// basta con que uno llegue para que la solicitud no se pierda.
import { WEB3FORMS_KEY } from "../data/config";

export type QuoteData = Record<string, string>;

async function sendEmail(data: QuoteData, lang: string) {
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject: `Nueva cotización — ${data.tipo} — ${data.nombre}`,
      from_name: "LED Tech Miami (sitio web)",
      replyto: data.email,
      botcheck: data.botcheck ? true : "",
      "Nombre": data.nombre,
      "Teléfono": data.telefono,
      "Email": data.email,
      "Qué necesita": data.tipo,
      "Ciudad / zona": data.zona || "—",
      "Idioma del cliente": lang === "en" ? "Inglés" : "Español",
      "Página": location.pathname,
      "Detalles": data.detalles,
    }),
  });
  const result = await res.json().catch(() => ({}));
  if (!res.ok || !result.success) throw new Error(result.message || String(res.status));
}

async function sendToAgenda(data: QuoteData, lang: string) {
  const res = await fetch("/api/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, lang }),
    keepalive: true,
  });
  if (!res.ok) throw new Error(String(res.status));
}

// true si llegó al menos por una de las dos vías
export async function sendQuote(data: QuoteData, lang: string) {
  const [mail, agenda] = await Promise.allSettled([sendEmail(data, lang), sendToAgenda(data, lang)]);
  return mail.status === "fulfilled" || agenda.status === "fulfilled";
}
