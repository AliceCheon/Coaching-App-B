/* tests/120-piu-riga-pagina-viva.test.mjs - il difetto di "+ Riga", dall'inizio
 * alla fine, sulla PAGINA VIVA (desktop/index.html + desktop/app-v31.js).
 *
 * Alice, 19/11/2026, dal sito pubblicato: "+ Riga" dice che la riga e' stata
 * aggiunta, ma la tabella resta a 8 esercizi; "Copia/Sposta esercizi" risponde
 * "QUESTA SCHEDA NON SI PUO' ANCORA SVUOTARE - la pagina non ha un editor
 * collegato" mentre la freccia e Svuota funzionano.
 *
 * Le prove 78, 79, 119 provano il MOTORE e la vista, mai il pezzo in mezzo:
 * la decisione se rileggere dopo la scrittura, che vive in app-v31.js. Un test
 * sul testo del codice non vede un difetto che vive nel flusso.
 *
 * Qui si preme il tasto VERO sulla pagina VERA, si sceglie l'esercizio nel
 * selettore VERO, e si pretende che la riga compaia nella TABELLA DISEGNATA.
 * La regola che Alice ha dato il 19/11: la prova deve vedere la riga nella
 * tabella, non solo nel documento.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { chiedeRilettura, CAMPI_CHE_RIDISEGNANO, CAMPI_CHE_NON_RIDISEGNANO } from "../comune/ridisegno-b.js";

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
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 120" },
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
  esclusioni: [],
  registro: []
};

const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const consoleFinita = new VirtualConsole();
consoleFinita.on("jsdomError", () => {});
const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: consoleFinita });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 8 });
const sdk = creaSdkFinto(zona, { uid: "alice-prova" });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = sdk;
globalThis.window = dom.window;
globalThis.document = doc;
await import("../desktop/app-v31.js");

async function attendi(condizione, massimoMs, cosa) {
  const t0 = Date.now();
  while (!condizione()) {
    if (Date.now() - t0 > massimoMs) throw new Error("attesa scaduta: " + cosa);
    await new Promise((r) => setTimeout(r, 10));
  }
}

async function codaSvuota() {
  const t0 = Date.now();
  let silenzio = 0;
  while (Date.now() - t0 < 20000) {
    await new Promise((r) => setTimeout(r, 60));
    if (zona.inVolo() === 0) { silenzio += 60; if (silenzio >= 500) return; }
    else silenzio = 0;
  }
  throw new Error("la coda non si e' mai svuotata");
}

const tabella = () => doc.querySelector("#programma-attivo .p8-tab");
const righe = () => Array.from(doc.querySelectorAll("#programma-attivo .p8-tab tbody tr.p8-r[data-js]"));
const nomiInTabella = () => righe().map((tr) => String(tr.textContent || "").replace(/\s+/g, " "));
const schedaDisco = () => zona.datiDi("schede", ID_SCHEDA_DOC);
const testo = () => String(doc.querySelector("#programma-attivo").textContent || "").replace(/\s+/g, " ");

function tasto(testo) {
  return Array.from(doc.querySelectorAll("#programma-attivo button"))
    .filter((b) => String(b.textContent || "").trim() === testo)[0] || null;
}

test("prima di tutto: la pagina viva si monta e disegna la tabella", async () => {
  await attendi(() => tabella(), 20000, "la tabella non si e' mai montata");
  await codaSvuota();
  assert.equal(righe().length, 3, "la scheda A deve partire con 3 esercizi disegnati: " + righe().length);
});

test("120.1 la funzione unica sa quali scritture fanno ridisegnare", () => {
  CAMPI_CHE_RIDISEGNANO.forEach((c) => {
    assert.equal(chiedeRilettura({ campo: c }), true, "manca dal ridisegno: " + c);
  });
  CAMPI_CHE_NON_RIDISEGNANO.forEach((c) => {
    assert.equal(chiedeRilettura({ campo: c }), false, "non deve far ridisegnare: " + c);
  });
  assert.equal(chiedeRilettura(null), false, "senza richiesta non si ridisegna");
});

test("120.2 + Riga: la riga compare DAVVERO nella tabella disegnata", async () => {
  await attendi(() => tabella(), 20000, "la tabella non si e' mai montata");
  await codaSvuota();

  const bt = tasto("+ Riga");
  assert.ok(bt, "il tasto + Riga non c'e' nella pagina viva");
  assert.equal(bt.disabled, false, "+ Riga e' spento: " + (bt.title || ""));

  bt.click();
  const velo = await (async () => {
    await attendi(() => doc.querySelector(".bdsel-velo .bdsel-it[data-n='Curl manubri']"), 8000, "il selettore non si e' aperto");
    return doc.querySelector(".bdsel-velo");
  })();
  assert.ok(!velo.hidden, "il selettore e' aperto");

  const voce = velo.querySelector(".bdsel-it[data-n='Curl manubri']");
  const primaRighe = righe().length;
  const primDisco = schedaDisco().sheet.exercises.length;

  voce.click();
  await attendi(() => schedaDisco().sheet.exercises.length === primDisco + 1, 10000, "la riga non e' finita sul disco");
  await attendi(() => nomiInTabella().some((t) => t.indexOf("Curl manubri") !== -1), 12000,
    "la riga e' sul disco ma NON nella tabella disegnata (difetto di + Riga)");

  assert.equal(righe().length, primaRighe + 1, "la tabella deve avere una riga in piu'");
  assert.ok(nomiInTabella().some((t) => t.indexOf("Curl manubri") !== -1), "Curl manubri non si vede in tabella");
  assert.ok(testo().indexOf("riga aggiunta") !== -1 || testo().indexOf("Curl manubri") !== -1,
    "la pagina deve dire che l'ha aggiunta");
  await codaSvuota();
});

test("120.3 Copia/Sposta apre il suo riquadro e non parla di Svuota", async () => {
  await attendi(() => tabella(), 20000, "la tabella non si e' mai montata");
  await codaSvuota();

  /* si chiude un eventuale riquadro rimasto aperto dalla prova prima */
  Array.from(doc.querySelectorAll("#programma-attivo .pr-conf")).forEach((b) => { if (b.parentNode) b.parentNode.removeChild(b); });

  const bt = tasto("Copia/Sposta esercizi");
  assert.ok(bt, "il tasto Copia/Sposta non c'e' nella pagina viva");
  assert.equal(bt.disabled, false, "Copia/Sposta e' spento: " + (bt.title || ""));

  bt.click();
  const box = doc.querySelector("#programma-attivo [data-copia-box]");
  assert.ok(box, "il riquadro della copia non si e' aperto: la pagina crede che l'editor non ci sia");
  const dentro = String(box.textContent || "").replace(/\s+/g, " ");
  assert.ok(dentro.indexOf("Copia / Sposta esercizi") !== -1, "manca il titolo della copia: " + dentro);
  assert.equal(dentro.indexOf("non ha un editor collegato"), -1,
    "il riquadro della copia mostra ancora il rifiuto di Svuota");
});
