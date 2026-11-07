/* Barbell Diva B — le sedute di A, per come A le tratta davvero.
 *
 * Cosa fa A, letto nel suo codice (src/app-main.js):
 *
 *   1. `deduplicateWorkoutSessions` (r.3948): scarta le sedute con `deletedAt`
 *      valorizzato e tiene un solo documento per id. Le righe senza id restano:
 *      A non le butta.
 *   2. `logbookSessionsForUi` (r.8822): ricerca, stato e fonte sono filtri che
 *      si scelgono a schermo; con "tutti" non scartano niente.
 *   3. NIENT'ALTRO. La riga r.14398 non e' un filtro: prende le righe gia'
 *      disegnate e ci attacca il bottone cestino, abbinandole per indice alle
 *      sedute con fonte "App" o con id numerico recente. Non nasconde nessuna
 *      seduta: decide solo chi puo' essere eliminato.
 *
 * Quindi la vista di A non ha una regola da replicare: mostra tutte le sedute
 * vive, una per id. La condizione "fonte App o id recente" la dichiaro a parte
 * (`conCestino`), perche' e' un fatto della sua interfaccia, non un filtro.
 *
 * Il numero che A dichiara (`sessionCount`, r.5887) e' un'altra cosa ancora: e'
 * la lunghezza del suo elenco in memoria nel momento in cui ha scritto il
 * payload. Quell'elenco nasce dalle 31 righe Excel scritte dentro il codice
 * (`EXCEL_WORKOUT_HISTORY`, id 900001-900031) e si fonde con i documenti letti
 * dal cloud (r.4926). Non e' un riconteggio dei documenti: per questo puo'
 * differire di uno senza che nulla sia rotto.
 *
 * Percio' B non lo "aggiusta" e non filtra niente per farlo tornare: lo
 * affianca, e quando il payload di A porta anche l'elenco delle sedute lo
 * confronta id per id, cosi' la seduta che manca si nomina invece di sparire
 * dentro un totale.
 *
 * La copia in bdB_ resta fedele: qui si legge e si conta, non si scrive.
 *
 * Funzioni PURE: niente rete, niente DOM, nessuna scrittura.
 */

function testo(valore) {
  return String(valore == null ? "" : valore).trim();
}

function primoNonNull() {
  for (let i = 0; i < arguments.length; i += 1) {
    const v = arguments[i];
    if (v !== undefined && v !== null) return v;
  }
  return "";
}

/* La soglia di A (r.14398): gli id "recenti" sono numerici e grandi. Serve
 * solo a dire chi ha il cestino nell'interfaccia di A. */
export const ID_RECENTE = 1000000000;

/* Le sedute che A mostra e i conti di ogni passo, cosi' la differenza si spiega
 * invece di sparire in un totale. */
export function seduteSecondoA(sedute) {
  const elenco = (Array.isArray(sedute) ? sedute : []).filter((s) => s && typeof s === "object");

  /* Passo 1a: cancellazione logica. */
  const vive = elenco.filter((s) => !s.deletedAt);
  const cancellate = elenco.length - vive.length;

  /* Passo 1b: un solo documento per id, il primo in ordine di lettura. */
  const gruppi = Object.create(null);
  const ordine = [];
  vive.forEach((s, indice) => {
    const chiave = testo(primoNonNull(s.id, s.workoutProSessionId));
    if (!chiave) return;
    if (!gruppi[chiave]) {
      gruppi[chiave] = [];
      ordine.push(chiave);
    }
    gruppi[chiave].push(indice);
  });
  const consumato = [];
  vive.forEach(() => consumato.push(false));
  const visibili = [];
  let doppioniId = 0;
  ordine.forEach((chiave) => {
    const gruppo = gruppi[chiave];
    visibili.push(vive[gruppo[0]]);
    gruppo.forEach((indice) => { consumato[indice] = true; });
    doppioniId += gruppo.length - 1;
  });
  /* Le righe senza id non si buttano: A le tiene, e cosi' fa B. */
  vive.forEach((s, indice) => { if (!consumato[indice]) visibili.push(s); });

  /* Passo 3: non e' un filtro, e' la condizione del cestino in A (r.14398).
   * `Number(id)` di un id non numerico e' NaN, e NaN non supera la soglia:
   * A si comporta cosi', e B lo dichiara senza correggerlo. */
  const senzaCestino = [];
  let conCestino = 0;
  visibili.forEach((s) => {
    const fonte = testo(primoNonNull(s.source, "App")) || "App";
    const numero = Number(s.id);
    if (fonte === "App" || (Number.isFinite(numero) && numero > ID_RECENTE)) {
      conCestino += 1;
      return;
    }
    senzaCestino.push({
      id: testo(s.id),
      fonte: fonte,
      data: testo(primoNonNull(s.dateInput, s.date)),
      motivo: "fonte \u00ab" + fonte + "\u00bb e id non recente: in A resta visibile ma senza cestino (r.14398)"
    });
  });

  return {
    documenti: elenco.length,
    cancellate: cancellate,
    dopoCancellate: vive.length,
    doppioniId: doppioniId,
    distintePerId: visibili.length,
    visibili: visibili,
    conCestino: conCestino,
    senzaCestino: senzaCestino
  };
}

