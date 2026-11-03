/* Barbell Diva B — letture dei dati di A (SOLO LETTURA).
 *
 * Cintura di sicurezza (b): soli getter, con l'elenco chiuso di modello-dati.js.
 * Tutte le letture passano dal controllo di percorso; qualunque percorso
 * diverso lancia ErrorePercorsoNonAmmesso. Nessun ascoltatore (onSnapshot è
 * vietato dalla scansione del sorgente): le letture sono una tantum, il
 * pulsante «Ricarica» le ripete.
 *
 * Fonti nel codice di A (main v148.38, verificate riga per riga il 2/11/2026):
 *  - documento radice con stato dentro `state`: r.6080;
 *  - CLOUD_COLLECTION "barbellDivaAccounts": r.24;
 *  - `sessionCount` di primo livello nella radice (controllo): r.5937;
 *  - `programCount` e `programIds` di primo livello nella radice: r.5932-5935;
 *  - `state.training.sessions` azzerato a ogni salvataggio: r.5888 — non è più una fonte;
 *  - `programs` tolto dal payload della radice: r.5854;
 *  - sedute per-seduta nella sottoraccolta `sessions`, campo `session`: r.6257, r.6365,
 *    filtro sui documenti senza id r.5581;
 *  - programmi nella sottoraccolta `nutritionPhotos`, id `program-v1-…` / `program-v2-meta-…`
 *    e compagnia: r.5224-5234, r.5396-5417, ricostruzione r.5586-5642;
 *  - regole di A sui programmi copiate qui, una per una:
 *      r.5587  formato vecchio → i programmi stanno ancora in state.programs;
 *      r.5591  elenco chiuso dei programId ammessi (dalla radice);
 *      r.5600  documento con programId fuori elenco → scartato (programmi cancellati);
 *      r.5601  formato v1: un documento intero per programma;
 *      r.5602  formato v2: un documento leggero di metadati per programma;
 *      r.5636-5639  il v1 si usa SOLO se lo stesso programId non è già in v2;
 *      r.5640  programCount > 0 e nessun programma ricostruito → «cloud programs missing»;
 *      r.7019-7027  scelta del programma attivo;
 *  - blobbi `stateBlobs` (id blob-v1-<campo>): r.5340-5365;
 *  - metrics.weight (scrittore dal v148.38): r.15034;
 *  - quiz.questionnaireHistory (canonico): r.4777, r.15021;
 *  - settimana dall'ultima seduta App: r.6882-6899.
 */

import {
  COLLEZIONE_ATLETI,
  INTERVALLI_PROGRAMMI,
  percorsoAmmesso,
  ErrorePercorsoNonAmmesso
} from "./modello-dati.js";

export { ErrorePercorsoNonAmmesso };

const ID_BLOB_PRE = "blob-v1-";

/* Confronto di testo senza dipendere dalla lingua/ICU: serve solo per un
 * ordine stabile (mai per decidere QUALE programma è attivo). */
