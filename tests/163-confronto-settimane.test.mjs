/* Guardia 163 (passi 43 e 43c): il confronto fra due programmi — due colonne
 * affiancate, settimane e schede come tab, righe allineate.
 *
 *  163.1  la finestra: alta quanto lo schermo, scroll DENTRO di sé, le due file
 *         di tab ferme in cima, due colonne; la pagina sotto non si allunga
 *  163.2  tanti tasti quante sono le settimane dei due programmi (il massimo),
 *         con il range di ripetizioni o «scarico» preso dai dati
 *  163.3  cambiare settimana cambia serie, ripetizioni e volumi delle due colonne
 *  163.4  le tab delle schede: tutte le lettere dei due programmi, in ordine
 *  163.5  la scheda scelta vale per tutte e due le colonne, e chi non ce l'ha lo
 *         dice in chiaro invece di mostrare una tabella vuota
 *  163.6  righe allineate: un ordine unico, col trattino dove l'esercizio manca
 *  163.7  i distretti di un programma solo sono «non registrato», MAI zero
 *  163.8  densità dichiarata con la formula; carico dichiarato non disponibile;
 *         se i recuperi mancano la densità non si calcola e dice la scheda
 *  163.9  la settimana di scarico viene dai dati e la settimana senza
 *         progressione è «—»
 *  163.10 si chiude con ×, Esc e clic fuori
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
import { schedeDelConfronto, apriConfronto } from "../comune/vista-programma-consultabile.js";
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

/* Il consultato ha le schede A e B; quello in uso le schede A e C. La scheda A
 * non è la stessa cosa nei due programmi: hanno in comune solo il leg curl, così
 * le righe si allineano e i trattini si vedono. */
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
    ESE("leg_curl", "femorali", settimane([3, 3, 3, 3, 3, 3, 3, 3],
      ["12", "12", "12", "12", "12", "12", "12", "12"], 90)),
    ESE("lat_machine", "dorsali", settimane([3, 3, 3, 3, 3, 3, 3, 3],
      ["10-12", "10-12", "10-12", "10-12", "10-12", "10-12", "10-12", "10-12"], 90))
  ]),
  foglio("prg-b", "C", "Braccia", [
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
const tastoScheda = (doc, codice) => doc.querySelector('.pc-st[data-scheda="' + codice + '"]');
const colonna = (doc, quale) => doc.querySelector(".pc-col-" + (quale === "uno" ? "a" : "b"));
const righeDi = (doc, quale) => Array.from(colonna(doc, quale).querySelectorAll("tbody tr"))
  .map((tr) => Array.from(tr.children).map((td) => td.textContent.replace(/\s+/g, " ").trim()));
const nomi = (doc, quale) => righeDi(doc, quale).map((r) => r[0]);
const tot = (doc, quale) => Array.from(colonna(doc, quale).querySelectorAll(".pc-tot .pc-tot-v"))
  .map((v) => v.textContent.replace(/\s+/g, " ").trim());
const rigaDiff = (doc, distretto) => doc.querySelector('.pc-diff-riga[data-distretto="' + distretto + '"]');
const schedeAcceseDi = (doc) => {
  const corpo = doc.querySelector(".pc-confronto");
  return corpo ? corpo.getAttribute("data-schede-accese") : "";
};

test("163.1 la finestra: due file di tab ferme, due colonne, scroll dentro", () => {
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

  const regolaBox = /\.pc-box-confronto\{([^}]*)\}/.exec(css);
  assert.ok(regolaBox, "la regola .pc-box-confronto c'è");
  /* Passo 29: la finestra è 96vh e larga min(1900px, 99vw) — tutto lo schermo. */
  assert.match(regolaBox[1], /height:\s*96vh/, "alta quasi quanto lo schermo (96vh, passo 29)");
  assert.match(regolaBox[1], /max-height:\s*calc\(100vh\s*-\s*12px\)/, "e non esce dallo schermo");
  assert.match(regolaBox[1], /overflow:\s*hidden/, "la scatola non scorre: scorre il corpo");
  const larghezza = /width:\s*min\((\d+)px,\s*(\d+)vw\)/.exec(regolaBox[1]);
  assert.ok(larghezza, "ha una larghezza massima dichiarata, con un margine ai lati");
  assert.equal(Number(larghezza[1]), 1900, "larga fino a 1900 px (passo 29)");
  assert.equal(Number(larghezza[2]), 99, "e quasi tutta la larghezza dello schermo");

  const regolaCorpo = /\.pc-corpo-confronto\{([^}]*)\}/.exec(css);
  assert.match(regolaCorpo[1], /overflow:\s*auto/, "il corpo scorre dentro");
  assert.match(regolaCorpo[1], /min-height:\s*0/, "e può rimpicciolirsi: min-height 0");

  /* le due file di tab stanno FUORI dal corpo che scorre: restano in cima */
  const box = doc.querySelector(".pc-box-confronto");
  const corpo = doc.querySelector(".pc-corpo-confronto");
  const barraSett = doc.querySelector(".pc-settimane");
  const barraSchede = doc.querySelector(".pc-schede-tab");
  assert.ok(barraSett && barraSchede, "ci sono tutte e due le file di tab");
  assert.equal(barraSett.parentNode, box, "la fila delle settimane è nella scatola");
  assert.equal(barraSchede.parentNode, box, "e quella delle schede pure");
  assert.equal(barraSett.nextElementSibling, barraSchede, "le schede stanno sotto le settimane");
  assert.equal(barraSchede.nextElementSibling, corpo, "e sopra il corpo che scorre");
  assert.equal(corpo.querySelector(".pc-settimane"), null, "nessuna delle due file sta dentro la parte che scorre");

  /* le due colonne, una accanto all'altra */
  const duetto = doc.querySelector(".pc-duetto");
  assert.ok(duetto, "c'è la riga delle due colonne");
  assert.equal(duetto.children.length, 2);
  assert.ok(colonna(doc, "uno") && colonna(doc, "due"), "una colonna per programma");
  assert.match(duetto.children[0].className, /pc-col-a/);
  assert.match(duetto.children[1].className, /pc-col-b/);
  const regolaDuetto = /\.pc-duetto\{([^}]*)\}/.exec(css);
  assert.match(regolaDuetto[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/,
    "due colonne uguali, metà della finestra ciascuna");
  const doveStretto = css.indexOf("@media (max-width: 900px)");
  assert.ok(doveStretto > 0, "c'è la regola per lo schermo stretto");
  const stretto = css.slice(doveStretto, doveStretto + 260);
  assert.match(stretto, /\.pc-duetto\{grid-template-columns:minmax\(0,1fr\)\}/,
    "sotto i 900 px le colonne si mettono una sopra l'altra");

  /* l'intestazione di ogni colonna: nome, pallino e stato */
  const testaUno = colonna(doc, "uno").querySelector(".pc-col-testa");
  assert.match(testaUno.textContent, /Questo programma/, "il nome del programma in cima alla colonna");
  assert.ok(testaUno.querySelector(".pc-pallino.a"), "col pallino del suo colore");
  const testaDue = colonna(doc, "due").querySelector(".pc-col-testa");
  assert.match(testaDue.textContent, /Quello in uso/);
  assert.match(testaDue.textContent, /in uso/);
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

test("163.3 cambiare settimana cambia serie, ripetizioni e volumi delle due colonne", () => {
  const { doc } = scena();
  /* Passo 44: prima la riga dell'esercizio in comune (leg curl), poi quella
   * accoppiata per posizione: l'hip thrust è la seconda. */
  const prima = righeDi(doc, "uno")[1];
  assert.deepEqual(prima, ["Hip thrust Glutei", "4", "12-15", "2'"], "settimana 1, colonna del consultato");
  assert.deepEqual(tot(doc, "uno"), ["7", "2", "0,56 serie/min"],
    "serie, esercizi e densità della SCHEDA A (passo 44: non del programma intero)");

  tasto(doc, 6).click();
  assert.ok(tasto(doc, 6).classList.contains("on"), "il tasto scelto si sposta");
  assert.equal(tasto(doc, 1).classList.contains("on"), false);
  assert.deepEqual(righeDi(doc, "uno")[1], ["Hip thrust Glutei", "4", "10-12", "2'"],
    "settimana 6: le ripetizioni cambiano");
  assert.deepEqual(tot(doc, "uno"), ["8", "2", "0,57 serie/min"], "e le serie pure, sempre della scheda A");
  const glutei = Array.from(colonna(doc, "uno").querySelectorAll(".pc-vol"))
    .filter((v) => v.getAttribute("data-vol-distretto") === "Glutei")[0];
  assert.equal(glutei.textContent, "Glutei4", "la pastiglia del distretto segue la settimana");

  /* La settimana di scarico: due serie invece di quattro, e il totale scende. */
  tasto(doc, 4).click();
  assert.deepEqual(righeDi(doc, "uno")[1], ["Hip thrust Glutei", "2", "10", "2'"], "settimana 4: scarico, due serie");
  assert.deepEqual(tot(doc, "uno"), ["5", "2", "0,59 serie/min"], "5 serie, non 7");

  /* Ogni colonna legge la SUA settimana, e la data-settimana dice quale. */
  assert.deepEqual(righeDi(doc, "due")[2], ["Lat machine Dorsali", "3", "10-12", "90\""],
    "la lat machine avanza dall'altra scheda: sta in fondo, col trattino a sinistra");
  assert.deepEqual(tot(doc, "due"), ["10", "3", "0,77 serie/min"],
    "serie, esercizi e densità della scheda A dell'altro programma");
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-settimana"), "4");
  assert.match(doc.querySelector(".pc-vol-t").textContent, /settimana 4/, "anche il blocco Volume segue la settimana");
  assert.match(doc.querySelector(".pc-finestra-sotto").textContent, /Settimana 4/, "e la finestra dice cosa sta mostrando");
});

test("163.4 le tab delle schede: tutte le lettere dei due programmi, in ordine", () => {
  const { doc } = scena();
  const schede = Array.from(doc.querySelectorAll(".pc-st"));
  assert.deepEqual(schede.map((b) => b.textContent.trim()), ["A", "B", "C"],
    "le lettere presenti in almeno uno dei due programmi, in ordine alfabetico");
  assert.ok(tastoScheda(doc, "A").classList.contains("on"), "la prima è accesa");
  assert.equal(tastoScheda(doc, "A").getAttribute("aria-pressed"), "true");
  assert.equal(tastoScheda(doc, "B").getAttribute("aria-pressed"), "false");

  /* Passo 44: i tasti si accendono a più di una. Accendendo B, A resta accesa;
   * il confronto riga per riga passa a B (l'ultima accesa). */
  tastoScheda(doc, "B").click();
  assert.ok(tastoScheda(doc, "B").classList.contains("on"));
  assert.ok(tastoScheda(doc, "A").classList.contains("on"), "la prima resta accesa: la selezione è multipla");
  assert.equal(tastoScheda(doc, "A").getAttribute("aria-pressed"), "true");
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-scheda"), "B", "quella in confronto è l'ultima accesa");
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-scheda"), "B");
  assert.match(colonna(doc, "uno").querySelector(".pc-col-scheda").textContent, /^Scheda B — Spinta$/);
  assert.match(doc.querySelector(".pc-finestra-sotto").textContent, /Scheda B/);

  /* Spegnendo A resta B accesa (e una sola accesa = comportamento di sempre). */
  tastoScheda(doc, "A").click();
  assert.equal(tastoScheda(doc, "A").classList.contains("on"), false);
  assert.equal(schedeAcceseDi(doc), "B");

  /* La scheda scelta resta scegliendo un'altra settimana. */
  tasto(doc, 3).click();
  assert.ok(tastoScheda(doc, "B").classList.contains("on"), "cambiando settimana la scheda non si perde");

  /* L'elenco delle lettere si può calcolare anche dai soli modelli. */
  const voci = schedeDelConfronto([
    modelloConsultabile(QUESTO, GRUPPO_A), modelloConsultabile(IN_USO, GRUPPO_B)
  ]);
  assert.deepEqual(voci.map((v) => v.codice), ["A", "B", "C"]);
});

test("163.5 chi non ha la scheda lo dice in chiaro, non mostra una tabella vuota", () => {
  const { doc } = scena();
  tastoScheda(doc, "C").click();
  const uno = colonna(doc, "uno");
  assert.match(uno.textContent, /Scheda C non presente in questo programma/,
    "il consultato non ha la scheda C e lo dice");
  assert.equal(uno.querySelectorAll("table.pc-col-tab").length, 0, "senza tabella vuota");
  const due = colonna(doc, "due");
  assert.ok(due.querySelector("table.pc-col-tab"), "l'altra colonna la sua tabella ce l'ha");
  assert.deepEqual(nomi(doc, "due"), ["Curl bilanciere Bicipiti"], "e mostra i suoi esercizi");

  /* e viceversa, per la scheda B */
  tastoScheda(doc, "B").click();
  assert.ok(colonna(doc, "uno").querySelector("table.pc-col-tab"));
  assert.match(colonna(doc, "due").textContent, /Scheda B non presente in questo programma/);
});

test("163.6 le righe delle due colonne sono allineate, col trattino dove manca", () => {
  const { doc } = scena();
  const sinistra = righeDi(doc, "uno");
  const destra = righeDi(doc, "due");
  assert.equal(sinistra.length, destra.length, "stesse righe nelle due colonne");
  assert.equal(sinistra.length, 3, "leg curl in comune, hip thrust accoppiato per posizione, poi la lat machine");
  /* Passo 44: prima le coppie per nome, poi quelle per posizione (le due schede
   * hanno esercizi diversi), e il trattino solo in coda a chi avanza. */
  assert.deepEqual(nomi(doc, "uno"), ["Leg curl Femorali", "Hip thrust Glutei", "—"],
    "prima le righe presenti in entrambe le schede, poi quella che avanza dall'altra parte");
  assert.deepEqual(nomi(doc, "due"), ["Leg curl Femorali", "Panca piana Pettorali", "Lat machine Dorsali"]);

  /* L'esercizio in comune sta sulla stessa riga, con i valori di ognuno. */
  assert.deepEqual(sinistra[0], ["Leg curl Femorali", "3", "10-12", "90\""]);
  assert.deepEqual(destra[0], ["Leg curl Femorali", "3", "12", "90\""]);
  assert.equal(sinistra[1][1], "4");
  assert.equal(destra[1][1], "5", "accoppiata per posizione: ognuno ha i suoi numeri");
  assert.equal(sinistra[2][0], "\u2014", "in coda, dove l'esercizio manca davvero, il trattino");
  assert.equal(sinistra[2][1], "", "e la casella resta vuota");

  /* Le colonne della tabella: esercizio (col distretto sotto), serie, rip, rec. */
  const intestazioni = Array.from(colonna(doc, "uno").querySelectorAll("thead th")).map((th) => th.textContent);
  assert.deepEqual(intestazioni, ["Esercizio", "Serie", "Rip.", "Rec."]);
  const cella = colonna(doc, "uno").querySelector("tbody td.pc-nome");
  assert.equal(cella.querySelector("b").textContent, "Leg curl", "il nome in chiaro");
  assert.equal(cella.querySelector("small").textContent, "Femorali", "il distretto su una riga piccola sotto");

  /* Le due tabelle restano allineate: le righe hanno la stessa altezza fissa. */
  const regola = /\.pc-col-tab td\{([^}]*)\}/.exec(css);
  assert.ok(regola, "la regola delle celle c'è");
  const altezzaFissa = Number(/height:\s*(\d+)px/.exec(regola[1])[1]);
  assert.ok(altezzaFissa >= 30 && altezzaFissa <= 34,
    "righe di altezza fissa e compatte (passo 29, 30-32 px): le due colonne non scivolano — " + altezzaFissa + " px");
});

test("163.7 i distretti di un programma solo: «non registrato», mai zero", () => {
  /* Passo 28: la tabella «Differenze» non c'è più; la regola «un distretto che
   * sta da una parte sola non diventa uno zero» la dice il blocco Volume, che
   * è quello che Alice legge adesso. Le cifre qui sono le stesse del caso. */
  const { doc } = scena();
  const rigaVolume = (d) => doc.querySelector('.pc-vol2-riga[data-distretto="' + d + '"]');
  const deltaDi = (d) => rigaVolume(d).querySelector(".pc-vol2-delta");

  /* I pettorali stanno nella scheda B del consultato (non accesa): la riga
   * arriva dall'altro programma e il Δ non si calcola. */
  const petto = rigaVolume("Pettorali");
  assert.equal(petto.querySelector(".pc-vol2-nome small").textContent, "\u2013 \u2192 5",
    "il valore di chi ce l'ha resta, dall'altra parte un trattino");
  assert.equal(deltaDi("Pettorali").getAttribute("data-stato"), "nd");
  assert.equal(deltaDi("Pettorali").querySelector("b").textContent, "n.d.");
  assert.equal(deltaDi("Pettorali").querySelector("small").textContent, "manca A");

  [["Glutei", "4 \u2192 \u2013", "manca B"]].forEach(([d, valori, motivo]) => {
    assert.equal(rigaVolume(d).querySelector(".pc-vol2-nome small").textContent, valori,
      "il valore di " + d + " c'è, e solo da una parte");
    assert.equal(deltaDi(d).getAttribute("data-stato"), "nd", "il Δ non si inventa");
    assert.equal(deltaDi(d).querySelector("b").textContent, "n.d.", "e lo dice a parole");
    assert.equal(deltaDi(d).querySelector("small").textContent, motivo, "col motivo: " + motivo);
  });
  assert.equal(rigaVolume("Dorsali").querySelector(".pc-vol2-nome small").textContent, "\u2013 \u2192 3");
  assert.equal(deltaDi("Dorsali").getAttribute("data-stato"), "nd");

  /* I femorali ci sono da tutte e due le parti: stessa cifra, Δ «= 0». */
  assert.equal(rigaVolume("Femorali").querySelector(".pc-vol2-nome small").textContent, "3 \u2192 3");
  assert.equal(deltaDi("Femorali").getAttribute("data-stato"), "pari");

  /* Settimana 8: femorali 4 nel consultato e 3 in uso. Il Δ del blocco Volume
   * è «in uso meno consultato» (come nel mockup), quindi scende: −1, in rosa. */
  tasto(doc, 8).click();
  assert.equal(deltaDi("Femorali").getAttribute("data-stato"), "giu", "in rosa: l'in uso ne ha di meno");
  assert.equal(deltaDi("Femorali").querySelector("b").textContent, "\u25bc \u22121");
  assert.match(deltaDi("Femorali").className, /pc-vol2-delta/);
});

test("163.8 densità dichiarata, carico dichiarato, e i recuperi che mancano detti per scheda", () => {
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
  assert.equal(tot(scenaBuco.doc, "uno")[2], "non calcolabile", "densità non calcolabile, non zero");
  const noteBuco = scenaBuco.doc.querySelector(".pc-note").textContent;
  assert.match(noteBuco, /recupero non scritto in 1 esercizio/, "il motivo dice quanti esercizi");
  assert.match(noteBuco, /scheda A: 1/, "e in quale scheda");
  assert.equal(tot(scenaBuco.doc, "due")[2], "0,79 serie/min", "l'altro programma, nella scheda A, la densità ce l'ha");
});

test("163.9 la settimana di scarico e la settimana senza progressione", () => {
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
  assert.deepEqual(righeDi(scenaCorta.doc, "uno")[0],
    ["Squat Quadricipiti", "\u2014", "\u2014", "2'"],
    "serie e ripetizioni non scritte: «—», e il recupero resta quello dell'esercizio");
  assert.ok(!/0/.test(righeDi(scenaCorta.doc, "uno")[0].slice(1).join("")), "mai uno zero al posto di un dato che non c'è");
  assert.equal(testoTasto(scenaCorta.doc.querySelector('.pc-sett[data-s="10"]')), "S10",
    "senza ripetizioni deducibili il tasto dice solo il numero");
});

test("163.10 si chiude con ×, con Esc e col clic fuori", () => {
  const uno = scena();
  uno.doc.querySelector(".pc-finestra-x").click();
  assert.equal(uno.doc.querySelectorAll(".pc-modale").length, 0, "il × chiude la finestra");

  const due = scena();
  due.doc.dispatchEvent(new due.dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(due.doc.querySelectorAll(".pc-modale").length, 0, "Esc chiude la finestra");

  const tre = scena();
  tre.modale.click();
  assert.equal(tre.doc.querySelectorAll(".pc-modale").length, 0, "il clic sullo sfondo chiude la finestra");

  const quattro = scena();
  const chiudi = Array.from(quattro.doc.querySelectorAll(".pc-piede button")).filter((b) => b.textContent.trim() === "Chiudi")[0];
  assert.ok(chiudi, "il piede ha «Chiudi»");
  chiudi.click();
  assert.equal(quattro.doc.querySelectorAll(".pc-modale").length, 0, "«Chiudi» chiude la finestra");

  const cinque = scena();
  const tastiPiede = Array.from(cinque.doc.querySelectorAll(".pc-piede button")).map((b) => b.textContent.trim());
  assert.deepEqual(tastiPiede, ["Chiudi", "Salva come nuovo programma"]);
  assert.match(cinque.doc.querySelector(".pc-piede .pc-suggerimento").textContent, /settimana|scheda/i);
});

/* Passo 43d — quello che Alice ha visto il 26/11: un recupero lungo usciva
 * dalla colonna e finiva nella scheda accanto, e le due colonne finivano ad
 * altezze diverse. Le due cose si chiudono con lo stile e col suggerimento. */
test("163.11 il testo lungo non esce dalla colonna e le due colonne finiscono pari", () => {
  const cella = (css.match(/\.pc-col-tab \.pc-n\{[^}]*\}/) || [""])[0];
  assert.match(cella, /overflow\s*:\s*hidden/, "la casella taglia il testo che non ci sta: " + cella);
  assert.match(cella, /text-overflow\s*:\s*ellipsis/, "e lo taglia con i puntini");
  assert.match(cella, /white-space\s*:\s*nowrap/, "resta su una riga sola, così le righe delle due colonne restano allineate");
  const nome = (css.match(/\.pc-col-tab td\.pc-nome\{[^}]*\}/) || [""])[0];
  assert.match(nome, /overflow\s*:\s*hidden/, "anche la casella del nome taglia: " + nome);

  const colonna = (css.match(/\.pc-col\{[^}]*\}/) || [""])[0];
  assert.match(colonna, /display\s*:\s*flex/, "la colonna è una colonna anche nel layout: " + colonna);
  assert.match(css, /\.pc-col > \.pc-totali\{margin-top:auto\}/, "i totali si appoggiano al fondo, così le due colonne finiscono pari");

  /* e il valore intero resta leggibile nel suggerimento: un recupero scritto a
   * parole, come nei dati veri, finisce nella casella stretta */
  const conRecuperoLungo = ricostruisciSchede([
    foglio("prg-lungo", "A", "Gambe", [
      Object.assign(ESE("hip_thrust", "glutei", settimane([4], ["12-15"], null)), {
        prescription: { sets: 4, reps: { label: "12-15" }, rest: "recupero lungo in super set con 2 minuti" }
      })
    ])
  ]);
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const finestra = apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(QUESTO, conRecuperoLungo.perProgramma["prg-lungo"]), gruppo: conRecuperoLungo.perProgramma["prg-lungo"] },
    inUso: { modello: modelloConsultabile(IN_USO, GRUPPO_B), gruppo: GRUPPO_B },
    onSalvaCome: null
  });
  const conTitolo = Array.from(finestra.querySelectorAll(".pc-col-tab td.pc-n")).filter((td) => td.getAttribute("title"));
  assert.ok(conTitolo.length > 0, "le caselle con testo lungo portano il testo intero nel suggerimento");
});
