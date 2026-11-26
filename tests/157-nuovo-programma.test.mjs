/* Guardia 157 (passo 35): dallo scheletro nasce un programma NUOVO, in bozza.
 *
 *  157.1  il piano: schede A/B/C, programma in bozza, mese e settimane dichiarati
 *  157.2  la scrittura tocca SOLO documenti nuovi e scrive le schede prima del programma
 *  157.3  se una scheda non si scrive, il programma NON nasce e il motivo si legge
 *  157.4  la conferma dice cosa nasce e che il programma in uso non viene toccato
 *  157.5  la pagina: il tasto chiede conferma, crea, e «Apri» è una scelta
 *  157.6  il programma creato si disegna nella pagina Programmi (forma leggibile)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { programmaDaScheletro, scriviProgrammaNuovo, fraseNuovoProgramma } from "../comune/nuovo-programma-b.js";
import { montaPaginaScheletri } from "../comune/vista-scheletri-pagina.js";
import { programmiDaDocumenti, schedeDaDocumenti } from "../comune/lettura-b.js";
import { ricostruisciSchede, schedeDelProgrammaV2 } from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const QUANDO = new Date(Date.UTC(2026, 10, 26, 9, 30));

const SCHELETRO = {
  tipo: "scheletro",
  nome: "Push Pull",
  notaScheda: "dal costruttore",
  esercizi: [
    { nome: "Panca piana", distretto: "Petto", serie: 4 },
    { nome: "Rematore bilanciere", distretto: "Dorsali", serie: 4 }
  ],
  schede: [
    { lettera: "A", gruppo: "Push", esercizi: [{ nome: "Panca piana", distretto: "Petto", serie: 4 }] },
    { lettera: "B", gruppo: "Pull", esercizi: [{ nome: "Rematore bilanciere", distretto: "Dorsali", serie: 4 }] }
  ]
};

function fintoDb(opzioni) {
  const o = opzioni || {};
  const scritture = [];
  const foglia = (pezzi) => ({
    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
    set: (valore) => {
      if (o.errore && String(pezzi[pezzi.length - 1]).indexOf(o.errore.su) === 0) return Promise.reject(new Error(o.errore.motivo));
      scritture.push({ percorso: pezzi.join("/"), valore });
      return Promise.resolve();
    }
  });
  const sotto = (pezzi) => ({ doc: (id) => foglia(pezzi.concat([String(id)])) });
  const db = { collection: (r) => ({ doc: (uid) => ({ collection: (s) => sotto([r, String(uid), s]) }) }) };
  return { db, scritture };
}

test("157.1 il piano: schede, bozza, date e settimane", () => {
  const piano = programmaDaScheletro(SCHELETRO, { quando: QUANDO, id: "prg-35" });
  assert.equal(piano.ok, true);
  assert.equal(piano.nome, "Push Pull");
  assert.deepEqual(piano.meta, {
    id: "prg-35", name: "Push Pull", status: "draft", active: false, phase: "",
    startDate: "2026-11-26", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"],
    description: "dal costruttore", message: "",
    createdAt: "2026-11-26T09:30:00.000Z", updatedAt: "2026-11-26T09:30:00.000Z"
  });
  assert.deepEqual(piano.schede.map((s) => s.dati.sheet.code), ["A", "B"]);
  assert.equal(piano.schede[0].dati.sheet.name, "Push");
  assert.equal(piano.esercizi, 2);
  const ex = piano.schede[0].dati.sheet.exercises[0];
  assert.equal(ex.name, "Panca piana");
  assert.equal(ex.muscle, "Petto");
  assert.equal(ex.progression.weeks.length, 8, "otto settimane, come il resto dell'app");
  assert.equal(ex.prescription.sets, 4);
  assert.equal(ex.kg, undefined, "nessun carico in un programma appena nato");

  const vuoto = programmaDaScheletro({ esercizi: [] }, { quando: QUANDO });
  assert.equal(vuoto.ok, false);
  assert.match(vuoto.motivo, /non ha esercizi/);
});

test("157.2 si scrivono solo documenti nuovi, e le schede prima del programma", async () => {
  const finto = fintoDb();
  const piano = programmaDaScheletro(SCHELETRO, { quando: QUANDO, id: "prg-35" });
  const esito = await scriviProgrammaNuovo(finto.db, "u1", piano);
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.scritte, 3, "due schede + un programma");

  const percorsi = finto.scritture.map((s) => s.percorso);
  assert.deepEqual(percorsi, [
    "bdB_atleti/u1/schede/program-v2-sheet-prg-35__sh-A",
    "bdB_atleti/u1/schede/program-v2-sheet-prg-35__sh-B",
    "bdB_atleti/u1/programmi/program-v2-meta-prg-35"
  ], "le schede prima del programma, in zona B");
  const meta = finto.scritture[2].valore;
  assert.equal(meta.programId, "prg-35");
  assert.equal(meta.programMeta.status, "draft", "nasce in bozza");
  assert.equal(meta.programMeta.active, false, "e non attivo");
  assert.equal(finto.scritture.some((s) => !/^bdB_atleti\/u1\/(schede|programmi)\//.test(s.percorso)), false, "fuori dalle due raccolte non si scrive");
});

test("157.3 se una scheda non si scrive il programma non nasce", async () => {
  const finto = fintoDb({ errore: { su: "program-v2-sheet-prg-35__sh-B", motivo: "Missing or insufficient permissions" } });
  const piano = programmaDaScheletro(SCHELETRO, { quando: QUANDO, id: "prg-35" });
  const esito = await scriviProgrammaNuovo(finto.db, "u1", piano);
  assert.equal(esito.ok, false);
  assert.match(esito.motivo, /scheda B non scritta/);
  assert.match(esito.motivo, /il programma non è stato creato/);
  assert.equal(finto.scritture.some((s) => /programmi\//.test(s.percorso)), false, "nessun programma senza le sue schede");
});

test("157.4 la conferma dice cosa nasce e cosa resta fermo", () => {
  const piano = programmaDaScheletro(SCHELETRO, { quando: QUANDO, id: "prg-35" });
  const frase = fraseNuovoProgramma(piano, "Intensità ottobre-dicembre");
  assert.match(frase, /programma nuovo, «Push Pull»/);
  assert.match(frase, /2 schede, 2 esercizi/);
  assert.match(frase, /in bozza/);
  assert.match(frase, /«Intensità ottobre-dicembre» non viene toccato/);
});

function paginaFinta(servizi) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  doc.getElementById("sk-nome").value = "Push Pull";
  const costruttore = () => ({ schede: [
    { lettera: "A", gruppo: "Push", righe: [{ nome: "Panca piana", serie: 4, k: "Petto" }] }
  ] });
  montaPaginaScheletri(doc, Object.assign({ costruttore, leggi: () => Promise.resolve([]) }, servizi));
  return { doc };
}
const attesa = (n) => new Promise((r) => setTimeout(r, n || 40));

test("157.5 il tasto chiede conferma, crea, e aprire è una seconda scelta", async () => {
  const chiamate = [];
  const { doc } = paginaFinta({
    creaProgramma: (documento, richiesta) => {
      chiamate.push({ tipo: "crea", esercizi: documento.esercizi.length, richiesta });
      return Promise.resolve({ ok: true, id: "prg-35", nome: "Push Pull", schede: 1, esercizi: 1 });
    },
    apriProgramma: (id) => { chiamate.push({ tipo: "apri", id }); return Promise.resolve({ ok: true }); },
    nomeAttivo: () => "Intensità ottobre-dicembre"
  });
  const tasto = doc.getElementById("sk-crea-programma");
  assert.ok(tasto, "il tasto c'è");
  assert.equal(tasto.disabled, false);
  tasto.click();
  const conferma = doc.querySelector(".sk-conf-programma");
  assert.ok(conferma, "prima di scrivere si chiede conferma");
  assert.match(conferma.textContent, /«Intensità ottobre-dicembre» non viene toccato/);
  assert.equal(chiamate.length, 0, "nessuna scrittura prima del sì");

  conferma.querySelector(".sk-conf-si").click();
  await attesa(60);
  assert.equal(chiamate[0].tipo, "crea");
  assert.equal(chiamate[0].esercizi, 1);
  assert.match(doc.getElementById("sk-esito").textContent, /creato in bozza/);
  assert.match(doc.getElementById("sk-esito").textContent, /non è stato toccato/);

  const apri = doc.querySelector(".sk-conf-programma");
  assert.ok(apri, "dopo la creazione si offre di aprirlo");
  assert.match(apri.textContent, /Vuoi aprirlo adesso\?/);
  assert.equal(chiamate.filter((c) => c.tipo === "apri").length, 0, "aprire non parte da solo");
  apri.querySelector(".sk-conf-si").click();
  await attesa(60);
  assert.deepEqual(chiamate[1], { tipo: "apri", id: "prg-35" });
  assert.match(doc.getElementById("sk-esito").textContent, /aperto: lo vedi in Programmi/);
});

test("157.6 il programma creato si legge e si disegna nella pagina Programmi", () => {
  const piano = programmaDaScheletro(SCHELETRO, { quando: QUANDO, id: "prg-35" });
  const programmi = programmiDaDocumenti(piano.programmi);
  assert.equal(programmi.programmi.length, 1);
  assert.equal(programmi.programmi[0].name, "Push Pull");

  const schede = schedeDaDocumenti(piano.schede);
  const ricostruzione = ricostruisciSchede(schede);
  const schedeV2 = schedeDelProgrammaV2(ricostruzione, "prg-35");
  assert.equal(schedeV2.schede.length, 2, "due schede lette");

  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const contenitore = doc.querySelector("#programma-attivo");
  const r = riepilogoProgramma(programmi.programmi[0], [], {
    schedeV2: ricostruzione, indice: 0, totaleProgrammi: 1, oggi: QUANDO, quante: 8
  });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, {
    modifica: { attivo: true, annullabile: false, conta: () => ({ codice: "A", esercizi: 1, tecniche: 0, righe: 1, modifiche: 0 }), onCambia: () => Promise.resolve({ ok: true }) }
  }));
  const valori = Array.from(contenitore.querySelectorAll("input")).map((i) => String(i.value || ""));
  assert.ok(valori.indexOf("Push Pull") !== -1, "il nome del programma nuovo si legge: " + valori.join(" | "));
  assert.match(String(contenitore.textContent || ""), /Scheda A — Push/, "la scheda si chiama col suo gruppo");
  assert.match(String(contenitore.textContent || ""), /Panca piana/, "e ci sono i suoi esercizi");
});
