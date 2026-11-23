/* Passo 14d — la dichiarazione vive nel REGISTRO (una raccolta che si scrive
 * gia' da tutti i passi), non in un documento nuovo.
 *
 * Qui si provano, senza browser:
 *  - il riconoscimento delle articolazioni dal testo (tabella di parole);
 *  - la lettura: l'ultima dichiarazione che nessuno ha annullato;
 *  - il salvataggio: UNA voce con prima/dopo e le due versioni;
 *  - l'Annulla: una voce che cita la sua e rimette il testo di prima;
 *  - il campo: riga d'esito sempre presente, Salva spento quando il testo e'
 *    identico e durante la scrittura, «non dichiarato» quando non c'e' niente;
 *  - le due carte: le articolazioni riconosciute portano il segno.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  riconosciArticolazioni, dichiarazioneDalRegistro, salvaAnamnesi, annullaAnamnesi,
  testoDichiarazione, fraseArticolazioniDaAnamnesi, ARTICOLAZIONI, NON_DICHIARATO, oraBreve
} from "../comune/anamnesi-b.js";
import { montaCampoAnamnesi } from "../comune/vista-anamnesi.js";
import { riempiRischioStrutturale, riempiStressArticolazioni } from "../comune/vista-reds.js";

function cerca(radice, sel) {
  const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(sel || "");
  if (!m) return null;
  const dentro = (n) => {
    const figli = n.figli || [];
    for (let i = 0; i < figli.length; i += 1) {
      const f = figli[i];
      if (!f || !f.attributi) continue;
      if (Object.prototype.hasOwnProperty.call(f.attributi, m[1])
        && (m[2] === undefined || f.attributi[m[1]] === m[2])) return f;
      const t = dentro(f);
      if (t) return t;
    }
    return null;
  };
  return dentro(radice);
}

function nodo(tag) {
  return {
    tagName: tag, className: "", style: {}, attributi: {}, figli: [], testo: "", value: "", disabled: false,
    appendChild(f) { this.figli.push(f); return f; },
    removeChild(f) { this.figli = this.figli.filter((x) => x !== f); return f; },
    setAttribute(k, v) { this.attributi[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributi, k) ? this.attributi[k] : null; },
    querySelector(sel) { return cerca(this, sel); },
    querySelectorAll(sel) {
      if (sel === ".dc-warn") return this.figli.filter((f) => String(f.className || "").split(" ").indexOf("dc-warn") !== -1);
      return [];
    },
    get children() { return this.figli; },
    get firstChild() { return this.figli.length ? this.figli[0] : null; },
    get firstElementChild() { return this.figli.length ? this.figli[0] : null; },
    get title() { return this.attributi.title || ""; },
    set title(v) { this.attributi.title = String(v); },
    get textContent() {
      return this.testo + this.figli.map((f) => (f && typeof f.textContent === "string" ? f.textContent : "")).join("");
    },
    set textContent(v) { this.testo = String(v); this.figli = []; }
  };
}

function paginaAnamnesi() {
  const pannello = nodo("div");
  pannello.className = "dc-pan";
  pannello.setAttribute("data-pan", "anamnesi");
  const warn = nodo("div");
  warn.className = "dc-warn";
  const riga = nodo("div");
  const b = nodo("b");
  b.textContent = "Patologie o infortuni";
  const span = nodo("span");
  span.textContent = "\u2014";
  riga.appendChild(b);
  riga.appendChild(span);
  const altra = nodo("div");
  const b2 = nodo("b");
  b2.textContent = "Intolleranze / allergie";
  altra.appendChild(b2);
  warn.appendChild(riga);
  warn.appendChild(altra);
  pannello.appendChild(warn);
  const doc = {
    activeElement: null,
    createElement: (tag) => nodo(tag),
    createTextNode: (t) => ({ textContent: String(t) }),
    querySelectorAll(sel) {
      if (sel === "[data-pan]" || sel === "[data-pan=\"anamnesi\"]") return [pannello];
      return [];
    },
    querySelector(sel) { return sel === "[data-pan=\"anamnesi\"]" ? pannello : null; }
  };
  return { doc, pannello, riga };
}

function voce(idVoce, quando, prima, dopo, versionePrima) {
  return {
    id: idVoce,
    dati: {
      idVoce: idVoce, quando: quando, tipo: "dichiarazione-anamnesi", campo: "anamnesi-lite",
      prima: prima, dopo: dopo, versionePrima: versionePrima, versioneDopo: versionePrima + 1
    }
  };
}

test("143.1 «lombalgia cronica, fastidio al ginocchio destro»: lombare + ginocchio", () => {
  const r = riconosciArticolazioni("lombalgia cronica, fastidio al ginocchio destro");
  assert.deepEqual(r.articolazioni, ["ginocchio", "colonna lombare"], "nell'ordine delle tolleranze");
  assert.deepEqual(r.nonRiconosciute, []);
  assert.equal(r.vuoto, false);
});

test("143.2 le altre articolazioni, le frasi non capite e il collo", () => {
  const r = riconosciArticolazioni("Spalle contratte. Polso destro: tunnel carpale. Anche sinistra fastidio. Collo rigido. Un po' di stanchezza generale.");
  assert.ok(r.articolazioni.indexOf("spalla") !== -1);
  assert.ok(r.articolazioni.indexOf("polso") !== -1);
  assert.ok(r.articolazioni.indexOf("anca") !== -1, "«anche sinistra» vuol dire anca");
  assert.ok(r.collo.indexOf("collo") !== -1, "il collo si riconosce ma non e' un'articolazione");
  assert.ok(r.nonRiconosciute.some((f) => /stanchezza/.test(f)));
  assert.deepEqual(riconosciArticolazioni("mi fa male anche il ginocchio").articolazioni, ["ginocchio"]);
  assert.equal(ARTICOLAZIONI.length, 8);
});

test("143.3 dal registro: l'ultima dichiarazione che nessuno ha annullato", () => {
  const registro = [
    voce("mod-a", "2026-11-21T10:00:00.000Z", "", "lombalgia", 0),
    voce("mod-b", "2026-11-22T10:00:00.000Z", "lombalgia", "lombalgia e ginocchio", 1)
  ];
  const d = dichiarazioneDalRegistro(registro);
  assert.equal(d.presente, true);
  assert.equal(d.testo, "lombalgia e ginocchio");
  assert.equal(d.versione, 2);
  assert.equal(d.idVoce, "mod-b");

  /* l'annullamento cita mod-b: torna la dichiarazione precedente */
  registro.push({ dati: { idVoce: "mod-c", quando: "2026-11-22T11:00:00.000Z", tipo: "annulla-modifica", campo: "anamnesi-lite", annullaDi: "mod-b" } });
  const dopo = dichiarazioneDalRegistro(registro);
  assert.equal(dopo.testo, "lombalgia", "torna il dopo della dichiarazione precedente");
  assert.equal(dopo.idVoce, "mod-a");

  /* registro illeggibile: errore, non «non dichiarato» */
  const guasto = dichiarazioneDalRegistro(null);
  assert.equal(guasto.presente, false);
  assert.ok(guasto.errore, "il registro non letto porta un errore");
  assert.equal(testoDichiarazione(guasto), NON_DICHIARATO, "a schermo resta «non dichiarato» solo con un documento letto e vuoto");
  assert.equal(dichiarazioneDalRegistro([]).errore, null, "un registro vuoto e' letto: nessun errore");
  assert.equal(dichiarazioneDalRegistro([]).presente, false);
});

