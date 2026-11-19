/* PASSO 4c-anticipo (19/11/2026) — le settimane di test, lette dai dati.
 *
 * Una settimana e' «di test» se:
 *  (a) il suo tipo nei dati e' «test», oppure
 *  (b) in almeno un esercizio della scheda (righe tecniche escluse) la cella
 *      delle serie o delle ripetizioni di quella settimana contiene la parola
 *      «test», senza distinzione di maiuscole e con confine di parola.
 *
 * La stessa funzione serve il campo Test della testata e la spia rosa sulle
 * righe: cosi' i due non possono dire cose diverse.
 */

export const NESSUN_TEST = "nessun test";

function testo(v) { return v == null ? "" : String(v); }

/* Una parola, non un pezzo di parola: «latest» e «contest» non contano. */
function parolaTest(valore) {
  return testo(valore).split(/[^\p{L}\p{N}]+/u).some((x) => x.toLowerCase() === "test");
}

function eTecnica(e) {
  return Boolean(e) && typeof e === "object"
    && (e.tipo === "tecnica" || (e.padreId != null && testo(e.padreId) !== ""));
}

function settimaneElenco(elenco) {
  const esito = [];
  (Array.isArray(elenco) ? elenco : []).forEach((w, k) => {
    const o = w && typeof w === "object" ? w : {};
    const tipo = testo(o.type || o.tipo).toLowerCase();
    if (tipo === "test" || parolaTest(o.serie) || parolaTest(o.ripetizioni)) esito.push(k + 1);
  });
  return esito;
}

/* Per la singola riga: la riga ha «test» in una sua cella. */
export function settimaneTestDiRiga(riga) {
  return settimaneElenco(riga);
}

/* Per la scheda: tutte le settimane di test, ordinate, senza doppioni. */
export function settimaneDiTest(scheda) {
  const viste = Object.create(null);
  ((scheda && scheda.esercizi) || []).forEach((e) => {
    if (eTecnica(e)) return;
    settimaneElenco(e && e.prescrizione ? e.prescrizione.elencoSettimane : []).forEach((s) => { viste[s] = s; });
  });
  return Object.keys(viste).map(Number).sort((a, b) => a - b);
}

/* «S1», «S1 · S5», oppure «nessun test». */
export function testoTest(settimane) {
  const s = (Array.isArray(settimane) ? settimane : [])
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  if (!s.length) return NESSUN_TEST;
  return s.map((x) => "S" + x).join(" · ");
}
