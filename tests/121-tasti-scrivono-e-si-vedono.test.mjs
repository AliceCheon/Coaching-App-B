/* tests/121-tasti-scrivono-e-si-vedono.test.mjs - il punto 4 che mancava.
 *
 * La 120 ha aperto la strada: clic VERO sulla PAGINA VIVA (desktop/index.html +
 * desktop/app-v31.js), e la pretesa e' quella che Alice ha messo come regola il
 * 19/11/2026: la scrittura deve VEDERSI nella tabella disegnata, non solo nel
 * documento.
 *
 * Qui si portano sul disegno gli otto tasti che restavano senza prova sul tratto
 * scrittura -> rilettura -> disegno:
 *   ✕ cancella riga, ⇄ sostituisci, anello superserie, ⊕ tecnica,
 *   Applica progressione a tutta la scheda, Salva come scheletro,
 *   Svuota scheda, ↺ ripristina scheda.
 *
 * Le prove di motore (55, 78, 81, 82, 102) restano come sono: il buco era il
 * pezzo in mezzo, la decisione di rileggere e ridisegnare che vive in
 * app-v31.js. Il banco e' lo stesso del test 63 (una seduta, latenze
 * [110, 40, 70]): senza `seduta` la tabella non si monta e la prova fallirebbe
 * per motivi sbagliati.
 *
 * La pagina e' una sola, quindi le prove si seguono in ordine: ✕ toglie una
 * riga, ↺ la rimette (e chiude il conto a tre), poi si lavora sulle tre righe.
 * La pagina vera contiene anche riquadri statici con le stesse classi: i
 * selettori qui sotto prendono il riquadro VIVO (quello che ha i segni
 * data-igiene / data-esito), mai la prima cosa che capita nel documento.
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
  id: "prg-viva", name: "Prova pagina viva", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const otto = () => Array.from({ length: 8 }, (_, i) => settimana(i + 1));
const ESE = (id, nome) => ({ id: id, name: nome, muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: otto() } });

const ID_SCHEDA_DOC = "program-v2-sheet-prg-viva__sh-A";
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 121" },
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
  registro: [],
  scheletri: []
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
/* Le righe degli esercizi. Le figlie delle tecniche hanno `p8-tec` e si contano a parte. */
const righe = () => Array.from(doc.querySelectorAll("#programma-attivo .p8-tab tbody tr.p8-r[data-js]"))
  .filter((tr) => !tr.classList.contains("p8-tec"));
const tecniche = () => Array.from(doc.querySelectorAll("#programma-attivo .p8-tab tbody tr.p8-tec"));
const nomiInTabella = () => righe().map((tr) => {
  const s = tr.querySelector("span.p8-t");
  return String((s && s.textContent) || tr.textContent || "").replace(/\s+/g, " ").trim();
});
const schedaDisco = () => zona.datiDi("schede", ID_SCHEDA_DOC);
const viveSulDisco = () => schedaDisco().sheet.exercises.filter((e) => e && !e.deletedAt && !String(e.padreId || ""));
const figlieSulDisco = () => schedaDisco().sheet.exercises.filter((e) => e && !e.deletedAt && String(e.padreId || ""));
const testo = () => String(doc.querySelector("#programma-attivo").textContent || "").replace(/\s+/g, " ");

function tasto(etichetta) {
  return Array.from(doc.querySelectorAll("#programma-attivo button"))
    .filter((b) => String(b.textContent || "").trim() === etichetta)[0] || null;
}
function bottoneIn(contenitore, etichetta) {
  return Array.from(contenitore.querySelectorAll("button"))
    .filter((b) => String(b.textContent || "").trim() === etichetta)[0] || null;
}
function cella(tr, classe) {
  return Array.from(tr.querySelectorAll("td." + classe + " span")).map((s) => String(s.textContent || "").trim());
}
/* Il riquadro VIVO delle progressioni: la pagina vera ne ha anche di statici,
 * senza voci. Quello che conta e' quello con i tasti dentro. */
function pannelloProgressioni() {
  return Array.from(doc.querySelectorAll(".prog-panel"))
    .filter((p) => p.querySelectorAll("button.prog-item").length > 0)[0] || null;
}
/* La riga d'esito VIVA della barra: quella che app-v31 ha scritto adesso. */
function esitiVivi() {
  return Array.from(doc.querySelectorAll("#programma-attivo .pr-esito"))
    .filter((r) => r.hasAttribute("data-esito"));
}

