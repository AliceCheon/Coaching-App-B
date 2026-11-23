/* Barbell Diva B — PASSO 14: «Dove ti fa male».
 *
 * Una sola cosa, fatta bene: l'atleta tocca le articolazioni che le fanno male
 * e quella dichiarazione resta scritta. Il documento e' uno solo per atleta,
 * `bdB_atleti/{uid}/dolori/{uid}`, con la forma delle altre fotografie:
 *
 *   { articolazioni: ["spalla", "ginocchio"], aggiornato: ISO, versione: n }
 *
 * Qui non si scrive niente: queste sono funzioni PURE. La scrittura passa da
 * comune/scritture-b.js (scriviDolori), il registro da scriviVoceRegistro.
 * Ogni tocco produce UNA voce di registro che porta `prima` e `dopo`, cosi'
 * l'Annulla rimette il valore di prima in un colpo solo.
 *
 * Regole del filone:
 *  - niente Map, niente Set: solo elenchi e oggetti;
 *  - le otto articolazioni sono quelle delle tolleranze, non un secondo elenco;
 *  - una dichiarazione non e' un numero: se non c'e', si dice «non dichiarato».
 */

import { TOLLERANZE } from "./tolleranze-b.js";

/* Le otto articolazioni, nell'ordine delle tolleranze: un elenco solo. */
export const ARTICOLAZIONI = Object.freeze(Object.keys(TOLLERANZE));

export const NON_DICHIARATO = "non dichiarato";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

function versioneDi(documento) {
  if (!documento || typeof documento !== "object") return 0;
  const n = Number(documento.versione);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/* L'ordine e' quello delle tolleranze: due dichiarazioni uguali danno lo
 * stesso documento, qualunque sia l'ordine dei tocchi. */
function inOrdine(elenco) {
  const dentro = Array.isArray(elenco) ? elenco : [];
  return ARTICOLAZIONI.filter((a) => dentro.indexOf(a) !== -1);
}

export function articolazioneNota(valore) {
  return ARTICOLAZIONI.indexOf(testo(valore)) !== -1;
}

/* Il documento letto, senza fidarsi: articolazioni note, senza doppioni. */
export function normalizzaDolori(documento) {
  if (!documento || typeof documento !== "object") {
    return { presente: false, articolazioni: [], sconosciute: [], aggiornato: "", versione: 0 };
  }
  const grezze = Array.isArray(documento.articolazioni) ? documento.articolazioni : [];
  const sconosciute = [];
  grezze.forEach((v) => {
    const t = testo(v);
    if (!t) return;
    if (!articolazioneNota(t)) { if (sconosciute.indexOf(t) === -1) sconosciute.push(t); return; }
  });
  return {
    presente: true,
    articolazioni: inOrdine(grezze),
    sconosciute: sconosciute,
    aggiornato: testo(documento.aggiornato),
    versione: versioneDi(documento)
  };
}

/* Il testo per la carta: «non dichiarato», oppure le articolazioni. */
export function testoDolori(dolori) {
  const n = normalizzaDolori(dolori);
  if (!n.presente) return NON_DICHIARATO;
  if (!n.articolazioni.length) return "nessuna articolazione";
  return n.articolazioni.join(", ");
}

/* Un tocco: accende o spegne l'articolazione. Ritorna il documento nuovo, la
 * voce di registro (UNA) e cosa e' cambiato. Non scrive. */
export function dichiarazioneDolori(documento, articolazione, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quale = testo(articolazione);
  if (!articolazioneNota(quale)) {
    return { ok: false, motivo: "«" + quale + "» non e' una delle otto articolazioni: non ho scritto niente" };
  }
  const letto = normalizzaDolori(documento);
  const prima = letto.articolazioni.slice();
  const cEra = prima.indexOf(quale) !== -1;
  const dopo = cEra ? prima.filter((a) => a !== quale) : inOrdine(prima.concat([quale]));
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = letto.versione;
  const versioneDopo = versionePrima + 1;
  if (prima.length === dopo.length && cEra === (dopo.indexOf(quale) !== -1)) {
    return { ok: false, motivo: "la dichiarazione non cambia niente: non ho scritto niente" };
  }
  const nuovo = {
    articolazioni: dopo,
    aggiornato: quando,
    versione: versioneDopo
  };
  const voce = {
    idVoce: "mod-" + quando.replace(/[:.]/g, "-"),
    quando: quando,
    tipo: "dichiarazione-dolori",
    origine: "dolori-dichiarati-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "dolori",
    articolazione: quale,
    prima: prima,
    dopo: dopo,
    primaTesto: prima.length ? prima.join(", ") : NON_DICHIARATO,
    dopoTesto: dopo.length ? dopo.join(", ") : "nessuna articolazione",
    versionePrima: versionePrima,
    versioneDopo: versioneDopo
  };
  return {
    ok: true,
    documento: nuovo,
    voce: voce,
    prima: prima,
    dopo: dopo,
    dichiarata: dopo.indexOf(quale) !== -1,
    esitoTesto: "«" + quale + "» " + (dopo.indexOf(quale) !== -1 ? "dichiarata" : "tolta") + " · "
      + (dopo.length ? dopo.join(", ") : "nessuna articolazione")
  };
}

/* L'Annulla di una dichiarazione: rimette l'elenco di prima. Non cancella la
 * voce nel registro, ne aggiunge una che la cita (come tutto il resto). */
export function annullaDolori(documento, voce, opzioni) {
  const v = voce || {};
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (testo(v.campo) !== "dolori" && testo(v.tipo) !== "dichiarazione-dolori") {
    return { ok: false, motivo: "la voce del registro non dice cosa annullare" };
  }
  if (!Array.isArray(v.prima)) {
    return { ok: false, motivo: "la voce non porta le articolazioni di prima: non ho scritto niente" };
  }
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const letto = normalizzaDolori(documento);
  const versionePrima = letto.versione;
  const versioneDopo = versionePrima + 1;
  const nuovo = {
    articolazioni: inOrdine(v.prima),
    aggiornato: quando,
    versione: versioneDopo
  };
  const voce2 = {
    idVoce: "mod-" + quando.replace(/[:.]/g, "-"),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "dolori",
    articolazione: testo(v.articolazione),
    prima: letto.articolazioni.slice(),
    dopo: nuovo.articolazioni.slice(),
    primaTesto: letto.articolazioni.length ? letto.articolazioni.join(", ") : "nessuna articolazione",
    dopoTesto: nuovo.articolazioni.length ? nuovo.articolazioni.join(", ") : NON_DICHIARATO,
    annullaDi: testo(v.idVoce),
    versionePrima: versionePrima,
    versioneDopo: versioneDopo
  };
  return { ok: true, documento: nuovo, voce: voce2 };
}
