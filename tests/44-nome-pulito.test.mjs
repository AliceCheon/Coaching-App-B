import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { nomePulito } from "../comune/nome-pulito.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

/* La guardia della regola di Alice: il trattino basso dei dati non si vede in
 * nessun punto dell'app. Due reti:
 *  44.02 — la scheda renderizzata con trattini bassi in OGNI testo (nomi, note,
 *          descrizioni, messaggio, fase, focus, logbook) non ne mostra nessuno
 *          e l'«Ultima volta» resta legata al nome vero del logbook;
 *  44.03 — scansione di tutte le vista-*.js e di app-v31.js: una riga che usa
 *          un campo di testo dei dati senza passare da nomePulito fa fallire
 *          la suite (tranne condizioni, chiavi di ricerca e confronti).
 * Ogni schermata nuova che si chiamerà vista-qualcosa entra nella guardia da sola. */

const meta = {
  id: "prg-pulizia", name: "Programma_di_test", status: "active", phase: "bulk_bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "descrizione_con_trattini_bassi", message: "messaggio_di_benvenuto",
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n, sets, reps, sec) => ({ week: n, sets, reps, rest: { seconds: sec }, type: "normal", note: "", source: "manual" });
const otto = (reps, sec) => Array.from({ length: 8 }, (_, i) => sett(i + 1, 4, reps, sec));
const ESE = (nome, muscolo, settimane, base) => ({
  name: nome, muscle: muscolo,
  prescription: Object.assign({ sets: 4, reps: { label: "10" }, rest: { seconds: 120 } }, base || {}),
  progression: { weeks: settimane }
});
const esercizi = [
  ESE("lat_machine_triangolo", "dorsali", otto("10", 120), { rest: "No_recupero_tra_le_braccia_e_poi_1,30'", tempo: "eccentrica_controllata_e_poi_explosiva" }),
  ESE("panca_piana", "petto", otto("test_12rm", 90), { rest: { seconds: 90 }, tempo: "3-1-1-0" })
];
esercizi[0].note = "punta_i_piedi";
const docs = [{ id: "program-v2-sheet-prg-pulizia__sh-A", dati: { programId: "prg-pulizia", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali_e_braccia", focus: "dorso_e_petto", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
docs[0].dati.sheet.note = "riscaldamento_e_mobilita";
const sedute = [
  { dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "panca_piana", kg: 40 }] }
];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: sedute.length }, r);
  return doc;
}

test("44.01 nomePulito è l'unica funzione: trattino basso via, prima lettera maiuscola, valore vero intatto", () => {
  assert.equal(nomePulito("lat_machine_triangolo"), "Lat machine triangolo");
  assert.equal(nomePulito("rematore_bilanciere"), "Rematore bilanciere");
  assert.equal(nomePulito("Trazioni assistite"), "Trazioni assistite");
  assert.equal(nomePulito("no_recupero_poi 1,30'"), "No recupero poi 1,30'");
  assert.equal(nomePulito("  "), "");
  assert.equal(nomePulito(null), "");
  assert.equal(nomePulito(120), "120");
  const sorg = fs.readFileSync("comune/nome-pulito.js", "utf8");
  assert.ok(sorg.includes("export function nomePulito("));
  assert.equal((sorg.match(/^export /gm) || []).length, 1, "nomePulito deve restare l'unica funzione esportata dal modulo");
});

test("44.02 a schermo non resta nessun trattino basso, e l'Ultima resta legata al nome vero del logbook", () => {
  const doc = schermo();
  const testo = doc.body.textContent;
  assert.ok(!testo.includes("_"), "nessun trattino basso visibile a schermo");
  ["Dorsali e braccia", "Dorso e petto", "Riscaldamento e mobilita", "Lat machine triangolo",
    "Punta i piedi", "REC: No recupero tra le braccia e poi",
    "TUT: Eccentrica controllata e poi explosiva", "Test 12rm", "90\"", "26/10/2026 \u00b7 40 kg"]
    .forEach((frase) => assert.ok(testo.includes(frase), "manca: " + frase));
});

test("44.03 la guardia: nessuna vista disegna un testo dai dati senza passare da nomePulito", () => {
  const fileViste = fs.readdirSync("comune").filter((f) => f.startsWith("vista-") && f.endsWith(".js"))
    .map((f) => "comune/" + f).concat(["desktop/app-v31.js"]);
  assert.ok(fileViste.length >= 6, "tutte le viste devono stare nella guardia: " + fileViste.join(", "));
  const TOKENE = /\.(nome|nota|note|descrizione|messaggio|focus|fase|stato)\b/g;
  const PERMESSO = /nomePulito\(|chiavePrestazione\(|ultimaVolta\(|localeCompare|esercizio:.{0,3}String[(]|\bif\s*\(/;
  const colpevoli = [];
  fileViste.forEach((file) => {
    fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((riga, i) => {
      const t = riga.trim();
      if (!t || t.startsWith("//") || t.startsWith("/*") || t.startsWith("*")) return;
      const battute = Array.from(riga.matchAll(TOKENE));
      if (!battute.length) return;
      if (PERMESSO.test(riga)) return;
      /* Il nome usato solo come condizione (es. «pr && pr.nome ?») non si pulisce. */
      const soloCondizioni = battute.every((m) => /^\s*\?/.test(riga.slice(m.index + m[0].length, m.index + m[0].length + 3)));
      if (soloCondizioni) return;
      if (/&&\s*[\w.)]+\s*$/.test(riga)) return;
      colpevoli.push(file + ":" + (i + 1) + " " + t.slice(0, 90));
    });
  });
  assert.deepEqual(colpevoli, [], "testi dei dati disegnati senza nomePulito:\n" + colpevoli.join("\n"));
});
