/* PASSO 12 — il Riepilogo volume legge le stesse schede di Programma 1 e RED-S.
 *
 * Le due cose che si provano:
 *  1) la precedenza: se i documenti v2 ci sono e hanno schede, vincono loro; il
 *     documento v1 del programma resta il ripiego, e `fonteSchede` dice quale
 *     ha vinto e perche';
 *  2) una riga senza nome non e' «fuori volume» ne' un distretto mancante: si
 *     conta a parte, e la pagina lo scrive («33 righe lette · 33 senza nome ·
 *     0 fuori volume») invece di far credere che il conto sia a zero.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { riepilogoProgramma, righeSenzaNomeDelleSchede } from "../comune/programma.js";
import { renderVolume } from "../comune/vista-volume.js";
import { renderSpecializzazione } from "../comune/vista-specializzazione.js";
import { righeDalleSchede, contaVolume } from "../comune/volume-b.js";
import { fraseRiepilogoVolume } from "../comune/diagnostica-esercizi.js";

const meta = { id: "prg500", name: "Forza dicembre", status: "active", active: true, durationWeeks: 8, rotation: ["A", "B"] };
const sett = (serie) => Array.from({ length: 8 }, (_, i) => ({ numero: i + 1, serie, ripetizioni: 10 }));

/* Il documento v1: le schede stanno DENTRO il programma e le righe non hanno
 * il nome (e' il caso vero che dava «33 righe contate · nessun distretto»). */
function v1SenzaNomi(quante) {
  const esercizi = Array.from({ length: quante }, (_, i) => ({
    id: "v1-e" + (i + 1),
    n: "",
    muscolo: "",
    settimane: sett(4)
  }));
  return Object.assign({}, meta, { sheets: [{ code: "A", name: "Seduta A", exercises: esercizi }] });
}

/* I documenti v2: nomi e distretti veri, quelli che leggono Programma 1 e RED-S. */
function v2ConNomi() {
  const schede = [
    { codice: "A", nome: "Seduta A", esercizi: [
      { id: "s1", n: "Rematore bilanciere", muscolo: "dorsali", settimane: sett(4) },
      { id: "s2", n: "Trazioni", muscolo: "dorsali", settimane: sett(3) }
    ] },
    { codice: "B", nome: "Seduta B", esercizi: [
      { id: "s3", n: "Panca piana", muscolo: "pettorali", settimane: sett(4) }
    ] }
  ];
  return { perProgramma: { prg500: { programId: "prg500", schede, archiviate: [] } } };
}

const opt = (schedeV2) => ({ schedeV2, indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });

function pagina() {
  const dom = new JSDOM("<!doctype html><div id=\"rv\"></div><div id=\"sp\"></div>", { pretendToBeVisual: true });
  return dom.window.document;
}

