/* Passo 21 -- "Applica progressione a tutta la scheda" (10/11/2026).
 *
 * Nel v31 e' il pulsante r.3771 (comando `cmdProgAll` r.9965, applicazione
 * r.9986-10008): apre le 13 voci di `PRG` (r.9043-9060), le scrive sulle otto
 * settimane di TUTTE le righe della scheda aperta e offre un annulla nel
 * messaggio in basso. Qui si prova che:
 *
 *  67.1 le 13 voci sono quelle del v31, con Custom al suo posto;
 *  67.2 una voce con tabella propria scrive tutte le righe vive e salta le tolte;
 *  67.3 "Custom" copia la settimana 1 su tutte le settimane (r.9992);
 *  67.4 nel registro c'e' UNA voce sola, con tutte le righe dentro;
 *  67.5 l'Annulla riporta indietro tutte le righe in un colpo;
 *  67.6 se una riga non porta le settimane non si scrive niente;
 *  67.7 il pulsante della barra e' collegato, non spento.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PRG, coppieScheda, voceScheda } from "../comune/progressioni-b.js";
import { applicaProgressioneScheda, annullaModifica, ultimaAnnullabile } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const V31 = readFileSync(join(radice, "pc", "index.html"), "utf8");

const sett = (n, sets, reps) => ({ week: n, sets: sets, reps: reps, rest: { seconds: 60 }, type: "normal", note: "" });
const otto = (s, r) => [sett(1, s, r), sett(2, s, r), sett(3, s, r), sett(4, s, r), sett(5, s, r), sett(6, s, r), sett(7, s, r), sett(8, s, r)];

function documento() {
  return {
    id: "program-v2-sheet-p1__B",
    programId: "p1",
    sheetId: "B",
    versione: 7,
    sheet: {
      code: "B",
      exercises: [
        { id: "a", name: "Lat machine", order: 0, prescription: { sets: 4, reps: "8-10" }, progression: { weeks: otto(4, "8-10") } },
        { id: "b", name: "Rematore", order: 1, prescription: { sets: 4, reps: "8-10" }, progression: { weeks: otto(4, "8-10") } },
        { id: "c", name: "Tolto", order: 2, prescription: { sets: 4, reps: "8-10" }, progression: { weeks: otto(4, "8-10") }, deletedAt: "2026-11-09T10:00:00.000Z" }
      ]
    }
  };
}
const opz = (q) => ({ quando: q, uid: "u1" });

test("67.1 le 13 voci sono quelle del v31", () => {
  assert.equal(PRG.length, 13);
  /* i nomi, nell'ordine: la prima e' Forza neurale, la sesta e' Custom */
  assert.equal(PRG[0].n, "Forza neurale");
  assert.equal(PRG[5].n, "Custom");
  assert.equal(PRG[12].n, "Top Set + Back-Off 4-6 / 8-8");
  /* e nel v31 le stesse 13 righe ci sono davvero */
  ["Forza neurale", "Custom", "Reps range vol fisso", "Attivazione 10-2", "Pesante 4-6"].forEach((nome) => {
    assert.ok(V31.indexOf("n:'" + nome + "'") !== -1 || V31.indexOf('n:"' + nome + '"') !== -1, "nel v31 manca «" + nome + "»");
  });
  PRG.forEach((v, i) => assert.equal(v.id, String(i)));
});

test("67.2 una voce scrive tutte le righe vive e salta le tolte", () => {
  const dati = documento();
  const esito = applicaProgressioneScheda(dati, { idScheda: "B", campo: "progressione-scheda", progressione: "11" }, opz("2026-11-10T22:00:00.000Z"));
  assert.equal(esito.ok, true, esito.motivo);
  const ex = esito.dati.sheet.exercises;
  /* Pesante 4-6: serie 4,4,4,5,4,4,3,3 e reps 4-6 */
  assert.deepEqual(ex[0].progression.weeks.map((w) => w.sets), [4, 4, 4, 5, 4, 4, 3, 3]);
  assert.deepEqual(ex[1].progression.weeks.map((w) => w.reps), ["4-6", "4-6", "4-6", "4-6", "4-6", "4-6", "4-6", "4-6"]);
  /* la riga tolta resta com'era */
  assert.deepEqual(ex[2].progression.weeks.map((w) => w.reps), ["8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10"]);
  assert.equal(esito.dati.versione, 8);
});

