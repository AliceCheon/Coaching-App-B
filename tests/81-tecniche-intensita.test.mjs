/* Fase 1 — le tecniche di intensita' come riga figlia (12/11/2026).
 *
 * Cosa e' provato qui, con le parole di Alice:
 *  - il ⊕ fa nascere la riga figlia sotto il padre (una sola per riga);
 *  - ✕ sul padre toglie anche la figlia, e l'Annulla le rimette ENTRAMBE;
 *  - Annulla/Ctrl+Z: la riga aggiunta si toglie, la modifica-tecnica si
 *    rimette com'era, tutto per id mai per posizione;
 *  - le funzioni che NON devono toccare la figlia: Applica progressione
 *    (riga e scheda), i conteggi degli esercizi, Copia (i conti);
 *  - i parametri Myo-Reps accettano l'intervallo («12-15», «3-4») e la nota
 *    scritta a mano resta se cambio un parametro;
 *  - il Rec della figlia («3 resp.», «20-25″») non passa dal validatore
 *    delle celle perche' la sua cella e' solo vista: nessuna scrittura;
 *  - schede senza tecniche restano IDENTICHE.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  aggiungiTecnica, scriviTecnica, rimuoviTecnica,
  applicaProgressione, applicaProgressioneScheda,
  cancellaEsercizio, annullaModifica, ultimaAnnullabile
} from "../comune/modifiche-b.js";
import { notaVisibile, recTecnica, parametriValidi, eTecnica, nomeTecnica } from "../comune/tecniche-b.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { recuperoScrittoValido } from "../comune/tut-rec.js";

function settimaneBase() {
  const weeks = [];
  for (let k = 0; k < 8; k += 1) weeks.push({ sets: 4, reps: "8-10" });
  return weeks;
}

function padre() {
  return { id: "ex-1", name: "Panca piana", muscle: "Pectorali", weeks: settimaneBase() };
}

function datiScheda(esercizi) {
  return {
    programId: "prg-1", sheetId: "s1", versione: 1,
    sheet: { id: "s1", code: "A", exercises: esercizi }
  };
}

function documento(di) {
  return { id: "program-v2-sheet-prg-1__s1", dati: di };
}

test("il ⊕ aggiunge UNA riga figlia sotto il padre, con le settimane del mockup", () => {
  const d = datiScheda([padre()]);
  const esito = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "rest-pause" }, {});
  assert.equal(esito.ok, true, esito.motivo || "");
  assert.equal(esito.dati.sheet.exercises.length, 2);
  const figlia = esito.dati.sheet.exercises[1];
  assert.equal(eTecnica(figlia), true);
  assert.equal(figlia.padreId, "ex-1");
  assert.equal(figlia.tecnica, "rest-pause");
  assert.equal(figlia.contaVolume, false);
  assert.equal(figlia.settimane.length, 8);
  assert.deepEqual(figlia.settimane[0], { serie: 1, reps: "rest pause" });
  assert.equal(figlia["nota"].manuale, null);
  assert.ok(figlia["nota"].auto.length > 0);
  assert.equal(esito.voce.tipo, "aggiunta-riga");
  assert.equal(esito.voce.idEsercizio, figlia.id);
  assert.equal(esito.dati.versione, 2);
});

test("il ⊕ rifiuta una seconda tecnica sulla stessa riga", () => {
  const d = datiScheda([padre()]);
  const prima = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "myo-reps" }, {});
  const seconda = aggiungiTecnica(prima.dati, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "drop-set" }, {});
  assert.equal(seconda.ok, false);
  assert.match(seconda.motivo, /gia' la sua tecnica/);
});

test("Annulla toglie la riga figlia appena nata (voce aggiunta-riga)", () => {
  const d = datiScheda([padre()]);
  const esito = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "drop-set" }, {});
  const indietro = annullaModifica(esito.dati, esito.voce, {});
  assert.equal(indietro.ok, true, indietro.motivo || "");
  assert.equal(indietro.dati.sheet.exercises.length, 1);
  assert.equal(indietro.dati.sheet.exercises[0].id, "ex-1");
});

test("✕ sul padre toglie anche la figlia, e l'Annulla le rimette entrambe", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "rest-pause" }, {});
  const figliaId = nata.riga.id;
  const tolto = cancellaEsercizio(nata.dati, { idScheda: "s1", idEsercizio: "ex-1" }, {});
  assert.equal(tolto.ok, true, tolto.motivo || "");
  assert.ok(tolto.dati.sheet.exercises[0].deletedAt);
  assert.ok(tolto.dati.sheet.exercises[1].deletedAt, "la figlia segue il padre");
  assert.deepEqual(tolto.voce.figli, [figliaId]);
  const rimessa = annullaModifica(tolto.dati, tolto.voce, {});
  assert.equal(rimessa.ok, true, rimessa.motivo || "");
  assert.ok(!rimessa.dati.sheet.exercises[0].deletedAt);
  assert.ok(!rimessa.dati.sheet.exercises[1].deletedAt, "la figlia torna con il padre");
});

test("Applica progressione alla riga rifiuta la figlia e non scrive niente", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "rest-pause" }, {});
  const figlia = nata.dati.sheet.exercises[1];
  const rifiuto = applicaProgressione(nata.dati, { idScheda: "s1", idEsercizio: figlia.id, progressione: "deload-cycle" }, {});
  assert.equal(rifiuto.ok, false);
  assert.match(rifiuto.motivo, /non prende la progressione/);
});

test("Applica progressione alla scheda salta la figlia: il padre cambia, lei no", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "myo-reps" }, {});
  const figliaPrima = JSON.parse(JSON.stringify(nata.dati.sheet.exercises[1].settimane));
  const esito = applicaProgressioneScheda(nata.dati, { idScheda: "s1", progressione: "0" }, {});
  assert.equal(esito.ok, true, esito.motivo || "");
  const padreDopo = esito.dati.sheet.exercises[0];
  const figliaDopo = esito.dati.sheet.exercises[1];
  assert.equal(eTecnica(figliaDopo), true);
  assert.equal(figliaDopo.tecnica, "myo-reps");
  assert.deepEqual(figliaDopo.settimane, figliaPrima, "le settimane della tecnica non si toccano");
  assert.notDeepEqual([padreDopo.settimane && padreDopo.settimane[0]], [{ sets: 4, reps: "8-10" }]);
  /* e l'annullamento di una voce tollera la figlia senza toccarla */
  const indietro = annullaModifica(esito.dati, esito.voce, {});
  assert.equal(indietro.ok, true, indietro.motivo || "");
  assert.deepEqual(indietro.dati.sheet.exercises[1].settimane, figliaPrima);
});

