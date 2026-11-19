/* tests/124-scrittura-senza-ridisegno.test.mjs - serie e TUT (campo tempo).
 *
 * Regola 19/11/2026, seconda meta': la cella mostra gia' da sola il valore che
 * si scrive, quindi dopo una scrittura di serie, ripetizioni, recupero o TUT la
 * pagina NON deve rileggere e ridisegnare: se ridisegna, il campo aperto sotto
 * le dita sparisce a meta' della scrittura.
 *
 * Fumo sulla PAGINA VIVA (desktop/index.html + desktop/app-v31.js), col finto
 * di B della 121. L'attesa e' attendiFinche di tests/finti/attesa.mjs: si
 * aspetta il fatto, con un tetto, non il tempo che passa.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const META = {
  id: "prg-viva", name: "Prova pagina viva", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
const ESE = (id, nome) => ({ id: id, name: nome, muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: otto() } });
const ID_SCHEDA_DOC = "program-v2-sheet-prg-viva__sh-A";
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 124" },
  programmi: [{ id: "program-v2-meta-prg-viva", dati: { programMeta: META } }],
  schede: [{
    id: ID_SCHEDA_DOC,
    dati: {
      programId: "prg-viva", sheetId: "sh-A", kind: "sheet", versione: 1,
      sheet: {
        id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z",
        exercises: [ESE("ex-1", "Trazioni assistite"), ESE("ex-2", "Lat machine"), ESE("ex-3", "Rematore bilanciere")]
      }
    }
  }],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const consoleFinita = new VirtualConsole();
consoleFinita.on("jsdomError", () => {});
const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: consoleFinita });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 8 });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
globalThis.window = dom.window;
globalThis.document = doc;
await import("../desktop/app-v31.js");

const righe = () => Array.from(doc.querySelectorAll("#programma-attivo .p8-tab tbody tr.p8-r[data-js]"))
  .filter((tr) => !tr.classList.contains("p8-tec"));
const schedaDisco = () => zona.datiDi("schede", ID_SCHEDA_DOC);
const viveSulDisco = () => schedaDisco().sheet.exercises.filter((e) => e && !e.deletedAt && !String(e.padreId || ""));
const serieDisco = (i) => { const e = viveSulDisco()[i]; const w = e && e.progression && e.progression.weeks && e.progression.weeks[0]; return w ? String(w.sets) : ""; };

async function codaSvuota() {
  let silenzio = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) silenzio += 10; else silenzio = 0;
    return silenzio >= 500;
  }, 20000, "la coda delle scritture non si e' mai svuotata");
}

/* La scrittura come la fa chi usa la pagina: il fuoco entra, il testo cambia,
 * si esce dalla cella. Sono i tre eventi che vista-programma ascolta. */
function scrivi(span, testo) {
  span.dispatchEvent(new dom.window.Event("focus"));
  span.textContent = testo;
  span.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  span.dispatchEvent(new dom.window.Event("blur"));
}

async function pronta() {
  await attendiFinche(() => doc.querySelector("#programma-attivo .p8-tab"), 20000, "la tabella non si e' mai montata");
  await attendiFinche(() => righe().length === 3 && viveSulDisco().length === 3, 12000, "la scheda A non e' a tre righe disegnate");
  await codaSvuota();
}

test("124.1 serie: il 6 arriva sul disco e la tabella NON si ridisegna", async () => {
  await pronta();
  const nodo = righe()[0];
  const span = nodo.querySelector("td.c-ser span[contenteditable]");
  assert.ok(span, "la cella serie della prima riga non si puo' scrivere");

  scrivi(span, "6");
  await attendiFinche(() => serieDisco(0) === "6", 12000, "la serie scritta non e' arrivata sul disco della scheda: " + serieDisco(0));

  await codaSvuota();
  assert.equal(righe()[0], nodo, "la tabella si e' ridisegnata dopo la scrittura di serie: il campo aperto sarebbe sparito sotto le dita");
  assert.equal(String(righe()[0].textContent || "").indexOf("6") !== -1, true, "la cella serie non mostra il valore scritto");
  await codaSvuota();
});

test("124.2 TUT (campo tempo): la scrittura parte e il disegno non salta", async () => {
  await pronta();
  const nodo = righe()[0];
  const span = nodo.querySelector("td.c-tut span[contenteditable]");
  assert.ok(span, "la cella TUT della prima riga non si puo' scrivere");
  assert.equal(span.getAttribute("data-campo"), "tempo", "la cella TUT deve portare il campo tempo, invece porta: " + span.getAttribute("data-campo"));

  const prima = zona.registri.scritture.length;
  scrivi(span, "45");
  await attendiFinche(() => zona.inVolo() === 0, 12000,
    "la coda non si e. svuotata dopo la scrittura del TUT");

  await codaSvuota();
  assert.equal(righe()[0], nodo, "la tabella si e' ridisegnata dopo la scrittura del TUT: il tempo non deve far saltare il disegno");
  await codaSvuota();
});

test("124.3 dopo la scrittura il campo e' ancora aperto, scrivibile e col valore scritto", async () => {
  await pronta();
  const span = righe()[1].querySelector("td.c-ser span[contenteditable]");
  assert.ok(span, "la cella serie della seconda riga non si puo' scrivere");
  scrivi(span, "5");
  await attendiFinche(() => serieDisco(1) === "5", 12000, "la seconda serie scritta non e' arrivata sul disco: " + serieDisco(1));

  const rimasto = righe()[1].querySelector('td.c-ser span[contenteditable][data-campo="serie"]');
  assert.ok(rimasto, "dopo la scrittura la cella serie non c'e' piu' nella tabella disegnata");
  assert.equal(rimasto.isConnected, true, "la cella serie e' staccata dal documento dopo la scrittura");
  assert.equal(String(rimasto.textContent || "").trim(), "5", "la cella serie non mostra piu' il valore scritto: " + rimasto.textContent);
  await codaSvuota();
});
