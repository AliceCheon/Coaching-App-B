/* Barbell Diva B — PASSO 14 (versione semplice): il campo scrivibile.
 *
 * In Dati cliente → Anamnesi → Salute la riga «Patologie o infortuni» oggi e'
 * un trattino. Qui diventa un'area di testo con «Salva» e «Annulla», e nient'
 * altro: il resto dell'anamnesi resta in sola lettura con «non registrato»
 * (non si inventa niente e non si aggiunge un bottone a ogni campo).
 *
 * Il markup del v31 (desktop/index.html) NON si tocca: la riga si sostituisce
 * da qui, dentro il pannello che c'e' gia'. Cosi' la guardia 42 resta verde e
 * il desktop non prende una riga in piu' nel documento delle differenze.
 *
 * Il modulo non scrive: riceve `onSalva(testo)` e `onAnnulla()`, li chiama, e
 * aspetta che la pagina rilegga. Se la pagina sta leggendo o l'area di testo
 * ha il fuoco, non si ridisegna (chi sta scrivendo non perde una lettera).
 */

import { riconosciArticolazioni, testoAnamnesi, NON_DICHIARATO } from "./anamnesi-b.js";

function nodo(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

/* Il pannello dell'anamnesi: `data-pan="anamnesi"`. */
function pannelloAnamnesi(doc) {
  const tutti = typeof doc.querySelectorAll === "function" ? doc.querySelectorAll("[data-pan]") : [];
  for (let i = 0; i < tutti.length; i += 1) {
    const p = tutti[i];
    if (!p || typeof p.getAttribute !== "function") continue;
    if (p.getAttribute("data-pan") === "anamnesi") return p;
  }
  return null;
}

/* La riga «Patologie o infortuni» dentro il riquadro d'avviso: la prima div
 * il cui primo figlio dice «Patologie». */
function rigaPatologie(pannello) {
  const riquadri = pannello && typeof pannello.querySelectorAll === "function"
    ? pannello.querySelectorAll(".dc-warn")
    : [];
  for (let i = 0; i < riquadri.length; i += 1) {
    const dentro = riquadri[i] && riquadri[i].children ? riquadri[i].children : [];
    for (let k = 0; k < dentro.length; k += 1) {
      const riga = dentro[k];
      const primo = riga && riga.firstElementChild ? riga.firstElementChild : null;
      if (primo && /patolog/i.test(String(primo.textContent || ""))) return riga;
    }
  }
  return null;
}

/* Il testo per la nota: cosa si e' riconosciuto e cosa no. Mai un numero
 * inventato: le frasi non capite si elencano come stanno. */
export function notaRiconoscimento(riconosciute) {
  const r = riconosciute && typeof riconosciute === "object" ? riconosciute : { articolazioni: [], nonRiconosciute: [], collo: [] };
  const articolazioni = Array.isArray(r.articolazioni) ? r.articolazioni : [];
  const nonRiconosciute = Array.isArray(r.nonRiconosciute) ? r.nonRiconosciute : [];
  const collo = Array.isArray(r.collo) ? r.collo : [];
  const pezzi = [];
  pezzi.push(articolazioni.length
    ? "Riconosciute: " + articolazioni.join(", ") + "."
    : "Nessuna delle otto articolazioni riconosciuta nel testo.");
  if (collo.length) pezzi.push("«" + collo.join("», «") + "»: il collo non e' una delle otto, non entra nel conto.");
  if (nonRiconosciute.length) pezzi.push("Non riconosciute: " + nonRiconosciute.map((f) => "\u00ab" + f + "\u00bb").join(", ") + ".");
  return pezzi.join(" ");
}

/* Il montaggio. `dolori` e' il documento letto (o null). */
export function montaCampoAnamnesi(doc, anamnesi, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (!doc || typeof doc.createElement !== "function") return null;
  const pannello = pannelloAnamnesi(doc);
  if (!pannello) return null;
  const riga = rigaPatologie(pannello);
  if (!riga) return null;

  const letto = typeof anamnesi === "string" ? null : anamnesi;
  const testo = typeof anamnesi === "string" ? anamnesi : testoAnamnesi(letto);
  const presente = Boolean(letto && typeof letto === "object");

  /* Gia' montato: si aggiorna solo il valore, e solo se nessuno sta scrivendo. */
  const gia = typeof riga.querySelector === "function" ? riga.querySelector("[data-anamnesi]") : null;
  const area = gia ? riga.querySelector("[data-anamnesi='area']") : null;
  const attivo = doc.activeElement;
  if (gia && area && attivo !== area) {
    area.value = presente ? testo : "";
    /* il testo di prima si tiene aggiornato qui: altrimenti l'Annulla
     * rimetterebbe il valore del primo montaggio, non quello del disco. */
    riga.datiAnamnesi = { testo: testo, presente: presente };
    const notaGia = riga.querySelector("[data-anamnesi='nota']");
    if (notaGia) notaGia.textContent = presente ? notaRiconoscimento(riconosciArticolazioni(testo)) : NON_DICHIARATO;
    return { aggiornato: true };
  }
  if (gia && area && attivo === area) return { aggiornato: false, motivo: "l'area di testo ha il fuoco: non si ridisegna" };

  /* Prima volta: la riga diventa una colonna, con l'etichetta in testa. */
  while (riga.firstChild) riga.removeChild(riga.firstChild);
  riga.setAttribute("data-anamnesi", "campo");
  if (riga.style) {
    riga.style.display = "block";
    riga.style.alignItems = "stretch";
  }

  const etichetta = nodo(doc, "b", "", "Patologie o infortuni");
  riga.appendChild(etichetta);

  riga.datiAnamnesi = { testo: testo, presente: presente };
  const area2 = nodo(doc, "textarea", "dc-anam-t");
  area2.setAttribute("data-anamnesi", "area");
  area2.setAttribute("rows", "3");
  area2.setAttribute("aria-label", "Patologie o infortuni");
  area2.value = testo === NON_DICHIARATO ? "" : testo;
  area2.setAttribute("placeholder", "Scrivi a parole: per esempio \u00ablombalgia cronica, fastidio al ginocchio destro\u00bb");
  if (area2.style) {
    area2.style.width = "100%";
    area2.style.marginTop = "6px";
    area2.style.background = "rgba(0,0,0,.25)";
    area2.style.color = "inherit";
    area2.style.border = "1px solid rgba(255,224,102,.35)";
    area2.style.borderRadius = "8px";
    area2.style.padding = "8px";
    area2.style.font = "600 12px/1.5 inherit";
    area2.style.resize = "vertical";
  }
  riga.appendChild(area2);

  const fila = nodo(doc, "div", "dc-anam-b");
  if (fila.style) {
    fila.style.display = "flex";
    fila.style.gap = "8px";
    fila.style.marginTop = "8px";
    fila.style.alignItems = "center";
  }
  const salva = nodo(doc, "button", "dc-btn", "Salva");
  salva.setAttribute("type", "button");
  salva.setAttribute("data-anamnesi", "salva");
  const annulla = nodo(doc, "button", "dc-btn ghost", "Annulla");
  annulla.setAttribute("type", "button");
  annulla.setAttribute("data-anamnesi", "annulla");
  fila.appendChild(salva);
  fila.appendChild(annulla);
  riga.appendChild(fila);

  const nota = nodo(doc, "span", "dc-anam-n", "");
  nota.setAttribute("data-anamnesi", "nota");
  if (nota.style) {
    nota.style.display = "block";
    nota.style.marginTop = "6px";
    nota.style.font = "600 10.5px/1.5 inherit";
    nota.style.color = "inherit";
    nota.style.opacity = ".85";
  }
  riga.appendChild(nota);

  const mostraNota = (valore) => {
    nota.textContent = valore == null || valore === "" ? NON_DICHIARATO : notaRiconoscimento(riconosciArticolazioni(valore));
  };
  mostraNota(presente ? testo : "");

  salva.onclick = () => {
    if (typeof o.onSalva === "function") o.onSalva(String(area2.value || ""));
  };
  annulla.onclick = () => {
    if (typeof o.onAnnulla === "function") o.onAnnulla();
    const dati = riga.datiAnamnesi || { testo: "", presente: false };
    area2.value = dati.presente ? dati.testo : "";
    mostraNota(dati.presente ? dati.testo : "");
  };
  /* La nota si aggiorna mentre si scrive: cosi' si vede subito cosa l'app
   * capisce, prima ancora di salvare. */
  area2.oninput = () => { mostraNota(String(area2.value || "")); };

  return { montato: true, testo: testo, presente: presente };
}
