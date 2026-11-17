/* Barbell Diva B — B.21 PASSO 2a: «Attiva», vivo e SOLO in B.
 *
 * Il programma attivo non e' una scheda: e' un campo del documento-programma
 * (`status: "active"` oppure `active: true`). Qui c'e' la parte pura: si decide
 * che cosa scrivere, e nient'altro. Nessun verbo di scrittura: i documenti li
 * scrive comune/editor-schede-b.js passando da comune/scritture-b.js, che e'
 * l'unico punto in cui nasce un riferimento alla zona B.
 *
 * Regola dichiarata ad Alice: si tocca SOLO bdB_atleti. Il telefono di oggi
 * legge ancora la zona A, quindi l'attivazione si vedra' «dal giorno del
 * cambio» — e la conferma in pagina lo dice prima di scrivere.
 *
 * Trappola vera: un documento puo' essere attivo in due modi (status "active"
 * oppure active === true). Spegnere solo lo `status` lasciando active: true
 * non spegnerebbe niente: per questo si scrivono sempre TUTTI E DUE i campi.
 */

import { idVoceRegistro } from "./modifiche-b.js";

export const TIPO_VOCE_ATTIVA = "attiva-programma";

/* B.21 PASSO 2c \u2014 il passaggio inverso: il programma attivo va in bozza. */
export const TIPO_VOCE_BOZZA = "bozza-programma";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

export function nomeProgramma(p) {
  const o = p || {};
  return testo(o.name) || testo(o.nome) || testo(o.titolo) || testo(o.id) || "senza nome";
}

function archiviato(p) {
  if (!p) return true;
  return Boolean(p.archivedAt) || testo(p.status).toLowerCase() === "archived";
}

/* Attivo vuol dire: non archiviato, e status "active" oppure active === true. */
export function eAttivo(p) {
  if (!p || archiviato(p)) return false;
  if (testo(p.status).toLowerCase() === "active") return true;
  return p.active === true;
}

/* Il piano: chi diventa attivo, chi smette, e la voce di registro che li
 * rimetterebbe com'erano. `daScrivere` mette il programma scelto PER ULTIMO:
 * se una scrittura si ferma a meta', non resta un «attivo nuovo» accanto a uno
 * vecchio ancora acceso.
 */
export function pianificaAttivazione(programmi, idScelto, opzioni) {
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  const elenco = (Array.isArray(programmi) ? programmi : []).filter((p) => p && typeof p === "object");
  const scelto = elenco.filter((p) => testo(p.id) === testo(idScelto))[0] || null;
  if (!scelto) return { ok: false, motivo: "il programma scelto non e' fra quelli di B: non ho scritto niente" };
  if (archiviato(scelto)) {
    return { ok: false, motivo: "\u00ab" + nomeProgramma(scelto) + "\u00bb e' archiviato: prima lo riapri, poi lo attivi" };
  }
  const altri = elenco.filter((p) => p !== scelto && eAttivo(p));
  if (eAttivo(scelto) && !altri.length) {
    return {
      ok: true, gia: true, nome: nomeProgramma(scelto), daScrivere: [], voce: null, altri: [],
      testo: "\u00ab" + nomeProgramma(scelto) + "\u00bb e' gia' il programma attivo: non ho scritto niente"
    };
  }
  const prima = [];
  const dopo = [];
  const daScrivere = [];
  function prepara(p, nuovoStato, attivo) {
    prima.push({
      id: testo(p.id),
      status: p.status == null ? null : p.status,
      active: p.active == null ? null : p.active,
      updatedAt: p.updatedAt == null ? null : p.updatedAt
    });
    daScrivere.push({ id: testo(p.id), dati: Object.assign({}, p, { status: nuovoStato, active: attivo, updatedAt: quando }) });
    dopo.push({ id: testo(p.id), status: nuovoStato, active: attivo });
  }
  altri.forEach((p) => prepara(p, "available", false));
  prepara(scelto, "active", true);
  const voce = {
    idVoce: testo(o.idVoce) || idVoceRegistro(quando),
    quando: quando,
    tipo: TIPO_VOCE_ATTIVA,
    origine: "attiva-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "programma",
    prima: prima,
    dopo: dopo,
    dopoTesto: "programma attivo: " + nomeProgramma(scelto)
  };
  return {
    ok: true,
    gia: false,
    nome: nomeProgramma(scelto),
    altri: altri.map(nomeProgramma),
    daScrivere: daScrivere,
    voce: voce,
    testo: "programma attivo in B: \u00ab" + nomeProgramma(scelto) + "\u00bb"
  };
}

