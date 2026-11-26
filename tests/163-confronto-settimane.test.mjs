/* Guardia 163 (passo 43): il confronto fra due programmi è quello del mockup
 * che Alice ha approvato — settimane cliccabili, schede vere dentro, volumi
 * della settimana scelta, differenze oneste.
 *
 *  163.1  la finestra: alta quanto lo schermo, scroll DENTRO di sé, barra delle
 *         settimane ferma in cima, la pagina sotto non si allunga
 *  163.2  tanti tasti quante sono le settimane dei due programmi (il massimo),
 *         con il range di ripetizioni o «scarico» preso dai dati
 *  163.3  cambiare settimana cambia serie, ripetizioni e volumi
 *  163.4  dentro ogni programma ci sono le schede vere, con i valori di quella
 *         settimana, e i totali (serie, esercizi, densità)
 *  163.5  i distretti di un programma solo sono «non registrato», MAI zero
 *  163.6  densità dichiarata con la formula; carico dichiarato non disponibile;
 *         se i recuperi mancano la densità non si calcola e dice la scheda
 *  163.7  la settimana di scarico viene dai dati e la settimana senza
 *         progressione è «—»
 *  163.8  si chiude con ×, Esc e clic fuori
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { modelloConsultabile, settimaneDelConfronto } from "../comune/programma-consultabile.js";
import { apriConsultabile, apriConfronto } from "../comune/vista-programma-consultabile.js";
import { renderProgramma } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const css = pagina;

/* Una progressione settimana per settimana: serie e ripetizioni scritte come
 * le scrive l'app, più il tipo (per la settimana di scarico). */
const settimane = (serie, rip, rec, tipi) => Array.from({ length: serie.length }, (_, i) => ({
  week: i + 1,
  sets: serie[i],
  reps: rip[i] == null ? "" : rip[i],
  rest: rec == null ? {} : { seconds: rec },
  type: tipi && tipi[i] ? tipi[i] : "normal",
  note: "",
  source: "manual"
}));
const ESE = (nome, muscolo, weeks) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: {
    sets: weeks[0] ? weeks[0].sets : 0,
    reps: { label: weeks[0] ? weeks[0].reps : "" },
    rest: (weeks[0] && weeks[0].rest) || {}
  },
  progression: { weeks }
});
const foglio = (pid, code, nome, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code, name: nome, exercises: esercizi } }
});

const QUESTO = { id: "prg-a", name: "Questo_programma", status: "archived", phase: "Forza",
  startDate: "2026-06-01", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"] };
const IN_USO = { id: "prg-b", name: "Quello_in_uso", status: "active", active: true, phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 1, rotation: ["A"] };

const DOCS = [
  foglio("prg-a", "A", "Gambe e glutei", [
    ESE("hip_thrust", "glutei", settimane([4, 4, 4, 2, 4, 4, 4, 4],
      ["12-15", "12-15", "12-15", "10", "12-15", "10-12", "10-12", "8"], 120,
      [0, 0, 0, "deload", 0, 0, 0, 0])),
    ESE("leg_curl", "femorali", settimane([3, 3, 3, 3, 3, 4, 4, 4],
      ["10-12", "10-12", "10-12", "10", "10-12", "10-12", "10-12", "8-10"], 90))
  ]),
  foglio("prg-a", "B", "Spinta", [
    ESE("panca_piana", "petto", settimane([4, 4, 4, 4, 4, 4, 4, 4],
      ["10", "10", "10", "10", "10", "10", "10", "10"], 90))
  ]),
  foglio("prg-b", "A", "Dorsali e spinta", [
    ESE("panca_piana", "petto", settimane([5, 5, 4, 4, 4, 4, 4, 3],
      ["8-10", "8-10", "8-10", "8", "8-10", "6-8", "6-8", "5"], 60)),
    ESE("lat_machine", "dorsali", settimane([3, 3, 3, 3, 3, 3, 3, 3],
      ["10-12", "10-12", "10-12", "10-12", "10-12", "10-12", "10-12", "10-12"], 90)),
    ESE("curl_bilanciere", "bicipiti", settimane([3, 3, 3, 3, 3, 3, 3, 3],
      ["12", "12", "12", "12", "12", "12", "12", "12"], 60))
  ])
];
const SCHEDE = ricostruisciSchede(DOCS);
const GRUPPO_A = SCHEDE.perProgramma["prg-a"];
const GRUPPO_B = SCHEDE.perProgramma["prg-b"];

/* Le prove che non leggono il CSS della pagina usano un documento nudo: è la
 * stessa finestra, ma senza i 5,6 MB di pagina attorno (e la suite respira). */
function scena(gruppoA, gruppoB, programmaA, programmaB) {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>");
  const doc = dom.window.document;
  const modale = apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(programmaA || QUESTO, gruppoA || GRUPPO_A), gruppo: gruppoA || GRUPPO_A },
    inUso: { modello: modelloConsultabile(programmaB || IN_USO, gruppoB || GRUPPO_B), gruppo: gruppoB || GRUPPO_B },
    onSalvaCome: null
  });
  return { dom, doc, modale };
}
const testoTasto = (b) => b.textContent.replace(/\s+/g, " ").trim();
const tasto = (doc, n) => doc.querySelector('.pc-sett[data-s="' + n + '"]');
const tot = (doc, quale) => Array.from(doc.querySelectorAll("." + quale + " .pc-tot .pc-tot-v")).map((v) => v.textContent.replace(/\s+/g, " ").trim());
const rigaDiff = (doc, distretto) => doc.querySelector('.pc-diff-riga[data-distretto="' + distretto + '"]');

