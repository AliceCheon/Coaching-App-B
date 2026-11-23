/* Barbell Diva B — PASSO 14d: il campo «Patologie o infortuni».
 *
 * In Dati cliente → Anamnesi → Salute la riga «Patologie o infortuni» e'
 * un'area di testo con «Salva» e «Annulla», e nient'altro: il resto
 * dell'anamnesi resta in sola lettura con «non registrato».
 *
 * Il markup del v31 (desktop/index.html) NON si tocca: la riga si sostituisce
 * da qui, dentro il pannello che c'e' gia'. Cosi' la guardia 42 resta verde.
 *
 * Accanto ai due tasti c'e' SEMPRE una riga d'esito:
 *   «Salvato alle HH:MM» · «Non ho salvato: <motivo>» · «non dichiarato» ·
 *   «Non ho potuto leggere la dichiarazione: <motivo>» · «Sto salvando…».
 * Resta finche' non cambia il testo. L'errore sta qui, accanto al campo, non
 * solo nella riga di stato in cima alla pagina.
 *
 * Questo modulo non scrive e non legge: riceve `onSalva(testo)` e `onAnnulla()`
 * dalla pagina, e ridisegna solo quello che gli viene detto.
 */

import { riconosciArticolazioni, NON_DICHIARATO } from "./anamnesi-b.js";
import { testoEsito } from "./anamnesi-viva.js";

