/* Guardia 174 (passo 23) — il primo giro di controllo, voce per voce.
 *
 * Le voci che si potevano correggere senza decidere niente di nuovo:
 *
 *  174.1 il nastro conta gli esercizi del programma letto (e senza programma
 *        lo dice), non il costruttore d'esempio del v31
 *  174.2 Impostazioni: build vera da app-config-b.js, schede ed esercizi
 *        contati dai dati; nessun «4» e nessun «179» scritti a mano
 *  174.3 Database esercizi: le voci del catalogo del selettore (546),
 *        nessun doppione da codifica (176 righe scritte + 370 in #db-aggiunte)
 *  174.4 la settimana del blocco è la stessa nei tre punti (Dashboard,
 *        Overview, Pianificazione) e, se manca il dato, lo stesso motivo
 *  174.5 Archivio: Sedute e Ultima contano il logbook dell'Overview
 *  174.6 Misure: BMI dice QUALE dato manca, «SESSIONI» è plicometria,
 *        e Importa/Copia scrivono l'esito dove si guarda
 *  174.7 il nome nei cinque punti viene dall'account e dall'anagrafica:
 *        senza cognome nel profilo si legge solo il nome
 *  174.8 la nota del logbook è una frase per l'utente, non un verbale
 *
 * La prova generale carica la pagina vera con il finto Firestore, come la 168.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";

import { testoNastro } from "../comune/nastro-b.js";
import { mostraVersione } from "../comune/impostazioni-b.js";
import { CATALOGO_ESERCIZI_B, conteggioCatalogoB } from "../comune/catalogo-esercizi-b.js";
import { elencoArchivio } from "../comune/vista-archivio.js";
import { nomeAtleta, mostraNomeAtleta } from "../comune/anagrafica-b.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import "../comune/settimana-blocco.js";
import "../comune/overview-vivo-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const SET = globalThis.BDSettimana;
const OV = globalThis.BDOverviewB;

/* ------------------------------------------------------------------ 174.1 */

