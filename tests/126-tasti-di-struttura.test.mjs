/* tests/126-tasti-di-struttura.test.mjs - i tasti che cambiano la struttura.
 *
 * Regola 19/11/2026: ogni tasto di struttura si clicca davvero sulla PAGINA
 * VIVA (desktop/index.html + desktop/app-v31.js), il dato cambia nel finto di
 * B e la riga si vede nel DOM. Niente scorciatoie: si passa dalle stesse porte
 * che apre il dito (il selettore del Database, il pannello delle tecniche, il
 * pannello delle progressioni, le finestre di conferma).
 *
 * La guardia in fondo NON tiene una lista sua: legge CAMPI_CHE_RIDISEGNANO da
 * comune/ridisegno-b.js (la stessa che sorveglia la prova 123). Se un verbo
 * non ha una prova col suo nome qui dentro, il test rosso lo nomina.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";
import { CAMPI_CHE_RIDISEGNANO, chiedeRilettura } from "../comune/ridisegno-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const META = {
  id: "prg-viva", name: "Prova pagina viva", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
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
    sheet: {
      id: "sh-" + codice, code: codice, name: nome, updatedAt: "2026-11-02T18:12:00.000Z",
      exercises: esercizi
    }
  }
});
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 126" },
  programmi: [{ id: "program-v2-meta-prg-viva", dati: { programMeta: META } }],
  schede: [
    schedaDoc(ID_A, "A", "Dorsali", [ESE("ex-1", "Trazioni assistite"), ESE("ex-2", "Lat machine"), ESE("ex-3", "Rematore bilanciere")]),
    schedaDoc(ID_B, "B", "Petto", [ESE("ex-9", "Panca piana")])
  ],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const consoleFinita = new VirtualConsole();
consoleFinita.on("jsdomError", () => {});
const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: consoleFinita });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 8 });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
globalThis.window = dom.window;
globalThis.document = doc;
await import("../desktop/app-v31.js");

const tab = () => doc.querySelectorAll("#programma-attivo .p8-tab")[0] || null;
const righe = () => Array.from(tab().querySelectorAll("tbody tr.p8-r[data-js]")).filter((tr) => !tr.classList.contains("p8-tec"));
const tecRighe = () => Array.from(tab().querySelectorAll("tbody tr.p8-tec"));
const schedaA = () => zona.datiDi("schede", ID_A);
const schedaB = () => zona.datiDi("schede", ID_B);
const viveA = () => (schedaA().sheet.exercises || []).filter((e) => e && !e.deletedAt && !String(e.padreId || ""));
const tecA = () => (schedaA().sheet.exercises || []).filter((e) => e && !e.deletedAt && String(e.padreId || "") !== "");
const barra = () => doc.querySelector(".pr-bar");
const bottone = (testo) => Array.from(doc.querySelectorAll("#programma-attivo button")).find((b) => String(b.textContent || "").trim() === testo) || null;

async function coda(tetto) {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 400;
  }, tetto || 20000, "la coda delle scritture non si e' mai svuotata");
}
async function pronta() {
  await attendiFinche(() => tab(), 20000, "la tabella non si e' mai montata");
  await attendiFinche(() => righe().length >= 3, 15000, "la scheda A non e' a tre righe");
  await coda();
}
function scrivi(span, testo) {
  span.dispatchEvent(new dom.window.Event("focus"));
  span.textContent = testo;
  span.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  span.dispatchEvent(new dom.window.Event("blur"));
}
const attendiPanel = (sel, cosa) => attendiFinche(() => doc.querySelector(sel), 12000, cosa);

test("126.1 superserie: l'anello collega la riga e la riga resta nel DOM", async () => {
  await pronta();
  const nodo = righe()[0];
  const anello = nodo.querySelector("button.ab-sup");
  assert.ok(anello && !anello.disabled, "l'anello delle superserie della prima riga non e' vivo");
  const prima = righe().length;
  anello.click();
  await attendiFinche(() => { const e = viveA()[0]; return e && String(e.sup || "") !== ""; }, 15000,
    "la superserie non e' arrivata nel finto: la prima riga non ha nessun sup");
  assert.equal(righe().length, prima, "il numero di righe e' cambiato dopo la superserie");
  assert.equal(righe()[0].isConnected, true, "la riga e' uscita dal documento dopo la superserie");
  await coda();
});

test("126.2 sostituzione-riga: il frecciaquadrata apre il Database e cambia il nome", async () => {
  await pronta();
  const nodo = righe()[0];
  const frecce = Array.from(nodo.querySelectorAll(".abgroup button.ab")).filter((b) => !b.classList.contains("ab-sup"));
  const freccia = frecce[1];
  assert.ok(freccia, "il tasto sostituisci della prima riga non c'e'");
  freccia.click();
  await attendiPanel(".bdsel-velo:not([hidden])", "il selettore del Database non si e' aperto");
  const voce = doc.querySelectorAll(".bdsel-velo .bdsel-it")[0];
  assert.ok(voce, "il Database non ha nessuna voce da scegliere");
  const nomeScelto = voce.getAttribute("data-n");
  voce.click();
  await attendiFinche(() => String((viveA()[0] || {}).name || "") === String(nomeScelto || ""), 15000,
    "il nome nuovo non e' arrivato nel finto: la riga tiene ancora " + (viveA()[0] || {}).name);
  assert.equal(righe().length, 3, "la sostituzione ha cambiato il numero di righe");
  await attendiFinche(() => String(righe()[0].textContent || "").indexOf(String(nomeScelto || "")) !== -1, 15000,
    "l'esercizio scelto non si vede nella prima riga, che mostra: " + String(righe()[0].textContent || "").slice(0, 60));
  await coda();
});

test("126.3 aggiunta-riga: + Riga apre il Database, scrive nel finto e disegna la quarta riga", async () => {
  await pronta();
  const piu = bottone("+ Riga");
  assert.ok(piu && !piu.disabled, "il tasto + Riga non e' vivo");
  piu.click();
  await attendiPanel(".bdsel-velo:not([hidden])", "il selettore del Database non si e' aperto da + Riga");
  const voce = doc.querySelectorAll(".bdsel-velo .bdsel-it")[0];
  assert.ok(voce, "il Database non ha nessuna voce da aggiungere");
  voce.click();
  await attendiFinche(() => viveA().length === 4, 15000, "la quarta riga non e' arrivata nel finto: sono " + viveA().length);
  await attendiFinche(() => righe().length === 4, 15000, "la quarta riga non si vede nel DOM: ne vedo " + righe().length);
  await coda();
});

test("126.4 aggiunta-tecnica: il cerchio piu apre il pannello e la tecnica arriva nel finto", async () => {
  await pronta();
  const piu = righe()[0].querySelector(".chplus");
  assert.ok(piu && !piu.disabled, "il cerchio delle tecniche della prima riga non e' vivo");
  piu.click();
  await attendiPanel(".tec-panel-b", "il pannello delle tecniche non si e' aperto");
  const voce = doc.querySelector(".tec-panel-b .tec-voce");
  assert.ok(voce, "il pannello delle tecniche non ha nessuna tecnica da scegliere");
  voce.click();
  await attendiFinche(() => tecA().length === 1, 15000, "la tecnica non e' arrivata nel finto: ne conto " + tecA().length);
  await attendiFinche(() => tecRighe().length >= 1, 15000, "la riga della tecnica non si vede nel DOM");
  await coda();
});

test("126.5 tecnica-cambia: dal pannello della tecnica esistente si cambia tipo", async () => {
  await pronta();
  assert.equal(tecA().length, 1, "prima di questa prova la tecnica non c'e': la 126.4 non ha scritto");
  const prima = String((tecA()[0] || {}).tecnica || "");
  righe()[0].querySelector(".chplus").click();
  await attendiPanel(".tec-panel-b", "il pannello delle tecniche non si e' aperto sulla riga con la tecnica");
  const voci = Array.from(doc.querySelectorAll(".tec-panel-b .tec-voce")).filter((b) => String(b.textContent || "").indexOf("\u2713") === -1);
  assert.ok(voci.length, "il pannello non offre nessun'altra tecnica da scegliere");
  voci[0].click();
  await attendiFinche(() => String((tecA()[0] || {}).tecnica || "") !== prima, 15000,
    "la tecnica non e' cambiata nel finto: e' ancora " + String((tecA()[0] || {}).tecnica || ""));
  await coda();
});

test("126.6 tecnica-parametri: i campi del pannello scrivono i parametri nel finto", async () => {
  await pronta();
  righe()[0].querySelector(".chplus").click();
  await attendiPanel(".tec-panel-b", "il pannello delle tecniche non si e' aperto");
  const scatola = doc.querySelector(".tec-panel-b .tec-parametri");
  assert.ok(scatola, "il pannello non mostra i parametri della tecnica");
  const campo = scatola.querySelector("input.tec-in");
  assert.ok(campo, "i parametri non hanno nessun campo da scrivere");
  campo.value = "2";
  const salva = Array.from(scatola.querySelectorAll("button")).find((b) => String(b.textContent || "").trim() === "Salva parametri");
  assert.ok(salva, "il tasto Salva parametri non c'e'");
  salva.click();
  await attendiFinche(() => {
    const t = tecA()[0] || {};
    return t.parametri && typeof t.parametri === "object" && Object.keys(t.parametri).length > 0;
  }, 15000, "i parametri non sono arrivati nel finto: la tecnica non ne ha nessuno");
  await coda();
});

test("126.7 tecnica-nota: la nota scritta a mano arriva in nota.manuale (comune/modifiche-b.js:1461)", async () => {
  await pronta();
  righe()[0].querySelector(".chplus").click();
  await attendiPanel(".tec-panel-b", "il pannello delle tecniche non si e aperto");
  const casella = doc.querySelector(".tec-panel-b textarea.tec-nota");
  assert.ok(casella, "il pannello non ha la casella della nota");
  casella.value = "nota di prova 126";
  const salva = Array.from(doc.querySelectorAll(".tec-panel-b button")).find((b) => String(b.textContent || "").trim() === "Salva nota");
  assert.ok(salva, "il tasto Salva nota non c e");
  salva.click();
  await attendiFinche(() => String(((tecA()[0] || {}).nota || {}).manuale || "") === "nota di prova 126", 12000,
    "la nota non e arrivata dove la scrive modifiche-b.js:1461, cioe nota.manuale: " + JSON.stringify((tecA()[0] || {}).nota || null));
  await attendiFinche(() => righe().length >= 3, 12000, "dopo la nota la tabella non mostra piu le tre righe");
  await coda(6000);
});

test("126.8 tecnica-settimana: la cella serie della tecnica scrive riga.settimane[0].serie (comune/modifiche-b.js:1457)", async () => {
  await pronta();
  await attendiFinche(() => tecRighe().length >= 1, 6000, "la riga della tecnica non e nel DOM: righe tecniche " + tecRighe().length);
  const span = tecRighe()[0].querySelector('span[contenteditable][data-campo="tecnica-settimana"]');
  assert.ok(span, "la riga della tecnica non ha la cella del campo tecnica-settimana");
  scrivi(span, "3");
  await attendiFinche(() => {
    const t = tecA()[0] || {};
    const w = Array.isArray(t.settimane) ? t.settimane[0] : null;
    return !!w && Number(w.serie) === 3;
  }, 12000, "la serie della tecnica non e arrivata dove la scrive modifiche-b.js:1457 (riga.settimane[0].serie): " + JSON.stringify((tecA()[0] || {}).settimane || null));
  await attendiFinche(() => tecRighe().length >= 1 && String(tecRighe()[0].textContent || "").indexOf("3") !== -1, 12000,
    "la serie 3 non si legge piu nella riga della tecnica: " + String((tecRighe()[0] || {}).textContent || "").slice(0, 80));
  await coda(6000);
});

test("126.9 progressione: Applica progressione sulla riga cambia le otto settimane", async () => {
  await pronta();
  const tasto = righe()[0].querySelector('button[data-b-progressione="true"]');
  assert.ok(tasto, "il tasto della progressione di riga non c'e'");
  /* La settimana si legge come [sets, reps] (comune/modifiche-b.js:455): dentro
     progression.weeks non esistono "serie". E la voce che si clicca cambia le
     RIPETIZIONI (comune/progressioni-b.js:38, "Doppia progressione" = +1 rip
     fino al tetto), non le serie: si guarda il campo che cambia davvero. */
  const otto = (a) => (Array.isArray(a) ? a : []).map((w) => String(w && w.reps));
  const primaOtto = otto(((viveA()[0] || {}).progression || {}).weeks);
  assert.equal(primaOtto.length, 8, "la riga di partenza non ha otto settimane");
  if (typeof tasto.__bdApriProgressioni === "function") tasto.__bdApriProgressioni(); else tasto.click();
  await attendiPanel(".prog-panel", "il pannello delle progressioni non si e' aperto");
  const voci = Array.from(doc.querySelectorAll(".prog-panel .prog-item"));
  assert.ok(voci.length, "il pannello non offre nessuna progressione");
  /* La prima voce e' "Carico lineare": parla del carico e la scrittura la
     rifiuta apposta (comune/modifiche-b.js:567-571). Serve una che tocchi le celle. */
  const voce = voci.find((b) => String(b.textContent || "").indexOf("Doppia progressione") !== -1);
  assert.ok(voce, "il pannello non offre la Doppia progressione");
  voce.click();
  await attendiFinche(() => {
    const ora = otto(((viveA()[0] || {}).progression || {}).weeks);
    return ora.length === 8 && ora.join("|") !== primaOtto.join("|");
  }, 15000, "la progressione non ha cambiato le otto settimane nel finto: prima " + primaOtto.join("|") + " dopo " + otto(((viveA()[0] || {}).progression || {}).weeks).join("|"));
  /* le otto colonne disegnate devono dire lo stesso dei dati: si guardano tutte */
  const ora = ((viveA()[0] || {}).progression || {}).weeks || [];
  assert.equal(ora.length, 8, "dopo la progressione le settimane non sono otto: " + ora.length);
  await attendiFinche(() => {
    const nodo = righe()[0];
    if (!nodo) return false;
    const celle = Array.from(nodo.querySelectorAll("td.c-reps span[contenteditable]")).slice(0, 8);
    if (celle.length < 8) return false;
    return celle.every((s, k) => String(s.textContent || "").trim() === String(ora[k] && ora[k].reps));
  }, 12000, "le otto colonne non mostrano le ripetizioni nuove: " + Array.from((righe()[0] || { querySelectorAll: () => [] }).querySelectorAll("td.c-reps span[contenteditable]")).slice(0, 8).map((s) => String(s.textContent || "").trim()).join("|"));
  await coda();
});

