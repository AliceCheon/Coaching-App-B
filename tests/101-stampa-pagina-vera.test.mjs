/* tests/101-stampa-pagina-vera.test.mjs — B.20c: la stampa sulla PAGINA VERA.
 * I test 99 e 100 costruivano un DOM finto con i due tasti gia' dentro, quindi
 * non vedevano il difetto vero: la barra che renderProgramma ricostruisce creava
 * «Stampa Compatta» e «Stampa da Compilare» con pulsanteSpento (nessun segno,
 * tooltip «spento: questa pagina non scrive») e il gancio non le trovava.
 * Qui si carica desktop/index.html VERO e si disegna dentro #programma-attivo,
 * il contenitore che usa app-v31.js: i tasti guardati sono quelli di Alice. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg101", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq = 0;
const sett = (serie, label) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: { label: label }, rest: { seconds: 120 } }));
const ESE = (nome) => ({ id: "ex-" + (++seq), name: nome, nome: nome, muscolo: "dorsali", nota: "", sup: "", prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4, "10-8") } });
const schedaDoc = (cod, esercizi) => ({ id: "s-prg101-" + cod, dati: { programId: "prg101", sheetId: "sh-" + cod, kind: "sheet", sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: esercizi } } });

function paginaVera(schede) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  const viste = [];
  win.setTimeout = () => 0;
  win.print = function () {
    const box = doc.getElementById("bd-stampa");
    viste.push(box ? box.outerHTML : "");
    win.dispatchEvent(new win.Event("afterprint"));
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha il contenitore #programma-attivo che usa app-v31.js");
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(schede), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, r);
  return { dom, doc, win, viste, contenitore, r };
}

const una = () => [schedaDoc("A", [ESE("Rematore bilanciere"), ESE("Trazioni")])];
const due = () => [schedaDoc("A", [ESE("Rematore bilanciere"), ESE("Trazioni")]), schedaDoc("B", [ESE("Panca")])];
const tasto = (s, tipo) => s.doc.querySelector('#programma-attivo [data-stampa="' + tipo + '"]');

test("101.1 sulla pagina vera i tasti ci sono e sono accesi, senza nessun tooltip «spento»", () => {
  const s = paginaVera(una());
  for (const [tipo, etichetta] of [["compatta", "Stampa Compatta"], ["compilare", "Stampa da Compilare"]]) {
    const b = tasto(s, tipo);
    assert.ok(b, "il tasto «" + etichetta + "» sta nella barra vera che Alice vede");
    assert.equal(b.textContent.trim(), etichetta, "porta la sua parola");
    assert.equal(b.disabled, false, "e' acceso col programma attivo");
    assert.equal(b.getAttribute("aria-disabled"), null, "non annuncia di essere spento");
    assert.ok(!/spento/.test(String(b.title || "")), "niente tooltip «spento», trovato: " + b.title);
  }
  const piu = paginaVera(due());
  const tutti = Array.from(piu.doc.querySelectorAll("#programma-attivo [data-stampa]"));
  assert.equal(tutti.length, 4, "una barra per scheda, due tasti per barra: " + tutti.length);
  tutti.forEach((b) => {
    assert.equal(b.disabled, false, "acceso: " + b.textContent);
    assert.ok(!/spento/.test(String(b.title || "")), "senza «spento»: " + b.textContent + " / " + b.title);
  });
});

test("101.2 il clic su Stampa Compatta, sulla pagina vera, apre la finestrella e stampa", () => {
  const s = paginaVera(due());
  tasto(s, "compatta").click();
  const f = s.doc.querySelector(".st-finestra");
  assert.ok(f, "la finestrella delle schede si apre");
  assert.equal(f.querySelectorAll("input[type=checkbox]").length, 2, "le due schede esistenti");
  assert.equal(f.querySelector(".st-bottone").disabled, false, "Stampa acceso subito");
  f.querySelector(".st-bottone").click();
  assert.ok(s.viste[0] && s.viste[0].indexOf("st-compatta") !== -1, "esce il foglio compatto");
  assert.ok(s.viste[0].indexOf(">S8<") !== -1, "con tutte le settimane");
  assert.ok(s.doc.getElementById("bd-stampa") === null, "il contenitore si toglie dopo");
});

test("101.3 il clic su Stampa da Compilare, sulla pagina vera, apre il selettore e stampa le caselle", () => {
  const s = paginaVera(due());
  tasto(s, "compilare").click();
  const f = s.doc.querySelector(".st-finestra");
  assert.ok(f, "la finestrella si apre");
  const sel = f.querySelector("select");
  assert.ok(sel, "col selettore della settimana");
  sel.value = "4";
  sel.dispatchEvent(new s.win.Event("change", { bubbles: true }));
  f.querySelector(".st-bottone").click();
  assert.ok(s.viste[0] && s.viste[0].indexOf("st-casella") !== -1, "escono le caselle da spuntare");
  assert.ok(s.viste[0].indexOf("PRESCR. S4") !== -1, "della settimana scelta");
});

test("101.4 un secondo disegno ricostruisce la barra e i tasti rispondono ancora, senza doppioni", () => {
  const s = paginaVera(due());
  const prima = s.doc.querySelectorAll("#programma-attivo [data-stampa]").length;
  renderProgramma(s.doc, s.contenitore, { presente: true, numeroSedute: 0 }, s.r);
  assert.equal(s.doc.querySelectorAll("#programma-attivo [data-stampa]").length, prima, "stesso numero di tasti, non il doppio");
  const b = tasto(s, "compatta");
  assert.ok(b, "dopo il secondo disegno il tasto c'e' ancora");
  b.click();
  assert.equal(s.doc.querySelectorAll(".st-finestra").length, 1, "una finestrella sola: nessun doppio gestore");
  s.doc.querySelector(".st-bottone").click();
  assert.equal(s.viste.length, 1, "una stampa sola");
});

test("101.5 senza programma attivo i tasti lo dicono e restano spenti, anche sulla pagina vera", () => {
  const s = paginaVera(due());
  const senza = Object.assign({}, s.r, { profilo: Object.assign({}, s.r.profilo, { presente: false }) });
  renderProgramma(s.doc, s.contenitore, { presente: false }, senza);
  const b = tasto(s, "compatta");
  assert.ok(b, "il tasto sta nella barra");
  assert.equal(b.disabled, true, "e resta spento");
  assert.ok(b.textContent.indexOf("nessun programma attivo") !== -1, "dicendo il motivo vero, non spento");
  b.click();
  assert.equal(s.doc.querySelector(".st-finestra"), null, "non apre niente");
});
