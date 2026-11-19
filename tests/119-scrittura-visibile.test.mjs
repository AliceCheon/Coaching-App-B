/* tests/119-scrittura-visibile.test.mjs - i due difetti del 19/11/2026.
 *
 * Alice, sulla pagina pubblicata: "+ Riga" diceva "riga aggiunta" e la tabella
 * restava a 8 esercizi; "Copia/Sposta esercizi" rispondeva "QUESTA SCHEDA NON
 * SI PUO' ANCORA SVUOTARE - la pagina non ha un editor collegato" pur essendo
 * l'editor acceso (e la freccia e Svuota funzionavano).
 *
 * Cause trovate:
 *  a) la riga era scritta in B, ma dopo la scrittura la pagina non rileggeva:
 *     la lista dei campi che impongono il ridisegno (desktop/app-v31.js) non
 *     conteneva "aggiunta-riga", quindi tornava { ridisegnato: false };
 *  b) la vista leggeva la scheda con doc.querySelector(".p8-tab[data-scheda]"),
 *     cioe' la PRIMA tabella della pagina, non quella del tasto premuto;
 *  c) l'involucro "modifica" di app-v31 non inoltrava copiaEsercizi, quindi il
 *     tasto concludeva che l'editor non c'era, e il rifiuto usava il titolo di
 *     Svuota per tutte le azioni.
 *
 * La prova che avrebbe dovuto accorgersene e' la 79: guardava solo che la vista
 * mandasse il campo giusto (una regex sul sorgente), mai che la pagina
 * ridisegnasse, e nessuna prova attraversava il confine fra onCambia e la
 * rilettura. Qui il confine si attraversa: pagina vera, editor vero, zona B
 * finta che registra, e la tabella ridisegnata che deve mostrare la riga.
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
import { creaEditorSchede } from "../comune/editor-schede-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");

/* --- la scheda come la scrive A ------------------------------------------ */
let seq = 0;
const settimana = (n) => ({ week: n, sets: 4, reps: { label: "10-8" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const ESE = (nome, id) => ({
  id: id || ("ex-119-" + (++seq)), name: nome, muscle: "dorsali",
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: Array.from({ length: 8 }, (_, i) => settimana(i + 1)) }
});

function schedaDati(idScheda, codice, esercizi) {
  return {
    programId: "prg-119", sheetId: "s-" + codice, kind: "sheet", versione: 3,
    sheet: {
      id: idScheda, code: codice, name: "", updatedAt: "2026-11-18T10:00:00.000Z",
      exercises: esercizi
    }
  };
}

/* --- finto Firestore: solo zona B, e registra ogni scrittura -------------- */
function fintoDb(iniziale) {
  const dati = { radice: null, sotto: {} };
  const partenza = iniziale || {};
  Object.keys(partenza).forEach((k) => { dati.sotto[k] = Object.assign({}, partenza[k]); });
  const scritture = [];
  const db = {
    collection(nome) {
      if (nome !== "bdB_atleti") throw new Error("letto fuori dalla zona B: " + nome);
      return {
        doc(uid) {
          return {
            async get() {
              return dati.radice == null ? { exists: false, data: () => null } : { exists: true, data: () => dati.radice };
            },
            async set(valore) { dati.radice = valore; },
            collection(sotto) {
              const mappa = dati.sotto[sotto] || (dati.sotto[sotto] = {});
              return {
                doc(id) {
                  return {
                    async get() {
                      const d = mappa[id];
                      return d == null ? { exists: false, data: () => null } : { exists: true, data: () => d };
                    },
                    async set(valore) {
                      await new Promise((r) => setTimeout(r, 2));
                      mappa[id] = valore;
                      scritture.push({ sotto: sotto, id: id, dati: valore });
                    }
                  };
                },
                async get() { return { docs: Object.keys(mappa).map((id) => ({ id: id, data: () => mappa[id] })) }; }
              };
            }
          };
        }
      };
    }
  };
  return { db: db, sotto: dati.sotto, scritture: scritture };
}

const meta = {
  id: "prg-119", name: "Blocco 119", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "E"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-18T10:00:00.000Z"
};
const ID_PROGRAMMA = "program-v2-meta-prg-119";
const ID_A = "doc-A";
const ID_E = "doc-E";

function banco() {
  const f = fintoDb({
    schede: {
      [ID_A]: schedaDati("sh-A", "A", [ESE("Lat machine", "ex-A1"), ESE("Rematore", "ex-A2"), ESE("Pulley", "ex-A3")]),
      [ID_E]: schedaDati("sh-E", "E", [ESE("Leg curl", "ex-E1"), ESE("Stacco", "ex-E2")])
    },
    registro: {},
    programmi: { [ID_PROGRAMMA]: { versione: 2, startDate: "2026-10-05", phase: "Bulk", name: "Blocco 119" } }
  });
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");

  const documenti = () => [
    { id: ID_A, dati: f.sotto.schede[ID_A] },
    { id: ID_E, dati: f.sotto.schede[ID_E] }
  ];
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: documenti(),
    orologio: (n) => new Date(Date.UTC(2026, 10, 19, 11, 0, n || 0)).toISOString()
  });

  const b = { f: f, dom: dom, doc: doc, contenitore: contenitore, editor: editor };
  b.disegna = function () {
    const docs = documenti();
    const p = f.sotto.programmi[ID_PROGRAMMA] || {};
    const r = riepilogoProgramma(Object.assign({}, meta, { startDate: p.startDate, phase: p.phase }), [], {
      schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1,
      oggi: new Date(Date.UTC(2026, 10, 19)), quante: 8
    });
    contenitore.innerHTML = "";
    renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, r);
  };
  b.testo = () => String(contenitore.textContent || "").replace(/\s+/g, " ");
  return b;
}

