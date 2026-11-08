import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { recuperoInColonna, tempoInColonna, etichettaSpostata, recuperoVisibile } from "../comune/tut-rec.js";
import { nomePulito } from "../comune/nome-pulito.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const meta = {
  id: "prg-tut-rec", name: "Regola TUT REC", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n, sets, reps, sec) => ({ week: n, sets, reps, rest: { seconds: sec }, type: "normal", note: "", source: "manual" });
const otto = (reps, sec) => Array.from({ length: 8 }, (_, i) => sett(i + 1, 4, reps, sec));
const ESE = (nome, muscolo, settimane, base) => ({
  name: nome, muscle: muscolo,
  prescription: Object.assign({ sets: 4, reps: { label: "10" }, rest: { seconds: 120 } }, base || {}),
  progression: { weeks: settimane }
});
const esercizi = [
  ESE("lat_machine_triangolo", "dorsali", otto("10", 120), { rest: "120-180 sec" }),
  ESE("rematore_bilanciere", "dorso", otto("10", 180), { rest: "No recupero tra le braccia e poi 1,30'" }),
  ESE("panca_piana", "petto", otto("10", 90), { rest: { seconds: 90 }, tempo: "Partenza al ginocchio cerca di accelerare" }),
  ESE("hip_thrust", "glutei", otto("10", 120), { rest: "2-3'", tempo: "3-1-1-0" })
];
esercizi[1].note = "punta i piedi";
const docs = [{ id: "program-v2-sheet-prg-tut-rec__sh-A", dati: { programId: "prg-tut-rec", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Regola", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
const sedute = [
  { dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "lat_machine_triangolo", kg: 40 }] }
];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: sedute.length }, r);
  return doc;
}

test("43.01 la regola di colonna decide con i casi di Alice", () => {
  assert.equal(recuperoInColonna(""), true);
  assert.equal(recuperoInColonna("\u2014"), true);
  assert.equal(recuperoInColonna("2"), true);
  assert.equal(recuperoInColonna("2-3'"), true);
  assert.equal(recuperoInColonna("3-4'"), true);
  assert.equal(recuperoInColonna("90 sec"), true);
  assert.equal(recuperoInColonna("120-180 sec"), true);
  assert.equal(recuperoInColonna("1,30'"), true);
  assert.equal(recuperoInColonna("No recupero tra le braccia e poi 1,30'"), true);
  assert.equal(recuperoInColonna("recupero secondo Alice"), false);
  assert.equal(tempoInColonna(""), true);
  assert.equal(tempoInColonna("\u2014"), true);
  assert.equal(tempoInColonna("3-1-1-0"), true);
  assert.equal(tempoInColonna("2/0/1/0"), true);
  assert.equal(tempoInColonna("30X1"), false);
  assert.equal(tempoInColonna("3010"), false); /* solo numeri con i trattini: 3010 non e' un TUT */
  assert.equal(tempoInColonna("eccentrica controllata e poi explosiva"), false);
  assert.equal(tempoInColonna("eccentrica_controllata_e_poi_explosiva"), false);
  assert.equal(tempoInColonna("Partenza al ginocchio cerca di accelerare"), false);
  assert.equal(etichettaSpostata("REC", "No recupero tra le braccia e poi 1,30'"), "REC: No recupero tra le braccia e poi 1,30'");
  assert.equal(etichettaSpostata("TUT", "Partenza al ginocchio cerca di accelerare"), "TUT: Partenza al ginocchio cerca di accelerare");
});

test("43.02 il recupero lungo si taglia con i puntini e il valore intero sta nel Title", () => {
  assert.deepEqual(recuperoVisibile("2-3'"), { testo: "2-3'", intero: "2-3'" });
  assert.deepEqual(recuperoVisibile(""), { testo: "", intero: "" });
  const lungo = recuperoVisibile("120-180 sec");
  assert.equal(lungo.intero, "120-180 sec");
  assert.equal(lungo.testo, "120-180\u2026");
  assert.ok(lungo.testo.length <= 9);
  assert.ok(lungo.testo.endsWith("\u2026"));
});

test("43.03 i nomi degli esercizi si mostrano senza trattino basso, con l'iniziale maiuscola", () => {
  assert.equal(nomePulito("lat_machine_triangolo"), "Lat machine triangolo");
  assert.equal(nomePulito("rematore_bilanciere"), "Rematore bilanciere");
  assert.equal(nomePulito("Trazioni assistite"), "Trazioni assistite");
  assert.equal(nomePulito("  "), "");
  assert.equal(nomePulito(null), "");
});

test("43.04 a schermo: la frase va in Descr./Setup, la colonna dice \u2014, il nome \u00e8 pulito, l'Ultima resta legata al nome vero", () => {
  const doc = schermo();
  const righe = doc.querySelectorAll("tbody tr.p8-r");
  assert.equal(righe.length, 4);
  const rec = (i) => righe[i].querySelector("td.c-rec .rec");
  const tut = (i) => righe[i].querySelector("td.c-tut .tut");
  const nota = (i) => righe[i].querySelector("td.c-note");

  assert.equal(rec(0).textContent, "120-180\u2026");
  assert.equal(rec(0).title, "120-180 sec");
  assert.equal(tut(0).textContent, "\u2014");

  assert.equal(rec(1).textContent, "1'30\"");
  assert.equal(nota(1).textContent.indexOf("Punta i piedi"), 0);
  assert.ok(nota(1).textContent.includes("REC: No recupero tra le braccia e poi"));
  assert.equal(tut(1).textContent, "\u2014");

  assert.equal(rec(2).textContent, "90 sec");
  assert.equal(tut(2).textContent, "\u2014");
  assert.ok(nota(2).textContent.includes("TUT: Partenza al ginocchio cerca di accelerare"));

  assert.equal(rec(3).textContent, "2-3'");
  assert.equal(tut(3).textContent, "3-1-1-0");
  assert.ok(!nota(3).textContent.includes("REC:"));
  assert.ok(!nota(3).textContent.includes("TUT:"));

  assert.equal(righe[0].querySelector(".p8-t").textContent, "Lat machine triangolo");
  assert.equal(righe[1].querySelector(".p8-t").textContent, "Rematore bilanciere");
  assert.equal(righe[0].querySelector("td.c-ult").textContent, "26/10/2026 \u00b7 40 kg");
  assert.equal(doc.querySelectorAll(".p8-r .p8-note.spostata").length, 2);
});