test("143.4 salva = una voce con prima, dopo e le due versioni", () => {
  const prima = dichiarazioneDalRegistro([voce("mod-a", "2026-11-21T10:00:00.000Z", "", "lombalgia", 0)]);
  const esito = salvaAnamnesi(prima, "lombalgia e ginocchio destro", { quando: "2026-11-23T15:04:00.000Z" });
  assert.equal(esito.ok, true);
  assert.equal(esito.voce.tipo, "dichiarazione-anamnesi");
  assert.equal(esito.voce.campo, "anamnesi-lite");
  assert.equal(esito.voce.prima, "lombalgia");
  assert.equal(esito.voce.dopo, "lombalgia e ginocchio destro");
  assert.equal(esito.voce.versionePrima, 1);
  assert.equal(esito.voce.versioneDopo, 2);
  assert.deepEqual(esito.voce.articolazioni, ["ginocchio", "colonna lombare"]);

  const fermo = salvaAnamnesi(prima, "lombalgia");
  assert.equal(fermo.ok, false, "testo identico: non si scrive");
  const vecchia = salvaAnamnesi(prima, "altro", { versioneAttesa: 5 });
  assert.equal(vecchia.ok, false, "versione attesa sbagliata: non si scrive");
  assert.ok(/cambiata nel frattempo/.test(vecchia.motivo), vecchia.motivo);
});

