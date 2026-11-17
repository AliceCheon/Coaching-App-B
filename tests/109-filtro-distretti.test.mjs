/* tests/109-filtro-distretti.test.mjs — B.21 PASSO 3b: le pillole dei distretti.
 *
 * Richiesta di Alice (17/11/2026): le pillole non sono piu' la lista fissa del
 * v31 (Tutti, Q, G, E, D, S, T, B, TB, P, A, Z, Cardio). Nascono dai distretti
 * che la scheda aperta contiene davvero, in ordine di prima comparsa, con la
 * sigla della colonna DIST.: polpacci Z, adduttori Q, tricipiti T, cardio CA.
 * La pillola Q prende anche gli adduttori (stessa sigla). La riga senza
 * distretto riconosciuto prende la pillola «—». Nessuna pillola per i distretti
 * che in scheda non hanno esercizi. Il filtro e' solo una classe CSS: i dati non
 * si toccano, quindi la stampa resta quella di prima.
 */
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
const css = readFileSync(join(radice, "comune", "dashboard-b.css"), "utf8");

const meta = {
  id: "prg109", name: "Gambe novembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: { label: "10-8" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
let seq = 0;
const ESE = (nome, muscolo, extra) => Object.assign({
  id: "ex-" + (++seq),
  name: nome,
  muscle: muscolo,
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: otto() }
}, extra || {});