test("rimuoviTecnica marca la figlia tolta e l'Annulla la rimette", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "rest-pause" }, {});
  const figliaId = nata.riga.id;
  const tolta = rimuoviTecnica(nata.dati, { idScheda: "s1", idEsercizio: figliaId }, {});
  assert.equal(tolta.ok, true, tolta.motivo || "");
  assert.equal(tolta.voce.tipo, "cancella-riga");
  assert.ok(tolta.dati.sheet.exercises[1].deletedAt);
  const rimessa = annullaModifica(tolta.dati, tolta.voce, {});
  assert.equal(rimessa.ok, true, rimessa.motivo || "");
  assert.ok(!rimessa.dati.sheet.exercises[1].deletedAt);
});

test("i parametri Myo-Reps accettano l'intervallo e la nota a mano resta", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "myo-reps" }, {});
  const figliaId = nata.riga.id;
  const valida = parametriValidi("myo-reps", { attivazione: "12-15", rir: "3-4", ripMini: 5, recupero: { respiri: 3 }, maxMini: null });
  assert.equal(valida.ok, true, valida.motivo || "");
  const rotti = parametriValidi("myo-reps", { attivazione: "abc", rir: "3-4", ripMini: 5, recupero: { respiri: 3 } });
  assert.equal(rotti.ok, false);
  /* prima scrivo la nota a mano... */
  const conNota = scriviTecnica(nata.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "nota", manuale: "Questa è la mia nota." }, {});
  assert.equal(conNota.ok, true, conNota.motivo || "");
  assert.equal(notaVisibile(conNota.dati.sheet.exercises[1]), "Questa è la mia nota.");
  /* ...poi cambio un parametro: la nota a mano RESTA */
  const conPar = scriviTecnica(conNota.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "parametri", parametri: { attivazione: "10-12", rir: "2-3", ripMini: 4, recupero: { respiri: 3 }, maxMini: null } }, {});
  assert.equal(conPar.ok, true, conPar.motivo || "");
  const figlia = conPar.dati.sheet.exercises[1];
  assert.equal(figlia.parametri.attivazione, "10-12");
  assert.equal(notaVisibile(figlia), "Questa è la mia nota.", "la nota scritta da Alice vince");
  assert.notEqual(figlia["nota"].auto, nata.riga["nota"].auto, "l'automatica segue i parametri");
  /* il ripristino torna all'automatica nuova */
  const ripristino = scriviTecnica(conPar.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "nota", manuale: null }, {});
  assert.equal(notaVisibile(ripristino.dati.sheet.exercises[1]), figlia["nota"].auto);
});

