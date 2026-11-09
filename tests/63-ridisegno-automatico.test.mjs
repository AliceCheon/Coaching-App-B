/* Passo 16 — la pagina che si ridisegnava da sola, riprodotta sulla pagina vera.
 *
 * Alice, 9/11/2026, dal sito: mentre scrive Rec o TUT la pagina fa dei micro
 * riavvii, si ridisegna piu' volte e cancella la modifica in corso. Il registro
 * di Firebase dice che i salvataggi arrivano: il guasto e' il ridisegno, non la
 * scrittura.
 *
 * Qui si monta la PAGINA VERA (desktop/index.html + desktop/app-v31.js) su
 * jsdom, con il finto Firestore che sa fare due cose in piu':
 *  - `onSnapshot` con `emettiVolte()`: lo stesso documento emesso due volte;
 *  - `auth.ripetiStato()`: il callback di sessione richiamato con lo stesso
 *    utente, come fa l'SDK quando rinnova il token.
 *
 * Le domande di Alice, una per prova:
 *  63.1 due giri di sessione e due emissioni mentre una cella e' aperta: la
 *       cella non perde quello che sta scrivendo, non viene sostituita, la
 *       pagina non si ridisegna (e l'app non ha ascoltatori: le letture di B
 *       sono get() una volta sola);
 *  63.2 salvare non rilegge e non ridisegna: il disco ha il valore, la cella lo
 *       mostra, e nessun ridisegno e' avvenuto;
 *  63.3 trenta secondi con la pagina ferma: ZERO ridisegni (con giri di
 *       sessione e doppie emissioni nel mezzo, che e' il caso peggiore);
 *  63.4 un cambio vero (un esercizio in piu' sulla scheda) ridisegna UNA volta;
 *  63.5 lo scorrimento si prende prima e si rimette dopo, nodo per nodo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

const META = {
  id: "prg-intensita", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A", "B", "C", "D"],
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: n === 4 ? "deload" : "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
const esercizi = [
  { id: "ex-1", name: "Trazioni_assistite", muscle: "dorsali", note2: "presa prona", prescription: { rest: "120-180 sec", tempo: "2-0-1" }, progression: { weeks: otto() } },
  { id: "ex-2", name: "Lat_machine_presa_neutra", muscle: "centro schiena", prescription: { rest: "2-3'" }, progression: { weeks: otto() } },
  { id: "ex-3", name: "Rematore_bilanciere", muscle: "dorso", prescription: { rest: "1'30\"" }, progression: { weeks: otto() } },
  { id: "ex-4", name: "Pulley basso", muscle: "dorso", prescription: { rest: "90 sec" }, progression: { weeks: otto() } },
  { id: "ex-5", name: "Curl_bilanciere", muscle: "bicipiti", prescription: { rest: "1' a braccio poi 90\"", tempo: "3-1-1" }, progression: { weeks: otto() } },
  { id: "ex-6", name: "Alzate_laterali", muscle: "spalle", prescription: { rest: "No recupero tra le braccia e poi 1,30'" }, progression: { weeks: otto() } }
];
const ID_SCHEDA_DOC = "program-v2-sheet-prg-intensita__sh-A";
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "dati di prova del test 63" },
  programmi: [{ id: "program-v2-meta-prg-intensita", dati: { programMeta: META } }],
  schede: [{ id: ID_SCHEDA_DOC, dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet", versione: 1,
    sheet: { id: "sh-A", code: "A", name: "Dorsali, spalle, braccia", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Trazioni_assistite", kg: 42.5 }] } } }],
  esclusioni: [],
  registro: []
};

const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const consoleFinita = new VirtualConsole();
consoleFinita.on("jsdomError", () => {});
const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: consoleFinita });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 12 });
const sdk = creaSdkFinto(zona, { uid: "alice-prova" });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = sdk;
globalThis.window = dom.window;
globalThis.document = doc;
const app = await import("../desktop/app-v31.js");

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

const riga = () => doc.querySelector("#programma-attivo .p8-tab tbody tr.p8-r[data-js='1']");
const spanTut = () => riga().querySelector("td.c-tut span.tut");
const schedaDisco = () => zona.datiDi("schede", ID_SCHEDA_DOC);
const tutDi = () => schedaDisco().sheet.exercises[0].prescription.tempo;
const ridisegni = () => Number(dom.window.BD_B_STATO.ridisegni) || 0;
const stato = () => dom.window.BD_B_STATO;

test("63.1 due giri di sessione e due emissioni non toccano la cella aperta", async () => {
  await attendi(() => doc.querySelector("#programma-attivo .p8-tab"), 15000, "la tabella non si e' mai montata");
  const prima = ridisegni();
  assert.ok(prima >= 1, "il primo disegno non e' stato contato: " + prima);

  /* la cella del TUT aperta, col valore digitato e non ancora confermato */
  const s = spanTut();
  s.dispatchEvent(new dom.window.FocusEvent("focus"));
  s.textContent = "2-1-0";
  s.dispatchEvent(new dom.window.Event("input"));

  /* il caso peggiore: due giri di sessione (rinnovo del token) e lo stesso
   * documento emesso due volte, mentre lei sta scrivendo */
  sdk._auth.ripetiStato();
  sdk._auth.ripetiStato();
  zona.emettiVolte("schede", ID_SCHEDA_DOC, 2);
  await new Promise((r) => setTimeout(r, 700));

  assert.equal(ridisegni(), prima, "la pagina si e' ridisegnata mentre la cella era aperta");
  assert.ok(doc.contains(s), "la cella e' stata sostituita da un nodo nuovo");
  assert.equal(s.textContent, "2-1-0", "la cella ha perso quello che stava scrivendo: " + s.textContent);
  assert.ok(stato().rimandati >= 1, "il controllo non e' stato rimandato: " + stato().rimandati);
  /* la causa non era uno snapshot: B legge una volta sola e non si iscrive */
  assert.equal(zona.ascoltatoriDi("schede", ID_SCHEDA_DOC), 0, "l'app ha un ascoltatore ma le letture di B sono get()");
});

