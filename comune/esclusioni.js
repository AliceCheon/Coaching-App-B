/* Barbell Diva B — esclusioni decise da Alice (passo 5). Funzioni PURE.
 *
 * Perche' esiste: in A ci sono sedute sbagliate che, cancellate in A, tornano
 * indietro per un problema di sincronizzazione di A. Non si tocca A: si scrive
 * l'esclusione nella zona B (`bdB_atleti/{uid}/esclusioni`) e si mette
 * `deletedAt` sulla copia. Ogni copia successiva rilegge le esclusioni e
 * riapplica `deletedAt`: una seduta esclusa non torna mai.
 *
 * Qui non si scrive e non si legge da nessuna parte: entrano sedute e
 * esclusioni, escono candidati e conteggi. Le scritture stanno in
 * comune/scritture-b.js, l'unico modulo che scrive.
 *
 * Regola anti-indovinello: per ogni richiesta di Alice si elencano TUTTI i
 * candidati trovati. Zero candidati → si dice zero. Piu' di uno → si dice che
 * sono piu' di uno e non si preseleziona niente. La scelta la fa Alice.
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

/* Gli id delle 31 righe Excel che A porta dentro il proprio codice
 * (EXCEL_WORKOUT_HISTORY, r.116): servono solo alla diagnosi del conto. */
export const BLOCCO_LOCALE_A = Object.freeze({ dal: 900001, al: 900031 });

/* La data in formato AAAA-MM-GG, sia da `dateInput` sia da `date` italiano.
 * Se non e' leggibile torna stringa vuota: mai una data inventata. */
export function dataDi(seduta) {
  const s = seduta || {};
  const grezzo = testo(primoNonNull(s.dateInput, s.date, s.data));
  if (!grezzo) return "";
  const iso = grezzo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
  const italiano = grezzo.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (italiano) {
    return italiano[3] + "-" + String(italiano[2]).padStart(2, "0") + "-" + String(italiano[1]).padStart(2, "0");
  }
  return "";
}

/* Il codice scheda: "scheda D", "Scheda  D", "D", "Logbook D" → "D".
 * Serve solo a riconoscere la lettera; non interpreta altro. */
export function codiceScheda(seduta) {
  const s = seduta || {};
  let cod = testo(primoNonNull(s.sessionCode, s.code, s.scheda));
  if (!cod) {
    const nome = testo(primoNonNull(s.sessionName, s.name));
    cod = nome.replace(/^logbook\s+/i, "");
  }
  cod = cod.replace(/^scheda\s+/i, "").trim().toUpperCase();
  const lettera = cod.match(/^[A-Z]/);
  return lettera ? lettera[0] : "";
}

/* Il numero della settimana: 1, "1", "Settimana 1" → 1. Se non c'e', null:
 * una settimana assente non si inventa. */
export function settimanaDi(seduta) {
  const s = seduta || {};
  const grezzo = primoNonNull(s.week, s.settimana, s.weekNumber);
  if (grezzo === undefined || grezzo === null || grezzo === "") return null;
  if (typeof grezzo === "number" && Number.isFinite(grezzo)) return grezzo;
  const cifre = String(grezzo).match(/(\d{1,2})/);
  return cifre ? Number(cifre[1]) : null;
}

/* Le cinque richieste di Alice, con la settimana di calendario calcolata a
 * mano (lunedi-domenica) per il caso in cui la data sia sbagliata. */
export const RICHIESTE_ESCLUSIONE = Object.freeze([
  {
    chiave: "d-sett1-22-24-settembre",
    etichetta: "Scheda D \u00b7 settimana 1 \u00b7 22 o 24 settembre",
    scheda: "D",
    settimana: 1,
    dateAttese: ["2026-09-22", "2026-09-24"],
    settimanaDal: "2026-09-21",
    settimanaAl: "2026-09-27",
    nota: "la data puo' essere sbagliata: si cerca in tutta quella settimana"
  },
  {
    chiave: "c-sett1-24-ottobre",
    etichetta: "Scheda C \u00b7 settimana 1 \u00b7 24 ottobre",
    scheda: "C",
    settimana: 1,
    dateAttese: ["2026-10-24"],
    settimanaDal: "2026-10-19",
    settimanaAl: "2026-10-25",
    nota: ""
  },
  {
    chiave: "b-sett1-24-ottobre",
    etichetta: "Scheda B \u00b7 settimana 1 \u00b7 24 ottobre",
    scheda: "B",
    settimana: 1,
    dateAttese: ["2026-10-24"],
    settimanaDal: "2026-10-19",
    settimanaAl: "2026-10-25",
    nota: ""
  },
  {
    chiave: "d-sett1-24-ottobre",
    etichetta: "Scheda D \u00b7 settimana 1 \u00b7 24 ottobre",
    scheda: "D",
    settimana: 1,
    dateAttese: ["2026-10-24"],
    settimanaDal: "2026-10-19",
    settimanaAl: "2026-10-25",
    nota: ""
  },
  {
    chiave: "c-sett2-27-ottobre",
    etichetta: "Scheda C \u00b7 settimana 2 \u00b7 27 ottobre",
    scheda: "C",
    settimana: 2,
    dateAttese: ["2026-10-27"],
    settimanaDal: "2026-10-26",
    settimanaAl: "2026-11-01",
    nota: ""
  }
]);

