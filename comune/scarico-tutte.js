/* PASSO 4d - «Applica sett./scarico a tutte le schede».
 *
 * Il tasto della barra del v31 esisteva spento. Qui c'e' la parte PURA: si
 * decide che cosa succederebbe, scheda per scheda, e non si scrive niente.
 * Chi scrive e' comune/editor-schede-b.js, con una voce di registro sola e un
 * solo Annulla che rimette tutte le schede (vedi applicaScaricoTutte).
 *
 * Regole dichiarate ad Alice:
 *  - i numeri sono esatti e c'e' una riga per scheda: si legge prima, si
 *    scrive dopo la conferma;
 *  - una scheda con MENO settimane della settimana di scarico si SALTA, e la
 *    riga dice perche': non si inventa una S6 in una scheda da 4 settimane;
 *  - il TEST non si copia: questa operazione tocca solo lo scarico, quindi il
 *    test di ogni scheda resta com'e'. Una scheda col test non si salta;
 *  - se una scheda aveva gia' uno scarico diverso, la riga dice COSA TOGLIE
 *    prima di scrivere (non si sovrascrive in silenzio);
 *  - Logbook e zona A non si toccano: qui si parla solo di documenti-scheda.
 */

import { settimaneScheda, leggiPiano, validaSettimana, validaVolume } from "./piano-scheda.js";

export const TIPO_VOCE_SCARICO_TUTTE = "scarico-tutte";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* «S4 · volume −50%» - la stessa forma che usa la conferma della scheda. */
export function testoScarico(scarico) {
  const s = scarico || null;
  if (!s || s.settimana == null) return "";
  return "S" + s.settimana + " \u00b7 volume \u2212" + s.volume + "%";
}

function codiceDi(dati, id) {
  const f = dati && dati.sheet ? dati.sheet : null;
  return testo(f && f.code) || testo(f && f.codice) || testo(dati && dati.codice) || testo(id);
}

/* L'elenco delle schede, nell'ordine in cui vanno toccate. `schede` e' una
 * lista di { id, dati } (il documento della scheda, come lo da' B). */
export function pianificaScaricoTutte(schede, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const elenco = (Array.isArray(schede) ? schede : []).filter((s) => s && typeof s === "object" && testo(s.id));
  if (!elenco.length) return { ok: false, motivo: "non c'e' nessuna scheda da toccare: non ho scritto niente" };

  const idPartenza = testo(r.idPartenza);
  const s = validaSettimana(r.settimana, Math.max.apply(null, elenco.map((x) => Math.max(1, settimaneScheda(x.dati || {})))));
  if (!s.ok) return { ok: false, motivo: s.motivo };
  const v = validaVolume(r.volume);
  if (!v.ok) return { ok: false, motivo: v.motivo };

  const righe = [];
  const daToccare = [];
  const saltate = [];
  const gia = [];
  elenco.forEach((x) => {
    const dati = x.dati || {};
    const codice = codiceDi(dati, x.id);
    const quante = settimaneScheda(dati);
    const attuale = leggiPiano(dati).scarico || null;
    const adesso = testoScarico(attuale);
    const dopo = testoScarico({ settimana: s.settimana, volume: v.volume });
    const partenza = idPartenza && testo(x.id) === idPartenza;
    if (quante < s.settimana) {
      const riga = {
        id: testo(x.id), codice: codice, esito: "salta", quante: quante,
        testo: "Scheda " + codice + ": ha " + quante + (quante === 1 ? " settimana" : " settimane") +
          ", lo scarico in S" + s.settimana + " non ci sta \u2014 saltata"
      };
      righe.push(riga); saltate.push(riga);
      return;
    }
    if (adesso === dopo) {
      const riga = {
        id: testo(x.id), codice: codice, esito: "gia", quante: quante,
        testo: "Scheda " + codice + ": gia' a " + dopo + " \u2014 non c'e' niente da cambiare"
      };
      righe.push(riga); gia.push(riga);
      return;
    }
    const riga = {
      id: testo(x.id), codice: codice, esito: "scrive", quante: quante, partenza: partenza,
      toglie: adesso, dopo: dopo,
      testo: "Scheda " + codice + ": " + dopo + (adesso ? " (toglie " + adesso + ")" : "")
    };
    righe.push(riga); daToccare.push(riga);
  });

  const quante = daToccare.length;
  if (!quante) {
    return {
      ok: true, gia: true, righe: righe, daToccare: [], saltate: saltate, giaSchede: gia, quante: 0,
      testo: "Nessuna scheda da cambiare: " + (saltate.length ? saltate.length + " saltate, " : "") + "lo scarico e' gia' a posto"
    };
  }
  return {
    ok: true,
    gia: false,
    righe: righe,
    daToccare: daToccare,
    saltate: saltate,
    giaSchede: gia,
    quante: quante,
    settimana: s.settimana,
    volume: v.volume,
    dopo: testoScarico({ settimana: s.settimana, volume: v.volume }),
    domanda: "Tocchi " + quante + (quante === 1 ? " scheda" : " schede") + ": lo scarico va a S" + s.settimana +
      " al \u2212" + v.volume + "%" + (idPartenza ? " come nella scheda di partenza" : "") + "?",
    testo: "scarico S" + s.settimana + " \u00b7 \u2212" + v.volume + "% in " + quante + (quante === 1 ? " scheda" : " schede") +
      (saltate.length ? " \u00b7 " + saltate.length + " saltate" : "")
  };
}
