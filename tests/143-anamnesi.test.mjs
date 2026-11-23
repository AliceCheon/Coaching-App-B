/* Passo 14 (versione semplice) — «Patologie o infortuni» si scrive a parole.
 *
 * Tre cose che devono restare vere:
 *  1. la scrittura: UNA voce di registro con prima e dopo (testo), l'Annulla
 *     rimette il testo di prima con una voce che cita la sua, la versione
 *     avanza e il confronto di versione si vede nella voce;
 *  2. il riconoscimento: «lombalgia cronica, fastidio al ginocchio destro» da'
 *     colonna lombare + ginocchio, e le frasi non capite si riportano;
 *  3. la pagina vera: il campo c'e', Salva chiama la scrittura, Annulla
 *     riporta il testo di prima, e le articolazioni riconosciute portano il
 *     segno «dichiarata» nelle due carte; campo vuoto = «non dichiarato».
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  riconosciArticolazioni, salvaAnamnesi, annullaAnamnesi, ultimaVoceAnamnesi,
  ARTICOLAZIONI, NON_DICHIARATO, testoAnamnesi, fraseArticolazioniDaAnamnesi
} from "../comune/anamnesi-b.js";
import { montaCampoAnamnesi } from "../comune/vista-anamnesi.js";
import { leggiZonaBCompleta } from "../comune/lettura-b.js";
import { riempiRischioStrutturale, riempiStressArticolazioni } from "../comune/vista-reds.js";

/* ---------- un DOM minimo, con i selettori che servono ---------- */
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
    tagName: tag, className: "", style: {}, attributi: {}, figli: [], testo: "", value: "",
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

/* Il pannello Anamnesi come lo trova la vista: .dc-pan[data-pan="anamnesi"]
 * con dentro il riquadro .dc-warn e la riga «Patologie o infortuni». */
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
      if (sel === "[data-pan]") return [pannello];
      if (sel === "[data-pan=\"anamnesi\"]") return [pannello];
      return [];
    },
    querySelector(sel) {
      if (sel === "[data-pan=\"anamnesi\"]") return pannello;
      return null;
    }
  };
  return { doc, pannello, riga, altra };
}

function contaClasse(n, classe) {
  let quanti = 0;
  if (String(n.className || "").split(" ").indexOf(classe) !== -1) quanti += 1;
  (n.figli || []).forEach((f) => { quanti += contaClasse(f, classe); });
  return quanti;
}

