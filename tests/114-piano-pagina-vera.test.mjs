/* tests/114-piano-pagina-vera.test.mjs — il difetto del 18/11/2026, in chiaro.
 *
 * Alice scriveva la settimana di scarico e la percentuale, usciva dal campo e
 * il valore spariva senza un messaggio. Il 113 era verde perche' usava un
 * editor finto: qui si carica desktop/index.html VERA, si disegna con
 * renderProgramma e si scrive con l'editor VERO (comune/editor-schede-b.js)
 * sopra una zona B finta in memoria che registra quello che riceve.
 *
 * Causa trovata: la scrittura andava a buon fine, ma la lettura dopo il
 * ridisegno indicizzava i piani con `sheetId` mentre la vista chiedeva la
 * scheda con `sheet.id` — due chiavi diverse per la stessa scheda. Il valore
 * era scritto e non si ritrovava: causa (c).
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
import { collegaPiano } from "../comune/piano-vivo.js";
import { leggiPiano, pianiDalleSchede, settimaneEsercizi } from "../comune/piano-scheda.js";
import { creaEditorSchede } from "../comune/editor-schede-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

/* --- la scheda come la scrive A: `sheetId` e `sheet.id` NON coincidono ---- */
let seq = 0;
const settimana = (n) => ({ week: n, sets: 4, reps: { label: "10-8" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const ESE = (nome) => ({
  id: "ex-114-" + (++seq), name: nome, muscle: "dorsali",
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: Array.from({ length: 8 }, (_, i) => settimana(i + 1)) }
});

function schedaDati() {
  seq = 0;
  return {
    programId: "prg-4a", sheetId: "s-A", kind: "sheet", versione: 3,
    sheet: {
      id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z",
      exercises: [ESE("Lat machine"), ESE("Rematore"), ESE("Pulley")]
    }
  };
}

/* --- il finto Firestore che conosce SOLO la zona B (come il test 55) ------ */
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
  id: "prg-4a", name: "Blocco 4a", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const ID_PROGRAMMA = "program-v2-meta-prg-4a";
const ID_DOC = "doc-A";

/* --- il banco: pagina vera, zona B finta, editor vero --------------------- */
function banco() {
  const f = fintoDb({
    schede: { [ID_DOC]: schedaDati() },
    registro: {},
    programmi: { [ID_PROGRAMMA]: { versione: 2, startDate: "2026-10-05", phase: "Bulk", name: "Blocco 4a" } }
  });
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");

  const messaggi = [];
  let disegni = 0;
  const documenti = () => [{ id: ID_DOC, dati: f.sotto.schede[ID_DOC] }];
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: documenti(),
    orologio: (n) => new Date(Date.UTC(2026, 10, 18, 14, 0, n || 0)).toISOString()
  });

  const b = { f: f, dom: dom, doc: doc, win: win, contenitore: contenitore, editor: editor, messaggi: messaggi };
  b.contaDisegni = () => disegni;

  b.disegna = function () {
    const docs = documenti();
    const p = f.sotto.programmi[ID_PROGRAMMA] || {};
    const r = riepilogoProgramma(Object.assign({}, meta, { startDate: p.startDate, phase: p.phase }), [], {
      schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1,
      oggi: new Date(Date.UTC(2026, 10, 18)), quante: 8
    });
    contenitore.innerHTML = "";
    renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, r);
    disegni += 1;
    collegaPiano(doc, {
      editor: editor,
      piani: pianiDalleSchede(docs),
      programma: { id: ID_PROGRAMMA, inizio: p.startDate || "", fase: p.phase || "" },
      segnala: (testo, tono) => messaggi.push({ testo: testo, tono: tono }),
      sincronizza: () => { b.disegna(); return Promise.resolve(); }
    });
  };

  b.campo = (chiave) => doc.querySelector('[data-pr-c="' + chiave + '"]');
  b.cambia = (chiave, valore) => {
    const el = b.campo(chiave);
    assert.ok(el, "manca il campo " + chiave);
    el.value = valore;
    el.dispatchEvent(new win.Event("change", { bubbles: true }));
    return el;
  };
  b.dati = () => f.sotto.schede[ID_DOC];
  b.disegna();
  return b;
}

const attendi = (ms) => new Promise((r) => setTimeout(r, ms || 40));

/* --------------------------------------------------------------- le prove */

test("114.1 la stessa scheda si trova con tutti i suoi id (la causa del valore che sparisce)", () => {
  const docs = [{ id: ID_DOC, dati: schedaDati() }];
  const piani = pianiDalleSchede(docs);
  assert.ok(piani["s-A"], "manca la chiave sheetId: la pagina quella la usa");
  assert.ok(piani["sh-A"], "manca la chiave sheet.id: e' quella che chiede la vista");
  assert.ok(piani[ID_DOC], "manca la chiave del documento");
  assert.equal(settimaneEsercizi(schedaDati().sheet.exercises), 8);
});

