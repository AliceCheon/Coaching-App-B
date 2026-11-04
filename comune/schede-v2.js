/* Barbell Diva B — le schede vere dei programmi v2 (fase 2.5, SOLA LETTURA).
 *
 * Perché questo modulo esiste: nel formato v2 A non mette le schede dentro il
 * documento-programma. Le mette in documenti separati, nella stessa
 * sottoraccolta `nutritionPhotos`, con tre famiglie di id:
 *
 *   program-v2-sheet-<pid>__<sid>          la scheda (con gli esercizi dentro,
 *                                          oppure vuota se è troppo grande)
 *   program-v2-exercise-<pid>__<sid>__<eid> un esercizio di una scheda «splittata»
 *   program-v2-archived-<pid>__<sid>        una scheda archiviata
 *
 * Fonte nel codice di A: `cloudProgramSheetDocumentId` e compagni (r.5396-5417)
 * per gli id; il ricaricamento r.5594-5624 per i campi; `CLOUD_SHEET_SIZE_LIMIT`
 * (r.5419) e `fillSplitExercises` (r.5616-5623) per la scheda «vuota» riempita
 * dagli esercizi sciolti; `normalizeSheetModel` (r.2552) e
 * `normalizeExerciseModel` (r.2528) per i campi.
 *
 * Qui si LEGGE soltanto: la lettura passa da `leggiSchedeGrezze`, che è già
 * dentro l'elenco chiuso dei percorsi ammessi e non scrive niente. La pagina
 * dei Conteggi usa la stessa funzione — è per questo che i suoi numeri (26
 * schede, 170 archiviate) sono gli stessi che si vedono qui.
 *
 * Regola di casa: se un esercizio non ha il nome, non si chiama «Esercizio 1»
 * per finta; se una scheda non ha la settimana, resta senza. Il vuoto si
 * dichiara.
 */

import { leggiSchedeGrezze } from "./lettura-grezza.js";

const NON = "non registrato";

export const PREFISSI_SCHEDE = Object.freeze({
  scheda: "program-v2-sheet-",
  esercizio: "program-v2-exercise-",
  archiviata: "program-v2-archived-"
});

/* I nomi di campo accettati, dichiarati in un posto solo. */
export const CAMPI_SCHEDA = Object.freeze({
  codice: Object.freeze(["code", "codice", "letter"]),
  nome: Object.freeze(["name", "nome"]),
  focus: Object.freeze(["focus", "gruppi", "target"]),
  giorno: Object.freeze(["day", "giorno"]),
  settimana: Object.freeze(["week", "settimana"]),
  ordine: Object.freeze(["order", "ordine"]),
  note: Object.freeze(["note", "nota", "note2"]),
  split: Object.freeze(["split"]),
  esercizi: Object.freeze(["exercises", "esercizi"]),
  splittata: Object.freeze(["exercisesSplit"]),
  aggiornata: Object.freeze(["updatedAt", "aggiornato"])
});

export const CAMPI_ESERCIZIO = Object.freeze({
  nome: Object.freeze(["name", "nome", "exercise"]),
  muscolo: Object.freeze(["muscle", "muscolo", "som"]),
  ordine: Object.freeze(["order", "ordine"]),
  serie: Object.freeze(["sets", "serie", "series"]),
  ripetizioni: Object.freeze(["reps", "ripetizioni", "rip"]),
  recupero: Object.freeze(["rest", "recupero", "pausa"]),
  tempo: Object.freeze(["tempo", "cadenza"]),
  nota: Object.freeze(["note", "nota", "note2"]),
  settimane: Object.freeze(["weeks", "manuale", "manualWeeks"])
});

function primoCampo(oggetto, nomi) {
  if (!oggetto || typeof oggetto !== "object") return undefined;
  for (let i = 0; i < nomi.length; i += 1) {
    const nome = nomi[i];
    if (Object.prototype.hasOwnProperty.call(oggetto, nome) && oggetto[nome] != null) return oggetto[nome];
  }
  return undefined;
}

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

function numero(valore) {
  const n = Number(valore);
  return Number.isFinite(n) ? n : null;
}

/* L'id del documento: prefisso + «pid__sid» (con %2E al posto dei punti).
 * Si legge il prefisso, e si decodificano le due parti: se il documento non ha
 * i campi programId/sheetId nel corpo, l'id basta a ricostruire il legame. */
