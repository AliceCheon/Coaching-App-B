/* tests/116-copia-esercizi.test.mjs — PASSO 4b, commit 1: la copia.
 *
 * Alice copia uno o piu' esercizi da una scheda all'altra, dentro il
 * programma attivo. Qui si carica la pagina VERA, si disegna con
 * renderProgramma, si apre il riquadro dal tasto «Copia/Sposta esercizi» e si
 * scrive con l'editor VERO (comune/editor-schede-b.js) sopra una zona B finta
 * in memoria che registra tutto quello che riceve.
 *
 * Le regole che il motore deve tenere da solo:
 *  - id nuovi, settimane identiche, originale intatto;
 *  - la riga tecnica figlia segue il padre e punta al SUO id nuovo;
 *  - la superserie si copia intera con un legame nuovo, o parziale senza legame;
 *  - il doppione avvisa e non scrive, poi «Sostituisci» o «Aggiungi ugualmente»;
 *  - un solo Annulla rimette tutti i lati toccati.
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
import { pianiDalleSchede } from "../comune/piano-scheda.js";
import { creaEditorSchede } from "../comune/editor-schede-b.js";
import { copiaEsercizi } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

let seq = 0;
const settimana = (n) => ({ week: n, sets: 4, reps: { label: "10-8" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const ESE = (nome, extra) => Object.assign({
  id: "ex-4b-" + (++seq),
  name: nome,
  muscle: "dorsali",
  prescription: { sets: 4, reps: { min: 0, max: 0, sequence: [], label: "" }, rest: { seconds: 120 } },
  progression: { weeks: Array.from({ length: 8 }, (_, i) => settimana(i + 1)) }
}, extra || {});

/* La scheda A: Lat machine con la sua riga tecnica, Rematore e Pulley in
 * superserie. La scheda E: due esercizi suoi, uno dei quali condividera' il
 * nome di un esercizio di A quando serve il doppione. */
function schedeDiPartenza() {
  seq = 0;
  const lat = ESE("Lat machine", { id: "ex-A-lat" });
  const figlia = { id: "ex-A-lat-tec", tipo: "tecnica", padreId: "ex-A-lat", tecnica: "rest-pause", parametri: { reps: 3 }, settimane: [], nota: "" };
  const rem = ESE("Rematore", { id: "ex-A-rem", sup: "ss-vecchio" });
  const pul = ESE("Pulley", { id: "ex-A-pul", sup: "ss-vecchio" });
  return [lat, figlia, rem, pul];
}

function schedaDoc(codice, esercizi) {
  return {
    programId: "prg-4b", sheetId: "s-" + codice, kind: "sheet", versione: 2,
    sheet: { id: "sh-" + codice, code: codice, name: "", updatedAt: "2026-11-10T10:00:00.000Z", exercises: esercizi }
  };
}

/* --- il finto Firestore: solo zona B, e sa guastarsi su una scheda ---------- */
function fintoDb(iniziale) {
  const dati = { radice: null, sotto: {} };
  const partenza = iniziale || {};
  Object.keys(partenza).forEach((k) => { dati.sotto[k] = Object.assign({}, partenza[k]); });
  const scritture = [];
  const guasti = { doc: "", volte: 0 };
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
                      if (guasti.doc && guasti.volte > 0 && id === guasti.doc) {
                        guasti.volte -= 1;
                        throw new Error("rete giu' su " + id);
                      }
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
  return { db: db, sotto: dati.sotto, scritture: scritture, guasta: (id, volte) => { guasti.doc = id; guasti.volte = volte == null ? 1 : volte; } };
}

const meta = {
  id: "prg-4b", name: "Blocco 4b", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "E"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-10T10:00:00.000Z"
};
const ID_PROGRAMMA = "program-v2-meta-prg-4b";
const ID_A = "doc-A";
const ID_E = "doc-E";