/* Porta la pagina a tre righe disegnate e coda vuota: condizione di partenza
 * delle prove che non sono la prima. */
async function treRighe(cosa) {
  await attendi(() => tabella(), 20000, "la tabella non si e' mai montata");
  await attendi(() => righe().length === 3 && viveSulDisco().length === 3, 12000, cosa || "la scheda non e' tornata a tre righe");
  await codaSvuota();
}

test("la pagina viva si monta e disegna le tre righe della scheda A", async () => {
  await attendi(() => tabella(), 20000, "la tabella non si e' mai montata");
  await codaSvuota();
  assert.equal(righe().length, 3, "la scheda A deve partire con 3 esercizi disegnati: " + righe().length);
  assert.deepEqual(cella(righe()[0], "c-ser"), ["4", "4", "4", "4", "4", "4", "4", "4"], "le serie disegnate devono essere quelle del disco");
  assert.deepEqual(cella(righe()[0], "c-reps"), ["10", "10", "10", "10", "10", "10", "10", "10"], "le ripetizioni disegnate devono essere quelle del disco");
});

test("121.1 \u2715: la riga tolta sparisce DAVVERO dalla tabella disegnata", async () => {
  await treRighe();
  const bt = bottoneIn(righe()[0], "\u2715");
  assert.ok(bt, "la X della riga non c'e' nella pagina viva");
  assert.equal(bt.disabled, false, "la X e' spenta: " + (bt.title || ""));

  bt.click();
  await attendi(() => viveSulDisco().length === 2, 10000, "la riga non e' stata tolta sul disco");
  await attendi(() => righe().length === 2, 12000, "la riga e' tolta sul disco ma NON dalla tabella disegnata (difetto di \u2715)");

  assert.equal(righe().length, 2, "la tabella deve avere una riga in meno");
  assert.equal(nomiInTabella().some((t) => t.indexOf("Trazioni assistite") !== -1), false,
    "l'esercizio tolto si vede ancora in tabella: " + nomiInTabella().join(" | "));
  await codaSvuota();
});

test("121.2 \u21ba ripristina: la scheda torna com'era e la tabella ridisegna le tre righe", async () => {
  await attendi(() => tabella(), 20000, "la tabella non si e' mai montata");
  await codaSvuota();

  const bt = tasto("\u21ba ripristina scheda");
  assert.ok(bt, "il tasto ripristina non c'e' nella pagina viva");
  assert.equal(bt.disabled, false, "ripristina e' spento: " + (bt.title || ""));

  bt.click();
  const box = doc.querySelector("#programma-attivo .pr-conf");
  assert.ok(box, "il riquadro di ripristina non si e' aperto nella pagina");
  assert.ok(String(box.textContent || "").indexOf("Ripristina la scheda") !== -1, "manca il titolo del ripristino");

  const conferma = box.querySelector('[data-igiene="ripristina"]');
  assert.ok(conferma, "manca il tasto Ripristina nel riquadro");
  conferma.click();

  await attendi(() => viveSulDisco().length === 3, 12000, "il ripristino non ha rimesso la riga sul disco");
  await attendi(() => righe().length === 3, 12000, "la riga e' tornata sul disco ma NON nella tabella disegnata (difetto di ripristina)");
  assert.ok(nomiInTabella().some((t) => t.indexOf("Trazioni assistite") !== -1), "Trazioni assistite non e' tornata in tabella");
  await codaSvuota();
});

test("121.3 \u21c4: l'esercizio sostituito si legge nella tabella disegnata", async () => {
  await treRighe();
  const bt = bottoneIn(righe()[0], "\u21c4");
  assert.ok(bt, "il tasto \u21c4 non c'e' nella riga");
  assert.equal(bt.disabled, false, "\u21c4 e' spento: " + (bt.title || ""));

  bt.click();
  await attendi(() => doc.querySelector(".bdsel-velo .bdsel-it[data-n='Curl manubri']"), 8000, "il selettore della sostituzione non si e' aperto");
  doc.querySelector(".bdsel-velo .bdsel-it[data-n='Curl manubri']").click();

  await attendi(() => {
    const e = viveSulDisco()[0];
    return e && String(e.name || "").indexOf("Curl manubri") !== -1;
  }, 10000, "la sostituzione non e' arrivata sul disco");
  await attendi(() => nomiInTabella()[0] === "Curl manubri", 12000,
    "il disco dice Curl manubri ma la tabella disegnata dice: " + nomiInTabella()[0]);

  assert.equal(nomiInTabella().length, 3, "la sostituzione non deve cambiare il numero di righe");
  assert.equal(nomiInTabella().some((t) => t.indexOf("Trazioni assistite") !== -1), false, "il nome vecchio resta in tabella");
  await codaSvuota();
});