export function decodificaId(id) {
  const grezzo = testo(id);
  const famiglie = [
    ["archiviata", PREFISSI_SCHEDE.archiviata],
    ["esercizio", PREFISSI_SCHEDE.esercizio],
    ["scheda", PREFISSI_SCHEDE.scheda]
  ];
  for (let i = 0; i < famiglie.length; i += 1) {
    const [famiglia, prefisso] = famiglie[i];
    if (grezzo.indexOf(prefisso) !== 0) continue;
    const resto = grezzo.slice(prefisso.length);
    const pezzi = resto.split("__");
    // Senza il separatore «__» l'id non porta il legame col programma: non si
    // inventa un programId tagliando il resto dell'id.
    if (pezzi.length < 2) {
      return { famiglia, programId: "", sheetId: "", exerciseId: "" };
    }
    const dec = (v) => {
      try {
        return decodeURIComponent(String(v));
      } catch (e) {
        return String(v);
      }
    };
    return { famiglia, programId: dec(pezzi[0] || ""), sheetId: dec(pezzi[1] || ""), exerciseId: dec(pezzi[2] || "") };
  }
  return null;
}

/* Una prescrizione può arrivare in tre modi: dentro `prescription`, come
 * campi sciolti sull'esercizio, oppure in una stringa («4x8 @ 90"»). Qui si
 * legge quello che c'è, senza convertirne il senso: si mostrano i numeri come
 * sono scritti. */
export function prescrizione(esercizio) {
  const p = esercizio && typeof esercizio === "object" ? esercizio : {};
  const dentro = p.prescription && typeof p.prescription === "object" ? p.prescription : {};
  const serie = primoCampo(dentro, CAMPI_ESERCIZIO.serie) != null ? primoCampo(dentro, CAMPI_ESERCIZIO.serie) : primoCampo(p, CAMPI_ESERCIZIO.serie);
  const rip = primoCampo(dentro, CAMPI_ESERCIZIO.ripetizioni) != null ? primoCampo(dentro, CAMPI_ESERCIZIO.ripetizioni) : primoCampo(p, CAMPI_ESERCIZIO.ripetizioni);
  const rec = primoCampo(dentro, CAMPI_ESERCIZIO.recupero) != null ? primoCampo(dentro, CAMPI_ESERCIZIO.recupero) : primoCampo(p, CAMPI_ESERCIZIO.recupero);
  const tempo = primoCampo(dentro, CAMPI_ESERCIZIO.tempo) != null ? primoCampo(dentro, CAMPI_ESERCIZIO.tempo) : primoCampo(p, CAMPI_ESERCIZIO.tempo);
  const settimane = primoCampo(p.progression || {}, ["weeks"]) || primoCampo(p, CAMPI_ESERCIZIO.settimane);
  const q = (v) => (v == null || v === "" ? "" : String(v));
  return {
    serie: q(serie),
    ripetizioni: q(rip),
    recupero: q(rec),
    tempo: q(tempo),
    settimane: Array.isArray(settimane) ? settimane.length : 0
  };
}

/* Un esercizio come lo mostra la tabella: nome, gruppo, prescrizione, nota.
 * Gli esercizi cancellati (deletedAt) non si mostrano, come in A. */
export function esercizioNormalizzato(esercizio, indice) {
  const e = esercizio && typeof esercizio === "object" ? esercizio : {};
  return {
    id: testo(e.id),
    nome: testo(primoCampo(e, CAMPI_ESERCIZIO.nome)) || NON,
    muscolo: testo(primoCampo(e, CAMPI_ESERCIZIO.muscolo)),
    nota: testo(primoCampo(e, CAMPI_ESERCIZIO.nota)),
    ordine: numero(primoCampo(e, CAMPI_ESERCIZIO.ordine)) == null ? indice : numero(primoCampo(e, CAMPI_ESERCIZIO.ordine)),
    prescrizione: prescrizione(e)
  };
}

function eserciziDi(scheda) {
  const elenco = primoCampo(scheda, CAMPI_SCHEDA.esercizi);
  if (!Array.isArray(elenco)) return [];
  return elenco
    .filter((e) => e && typeof e === "object" && !e.deletedAt)
    .map(esercizioNormalizzato)
    .sort((a, b) => a.ordine - b.ordine);
}

function schedaNormalizzata(scheda, archivio) {
  const s = scheda && typeof scheda === "object" ? scheda : {};
  const esercizi = eserciziDi(s);
  return {
    id: testo(s.id),
    codice: testo(primoCampo(s, CAMPI_SCHEDA.codice)) || NON,
    nome: testo(primoCampo(s, CAMPI_SCHEDA.nome)),
    focus: testo(primoCampo(s, CAMPI_SCHEDA.focus)),
    giorno: numero(primoCampo(s, CAMPI_SCHEDA.giorno)),
    settimana: numero(primoCampo(s, CAMPI_SCHEDA.settimana)),
    ordine: numero(primoCampo(s, CAMPI_SCHEDA.ordine)) == null ? 0 : numero(primoCampo(s, CAMPI_SCHEDA.ordine)),
    note: testo(primoCampo(s, CAMPI_SCHEDA.note)),
    split: testo(primoCampo(s, CAMPI_SCHEDA.split)),
    aggiornata: testo(primoCampo(s, CAMPI_SCHEDA.aggiornata)),
    esercizi,
    numeroEsercizi: esercizi.length,
    archiviata: archivio === true
  };
}

