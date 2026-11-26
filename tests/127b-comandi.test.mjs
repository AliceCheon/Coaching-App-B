/* 127b - i comandi della pagina viva che restano verdi: copia/sposta, fase,
 * svuota. Pagina vera (desktop/index.html + app-v31.js). Regola della 127:
 * dopo ogni evento i nodi si rileggono dal documento (il ridisegno li
 * sostituisce). Lo svuotamento e' per ultimo, perche' toglie le righe ad A.
 *
 * La bozza e Attiva NON stanno qui: vivono in tests/127c-bozza.test.mjs,
 * perche' oggi la scrittura non arriva dove la pagina la legge (vedi 127c). */
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
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 127b" },
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
const tab = (k) => doc.querySelectorAll("#programma-attivo .p8-tab")[k || 0] || null;
const righe = (k) => {
  const t = tab(k);
  if (!t) return [];
  return Array.from(t.querySelectorAll("tbody tr.p8-r[data-js]")).filter((tr) => !tr.classList.contains("p8-tec"));
};
const schedaA = () => zona.datiDi("schede", ID_A) || {};
const schedaB = () => zona.datiDi("schede", ID_B) || {};
/* Passo 15b — la testata dei programmi v2 vive dentro `programMeta`: è quello
 * che la pagina legge e che l'app scrive (il documento piatto è la copia v1). */
const prog = () => ((zona.datiDi("programmi", "program-v2-meta-prg-viva") || {}).programMeta) || {};
const meta = () => ((zona.datiDi("programmi", "program-v2-meta-prg-viva") || {}).programMeta) || {};
const campi = (chiave) => Array.from(contenitore.querySelectorAll('[data-pr-c="' + chiave + '"]'));
const bottone = (testo) => Array.from(contenitore.querySelectorAll("button"))
  .filter((b) => String(b.textContent || "").trim() === testo)[0] || null;
const scriviChange = (el, v) => { el.value = String(v); el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); };
const eserciziA = () => ((schedaA().sheet || {}).exercises) || [];
const viviA = () => eserciziA().filter((e) => !e.deletedAt && !String(e.padreId || ""));

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

test("127b.1 copia/sposta: la destinazione offre solo le altre schede e aprire non scrive", async () => {
  await pronta();
  const primaA = JSON.stringify(schedaA());
  const primaB = JSON.stringify(schedaB());
  const bt = doc.querySelector('[data-copia="1"]');
  assert.ok(bt, "manca il tasto Copia/Sposta esercizi");
  bt.click();
  await attendiFinche(() => doc.querySelector("[data-copia-box]"), 8000, "il riquadro della copia non si e' aperto");
  const dest = doc.querySelector('[data-pr-c="copia-destinazione"]');
  assert.ok(dest, "il riquadro non ha la destinazione");
  const valori = Array.from(dest.querySelectorAll("option")).map((o) => String(o.value)).filter((v) => v !== "");
  assert.deepEqual(valori, ["sh-B"], "la destinazione deve offrire solo l'altra scheda: " + JSON.stringify(valori));
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(JSON.stringify(schedaA()), primaA, "aprire la copia ha scritto nella scheda A");
  assert.equal(JSON.stringify(schedaB()), primaB, "aprire la copia ha scritto nella scheda B");
  await coda();
});

test("127b.2 fase: la tendina scrive la fase nel programma e il campo riletto la mostra", async () => {
  await pronta();
  const fase = campi("programma-fase")[0];
  assert.ok(fase, "manca il campo Fase");
  assert.equal(String(prog().phase), "Bulk", "si parte da Bulk: " + JSON.stringify(prog().phase));
  /* Passo 15b — il documento piatto (la vecchia copia v1) non si tocca più:
   * la testata si scrive dentro il meta, che è quello che la pagina legge. */
  const primaPiatto = JSON.stringify(zona.datiDi("programmi", "prg-viva") || {});
  scriviChange(fase, "Cut");
  await attendiFinche(() => String(prog().phase) === "Cut", 12000,
    "la fase non e' arrivata nel programma: " + JSON.stringify(prog().phase));
  const riletto = campi("programma-fase")[0];
  assert.ok(riletto, "dopo il cambio la pagina non ha piu' il campo Fase");
  assert.equal(String(riletto.value), "Cut", "il campo riletto non mostra Cut: " + JSON.stringify(riletto.value));
  assert.equal(String(meta().phase), "Cut", "la fase non è finita nel meta: " + JSON.stringify(meta().phase));
  assert.equal(JSON.stringify(zona.datiDi("programmi", "prg-viva") || {}), primaPiatto,
    "la copia piatta del programma è stata toccata: la testata vive nel meta");
  scriviChange(riletto, "Bulk");
  await attendiFinche(() => String(prog().phase) === "Bulk", 12000,
    "non sono riuscito a rimettere Bulk: " + JSON.stringify(prog().phase));
  await coda();
});

test("127b.3 svuota: la conferma svuota la scheda A e la tabella lo mostra", async () => {
  await pronta();
  assert.ok(viviA().length >= 3, "la scheda A non ha tre esercizi vivi prima dello svuotamento: " + viviA().length);
  const primaB = JSON.stringify(schedaB());
  const bt = bottone("Svuota scheda");
  assert.ok(bt, "la pagina non ha il tasto Svuota scheda");
  bt.click();
  await attendiFinche(() => contenitore.querySelector(".pr-conf"), 8000, "il riquadro dello svuotamento non si e' aperto");
  const testo = String(contenitore.querySelector(".pr-conf").textContent || "").replace(/\s+/g, " ");
  assert.match(testo, /svuot|togliere|esercizi/i, "il riquadro non dice cosa starebbe per fare: " + JSON.stringify(testo.slice(0, 200)));
  const si = contenitore.querySelector('.pr-conf [data-igiene="svuota"]');
  assert.ok(si, "il riquadro non ha il tasto di conferma dello svuotamento");
  si.click();
  await attendiFinche(() => viviA().length === 0, 15000, "restano " + viviA().length + " esercizi vivi nella scheda A");
  await attendiFinche(() => righe(0).length === 0, 15000, "la tabella mostra ancora " + righe(0).length + " righe dopo lo svuotamento");
  await coda();
  console.log("[127b.3] esercizi=" + eserciziA().length + " vivi=" + viviA().length + " righe=" + righe(0).length);
  assert.equal(viviA().length, 0, "restano esercizi vivi: " + viviA().length);
  assert.equal(righe(0).length, 0, "la scheda svuotata mostra ancora righe: " + righe(0).length);
  assert.equal(JSON.stringify(schedaB()), primaB, "lo svuotamento ha toccato la scheda B");
});
