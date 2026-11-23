/* Passo 14 — «Dove ti fa male»: si dichiara con un tasto, e la carta Stress lo sa.
 *
 * Tre cose che devono restare vere:
 *  1. una dichiarazione = UNA voce di registro, con prima e dopo, e l'Annulla
 *     rimette l'elenco di prima (non cancella la voce: ne aggiunge una);
 *  2. se il documento non c'e' la zona dice doloriPresente: false, non un
 *     elenco vuoto travestito da dato;
 *  3. sulla pagina vera il tocco scrive subito (chiama onCambia) e le
 *     articolazioni dichiarate portano la pillola «dichiarata», anche quando
 *     sono sopra soglia e restano rosse.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  dichiarazioneDolori, annullaDolori, normalizzaDolori, ARTICOLAZIONI, NON_DICHIARATO
} from "../comune/dolori-b.js";
import { leggiZonaBCompleta } from "../comune/lettura-b.js";
import { riempiDoloriArticolazioni, riempiStressArticolazioni } from "../comune/vista-reds.js";

/* ---- un DOM minimo, con querySelector per i selettori che servono ---- */
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
    tagName: tag, className: "", style: {}, attributi: {}, figli: [], testo: "",
    appendChild(f) { this.figli.push(f); return f; },
    removeChild(f) { this.figli = this.figli.filter((x) => x !== f); return f; },
    setAttribute(k, v) { this.attributi[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributi, k) ? this.attributi[k] : null; },
    querySelector(sel) { return cerca(this, sel); },
    querySelectorAll() { return []; },
    get firstChild() { return this.figli.length ? this.figli[0] : null; },
    get title() { return this.attributi.title || ""; },
    set title(v) { this.attributi.title = String(v); },
    get textContent() {
      return this.testo + this.figli.map((f) => (f && typeof f.textContent === "string" ? f.textContent : "")).join("");
    },
    set textContent(v) { this.testo = String(v); this.figli = []; }
  };
}

function pagina() {
  const carta = nodo("article");
  carta.className = "ck-card ck-st";
  const righe = nodo("div");
  righe.setAttribute("data-stress-righe", "");
  const nota = nodo("p");
  nota.setAttribute("data-stress-nota", "");
  carta.appendChild(righe);
  carta.appendChild(nota);
  const doc = {
    createElement: (tag) => nodo(tag),
    createTextNode: (t) => ({ textContent: String(t) }),
    querySelector(sel) { return sel === "#pag-dashboard .ck-st" ? carta : null; }
  };
  return { doc, carta, righe, nota };
}

function contaClasse(n, classe) {
  let quanti = 0;
  if (String(n.className || "").split(" ").indexOf(classe) !== -1) quanti += 1;
  (n.figli || []).forEach((f) => { quanti += contaClasse(f, classe); });
  return quanti;
}

/* ---- la scrittura ---- */
test("142.1 un tocco = una voce di registro, con prima e dopo", () => {
  const primo = dichiarazioneDolori(null, "spalla");
  assert.equal(primo.ok, true);
  assert.deepEqual(primo.documento.articolazioni, ["spalla"]);
  assert.equal(primo.documento.versione, 1);
  assert.equal(typeof primo.documento.aggiornato, "string");
  assert.equal(primo.voce.tipo, "dichiarazione-dolori");
  assert.equal(primo.voce.campo, "dolori");
  assert.deepEqual(primo.voce.prima, []);
  assert.deepEqual(primo.voce.dopo, ["spalla"]);

  const secondo = dichiarazioneDolori(primo.documento, "ginocchio");
  assert.deepEqual(secondo.documento.articolazioni, ["spalla", "ginocchio"], "l'ordine e' quello delle tolleranze");
  assert.equal(secondo.documento.versione, 2);
  assert.deepEqual(secondo.voce.prima, ["spalla"]);
  assert.deepEqual(secondo.voce.dopo, ["spalla", "ginocchio"]);

  const spento = dichiarazioneDolori(secondo.documento, "spalla");
  assert.deepEqual(spento.documento.articolazioni, ["ginocchio"]);
  assert.equal(spento.voce.versionePrima, 2);
  assert.equal(spento.voce.versioneDopo, 3);
});

test("142.2 l'Annulla rimette il valore di prima, con una voce che cita la sua", () => {
  const dichiarata = dichiarazioneDolori({ articolazioni: ["spalla"], aggiornato: "2026-11-20T10:00:00Z", versione: 4 }, "spalla");
  assert.deepEqual(dichiarata.documento.articolazioni, []);
  const indietro = annullaDolori(dichiarata.documento, dichiarata.voce, { quando: "2026-11-23T15:00:00Z" });
  assert.equal(indietro.ok, true);
  assert.deepEqual(indietro.documento.articolazioni, ["spalla"], "torna l'elenco di prima");
  assert.equal(indietro.documento.versione, 6, "la versione avanza: non si torna indietro nel conto");
  assert.equal(indietro.voce.tipo, "annulla-modifica");
  assert.equal(indietro.voce.annullaDi, dichiarata.voce.idVoce);
});

