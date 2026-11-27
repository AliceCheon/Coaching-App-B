/* tests/177 — passo 26 (27/11/2026).
 *
 * Due cose che Alice ha chiesto nello stesso messaggio:
 *
 * 1. PROGRESSIONI — «togli duplica in custom e metti solo "modifica"; dentro
 *    modifica poi ci sarà il tasto "aggiorna" e "salva come" così se faccio
 *    salva come praticamente si duplica con le modifiche». Quindi:
 *    «Modifica» è il tasto principale di ogni voce della libreria; dentro la
 *    tabella ci sono «Aggiorna» (salva su quella che stai modificando) e
 *    «Salva come» (ne fa una nuova con le modifiche). Le formule del v31 non
 *    si toccano: su una formula «Modifica» apre una copia.
 *
 * 2. DESCR. / SETUP — «è in descrizione/setup che non mi fa scrivere». La
 *    colonna della tabella era un testo e basta: ora si scrive dentro la
 *    cella (contenteditable, come serie e recupero) e il testo va
 *    sull'ESERCIZIO, con versione +1, marchio, voce di registro e Annulla.
 *    Le righe REC/TUT spostate restano della prescrizione: non si duplicano.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { PROG, PRG, PROGRULE, coppieRiga } from "../comune/progressioni-b.js";
import { elencoCustom, coppieCustom, cambiaProgressioni } from "../comune/progressioni-custom-b.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { montaPaginaProgressioni } from "../comune/vista-progressioni-pagina.js";
import { cambiaNotaEsercizio, annullaModifica } from "../comune/modifiche-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const ORA = "2026-11-27T12:30:00.000Z";

/* ---------- il programma di prova: due esercizi, una scheda --------------- */

const sett = (serie, reps) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets: serie, reps: reps, rest: { seconds: 90 }, type: "normal" }));
const esercizio = (id, nome, extra) => Object.assign({
  id: id, name: nome, nome: nome, muscle: "petto", order: 0, nota: "",
  prescription: { sets: 4, reps: "8-10", rest: { seconds: 90 } },
  progression: { weeks: sett(4, "8-10") }
}, extra || {});

const META = {
  id: "prg177", name: "Progressioni e note", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const ID_DOC = "program-v2-sheet-prg177__sh-A";

/* `extra` permette di scrivere la frase REC/TUT nella prescrizione: quelle
 * righe si spostano in Descr./Setup ma restano della prescrizione. */
const schedaDoc = (opzioni) => {
  const o = opzioni || {};
  const esercizi = o.esercizi || [
    esercizio("ex-1", "Panca piana", { nota: o.nota == null ? "" : o.nota }),
    esercizio("ex-2", "Croci ai cavi", { nota: "gomiti bassi" })
  ];
  return {
    id: ID_DOC,
    dati: {
      programId: "prg177", sheetId: "sh-A", kind: "sheet", versione: o.versione == null ? 1 : o.versione,
      sheet: { id: "sh-A", code: "A", name: "Spinta", note: o.notaScheda || "", exercises: esercizi }
    }
  };
};

function unaCustom(nome, coppie) {
  const s = [];
  for (let w = 0; w < 8; w += 1) {
    const c = (coppie && coppie[w]) || ["", ""];
    s.push({ serie: c[0], ripetizioni: c[1] });
  }
  return { id: "pc-1", nome: nome, da: "volume-progression", settimane: s };
}

/* ---------- la pagina vera, con un salvataggio finto che risponde ---------- */

function paginaVera(opzioni) {
  const o = opzioni || {};
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const chiamate = [];
  const custom_chiamate = [];
  const mod = o.conEditor === false ? null : {
    attivo: true,
    annullabile: false,
    onCambia: (richiesta) => { chiamate.push(richiesta); return Promise.resolve(o.risposta || { ok: true, testo: "fatto" }); },
    onProgressioniCustom: (richiesta) => custom_chiamate.push(richiesta)
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");
  const documento = schedaDoc(o);
  const r = riepilogoProgramma(META, [], {
    schedeV2: ricostruisciSchede([documento]), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 27)), quante: 8
  });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign(r, {
    modifica: mod,
    progressioni: { id: "program-v2-meta-prg177", custom: o.custom || [] }
  }));
  return { dom, doc, chiamate, custom_chiamate, contenitore, documento };
}

