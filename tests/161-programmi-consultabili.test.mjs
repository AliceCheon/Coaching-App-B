/* Guardia 161 (passo 42): un programma si guarda senza attivarlo, e due
 * programmi si confrontano solo su grandezze che stanno nei dati.
 *
 *  161.1  il modello di sola lettura: nome, periodo, fase, rotazione, schede
 *         con esercizi, serie, ripetizioni e recuperi veri
 *  161.2  le grandezze: volume per distretto, esercizi, schede, densità dai
 *         recuperi scritti (formula dichiarata)
 *  161.3  se i recuperi mancano la densità NON si calcola: si dice perché
 *  161.4  il confronto: solo valori presenti, variazione % dove ci sono
 *         entrambi, «intensità di carico» dichiarata non disponibile
 *  161.5  dal pannello «Cambia» l'archiviato ha «Guarda», che apre la vista e
 *         non attiva niente; dall'Archivio la stessa cosa
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";
import {
  modelloConsultabile, grandezzeProgramma, confrontoProgrammi,
  secondiRecupero, variazionePct, FORMULA_DENSITA, MOTIVO_CARICO
} from "../comune/programma-consultabile.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { elencoArchivio, renderArchivio } from "../comune/vista-archivio.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const sett = (sets, sec) => Array.from({ length: 8 }, (_, i) => ({ week: i + 1, sets, reps: "10", rest: sec == null ? {} : { seconds: sec }, type: "normal", note: "", source: "manual" }));
const ESE = (nome, muscolo, serie, sec) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: { sets: serie, reps: { label: "10" } },
  progression: { weeks: sett(serie, sec) }
});
const foglio = (programId, code, nome, esercizi) => ({ id: "program-v2-sheet-" + programId + "__sh-" + code,
  dati: { programId, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code, name: nome, exercises: esercizi } } });

const VECCHIO = { id: "prg-vecchio", name: "Blocco_autunno", status: "archived", phase: "Forza",
  startDate: "2026-06-01", durationWeeks: 8, daysPerWeek: 1, rotation: ["A"], createdAt: "2026-05-20T09:00:00.000Z" };
const IN_USO = { id: "prg-uso", name: "Intensita_ottobre", status: "active", active: true, phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 1, rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z" };

const DOCS = [
  foglio("prg-vecchio", "A", "Spinta", [ESE("panca_piana", "petto", 4, 90), ESE("rematore_bilanciere", "dorsali", 3, 120)]),
  foglio("prg-uso", "A", "Spinta", [ESE("panca_piana", "petto", 5, 60)])
];
const SCHEDE = ricostruisciSchede(DOCS);

test("161.1 il modello di sola lettura legge i dati veri", () => {
  const gruppo = SCHEDE.perProgramma["prg-vecchio"];
  const m = modelloConsultabile(VECCHIO, gruppo);
  assert.equal(m.nome, "Blocco_autunno", "il nome è il valore vero (la vista lo pulisce)");
  assert.equal(m.periodo, "01/06/2026 · 8 settimane");
  assert.equal(m.fase, "Forza");
  assert.equal(m.rotazione, "A");
  assert.equal(m.numeroSchede, 1);
  assert.equal(m.numeroEsercizi, 2);
  const scheda = m.schede[0];
  assert.equal(scheda.codice, "A");
  assert.equal(scheda.nome, "Spinta");
  const panca = scheda.esercizi.filter((e) => e.nome === "panca_piana")[0];
  /* Passo 44: l'etichetta del distretto è normalizzata («petto» → «Pettorali»);
   * il muscolo com'è scritto resta in `muscolo`, così non si perde niente. */
  assert.equal(panca.distretto, "Pettorali");
  assert.equal(panca.muscolo, "petto");
  assert.equal(panca.serie, "4");
  assert.equal(panca.ripetizioni, "10");
  assert.equal(panca.recupero, "90\"");
});

