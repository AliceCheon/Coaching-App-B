/* tests/99-stampa-compatta.test.mjs — B.20: la Stampa Compatta vive.
 * Il clic sul tasto apre la finestrella con le sole schede esistenti
 * (spuntata solo quella aperta in quel momento); nessuna spuntata =
 * Stampa spento. Il contenitore di stampa porta TUTTE le 8 settimane
 * (S1..S8 con ser e reps), la Descr./Setup accorciata a 60 caratteri
 * con puntini, le etichette SS1/SS2 delle superserie nella colonna JS,
 * la figlia tecnica sotto il padre e la spia Test. La stampa non tocca
 * i dati e il contenitore si toglie dopo; in @media print i colori sono
 * forzati chiari anche col tema scuro (bianco e nero, zero inchiostro
 * di sfondo). */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma, accorciaSetup, tagliaCorpo, stampeCollegate } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");

const meta = {
  id: "prg99", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq99 = 0;
const otto = (test) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: 4, reps: { label: test && i === 2 ? "test" : "10-8" }, rest: { seconds: 120 } }));
const ESE = (nome, opzioni) => Object.assign({
  id: "ex-" + (++seq99), name: nome, nome: nome, muscolo: "dorsali",
  nota: "", sup: "",
  prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: otto(false) }
}, opzioni || {});

const schedaDoc = (cod, esercizi) => ({ id: "program-v2-sheet-prg99__sh-" + cod,
  dati: { programId: "prg99", sheetId: "sh-" + cod, kind: "sheet",
    sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: esercizi } } });

function schermoCon(schede, schedaAperta) {
  const dom = new JSDOM(`<!doctype html><html><body>
<button id="pr-print1" type="button">Stampa Compatta</button>
<button id="pr-print2" type="button">Stampa da Compilare</button>
<button class="pr-ntab on" data-tab="${schedaAperta}" type="button">Scheda ${schedaAperta}</button>
<div id="g"></div></body></html>`);
  const doc = dom.window.document;
  const win = dom.window;
  const viste = [];
  win.setTimeout = () => 0; /* niente code di 5 secondi nei test */
  win.print = function () {
    const box = doc.getElementById("bd-stampa");
    viste.push(box ? box.outerHTML : "");
    win.dispatchEvent(new win.Event("afterprint"));
  };
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(schede), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  const prima = JSON.stringify(r.schede);
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  return { dom, doc, win, r, prima, viste };
}

test("99.1 la finestrella mostra solo le schede esistenti, spuntata la aperta, Stampa spento senza spunte", () => {
  const s = schermoCon([
    schedaDoc("A", [ESE("Rematore bilanciere")]),
    schedaDoc("B", [ESE("Trazioni")]),
    schedaDoc("C", [ESE("Panca")])
  ], "B");
  const b = s.doc.getElementById("pr-print1");
  assert.equal(b.textContent, "Stampa Compatta");
  b.click();
  const f = s.doc.querySelector(".st-finestra");
  assert.ok(f, "la finestra si apre");
  const spunte = Array.from(f.querySelectorAll("input[type=checkbox]"));
  assert.deepEqual(spunte.map((c) => c.value), ["A", "B", "C"], "solo le schede esistenti");
  assert.deepEqual(spunte.map((c) => c.checked), [false, true, false], "spuntata solo la scheda aperta");
  const stampa = f.querySelector(".st-bottone");
  assert.equal(stampa.disabled, false, "la scheda aperta e' spuntata: Stampa acceso");
  spunte[1].checked = false;
  f.querySelectorAll(".st-scelte")[0].dispatchEvent(new s.win.Event("change", { bubbles: true }));
  assert.equal(stampa.disabled, true, "nessuna spuntata: Stampa spento"); spunte[1].checked = true; f.querySelectorAll(".st-scelte")[0].dispatchEvent(new s.win.Event("change", { bubbles: true })); assert.equal(stampa.disabled, false, "una spuntata: Stampa acceso");
  /* un doppio render non doppia i gestori */
  const f2 = s.doc.querySelectorAll(".st-finestra");
  assert.equal(f2.length, 1);
});

test("99.2 il foglio porta tutte le 8 settimane, la finestra si chiude, il contenitore si toglie e i dati non cambiano", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Rematore bilanciere")])], "A");
  const prima = s.prima;
  s.doc.getElementById("pr-print1").click();
  const f = s.doc.querySelector(".st-finestra");
  const stampa = f.querySelector(".st-bottone");
  assert.equal(stampa.disabled, false, "la scheda aperta e' gia' spuntata");
  stampa.click();
  assert.ok(s.viste[0], "window.print() vede il contenitore");
  assert.ok(s.viste[0].indexOf(">S8<") !== -1, "la settimana 8 c'e'");
  assert.ok(s.viste[0].indexOf(">S1<") !== -1, "la settimana 1 c'e'");
  assert.ok(s.viste[0].indexOf("10-8") !== -1, "le ripetizioni ci sono");
  assert.ok(s.doc.querySelector(".st-finestra") === null, "la finestra si chiude");
  assert.ok(s.doc.getElementById("bd-stampa") === null, "il contenitore di stampa si toglie dopo");
  assert.equal(JSON.stringify(s.r.schede), prima, "i dati non cambiano");
});