/* La cella Descr./Setup della riga con quel nome. */
function cellaNota(s, nome) {
  const righe = Array.from(s.contenitore.querySelectorAll("tr.p8-r"));
  const riga = righe.filter((tr) => String(tr.textContent || "").indexOf(nome) !== -1)[0] || null;
  if (!riga) return null;
  return riga.querySelector("td.c-note .p8-note");
}

/* Le finestre salvano in una Promise: qui si lascia finire il giro dei
 * microtask, altrimenti si guarda lo schermo un istante prima che si aggiorni. */
const giro = () => new Promise((r) => setImmediate(r));

const tastoIn = (dentro, parola) => Array.from(dentro.querySelectorAll("button"))
  .filter((b) => String(b.textContent || "").trim() === parola)[0] || null;
const cellaTabella = (tabella, riga, settimana) => {
  const tr = tabella.querySelectorAll("tbody tr")[riga];
  return String(tr.querySelectorAll("td.prog-cell")[settimana - 1].textContent || "").trim();
};
const campo = (modale, n, c) => modale.querySelector('input[data-settimana="' + n + '"][data-campo="' + c + '"]');
const value = (campo) => String(campo.value == null ? "" : campo.value);

/* ======================================================================== */
/* 1. PROGRESSIONI                                                          */
/* ======================================================================== */

function libreria(custom, risposta) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const salvate = [];
  const quante = montaPaginaProgressioni(doc, {
    idProgramma: "program-v2-meta-prg177",
    custom: custom || [],
    salvaCustom: (richiesta) => {
      salvate.push(richiesta);
      const r = typeof risposta === "function" ? risposta(richiesta) : risposta;
      return Promise.resolve(r || { ok: true, testo: "salvata" });
    }
  });
  return { dom, doc, salvate, quante, griglia: doc.getElementById("pag-progressioni") };
}

const cartaDi = (s, nome) => Array.from(s.griglia.querySelectorAll(".pr-card"))
  .filter((c) => String(c.textContent || "").indexOf(nome) !== -1)[0] || null;

test("177.1 la libreria ha «Modifica» come tasto principale e non più «Duplica in custom»", () => {
  const s = libreria([]);
  const carta = cartaDi(s, "Doppia progressione");
  assert.ok(carta, "la voce Doppia progressione c'è");
  const modifica = tastoIn(carta, "Modifica");
  assert.ok(modifica, "ogni voce ha «Modifica»");
  assert.equal(modifica.disabled, false, "con un programma aperto «Modifica» è acceso");
  assert.ok(tastoIn(carta, "Vedi la tabella"), "«Vedi la tabella» resta, per la sola lettura");
  assert.equal(tastoIn(carta, "Duplica in custom"), null, "«Duplica in custom» non c'è più");
  assert.equal(tastoIn(carta, "Duplica"), null, "nemmeno «Duplica»");
});

test("177.2 su una formula «Modifica» apre la copia, con i valori della formula", () => {
  const s = libreria([]);
  tastoIn(cartaDi(s, "Doppia progressione"), "Modifica").click();
  const modale = s.doc.querySelector(".prog-modal");
  assert.ok(modale, "si apre la finestra");
  assert.equal(modale.querySelector("input.prog-in").value, "Copia di Doppia progressione",
    "il nome proposto dice che è una copia");
  assert.ok(String(modale.textContent).indexOf("La formula del v31 non si cambia") !== -1,
    "la finestra lo dice a chiare lettere: " + String(modale.textContent).slice(0, 200));
  assert.ok(tastoIn(modale, "Aggiorna"), "dentro c'è «Aggiorna»");
  assert.ok(tastoIn(modale, "Salva come"), "dentro c'è «Salva come»");
  const attesa = PROGRULE["double-progression"]({ s: 3, r: "8-10" }, 2);
  assert.equal(value(campo(modale, 2, "serie")), String(attesa[0]), "S2 serie: i valori della formula");
  assert.equal(value(campo(modale, 2, "ripetizioni")), String(attesa[1]), "S2 ripetizioni");
});

