/* Guardia 169 (passo 44): il confronto schede più chiaro.
 *
 *  169.1  glutei uniti: «Gluteo medio», «gluteo piccolo» e «Glutei» contano in
 *         una riga sola, e l'etichetta sotto il nome dice «Glutei»; un muscolo
 *         che non si riconosce resta dichiarato per quello che è (mai inventato,
 *         mai buttato via)
 *  169.2  righe allineate: l'esercizio in comune sta sulla stessa riga;
 *         quelli con nomi diversi si accoppiano per posizione; il trattino solo
 *         dove davvero manca; l'ordine è coppie → solo-sinistra → solo-destra
 *  169.3  il volume è quello della SCHEDA scelta: cambiando scheda i numeri
 *         cambiano, e l'etichetta dice quale scheda e quale settimana; se la
 *         scheda non scrive quella settimana lo dichiara invece di mostrare i
 *         numeri di un'altra
 *  169.4  le schede si accendono a più di una (almeno una resta accesa), compare
 *         la vista «Volume della settimana» con una colonna per scheda accesa
 *         più il totale, e si dice in chiaro quale scheda si sta confrontando
 *  169.5  la finestra è più grande (quasi tutta la larghezza, più alta di 88vh),
 *         resta un pannello fisso con lo scorrimento dentro e la pagina sotto
 *         non si allunga; le due colonne affiancate restano
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import {
  modelloConsultabile, grandezzeProgramma, numeriDiSettimana, distrettoDiEsercizio
} from "../comune/programma-consultabile.js";
import { apriConfronto } from "../comune/vista-programma-consultabile.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const css = pagina;

/* Una progressione scritta come la scrive l'app. `quante` permette di fermarsi
 * prima: una scheda che non scrive la settimana 5 è un caso vero. */
const settimane = (serie, rip, rec, quante) => Array.from({ length: quante == null ? 8 : quante }, (_, i) => ({
  week: i + 1,
  sets: Array.isArray(serie) ? serie[i] : serie,
  reps: Array.isArray(rip) ? rip[i] : (rip == null ? "" : rip),
  rest: rec == null ? {} : { seconds: rec },
  type: "normal", note: "", source: "manual"
}));
const ESE = (nome, muscolo, serie, rip, rec, quante) => ({
  id: "ex-" + nome, name: nome, muscle: muscolo,
  prescription: {
    sets: Array.isArray(serie) ? serie[0] : serie,
    reps: { label: Array.isArray(rip) ? rip[0] : String(rip) },
    rest: rec == null ? {} : { seconds: rec }
  },
  progression: { weeks: settimane(serie, rip, rec, quante) }
});
const foglio = (pid, code, nome, esercizi) => ({
  id: "program-v2-sheet-" + pid + "__sh-" + code,
  dati: { programId: pid, sheetId: "sh-" + code, kind: "sheet", versione: 1,
    sheet: { id: "sh-" + code, code: code, name: nome, exercises: esercizi } }
});