test("143.5 Annulla: una voce che cita la sua e rimette il testo di prima", () => {
  const registro = [
    voce("mod-a", "2026-11-21T10:00:00.000Z", "", "lombalgia", 0),
    voce("mod-b", "2026-11-22T10:00:00.000Z", "lombalgia", "lombalgia e ginocchio", 1)
  ];
  const dich = dichiarazioneDalRegistro(registro);
  const esito = annullaAnamnesi(dich, { quando: "2026-11-23T15:10:00.000Z" });
  assert.equal(esito.ok, true);
  assert.equal(esito.voce.tipo, "annulla-modifica");
  assert.equal(esito.voce.annullaDi, "mod-b");
  assert.equal(esito.voce.dopo, "lombalgia");
  assert.equal(esito.voce.versionePrima, 2);
  assert.equal(esito.voce.versioneDopo, 3);
  registro.push({ dati: esito.voce });
  assert.equal(dichiarazioneDalRegistro(registro).testo, "lombalgia");
  assert.equal(annullaAnamnesi(dichiarazioneDalRegistro([])).ok, false, "senza dichiarazione non c'e' niente da annullare");
});

test("143.6 il campo: esito sempre presente, Salva spento quando il testo e' identico", () => {
  const { doc, riga } = paginaAnamnesi();
  let salvato = null;
  montaCampoAnamnesi(doc, null, { onSalva: (t) => { salvato = t; } });
  const area = riga.querySelector("[data-anamnesi=\"area\"]");
  const salva = riga.querySelector("[data-anamnesi=\"salva\"]");
  const nota = riga.querySelector("[data-anamnesi=\"nota\"]");
  assert.ok(area && salva && nota, "area, Salva e la riga d'esito ci sono");
  assert.equal(nota.textContent, "non dichiarato", "senza dichiarazione la riga dice «non dichiarato»");
  assert.equal(salva.disabled, true, "Salva spento: non c'e' niente da salvare");

  area.value = "ginocchio destro";
  area.oninput();
  assert.equal(salva.disabled, false, "con testo nuovo Salva si accende");
  area.oninput();
  salva.onclick();
  assert.equal(salvato, "ginocchio destro");
});

test("143.7 la riga mostra l'esito ricevuto e non lo perde al ridisegno", () => {
  const { doc, riga } = paginaAnamnesi();
  const dich = { presente: true, testo: "lombalgia", aggiornato: "2026-11-23T14:04:00.000Z", versione: 2 };
  montaCampoAnamnesi(doc, dich, { token: 1, esito: { tipo: "salvato", quando: "2026-11-23T14:04:00.000Z" } });
  const nota = riga.querySelector("[data-anamnesi=\"nota\"]");
  assert.equal(nota.textContent, "Salvato alle 14:04");
  assert.equal(oraBreve("2026-11-23T14:04:00.000Z"), "14:04");

  /* ridisegno con lo stesso token: l'esito resta */
  montaCampoAnamnesi(doc, dich, { token: 1, esito: null });
  assert.equal(riga.querySelector("[data-anamnesi=\"nota\"]").textContent, "Salvato alle 14:04");

  /* errore di scrittura: sta accanto al campo */
  montaCampoAnamnesi(doc, dich, { token: 2, esito: { tipo: "errore", motivo: "permission-denied: negato" } });
  assert.equal(riga.querySelector("[data-anamnesi=\"nota\"]").textContent, "Non ho salvato: permission-denied: negato");

  /* lettura fallita: lo dice, non «non dichiarato» */
  montaCampoAnamnesi(doc, null, { token: 3, erroreLettura: "permission-denied: negato" });
  const testo = riga.querySelector("[data-anamnesi=\"nota\"]").textContent;
  assert.ok(/^Non ho potuto leggere la dichiarazione: permission-denied/.test(testo), testo);
  assert.ok(testo.indexOf("non dichiarato") === -1, "non deve mai dire «non dichiarato» se la lettura e' fallita");
  assert.equal(riga.querySelector("[data-anamnesi=\"salva\"]").disabled, true);
});

