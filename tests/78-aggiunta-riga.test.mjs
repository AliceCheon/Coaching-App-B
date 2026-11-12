/* Passo B (12/11/2026): il clic sul selettore Database esercizi aggiunge la
 * riga in fondo alla scheda aperta. Prove PURE su comune/modifiche-b.js:
 * niente browser, niente Firestore — le stesse regole delle altre scritture. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggiungiEsercizio, annullaModifica, ultimaAnnullabile, versioneDi } from "../comune/modifiche-b.js";

function schedaDiProva() {
  return {
    versione: 3,
    sheet: {
      code: "A",
      exercises: [
        { id: "ex-1", name: "Hip Thrust", muscle: "Glutei", order: 0,
          progression: { weeks: [{ sets: 4, reps: "8-10" }, {}, {}, {}, {}, {}, {}, {}] } },
        { id: "ex-2", name: "Crunch", muscle: "Addome", order: 1,
          progression: { weeks: [{ sets: 3, reps: "15" }, {}, {}, {}, {}, {}, {}, {}] } },
        { id: "ex-vecchio", name: "Mobilità", deletedAt: "2026-11-01T00:00:00.000Z", order: 2 }
      ]
    }
  };
}

test("78.1 la scelta del selettore aggiunge la riga in fondo: distretto verbatim, settimane vuote, id nuovo", () => {
  const dati = schedaDiProva();
  const esito = aggiungiEsercizio(dati,
    { idScheda: "sh-A", esercizio: " Bulgarian Split Squat ", muscolo: "Quadricipiti" },
    { quando: "2026-11-12T01:40:00.000Z", uid: "alice" });
  assert.equal(esito.ok, true, esito.motivo);
  const elenco = esito.dati.sheet.exercises;
  assert.equal(elenco.length, 4);
  const riga = elenco[elenco.length - 1];
  assert.equal(riga.name, "Bulgarian Split Squat", "il nome arriva pulito dagli spazi");
  assert.equal(riga.muscle, "Quadricipiti", "il distretto del catalogo resta verbatim");
  assert.equal(riga.order, 3, "in fondo: dopo l'ordine massimo");
  assert.equal(riga.progression.weeks.length, 8, "otto settimane come le altre");
  riga.progression.weeks.forEach((w, k) => {
    assert.equal(w.sets, undefined, "serie vuota S" + (k + 1));
    assert.equal(w.reps, undefined, "ripetizioni vuote S" + (k + 1));
  });
  const ids = ["ex-1", "ex-2", "ex-vecchio"];
  assert.ok(riga.id, "l'id esiste");
  assert.ok(!ids.includes(riga.id), "id mai uguale a quelli esistenti, neanche cancellati");
  assert.equal(esito.dati.versione, versioneDi(dati) + 1);
  assert.ok(esito.dati.modificatoInB, "il marchio B ferma la Copia da A");
  assert.equal(esito.voce.tipo, "aggiunta-riga");
  assert.equal(esito.voce.idEsercizio, riga.id);
  assert.equal(esito.voce.esercizio, "Bulgarian Split Squat");
  /* Le righe gia' presenti non si toccano: «Addome» resta «Addome». */
  assert.equal(elenco[1].muscle, "Addome");
  assert.deepEqual(elenco[0], dati.sheet.exercises[0]);
  assert.deepEqual(elenco[2], dati.sheet.exercises[2]);
});

test("78.2 due aggiunte non condividono mai l'identificativo", () => {
  const dati = schedaDiProva();
  const a = aggiungiEsercizio(dati, { idScheda: "sh-A", esercizio: "Leg Press", muscolo: "Quadricipiti" }, {});
  const b = aggiungiEsercizio(a.dati, { idScheda: "sh-A", esercizio: "Lat Machine", muscolo: "Dorsali" }, {});
  assert.equal(a.ok, true, a.motivo);
  assert.equal(b.ok, true, b.motivo);
  assert.notEqual(a.id, b.id);
  const tutti = a.dati.sheet.exercises.concat(b.dati.sheet.exercises.slice(-1)).map((e) => e.id);
  assert.equal(new Set(tutti).size, tutti.length, "id tutti diversi nella scheda");
});

test("78.3 se il generatore propone un id gia' presente, se ne cerca un altro", () => {
  const dati = schedaDiProva();
  const esito = aggiungiEsercizio(dati, { idScheda: "sh-A", esercizio: "Chest Press", muscolo: "Petto" },
    { generaId: (t) => (t === 0 ? "ex-1" : "bdb-ex-libero") });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.id, "bdb-ex-libero");
});

test("78.4 senza nome non si scrive niente", () => {
  const dati = schedaDiProva();
  const esito = aggiungiEsercizio(dati, { idScheda: "sh-A", esercizio: "   ", muscolo: "Petto" }, {});
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /non ho scritto niente/);
  assert.deepEqual(dati.sheet.exercises.map((e) => e.id), ["ex-1", "ex-2", "ex-vecchio"]);
});

test("78.5 Annulla e Ctrl+Z tolgono la riga aggiunta e lasciano intatte le altre", () => {
  const dati = schedaDiProva();
  const esito = aggiungiEsercizio(dati, { idScheda: "sh-A", esercizio: "Romanian Deadlift", muscolo: "Femorali" },
    { quando: "2026-11-12T01:41:00.000Z" });
  assert.equal(esito.ok, true, esito.motivo);
  const voce = ultimaAnnullabile([{ id: esito.voce.idVoce, dati: esito.voce }]);
  assert.ok(voce, "la voce dell'aggiunta e' annullabile");
  assert.equal(voce.tipo, "aggiunta-riga");
  const ritorno = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-12T01:42:00.000Z" });
  assert.equal(ritorno.ok, true, ritorno.motivo);
  assert.deepEqual(ritorno.dati.sheet.exercises.map((e) => e.id), ["ex-1", "ex-2", "ex-vecchio"]);
  assert.equal(ritorno.voce.tipo, "annulla-modifica");
  assert.equal(ritorno.voce.annullaDi, esito.voce.idVoce);
  /* Annullata una volta: non lo e' una seconda. */
  const dopo = ultimaAnnullabile([
    { id: esito.voce.idVoce, dati: esito.voce },
    { id: ritorno.voce.idVoce, dati: ritorno.voce }
  ]);
  assert.equal(dopo, null, "nessun doppio annullamento");
});

test("78.6 la riga si toglie per id anche se fra tempo i suoi valori sono cambiati", () => {
  const dati = schedaDiProva();
  const esito = aggiungiEsercizio(dati, { idScheda: "sh-A", esercizio: "Face Pull", muscolo: "Spalle" }, {});
  const ultima = esito.dati.sheet.exercises[esito.dati.sheet.exercises.length - 1];
  ultima.progression.weeks[0] = { sets: 3, reps: "12" };
  const ritorno = annullaModifica(esito.dati, esito.voce, {});
  assert.equal(ritorno.ok, true, ritorno.motivo);
  assert.equal(ritorno.dati.sheet.exercises.length, 3);
});
