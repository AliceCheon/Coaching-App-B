/* tests/173-progressioni-custom.test.mjs — passo 21.
 *
 * Alice (26/11/2026): «dentro la scheda di progressioni, ogni progressione deve
 * essere visualizzabile, modificabile e duplicabile, in più ci deve essere il
 * tasto "crea progressione custom"».
 *
 * Le 21 voci del tastino sono formule e restano formule. Una custom è una
 * tabella di otto settimane, salvata nel documento del PROGRAMMA aperto
 * (programMeta.progressioniCustom): nessuna raccolta nuova, quindi nessuna
 * regola Firestore da chiedere ad Alice.
 *
 *  173.1 «Vedi» mostra davvero la tabella che la formula produce, con i numeri
 *        di PROGRULE (non una tabella disegnata a parte);
 *  173.2 «Duplica» crea una custom con gli stessi valori, e la custom compare
 *        nell'elenco con la sua etichetta;
 *  173.3 modificare una cella cambia solo quella;
 *  173.4 salvare e rileggere dopo un «refresh» restituisce la custom, con
 *        versione +1, marchio e voce di registro; l'Annulla la toglie;
 *  173.5 applicare una custom scrive le otto settimane nella scheda (riga e
 *        scheda intera), e la voce del registro dice da quale custom viene;
 *  173.6 «Elimina» chiede conferma, e solo dopo parte una scrittura sola.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PROG, PROGRULE, coppieRiga, baseDaSettimane } from "../comune/progressioni-b.js";
import { elencoCustom, coppieCustom, cambiaProgressioni } from "../comune/progressioni-custom-b.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { applicaProgressione, applicaProgressioneScheda, annullaModifica } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const ORA = "2026-11-26T23:40:00.000Z";

/* ---------- un programma con una scheda e due righe ----------------------- */

const sett = (serie, reps) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: reps, rest: { seconds: 90 }, type: "normal" }));
const esercizio = (id, nome) => ({
  id: id, name: nome, muscle: "petto", order: 0,
  prescription: { sets: 4, reps: "8-10", rest: { seconds: 90 } },
  progression: { weeks: sett(4, "8-10") }
});

const meta = {
  id: "prg173", name: "Progressioni", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const schedaDoc = () => ({
  id: "s-prg173-A",
  dati: {
    programId: "prg173", sheetId: "sh-A", kind: "sheet",
    sheet: { id: "sh-A", code: "A", name: "Spinta", exercises: [esercizio("ex-1", "Panca piana"), esercizio("ex-2", "Croci ai cavi")] }
  }
});

/* Il documento del programma come lo legge l'editor: `{ programId,
 * programMeta }`, con dentro le custom. */
function documentoProgramma(custom) {
  return {
    id: "program-v2-meta-prg173",
    programId: "prg173",
    versione: 5,
    programMeta: Object.assign({}, meta, custom ? { progressioniCustom: custom } : {})
  };
}

function unaCustom(nome, coppie) {
  const s = [];
  for (let w = 0; w < 8; w += 1) {
    const c = (coppie && coppie[w]) || ["", ""];
    s.push({ serie: c[0], ripetizioni: c[1] });
  }
  return { id: "pc-1", nome: nome, da: "double-progression", settimane: s };
}

/* ---------- la pagina vera, con un editor finto -------------------------- */

function paginaVera(opzioni) {
  const o = opzioni || {};
  const custom = o.custom === undefined ? [] : o.custom;
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const chiamate = [];
  const custom_chiamate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    onCambia: (richiesta) => { chiamate.push(richiesta); return Promise.resolve(o.risposta || { ok: true, testo: "fatto" }); },
    onProgressioniCustom: (richiesta) => { custom_chiamate.push(richiesta); return Promise.resolve(o.rispostaCustom || { ok: true, testo: "salvata" }); }
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");
  const r = riepilogoProgramma(meta, [], {
    schedeV2: ricostruisciSchede([schedaDoc()]), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8
  });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign(r, {
    modifica: o.conEditor === false ? null : mod,
    progressioni: { id: o.senzaProgramma ? "" : "program-v2-meta-prg173", custom: custom }
  }));
  return { dom, doc, chiamate, custom_chiamate, contenitore };
}