test("177.3 su una copia non ancora salvata «Aggiorna» la crea; poi «Aggiorna» la modifica", async () => {
  const s = libreria([], (richiesta) => richiesta.azione === "crea"
    ? { ok: true, testo: "creata", custom: { id: "pc-nuova", nome: richiesta.nome } }
    : { ok: true, testo: "aggiornata", custom: { id: "pc-nuova", nome: richiesta.nome } });
  tastoIn(cartaDi(s, "Doppia progressione"), "Modifica").click();
  let modale = s.doc.querySelector(".prog-modal");
  tastoIn(modale, "Aggiorna").click();
  await giro();

  assert.equal(s.salvate.length, 1, "una scrittura sola");
  assert.equal(s.salvate[0].azione, "crea", "la copia non esiste: la prima volta la crea");
  assert.equal(s.salvate[0].da, "double-progression", "la copia ricorda da quale formula viene");
  assert.equal(s.salvate[0].nome, "Copia di Doppia progressione");
  assert.equal(s.salvate[0].coppie.length, 8, "otto settimane");
  assert.deepEqual(s.salvate[0].coppie[0], ["3", "8"], "S1 copiata dalla formula");

  /* La finestra resta aperta e ora modifica quella copia: «Aggiorna» la
   * sovrascrive invece di crearne un'altra. */
  modale = s.doc.querySelector(".prog-modal");
  assert.ok(modale, "la finestra resta aperta sulla copia appena creata");
  assert.ok(String(modale.textContent).indexOf("Copia salvata") !== -1, "lo dice: " + String(modale.textContent).slice(0, 200));
  campo(modale, 2, "ripetizioni").value = "10";
  tastoIn(modale, "Aggiorna").click();
  await giro();
  assert.equal(s.salvate.length, 2, "la seconda scrittura è una modifica, non una seconda copia");
  assert.equal(s.salvate[1].azione, "settimane");
  assert.equal(s.salvate[1].id, "pc-nuova");
  assert.deepEqual(s.salvate[1].coppie[1], ["3", "10"], "la modifica viaggia con la copia");
});

test("177.4 su una custom in elenco «Aggiorna» la sovrascrive, «Salva come» ne fa una nuova", async () => {
  const s = libreria([unaCustom("Mia", coppieRiga("volume-progression", { s: 4, r: "8-10" }))]);
  const carta = cartaDi(s, "Mia");
  tastoIn(carta, "Modifica").click();
  let modale = s.doc.querySelector(".prog-modal");
  assert.equal(modale.querySelector("input.prog-in").value, "Mia", "si apre quella vera, non una copia");
  campo(modale, 1, "serie").value = "5";
  tastoIn(modale, "Aggiorna").click();
  await giro();

  assert.equal(s.salvate.length, 1);
  assert.equal(s.salvate[0].azione, "settimane", "«Aggiorna» scrive sulla custom aperta");
  assert.equal(s.salvate[0].id, "pc-1");
  assert.deepEqual(s.salvate[0].coppie[0], ["5", "8-10"]);
  assert.equal(s.doc.querySelector(".prog-modal"), null, "e la finestra si chiude");

  /* «Salva come» invece crea una seconda custom: l'originale resta com'è. */
  tastoIn(cartaDi(s, "Mia"), "Modifica").click();
  modale = s.doc.querySelector(".prog-modal");
  campo(modale, 1, "serie").value = "6";
  tastoIn(modale, "Salva come").click();
  await giro();
  assert.equal(s.salvate.length, 2);
  assert.equal(s.salvate[1].azione, "crea", "«Salva come» crea");
  assert.notEqual(s.salvate[1].nome, "Mia", "con un nome nuovo: " + s.salvate[1].nome);
  assert.equal(s.salvate[1].nome, "Copia di Mia", "il nome proposto è «Copia di …»");
  assert.equal(s.salvate[1].da, "pc-1", "la nuova ricorda da quale custom viene");
  assert.deepEqual(s.salvate[1].coppie[0], ["6", "8-10"], "con le modifiche fatte nella tabella");
});