/* Confronto id per id con l'elenco che A porta dentro il suo payload. Serve a
 * rispondere alla domanda vera: non "quanti", ma "quale seduta A non conta".
 * Se il payload non porta l'elenco, si dichiara che il confronto non e'
 * possibile: non si inventa una spiegazione. */
export function confrontaElenchi(elencoDiA, documenti) {
  const inA = Array.isArray(elencoDiA) ? elencoDiA.filter((s) => s && typeof s === "object") : null;
  const neiDoc = (Array.isArray(documenti) ? documenti : []).filter((s) => s && typeof s === "object");
  if (!inA) {
    return {
      disponibile: false,
      inElenco: null,
      neiDocumenti: neiDoc.length,
      comuni: null,
      senzaIdInElenco: null,
      senzaIdNeiDocumenti: null,
      soloInElenco: [],
      soloNeiDocumenti: []
    };
  }

  const indiciInA = Object.create(null);
  let senzaIdInElenco = 0;
  inA.forEach((s) => {
    const chiave = testo(primoNonNull(s.id, s.workoutProSessionId));
    if (!chiave) { senzaIdInElenco += 1; return; }
    if (indiciInA[chiave] == null) indiciInA[chiave] = s;
  });

  const indiciNeiDoc = Object.create(null);
  let senzaIdNeiDocumenti = 0;
  neiDoc.filter((s) => !s.deletedAt).forEach((s) => {
    const chiave = testo(primoNonNull(s.id, s.workoutProSessionId));
    if (!chiave) { senzaIdNeiDocumenti += 1; return; }
    if (indiciNeiDoc[chiave] == null) indiciNeiDoc[chiave] = s;
  });

  const soloInElenco = [];
  let comuni = 0;
  Object.keys(indiciInA).forEach((chiave) => {
    if (indiciNeiDoc[chiave]) { comuni += 1; return; }
    const s = indiciInA[chiave];
    soloInElenco.push({ id: chiave, data: testo(primoNonNull(s.dateInput, s.date)), fonte: testo(s.source) });
  });

  const soloNeiDocumenti = [];
  Object.keys(indiciNeiDoc).forEach((chiave) => {
    if (indiciInA[chiave]) return;
    const s = indiciNeiDoc[chiave];
    soloNeiDocumenti.push({ id: chiave, data: testo(primoNonNull(s.dateInput, s.date)), fonte: testo(s.source) });
  });

  return {
    disponibile: true,
    inElenco: inA.length,
    neiDocumenti: neiDoc.length,
    comuni: comuni,
    senzaIdInElenco: senzaIdInElenco,
    senzaIdNeiDocumenti: senzaIdNeiDocumenti,
    soloInElenco: soloInElenco,
    soloNeiDocumenti: soloNeiDocumenti
  };
}