test("163.1 la finestra scorre dentro di sé e non allunga la pagina", () => {
  /* Qui serve la pagina vera: il CSS che posiziona la finestra sta lì. */
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const modale = apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(QUESTO, GRUPPO_A), gruppo: GRUPPO_A },
    inUso: { modello: modelloConsultabile(IN_USO, GRUPPO_B), gruppo: GRUPPO_B },
    onSalvaCome: null
  });
  assert.ok(modale, "la finestra si apre");
  assert.equal(modale.parentNode, doc.body, "sta sul corpo della pagina, non dentro una carta");
  assert.match(modale.className, /pc-modale-confronto/);
  assert.equal(dom.window.getComputedStyle(modale).position, "fixed", "posizione fissa: la pagina sotto non si muove");

  const box = doc.querySelector(".pc-box-confronto");
  assert.ok(box, "la scatola del confronto c'è");
  const regolaBox = /\.pc-box-confronto\{([^}]*)\}/.exec(css);
  assert.ok(regolaBox, "la regola .pc-box-confronto c'è");
  assert.match(regolaBox[1], /height:\s*88vh/, "alta quanto lo schermo (88vh)");
  assert.match(regolaBox[1], /max-height:\s*calc\(100vh\s*-\s*48px\)/, "e non esce dallo schermo");
  assert.match(regolaBox[1], /overflow:\s*hidden/, "la scatola non scorre: scorre il corpo");
  const larghezza = /width:\s*min\((\d+)px,\s*100%\)/.exec(regolaBox[1]);
  assert.ok(larghezza, "ha una larghezza massima dichiarata");
  assert.ok(Number(larghezza[1]) >= 1000 && Number(larghezza[1]) <= 1100, "larga fino a ~1080 px: " + larghezza[1]);

  const corpo = doc.querySelector(".pc-corpo-confronto");
  const regolaCorpo = /\.pc-corpo-confronto\{([^}]*)\}/.exec(css);
  assert.match(regolaCorpo[1], /overflow:\s*auto/, "il corpo scorre dentro");
  assert.match(regolaCorpo[1], /min-height:\s*0/, "e può rimpicciolirsi: min-height 0");

  /* la barra delle settimane sta FUORI dal corpo che scorre: resta in cima */
  const barra = doc.querySelector(".pc-settimane");
  assert.ok(barra, "c'è la barra delle settimane");
  assert.equal(barra.parentNode, box, "la barra è nella scatola, non nel corpo");
  assert.equal(corpo.parentNode, box, "il corpo è nella scatola");
  assert.equal(barra.nextElementSibling, corpo, "la barra viene prima del corpo: scorrendo non si muove");
  assert.equal(corpo.querySelector(".pc-settimane"), null, "e non è dentro la parte che scorre");

  /* il piede coi tasti sta fuori anche lui */
  assert.equal(doc.querySelector(".pc-piede").parentNode, box);
});

