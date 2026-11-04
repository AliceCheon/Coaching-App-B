/* Prove della 2.7: un solo programma in scena — quello attivo — e tutti gli
 * altri in Archivio programmi, con la stessa scheda aperta per scelta. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { elencoArchivio, renderArchivio, dataItaliana } from "../comune/vista-archivio.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";

const leggi = (nome) => fs.readFileSync(new URL("../" + nome, import.meta.url), "utf8");
const html = leggi("desktop/index.html");
const app = leggi("desktop/app.js");

const programmi = [
  { id: "p1", name: "Intensità ottobre-dicembre", status: "active", createdAt: "2026-10-05", startDate: "2026-10-05" },
  { id: "p2", name: "Forza novembre", status: "draft", createdAt: "2026-11-02" },
  { id: "p3", name: "Ipertrofia estiva", status: "archived", createdAt: "2026-06-01" },
  { id: "p4", name: "Prova cancellata", createdAt: "2026-05-01", deletedAt: "2026-05-02" }
];

test("39.01 nel menu c'è una voce sola per il programma, con il nome sotto", () => {
  assert.match(html, /data-vista="programma-1" type="button"/);
  assert.match(html, /Programma attivo · in corso/);
  assert.match(html, /id="nomeProgrammaAttivo"/);
  assert.doesNotMatch(html, /data-vista="programma-2"/);
  assert.doesNotMatch(html, /data-vista="programma-3"/);
  assert.match(html, /data-vista="archivio" type="button"/);
  assert.doesNotMatch(html, /data-vista="archivio"[^>]*disabled/);
});

test("39.02 l'app monta il programma attivo letto e l'archivio, senza posizioni", () => {
  assert.match(app, /programmaAttivo\(programmi\.programmi \|\| \[\]\)/);
  assert.match(app, /riepilogoProgramma\(attivo, sedute\.sedute/);
  assert.match(app, /montaArchivio\(programmi, modello/);
  assert.doesNotMatch(app, /ordinatiP\[indice\]/);
  assert.doesNotMatch(app, /programma2Griglia/);
});

test("39.03 l'archivio tiene i programmi che non sono l'attivo, e i cancellati fuori", () => {
  const righe = elencoArchivio(programmi, { attivoId: "p1" });
  assert.deepEqual(righe.map((r) => r.id), ["p2", "p3"]);
  assert.equal(righe[0].nome, "Forza novembre");
  assert.equal(righe[0].stato, "in bozza");
  assert.equal(righe[1].stato, "archiviato");
  assert.equal(righe[0].creato, "02/11/2026");
});

test("39.04 la riga dell'archivio dice quante schede, o che non le ha lette", () => {
  const schedeV2 = { perProgramma: { p2: { schede: [{ codice: "A" }, { codice: "B" }], archiviate: [{ codice: "Z" }] } } };
  const righe = elencoArchivio(programmi, { attivoId: "p1", schedeV2 });
  assert.equal(righe[0].schede, 2);
  const dom = new JSDOM("<div id='a'></div>");
  const doc = dom.window.document;
  renderArchivio(doc, doc.querySelector("#a"), { righe, cancellati: 3 });
  assert.match(doc.querySelector("#a").textContent, /2 schede · 1 archiviate/);
  assert.match(doc.querySelector("#a").textContent, /ne restano 3/);
  assert.equal(doc.querySelectorAll(".pr-arch-riga").length, 2);
  assert.equal(doc.querySelector(".pr-arch-riga").getAttribute("data-programma"), "p2");
});

test("39.05 la scheda aperta dall'archivio è la stessa vista, in sola lettura", () => {
  const dom = new JSDOM("<div id='g'></div>");
  const doc = dom.window.document;
  const g = doc.querySelector("#g");
  const rp = riepilogoProgramma(programmi[1], [], { indice: 1, totaleProgrammi: 3, oggi: new Date(Date.UTC(2026, 10, 4)) });
  renderProgramma(doc, g, {}, rp);
  assert.match(g.textContent, /Forza novembre/);
  assert.match(g.textContent, /sola lettura · 0 scritture/);
  assert.doesNotMatch(g.textContent, /NaN|undefined/);
});

test("39.06 archivio vuoto e date: si dichiara, non si inventa", () => {
  const dom = new JSDOM("<div id='a'></div>");
  const doc = dom.window.document;
  renderArchivio(doc, doc.querySelector("#a"), { righe: [] });
  assert.match(doc.querySelector("#a").textContent, /solo quello attivo/);
  assert.equal(dataItaliana("2026-10-05"), "05/10/2026");
  assert.equal(dataItaliana(""), "non registrato");
  assert.equal(dataItaliana("col testo che c'è"), "col testo che c'è");
});

test("39.07 solo lettura: la 2.7 non aggiunge scritture", () => {
  for (const vietato of ["setDoc", "updateDoc", "addDoc", "deleteDoc", ".set(", "writeBatch"]) {
    assert.ok(!leggi("comune/vista-archivio.js").includes(vietato), "trovato " + vietato + " nell'archivio");
    assert.ok(!app.includes(vietato), "trovato " + vietato + " in app.js");
  }
});
