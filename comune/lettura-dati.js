/* Barbell Diva B — letture dei dati di A (fase 0: SOLO LETTURA).
 *
 * Cintura di sicurezza (b): soli getter, con l'elenco chiuso di modello-dati.js.
 * Tutte le letture passano dal controllo di percorso; qualunque percorso
 * diverso lancia ErrorePercorsoNonAmmesso. Nessun ascoltatore (onSnapshot è
 * vietato dalla scansione del sorgente): le letture sono una tantum, il
 * pulsante «Ricarica» le ripete.
 *
 * Fonti nel codice di A (main, verificate il 2/11/2026) — dettaglio in README:
 *  - documento radice con stato dentro `state`: r.6080;
 *  - CLOUD_COLLECTION "barbellDivaAccounts": r.24;
 *  - sedute per-seduta nella sottoraccolta `sessions`, campo `session`: r.6257, r.6365;
 *  - blobbi `stateBlobs` (id blob-v1-<campo>): r.5340-5365;
 *  - metrics.weight (scrittore dal v148.38): r.15034;
 *  - quiz.questionnaireHistory (canonico): r.4777, r.15020-15021;
 *  - programma attivo esplicito: r.7019-7027; settimana dall'ultima seduta App: r.6882-6899.
 */

import {
  COLLEZIONE_ATLETI,
  percorsoAmmesso,
  ErrorePercorsoNonAmmesso
} from "./modello-dati.js";

export { ErrorePercorsoNonAmmesso };

const ID_BLOB_PRE = "blob-v1-";

/* Lettura una tantum del documento radice dell'atleta + blobbi di stato.
 * Ritorna { stato, blobbi, presente }: lo stato è quello di A con i campi
 * assenti dalla radice ripristinati dai blob (stesso ripiego di A, r.5363-5365). */
export async function leggiDocumentoAtleta(db, uid) {
  const percorso = "barbellDivaAccounts/" + uid;
  if (!percorsoAmmesso(percorso, uid)) throw new ErrorePercorsoNonAmmesso(percorso);
  const istantanea = await db.collection(COLLEZIONE_ATLETI).doc(uid).get();
  if (!istantanea.exists) return { stato: null, blobbi: [], presente: false };
  const datiRadice = istantanea.data() || {};
  // Il documento radice porta lo stato dentro `state` (r.6080 di A); per
  // prudenza, se non c'è, si usa il documento com'è (formati più vecchi).
  let stato = datiRadice.state != null ? datiRadice.state : datiRadice;
  if (typeof stato !== "object" || stato === null) stato = {};
  const blobbi = [];
  // Ripiego blobbi: campi di stato grossi non stanno in radice (r.5340-5365).
  if (percorsoAmmesso(percorso + "/stateBlobs", uid)) {
    try {
      const blobbiIstantanei = await db.collection(COLLEZIONE_ATLETI).doc(uid).collection("stateBlobs").get();
      (blobbiIstantanei.docs || []).forEach((d) => {
        const id = String(d.id || "");
        if (!id.startsWith(ID_BLOB_PRE)) return;
        const campo = decodeURIComponent(id.slice(ID_BLOB_PRE.length)).split("%2E").join(".");
        const contenuto = d.data ? d.data() : null;
        if (!contenuto || campo in stato) return;
        const chiavi = Object.keys(contenuto).filter((k) => k !== "updatedAt" && k !== "meta" && k !== "hash");
        if (chiavi.length !== 1) return;
        stato[campo] = contenuto[chiavi[0]];
        blobbi.push(campo);
      });
    } catch (e) {
      // I blobbi sono un ripiego: se la lettura fallisce si prosegue con la radice.
    }
  }
  return { stato, blobbi, presente: true };
}

/* Lettura una tantum della sottoraccolta `sessions` (r.6257, r.6365 di A). */
export async function leggiSedute(db, uid) {
  const percorso = "barbellDivaAccounts/" + uid + "/sessions";
  if (!percorsoAmmesso(percorso, uid)) throw new ErrorePercorsoNonAmmesso(percorso);
  const istantanea = await db.collection(COLLEZIONE_ATLETI).doc(uid).collection("sessions").get();
  return (istantanea.docs || []).map((d) => {
    const dati = d.data ? d.data() : {};
    return dati.session != null ? dati.session : dati; // r.6365: `data()?.session || data()`
  });
}

/* ---------- Estrattori puri (niente rete, nessun effetto collaterale) ---------- */

export function numeroSedute(stato) {
  const elenco = stato && stato.training && Array.isArray(stato.training.sessions) ? stato.training.sessions : [];
  return elenco.length;
}

/* Ordinamento fedele a latestAppWorkout di A (r.6894-6898):
 * dataInput decrescente, poi id numerico decrescente. */