test("121.4 anello: la superserie si vede nella tabella disegnata", async () => {
  await treRighe();
  const bt = righe()[0].querySelector("button.ab.ab-sup");
  assert.ok(bt, "l'anello delle superserie non c'e' nella prima riga");
  assert.equal(bt.disabled, false, "l'anello e' spento: " + (bt.title || ""));

  bt.click();
  await attendi(() => String((viveSulDisco()[0] || {}).sup || "") !== "", 10000, "la superserie non e' arrivata sul disco");
  await attendi(() => righe()[0].classList.contains("z-gruppo") && righe()[1].classList.contains("z-gruppo"), 12000,
    "il legame e' sul disco ma la tabella disegnata non mostra il gruppo (difetto dell'anello)");

  assert.equal(righe()[0].getAttribute("data-sup"), righe()[1].getAttribute("data-sup"), "le due righe devono portare lo stesso legame");
  assert.ok(String(righe()[0].getAttribute("data-sup") || "") !== "", "le righe del gruppo devono portare il legame nel disegno");
  await codaSvuota();
});

test("121.5 tecnica: la riga \u21b3 compare nella tabella disegnata", async () => {
  await treRighe();
  const primaFiglie = figlieSulDisco().length;
  const bt = righe()[0].querySelector("button.chplus");
  assert.ok(bt, "il tasto \u2295 delle tecniche non c'e' nella prima riga");
  assert.equal(bt.disabled, false, "il \u2295 e' spento: " + (bt.title || ""));

  bt.click();
  await attendi(() => doc.querySelector(".tec-panel-b[data-tecnica-panel]"), 8000, "il pannello delle tecniche non si e' aperto");
  const voce = doc.querySelector(".tec-panel-b .tec-voce");
  assert.ok(voce, "il pannello delle tecniche non ha nessuna voce");
  const idTecnica = String(voce.textContent || "").replace(/^\u2713\s*/, "").trim();
  assert.ok(idTecnica, "la voce della tecnica non ha un nome");

  voce.click();
  await attendi(() => figlieSulDisco().length === primaFiglie + 1, 10000, "la tecnica non e' arrivata sul disco");
  await attendi(() => tecniche().length >= 1, 12000, "la tecnica e' sul disco ma la riga \u21b3 NON e' nella tabella disegnata (difetto del \u2295)");

  const badge = tecniche()[0].querySelector(".tec-badge");
  assert.ok(badge, "la riga della tecnica non porta il suo badge");
  const badgeTesto = String(badge.textContent || "").trim().toLowerCase();
  const atteso = idTecnica.replace(/-/g, " ").toLowerCase();
  assert.ok(badgeTesto.indexOf(atteso) !== -1, "la tecnica disegnata non e' quella scelta: " + badgeTesto + " invece di " + atteso);
  assert.equal(String(figlieSulDisco()[0].tecnica || ""), idTecnica, "sul disco la tecnica non e' quella scelta: " + figlieSulDisco()[0].tecnica);
  await codaSvuota();
});