test("126.10 progressione-scheda: Applica progressione a tutta la scheda cambia tutte le righe", async () => {
  await pronta();
  const tasto = bottone("Applica progressione a tutta la scheda");
  assert.ok(tasto, "il tasto della progressione di scheda non c'e'");
  const prime = viveA().map((e) => JSON.stringify(e.progression || {}));
  tasto.click();
  await attendiPanel(".prog-panel", "il pannello delle progressioni non si e' aperto dalla scheda");
  const voce = doc.querySelector(".prog-panel .prog-item");
  assert.ok(voce, "il pannello non offre nessuna progressione");
  voce.click();
  await attendiFinche(() => {
    const ora = viveA().map((e) => JSON.stringify(e.progression || {}));
    return ora.length === prime.length && ora.some((x, i) => x !== prime[i]);
  }, 15000, "la progressione di scheda non ha cambiato nessuna riga nel finto");
  await coda();
});

test("126.11 rimozione-tecnica: il tasto del pannello toglie la tecnica dal finto", async () => {
  await pronta();
  righe()[0].querySelector(".chplus").click();
  await attendiPanel(".tec-panel-b", "il pannello delle tecniche non si e' aperto");
  const via = doc.querySelector(".tec-panel-b .tec-via");
  assert.ok(via, "il pannello non ha il tasto per rimuovere la tecnica");
  via.click();
  await attendiFinche(() => tecA().length === 0, 15000, "la tecnica e' ancora nel finto: ne conto " + tecA().length);
  await attendiFinche(() => tecRighe().length === 0, 12000, "la riga della tecnica si vede ancora nel DOM");
  await coda();
});