test("177.4b se «Copia di …» esiste già, «Salva come» aggiunge 2 invece di un nome doppio", async () => {
  const s = libreria([unaCustom("Mia", coppieRiga("volume-progression", { s: 4, r: "8-10" }))]);
  /* La copia di «Mia» c'è già in elenco: due voci con lo stesso nome sarebbero
   * indistinguibili nella tendina delle progressioni. */
  const esistente = unaCustom("Copia di Mia", coppieRiga("volume-progression", { s: 4, r: "8-10" }));
  esistente.id = "pc-2";
  const s2 = libreria([
    unaCustom("Mia", coppieRiga("volume-progression", { s: 4, r: "8-10" })),
    esistente
  ]);
  const carta = Array.from(s2.griglia.querySelectorAll(".pr-card"))
    .filter((c) => String(c.querySelector("h3").textContent || "") === "customMia")[0];
  assert.ok(carta, "la custom Mia c'è");
  tastoIn(carta, "Modifica").click();
  const modale = s2.doc.querySelector(".prog-modal");
  tastoIn(modale, "Salva come").click();
  await giro();
  assert.equal(s2.salvate.length, 1);
  assert.equal(s2.salvate[0].nome, "Copia di Mia 2", "il nome libero evita il doppione: " + s2.salvate[0].nome);
  assert.equal(s2.salvate[0].azione, "crea");
});

test("177.5 il motore: aggiornare non tocca le altre, salvare come aggiunge una voce", () => {
  const documento = {
    id: "program-v2-meta-prg177", programId: "prg177", versione: 5,
    programMeta: Object.assign({}, META, { progressioniCustom: [unaCustom("Mia", coppieRiga("volume-progression", { s: 4, r: "8-10" }))] })
  };
  const aggiornata = cambiaProgressioni(documento, {
    idProgramma: "prg177", azione: "settimane", id: "pc-1",
    nome: "Mia", coppie: [["5", "8-10"], ["5", "8-10"], ["5", "8-10"], ["5", "8-10"], ["5", "8-10"], ["5", "8-10"], ["5", "8-10"], ["5", "8-10"]]
  }, { quando: ORA, uid: "u1" });
  assert.equal(aggiornata.ok, true, aggiornata.motivo);
  const dopoAggiorna = elencoCustom(aggiornata.dati);
  assert.equal(dopoAggiorna.length, 1, "aggiornare non aggiunge voci");
  assert.equal(copiaCella(dopoAggiorna[0], 1, 0), "5");

  const copiata = cambiaProgressioni(aggiornata.dati, {
    idProgramma: "prg177", azione: "crea", nome: "Mia più", da: "pc-1",
    coppie: [["6", "8-10"], ["6", "8-10"], ["6", "8-10"], ["6", "8-10"], ["6", "8-10"], ["6", "8-10"], ["6", "8-10"], ["6", "8-10"]]
  }, { quando: "2026-11-27T12:31:00.000Z", uid: "u1" });
  assert.equal(copiata.ok, true, copiata.motivo);
  const dopoCopia = elencoCustom(copiata.dati);
  assert.equal(dopoCopia.length, 2, "«Salva come» aggiunge una voce");
  assert.equal(dopoCopia[0].nome, "Mia", "l'originale c'è ancora");
  assert.equal(copiaCella(dopoCopia[0], 1, 0), "5", "l'originale tiene le sue modifiche, non quelle della copia");
  assert.equal(dopoCopia[1].nome, "Mia più");
  assert.equal(copiaCella(dopoCopia[1], 1, 0), "6", "la copia porta le modifiche nuove");
  /* Le formule del v31 non sono state toccate: sono costanti. */
  assert.equal(PROG.length, 21);
  assert.equal(typeof PROGRULE["volume-progression"], "function");
});

function copiaCella(custom, settimana, k) {
  const coppie = coppieCustom(custom);
  return coppie[settimana - 1][k];
}

test("177.6 nel pannello «Applica progressione» il tasto è «Modifica», non «Duplica»", () => {
  const s = paginaVera();
  const riga = s.contenitore.querySelector(".p8-r");
  riga.querySelector("button.btn-prog").click();
  const pannello = s.doc.querySelector(".prog-panel:not([data-progp])");
  assert.ok(pannello, "il pannello si apre");
  const voci = Array.from(pannello.querySelectorAll(".prog-row"));
  assert.equal(voci.length, PROG.length, "le ventuno formule della riga");
  const doppia = voci.filter((r) => String(r.textContent || "").indexOf("Doppia progressione") !== -1)[0];
  assert.ok(doppia, "la voce Doppia progressione c'è");
  assert.ok(tastoIn(doppia, "Modifica"), "ogni voce si modifica");
  assert.equal(tastoIn(doppia, "Duplica"), null, "«Duplica» non c'è più");
});

