import test from "node:test";
import assert from "node:assert/strict";
import { seduteSecondoA, confrontaElenchi, ID_RECENTE } from "../comune/regola-sedute-a.js";
import { confrontoConRadice, righeConteggi } from "../comune/conteggi-copia.js";

const seduta = (extra) => Object.assign({
  id: "1758000000001",
  dateInput: "2025-03-04",
  source: "App",
  sessionCode: "A",
  exercises: [{ name: "Squat", sets: [{ kg: 60, reps: 8 }] }]
}, extra || {});

test("50.1 lo stesso id due volte diventa una seduta, e il doppione si conta", () => {
  const esito = seduteSecondoA([seduta({ id: "10" }), seduta({ id: "10" })]);
  assert.equal(esito.distintePerId, 1);
  assert.equal(esito.doppioniId, 1);
});

test("50.2 le righe senza id non si buttano: A le tiene", () => {
  const esito = seduteSecondoA([seduta({ id: "" }), seduta({ id: "" })]);
  assert.equal(esito.distintePerId, 2);
  assert.equal(esito.doppioniId, 0);
});

test("50.3 una seduta con fonte diversa e id vecchio resta VISIBILE: in A perde solo il cestino", () => {
  const esito = seduteSecondoA([seduta({ id: "7", source: "Logbook vecchio" })]);
  assert.equal(esito.distintePerId, 1, "A non la nasconde: la r.14398 non e' un filtro");
  assert.equal(esito.conCestino, 0);
  assert.equal(esito.senzaCestino.length, 1);
  assert.equal(esito.senzaCestino[0].id, "7");
  assert.equal(esito.senzaCestino[0].data, "2025-03-04");
});

test("50.4 la fonte vale piu' dell'id: una seduta App con id piccolo si mostra e ha il cestino", () => {
  const esito = seduteSecondoA([seduta({ id: "7", source: "App" })]);
  assert.equal(esito.distintePerId, 1);
  assert.equal(esito.conCestino, 1);
  assert.equal(esito.senzaCestino.length, 0);
});

test("50.5 senza campo fonte la seduta e' App, come in A", () => {
  const esito = seduteSecondoA([seduta({ id: "7", source: undefined })]);
  assert.equal(esito.conCestino, 1);
  assert.equal(esito.senzaCestino.length, 0);
});

test("50.6 da 129 documenti A mostra 127: scarta solo le 2 con cancellazione logica", () => {
  const righe = [];
  for (let i = 1; i <= 129; i += 1) {
    righe.push(seduta({ id: String(1758000000000 + i), source: i <= 31 ? "Logbook vecchio" : "App", exercises: [{ name: "Esercizio " + i, sets: [{ kg: 60, reps: 8 }] }] }));
  }
  righe[40] = Object.assign({}, righe[40], { deletedAt: "2025-04-01T10:00:00.000Z" });
  righe[77] = Object.assign({}, righe[77], { deletedAt: "2025-04-02T10:00:00.000Z" });
  const esito = seduteSecondoA(righe);
  assert.equal(esito.documenti, 129);
  assert.equal(esito.cancellate, 2);
  assert.equal(esito.dopoCancellate, 127);
  assert.equal(esito.doppioniId, 0);
  assert.equal(esito.distintePerId, 127);
  assert.equal(esito.conCestino + esito.senzaCestino.length, 127);
});

test("50.7 il confronto non pretende che i due numeri coincidano: dichiara la differenza", () => {
  const c = confrontoConRadice(
    { sedute: { valide: 129, valideNonCancellate: 127, visibili: 127, cancellate: 2, doppioniId: 0, senzaCestino: [], elenco: [] } },
    { sessionCount: 126 }
  );
  assert.equal(c.sessioni.dichiarato, 126);
  assert.equal(c.sessioni.letto, 127);
  assert.equal(c.sessioni.differenza, 1);
  assert.equal(c.sessioni.coincide, false, "il numero di A e' la sua lista, non un riconteggio");
  assert.equal(c.sessioni.cancellate, 2);
  assert.equal(c.sessioni.elencoDiA, false, "senza elenco nel payload il confronto id per id non si inventa");
});

test("50.8 la riga a schermo dichiara ogni passo, non solo il totale", () => {
  const righe = righeConteggi({
    schede: { schede: 26, esercizi: 0, archiviate: 170, programmi: 8 },
    programmi: { distinti: 8, documentiMeta: 8, documentiV1: 0 },
    sedute: {
      documenti: 129,
      valide: 129,
      valideNonCancellate: 127,
      visibili: 127,
      cancellate: 2,
      doppioniId: 0,
      senzaCestino: new Array(33).fill({ id: "x", fonte: "Logbook vecchio", data: "2025-01-01" })
    }
  });
  const tutto = righe.map((r) => [r.cosa, r.lettoOra, r.nota].join(" ")).join(" | ");
  const cerca = (frase) => assert.ok(tutto.indexOf(frase) >= 0, "manca: " + frase);
  cerca("sedute valide (non cancellate): 127");
  cerca("sedute che A mostra: 127");
  cerca("di cui con cancellazione logica: 2");
  cerca("in A senza cestino: 33");
});

test("50.9 con l'elenco nel payload la seduta mancante si nomina", () => {
  const documenti = [seduta({ id: "a" }), seduta({ id: "b" })];
  const confronto = confrontaElenchi([seduta({ id: "a" })], documenti);
  assert.equal(confronto.disponibile, true);
  assert.equal(confronto.comuni, 1);
  assert.equal(confronto.soloNeiDocumenti.length, 1);
  assert.equal(confronto.soloNeiDocumenti[0].id, "b");
  assert.equal(confronto.soloInElenco.length, 0);
});

test("50.10 senza elenco nel payload non si inventa nessuna spiegazione", () => {
  const confronto = confrontaElenchi(null, [seduta({ id: "a" })]);
  assert.equal(confronto.disponibile, false);
  assert.equal(confronto.inElenco, null);
  assert.deepEqual(confronto.soloNeiDocumenti, []);
});

test("50.11 la soglia degli id e' quella di A, e la costante e' esportata", () => {
  assert.equal(ID_RECENTE, 1000000000);
  const esito = seduteSecondoA([seduta({ id: String(ID_RECENTE - 1), source: "App Workout Pro" })]);
  assert.equal(esito.distintePerId, 1);
  assert.equal(esito.senzaCestino.length, 1);
});