test("174.1 il nastro conta il programma letto, e senza programma lo dice", () => {
  assert.equal(testoNastro({ programmaPresente: true, esercizi: 6, ultima: "26/10/2026" }), "6 esercizi · ultima seduta 26/10/2026");
  assert.equal(testoNastro({ programmaPresente: true, esercizi: 1, ultima: "26/10/2026" }), "1 esercizio · ultima seduta 26/10/2026");
  assert.equal(testoNastro({ programmaPresente: false, esercizi: 35, ultima: "26/10/2026" }), "nessun programma letto · ultima seduta 26/10/2026");
  assert.equal(testoNastro({ programmaPresente: true, esercizi: null, ultima: "" }), "esercizi non registrati");
  /* La pagina usa questa funzione: il «35» non si calcola più da `lav`. */
  const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.match(app, /aggiornaNastroEsercizi\(doc, rp, lb\.sedute/);
  assert.match(app, /import \{ testoNastro \}/);
});

/* ------------------------------------------------------------------ 174.2 */

test("174.2 Impostazioni non ha più numeri scritti a mano: build vera, schede e esercizi dai dati", () => {
  const dom = new JSDOM(HTML, { url: "http://localhost/desktop/index.html" });
  const doc = dom.window.document;
  doc.getElementById("st-ver").textContent = "";
  doc.getElementById("st-schede").textContent = "non registrato";
  doc.getElementById("st-esercizi").textContent = "non registrato";

  const esito = mostraVersione(doc, { build: "b0.67-prova", schede: 1, esercizi: conteggioCatalogoB() });
  assert.equal(esito.build, "b0.67-prova");
  assert.equal(doc.getElementById("st-ver").textContent, "b0.67-prova");
  assert.equal(doc.getElementById("st-schede").textContent, "1");
  assert.equal(doc.getElementById("st-esercizi").textContent, String(conteggioCatalogoB()));

  /* Senza dati la riga dichiara, non inventa. */
  mostraVersione(doc, { build: "", schede: null, esercizi: null });
  assert.equal(doc.getElementById("st-ver").textContent, "non registrata");
  assert.equal(doc.getElementById("st-schede").textContent, "non registrato");
  assert.equal(doc.getElementById("st-esercizi").textContent, "non registrato");

  /* La carta «Versione» non porta più i due numeri fissi. */
  const carta = doc.getElementById("st-ver").closest(".st-card");
  assert.ok(carta, "la carta Versione c'è");
  assert.equal(/<b>4<\/b>/.test(carta.innerHTML), false, "resta il «4» scritto a mano");
  assert.equal(/<b>179<\/b>/.test(carta.innerHTML), false, "resta il «179» scritto a mano");
  /* E la build mostrata è quella di B, non la costante del v31. */
  assert.match(HTML, /var b=window\.BD_B&&window\.BD_B\.build/);
});

/* ------------------------------------------------------------------ 174.3 */

test("174.3 il Database esercizi usa il catalogo: 546 voci, nessun doppione, le stesse del selettore", () => {
  const dom = new JSDOM(HTML, { url: "http://localhost/desktop/index.html" });
  const doc = dom.window.document;
  /* Le voci del v31 e del passo 20 sono righe scritte nella tabella; le 370
   * arrivate dal backup di A (passo 32) stanno in #db-aggiunte e la pagina le
   * mette in tabella alla prima apertura: qui si leggono tutte e due. */
  const scritte = [...doc.querySelectorAll("#db-body tr.riga")];
  assert.equal(scritte.length, 176, "la tabella deve avere le 176 voci scritte");
  const blocco = doc.getElementById("db-aggiunte");
  assert.ok(blocco, "manca il blocco #db-aggiunte con le voci di A");
  const extra = [...new JSDOM("<table><tbody>" + blocco.textContent + "</tbody></table>").window.document.querySelectorAll("tr.riga")];
  assert.equal(extra.length, 370, "il blocco #db-aggiunte deve portare le 370 voci di A");
  const righe = scritte.concat(extra);
  assert.equal(righe.length, 546, "la tabella deve avere le 546 voci del catalogo");
  assert.equal(conteggioCatalogoB(), 546);

  const normalizza = (n) => String(n == null ? "" : n).replace(/Â°/g, "°").replace(/\s+/g, " ").trim().toLowerCase();
  const nomiPagina = righe.map((r) => {
    const td = r.querySelector("td.nm");
    return normalizza(td && td.firstChild ? td.firstChild.textContent : "");
  });
  const nomiCatalogo = CATALOGO_ESERCIZI_B.map((v) => normalizza(v.n));
  assert.deepEqual([...nomiPagina].sort(), [...nomiCatalogo].sort(), "la pagina e il catalogo non hanno le stesse voci");
  assert.equal(new Set(nomiPagina).size, nomiPagina.length, "la pagina ha ancora doppioni");
  const tbody = HTML.slice(HTML.indexOf('<tbody id="db-body">'), HTML.indexOf("</tbody>", HTML.indexOf('<tbody id="db-body">')));
  assert.equal(tbody.includes("Â°"), false, "resta un nome rovinato dalla codifica");
  assert.equal(blocco.textContent.includes("Â°"), false, "resta un nome rovinato nel blocco di A");

  const testa = doc.querySelector("#pag-database-esercizi .db-testa h2");
  assert.match(testa.textContent, /546 esercizi/);
  assert.match(doc.querySelector('#pag-database-esercizi .db-tabs button[data-t="db"]').textContent, /546/);
  const sezione = HTML.slice(HTML.indexOf('id="pag-database-esercizi"'), HTML.indexOf('id="pag-progressioni"'));
  assert.equal(sezione.includes("179"), false, "dentro la pagina resta un «179»");
});

/* ------------------------------------------------------------------ 174.4 */

test("174.4 la settimana del blocco è una sola e le tre pagine dicono la stessa cosa", () => {
  const oggi = new Date();
  const r = SET.settimanaDelBlocco({ programmaPresente: true, inizio: "2026-10-05", durata: 8, oggi });
  const giorno = (oggi - new Date(2026, 9, 5)) / 86400000;
  assert.equal(r.numero, Math.floor(giorno / 7) + 1, "il conto è dalla data d'inizio, non dal «1»");
  assert.equal(r.etichetta, "settimana " + r.numero + " di 8");

  /* Overview: il carico usa la stessa funzione e dà lo stesso numero. */
  const serieOtto = [1, 2, 3, 4, 5, 6, 7, 8].map((s) => [3, 3, 3, 3, 3, 3, 3, 3]);
  const carico = OV.carico({ letto: true, serie: serieOtto, inizio: "05/10/2026", oggi });
  assert.equal(carico.stato, "calcolata");
  assert.equal(carico.settimana, r.numero, "Overview e Dashboard devono dire lo stesso numero");

  /* Le tre chiamate nella pagina vera. */
  const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.match(app, /settimanaBlocco = settimanaCorrente\(rp, attivo/);
  assert.match(app, /aggiornaTestataDashboard\(doc, rp, settimanaBlocco, attivo\)/);
  assert.match(app, /settimanaEtichetta: settimanaBlocco\.etichetta/);
  assert.match(HTML, /window\.BDSettimana\.settimanaDelBlocco\(\{ programmaPresente: PV\.letto/);
  assert.match(HTML, /SETT\.etichettaMaiuscola/);

  /* Senza data d'inizio la frase è la stessa, col motivo. */
  const senza = SET.settimanaDelBlocco({ programmaPresente: true, inizio: "", durata: 8, oggi });
  assert.equal(senza.numero, null);
  assert.equal(senza.etichetta, "settimana non registrata: manca la data d'inizio del programma");
  assert.equal(OV.settimanaInCorso("", oggi, 8).motivo, "manca la data d'inizio del programma");
  const noProg = SET.settimanaDelBlocco({ programmaPresente: false, oggi });
  assert.equal(noProg.etichetta, "settimana non registrata: nessun programma letto");
});

/* ------------------------------------------------------------------ 174.5 */

test("174.5 Archivio: Sedute e Ultima contano lo stesso logbook dell'Overview", () => {
  const programmi = [{ id: "prg-174", name: "Programma 174", status: "active", startDate: "2026-10-05", durationWeeks: 8 }];
  const sedute = [{ d: "26/10/2026", pn: "Programma 174", sc: "A" }, { d: "02/11/2026", pn: "Programma 174", sc: "A" }];
  const righe = elencoArchivio(programmi, { attivoId: "prg-174", sedute });
  assert.equal(righe[0].sedute, 2);
  assert.equal(righe[0].ultima, "02/11/2026");

  /* Le sedute che il logbook non attribuisce non entrano nel conto. */
  const miste = elencoArchivio(programmi, { attivoId: "prg-174", sedute: [{ d: "26/10/2026", pn: "", sc: "A" }] });
  assert.equal(miste[0].sedute, 0);
  assert.equal(miste[0].ultima, null);

  /* Senza logbook letto: «non registrato», non uno zero finto. */
  const senza = elencoArchivio(programmi, { attivoId: "prg-174" });
  assert.equal(senza[0].sedute, null);
  assert.equal(senza[0].ultima, null);

  const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.match(app, /elencoArchivio\(programmi\.programmi \|\| \[\], \{ attivoId:[^}]*sedute: lb\.sedute/);
});

/* ------------------------------------------------------------------ 174.6 */

/* Il blocco <script> della pagina Misure, isolato: così la prova non deve far
 * girare tutti gli script del v31 (che hanno bisogno dell'SDK). */
function scriptMisure() {
  const inizio = HTML.indexOf('var KEY="bd.misure.v1"');
  assert.ok(inizio > 0, "lo script delle Misure non si trova");
  const apre = HTML.lastIndexOf("<script>", inizio);
  const chiude = HTML.indexOf("</script>", inizio);
  return HTML.slice(apre + "<script>".length, chiude);
}

test("174.6 Misure: il BMI dice quale dato manca, le sessioni sono di plicometria, l'esito si vede dove si guarda", () => {
  const dom = new JSDOM(HTML, { runScripts: "outside-only", url: "http://localhost/desktop/index.html", virtualConsole: new VirtualConsole() });
  const w = dom.window;
  const doc = w.document;
  /* Una sessione già salvata sul computer: deve tornare all'apertura. */
  w.localStorage.setItem("bd.misure.v1", JSON.stringify({ sessioni: [{ data: "2026-11-02", peso: 84, circ: {}, pl7: {}, fonte: "app" }], config: {}, sync: null }));
  w.eval(scriptMisure());
  assert.equal(w.__msReady, 1, "lo script delle Misure non si è montato");
  assert.equal(String(doc.getElementById("ms-n").textContent).trim(), "1", "le sessioni salvate non tornano all'apertura");

  /* L'etichetta del KPI non è più «SESSIONI»: è plicometria. */
  const etichette = [...doc.querySelectorAll("#pag-misure .ms-k span")].map((s) => String(s.textContent).trim());
  assert.ok(etichette.includes("Sessioni di plicometria"), "manca l'etichetta «Sessioni di plicometria»");

  /* Importo una sessione col peso e senza altezza: il BMI deve dire «l'altezza». */
  doc.getElementById("ms-in").value = '{"sessioni":[{"data":"2026-11-03","peso":84}]}';
  doc.getElementById("ms-import").click();
  assert.match(String(doc.getElementById("ms-bmih").textContent), /manca l'altezza/);
  assert.match(String(doc.getElementById("ms-import-esito").textContent), /Ora in archivio: 2 sessioni/);
  assert.match(String(doc.getElementById("ms-bmih").textContent), /Anagrafica/);

  /* L'esito è accanto al tasto (nella linguetta dove si clicca) e nella riga di stato. */
  const vicino = String(doc.getElementById("ms-import-esito").textContent || "");
  const stato = String(doc.getElementById("ms-out").textContent || "");
  assert.match(vicino, /sessione nuova/);
  assert.match(stato, /Import fatto/);
  assert.ok(vicino.length > 0, "l'esito accanto al tasto è vuoto");

  /* Anche la copia scrive accanto al tasto e nella riga di stato. */
  doc.getElementById("ms-copy").click();
  const copiaVicino = String(doc.getElementById("ms-copy-esito").textContent || "");
  assert.ok(copiaVicino.length > 0, "l'esito della copia accanto al tasto è vuoto");
  assert.match(String(doc.getElementById("ms-out").textContent || ""), /copiare|copiati/, "la riga di stato non ripete l'esito della copia");
});

/* ------------------------------------------------------------------ 174.7 */

test("174.7 il nome viene dall'anagrafica: senza cognome nel profilo si legge solo il nome", () => {
  assert.equal(nomeAtleta({ displayName: "Alice Clemente" }, {}), "Alice");
  assert.equal(nomeAtleta({ displayName: "Alice Clemente" }, { cognome: "Rossi" }), "Alice Rossi");
  assert.equal(nomeAtleta(null, { nome: "Alice", cognome: "Rossi" }), "Alice Rossi");
  assert.equal(nomeAtleta(null, {}), "");

  const dom = new JSDOM(HTML, { url: "http://localhost/desktop/index.html" });
  const doc = dom.window.document;
  mostraNomeAtleta(doc, "Alice");
  assert.ok(String(doc.querySelector(".rail .chi").textContent).startsWith("Alice"), "la barra laterale non mostra il nome");
  assert.equal(String(doc.querySelector(".dc-nome").textContent).trim(), "Alice");
  assert.equal(String(doc.querySelector(".dc-av").textContent).trim(), "A");
  ["#pag-salute-recupero .sr-who b", "#pag-misure .ms-who b", "#pag-monitor-peso .mp-who b"].forEach((sel) => {
    assert.equal(String(doc.querySelector(sel).textContent).trim(), "Alice", "manca il nome in " + sel);
  });
  assert.equal(String(doc.getElementById("ck-nome").textContent).trim(), "Alice");

  /* Nel file non resta un nome scritto a mano. */
  assert.equal(HTML.includes("Alice Clemente"), false, "resta «Alice Clemente» scritto nel file");
});

/* ------------------------------------------------------------------ 174.8 */

test("174.8 la nota del logbook è una frase per l'utente", () => {
  const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  const inizio = app.indexOf('doc.getElementById("lb-nota-b")');
  assert.ok(inizio > 0);
  const fine = app.indexOf("nota.hidden = false;", inizio) + "nota.hidden = false;".length;
  const pezzo = app.slice(inizio, fine);
  assert.equal(/Passo 3c/.test(pezzo), false, "resta «Passo 3c» nella nota");
  assert.equal(/seme di esempio/.test(pezzo), false, "resta «seme di esempio» nella nota");
  assert.equal(/sottoraccolta/.test(pezzo), false, "resta «sottoraccolta» nella nota");
  assert.match(pezzo, /seduta letta dal logbook/);
  assert.match(pezzo, /il diario non è collegato/);
});

/* ----------------------------------------------------------------- 174.10 */

test("174.10 il pannello «Applica progressione» si chiude con Esc", () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="g"></div></body></html>', { url: "http://localhost/" });
  const doc = dom.window.document;
  const meta = {
    id: "prg-esc", name: "Prova Esc", status: "active", active: true, phase: "Bulk",
    startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A"],
    description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-16T18:12:00.000Z"
  };
  const scheda = { id: "s-prg-esc-A", dati: { programId: "prg-esc", sheetId: "sh-A", kind: "sheet", sheet: { id: "sh-A", code: "A", name: "Dorsali A", exercises: [] } } };
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede([scheda]), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 16)), quante: 8 });
  const mod = {
    attivo: true, annullabile: false, conta: () => ({ codice: "A", esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }), svuotaProgramma: () => Promise.resolve({ ok: true }),
    onProgressioniCustom: () => Promise.resolve({ ok: true })
  };
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  const tasto = [...doc.querySelectorAll("button")].find((b) => /Applica progressione a tutta la scheda/.test(b.textContent || ""));
  assert.ok(tasto, "manca il tasto «Applica progressione a tutta la scheda»");
  tasto.click();
  assert.ok(doc.querySelector(".prog-panel"), "il pannello non si è aperto");
  doc.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(doc.querySelector(".prog-panel"), null, "Esc non ha chiuso il pannello");
});

/* ------------------------------------------------------- la pagina vera --- */

const META = {
  id: "prg-174", name: "Programma 174", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const PROGRAMMA = {
  id: "prg-174", name: "Programma 174", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, versione: 3, rotation: ["A"],
  sheets: [{ id: "sh-A", code: "A", name: "Dorsali" }]
};
const SEI = ["Trazioni assistite", "Lat machine", "Rematore bilanciere", "Pulley basso", "Curl bilanciere", "Alzate laterali"]
  .map((nome, i) => ({ id: "ex-" + i, name: nome, muscle: "dorsali", prescription: { rest: "1'" } }));
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 174" },
  programmi: [
    { id: "program-v2-meta-prg-174", dati: { programMeta: META } },
    { id: "prg-174", dati: PROGRAMMA }
  ],
  schede: [{
    id: "program-v2-sheet-prg-174__sh-A",
    dati: {
      programId: "prg-174", sheetId: "sh-A", kind: "sheet", versione: 1,
      sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: SEI }
    }
  }],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

test("174.9 la pagina vera: nastro, settimana, archivio, nomi, versione e nota dai dati", async () => {
  const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [10, 5, 15], latenzaScrittura: 2 });
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(HTML, { runScripts: "outside-only", virtualConsole: vc, url: "http://localhost/desktop/index.html" });
  dom.window.BD_B = { build: "b0.test-174", nomeAppAuth: "B", prefissoChiavi: "bd-b.prova174.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova", displayName: "Alice Clemente" });
  /* La pagina vera carica comune/settimana-blocco.js come script classico: qui
   * si valuta nello stesso window, così window.BDSettimana esiste davvero. */
  dom.window.eval(readFileSync(join(radice, "comune", "settimana-blocco.js"), "utf8"));
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.BDSettimana = dom.window.BDSettimana;
  await import("../desktop/app-v31.js?caricamento=174");
  const doc = dom.window.document;

  await attendiFinche(() => {
    const fr = doc.getElementById("fr-nastro");
    return fr && /esercizi/.test(fr.textContent || "");
  }, 15000, "la pagina non ha mai scritto il nastro");

  const oggi = new Date();
  const attesa = SET.settimanaDelBlocco({ programmaPresente: true, inizio: "2026-10-05", durata: 8, oggi });

  assert.equal(String(doc.getElementById("fr-nastro").textContent).trim(), "6 esercizi · ultima seduta 26/10/2026");
  assert.equal(String(doc.getElementById("ck-settimana").textContent).trim(), attesa.etichetta);
  assert.equal(String(doc.getElementById("ck-programma-nome").textContent).trim(), "Programma 174");

  const pian = String(doc.getElementById("pianificazione-viva").textContent || "");
  assert.ok(pian.includes(attesa.etichetta), "la Pianificazione non dice la stessa settimana: " + pian.slice(0, 200));

  const carico = OV.carico({ letto: true, serie: [1, 2, 3, 4, 5, 6, 7, 8].map(() => [3, 3, 3, 3, 3, 3, 3, 3]), inizio: "05/10/2026", oggi });
  assert.equal(carico.settimana, attesa.numero);

  const riga = doc.querySelector("#archivio-corpo tr");
  assert.ok(riga, "manca la riga dell'Archivio");
  assert.equal(String(riga.querySelector('[data-colonna="sedute"]').textContent).trim(), "1");
  assert.equal(String(riga.querySelector('[data-colonna="ultima"]').textContent).trim(), "26/10/2026");

  assert.equal(String(doc.getElementById("st-ver").textContent).trim(), "b0.test-174");
  assert.equal(String(doc.getElementById("st-schede").textContent).trim(), "1");
  assert.equal(String(doc.getElementById("st-esercizi").textContent).trim(), String(conteggioCatalogoB()));

  assert.ok(String(doc.querySelector(".rail .chi").textContent).startsWith("Alice"), "la barra laterale non ha il nome dall'anagrafica");
  assert.equal(String(doc.querySelector(".dc-nome").textContent).trim(), "Alice");

  assert.equal(String(doc.getElementById("lb-nota-b").textContent).trim(), "1 seduta letta dal logbook; il diario non è collegato.");

  /* Il conto dell'Archivio è quello del logbook: la stessa seduta della nota
   * («1 seduta letta dal logbook») e della riga. */
  assert.match(String(doc.getElementById("lb-nota-b").textContent), /^1 seduta letta dal logbook/);
  assert.equal(String(riga.querySelector('[data-colonna="sedute"]').textContent).trim(), "1");

  /* «Compila / Modifica» non è muto: apre la riga «Patologie o infortuni». */
  doc.getElementById("dc-compila").click();
  const rigaAnam = doc.querySelector('[data-anamnesi="campo"]');
  assert.ok(rigaAnam, "manca la riga dell'anamnesi");
  assert.equal(rigaAnam.getAttribute("data-modo-anamnesi"), "modifica", "il tasto non ha aperto l'editor");
  assert.match(String(doc.getElementById("dc-avviso").textContent), /l'ho aperto per te/);
  dom.window.close();
});
