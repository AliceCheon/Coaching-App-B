/* Guardia 162 (passo 42): «Salva come nuovo programma».
 *
 * Alice: da un programma consultato (archiviato o no) deve nascere un programma
 * NUOVO in bozza, con le stesse schede, esercizi, serie e recuperi, senza
 * toccare niente che esista già.
 *
 *  162.1  il piano: nome nuovo proposto, meta in bozza, schede con gli stessi
 *         esercizi/serie/recuperi, id nuovi e legami padreId rimessi
 *  162.2  niente viene toccato: i documenti di partenza restano identici
 *  162.3  la scrittura: schede PRIMA del programma, solo documenti nuovi, e se
 *         una scheda si ferma il programma non nasce
 *  162.4  dalla vista: il tasto c'è, chiede il nome, e senza nome non scrive
 *  162.5  la frase dell'esito dice cosa nasce e cosa non viene toccato
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { pianoCopiaProgramma, scriviProgrammaCopiato, nomeCopia, fraseCopia, documentiDelProgramma } from "../comune/salva-come-programma.js";
import { apriConsultabile } from "../comune/vista-programma-consultabile.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const sett = (sets, sec) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets, reps: "10", rest: { seconds: sec }, type: "normal", note: "", source: "manual" }));
const ESE = (id, nome, muscolo, serie, sec) => ({
  id, name: nome, muscle: muscolo,
  prescription: { sets: serie, reps: { label: "10" }, rest: { seconds: sec } },
  progression: { weeks: sett(serie, sec) }
});
/* Una riga tecnica legata al suo esercizio: la copia deve rimettere il legame
 * sull'id nuovo, altrimenti la tecnica si stacca. */
const TECNICA = { id: "tec-1", padreId: "ex-panca", tipo: "tecnica", tecnica: "rest-pause", settimane: [] };

const VECCHIO = { id: "prg-vecchio", name: "Blocco_autunno", status: "archived", phase: "Forza",
  startDate: "2026-06-01", durationWeeks: 8, daysPerWeek: 1, rotation: ["A"], description: "blocco vecchio",
  createdAt: "2026-05-20T09:00:00.000Z" };
const DOCS = [
  { id: "program-v2-sheet-prg-vecchio__sh-A", dati: { programId: "prg-vecchio", sheetId: "sh-A", kind: "sheet", versione: 3,
    sheet: { id: "sh-A", code: "A", name: "Spinta", note: "riscaldamento", updatedAt: "2026-06-02T10:00:00.000Z",
      exercises: [ESE("ex-panca", "panca_piana", "petto", 4, 90), ESE("ex-remo", "rematore_bilanciere", "dorsali", 3, 120), TECNICA] } } },
  { id: "program-v2-sheet-prg-altro__sh-A", dati: { programId: "prg-altro", sheetId: "sh-A", kind: "sheet",
    sheet: { id: "sh-A", code: "A", name: "Gambe", exercises: [ESE("ex-squat", "squat", "quadricipiti", 5, 180)] } } }
];

test("162.1 il piano della copia: nome nuovo, bozza, stessi esercizi con id nuovi", () => {
  assert.equal(nomeCopia("Blocco_autunno"), "Blocco_autunno · copia");
  const piano = pianoCopiaProgramma(VECCHIO, DOCS, { nome: "Blocco nuovo", id: "prg-nuovo", quando: new Date(Date.UTC(2026, 10, 26)) });
  assert.equal(piano.ok, true);
  assert.equal(piano.nome, "Blocco nuovo");
  assert.equal(piano.origine, "Blocco_autunno");
  assert.equal(piano.schede.length, 1, "solo le schede del programma scelto");
  assert.equal(piano.esercizi, 3, "esercizi e riga tecnica viaggiano insieme");
  const doc = piano.schede[0];
  assert.equal(doc.id, "program-v2-sheet-prg-nuovo__sh-A");
  assert.equal(doc.dati.programId, "prg-nuovo");
  assert.equal(doc.dati.sheet.name, "Spinta", "il nome della scheda resta");
  assert.equal(doc.dati.sheet.note, "riscaldamento", "le note della scheda restano");
  const esercizi = doc.dati.sheet.exercises;
  assert.equal(esercizi.length, 3);
  assert.equal(esercizi[0].name, "panca_piana");
  assert.equal(esercizi[0].muscle, "petto");
  assert.equal(esercizi[0].prescription.sets, 4, "le serie restano");
  assert.equal(esercizi[0].progression.weeks[0].rest.seconds, 90, "i recuperi restano");
  assert.equal(esercizi[1].progression.weeks[0].rest.seconds, 120);
  assert.notEqual(esercizi[0].id, "ex-panca", "l'esercizio prende un id nuovo");
  assert.notEqual(esercizi[0].id, esercizi[1].id);
  assert.equal(esercizi[2].padreId, esercizi[0].id, "la riga tecnica resta legata al suo esercizio (id nuovo)");

  const meta = piano.programmi[0].dati.programMeta;
  assert.equal(piano.programmi[0].id, "program-v2-meta-prg-nuovo");
  assert.equal(meta.id, "prg-nuovo");
  assert.equal(meta.status, "draft");
  assert.equal(meta.active, false);
  assert.equal(meta.rotation[0], "A");
  assert.equal(meta.copiatoDa, "Blocco_autunno", "si sa da dove viene");
});