/* ---------- 1. la scheda si cerca dal tasto, non dalla prima tabella ------ */
test("119.1 + Riga prende la scheda dal tasto premuto, non dalla prima tabella della pagina", () => {
  const inizio = vista.indexOf("function apriSelettoreRigaB");
  const fine = vista.indexOf("function apriSelettoreSostituzioneB");
  assert.ok(inizio > 0 && fine > inizio, "apriSelettoreRigaB deve esistere");
  const corpo = vista.slice(inizio, fine);
  assert.ok(corpo.indexOf("idSchedaVicino(bottone)") !== -1,
    "la scheda deve venire da idSchedaVicino(bottone)");
  assert.ok(corpo.indexOf('doc.querySelector(".p8-tab[data-scheda]")') === -1,
    "non deve piu' prendere la prima tabella della pagina");
});

test("119.2 tutta la vista cerca la scheda in un posto solo: idSchedaVicino", () => {
  const quante = vista.split('querySelector(".p8-tab[data-scheda]")').length - 1;
  assert.equal(quante, 1, "deve restare una sola ricerca della tabella: dentro idSchedaVicino");
});

/* ---------- 2. dopo la scrittura la pagina rilegge ------------------------ */
test("119.3 la riga aggiunta e' fra i campi che fanno rileggere e ridisegnare", () => {
  assert.match(app, /richiesta\.campo === "aggiunta-riga"/,
    "senza questo nome la pagina scrive in B e resta a schermo il disegno vecchio");
});

test("119.4 le scritture delle tecniche fanno ridisegnare come le altre", () => {
  ["tecnica-parametri", "tecnica-settimana", "tecnica-nota"].forEach((c) => {
    assert.match(app, new RegExp('richiesta\\.campo === "' + c + '"'), "manca " + c + " nella lista del ridisegno");
  });
});

/* ---------- 3. la copia passa dal ponte, e il rifiuto parla giusto ------- */
test("119.5 l'involucro modifica inoltra copiaEsercizi: il tasto non dice piu' che l'editor manca", () => {
  assert.match(app, /copiaEsercizi: \(richiesta\) =>/,
    "senza questo inoltro mod.copiaEsercizi e' undefined e il tasto risponde 'nessun editor collegato'");
});

test("119.6 ogni rifiuto dice l'azione giusta, non sempre 'svuotare'", () => {
  assert.match(vista, /function senzaEditor\(doc, bottone, azione\)/, "senzaEditor deve accettare l'azione");
  assert.match(vista, /"Questi esercizi non si possono ancora copiare"/, "la copia deve avere il suo titolo");
  assert.match(vista, /"Questa riga non si puo' ancora aggiungere"/, "+ Riga deve avere il suo titolo");
  assert.match(vista, /aspetta che il programma sia caricato/, "il tasto spento deve dire cosa aspettare");
});

/* ---------- 4. pagina vera, editor vero: la riga arriva nel documento ----- */
test("119.7 + Riga scrive nella scheda giusta e la riga si vede nella tabella ridisegnata", async () => {
  const b = banco();
  b.disegna();
  assert.equal(b.f.sotto.schede[ID_A].sheet.exercises.length, 3, "la scheda A parte da 3 esercizi");
  assert.equal(b.f.sotto.schede[ID_E].sheet.exercises.length, 2, "la scheda E parte da 2 esercizi");
  const prima = b.testo();
  assert.ok(prima.indexOf("Curl manubri") === -1, "prima della scrittura la riga non c'e'");

  const esito = await b.editor.modifica({
    idScheda: "sh-A", campo: "aggiunta-riga", esercizio: "Curl manubri", muscolo: "bicipiti"
  });

  assert.equal(esito.ok, true, "la scrittura deve riuscire: " + (esito && esito.motivo));
  assert.equal(esito.voce.tipo, "aggiunta-riga");
  assert.equal(b.f.sotto.schede[ID_A].sheet.exercises.length, 4, "la scheda A deve avere la riga nuova");
  assert.equal(b.f.sotto.schede[ID_A].sheet.exercises[3].name, "Curl manubri");
  assert.equal(b.f.sotto.schede[ID_E].sheet.exercises.length, 2, "la scheda E non deve essere toccata");

  b.disegna();
  assert.ok(b.testo().indexOf("Curl manubri") !== -1, "dopo il ridisegno la riga nuova deve stare in tabella");
});