test("126.12 riga: la crocetta toglie la riga dal finto e dal DOM", async () => {
  await pronta();
  const nodo = righe()[0];
  const croce = nodo.querySelector(".abgroup button.ab");
  assert.ok(croce && !croce.disabled, "la crocetta della prima riga non e' viva");
  croce.click();
  await attendiFinche(() => viveA().length === 3, 15000, "la riga non e' uscita dal finto: ne conto " + viveA().length);
  await attendiFinche(() => righe().length === 3, 15000, "la riga non e' uscita dal DOM: ne vedo " + righe().length);
  assert.equal(nodo.isConnected, false, "la riga cancellata e' ancora attaccata al documento");
  await coda();
});

test("126.13 svuota-scheda: la conferma svuota la scheda nel finto e nel DOM", async () => {
  await pronta();
  const tasto = bottone("Svuota scheda");
  assert.ok(tasto, "il tasto Svuota scheda non c'e'");
  tasto.click();
  await attendiPanel('[data-igiene="svuota"]', "la finestra di conferma dello svuotamento non si e' aperta");
  doc.querySelector('[data-igiene="svuota"]').click();
  await attendiFinche(() => viveA().length === 0, 15000, "la scheda non si e' svuotata nel finto: ha ancora " + viveA().length + " righe");
  await attendiFinche(() => righe().length === 0, 15000, "la scheda svuotata mostra ancora righe");
  await coda();
});

