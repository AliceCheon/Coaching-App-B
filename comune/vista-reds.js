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
import { programmaAttivo, settimanaCorrente } from "./lettura-dati.js";
import { schedeDelProgrammaV2 } from "./schede-v2.js";
import { nomePulito } from "./nome-pulito.js";

const NON = "\u2014";

function aggiorna(nodo, testo) {
  if (nodo) nodo.textContent = String(testo);
}

export function riempiRischioStrutturale(doc, scheda, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const carta = doc.querySelector("#pag-dashboard .ck-red");
  if (!carta) return null;
  const num = carta.querySelector("[data-reds-num]");
  const stato = carta.querySelector("[data-reds-stato]");
  const piu = carta.querySelector("[data-reds-piu]");
  const nota = carta.querySelector("[data-reds-nota]");

  const riepilogo = scheda && typeof scheda === "object" ? stressRiepilogo(scheda) : null;

  if (!riepilogo || riepilogo.leggibile !== true) {
    const motivo = o.motivo
      ? String(o.motivo)
      : (!scheda || typeof scheda !== "object"
        ? "nessuna scheda da leggere: la scheda attiva non è arrivata alla carta"
        : (riepilogo && riepilogo.motivo) || "la scheda non si riesce a leggere");
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

/* ---------------------------------------------------------------------------
 * PASSO 6c — quale scheda guarda la carta RED-S.
 *
 * Sola lettura: entrano i dati della zona B gia' letti dalla pagina
 * (`programmi`, `sedute`, `schedeV2`) ed esce la scheda da passare a
 * riempiRischioStrutturale. Nessuna scrittura, nessuna rete, nessun DOM.
 *
 * Ordine dichiarato:
 *  1. il programma attivo (stessa regola di A: status "active", poi `active`,
 *     poi il non archiviato aggiornato per ultimo — la decide programmaAttivo);
 *  2. la scheda di quel programma nella settimana corrente (settimanaCorrente
 *     sulle sedute App);
 *  3. se la settimana corrente non c'e' o non ha una scheda, la PRIMA scheda
 *     del programma (per settimana, poi per ordine);
 *  4. se non c'e' nessun programma attivo, oppure il programma non ha schede
 *     leggibili, il motivo scritto in chiaro: la carta lo stampa e non mostra
 *     zeri.
 * ------------------------------------------------------------------------- */
export function schedaPerRischio(letture) {
  const l = letture && typeof letture === "object" ? letture : {};
  const elenco = Array.isArray(l) ? l : (Array.isArray(l.programmi) ? l.programmi : []);
  const attivo = programmaAttivo(elenco);
  if (!attivo || !attivo.programma) {
    return { scheda: null, motivo: "nessun programma attivo", programma: null, settimana: null, fonte: null };
  }
  const programma = attivo.programma;
  /* Un programma archiviato non e' "attivo": meglio il motivo che i numeri di
   * un programma che Alice ha messo da parte. */
  if (programma.archivedAt || String(programma.status || "") === "archived") {
    return { scheda: null, motivo: "nessun programma attivo: c'\u00e8 solo un programma archiviato", programma: programma, settimana: null, fonte: null };
  }
  const nome = nomePulito(programma.name || programma.nome || "");
  const gruppo = schedeDelProgrammaV2(l.schedeV2, programma.id);
  const schede = gruppo && Array.isArray(gruppo.schede) ? gruppo.schede.slice() : [];
  if (!schede.length) {
    return {
      scheda: null,
      motivo: "il programma attivo" + (nome ? " \u00ab" + nome + "\u00bb" : "") + " non ha schede leggibili",
      programma: programma,
      settimana: null,
      fonte: null
    };
  }
  const settimana = settimanaCorrente(Array.isArray(l.sedute) ? l.sedute : []);
  const perSettimana = (a, b) => (Number(a.settimana) || 0) - (Number(b.settimana) || 0)
    || (Number(a.ordine) || 0) - (Number(b.ordine) || 0)
    || String(a.codice || "").localeCompare(String(b.codice || ""));
  let scelta = settimana == null ? null : (schede.filter((s) => Number(s.settimana) === settimana)[0] || null);
  let fonte = scelta ? "scheda della settimana " + settimana : null;
  if (!scelta) {
    scelta = schede.slice().sort(perSettimana)[0];
    fonte = settimana == null
      ? "prima scheda del programma: nessuna settimana corrente registrata"
      : "prima scheda del programma: la settimana " + settimana + " non ha una scheda";
  }
  return {
    scheda: scelta,
    motivo: null,
    programma: programma,
    settimana: settimana,
    fonte: fonte,
    esplicito: attivo.esplicito === true,
    ripiego: attivo.ripiego === true
  };
}

/* La scorciatoia usata dalla pagina: sceglie la scheda e riempie la carta. */
export function riempiRischioDaZonaB(doc, letture) {
  const scelta = schedaPerRischio(letture);
  const riepilogo = riempiRischioStrutturale(doc, scelta.scheda, { motivo: scelta.motivo });
  return Object.assign({}, scelta, { riepilogo: riepilogo });
}
