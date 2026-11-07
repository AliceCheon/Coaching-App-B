/* Barbell Diva B — passo 8: le schermate leggono dalla zona B (bdB_atleti).
 *
 * Da qui in avanti Programma attivo, Archivio e Logbook non leggono piu'
 * niente da `barbellDivaAccounts` (i dati di A): leggono la copia fatta in
 * `bdB_atleti/{uid}`. La sola pagina che continua a leggere A e' la pagina
 * Copia, che serve proprio a copiare.
 *
 * Qui non si scrive niente: le letture passano da scritture-b.js, che e'
 * l'unico modulo con il permesso di parlare con la zona B, e ogni percorso
 * nasce da li'.
 *
 * Se la zona e' vuota o manca un pezzo si dichiara: `statoZonaB` produce il
 * messaggio a schermo e la pagina NON ripiega su A. Un ripiego silenzioso
 * mostrerebbe numeri di A facendo credere che siano di B: e' esattamente il
 * genere di bug che non si vede.
 *
 * Funzioni pure + due letture: niente DOM, nessuna scrittura.
 */

import { SOTTO_B } from "./modello-dati.js";
import { leggiZonaB, leggiFotografia } from "./scritture-b.js";
import { ricostruisciSchede } from "./schede-v2.js";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

function confrontaTesto(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/* Il programId si ricava dagli stessi tre campi di A (r.5599), nell'ordine. */
function programIdVoce(dati) {
  const d = dati || {};
  return testo(
    d.programId ||
    (d.program && d.program.id) ||
    (d.programMeta && d.programMeta.id) ||
    ""
  );
}

/* Tra due copie dello stesso programma tiene la piu' aggiornata (updatedAt,
 * poi id): stessa scelta di lettura-dati.js, cosi' il risultato non dipende
 * dall'ordine in cui Firestore restituisce i documenti. */
function programmaPiuRecente(a, b) {
  const dataA = testo(a && a.updatedAt);
  const dataB = testo(b && b.updatedAt);
  if (dataA !== dataB) return dataB > dataA ? b : a;
  return confrontaTesto(testo(b && b.id), testo(a && a.id)) > 0 ? b : a;
}

/* Programmi dalla zona B: metadati v2 e programmi interi v1.
 *
 * La copia salta gia' il v1 di un programma che ha il suo v2 (copia-b.js), ma
 * la regola si applica lo stesso: se un giorno un v1 arrivasse comunque, non
 * deve diventare un secondo programma. E' la regola di A (r.5636-5639).
 *
 * Ritorna { programmi, documenti, scartati, v1Doppioni, v2Doppioni }. */
export function programmiDaDocumenti(documenti) {
  const elenco = (Array.isArray(documenti) ? documenti : []).filter((d) => d && typeof d === "object");
  const metaPerId = Object.create(null);
  const v1PerId = Object.create(null);
  const ordineMeta = [];
  const ordineV1 = [];
  let scartati = 0;
  let v1Doppioni = 0;
  let v2Doppioni = 0;

  elenco.forEach((d) => {
    const dati = (d && d.dati) || {};
    const pid = programIdVoce(dati);

    if (dati.programMeta && typeof dati.programMeta === "object") {
      if (!pid) { scartati += 1; return; }
      if (Object.prototype.hasOwnProperty.call(metaPerId, pid)) {
        v2Doppioni += 1;
        metaPerId[pid] = programmaPiuRecente(metaPerId[pid], dati.programMeta);
        return;
      }
      metaPerId[pid] = dati.programMeta;
      ordineMeta.push(pid);
      return;
    }

    if (dati.program && typeof dati.program === "object") {
      const chiave = pid || testo(dati.program.id);
      if (!chiave) { scartati += 1; return; }
      if (Object.prototype.hasOwnProperty.call(v1PerId, chiave)) {
        v1PerId[chiave] = programmaPiuRecente(v1PerId[chiave], dati.program);
        return;
      }
      v1PerId[chiave] = dati.program;
      ordineV1.push(chiave);
      return;
    }

    scartati += 1;
  });

  const finali = [];
  const giaPresenti = Object.create(null);
  ordineMeta.forEach((chiave) => {
    giaPresenti[chiave] = true;
    finali.push({ chiave, programma: metaPerId[chiave] });
  });
  ordineV1.forEach((chiave) => {
    if (giaPresenti[chiave]) { v1Doppioni += 1; return; }
    giaPresenti[chiave] = true;
    finali.push({ chiave, programma: v1PerId[chiave] });
  });
  finali.sort((a, b) => confrontaTesto(a.chiave, b.chiave)
    || confrontaTesto(testo(a.programma && a.programma.id), testo(b.programma && b.programma.id)));

  return {
    programmi: finali.map((f) => f.programma),
    documenti: elenco.length,
    scartati,
    v1Doppioni,
    v2Doppioni
  };
}

/* Tra due copie della stessa seduta tiene la piu' recente (revision, poi
 * updatedAt/cloudSyncedAt): la stessa scelta di lettura-dati.js. */
function sedutaPiuRecente(a, b) {
  const revisioneA = Number(a && a.revision) || 0;
  const revisioneB = Number(b && b.revision) || 0;
  if (revisioneA !== revisioneB) return revisioneB > revisioneA ? b : a;
  const dataA = String((a && (a.updatedAt || a.cloudSyncedAt)) || "");
  const dataB = String((b && (b.updatedAt || b.cloudSyncedAt)) || "");
  return dataB.localeCompare(dataA) > 0 ? b : a;
}

/* Sedute dalla zona B. Il documento copiato ha la forma di A (`session`), ma
 * si accetta anche il corpo nudo: un giorno la copia potrebbe cambiare forma e
 * una seduta non deve sparire per questo.
 *
 * Ritorna { sedute, documenti, senzaId, duplicati }: `senzaId` e `duplicati`
 * sono i due scarti che la nota del Logbook dichiara a schermo. */
export function seduteDaDocumenti(documenti) {
  const elenco = (Array.isArray(documenti) ? documenti : []).filter((d) => d && typeof d === "object");
  const perId = Object.create(null);
  let senzaId = 0;
  let duplicati = 0;

  elenco.forEach((d) => {
    const dati = (d && d.dati) || {};
    const seduta = dati.session != null ? dati.session : dati;
    const id = seduta && seduta.id != null ? testo(seduta.id) : "";
    if (!id) { senzaId += 1; return; }
    if (Object.prototype.hasOwnProperty.call(perId, id)) {
      duplicati += 1;
      perId[id] = sedutaPiuRecente(perId[id], seduta);
      return;
    }
    perId[id] = seduta;
  });

  return {
    sedute: Object.keys(perId).map((id) => perId[id]),
    documenti: elenco.length,
    senzaId,
    duplicati
  };
}

/* Le schede della zona B arrivano gia' nella forma grezza che ricostruisce
 * ricostruisciSchede ({id, dati}): la copia non interpreta, quindi qui non si
 * interpreta nemmeno. */
export function schedeDaDocumenti(documenti) {
  return (Array.isArray(documenti) ? documenti : [])
    .filter((d) => d && typeof d === "object")
    .map((d) => ({ id: testo(d.id), dati: (d && d.dati) || {} }));
}

/* La zona B e' utilizzabile? Tre famiglie sono obbligatorie (programmi,
 * schede, sedute); gli esercizi sciolti possono essere legittimamente zero e
 * non entrano nel giudizio. La fotografia non e' obbligatoria, ma se manca si
 * dice: senza, non si sa quando la copia e' stata fatta. */
export function statoZonaB(letture) {
  const l = letture || {};
  const programmi = (Array.isArray(l.programmi) ? l.programmi : []).filter((p) => p && typeof p === "object");
  const schede = Number(l.schede) || 0;
  const sedute = Number(l.sedute) || 0;
  const fotografia = l.fotografia || null;

  const mancanti = [];
  if (!programmi.length) mancanti.push("i programmi");
  if (!schede) mancanti.push("le schede");
  if (!sedute) mancanti.push("le sedute");

  const vuota = !fotografia && !programmi.length && !schede && !sedute;
  if (vuota) {
    return {
      vuota: true,
      completa: false,
      mancanti,
      avviso: "La zona B e' vuota: non c'e' nessun dato da mostrare. Fai prima la copia dalla pagina Copia — queste schermate non leggono i dati di A."
    };
  }
  if (mancanti.length) {
    const elenco = mancanti.length === 1
      ? mancanti[0]
      : mancanti.slice(0, -1).join(", ") + " e " + mancanti[mancanti.length - 1];
    return {
      vuota: false,
      completa: false,
      mancanti,
      avviso: "La zona B e' incompleta: " + (mancanti.length === 1 ? "manca " : "mancano ") + elenco
        + ". Fai prima la copia dalla pagina Copia: B non ripiega sui dati di A."
        + (fotografia ? "" : " La fotografia della copia non c'e': rifai la copia quando puoi.")
    };
  }
  return { vuota: false, completa: true, mancanti: [], avviso: null };
}

/* La lettura completa per le tre schermate: fotografia, programmi, schede,
 * sedute, esclusioni. Ritorna anche il giudizio (`stato`), cosi' la pagina ha
 * una sola cosa da chiedere: «posso mostrare?».
 *
 * Lesclusioni sono gia' dentro la zona B: non servono letture da A nemmeno per
 * quelle. */
export async function leggiZonaBCompleta(db, uid) {
  const fotografia = await leggiFotografia(db, uid).catch(() => null);
  const documentiProgrammi = await leggiZonaB(db, uid, SOTTO_B.programmi);
  const documentiSchede = await leggiZonaB(db, uid, SOTTO_B.schede);
  const documentiSedute = await leggiZonaB(db, uid, SOTTO_B.sedute);
  const esclusioni = await leggiZonaB(db, uid, SOTTO_B.esclusioni).catch(() => []);

  const p = programmiDaDocumenti(documentiProgrammi);
  const s = seduteDaDocumenti(documentiSedute);
  const schedeV2 = ricostruisciSchede(schedeDaDocumenti(documentiSchede));

  return {
    fotografia,
    programmi: p.programmi,
    programmiInfo: p,
    sedute: s,
    schedeV2,
    esclusioni,
    esito: statoZonaB({
      fotografia,
      programmi: p.programmi,
      schede: schedeV2.totale.schede,
      sedute: s.sedute.length
    })
  };
}