function schermoCon(esercizi) {
  const docs = [{ id: "program-v2-sheet-prg109__sh-A", dati: { programId: "prg109", sheetId: "sh-A", kind: "sheet",
    sheet: { id: "sh-A", code: "A", name: "Gambe", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, r);
  const pillole = () => Array.from(doc.querySelectorAll(".pr-filtri .pr-fchip"));
  const righe = () => Array.from(doc.querySelectorAll("tbody tr.p8-r"));
  const visibili = () => righe().filter((t) => !t.classList.contains("f-nascosta"));
  const premere = (sigla) => {
    const b = pillole().find((x) => x.getAttribute("data-f") === sigla);
    assert.ok(b, "manca la pillola \u00ab" + sigla + "\u00bb");
    b.dispatchEvent(new dom.window.Event("click"));
  };
  return { doc, r, pillole, righe, visibili, premere };
}

test("109.1 tre distretti in scheda: \u00abTutti\u00bb piu' tre pillole, in ordine di comparsa", () => {
  const s = schermoCon([ESE("Leg curl", "femorali"), ESE("Calf in piedi", "polpacci"), ESE("Squat", "quadricipiti")]);
  const sigle = s.pillole().map((b) => b.getAttribute("data-f"));
  assert.deepEqual(sigle, ["Tutti", "E", "Z", "Q"], "pillole: " + JSON.stringify(sigle));
  assert.equal(s.pillole()[0].textContent, "Tutti", "la prima e' Tutti");
  assert.ok(s.pillole()[0].classList.contains("on"), "\u00abTutti\u00bb e' acceso all'apertura");
  assert.equal(s.pillole()[0].disabled, false, "le pillole sono vive, non spente");
  const titoli = s.pillole().map((b) => b.title);
  assert.equal(titoli[1], "Femorali", "tooltip col nome intero");
  assert.equal(titoli[2], "Polpacci", "polpacci: nome intero");
  assert.equal(titoli[3], "Quadricipiti", "quadricipiti: nome intero");
});

test("109.2 i polpacci mostrano Z nella colonna e filtrano con la pillola Z", () => {
  const s = schermoCon([ESE("Leg curl", "femorali"), ESE("Calf in piedi", "polpacci")]);
  const colonne = s.righe().map((t) => t.querySelector("td.c-dist .dist").textContent);
  assert.deepEqual(colonne, ["E", "Z"], "colonna DIST.: " + JSON.stringify(colonne));
  s.premere("Z");
  assert.equal(s.visibili().length, 1, "resta una riga sola");
  assert.equal(s.visibili()[0].querySelector("td.c-dist .dist").textContent, "Z");
  assert.ok(s.pillole().find((b) => b.getAttribute("data-f") === "Z").classList.contains("on"), "la pillola Z e' accesa");
  s.premere("Tutti");
  assert.equal(s.visibili().length, 2, "\u00abTutti\u00bb riporta tutte le righe");
});

test("109.3 gli adduttori mostrano Q e si vedono con la pillola Q, insieme ai quadricipiti", () => {
  const s = schermoCon([ESE("Squat", "quadricipiti"), ESE("Adduttore macchina", "adduttori")]);
  const colonne = s.righe().map((t) => t.querySelector("td.c-dist .dist").textContent);
  assert.deepEqual(colonne, ["Q", "Q"], "adduttori con la sigla Q: " + JSON.stringify(colonne));
  const sigle = s.pillole().map((b) => b.getAttribute("data-f"));
  assert.deepEqual(sigle, ["Tutti", "Q"], "una sola pillola Q, non due: " + JSON.stringify(sigle));
  s.premere("Q");
  assert.equal(s.visibili().length, 2, "la pillola Q mostra quadricipiti e adduttori");
});

test("109.4 la riga senza distretto riconosciuto prende la pillola \u00ab\u2014\u00bb", () => {
  const con = schermoCon([ESE("Squat", "quadricipiti"), ESE("Macchina strana", "xyz")]);
  const sigle = con.pillole().map((b) => b.getAttribute("data-f"));
  assert.ok(sigle.indexOf("\u2014") !== -1, "c'e' la pillola \u2014: " + JSON.stringify(sigle));
  const trattino = con.pillole().find((b) => b.getAttribute("data-f") === "\u2014");
  assert.equal(trattino.title, "distretto non riconosciuto", "il tooltip lo dice");
  con.premere("\u2014");
  assert.equal(con.visibili().length, 1, "solo la riga non riconosciuta");
  const senza = schermoCon([ESE("Squat", "quadricipiti")]);
  assert.equal(senza.pillole().some((b) => b.getAttribute("data-f") === "\u2014"), false, "senza righe \u2014 non c'e' la pillola");
});

test("109.5 il filtro nasconde le righe giuste, figlie tecniche comprese", () => {
  const padre = ESE("Calf in piedi", "polpacci");
  const s = schermoCon([ESE("Squat", "quadricipiti"), padre,
    ESE("Calf in piedi + fermo", "polpacci", { tipo: "tecnica", padreId: padre.id, tecnica: "rest pause" })]);
  const tutte = s.righe().length;
  assert.ok(tutte >= 3, "la scheda disegna padre, figlia e squat: " + tutte);
  s.premere("Q");
  assert.equal(s.visibili().length, 1, "con Q resta solo lo squat");
  s.premere("Z");
  const z = s.visibili();
  assert.equal(z.length, tutte - 1, "con Z restano padre e figlia tecnica");
  assert.ok(z.some((t) => t.classList.contains("p8-tec")), "la figlia tecnica resta col padre");
  z.forEach((t) => assert.equal(t.querySelector("td.c-dist .dist").textContent, "Z", "ogni riga visibile e' Z"));
});

test("109.6 la zebra si ricalcola sulle righe che si vedono", () => {
  const s = schermoCon([ESE("Squat", "quadricipiti"), ESE("Leg curl", "femorali"), ESE("Calf", "polpacci"), ESE("Affondi", "quadricipiti")]);
  s.premere("Q");
  const toni = s.visibili().map((t) => (t.classList.contains("z-a") ? "a" : "b"));
  assert.deepEqual(toni, ["a", "b"], "due righe visibili: toni alternati dalla prima: " + JSON.stringify(toni));
  assert.equal(s.visibili()[0].classList.contains("z-a"), true, "la prima visibile e' chiara");
});

test("109.7 la cornice della superserie resta solo se il gruppo si vede tutto", () => {
  const s = schermoCon([ESE("Squat", "quadricipiti", { sup: "ss-1" }), ESE("Calf", "polpacci", { sup: "ss-1" })]);
  const gruppo = s.righe().filter((t) => t.getAttribute("data-sup") === "ss-1");
  assert.equal(gruppo.length, 2, "due righe nella superserie");
  assert.ok(gruppo.every((t) => t.classList.contains("in-sup")), "tutte e due portano il segno del gruppo");
  s.premere("Q");
  const resta = s.visibili()[0];
  assert.equal(resta.classList.contains("in-sup"), false, "gruppo spezzato: niente cornice sulla riga che resta");
  assert.equal(resta.classList.contains("z-gruppo"), false, "niente segno del gruppo");
  s.premere("Tutti");
  const dopo = s.righe().filter((t) => t.getAttribute("data-sup") === "ss-1");
  assert.ok(dopo.every((t) => t.classList.contains("in-sup")), "con Tutti la cornice torna");
});

test("109.8 il filtro e' una classe CSS: i dati restano interi e la stampa non cambia", () => {
  const s = schermoCon([ESE("Squat", "quadricipiti"), ESE("Calf", "polpacci")]);
  s.premere("Z");
  const scheda = s.r.schede[0];
  assert.equal(scheda.esercizi.length, 2, "i dati della scheda non perdono esercizi");
  assert.ok(/\.f-nascosta\{display:none\}/.test(css.replace(/\s+/g, "")), "il foglio ha la regola .f-nascosta");
  const codice = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
  const stampa = codice.slice(codice.indexOf("function apriFinestraStampa"));
  assert.ok(stampa.indexOf("p8-r") === -1, "la stampa non disegna le righe della tabella: le ricostruisce dai dati");
});