function banco(eserciziE) {
  const f = fintoDb({
    schede: {
      [ID_A]: schedaDoc("A", schedeDiPartenza()),
      [ID_E]: schedaDoc("E", eserciziE || [ESE("Leg press", { id: "ex-E-1" })])
    },
    registro: {},
    programmi: { [ID_PROGRAMMA]: { versione: 1, startDate: "2026-10-05", phase: "Bulk", name: "Blocco 4b" } }
  });
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");

  const documenti = () => [
    { id: ID_A, dati: f.sotto.schede[ID_A] },
    { id: ID_E, dati: f.sotto.schede[ID_E] }
  ];
  const editor = creaEditorSchede({
    db: f.db, uid: "u1", documenti: documenti(),
    orologio: (n) => new Date(Date.UTC(2026, 10, 18, 17, 0, n || 0)).toISOString()
  });

  const b = { f: f, dom: dom, doc: doc, win: win, contenitore: contenitore, editor: editor };

  b.disegna = function () {
    const docs = documenti();
    const p = f.sotto.programmi[ID_PROGRAMMA] || {};
    const r = riepilogoProgramma(Object.assign({}, meta, { startDate: p.startDate, phase: p.phase }), [], {
      schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 1,
      oggi: new Date(Date.UTC(2026, 10, 18)), quante: 8
    });
    r.modifica = editor;
    contenitore.innerHTML = "";
    renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0, modifica: editor }, r);
    collegaPiano(doc, {
      editor: editor,
      piani: pianiDalleSchede(docs),
      programma: { id: ID_PROGRAMMA, inizio: p.startDate || "", fase: p.phase || "" },
      segnala: () => {},
      sincronizza: () => { b.disegna(); return Promise.resolve(); }
    });
  };

  b.tasto = () => doc.querySelector('[data-pr-scheda="sh-A"] [data-copia="1"]') || doc.querySelector('[data-copia="1"]');
  b.box = () => doc.querySelector("[data-copia-box]");
  b.esito = () => {
    const e = doc.querySelector(".pr-esito");
    return e ? e.textContent : "";
  };
  b.spunta = (id) => {
    const c = doc.querySelector('input[data-copia-es="' + id + '"]');
    assert.ok(c, "manca la spunta di " + id);
    c.checked = true;
  };
  b.avanti = () => {
    const b2 = doc.querySelector("[data-copia-avanti]");
    assert.ok(b2, "manca il tasto Avanti");
    b2.click();
  };
  b.conferma = () => {
    const b2 = doc.querySelector("[data-copia-conferma]");
    assert.ok(b2, "manca il tasto Conferma");
    b2.click();
  };
  b.domanda = () => {
    const d = doc.querySelector(".pr-conf-domanda");
    return d ? d.textContent : "";
  };
  b.eserciziA = () => f.sotto.schede[ID_A].sheet.exercises;
  b.eserciziE = () => f.sotto.schede[ID_E].sheet.exercises;
  b.viviE = () => b.eserciziE().filter((e) => !e.deletedAt && !e.padreId && e.tipo !== "tecnica");
  b.disegna();
  return b;
}

const attendi = (ms) => new Promise((r) => setTimeout(r, ms || 60));

/* ------------------------------------------------------------------ le prove */

test("116.1 il tasto apre il riquadro dentro la pagina, con la sua scheda e le spunte", () => {
  const b = banco();
  const tasto = b.tasto();
  assert.ok(tasto, "manca il tasto Copia/Sposta esercizi");
  assert.equal(tasto.disabled, false, "il tasto deve essere vivo");
  assert.equal(tasto.querySelector(".pr-demo"), null, "la pillola DEMO deve sparire");
  tasto.click();
  const box = b.box();
  assert.ok(box, "il riquadro non si apre");
  assert.ok(box.textContent.indexOf("Dalla Scheda A") !== -1, "il riquadro non dice da dove parte");
  const dest = b.doc.querySelector('[data-pr-c="copia-destinazione"]');
  assert.ok(dest, "manca il menu della destinazione");
  assert.deepEqual(Array.from(dest.querySelectorAll("option")).map((o) => o.value), ["sh-E"], "la destinazione deve offrire solo le altre schede");
  const spunte = Array.from(b.doc.querySelectorAll("input[data-copia-es]")).map((i) => i.value);
  assert.deepEqual(spunte, ["ex-A-lat", "ex-A-rem", "ex-A-pul"], "le spunte sono gli esercizi vivi della partenza: le tecniche no");
});

test("116.2 la conferma dice i numeri esatti, techniche comprese", () => {
  const b = banco();
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.spunta("ex-A-rem");
  b.avanti();
  assert.equal(b.domanda(), "Copi 2 esercizi e 1 riga tecnica dalla Scheda A alla Scheda E?");
});

