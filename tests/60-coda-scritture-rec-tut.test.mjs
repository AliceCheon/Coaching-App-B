/* Passo 13 — il bug dello schermo che torna indietro, riprodotto sulla pagina vera.
 *
 * Alice, 8/11/2026, dal sito pubblicato:
 *  1. cambia un valore di Rec o TUT: sembra cambiare, poi la pagina "si sposta"
 *     e torna tutto come prima, nulla salvato;
 *  2. con i pulsantini + e - del Rec il numero cambia a schermo ma non si
 *     salva; premendo piu' volte di fila smette di funzionare;
 *  3. la colonna Rec resta stretta e i valori si spezzano ("2-/3'", "120-/1…").
 *
 * Qui sotto c'e' la SUA sequenza, identica: + tre volte di fila, poi un valore
 * scritto a mano e l'uscita dalla cella, poi una scelta dalla freccetta del
 * Rec e una dalla freccetta del TUT. Si monta la PAGINA VERA
 * (desktop/index.html con desktop/app-v31.js) su jsdom, con la zona B finita
 * (tests/finti/zona-b-finta.mjs): le letture hanno latenze a rotazione e una
 * scrittura si vede solo all'ack, come con il server vero.
 *
 * L'esercizio della sequenza e' nel formato che A scrive: nome con il
 * trattino basso ("Curl_bilanciere") e nessun campo id. La vista lo mostra
 * pulito ("Curl bilanciere"): il legame della modifica deve ritrovarlo uguale.
 *
 * Le tre domande di Alice, una per asserzione:
 *  (i)   dopo la prima scrittura la `versione` in memoria viene aggiornata
 *        prima della seconda? -> TUTTE le modifiche devono arrivare al disco
 *        (sei scritture, versione 7) senza nessun rifiuto;
 *  (ii)  la tabella viene ridisegnata con i dati letti PRIMA della scrittura
 *        e cancella la modifica? -> alla fine, a schermo devono stare i
 *        valori FINALI (Rec "3'", TUT "2-0-2") e il dato scritto;
 *  (iii) le pressioni successive vengono scartate o messe in coda? -> in
 *        coda: tutte applicate, in ordine, e la riga di stato dice
 *        "salvato alle ..." senza messaggi di rifiuto.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- i documenti veri della zona B, nella forma che la copia lascia ------ */

const META = {
  id: "prg-intensita", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A", "B", "C", "D"],
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: n === 4 ? "deload" : "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
/* La forma di A: nomi con il trattino basso, esercizi senza campo id. I valori
 * di Rec e TUT sono le frasi vere del v31 (prove 59). */
const esercizi = [
  { id: "ex-1", name: "Trazioni_assistite", muscle: "dorsali", note2: "presa prona", prescription: { rest: "120-180 sec", tempo: "2-0-1" }, progression: { weeks: otto() } },
  { id: "ex-2", name: "Lat_machine_presa_neutra", muscle: "centro schiena", prescription: { rest: "2-3'" }, progression: { weeks: otto() } },
  { id: "ex-3", name: "Rematore_bilanciere", muscle: "dorso", prescription: { rest: "1'30\"" }, progression: { weeks: otto() } },
  { id: "ex-4", name: "Pulley basso", muscle: "dorso", prescription: { rest: "90 sec" }, progression: { weeks: otto() } },
  { name: "Curl_bilanciere", muscle: "bicipiti", prescription: { rest: "1' a braccio poi 90\"", tempo: "3-1-1" }, progression: { weeks: otto() } },
  { id: "ex-6", name: "Alzate_laterali", muscle: "spalle", prescription: { rest: "No recupero tra le braccia e poi 1,30'" }, progression: { weeks: otto() } }
];
const ID_SCHEDA_DOC = "program-v2-sheet-prg-intensita__sh-A";
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "dati di prova del test 60" },
  programmi: [{ id: "program-v2-meta-prg-intensita", dati: { programMeta: META } }],
  schede: [{ id: ID_SCHEDA_DOC, dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet", versione: 1,
    sheet: { id: "sh-A", code: "A", name: "Dorsali, spalle, braccia", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Trazioni_assistite", kg: 42.5 }] } } }],
  esclusioni: [],
  registro: []
};

/* ---- la pagina vera, con la zona B finita -------------------------------- */

const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const consoleFinita = new VirtualConsole();
consoleFinita.on("jsdomError", () => {}); /* il canvas di jsdom senza il pacchetto canvas: not-implemented, ignorato */
const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: consoleFinita });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 12 });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
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

/* La coda e' svuotata quando per mezzo secondo non c'e' niente in volo:
 * ne' letture ne' scritture (le sincronizzazioni rimandate compresi). */
async function codaSvuota() {
  const t0 = Date.now();
  let silenzio = 0;
  while (Date.now() - t0 < 20000) {
    await new Promise((r) => setTimeout(r, 60));
    if (zona.inVolo() === 0) { silenzio += 60; if (silenzio >= 500) return; }
    else silenzio = 0;
  }
  throw new Error("la coda non si e' mai svuotata: letture e scritture non finiscono");
}

