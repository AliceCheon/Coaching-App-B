/* Barbell Diva B — la libreria delle progressioni custom (passo 31).
 *
 * Fino al passo 26 una progressione custom viveva DENTRO il documento del
 * programma in cui era stata scritta (`programMeta.progressioniCustom`), e
 * quindi non si vedeva dagli altri programmi. Il 28/11/2026 Alice ha
 * pubblicato la regola Firestore che apre `bdB_atleti/{uid}/progressioni`:
 * da qui le custom stanno in una raccolta sola per utente, come gli scheletri,
 * e la stessa tabella si vede da qualunque programma.
 *
 * Tre cose, in quest'ordine:
 *  1. LEGGERE — `elencoLibreria(documenti)` porta i documenti della raccolta
 *     nella forma che la pagina e il pannello gia' conoscono (id, nome, da,
 *     settimane). `elencoVecchie(programmi)` fa lo stesso per le custom che
 *     stanno ancora nei programmi: servono alla migrazione e, finche' la
 *     migrazione non e' passata, a non far sparire niente.
 *  2. SCRIVERE — `cambiaLibreria` riusa il motore di sempre
 *     (`cambiaProgressioni`: crea · settimane · rinomina · elimina, con le sue
 *     difese su nome, celle e tabelle vuote) su un documento finto che porta
 *     solo l'elenco. Il risultato si scrive su UN documento della raccolta,
 *     con `versione` +1, marchio e voce di registro. A scrivere e' sempre
 *     `comune/scritture-b.js`: qui non c'e' un solo verbo Firestore.
 *  3. MIGRARE — `pianoMigrazione` elenca le custom che stanno nei programmi e
 *     non sono ancora nella raccolta (stesso nome E stesse otto settimane =
 *     gia' copiata). L'id e' stabile (programma + id della custom), quindi
 *     riaprire la pagina non crea doppioni; dopo la copia il campo vecchio si
 *     toglie dal programma, cosi' non resta una seconda copia da leggere.
 *
 * Niente DOM, niente rete: solo dati.
 */
import { cambiaProgressioni, elencoCustom, coppieCustom } from "./progressioni-custom-b.js";
import { CAMPO_CUSTOM, SETTIMANE_CUSTOM } from "./progressioni-b.js";
import { idVoceRegistro, versioneDi } from "./modifiche-b.js";

export const TIPO_DOCUMENTO = "progressione";
export const TIPO_VOCE = "progressioni-libreria";
export const TIPO_VOCE_MIGRAZIONE = "progressioni-libreria-migrazione";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* Una voce come la conoscono pagina e pannello: otto settimane sempre. */
function copiaVoce(v) {
  const voce = v || {};
  return {
    id: testo(voce.id),
    nome: testo(voce.nome),
    da: testo(voce.da),
    settimane: coppieCustom(voce).map((c) => ({ serie: c[0], ripetizioni: c[1] }))
  };
}

/* La chiave del contenuto: stesso nome (maiuscole comprese) e stesse otto
 * settimane. Serve alla migrazione — non duplicare — e all'unione fra
 * raccolta e vecchie posizioni — non mostrare due volte la stessa cosa. */
export function chiaveVoce(v) {
  const voce = v || {};
  return testo(voce.nome).toLowerCase() + "|" + coppieCustom(voce).map((c) => c[0] + "\u00d7" + c[1]).join("|");
}

/* I documenti della raccolta `progressioni`, nella forma della pagina. La
 * versione resta accanto alla voce: serve a scrivere senza sovrascrivere una
 * modifica fatta nel frattempo. */
export function elencoLibreria(documenti) {
  const righe = (Array.isArray(documenti) ? documenti : [])
    .filter((d) => d && d.dati && typeof d.dati === "object")
    .map((d) => {
      const dati = d.dati || {};
      return {
        id: testo(d.id != null ? d.id : dati.id),
        nome: dati.nome,
        da: dati.da,
        settimane: dati.settimane,
        versione: Number(dati.versione) || 0,
        creatoIl: testo(dati.creatoIl)
      };
    });
  return elencoCustom({ progressioniCustom: righe }).map((v, i) => {
    const riga = righe.filter((r) => r.id === v.id)[0] || righe[i] || {};
    return {
      id: v.id,
      nome: v.nome,
      da: v.da,
      settimane: v.settimane,
      versione: Number(riga.versione) || 0,
      creatoIl: testo(riga.creatoIl)
    };
  });
}