test("126.14 ripristina-scheda: il ripristino rimette la scheda com'era all'apertura", async () => {
  const tasto = bottone("\u21ba ripristina scheda");
  assert.ok(tasto, "il tasto ripristina non c'e'");
  tasto.click();
  await attendiPanel('[data-igiene="ripristina"]', "la finestra di conferma del ripristino non si e' aperta");
  doc.querySelector('[data-igiene="ripristina"]').click();
  await attendiFinche(() => viveA().length === 3, 20000, "il ripristino non ha rimesso le tre righe nel finto: ne conto " + viveA().length);
  await attendiFinche(() => righe().length === 3, 20000, "il ripristino non ha ridisegnato le tre righe");
  await coda();
});

test("126.15 copia-esercizi: Copia/Sposta porta la riga nell'altra scheda", async () => {
  await pronta();
  const primaB = (schedaB().sheet.exercises || []).length;
  const tasto = bottone("Copia/Sposta esercizi");
  assert.ok(tasto, "il tasto Copia/Sposta esercizi non c'e'");
  tasto.click();
  await attendiPanel('[data-copia-box="1"]', "la finestra di copia non si e' aperta");
  const spunta = doc.querySelector('[data-copia-box="1"] [data-copia-es]');
  assert.ok(spunta, "la finestra di copia non elenca nessun esercizio");
  spunta.checked = true;
  doc.querySelector('[data-copia-avanti="1"]').click();
  await attendiPanel('[data-copia-conferma="1"]', "la conferma della copia non si e' aperta");
  doc.querySelector('[data-copia-conferma="1"]').click();
  await attendiFinche(() => (schedaB().sheet.exercises || []).length > primaB, 20000,
    "la copia non ha aggiunto nessuna riga alla scheda B del finto");
  await coda();
});