test("116.3 la copia scrive nella destinazione: id nuovi, settimane identiche, originale intatto", async () => {
  const b = banco();
  const primaA = JSON.parse(JSON.stringify(b.eserciziA()));
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.spunta("ex-A-rem");
  b.avanti();
  b.conferma();
  await attendi();

  const e = b.eserciziE();
  assert.equal(e.length, 1 + 3, "la destinazione deve avere 3 righe in piu' (2 esercizi e 1 tecnica)");
  const nuove = e.filter((x) => !x.padreId && x.tipo !== "tecnica" && String(x.name || "").indexOf("Lat") !== -1 || String(x.name || "") === "Rematore");
  assert.ok(nuove.length >= 2, "mancano le copie in fondo alla scheda E");
  const lat = e.filter((x) => String(x.name || "") === "Lat machine")[0];
  const rem = e.filter((x) => String(x.name || "") === "Rematore")[0];
  assert.ok(lat && rem, "le copie non hanno il nome giusto");
  assert.notEqual(lat.id, "ex-A-lat", "l'id della copia deve essere nuovo");
  assert.notEqual(rem.id, "ex-A-rem", "l'id della copia deve essere nuovo");
  assert.deepEqual(lat.progression.weeks, primaA[0].progression.weeks, "le 8 settimane devono essere identiche");
  assert.deepEqual(rem.progression.weeks, primaA[2].progression.weeks, "le 8 settimane devono essere identiche");
  assert.deepEqual(b.eserciziA(), primaA, "la scheda di partenza non deve cambiare con la copia");
  assert.equal(b.esito().indexOf("2 esercizi e 1 riga tecnica copiati nella Scheda E"), 0, b.esito());
});

test("116.4 la riga tecnica segue il padre e punta al SUO id nuovo", async () => {
  const b = banco();
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.avanti();
  b.conferma();
  await attendi();
  const lat = b.eserciziE().filter((x) => String(x.name || "") === "Lat machine")[0];
  const figlia = b.eserciziE().filter((x) => x.padreId)[0];
  assert.ok(lat && figlia, "manca la copia della tecnica");
  assert.equal(figlia.padreId, lat.id, "la figlia deve puntare al padre NUOVO");
  assert.notEqual(figlia.padreId, "ex-A-lat", "la figlia non deve puntare al padre vecchio");
  assert.notEqual(figlia.id, "ex-A-lat-tec", "anche la figlia vuole un id nuovo");
});

test("116.5 superserie intera con legame nuovo, parziale senza legame", async () => {
  const b = banco();
  b.tasto().click();
  b.spunta("ex-A-rem");
  b.spunta("ex-A-pul");
  b.avanti();
  b.conferma();
  await attendi();
  const rem = b.eserciziE().filter((x) => String(x.name || "") === "Rematore")[0];
  const pul = b.eserciziE().filter((x) => String(x.name || "") === "Pulley")[0];
  assert.ok(rem.sup && pul.sup, "la superserie non e' stata copiata come gruppo");
  assert.equal(rem.sup, pul.sup, "i due membri devono portare lo stesso legame");
  assert.notEqual(rem.sup, "ss-vecchio", "il legame della copia deve essere nuovo");

  const c = banco();
  c.tasto().click();
  c.spunta("ex-A-rem");
  c.avanti();
  c.conferma();
  await attendi();
  const solo = c.eserciziE().filter((x) => String(x.name || "") === "Rematore")[0];
  assert.equal(solo.sup, undefined, "una superserie tagliata arriva senza legame");
  assert.ok(c.esito().indexOf("senza legame") !== -1, "il messaggio deve dirlo: " + c.esito());
});

test("116.6 il doppione avvisa senza scrivere, poi «Aggiungi ugualmente»", async () => {
  const b = banco([ESE("Pulley", { id: "ex-E-pul" })]);
  const primaE = JSON.parse(JSON.stringify(b.eserciziE()));
  b.tasto().click();
  b.spunta("ex-A-pul");
  b.avanti();
  b.conferma();
  await attendi();

  const box = b.box();
  assert.ok(box && box.getAttribute("data-doppioni") === "1", "il riquadro dei doppioni non si apre");
  assert.ok(box.textContent.indexOf("Pulley") !== -1, "il riquadro non dice quale nome e' doppio");
  assert.deepEqual(b.eserciziE(), primaE, "senza scelta non si scrive niente");

  b.doc.querySelector('[data-copia-scelta="aggiungi"]').click();
  await attendi();
  const pul = b.eserciziE().filter((x) => String(x.name || "") === "Pulley");
  assert.equal(pul.length, 2, "aggiungi ugualmente deve lasciare due Pulley");
  assert.equal(pul.filter((x) => !x.deletedAt).length, 2, "nessuno dei due deve essere tolto");
});

