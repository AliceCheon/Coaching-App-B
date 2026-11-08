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
  leggiZonaB
} from "./scritture-b.js";
import {
  cambiaSerieRipetizioni,
  cambiaRecTempo,
  annullaModifica,
  ultimaAnnullabile,
  versioneDi,
  codiceScheda,
  misuraPeso,
  creaCoda
} from "./modifiche-b.js";

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
  const versioni = Object.create(null);
  const documenti = Array.isArray(o.documenti) ? o.documenti : [];
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
    return t ? String(t) : new Date().toISOString();
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
      const aSettimana = campo === "serie" || campo === "ripetizioni";
      const aEsercizio = campo === "recupero" || campo === "tempo";
      if (!aSettimana && !aEsercizio) {
        return { ok: false, motivo: "in questo passo si toccano solo serie, ripetizioni, recupero e TUT" };
      }
      const esito = (aSettimana ? cambiaSerieRipetizioni : cambiaRecTempo)(letto.dati, r, { quando: quando(), uid: uid });
      if (!esito.ok) return esito;

      if (versioneDi(letto.dati) !== attesa) {
        return {
          ok: false,
          motivo: "la scheda e' cambiata nel frattempo (versione " + versioneDi(letto.dati) +
            " invece di " + attesa + "): non ho scritto niente"
        };
      }
      try {
        await salvaSchedaConVersione(db, uid, idScheda, esito.dati, attesa);
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      await scriviVoceRegistro(db, uid, esito.voce.idVoce, esito.voce);
      versioni[idScheda] = versioneDi(esito.dati);
      ultima = esito.voce;
      return {
        ok: true,
        voce: esito.voce,
        versione: versioni[idScheda],
        peso: { radice: peso.radice, scheda: peso.scheda }
      };
    });
  }

  /* L'annulla del v31: rilegge l'ultima voce del registro, rimette il valore di
   * prima e aggiunge una voce nuova. Non cancella niente. */
  function annulla() {
    return coda.esegui("registro", async () => {
      const registro = await leggiZonaB(db, uid, "registro");
      const voce = ultimaAnnullabile(registro);
      if (!voce) {
        ultima = null;
        return { ok: false, motivo: "non c'e' nessuna modifica da annullare" };
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
        await salvaSchedaConVersione(db, uid, idScheda, esito.dati, versioneDi(letto.dati));
      } catch (e) {
        return { ok: false, motivo: e && e.message ? e.message : "scrittura non riuscita" };
      }
      await scriviVoceRegistro(db, uid, esito.voce.idVoce, esito.voce);
      versioni[idScheda] = versioneDi(esito.dati);
      ultima = ultimaAnnullabile(registro.concat([{ id: esito.voce.idVoce, dati: esito.voce }]));
      return { ok: true, voce: esito.voce };
    });
  }

  return {
    attivo: true,
    get annullabile() { return Boolean(ultima); },
    get ultima() { return ultima; },
    modifica: modifica,
    annulla: annulla
  };
}
