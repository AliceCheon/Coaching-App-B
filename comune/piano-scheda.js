/* Barbell Diva B — PASSO 4a: il piano della scheda (scarico e test).
 *
 * Modulo puro, senza DOM e senza scritture: si legge e si valida soltanto.
 *
 * Due cose vivono qui, e una sola casa per ognuna:
 *  - `pianoScarico` = { settimana: N, volume: NN }: la settimana di scarico e
 *    la percentuale di volume tolta. La percentuale e' un'ANNOTAZIONE: non
 *    tocca serie, ripetizioni, Riepilogo volume, Specializzazione o Analisi.
 *  - `pianoTest` = { settimana: N }: la settimana in cui si fa il test.
 *
 * Regola di casa: quello che non c'e' vale «non registrato», mai zero e mai
 * un numero inventato.
 */

export const NON = "non registrato";

/* Il foglio della scheda: `dati.sheet` nei documenti di B. */
function foglio(dati) {
  if (!dati || typeof dati !== "object") return null;
  const f = dati.sheet;
  return f && typeof f === "object" ? f : null;
}

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* Quante settimane ha davvero la scheda: la piu' lunga delle prescrizioni,
 * senza scendere sotto 1. Non si inventano otto settimane se ce ne sono sei. */
/* Quante settimane portano davvero delle prescrizioni: la piu' lunga.
 * Non si inventano otto settimane se ce ne sono sei. */
export function settimaneEsercizi(esercizi) {
  const elenco = Array.isArray(esercizi) ? esercizi : [];
  let quante = 0;
  elenco.forEach((e) => {
    if (!e || typeof e !== "object") return;
    const candidati = [
      e.weeks,
      e.progression && e.progression.weeks,
      e.prescription && e.prescription.weeks,
      e.prescrizione && e.prescrizione.elencoSettimane,
      e.elencoSettimane
    ];
    candidati.forEach((settimane) => {
      if (Array.isArray(settimane) && settimane.length > quante) quante = settimane.length;
    });
  });
  return quante;
}

/* Quante settimane ha la scheda di un documento. */
export function settimaneScheda(dati) {
  const f = foglio(dati);
  if (!f) return 0;
  const chiave = Array.isArray(f.exercises) ? "exercises" : (Array.isArray(f.esercizi) ? "esercizi" : "");
  if (!chiave) return 0;
  return settimaneEsercizi(f[chiave]);
}

/* Gli id con cui la pagina puo' chiamare una scheda sono piu' d'uno: il
 * documento porta `sheetId`, il foglio porta il suo `id`, la vista usa
 * quello del foglio. Indicizzare con uno solo faceva sparire il valore
 * appena scritto (difetto del 18/11/2026): la scrittura andava a buon fine, la
 * lettura dopo il ridisegno cercava un'altra chiave. Qui si indicizza con
 * TUTTI, cosi' scrittura e lettura non possono piu' divergere. */
export function pianiDalleSchede(documenti) {
  const piani = Object.create(null);
  (Array.isArray(documenti) ? documenti : []).forEach((d) => {
    if (!d || !d.id) return;
    const dati = d.dati || {};
    if (dati.kind === "archived") return;
    if (String(d.id).indexOf("program-v2-archived-") === 0) return;
    const f = dati.sheet;
    if (!f || typeof f !== "object") return;
    const piano = leggiPiano(dati);
    [dati.sheetId, f.id, d.id].forEach((grezza) => {
      const k = String(grezza == null ? "" : grezza).trim();
      if (k) piani[k] = piano;
    });
  });
  return piani;
}

function intero(valore) {
  const t = testo(valore);
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

/* Validazione della settimana: intero dentro 1...quante. */
export function validaSettimana(valore, quante) {
  const n = intero(valore);
  const massimo = Number(quante) || 0;
  if (n == null) return { ok: false, motivo: "la settimana si scrive con un numero intero da 1 a " + (massimo || "N") };
  if (massimo < 1) return { ok: false, motivo: "questa scheda non porta le settimane scritte" };
  if (n < 1 || n > massimo) return { ok: false, motivo: "la settimana va da 1 a " + massimo };
  return { ok: true, settimana: n };
}

/* Validazione della percentuale: intero da 0 a 100. */
export function validaVolume(valore) {
  const n = intero(valore);
  if (n == null) return { ok: false, motivo: "la percentuale di volume si scrive con un numero intero da 0 a 100" };
  if (n < 0 || n > 100) return { ok: false, motivo: "la percentuale di volume va da 0 a 100" };
  return { ok: true, volume: n };
}

/* Il piano letto dal foglio, senza correggere niente: se il campo c'e' ma non
 * e' valido, si dice che non e' registrato invece di mostrare un numero che
 * nessuno ha scritto. */
export function leggiPiano(dati) {
  const f = foglio(dati);
  const vuoto = { scarico: null, test: null, scaricoTesto: NON, testTesto: NON };
  if (!f) return vuoto;
  const quante = settimaneScheda(dati);
  const s = f.pianoScarico;
  const t = f.pianoTest;
  const scarico = s && typeof s === "object" && validaSettimana(s.settimana, quante).ok && validaVolume(s.volume).ok
    ? { settimana: Number(s.settimana), volume: Number(s.volume) }
    : null;
  const test = t && typeof t === "object" && validaSettimana(t.settimana, quante).ok
    ? { settimana: Number(t.settimana) }
    : null;
  return {
    scarico: scarico,
    test: test,
    scaricoTesto: scarico ? "S" + scarico.settimana + " · vol −" + scarico.volume + "%" : NON,
    testTesto: test ? "S" + test.settimana : NON
  };
}
