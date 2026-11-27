/* Guardia 149 (passo 18): nessun numero fisso si presenta come dato di oggi.
 *
 *  149.1 Dashboard «Biofeedback settimanale»: senza check-in nessuna barra, e
 *        la carta dice che il check-in di oggi non è arrivato (come la Readiness)
 *  149.2 Dashboard: un check-in di oggi disegna le cinque barre dai suoi valori,
 *        e la Readiness si accende con la stessa media
 *  149.3 un check-in vecchio porta la sua data e non diventa «di oggi»
 *  149.4 Salute & recupero: niente «21/10/2026 · 6 note», niente «/ 10», niente
 *        giudizio senza il dato; la scala 1-5 è dichiarata una volta
 *  149.5 Salute & recupero con un check-in di oggi: 5 su 5 è una barra piena
 *  149.6 checkin-b.js: un voto fuori scala o a parole non diventa un numero
 *  149.7 Overview: senza logbook né programma, al posto di 0% e 86% c'è il perché
 *  149.8 Overview: aderenza e carico dal logbook e dal programma vivi
 *  149.9 Overview: la tabella nascosta del mockup non entra più nei conti
 *  149.10 overview-vivo-b.js: i conti puri e i loro perché
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import "../comune/checkin-b.js";
import "../comune/settimana-blocco.js";
import "../comune/overview-vivo-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const K = globalThis.BDCheckinB;
const OV = globalThis.BDOverviewB;
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const MODULI = ["peso-b", "settimana-blocco", "checkin-b", "overview-vivo-b"];

function pagina() {
  let html = sorgente;
  for (const m of MODULI) {
    const tag = '<script src="../comune/' + m + '.js"></script>';
    assert.ok(html.includes(tag), "la pagina non carica comune/" + m + ".js");
    html = html.replace(tag, "<script>" + readFileSync(join(radice, "comune", m + ".js"), "utf8") + "</script>");
  }
  html = html.replace(/<script[^>]*\ssrc="[^"]*"[^>]*><\/script>/g, "");
  const rumori = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => { const m = String((e && e.message) || ""); if (!/Not implemented/.test(m)) rumori.push(m); });
  const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost/desktop/index.html", virtualConsole: vc });
  return { w: dom.window, rumori };
}
const testo = (w, sel) => ((w.document.querySelector(sel) || {}).textContent || "").replace(/\s+/g, " ").trim();
const due = (n) => String(n).padStart(2, "0");
const isoDi = (d) => d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate());
const dmyDi = (d) => due(d.getDate()) + "/" + due(d.getMonth() + 1) + "/" + d.getFullYear();
const OGGI = new Date();
const giorniFa = (n) => new Date(OGGI.getFullYear(), OGGI.getMonth(), OGGI.getDate() - n);
const PIENO = { energy: 4, sleep: 5, doms: 3, stress: 2, hunger: 4 };
const aspetta = (ms) => new Promise((ok) => setTimeout(ok, ms));

test("149.1 Biofeedback senza check-in: nessuna barra, e lo dice", () => {
  const { w, rumori } = pagina();
  try {
    const carta = w.document.querySelector("[data-ck-bio-barre]").closest("article");
    assert.equal(carta.querySelectorAll(".ck-r").length, 0, "ci sono ancora barre senza check-in");
    assert.doesNotMatch(carta.textContent, /i cinque segnali di oggi/, "la carta promette ancora i segnali di oggi");
    assert.doesNotMatch(carta.textContent, /\d\/5/, "c'è ancora un voto scritto");
    assert.match(testo(w, "[data-ck-bio-sotto]"), /check-in di oggi non arrivato · scala 1-5/);
    assert.match(testo(w, "[data-ck-bio-perche]"), /non è arrivato: nella zona B non ci sono ancora check-in, arriveranno dal telefono/);
    assert.equal(w.document.querySelector("[data-ck-bio-vuoto]").hidden, false);
    /* e la Readiness dice la stessa cosa: la pagina non si contraddice */
    assert.equal(testo(w, ".ck-gauge-num"), "—");
    assert.match(testo(w, ".ck-ready .ck-frase"), /non è stato letto/);
    assert.equal(w.document.querySelector(".ck-anello-valore").getAttribute("stroke-dasharray").split(" ")[0], "0.0", "l'anello resta disegnato al 72% del mockup");
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("149.2 un check-in di oggi disegna le barre dai suoi valori e accende la Readiness", () => {
  const { w, rumori } = pagina();
  try {
    w.BDCK_PITTA(K.leggiCheckin({ checkin: { date: isoDi(OGGI), wellness: { energy: 2, sleep: 3, doms: 5, stress: 1, hunger: 4 } } }));
    const barre = w.document.querySelector("[data-ck-bio-barre]");
    assert.equal(barre.hidden, false);
    assert.equal(w.document.querySelector("[data-ck-bio-vuoto]").hidden, true);
    const righe = [...barre.querySelectorAll(".ck-r")].map((r) => [r.querySelector(".ck-rn").textContent, r.querySelector(".ck-rv").textContent, r.querySelector("i").style.width]);
    assert.deepEqual(righe, [
      ["DOMS", "5/5", "100%"], ["Stress", "1/5", "20%"],
      ["Energia", "2/5", "40%"], ["Sonno", "3/5", "60%"], ["Fame", "4/5", "80%"]
    ]);
    assert.match(testo(w, "[data-ck-bio-sotto]"), /^check-in di oggi · scala 1-5$/);
    /* media 3/5 = 60 */
    assert.equal(testo(w, ".ck-gauge-num"), "60");
    assert.match(testo(w, ".ck-ready-testa h3"), /60\/100/);
    const chips = [...w.document.querySelectorAll(".ck-ready .ck-chip b")].map((b) => b.textContent);
    assert.deepEqual(chips, ["2/5", "3/5", "5/5", "1/5", "4/5"]);
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("149.3 un check-in vecchio porta la sua data e non diventa «di oggi»", () => {
  const { w } = pagina();
  try {
    w.BDCK_PITTA(K.leggiCheckin({ checkin: { date: "2026-10-21", wellness: PIENO }, oggi: isoDi(OGGI) }));
    const sotto = testo(w, "[data-ck-bio-sotto]");
    assert.match(sotto, /ultimo check-in del 21\/10\/2026, non di oggi/);
    assert.doesNotMatch(sotto, /^check-in di oggi/);
    assert.match(testo(w, "[data-ck-bio-barre]"), /non di oggi/, "sotto le barre manca la data vera");
    /* la Readiness non usa un check-in vecchio come se fosse di oggi */
    assert.equal(testo(w, ".ck-gauge-num"), "—");
    assert.match(testo(w, ".ck-ready .ck-frase"), /l'ultimo è del 21\/10\/2026 e non lo uso come se fosse di oggi/);
    assert.deepEqual([...w.document.querySelectorAll(".ck-ready .ck-chip b")].map((b) => b.textContent), ["—", "—", "—", "—", "—"]);
    /* Salute & recupero: il titolo non dice «di oggi» */
    assert.match(testo(w, "[data-sr-ck-tit]"), /^Ultimo check-in del 21\/10\/2026, non di oggi$/);
    assert.match(testo(w, '[data-sr-i="sleep"] i'), /dal check-in del 21\/10\/2026/);
  } finally { w.close(); }
});

test("149.4 Salute & recupero: niente valori fissi, una scala sola, nessun giudizio senza dato", () => {
  const s = sorgente.slice(sorgente.indexOf('id="pag-salute-recupero"'), sorgente.indexOf('id="pag-misure"'));
  assert.doesNotMatch(s, /ultimo check-in 21\/10\/2026/, "l'intestazione è ancora fissa");
  assert.doesNotMatch(s, /6 note di diario/, "il numero di note è ancora scritto a mano");
  assert.doesNotMatch(s, /\/ 10</, "c'è ancora un punteggio su 10");
  assert.doesNotMatch(s, /la scala dice metà/, "c'è ancora il giudizio inventato");
  assert.doesNotMatch(s, /Energia 4 e sonno 5/, "la nota usa ancora i valori fissi");
  assert.doesNotMatch(s, /stai pagando il riposo/, "la nota giudica ancora senza dato");
  assert.doesNotMatch(s, /tostissime/, "la citazione fissa del diario è ancora lì");
  assert.doesNotMatch(s, /class="sr-m"><span>[^<]+<\/span><b>\d/, "una barra del check-in porta ancora un voto scritto");
  assert.match(s, /scala 1-5 · 5 = il massimo della voce/, "la scala non è dichiarata");
  const { w, rumori } = pagina();
  try {
    assert.match(testo(w, ".sr-who"), /check-in di oggi non arrivato · diario non ancora letto/);
    assert.match(testo(w, "[data-sr-ck-frase]"), /non è arrivato/);
    for (const k of ["energy", "sleep", "doms", "stress", "hunger"]) {
      assert.equal(testo(w, '[data-sr-m="' + k + '"] b'), "—");
      assert.equal(w.document.querySelector('[data-sr-m="' + k + '"] .sr-bar i').style.width, "0%");
    }
    for (const k of ["energy", "sleep", "doms", "stress"]) assert.equal(testo(w, '[data-sr-i="' + k + '"] b'), "—");
    /* le note del diario contano il logbook vero quando arriva */
    w.BD_LB_SEED = { fonte: "25/11/2026", sedute: [] };
    w.BD_LB._prende({ fonte: "25/11/2026", sedute: [], journal: [{ e: 3, r: 8 }, { e: 4, r: 9 }] });
    w.BD_LB.tutto();
    assert.match(testo(w, ".sr-who"), /2 note di diario/);
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("149.5 Salute & recupero con un check-in di oggi: 5 su 5 è una barra piena", () => {
  const { w } = pagina();
  try {
    w.BDCK_PITTA(K.leggiCheckin({ checkin: { date: isoDi(OGGI), wellness: PIENO } }));
    assert.equal(testo(w, '[data-sr-i="sleep"] b'), "5 / 5");
    assert.equal(testo(w, '[data-sr-i="energy"] b'), "4 / 5");
    assert.match(testo(w, '[data-sr-i="sleep"] i'), /check-in di oggi, scala 1-5/);
    assert.equal(testo(w, '[data-sr-m="sleep"] b'), "5");
    assert.equal(w.document.querySelector('[data-sr-m="sleep"] .sr-bar i').style.width, "100%");
    assert.equal(w.document.querySelector('[data-sr-m="doms"] .sr-bar i').style.width, "60%");
    assert.match(testo(w, "[data-sr-ck-tit]"), /^Check-in di oggi$/);
    assert.match(testo(w, ".sr-who"), /check-in di oggi/);
  } finally { w.close(); }
});

test("149.6 checkin-b.js: fuori scala, a parole, vuoto e errore restano senza numero", () => {
  assert.equal(K.voto(7), null);
  assert.equal(K.voto(0), null);
  assert.equal(K.voto(3.5), null);
  assert.equal(K.voto("bene"), null);
  assert.equal(K.voto("4"), 4);
  const parziale = K.leggiCheckin({ checkin: { date: "2026-11-25", wellness: { energy: 4, sleep: "bene", doms: 9 } }, oggi: "2026-11-25" });
  assert.equal(parziale.stato, "letto");
  assert.equal(parziale.registrate, 1);
  assert.equal(parziale.diOggi, true);
  assert.equal(K.media(parziale), null, "con una voce su cinque non c'è media");
  assert.match(K.testoCheckin(parziale), /1 voci su 5 \(le altre: non registrato\)/);
  assert.equal(K.leggiCheckin({ checkin: null }).stato, "vuoto");
  assert.equal(K.leggiCheckin({ checkin: { date: "2026-11-25", wellness: {} } }).stato, "vuoto");
  const err = K.leggiCheckin({ errore: "permission-denied" });
  assert.equal(err.stato, "non-letto");
  assert.match(K.testoCheckin(err), /non ho potuto leggere il check-in: permission-denied/);
  const senzaData = K.leggiCheckin({ checkin: { wellness: PIENO } });
  assert.equal(senzaData.diOggi, false, "senza data non è «di oggi»");
  assert.match(K.etichetta(senzaData), /senza data/);
  assert.equal(K.dataISO("21/10/2026"), "2026-10-21");
  assert.equal(K.media(K.leggiCheckin({ checkin: { date: "2026-11-25", wellness: PIENO } })).punteggio, 72);
});

/* Un programma vivo finto, nella forma di comune/vista-programma.js. */
function montaProgramma(w, { giorni, inizio, righe }) {
  const pa = w.document.getElementById("programma-attivo");
  const opz = ["3 gg/sett", "4 gg/sett", "5 gg/sett", "6 gg/sett"];
  pa.innerHTML =
    '<label class="pr-f"><span class="pr-lab">Data inizio</span><input class="pr-in pr-vivo" data-pr-c="programma-inizio" value="' + (inizio || "") + '"></label>' +
    '<label class="pr-f"><span class="pr-lab">Gg/sett</span><select class="pr-sel">' +
    (giorni ? "" : '<option value="">non registrato</option>') +
    opz.map((o) => '<option value="' + o + '"' + (giorni && o.startsWith(giorni + " ") ? " selected" : "") + ">" + o + "</option>").join("") +
    "</select></label>" +
    '<table class="p8-tab" data-scheda="A"><tbody>' +
    righe.map((r) => '<tr class="p8-r"><td class="c-dist"><span class="dist">' + r.dist + "</span></td>" +
      r.serie.map((v) => '<td class="c-ser"><span>' + v + '</span></td><td class="c-reps"><span>8</span></td>').join("") +
      "</tr>" + '<tr class="p8-r p8-tec"><td class="c-ser"><span>99</span></td></tr>').join("") +
    "</tbody></table>";
}

test("149.7 Overview senza dati: al posto dei numeri c'è il perché", () => {
  const { w, rumori } = pagina();
  try {
    assert.equal(testo(w, "#ov-n1"), "—", "il carico mostra ancora un numero senza programma");
    assert.equal(testo(w, "#ov-n2"), "—", "l'aderenza mostra ancora un numero senza logbook");
    assert.match(testo(w, "#ov-p1"), /non calcolabile: il programma non è ancora stato letto/);
    assert.match(testo(w, "#ov-p2"), /non calcolabile: il logbook non è ancora stato letto/);
    assert.doesNotMatch(testo(w, "#ov-sint"), /Settimana 1 del blocco/, "la settimana è ancora supposta");
    const kpiCarico = [...w.document.querySelectorAll("#ov-kpi .p7-k")].find((k) => /Carico/.test(k.textContent));
    assert.ok(kpiCarico.classList.contains("nd"));
    assert.match(kpiCarico.textContent, /—/);
    /* la zona B non copiata: lo dice con le sue parole */
    w.BD_LB_SEED = { fonte: "zona B non ancora copiata", sedute: [] };
    w.BD_LB._prende(w.BD_LB_SEED);
    w.BDOV_PITTA();
    assert.match(testo(w, "#ov-p2"), /la zona B non è ancora copiata/);
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("149.8 Overview: aderenza e carico dal logbook e dal programma vivi", async () => {
  const { w, rumori } = pagina();
  try {
    const inizio = dmyDi(giorniFa(9)); /* oggi è la settimana 2 */
    montaProgramma(w, { giorni: 4, inizio, righe: [
      { dist: "D", serie: [3, 4, 2] },
      { dist: "G", serie: [2, 4, 2] },
      { dist: "D", serie: [1, 2, 1] }
    ] });
    const sedute = [
      { id: "1", d: dmyDi(giorniFa(0)), st: "completed", ex: [] },
      { id: "2", d: dmyDi(giorniFa(3)), st: "", ex: [] },
      { id: "3", d: dmyDi(giorniFa(5)), st: "bozza", ex: [] },
      { id: "4", d: dmyDi(giorniFa(12)), st: "completed", ex: [] }
    ];
    w.BD_LB_SEED = { fonte: "oggi", sedute };
    w.BD_LB._prende(w.BD_LB_SEED);
    w.BD_LB.tutto();
    await aspetta(150);
    /* 2 sedute fatte negli ultimi 7 giorni (la bozza non conta) su 4 previste */
    assert.equal(testo(w, "#ov-n2"), "50%");
    assert.match(testo(w, "#ov-p2"), /^2 sedute su 4 previste · /);
    /* settimana 2: 10 serie; la più piena è la 2 stessa (10) -> 100% */
    assert.equal(testo(w, "#ov-n1"), "100%");
    assert.match(testo(w, "#ov-p1"), /settimana 2: 10 serie su 10/);
    assert.match(testo(w, "#ov-sint"), /^Settimana 2 del blocco · 3 esercizi su 1 scheda · ultima seduta /);
    const kpiCarico = [...w.document.querySelectorAll("#ov-kpi .p7-k")].find((k) => /Carico/.test(k.textContent));
    assert.match(kpiCarico.textContent, /10serie S2/);
    /* la riga tecnica (p8-tec) non entra nel conto: altrimenti 99 serie */
    assert.doesNotMatch(testo(w, "#ov-p1"), /99/);
    /* barre per distretto dalla S1 del programma vivo */
    assert.deepEqual([...w.document.querySelectorAll("#ov-bars .bval")].map((b) => b.textContent), ["4", "2"]);
    /* Gg/sett non registrato: si contano le sedute, la percentuale no */
    montaProgramma(w, { giorni: null, inizio, righe: [{ dist: "D", serie: [3, 4] }] });
    w.BDOV_PITTA();
    assert.equal(testo(w, "#ov-n2"), "2");
    assert.match(testo(w, "#ov-p2"), /2 sedute in 7 giorni · il programma non dichiara quanti giorni a settimana/);
    /* senza data d'inizio il carico non suppone la settimana 1 */
    montaProgramma(w, { giorni: 4, inizio: "", righe: [{ dist: "D", serie: [3, 4] }] });
    w.BDOV_PITTA();
    assert.equal(testo(w, "#ov-n1"), "—");
    assert.match(testo(w, "#ov-p1"), /manca la data d'inizio del programma/);
    /* un logbook letto ma vecchio: lo 0% è un conto vero, con la finestra scritta */
    montaProgramma(w, { giorni: 4, inizio, righe: [{ dist: "D", serie: [3, 4] }] });
    w.BD_LB_SEED = { fonte: "oggi", sedute: [{ id: "9", d: dmyDi(giorniFa(30)), st: "completed", ex: [] }] };
    w.BD_LB._prende(w.BD_LB_SEED);
    w.BDOV_PITTA();
    assert.equal(testo(w, "#ov-n2"), "0%");
    assert.match(testo(w, "#ov-p2"), /^0 sedute su 4 previste · \d\d\/\d\d\/\d{4} → /);
    assert.deepEqual(rumori, []);
  } finally { w.close(); }
});

test("149.9 Overview: la tabella nascosta del mockup non entra più nei conti", () => {
  const blocco = sorgente.slice(sorgente.indexOf("Passo 18: l'Overview conta"), sorgente.indexOf("================= RESET / BULK / CUT"));
  assert.ok(blocco.length > 100, "manca il blocco del passo 18");
  assert.doesNotMatch(blocco, /box-' \+ b|el\('box-/, "l'Overview legge ancora #box-A..D del mockup");
  assert.doesNotMatch(blocco, /var previste = 4/, "le sedute previste sono ancora un 4 fisso");
  assert.doesNotMatch(blocco, /'Settimana 1 del blocco/, "la settimana è ancora fissa");
  const { w } = pagina();
  try {
    /* la tabella nascosta c'è ancora (è del v31), ma toccarla non cambia niente */
    assert.ok(w.document.getElementById("box-A"), "la tabella del v31 dovrebbe restare nel file");
    w.BDOV_PITTA();
    assert.equal(testo(w, "#ov-n1"), "—");
    assert.equal(testo(w, "#ov-n2"), "—");
  } finally { w.close(); }
});

test("149.10 overview-vivo-b.js: i conti e i loro perché", () => {
  const oggi = new Date(2026, 10, 25);
  assert.equal(OV.aderenza({ letto: false, oggi }).stato, "non-calcolabile");
  assert.match(OV.aderenza({ letto: true, sedute: [], oggi }).motivo, /nessuna seduta/);
  assert.match(OV.aderenza({ letto: true, sedute: [{ d: "ieri" }], giorni: 4, oggi }).motivo, /data leggibile/);
  const a = OV.aderenza({ letto: true, sedute: [{ d: "25/11/2026", st: "completed" }, { d: "19/11/2026" }, { d: "18/11/2026" }], giorni: 3, oggi });
  assert.equal(a.fatte, 2, "la finestra è di 7 giorni, oggi compreso: il 18 resta fuori");
  assert.equal(a.percento, 67);
  assert.equal(a.finestra, "19/11/2026 → 25/11/2026");
  assert.equal(OV.aderenza({ letto: true, sedute: [1, 2, 3, 4, 5, 6].map((g) => ({ d: (19 + g) + "/11/2026" })), giorni: 4, oggi }).percento, 100, "oltre il previsto si ferma al 100%");
  assert.deepEqual(OV.settimanaInCorso("25/11/2026", oggi, 8).numero, 1);
  assert.deepEqual(OV.settimanaInCorso("18/11/2026", oggi, 8).numero, 2);
  assert.match(OV.settimanaInCorso("01/12/2026", oggi, 8).motivo, /comincia il 01\/12\/2026/);
  assert.match(OV.settimanaInCorso("01/01/2026", oggi, 8).motivo, /è finito/);
  assert.equal(OV.dataDMY("31/02/2026"), null);
  const c = OV.carico({ letto: true, serie: [[2, 4], [2, null]], inizio: "25/11/2026", oggi });
  assert.equal(c.percento, 100);
  assert.deepEqual(c.perSett, [4, 4]);
  assert.match(OV.carico({ letto: true, serie: [], inizio: "25/11/2026", oggi }).motivo, /non ha serie/);
  assert.match(OV.carico({ letto: true, serie: [[0, 0]], inizio: "25/11/2026", oggi }).motivo, /nessuna settimana/);
});