test("116.7 il doppione con «Sostituisci»: l'esistente esce, la copia prende il posto", async () => {
  const b = banco([ESE("Pulley", { id: "ex-E-pul" })]);
  b.tasto().click();
  b.spunta("ex-A-pul");
  b.avanti();
  b.conferma();
  await attendi();
  b.doc.querySelector('[data-copia-scelta="sostituisci"]').click();
  await attendi();
  const pul = b.eserciziE().filter((x) => String(x.name || "") === "Pulley");
  assert.equal(pul.length, 2, "la riga sostituita resta nel documento, ma tolta");
  assert.equal(pul.filter((x) => !x.deletedAt).length, 1, "deve restare una sola riga viva");
  assert.ok(pul[0].deletedAt, "l'esistente deve portare deletedAt");
  assert.equal(pul[1].deletedAt, undefined, "la copia deve essere viva");
});

test("116.8 un solo Annulla rimette la destinazione com'era", async () => {
  const b = banco();
  const primaE = JSON.parse(JSON.stringify(b.eserciziE()));
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.spunta("ex-A-rem");
  b.avanti();
  b.conferma();
  await attendi();
  assert.ok(b.eserciziE().length > primaE.length, "la copia non e' avvenuta");

  const esito = await b.editor.annulla();
  assert.equal(esito.ok, true, "l'annulla non e' passato: " + JSON.stringify(esito));
  assert.deepEqual(b.eserciziE(), primaE, "l'annulla non ha rimesso la destinazione com'era");
  assert.equal(esito.testo, "esercizi rimessi com'erano");
});

test("116.9 la stessa scheda come destinazione non e' ammessa", async () => {
  const b = banco();
  const esito = await b.editor.copiaEsercizi({ idSchedaPartenza: "s-A", idSchedaDestinazione: "s-A", idEsercizi: ["ex-A-lat"] });
  assert.equal(esito.ok, false);
  assert.ok(esito.motivo.indexOf("sono la stessa") !== -1, esito.motivo);
  const motore = copiaEsercizi(b.f.sotto.schede[ID_A], b.f.sotto.schede[ID_A], { idEsercizi: ["ex-A-lat"] }, {});
  assert.equal(motore.ok, false);
});

test("116.10 il Logbook non si tocca: si scrive solo nelle schede e nel registro", async () => {
  const b = banco();
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.avanti();
  b.conferma();
  await attendi();
  const fuori = b.f.scritture.filter((s) => s.sotto !== "schede" && s.sotto !== "registro");
  assert.deepEqual(fuori, [], "nessuna scrittura fuori da schede e registro");
  assert.deepEqual(Object.keys(b.f.sotto).sort(), ["programmi", "registro", "schede"]);
});

test("116.11 sposta: se la seconda scrittura fallisce la copia resta e la pagina lo dice", async () => {
  const b = banco();
  b.f.guasta(ID_A, 1);
  const esito = await b.editor.copiaEsercizi({
    idSchedaPartenza: "s-A", idSchedaDestinazione: "s-E",
    idEsercizi: ["ex-A-lat"], modo: "sposta", codiceDestinazione: "E"
  });
  assert.equal(esito.ok, false);
  assert.equal(esito.motivo, "esercizi copiati ma non tolti dalla scheda di partenza");
  const lat = b.eserciziE().filter((x) => String(x.name || "") === "Lat machine");
  assert.equal(lat.length, 1, "la copia deve restare nella destinazione");
  assert.ok(b.eserciziA().some((x) => String(x.name || "") === "Lat machine"), "la partenza non deve aver perso la riga");
});


/* ---------------------------------------------------- PASSO 4b commit 2: sposta */