function nodo(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function pannelloAnamnesi(doc) {
  const tutti = typeof doc.querySelectorAll === "function" ? doc.querySelectorAll("[data-pan]") : [];
  for (let i = 0; i < tutti.length; i += 1) {
    const p = tutti[i];
    if (p && typeof p.getAttribute === "function" && p.getAttribute("data-pan") === "anamnesi") return p;
  }
  return null;
}

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

/* Cosa si e' riconosciuto nel testo, e cosa no. Mai un numero inventato. */
export function notaRiconoscimento(riconosciute) {
  const r = riconosciute && typeof riconosciute === "object" ? riconosciute : { articolazioni: [], nonRiconosciute: [], collo: [] };
  const articolazioni = Array.isArray(r.articolazioni) ? r.articolazioni : [];
  const nonRiconosciute = Array.isArray(r.nonRiconosciute) ? r.nonRiconosciute : [];
  const collo = Array.isArray(r.collo) ? r.collo : [];
  const pezzi = [];
  pezzi.push(articolazioni.length
    ? "Riconosciute: " + articolazioni.join(", ") + "."
    : "Nessuna delle otto articolazioni riconosciuta nel testo.");
  if (collo.length) pezzi.push("\u00ab" + collo.join("\u00bb, \u00ab") + "\u00bb: il collo non e' una delle otto, non entra nel conto.");
  if (nonRiconosciute.length) pezzi.push("Non riconosciute: " + nonRiconosciute.map((f) => "\u00ab" + f + "\u00bb").join(", ") + ".");
  return pezzi.join(" ");
}

/* Il montaggio. `dichiarazione` e' quella letta dal registro (o null).
 * `opzioni.esito` + `opzioni.token`: l'esito si applica solo quando il token
 * cambia, cosi' un ridisegno non cancella la riga appena scritta. */
export function montaCampoAnamnesi(doc, dichiarazione, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (!doc || typeof doc.createElement !== "function") return null;
  const pannello = pannelloAnamnesi(doc);
  if (!pannello) return null;
  const riga = rigaPatologie(pannello);
  if (!riga) return null;

  const dich = dichiarazione && typeof dichiarazione === "object" ? dichiarazione : null;
  const letto = dich && !dich.errore && dich.presente ? String(dich.testo == null ? "" : dich.testo) : "";
  const erroreLettura = o.erroreLettura || (dich && dich.errore ? dich.errore : null);
  const scrivendo = o.scrivendo === true;

  const gia = typeof riga.querySelector === "function" ? riga.querySelector("[data-anamnesi]") : null;
  const area = gia ? riga.querySelector("[data-anamnesi=\"area\"]") : null;
  const attivo = doc.activeElement;

  if (gia && area) {
    /* L'esito nuovo entra solo se il token e' cambiato: un giro di pagina non
     * deve riscrivere «Salvato alle…» sopra un errore appena comparso. */
    const token = o.token == null ? null : String(o.token);
    if (token != null && token !== String(riga.tokenAnamnesi || "")) {
      riga.esitoAnamnesi = o.esito || null;
      riga.tokenAnamnesi = token;
      /* L'esito non tocca il testo ne' lo stato «modificato»: se l'utente ha
       * scritto qualcosa e il salvataggio fallisce, quello che ha scritto
       * resta dov'e'. */
      if (!riga.dirty) riga.datiAnamnesi = { testo: letto, presente: Boolean(dich && dich.presente && !dich.errore), aggiornato: (dich && dich.aggiornato) || "" };
    }
    /* Il valore si riscrive solo se non ci sono modifiche in corso: chi sta
     * scrivendo non perde una lettera, e un errore accanto al tasto non
     * cancella il testo che l'ha causato. */
    if (attivo !== area && !riga.dirty) {
      area.value = letto;
      riga.datiAnamnesi = { testo: letto, presente: Boolean(dich && dich.presente && !dich.errore), aggiornato: (dich && dich.aggiornato) || "" };
    }
    aggiorna(doc, riga, area, { letto, erroreLettura, scrivendo });
    return { aggiornato: true };
  }

  /* Prima volta: la riga diventa una colonna, con l'etichetta in testa. */
  while (riga.firstChild) riga.removeChild(riga.firstChild);
  riga.setAttribute("data-anamnesi", "campo");
  if (riga.style) { riga.style.display = "block"; riga.style.alignItems = "stretch"; }
  riga.datiAnamnesi = { testo: letto, presente: Boolean(dich && dich.presente && !dich.errore), aggiornato: (dich && dich.aggiornato) || "" };
  riga.esitoAnamnesi = o.esito || null;
  riga.tokenAnamnesi = o.token == null ? "" : String(o.token);
  riga.dirty = false;

  riga.appendChild(nodo(doc, "b", "", "Patologie o infortuni"));

  const area2 = nodo(doc, "textarea", "dc-anam-t");
  area2.setAttribute("data-anamnesi", "area");
  area2.setAttribute("rows", "3");
  area2.setAttribute("aria-label", "Patologie o infortuni");
  area2.value = letto;
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
  if (fila.style) { fila.style.display = "flex"; fila.style.gap = "8px"; fila.style.marginTop = "8px"; fila.style.alignItems = "center"; }
  const salva = nodo(doc, "button", "dc-btn", "Salva");
  salva.setAttribute("type", "button");
  salva.setAttribute("data-anamnesi", "salva");
  const annulla = nodo(doc, "button", "dc-btn ghost", "Annulla");
  annulla.setAttribute("type", "button");
  annulla.setAttribute("data-anamnesi", "annulla");
  fila.appendChild(salva);
  fila.appendChild(annulla);
  riga.appendChild(fila);

  const linea = nodo(doc, "span", "dc-anam-n", "");
  linea.setAttribute("data-anamnesi", "nota");
  linea.setAttribute("role", "status");
  if (linea.style) {
    linea.style.display = "block";
    linea.style.marginTop = "6px";
    linea.style.font = "600 10.5px/1.5 inherit";
    linea.style.color = "inherit";
    linea.style.opacity = ".9";
  }
  riga.appendChild(linea);

  salva.onclick = () => (typeof o.onSalva === "function" ? o.onSalva(String(area2.value || "")) : undefined);
  annulla.onclick = () => (typeof o.onAnnulla === "function" ? o.onAnnulla() : undefined);
  area2.oninput = () => {
    riga.dirty = String(area2.value || "") !== letto;
    if (riga.dirty) riga.esitoAnamnesi = null;
    aggiorna(doc, riga, area2, { letto, erroreLettura, scrivendo });
  };

  aggiorna(doc, riga, area2, { letto, erroreLettura, scrivendo });
  return { montato: true, testo: letto };
}

/* Riga d'esito e stato dei tasti. Una funzione sola: la riga accanto al campo
 * e la riga in cima dicono la stessa cosa. */
function aggiorna(doc, riga, area, stato) {
  const linea = typeof riga.querySelector === "function" ? riga.querySelector("[data-anamnesi=\"nota\"]") : null;
  const salva = typeof riga.querySelector === "function" ? riga.querySelector("[data-anamnesi=\"salva\"]") : null;
  const annulla = typeof riga.querySelector === "function" ? riga.querySelector("[data-anamnesi=\"annulla\"]") : null;
  const valore = String(area && area.value != null ? area.value : "");
  const sporco = valore.trim() !== String(stato.letto || "").trim();
  const base = {
    dichiarazione: riga.datiAnamnesi ? {
      presente: riga.datiAnamnesi.presente,
      testo: riga.datiAnamnesi.testo,
      aggiornato: riga.datiAnamnesi.aggiornato
    } : null,
    erroreLettura: stato.erroreLettura,
    esito: riga.esitoAnamnesi,
    scrivendo: stato.scrivendo
  };
  let testo = testoEsito(base);
  if (!stato.erroreLettura && !stato.scrivendo && !riga.esitoAnamnesi && sporco) testo = "Modifiche non salvate";
  if (linea) {
    linea.textContent = testo;
    const errore = Boolean(stato.erroreLettura) || Boolean(riga.esitoAnamnesi && riga.esitoAnamnesi.tipo === "errore");
    linea.setAttribute("data-esito", errore ? "errore" : (sporco ? "sporco" : "letto"));
    linea.title = testo;
    if (linea.style) linea.style.color = errore ? "#ff9aa2" : "inherit";
  }
  if (salva) {
    salva.disabled = Boolean(stato.scrivendo) || Boolean(stato.erroreLettura) || !sporco;
    salva.title = !sporco ? "il testo e' identico a quello letto" : (stato.erroreLettura ? "non ho potuto leggere la dichiarazione" : "");
  }
  if (annulla) {
    const presente = Boolean(riga.datiAnamnesi && riga.datiAnamnesi.presente);
    annulla.disabled = Boolean(stato.scrivendo) || !presente;
  }
  return testo;
}