/* Ricostruzione pura: entrano i documenti grezzi, escono le schede per
 * programma. È la stessa cosa che fa A al caricamento (r.5594-5624), ma senza
 * scritture e senza buttare via niente: le schede archiviate restano a parte,
 * non si mescolano a quelle attive.
 *
 * Ritorna:
 *   { perProgramma, totale: {schede, eserciziSciolti, archiviate, esercizi,
 *    programmi, senzaLegame} } */
export function ricostruisciSchede(documenti) {
  const elenco = Array.isArray(documenti) ? documenti : [];
  const perProgramma = Object.create(null);
  const eserciziSciolti = Object.create(null); // "pid::sid::famiglia" -> [esercizio]
  let schede = 0;
  let archiviate = 0;
  let sciolti = 0;
  let senzaLegame = 0;

  const programma = (pid) => {
    const chiave = testo(pid) || "?";
    if (!perProgramma[chiave]) perProgramma[chiave] = { programId: chiave, schede: [], archiviate: [] };
    return perProgramma[chiave];
  };

  elenco.forEach((doc) => {
    const id = testo(doc && doc.id);
    const dati = (doc && doc.dati) || {};
    const daId = decodificaId(id);
    const famiglia = dati.kind === "archived" ? "archiviata" : (daId ? daId.famiglia : "scheda");
    const programId = testo(dati.programId) || (daId ? daId.programId : "");
    const sheetId = testo(dati.sheetId) || (daId ? daId.sheetId : "");
    if (!programId) {
      senzaLegame += 1;
      return;
    }
    const gruppo = programma(programId);

    if (famiglia === "esercizio" || dati.exercise) {
      sciolti += 1;
      const chiave = programId + "::" + sheetId + "::" + (famiglia === "archiviata" ? "archiviata" : "scheda");
      if (!eserciziSciolti[chiave]) eserciziSciolti[chiave] = [];
      eserciziSciolti[chiave].push(dati.exercise || {});
      return;
    }
    if (!dati.sheet) return;
    const scheda = schedaNormalizzata(dati.sheet, famiglia === "archiviata");
    if (!scheda.id) scheda.id = sheetId;
    if (famiglia === "archiviata") {
      archiviate += 1;
      gruppo.archiviate.push(scheda);
    } else {
      schede += 1;
      gruppo.schede.push(scheda);
    }
  });

  // r.5616-5623: una scheda «vuota» (troppo grande per un documento solo) si
  // riempie con gli esercizi arrivati nei documenti sciolti.
  const riempi = (programId, elenco, archivio) => {
    elenco.forEach((scheda) => {
      const chiave = programId + "::" + scheda.id + "::" + (archivio ? "archiviata" : "scheda");
      const scioltiQui = eserciziSciolti[chiave];
      if (!scioltiQui || !scioltiQui.length) return;
      const uniti = scheda.esercizi.concat(scioltiQui.map(esercizioNormalizzato));
      uniti.sort((a, b) => a.ordine - b.ordine);
      scheda.esercizi = uniti;
      scheda.numeroEsercizi = uniti.length;
    });
  };
  Object.keys(perProgramma).forEach((pid) => {
    const gruppo = perProgramma[pid];
    riempi(gruppo.programId, gruppo.schede, false);
    riempi(gruppo.programId, gruppo.archiviate, true);
    const ordina = (a, b) => a.ordine - b.ordine || testo(a.codice).localeCompare(testo(b.codice));
    gruppo.schede.sort(ordina);
    gruppo.archiviate.sort(ordina);
  });

  const totale = {
    schede,
    archiviate,
    eserciziSciolti: sciolti,
    esercizi: Object.keys(perProgramma).reduce((a, pid) => a
      + perProgramma[pid].schede.reduce((b, s) => b + s.numeroEsercizi, 0)
      + perProgramma[pid].archiviate.reduce((b, s) => b + s.numeroEsercizi, 0), 0),
    programmi: Object.keys(perProgramma).length,
    senzaLegame
  };
  return { perProgramma, totale };
}

/* Lettura vera dei documenti delle schede. Sola lettura: passa da
 * `leggiSchedeGrezze`, che legge solo gli intervalli di id delle tre famiglie
 * e mai le foto di nutrizione. */
export async function leggiSchedeProgrammi(db, uid) {
  const documenti = await leggiSchedeGrezze(db, uid);
  return ricostruisciSchede(documenti);
}

/* Le schede di un programma, o null quando quel programma non ne ha nessuna
 * (meglio il vuoto dichiarato di un elenco vuoto travestito). */
export function schedeDelProgrammaV2(ricostruzione, programId) {
  if (!ricostruzione || !ricostruzione.perProgramma) return null;
  const gruppo = ricostruzione.perProgramma[testo(programId)];
  if (!gruppo) return null;
  return { schede: gruppo.schede, archiviate: gruppo.archiviate };
}

export const SCHEDE_NON_REGISTRATO = NON;
