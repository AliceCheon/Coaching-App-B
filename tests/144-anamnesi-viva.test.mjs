/* Passo 14d — la strada vera: clic su Salva, una scrittura nel finto, ricarica,
 * e il testo e' ancora li'. Piu' i due guasti che in produzione si nascondono:
 * la lettura negata (deve dire «non ho potuto leggere») e la scrittura negata
 * (deve dire «Non ho salvato» ACCANTO al tasto).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { creaPonteAnamnesi, caricaDichiarazione, testoEsito } from "../comune/anamnesi-viva.js";
import { dichiarazioneDalRegistro } from "../comune/anamnesi-b.js";
import { montaCampoAnamnesi } from "../comune/vista-anamnesi.js";

/* ---------- un Firestore finto, con la possibilità di dire no ---------- */
function fintoDb(opzioni) {
  const o = opzioni || {};
  const store = o.store || {};
  const permesso = o.permesso || {};
  const nega = (azione, nome) => permesso[nome] === "all" || permesso[nome] === azione;
  const errore = () => {
    const e = new Error("Missing or insufficient permissions.");
    e.code = "permission-denied";
    return e;
  };
  const raccolta = (nome) => ({
    get: async () => {
      if (nega("read", nome)) throw errore();
      const dentro = store[nome] || {};
      return { docs: Object.keys(dentro).map((id) => ({ id: id, data: () => JSON.parse(JSON.stringify(dentro[id])) })) };
    },
    doc: (id) => ({
      get: async () => {
        if (nega("read", nome)) throw errore();
        const dentro = store[nome] || {};
        return { exists: Object.prototype.hasOwnProperty.call(dentro, id), data: () => JSON.parse(JSON.stringify(dentro[id] || {})) };
      },
      set: async (dati) => {
        if (nega("write", nome)) throw errore();
        store[nome] = store[nome] || {};
        const copia = typeof o.trasforma === "function" ? o.trasforma(JSON.parse(JSON.stringify(dati))) : JSON.parse(JSON.stringify(dati));
        store[nome][id] = copia;
        return {};
      }
    })
  });
  return {
    store: store,
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: async () => ({}),
        collection: raccolta
      })
    })
  };
}

/* ---------- il DOM minimo del campo (come nel test 143) ---------- */
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
  riga.appendChild(b);
  const span = nodo("span");
  span.textContent = "\u2014";
  riga.appendChild(span);
  warn.appendChild(riga);
  pannello.appendChild(warn);
  const doc = {
    activeElement: null,
    createElement: (tag) => nodo(tag),
    createTextNode: (t) => ({ textContent: String(t) }),
    querySelectorAll(sel) { return (sel === "[data-pan]" || sel === "[data-pan=\"anamnesi\"]") ? [pannello] : []; },
    querySelector(sel) { return sel === "[data-pan=\"anamnesi\"]" ? pannello : null; }
  };
  return { doc, riga };
}

/* La pagina come la monta app-v31: il campo dentro il pannello, il ponte
 * attaccato ai due tasti, l'esito che sopravvive ai ridisegni. */
function montaPagina(db, uid) {
  const { doc, riga } = paginaAnamnesi();
  let ponte = null;
  const disegna = (st) => montaCampoAnamnesi(doc, st.dichiarazione, {
    onSalva: (testo) => ponte.salva(testo),
    onAnnulla: () => ponte.annulla(),
    erroreLettura: st.erroreLettura,
    esito: st.esito,
    token: st.token,
    scrivendo: st.scrivendo === true
  });
  let passo = 0;
  ponte = creaPonteAnamnesi({
    db: db, uid: uid,
    dichiarazione: dichiarazioneDalRegistro([]),
    segnala: () => {},
    monta: disegna,
    /* un orologio che avanza: due salvataggi hanno date diverse, come nella
     * vita vera (e l'id porta la versione, quindi non si sovrascrivono) */
    orologio: () => new Date(Date.UTC(2026, 10, 23, 14, 0, 0) + (passo += 1) * 1000).toISOString()
  });
  disegna(ponte.quadro);
  return {
    doc: doc, riga: riga, ponte: ponte,
    area: riga.querySelector("[data-anamnesi=\"area\"]"),
    modifica: riga.querySelector("[data-anamnesi=\"modifica\"]"),
    salva: riga.querySelector("[data-anamnesi=\"salva\"]"),
    annulla: riga.querySelector("[data-anamnesi=\"annulla\"]"),
    nota: riga.querySelector("[data-anamnesi=\"nota\"]"),
    rifattoTesto: () => riga.querySelector("[data-anamnesi=\"testo\"]")
  };
}

/* La ricarica: nuova pagina, nuovo ponte, stesso Firestore. */
async function ricarica(db, uid) {
  const pagina = montaPagina(db, uid);
  await pagina.ponte.carica();
  return pagina;
}