/* B.21 PASSO 2c \u2014 \u00abMetti in bozza\u00bb: il programma attivo smette di esserlo e
 * diventa una bozza (`status: "draft"`, `active: false`). Qui non si elegge
 * nessuno: si mette da parte quello che c'e', e nessun altro programma viene
 * toccato. Una bozza resta visibile nel desktop (che non chiede `escludiBozze`);
 * il telefono non la vede piu' (PASSO 2b), e la conferma in pagina lo dice.
 * Si scrivono sempre TUTTI E DUE i campi: `active: true` da solo terrebbe il
 * programma attivo anche con lo status a bozza.
 */
export function pianificaBozza(programmi, idScelto, opzioni) {
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  const elenco = (Array.isArray(programmi) ? programmi : []).filter((p) => p && typeof p === "object");
  const scelto = elenco.filter((p) => testo(p.id) === testo(idScelto))[0] || null;
  if (!scelto) return { ok: false, motivo: "il programma scelto non e' fra quelli di B: non ho scritto niente" };
  if (archiviato(scelto)) {
    return { ok: false, motivo: "\u00ab" + nomeProgramma(scelto) + "\u00bb e' archiviato: non c'e' niente da mettere in bozza" };
  }
  const giaBozza = testo(scelto.status).toLowerCase() === "draft" && scelto.active !== true;
  if (giaBozza) {
    return {
      ok: true, gia: true, nome: nomeProgramma(scelto), daScrivere: [], voce: null, altri: [],
      testo: "\u00ab" + nomeProgramma(scelto) + "\u00bb e' gia' in bozza: non ho scritto niente"
    };
  }
  const prima = [{
    id: testo(scelto.id),
    status: scelto.status == null ? null : scelto.status,
    active: scelto.active == null ? null : scelto.active,
    updatedAt: scelto.updatedAt == null ? null : scelto.updatedAt
  }];
  const daScrivere = [{ id: testo(scelto.id), dati: Object.assign({}, scelto, { status: "draft", active: false, updatedAt: quando }) }];
  const dopo = [{ id: testo(scelto.id), status: "draft", active: false }];
  const voce = {
    idVoce: testo(o.idVoce) || idVoceRegistro(quando),
    quando: quando,
    tipo: TIPO_VOCE_BOZZA,
    origine: "bozza-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "programma",
    prima: prima,
    dopo: dopo,
    dopoTesto: "programma in bozza: " + nomeProgramma(scelto)
  };
  return {
    ok: true,
    gia: false,
    nome: nomeProgramma(scelto),
    altri: [],
    daScrivere: daScrivere,
    voce: voce,
    testo: "programma in bozza in B: \u00ab" + nomeProgramma(scelto) + "\u00bb"
  };
}

/* L'annulla della voce: si rimettono status/active/updatedAt di prima. Se un
 * documento non e' piu' in B lo si dichiara, non lo si inventa. */
export function pianificaRipristino(voce, programmi) {
  const v = voce || {};
  const prima = Array.isArray(v.prima) ? v.prima : [];
  const elenco = (Array.isArray(programmi) ? programmi : []).filter((p) => p && typeof p === "object");
  const daScrivere = [];
  const mancanti = [];
  prima.forEach((x) => {
    const id = testo(x && x.id);
    const p = elenco.filter((q) => testo(q && q.id) === id)[0] || null;
    if (!p) { mancanti.push(id); return; }
    const dati = Object.assign({}, p);
    if (x.status == null) delete dati.status; else dati.status = x.status;
    if (x.active == null) delete dati.active; else dati.active = x.active === true;
    if (x.updatedAt == null) delete dati.updatedAt; else dati.updatedAt = x.updatedAt;
    daScrivere.push({ id: id, dati: dati });
  });
  return { ok: daScrivere.length > 0, daScrivere: daScrivere, mancanti: mancanti };
}
