// Datos del negocio. Los de contacto se editan en el panel (Contacto y redes).
import { CONTACT } from "./content";
import { SITE_URL, SOCIAL_NAMES } from "./config";

export type Lang = "es" | "en";

const digits = CONTACT.phone.replace(/\D/g, "");
const street = CONTACT.street.trim();
const cityLine = [CONTACT.city, [CONTACT.state, CONTACT.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

export const SITE = {
  name: "LED Tech Miami",
  url: SITE_URL,
  phone: CONTACT.phone,
  phoneIntl: digits.length === 10 ? `1${digits}` : digits,
  email: CONTACT.email,
  address: {
    street,
    city: CONTACT.city,
    state: CONTACT.state,
    zip: CONTACT.zip,
    full: [street, cityLine].filter(Boolean).join(", "),
  },
  hours: CONTACT.hours,
  social: CONTACT.social
    .filter((s) => s.url)
    .map((s) => ({ name: SOCIAL_NAMES[s.network] ?? s.network, icon: s.network, url: s.url })),
};

export const waLink = (text: string) =>
  `https://wa.me/${SITE.phoneIntl}?text=${encodeURIComponent(text)}`;

export const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SITE.address.full)}`;