test("99.3 la Descr./Setup si accorcia a 60 caratteri con puntini, o resta intatta se entra", () => {
  const corta = "Presa neutra, gomiti a 45 gradi";
  assert.equal(accorciaSetup(corta), corta);
  const lunga = accorciaSetup("Cavo alto con presa neutra media busto leggermente inclinato avanti contrazione sentita alta scoliosi no");
  assert.ok(lunga.length <= 60, "al piu' 60 caratteri, trovati " + lunga.length);
  assert.ok(lunga.endsWith("\u2026"), "finisce con i puntini");
  const s = schermoCon([schedaDoc("A", [ESE("Rematore", { nota: "Cavo alto con presa neutra media busto leggermente inclinato avanti contrazione sentita alta scoliosi" })])], "A");
  s.doc.getElementById("pr-print1").click();
  s.doc.querySelector(".st-finestra .st-bottone").click();
  assert.ok(s.viste[0].indexOf("st-setup") !== -1, "il setup accorciato sta nel foglio");
});

test("99.4 superserie etichettate SS nella colonna JS, la figlia tecnica resta sotto il padre", () => {
  const uno = ESE("Rematore");
  const due = ESE("Curl", { sup: "ss-1" });
  const tre = ESE("Croci", { sup: "ss-1" });
  const figlia = ESE("variante", { tipo: "tecnica", padreId: String(tre.id), tecnica: "rest_pause", settimane: otto(false) });
  const quattro = ESE("Lat machine");
  const s = schermoCon([schedaDoc("A", [uno, due, tre, figlia, quattro])], "A");
  s.doc.getElementById("pr-print1").click();
  s.doc.querySelector(".st-finestra .st-bottone").click();
  const js = Array.from(s.viste[0].matchAll(/st-js">([^<]*)</g)).map((m) => m[1]);
  assert.deepEqual(js, ["A1", "SS1", "SS1", "\u21b3", "A4"], "gruppo = SS1, figlia con la freccetta, poi il conto riprende");
  assert.ok(s.viste[0].indexOf("st-figlia") !== -1, "la riga della tecnica e' segnata");
  assert.ok(s.viste[0].indexOf("st-tecnica") !== -1 && s.viste[0].indexOf("Rest pause") !== -1, "la tecnica in corsivo col suo nome");
});

test("99.5 la spia Test compare anche in stampa", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Test max", { progression: { weeks: otto(true) } })])], "A");
  s.doc.getElementById("pr-print1").click();
  s.doc.querySelector(".st-finestra .st-bottone").click();
  assert.ok(s.viste[0].indexOf("st-test") !== -1, "la spia Test c'e'");
  assert.ok(s.viste[0].indexOf(">Test<") !== -1, "con la parola Test");
});

test("99.6 il foglio che non ci sta si stringe fino a 7pt prima di andare in seconda pagina", () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  const p = dom.window.document.createElement("div");
  Object.defineProperty(p, "scrollHeight", { configurable: true, value: 900 });
  assert.equal(tagliaCorpo(p, 718), 7, "sotto il limite scende fino al minimo");
  assert.equal(p.style.fontSize, "7pt");
  Object.defineProperty(p, "scrollHeight", { configurable: true, value: 100 });
  assert.equal(tagliaCorpo(p, 718), 11, "ci sta: corpo intero");
  assert.equal(p.style.fontSize, "11pt");
});

test("99.7 senza programma attivo i tasti lo dicono e non aprono niente", () => {
  const dom = new JSDOM("<!doctype html><html><body><button id=\"pr-print1\" type=\"button\">Stampa Compatta</button><button id=\"pr-print2\" type=\"button\">Stampa da Compilare</button></body></html>");
  const doc = dom.window.document;
  stampeCollegate(doc, { profilo: { presente: false }, schede: [] });
  const b1 = doc.getElementById("pr-print1");
  assert.ok(b1.textContent.indexOf("nessun programma attivo") !== -1, "il tasto dice la situazione");
  assert.equal(b1.disabled, true, "e resta spento");
  b1.click();
  assert.equal(doc.querySelector(".st-finestra"), null, "non apre niente");
});

test("99.8 la stampa esce in bianco e nero anche col tema scuro: @media print forza i colori chiari", () => {
  assert.ok(foglio.indexOf("@media print") !== -1, "il blocco di stampa c'e'");
  assert.ok(foglio.indexOf("body > *:not(#bd-stampa)") !== -1, "a stampa si nasconde tutto il resto");
  assert.ok(foglio.indexOf("background: #ffffff") !== -1, "fondo bianco");
  assert.ok(foglio.indexOf("color: #000000") !== -1, "testo nero");
  assert.ok(foglio.indexOf("size: A4 landscape") !== -1, "A4 orizzontale");
});
