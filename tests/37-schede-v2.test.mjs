// tests/37-schede-v2.test.mjs — le schede vere dei programmi v2 (2.5).
// Le schede non stanno nel documento-programma: stanno in tre famiglie di
// documenti, e la schermata le legge in sola lettura.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decodificaId, PREFISSI_SCHEDE, prescrizione, esercizioNormalizzato,
  ricostruisciSchede, schedeDelProgrammaV2
} from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";

const documenti = [
  { id: "program-v2-sheet-prg1__sh-A", dati: { programId: "prg1", sheetId: "sh-A", kind: "sheet",
    sheet: { id: "sh-A", code: "A", name: "Dorsali e spalle", focus: "dorso", day: 1, week: 1, order: 0,
      exercises: [
        { id: "e2", name: "Lat machine", muscle: "dorsali", order: 1, prescription: { sets: 4, reps: "8-10", rest: "90s" }, progression: { weeks: [1, 2, 3] } },
        { id: "e1", name: "Trazioni", muscle: "dorsali", order: 0, prescription: { sets: 4, reps: 6, rest: "120s" } },
        { id: "e3", name: "Cancellato", order: 2, deletedAt: "2026-10-01T00:00:00Z" }
      ] } } },
  { id: "program-v2-sheet-prg1__sh-B", dati: { programId: "prg1", sheetId: "sh-B", kind: "sheet",
    sheet: { id: "sh-B", code: "B", name: "Gambe", day: 2, week: 1, order: 1, exercisesSplit: true, exercises: [] } } },
  { id: "program-v2-exercise-prg1__sh-B__ex1", dati: { programId: "prg1", sheetId: "sh-B", kind: "sheet",
    exercise: { id: "ex1", name: "Squat", muscle: "quadricipiti", order: 0, sets: 5, reps: "5", rest: "180s", note: "fermo in buca" } } },
  { id: "program-v2-exercise-prg1__sh-B__ex2", dati: { programId: "prg1", sheetId: "sh-B", kind: "sheet",
    exercise: { id: "ex2", name: "Stacco rumeno", muscle: "femorali", order: 1, sets: 3, reps: "8" } } },
  { id: "program-v2-archived-prg1__sh-Z", dati: { programId: "prg1", sheetId: "sh-Z", kind: "archived",
    sheet: { id: "sh-Z", code: "Z", name: "Vecchia scheda", order: 9, exercises: [{ name: "Panca" }] } } },
  { id: "program-v2-sheet-prg2__sh-C", dati: { programId: "prg2", sheetId: "sh-C", kind: "sheet",
    sheet: { id: "sh-C", code: "C", order: 0, exercises: [] } } },
  { id: "program-v2-sheet-senza-legame", dati: { kind: "sheet", sheet: { code: "Q" } } }
];

const ricostruzione = ricostruisciSchede(documenti);

test("37.01 l'id del documento si decodifica: famiglia, programma, scheda, esercizio", () => {
  const a = decodificaId("program-v2-sheet-prg1__sh-A");
  assert.equal(a.famiglia, "scheda");
  assert.equal(a.programId, "prg1");
  assert.equal(a.sheetId, "sh-A");
  const b = decodificaId("program-v2-exercise-prg1__sh-B__ex1");
  assert.equal(b.famiglia, "esercizio");
  assert.equal(b.exerciseId, "ex1");
  assert.equal(decodificaId("program-v2-archived-p__s").famiglia, "archiviata");
  assert.equal(decodificaId("program-v2-meta-p"), null, "i metadati non sono una scheda");
  assert.equal(PREFISSI_SCHEDE.scheda, "program-v2-sheet-");
});

test("37.02 le schede si ricostruiscono per programma, con gli esercizi sciolti riuniti", () => {
  const g = ricostruzione.perProgramma.prg1;
  assert.equal(g.schede.length, 2, "A e B attive");
  assert.equal(g.archiviate.length, 1, "la Z resta a parte");
  assert.deepEqual(g.schede.map((s) => s.codice), ["A", "B"], "ordinate per order");
  assert.equal(g.schede[1].numeroEsercizi, 2, "la scheda splittata riprende i suoi esercizi");
  assert.deepEqual(g.schede[1].esercizi.map((e) => e.nome), ["Squat", "Stacco rumeno"]);
  assert.equal(g.schede[0].numeroEsercizi, 2, "l'esercizio cancellato non conta");
  assert.equal(ricostruzione.totale.schede, 3);
  assert.equal(ricostruzione.totale.archiviate, 1);
  assert.equal(ricostruzione.totale.eserciziSciolti, 2);
  assert.equal(ricostruzione.totale.senzaLegame, 1, "il documento senza programma è dichiarato");
});

test("37.03 la prescrizione legge i campi dentro e fuori, senza convertirne il senso", () => {
  const p = prescrizione({ prescription: { sets: 4, reps: "8-10", rest: "90s" }, progression: { weeks: [1, 2] } });
  assert.equal(p.serie, "4");
  assert.equal(p.ripetizioni, "8-10");
  assert.equal(p.recupero, "90s");
  assert.equal(p.settimane, 2);
  const fuori = prescrizione({ sets: 5, reps: 5, rest: "180s" });
  assert.equal(fuori.serie, "5");
  assert.equal(fuori.ripetizioni, "5");
  const vuota = prescrizione({});
  assert.deepEqual([vuota.serie, vuota.ripetizioni, vuota.recupero, vuota.settimane], ["", "", "", 0]);
});

test("37.04 un esercizio senza nome non diventa «Esercizio 1»", () => {
  const e = esercizioNormalizzato({ id: "x", muscle: "petto" }, 3);
  assert.equal(e.nome, "non registrato");
  assert.equal(e.ordine, 3);
  assert.equal(esercizioNormalizzato({ name: " Panca ", order: 7 }, 0).ordine, 7);
});

test("37.05 schedeDelProgrammaV2 risponde solo per i programmi che ne hanno", () => {
  const suo = schedeDelProgrammaV2(ricostruzione, "prg1");
  assert.equal(suo.schede.length, 2);
  assert.equal(schedeDelProgrammaV2(ricostruzione, "prg9"), null);
  assert.equal(schedeDelProgrammaV2(null, "prg1"), null);
});

test("37.06 il riepilogo usa le schede v2 quando il documento non le porta", () => {
  const meta = { id: "prg1", name: "Intensità ottobre-dicembre", status: "active", durationWeeks: 8, daysPerWeek: 4 };
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruzione, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 4 });
  assert.equal(r.schede.length, 2);
  assert.equal(r.archiviate.length, 1);
  assert.equal(r.esercizi, 4, "2 esercizi in A + 2 in B");
  assert.equal(r.schedeMotivo, null);
  assert.ok(r.fonteSchede.includes("v2"));
  assert.equal(r.settimane.length, 4);
  assert.deepEqual(r.rotazione.codici, ["A", "B"]);
});

test("37.07 la lettura delle schede è in sola lettura e non tocca il DOM", () => {
  const src = readFileSync(new URL("../comune/schede-v2.js", import.meta.url), "utf8");
  assert.ok(!/\.set\(/.test(src), "niente .set( in schede-v2.js");
  assert.ok(!/document\./.test(src));
  assert.ok(src.includes("leggiSchedeGrezze"), "passa dalla lettura già ammessa");
  assert.ok(!/innerHTML/.test(readFileSync(new URL("../comune/vista-programma.js", import.meta.url), "utf8")));
});