test("114.2 i campi sono tendine S1..SN e la percentuale porta il % e il suo tooltip", () => {
  const b = banco();
  const sett = b.campo("scarico-settimana");
  assert.equal(sett.tagName, "SELECT", "Scarico deve essere una tendina");
  const voci = Array.from(sett.querySelectorAll("option")).map((o) => o.textContent);
  assert.deepEqual(voci, ["\u2014", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"]);
  const tst = b.campo("test-settimana");
  assert.equal(tst.tagName, "SELECT", "Test deve essere una tendina");
  assert.equal(Array.from(tst.querySelectorAll("option")).length, 9);
  const etichettaScarico = sett.closest("label").querySelector(".pr-lab");
  assert.equal(etichettaScarico.getAttribute("title"), "settimana dello scarico");
  assert.equal(tst.closest("label").querySelector(".pr-lab").getAttribute("title"), "settimana del test");
  const vol = b.campo("scarico-volume");
  assert.equal(vol.getAttribute("title"), "di quanto togli il volume in quella settimana, es. 40");
  assert.ok(vol.closest("label").textContent.indexOf("%") !== -1, "manca il segno % accanto al campo");
});

test("114.3 S4 e 40 si scrivono davvero in zona B e restano dopo il ridisegno", async () => {
  const b = banco();
  b.cambia("scarico-volume", "40");
  b.cambia("scarico-settimana", "S4");
  await attendi();

  const salvato = b.dati().sheet.pianoScarico;
  assert.deepEqual(salvato, { settimana: 4, volume: 40 }, "in zona B non c'e' il piano: " + JSON.stringify(salvato));
  assert.deepEqual(b.dati().sheet.exercises.map((e) => e.progression.weeks[3].type), ["deload", "deload", "deload"], "la settimana 4 non e' segnata deload");

  /* il ridisegno e' gia' avvenuto (il campo non aveva il fuoco) */
  assert.equal(b.campo("scarico-settimana").value, "S4", "dopo il ridisegno la settimana non si vede");
  assert.equal(b.campo("scarico-volume").value, "40", "dopo il ridisegno la percentuale non si vede");
  assert.match(b.campo("scarico-chip").textContent, /S4 vol \u221240%/);
});

test("114.4 una scrittura rifiutata lascia un messaggio visibile e tiene il valore scritto", async () => {
  const b = banco();
  b.cambia("scarico-volume", "40");
  b.cambia("scarico-settimana", "S4");
  await attendi();
  /* il disco cambia sotto: la versione attesa non torna piu' */
  b.f.sotto.schede[ID_DOC].versione = 99;
  const campo = b.cambia("scarico-settimana", "S5");
  await attendi();
  const ultimo = b.messaggi[b.messaggi.length - 1];
  assert.equal(ultimo.tono, "errore");
  assert.match(ultimo.testo, /^Scarico non salvato: /);
  assert.match(ultimo.testo, /versione/);
  assert.equal(campo.value, "S5", "il campo ha perso quello che Alice aveva scelto");
  assert.equal(b.dati().sheet.pianoScarico.settimana, 4, "il disco non doveva cambiare");
});

test("114.5 dopo Annulla il campo mostra il valore salvato di prima", async () => {
  const b = banco();
  b.cambia("scarico-volume", "40");
  b.cambia("scarico-settimana", "S4");
  await attendi();
  const annulla = await b.editor.annulla();
  assert.equal(annulla.ok, true, annulla.motivo);
  assert.equal(b.dati().sheet.pianoScarico, undefined, "l'Annulla non ha tolto il piano");
  b.disegna();
  assert.equal(b.campo("scarico-settimana").value, "", "dopo Annulla la tendina deve dire \u00abnon registrato\u00bb");
  assert.equal(b.campo("scarico-volume").value, "");
  assert.equal(b.campo("scarico-chip").textContent.indexOf("non registrato") !== -1, true);
});

test("114.6 data di inizio e fase resistono al ridisegno, con l'editor vero", async () => {
  const b = banco();
  b.cambia("programma-inizio", "07/10/2026");
  await attendi();
  assert.equal(b.f.sotto.programmi[ID_PROGRAMMA].startDate, "2026-10-07", "la data non e' arrivata in zona B");
  assert.equal(b.campo("programma-inizio").value, "07/10/2026", "dopo il ridisegno la data e' sparita");

  b.cambia("programma-fase", "Cut");
  await attendi();
  assert.equal(b.f.sotto.programmi[ID_PROGRAMMA].phase, "Cut");
  assert.equal(b.campo("programma-fase").value, "Cut", "dopo il ridisegno la fase e' sparita");
});

test("114.7 il campo con il fuoco dentro non fa ridisegnare la pagina", async () => {
  const b = banco();
  const vol = b.campo("scarico-volume");
  const sett = b.campo("scarico-settimana");
  sett.value = "S4"; /* la settimana gia' scelta, senza uscire dal campo */
  vol.focus();
  const prima = b.contaDisegni();
  vol.value = "30";
  vol.dispatchEvent(new b.win.Event("change", { bubbles: true }));
  await attendi();
  assert.equal(b.dati().sheet.pianoScarico.volume, 30, "la scrittura non e' arrivata");
  assert.equal(b.contaDisegni(), prima, "la pagina si e' ridisegnata mentre Alice scriveva");
  assert.equal(b.campo("scarico-volume").value, "30", "il campo si e' svuotato sotto le dita");
  vol.blur();
  await attendi();
  assert.ok(b.contaDisegni() > prima, "uscendo dal campo il ridisegno deve arrivare");
  assert.equal(b.campo("scarico-volume").value, "30", "dopo il ridisegno la percentuale non si vede");
  assert.equal(b.campo("scarico-settimana").value, "S4");
});
