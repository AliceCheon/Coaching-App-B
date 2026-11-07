/* Barbell Diva B — conteggi e fotografia (passo 1). Funzioni PURE.
 *
 * Niente rete, niente DOM: entrano documenti grezzi e un documento radice,
 * escono numeri e un oggetto da scrivere su file. Così i conteggi si possono
 * verificare senza aprire un browser, e la pagina che li mostra non ha scuse
 * per inventare un numero.
 *
 * Regola dei conteggi: si contano le stesse cose che A considera valide (le
 * regole sono citate in `lettura-dati.js`), ma si DICHIARA sempre anche il
 * totale dei documenti letti. Se i due numeri non coincidono, la differenza è
 * scritta a schermo, non nascosta.
 */

import { seduteSecondoA, confrontaElenchi } from "./regola-sedute-a.js";

function valoreO(value, ripiego) {
  return value == null ? ripiego : value;
}

/* Il programId si ricava da tre campi, nell'ordine di A (r.5599). */
export function programIdDi(dati) {
  const d = dati || {};
  return String(
    d.programId ||
    (d.program && d.program.id) ||
    (d.programMeta && d.programMeta.id) ||
    ""
  );
}

/* ---------- Le tre famiglie ---------- */

/* Schede. `schede` sono i documenti program-v2-sheet-; gli altri due gruppi
 * sono parti della stessa famiglia (una scheda troppo grande vive in più
 * documenti esercizio) e vengono contati a parte. */
export function contaSchede(documenti) {
  const elenco = Array.isArray(documenti) ? documenti : [];
  let schede = 0;
  let esercizi = 0;
  let archiviate = 0;
  const programmi = Object.create(null);
  elenco.forEach((d) => {
    const id = String((d && d.id) || "");
    if (id >= "program-v2-exercise-" && id < "program-v2-exercise.") esercizi += 1;
    else if (id >= "program-v2-archived-" && id < "program-v2-archived.") archiviate += 1;
    else if (id >= "program-v2-sheet-" && id < "program-v2-sheet.") schede += 1;
    const p = programIdDi(d && d.dati);
    if (p) programmi[p] = true;
  });
  return {
    documenti: elenco.length,
    schede,
    esercizi,
    archiviate,
    programmi: Object.keys(programmi).length
  };
}

/* Programmi, con le regole di A: un v1 viene scartato se lo stesso programId
 * esiste già in v2 (r.5636-5639) e i documenti di programmi cancellati (id
 * fuori da `programIds`) non contano (r.5591, r.5600). I documenti però
 * restano tutti dentro la fotografia: qui si contano, non si buttano. */
export function contaProgrammi(documenti, radice) {
  const elenco = Array.isArray(documenti) ? documenti : [];
  const ammessi = radice && Array.isArray(radice.programIds) ? radice.programIds.map(String) : null;
  const filtra = ammessi !== null && ammessi.length > 0;
  const meta = Object.create(null);
  const v1 = Object.create(null);
  let documentiMeta = 0;
  let documentiV1 = 0;
  let fuoriElenco = 0;
  elenco.forEach((d) => {
    const dati = (d && d.dati) || {};
    const id = programIdDi(dati);
    if (filtra && id && ammessi.indexOf(id) === -1) {
      fuoriElenco += 1;
      return;
    }
    if (dati.programMeta && typeof dati.programMeta === "object") {
      documentiMeta += 1;
      meta[id] = true;
      return;
    }
    if (dati.program && typeof dati.program === "object") {
      documentiV1 += 1;
      v1[id] = true;
    }
  });
  const chiaviV1 = Object.keys(v1);
  let v1InV2 = 0;
  chiaviV1.forEach((id) => {
    if (meta[id]) v1InV2 += 1;
  });
  return {
    documenti: elenco.length,
    documentiMeta,
    documentiV1,
    metadati: Object.keys(meta).length,
    v1: chiaviV1.length,
    v1InV2,
    distinti: Object.keys(meta).length + (chiaviV1.length - v1InV2),
    fuoriElenco
  };
}

/* Logbook. `valide` applica la regola di A (senza id si scarta, doppioni
 * riconciliati per id); `documenti` è il totale letto, senza filtri. */