function confrontaTesto(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function numeroOppureNull(valore) {
  if (valore == null || valore === "") return null;
  const n = Number(valore);
  return Number.isFinite(n) ? n : null;
}

/* Lettura una tantum del documento radice dell'atleta + blobbi di stato.
 * Ritorna:
 *   { stato, blobbi, presente, sessionCount, programCount, programIds,
 *     sessionStorage, programStorage }
 * `sessionCount`, `programCount` e `programIds` sono di PRIMO LIVELLO
 * (r.5932-5937): sono i conteggi/elenchi che A scrive nell'ultimo salvataggio,
 * e in B fanno da CONTROLLO sulle letture delle sottoraccolte.
 * `programIds` vale null se il campo non c'è (i formati vecchi non lo hanno):
 * per A un elenco assente o vuoto significa «nessun filtro» (r.5600). */
export async function leggiDocumentoAtleta(db, uid) {
  const percorso = "barbellDivaAccounts/" + uid;
  if (!percorsoAmmesso(percorso, uid)) throw new ErrorePercorsoNonAmmesso(percorso);
  const istantanea = await db.collection(COLLEZIONE_ATLETI).doc(uid).get();
  if (!istantanea.exists) {
    return {
      stato: null,
      blobbi: [],
      presente: false,
      sessionCount: null,
      programCount: null,
      programIds: null,
      sessionStorage: null,
      programStorage: null
    };
  }
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
  const programIds = Array.isArray(datiRadice.programIds) ? datiRadice.programIds.map(String) : null;
  return {
    stato,
    blobbi,
    presente: true,
    sessionCount: numeroOppureNull(datiRadice.sessionCount),
    programCount: numeroOppureNull(datiRadice.programCount),
    programIds,
    sessionStorage: datiRadice.sessionStorage || null,
    programStorage: datiRadice.programStorage || null
  };
}

/* Tra due copie della stessa seduta tiene la più recente (revision, poi
 * updatedAt/cloudSyncedAt). A riconcilia per id con lo stesso criterio
 * (r.6263-6273); qui basta non contare due volte la stessa seduta. */
function piuRecente(a, b) {
  const revisioneA = Number(a && a.revision) || 0;
  const revisioneB = Number(b && b.revision) || 0;
  if (revisioneA !== revisioneB) return revisioneB > revisioneA ? b : a;
  const dataA = String((a && (a.updatedAt || a.cloudSyncedAt)) || "");
  const dataB = String((b && (b.updatedAt || b.cloudSyncedAt)) || "");
  return dataB.localeCompare(dataA) > 0 ? b : a;
}

/* Lettura una tantum della sottoraccolta `sessions` — la FONTE delle sedute.
 * Come A (r.5581) si scartano i documenti senza `id` valido; in più si
 * deduplica per id, così una copia residua non gonfia il conteggio.
 * Ritorna { sedute, documenti, senzaId, duplicati }. */
export async function leggiSedute(db, uid) {
  const percorso = "barbellDivaAccounts/" + uid + "/sessions";
  if (!percorsoAmmesso(percorso, uid)) throw new ErrorePercorsoNonAmmesso(percorso);
  const istantanea = await db.collection(COLLEZIONE_ATLETI).doc(uid).collection("sessions").get();
  const documenti = istantanea.docs || [];
  const perId = Object.create(null);
  let senzaId = 0;
  let duplicati = 0;
  documenti.forEach((d) => {
    const dati = d.data ? d.data() : {};
    const seduta = dati.session != null ? dati.session : dati; // r.6365: `data()?.session || data()`
    const id = seduta && seduta.id != null ? String(seduta.id).trim() : "";
    if (!id) { // r.5581: A scarta i documenti senza id
      senzaId += 1;
      return;
    }
    if (Object.prototype.hasOwnProperty.call(perId, id)) {
      duplicati += 1;
      perId[id] = piuRecente(perId[id], seduta);
      return;
    }
    perId[id] = seduta;
  });
  return {
    sedute: Object.keys(perId).map((id) => perId[id]),
    documenti: documenti.length,
    senzaId,
    duplicati
  };
}

/* Tra due copie dello stesso programma tiene la più aggiornata (updatedAt,
 * poi id). A usa l'ultimo arrivato (Map.set); qui l'esito non dipende
 * dall'ordine dei documenti: stesso dato, stessa scelta. */
function programmaPiuRecente(a, b) {
  const dataA = String((a && a.updatedAt) || "");
  const dataB = String((b && b.updatedAt) || "");
  if (dataA !== dataB) return dataB > dataA ? b : a;
  return confrontaTesto(String((b && b.id) || ""), String((a && a.id) || "")) > 0 ? b : a;
}

/* Lettura una tantum dei PROGRAMMI dalla sottoraccolta `nutritionPhotos`, con
 * due query per intervallo di id: si toccano solo i documenti `program-v1-…` e
 * `program-v2-meta-…`, mai le foto di nutrizione.
 *
 * Copia le regole di A (r.5586-5642), non solo la query:
 *  - `programStorage` vecchio → i programmi stanno in `state.programs` (r.5587),
 *    nessuna query (e quindi nemmeno una lettura in più del necessario);
 *  - filtro `programIds`: un documento il cui programId non è nell'elenco
 *    appartiene a un programma CANCELLATO e va scartato (r.5591, r.5600);
 *    elenco assente o vuoto = nessun filtro, come A;
 *  - deduplica per programId, non per id del documento: il v1 di un programma
 *    già presente in v2 viene scartato (r.5636-5639), perché è la sua copia
 *    vecchia, non un secondo programma.
 *
 * `radice` è l'oggetto tornato da leggiDocumentoAtleta (o almeno
 * { programIds, programCount, programStorage, stato }). Se non viene passato,
 * B legge la sottoraccolta senza filtro: è il comportamento usato dai test
 * che vogliono solo la query.
 *
 * Ritorna { programmi, documenti, scartatiFiltro, v1Doppioni, v2Doppioni, fonte }. */
export async function leggiProgrammi(db, uid, radice) {
  const percorso = "barbellDivaAccounts/" + uid + "/nutritionPhotos";
  if (!percorsoAmmesso(percorso, uid)) throw new ErrorePercorsoNonAmmesso(percorso);
  const info = radice && typeof radice === "object" ? radice : null;

  // r.5587: con un formato vecchio i programmi stanno ancora dentro la radice.
  if (info && !(info.programStorage === "subcollection-v1" || info.programStorage === "subcollection-v2")) {
    const daStato = info.stato && Array.isArray(info.stato.programs) ? info.stato.programs : [];
    return {
      programmi: daStato.filter((p) => p && typeof p === "object"),
      documenti: 0,
      scartatiFiltro: 0,
      v1Doppioni: 0,
      v2Doppioni: 0,
      fonte: "radice"
    };
  }

  // r.5591, r.5600: elenco chiuso dei programId ammessi.
  const ammessi = info && Array.isArray(info.programIds) ? info.programIds.map(String) : null;
  const filtra = ammessi !== null && ammessi.length > 0;

  const collezione = db.collection(COLLEZIONE_ATLETI).doc(uid).collection("nutritionPhotos");
  const metaPerId = Object.create(null); // r.5602: un documento leggero per programma
  const v1PerId = Object.create(null); // r.5601: un documento intero per programma
  const ordineMeta = [];
  const ordineV1 = [];
  const vistiDocumento = Object.create(null);
  let documenti = 0;
  let scartatiFiltro = 0;
  let v2Doppioni = 0;

  for (const intervallo of INTERVALLI_PROGRAMMI) {
    const istantanea = await collezione
      .where("__name__", ">=", intervallo.da)
      .where("__name__", "<", intervallo.a)
      .get();
    (istantanea.docs || []).forEach((d) => {
      const id = String(d.id || "");
      if (vistiDocumento[id]) return; // gli intervalli non si sovrappongono: cintura in più
      vistiDocumento[id] = true;
      documenti += 1;
      const valore = d.data ? d.data() : {};
      // r.5599: lo stesso programId si ricava da tre campi, nell'ordine di A.
      const programId = String(
        valore.programId ||
        (valore.program && valore.program.id) ||
        (valore.programMeta && valore.programMeta.id) ||
        ""
      );
      // r.5600: se c'è l'elenco e il documento ha un id fuori elenco, è un
      // programma cancellato: A lo scarta, B fa lo stesso.
      if (filtra && programId && ammessi.indexOf(programId) === -1) {
        scartatiFiltro += 1;
        return;
      }
      if (valore.program && typeof valore.program === "object") { // r.5601: formato v1
        const chiave = programId || String(valore.program.id || "");
        if (Object.prototype.hasOwnProperty.call(v1PerId, chiave)) {
          v1PerId[chiave] = programmaPiuRecente(v1PerId[chiave], valore.program);
          return;
        }
        v1PerId[chiave] = valore.program;
        ordineV1.push(chiave);
        return;
      }
      if (valore.programMeta && typeof valore.programMeta === "object") { // r.5602: formato v2
        if (Object.prototype.hasOwnProperty.call(metaPerId, programId)) {
          v2Doppioni += 1;
          metaPerId[programId] = programmaPiuRecente(metaPerId[programId], valore.programMeta);
          return;
        }
        metaPerId[programId] = valore.programMeta;
        ordineMeta.push(programId);
      }
    });
  }

  // r.5630-5639: prima i v2, poi i v1 dei soli programmi che in v2 non ci sono.
  const finali = [];
  const giaPresenti = Object.create(null);
  ordineMeta.forEach((chiave) => {
    giaPresenti[chiave] = true;
    finali.push({ chiave, programma: metaPerId[chiave] });
  });
  let v1Doppioni = 0;
  ordineV1.forEach((chiave) => {
    if (giaPresenti[chiave]) {
      v1Doppioni += 1;
      return;
    }
    giaPresenti[chiave] = true;
    finali.push({ chiave, programma: v1PerId[chiave] });
  });
  // Ordine stabile per programId: così la scelta del programma attivo non
  // dipende dall'ordine in cui Firestore restituisce i documenti.
  finali.sort((a, b) => confrontaTesto(a.chiave, b.chiave) || confrontaTesto(String((a.programma && a.programma.id) || ""), String((b.programma && b.programma.id) || "")));

  return {
    programmi: finali.map((f) => f.programma),
    documenti,
    scartatiFiltro,
    v1Doppioni,
    v2Doppioni,
    fonte: "sottoraccolta"
  };
}

/* ---------- Estrattori puri (niente rete, nessun effetto collaterale) ---------- */

function elencoSedute(sedute) {
  return Array.isArray(sedute) ? sedute.filter((s) => s && typeof s === "object") : [];
}

/* Ordinamento fedele a latestAppWorkout di A (r.6894-6898):
 * dataInput decrescente, poi id numerico decrescente. */
function confrontoSedute(a, b) {
  return String(b.dateInput || "").localeCompare(String(a.dateInput || "")) || (Number(b.id) || 0) - (Number(a.id) || 0);
}

/* Ultima seduta registrata — dalla sottoraccolta, non dalla radice. */
export function ultimaSeduta(sedute) {
  const elenco = elencoSedute(sedute);
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

/* Programma attivo, con la regola di A (r.7019-7027):
 *  - esplicito: status "active" oppure active===true, non archiviato (r.7019-7022);
 *  - ripiego (etichettato come tale): il non archiviato con updatedAt più
 *    recente, poi il primo in elenco (r.7023-7027).
 *
 * A lavora sull'elenco che ha appena ricostruito, quindi sull'ordine dei
 * documenti; B non può permetterselo (l'ordine di Firestore non è un dato).
 * Per questo l'elenco viene prima ordinato per id: se due programmi fossero
 * entrambi «active», vince l'id minore, e la scelta resta la stessa a ogni
 * lettura. Con un solo attivo — il caso normale — il risultato è identico ad A. */
export function programmaAttivo(programmi) {
  const elenco = Array.isArray(programmi) ? programmi.filter((p) => p && typeof p === "object") : [];
  const perId = (a, b) => confrontaTesto(String(a.id || ""), String(b.id || ""));
  const ordinati = elenco.slice().sort(perId);
  const disponibili = ordinati.filter((p) => !p.archivedAt && String(p.status || "") !== "archived");
  const esplicito = disponibili.find((p) => String(p.status || "") === "active") || disponibili.find((p) => p.active === true) || null;
  if (esplicito) return { programma: esplicito, esplicito: true, ripiego: false };
  const perAggiornamento = (a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")) || perId(a, b);
  const ripiego = disponibili.slice().sort(perAggiornamento)[0] || ordinati[0] || null;
  return ripiego ? { programma: ripiego, esplicito: false, ripiego: true } : null;
}

/* Settimana corrente secondo A (r.6882-6899), calcolata sulle sedute della
 * sottoraccolta: dalla seduta App più recente il campo `week`, altrimenti il
 * numero in coda al codice scheda; senza sedute App → null («non registrata»). */
export function settimanaCorrente(sedute) {
  const latest = elencoSedute(sedute)
    .filter((s) => s.source === "App" || Number(s.id) > 1000000000)
    .sort(confrontoSedute)[0] || null;
  if (!latest) return null;
  const dalCampo = Number(latest.week);
  if (Number.isFinite(dalCampo) && dalCampo > 0) return dalCampo;
  const dalCodice = Number(String(latest.sessionCode || "").match(/(\d+)$/)?.[1]);
  return Number.isFinite(dalCodice) && dalCodice > 0 ? dalCodice : null;
}

/* Riepilogo pronto per le schermate (modello puro, senza DOM né rete).
 * `presente: false` = documento di A non trovato; i singoli campi assenti
 * valgono null e le schermate mostrano «non registrato».
 *
 * I due controlli confrontano ciò che B ha letto con ciò che A ha DICHIARATO
 * nella radice:
 *  - `controlloSessioni` ↔ `sessionCount` (r.5937);
 *  - `controlloProgrammi` ↔ `programCount` (r.5933). Se la radice dichiara
 *    programmi ma B non ne trova nessuno, è il caso in cui A lancia
 *    «cloud programs missing» (r.5640): la card lo dice, non finge il vuoto. */
export function riepilogoDati(letture) {
  const l = letture || {};
  const stato = l.stato;
  const presente = stato != null && typeof stato === "object";
  const sedute = elencoSedute(l.sedute);
  const programmi = Array.isArray(l.programmi) ? l.programmi.filter((p) => p && typeof p === "object") : [];
  const ultima = ultimaSeduta(sedute);
  const attivo = programmaAttivo(programmi);
  const checkin = presente ? ultimoCheckin(stato) : null;
  const peso = presente ? pesoCorrente(stato) : null;

  const numeroSedute = presente ? sedute.length : null;
  const conteggioRadice = l.sessionCount == null || !Number.isFinite(Number(l.sessionCount)) ? null : Number(l.sessionCount);
  const controlloSessioni = conteggioRadice == null
    ? null
    : { radice: conteggioRadice, sottoraccolta: numeroSedute, coincide: numeroSedute === conteggioRadice };

  const numeroProgrammi = presente ? programmi.length : null;
  const conteggioProgrammi = l.programCount == null || !Number.isFinite(Number(l.programCount)) ? null : Number(l.programCount);
  const controlloProgrammi = conteggioProgrammi == null
    ? null
    : {
        radice: conteggioProgrammi,
        letti: programmi.length,
        coincide: programmi.length === conteggioProgrammi,
        mancanti: conteggioProgrammi > 0 && programmi.length === 0
      };

  return {
    presente,
    numeroSedute,
    numeroDocumentiSedute: l.documentiSedute == null ? null : Number(l.documentiSedute),
    seduteSenzaId: Number(l.seduteSenzaId) || 0,
    seduteDuplicate: Number(l.seduteDuplicate) || 0,
    seduteNonLette: l.seduteNonLette === true,
    programmiNonLetti: l.programmiNonLetti === true,
    sessionCountRadice: conteggioRadice,
    controlloSessioni,
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
          settimana: settimanaCorrente(sedute)
        }
      : null,
    numeroProgrammi,
    documentiProgrammi: l.documentiProgrammi == null ? null : Number(l.documentiProgrammi),
    programmiScartatiFiltro: Number(l.programmiScartatiFiltro) || 0,
    programmiV1Doppioni: Number(l.programmiV1Doppioni) || 0,
    programmiFonte: l.programmiFonte || null,
    programCountRadice: conteggioProgrammi,
    controlloProgrammi
  };
}