test("140.1 sole schede v1 senza nomi: si dichiara quante sono, non si finge zero distretti", () => {
  const programma = v1SenzaNomi(33);
  assert.equal(righeSenzaNomeDelleSchede(programma), 33, "il motivo si conta sulle righe vere del documento");

  const r = riepilogoProgramma(programma, [], opt(null));
  assert.equal(r.schede.length, 1, "la scheda v1 c'e' ed e' l'unica fonte");
  assert.match(String(r.fonteSchede), /^documento del programma \(v1\)/, "fonte: " + r.fonteSchede);
  assert.match(String(r.fonteSchede), /non ha documenti v2/);
  assert.match(String(r.fonteSchede), /33 righe senza nome/, "il perche' e' dichiarato: " + r.fonteSchede);
  assert.equal(r.sceltaSchede.vincente, "v1");
  assert.equal(r.sceltaSchede.righeSenzaNomeV1, 33);

  /* Le schede v1 escono dal riepilogo come riassunto (conteggio esercizi, non
   * le righe): per il volume si usano le righe vere del documento, che sono
   * quelle che portano `n` vuoto. */
  const righeV1 = [{ codice: "A", nome: "Seduta A", esercizi: Array.from({ length: 33 }, (_, i) => ({
    id: "v1-e" + (i + 1), n: "", muscolo: "", settimane: sett(4)
  })) }];
  const righe = righeDalleSchede(righeV1);
  assert.equal(righe.length, 33);
  assert.equal(righe.filter((x) => x.senzaNome).length, 33, "ogni riga porta il segno «senza nome»");

  const conto = contaVolume(righe, { quante: 8 });
  assert.equal(conto.righeLette, 33);
  assert.equal(conto.righeSenzaNome, 33);
  assert.equal(conto.fuoriVolume, 0, "senza nome NON e' fuori volume");
  assert.equal(conto.righeUtili, 0, "nessuna riga utile: senza nome non si conta");
  assert.equal(conto.righeSenzaDistretto, 0, "senza nome non e' nemmeno un distretto mancante");
  assert.equal(conto.distretti.length, 0);

  const doc = pagina();
  renderVolume(doc, doc.querySelector("#rv"), righeV1, { quante: 8 });
  const testo = doc.querySelector("#rv").textContent;
  assert.match(testo, /33 righe lette/);
  assert.match(testo, /33 senza nome/);
  assert.match(testo, /0 fuori volume/);
  assert.match(testo, /non portano il nome dell'esercizio/);
  assert.equal(/Nessun distretto riconosciuto/.test(testo), false, "non si accusa la mappa quando il nome non c'e'");
});

test("140.2 se i v2 ci sono vincono loro: distretti veri, e il v1 e' dichiarato scartato", () => {
  const r = riepilogoProgramma(v1SenzaNomi(33), [], opt(v2ConNomi()));
  assert.equal(r.schede.length, 2, "le due sedute dei v2, non la scheda v1");
  assert.equal(r.schede[0].esercizi.length, 2);
  assert.match(String(r.fonteSchede), /^documenti v2/);
  assert.match(String(r.fonteSchede), /legame: id esatto/);
  assert.match(String(r.fonteSchede), /v1 scartato: 33 righe senza nome/);
  assert.equal(r.sceltaSchede.vincente, "v2");

  const conto = contaVolume(righeDalleSchede(r.schede), { quante: 8 });
  assert.equal(conto.righeSenzaNome, 0);
  const distretti = conto.distretti.map((d) => d.distretto);
  assert.ok(distretti.indexOf("Dorsali") !== -1, "Dorsali c'e': " + distretti.join(", "));
  assert.ok(distretti.indexOf("Pettorali") !== -1, "Pettorali c'e': " + distretti.join(", "));
  assert.equal(conto.righeContate, 3);
  assert.equal(conto.righeLette, 3);

  const doc = pagina();
  renderVolume(doc, doc.querySelector("#rv"), r.schede, { quante: 8 });
  const testo = doc.querySelector("#rv").textContent;
  assert.match(testo, /3 righe lette · 0 senza nome · 0 fuori volume/);
  assert.match(testo, /Serie per distretto/);
  assert.equal(/Nessun distretto riconosciuto/.test(testo), false);

  /* Specializzazione: stessa fonte, stessi distretti. */
  renderSpecializzazione(doc, doc.querySelector("#sp"), r.schede, { quante: 8 });
  const sp = doc.querySelector("#sp").textContent;
  assert.match(sp, /Dorsali/);
  assert.equal(/distretti riconoscibili/.test(sp), false);
});

test("140.3 fonteSchede dice quale ha vinto anche quando i v2 ci sono ma sono vuoti", () => {
  const vuoti = { perProgramma: { prg500: { programId: "prg500", schede: [], archiviate: [] } } };
  const r = riepilogoProgramma(v1SenzaNomi(4), [], opt(vuoti));
  assert.equal(r.sceltaSchede.vincente, "v1");
  assert.match(String(r.fonteSchede), /^documento del programma \(v1\)/);
  assert.match(String(r.fonteSchede), /non ne resta nessuna scheda attiva/, "il perche': " + r.fonteSchede);

  const niente = riepilogoProgramma(meta, [], opt(null));
  assert.equal(niente.schede, null, "senza nessuna delle due fonti resta il vuoto dichiarato");
  assert.equal(niente.fonteSchede, null);
  assert.equal(niente.sceltaSchede.vincente, null);
});

test("140.4 con i v2 la frase del Riepilogo volume porta i numeri, non il vuoto", () => {
  const r = riepilogoProgramma(v1SenzaNomi(33), [], opt(v2ConNomi()));
  const conto = contaVolume(righeDalleSchede(r.schede), { quante: 8 });
  const frase = fraseRiepilogoVolume(conto);
  assert.match(frase, /^Serie per distretto: /);
  assert.match(frase, /3 righe lette/);
  assert.match(frase, /0 senza nome/);

  const senzaNomi = contaVolume(righeDalleSchede([{ codice: "A", nome: "Seduta A", esercizi: Array.from({ length: 33 }, (_, i) => ({
    id: "v1-e" + (i + 1), n: "", muscolo: "", settimane: sett(4)
  })) }]), { quante: 8 });
  assert.match(fraseRiepilogoVolume(senzaNomi), /33 righe lette non portano il nome/);
});
