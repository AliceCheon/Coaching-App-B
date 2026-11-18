/* Barbell Diva B — il ponte fra la tabella e la zona B (passo 9).
 *
 * Qui vivono le due cose che la vista non puo' fare da sola:
 *  - la mappa id scheda -> documento di B (l'id e' quello che legge Programma
 *    attivo; la lettera del box non si usa, perche' in B si ripete fra scheda
 *    attiva e scheda archiviata: se un id cade su due documenti non si
 *    sceglie, si rifiuta);
 *  - la coda delle scritture: una modifica alla volta per scheda.
 *
 * Tutte le scritture passano da comune/scritture-b.js: qui non c'e' un solo
 * verbo di scrittura Firestore.
 */

import {
  leggiSchedaB,
  salvaSchedaConVersione,
  scriviVoceRegistro,
  leggiZonaB,
  leggiProgrammaB,
  salvaProgrammaConVersione
} from "./scritture-b.js";
import {
  cambiaSerieRipetizioni,
  cambiaRecTempo,
  idVoceRegistro,
  annullaModifica,
  ultimaAnnullabile,
  versioneDi,
  codiceScheda,
  misuraPeso,
  creaCoda,
  applicaProgressione,
  applicaProgressioneScheda,
  cancellaEsercizio,
  sostituisciEsercizio,
  cambiaSuperserie,
  aggiungiEsercizio,
  aggiungiTecnica,
  scriviTecnica,
  rimuoviTecnica,
  cambiaPianoScheda,
  cambiaTestataProgramma

, copiaEsercizi as applicaCopiaEsercizi, rimettiElencoEsercizi } from "./modifiche-b.js";
import { contaScheda, svuotaScheda, ripristinaScheda, svuotaProgramma } from "./igiene-scheda.js";
import { salvaScheletroDaScheda } from "./scheletri.js";
import { pianificaAttivazione, pianificaBozza, pianificaRipristino, TIPO_VOCE_ATTIVA, TIPO_VOCE_BOZZA } from "./attiva-programma.js";

/* codice scheda -> id del documento in B. Se lo stesso codice compare su due
 * documenti non si sceglie a caso: quel codice resta fuori dalla mappa e la
 * modifica si rifiuta con un messaggio. */
export function mappaCodici(documenti) {
  const perCodice = Object.create(null);
  const doppi = Object.create(null);
  (Array.isArray(documenti) ? documenti : []).forEach((d) => {
    if (!d || !d.id) return;
    const codici = [codiceScheda(d.dati)];
    if (d.dati && d.dati.sheetId) codici.push(String(d.dati.sheetId));
    codici.forEach((c) => {
      const k = String(c || "").trim();
      if (!k) return;
      if (perCodice[k] && perCodice[k] !== d.id) { doppi[k] = true; return; }
      perCodice[k] = d.id;
    });
  });
  Object.keys(doppi).forEach((k) => { delete perCodice[k]; });
  return perCodice;
}

/* L'id della scheda -> l'id del documento nella zona B.
 * L'id della scheda e' lo stesso che legge Programma attivo: il campo `id`
 * della scheda ricostruita, che viene da `dati.sheetId` oppure da `sheet.id`.
 * Restano fuori le schede archiviate e i documenti degli esercizi sciolti.
 * La lettera non e' una chiave: in B la stessa lettera compare sia sulla
 * scheda attiva sia su quella archiviata, ed e' il caso che faceva dire
 * «scheda non riconosciuta in B» (8/11/2026).
 * Ritorna { perId, doppi }: se un id cade su due documenti non si sceglie a
 * caso, si segna fra i doppi e la modifica si rifiuta.
 */
export function mappaSchede(documenti) {
  const perId = Object.create(null);
  const doppi = Object.create(null);
  (Array.isArray(documenti) ? documenti : []).forEach((d) => {
    if (!d || !d.id) return;
    const dati = d.dati || {};
    const idDocumento = String(d.id);
    if (dati.kind === "archived") return;
    if (idDocumento.indexOf("program-v2-archived-") === 0) return;
    const foglio = dati.sheet;
    if (!foglio || typeof foglio !== "object") return;
    [dati.sheetId, foglio.id].forEach((grezza) => {
      const k = String(grezza == null ? "" : grezza).trim();
      if (!k) return;
      if (perId[k] && perId[k] !== idDocumento) { doppi[k] = true; return; }
      perId[k] = idDocumento;
    });
  });
  Object.keys(doppi).forEach((k) => { delete perId[k]; });
  return { perId: perId, doppi: doppi };
}