test("161.2 le grandezze: volume, esercizi, schede, densità con la formula", () => {
  const g = grandezzeProgramma(SCHEDE.perProgramma["prg-vecchio"]);
  assert.equal(g.schede, 1);
  assert.equal(g.esercizi, 2);
  assert.equal(g.serieSettimana, 7, "4 + 3 serie della settimana 1");
  const petto = g.volume.filter((v) => v.distretto === "Pettorali")[0];
  const dorsali = g.volume.filter((v) => v.distretto === "Dorsali")[0];
  assert.equal(petto.serie, 4);
  assert.equal(dorsali.serie, 3);
  /* minuti di recupero: 4×90" + 3×120" = 720" = 12 min; densità 7/12 */
  assert.equal(g.minutiRecupero, 12);
  assert.equal(g.densita, 0.58);
  assert.match(FORMULA_DENSITA, /serie programmate/);
  assert.match(FORMULA_DENSITA, /60/);
});

test("161.3 se i recuperi mancano la densità non si calcola, e non vale zero", () => {
  const docs = [foglio("prg-buco", "A", "Spinta", [ESE("panca_piana", "petto", 4, 90), ESE("lento_avanti", "spalle", 3, null)])];
  const gruppo = ricostruisciSchede(docs).perProgramma["prg-buco"];
  const g = grandezzeProgramma(gruppo);
  assert.equal(g.densita, null, "niente densità quando un recupero non c'è");
  assert.equal(g.minutiRecupero, 6, "i minuti si contano solo dove il recupero è scritto");
  assert.match(g.motivoDensita, /recupero non scritto in 1 esercizio/);
  assert.match(g.motivoDensita, /scheda A: 1/);
  assert.equal(g.recuperiMancanti, 1);
});

test("161.4 il confronto: solo grandezze vere, variazione dove c'è, carico dichiarato", () => {
  const uno = grandezzeProgramma(SCHEDE.perProgramma["prg-vecchio"]);
  const due = grandezzeProgramma(SCHEDE.perProgramma["prg-uso"]);
  const c = confrontoProgrammi(uno, due, { nomeUno: "Blocco_autunno", nomeDue: "Intensita_ottobre" });
  const riga = (chiave) => c.righe.filter((r) => r.chiave === chiave)[0];
  assert.equal(riga("schede").uno, 1);
  assert.equal(riga("schede").due, 1);
  assert.equal(riga("esercizi").uno, 2);
  assert.equal(riga("esercizi").due, 1);
  assert.equal(riga("esercizi").variazione, -50, "2 → 1 è −50%");
  assert.equal(riga("serie").uno, 7);
  assert.equal(riga("serie").due, 5);
  assert.equal(riga("distretto:Pettorali").uno, 4);
  assert.equal(riga("distretto:Pettorali").due, 5);
  assert.equal(riga("distretto:Pettorali").variazione, 25, "4 → 5 è +25%");
  /* i dorsali ci sono solo nel primo: la riga resta, senza percentuale */
  const dorsali = riga("distretto:Dorsali");
  assert.equal(dorsali.genere, "solo-uno");
  assert.equal(dorsali.uno, 3);
  assert.equal(dorsali.due, null);
  assert.equal(dorsali.variazione, null);
  /* densità */
  assert.equal(riga("densita").uno, 0.58);
  assert.equal(riga("densita").due, 1);
  assert.equal(riga("densita").genere, "confronto");
  /* il carico: dichiarato non disponibile, col motivo, MAI un numero */
  const carico = riga("carico");
  assert.equal(carico.genere, "non-disponibile");
  assert.equal(carico.uno, null);
  assert.equal(carico.due, null);
  assert.match(carico.motivo, /logbook/);
  assert.match(MOTIVO_CARICO, /carichi non stanno nelle schede/);
});

