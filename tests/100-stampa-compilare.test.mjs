/* tests/100-stampa-compilare.test.mjs — B.20b: la Stampa da Compilare vive.
 * Il tasto #pr-print2 apre la finestrella di scelta con il selettore della
 * settimana (S1..S8, parte da S1); il foglio porta SOLO la settimana scelta,
 * una pagina per scheda, e per ogni riga una fila di caselle VUOTE da
 * spuntare a mano (una per serie prescritta, 14x8 mm) piu' la colonna Note.
 * Restano le regole della compatta (SS1/SS2, figlia tecnica, spia Test,
 * bianco e nero) e la stampa non tocca i dati. */
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
const foglio = readFileSync(join(radice, "desktop", "index.html"), "utf8").replace(/\r/g, "");

const meta = {
  id: "prg100", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq100 = 0;
const sett = (serie, label, conTest) => Array.from({ length: 8 }, (_, i) => ({
  week: i + 1, sets: serie, reps: { label: conTest && i === 2 ? "test" : label }, rest: { seconds: 120 }
}));
const ESE = (nome, opzioni) => Object.assign({
  id: "ex-" + (++seq100), name: nome, nome: nome, muscolo: "dorsali",
  nota: "", sup: "",
  prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4, "10-8", false) }
}, opzioni || {});