test("63.2 salvare non rilegge e non ridisegna: il valore sta nella cella", async () => {
  const prima = ridisegni();
  const s = spanTut();
  s.dispatchEvent(new dom.window.FocusEvent("blur"));
  await codaSvuota();

  assert.equal(tutDi(), "2-1-0", "la scrittura non e' finita sul disco: " + tutDi());
  assert.equal(spanTut().textContent, "2-1-0", "la cella non mostra il valore appena scritto: " + spanTut().textContent);
  assert.equal(ridisegni(), prima, "dopo il salvataggio la pagina si e' ridisegnata " + (ridisegni() - prima) + " volte");
});

test("63.3 trenta secondi con la pagina ferma: zero ridisegni", async () => {
  const prima = ridisegni();
  /* sei giri di cinque secondi: nel mezzo, ogni volta, un rinnovo di sessione
   * e due emissioni dello stesso documento. Se qualcosa ridisegna, si vede. */
  for (let i = 0; i < 6; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    sdk._auth.ripetiStato();
    zona.emettiVolte("schede", ID_SCHEDA_DOC, 2);
  }
  await new Promise((r) => setTimeout(r, 700));
  const dopo = ridisegni();
  assert.equal(dopo, prima, "con la pagina ferma ci sono stati " + (dopo - prima) + " ridisegni in 30 secondi");
});

test("63.4 un cambio vero ridisegna una volta sola", async () => {
  const prima = ridisegni();
  const nuovo = zona.datiDi("schede", ID_SCHEDA_DOC);
  nuovo.sheet.exercises.push({
    id: "ex-99", name: "Leg_curl", muscle: "bicipiti",
    prescription: { rest: "1'" }, progression: { weeks: otto() }
  });
  await zona.db.collection("bdB_atleti").doc("alice-prova").collection("schede").doc(ID_SCHEDA_DOC).set(nuovo);
  sdk._auth.ripetiStato();
  await attendi(() => ridisegni() > prima, 10000, "il ridisegno del cambio vero non e' arrivato");
  await new Promise((r) => setTimeout(r, 400));
  assert.equal(ridisegni(), prima + 1, "una modifica vera deve ridisegnare una volta sola, non " + (ridisegni() - prima) + " (letture dell'app " + stato().letture + ", letture del finto " + zona.registri.letture.length + ")");
  assert.ok(doc.querySelector("#programma-attivo .p8-tab tbody tr.p8-r[data-js='7']"), "la riga nuova non si vede");
});

test("63.5 lo scorrimento si prende prima e si rimette dopo, nodo per nodo", () => {
  function albero(cima) {
    const tabella = { tagName: "TABLE", parentNode: null, scrollTop: cima, getAttribute: () => "p8-tab", querySelector: () => null };
    const att = {
      tagName: "SECTION", parentNode: null, scrollTop: 0, getAttribute: () => "programma", querySelector: () => null,
      querySelectorAll: () => [tabella]
    };
    tabella.parentNode = att;
    return { att, tabella, doc: { querySelector: (sel) => (sel === "#programma-attivo" ? att : null) } };
  }

  const primo = albero(240);
  const preso = app.prendiScorrimento(primo.doc, { scrollY: 180, scrollTo: () => {} });
  assert.deepEqual(preso.elementi, [{ percorso: "table.p8-tab", cima: 240 }], "lo scorrimento preso non e' quello della tabella");
  assert.equal(preso.finestra, 180);

  /* la pagina ridisegnata: nodi nuovi, stessa struttura, stessa posizione */
  const secondo = albero(0);
  let scorso = null;
  secondo.att.querySelector = (sel) => (sel === "table.p8-tab" ? secondo.tabella : null);
  app.rimettiScorrimento(secondo.doc, { scrollTo: (x, y) => { scorso = [x, y]; } }, preso);
  assert.equal(secondo.tabella.scrollTop, 240, "lo scorrimento della tabella non e' tornato");
  assert.deepEqual(scorso, [0, 180], "lo scorrimento della finestra non e' tornato");
});
