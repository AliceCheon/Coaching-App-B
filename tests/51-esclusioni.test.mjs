/* Passo 5 · esclusioni decise da Alice.
 *
 * Le cinque sedute sbagliate non si cancellano in A (li' tornano indietro per un
 * problema di sincronizzazione di A). Si escludono in B: un documento in
 * `bdB_atleti/{uid}/esclusioni` e `deletedAt` sulla copia. Questi test
 * verificano tre cose che, se sbagliate, farebbero tornare una seduta esclusa:
 *   1. la ricerca trova i candidati giusti e non indovina quando sono zero o
 *      piu' di uno;
 *   2. la copia futura rilegge le esclusioni e riscrive `deletedAt`;
 *   3. il Logbook di B non mostra la seduta esclusa.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  RICHIESTE_ESCLUSIONE,
  candidatiEsclusione,
  conDeletedAt,
  dataDi,
  codiceScheda,
  settimanaDi,
  seduteNelBloccoLocale,
  BLOCCO_LOCALE_A
} from "../comune/esclusioni.js";
import { pianoDiCopia } from "../comune/copia-b.js";
import { contaSedute, confrontoConRadice, righeConteggi } from "../comune/conteggi-copia.js";
import { seduteLogbook } from "../comune/logbook.js";
import { SOTTO_B, percorsoB } from "../comune/modello-dati.js";

/* Una seduta come la legge B: id numerico, data, scheda, settimana, esercizi. */
const seduta = (extra) => Object.assign({
  id: "1758000500001",
  dateInput: "2026-10-24",
  sessionCode: "C",
  week: "Settimana 1",
  sessionName: "Logbook C",
  source: "App",
  exercises: [{ name: "Squat" }, { name: "Panca" }, { name: "Stacco" }]
}, extra || {});

const richiesta = (chiave) => RICHIESTE_ESCLUSIONE.filter((r) => r.chiave === chiave)[0];

test("51.1 le cinque richieste sono quelle di Alice, con settimana e date", () => {
  assert.equal(RICHIESTE_ESCLUSIONE.length, 5);
  const chiavi = RICHIESTE_ESCLUSIONE.map((r) => r.chiave);
  assert.deepEqual(chiavi, [
    "d-sett1-22-24-settembre",
    "c-sett1-24-ottobre",
    "b-sett1-24-ottobre",
    "d-sett1-24-ottobre",
    "c-sett2-27-ottobre"
  ]);
  const settembre = richiesta("d-sett1-22-24-settembre");
  assert.equal(settembre.scheda, "D");
  assert.equal(settembre.settimana, 1);
  assert.deepEqual(settembre.dateAttese, ["2026-09-22", "2026-09-24"]);
  assert.equal(settembre.settimanaDal, "2026-09-21");
  assert.equal(settembre.settimanaAl, "2026-09-27");
  const ottobre = richiesta("c-sett2-27-ottobre");
  assert.equal(ottobre.settimana, 2);
  assert.equal(ottobre.settimanaDal, "2026-10-26");
});

test("51.2 la lettura dei campi: data, scheda e settimana come sono scritti in A", () => {
  assert.equal(dataDi({ dateInput: "2026-10-24" }), "2026-10-24");
  assert.equal(dataDi({ date: "24/10/2026" }), "2026-10-24");
  assert.equal(dataDi({ date: "non una data" }), "", "una data illeggibile non si inventa");
  assert.equal(codiceScheda({ sessionCode: "scheda D" }), "D");
  assert.equal(codiceScheda({ sessionCode: "C" }), "C");
  assert.equal(codiceScheda({ sessionName: "Logbook B" }), "B");
  assert.equal(codiceScheda({}), "");
  assert.equal(settimanaDi({ week: "Settimana 2" }), 2);
  assert.equal(settimanaDi({ week: 1 }), 1);
  assert.equal(settimanaDi({}), null, "senza settimana non si inventa un numero");
});

test("51.3 la D di settembre si trova per data esatta, con un solo candidato", () => {
  const esito = candidatiEsclusione([seduta({ id: "1", sessionCode: "D", dateInput: "2026-09-22", week: "Settimana 1" })], [richiesta("d-sett1-22-24-settembre")]);
  const r = esito.richieste[0];
  assert.equal(r.stato, "uno");
  assert.equal(r.modo, "data esatta");
  assert.equal(r.candidati[0].id, "1");
  assert.equal(r.candidati[0].esercizi, 3);
  assert.equal(r.messaggio, "1 candidato");
});

