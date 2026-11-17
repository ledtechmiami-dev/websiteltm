// Validación y envío de los constructores de diseño (neón, pisos EVA).
// El formulario lleva el bloque BuilderContact.astro; el diseño va directo al correo y a la agenda.
import { sendQuote } from "./quote";

type Field = HTMLInputElement | HTMLTextAreaElement;
type Msgs = { invalid: string; sending: string; success: string; error: string; notes: string; fields: Record<string, string> };

export type BuilderQuote = {
  formValue: string; // "Línea: Servicio", igual que en el formulario de cotización
  lang: string;
  summary: () => string; // el diseño en texto, va en los detalles del correo
  zona?: () => string;
  // Validación propia del constructor: devuelve el control a enfocar si falta algo
  invalidAt?: () => HTMLElement | null;
};

export function wireQuote(form: HTMLFormElement, o: BuilderQuote) {
  const box = form.querySelector<HTMLElement>(".nb__contact")!;
  const msgs: Msgs = JSON.parse(box.dataset.msgs!);
  const contact = [...box.querySelectorAll<Field>("input, textarea")];
  const statusEl = form.querySelector<HTMLElement>(".nb__status")!;
  const submitBtn = form.querySelector<HTMLButtonElement>("button[type='submit']")!;
  const submitText = submitBtn.textContent;

  const setStatus = (message: string, type?: "error" | "success") => {
    statusEl.textContent = message;
    statusEl.className = "nb__status" + (type ? ` is-${type}` : "");
  };
  const check = (el: Field) => {
    if (el.name === "telefono") {
      const digits = el.value.replace(/\D/g, "").length;
      el.setCustomValidity(el.value && (digits < 10 || /[^\d\s+().-]/.test(el.value)) ? "invalid" : "");
    }
    const ok = el.checkValidity();
    const errEl = document.getElementById(`${el.id}-err`);
    if (errEl) {
      el.setAttribute("aria-invalid", String(!ok));
      errEl.textContent = ok ? "" : msgs.fields[el.name] ?? "";
      errEl.hidden = ok;
    }
    return ok;
  };
  const clear = (el: Field) => {
    el.removeAttribute("aria-invalid");
    const errEl = document.getElementById(`${el.id}-err`);
    if (errEl) { errEl.textContent = ""; errEl.hidden = true; }
  };

  // Valida al salir del campo; mientras corrige, el error se quita en cuanto es válido
  form.addEventListener("focusout", (e) => {
    const el = e.target as Field;
    if (contact.includes(el) && (el.value || el.getAttribute("aria-invalid") === "true")) check(el);
  });
  form.addEventListener("input", (e) => {
    const el = e.target as Field;
    if (contact.includes(el) && el.getAttribute("aria-invalid") === "true" && check(el)) clear(el);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("");
    const invalid = contact.filter((el) => !check(el));
    const extra = o.invalidAt?.() ?? null;
    if (extra || invalid.length) {
      setStatus(msgs.invalid, "error");
      (extra ?? invalid[0]).focus();
      return;
    }
    const get = (name: string) => (form.elements.namedItem(name) as Field).value.trim();
    const notes = get("notas");
    const data = {
      nombre: get("nombre"),
      telefono: get("telefono"),
      email: get("email"),
      tipo: o.formValue,
      zona: o.zona?.() ?? "",
      detalles: o.summary() + (notes ? `\n\n${msgs.notes}: ${notes}` : ""),
      botcheck: (form.elements.namedItem("botcheck") as HTMLInputElement).checked ? "on" : "",
    };
    submitBtn.disabled = true;
    submitBtn.setAttribute("aria-busy", "true");
    submitBtn.textContent = msgs.sending;
    if (await sendQuote(data, o.lang)) {
      contact.forEach((el) => { el.value = ""; clear(el); });
      setStatus(msgs.success, "success");
    } else {
      setStatus(msgs.error, "error");
    }
    submitBtn.disabled = false;
    submitBtn.removeAttribute("aria-busy");
    submitBtn.textContent = submitText;
  });
}