test("163.1b aprendo il confronto la carta del programma non guadagna niente", () => {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const mod = {
    attivo: true, annullabile: false,
    conta: () => ({ codice: "A", esercizi: 1, tecniche: 0, righe: 1, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    onAttiva: () => Promise.resolve({ ok: true })
  };
  const programmi = [
    { id: "prg-b", nome: "Quello_in_uso", attivo: true, bozza: false, archiviato: false,
      programma: IN_USO, gruppo: GRUPPO_B },
    { id: "prg-a", nome: "Questo_programma", attivo: false, bozza: false, archiviato: true,
      programma: QUESTO, gruppo: GRUPPO_A }
  ];
  const r = riepilogoProgramma(IN_USO, [], { schedeV2: SCHEDE, indice: 0, totaleProgrammi: 2, oggi: new Date(Date.UTC(2026, 10, 26)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#programma-attivo"), { presente: true, numeroSedute: 0 },
    Object.assign({}, r, { altriProgrammi: programmi, modifica: mod }));
  const carta = doc.querySelector("#programma-attivo");
  const figliPrima = carta.children.length;
  const altezzaPrima = doc.body.children.length;

  const cambia = Array.from(carta.querySelectorAll(".pr-acts button")).filter((b) => b.textContent.trim() === "Cambia")[0];
  cambia.click();
  const righe = Array.from(doc.querySelectorAll(".pr-elenco-riga"));
  const confronta = Array.from(righe[1].querySelectorAll("button")).filter((b) => b.textContent.trim() === "Confronta")[0];
  confronta.click();

  assert.ok(doc.querySelector(".pc-modale-confronto"), "il confronto si apre dal pannello");
  assert.equal(carta.children.length, figliPrima, "la carta del programma non guadagna figli");
  assert.equal(doc.body.children.length, altezzaPrima + 1, "sul corpo c'è solo la finestra in più");
});

test("163.2 i tasti delle settimane: il massimo fra i due programmi, col range o «scarico»", () => {
  const { doc } = scena();
  const tasti = Array.from(doc.querySelectorAll(".pc-sett"));
  assert.equal(tasti.length, 8, "il caso normale: otto tasti");
  assert.deepEqual(tasti.map(testoTasto),
    ["S1 8-15", "S2 8-15", "S3 8-15", "S4 scarico", "S5 8-15", "S6 6-12", "S7 6-12", "S8 5-12"],
    "ogni tasto dice il numero e il range di ripetizioni scritto in quella settimana; S4 è scarico nei dati");
  assert.ok(tasto(doc, 1).classList.contains("on"), "il tasto scelto è evidenziato");
  assert.equal(tasto(doc, 1).getAttribute("aria-selected"), "true");
  assert.ok(!tasto(doc, 2).classList.contains("on"));

  /* Dieci settimane: devono comparire tutte e dieci. */
  const lungo = { id: "prg-lungo", name: "Dieci_settimane", status: "archived", startDate: "2026-01-05", durationWeeks: 10 };
  const docsLungo = [foglio("prg-lungo", "A", "Lunga", [
    ESE("squat", "quadricipiti", settimane([4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      ["10", "10", "10", "10", "10", "10", "10", "8", "8", "6"], 120))
  ])];
  const gruppoLungo = ricostruisciSchede(docsLungo).perProgramma["prg-lungo"];
  const dieci = scena(gruppoLungo, GRUPPO_B, lungo, IN_USO);
  assert.equal(dieci.doc.querySelectorAll(".pc-sett").length, 10, "dieci settimane nei dati: dieci tasti");
  assert.equal(testoTasto(tasto(dieci.doc, 10)), "S10 6", "e il decimo c'è: solo quel programma scrive la decima settimana, e dice le sue ripetizioni");

  /* Il conto è il massimo fra i due: dieci anche se l'altro ne ha otto. */
  const tastiDue = settimaneDelConfronto([gruppoLungo, GRUPPO_B], { durate: [10, 8] });
  assert.equal(tastiDue.length, 10, "il massimo fra i due programmi");
});

test("163.3 cambiare settimana cambia serie, ripetizioni e volumi", () => {
  const { doc } = scena();
  const primaRigaA = () => Array.from(doc.querySelectorAll(".pc-programma-a tbody tr")[0].children).map((td) => td.textContent);
  assert.deepEqual(primaRigaA(), ["Hip thrust", "Glutei", "4", "12-15", "2'"], "settimana 1");
  assert.deepEqual(tot(doc, "pc-programma-a"), ["11", "3", "0,59 serie/min"], "serie della settimana 1");

  tasto(doc, 6).click();
  assert.ok(tasto(doc, 6).classList.contains("on"), "il tasto scelto si sposta");
  assert.equal(tasto(doc, 1).classList.contains("on"), false);
  assert.deepEqual(primaRigaA(), ["Hip thrust", "Glutei", "4", "10-12", "2'"], "settimana 6: le ripetizioni cambiano");
  assert.deepEqual(tot(doc, "pc-programma-a"), ["12", "3", "0,60 serie/min"], "e le serie pure");
  const glutei = Array.from(doc.querySelectorAll(".pc-programma-a .pc-vol")).filter((v) => v.getAttribute("data-vol-distretto") === "glutei")[0];
  assert.equal(glutei.textContent, "Glutei4", "la pastiglia del distretto segue la settimana");

  /* La settimana di scarico: due serie invece di quattro, e il totale scende. */
  tasto(doc, 4).click();
  assert.deepEqual(primaRigaA(), ["Hip thrust", "Glutei", "2", "10", "2'"], "settimana 4: scarico, due serie");
  assert.deepEqual(tot(doc, "pc-programma-a"), ["9", "3", "0,62 serie/min"], "9 serie, non 11");

  /* Ogni programma mostra la SUA settimana. */
  assert.deepEqual(Array.from(doc.querySelectorAll(".pc-programma-b tbody tr")[0].children).map((td) => td.textContent),
    ["Panca piana", "Petto", "4", "8", "1'"], "il programma in uso legge la settimana 4 nei suoi dati");
  assert.deepEqual(tot(doc, "pc-programma-b"), ["10", "3", "0,87 serie/min"]);
  assert.match(doc.querySelector(".pc-diff-t").textContent, /settimana 4/, "il titolo delle differenze segue la settimana");
});

test("163.4 le schede vere dentro il confronto, con i totali", () => {
  const { doc } = scena();
  const schede = Array.from(doc.querySelectorAll(".pc-programma-a .pc-scheda"));
  assert.equal(schede.length, 2, "le due schede del programma consultato, una sotto l'altra");
  assert.equal(schede[0].querySelector(".pc-scheda-t").textContent, "Scheda A — Gambe e glutei", "titolo con la lettera e il nome");
  assert.equal(schede[1].querySelector(".pc-scheda-t").textContent, "Scheda B — Spinta");
  const intestazioni = Array.from(schede[0].querySelectorAll("thead th")).map((th) => th.textContent);
  assert.deepEqual(intestazioni, ["Esercizio", "Distretto", "Serie", "Rip.", "Rec."], "le cinque colonne della scheda vera");
  const righe = Array.from(schede[0].querySelectorAll("tbody tr"));
  assert.equal(righe.length, 2, "una riga per esercizio");
  assert.deepEqual(Array.from(righe[1].children).map((td) => td.textContent),
    ["Leg curl", "Femorali", "3", "10-12", "90\""], "i valori sono quelli della scheda, non una media");

  const conto = doc.querySelector(".pc-programma-a .pc-p-conto").textContent;
  assert.equal(conto, "2 schede · 3 esercizi", "il conto delle schede e degli esercizi");
  const etichette = Array.from(doc.querySelectorAll(".pc-programma-a .pc-tot .pc-tot-k")).map((k) => k.textContent);
  assert.deepEqual(etichette, ["Serie a settimana", "Esercizi", "Densità"]);
});

test("163.5 i distretti di un programma solo: «non registrato», mai zero", () => {
  const { doc } = scena();
  const petto = rigaDiff(doc, "petto");
  assert.equal(petto.getAttribute("data-genere"), "confronto");
  assert.equal(petto.querySelector(".pc-d1").textContent, "4");
  assert.equal(petto.querySelector(".pc-d2").textContent, "5");
  assert.equal(petto.querySelector(".pc-delta").textContent, "\u22121", "4 − 5: qui se ne fanno una in meno");
  assert.match(petto.querySelector(".pc-delta").className, /giu/, "e in rosso");

  /* glutei e femorali stanno solo nel consultato; dorsali e bicipiti solo in uso */
  [["glutei", "4"], ["femorali", "3"]].forEach(([d, valore]) => {
    const riga = rigaDiff(doc, d);
    assert.ok(riga, "la riga di " + d + " c'è");
    assert.equal(riga.getAttribute("data-genere"), "non-registrato");
    assert.equal(riga.querySelector(".pc-d1").textContent, valore, "il valore di chi ce l'ha resta");
    assert.equal(riga.querySelector(".pc-d2").textContent, "\u2014", "dall'altra parte un trattino");
    assert.equal(riga.querySelector(".pc-delta").textContent, "non registrato", "e la differenza lo dice a parole");
    assert.ok(!/\b0\b/.test(riga.textContent), "nessuno zero inventato");
  });
  [["dorsali", "3"], ["bicipiti", "3"]].forEach(([d, valore]) => {
    const riga = rigaDiff(doc, d);
    assert.equal(riga.querySelector(".pc-d1").textContent, "\u2014");
    assert.equal(riga.querySelector(".pc-d2").textContent, valore);
    assert.equal(riga.querySelector(".pc-delta").textContent, "non registrato");
  });

  /* Il verde quando il consultato ne ha di più: settimana 8, petto 4 contro 3. */
  tasto(doc, 8).click();
  const pettoOtto = rigaDiff(doc, "petto");
  assert.equal(pettoOtto.querySelector(".pc-delta").textContent, "+1");
  assert.match(pettoOtto.querySelector(".pc-delta").className, /su/, "in verde");
});

test("163.6 densità dichiarata, carico dichiarato, e i recuperi che mancano detti per scheda", () => {
  const { doc } = scena();
  const note = doc.querySelector(".pc-note").textContent;
  assert.match(note, /Formula della densità/, "la formula è dichiarata");
  assert.match(note, /serie programmate/, "col numeratore detto");
  assert.match(note, /60/, "e il ÷ 60");
  assert.match(note, /Intensità di carico: non disponibile/, "il carico è dichiarato non disponibile");
  assert.match(note, /logbook/, "col motivo: sta nel logbook");
  assert.match(note, /settimana scelta/, "e si dice che serie e ripetizioni sono della settimana scelta");

  /* Un programma con un recupero non scritto: la densità NON si calcola e la
   * scheda è nominata, invece di contare zero. */
  const buco = { id: "prg-buco", name: "Con_un_buco", status: "archived", startDate: "2026-02-02", durationWeeks: 8 };
  const docsBuco = [foglio("prg-buco", "A", "Spinta", [
    ESE("panca_piana", "petto", settimane([4, 4, 4, 4, 4, 4, 4, 4], ["10", "10", "10", "10", "10", "10", "10", "10"], 90)),
    ESE("lento_avanti", "spalle", settimane([3, 3, 3, 3, 3, 3, 3, 3], ["10", "10", "10", "10", "10", "10", "10", "10"], null))
  ])];
  const gruppoBuco = ricostruisciSchede(docsBuco).perProgramma["prg-buco"];
  const scenaBuco = scena(gruppoBuco, GRUPPO_B, buco, IN_USO);
  const valoriBuco = tot(scenaBuco.doc, "pc-programma-a");
  assert.equal(valoriBuco[2], "non calcolabile", "densità non calcolabile, non zero");
  const noteBuco = scenaBuco.doc.querySelector(".pc-note").textContent;
  assert.match(noteBuco, /recupero non scritto in 1 esercizio/, "il motivo dice quanti esercizi");
  assert.match(noteBuco, /scheda A: 1/, "e in quale scheda");
  /* Il secondo programma, che i recuperi li ha, la densità ce l'ha. */
  assert.equal(tot(scenaBuco.doc, "pc-programma-b")[2], "0,88 serie/min");
});

test("163.7 la settimana di scarico e la settimana senza progressione", () => {
  const { doc } = scena();
  assert.equal(testoTasto(tasto(doc, 4)), "S4 scarico", "lo scarico viene dal tipo scritto nei dati");
  assert.match(tasto(doc, 4).getAttribute("title"), /segnata come scarico nei dati/, "e il tasto lo spiega");
  assert.equal(testoTasto(tasto(doc, 6)), "S6 6-12", "le altre dicono il range, non «scarico»");

  /* Un esercizio che scrive solo due settimane: alla decima la riga è «—». */
  const corto = { id: "prg-corto", name: "Corto", status: "archived", startDate: "2026-03-02", durationWeeks: 10 };
  const docsCorto = [foglio("prg-corto", "A", "Corta", [
    ESE("squat", "quadricipiti", settimane([4, 4], ["10", "10"], 120))
  ])];
  const gruppoCorto = ricostruisciSchede(docsCorto).perProgramma["prg-corto"];
  const scenaCorta = scena(gruppoCorto, GRUPPO_B, corto, IN_USO);
  scenaCorta.doc.querySelector('.pc-sett[data-s="10"]').click();
  const riga = Array.from(scenaCorta.doc.querySelectorAll(".pc-programma-a tbody tr")[0].children).map((td) => td.textContent);
  assert.deepEqual(riga, ["Squat", "Quadricipiti", "\u2014", "\u2014", "2'"],
    "serie e ripetizioni non scritte: «—», e il recupero resta quello dell'esercizio");
  assert.ok(!/0/.test(riga[2] + riga[3]), "mai uno zero al posto di un dato che non c'è");
  /* Il tasto della decima non inventa un range: mostra solo il numero. */
  assert.equal(testoTasto(scenaCorta.doc.querySelector('.pc-sett[data-s="10"]')), "S10",
    "senza ripetizioni deducibili il tasto dice solo il numero");
});

test("163.8 si chiude con ×, con Esc e col clic fuori", () => {
  /* × */
  const uno = scena();
  uno.doc.querySelector(".pc-finestra-x").click();
  assert.equal(uno.doc.querySelectorAll(".pc-modale").length, 0, "il × chiude la finestra");

  /* Esc */
  const due = scena();
  due.doc.dispatchEvent(new due.dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(due.doc.querySelectorAll(".pc-modale").length, 0, "Esc chiude la finestra");

  /* clic fuori */
  const tre = scena();
  tre.modale.click();
  assert.equal(tre.doc.querySelectorAll(".pc-modale").length, 0, "il clic sullo sfondo chiude la finestra");

  /* e «Chiudi» */
  const quattro = scena();
  const chiudi = Array.from(quattro.doc.querySelectorAll(".pc-piede button")).filter((b) => b.textContent.trim() === "Chiudi")[0];
  assert.ok(chiudi, "il piede ha «Chiudi»");
  chiudi.click();
  assert.equal(quattro.doc.querySelectorAll(".pc-modale").length, 0, "«Chiudi» chiude la finestra");

  /* Dentro la finestra restano i due tasti che c'erano già. */
  const cinque = scena();
  const tasti = Array.from(cinque.doc.querySelectorAll(".pc-piede button")).map((b) => b.textContent.trim());
  assert.deepEqual(tasti, ["Chiudi", "Salva come nuovo programma"]);
});