test("51.4 se la data e' sbagliata ma cade nella settimana, si trova lo stesso (e lo si dice)", () => {
  const esito = candidatiEsclusione([seduta({ id: "9", sessionCode: "D", dateInput: "2026-09-23", week: "Settimana 1" })], [richiesta("d-sett1-22-24-settembre")]);
  const r = esito.richieste[0];
  assert.equal(r.stato, "uno");
  assert.equal(r.modo, "settimana intera", "la seconda passata va dichiarata, non nascosta");
  assert.equal(r.candidati[0].data, "2026-09-23");
});

test("51.5 zero candidati si dice zero, senza inventare una seduta", () => {
  const esito = candidatiEsclusione([], [richiesta("b-sett1-24-ottobre")]);
  const r = esito.richieste[0];
  assert.equal(r.stato, "zero");
  assert.equal(r.candidati.length, 0);
  assert.match(r.messaggio, /0 candidati/);
  assert.equal(esito.richiesteConProblemi, 1);
});

test("51.6 piu' di un candidato: si mostrano tutti e non si preseleziona niente", () => {
  const esito = candidatiEsclusione([
    seduta({ id: "11", sessionCode: "B", dateInput: "2026-10-24" }),
    seduta({ id: "12", sessionCode: "B", dateInput: "2026-10-24" })
  ], [richiesta("b-sett1-24-ottobre")]);
  const r = esito.richieste[0];
  assert.equal(r.stato, "piuDiUno");
  assert.equal(r.candidati.length, 2);
  assert.match(r.messaggio, /2 candidati: non indovino/);
});

test("51.7 la settimana sbagliata non passa: una C di settimana 2 non e' la C del 24 ottobre", () => {
  const esito = candidatiEsclusione([
    seduta({ id: "20", sessionCode: "C", dateInput: "2026-10-20", week: "Settimana 2" })
  ], [richiesta("c-sett1-24-ottobre")]);
  assert.equal(esito.richieste[0].stato, "zero");
});

test("51.8 con 5 esclusioni e nessuna sovrapposizione: 127 valide diventano 122", () => {
  const documenti = [];
  for (let i = 1; i <= 127; i += 1) {
    documenti.push({ id: "d" + i, dati: { session: seduta({ id: "s" + i, exercises: [{ name: "Esercizio " + ("s" + i), sets: [{ kg: 60, reps: 8 }] }] }) } });
  }
  const esclusioni = [1, 2, 3, 4, 5].map((n) => ({
    id: "s" + n,
    dati: { idSeduta: "s" + n, motivo: "sbagliata", quando: "2026-11-07T10:00:00.000Z" }
  }));
  const conteggi = contaSedute(documenti, esclusioni);
  assert.equal(conteggi.valideNonCancellate, 127);
  assert.equal(conteggi.esclusioni.escluseDaAlice, 5);
  assert.equal(conteggi.esclusioni.sovrapposte, 0);
  assert.equal(conteggi.esclusioni.valideRisultanti, 122);
  assert.equal(conteggi.esclusioni.senzaCorrispondenza.length, 0);
});

test("51.9 un'esclusione su una seduta gia' cancellata non si conta due volte", () => {
  const documenti = [
    { id: "a", dati: { session: seduta({ id: "a" }) } },
    { id: "b", dati: { session: seduta({ id: "b", deletedAt: "2026-10-01T00:00:00.000Z" }) } }
  ];
  const conteggi = contaSedute(documenti, [{ id: "b", dati: { idSeduta: "b" } }]);
  assert.equal(conteggi.valideNonCancellate, 1);
  assert.equal(conteggi.esclusioni.escluseDaAlice, 1);
  assert.equal(conteggi.esclusioni.sovrapposte, 1);
  assert.equal(conteggi.esclusioni.valideRisultanti, 1, "la seduta era gia' fuori: non si toglie due volte");
});

test("51.10 un'esclusione che non trova la seduta in A si dichiara, non si nasconde", () => {
  const conteggi = contaSedute([{ id: "a", dati: { session: seduta({ id: "a" }) } }], [{ id: "fantasma", dati: { idSeduta: "fantasma" } }]);
  assert.equal(conteggi.esclusioni.escluseDaAlice, 0);
  assert.deepEqual(conteggi.esclusioni.senzaCorrispondenza, ["fantasma"]);
});

test("51.11 la riga del Logbook dice «escluse da Alice» e «valide risultanti»", () => {
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
      senzaCestino: [],
      esclusioni: { documenti: 5, escluseDaAlice: 5, sovrapposte: 0, valideRisultanti: 122, senzaCorrispondenza: [] }
    }
  });
  const tutto = righe.map((r) => [r.cosa, r.lettoOra, r.nota].join(" ")).join(" | ");
  assert.ok(tutto.indexOf("escluse da Alice: 5") >= 0, "manca «escluse da Alice: 5»");
  assert.ok(tutto.indexOf("valide risultanti: 122") >= 0, "manca «valide risultanti: 122»");
});

