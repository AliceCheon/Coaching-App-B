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
  assert.match(regolaBox[1], /height:\s*88vh/, "alta quanto lo schermo (88vh)");
  assert.match(regolaBox[1], /max-height:\s*calc\(100vh\s*-\s*48px\)/, "e non esce dallo schermo");
  assert.match(regolaBox[1], /overflow:\s*hidden/, "la scatola non scorre: scorre il corpo");
  const larghezza = /width:\s*min\((\d+)px,\s*100%\)/.exec(regolaBox[1]);
  assert.ok(larghezza, "ha una larghezza massima dichiarata");
  assert.ok(Number(larghezza[1]) >= 1000 && Number(larghezza[1]) <= 1100, "larga fino a ~1080 px: " + larghezza[1]);

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
  const prima = righeDi(doc, "uno")[0];
  assert.deepEqual(prima, ["Hip thrust Glutei", "4", "12-15", "2'"], "settimana 1, colonna del consultato");
  assert.deepEqual(tot(doc, "uno"), ["11", "3", "0,59 serie/min"], "serie della settimana 1");

  tasto(doc, 6).click();
  assert.ok(tasto(doc, 6).classList.contains("on"), "il tasto scelto si sposta");
  assert.equal(tasto(doc, 1).classList.contains("on"), false);
  assert.deepEqual(righeDi(doc, "uno")[0], ["Hip thrust Glutei", "4", "10-12", "2'"],
    "settimana 6: le ripetizioni cambiano");
  assert.deepEqual(tot(doc, "uno"), ["12", "3", "0,60 serie/min"], "e le serie pure");
  const glutei = Array.from(colonna(doc, "uno").querySelectorAll(".pc-vol"))
    .filter((v) => v.getAttribute("data-vol-distretto") === "glutei")[0];
  assert.equal(glutei.textContent, "Glutei4", "la pastiglia del distretto segue la settimana");

  /* La settimana di scarico: due serie invece di quattro, e il totale scende. */
  tasto(doc, 4).click();
  assert.deepEqual(righeDi(doc, "uno")[0], ["Hip thrust Glutei", "2", "10", "2'"], "settimana 4: scarico, due serie");
  assert.deepEqual(tot(doc, "uno"), ["9", "3", "0,62 serie/min"], "9 serie, non 11");

  /* Ogni colonna legge la SUA settimana, e la data-settimana dice quale. */
  assert.deepEqual(righeDi(doc, "due")[2], ["Panca piana Petto", "4", "8", "1'"],
    "la panca sta nella terza riga: prima ci sono gli esercizi che solo il consultato ha");
  assert.deepEqual(tot(doc, "due"), ["13", "4", "0,81 serie/min"]);
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-settimana"), "4");
  assert.match(doc.querySelector(".pc-diff-t").textContent, /settimana 4/, "il titolo delle differenze segue la settimana");
  assert.match(doc.querySelector(".pc-finestra-sotto").textContent, /Settimana 4/, "e la finestra dice cosa sta mostrando");
});

