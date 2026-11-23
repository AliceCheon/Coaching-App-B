/* Barbell Diva B — PASSO 14e: a riposo si legge, si modifica su richiesta.
 *
 * In Dati cliente → Anamnesi → Salute la riga «Patologie o infortuni» mostra,
 * a riposo, LA DICHIARAZIONE SALVATA come testo: niente area modificabile,
 * niente tasti di salvataggio. Sotto: «dichiarato il 23/11/2026 alle 14:12»
 * (dalla voce di registro) oppure «non dichiarato», e la nota di quel che si
 * e' riconosciuto («Riconosciute: colonna lombare, ginocchio»), che serve a
 * colpo d'occhio. A destra un tasto solo: «Modifica», o «Dichiara» se non
 * c'e' ancora niente.
 *
 * «Modifica» apre l'area di testo con Salva e Annulla e la riga d'esito.
 * Salva chiude e torna in sola lettura («Salvato alle HH:MM» + «dichiarato
 * il …»); Annulla torna al testo letto e chiude SENZA scrivere.
 *
 * Se il registro non si e' letto non c'e' nessun tasto: la riga dice
 * «non ho potuto leggere la dichiarazione: <motivo>». Mai «non dichiarato»
 * quando la lettura e' fallita: nullo ≠ errore.
 *
 * Il markup del v31 (desktop/index.html) NON si tocca: la riga si sostituisce
 * da qui, dentro il pannello che c'e' gia'. Cosi' la guardia 42 resta verde.
 */

import { riconosciArticolazioni, NON_DICHIARATO, oraBreve, dataBreve } from "./anamnesi-b.js";
import { testoEsito } from "./anamnesi-viva.js";

function nodo(doc, tag, classe, testo) {
  const e = doc.createElement(tag);
  if (classe) e.className = classe;
  if (testo != null) e.textContent = String(testo);
  return e;
}