export function creaEditorSchede(opzioni) {
  const o = opzioni || {};
  const db = o.db;
  const uid = o.uid;
  const coda = creaCoda();
  const SCADENZA_MS = Number(o.scadenzaVoceMs) || 8000;
  const versioni = Object.create(null);
  const documenti = Array.isArray(o.documenti) ? o.documenti : [];
  /* B.21 — la fotografia di APERTURA: la prende app-v31 alla prima lettura
   * della sessione e non la rinfresca più. Qui si legge soltanto. */
  const apertura = o.fotografiaApertura && typeof o.fotografiaApertura === "object" ? o.fotografiaApertura : Object.create(null);
  const mappe = mappaSchede(documenti);
  const perIdScheda = mappe.perId;
  const doppiScheda = mappe.doppi;
  documenti.forEach((d) => { if (d && d.id) versioni[d.id] = versioneDi(d.dati); });
  let ultima = o.ultimaVoce || null;
  let contatore = 0;
  const adesso = typeof o.orologio === "function"
    ? o.orologio
    : () => new Date().toISOString();

  function quando() {
    contatore += 1;
    const t = adesso(contatore);
    const base = t ? String(t) : new Date().toISOString();
    /* Due modifiche nello stesso istante non si sfacciano piu' la voce nel
     * registro: l'id porta anche il numero d'ordine. */
    return base + "-" + String(contatore).padStart(4, "0");
  }

  /* La scrittura che non torna: Firestore fermo (rete giu', token scaduto)
   * non risponde e la promessa non si risolve piu'. Qui la attendo al massimo
   * 8 secondi: se non torna e' fallita, e lo dico invece di restare zitti. */
  function conScadenza(promessa, cosa) {
    let scaduto = null;
    const orologio = new Promise((_, nega) => {
      scaduto = setTimeout(() => nega(new Error(cosa + ": nessuna risposta in " + SCADENZA_MS + " ms")), SCADENZA_MS);
    });
    return Promise.race([promessa, orologio]).then(
      (v) => { clearTimeout(scaduto); return v; },
      (e) => { clearTimeout(scaduto); throw e; }
    );
  }

  /* La voce del registro si scrive e si riprova una volta: se proprio non
   * passa, il salvataggio resta valido ma l'avviso torna a chi disegna. */
  async function scriviVoceSicura(voce) {
    try {
      await conScadenza(scriviVoceRegistro(db, uid, voce.idVoce, voce), "la voce di registro");
      return null;
    } catch (primo) {
      try {
        await conScadenza(scriviVoceRegistro(db, uid, voce.idVoce, voce), "la voce di registro");
        return null;
      } catch (secondo) {
        return secondo && secondo.message ? secondo.message : "la voce di registro non e' scritta";
      }
    }
  }

  /* id della scheda -> id del documento. Il legame e' per id, non per lettera. */
  function documentoScheda(idScheda) {
    const k = String(idScheda == null ? "" : idScheda).trim();
    return k ? (perIdScheda[k] || "") : "";
  }

  /* Il rifiuto dice sempre QUALE id si e' cercato: senza, non si capisce
   * niente e si finisce a indovinare. */
  function schedaNonTrovata(idScheda) {
    const k = String(idScheda == null ? "" : idScheda).trim();
    if (!k) return "la tabella non ha passato nessun id di scheda: non ho scritto niente";
    if (doppiScheda[k]) {
      return "scheda non riconosciuta in B: l'id " + k + " compare su piu' documenti e non scelgo a caso: non ho scritto niente";
    }
    return "scheda non riconosciuta in B: cercavo l'id " + k + " fra " + documenti.length
      + " documenti di schede e non c'e': non ho scritto niente";
  }

  /* Una modifica: si rilegge la scheda, si controlla la versione, si scrive, si
   * lascia la voce nel registro. Tutto dentro la coda della scheda. */
  function modifica(richiesta) {
    const r = richiesta || {};
    const idScheda = documentoScheda(r.idScheda);
    if (!idScheda) {
      return Promise.resolve({ ok: false, motivo: schedaNonTrovata(r.idScheda) });
    }
    return coda.esegui(idScheda, async () => {
      const letto = await leggiSchedaB(db, uid, idScheda);
      if (!letto || !letto.esiste) {
        return { ok: false, motivo: "la scheda non e' ancora in B: fai prima la copia" };
      }
      const attesa = versioni[idScheda] == null ? versioneDi(letto.dati) : versioni[idScheda];
      const peso = misuraPeso(o.fotografia, [{ dati: letto.dati }]);
      if (!peso.sotto) return { ok: false, motivo: peso.avviso };

      /* serie e ripetizioni stanno sulla settimana, recupero e TUT
       * sull'esercizio: la tabella dice il campo, qui si sceglie la strada. */
      const campo = String(r.campo == null ? "" : r.campo);
      /* B.21 commit 2 — lo scheletro non tocca la scheda: legge la struttura e
       * scrive nella sua raccolta. Nessuna voce nel registro, nessun Annulla. */
      if (campo === "salva-scheletro") {
        const sk = await salvaScheletroDaScheda(letto.dati, r, { db: db, uid: uid, quando: quando() });
        if (!sk.ok) return { ok: false, motivo: sk.messaggio };
        return { ok: true, testo: sk.messaggio, scheletro: sk.id, nome: sk.nome };
      }
      let esito = null;
      if (campo === "serie" || campo === "ripetizioni") {
        esito = cambiaSerieRipetizioni(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "recupero" || campo === "tempo") {
        esito = cambiaRecTempo(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "progressione") {
        esito = applicaProgressione(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "progressione-scheda") {
        esito = applicaProgressioneScheda(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "aggiunta-riga") {
        esito = aggiungiEsercizio(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "aggiunta-tecnica") {
        esito = aggiungiTecnica(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "rimozione-tecnica") {
        esito = rimuoviTecnica(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "tecnica-cambia" || campo === "tecnica-parametri" || campo === "tecnica-settimana" || campo === "tecnica-nota") {
        const richiestaTecnica = Object.assign({}, r, { sottocampo: campo === "tecnica-cambia" ? "cambia" : (campo === "tecnica-parametri" ? "parametri" : (campo === "tecnica-settimana" ? "settimana" : "nota")) });
        esito = scriviTecnica(letto.dati, richiestaTecnica, { quando: quando(), uid: uid });
      } else if (campo === "riga") {
        esito = cancellaEsercizio(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "sostituzione-riga") {
        esito = sostituisciEsercizio(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "scarico" || campo === "test") {
        /* PASSO 4a: il piano della scheda (settimana di scarico e
         * percentuale, settimana di test). La percentuale e' un'annotazione. */
        esito = cambiaPianoScheda(letto.dati, r, { quando: quando(), uid: uid });

      } else if (campo === "superserie") {
        esito = cambiaSuperserie(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "svuota-scheda") {
        esito = svuotaScheda(letto.dati, r, { quando: quando(), uid: uid });
      } else if (campo === "ripristina-scheda") {
        const foto = apertura[idScheda] && Array.isArray(apertura[idScheda].elenco) ? apertura[idScheda].elenco : null;
        esito = ripristinaScheda(letto.dati, Object.assign({}, r, { fotografia: foto }), { quando: quando(), uid: uid });
      } else {
        return { ok: false, motivo: "campo non riconosciuto: non ho scritto niente" };
      }
      if (!esito.ok) return esito;

      if (versioneDi(letto.dati) !== attesa) {
        return {
          ok: false,
          motivo: "la scheda e' cambiata nel frattempo (versione " + versioneDi(letto.dati) +
            " invece di " + attesa + "): non ho scritto niente"
        };
      }
      try {
        await conScadenza(salvaSchedaConVersione(db, uid, idScheda, esito.dati, attesa), "la scrittura della scheda");
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      const avvisoVoce = await scriviVoceSicura(esito.voce);
      versioni[idScheda] = versioneDi(esito.dati);
      ultima = esito.voce;
      return {
        ok: true,
        voce: esito.voce,
        versione: versioni[idScheda],
        peso: { radice: peso.radice, scheda: peso.scheda },
        avvisoRegistro: avvisoVoce
      };
    });
  }

  /* L'annulla del v31: rilegge l'ultima voce del registro, rimette il valore di
   * prima e aggiunge una voce nuova. Non cancella niente. */
  function annulla() {
    return coda.esegui("registro", async () => {
      const registro = await conScadenza(leggiZonaB(db, uid, "registro"), "la lettura del registro");
      const voce = ultimaAnnullabile(registro);
      if (!voce) {
        ultima = null;
        return { ok: false, motivo: "non c'e' nessuna modifica da annullare" };
      }
      /* B.21 PASSO 2a — l'attivazione di un programma si annulla come una
       * modifica di scheda: la voce porta i valori di prima di ogni documento. */
      if ([TIPO_VOCE_ATTIVA, TIPO_VOCE_BOZZA].indexOf(String(voce.tipo || "")) !== -1) return annullaAttivazione(voce);
      /* B.21 — una voce che tocca più schede (svuota il programma): si
       * rimettono tutte, e il registro prende una voce sola anche qui. */
      if (Array.isArray(voce.schede) && voce.schede.length) return annullaPiuSchede(voce);
      /* PASSO 4a — la testata del programma si annulla sul documento del
       * programma, non su una scheda. */
      /* PASSO 4b — la copia (o lo spostamento) tocca due documenti: si
       * rimettono tutti e due con una voce sola. */
      if (String(voce.tipo || "") === "copia-esercizi" || String(voce.tipo || "") === "sposta-esercizi") {
        return annullaCopia(voce);
      }
      if (String(voce.tipo || "") === "testata-programma") {
        const idDoc = String(voce.programma || "");
        if (!idDoc) return { ok: false, motivo: "la voce del registro non dice quale programma rimettere" };
        const lettoP = await conScadenza(leggiProgrammaB(db, uid, idDoc), "la lettura del programma");
        if (!lettoP || !lettoP.esiste) return { ok: false, motivo: "il programma non e' piu' in B" };
        const esitoP = annullaModifica(lettoP.dati, voce, { quando: quando(), uid: uid });
        if (!esitoP.ok) return { ok: false, motivo: esitoP.motivo };
        try {
          await conScadenza(salvaProgrammaConVersione(db, uid, idDoc, esitoP.dati, Number(lettoP.dati.versione) || 0), "la scrittura del programma");
        } catch (e) {
          return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
        }
        const avvisoP = await scriviVoceSicura(esitoP.voce);
        ultima = ultimaAnnullabile(registro.concat([{ id: esitoP.voce.idVoce, dati: esitoP.voce }]));
        return { ok: true, voce: esitoP.voce, avvisoRegistro: avvisoP };
      }

      const idScheda = documentoScheda(voce.scheda);
      if (!idScheda) {
        return { ok: false, motivo: "la voce del registro non porta a una scheda di B · " + schedaNonTrovata(voce.scheda) };
      }
      const letto = await leggiSchedaB(db, uid, idScheda);
      if (!letto || !letto.esiste) return { ok: false, motivo: "la scheda non e' piu' in B" };

      const esito = annullaModifica(letto.dati, voce, { quando: quando(), uid: uid });
      if (!esito.ok) return { ok: false, motivo: esito.motivo };
      try {
        await conScadenza(salvaSchedaConVersione(db, uid, idScheda, esito.dati, versioneDi(letto.dati)), "la scrittura della scheda");
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      const avvisoVoce = await scriviVoceSicura(esito.voce);
      versioni[idScheda] = versioneDi(esito.dati);
      ultima = ultimaAnnullabile(registro.concat([{ id: esito.voce.idVoce, dati: esito.voce }]));
      return { ok: true, voce: esito.voce, avvisoRegistro: avvisoVoce };
    });
  }

  /* PASSO 4a — la testata del programma: data di inizio e fase. Non e' una
   * scheda: si legge e si scrive il documento del programma, con la stessa
   * regola di versione e la stessa voce di registro delle schede. */
  function testataProgramma(richiesta) {
    const r = richiesta || {};
    const idProgramma = String(r.idProgramma == null ? "" : r.idProgramma).trim();
    if (!idProgramma) return Promise.resolve({ ok: false, motivo: "la pagina non ha passato il programma: non ho scritto niente" });
    return coda.esegui("programma", async () => {
      const letto = await conScadenza(leggiProgrammaB(db, uid, idProgramma), "la lettura del programma");
      if (!letto || !letto.esiste) return { ok: false, motivo: "il programma non e' ancora in B: fai prima la copia" };
      const esito = cambiaTestataProgramma(letto.dati, r, { quando: quando(), uid: uid });
      if (!esito.ok) return esito;
      try {
        await conScadenza(salvaProgrammaConVersione(db, uid, idProgramma, esito.dati, Number(letto.dati.versione) || 0), "la scrittura del programma");
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      const avvisoVoce = await scriviVoceSicura(esito.voce);
      ultima = esito.voce;
      return { ok: true, voce: esito.voce, avvisoRegistro: avvisoVoce };
    });
  }

  /* Il ripristino mirato (passo 23): riporta i valori di prima della voce
   * DETTA, non dell'ultima. La voce nuova porta annullaDi, la storia resta
   * intera e niente si cancella. */
  function annullaVoce(idVoceCercato) {
    return coda.esegui("registro", async () => {
      const registro = await conScadenza(leggiZonaB(db, uid, "registro"), "la lettura del registro");
      const cercata = String(idVoceCercato == null ? "" : idVoceCercato);
      const voce = (Array.isArray(registro) ? registro : [])
        .filter((d) => d && d.dati && String((d.dati && d.dati.idVoce) || d.id || "") === cercata)
        .map((d) => Object.assign({}, d.dati, { idVoce: String(d.dati.idVoce || d.id || "") }))[0] || null;
      if (!voce) return { ok: false, motivo: "nel registro non c'e' la voce " + cercata + ": non ho scritto niente" };
      const giaRifatta = (Array.isArray(registro) ? registro : [])
        .some((d) => d && d.dati && String(d.dati.annullaDi || "") === cercata);
      if (giaRifatta) return { ok: false, motivo: "la voce " + cercata + " e' gia' stata annullata: non ho scritto niente" };
      const idScheda = documentoScheda(voce.scheda);
      if (!idScheda) return { ok: false, motivo: "la voce del registro non porta a una scheda di B · " + schedaNonTrovata(voce.scheda) };
      const letto = await leggiSchedaB(db, uid, idScheda);
      if (!letto || !letto.esiste) return { ok: false, motivo: "la scheda non e' piu' in B" };
      const esito = annullaModifica(letto.dati, voce, { quando: quando(), uid: uid });
      if (!esito.ok) return { ok: false, motivo: esito.motivo };
      try {
        await conScadenza(salvaSchedaConVersione(db, uid, idScheda, esito.dati, versioneDi(letto.dati)), "la scrittura della scheda");
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      const avvisoVoce = await scriviVoceSicura(esito.voce);
      versioni[idScheda] = versioneDi(esito.dati);
      ultima = ultimaAnnullabile(registro.concat([{ id: esito.voce.idVoce, dati: esito.voce }]));
      return { ok: true, voce: esito.voce, avvisoRegistro: avvisoVoce };
    });
  }


  /* PASSO 4b — copia (o sposta) esercizi fra due schede dello stesso
   * programma. Tocca due documenti: prima la destinazione, poi la partenza
   * (solo per lo sposta). Una sola voce di registro per tutta l'operazione,
   * e un solo Annulla che rimette tutti e due i lati. */
  function copiaEsercizi(richiesta) {
    const r = richiesta || {};
    const idPart = String(r.idSchedaPartenza == null ? "" : r.idSchedaPartenza).trim();
    const idDest = String(r.idSchedaDestinazione == null ? "" : r.idSchedaDestinazione).trim();
    if (!idPart || !idDest) return Promise.resolve({ ok: false, motivo: "la pagina non ha passato le due schede: non ho scritto niente" });
    if (idPart === idDest) return Promise.resolve({ ok: false, motivo: "la scheda di partenza e quella di destinazione sono la stessa: scegline un'altra" });
    const docPart = documentoScheda(idPart);
    const docDest = documentoScheda(idDest);
    if (!docPart) return Promise.resolve({ ok: false, motivo: "scheda di partenza non trovata in B · " + schedaNonTrovata(idPart) });
    if (!docDest) return Promise.resolve({ ok: false, motivo: "scheda di destinazione non trovata in B · " + schedaNonTrovata(idDest) });
    return coda.esegui("programma", async () => {
      const lettoP = await conScadenza(leggiSchedaB(db, uid, docPart), "la lettura della scheda di partenza");
      if (!lettoP || !lettoP.esiste) return { ok: false, motivo: "la scheda di partenza non e' ancora in B: fai prima la copia" };
      const lettoD = await conScadenza(leggiSchedaB(db, uid, docDest), "la lettura della scheda di destinazione");
      if (!lettoD || !lettoD.esiste) return { ok: false, motivo: "la scheda di destinazione non e' ancora in B: fai prima la copia" };
      const esito = applicaCopiaEsercizi(lettoP.dati, lettoD.dati, Object.assign({}, r, {
        idSchedaPartenza: idPart,
        idSchedaDestinazione: idDest,
        documentoPartenza: docPart,
        documentoDestinazione: docDest
      }), { quando: quando(), uid: uid });
      if (!esito.ok) return esito;

      /* Prima la destinazione: se questa non passa, in partenza non e' stato
       * tolto niente e la copia non esiste. */
      try {
        await conScadenza(salvaSchedaConVersione(db, uid, docDest, esito.datiDestinazione, versioneDi(lettoD.dati)), "la scrittura della scheda di destinazione");
      } catch (e) {
        return { ok: false, motivo: (e && e.message ? e.message : "scrittura non riuscita") + " · non ho toccato la scheda di partenza" };
      }
      versioni[docDest] = versioneDi(esito.datiDestinazione);

      /* Poi la partenza, solo per lo sposta. Se questa non passa la copia
       * resta buona, e lo dico con parole che non si possono leggere male. */
      if (esito.datiPartenza !== lettoP.dati) {
        try {
          await conScadenza(salvaSchedaConVersione(db, uid, docPart, esito.datiPartenza, versioneDi(lettoP.dati)), "la scrittura della scheda di partenza");
        } catch (e) {
          await scriviVoceSicura(esito.voce);
          ultima = esito.voce;
          return { ok: false, copiaResta: true, testo: esito.testo, motivo: "esercizi copiati ma non tolti dalla scheda di partenza" };
        }
        versioni[docPart] = versioneDi(esito.datiPartenza);
      }

      const avvisoVoce = await scriviVoceSicura(esito.voce);
      ultima = esito.voce;
      return {
        ok: true,
        testo: esito.testo,
        conto: esito.conto,
        voce: esito.voce,
        gruppiTagliati: esito.gruppiTagliati,
        avvisoRegistro: avvisoVoce
      };
    });
  }

  /* L'Annulla che tocca due documenti: rimette l'elenco di prima dove la
   * voce lo porta. Se una delle due meta' non passa lo dice, e la voce nuova
   * racconta quante ne sono state rimesse. */
  async function annullaCopia(voce) {
    const quandoOra = quando();
    const documentiVoce = voce && voce.prima && Array.isArray(voce.prima.documenti) ? voce.prima.documenti : [];
    if (!documentiVoce.length) return { ok: false, motivo: "la voce del registro non porta le schede da rimettere: non ho scritto niente" };
    const rimessi = [];
    const falliti = [];
    for (let i = 0; i < documentiVoce.length; i += 1) {
      const d = documentiVoce[i];
      const idDoc = String((d && d.documento) || "");
      const letto = await leggiSchedaB(db, uid, idDoc);
      if (!letto || !letto.esiste) { falliti.push(idDoc); continue; }
      const esito = rimettiElencoEsercizi(letto.dati, d.esercizi, quandoOra, uid, "esercizi rimessi com'erano");
      if (!esito.ok) { falliti.push(idDoc); continue; }
      try {
        await conScadenza(salvaSchedaConVersione(db, uid, idDoc, esito.dati, versioneDi(letto.dati)), "la scrittura della scheda");
      } catch (e) {
        falliti.push(idDoc);
        continue;
      }
      versioni[idDoc] = versioneDi(esito.dati);
      rimessi.push(idDoc);
    }
    if (!rimessi.length) return { ok: false, motivo: "non sono riuscito a rimettere nessuna delle schede toccate: non ho scritto la voce del registro" };
    const testoEsito = falliti.length
      ? "esercizi rimessi in " + rimessi.length + " schede su " + documentiVoce.length + ": " + falliti.length + " non si sono potute rimettere"
      : "esercizi rimessi com'erano";
    const voceNuova = {
      idVoce: idVoceRegistro(quandoOra),
      quando: quandoOra,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(voce.idVoce || ""),
      scheda: "",
      codice: "",
      esercizio: "",
      idEsercizio: "",
      settimana: null,
      campo: "copia-esercizi",
      prima: null,
      dopo: null,
      dopoTesto: testoEsito
    };
    const voceBuona = voceNuova;
    const avvisoVoce = await scriviVoceSicura(voceBuona);
    ultima = voceBuona;
    return { ok: true, voce: voceBuona, quante: rimessi.length, falliti: falliti, testo: testoEsito, avvisoRegistro: avvisoVoce };
  }

  /* Il conto che si legge nella conferma. Senza id: tutto il programma. */
  function conta(idScheda) {
    const k = String(idScheda == null ? "" : idScheda).trim();
    if (k) {
      const idDoc = documentoScheda(k);
      const d = documenti.filter((x) => x && String(x.id || "") === idDoc)[0] || null;
      return contaScheda(d ? d.dati : null, apertura[idDoc] || null);
    }
    const tot = { codice: "", schede: 0, esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 };
    documenti.forEach((x) => {
      const c = contaScheda(x && x.dati, apertura[String((x && x.id) || "")] || null);
      if (!c.righe) return;
      tot.schede += 1;
      tot.esercizi += c.esercizi;
      tot.tecniche += c.tecniche;
      tot.righe += c.righe;
      tot.modifiche += c.modifiche;
    });
    return tot;
  }

  /* «Svuota tutto il programma»: una voce sola per tutte le schede. Se una
   * scrittura si ferma a metà lo dice e non scrive la voce: le schede già
   * svuotate restano senza annulla, e questo si dichiara invece di tacere. */
  function svuotaProgrammaIntero() {
    return coda.esegui("registro", async () => {
      const quandoOra = quando();
      const letti = [];
      for (let i = 0; i < documenti.length; i += 1) {
        const id = String((documenti[i] && documenti[i].id) || "");
        if (!id) continue;
        const letto = await leggiSchedaB(db, uid, id);
        if (letto && letto.esiste) letti.push({ id: id, dati: letto.dati });
      }
      const esito = svuotaProgramma(letti, {}, { quando: quandoOra, uid: uid });
      if (!esito.ok) return esito;
      const scritte = [];
      for (let i = 0; i < esito.schede.length; i += 1) {
        const t = esito.schede[i];
        try {
          await conScadenza(salvaSchedaConVersione(db, uid, t.documento, t.dati, t.versionePrima), "la scrittura della scheda");
        } catch (e) {
          return { ok: false, motivo: (e && e.message ? e.message : "scrittura non riuscita") + " · fermato dopo " + scritte.length + " schede su " + esito.schede.length + ": la voce di registro non e' scritta" };
        }
        versioni[t.documento] = versioneDi(t.dati);
        scritte.push(t.documento);
      }
      const avvisoVoce = await scriviVoceSicura(esito.voce);
      ultima = esito.voce;
      return { ok: true, voce: esito.voce, quanto: esito.quanto, avvisoRegistro: avvisoVoce };
    });
  }

  /* L'annulla di una voce che tocca più schede. */
  async function annullaPiuSchede(voce) {
    const quandoOra = quando();
    const scritte = [];
    for (let i = 0; i < voce.schede.length; i += 1) {
      const s = voce.schede[i];
      const letto = await leggiSchedaB(db, uid, s.documento);
      if (!letto || !letto.esiste) continue;
      const esito = annullaModifica(letto.dati, { tipo: "svuota-programma", prima: s.prima, idVoce: voce.idVoce, scheda: s.scheda, campo: "scheda" }, { quando: quandoOra, uid: uid });
      if (!esito.ok) continue;
      try {
        await conScadenza(salvaSchedaConVersione(db, uid, s.documento, esito.dati, versioneDi(letto.dati)), "la scrittura della scheda");
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      versioni[s.documento] = versioneDi(esito.dati);
      scritte.push(s.documento);
    }
    if (!scritte.length) return { ok: false, motivo: "non c'e' nessuna scheda da rimettere com'era" };
    const voceNuova = {
      idVoce: idVoceRegistro(quandoOra),
      quando: quandoOra,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(voce.idVoce || ""),
      scheda: "",
      codice: "",
      esercizio: "",
      idEsercizio: "",
      settimana: null,
      campo: "programma",
      prima: null,
      dopo: null,
      dopoTesto: "programma rimesso com'era"
    };
    const avvisoVoce = await scriviVoceSicura(voceNuova);
    ultima = voceNuova;
    return { ok: true, voce: voceNuova, quante: scritte.length, avvisoRegistro: avvisoVoce };
  }

  /* B.21 PASSO 2a — «Attiva»: il programma scelto diventa attivo in B e
   * l'altro attivo smette di esserlo. Si scrive SOLO in bdB_atleti: il
   * telefono di oggi legge A, e la conferma in pagina lo dichiara. La
   * scrittura del prescelto e' l'ultima (vedi pianificaAttivazione): se
   * qualcosa si ferma prima, non restano due attivi. */
  function attivaProgramma(idProgramma) {
    return coda.esegui("programma", async () => {
      const letti = await conScadenza(leggiZonaB(db, uid, "programmi"), "la lettura dei programmi");
      const elenco = (Array.isArray(letti) ? letti : []).map((d) => Object.assign({}, d.dati || {}, { id: String(d.id), idInterno: String((d.dati && d.dati.programMeta && d.dati.programMeta.id) || (d.dati && d.dati.program && d.dati.program.id) || "") }));
      const piano = pianificaAttivazione(elenco, idProgramma, { quando: quando() });
      if (!piano.ok) return piano;
      if (piano.gia) return { ok: true, gia: true, testo: piano.testo, nome: piano.nome };
      const scritti = [];
      for (let i = 0; i < piano.daScrivere.length; i += 1) {
        const t = piano.daScrivere[i];
        const letto = await conScadenza(leggiProgrammaB(db, uid, t.id), "la lettura del programma");
        if (!letto || !letto.esiste) {
          return { ok: false, motivo: "il programma " + t.id + " non e' piu' in B: non ho scritto niente oltre a " + scritti.length + " programmi" };
        }
        try {
          await conScadenza(salvaProgrammaConVersione(db, uid, t.id, t.dati, Number(letto.dati.versione) || 0), "la scrittura del programma");
        } catch (e) {
          return { ok: false, motivo: (e && e.message ? e.message : "scrittura non riuscita") + " · fermato dopo " + scritti.length + " programmi: la voce di registro non e' scritta" };
        }
        scritti.push(t.id);
      }
      const avvisoVoce = await scriviVoceSicura(piano.voce);
      ultima = piano.voce;
      return { ok: true, gia: false, nome: piano.nome, altri: piano.altri, voce: piano.voce, avvisoRegistro: avvisoVoce, testo: piano.testo };
    });
  }

  /* B.21 PASSO 2c \u2014 \u00abMetti in bozza\u00bb: il programma attivo diventa una bozza
   * in B, e nessun altro programma viene toccato. Stessa forma di
   * `attivaProgramma`: una scrittura, una voce di registro, l'Annulla che
   * rimette status/active/updatedAt di prima (vedi annullaAttivazione).
   */
  function mettiInBozza(idProgramma) {
    return coda.esegui("programma", async () => {
      const letti = await conScadenza(leggiZonaB(db, uid, "programmi"), "la lettura dei programmi");
      const elenco = (Array.isArray(letti) ? letti : []).map((d) => Object.assign({}, d.dati || {}, { id: String(d.id), idInterno: String((d.dati && d.dati.programMeta && d.dati.programMeta.id) || (d.dati && d.dati.program && d.dati.program.id) || "") }));
      const piano = pianificaBozza(elenco, idProgramma, { quando: quando() });
      if (!piano.ok) return piano;
      if (piano.gia) return { ok: true, gia: true, testo: piano.testo, nome: piano.nome };
      const scritti = [];
      for (let i = 0; i < piano.daScrivere.length; i += 1) {
        const t = piano.daScrivere[i];
        const letto = await conScadenza(leggiProgrammaB(db, uid, t.id), "la lettura del programma");
        if (!letto || !letto.esiste) {
          return { ok: false, motivo: "il programma " + t.id + " non e' piu' in B: non ho scritto niente" };
        }
        try {
          await conScadenza(salvaProgrammaConVersione(db, uid, t.id, t.dati, Number(letto.dati.versione) || 0), "la scrittura del programma");
        } catch (e) {
          return { ok: false, motivo: (e && e.message ? e.message : "scrittura non riuscita") + " \u00b7 fermato dopo " + scritti.length + " programmi: la voce di registro non e' scritta" };
        }
        scritti.push(t.id);
      }
      const avvisoVoce = await scriviVoceSicura(piano.voce);
      ultima = piano.voce;
      return { ok: true, gia: false, nome: piano.nome, voce: piano.voce, avvisoRegistro: avvisoVoce, testo: piano.testo };
    });
  }

  /* L'annulla dell'attivazione: si rimettono i programmi come stavano, e la
   * storia prende una voce nuova (niente si cancella). */
  async function annullaAttivazione(voce) {
    const quandoOra = quando();
    const letti = await conScadenza(leggiZonaB(db, uid, "programmi"), "la lettura dei programmi");
    const elenco = (Array.isArray(letti) ? letti : []).map((d) => Object.assign({}, d.dati || {}, { id: String(d.id), idInterno: String((d.dati && d.dati.programMeta && d.dati.programMeta.id) || (d.dati && d.dati.program && d.dati.program.id) || "") }));
    const piano = pianificaRipristino(voce, elenco);
    if (!piano.ok) return { ok: false, motivo: "i programmi da rimettere non sono piu' in B: non ho scritto niente" };
    const scritti = [];
    for (let i = 0; i < piano.daScrivere.length; i += 1) {
      const t = piano.daScrivere[i];
      const letto = await conScadenza(leggiProgrammaB(db, uid, t.id), "la lettura del programma");
      if (!letto || !letto.esiste) continue;
      try {
        await conScadenza(salvaProgrammaConVersione(db, uid, t.id, t.dati, Number(letto.dati.versione) || 0), "la scrittura del programma");
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      scritti.push(t.id);
    }
    if (!scritti.length) return { ok: false, motivo: "non c'e' nessun programma da rimettere com'era" };
    const voceNuova = {
      idVoce: idVoceRegistro(quandoOra),
      quando: quandoOra,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(voce.idVoce || ""),
      scheda: "",
      codice: "",
      esercizio: "",
      idEsercizio: "",
      settimana: null,
      campo: "programma",
      prima: null,
      dopo: null,
      dopoTesto: String(voce.tipo || "") === TIPO_VOCE_BOZZA ? "programma in bozza rimesso com'era" : "programma attivo rimesso com'era"
    };
    const avvisoVoce = await scriviVoceSicura(voceNuova);
    ultima = voceNuova;
    return { ok: true, voce: voceNuova, quante: scritti.length, avvisoRegistro: avvisoVoce };
  }

  return {
    attivo: true,
    conta: conta,
    svuotaProgramma: svuotaProgrammaIntero,
    attivaProgramma: attivaProgramma,
    mettiInBozza: mettiInBozza,
    get annullabile() { return Boolean(ultima); },
    get ultima() { return ultima; },
    modifica: modifica,
    testataProgramma: testataProgramma,
    copiaEsercizi: copiaEsercizi,
    annulla: annulla,
    annullaVoce: annullaVoce
  };
}