/* ======================================================================== */
/* 2. DESCR. / SETUP                                                        */
/* ======================================================================== */

test("177.7 la cella Descr./Setup si apre e si scrive, e salva sull'esercizio giusto", async () => {
  const s = paginaVera();
  const cella = cellaNota(s, "Panca piana");
  assert.ok(cella, "la cella Descr./Setup della riga c'è");
  assert.equal(cella.getAttribute("contenteditable"), "true", "la cella si può scrivere: non è più un testo e basta");
  assert.equal(cella.getAttribute("data-campo"), "nota-esercizio");
  assert.equal(cella.readOnly, undefined, "non è una casella in sola lettura");

  /* Il fuoco apre la scrittura: la classe che app-v31 guarda per non
     ridisegnare la pagina mentre si scrive. */
  cella.dispatchEvent(new s.dom.window.Event("focus"));
  assert.ok(cella.classList.contains("scrittura"), "entrando nella cella si accende la scrittura");

  cella.textContent = "Impenna il petto mentre tiri";
  cella.dispatchEvent(new s.dom.window.Event("blur"));
  await giro();

  assert.equal(s.chiamate.length, 1, "una scrittura sola, uscendo dal campo");
  const richiesta = s.chiamate[0];
  assert.equal(richiesta.campo, "nota-esercizio", "il campo è la descr./setup della riga");
  assert.equal(richiesta.idEsercizio, "ex-1", "va sull'esercizio che si sta guardando");
  assert.equal(richiesta.esercizio, "Panca piana");
  assert.equal(richiesta.idScheda, "sh-A");
  assert.equal(richiesta.valore, "Impenna il petto mentre tiri");
  assert.equal(richiesta.prima, "");
});

test("177.8 il motore scrive sull'esercizio (non sulla scheda), con versione, marchio e Annulla", () => {
  const prima = schedaDoc();
  const primaJson = JSON.stringify(prima.dati.sheet.exercises[1]);
  const esito = cambiaNotaEsercizio(prima.dati, {
    idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Panca piana", valore: "Scapole in elevazione e depressione"
  }, { quando: ORA, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  assert.equal(esito.dati.versione, prima.dati.versione + 1, "la versione avanza di uno");
  assert.equal(esito.dati.modificatoInB.ultima, "nota-riga", "il marchio dice che cosa è cambiato");
  assert.equal(esito.dati.sheet.exercises[0].nota, "Scapole in elevazione e depressione", "il testo è finito sull'esercizio");
  assert.equal(esito.dati.sheet.note, "", "la nota della SCHEDA non si tocca");
  assert.equal(JSON.stringify(esito.dati.sheet.exercises[1]), primaJson, "le altre righe non si toccano");
  assert.equal(esito.voce.tipo, "nota-esercizio");
  assert.equal(esito.voce.campo, "nota-esercizio");
  assert.equal(esito.voce.idEsercizio, "ex-1");
  assert.equal(esito.voce.dopo, "Scapole in elevazione e depressione");
  assert.equal(esito.voce.prima, "");

  /* L'Annulla rimette com'era, con una voce nuova e senza cancellare niente. */
  const indietro = annullaModifica(esito.dati, esito.voce, { quando: "2026-11-27T12:32:00.000Z", uid: "u1" });
  assert.equal(indietro.ok, true, indietro.motivo);
  assert.equal(indietro.dati.sheet.exercises[0].nota, "", "l'Annulla toglie il testo scritto");
  assert.equal(indietro.dati.versione, esito.dati.versione + 1, "anche l'Annulla è una scrittura con la sua versione");
  assert.equal(String(indietro.voce.dopoTesto || ""), "nota della riga tolta");
});

test("177.9 dopo il secondo caricamento il testo c'è ancora, e le righe REC/TUT non si duplicano", async () => {
  /* La riga ha una frase di coach nel recupero: quella riga si sposta in
   * Descr./Setup ma resta della prescrizione. */
  const conFrase = esercizio("ex-1", "Panca piana", {
    nota: "",
    prescription: { sets: 4, reps: "8-10", rest: "2-3' controlla la discesa" }
  });
  const s = paginaVera({ esercizi: [conFrase, esercizio("ex-2", "Croci ai cavi", { nota: "gomiti bassi" })] });
  const cella = cellaNota(s, "Panca piana");
  assert.ok(cella, "la cella c'è");
  const spostate = cella.parentNode.querySelectorAll(".p8-note.spostata");
  assert.equal(spostate.length, 1, "la frase del recupero è una riga a parte, non dentro il campo");
  assert.ok(String(spostate[0].textContent).indexOf("REC:") === 0, "con l'etichetta REC");

  cella.textContent = "Solo la mia nota";
  cella.dispatchEvent(new s.dom.window.Event("blur"));
  await giro();
  const richiesta = s.chiamate[0];
  assert.equal(richiesta.valore, "Solo la mia nota", "si salva solo quello che è nel campo");
  assert.equal(richiesta.valore.indexOf("REC:"), -1, "la frase REC non entra nella nota: sarebbe una copia");

  /* Il secondo caricamento: il documento con la nota nuova, riletto da capo. */
  const esito = cambiaNotaEsercizio(s.documento.dati, {
    idScheda: "sh-A", idEsercizio: "ex-1", esercizio: "Panca piana", valore: richiesta.valore
  }, { quando: ORA, uid: "u1" });
  assert.equal(esito.ok, true, esito.motivo);
  const ricomposta = riepilogoProgramma(META, [], {
    schedeV2: ricostruisciSchede([{ id: ID_DOC, dati: esito.dati }]), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 27)), quante: 8
  });
  const s2 = paginaVera({ schedeV2: null, esercizi: null });
  renderProgramma(s2.doc, s2.contenitore, { presente: true, numeroSedute: 0 }, Object.assign(ricomposta, {
    modifica: { attivo: true, annullabile: false, onCambia: () => Promise.resolve({ ok: true }) },
    progressioni: { id: "program-v2-meta-prg177", custom: [] }
  }));
  const cellaDopo = cellaNota(s2, "Panca piana");
  assert.ok(cellaDopo, "dopo il secondo caricamento la cella c'è");
  assert.equal(String(cellaDopo.textContent || ""), "Solo la mia nota", "il testo è tornato dal documento");
});