test("142.3 il controllo di versione e le articolazioni che non esistono", () => {
  const a = dichiarazioneDolori({ articolazioni: ["anca", "polso"], aggiornato: "x", versione: 7 }, "anca");
  assert.equal(a.voce.versionePrima, 7);
  assert.equal(a.voce.versioneDopo, 8);
  assert.equal(a.documento.versione, 8);
  const no = dichiarazioneDolori(null, "collo");
  assert.equal(no.ok, false);
  assert.ok(/non e' una delle otto/.test(no.motivo), no.motivo);
  assert.equal(normalizzaDolori(null).presente, false);
  assert.equal(normalizzaDolori(null).articolazioni.length, 0);
  assert.equal(ARTICOLAZIONI.length, 8);
});

/* ---- la lettura ---- */
function dbFinto(dolori) {
  const documento = (esiste, dati) => ({
    get: async () => ({ exists: esiste, data: () => dati }),
    set: async () => ({}),
    collection: () => raccolta()
  });
  const raccolta = () => ({
    get: async () => ({ docs: [] }),
    doc: (id) => dbFinto.documenti[id] || documento(false, null)
  });
  /* il documento si chiama come l'atleta: dolori/{uid} */
  dbFinto.documenti = dolori ? { "uid-1": documento(true, dolori) } : {};
  return { collection: () => ({ doc: () => ({ get: async () => ({ exists: false }), collection: () => raccolta() }) }) };
}

test("142.4 senza documento la zona dice doloriPresente: false", async () => {
  const vuota = await leggiZonaBCompleta(dbFinto(null), "uid-1");
  assert.equal(vuota.doloriPresente, false);
  assert.equal(vuota.dolori, null);

  const piena = await leggiZonaBCompleta(dbFinto({ articolazioni: ["spalla"], aggiornato: "2026-11-22T09:00:00Z", versione: 3 }), "uid-1");
  assert.equal(piena.doloriPresente, true);
  assert.deepEqual(piena.dolori.articolazioni, ["spalla"]);
});

/* ---- la pagina vera ---- */
test("142.5 la riga si dichiara, il tocco salva subito e il segno si vede", () => {
  const { doc, carta } = pagina();
  let toccata = "";
  const prima = riempiDoloriArticolazioni(doc, null, { onCambia: (a) => { toccata = a; } });
  assert.equal(prima.presente, false);
  const testoPrima = carta.textContent;
  assert.ok(testoPrima.indexOf("Dove ti fa male") !== -1, testoPrima);
  assert.ok(testoPrima.indexOf("non dichiarato") !== -1, testoPrima);
  assert.equal(contaClasse(carta, "ck-dol-b"), 8, "le otto articolazioni sono bottoni");
  assert.equal(contaClasse(carta, "ck-dol-p"), 0, "senza dichiarazione nessun segno");
  const bottone = carta.querySelector('[data-dolore="spalla"]');
  assert.ok(bottone, "il bottone della spalla c'e'");
  bottone.onclick();
  assert.equal(toccata, "spalla", "il tocco chiama la scrittura, subito");

  /* salvataggio simulato: la pagina rilegge e il segno compare */
  const salvato = dichiarazioneDolori(null, "spalla", { quando: "2026-11-23T14:00:00Z" });
  const dopo = riempiDoloriArticolazioni(doc, salvato.documento, { onCambia: () => {} });
  assert.deepEqual(dopo.articolazioni, ["spalla"]);
  assert.equal(contaClasse(carta, "ck-dol-p"), 1, "una sola pillola «dichiarata»");
  assert.ok(carta.textContent.indexOf("dichiarata") !== -1);
  const acceso = carta.querySelector('[data-dolore="spalla"]');
  assert.equal(acceso.getAttribute("aria-pressed"), "true");
});

test("142.6 sopra soglia resta rosso e il segno resta", () => {
  const { doc, carta } = pagina();
  const riepilogo = {
    leggibile: true,
    righeContate: 4,
    classifica: [
      { articolazione: "spalla", massimo: 26, tolleranza: 20, sopraCento: true, percentuale: 130 },
      { articolazione: "anca", massimo: 10, tolleranza: 22, sopraCento: false, percentuale: 45 }
    ],
    piuCaricata: { articolazione: "spalla", massimo: 26 },
    sopraCento: ["spalla"],
    tutteAZero: false
  };
  riempiStressArticolazioni(doc, riepilogo, { dichiarate: ["spalla"], calcolo: null, schede: [] });
  const riga = carta.querySelector('[data-stress-r="spalla"]');
  assert.ok(riga, "la riga della spalla c'e'");
  assert.ok(String(riga.className).split(" ").indexOf("su") !== -1, "resta rossa: " + riga.className);
  assert.ok(riga.textContent.indexOf("dichiarata") !== -1, "e porta il segno: " + riga.textContent);
  const sana = carta.querySelector('[data-stress-r="anca"]');
  assert.ok(sana.textContent.indexOf("dichiarata") === -1, "chi non ha dichiarato non porta segni");
});