/* ---------- 1. la scrittura ---------- */
test("143.1 salva = una voce di registro, con prima e dopo", () => {
  const primo = salvaAnamnesi(null, "lombalgia cronica", { quando: "2026-11-23T15:10:00Z" });
  assert.equal(primo.ok, true);
  assert.equal(primo.documento.testo, "lombalgia cronica");
  assert.equal(primo.documento.versione, 1);
  assert.equal(primo.voce.tipo, "anamnesi-lite");
  assert.equal(primo.voce.campo, "anamnesi-lite");
  assert.equal(primo.voce.prima, "");
  assert.equal(primo.voce.dopo, "lombalgia cronica");
  assert.deepEqual(primo.voce.articolazioni, ["colonna lombare"]);

  const secondo = salvaAnamnesi(primo.documento, "lombalgia cronica e ginocchio destro", { quando: "2026-11-23T15:20:00Z" });
  assert.equal(secondo.documento.versione, 2);
  assert.equal(secondo.voce.prima, "lombalgia cronica");
  assert.equal(secondo.voce.versionePrima, 1);
  assert.equal(secondo.voce.versioneDopo, 2);
  assert.deepEqual(secondo.documento.testo, "lombalgia cronica e ginocchio destro");

  /* niente da scrivere se il testo non e' cambiato */
  const fermo = salvaAnamnesi(secondo.documento, "lombalgia cronica e ginocchio destro");
  assert.equal(fermo.ok, false);
  assert.ok(/non e' cambiato/.test(fermo.motivo), fermo.motivo);
});

test("143.2 l'Annulla rimette il testo di prima, con una voce che la cita", () => {
  const salvato = salvaAnamnesi({ testo: "spalla destra", aggiornato: "2026-11-20T09:00:00Z", versione: 4 }, "spalla destra e collo", { quando: "2026-11-23T15:30:00Z" });
  assert.equal(salvato.documento.versione, 5);
  const indietro = annullaAnamnesi(salvato.documento, salvato.voce, { quando: "2026-11-23T15:40:00Z" });
  assert.equal(indietro.ok, true);
  assert.equal(indietro.documento.testo, "spalla destra", "torna il testo di prima");
  assert.equal(indietro.documento.versione, 6, "la versione avanza, non torna indietro");
  assert.equal(indietro.voce.tipo, "annulla-modifica");
  assert.equal(indietro.voce.annullaDi, salvato.voce.idVoce);
  assert.equal(indietro.voce.versionePrima, 5);
});

test("143.3 l'ultima dichiarazione salvata e' quella con la data piu' avanti", () => {
  const registro = [
    { dati: { campo: "anamnesi-lite", tipo: "anamnesi-lite", quando: "2026-11-21T10:00:00Z", idVoce: "a" } },
    { dati: { campo: "serie", tipo: "modifica-rec-tut", quando: "2026-11-22T10:00:00Z", idVoce: "b" } },
    { dati: { campo: "anamnesi-lite", tipo: "anamnesi-lite", quando: "2026-11-23T10:00:00Z", idVoce: "c" } },
    { dati: { campo: "anamnesi-lite", tipo: "annulla-modifica", quando: "2026-11-23T11:00:00Z", idVoce: "d" } }
  ];
  assert.equal(ultimaVoceAnamnesi(registro).idVoce, "c");
  assert.equal(ultimaVoceAnamnesi([]), null);
});

/* ---------- 2. il riconoscimento ---------- */
test("143.4 «lombalgia cronica, fastidio al ginocchio destro»: lombare + ginocchio", () => {
  const r = riconosciArticolazioni("lombalgia cronica, fastidio al ginocchio destro");
  /* l'ordine e' quello delle tolleranze: spalla, gomito, polso, anca,
   * ginocchio, caviglia, lombare, toracica */
  assert.deepEqual(r.articolazioni, ["ginocchio", "colonna lombare"], "nell'ordine delle tolleranze");
  assert.deepEqual(r.nonRiconosciute, [], "tutte e due le frasi sono state capite");
  assert.equal(r.vuoto, false);
});

test("143.5 le altre articolazioni, le frasi non capite e il collo", () => {
  const r = riconosciArticolazioni("Spalle contratte. Polso destro: tunnel carpale. Anche sinistra fastidio. Collo rigido. Un po' di stanchezza generale.");
  assert.ok(r.articolazioni.indexOf("spalla") !== -1, "spalle -> spalla");
  assert.ok(r.articolazioni.indexOf("polso") !== -1);
  assert.ok(r.articolazioni.indexOf("anca") !== -1, "«anche sinistra» vuol dire anca");
  assert.ok(r.collo.indexOf("collo") !== -1, "il collo si riconosce ma non e' un'articolazione");
  assert.equal(r.articolazioni.indexOf("colonna lombare"), -1, "il collo non e' la lombare");
  assert.ok(r.nonRiconosciute.some((f) => /stanchezza/.test(f)), "la frase non capita si riporta: " + r.nonRiconosciute.join(" | "));

  /* «anche» come parola italiana non deve segnare l'anca */
  const falso = riconosciArticolazioni("mi fa male anche il ginocchio");
  assert.deepEqual(falso.articolazioni, ["ginocchio"], "«anche» qui vuol dire «also»");
});

test("143.6 campo vuoto o assente: «non dichiarato», mai un elenco vuoto travestito", () => {
  assert.equal(testoAnamnesi(null), NON_DICHIARATO);
  assert.equal(testoAnamnesi({ testo: "", versione: 2 }), NON_DICHIARATO);
  assert.equal(fraseArticolazioniDaAnamnesi(null), NON_DICHIARATO);
  assert.equal(riconosciArticolazioni("").articolazioni.length, 0);
  assert.equal(riconosciArticolazioni("").vuoto, true);
  const scritto = fraseArticolazioniDaAnamnesi({ testo: "ginocchio destro", versione: 1 });
  assert.ok(/ginocchio/.test(scritto), scritto);
  assert.equal(ARTICOLAZIONI.length, 8);
});

/* ---------- 3. la lettura della zona ---------- */
function dbFinto(anamnesi) {
  const documento = (esiste, dati) => ({ get: async () => ({ exists: esiste, data: () => dati }) });
  const raccolta = () => ({
    get: async () => ({ docs: [] }),
    doc: (id) => (anamnesi && id === "uid-1" ? documento(true, anamnesi) : documento(false, null))
  });
  return { collection: () => ({ doc: () => ({ get: async () => ({ exists: false }), collection: () => raccolta() }) }) };
}

test("143.7 senza documento la zona dice anamnesiPresente: false", async () => {
  const vuota = await leggiZonaBCompleta(dbFinto(null), "uid-1");
  assert.equal(vuota.anamnesiPresente, false);
  assert.equal(vuota.anamnesi, null);

  const piena = await leggiZonaBCompleta(dbFinto({ testo: "lombalgia", aggiornato: "2026-11-22T09:00:00Z", versione: 3 }), "uid-1");
  assert.equal(piena.anamnesiPresente, true);
  assert.equal(piena.anamnesi.testo, "lombalgia");
});

/* ---------- 4. la pagina vera ---------- */
test("143.8 il campo c'e', Salva scrive e Annulla rimette il testo di prima", () => {
  const { doc, riga } = paginaAnamnesi();
  let salvato = null;
  let annullato = 0;
  montaCampoAnamnesi(doc, null, { onSalva: (t) => { salvato = t; }, onAnnulla: () => { annullato += 1; } });

  const area = riga.querySelector("[data-anamnesi=\"area\"]");
  assert.ok(area, "l'area di testo e' montata dentro la riga «Patologie o infortuni»");
  assert.equal(area.value, "", "senza documento il campo e' vuoto, non un trattino");
  const salva = riga.querySelector("[data-anamnesi=\"salva\"]");
  const annulla = riga.querySelector("[data-anamnesi=\"annulla\"]");
  assert.ok(salva && annulla, "ci sono Salva e Annulla");

  area.value = "lombalgia cronica, fastidio al ginocchio destro";
  salva.onclick();
  assert.equal(salvato, "lombalgia cronica, fastidio al ginocchio destro", "Salva passa il testo scritto");

  /* dopo il salvataggio la pagina rilegge: il campo si riempie e la nota dice cosa ha capito */
  doc.activeElement = null;
  montaCampoAnamnesi(doc, { testo: "lombalgia cronica, fastidio al ginocchio destro", aggiornato: "2026-11-23T15:00:00Z", versione: 1 }, {});
  const nota = riga.querySelector("[data-anamnesi=\"nota\"]");
  assert.ok(/colonna lombare/.test(nota.textContent), nota.textContent);
  assert.ok(/ginocchio/.test(nota.textContent), nota.textContent);

  annulla.onclick();
  assert.equal(annullato, 1, "Annulla chiama la scrittura di annullamento");
  assert.equal(area.value, "lombalgia cronica, fastidio al ginocchio destro", "e il campo torna al testo di prima");

  /* il resto dell'anamnesi non si tocca */
  assert.ok(riga.textContent.indexOf("Patologie o infortuni") !== -1);
});

test("143.9 campo vuoto: la nota dice «non dichiarato»", () => {
  const { doc, riga } = paginaAnamnesi();
  montaCampoAnamnesi(doc, null, {});
  const nota = riga.querySelector("[data-anamnesi=\"nota\"]");
  assert.equal(nota.textContent, NON_DICHIARATO);
});

/* ---------- 5. le due carte ---------- */
function paginaCarte() {
  const reds = nodo("article");
  reds.className = "ck-card ck-red";
  const classificaReds = nodo("div");
  classificaReds.setAttribute("data-reds-classifica", "");
  ["num", "stato", "piu", "nota"].forEach((k) => {
    const s = nodo("span");
    s.setAttribute("data-reds-" + k, "");
    reds.appendChild(s);
  });
  reds.appendChild(classificaReds);
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

/* Una scheda normalizzata come quelle che la zona B consegna alle carte. */
const SCHEDE = [{
  codice: "A",
  esercizi: [
    { id: "e1", n: "Panca piana", muscolo: "Pettorali", contaVolume: true, prescrizione: { settimane: 1, elencoSettimane: [{ settimana: 1, serie: 5, ripetizioni: 8 }] } },
    { id: "e2", n: "Stacco da terra", muscolo: "Dorsali", contaVolume: true, prescrizione: { settimane: 1, elencoSettimane: [{ settimana: 1, serie: 5, ripetizioni: 5 }] } }
  ]
}];

function riempiCarte(dichiarate) {
  const { doc, reds, stress } = paginaCarte();
  const riepilogo = riempiRischioStrutturale(doc, SCHEDE, { dichiarate: dichiarate });
  riempiStressArticolazioni(doc, riepilogo, { dichiarate: dichiarate, schede: SCHEDE, calcolo: null });
  return { doc, reds, stress, riepilogo };
}

test("143.10 le articolazioni riconosciute portano il segno, e la carta dice da dove viene", () => {
  const { doc, stress, reds } = paginaCarte();
  const riepilogo = {
    leggibile: true, righeContate: 4,
    classifica: [
      { articolazione: "colonna lombare", massimo: 10, tolleranza: 18, sopraCento: false, percentuale: 55 },
      { articolazione: "ginocchio", massimo: 4, tolleranza: 22, sopraCento: false, percentuale: 18 }
    ],
    piuCaricata: { articolazione: "colonna lombare", massimo: 10 },
    sopraCento: [], tutteAZero: false
  };
  riempiStressArticolazioni(doc, riepilogo, { dichiarate: ["colonna lombare"], schede: [], calcolo: null });
  const riga = stress.querySelector("[data-stress-r=\"colonna lombare\"]");
  assert.ok(riga, "la riga della lombare c'e'");
  assert.ok(riga.textContent.indexOf("dichiarata") !== -1, "il segno c'e': " + riga.textContent);
  const ginocchio = stress.querySelector("[data-stress-r=\"ginocchio\"]");
  assert.ok(ginocchio.textContent.indexOf("dichiarata") === -1, "chi non e' nel testo non porta segni");
  assert.ok(stress.textContent.indexOf("dichiarate in anamnesi") !== -1, "la carta dice da dove viene: " + stress.textContent);

  /* la carta RED-S: la nota c'e' anche quando non riesce a calcolare */
  riempiRischioStrutturale(doc, [], { dichiarate: ["colonna lombare"] });
  assert.ok(reds.textContent.indexOf("dichiarate in anamnesi") !== -1, "RED-S: " + reds.textContent);
});

test("143.11 anamnesi vuota: le carte dicono «non dichiarato» e nessun segno", () => {
  const { doc, stress, reds } = paginaCarte();
  const riepilogo = {
    leggibile: true, righeContate: 2,
    classifica: [{ articolazione: "ginocchio", massimo: 4, tolleranza: 22, sopraCento: false, percentuale: 18 }],
    piuCaricata: { articolazione: "ginocchio", massimo: 4 }, sopraCento: [], tutteAZero: false
  };
  riempiStressArticolazioni(doc, riepilogo, { dichiarate: [], schede: [], calcolo: null });
  riempiRischioStrutturale(doc, [], { dichiarate: [] });
  assert.equal(contaClasse(stress, "ck-dol-p"), 0);
  assert.ok(stress.textContent.indexOf("non dichiarato") !== -1, "Stress: " + stress.textContent);
  assert.ok(reds.textContent.indexOf("non dichiarato") !== -1, "RED-S: " + reds.textContent);
});
