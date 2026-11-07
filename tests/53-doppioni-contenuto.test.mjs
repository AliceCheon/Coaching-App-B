import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { seduteSecondoA } from "../comune/regola-sedute-a.js";
import { contaSedute } from "../comune/conteggi-copia.js";
import { seduteLogbook } from "../comune/logbook.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* La stessa forma dei documenti veri: campo `session`. */
function doc(id, extra) {
  const seduta = Object.assign({
    id,
    dateInput: "2026-09-22",
    sessionCode: "D",
    sheetId: "D",
    source: "Logbook",
    status: "completed",
    exercises: [{ name: "Panca piana", completedSets: [{ reps: 8, weight: 60 }] }]
  }, extra || {});
  return { id: "doc-" + id, dati: { session: seduta } };
}

/* 129 documenti, come in A: 126 sedute distinte, 2 cancellate, 1 coppia con
 * id diverso e contenuto identico (il caso che fa 127 contro 126). */
function scenario() {
  const documenti = [];
  for (let i = 1; i <= 126; i += 1) {
    documenti.push(doc("s" + i, {
      dateInput: "2026-01-" + String((i % 28) + 1).padStart(2, "0"),
      sessionCode: "D" + i,
      sheetId: "D" + i,
      exercises: [{ name: "Esercizio " + i, completedSets: [{ reps: 8, weight: 40 + i }] }]
    }));
  }
  documenti.push(doc("s127", { deletedAt: "2026-10-01T10:00:00.000Z" }));
  documenti.push(doc("s128", { deletedAt: "2026-10-02T10:00:00.000Z" }));
  /* la coppia: id diverso, stesso contenuto della s1 */
  documenti.push(doc("s129", {
    dateInput: "2026-01-02",
    sessionCode: "D1",
    sheetId: "D1",
    exercises: [{ name: "Esercizio 1", completedSets: [{ reps: 8, weight: 41 }] }]
  }));
  return documenti;
}

test("53.1 i documenti sono 129, le valide non cancellate 127", () => {
  const c = contaSedute(scenario(), []);
  assert.equal(c.documenti, 129);
  assert.equal(c.valide, 129);
  assert.equal(c.cancellate, 2);
  assert.equal(c.valideNonCancellate, 127);
});

test("53.2 la seconda passata di A assorbe il doppione di contenuto: 126", () => {
  const c = contaSedute(scenario(), []);
  assert.equal(c.doppioniContenuto, 1);
  assert.equal(c.visibili, 126, "il Logbook di A mostra una sola delle due");
});

test("53.3 il doppione assorbito si nomina, non si conta e basta", () => {
  const c = contaSedute(scenario(), []);
  assert.equal(c.assorbite.length, 1);
  assert.equal(c.assorbite[0].id, "s129");
  assert.equal(c.assorbite[0].tenuta, "s1");
  assert.equal(c.assorbite[0].data, "2026-01-02");
});

test("53.4 il Logbook mostra 126 sedute come il conteggio", () => {
  const documenti = scenario();
  const piatte = documenti.map((d) => d.dati.session);
  const lb = seduteLogbook(piatte, {});
  assert.equal(lb.sedute.length, 126);
  assert.equal(lb.dichiarazioni.doppioniContenuto, 1);
  assert.equal(lb.dichiarazioni.assorbite[0].id, "s129");
});

test("53.5 due sedute con contenuto diverso restano due", () => {
  const a = { id: "a", dateInput: "2026-05-01", sheetId: "B", sessionCode: "B", source: "App", exercises: [{ name: "Squat", completedSets: [{ reps: 5, weight: 100 }] }] };
  const b = { id: "b", dateInput: "2026-05-01", sheetId: "B", sessionCode: "B", source: "App", exercises: [{ name: "Squat", completedSets: [{ reps: 5, weight: 90 }] }] };
  const r = seduteSecondoA([a, b]);
  assert.equal(r.visibili.length, 2);
  assert.equal(r.doppioniContenuto, 0);
});

test("53.6 stessa impronta ma momenti lontani: non si fondono", () => {
  const a = { id: "a", dateInput: "2026-05-01", sheetId: "B", source: "App", startedAt: "2026-05-01T08:00:00.000Z", exercises: [{ name: "Squat", completedSets: [{ reps: 5, weight: 100 }] }] };
  const b = { id: "b", dateInput: "2026-05-01", sheetId: "B", source: "App", startedAt: "2026-05-01T18:00:00.000Z", exercises: [{ name: "Squat", completedSets: [{ reps: 5, weight: 100 }] }] };
  const r = seduteSecondoA([a, b]);
  assert.equal(r.visibili.length, 2);
  assert.equal(r.doppioniContenuto, 0);
});

test("53.7 stessa impronta entro 10 minuti: si fondono", () => {
  const a = { id: "a", dateInput: "2026-05-01", sheetId: "B", source: "App", startedAt: "2026-05-01T08:00:00.000Z", exercises: [{ name: "Squat", completedSets: [{ reps: 5, weight: 100 }] }] };
  const b = { id: "b", dateInput: "2026-05-01", sheetId: "B", source: "App", startedAt: "2026-05-01T08:04:00.000Z", exercises: [{ name: "Squat", completedSets: [{ reps: 5, weight: 100 }] }] };
  const r = seduteSecondoA([a, b]);
  assert.equal(r.visibili.length, 1);
  assert.equal(r.doppioniContenuto, 1);
});

test("53.8 le esclusioni si applicano dopo la regola di A, senza doppio taglio", () => {
  const c = contaSedute(scenario(), [{ id: "s1", dati: { idSeduta: "s1" } }]);
  assert.equal(c.visibili, 126);
  assert.equal(c.esclusioni.escluseDaAlice, 1);
  assert.equal(c.esclusioni.valideRisultanti, 125);
});

test("53.9 la nota del Logbook nomina l'assorbita a schermo", () => {
  const pagina = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.ok(pagina.indexOf("Contenuto doppio") >= 0, "la nota non dichiara il doppione di contenuto");
  assert.ok(pagina.indexOf("d.assorbite") >= 0, "la nota non nomina la seduta assorbita");
});

test("53.10 la pagina dei conteggi dichiara le assorbite", () => {
  const conteggi = readFileSync(join(radice, "comune", "conteggi-copia.js"), "utf8");
  assert.ok(conteggi.indexOf("assorbite come contenuto doppio") >= 0);
});