/* Le custom che stanno ancora dentro i programmi (vecchia posizione). Il
 * programma qui e' gia' quello letto da B: per i v2 e' il `programMeta` con
 * `docId` (le custom sono sulla sua radice), per i v1 e' il `program`. */
export function elencoVecchie(programmi) {
  const fuori = [];
  (Array.isArray(programmi) ? programmi : []).forEach((p) => {
    if (!p || typeof p !== "object") return;
    const idProgramma = testo(p.docId || p.id);
    elencoCustom(p).forEach((v) => {
      fuori.push(Object.assign({}, v, { programma: idProgramma }));
    });
  });
  return fuori;
}

/* Le voci da mostrare: prima la raccolta, poi le vecchie che non sono ancora
 * state copiate. Una voce con lo stesso nome e le stesse settimane di una gia'
 * in raccolta non si mostra due volte. */
export function unisciSenzaDoppioni(libreria, vecchie) {
  const fuori = (Array.isArray(libreria) ? libreria : []).map(copiaVoce);
  const visti = Object.create(null);
  fuori.forEach((v) => { visti[chiaveVoce(v)] = true; });
  (Array.isArray(vecchie) ? vecchie : []).forEach((v) => {
    if (!v || !testo(v.nome)) return;
    const k = chiaveVoce(v);
    if (visti[k]) return;
    visti[k] = true;
    fuori.push(copiaVoce(v));
  });
  return fuori;
}

/* Il documento della raccolta: una riga sola per ogni campo che conta. Il
 * marchio e il tipo li scrive qui, non il motore, cosi' nessun campo del
 * documento del programma finisce per sbaglio dentro la libreria. */
export function documentoLibreria(voce, opzioni) {
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  return {
    tipo: TIPO_DOCUMENTO,
    id: testo(voce && voce.id),
    nome: testo(voce && voce.nome),
    da: testo(voce && voce.da),
    settimane: coppieCustom(voce || {}).map((c) => ({ serie: c[0], ripetizioni: c[1] })),
    creatoIl: testo(o.creatoIl || (voce && voce.creatoIl)) || quando,
    aggiornatoIl: quando,
    modificatoInB: {
      quando: quando,
      da: o.uid == null ? null : String(o.uid),
      ultima: "progressione"
    }
  };
}

/* Id stabile della migrazione: stesso programma + stessa custom = stesso id,
 * anche dopo una ricarica o una seconda apertura. */
