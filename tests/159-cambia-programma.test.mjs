/* Guardia 159 (passo 41): «Cambia» apre l'elenco dei programmi di B.
 *
 *  159.1  il tasto «Cambia» è acceso e apre il pannello, non è più «in arrivo»
 *  159.2  l'elenco dice il vero: nome, stato, schede; il programma in uso non ha «Apri»
 *  159.3  «Apri» chiede conferma e solo dopo scrive (onAttiva con quell'id)
 *  159.4  con un programma solo il pannello lo dice invece di fingere una scelta
 *  159.5  senza accesso il tasto resta spento e dice perché
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg-41", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = () => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" }));
const ESE = (nome) => ({ id: "ex-" + nome, name: nome, muscle: "dorsali", prescription: { sets: 4 }, progression: { weeks: sett() } });
const scheda = { id: "program-v2-sheet-prg-41__sh-A", dati: { programId: "prg-41", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali", exercises: [ESE("Rematore")] } } };

const PROGRAMMI = [
  { id: "prg-41", nome: "Intensità ottobre-dicembre", attivo: true, bozza: false, archiviato: false, dettaglio: "1 scheda" },
  { id: "prg-35", nome: "Push Pull", attivo: false, bozza: true, archiviato: false, dettaglio: "2 schede" },
  { id: "prg-vecchio", nome: "Vecchio blocco", attivo: false, bozza: false, archiviato: true }
];

function scena(opzioni) {
  const o = opzioni || {};
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const chiamate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => ({ codice: "A", esercizi: 1, tecniche: 0, righe: 1, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    onAttiva: (id) => { chiamate.push(id); return Promise.resolve({ ok: true, testo: "programma attivo" }); }
  };
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede([scheda]), indice: 0, totaleProgrammi: 3, oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8 });
  const extra = { altriProgrammi: o.programmi === null ? [] : (o.programmi || PROGRAMMI) };
  renderProgramma(doc, doc.querySelector("#programma-attivo"), { presente: true, numeroSedute: 0 },
    Object.assign({}, r, extra, { modifica: o.senzaEditor ? {} : mod }));
  return { dom, doc, chiamate };
}
const tasto = (doc, parola) => Array.from(doc.querySelectorAll("#programma-attivo .pr-acts button")).filter((b) => b.textContent.trim() === parola)[0] || null;

test("159.1 «Cambia» è acceso e apre il pannello", () => {
  const { doc } = scena();
  const b = tasto(doc, "Cambia");
  assert.ok(b, "il tasto c'è");
  assert.equal(b.disabled, false, "ed è acceso");
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 0, "il pannello parte chiuso");
  b.click();
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 1, "il clic apre il pannello");
  b.click();
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 0, "e il clic lo richiude");
});

test("159.2 l'elenco dice il vero e il programma in uso non ha «Apri»", () => {
  const { doc } = scena();
  tasto(doc, "Cambia").click();
  const pannello = doc.querySelector(".pr-elenco-programmi");
  const testo = pannello.textContent;
  assert.match(testo, /Intensità ottobre-dicembre/);
  assert.match(testo, /in uso/);
  assert.match(testo, /Push Pull/);
  assert.match(testo, /in bozza/);
  assert.match(testo, /Vecchio blocco/);
  assert.match(testo, /archiviato/);
  assert.match(testo, /1 scheda/);
  const righe = Array.from(pannello.querySelectorAll(".pr-elenco-riga"));
  const bottoni = (i) => Array.from(righe[i].querySelectorAll("button")).map((b) => b.textContent.trim());
  assert.deepEqual(bottoni(0), [], "il programma in uso non si riapre: nessun tasto");
  assert.ok(bottoni(1).indexOf("Apri") !== -1, "la bozza si apre: " + bottoni(1).join(","));
  const archiviato = righe[2].querySelector("button");
  assert.equal(archiviato.disabled, true, "l'archiviato resta spento");
  assert.match(archiviato.title, /archiviato/, "e dice perché: " + archiviato.title);
});

test("159.3 «Apri» chiede conferma e poi scrive", async () => {
  const { doc, chiamate } = scena();
  tasto(doc, "Cambia").click();
  const righe = Array.from(doc.querySelectorAll(".pr-elenco-riga"));
  Array.from(righe[1].querySelectorAll("button")).filter((b) => b.textContent.trim() === "Apri")[0].click();
  assert.equal(chiamate.length, 0, "niente scritto prima del sì");
  const conferma = doc.querySelector("#programma-attivo .pr-conf[role='dialog']");
  assert.ok(conferma, "si apre una conferma");
  assert.match(conferma.textContent, /Aprire «Push Pull»/);
  assert.match(conferma.textContent, /resta salvato com'è/);
  const si = Array.from(conferma.querySelectorAll("button")).filter((b) => /^Sì, apri/.test(b.textContent.trim()))[0];
  assert.ok(si, "c'è il tasto per confermare: " + Array.from(conferma.querySelectorAll("button")).map((b) => b.textContent).join(" | "));
  si.click();
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(chiamate, ["prg-35"], "scrive sull'id scelto");
});

test("159.4 con un programma solo il pannello lo dice", () => {
  const { doc } = scena({ programmi: [PROGRAMMI[0]] });
  tasto(doc, "Cambia").click();
  const testo = doc.querySelector(".pr-elenco-programmi").textContent;
  assert.match(testo, /C'è un programma solo/);
  assert.match(testo, /Intensità ottobre-dicembre/);
});

test("159.5 senza accesso il tasto resta spento e dice perché", () => {
  const { doc } = scena({ senzaEditor: true });
  const b = tasto(doc, "Cambia");
  assert.equal(b.disabled, true);
  assert.match(b.title, /si accende quando la pagina sa leggere la zona B/);
});