test("116.12 il riquadro ha la scelta Copia / Sposta e la domanda cambia verbo", () => {
  const b = banco();
  b.tasto().click();
  const modi = Array.from(b.doc.querySelectorAll("input[data-copia-modo]")).map((r) => r.value);
  assert.deepEqual(modi, ["copia", "sposta"], "manca la scelta del modo");
  b.spunta("ex-A-lat");
  b.avanti();
  assert.equal(b.domanda(), "Copi 1 esercizio e 1 riga tecnica dalla Scheda A alla Scheda E?");
  chiudiTutto(b);

  const c = banco();
  c.tasto().click();
  c.spunta("ex-A-lat");
  const radio = c.doc.querySelector('input[data-copia-modo="sposta"]');
  assert.ok(radio, "manca il radio dello sposta");
  radio.checked = true;
  c.avanti();
  assert.equal(c.domanda(), "Sposti 1 esercizio e 1 riga tecnica dalla Scheda A alla Scheda E?");
});

function chiudiTutto(b) {
  const box = b.box();
  if (box && box.parentNode) box.parentNode.removeChild(box);
}

test("116.13 sposta: le righe escono dalla partenza e arrivano in fondo alla destinazione", async () => {
  const b = banco();
  const primaA = b.eserciziA().filter((e) => !e.padreId).map((e) => String(e.name || ""));
  assert.deepEqual(primaA, ["Lat machine", "Rematore", "Pulley"]);

  b.tasto().click();
  b.spunta("ex-A-rem");
  b.doc.querySelector('input[data-copia-modo="sposta"]').checked = true;
  b.avanti();
  b.conferma();
  await attendi();

  const viviA = b.eserciziA().filter((e) => !e.deletedAt && !e.padreId).map((e) => String(e.name || ""));
  assert.deepEqual(viviA, ["Lat machine", "Pulley"], "la partenza deve perdere l'esercizio spostato");
  const viviE = b.viviE().map((e) => String(e.name || ""));
  assert.deepEqual(viviE, ["Leg press", "Rematore"], "la destinazione deve riceverlo in fondo");
  assert.equal(b.esito().indexOf("1 esercizio spostato nella Scheda E"), 0, b.esito());
});

test("116.14 sposta con la superserie che resta sola: il membro rimasto perde il legame", async () => {
  const b = banco();
  b.tasto().click();
  b.spunta("ex-A-pul");
  b.doc.querySelector('input[data-copia-modo="sposta"]').checked = true;
  b.avanti();
  b.conferma();
  await attendi();

  const rem = b.eserciziA().filter((e) => String(e.name || "") === "Rematore")[0];
  assert.ok(rem, "il Rematore deve restare nella partenza");
  assert.equal(rem.sup, undefined, "un gruppo rimasto con un membro solo non e' piu' un gruppo");
  const pul = b.viviE().filter((e) => String(e.name || "") === "Pulley")[0];
  assert.equal(pul.sup, undefined, "la riga spostata arriva senza il vecchio legame");
});

test("116.15 uno sposta si annulla su tutte e due le schede con un Annulla solo", async () => {
  const b = banco();
  const primaA = JSON.parse(JSON.stringify(b.eserciziA()));
  const primaE = JSON.parse(JSON.stringify(b.eserciziE()));
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.doc.querySelector('input[data-copia-modo="sposta"]').checked = true;
  b.avanti();
  b.conferma();
  await attendi();
  assert.ok(b.viviE().some((e) => String(e.name || "") === "Lat machine"), "lo sposta non e' avvenuto");

  const esito = await b.editor.annulla();
  assert.equal(esito.ok, true, "l'annulla non e' passato: " + JSON.stringify(esito));
  assert.deepEqual(b.eserciziA(), primaA, "l'annulla non ha rimesso la partenza com'era");
  assert.deepEqual(b.eserciziE(), primaE, "l'annulla non ha rimesso la destinazione com'era");
  assert.equal(esito.testo, "esercizi rimessi com'erano");
});

test("116.16 il registro prende UNA voce sola per lo sposta, che porta le due schede", async () => {
  const b = banco();
  b.tasto().click();
  b.spunta("ex-A-lat");
  b.doc.querySelector('input[data-copia-modo="sposta"]').checked = true;
  b.avanti();
  b.conferma();
  await attendi();
  const voci = Object.keys(b.f.sotto.registro || {}).map((k) => b.f.sotto.registro[k]);
  const sposta = voci.filter((v) => v && v.tipo === "sposta-esercizi");
  assert.equal(sposta.length, 1, "lo sposta deve lasciare una voce sola, non una per scheda");
  assert.equal(sposta[0].prima.documenti.length, 2, "la voce deve portare le due fotografie: destinazione e partenza");
  assert.equal(sposta[0].modo, "sposta");
});
