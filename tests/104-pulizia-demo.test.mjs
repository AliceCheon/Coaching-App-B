/* tests/104-pulizia-demo.test.mjs — B.21 PASSO 1: via i controlli che non
 * fanno niente.
 *
 * Pagina vera (desktop/index.html) e scheda disegnata dentro #programma-attivo
 * come fa app-v31.js: quello che si guarda e' quello che Alice vede.
 * Si tolgono: \u00ab+ Nuova progressione (demo)\u00bb, \u00abImporta da PDF\u00bb,
 * \u00abProgressioni\u00bb spento, \u00abLibreria Coach\u00bb spento nella barra del
 * programma, il campo \u00abVisibile all'atleta dal\u00bb col suo \u00abCambia\u00bb,
 * e le pagine segnaposto Programma 2 / Programma 3.
 * Restano: \u00abCopia/Sposta esercizi\u00bb (demo, deciso dopo), \u00abAttiva\u00bb
 * (diventa vivo al PASSO 2), \u00ab+l secondo Cambia (cambia il programma).
 */
import { test } from "node:test";
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
  id: "prg104", name: "Intensit\u00e0 ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
let seq = 0;
const sett = (serie, label) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: { label }, rest: { seconds: 120 } }));
const ESE = (nome) => ({ id: "ex-" + (++seq), name: nome, nome, muscolo: "dorsali", nota: "", sup: "", prescription: { sets: 4, rest: { seconds: 90 } }, progression: { weeks: sett(4, "10-8") } });
const schedaDoc = (cod, esercizi) => ({ id: "s-prg104-" + cod, dati: { programId: "prg104", sheetId: "sh-" + cod, kind: "sheet", sheet: { id: "sh-" + cod, code: cod, name: "Dorsali " + cod, exercises: esercizi } } });

function paginaVera() {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  win.setTimeout = () => 0;
  const chiamate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => ({ codice: "A", esercizi: 2, tecniche: 1, righe: 3, modifiche: 2 }),
    onCambia: (r) => { chiamate.push(r); return Promise.resolve({ ok: true }); },
    svuotaProgramma: () => Promise.resolve({ ok: true })
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha il contenitore #programma-attivo");
  const r = riepilogoProgramma(meta, [], {
    schedeV2: ricostruisciSchede([schedaDoc("A", [ESE("Rematore bilanciere"), ESE("Trazioni")])]),
    indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 16)), quante: 8
  });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  return { doc, win, chiamate, carta: contenitore };
}

const testi = (radice, sel) => Array.from(radice.querySelectorAll(sel)).map((b) => String(b.textContent || "").replace(/\s+/g, " ").trim());

test("104.1 il menu non ha pi\u00f9 le voci Programma 2 e Programma 3, e le pagine segnaposto non esistono", () => {
  const s = paginaVera();
  assert.equal(s.doc.querySelectorAll('[data-vista="programma-2"]').length, 0, "niente voce Programma 2");
  assert.equal(s.doc.querySelectorAll('[data-vista="programma-3"]').length, 0, "niente voce Programma 3");
  assert.equal(s.doc.querySelector("#pag-programma-2"), null, "niente pagina Programma 2");
  assert.equal(s.doc.querySelector("#pag-programma-3"), null, "niente pagina Programma 3");
  assert.ok(s.doc.querySelector("#pag-programma-1"), "la pagina del programma attivo resta");
  assert.ok(s.doc.querySelector('[data-vista="archivio"]'), "l'Archivio resta");
});

test("104.2 la barra della scheda non ha pi\u00f9 la progressione demo n\u00e9 \u00abProgressioni\u00bb spento", () => {
  const s = paginaVera();
  const barra = s.carta.querySelector(".pr-bar");
  assert.ok(barra, "la barra della scheda c'e'");
  const etichette = testi(barra, "button");
  assert.ok(!etichette.some((t) => /Nuova progressione/i.test(t)), "non c'e' \u00ab+ Nuova progressione\u00bb: " + JSON.stringify(etichette));
  assert.ok(!etichette.some((t) => /^Progressioni$/.test(t)), "non c'e' \u00abProgressioni\u00bb spento");
  assert.ok(etichette.some((t) => t === "+ Riga"), "+ Riga resta");
  assert.ok(etichette.some((t) => /Applica progressione a tutta la scheda/.test(t)), "resta il tasto vivo della progressione");
  assert.ok(etichette.some((t) => /Copia\/Sposta esercizi/.test(t)), "Copia/Sposta resta (decider\u00e0 Alice)");
});

test("104.3 nella carta del programma non ci sono pi\u00f9 \u00abImporta da PDF\u00bb, il campo visibilit\u00e0 e il suo \u00abCambia\u00bb", () => {
  const s = paginaVera();
  const testo = s.carta.textContent || "";
  assert.ok(!/Importa da PDF/i.test(testo), "niente Importa da PDF");
  assert.ok(!/Visibile all'atleta dal/i.test(testo), "niente campo \u00abVisibile all'atleta dal\u00bb");
  assert.equal(s.carta.querySelector(".pr-vis"), null, "niente riquadro .pr-vis nella scheda viva");
  const cambia = Array.from(s.carta.querySelectorAll(".pr-acts button")).filter((b) => b.textContent.trim() === "Cambia");
  assert.equal(cambia.length, 1, "resta un solo \u00abCambia\u00bb: quello del programma");
});

test("104.4 la barra del programma non ha pi\u00f9 \u00abLibreria Coach\u00bb spento; il tasto vero resta in pagina", () => {
  const s = paginaVera();
  const dentro = Array.from(s.carta.querySelectorAll("button")).filter((b) => /Libreria Coach/.test(b.textContent || ""));
  assert.equal(dentro.length, 0, "nella scheda viva non c'e' piu' nessun Libreria Coach");
  const fuori = Array.from(s.doc.querySelectorAll("button")).filter((b) => /Libreria Coach/.test(b.textContent || ""));
  assert.ok(fuori.length >= 1, "il tasto Libreria Coach vero (pg-top) e' rimasto in pagina");
  assert.ok(fuori.some((b) => b.disabled === false), "ed e' acceso");
});

test("104.5 il tasto del programma resta spento senza editor, e disegnare la scheda non scrive niente", () => {
  const s = paginaVera();
  const bottoni = Array.from(s.carta.querySelectorAll(".pr-acts button")).map((b) => b.textContent.trim());
  assert.ok(bottoni.indexOf("Attivo") === -1, "nessun tasto che ripete lo stato: " + JSON.stringify(bottoni));
  const azione = Array.from(s.carta.querySelectorAll(".pr-acts button"))
    .filter((b) => b.textContent.trim() === "Metti in bozza" || b.textContent.trim() === "Attiva")[0];
  assert.ok(azione, "il tasto dell'azione resta in carta: " + JSON.stringify(bottoni));
  assert.equal(azione.disabled, true, "senza editor e' spento");
  assert.equal(s.chiamate.length, 0, "disegnare la scheda non ha chiesto nessuna scrittura");
});