test("162.2 niente che esista già viene toccato", () => {
  const prima = JSON.stringify(DOCS);
  const piano = pianoCopiaProgramma(VECCHIO, DOCS, { nome: "Copia", id: "prg-x", quando: new Date(Date.UTC(2026, 10, 26)) });
  assert.equal(piano.ok, true);
  assert.equal(JSON.stringify(DOCS), prima, "i documenti di partenza sono identici, byte per byte");
  /* e la copia non è lo stesso oggetto della sorgente */
  assert.notEqual(piano.schede[0].dati.sheet, DOCS[0].dati.sheet);
  assert.notEqual(piano.schede[0].dati.sheet.exercises[0], DOCS[0].dati.sheet.exercises[0]);
});

test("162.3 si scrivono solo documenti nuovi, prima le schede e poi il programma", async () => {
  const scritture = [];
  const db = {
    collection: (zona) => ({
      doc: (uid) => ({
        collection: (sotto) => ({
          doc: (id) => ({ set: (dati) => { scritture.push({ zona, uid, sotto, id, dati }); return Promise.resolve(); } })
        })
      })
    })
  };
  const piano = pianoCopiaProgramma(VECCHIO, DOCS, { nome: "Copia", id: "prg-copia", quando: new Date(Date.UTC(2026, 10, 26)) });
  const esito = await scriviProgrammaCopiato(db, "uid-1", piano);
  assert.equal(esito.ok, true);
  assert.equal(scritture.length, 2, "una scheda e un programma");
  assert.equal(scritture[0].zona, "bdB_atleti", "solo la zona B");
  assert.equal(scritture[0].sotto, "schede", "prima le schede");
  assert.equal(scritture[1].sotto, "programmi", "poi il programma");
  assert.equal(scritture[1].id, "program-v2-meta-prg-copia");
  assert.equal(scritture[1].dati.programMeta.status, "draft");

  /* se la scheda si ferma, il programma non nasce */
  const rotto = [];
  const dbRotto = {
    collection: () => ({
      doc: () => ({
        collection: (sotto) => ({
          doc: (id) => ({ set: () => { rotto.push({ sotto, id }); return Promise.reject(new Error("permesso negato")); } })
        })
      })
    })
  };
  const esitoRotto = await scriviProgrammaCopiato(dbRotto, "uid-1", piano);
  assert.equal(esitoRotto.ok, false);
  assert.match(esitoRotto.motivo, /il programma non è stato creato/);
  assert.equal(rotto.length, 1, "non ha nemmeno provato a scrivere il programma");
});

test("162.4 dalla vista: il tasto c'è, chiede il nome e senza nome non scrive", async () => {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const chiamate = [];
  const onSalvaCome = (id, nome) => {
    chiamate.push({ id, nome });
    return Promise.resolve({ ok: true, id: "prg-nuovo", nome, schede: 1, esercizi: 3, origine: "Blocco_autunno" });
  };
  apriConsultabile(doc, {
    programma: VECCHIO,
    gruppo: ricostruisciSchede(DOCS).perProgramma["prg-vecchio"],
    attivo: { programma: { id: "prg-uso", name: "Intensita_ottobre" }, gruppo: null },
    nomeInUso: "Intensita_ottobre",
    onSalvaCome: onSalvaCome
  });
  const vista = doc.querySelector(".pc-modale");
  const salva = Array.from(vista.querySelectorAll("button")).filter((b) => b.textContent.trim() === "Salva come nuovo programma")[0];
  assert.ok(salva, "il tasto c'è");
  assert.equal(salva.disabled, false);
  salva.click();

  const campo = vista.querySelector(".pc-campo");
  assert.ok(campo, "si apre il campo del nome");
  assert.equal(campo.value, "Blocco autunno · copia", "il nome è proposto (col nome pulito), non inventato");

  /* senza nome non si scrive niente */
  campo.value = "   ";
  const crea = Array.from(vista.querySelectorAll(".pc-salva button")).filter((b) => b.textContent.trim() === "Crea il programma nuovo")[0];
  crea.click();
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(chiamate.length, 0, "senza nome non chiama il servizio");
  assert.match(vista.querySelector(".pc-esito").textContent, /Scrivi un nome/);

  /* col nome si scrive, e l'esito si legge */
  campo.value = "Blocco autunno 2027";
  crea.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(chiamate.length, 1);
  assert.equal(chiamate[0].nome, "Blocco autunno 2027");
  assert.equal(chiamate[0].id, "prg-vecchio", "copia proprio il programma consultato");
  const esito = vista.querySelector(".pc-esito");
  assert.match(esito.className, /ok/);
  assert.match(esito.textContent, /Nasce «Blocco autunno 2027», in bozza/);
  assert.match(esito.textContent, /non viene toccato/);
  assert.match(esito.textContent, /«Cambia»/, "dice dove si trova il programma nuovo");
});

test("162.5 la frase dell'esito e la scelta dei documenti", () => {
  const docs = documentiDelProgramma(DOCS, "prg-vecchio");
  assert.equal(docs.length, 1, "solo le schede di quel programma");
  assert.equal(documentiDelProgramma(DOCS, "prg-mai-visto").length, 0);
  assert.equal(documentiDelProgramma(DOCS, "program-v2-meta-prg-vecchio").length, 1,
    "l'id col prefisso del documento trova le stesse schede");
  const frase = fraseCopia({ nome: "Copia", schede: [{}, {}], esercizi: 6, origine: "Blocco_autunno" }, "Intensita_ottobre");
  assert.match(frase, /Nasce «Copia», in bozza: 2 schede, 6 esercizi/);
  assert.match(frase, /copiati da «Blocco_autunno»/);
  assert.match(frase, /«Intensita_ottobre» non viene toccato/);

  /* un programma senza schede non si copia: si dice, non si crea un vuoto */
  const vuoto = pianoCopiaProgramma({ id: "prg-vuoto", name: "Vuoto" }, DOCS, {});
  assert.equal(vuoto.ok, false);
  assert.match(vuoto.motivo, /non ha schede leggibili/);
});