/* Un candidato, con tutto quello che serve per deciderlo a occhio. */
function candidato(seduta, richiesta, modo) {
  const exercises = Array.isArray(seduta.exercises) ? seduta.exercises : null;
  return {
    id: testo(seduta.id),
    data: dataDi(seduta),
    scheda: codiceScheda(seduta),
    settimana: settimanaDi(seduta),
    esercizi: exercises ? exercises.length : null,
    nome: testo(primoNonNull(seduta.sessionName, seduta.name)),
    fonte: testo(seduta.source),
    giaCancellata: !!seduta.deletedAt,
    richiesta: richiesta.chiave,
    modo: modo
  };
}

/* Cerca i candidati delle cinque richieste. Due passate, nell'ordine:
 *   1. data esatta (una delle date indicate) + scheda + settimana;
 *   2. solo se la prima non trova niente: tutta la settimana di calendario,
 *      perche' Alice ha detto che la data puo' essere sbagliata.
 * La settimana dichiarata dalla seduta, se c'e', deve combaciare in entrambe:
 * una scheda C di settimana 2 non e' la C di settimana 1.
 */
export function candidatiEsclusione(sedute, richieste) {
  const elenco = (Array.isArray(sedute) ? sedute : []).filter((s) => s && typeof s === "object");
  const richiesteUsate = Array.isArray(richieste) ? richieste : RICHIESTE_ESCLUSIONE;

  const trovate = richiesteUsate.map((r) => {
    const conScheda = elenco.filter((s) => codiceScheda(s) === r.scheda);

    const esatte = conScheda.filter((s) => {
      if (r.dateAttese.indexOf(dataDi(s)) === -1) return false;
      const sett = settimanaDi(s);
      return sett === null || sett === r.settimana;
    });

    let modo = "data esatta";
    let scelte = esatte;
    if (scelte.length === 0) {
      modo = "settimana intera";
      scelte = conScheda.filter((s) => {
        const d = dataDi(s);
        if (!d || d < r.settimanaDal || d > r.settimanaAl) return false;
        const sett = settimanaDi(s);
        return sett === null || sett === r.settimana;
      });
    }

    const candidati = scelte.map((s) => candidato(s, r, modo));
    const stato = candidati.length === 0 ? "zero" : (candidati.length === 1 ? "uno" : "piuDiUno");
    const messaggio = stato === "zero"
      ? "0 candidati: non c'e' niente da spuntare, e non si inventa niente"
      : (stato === "uno"
        ? "1 candidato"
        : candidati.length + " candidati: non indovino, scegli tu");

    return {
      chiave: r.chiave,
      etichetta: r.etichetta,
      scheda: r.scheda,
      settimana: r.settimana,
      dateAttese: r.dateAttese,
      settimanaDal: r.settimanaDal,
      settimanaAl: r.settimanaAl,
      nota: r.nota,
      modo: modo,
      candidati: candidati,
      stato: stato,
      messaggio: messaggio
    };
  });

  const conProblemi = trovate.filter((t) => t.stato !== "uno");
  return {
    richieste: trovate,
    totaleCandidati: trovate.reduce((somma, t) => somma + t.candidati.length, 0),
    richiesteConProblemi: conProblemi.length,
    conProblemi: conProblemi
  };
}

/* Copia di un documento con `deletedAt` messo al posto giusto: se il documento
 * di A incapsula la seduta in `session`, il campo va dentro la seduta, perche'
 * e' li' che A (e il Logbook di B) lo leggono. Non muta l'originale. */
export function conDeletedAt(dati, quando) {
  const originale = (dati && typeof dati === "object") ? dati : {};
  const copia = {};
  Object.keys(originale).forEach((chiave) => { copia[chiave] = originale[chiave]; });
  const istante = quando ? String(quando) : new Date().toISOString();
  const seduta = copia.session;
  if (seduta && typeof seduta === "object") {
    const dentro = {};
    Object.keys(seduta).forEach((chiave) => { dentro[chiave] = seduta[chiave]; });
    dentro.deletedAt = istante;
    copia.session = dentro;
    return copia;
  }
  copia.deletedAt = istante;
  return copia;
}

/* Diagnosi del conto 126 contro 127: A tiene 31 righe Excel dentro il proprio
 * codice (id 900001-900031) e le fonde con le sedute del cloud per id. Se una
 * seduta del cloud riusa uno di quegli id, A la fonde con la sua riga locale e
 * il suo conto scende di uno. E' l'unico punto del suo codice che puo' farlo:
 * qui si controlla, senza dichiararlo vero per partito preso. */
export function seduteNelBloccoLocale(sedute) {
  const elenco = (Array.isArray(sedute) ? sedute : []).filter((s) => s && typeof s === "object");
  const trovate = [];
  elenco.forEach((s) => {
    const numero = Number(testo(s.id));
    if (!Number.isFinite(numero)) return;
    if (numero < BLOCCO_LOCALE_A.dal || numero > BLOCCO_LOCALE_A.al) return;
    trovate.push({ id: testo(s.id), data: dataDi(s), scheda: codiceScheda(s), cancellata: !!s.deletedAt });
  });
  return {
    blocco: BLOCCO_LOCALE_A,
    trovate: trovate,
    spiegazione: trovate.length
      ? "Trovate " + trovate.length + " sedute con id nel blocco locale di A (" + BLOCCO_LOCALE_A.dal + "-" +
        BLOCCO_LOCALE_A.al + "): " + trovate.map((t) => t.id + (t.data ? " del " + t.data : "")).join(", ") +
        ". A le fonde con le sue righe Excel: e' la sola cosa nel suo codice che fa scendere il conto di uno."
      : "Nessuna seduta riusa gli id del blocco locale di A (" + BLOCCO_LOCALE_A.dal + "-" + BLOCCO_LOCALE_A.al +
        "): il suo conto piu' basso non si spiega con la fusione delle righe Excel. Resta la sua lista in memoria, scritta al salvataggio."
  };
}
