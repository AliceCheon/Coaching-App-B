/* Barbell Diva B - PASSO 6b: la carta «Rischio strutturale (RED-S)».
 *
 * Riempe UNA carta sola della Dashboard (#pag-dashboard .ck-red) dentro
 * desktop/index.html: il numero grande (media delle percentuali), la riga
 * «Articolazione più sollecitata» (nome e percentuale) e la nota in fondo.
 * Il resto della Dashboard non si tocca e il riquadro MRV resta com'è.
 *
 * Modulo di sola presentazione: riceve la scheda già letta, chiama il conto
 * puro di comune/articolazioni-b.js e scrive. Nessun Firestore, nessuna
 * scrittura, nessun tasto. Se la scheda non è leggibile la carta dice perché
 * e non mostra zeri.
 */

import { stressRiepilogo } from "./articolazioni-b.js";

const NON = "\u2014";

function aggiorna(nodo, testo) {
  if (nodo) nodo.textContent = String(testo);
}

export function riempiRischioStrutturale(doc, scheda) {
  const carta = doc.querySelector("#pag-dashboard .ck-red");
  if (!carta) return null;
  const num = carta.querySelector("[data-reds-num]");
  const stato = carta.querySelector("[data-reds-stato]");
  const piu = carta.querySelector("[data-reds-piu]");
  const nota = carta.querySelector("[data-reds-nota]");

  const riepilogo = scheda && typeof scheda === "object" ? stressRiepilogo(scheda) : null;

  if (!riepilogo || riepilogo.leggibile !== true) {
    const motivo = !scheda || typeof scheda !== "object"
      ? "nessuna scheda da leggere: la scheda attiva non è arrivata alla carta"
      : (riepilogo && riepilogo.motivo) || "la scheda non si riesce a leggere";
    aggiorna(num, NON);
    aggiorna(stato, "non calcolabile");
    aggiorna(piu, "non calcolabile");
    aggiorna(nota, "Non calcolato: " + motivo + ". Nessuno zero al posto di un dato che manca.");
    carta.setAttribute("data-reds", "non-calcolabile");
    return riepilogo;
  }

  aggiorna(num, riepilogo.mediaIntera + "%");
  aggiorna(stato, "media delle 8 articolazioni");
  const massima = riepilogo.piuSollecitata;
  aggiorna(piu, massima
    ? massima.articolazione + " · " + Math.round(massima.percentuale) + "%"
    : "non registrata");
  const sopra = riepilogo.sopraCento.length
    ? " Sopra il 100%: " + riepilogo.sopraCento.join(", ") + "."
    : "";
  aggiorna(nota, "Calcolato sulla scheda attiva: 8 articolazioni, tolleranze di partenza"
    + " (serie equivalenti a settimana, " + riepilogo.righeContate + " righe lette)." + sopra);
  carta.setAttribute("data-reds", "calcolato");
  return riepilogo;
}