function stile(e, mappa) {
  if (!e || !e.style) return;
  Object.keys(mappa).forEach((k) => { e.style[k] = mappa[k]; });
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

/* Quando e' stata dichiarata: «dichiarato il 23/11/2026 alle 14:12». */
export function quandoDichiarato(quando) {
  const data = dataBreve(quando);
  const ora = oraBreve(quando);
  if (data && ora) return "dichiarato il " + data + " alle " + ora;
  if (data) return "dichiarato il " + data;
  if (ora) return "dichiarata alle " + ora;
  return "";
}

/* La struttura si costruisce una volta sola; da li' in poi si aggiorna.
 * `riga.modoAnamnesi` e' «letto» oppure «modifica». */
function costruisci(doc, riga) {
  while (riga.firstChild) riga.removeChild(riga.firstChild);
  riga.setAttribute("data-anamnesi", "campo");
  stile(riga, { display: "block", alignItems: "stretch" });

  const testata = nodo(doc, "div", "dc-anam-r1");
  stile(testata, { display: "flex", gap: "8px", alignItems: "center", justifyContent: "space-between" });
  const etichetta = nodo(doc, "b", "", "Patologie o infortuni");
  const modifica = nodo(doc, "button", "dc-btn ghost", "Modifica");
  modifica.setAttribute("type", "button");
  modifica.setAttribute("data-anamnesi", "modifica");
  testata.appendChild(etichetta);
  testata.appendChild(modifica);
  riga.appendChild(testata);

  const corpoLetto = nodo(doc, "div", "dc-anam-letto");
  stile(corpoLetto, { display: "block", marginTop: "4px" });
  const testoEl = nodo(doc, "span", "dc-anam-val", "");
  testoEl.setAttribute("data-anamnesi", "testo");
  stile(testoEl, { display: "block", font: "600 12.5px/1.5 inherit", whiteSpace: "pre-wrap" });
  const quandoEl = nodo(doc, "span", "", "");
  quandoEl.setAttribute("data-anamnesi", "quando");
  stile(quandoEl, { display: "block", marginTop: "2px", font: "600 10.5px/1.5 inherit", opacity: ".8" });
  const riconEl = nodo(doc, "span", "", "");
  riconEl.setAttribute("data-anamnesi", "riconosciute");
  stile(riconEl, { display: "block", marginTop: "2px", font: "600 10.5px/1.5 inherit", color: "rgba(255,224,102,.92)" });
  corpoLetto.appendChild(testoEl);
  corpoLetto.appendChild(quandoEl);
  corpoLetto.appendChild(riconEl);
  riga.appendChild(corpoLetto);

  const area = nodo(doc, "textarea", "dc-anam-t");
  area.setAttribute("data-anamnesi", "area");
  area.setAttribute("rows", "3");
  area.setAttribute("aria-label", "Patologie o infortuni");
  area.setAttribute("placeholder", "Scrivi a parole: per esempio \u00ablombalgia cronica, fastidio al ginocchio destro\u00bb");
  stile(area, {
    width: "100%", marginTop: "6px", background: "rgba(0,0,0,.25)", color: "inherit",
    border: "1px solid rgba(255,224,102,.35)", borderRadius: "8px", padding: "8px",
    font: "600 12px/1.5 inherit", resize: "vertical"
  });
  riga.appendChild(area);

  const tasti = nodo(doc, "div", "dc-anam-b");
  tasti.setAttribute("data-anamnesi", "tasti");
  stile(tasti, { display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" });
  const salva = nodo(doc, "button", "dc-btn", "Salva");
  salva.setAttribute("type", "button");
  salva.setAttribute("data-anamnesi", "salva");
  const annulla = nodo(doc, "button", "dc-btn ghost", "Annulla");
  annulla.setAttribute("type", "button");
  annulla.setAttribute("data-anamnesi", "annulla");
  tasti.appendChild(salva);
  tasti.appendChild(annulla);
  riga.appendChild(tasti);

  const esitoEl = nodo(doc, "span", "dc-anam-n", "");
  esitoEl.setAttribute("data-anamnesi", "nota");
  esitoEl.setAttribute("role", "status");
  stile(esitoEl, { display: "block", marginTop: "6px", font: "600 10.5px/1.5 inherit", color: "inherit", opacity: ".9" });
  riga.appendChild(esitoEl);

  riga.refAnamnesi = { testata, etichetta, modifica, corpoLetto, testoEl, quandoEl, riconEl, area, tasti, salva, annulla, esitoEl };
  return riga.refAnamnesi;
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
  const grezzo = dich && !dich.errore && dich.presente && dich.testo != null ? String(dich.testo) : "";
  const presente = grezzo.trim() !== "";
  const letto = presente ? grezzo : "";
  const erroreLettura = o.erroreLettura || (dich && dich.errore ? dich.errore : null);
  const scrivendo = o.scrivendo === true;

  const primoGiro = !(riga.refAnamnesi && typeof riga.querySelector === "function" && riga.querySelector("[data-anamnesi=\"area\"]"));
  const n = primoGiro ? costruisci(doc, riga) : riga.refAnamnesi;
  if (primoGiro) {
    riga.modoAnamnesi = "letto";
    riga.dirty = false;
    riga.esitoAnamnesi = o.esito || null;
    riga.tokenAnamnesi = o.token == null ? "" : String(o.token);
    n.modifica.onclick = () => apri(riga, n, o);
    n.annulla.onclick = () => chiudi(riga, n);
    n.salva.onclick = () => (typeof o.onSalva === "function" ? o.onSalva(String(n.area.value || "")) : undefined);
    n.area.oninput = () => {
      riga.dirty = String(n.area.value || "").trim() !== riga.lettoAnamnesi.trim();
      if (riga.dirty) riga.esitoAnamnesi = null;
      applica(doc, riga, n, { erroreLettura, scrivendo });
    };
  }

  riga.lettoAnamnesi = letto;
  riga.presenteAnamnesi = presente;
  riga.aggiornatoAnamnesi = presente && dich ? String(dich.aggiornato || "") : "";
  riga.quandoAnamnesi = presente && dich ? quandoDichiarato(dich.aggiornato) : "";
  riga.riconosciuteAnamnesi = presente ? notaRiconoscimento(riconosciArticolazioni(letto)) : "";

  /* L'esito nuovo entra solo se il token e' cambiato. Un salvataggio riuscito
   * chiude l'area e torna in sola lettura: e' quello che deve succedere. */
  const token = o.token == null ? null : String(o.token);
  if (token != null && token !== String(riga.tokenAnamnesi || "")) {
    riga.esitoAnamnesi = o.esito || null;
    riga.tokenAnamnesi = token;
    const tipo = riga.esitoAnamnesi && riga.esitoAnamnesi.tipo;
    if (tipo === "salvato" || tipo === "diverso") {
      riga.modoAnamnesi = "letto";
      riga.dirty = false;
    }
  }

  /* Il valore si riscrive solo se non ci sono modifiche in corso: chi sta
   * scrivendo non perde una lettera, e un errore accanto al tasto non
   * cancella il testo che l'ha causato. */
  if (riga.modoAnamnesi !== "modifica" || (!riga.dirty && doc.activeElement !== n.area)) {
    n.area.value = letto;
  }

  applica(doc, riga, n, { erroreLettura, scrivendo });
  return { montato: primoGiro, modo: riga.modoAnamnesi, testo: letto };
}

function apri(riga, n, o) {
  riga.modoAnamnesi = "modifica";
  riga.dirty = false;
  riga.esitoAnamnesi = null;
  n.area.value = riga.lettoAnamnesi || "";
  applica(null, riga, n, { erroreLettura: null, scrivendo: false });
  if (n.area && typeof n.area.focus === "function") n.area.focus();
  if (typeof o.onModifica === "function") o.onModifica();
}

/* Annulla: si torna al testo letto e si chiude. NON scrive niente. */
function chiudi(riga, n) {
  riga.modoAnamnesi = "letto";
  riga.dirty = false;
  riga.esitoAnamnesi = null;
  n.area.value = riga.lettoAnamnesi || "";
  applica(null, riga, n, { erroreLettura: null, scrivendo: false });
}

/* Testi, visibilita' e stato dei tasti. Una funzione sola. */
function applica(doc, riga, n, stato) {
  const modo = riga.modoAnamnesi === "modifica" ? "modifica" : "letto";
  const erroreLettura = stato.erroreLettura || null;
  const scrivendo = stato.scrivendo === true;
  const presente = riga.presenteAnamnesi === true;

  riga.setAttribute("data-modo-anamnesi", modo);

  /* A riposo: il testo salvato, com'e'. */
  n.testoEl.textContent = erroreLettura ? "" : (presente ? riga.lettoAnamnesi : NON_DICHIARATO);
  n.quandoEl.textContent = erroreLettura
    ? ""
    : (presente ? (riga.quandoAnamnesi || "dichiarata, data non nota") : NON_DICHIARATO);
  n.riconEl.textContent = erroreLettura ? "" : (riga.riconosciuteAnamnesi || "");

  /* Il tasto unico: «Modifica», o «Dichiara» se non c'e' ancora niente. */
  n.modifica.textContent = presente ? "Modifica" : "Dichiara";
  n.modifica.disabled = Boolean(erroreLettura) || scrivendo;
  n.modifica.title = erroreLettura ? "non ho potuto leggere la dichiarazione" : "";

  if (erroreLettura) n.modifica.style.display = "none";
  else n.modifica.style.display = "";

  const valore = String(n.area && n.area.value != null ? n.area.value : "");
  const sporco = valore.trim() !== String(riga.lettoAnamnesi || "").trim();

  const base = {
    dichiarazione: presente
      ? { presente: true, testo: riga.lettoAnamnesi, aggiornato: riga.aggiornatoAnamnesi }
      : { presente: false, testo: "", aggiornato: "" },
    erroreLettura: erroreLettura,
    esito: riga.esitoAnamnesi,
    scrivendo: scrivendo
  };
  let testo = testoEsito(base);
  if (modo === "modifica" && !erroreLettura && !scrivendo && !riga.esitoAnamnesi && sporco) testo = "Modifiche non salvate";

  /* Visibilita': a riposo si legge e basta; l'area e i tasti solo in modifica. */
  n.corpoLetto.style.display = modo === "letto" && !erroreLettura ? "block" : "none";
  n.area.style.display = modo === "modifica" ? "block" : "none";
  n.tasti.style.display = modo === "modifica" ? "flex" : "none";

  const notaVisibile = modo === "modifica" || Boolean(erroreLettura) || Boolean(riga.esitoAnamnesi);
  n.esitoEl.style.display = notaVisibile ? "block" : "none";

  const errore = Boolean(erroreLettura) || Boolean(riga.esitoAnamnesi && riga.esitoAnamnesi.tipo === "errore");
  n.esitoEl.textContent = testo;
  n.esitoEl.setAttribute("data-esito", errore ? "errore" : (modo === "modifica" && sporco ? "sporco" : (modo === "modifica" ? "modifica" : "letto")));
  n.esitoEl.title = testo;
  n.esitoEl.style.color = errore ? "#ff9aa2" : "inherit";

  n.salva.disabled = Boolean(scrivendo) || Boolean(erroreLettura) || !sporco;
  n.salva.title = erroreLettura ? "non ho potuto leggere la dichiarazione" : (!sporco ? "il testo e' identico a quello letto" : "");
  n.annulla.disabled = Boolean(scrivendo);
  return testo;
}