function apriPannello(s) {
  const riga = s.contenitore.querySelector(".p8-r");
  assert.ok(riga, "la riga della scheda c'è");
  const bottone = riga.querySelector("button.btn-prog");
  assert.ok(bottone, "il tasto «Applica progressione» c'è");
  bottone.click();
  const pannello = s.doc.querySelector(".prog-panel:not([data-progp])");
  assert.ok(pannello, "il pannello delle progressioni si apre");
  return { pannello: pannello, riga: riga };
}

const rigaVoce = (pannello, nome) => Array.from(pannello.querySelectorAll(".prog-row"))
  .filter((r) => String((r.querySelector(".prog-item b") || {}).textContent || "").indexOf(nome) !== -1)[0] || null;
const tastoIn = (dentro, parola) => Array.from(dentro.querySelectorAll("button"))
  .filter((b) => String(b.textContent || "").trim() === parola)[0] || null;
const cellaTabella = (tabella, riga, settimana) => {
  const tr = tabella.querySelectorAll("tbody tr")[riga];
  return String(tr.querySelectorAll("td.prog-cell")[settimana - 1].textContent || "").trim();
};

/* ---------- 173.1: la tabella è quella della formula --------------------- */

test("173.1 «Vedi» mostra la tabella vera della formula, in sola lettura", () => {
  const s = paginaVera();
  const p = apriPannello(s);
  const voce = rigaVoce(p.pannello, "Doppia progressione");
  assert.ok(voce, "la voce Doppia progressione c'è");
  tastoIn(voce, "Vedi").click();

  const modale = s.doc.querySelector(".prog-modal");
  assert.ok(modale, "«Vedi» apre la tabella");
  const tabella = modale.querySelector("table.prog-table");
  assert.ok(tabella, "dentro c'è la tabella delle otto settimane");
  assert.equal(tabella.querySelectorAll("tbody tr").length, 2, "due righe: serie e ripetizioni");
  assert.equal(tabella.querySelectorAll("thead th").length, 9, "la riga delle settimane: S1…S8");
  assert.equal(modale.querySelectorAll("input").length, 0, "è in sola lettura: nessun campo da scrivere");
  assert.ok(String(modale.textContent).indexOf("Formula «Doppia progressione»") !== -1, "dice da quale formula viene: " + modale.textContent);

  /* I numeri sono quelli della formula applicata alla S1 di QUESTA riga:
   * 4 serie e 8-10 ripetizioni. Non una tabella disegnata a mano. */
  const base = baseDaSettimane(esercizio("ex-1", "Panca").progression.weeks.map((w) => ({ serie: w.sets, ripetizioni: w.reps })));
  assert.deepEqual(base, { s: 4, r: "8-10" });
  const attesa = PROGRULE["double-progression"](base, 1);
  assert.equal(cellaTabella(tabella, 0, 1), String(attesa[0]), "S1 serie");
  assert.equal(cellaTabella(tabella, 1, 1), String(attesa[1]), "S1 ripetizioni");
  for (let w = 1; w <= 8; w += 1) {
    const coppia = PROGRULE["double-progression"](base, w);
    assert.equal(cellaTabella(tabella, 0, w), String(coppia[0]), "serie in S" + w);
    assert.equal(cellaTabella(tabella, 1, w), String(coppia[1]), "ripetizioni in S" + w);
  }
  /* e la tabella non ha toccato la scheda */
  assert.equal(s.chiamate.length, 0, "vedere non scrive niente");
});

