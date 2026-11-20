/* 127 - testata del programma: Scarico, Vol -, Data inizio.
 * Pagina viva (desktop/index.html + app-v31.js), un'azione per un clic.
 * Per disegno (comune/piano-vivo.js:114-120) la sola settimana non scrive:
 * il passo intermedio lo dice ("S4 scelta: scrivi la percentuale di volume")
 * e il documento cambia quando settimana e volume ci sono insieme.
 * Misurato il 20/11/2026 con nodi riletti dopo ogni evento: e' cosi'. */
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
const PROGRAMMA = {
  id: "prg-viva", name: "Prova pagina viva", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, versione: 3, rotation: ["A"],
  sheets: [{ id: "sh-A", code: "A", name: "Dorsali" }, { id: "sh-B", code: "B", name: "Petto" }]
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
const ESE = (id, nome) => ({ id: id, name: nome, muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: otto() } });
const ID_A = "program-v2-sheet-prg-viva__sh-A";
const ID_B = "program-v2-sheet-prg-viva__sh-B";
const schedaDoc = (id, codice, nome, esercizi) => ({
  id: id,
  dati: {
    programId: "prg-viva", sheetId: "sh-" + codice, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + codice, code: codice, name: nome, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi }
  }
});
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 127" },
  programmi: [
    { id: "program-v2-meta-prg-viva", dati: { programMeta: META } },
    { id: "prg-viva", dati: PROGRAMMA }
  ],
  schede: [
    schedaDoc(ID_A, "A", "Dorsali", [ESE("ex-1", "Trazioni assistite"), ESE("ex-2", "Lat machine"), ESE("ex-3", "Rematore bilanciere")]),
    schedaDoc(ID_B, "B", "Petto", [ESE("ex-9", "Panca piana")])
  ],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

const vc = new VirtualConsole();
vc.on("jsdomError", () => {});
const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"), { runScripts: "outside-only", virtualConsole: vc });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 8 });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
globalThis.window = dom.window;
globalThis.document = doc;
await import("../desktop/app-v31.js");

const tab = (k) => doc.querySelectorAll("#programma-attivo .p8-tab")[k || 0] || null;
const righe = (k) => {
  const t = tab(k);
  if (!t) return [];
  return Array.from(t.querySelectorAll("tbody tr.p8-r[data-js]")).filter((tr) => !tr.classList.contains("p8-tec"));
};
/* datiDi restituisce gia' il campo `dati`: schedaA().sheet, non .dati.sheet. */
const schedaA = () => zona.datiDi("schede", ID_A) || {};
const schedaB = () => zona.datiDi("schede", ID_B) || {};
const meta = () => zona.datiDi("programmi", "program-v2-meta-prg-viva").programMeta || {};
/* testataProgramma scrive sul DOCUMENTO del programma (leggiProgrammaB):
 * guardare il META sarebbe guardare il documento sbagliato. */
const docProgramma = () => zona.datiDi("programmi", "prg-viva") || {};
const scaricoA = () => ((schedaA().sheet || {}).pianoScarico) || null;
const campi = (chiave) => Array.from(doc.querySelectorAll('[data-pr-c="' + chiave + '"]'));
const stato = () => String((doc.querySelector("[data-tono]") || {}).textContent || "");
const scriviChange = (el, v) => { el.value = String(v); el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); };

async function coda(tetto) {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 400;
  }, tetto || 20000, "la coda delle scritture non si e' mai svuotata");
}
async function pronta() {
  await attendiFinche(() => tab(0), 20000, "la tabella non si e' mai montata");
  await attendiFinche(() => righe(0).length >= 3, 15000, "la scheda A non e' a tre righe");
  await coda();
}

test("127.1 vol: senza settimana e' spento e non scrive niente", async () => {
  await pronta();
  const vol = campi("scarico-volume")[0];
  assert.ok(vol, "la pagina non ha il campo del volume");
  assert.equal(scaricoA(), null, "si parte senza scarico: " + JSON.stringify(scaricoA()));
  assert.equal(vol.disabled, true, "senza settimana il volume deve essere spento");
  const prima = JSON.stringify(schedaA());
  scriviChange(vol, "40");
  await new Promise((r) => setTimeout(r, 800));
  assert.equal(JSON.stringify(schedaA()), prima, "da spento il volume ha scritto lo stesso");
  assert.equal(scaricoA(), null, "da spento il volume ha creato uno scarico: " + JSON.stringify(scaricoA()));
  /* Le prove girano sulla stessa pagina: se il campo resta a 40, la 127.2
   * lo trova gia compilato e salta il passo intermedio. Si lascia vuoto. */
  vol.value = "";
  await coda();
});

