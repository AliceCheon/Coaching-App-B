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

/* EXTRA-4 - dove vive lo stato del programma.
 * A scrive i programmi v2 come { programMeta: {...} }, e la lettura di B
 * restituisce PROPRIO programMeta come programma (comune/lettura-b.js):
 * status, active e updatedAt stanno DENTRO il meta. Scriverli in cima al
 * documento - come faceva pianificaBozza - li rende invisibili a
 * programmaAttivo() e al telefono (mobile/app.js chiede escludiBozze:true):
 * la pagina resta "Attivo" e nessuno se ne accorge. Un documento scritto col
 * vecchio modo non e' leggibile da qui: la prima pressione lo rimette a
 * posto, perche' da adesso si scrive nel meta e la cima si pulisce. */
export function statoDelProgramma(dati) {
  const d = dati || {};
  const meta = d.programMeta && typeof d.programMeta === "object" ? d.programMeta
    : (d.program && typeof d.program === "object" ? d.program : d);
  return {
    dove: meta === d ? "documento" : (d.programMeta ? "programMeta" : "program"),
    stato: meta.status == null ? null : meta.status,
    attivo: meta.active == null ? null : meta.active,
    updatedAt: meta.updatedAt == null ? null : meta.updatedAt,
    archiviato: Boolean(meta.archivedAt) || testo(meta.status).toLowerCase() === "archived"
  };
}

/* Il documento da scrivere: gli stessi campi letti, con lo stato messo dove i
 * lettori lo cercano. Se il programma e' annidato, in cima non resta un
 * secondo status/active/updatedAt che nessuno legge (era il difetto). */
export function conStato(dati, nuovoStato, attivo, quando) {
  const d = Object.assign({}, dati || {});
  const dentro = d.programMeta && typeof d.programMeta === "object" ? "programMeta"
    : (d.program && typeof d.program === "object" ? "program" : "");
  if (!dentro) {
    d.status = nuovoStato;
    d.active = attivo === true;
    d.updatedAt = quando;
    return d;
  }
  d[dentro] = Object.assign({}, d[dentro], { status: nuovoStato, active: attivo === true, updatedAt: quando });
  delete d.status;
  delete d.active;
  delete d.updatedAt;
  delete d.idInterno;
  return d;
}

/* L'Annulla rimette i tre campi dove li aveva trovati. */
export function rimettiStato(dati, x) {
  const v = x || {};
  const d = Object.assign({}, dati || {});
  const dentro = d.programMeta && typeof d.programMeta === "object" ? "programMeta"
    : (d.program && typeof d.program === "object" ? "program" : "");
  const bersaglio = dentro ? Object.assign({}, d[dentro]) : d;
  if (v.status == null) delete bersaglio.status; else bersaglio.status = v.status;
  if (v.active == null) delete bersaglio.active; else bersaglio.active = v.active === true;
  if (v.updatedAt == null) delete bersaglio.updatedAt; else bersaglio.updatedAt = v.updatedAt;
  if (!dentro) return bersaglio;
  d[dentro] = bersaglio;
  delete d.status;
  delete d.active;
  delete d.updatedAt;
  return d;
}

export function nomeProgramma(p) {
  const o = p || {};
  const m = o.programMeta && typeof o.programMeta === "object" ? o.programMeta
    : (o.program && typeof o.program === "object" ? o.program : o);
  return testo(m.name) || testo(m.nome) || testo(m.titolo) || testo(m.id) || testo(o.id) || "senza nome";
}

function archiviato(p) {
  if (!p) return true;
  return statoDelProgramma(p).archiviato;
}

/* PASSO 3d — l'id che la pagina conosce non e' sempre l'id del documento.
 * Il profilo porta l'id DENTRO il documento (`programMeta.id`), mentre il
 * documento di B si chiama `program-v2-meta-…`: sono due cose diverse, e
 * cercare solo la prima non trovava mai niente. Si accettano tutti e due, piu'
 * l'id interno esplicito (`idInterno`, che l'editor mette quando legge B).
 */
function idCorrisponde(p, atteso) {
  const a = testo(atteso);
  if (!a) return false;
  const o = p || {};
  return testo(o.id) === a || testo(o.idInterno) === a || testo(o.programId) === a;
}

function trovaProgramma(elenco, idScelto) {
  const lista = (Array.isArray(elenco) ? elenco : []).filter((p) => p && typeof p === "object");
  return lista.filter((p) => idCorrisponde(p, idScelto))[0] || null;
}

export { trovaProgramma };

/* Attivo vuol dire: non archiviato, e status "active" oppure active === true. */
export function eAttivo(p) {
  if (!p || archiviato(p)) return false;
  const s = statoDelProgramma(p);
  if (testo(s.stato).toLowerCase() === "active") return true;
  return s.attivo === true;
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
  const scelto = trovaProgramma(elenco, idScelto);
  if (!scelto) return { ok: false, nonInB: true, idScelto: testo(idScelto), quantiB: elenco.length, motivo: "il programma scelto non e' fra quelli di B: non ho scritto niente" };
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
    const s = statoDelProgramma(p);
    prima.push({ id: testo(p.id), status: s.stato, active: s.attivo, updatedAt: s.updatedAt, dove: s.dove });
    daScrivere.push({ id: testo(p.id), dati: conStato(p, nuovoStato, attivo, quando), dove: s.dove });
    dopo.push({ id: testo(p.id), status: nuovoStato, active: attivo, dove: s.dove });
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
  const scelto = trovaProgramma(elenco, idScelto);
  if (!scelto) return { ok: false, nonInB: true, idScelto: testo(idScelto), quantiB: elenco.length, motivo: "il programma scelto non e' fra quelli di B: non ho scritto niente" };
  if (archiviato(scelto)) {
    return { ok: false, motivo: "\u00ab" + nomeProgramma(scelto) + "\u00bb e' archiviato: non c'e' niente da mettere in bozza" };
  }
  const adesso = statoDelProgramma(scelto);
  const giaBozza = testo(adesso.stato).toLowerCase() === "draft" && adesso.attivo !== true;
  if (giaBozza) {
    return {
      ok: true, gia: true, nome: nomeProgramma(scelto), daScrivere: [], voce: null, altri: [],
      testo: "\u00ab" + nomeProgramma(scelto) + "\u00bb e' gia' in bozza: non ho scritto niente"
    };
  }
  const prima = [{ id: testo(scelto.id), status: adesso.stato, active: adesso.attivo, updatedAt: adesso.updatedAt, dove: adesso.dove }];
  const daScrivere = [{ id: testo(scelto.id), dati: conStato(scelto, "draft", false, quando), dove: adesso.dove }];
  const dopo = [{ id: testo(scelto.id), status: "draft", active: false, dove: adesso.dove }];
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
    daScrivere.push({ id: id, dati: rimettiStato(p, x) });
  });
  return { ok: daScrivere.length > 0, daScrivere: daScrivere, mancanti: mancanti };
}