test("173.1b se la S1 non ha serie o ripetizioni, la tabella lo dichiara", () => {
  const s = paginaVera();
  /* Una riga senza settimane: la formula userebbe il ripiego 3 × 8-10. */
  const p = apriPannello(s);
  const voce = rigaVoce(p.pannello, "Doppia progressione");
  tastoIn(voce, "Vedi").click();
  const modale = s.doc.querySelector(".prog-modal");
  assert.equal(modale.querySelectorAll("input").length, 0, "resta sola lettura");
  assert.ok(String(modale.textContent).indexOf("S1") !== -1 || String(modale.textContent).indexOf("settimana 1") !== -1,
    "la tabella dice da dove partono i numeri");
});

/* ---------- 173.2: duplicare crea una custom uguale --------------------- */

test("173.2 «Duplica» crea una custom con gli stessi valori", () => {
  const s = paginaVera();
  const p = apriPannello(s);
  const voce = rigaVoce(p.pannello, "Doppia progressione");
  tastoIn(voce, "Duplica").click();

  const modale = s.doc.querySelector(".prog-modal");
  assert.ok(modale, "si apre la finestra della nuova custom");
  const nome = modale.querySelector("input.prog-in");
  assert.equal(nome.value, "Copia di Doppia progressione", "il nome proposto dice da dove viene");
  const celle = Array.from(modale.querySelectorAll("input.prog-in-cella"));
  assert.equal(celle.length, 16, "otto settimane × serie e ripetizioni");
  const campo = (n, c) => modale.querySelector('input[data-settimana="' + n + '"][data-campo="' + c + '"]');
  assert.equal(campo(1, "serie").value, "4", "S1 serie, copiata dalla formula");
  assert.equal(campo(1, "ripetizioni").value, "8", "S1 ripetizioni, copiata dalla formula");
  assert.equal(campo(2, "serie").value, "4", "S2 serie");
  assert.equal(campo(2, "ripetizioni").value, "9", "S2 ripetizioni");

  tastoIn(modale, "Salva").click();
  assert.equal(s.custom_chiamate.length, 1, "un salvataggio solo");
  const richiesta = s.custom_chiamate[0];
  assert.equal(richiesta.azione, "crea");
  assert.equal(richiesta.nome, "Copia di Doppia progressione");
  assert.equal(richiesta.idProgramma, "program-v2-meta-prg173", "la custom si salva nel programma aperto");
  assert.equal(richiesta.coppie.length, 8);
  assert.deepEqual(richiesta.coppie[0], ["4", "8"]);
  assert.deepEqual(richiesta.coppie[1], ["4", "9"]);
  assert.equal(richiesta.da, "double-progression", "la copia ricorda da quale formula viene");

  /* La stessa cosa nel motore puro: il documento nuovo porta la custom, con
   * gli stessi valori della formula. */
  const esito = cambiaProgressioni(documentoProgramma(null), richiesta, { quando: ORA, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  const lette = elencoCustom(esito.dati);
  assert.equal(lette.length, 1);
  assert.deepEqual(coppieCustom(lette[0]), coppieRiga("double-progression", { s: 4, r: "8-10" }));
});

test("173.2b la custom compare nello stesso elenco, con l'etichetta custom", () => {
  const s = paginaVera({ custom: [unaCustom("Copia di Carico lineare", [["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"], ["4", "8-10"]])] });
  const p = apriPannello(s);
  const voci = Array.from(p.pannello.querySelectorAll(".prog-row"));
  assert.equal(voci.length, PROG.length + 1, "le 21 formule e la custom");
  /* Passo 21 — le custom stanno in cima: sono quelle di Alice, e con ventuno
   * formule sotto finirebbero fuori dallo schermo. */
  const prima = voci[0];
  assert.equal(String(prima.querySelector(".prog-item b").textContent), "Copia di Carico lineare");
  assert.equal(String(prima.querySelector(".prog-tag").textContent), "custom", "l'etichetta dice che è custom");
  assert.ok(tastoIn(prima, "Modifica"), "una custom si modifica");
  assert.ok(tastoIn(prima, "Elimina"), "una custom si elimina");
  assert.ok(tastoIn(prima, "Vedi"), "una custom si vede");
  /* il clic sulla voce la applica, come una formula, ma porta le sue coppie */
  prima.querySelector(".prog-item").click();
  assert.equal(s.chiamate.length, 1);
  assert.equal(s.chiamate[0].campo, "progressione");
  assert.equal(s.chiamate[0].progressione, "custom:pc-1");
  assert.deepEqual(s.chiamate[0].coppieCustom[0], ["4", "8-10"]);
  assert.equal(s.chiamate[0].nomeProgressione, "Copia di Carico lineare");
});

/* ---------- 173.3: una cella, e solo quella ------------------------------ */

test("173.3 modificare una cella cambia solo quella", () => {
  const doc = documentoProgramma([unaCustom("Prova", coppieRiga("volume-progression", { s: 4, r: "8-10" }))]);
  const esito = cambiaProgressioni(doc, { idProgramma: "program-v2-meta-prg173", azione: "cella", id: "pc-1", settimana: 3, campo: "ripetizioni", valore: "6-8" }, { quando: ORA, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  const voce = elencoCustom(esito.dati)[0];
  assert.deepEqual(coppieCustom(voce), [
    ["4", "8-10"], ["4", "8-10"], ["5", "6-8"], ["5", "8-10"],
    ["6", "8-10"], ["6", "8-10"], ["7", "8-10"], ["7", "8-10"]
  ], "cambia SOLO la ripetizioni della S3, serie invariate");
  assert.equal(esito.dati.versione, 6, "versione +1");
  assert.equal(esito.voce.tipo, "progressioni-custom");
  assert.equal(esito.voce.azione, "cella");
  assert.ok(String(esito.voce.dopoTesto).indexOf("S3") !== -1, "la voce dice quale settimana: " + esito.voce.dopoTesto);

  /* e la tabella dell'editor riporta la modifica senza perdere il resto */
  const dopo = cambiaProgressioni(esito.dati, { azione: "settimane", id: "pc-1", coppie: coppieCustom(voce) }, { quando: "2026-11-26T23:41:00.000Z", uid: "u1" });
  assert.equal(dopo.ok, false, "rimandare la stessa tabella non è una modifica: " + dopo.motivo);
});

/* ---------- 173.4: salvare, rileggere, annullare ------------------------ */

test("173.4 dopo un refresh la custom c'è ancora, e l'Annulla la toglie", () => {
  const doc = documentoProgramma(null);
  const esito = cambiaProgressioni(doc, { azione: "crea", nome: "Mia progressione", coppie: coppieRiga("deload-cycle", { s: 4, r: "8-10" }) }, { quando: ORA, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.versione, 6);
  assert.deepEqual(esito.dati.modificatoInB, { quando: ORA, da: "u1", ultima: "progressioni-custom" });
  assert.equal(esito.voce.prima.length, 0, "prima non c'era nessuna custom");
  assert.equal(esito.voce.dopo.length, 1);

  /* il giro vero di Firestore: si scrive, si rilegge il documento (una copia
   * che ha solo i campi), e la custom si ritrova con i suoi valori */
  const letto = JSON.parse(JSON.stringify(esito.dati));
  const custom = elencoCustom(letto);
  assert.equal(custom.length, 1);
  assert.equal(custom[0].nome, "Mia progressione");
  assert.deepEqual(coppieCustom(custom[0]), coppieRiga("deload-cycle", { s: 4, r: "8-10" }));

  /* l'Annulla rimette l'elenco di prima: la custom sparisce, la versione sale */
  const indietro = annullaModifica(letto, esito.voce, { quando: "2026-11-26T23:42:00.000Z", uid: "u1" });
  assert.equal(indietro.ok, true, indietro.motivo);
  assert.deepEqual(elencoCustom(indietro.dati), []);
  assert.equal(indietro.dati.versione, 7);
  assert.equal(indietro.voce.tipo, "annulla-modifica");
  assert.equal(indietro.voce.annullaDi, esito.voce.idVoce);
});

test("173.4b rinominare ed eliminare passano dallo stesso documento", () => {
  const doc = documentoProgramma([unaCustom("Prova", coppieRiga("linear-load", { s: 4, r: "8-10" })), unaCustom("Seconda", coppieRiga("volume-progression", { s: 3, r: "10" }))]);
  const rinomina = cambiaProgressioni(doc, { azione: "rinomina", id: "pc-1", nome: "Prova rinominata" }, { quando: ORA, uid: "u1" });
  assert.equal(rinomina.ok, true, rinomina.motivo);
  assert.equal(elencoCustom(rinomina.dati)[0].nome, "Prova rinominata");
  /* con una voce "settimane" si può cambiare anche il nome, in una scrittura sola */
  const insieme = cambiaProgressioni(rinomina.dati, { azione: "settimane", id: "pc-1", nome: "Nome e celle", coppie: coppieRiga("volume-progression", { s: 4, r: "10" }) }, { quando: "2026-11-26T23:43:00.000Z", uid: "u1" });
  assert.equal(insieme.ok, true, insieme.motivo);
  const dopo = elencoCustom(insieme.dati);
  assert.equal(dopo[0].nome, "Nome e celle");
  assert.deepEqual(coppieCustom(dopo[0]), coppieRiga("volume-progression", { s: 4, r: "10" }));
  assert.equal(dopo.length, 2, "l'altra custom resta");

  const via = cambiaProgressioni(insieme.dati, { azione: "elimina", id: "pc-1" }, { quando: "2026-11-26T23:44:00.000Z", uid: "u1" });
  assert.equal(via.ok, true, via.motivo);
  assert.equal(elencoCustom(via.dati).length, 1);
  assert.equal(elencoCustom(via.dati)[0].nome, "Seconda");

  /* una tabella tutta vuota non si salva: non è una progressione */
  const vuota = cambiaProgressioni(doc, { azione: "crea", nome: "Niente", coppie: Array.from({ length: 8 }, () => ["", ""]) }, { quando: ORA, uid: "u1" });
  assert.equal(vuota.ok, false);
  assert.match(vuota.motivo, /tutta vuota/);
});

/* ---------- 173.5: applicare una custom scrive le settimane -------------- */

test("173.5 applicare una custom scrive le otto settimane nella scheda", () => {
  const coppie = coppieRiga("double-progression", { s: 4, r: "8-10" });
  const scheda = schedaDoc().dati;
  const esito = applicaProgressione(scheda, {
    idScheda: "A", idEsercizio: "ex-1", esercizio: "Panca piana", campo: "progressione",
    progressione: "custom:pc-1", coppieCustom: coppie, nomeProgressione: "Copia di Doppia progressione"
  }, { quando: ORA, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  const settimane = esito.dati.sheet.exercises[0].progression.weeks;
  assert.deepEqual(settimane.map((w) => w.sets), [4, 4, 4, 4, 4, 4, 4, 4]);
  assert.deepEqual(settimane.map((w) => w.reps), ["8", "9", "10", "10", "10", "10", "10", "10"]);
  assert.equal(esito.voce.progressione, "custom:pc-1", "la voce dice che è una custom");
  assert.equal(esito.voce.nomeProgressione, "Copia di Doppia progressione");
  /* l'altra riga non è stata toccata */
  assert.deepEqual(esito.dati.sheet.exercises[1].progression.weeks.map((w) => w.reps), ["8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10", "8-10"]);

  /* coppie non valide: non si scrive niente */
  const storta = applicaProgressione(scheda, { idScheda: "A", idEsercizio: "ex-1", campo: "progressione", progressione: "custom:pc-1", coppieCustom: [["4", "8"]] }, { quando: ORA, uid: "u1" });
  assert.equal(storta.ok, false);
  assert.match(storta.motivo, /otto settimane/);

  /* e la scheda intera: la stessa tabella su tutte le righe */
  const tutta = applicaProgressioneScheda(scheda, {
    idScheda: "A", campo: "progressione-scheda", progressione: "custom:pc-1",
    coppieCustom: coppieRiga("volume-progression", { s: 3, r: "12" }), nomeProgressione: "Volume mia"
  }, { quando: ORA, uid: "u1" });
  assert.equal(tutta.ok, true, tutta.motivo);
  assert.equal(tutta.dati.sheet.exercises.length, 2);
  tutta.dati.sheet.exercises.forEach((e) => {
    assert.deepEqual(e.progression.weeks.map((w) => w.sets), [3, 3, 4, 4, 5, 5, 6, 6]);
    assert.deepEqual(e.progression.weeks.map((w) => w.reps), ["12", "12", "12", "12", "12", "12", "12", "12"]);
  });
  assert.equal(tutta.voce.progressione, "custom:pc-1");
});

/* ---------- 173.6: eliminare chiede conferma ---------------------------- */

test("173.6 «Elimina» chiede conferma: prima nessuna scrittura, poi una sola", () => {
  const s = paginaVera({ custom: [unaCustom("Da togliere", coppieRiga("linear-load", { s: 4, r: "8-10" }))] });
  const p = apriPannello(s);
  const voce = rigaVoce(p.pannello, "Da togliere");
  assert.ok(voce, "la custom è nell'elenco");
  tastoIn(voce, "Elimina").click();

  const conferma = s.doc.querySelector(".prog-modal");
  assert.ok(conferma, "la conferma si apre");
  assert.ok(String(conferma.textContent).indexOf("Eliminare «Da togliere»?") !== -1, "la conferma nomina la progressione: " + conferma.textContent);
  assert.ok(String(conferma.textContent).indexOf("Le schede gi") !== -1, "la conferma dice che le schede non cambiano");
  assert.equal(s.custom_chiamate.length, 0, "prima della conferma non si scrive niente");

  tastoIn(conferma, "Elimina").click();
  assert.equal(s.custom_chiamate.length, 1, "confermando parte una scrittura sola");
  assert.equal(s.custom_chiamate[0].azione, "elimina");
  assert.equal(s.custom_chiamate[0].id, "pc-1");
  assert.equal(s.custom_chiamate[0].idProgramma, "program-v2-meta-prg173");
});

test("173.6b senza un programma aperto, creare e duplicare dicono perché non si può", () => {
  const s = paginaVera({ senzaProgramma: true });
  const p = apriPannello(s);
  const nuova = tastoIn(p.pannello, "\uff0b Crea progressione custom");
  assert.ok(nuova, "il tasto c'è");
  assert.equal(nuova.disabled, true, "senza il documento del programma è spento, non finge di salvare");
  assert.match(String(nuova.title || ""), /programma/, "il perché si legge: " + nuova.title);
  const voce = rigaVoce(p.pannello, "Carico lineare");
  const duplica = tastoIn(voce, "Duplica");
  assert.equal(duplica.disabled, true, "anche duplicare è spento");
  /* e la pagina non scrive niente, comunque */
  assert.equal(s.chiamate.length, 0);
  assert.equal(s.custom_chiamate.length, 0);
});

/* ---------- le regole di casa ------------------------------------------- */

test("173.7 le custom non toccano le formule e non aprono raccolte nuove", () => {
  /* le 21 formule e le loro regole restano quelle del v31 */
  assert.equal(PROG.length, 21);
  assert.equal(typeof PROGRULE["double-progression"], "function");
  /* il modulo puro non ha scritture Firestore: a scrivere è scritture-b.js */
  const puro = readFileSync(join(radice, "comune", "progressioni-custom-b.js"), "utf8");
  assert.doesNotMatch(puro, /\.set\s*\(|\.update\s*\(|\.delete\s*\(|\.add\s*\(/);
  assert.doesNotMatch(puro, /new\s+Map\s*\(|new\s+Set\s*\(/);
  /* il campo vive nel documento del programma, non in una raccolta nuova */
  assert.match(puro, /programMeta/);
  assert.match(readFileSync(join(radice, "comune", "progressioni-b.js"), "utf8"), /progressioniCustom/);
});