test("144.1 clic vero su Salva: una scrittura, e dopo la ricarica il testo e' ancora li'", async () => {
  const db = fintoDb();
  const pagina = montaPagina(db, "uid-1");
  assert.equal(pagina.nota.textContent, "non dichiarato");
  assert.equal(pagina.area.style.display, "none", "a riposo niente area modificabile");

  pagina.modifica.onclick();
  assert.equal(pagina.area.style.display, "block", "il tasto apre l'area");

  pagina.area.value = "lombalgia cronica, fastidio al ginocchio destro";
  pagina.area.oninput();
  assert.equal(pagina.salva.disabled, false, "con testo nuovo Salva si accende");
  await pagina.salva.onclick();

  /* una scrittura sola, nel registro, con la forma che l'app rilegge */
  const voci = Object.keys(db.store.registro || {});
  assert.equal(voci.length, 1, "una scrittura sola: " + voci.join(", "));
  const voce = db.store.registro[voci[0]];
  assert.equal(voce.tipo, "dichiarazione-anamnesi");
  assert.equal(voce.campo, "anamnesi-lite");
  assert.equal(voce.dopo, "lombalgia cronica, fastidio al ginocchio destro");
  assert.match(pagina.nota.textContent, /^Salvato alle \d\d:\d\d$/, pagina.nota.textContent);
  assert.equal(pagina.riga.getAttribute("data-modo-anamnesi"), "letto", "Salva chiude e torna in sola lettura");
  assert.equal(pagina.area.style.display, "none");
  assert.equal(pagina.riga.querySelector("[data-anamnesi=\"quando\"]").textContent, "dichiarato il 23/11/2026 alle 14:00");

  /* ricarica: la pagina riparte da zero e legge il registro */
  const dopo = await ricarica(db, "uid-1");
  assert.equal(dopo.riga.getAttribute("data-modo-anamnesi"), "letto", "dopo la ricarica e' in sola lettura");
  assert.equal(dopo.rifattoTesto().textContent, "lombalgia cronica, fastidio al ginocchio destro");
  assert.equal(dopo.area.style.display, "none", "nessuna area modificabile a riposo");
  assert.match(dopo.nota.textContent, /^Salvato alle /);
  assert.equal(dopo.salva.disabled, true, "niente da salvare: il testo e' quello letto");
});

test("144.2 il registro nega la lettura: «non ho potuto leggere», non «non dichiarato»", async () => {
  const db = fintoDb({ permesso: { registro: "read" } });
  const pagina = await ricarica(db, "uid-1");
  const testo = pagina.nota.textContent;
  assert.ok(/^Non ho potuto leggere la dichiarazione: permission-denied/.test(testo), testo);
  assert.ok(testo.indexOf("non dichiarato") === -1, "non deve mai dire «non dichiarato» se la lettura e' fallita");
  assert.equal(pagina.salva.disabled, true, "senza lettura non si sovrascrive niente");
  assert.equal(pagina.modifica.style.display, "none", "niente tasto Modifica senza lettura");

  const letto = await caricaDichiarazione(db, "uid-1");
  assert.equal(letto.ok, false);
  assert.match(letto.erroreLettura, /permission-denied/);
  assert.equal(testoEsito({ erroreLettura: letto.erroreLettura }), "Non ho potuto leggere la dichiarazione: " + letto.erroreLettura);
});

test("144.3 il registro nega la scrittura: «Non ho salvato» sotto il tasto", async () => {
  const db = fintoDb({ permesso: { registro: "write" } });
  const pagina = montaPagina(db, "uid-1");
  pagina.modifica.onclick();
  pagina.area.value = "ginocchio destro";
  pagina.area.oninput();
  await pagina.salva.onclick();
  assert.match(pagina.nota.textContent, /^Non ho salvato: permission-denied/, pagina.nota.textContent);
  assert.equal(Object.keys(db.store.registro || {}).length, 0, "niente e' stato scritto");
  assert.equal(pagina.salva.disabled, false, "si puo' riprovare");
});

test("144.4 scritto ma riletto diverso: lo dice, non fa finta di niente", async () => {
  /* il finto «perde» una parola: simula una scrittura che non torna com'e' */
  const db = fintoDb({ trasforma: (dati) => Object.assign({}, dati, { dopo: "ginocchio" }) });
  const pagina = montaPagina(db, "uid-1");
  pagina.modifica.onclick();
  pagina.area.value = "ginocchio destro e spalla";
  pagina.area.oninput();
  await pagina.salva.onclick();
  assert.match(pagina.nota.textContent, /^Salvato, ma riletto diverso: il registro dice/, pagina.nota.textContent);
  assert.ok(pagina.nota.textContent.indexOf("ginocchio") !== -1);
});

test("144.5 Annulla chiude senza scrivere, e resta il testo letto", async () => {
  const db = fintoDb();
  const pagina = montaPagina(db, "uid-1");
  pagina.modifica.onclick();
  pagina.area.value = "lombalgia";
  pagina.area.oninput();
  await pagina.salva.onclick();
  assert.equal(Object.keys(db.store.registro).length, 1);

  const dopo = await ricarica(db, "uid-1");
  assert.equal(dopo.rifattoTesto().textContent, "lombalgia");
  dopo.modifica.onclick();
  dopo.area.value = "lombalgia e ginocchio";
  dopo.area.oninput();
  dopo.annulla.onclick();

  assert.equal(Object.keys(db.store.registro).length, 1, "Annulla non scrive NIENTE: il registro resta di una voce");
  assert.equal(dopo.riga.getAttribute("data-modo-anamnesi"), "letto", "e chiude l'area");
  assert.equal(dopo.area.value, "lombalgia", "il campo torna al testo letto");
  assert.equal(dopo.rifattoTesto().textContent, "lombalgia");

  const terza = await ricarica(db, "uid-1");
  assert.equal(terza.rifattoTesto().textContent, "lombalgia", "dopo la ricarica resta quello che c'era");
});