test("126.16 scheletro: Salva come scheletro chiede il nome e scrive lo scheletro", async () => {
  await pronta();
  const tasto = bottone("Salva come scheletro");
  assert.ok(tasto, "il tasto Salva come scheletro non c'e'");
  tasto.click();
  await attendiPanel(".pr-conf", "la finestra dello scheletro non si e' aperta");
  const nome = doc.querySelector(".pr-conf input");
  assert.ok(nome, "la finestra dello scheletro non chiede il nome");
  nome.value = "Scheletro prova 126";
  const conferma = doc.querySelector('.pr-conf button[data-igiene="salva-scheletro"]');
  assert.ok(conferma, "la finestra dello scheletro non ha il tasto di conferma");
  conferma.click();
  await attendiFinche(() => zona.registri.scritture.some((s) => String(s.percorso || "").indexOf("scheletri") !== -1), 20000,
    "lo scheletro non e' stato scritto nel finto");
  await coda();
});

test("126.17 guardia: ogni verbo di chiedeRilettura ha una prova col suo nome in questa tabella", () => {
  const fonte = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const senza = CAMPI_CHE_RIDISEGNANO.filter((v) => fonte.indexOf(" " + v + ":") === -1);
  assert.deepEqual(senza, [], "questi verbi non hanno nessuna prova col loro nome: " + senza.join(", "));
});

test("126.18 il verbo applica-scarico-tutte: ridisegna la tabella come gli altri", () => {
  assert.equal(CAMPI_CHE_RIDISEGNANO.indexOf("applica-scarico-tutte") !== -1, true, "il verbo nuovo non e' nella lista che ridisegna");
  assert.equal(chiedeRilettura({ campo: "applica-scarico-tutte" }), true, "chiedeRilettura non riconosce applica-scarico-tutte");
  assert.equal(chiedeRilettura({ campo: "applica-scarico-tutte", idScheda: "sh-A" }), true, "chiedeRilettura perde il verbo quando c'e' la scheda");
});

test("126.19 il verbo applica-scheletro: ridisegna la tabella come gli altri", () => {
  assert.equal(CAMPI_CHE_RIDISEGNANO.indexOf("applica-scheletro") !== -1, true, "applica-scheletro non e' nella lista che ridisegna");
  assert.equal(chiedeRilettura({ campo: "applica-scheletro" }), true, "chiedeRilettura non riconosce applica-scheletro");
});

test("126.20 il verbo elimina-scheletro: anche la raccolta si ridisegna", () => {
  assert.equal(CAMPI_CHE_RIDISEGNANO.indexOf("elimina-scheletro") !== -1, true, "elimina-scheletro non e' nella lista che ridisegna");
  assert.equal(chiedeRilettura({ campo: "elimina-scheletro" }), true, "chiedeRilettura non riconosce elimina-scheletro");
});