function confrontoSedute(a, b) {
  return String(b.dateInput || "").localeCompare(String(a.dateInput || "")) || (Number(b.id) || 0) - (Number(a.id) || 0);
}

/* Ultima seduta registrata (dal documento di A, campo state.training.sessions). */
export function ultimaSeduta(stato) {
  const elenco = stato && stato.training && Array.isArray(stato.training.sessions) ? stato.training.sessions : [];
  if (!elenco.length) return null;
  return elenco.slice().sort(confrontoSedute)[0] || null;
}

/* Peso corrente: state.metrics.weight (l'ultimo scritto da A, r.15034). */
export function pesoCorrente(stato) {
  const v = stato && stato.metrics ? stato.metrics.weight : undefined;
  return v == null || v === "" ? null : String(v);
}

/* Ultimo check-in: quiz.questionnaireHistory (canonico, r.4777 di A).
 * La voce porta {date, createdAt, questionnaireId, answers, wellness} (r.15021). */
export function ultimoCheckin(stato) {
  const q = stato && stato.quiz ? stato.quiz.questionnaireHistory : null;
  if (!Array.isArray(q) || !q.length) return null;
  return q.slice().sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] || null;
}

/* Programma attivo, con la regola ESATTA di A:
 *  - esplicito: status "active" oppure active===true, non archiviato (r.7019-7022);
 *  - ripiego (etichettato come tale): il non archiviato con updatedAt più
 *    recente, poi il primo in elenco (r.7023-7027).
 * La settimana segue weekFromLatestWorkout (r.6882-6892): dalla seduta App più
 * recente prende il campo `week`, altrimenti il numero in coda al codice
 * scheda; senza sedute App → null («non registrata», nessun numero inventato). */
export function programmaAttivo(stato) {
  const elenco = Array.isArray(stato && stato.programs) ? stato.programs : [];
  const disponibili = elenco.filter((p) => p && !p.archivedAt && String(p.status || "") !== "archived");
  const esplicito = disponibili.find((p) => String(p.status || "") === "active") || disponibili.find((p) => p.active === true) || null;
  if (esplicito) return { programma: esplicito, esplicito: true, ripiego: false };
  const ripiego = disponibili.slice().sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0] || elenco[0] || null;
  return ripiego ? { programma: ripiego, esplicito: false, ripiego: true } : null;
}

/* Settimana corrente secondo A (r.6882-6899). Ritorna numero o null. */
export function settimanaCorrente(stato) {
  const elenco = stato && stato.training && Array.isArray(stato.training.sessions) ? stato.training.sessions : [];
  const latest = elenco
    .filter((s) => s && (s.source === "App" || Number(s.id) > 1000000000))
    .sort(confrontoSedute)[0] || null;
  if (!latest) return null;
  const dalCampo = Number(latest.week);
  if (Number.isFinite(dalCampo) && dalCampo > 0) return dalCampo;
  const dalCodice = Number(String(latest.sessionCode || "").match(/(\d+)$/)?.[1]);
  return Number.isFinite(dalCodice) && dalCodice > 0 ? dalCodice : null;
}

/* Riepilogo pronto per le schermate (modello puro, senza DOM né rete).
 * `presente: false` = documento di A non trovato; i singoli campi assenti
 * valgono null e le schermate mostrano «non registrato». */
export function riepilogoDati(stato, seduteSottoraccolta) {
  const presente = stato != null && typeof stato === "object";
  const ultima = presente ? ultimaSeduta(stato) : null;
  const attivo = presente ? programmaAttivo(stato) : null;
  const checkin = presente ? ultimoCheckin(stato) : null;
  const peso = presente ? pesoCorrente(stato) : null;
  return {
    presente,
    numeroSedute: presente ? numeroSedute(stato) : null,
    numeroSeduteSottoraccolta: Array.isArray(seduteSottoraccolta) ? seduteSottoraccolta.length : null,
    ultima: ultima
      ? {
          data: ultima.dateInput || ultima.date || "?",
          codice: ultima.sessionCode || ultima.code || "?",
          nome: ultima.sessionName || ultima.name || ""
        }
      : null,
    peso,
    checkin: checkin
      ? {
          data: checkin.date || (checkin.createdAt ? String(checkin.createdAt).slice(0, 10) : "?"),
          questionario: checkin.questionnaireId || "?",
          risposte: checkin.answers || {},
          wellness: checkin.wellness || null
        }
      : null,
    programma: attivo
      ? {
          nome: attivo.programma.name || "Programma senza nome",
          esplicito: attivo.esplicito === true,
          ripiego: attivo.ripiego === true,
          settimana: settimanaCorrente(stato)
        }
      : null
  };
}
