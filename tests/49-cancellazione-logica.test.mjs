/* Barbell Diva B — passo 4, giro di correzione del 7 novembre 2026.
 *
 * Due regole decise da Alice, e una che viene da A:
 *  1. i v1 si copiano SOLO se non esiste un v2 con lo stesso programId
 *     (regola di A, r.5636-5639); i v1 con gemello v2 si saltano e si contano
 *     («v1 doppioni saltati: N»);
 *  2. la cancellazione logica del logbook (A v137-141): la seduta cancellata
 *     resta nella raccolta con `deletedAt`; il conteggio la dichiara, la copia
 *     la porta com'e', il Logbook di B la esclude come fa A;
 *  3. si dichiara sempre «sedute valide (non cancellate)», perche' e' il numero
 *     che va confrontato con quello che A mostra.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { contaSedute, righeConteggi, confrontoConRadice } from "../comune/conteggi-copia.js";
import { pianoDiCopia } from "../comune/copia-b.js";
import { seduteLogbook } from "../comune/logbook.js";

function seduta(id, extra) {
  return { id: "doc-" + id, dati: { session: Object.assign({ id: id }, extra || {}) } };
}

/* ---------- 49.1 cancellazione logica: tre numeri separati ---------- */

test("49.1 contaSedute separa lette, cancellate e valide non cancellate", () => {
  const c = contaSedute([
    seduta("s1", { dateInput: "2026-10-01" }),
    seduta("s2", { dateInput: "2026-10-02", deletedAt: "2026-10-30T10:00:00.000Z" }),
    seduta("s3", { dateInput: "2026-10-03" })
  ]);
  assert.equal(c.documenti, 3);
  assert.equal(c.valide, 3);
  assert.equal(c.cancellate, 1);
  assert.equal(c.valideNonCancellate, 2);
});

test("49.2 deletedAt vuoto non e' una cancellazione (la regola di A e' falsy, non 'campo presente')", () => {
  const c = contaSedute([
    seduta("s1", { deletedAt: "" }),
    seduta("s2", { deletedAt: null })
  ]);
  assert.equal(c.cancellate, 0);
  assert.equal(c.valideNonCancellate, 2);
});

test("49.3 la cancellata non gonfia il confronto con quello che A dichiara", () => {
  const conteggi = {
    sedute: contaSedute([
      seduta("s1", {}),
      seduta("s2", {}),
      seduta("s3", { deletedAt: "2026-11-01T09:00:00.000Z" })
    ]),
    programmi: { distinti: 0 }
  };
  const c = confrontoConRadice(conteggi, { sessionCount: 2 });
  assert.equal(c.sessioni.dichiarato, 2);
  assert.equal(c.sessioni.letto, 2);
  assert.equal(c.sessioni.lettoGrezzo, 3);
  assert.equal(c.sessioni.cancellate, 1);
  assert.equal(c.sessioni.coincide, true);
});

/* ---------- 49.4 la riga a schermo lo dice, non lo nasconde ---------- */

test("49.4 la riga del Logbook dichiara le cancellate e le valide non cancellate", () => {
  const righe = righeConteggi({
    schede: { schede: 0, esercizi: 0, archiviate: 0, programmi: 0 },
    programmi: { distinti: 0, documentiMeta: 0, documentiV1: 0, fuoriElenco: 0 },
    sedute: contaSedute([
      seduta("s1", { dateInput: "2026-10-01" }),
      seduta("s2", { dateInput: "2026-10-02" }),
      seduta("s3", { dateInput: "2026-10-03", deletedAt: "2026-11-01T09:00:00.000Z" })
    ]),
    radice: {},
    confronto: {}
  });
  const logbook = righe.find((r) => r.cosa === "Logbook");
  assert.ok(logbook, "la riga Logbook deve esistere");
  assert.match(logbook.lettoOra, /di cui con cancellazione logica: 1/);
  assert.match(logbook.lettoOra, /sedute valide \(non cancellate\): 2/);
  assert.match(logbook.lettoOra, /su 3 distinte lette/);
});

/* ---------- 49.5 i v1: copiati solo se soli ---------- */

test("49.5 un v1 con gemello v2 si salta e si conta; un v1 solo si copia", () => {
  const piano = pianoDiCopia({
    programmi: [
      { id: "program-v2-meta-p1", dati: { programMeta: { id: "p1", name: "Forza" } } },
      { id: "program-v2-meta-p2", dati: { programMeta: { id: "p2", name: "Massa" } } },
      { id: "program-v1-p1", dati: { program: { id: "p1", name: "Forza" } } },
      { id: "program-v1-p9", dati: { program: { id: "p9", name: "Solo vecchio" } } }
    ],
    schede: [],
    sedute: []
  });
  const idCopiati = piano.voci.filter((v) => v.famiglia === "programmi").map((v) => v.id).sort();
  assert.deepEqual(idCopiati, ["program-v1-p9", "program-v2-meta-p1", "program-v2-meta-p2"]);
  assert.equal(piano.conteggi.programmi, 3);
  assert.equal(piano.conteggi.v1DoppioniSaltati, 1);
  assert.deepEqual(piano.v1Saltati, ["program-v1-p1"]);
});

test("49.6 senza doppioni il numero e' zero, e si dice zero", () => {
  const piano = pianoDiCopia({
    programmi: [
      { id: "program-v2-meta-p1", dati: { programMeta: { id: "p1" } } },
      { id: "program-v1-p9", dati: { program: { id: "p9" } } }
    ],
    schede: [],
    sedute: []
  });
  assert.equal(piano.conteggi.v1DoppioniSaltati, 0);
});

test("49.7 il campo schedeV1Intere non esiste piu' (era rimasto dal giro prima)", () => {
  const piano = pianoDiCopia({ programmi: [], schede: [], sedute: [] });
  assert.equal(Object.prototype.hasOwnProperty.call(piano.esclusi, "schedeV1Intere"), false);
  assert.equal(piano.esclusi.archiviate, 0);
});

/* ---------- 49.8 la copia resta fedele: porta la cancellata com'e' ---------- */

test("49.8 la seduta cancellata entra nella copia, con il suo deletedAt intatto", () => {
  const cancellata = seduta("s9", { deletedAt: "2026-11-01T09:00:00.000Z" });
  const piano = pianoDiCopia({ programmi: [], schede: [], sedute: [cancellata, seduta("s10", {})] });
  assert.equal(piano.conteggi.sedute, 2);
  const voce = piano.voci.find((v) => v.famiglia === "sedute" && v.id === cancellata.id);
  assert.ok(voce, "la seduta cancellata deve essere nel piano");
  assert.equal(voce.dati.session.deletedAt, "2026-11-01T09:00:00.000Z");
});

/* ---------- 49.9 il Logbook di B esclude le cancellate come A ---------- */

test("49.9 seduteLogbook scarta la seduta cancellata e la dichiara", () => {
  const esito = seduteLogbook(
    [
      { id: "s1", dateInput: "2026-10-01", sessionCode: "A", exercises: [] },
      { id: "s2", dateInput: "2026-10-02", sessionCode: "B", exercises: [], deletedAt: "2026-11-01T09:00:00.000Z" }
    ],
    {}
  );
  assert.equal(esito.sedute.length, 1);
  assert.equal(esito.sedute[0].id, "s1");
  assert.equal(esito.dichiarazioni.lette, 1);
  assert.equal(esito.dichiarazioni.cancellate, 1);
});
