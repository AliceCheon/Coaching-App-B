/* Barbell Diva B — la regola con cui A sceglie le sedute da mostrare.
 *
 * Perche' esiste: B deve mostrare lo STESSO numero di sedute che mostra A, e
 * finora ne mostrava una in piu' (127 contro 126). La regola di A non e' un
 * solo filtro, e' una catena di tre passi, letti nel codice di A
 * (app A, src/app-main.js):
 *
 *   1. `deduplicateWorkoutSessions` (r.3948): scarta le sedute con `deletedAt`
 *      valorizzato e tiene un solo documento per id (`id` o
 *      `workoutProSessionId`). Le righe senza id restano: A non le butta.
 *   2. `logbookSessionsForUi` (r.8822): i filtri di ricerca/stato/fonte sono
 *      quelli scelti a schermo; con "tutti" non scartano niente.
 *   3. il disegno delle righe del Logbook (r.14398): A accetta solo le sedute
 *      con `source === "App"` OPPURE con id numerico maggiore di 1000000000.
 *      E' l'unico punto dell'interfaccia che puo' nascondere una seduta valida:
 *      le vecchie sedute importate (fonte diversa, id piccolo) restano nella
 *      raccolta ma non diventano righe del Logbook. Ecco la seduta di scarto.
 *
 * Nota importante, perche' mi ha ingannato: il passo "doppioni per contenuto"
 * di `deduplicateWorkoutSessions` (impronta data+programma+scheda+esercizi) NON
 * scatta per i documenti che hanno un id, perche' quei documenti sono gia'
 * "consumati" dal passo per id. Non lo replico: replicarlo sarebbe stato un
 * filtro inventato, e avrebbe nascosto una seduta vera.
 *
 * La copia in bdB_ resta fedele: questa regola vale solo per il Logbook e per
 * il numero dichiarato, non per quello che si scrive.
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

/* La soglia di A (r.14398): gli id "recenti" sono numerici e grandi. */
const ID_RECENTE = 1000000000;

/* La catena applicata in blocco. Entra un elenco di sedute (oggetti seduta,
 * non documenti), escono le sedute che A mostra, piu' i conti di ogni passo,
 * cosi' la differenza si spiega invece di sparire in un totale. */
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
  const perId = [];
  let doppioniId = 0;
  ordine.forEach((chiave) => {
    const gruppo = gruppi[chiave];
    perId.push(vive[gruppo[0]]);
    gruppo.forEach((indice) => { consumato[indice] = true; });
    doppioniId += gruppo.length - 1;
  });
  /* Le righe senza id non si buttano: A le tiene, e cosi' fa B. */
  vive.forEach((s, indice) => { if (!consumato[indice]) perId.push(s); });

  /* Passo 3: la condizione della vista di A. */
  const tenute = [];
  const escluseVista = [];
  perId.forEach((s) => {
    const fonte = testo(primoNonNull(s.source, "App")) || "App";
    const numero = Number(s.id);
    const ammessa = fonte === "App" || (Number.isFinite(numero) && numero > ID_RECENTE);
    if (!ammessa) {
      escluseVista.push({
        id: testo(s.id),
        fonte: fonte,
        data: testo(primoNonNull(s.dateInput, s.date)),
        motivo: "fonte \u00ab" + fonte + "\u00bb con id non recente: fuori dalla vista di A (r.14398)"
      });
      return;
    }
    tenute.push(s);
  });

  return {
    documenti: elenco.length,
    cancellate: cancellate,
    dopoCancellate: vive.length,
    doppioniId: doppioniId,
    distintePerId: perId.length,
    ammesseAllaVista: tenute.length,
    secondoA: tenute.length,
    escluseVista: escluseVista,
    tenute: tenute
  };
}
