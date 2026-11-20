/* 127c - bozza e Attiva sulla pagina viva. Dal 20-11 e' verde: sta nella suite.
 *
 * Perche' sta qui e non in 127b: la misura del 20/11 (tests/misura-bozza) ha
 * mostrato che il clic di conferma scrive davvero in bdB_atleti, ma sul
 * documento `program-v2-meta-prg-viva` a livello superiore
 * (`status:"draft", active:false, versione:1`), mentre la pagina legge
 * `programMeta.status`: la riga resta «Attivo» e nessun messaggio lo dice.
 * Queste due prove descrivono il comportamento VOLUTO: quando l'app scrivera'
 * dove la pagina legge, diventeranno verdi e si potranno spostare in 127b.
 *
 * La fixture tiene DUE documenti per lo stesso programma, come la 126/127:
 * senza il meta la pagina non monta affatto (misurato: 20 s, nessuna tabella).
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
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 127c" },
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

const contenitore = doc.getElementById("programma-attivo");
const righe = () => {
  const t = doc.querySelectorAll("#programma-attivo .p8-tab")[0] || null;
  if (!t) return [];
  return Array.from(t.querySelectorAll("tbody tr.p8-r[data-js]")).filter((tr) => !tr.classList.contains("p8-tec"));
};
const prog = () => zona.datiDi("programmi", "prg-viva") || {};
const meta = () => ((zona.datiDi("programmi", "program-v2-meta-prg-viva") || {}).programMeta) || {};
const bottone = (testo) => Array.from(contenitore.querySelectorAll("button"))
  .filter((b) => String(b.textContent || "").trim() === testo)[0] || null;
const riquadro = () => contenitore.querySelector(".pr-conf");
const statoRiga = () => String((contenitore.querySelector(".pr-stato") || {}).textContent || "").replace(/\s+/g, " ").trim();
const scritture = () => JSON.stringify((zona.registri.scritture || []).map((w) => [w.percorso, (w.dati || {}).status, (w.dati || {}).tipo]));
const crudo = () => " [crudo: meta.status=" + JSON.stringify(meta().status) + " metaDoc=" + JSON.stringify(zona.datiDi("programmi", "program-v2-meta-prg-viva"))
  + " prgDoc=" + JSON.stringify(zona.datiDi("programmi", "prg-viva"))
  + " riga=" + JSON.stringify(statoRiga()) + " tasti=" + JSON.stringify(Array.from(contenitore.querySelectorAll("button")).map((b) => String(b.textContent || "").trim()).filter((t) => /bozza|Attiva/i.test(t)))
  + " scritture=" + scritture() + "]";

async function coda() {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 400;
  }, 20000, "la coda delle scritture non si e' mai svuotata");
}
async function pronta() {
  await attendiFinche(() => righe().length >= 3, 25000, "la scheda A non e' a tre righe");
  await coda();
}

test("127c.1 bozza: la conferma scrive dove la pagina legge e la riga dice In bozza", async () => {
  await pronta();
  const bt = bottone("Metti in bozza");
  assert.ok(bt, "il programma attivo non ha il tasto Metti in bozza:" + crudo());
  bt.click();
  await attendiFinche(() => riquadro(), 8000, "il riquadro della bozza non si e' aperto:" + crudo());
  const si = riquadro().querySelector('[data-igiene="bozza"]');
  assert.ok(si, "il riquadro non ha il tasto per confermare la bozza");
  si.click();
  await attendiFinche(() => statoRiga() === "In bozza" || String(meta().status) === "draft", 12000,
    "dopo la conferma la pagina dice ancora «Attivo» e programMeta.status e' ancora attivo:" + crudo());
  await coda();
  assert.equal(String(meta().status), "draft", "programMeta.status non dice draft: la pagina continuerebbe a dire Attivo" + crudo());
  assert.equal(meta().active, false, "programMeta.active non dice false" + crudo());
  assert.equal(statoRiga(), "In bozza", "la riga di stato non dice In bozza:" + crudo());
  assert.ok(bottone("Attiva"), "il tasto non e' tornato Attiva" + crudo());
});

test("127c.2 attiva: dalla bozza si torna attivo e la riga lo dice", async () => {
  await pronta();
  assert.equal(String(meta().status), "draft", "si parte dalla bozza:" + crudo());
  const bt = bottone("Attiva");
  assert.ok(bt, "manca il tasto Attiva sulla bozza:" + crudo());
  bt.click();
  await attendiFinche(() => riquadro(), 8000, "il riquadro di Attiva non si e' aperto:" + crudo());
  const si = riquadro().querySelector('[data-igiene="attiva"]');
  assert.ok(si, "il riquadro di Attiva non ha il tasto di conferma");
  si.click();
  await attendiFinche(() => String(meta().status) === "active" && statoRiga() === "Attivo", 12000,
    "il programma non e' tornato attivo dove la pagina legge:" + crudo());
  await coda();
  assert.equal(statoRiga(), "Attivo", "la riga di stato non dice Attivo:" + crudo());
  assert.ok(bottone("Metti in bozza"), "il tasto non e' tornato Metti in bozza" + crudo());
});

/* La 107 prova solo che il TASTO "Metti in bozza" esista e chiami onBozza:
 * non guarda dove finisce lo stato. La catena vera (clic, conferma, scrittura,
 * tabella ridisegnata) la prova questa 127c. */
test("127c.3 annulla: rimette lo stato com'era, dove la pagina legge", async () => {
  await pronta();
  assert.equal(String(meta().status), "active", "si parte dall'attivo:" + crudo());
  const bt = contenitore.querySelector("button.pg-undo") || doc.querySelector("button.pg-undo");
  assert.ok(bt, "manca il tasto Annulla nella pagina:" + crudo());
  await attendiFinche(() => bt.disabled === false, 8000, "il tasto Annulla resta spento dopo l'attivazione:" + crudo());
  bt.click();
  await attendiFinche(() => String(meta().status) === "draft" && statoRiga() === "In bozza", 15000,
    "dopo l'Annulla la pagina non e' tornata alla bozza:" + crudo());
  await coda();
  assert.equal(String(meta().status), "draft", "Annulla non ha rimesso programMeta.status a draft:" + crudo());
  assert.equal(meta().active, false, "Annulla non ha rimesso programMeta.active a false:" + crudo());
  assert.equal(statoRiga(), "In bozza", "la riga non dice In bozza dopo l'Annulla:" + crudo());
  assert.ok(bottone("Attiva"), "il tasto non dice Attiva dopo l'Annulla:" + crudo());
});
