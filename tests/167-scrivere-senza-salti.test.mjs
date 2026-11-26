/* 167 - scrivere nella carta Programma senza che la pagina si ridisegni sotto le dita.
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
/* Passo 15b — la testata vive DENTRO `programMeta` dei programmi v2: la lettura
 * restituisce il meta come programma, e scriverla in cima al documento la
 * rendeva invisibile (la scrittura «riusciva» e il valore non cambiava mai).
 * Qui si guarda il documento che il programma usa davvero: quello del meta. */
const docProgramma = () => (zona.datiDi("programmi", "program-v2-meta-prg-viva") || {}).programMeta || {};
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

const campoDi = (chiave) => doc.querySelector('[data-pr-c="' + chiave + '"]');

test("167.1 il testo non si perde passando da un campo all'altro", async () => {
  await pronta();
  const desc = campoDi("programma-descrizione");
  assert.ok(desc, "manca il campo Descrizione");
  assert.equal(String(desc.tagName).toLowerCase(), "textarea", "la descrizione non è una casella di testo");
  desc.focus();
  desc.value = "Forza tre giorni";
  desc.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  const msg = campoDi("programma-messaggio");
  assert.ok(msg, "manca il campo Messaggio");
  desc.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true, relatedTarget: msg }));
  msg.focus();
  msg.value = "Ciao, oggi gambe";
  msg.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  await coda();
  assert.equal(String(campoDi("programma-descrizione").value), "Forza tre giorni",
    "il testo della descrizione è cambiato mentre scrivevo nel messaggio");
  assert.equal(String(campoDi("programma-messaggio").value), "Ciao, oggi gambe",
    "il testo del messaggio si è perso scrivendo");
});

test("167.2 la pagina non si ridisegna con il fuoco su un campo della testata", () => {
  const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.match(app, /closest\("#programma-attivo"\)/, "il controllo deve guardare la carta Programma");
  assert.match(app, /INPUT\|TEXTAREA\|SELECT/, "e i campi scrivibili, non solo le celle contenteditable");
  assert.match(app, /impronta === improntaPrima\) return \{ ridisegnato: false \};/,
    "la lettura senza novità torna senza toccare la pagina, non con una variabile inesistente");
});

test("167.3 uscendo dai campi i due testi sono nel documento", async () => {
  await pronta();
  const desc = campoDi("programma-descrizione");
  desc.focus();
  desc.value = "Forza tre giorni";
  desc.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attendiFinche(() => String(docProgramma().description || "") === "Forza tre giorni", 12000,
    "la descrizione non è arrivata nel programma: " + JSON.stringify(docProgramma().description));
  const msg = campoDi("programma-messaggio");
  msg.focus();
  msg.value = "Ciao, oggi gambe";
  msg.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  await attendiFinche(() => String(docProgramma().message || "") === "Ciao, oggi gambe", 12000,
    "il messaggio non è arrivato nel programma: " + JSON.stringify(docProgramma().message));
  await coda();
});