test("163.4 le tab delle schede: tutte le lettere dei due programmi, in ordine", () => {
  const { doc } = scena();
  const schede = Array.from(doc.querySelectorAll(".pc-st"));
  assert.deepEqual(schede.map((b) => b.textContent.trim()), ["A", "B", "C"],
    "le lettere presenti in almeno uno dei due programmi, in ordine alfabetico");
  assert.ok(tastoScheda(doc, "A").classList.contains("on"), "la prima è scelta");
  assert.equal(tastoScheda(doc, "A").getAttribute("aria-selected"), "true");
  assert.equal(tastoScheda(doc, "B").getAttribute("aria-selected"), "false");

  /* La scelta della scheda vale per tutte e due le colonne. */
  tastoScheda(doc, "B").click();
  assert.ok(tastoScheda(doc, "B").classList.contains("on"));
  assert.equal(tastoScheda(doc, "A").classList.contains("on"), false);
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-scheda"), "B");
  assert.match(colonna(doc, "uno").querySelector(".pc-col-scheda").textContent, /^Scheda B — Spinta$/);
  assert.match(doc.querySelector(".pc-finestra-sotto").textContent, /Scheda B/);

  /* La scheda scelta resta scegliendo un'altra settimana. */
  tasto(doc, 3).click();
  assert.ok(tastoScheda(doc, "B").classList.contains("on"), "cambiando settimana la scheda non si perde");
  assert.equal(tastoScheda(doc, "A").getAttribute("aria-selected"), "false");

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
  assert.equal(sinistra.length, 4, "hip thrust + leg curl (suo), poi panca e lat machine (solo dell'altro)");
  assert.deepEqual(nomi(doc, "uno"), ["Hip thrust Glutei", "Leg curl Femorali", "—", "—"],
    "prima gli esercizi della colonna di sinistra, nel loro ordine, poi i trattini");
  assert.deepEqual(nomi(doc, "due"), ["—", "Leg curl Femorali", "Panca piana Petto", "Lat machine Dorsali"],
    "e dall'altra parte i trattini su quelli che non ci sono");

  /* L'esercizio in comune sta sulla stessa riga, con i valori di ognuno. */
  assert.deepEqual(sinistra[1], ["Leg curl Femorali", "3", "10-12", "90\""]);
  assert.deepEqual(destra[1], ["Leg curl Femorali", "3", "12", "90\""]);
  assert.equal(sinistra[0][1], "4");
  assert.equal(destra[0][1], "", "dove l'esercizio non c'è, la casella resta vuota");

  /* Le colonne della tabella: esercizio (col distretto sotto), serie, rip, rec. */
  const intestazioni = Array.from(colonna(doc, "uno").querySelectorAll("thead th")).map((th) => th.textContent);
  assert.deepEqual(intestazioni, ["Esercizio", "Serie", "Rip.", "Rec."]);
  const cella = colonna(doc, "uno").querySelector("tbody td.pc-nome");
  assert.equal(cella.querySelector("b").textContent, "Hip thrust", "il nome in chiaro");
  assert.equal(cella.querySelector("small").textContent, "Glutei", "il distretto su una riga piccola sotto");

  /* Le due tabelle restano allineate: le righe hanno la stessa altezza fissa. */
  const regola = /\.pc-col-tab td\{([^}]*)\}/.exec(css);
  assert.ok(regola, "la regola delle celle c'è");
  assert.match(regola[1], /height:\s*34px/, "righe di altezza fissa: le due colonne non scivolano");
});

test("163.7 i distretti di un programma solo: «non registrato», mai zero", () => {
  const { doc } = scena();
  const petto = rigaDiff(doc, "petto");
  assert.equal(petto.getAttribute("data-genere"), "confronto");
  assert.equal(petto.querySelector(".pc-d1").textContent, "4");
  assert.equal(petto.querySelector(".pc-d2").textContent, "5");
  assert.equal(petto.querySelector(".pc-delta").textContent, "\u22121", "4 − 5: qui se ne fanno una in meno");
  assert.match(petto.querySelector(".pc-delta").className, /giu/, "e in rosso");

  [["glutei", "4"]].forEach(([d, valore]) => {
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

  /* I femorali ci sono da tutte e due le parti: stessa cifra, Δ «=». */
  const femorali = rigaDiff(doc, "femorali");
  assert.equal(femorali.getAttribute("data-genere"), "confronto");
  assert.equal(femorali.querySelector(".pc-delta").textContent, "=");
  assert.match(femorali.querySelector(".pc-delta").className, /pari/);

  /* Il verde quando il consultato ne ha di più: settimana 8, petto 4 contro 3. */
  tasto(doc, 8).click();
  const pettoOtto = rigaDiff(doc, "petto");
  assert.equal(pettoOtto.querySelector(".pc-delta").textContent, "+1");
  assert.match(pettoOtto.querySelector(".pc-delta").className, /su/, "in verde");
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
  assert.equal(tot(scenaBuco.doc, "due")[2], "0,82 serie/min", "l'altro programma la densità ce l'ha");
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