test("51.12 la copia futura rilegge le esclusioni e riscrive deletedAt: la seduta non torna", () => {
  const piano = pianoDiCopia({
    programmi: [],
    schede: [],
    sedute: [
      { id: "s1", dati: { session: seduta({ id: "s1", exercises: [{ name: "Esercizio " + "s1", sets: [{ kg: 60, reps: 8 }] }] }) } },
      { id: "s2", dati: { session: seduta({ id: "s2", exercises: [{ name: "Esercizio " + "s2", sets: [{ kg: 60, reps: 8 }] }] }) } }
    ],
    esclusioni: [{ id: "s1", dati: { idSeduta: "s1", motivo: "sbagliata", quando: "2026-11-07T10:00:00.000Z" } }]
  });
  const copia1 = piano.voci.filter((v) => v.id === "s1")[0];
  const copia2 = piano.voci.filter((v) => v.id === "s2")[0];
  assert.equal(copia1.dati.session.deletedAt, "2026-11-07T10:00:00.000Z");
  assert.equal(copia1.esclusa, true);
  assert.equal(copia2.dati.session.deletedAt, undefined, "le altre sedute restano intatte");
  assert.equal(piano.conteggi.seduteEscluse, 1);
  assert.equal(piano.conteggiSedute.esclusioni.valideRisultanti, 1);
});

test("51.13 la copia non muta il documento di A che ha in mano", () => {
  const originale = { session: seduta({ id: "s1", exercises: [{ name: "Esercizio " + "s1", sets: [{ kg: 60, reps: 8 }] }] }) };
  const copia = conDeletedAt(originale, "2026-11-07T10:00:00.000Z");
  assert.equal(originale.session.deletedAt, undefined);
  assert.equal(copia.session.deletedAt, "2026-11-07T10:00:00.000Z");
  assert.equal(copia.session.id, "s1");
});

test("51.14 il Logbook di B non mostra la seduta esclusa, e la dichiara", () => {
  const esito = seduteLogbook([
    seduta({ id: "viva-1", dateInput: "2026-10-24" }),
    seduta({ id: "esclusa-1", dateInput: "2026-10-25", deletedAt: "2026-11-07T10:00:00.000Z" })
  ], { oggi: new Date("2026-11-07T12:00:00.000Z") });
  assert.equal(esito.sedute.length, 1);
  assert.equal(esito.sedute.filter((s) => s.id === "esclusa-1").length, 0, "la seduta esclusa non compare");
  assert.equal(esito.dichiarazioni.cancellate, 1, "e viene dichiarata, non sparita in silenzio");
});

test("51.15 le esclusioni vivono nella zona B, come sottoraccolta dichiarata", () => {
  assert.equal(SOTTO_B.esclusioni, "esclusioni");
  assert.equal(percorsoB("u1", SOTTO_B.esclusioni, "s1"), "bdB_atleti/u1/esclusioni/s1");
});

test("51.16 diagnosi del conto: una seduta con id del blocco locale di A spiega il 126 contro 127", () => {
  assert.equal(BLOCCO_LOCALE_A.dal, 900001);
  assert.equal(BLOCCO_LOCALE_A.al, 900031);
  const dentro = seduteNelBloccoLocale([seduta({ id: "900005" }), seduta({ id: "1758000500001" })]);
  assert.equal(dentro.trovate.length, 1);
  assert.equal(dentro.trovate[0].id, "900005");
  assert.match(dentro.spiegazione, /fonde/);
  const fuori = seduteNelBloccoLocale([seduta({ id: "1758000500001" })]);
  assert.equal(fuori.trovate.length, 0);
  assert.match(fuori.spiegazione, /Nessuna seduta riusa gli id/);
});

test("51.17 il confronto con la radice dichiara anche escluse e valide risultanti", () => {
  const c = confrontoConRadice({
    sedute: {
      valide: 129,
      valideNonCancellate: 127,
      visibili: 127,
      cancellate: 2,
      doppioniId: 0,
      senzaCestino: [],
      elenco: [],
      esclusioni: { documenti: 5, escluseDaAlice: 5, sovrapposte: 0, valideRisultanti: 122, senzaCorrispondenza: [] }
    }
  }, { sessionCount: 126 });
  assert.equal(c.sessioni.dichiarato, 126);
  assert.equal(c.sessioni.letto, 127);
  assert.equal(c.sessioni.escluseDaAlice, 5);
  assert.equal(c.sessioni.valideRisultanti, 122);
});