test("143.8 campo vuoto: «non dichiarato», mai un elenco travestito", () => {
  assert.equal(testoDichiarazione(null), NON_DICHIARATO);
  assert.equal(testoDichiarazione({ presente: true, testo: "" }), NON_DICHIARATO);
  assert.equal(fraseArticolazioniDaAnamnesi(null), NON_DICHIARATO);
  assert.ok(/ginocchio/.test(fraseArticolazioniDaAnamnesi({ presente: true, testo: "ginocchio destro" })));
});

/* ---------- le due carte ---------- */
function paginaCarte() {
  const reds = nodo("article");
  reds.className = "ck-card ck-red";
  const classifica = nodo("div");
  classifica.setAttribute("data-reds-classifica", "");
  ["num", "stato", "piu", "nota"].forEach((k) => {
    const s = nodo("span");
    s.setAttribute("data-reds-" + k, "");
    reds.appendChild(s);
  });
  reds.appendChild(classifica);
  const stress = nodo("article");
  stress.className = "ck-card ck-st";
  const righe = nodo("div");
  righe.setAttribute("data-stress-righe", "");
  const nota = nodo("p");
  nota.setAttribute("data-stress-nota", "");
  stress.appendChild(righe);
  stress.appendChild(nota);
  const doc = {
    activeElement: null,
    createElement: (tag) => nodo(tag),
    createTextNode: (t) => ({ textContent: String(t) }),
    querySelector(sel) {
      if (sel === "#pag-dashboard .ck-red") return reds;
      if (sel === "#pag-dashboard .ck-st") return stress;
      return null;
    }
  };
  return { doc, reds, stress };
}

const RIEPILOGO = {
  leggibile: true, righeContate: 4,
  classifica: [
    { articolazione: "colonna lombare", massimo: 10, tolleranza: 18, sopraCento: false, percentuale: 55 },
    { articolazione: "ginocchio", massimo: 4, tolleranza: 22, sopraCento: false, percentuale: 18 }
  ],
  piuCaricata: { articolazione: "colonna lombare", massimo: 10 },
  sopraCento: [], tutteAZero: false
};

test("143.9 le articolazioni riconosciute portano il segno nelle due carte", () => {
  const { doc, stress, reds } = paginaCarte();
  const dich = dichiarazioneDalRegistro([voce("mod-a", "2026-11-23T10:00:00.000Z", "", "lombalgia cronica", 0)]);
  const riconosciute = riconosciArticolazioni(dich.testo).articolazioni;
  riempiStressArticolazioni(doc, RIEPILOGO, { dichiarate: riconosciute, schede: [], calcolo: null });
  riempiRischioStrutturale(doc, [], { dichiarate: riconosciute });
  const riga = stress.querySelector("[data-stress-r=\"colonna lombare\"]");
  assert.ok(riga.textContent.indexOf("dichiarata") !== -1, "il segno c'e': " + riga.textContent);
  const ginocchio = stress.querySelector("[data-stress-r=\"ginocchio\"]");
  assert.ok(ginocchio.textContent.indexOf("dichiarata") === -1, "chi non e' nel testo non porta segni");
  assert.ok(stress.textContent.indexOf("dichiarate in anamnesi") !== -1);
  assert.ok(reds.textContent.indexOf("dichiarate in anamnesi") !== -1);
});

test("143.10 anamnesi non dichiarata: le carte lo dicono, nessun segno", () => {
  const { doc, stress, reds } = paginaCarte();
  riempiStressArticolazioni(doc, RIEPILOGO, { dichiarate: [], schede: [], calcolo: null });
  riempiRischioStrutturale(doc, [], { dichiarate: [] });
  assert.ok(stress.textContent.indexOf("non dichiarato") !== -1, stress.textContent);
  assert.ok(reds.textContent.indexOf("non dichiarato") !== -1, reds.textContent);
  assert.ok(stress.querySelector("[data-stress-r=\"colonna lombare\"]").textContent.indexOf("dichiarata") === -1);
});