/* La riga del quinto esercizio (quello della sequenza di Alice). I nodi della
 * tabella si ricercano ogni volta: il ridisegno sostituisce tutto. */
const riga = () => doc.querySelector("#programma-attivo .p8-tab tbody tr.p8-r[data-js='5']");
const spanRec = () => riga().querySelector("td.c-rec span.rec");
const piu = () => riga().querySelectorAll("td.c-rec button.stp")[1];
const schedaDisco = () => zona.datiDi("schede", ID_SCHEDA_DOC);
const recDi = () => schedaDisco().sheet.exercises[4].prescription.rest;
const tutDi = () => schedaDisco().sheet.exercises[4].prescription.tempo;

test("60.1 la sequenza di Alice sulla pagina vera: + tre volte, a mano, freccetta", async () => {
  await attendi(() => doc.querySelector("#programma-attivo .p8-tab"), 15000, "la tabella non si e' mai montata");

  /* La cella parte col valore in fondo alla frase. */
  assert.equal(spanRec().textContent, "90\"", "il valore in colonna non e' l'ultimo della frase");

  /* --- + tre volte di fila, senza aspettare (come le dita) ---------------- */
  piu().click();
  piu().click();
  piu().click();
  await codaSvuota();

  /* (iii) le pressioni vanno in coda e si applicano TUTTE, in ordine:
   * il disco ha ricevuto le tre scritture (2', 2'30", 3'). */
  assert.equal(recDi(), "1' a braccio poi 3'",
    "le tre pressioni di + non sono finite sul disco (dati: " + recDi() + ")");
  /* (i) niente rifiuti di versione e niente esercizi non legati */
  const stato1 = doc.getElementById("modifica-stato").textContent || "";
  assert.ok(stato1.indexOf("cambiata nel frattempo") === -1, "versione rifiutata: " + stato1);
  assert.ok(stato1.indexOf("non si ritrova") === -1, "l'esercizio non si e' ritrovato: " + stato1);
  /* (ii) la tabella mostra ancora il valore finale, non uno vecchio */
  assert.equal(spanRec().textContent, "3'",
    "dopo le tre pressioni lo schermo e' tornato al valore vecchio: " + spanRec().textContent);

  /* --- scrittura a mano, poi uscita dalla cella --------------------------- */
  const s = spanRec();
  s.dispatchEvent(new dom.window.FocusEvent("focus"));
  s.textContent = "1'30\"";
  s.dispatchEvent(new dom.window.FocusEvent("blur"));
  await codaSvuota();
  assert.equal(recDi(), "1' a braccio poi 1'30\"", "la scrittura a mano non e' finita sul disco (dati: " + recDi() + ")");
  assert.equal(spanRec().textContent, "1'30\"");

  /* --- freccetta del Rec: scelgo 3' --------------------------------------- */
  /* la freccetta si usa da cella ferma */
  riga().querySelector("td.c-rec button.freccia-rec").click();
  const voceRec = Array.prototype.find.call(
    doc.querySelectorAll(".menu-freccia .menu-voce"),
    (v) => v.textContent === "3'"
  );
  assert.ok(voceRec, "il menu della freccetta del Rec non si e' aperto");
  voceRec.click();
  await codaSvuota();
  assert.equal(recDi(), "1' a braccio poi 3'");
  assert.equal(spanRec().textContent, "3'");

  /* --- freccetta del TUT: scelgo 2-0-2 ------------------------------------ */
  riga().querySelector("td.c-tut button.freccia-tut").click();
  const voceTut = Array.prototype.find.call(
    doc.querySelectorAll(".menu-freccia .menu-voce"),
    (v) => v.textContent === "2-0-2"
  );
  assert.ok(voceTut, "il menu della freccetta del TUT non si e' aperto");
  voceTut.click();
  await codaSvuota();
  assert.equal(tutDi(), "2-0-2");
  assert.equal(riga().querySelector("td.c-tut span.tut").textContent, "2-0-2");

  /* (i) sei modifiche, sei voci nel registro, versione 7. */
  const voci = zona.elencoDi("registro");
  assert.equal(voci.length, 6, "le voci del registro non sono sei: " + voci.length);
  assert.equal(Number(schedaDisco().versione), 7, "la versione del documento non e' 7: " + schedaDisco().versione);

  /* (iii) in ordine: i valori "dopo" del Rec in sequenza, testo intero. */
  const ric = voci.filter((v) => v.dati.campo === "recupero").map((v) => v.dati.dopo);
  assert.deepEqual(ric, [
    "1' a braccio poi 2'",
    "1' a braccio poi 2'30\"",
    "1' a braccio poi 3'",
    "1' a braccio poi 1'30\"",
    "1' a braccio poi 3'"
  ], "l'ordine delle scritture non e' quello delle pressioni: " + JSON.stringify(ric));

  /* La riga di stato dice QUANDO: "salvato alle ...". */
  const stato = doc.getElementById("modifica-stato").textContent || "";
  assert.ok(stato.indexOf("salvato alle") === 0, "la riga di stato non dice 'salvato alle': " + stato);

  /* E la cella e' pronta per la prossima modifica: data-prima fresco. */
  assert.equal(spanRec().getAttribute("data-prima"), "3'");
});