test("67.3 Custom copia la settimana 1 su tutte", () => {
  /* Custom = id 5, w:null */
  assert.deepEqual(coppieScheda("5", { s: 3, r: "12" }), [["3", "12"], ["3", "12"], ["3", "12"], ["3", "12"], ["3", "12"], ["3", "12"], ["3", "12"], ["3", "12"]]);
  const dati = documento();
  /* una scheda con la S1 diversa dalle altre: Custom la ripete su tutte */
  dati.sheet.exercises[0].progression.weeks = [sett(1, 5, "6"), sett(2, 3, "12"), sett(3, 3, "12"), sett(4, 3, "12"), sett(5, 3, "12"), sett(6, 3, "12"), sett(7, 3, "12"), sett(8, 3, "12")];
  const esito = applicaProgressioneScheda(dati, { idScheda: "B", campo: "progressione-scheda", progressione: "5" }, opz("2026-11-10T22:00:00.000Z"));
  assert.equal(esito.ok, true, esito.motivo);
  assert.deepEqual(esito.dati.sheet.exercises[0].progression.weeks.map((w) => w.reps), ["6", "6", "6", "6", "6", "6", "6", "6"]);
  assert.deepEqual(esito.dati.sheet.exercises[0].progression.weeks.map((w) => w.sets), [5, 5, 5, 5, 5, 5, 5, 5]);
});

test("67.4 una voce sola con tutte le righe dentro", () => {
  const esito = applicaProgressioneScheda(documento(), { idScheda: "B", campo: "progressione-scheda", progressione: "11" }, opz("2026-11-10T22:00:00.000Z"));
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.voce.tipo, "modifica-progressione-scheda");
  assert.equal(esito.voce.nomeProgressione, "Pesante 4-6");
  assert.equal(esito.voce.righe.length, 2, "le righe vive sono due");
  esito.voce.righe.forEach((r) => {
    assert.equal(r.prima.length, 8);
    assert.equal(r.dopo.length, 8);
  });
  assert.equal(esito.voce.righe[0].idEsercizio, "a");
  /* l'Annulla la trova */
  assert.equal(ultimaAnnullabile([{ id: esito.voce.idVoce, dati: esito.voce }]).idVoce, esito.voce.idVoce);
});

test("67.5 l'Annulla riporta indietro tutte le righe", () => {
  const esito = applicaProgressioneScheda(documento(), { idScheda: "B", campo: "progressione-scheda", progressione: "11" }, opz("2026-11-10T22:00:00.000Z"));
  const indietro = annullaModifica(esito.dati, esito.voce, opz("2026-11-10T22:01:00.000Z"));
  assert.equal(indietro.ok, true, indietro.motivo);
  const ex = indietro.dati.sheet.exercises;
  assert.deepEqual(ex[0].progression.weeks.map((w) => w.reps), ["8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10"]);
  assert.deepEqual(ex[1].progression.weeks.map((w) => w.sets), [4, 4, 4, 4, 4, 4, 4, 4]);
  assert.equal(indietro.voce.tipo, "annulla-modifica");
  assert.equal(indietro.voce.annullaDi, esito.voce.idVoce);
});

test("67.6 se una riga non porta le settimane non si scrive niente", () => {
  const dati = documento();
  dati.sheet.exercises[1].progression = {};
  const esito = applicaProgressioneScheda(dati, { idScheda: "B", campo: "progressione-scheda", progressione: "11" }, opz("2026-11-10T22:00:00.000Z"));
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /non porta le settimane/);
  assert.equal(esito.dati, undefined);
});

test("67.7 il pulsante della barra e' collegato", () => {
  const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
  assert.match(vista, /pulsanteVivo\(doc, "pr-btn", "Applica progressione a tutta la scheda"/);
  assert.match(vista, /campo: "progressione-scheda"/);
  assert.match(vista, /modificaCorrente\.onCambia/);
  assert.ok(vociSchedaDi(vista).length > 0);
});

function vociSchedaDi(vista) {
  return vista.split("\n").filter((r) => r.indexOf("vociScheda()") !== -1);
}

test("67.8 Custom su una scheda che ha gia' la S1 ovunque non scrive", () => {
  const dati = documento();
  dati.sheet.exercises.forEach((e) => { e.progression.weeks = otto(4, "8-10"); });
  const esito = applicaProgressioneScheda(dati, { idScheda: "B", campo: "progressione-scheda", progressione: "5" }, opz("2026-11-10T22:00:00.000Z"));
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /non cambia nessuna cella/);
});
