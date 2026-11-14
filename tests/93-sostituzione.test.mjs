/* Passo B.15 — la sostituzione dell'esercizio (tasto ⇄).
 * La riga cambia nome e distretto, tiene id, ordine e carichi; le figlie
 * tecniche restano attaccate; il Logbook non si tocca; un Annulla rimette
 * nome e distretto. */

import { test } from "node:test";
import assert from "node:assert/strict";
import { sostituisciEsercizio, annullaModifica, ultimaAnnullabile } from "../comune/modifiche-b.js";

function datiDiProva() {
  const settimane = [];
  for (let i = 0; i < 8; i += 1) settimane.push({ serie: String(4 + i), ripetizioni: "10", rec: "90", TUT: "0-1" });
  return {
    sheet: {
      code: "A",
      exercises: [
        { id: "ex-1", name: "Panca piana", muscle: "Pettorali", order: 1, progression: { weeks: settimane } },
        { id: "tex-1", padreId: "ex-1", name: "Drop set", order: 2, progression: { weeks: [] } },
        { id: "ex-2", name: "Rematore", muscle: "Dorsali", order: 3, progression: { weeks: [] } }
      ],
      logbook: [{ quando: "2026-11-01", esercizio: "Panca piana", carico: "60x10" }]
    }
  };
}

const RICHIESTA = { idScheda: "s1", idEsercizio: "ex-1", esercizio: "Panca piana", nuovo: "Panca inclinata con manubri", muscolo: "Pettorali" };
const QUANDO = "2026-11-14T01:30:00Z";

test("93.1 sostituisce nome e distretto e tiene id, ordine e posizione", () => {
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  assert.equal(esito.ok, true);
  const riga = esito.dati.sheet.exercises[0];
  assert.equal(riga.id, "ex-1");
  assert.equal(riga.order, 1);
  assert.equal(riga.name, "Panca inclinata con manubri");
  assert.equal(riga.muscle, "Pettorali");
});

test("93.2 i carichi delle 8 settimane restano", () => {
  const prima = datiDiProva().sheet.exercises[0].progression.weeks;
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  assert.deepEqual(esito.dati.sheet.exercises[0].progression.weeks, prima);
});

test("93.3 le righe tecniche figlie restano attaccate e la voce le conta", () => {
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  const figlia = esito.dati.sheet.exercises.find((e) => e.id === "tex-1");
  assert.equal(figlia.padreId, "ex-1");
  assert.equal(figlia.deletedAt, undefined);
  assert.deepEqual(esito.voce.figli, ["tex-1"]);
});

test("93.4 una voce sola, con prima e dopo", () => {
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  assert.equal(esito.voce.tipo, "sostituzione-riga");
  assert.equal(esito.voce.campo, "riga");
  assert.deepEqual(esito.voce.prima, { nome: "Panca piana", muscolo: "Pettorali" });
  assert.deepEqual(esito.voce.dopo, { nome: "Panca inclinata con manubri", muscolo: "Pettorali" });
});

test("93.5 il Logbook non si tocca", () => {
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  assert.deepEqual(esito.dati.sheet.logbook, datiDiProva().sheet.logbook);
});

test("93.6 un Annulla rimette nome e distretto, i carichi restano", () => {
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  const ritorno = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-14T01:31:00Z" });
  assert.equal(ritorno.ok, true);
  const riga = ritorno.dati.sheet.exercises[0];
  assert.equal(riga.name, "Panca piana");
  assert.equal(riga.muscle, "Pettorali");
  assert.equal(ritorno.voce.tipo, "annulla-modifica");
  assert.equal(ritorno.voce.annullaDi, esito.voce.idVoce);
  assert.equal(riga.progression.weeks[0].serie, "4");
});

test("93.7 la voce e' annullabile e il ripescaggio per nome funziona", () => {
  const esito = sostituisciEsercizio(datiDiProva(), RICHIESTA, { quando: QUANDO });
  const voce = ultimaAnnullabile([{ dati: esito.voce }]);
  assert.equal(voce && voce.tipo, "sostituzione-riga");
  const senzaId = sostituisciEsercizio(datiDiProva(), { idScheda: "s1", esercizio: "Rematore", nuovo: "Rematore manubrio", muscolo: "Dorsali" }, { quando: QUANDO });
  assert.equal(senzaId.ok, true);
  assert.equal(senzaId.dati.sheet.exercises[2].name, "Rematore manubrio");
});

test("93.8 si rifiuta dove non c'e' niente da sostituire", () => {
  const manca = sostituisciEsercizio(datiDiProva(), { idScheda: "s1", idEsercizio: "niente", nuovo: "X" }, { quando: QUANDO });
  assert.equal(manca.ok, false);
  const tolta = datiDiProva();
  tolta.sheet.exercises[0].deletedAt = "2026-11-13T00:00:00Z";
  const rifiuto = sostituisciEsercizio(tolta, { idScheda: "s1", idEsercizio: "ex-1", nuovo: "X" }, { quando: QUANDO });
  assert.equal(rifiuto.ok, false);
  const senzaNome = sostituisciEsercizio(datiDiProva(), { idScheda: "s1", idEsercizio: "ex-1" }, { quando: QUANDO });
  assert.equal(senzaNome.ok, false);
});