function impronta(testoFonte) {
  const t = String(testoFonte);
  let h = 2166136261;
  for (let i = 0; i < t.length; i += 1) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function pezzo(valore, ripiego) {
  const t = testo(valore).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return t || ripiego;
}

export function idMigrazione(idProgramma, voce, indice) {
  const pid = testo(idProgramma) || "programma";
  return "pm-" + pezzo(pid, "programma") + "-" + impronta(pid + "|" + testo(voce && voce.id) + "|" + String(indice || 0));
}

/* Il piano della migrazione: quali custom copiare, quali sono gia' in
 * raccolta. Non scrive niente: a scrivere e' l'editor, un documento alla
 * volta, e solo dopo la copia il campo vecchio si toglie dal programma.
 *
 * Ritorna { copie: [{id, documento, daProgramma}], trovate, giaPresenti }. */
export function pianoMigrazione(programmi, libreria, opzioni) {
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  const contenuti = Object.create(null);
  const idPresi = Object.create(null);
  (Array.isArray(libreria) ? libreria : []).forEach((v) => {
    contenuti[chiaveVoce(v)] = true;
    if (testo(v.id)) idPresi[testo(v.id)] = true;
  });
  const copie = [];
  const daPulire = [];
  let trovate = 0;
  let giaPresenti = 0;
  (Array.isArray(programmi) ? programmi : []).forEach((p) => {
    if (!p || typeof p !== "object") return;
    const idProgramma = testo(p.docId || p.id);
    const vecchie = elencoCustom(p);
    if (!vecchie.length) return;
    let perQuesto = 0;
    vecchie.forEach((v, i) => {
      trovate += 1;
      const k = chiaveVoce(v);
      if (contenuti[k]) { giaPresenti += 1; return; }
      let id = idMigrazione(idProgramma, v, i);
      let coda = 2;
      while (idPresi[id]) { id = idMigrazione(idProgramma, v, i) + "-" + coda; coda += 1; }
      idPresi[id] = true;
      contenuti[k] = true;
      perQuesto += 1;
      copie.push({
        id: id,
        daProgramma: idProgramma,
        documento: documentoLibreria(Object.assign({}, v, { id: id }), {
          quando: quando,
          uid: o.uid,
          /* la data vera della custom, se il documento la portava */
          creatoIl: testo(o.creatoIl)
        })
      });
    });
    /* Questo programma non ha niente da copiare: le sue custom sono gia'
     * tutte in raccolta, quindi il campo vecchio si puo' togliere subito.
     * Se invece ne ha, si toglie dopo che le copie sono passate. */
    if (!perQuesto && idProgramma) daPulire.push(idProgramma);
  });
  return { copie: copie, daPulire: daPulire, trovate: trovate, giaPresenti: giaPresenti };
}

/* L'azione su una custom, una sola: crea · settimane · rinomina · elimina.
 * Il motore e' quello di sempre (`cambiaProgressioni`): stesse difese, stessi
 * messaggi. Cambia solo dove finisce il risultato — un documento della
 * raccolta invece del campo dentro il programma.
 *
 * Ritorna { ok, azione, id, documento, versioneAttesa, voce, elenco, testo,
 * custom } oppure { ok:false, motivo }. */
export function cambiaLibreria(elenco, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  const azione = testo(r.azione);
  const prima = (Array.isArray(elenco) ? elenco : []).map((v) => Object.assign(copiaVoce(v), {
    versione: Number(v && v.versione) || 0,
    creatoIl: testo(v && v.creatoIl)
  }));
  const trova = (id) => prima.filter((v) => v.id === testo(id))[0] || null;
  let bersaglio = null;
  if (azione === "settimane" || azione === "rinomina" || azione === "elimina") {
    bersaglio = trova(r.id);
    if (!bersaglio) return { ok: false, motivo: "la progressione custom non c'\u00e8 pi\u00f9: non ho scritto niente" };
  }

  /* Il documento finto: porta solo l'elenco, come lo conosce il motore. */
  const finto = {
    progressioniCustom: prima.map((v) => ({ id: v.id, nome: v.nome, da: v.da, settimane: v.settimane }))
  };
  const esito = cambiaProgressioni(finto, Object.assign({}, r), { quando: quando, uid: o.uid });
  if (!esito.ok) return esito;

  const dopo = (Array.isArray(esito.elenco) ? esito.elenco : []).map(copiaVoce);
  let id = "";
  let versioneAttesa = 0;
  if (azione === "elimina") {
    id = bersaglio.id;
    versioneAttesa = bersaglio.versione || 0;
  } else if (azione === "crea") {
    id = testo(esito.custom && esito.custom.id);
    let coda = 2;
    while (prima.some((v) => v.id === id)) { id = testo(esito.custom && esito.custom.id) + "-" + coda; coda += 1; }
    versioneAttesa = 0;
  } else {
    id = bersaglio.id;
    versioneAttesa = bersaglio.versione || 0;
  }
  const voce = id ? (dopo.filter((v) => v.id === id)[0] || null) : null;
  const documento = azione === "elimina"
    ? null
    : documentoLibreria(Object.assign({}, voce || esito.custom, { id: id }), {
      quando: quando,
      uid: o.uid,
      creatoIl: bersaglio ? bersaglio.creatoIl : ""
    });

  const voceRegistro = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: TIPO_VOCE,
    origine: "modifica-fatta-in-B",
    programma: "",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: azione === "settimane" ? Number(r.settimana) || null : null,
    campo: "progressioni-libreria",
    azione: azione,
    idProgressione: id,
    nome: voce ? testo(voce.nome) : (bersaglio ? bersaglio.nome : ""),
    /* L'elenco INTERO di prima e di dopo: l'Annulla rimette creazioni,
     * modifiche ed eliminazioni con una voce sola. */
    prima: prima.map(copiaVoce),
    dopo: dopo.map(copiaVoce),
    dopoTesto: esito.testo,
    versionePrima: versioneAttesa,
    versioneDopo: azione === "elimina" ? versioneAttesa : versioneAttesa + 1
  };

  return {
    ok: true,
    azione: azione,
    id: id,
    documento: documento,
    versioneAttesa: versioneAttesa,
    voce: voceRegistro,
    custom: voce,
    elenco: dopo,
    testo: esito.testo
  };
}