const VECCHIO = { id: "prg-vecchio", name: "B_program_1", status: "archived",
  startDate: "2026-05-04", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"] };
const IN_USO = { id: "prg-uso", name: "Intensita_ottobre", status: "active", active: true,
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"] };

/* Le schede dei due programmi: la D ha esercizi diversi dall'altra (come nei
 * dati veri di Alice), e in più c'è un «Gluteo medio» da unire ai Glutei. */
const DOCS = [
  foglio("prg-vecchio", "A", "Scheda A", [
    ESE("Hip thrust", "Glutei", 4, "10", 120),
    ESE("Leg curl", "Femorali", 3, "12", 90)
  ]),
  foglio("prg-vecchio", "D", "Scheda D", [
    ESE("Crab walk con elastico", "Attivazione", 2, "25-35", 90),
    ESE("Pressa45° piedi alti", "Glutei", 5, "12", 120),
    ESE("Rotazioni cavo medio", "Gluteo medio", 4, "10-8", 90),
    ESE("Abduzioni", "gluteo piccolo", 2, "15", 60)
  ]),
  foglio("prg-uso", "A", "Scheda A", [
    ESE("Alzate laterali", "Spalle", 5, "12", 60),
    ESE("Lat machine supina", "Dorsali", 3, "12", 90)
  ]),
  foglio("prg-uso", "D", "Scheda D", [
    ESE("Adductor", "Quadricipiti", 3, "12-8", 120),
    ESE("Bulgaro focus glutei", "Gluteo medio", 3, "8-10", 150),
    ESE("Leg Extension", "Quadricipiti", 3, "12-8", 90)
  ])
];
const SCHEDE = ricostruisciSchede(DOCS);
const GRUPPO_A = SCHEDE.perProgramma["prg-vecchio"];
const GRUPPO_B = SCHEDE.perProgramma["prg-uso"];

function scena(opzioni) {
  const o = opzioni || {};
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const prima = doc.body.children.length;
  const modale = apriConfronto(doc, {
    consultato: { modello: modelloConsultabile(o.programmaA || VECCHIO, o.gruppoA || GRUPPO_A), gruppo: o.gruppoA || GRUPPO_A },
    inUso: { modello: modelloConsultabile(o.programmaB || IN_USO, o.gruppoB || GRUPPO_B), gruppo: o.gruppoB || GRUPPO_B },
    onSalvaCome: null
  });
  return { dom, doc, modale, prima };
}

const euro = (s) => String(s).replace(/\s+/g, " ").trim();
const colonna = (doc, quale) => doc.querySelector(".pc-col-" + (quale === "uno" ? "a" : "b"));
const righeDi = (doc, quale) => Array.from(colonna(doc, quale).querySelectorAll("tbody tr"));
const nomi = (doc, quale) => righeDi(doc, quale).map((tr) => euro(tr.children[0].textContent));
const pastiglie = (doc, quale) => Array.from(colonna(doc, quale).querySelectorAll(".pc-vol"))
  .map((v) => ({ distretto: v.getAttribute("data-vol-distretto"), testo: euro(v.textContent) }));
const tasto = (doc, n) => doc.querySelector('.pc-sett[data-s="' + n + '"]');
const tastoScheda = (doc, codice) => doc.querySelector('.pc-st[data-scheda="' + codice + '"]');
const accese = (doc) => doc.querySelector(".pc-confronto").getAttribute("data-schede-accese");

test("169.1 glutei uniti: gluteo medio, piccolo e glutei sono Glutei; il resto resta com'è", () => {
  /* Il normalizzatore, da solo. */
  assert.equal(distrettoDiEsercizio({ muscolo: "Gluteo medio" }), "Glutei");
  assert.equal(distrettoDiEsercizio({ muscolo: "gluteo piccolo" }), "Glutei");
  assert.equal(distrettoDiEsercizio({ muscolo: "Glutei" }), "Glutei");
  assert.equal(distrettoDiEsercizio({ muscolo: "Custom" }), "Custom", "quello che non si riconosce resta dichiarato per quello che è");
  assert.equal(distrettoDiEsercizio({ muscolo: "" }), "");

  /* I numeri: una riga sola per i glutei, con la somma (4 + 5 + 4 + 2 = 15). */
  const g = grandezzeProgramma(GRUPPO_A);
  const glutei = g.volume.filter((v) => v.distretto === "Glutei");
  assert.equal(glutei.length, 1, "una riga sola per i glutei, non tre");
  assert.equal(glutei[0].serie, 15, "grande + medio + piccolo contano insieme");
  assert.equal(g.volume.filter((v) => /medio|piccolo/i.test(v.distretto)).length, 0,
    "nessun distretto «Gluteo medio» o «Gluteo piccolo»");
  /* Anche la scheda D da sola, che è dove il difetto si vedeva. */
  const schedaD = GRUPPO_A.schede.filter((s) => s.codice === "D")[0];
  const numeriD = numeriDiSettimana([schedaD], 0);
  assert.deepEqual(numeriD.volume.map((v) => v.distretto).sort(), ["Attivazione", "Glutei"]);
  assert.equal(numeriD.volume.filter((v) => v.distretto === "Glutei")[0].serie, 11);

  /* Un muscolo che non si conosce non sparisce e non diventa «Glutei». */
  const docs = [foglio("prg-strano", "A", "Strana", [
    ESE("Esercizio strano", "Custom", 3, "10", 60),
    ESE("Senza muscolo", "", 2, "10", 60)
  ])];
  const gruppo = ricostruisciSchede(docs).perProgramma["prg-strano"];
  const strano = numeriDiSettimana(gruppo.schede, 0);
  assert.deepEqual(strano.volume, [{ distretto: "Custom", serie: 3 }], "«Custom» resta «Custom»");
  assert.equal(strano.senzaDistretto, 1, "l'esercizio senza muscolo è dichiarato a parte, non contato nei Glutei");

  /* L'etichetta sotto il nome, nella tabella del confronto. */
  const { doc } = scena();
  tastoScheda(doc, "D").click();
  tastoScheda(doc, "A").click();
  const etichette = Array.from(doc.querySelectorAll(".pc-col-b tbody .pc-dist")).map((e) => euro(e.textContent));
  assert.ok(etichette.indexOf("Glutei") !== -1, "sotto «Bulgaro focus glutei» si legge «Glutei» (" + etichette.join(", ") + ")");
  assert.equal(etichette.filter((e) => /gluteo medio/i.test(e)).length, 0, "nessuna etichetta «Gluteo medio»");
});

test("169.2 righe allineate: in comune sulla stessa riga, il resto accoppiato per posizione", () => {
  /* Due schede con un esercizio in comune in posizioni diverse e nomi diversi
   * per gli altri: è il caso dei dati veri (scheda D contro scheda D). */
  const docs = [
    foglio("prg-x", "A", "Sinistra", [
      ESE("Alzate laterali", "Spalle", 3, "12", 60),
      ESE("Leg curl", "Femorali", 3, "12", 90),
      ESE("Calf raise", "Polpacci", 4, "15", 45)
    ]),
    foglio("prg-y", "A", "Destra", [
      ESE("Panca piana", "Petto", 4, "8", 120),
      ESE("leg_curl", "Femorali", 4, "10", 90)
    ])
  ];
  const s = ricostruisciSchede(docs);
  const { doc } = scena({ gruppoA: s.perProgramma["prg-x"], programmaA: { id: "prg-x", name: "Sinistra", status: "archived" },
    gruppoB: s.perProgramma["prg-y"], programmaB: { id: "prg-y", name: "Destra", status: "active", active: true } });

  const sinistra = nomi(doc, "uno");
  const destra = nomi(doc, "due");
  assert.equal(sinistra.length, destra.length, "le due colonne hanno le stesse righe");
  assert.equal(sinistra.length, 3, "leg curl in comune, alzate+panca per posizione, il calf che avanza");
  /* 1. la coppia per nome sta in cima, anche se nell'altra scheda è la seconda */
  assert.deepEqual(sinistra[0], "Leg curl Femorali");
  assert.deepEqual(destra[0], "Leg curl Femorali");
  assert.equal(righeDi(doc, "uno")[0].className, "", "accoppiata per nome, non per posizione");
  /* 2. poi le coppie per posizione */
  assert.deepEqual(sinistra[1], "Alzate laterali Spalle");
  assert.deepEqual(destra[1], "Panca piana Pettorali");
  assert.match(righeDi(doc, "uno")[1].className, /pc-riga-posizione/);
  assert.match(righeDi(doc, "uno")[1].getAttribute("title"), /posizione/, "e la riga lo dichiara");
  const avviso = doc.querySelector(".pc-nota-posizione");
  assert.ok(avviso, "e il confronto lo spiega una volta, sotto le colonne");
  assert.match(avviso.textContent, /non è lo stesso esercizio/);
  /* 3. in fondo chi avanza da una parte sola: lì, e solo lì, il trattino */
  assert.deepEqual(sinistra[2], "Calf raise Polpacci");
  assert.equal(destra[2], "\u2014");
  assert.equal(righeDi(doc, "due")[2].children[1].textContent, "", "dove manca, la casella resta vuota");

  /* Con più esercizi a destra, i trattini sono a sinistra, sempre in coda. */
  const docs2 = [
    foglio("prg-x", "A", "Sinistra", [ESE("Squat", "Quadricipiti", 4, "8", 120)]),
    foglio("prg-y", "A", "Destra", [ESE("Panca piana", "Petto", 4, "8", 120), ESE("Rematore", "Dorsali", 3, "10", 90)])
  ];
  const s2 = ricostruisciSchede(docs2);
  const scena2 = scena({ gruppoA: s2.perProgramma["prg-x"], programmaA: { id: "prg-x", name: "Sinistra", status: "archived" },
    gruppoB: s2.perProgramma["prg-y"], programmaB: { id: "prg-y", name: "Destra", status: "active", active: true } });
  assert.deepEqual(nomi(scena2.doc, "uno"), ["Squat Quadricipiti", "\u2014"]);
  assert.deepEqual(nomi(scena2.doc, "due"), ["Panca piana Pettorali", "Rematore Dorsali"]);
});

test("169.3 il volume è quello della scheda scelta: cambia cambiando scheda, e lo dice", () => {
  const { doc } = scena();
  const a = pastiglie(doc, "uno");
  assert.equal(doc.querySelector(".pc-vol-eti").textContent, "Scheda A \u00b7 settimana 1",
    "l'etichetta dice quale scheda e quale settimana sta contando");
  assert.deepEqual(a.map((v) => v.testo), ["Glutei4", "Femorali3"], "scheda A del consultato");

  /* Scheda D: numeri DIVERSI (prima erano identici: era il guasto). */
  tastoScheda(doc, "D").click(); /* accende D: due accese */
  tastoScheda(doc, "A").click(); /* spegne A: resta D sola */
  const d = pastiglie(doc, "uno");
  assert.equal(doc.querySelector(".pc-vol-eti").textContent, "Scheda D \u00b7 settimana 1");
  assert.deepEqual(d.map((v) => v.testo), ["Glutei11", "Attivazione2"], "scheda D del consultato");
  assert.notDeepEqual(d.map((v) => v.testo), a.map((v) => v.testo), "i numeri cambiano davvero cambiando scheda");

  /* E il totale della scheda (serie, esercizi, densità) è il suo. */
  const totali = Array.from(colonna(doc, "uno").querySelectorAll(".pc-tot .pc-tot-v")).map((v) => euro(v.textContent));
  assert.equal(totali[0], "13", "11 + 2 serie della scheda D");
  assert.equal(totali[1], "4", "gli esercizi della scheda D, non del programma");

  /* Una scheda che non scrive quella settimana lo dichiara. */
  const docs = [foglio("prg-corto", "A", "Corta", [
    ESE("Squat", "Quadricipiti", 4, "8", 120, 2)
  ])];
  const corto = ricostruisciSchede(docs).perProgramma["prg-corto"];
  const scenaCorta = scena({ gruppoA: corto, programmaA: { id: "prg-corto", name: "Corto", status: "archived" } });
  tasto(scenaCorta.doc, 5).click();
  const testo = colonna(scenaCorta.doc, "uno").textContent;
  assert.match(testo, /serie non scritte in questa settimana|nessuna serie scritta in questa settimana/,
    "la settimana che la scheda non scrive non diventa uno zero");
  assert.equal(colonna(scenaCorta.doc, "uno").querySelector(".pc-vol"), null, "e non mostra i numeri di un'altra scheda");
  assert.match(scenaCorta.doc.querySelector(".pc-diff-t").textContent, /Scheda A \u00b7 settimana 5/,
    "anche le differenze dicono scheda e settimana");
});

test("169.4 più schede accese: il volume di tutte insieme, e si sa quale si confronta", () => {
  const { doc } = scena();
  assert.equal(accese(doc), "A", "si parte con una sola accesa: il comportamento di sempre");
  assert.equal(doc.querySelector(".pc-scelta-nota"), null, "con una sola non serve la nota");

  tastoScheda(doc, "D").click();
  assert.equal(accese(doc), "A,D", "clic = accendo: le schede accese sono due");
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-scheda"), "D", "il confronto riga per riga passa all'ultima accesa");
  const nota = doc.querySelector(".pc-scelta-nota");
  assert.ok(nota, "con più di una accesa la nota c'è");
  assert.match(nota.textContent, /2 schede \(A, D\)/);
  assert.match(nota.textContent, /è sulla scheda D/, "dice quale scheda si sta confrontando");

  /* La vista del volume: una riga per distretto, una colonna per scheda accesa
   * più il totale, per la settimana scelta. */
  const sezione = doc.querySelector(".pc-volume-sett");
  assert.ok(sezione, "c'è la vista «Volume della settimana»");
  assert.match(sezione.querySelector(".pc-vol-t").textContent, /Volume della settimana \u00b7 settimana 1/);
  const blocchi = Array.from(sezione.querySelectorAll(".pc-vol-blocco"));
  assert.equal(blocchi.length, 2, "una lettura per programma");
  const primo = blocchi[0];
  const intestazioni = Array.from(primo.querySelectorAll("thead th")).map((th) => euro(th.textContent));
  assert.deepEqual(intestazioni, ["Distretto", "Scheda A", "Scheda D", "Totale"]);
  const riga = (d) => primo.querySelector('.pc-vol-riga[data-distretto="' + d + '"]');
  const celle = (d) => Array.from(riga(d).children).map((td) => euro(td.textContent));
  assert.deepEqual(celle("Glutei"), ["Glutei", "4", "11", "15"], "ogni scheda la sua colonna, e il totale somma");
  assert.deepEqual(celle("Attivazione"), ["Attivazione", "\u2014", "2", "2"], "dove la scheda non ha il distretto: trattino");
  assert.deepEqual(celle("Femorali"), ["Femorali", "3", "\u2014", "3"]);
  /* Il totale delle schede accese è la somma delle colonne, non un altro numero. */
  const glutei = riga("Glutei");
  assert.equal(euro(glutei.lastElementChild.textContent), "15");

  /* Almeno una resta accesa: spegnere l'ultima non fa niente. */
  tastoScheda(doc, "A").click();
  assert.equal(accese(doc), "D", "A si spegne, D resta");
  tastoScheda(doc, "D").click();
  assert.equal(accese(doc), "D", "l'ultima accesa non si spegne: la finestra non resta senza scheda");
  assert.equal(tastoScheda(doc, "D").getAttribute("aria-pressed"), "true");

  /* Riaccendendo A dallo spento, la selezione torna a due e il confronto ad A. */
  tastoScheda(doc, "A").click();
  assert.equal(accese(doc), "A,D", "le accese restano in ordine di lettera");
  assert.equal(doc.querySelector(".pc-duetto").getAttribute("data-scheda"), "A", "il confronto segue l'ultima accesa");
});

test("169.5 la finestra è più grande, resta fissa e la pagina sotto non si allunga", () => {
  const regolaBox = /\.pc-modale \.pc-box-confronto\{([^}]*)\}/.exec(css);
  assert.ok(regolaBox, "la regola della finestra c'è");
  const larghezza = /width:\s*min\((\d+)px,\s*100%\)/.exec(regolaBox[1]);
  assert.ok(larghezza, "ha una larghezza massima dichiarata");
  assert.ok(Number(larghezza[1]) >= 1500, "larga quasi tutto lo schermo: " + larghezza[1] + " px");
  const altezza = /height:\s*(\d+)vh/.exec(regolaBox[1]);
  assert.ok(altezza, "ha un'altezza in vh");
  assert.notEqual(altezza[1], "88", "non è più ferma a 88vh: la finestra è stata alzata");
  assert.ok(Number(altezza[1]) >= 90, "alta almeno il 90% dello schermo: " + altezza[1] + "vh");
  assert.match(regolaBox[1], /max-height:\s*calc\(100vh\s*-\s*\d+px\)/, "e non esce dallo schermo");
  assert.match(regolaBox[1], /overflow:\s*hidden/, "la scatola non scorre: scorre il corpo");
  const regolaCorpo = /\.pc-corpo-confronto\{([^}]*)\}/.exec(css);
  assert.match(regolaCorpo[1], /overflow:\s*auto/, "il corpo scorre dentro la finestra");
  assert.match(regolaCorpo[1], /min-height:\s*0/);

  const { dom, doc, modale, prima } = scena();
  /* Pannello fisso, non un pezzo di pagina: la pagina sotto non si muove. */
  assert.equal(dom.window.getComputedStyle(modale).position, "fixed");
  assert.equal(doc.body.children.length, prima + 1, "sul corpo c'è solo la finestra in più");
  assert.equal(modale.parentNode, doc.body);

  /* Le due colonne affiancate restano (il caso approvato non si rompe). */
  const duetto = doc.querySelector(".pc-duetto");
  assert.ok(duetto, "la riga delle due colonne c'è");
  assert.equal(duetto.children.length, 2);
  const regolaDuetto = /\.pc-duetto\{([^}]*)\}/.exec(css);
  assert.match(regolaDuetto[1], /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);

  /* Testo un filo più grande e colonne dei numeri più larghe (la finestra è più
   * larga: lo spazio si usa, non si lascia vuoto). */
  const regolaTab = /\.pc-col-tab\{([^}]*)\}/.exec(css);
  const corpo = Number(/font-size:\s*([\d.]+)px/.exec(regolaTab[1])[1]);
  assert.ok(corpo > 11.4, "il testo della tabella è più grande di prima: " + corpo + "px");
  const regolaCelle = /\.pc-col-tab td\{([^}]*)\}/.exec(css);
  const altezzaRiga = Number(/height:\s*(\d+)px/.exec(regolaCelle[1])[1]);
  assert.ok(altezzaRiga >= 36, "righe più alte e leggibili: " + altezzaRiga + "px");
});