export function contaSedute(documenti) {
  const elenco = Array.isArray(documenti) ? documenti : [];
  const perId = Object.create(null);
  let senzaId = 0;
  let duplicate = 0;
  elenco.forEach((d) => {
    const dati = (d && d.dati) || {};
    const seduta = dati.session != null ? dati.session : dati;
    const id = seduta && seduta.id != null ? String(seduta.id).trim() : "";
    if (!id) {
      senzaId += 1;
      return;
    }
    if (perId[id]) {
      duplicate += 1;
      return;
    }
    perId[id] = seduta;
  });
  const date = Object.keys(perId)
    .map((k) => String(perId[k].dateInput || perId[k].date || ""))
    .filter(Boolean)
    .sort();
  /* Cancellazione logica (A, v137-141): la seduta cancellata RESTA nella
   * raccolta con `deletedAt` valorizzato, e A la nasconde leggendo
   * `!item?.deletedAt`. Qui si contano tutte e tre le cose, separate:
   * documenti letti, sedute distinte, di cui cancellate. */
  const chiavi = Object.keys(perId);
  const cancellate = chiavi.filter((k) => perId[k] && perId[k].deletedAt).length;
  /* La catena vera di A, non solo `deletedAt`: scarta le cancellate e tiene un
   * solo documento per id. La riga r.14398 di A non e' un filtro: attacca il
   * cestino alle righe gia' disegnate. Quindi A mostra tutte le sedute vive e
   * B fa lo stesso; `visibili` e' quel numero, non un totale aggiustato. */
  const sedutePiatte = elenco.map((d) => {
    const dati = (d && d.dati) || {};
    return dati.session != null ? dati.session : dati;
  });
  const perA = seduteSecondoA(sedutePiatte);
  return {
    documenti: elenco.length,
    valide: chiavi.length,
    valideNonCancellate: chiavi.length - cancellate,
    cancellate,
    visibili: perA.distintePerId,
    doppioniId: perA.doppioniId,
    conCestino: perA.conCestino,
    senzaCestino: perA.senzaCestino,
    elenco: sedutePiatte,
    senzaId,
    duplicate,
    primaData: date.length ? date[0] : null,
    ultimaData: date.length ? date[date.length - 1] : null
  };
}

/* Confronto con quello che A dichiara nella radice: `sessionCount` (r.5937) e
 * `programCount` (r.5933). Sono gli stessi controlli che A fa su sé stessa. */
export function confrontoConRadice(conteggi, radice) {
  const c = conteggi || {};
  const r = radice || {};
  const sc = r.sessionCount == null || r.sessionCount === "" ? null : Number(r.sessionCount);
  const pc = r.programCount == null || r.programCount === "" ? null : Number(r.programCount);
  const sedute = c.sedute || {};
  const programmi = c.programmi || {};
  let sessioni = null;
  if (sc != null && Number.isFinite(sc)) {
    const qui = sedute.visibili != null
      ? sedute.visibili
      : (sedute.valideNonCancellate != null ? sedute.valideNonCancellate : sedute.valide);
    const elencoDiA = r.training && Array.isArray(r.training.sessions) ? r.training.sessions : null;
    const perId = confrontaElenchi(elencoDiA, sedute.elenco || []);
    sessioni = {
      dichiarato: sc,
      letto: qui,
      lettoGrezzo: sedute.valide,
      valideNonCancellate: sedute.valideNonCancellate,
      cancellate: sedute.cancellate || 0,
      senzaCestino: (sedute.senzaCestino || []).length,
      coincide: sc === qui,
      differenza: qui - sc,
      elencoDiA: perId.disponibile,
      soloInElenco: perId.soloInElenco,
      soloNeiDocumenti: perId.soloNeiDocumenti
    };
  }
  return {
    sessioni,
    programmi: pc == null || !Number.isFinite(pc)
      ? null
      : { dichiarato: pc, letto: programmi.distinti, coincide: pc === programmi.distinti, differenza: programmi.distinti - pc }
  };
}
/* Righe della tabella a schermo. Una riga per famiglia, con quattro colonne:
 * cosa, quanto ne dichiara A, quanto ne legge B adesso, dove sta. La quinta
 * colonna (la zona nuova) arriva al passo 3 e per ora dice la verità: non
 * esiste ancora. */