test("121.6 Applica progressione a tutta la scheda: la tabella disegnata mostra le settimane nuove", async () => {
  await treRighe();
  const primaSerie = cella(righe()[0], "c-ser").join("|");
  const primaReps = cella(righe()[0], "c-reps").join("|");

  const bt = tasto("Applica progressione a tutta la scheda");
  assert.ok(bt, "il tasto \u00abApplica progressione a tutta la scheda\u00bb non c'e'");
  assert.equal(bt.disabled, false, "il tasto e' spento: " + (bt.title || ""));

  bt.click();
  await attendi(() => pannelloProgressioni(), 8000, "il pannello delle progressioni non si e' aperto (o e' vuoto)");
  const voci = Array.from(pannelloProgressioni().querySelectorAll("button.prog-item"));
  const scelta = voci.filter((b) => String(b.textContent || "").indexOf("Forza neurale") !== -1)[0] || null;
  assert.ok(scelta, "il pannello non ha la voce \u00abForza neurale\u00bb su cui e' tarata la prova");
  scelta.click();

  await attendi(() => cella(righe()[0], "c-ser").join("|") !== primaSerie || cella(righe()[0], "c-reps").join("|") !== primaReps,
    12000, "le settimane sono cambiate, ma la tabella disegnata mostra ancora quelle di prima (difetto della progressione)");

  /* «Forza neurale» e' la PRIMA voce di PRG (comune/progressioni-b.js) e porta
   * la sua tabella esplicita di otto coppie: la tabella disegnata deve
   * mostrarle tutte, non solo la prima settimana. */
  assert.deepEqual(cella(righe()[0], "c-ser"), ["4", "4", "5", "5", "5", "4", "3", "3"],
    "le serie disegnate non sono quelle della progressione: " + cella(righe()[0], "c-ser").join("|"));
  assert.deepEqual(cella(righe()[0], "c-reps"), ["3", "3", "3", "3", "2", "3", "3", "2"],
    "le ripetizioni disegnate non sono quelle della progressione: " + cella(righe()[0], "c-reps").join("|"));
  await codaSvuota();
});

test("121.7 Salva come scheletro: lo scheletro finisce in B e la pagina dice salvato", async () => {
  await treRighe();
  const bt = tasto("Salva come scheletro");
  assert.ok(bt, "il tasto \u00abSalva come scheletro\u00bb non c'e'");
  assert.equal(bt.disabled, false, "il tasto e' spento: " + (bt.title || ""));

  bt.click();
  const box = doc.querySelector("#programma-attivo .pr-conf");
  assert.ok(box, "il riquadro dello scheletro non si e' aperto");
  assert.ok(String(box.textContent || "").indexOf("Salva come scheletro") !== -1, "manca il titolo del riquadro");
  const campoNome = box.querySelector("input.pr-conf-in");
  assert.ok(campoNome, "manca il campo del nome dello scheletro");
  campoNome.value = "Scheletro prova 121";

  const conferma = box.querySelector('[data-igiene="salva-scheletro"]');
  assert.ok(conferma, "manca il tasto Salva nel riquadro");
  conferma.click();

  await attendi(() => zona.elencoDi("scheletri").length === 1, 12000, "lo scheletro non e' finito nella raccolta scheletri di B");
  await attendi(() => esitiVivi().length > 0, 12000, "la pagina non ha scritto nessuna riga d'esito (difetto del salvataggio)");

  const esito = esitiVivi()[esitiVivi().length - 1];
  assert.equal(esito.getAttribute("data-esito"), "salvato",
    "lo scheletro e' sul disco ma la pagina dice: " + esito.textContent);
  const salvato = zona.elencoDi("scheletri")[0].dati;
  assert.equal(String(salvato.nome || "").trim(), "Scheletro prova 121", "lo scheletro salvato non porta il nome scelto");
  assert.ok(Array.isArray(salvato.esercizi) && salvato.esercizi.length === 3, "lo scheletro deve portare le tre righe della scheda");
  assert.equal(righe().length, 3, "salvare lo scheletro non deve toccare la scheda");
  await codaSvuota();
});

test("121.8 Svuota scheda: la tabella disegnata resta senza righe", async () => {
  await treRighe();
  const bt = tasto("Svuota scheda");
  assert.ok(bt, "il tasto \u00abSvuota scheda\u00bb non c'e'");
  assert.equal(bt.disabled, false, "Svuota e' spento: " + (bt.title || ""));

  bt.click();
  const box = doc.querySelector("#programma-attivo .pr-conf");
  assert.ok(box, "il riquadro di Svuota non si e' aperto");
  assert.ok(String(box.textContent || "").indexOf("Svuota la scheda") !== -1, "manca il titolo di Svuota");
  const conferma = box.querySelector('[data-igiene="svuota"]');
  assert.ok(conferma, "manca il tasto Svuota nel riquadro");
  conferma.click();

  await attendi(() => viveSulDisco().length === 0, 12000, "la scheda non e' stata svuotata sul disco");
  await attendi(() => righe().length === 0, 12000, "la scheda e' vuota sul disco ma la tabella disegnata mostra ancora righe (difetto di Svuota)");
  assert.equal(tecniche().length, 0, "dopo Svuota non devono restare righe tecniche disegnate");
  await codaSvuota();
});