test("161.5 dal pannello «Cambia» e dall'Archivio si guarda senza attivare niente", () => {
  /* --- dal pannello «Cambia» --- */
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  let attivazioni = 0;
  const mod = {
    attivo: true, annullabile: false,
    conta: () => ({ codice: "A", esercizi: 1, tecniche: 0, righe: 1, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    onAttiva: (id) => { attivazioni += 1; return Promise.resolve({ ok: true, id }); }
  };
  const programmi = [
    { id: "prg-uso", nome: "Intensita_ottobre", attivo: true, bozza: false, archiviato: false, dettaglio: "1 scheda",
      programma: IN_USO, gruppo: SCHEDE.perProgramma["prg-uso"] },
    { id: "prg-vecchio", nome: "Blocco_autunno", attivo: false, bozza: false, archiviato: true, dettaglio: "1 scheda",
      programma: VECCHIO, gruppo: SCHEDE.perProgramma["prg-vecchio"] }
  ];
  const r = riepilogoProgramma(IN_USO, [], { schedeV2: SCHEDE, indice: 0, totaleProgrammi: 2, oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#programma-attivo"), { presente: true, numeroSedute: 0 },
    Object.assign({}, r, { altriProgrammi: programmi, modifica: mod }));

  const cambia = Array.from(doc.querySelectorAll("#programma-attivo .pr-acts button")).filter((b) => b.textContent.trim() === "Cambia")[0];
  cambia.click();
  const righe = Array.from(doc.querySelectorAll(".pr-elenco-riga"));
  const guarda = Array.from(righe[1].querySelectorAll("button")).filter((b) => b.textContent.trim() === "Guarda")[0];
  assert.ok(guarda, "l'archiviato ha «Guarda»");
  assert.equal(guarda.disabled, false, "ed è acceso");
  guarda.click();

  const vista = doc.querySelector(".pc-modale");
  assert.ok(vista, "si apre la vista di sola lettura");
  assert.match(vista.textContent, /Blocco autunno/, "il nome c'è, pulito");
  assert.match(vista.textContent, /Forza/, "la fase c'è");
  assert.match(vista.textContent, /01\/06\/2026/, "il periodo c'è");
  assert.match(vista.textContent, /panca piana/i, "l'esercizio c'è, pulito");
  assert.match(vista.textContent, /Dorsali/, "il distretto c'è");
  assert.equal(attivazioni, 0, "guardare non attiva niente");
  assert.equal(doc.querySelectorAll(".pr-elenco-programmi").length, 0, "e il pannello si chiude");

  /* «Confronta con quello in uso»: apre la finestra del confronto (passo 43),
   * con dentro i due programmi veri e le differenze della settimana 1. */
  const confronta = Array.from(vista.querySelectorAll("button")).filter((b) => b.textContent.trim() === "Confronta con quello in uso")[0];
  assert.ok(confronta, "c'è il tasto del confronto");
  assert.equal(confronta.disabled, false);
  confronta.click();
  const finestra = doc.querySelector(".pc-modale-confronto");
  assert.ok(finestra, "il confronto si apre nella sua finestra");
  assert.equal(doc.querySelectorAll(".pc-modale").length, 1, "e la vista di sola lettura non resta sotto: una finestra sola");
  const corpo = finestra.querySelector(".pc-confronto");
  assert.ok(corpo, "dentro c'è il corpo del confronto");
  const testo = corpo.textContent;
  assert.match(testo, /Serie della scheda/);
  assert.match(testo, /Densità/);
  assert.match(testo, /Intensità di carico/);
  assert.match(testo, /non disponibile/);
  assert.match(testo, /logbook/);
  /* petto: 4 serie nel consultato, 5 in uso → Δ «−1»; i dorsali stanno solo nel
   * primo, quindi «non registrato», mai zero. */
  /* Passo 44: la scheda accesa è la A del consultato (panca 4) contro la A
   * dell'altro (panca 5) → Δ «−1» in rosso; i dorsali stanno solo nel secondo. */
  const petto = corpo.querySelector('[data-distretto="Pettorali"]');
  assert.ok(petto, "la riga dei pettorali c'è");
  assert.equal(petto.querySelector(".pc-d1").textContent, "4");
  assert.equal(petto.querySelector(".pc-d2").textContent, "5");
  assert.equal(petto.querySelector(".pc-delta").textContent, "\u22121", "4 − 5 = −1");
  assert.match(petto.querySelector(".pc-delta").className, /giu/, "e in rosso: qui se ne fanno meno");
  const dorsali = corpo.querySelector('[data-distretto="Dorsali"]');
  assert.equal(dorsali.querySelector(".pc-delta").textContent, "non registrato");
  assert.equal(dorsali.querySelector(".pc-d1").textContent, "3", "il valore di chi ce l'ha resta");
  assert.equal(dorsali.querySelector(".pc-d2").textContent, "\u2014", "dall'altra parte un trattino, non uno zero");

  /* --- dall'Archivio --- */
  const apri = [];
  const dom2 = new JSDOM("<!doctype html><html><body><section><table class=\"pg-tab\"><tbody id=\"c\"></tbody></table></section></body></html>");
  const doc2 = dom2.window.document;
  renderArchivio(doc2, doc2.getElementById("c"), {
    righe: elencoArchivio([VECCHIO, IN_USO], { attivoId: "prg-uso", schedeV2: SCHEDE }),
    apri: (riga) => apri.push(riga.id)
  });
  const righeTab = Array.from(doc2.querySelectorAll("tbody tr"));
  const tastiArchivio = Array.from(righeTab[0].querySelectorAll("button"));
  assert.equal(tastiArchivio.length, 0, "il programma in uso non ha «Guarda»: lo stai già guardando");
  const guardaArchivio = righeTab[1].querySelector("button");
  assert.equal(guardaArchivio.textContent.trim(), "Guarda");
  assert.equal(guardaArchivio.disabled, false, "l'archiviato si guarda dall'Archivio");
  guardaArchivio.click();
  assert.deepEqual(apri, ["prg-vecchio"], "e apre proprio quello");
  assert.ok(!doc2.body.textContent.includes("_"), "nessun trattino basso a schermo");
});

test("161.6 gli strumenti di lettura: recupero in secondi e variazione onesta", () => {
  assert.equal(secondiRecupero("90\""), 90);
  assert.equal(secondiRecupero("2'"), 120);
  assert.equal(secondiRecupero("1'30\""), 90);
  assert.equal(secondiRecupero("1,30'"), 90);
  assert.equal(secondiRecupero("180"), 180);
  assert.equal(secondiRecupero("no recupero tra le braccia"), null, "un testo libero non è un numero");
  assert.equal(variazionePct(0, 5), null, "da zero non si calcola una percentuale");
  assert.equal(variazionePct(4, 5), 25);
});

test("161.7 dal pannello «Cambia» il tasto «Confronta» apre subito il confronto", () => {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const mod = {
    attivo: true, annullabile: false,
    conta: () => ({ codice: "A", esercizi: 1, tecniche: 0, righe: 1, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    onAttiva: () => Promise.resolve({ ok: true })
  };
  const programmi = [
    { id: "prg-uso", nome: "Intensita_ottobre", attivo: true, bozza: false, archiviato: false,
      programma: IN_USO, gruppo: SCHEDE.perProgramma["prg-uso"] },
    { id: "prg-vecchio", nome: "Blocco_autunno", attivo: false, bozza: false, archiviato: true,
      programma: VECCHIO, gruppo: SCHEDE.perProgramma["prg-vecchio"] }
  ];
  const r = riepilogoProgramma(IN_USO, [], { schedeV2: SCHEDE, indice: 0, totaleProgrammi: 2, oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#programma-attivo"), { presente: true, numeroSedute: 0 },
    Object.assign({}, r, { altriProgrammi: programmi, modifica: mod }));
  const cambia = Array.from(doc.querySelectorAll("#programma-attivo .pr-acts button")).filter((b) => b.textContent.trim() === "Cambia")[0];
  cambia.click();
  const righe = Array.from(doc.querySelectorAll(".pr-elenco-riga"));
  const confronta = Array.from(righe[1].querySelectorAll("button")).filter((b) => b.textContent.trim() === "Confronta")[0];
  assert.ok(confronta, "l'archiviato ha «Confronta» nel pannello");
  assert.equal(confronta.disabled, false);
  confronta.click();
  const vista = doc.querySelector(".pc-modale");
  assert.ok(vista, "si apre la finestra");
  assert.ok(vista.classList.contains("pc-modale-confronto"), "ed è già quella del confronto, non la sola lettura");
  const corpo = vista.querySelector(".pc-confronto");
  assert.ok(corpo, "e il confronto è già disegnato");
  assert.match(corpo.textContent, /Intensità di carico/);
  assert.match(corpo.textContent, /non disponibile/);
});