test("127.2 scarico: la sola settimana non scrive (e lo dice), col volume scrive in A e la colonna si rivede", async () => {
  await pronta();
  const selA = campi("scarico-settimana")[0];
  assert.ok(selA, "la pagina non ha la tendina dello scarico");
  const primaB = JSON.stringify(schedaB());
  /* La persona vera: sceglie, poi rilegge i campi dal documento. */
  scriviChange(selA, "S4");
  await attendiFinche(() => stato().indexOf("S4 scelta") === 0, 12000,
    "dopo S4 la riga di stato non dice di scrivere la percentuale: " + JSON.stringify(stato().slice(0, 160)));
  const selRiletto = campi("scarico-settimana")[0];
  const volRiletto = campi("scarico-volume")[0];
  assert.ok(selRiletto && volRiletto, "dopo S4 la pagina non ha piu' i due campi");
  assert.equal(selRiletto.value, "S4", "la tendina riletta non mostra S4: " + JSON.stringify(selRiletto.value));
  assert.equal(scaricoA(), null, "la sola settimana non deve scrivere: " + JSON.stringify(scaricoA()));
  assert.equal(volRiletto.disabled, false, "scelta la settimana il volume riletto deve accendersi");
  scriviChange(volRiletto, "40");
  await attendiFinche(() => scaricoA() != null && Number(scaricoA().volume) === 40, 12000,
    "il volume 40 non e' arrivato nel documento: " + JSON.stringify(scaricoA()) + " | stato: " + stato().slice(0, 160));
  assert.equal(Number(scaricoA().settimana), 4, "la settimana scritta non e' la 4: " + JSON.stringify(scaricoA()));
  assert.equal(JSON.stringify(schedaB()), primaB, "la scheda B e' cambiata mentre toccavo lo scarico della A");
  await attendiFinche(() => tab(0).querySelectorAll("th.ph-scar, td.sc-col").length >= 1, 12000,
    "nella tabella della A non si vede lo scarico");
  assert.equal((tab(1) || doc).querySelectorAll("th.ph-scar, td.sc-col").length, 0,
    "la scheda B mostra uno scarico che non ha");
  await attendiFinche(() => String(stato()).indexOf("scarico salvato") === 0, 8000,
    "dopo il salvataggio la riga di stato non lo dice: " + JSON.stringify(stato().slice(0, 160)));
  await coda();
});

test("127.3 data-inizio: la data scritta arriva nella testata del programma", async () => {
  await pronta();
  const inizio = doc.querySelector('[data-pr-c="programma-inizio"]');
  assert.ok(inizio, "manca il campo Data inizio");
  assert.equal(inizio.isConnected, true, "il campo Data inizio che ho in mano non fa piu parte del documento");
  const prima = JSON.stringify(docProgramma());
  scriviChange(inizio, "01/12/2026");
  await attendiFinche(() => JSON.stringify(docProgramma()) !== prima, 12000,
    "la data non e' arrivata nel programma. stato: " + JSON.stringify(stato().slice(0, 200)) +
    " | meta: " + JSON.stringify(docProgramma()).slice(0, 160));
  assert.ok(/2026-12-01|01\/12\/2026/.test(JSON.stringify(docProgramma())),
    "la data scritta non si ritrova nel programma: " + JSON.stringify(docProgramma()).slice(0, 200));
  await attendiFinche(() => String(stato()).indexOf("data di inizio") === 0, 8000,
    "dopo il salvataggio la riga di stato non lo dice: " + JSON.stringify(stato().slice(0, 160)));
  const riletto = doc.querySelector('[data-pr-c="programma-inizio"]');
  assert.equal(String(riletto && riletto.value), "01/12/2026", "il campo riletto non mostra la data scritta");
  await coda();
});
