/* Barbell Diva B — il volto della Diva Bot (fase 2e).
 *
 * Perché un modulo a parte: il personaggio è un DATO, non una decorazione
 * sparsa nel DOM. Qui la faccia è descritta in una tabella (PARTI_VOLTO) e
 * disegnata da `creaVolto`: nessuna immagine da scaricare, nessun font da
 * attendere, nessun CDN. B deve restare identica anche offline.
 *
 * Regole:
 * - solo `createElementNS`: niente innerHTML, niente HTML che arriva dai dati.
 * - inchiostro unico `var(--text)` (chiaro su fondo scuro, scuro su fondo
 *   chiaro): la faccia si legge in entrambi i temi senza token nuovi.
 * - il tono non cambia il disegno a caso: cambia bocca e occhi, e sono tre
 *   stati dichiarati (bene | attenzione | neutro), gli stessi della bolla.
 */

const NS = "http://www.w3.org/2000/svg";

export const GEOMETRIA_VOLTO = Object.freeze({ larghezza: 48, altezza: 48 });

export const TONI_VOLTO = Object.freeze(["bene", "attenzione", "neutro"]);

/* Ogni parte: tag, classi, attributi. `stato` dice per quale tono esiste
 * (null = sempre visibile). Le coordinate stanno dentro il viewBox 48×48. */
export const PARTI_VOLTO = Object.freeze([
  {
    tag: "path",
    classi: "bd-volto-parte bd-volto-capelli",
    stato: null,
    attributi: {
      d: "M24 4.6c-9.7 0-16.4 6.9-16.4 15.8v14.9h32.8V20.4C40.4 11.5 33.7 4.6 24 4.6z",
      "fill-opacity": "0.72"
    }
  },
  {
    tag: "circle",
    classi: "bd-volto-parte bd-volto-faccia",
    stato: null,
    attributi: { cx: "24", cy: "25.4", r: "12.6", "fill-opacity": "0.20", "stroke-width": "2.2" }
  },
  {
    tag: "path",
    classi: "bd-volto-parte bd-volto-frangia",
    stato: null,
    attributi: {
      d: "M12.2 19.4c1.3-6.6 6-10.2 11.8-10.2s10.5 3.6 11.8 10.2c-3.2-2.7-7-4.1-11.8-4.1s-8.6 1.4-11.8 4.1z",
      "fill-opacity": "0.86"
    }
  },
  {
    tag: "line",
    classi: "bd-volto-parte bd-volto-bilanciere",
    stato: null,
    attributi: { x1: "30.2", y1: "9.6", x2: "43.8", y2: "9.6", "stroke-width": "2.6" }
  },
  {
    tag: "circle",
    classi: "bd-volto-parte bd-volto-disco",
    stato: null,
    attributi: { cx: "29.6", cy: "9.6", r: "2.6" }
  },
  {
    tag: "circle",
    classi: "bd-volto-parte bd-volto-disco",
    stato: null,
    attributi: { cx: "44.4", cy: "9.6", r: "2.6" }
  },
  {
    tag: "ellipse",
    classi: "bd-volto-parte bd-volto-guancia",
    stato: null,
    attributi: { cx: "16.4", cy: "30.2", rx: "2.1", ry: "1.5", "fill-opacity": "0.34" }
  },
  {
    tag: "ellipse",
    classi: "bd-volto-parte bd-volto-guancia",
    stato: null,
    attributi: { cx: "31.6", cy: "30.2", rx: "2.1", ry: "1.5", "fill-opacity": "0.34" }
  },

  /* occhi aperti — toni neutro e attenzione */
  {
    tag: "ellipse",
    classi: "bd-volto-parte bd-volto-occhio bd-volto-aperto",
    stato: null,
    attributi: { cx: "18.8", cy: "25.8", rx: "2.55", ry: "3.1" }
  },
  {
    tag: "ellipse",
    classi: "bd-volto-parte bd-volto-occhio bd-volto-aperto",
    stato: null,
    attributi: { cx: "29.2", cy: "25.8", rx: "2.55", ry: "3.1" }
  },
  /* occhi che ridono — solo tono bene */
  {
    tag: "path",
    classi: "bd-volto-parte bd-volto-occhio bd-volto-felice",
    stato: "bene",
    attributi: {
      d: "M16.4 27.2c1-2.2 2.7-3.3 4.5-3.3s3.5 1.1 4.5 3.3",
      "fill-opacity": "0",
      "stroke-width": "2.6"
    }
  },
  {
    tag: "path",
    classi: "bd-volto-parte bd-volto-occhio bd-volto-felice",
    stato: "bene",
    attributi: {
      d: "M22.6 27.2c1-2.2 2.7-3.3 4.5-3.3s3.5 1.1 4.5 3.3",
      "fill-opacity": "0",
      "stroke-width": "2.6"
    }
  },

  /* bocca: una per tono */
  {
    tag: "line",
    classi: "bd-volto-parte bd-volto-bocca bd-volto-bocca-neutro",
    stato: "neutro",
    attributi: { x1: "19.8", y1: "33.2", x2: "28.2", y2: "33.2", "stroke-width": "2.8" }
  },
  {
    tag: "path",
    classi: "bd-volto-parte bd-volto-bocca bd-volto-bocca-bene",
    stato: "bene",
    attributi: {
      d: "M18.8 31.6c1.9 3.4 3.6 5 5.2 5s3.3-1.6 5.2-5",
      "fill-opacity": "0",
      "stroke-width": "1.9"
    }
  },
  {
    tag: "circle",
    classi: "bd-volto-parte bd-volto-bocca bd-volto-bocca-attenzione",
    stato: "attenzione",
    attributi: { cx: "24", cy: "33.6", r: "2.4", "fill-opacity": "0", "stroke-width": "2.8" }
  }
]);

/* Etichetta parlata del tono: serve all'aria-label, non al disegno. */
export function etichettaTono(tono) {
  if (tono === "bene") return "tutto in ordine";
  if (tono === "attenzione") return "c'è qualcosa da guardare";
  return "nessun giudizio";
}

/* Disegna il personaggio. Restituisce null se il documento non sa creare SVG:
 * meglio niente faccia che un errore che spegne la schermata. */
export function creaVolto(doc, tono) {
  if (!doc || typeof doc.createElementNS !== "function") return null;
  const stato = TONI_VOLTO.indexOf(tono) >= 0 ? tono : "neutro";
  const svg = doc.createElementNS(NS, "svg");
  svg.setAttribute("class", "bd-volto");
  svg.setAttribute("viewBox", "0 0 " + GEOMETRIA_VOLTO.larghezza + " " + GEOMETRIA_VOLTO.altezza);
  svg.setAttribute("role", "presentation");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const parte of PARTI_VOLTO) {
    if (parte.stato && parte.stato !== stato) continue;
    const nodo = doc.createElementNS(NS, parte.tag);
    nodo.setAttribute("class", parte.classi);
    for (const nome of Object.keys(parte.attributi)) {
      nodo.setAttribute(nome, parte.attributi[nome]);
    }
    svg.appendChild(nodo);
  }
  return svg;
}