test("177.10 Invio va a capo, Ctrl+Invio salva; Esc rimette com'era", async () => {
  const s = paginaVera({ nota: "prima riga" });
  const cella = cellaNota(s, "Panca piana");
  cella.dispatchEvent(new s.dom.window.Event("focus"));
  cella.textContent = "prima riga";
  const invio = new s.dom.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
  cella.dispatchEvent(invio);
  assert.equal(invio.defaultPrevented, true, "Invio da solo non chiude il campo: va a capo");
  assert.equal(s.chiamate.length, 0, "e non salva niente");

  cella.textContent = "prima riga modificata";
  const ctrlInvio = new s.dom.window.KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true, cancelable: true });
  cella.dispatchEvent(ctrlInvio);
  assert.equal(ctrlInvio.defaultPrevented, true, "Ctrl+Invio chiude il campo (il salvataggio parte dall'uscita)");
  /* In jsdom `blur()` non muove il fuoco: l'uscita si simula con l'evento che
   * il browser manda da solo quando il campo perde il fuoco. */
  cella.dispatchEvent(new s.dom.window.Event("blur"));
  await giro();
  assert.equal(s.chiamate.length, 1, "e uscendo dal campo salva la nota");
  assert.equal(s.chiamate[0].valore, "prima riga modificata");

  const s2 = paginaVera({ nota: "prima riga" });
  const cella2 = cellaNota(s2, "Panca piana");
  cella2.dispatchEvent(new s2.dom.window.Event("focus"));
  cella2.textContent = "rovinata";
  cella2.dispatchEvent(new s2.dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  assert.equal(String(cella2.textContent || ""), "prima riga", "Esc rimette il testo di prima");
  assert.equal(s2.chiamate.length, 0, "e non scrive niente");
});

test("177.11 senza editor la colonna resta leggibile e dice dove si modifica", () => {
  const s = paginaVera({ conEditor: false });
  const cella = cellaNota(s, "Panca piana");
  assert.ok(cella, "la cella c'è anche in sola lettura");
  assert.equal(cella.getAttribute("contenteditable"), null, "in sola lettura non si scrive");
  assert.equal(cella.getAttribute("title"), "si modifica dalla scheda in Programma",
    "e lo dice: " + cella.getAttribute("title"));
  assert.equal(s.chiamate.length, 0);
});