test("le settimane della tecnica si scrivono una per una, con le regole delle celle", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "rest-pause" }, {});
  const figliaId = nata.riga.id;
  const prova = scriviTecnica(nata.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "settimana", settimana: 8, campoCella: "reps", valore: "Test 8 RM" }, {});
  assert.equal(prova.ok, true, prova.motivo || "");
  assert.equal(prova.dati.sheet.exercises[1].settimane[7].reps, "Test 8 RM");
  assert.equal(prova.dati.sheet.exercises[1].settimane[0].reps, "rest pause");
  const serieCattiva = scriviTecnica(nata.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "settimana", settimana: 1, campoCella: "serie", valore: "abc" }, {});
  assert.equal(serieCattiva.ok, false);
  const repsLunga = scriviTecnica(nata.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "settimana", settimana: 1, campoCella: "reps", valore: "x".repeat(41) }, {});
  assert.equal(repsLunga.ok, false);
});

test("Annulla rimette la riga tecnica com'era, e la voce e' annullabile", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "drop-set" }, {});
  const figliaId = nata.riga.id;
  const cambiata = scriviTecnica(nata.dati, { idScheda: "s1", idEsercizio: figliaId, sottocampo: "parametri", parametri: { scalate: [15, 30, 45] } }, {});
  assert.equal(cambiata.ok, true, cambiata.motivo || "");
  const voce = ultimaAnnullabile([{ id: "v1", dati: cambiata.voce }]);
  assert.ok(voce, "la voce modifica-tecnica e' annullabile");
  assert.equal(voce.tipo, "modifica-tecnica");
  const indietro = annullaModifica(cambiata.dati, cambiata.voce, {});
  assert.equal(indietro.ok, true, indietro.motivo || "");
  assert.deepEqual(indietro.dati.sheet.exercises[1].parametri.scalate, [20, 40]);
});

test("i conteggi: la figlia non e' un esercizio, le schede senza tecnica sono identiche", () => {
  const senza = datiScheda([padre(), { id: "ex-2", name: "Croci ai cavi", muscle: "Pectorali", weeks: settimaneBase() }]);
  const con = datiScheda([padre(), { id: "ex-2", name: "Croci ai cavi", muscle: "Pectorali", weeks: settimaneBase() }]);
  const nata = aggiungiTecnica(con, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "drop-set" }, {});
  const letta = ricostruisciSchede([documento(nata.dati)]);
  const gruppo = letta.perProgramma["prg-1"];
  const scheda = gruppo.schede[0];
  assert.equal(scheda.numeroEsercizi, 2, "la figlia non conta come esercizio");
  assert.equal(scheda.tecniche.length, 1);
  assert.equal(scheda.tecniche[0].padreId, "ex-1");
  assert.equal(scheda.tecniche[0].tecnica, "drop-set");
  const reference = ricostruisciSchede([documento(senza)]);
  assert.equal(reference.perProgramma["prg-1"].schede[0].numeroEsercizi, 2);
  /* schede senza tecniche: esercizi identici, tecniche vuote */
  const pulita = reference.perProgramma["prg-1"].schede[0];
  assert.equal(pulita.tecniche.length, 0);
  assert.deepEqual(pulita.esercizi.map((e) => e.id), ["ex-1", "ex-2"]);
});

test("il Rec della figlia e' solo vista: «3 resp.» non passa il validatore delle celle", () => {
  const d = datiScheda([padre()]);
  const nata = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "myo-reps" }, {});
  assert.equal(recTecnica(nata.riga), "3 resp.");
  assert.equal(recuperoScrittoValido("3 resp."), false, "per questo la cella della tecnica non si scrive a mano e non ha freccette");
  const rip = aggiungiTecnica(d, { idScheda: "s1", idEsercizio: "ex-1", tecnica: "rest-pause" }, {});
  assert.equal(recTecnica(rip.riga), "20\u2033");
  assert.equal(recuperoScrittoValido("20-25\u2033"), true, "un intervallo di secondi resta un recupero vero");
});

test("le tre tecniche esistono e si chiamano come nel mockup", () => {
  assert.equal(nomeTecnica("rest-pause"), "REST-PAUSE");
  assert.equal(nomeTecnica("myo-reps"), "MYO-REPS");
  assert.equal(nomeTecnica("drop-set"), "DROP SET");
  assert.equal(nomeTecnica("superserie"), "");
  const scalate = parametriValidi("drop-set", { scalate: [20, 40] });
  assert.equal(scalate.ok, true);
  const zero = parametriValidi("drop-set", { scalate: [0] });
  assert.equal(zero.ok, false);
});