const schedaDoc = (cod, esercizi) => ({ id: "program-v2-sheet-prg100__sh-" + cod,
  dati: { programId: "prg100", sheetId: "sh-" + cod, kind: "sheet",
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
  win.setTimeout = () => 0;
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

/* il contenitore stampato, riletto come documento per guardarci dentro */
function dentro(html) {
  return new JSDOM("<!doctype html><html><body>" + html + "</body></html>").window.document;
}

function apriEStampa(s, settimana) {
  s.doc.getElementById("pr-print2").click();
  const f = s.doc.querySelector(".st-finestra");
  if (settimana) {
    const sel = f.querySelector("select");
    sel.value = String(settimana);
    sel.dispatchEvent(new s.win.Event("change", { bubbles: true }));
  }
  f.querySelector(".st-bottone").click();
  return dentro(s.viste[0] || "");
}

test("100.1 il tasto apre la finestrella col selettore S1..S8 e il foglio porta solo la settimana scelta", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Rematore bilanciere")])], "A");
  s.doc.getElementById("pr-print2").click();
  const f = s.doc.querySelector(".st-finestra");
  assert.ok(f, "la finestra si apre");
  const sel = f.querySelector("select");
  assert.ok(sel, "il selettore della settimana c'e'");
  assert.deepEqual(Array.from(sel.options).map((o) => o.textContent), ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"], "da S1 a S8");
  assert.equal(sel.value, "1", "parte da S1");
  assert.equal(f.querySelector(".st-bottone").disabled, false, "con la scheda aperta spuntata Stampa e' acceso");
  sel.value = "3";
  sel.dispatchEvent(new s.win.Event("change", { bubbles: true }));
  f.querySelector(".st-bottone").click();
  const box = dentro(s.viste[0]);
  const testi = Array.from(box.querySelectorAll("th")).map((t) => t.textContent);
  assert.ok(testi.indexOf("PRESCR. S3") !== -1, "la colonna e' quella della settimana scelta");
  assert.equal(testi.indexOf("PRESCR. S1"), -1, "le altre settimane non entrano nel foglio");
  assert.ok(s.viste[0].indexOf("Settimana S3") !== -1, "la testata dice la settimana");
});

test("100.2 una casella vuota per ogni serie prescritta, da 14x8 mm", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Rematore", { progression: { weeks: sett(4, "10-8", false) } })])], "A");
  const box = apriEStampa(s, 1);
  const caselle = Array.from(box.querySelectorAll(".st-casella"));
  assert.equal(caselle.length, 4, "quattro serie = quattro caselle, trovate " + caselle.length);
  assert.ok(caselle.every((c) => c.textContent.trim() === ""), "le caselle sono vuote, da spuntare a mano");
  const tre = schermoCon([schedaDoc("A", [ESE("Trazioni", { progression: { weeks: sett(3, "8", false) } })])], "A");
  assert.equal(dentro(apriEStampa(tre, 1) && tre.viste[0]).querySelectorAll(".st-casella").length, 3, "tre serie = tre caselle");
  assert.ok(foglio.indexOf(".st-compilare .st-casella") !== -1, "la regola delle caselle e' del foglio da compilare");
  assert.ok(foglio.indexOf("width: 14mm; height: 8mm") !== -1, "caselle da 14x8 mm nel foglio di stile");
  assert.ok(foglio.indexOf(".st-compilare .st-note-cella") !== -1, "la colonna Note ha la sua altezza");
});

test("100.3 superserie e figlia tecnica restano al loro posto anche sul foglio da compilare", () => {
  const uno = ESE("Rematore");
  const due = ESE("Curl", { sup: "ss-1" });
  const tre = ESE("Croci", { sup: "ss-1" });
  const figlia = ESE("variante", { tipo: "tecnica", padreId: String(tre.id), tecnica: "rest_pause", settimane: sett(4, "10-8", false) });
  const quattro = ESE("Lat machine");
  const s = schermoCon([schedaDoc("A", [uno, due, tre, figlia, quattro])], "A");
  const box = apriEStampa(s, 1);
  const js = Array.from(box.querySelectorAll(".st-tab-compilare .st-js")).map((c) => c.textContent);
  assert.deepEqual(js, ["A1", "SS1", "SS1", "\u21b3", "A4"], "gruppo = SS1, figlia con la freccetta, poi il conto riprende");
  assert.ok(box.querySelector(".st-figlia"), "la riga della tecnica e' segnata");
  assert.ok(box.querySelector(".st-tecnica") && s.viste[0].indexOf("Rest pause") !== -1, "la tecnica in corsivo col suo nome");
  assert.equal(Array.from(box.querySelectorAll(".st-figlia .st-casella")).length, 4, "anche la tecnica ha le sue caselle");
});

test("100.4 le colonne del modulo sono quelle chieste, con la prescrizione della settimana", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Rematore")])], "A");
  const box = apriEStampa(s, 2);
  const th = Array.from(box.querySelectorAll("thead th")).map((t) => t.textContent);
  assert.deepEqual(th, ["JS", "DIST.", "ESERCIZIO", "REC.", "TUT", "PRESCR. S2", "SERIE FATTE (spunta a mano)", "NOTE"], "otto colonne");
  const presc = box.querySelector(".st-presc .st-presc-testo");
  assert.ok(presc, "la prescrizione c'e'");
  assert.equal(presc.textContent, "4\u00d710-8", "serie x ripetizioni della settimana, trovato " + presc.textContent);
  assert.equal(box.querySelectorAll(".st-note-cella").length, 1, "una cella Note per riga");
});

test("100.5 due schede spuntate = due pagine, il contenitore si toglie e i dati non cambiano", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Rematore")]), schedaDoc("B", [ESE("Trazioni")])], "A");
  const prima = s.prima;
  s.doc.getElementById("pr-print2").click();
  const f = s.doc.querySelector(".st-finestra");
  const spunte = Array.from(f.querySelectorAll("input[type=checkbox]"));
  spunte[1].checked = true;
  f.querySelector(".st-scelte").dispatchEvent(new s.win.Event("change", { bubbles: true }));
  f.querySelector(".st-bottone").click();
  const box = dentro(s.viste[0]);
  assert.equal(box.querySelectorAll(".st-pagina").length, 2, "una pagina per scheda spuntata");
  assert.ok(s.viste[0].indexOf("Scheda B") !== -1, "anche la seconda scheda c'e'");
  assert.ok(s.doc.querySelector(".st-finestra") === null, "la finestra si chiude");
  assert.ok(s.doc.getElementById("bd-stampa") === null, "il contenitore si toglie dopo");
  assert.equal(JSON.stringify(s.r.schede), prima, "i dati non cambiano");
});

test("100.6 la spia Test compare anche sul foglio da compilare", () => {
  const s = schermoCon([schedaDoc("A", [ESE("Test max", { progression: { weeks: sett(4, "10-8", true) } })])], "A");
  const box = apriEStampa(s, 3);
  assert.ok(box.querySelector(".st-test"), "la spia Test c'e'");
  assert.ok(s.viste[0].indexOf(">Test<") !== -1, "con la parola Test");
});
