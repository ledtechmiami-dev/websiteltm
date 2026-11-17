// Efectos de movimiento del sitio. Todo es opcional: sin JavaScript o con
// "reducir movimiento" activado, el contenido se ve completo y quieto.
const root = document.documentElement;

// Encabezado con sombra en cuanto la página se desplaza
const header = document.querySelector<HTMLElement>(".site-header");
const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 8);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

if (root.classList.contains("js-motion")) {
  // Aparición al entrar en pantalla, escalonada entre elementos hermanos
  const REVEAL = [
    ".sec-head", ".strip", ".marquee", ".line-card", ".pack", ".work > *", ".steps li",
    ".panel", ".svc-card", ".mini-lines > li", ".values li", ".facts > div", ".cta",
    ".quote__intro", ".form", ".gallery > li", ".detail > *", ".prose",
  ].join(",");

  if ("IntersectionObserver" in window) {
    const els = [...document.querySelectorAll<HTMLElement>(REVEAL)].filter(
      (el) => !el.closest(".site-header, .hero, .phero"),
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    for (const el of els) {
      const siblings = el.parentElement ? [...el.parentElement.children].filter((c) => c.matches(REVEAL)) : [];
      el.style.setProperty("--i", String(Math.min(Math.max(siblings.indexOf(el), 0), 5)));
      el.classList.add("reveal");
      io.observe(el);
    }
  }

  // Luz que sigue al cursor en la tarjeta oscura de la portada
  const promo = document.querySelector<HTMLElement>(".promo");
  if (promo && matchMedia("(pointer: fine)").matches) {
    promo.addEventListener("pointermove", (e) => {
      const r = promo.getBoundingClientRect();
      promo.style.setProperty("--mx", `${e.clientX - r.left}px`);
      promo.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }
}