/* Il piano dell'Annulla: riporta la raccolta all'elenco di `prima`. Chi
 * c'era e non c'e' piu' si riscrive, chi c'era ed e' cambiato si rimette,
 * chi non c'era si toglie. Nessun dato inventato: i valori vengono dalla voce
 * del registro. */
export function pianoAnnulla(prima, attuale, opzioni) {
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  const volute = (Array.isArray(prima) ? prima : []).map(copiaVoce).filter((v) => v.id);
  const adesso = (Array.isArray(attuale) ? attuale : []).map((v) => Object.assign(copiaVoce(v), {
    versione: Number(v && v.versione) || 0,
    creatoIl: testo(v && v.creatoIl)
  }));
  const perId = Object.create(null);
  adesso.forEach((v) => { perId[v.id] = v; });
  const crea = [];
  const aggiorna = [];
  volute.forEach((v) => {
    const a = perId[v.id];
    if (!a) {
      crea.push({ id: v.id, versioneAttesa: 0, documento: documentoLibreria(v, { quando: quando, uid: o.uid }) });
      return;
    }
    if (chiaveVoce(a) !== chiaveVoce(v)) {
      aggiorna.push({
        id: v.id,
        versioneAttesa: a.versione || 0,
        documento: documentoLibreria(v, { quando: quando, uid: o.uid, creatoIl: a.creatoIl })
      });
    }
  });
  const volutiId = Object.create(null);
  volute.forEach((v) => { volutiId[v.id] = true; });
  const elimina = adesso.filter((v) => !volutiId[v.id]).map((v) => v.id);
  return { crea: crea, aggiorna: aggiorna, elimina: elimina, vuoto: !crea.length && !aggiorna.length && !elimina.length };
}

/* Il documento del programma senza le custom: il campo vecchio si toglie
 * (creazioni, modifiche ed eliminazioni sono gia' nella raccolta), tutto il
 * resto resta com'e'. La versione la mette `salvaProgrammaConVersione`. */
export function programmaSenzaCustom(dati, opzioni) {
  const o = opzioni || {};
  const quando = testo(o.quando) || new Date().toISOString();
  const nuovo = Object.assign({}, dati || {});
  if (nuovo.programMeta && typeof nuovo.programMeta === "object") {
    const meta = Object.assign({}, nuovo.programMeta);
    delete meta[CAMPO_CUSTOM];
    meta.updatedAt = quando;
    nuovo.programMeta = meta;
  } else if (nuovo.program && typeof nuovo.program === "object") {
    const prog = Object.assign({}, nuovo.program);
    delete prog[CAMPO_CUSTOM];
    prog.updatedAt = quando;
    nuovo.program = prog;
  }
  delete nuovo[CAMPO_CUSTOM];
  nuovo.modificatoInB = {
    quando: quando,
    da: o.uid == null ? null : String(o.uid),
    ultima: "progressioni-libreria"
  };
  nuovo.versione = versioneDi(dati) + 1;
  return nuovo;
}

/* La frase della migrazione: la riga di stato dice quante ne ha trovate e
 * quante ne ha spostate, senza numeri inventati. */
export function fraseMigrazione(trovate, copiate, giaPresenti) {
  const t = Number(trovate) || 0;
  const c = Number(copiate) || 0;
  if (!t) return "";
  if (!c) {
    return t + (t === 1 ? " progressione custom era" : " progressioni custom erano") +
      " gi\u00e0 nella libreria: niente da spostare";
  }
  return c + (c === 1 ? " progressione custom spostata" : " progressioni custom spostate") +
    " nella libreria" + (giaPresenti ? " \u00b7 " + giaPresenti + " gi\u00e0 presente" + (giaPresenti === 1 ? "e" : "i") : "");
}

/* Quante settimane porta una voce: serve alle prove e alla pagina. */
export const SETTIMANE = SETTIMANE_CUSTOM;
