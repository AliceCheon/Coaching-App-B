/* Barbell Diva B — il ponte fra la tabella e la zona B (passo 9).
 *
 * Qui vivono le due cose che la vista non puo' fare da sola:
 *  - la mappa codice scheda -> documento di B (la tabella mostra il codice, il
 *    documento ha un id diverso, e il codice puo' ripetersi: se si ripete non
 *    si sceglie, si rifiuta);
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

export function creaEditorSchede(opzioni) {
  const o = opzioni || {};
  const db = o.db;
  const uid = o.uid;
  const coda = creaCoda();
  const versioni = Object.create(null);
  const documenti = Array.isArray(o.documenti) ? o.documenti : [];
  const perCodice = mappaCodici(documenti);
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

  function documentoScheda(codice) {
    return perCodice[String(codice || "").trim()] || "";
  }

  /* Una modifica: si rilegge la scheda, si controlla la versione, si scrive, si
   * lascia la voce nel registro. Tutto dentro la coda della scheda. */
  function modifica(richiesta) {
    const r = richiesta || {};
    const idScheda = String(r.idScheda || documentoScheda(r.codice) || "");
    if (!idScheda) {
      return Promise.resolve({ ok: false, motivo: "scheda non riconosciuta in B: non ho scritto niente" });
    }
    return coda.esegui(idScheda, async () => {
      const letto = await leggiSchedaB(db, uid, idScheda);
      if (!letto || !letto.esiste) {
        return { ok: false, motivo: "la scheda non e' ancora in B: fai prima la copia" };
      }
      const attesa = versioni[idScheda] == null ? versioneDi(letto.dati) : versioni[idScheda];
      const peso = misuraPeso(o.fotografia, [{ dati: letto.dati }]);
      if (!peso.sotto) return { ok: false, motivo: peso.avviso };

      const esito = cambiaSerieRipetizioni(letto.dati, r, { quando: quando(), uid: uid });
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
      const idScheda = String(voce.scheda || documentoScheda(voce.codice) || "");
      if (!idScheda) return { ok: false, motivo: "la voce del registro non dice quale scheda" };
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