export function righeConteggi(letto) {
  const l = letto || {};
  const s = l.schede || {};
  const p = l.programmi || {};
  const sed = l.sedute || {};
  const r = l.radice || {};
  const c = l.confronto || {};

  const partiSchede = [s.schede + (s.schede === 1 ? " scheda" : " schede")];
  if (s.esercizi) partiSchede.push(s.esercizi + (s.esercizi === 1 ? " esercizio sciolto" : " esercizi sciolti"));
  if (s.archiviate) partiSchede.push(s.archiviate + (s.archiviate === 1 ? " archiviata" : " archiviate"));

  const partiProgrammi = [p.distinti + (p.distinti === 1 ? " programma" : " programmi")];
  partiProgrammi.push(p.documentiMeta + " metadati v2");
  if (p.documentiV1) partiProgrammi.push(p.documentiV1 + " v1");

  const vive = sed.valideNonCancellate != null ? sed.valideNonCancellate : sed.valide;
  const perA = sed.visibili != null ? sed.visibili : vive;
  const partiSedute = [
    "sedute valide (non cancellate): " + vive,
    "sedute che A mostra: " + perA,
    "su " + sed.valide + (sed.valide === 1 ? " distinta letta" : " distinte lette"),
    "su " + sed.documenti + (sed.documenti === 1 ? " documento" : " documenti")
  ];
  if (sed.cancellate) partiSedute.push("di cui con cancellazione logica: " + sed.cancellate);
  if (sed.doppioniId) partiSedute.push("doppioni per id: " + sed.doppioniId);
  if (sed.senzaCestino && sed.senzaCestino.length) partiSedute.push("in A senza cestino: " + sed.senzaCestino.length);
  const periodo = sed.primaData && sed.ultimaData ? " · dal " + sed.primaData + " al " + sed.ultimaData : "";

  return [
    {
      cosa: "Schede",
      inA: "non dichiarato",
      lettoOra: partiSchede.join(" · "),
      dove: "nutritionPhotos · program-v2-sheet- / -exercise- / -archived-",
      zonaNuova: "arriva al passo 3",
      nota: s.programmi ? "schede di " + s.programmi + (s.programmi === 1 ? " programma" : " programmi") : "nessuna scheda trovata"
    },
    {
      cosa: "Programmi",
      inA: c.programmi ? c.programmi.dichiarato + " (programCount)" : "non dichiarato",
      lettoOra: partiProgrammi.join(" · "),
      dove: "nutritionPhotos · program-v2-meta- / program-v1-",
      zonaNuova: "arriva al passo 3",
      nota: p.fuoriElenco ? p.fuoriElenco + " documenti di programmi cancellati (fuori da programIds)" : "nessuno scartato dal filtro di A"
    },
    {
      cosa: "Logbook",
      inA: c.sessioni ? c.sessioni.dichiarato + " (sessionCount)" : "non dichiarato",
      lettoOra: partiSedute.join(" ") + periodo,
      dove: "sessions · campo session",
      zonaNuova: "arriva al passo 3",
      nota: sed.senzaId || sed.duplicate
        ? [sed.senzaId ? sed.senzaId + " senza id" : null, sed.duplicate ? sed.duplicate + " doppioni" : null].filter(Boolean).join(" · ")
        : "tutti i documenti hanno un id valido"
    }
  ];
}

/* ---------- La fotografia ---------- */

export function nomeFileBackup(quando) {
  const d = quando instanceof Date ? quando : new Date();
  const anno = d.getFullYear();
  const mese = String(d.getMonth() + 1).padStart(2, "0");
  const giorno = String(d.getDate()).padStart(2, "0");
  return "barbell-diva-backup-A-" + anno + "-" + mese + "-" + giorno + ".json";
}

const AVVERTENZA =
  "Questo file contiene i tuoi dati: resta sul tuo computer, fuori dai repositori. " +
  "Non va su GitHub e non torna qui: i conteggi si leggono a schermo.";

/* La fotografia: i documenti grezzi, senza filtri, più i conteggi che li
 * accompagnano (così il file si può controllare da solo, senza l'app). */
export function costruisciBackup(ingresso) {
  const i = ingresso || {};
  const radice = i.radice || null;
  const sedute = Array.isArray(i.sedute) ? i.sedute : [];
  const programmi = Array.isArray(i.programmi) ? i.programmi : [];
  const schede = Array.isArray(i.schede) ? i.schede : [];
  const conteggi = {
    schede: contaSchede(schede),
    programmi: contaProgrammi(programmi, radice),
    sedute: contaSedute(sedute)
  };
  const confronto = confrontoConRadice(conteggi, radice);
  return {
    tipo: "barbell-diva-backup",
    versioneFormato: 1,
    scopo: "schede, programmi e logbook dell'app A",
    creatoIl: i.creatoIl instanceof Date ? i.creatoIl.toISOString() : String(valoreO(i.creatoIl, new Date().toISOString())),
    build: valoreO(i.build, null),
    progetto: valoreO(i.progetto, null),
    atleta: { uid: valoreO(i.uid, null) },
    avvertenza: AVVERTENZA,
    dichiaratoDaA: {
      sessionCount: valoreO(radice && radice.sessionCount, null),
      programCount: valoreO(radice && radice.programCount, null),
      programIds: valoreO(radice && radice.programIds, null),
      programStorage: valoreO(radice && radice.programStorage, null),
      sessionStorage: valoreO(radice && radice.sessionStorage, null)
    },
    conteggi,
    confronto,
    righe: righeConteggi({ schede: conteggi.schede, programmi: conteggi.programmi, sedute: conteggi.sedute, radice, confronto }),
    documenti: {
      schede,
      programmi,
      sedute
    }
  };
}

/* Replacer per il salvataggio: i timestamp di Firestore non sono JSON, e se
 * finissero in un file come oggetti vuoti la fotografia perderebbe proprio le
 * date. Diventano { tipo: "timestamp", ms, iso }: leggibili e reversibili. */
export function replacerTimestamp(chiave, valore) {
  if (valore && typeof valore === "object" && typeof valore.toMillis === "function") {
    const ms = valore.toMillis();
    let iso = null;
    try {
      iso = new Date(ms).toISOString();
    } catch (e) {
      iso = null;
    }
    return { tipo: "timestamp", ms, iso };
  }
  return valore;
}

/* Testo del file, pronto per il disco. `spazi` a 2 costa qualche byte in più e
 * rende il file leggibile a occhio: per una fotografia di sicurezza è meglio. */
export function testoBackup(oggetto) {
  return JSON.stringify(oggetto, replacerTimestamp, 2) + "\n";
}
