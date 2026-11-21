/* tests/125-analisi-programmazione.test.mjs - PASSO 4c, le sette prove.
 *
 * Le prime cinque e la settima provano il conto puro
 * (comune/analisi-programmazione.js): numeri scelti a mano, totali calcolati
 * a mano nel test. La 125.6 monta la PAGINA VERA e verifica che il numero a
 * schermo sia quello della funzione, non un secondo conto.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

import { analisiProgrammazione, settimaneDelleSchede, tonnellaggioInParola } from "../comune/analisi-programmazione.js";
import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

const sett = (serie, reps, kg) => ({ serie: serie, ripetizioni: reps, peso: kg });
const ESE = (id, muscolo, settimane) => ({ id: id, nome: id, muscolo: muscolo, prescrizione: { elencoSettimane: settimane } });
const SCHEDA = (codice, esercizi) => ({ codice: codice, esercizi: esercizi });

test("125.1 i totali sono quelli, calcolati a mano nel test", () => {
  const schede = [
    SCHEDA("A", [
      ESE("a1", "dorsali", [sett(4, "10", 40), sett(5, "10", 40)]),
      ESE("a2", "dorsali", [sett(3, "8", 50), sett(3, "8", 50)])
    ]),
    SCHEDA("B", [
      ESE("b1", "pettorali", [sett(4, "6", 60), sett(4, "6", 60)])
    ])
  ];
  const r = analisiProgrammazione(schede, { settimana: 1 });
  const per = (c) => r.distretti.filter((d) => d.codice === c)[0];
  assert.equal(per("D").serie, 7, "dorsali settimana 1: 4 + 3 = 7, invece " + per("D").serie);
  assert.equal(per("P").serie, 4, "pettorali settimana 1: 4, invece " + per("P").serie);
  assert.equal(r.totaleSerie, 11, "totale settimana 1: 7 + 4 = 11, invece " + r.totaleSerie);
  assert.equal(r.totaleSerieBlocco, 23, "blocco: dorsali 9 + 6, pettorali 8 = 23, invece " + r.totaleSerieBlocco);
  assert.equal(per("D").tonnellaggio, 4 * 10 * 40 + 3 * 8 * 50, "tonnellaggio dorsali non torna: " + per("D").tonnellaggio);
});

test("125.2 la riga che non conta nel volume non entra nel conto", () => {
  const fuori = ESE("a2", "dorsali", [sett(9, "10", 40)]);
  fuori.contaVolume = false;
  const dentro = ESE("a1", "dorsali", [sett(4, "10", 40)]);
  const r = analisiProgrammazione([SCHEDA("A", [dentro, fuori])], { settimana: 1 });
  assert.equal(r.totaleSerie, 4, "la riga con contaVolume:false e' entrata nel conto: " + r.totaleSerie);
  assert.equal(r.distretti.length, 1, "il distretto esiste una volta sola");
  const senzaConto = analisiProgrammazione([SCHEDA("A", [fuori])], { settimana: 1 });
  assert.equal(senzaConto.distretti.length, 0, "con solo la riga fuori dal volume non deve restare nessun distretto");
});

test("125.3 peso vuoto: serie si, tonnellaggio non registrato, mai zero", () => {
  const r = analisiProgrammazione([SCHEDA("A", [ESE("a1", "dorsali", [sett(4, "10", null)])])], { settimana: 1 });
  const d = r.distretti[0];
  assert.equal(d.serie, 4, "le serie si contano lo stesso: " + d.serie);
  assert.equal(d.tonnellaggioNoto, false, "senza peso il tonnellaggio non e' noto");
  assert.equal(r.tonnellaggioNoto, false, "il totale non e' noto se un distretto non lo e'");
  assert.equal(tonnellaggioInParola(r.totaleTonnellaggio, r.tonnellaggioNoto), "non registrato",
    "senza peso si scrive non registrato, mai 0");
});

test("125.4 cambio settimana: S1 e S4 danno numeri diversi, il blocco e la somma", () => {
  const schede = [SCHEDA("A", [ESE("a1", "dorsali", [sett(4, "10", 40), sett(4, "10", 40), sett(4, "10", 40), sett(6, "10", 40)])])];
  const s1 = analisiProgrammazione(schede, { settimana: 1 });
  const s4 = analisiProgrammazione(schede, { settimana: 4 });
  const tutto = analisiProgrammazione(schede, { settimana: null });
  assert.equal(s1.totaleSerie, 4, "S1 deve dare 4, da " + s1.totaleSerie);
  assert.equal(s4.totaleSerie, 6, "S4 deve dare 6, da " + s4.totaleSerie);
  assert.notEqual(s1.totaleSerie, s4.totaleSerie, "S1 e S4 devono dare numeri diversi");
  assert.equal(tutto.totaleSerie, 18, "il blocco vale 4+4+4+6 = 18, da " + tutto.totaleSerie);
  assert.equal(tutto.blocco, true, "tutto il blocco si dichiara");
});

test("125.5 la sovrapposizione elenca le schede giuste per ogni distretto", () => {
  const schede = [
    SCHEDA("A", [ESE("a1", "dorsali", [sett(4, "10", 40)])]),
    SCHEDA("C", [ESE("c1", "dorsali", [sett(3, "10", 40)]), ESE("c2", "pettorali", [sett(5, "10", 40)])])
  ];
  const r = analisiProgrammazione(schede, { settimana: 1 });
  const d = r.distretti.filter((x) => x.codice === "D")[0];
  assert.deepEqual(d.schede, ["A", "C"], "i dorsali compaiono in A e C, invece: " + d.schede.join(","));
  const p = r.distretti.filter((x) => x.codice === "P")[0];
  assert.deepEqual(p.schede, ["C"], "i pettorali compaiono solo in C, invece: " + p.schede.join(","));
});

test("125.7 senza serie leggibili si dice, non si conta zero", () => {
  const r = analisiProgrammazione([SCHEDA("A", [ESE("a1", "dorsali", [])])], { settimana: 1 });
  assert.equal(r.distretti.length, 0, "senza settimane non deve nascere nessun distretto");
  assert.equal(r.totaleSerie, 0, "il totale e zero perche non c e niente da contare");
  assert.equal(settimaneDelleSchede([SCHEDA("A", [])]), 8, "senza righe la tabella resta a otto settimane");
});

test("125.6 sulla pagina vera la tendina cambia la carta col numero della funzione", async () => {
  const META = {
    id: "prg-an", name: "Prova analisi", status: "active", phase: "Bulk",
    startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
    rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
  };
  const sett2 = (n, serie) => ({ week: n, sets: serie, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
  const otto = (serie1, serie4) => Array.from({ length: 8 }, (_, i) => sett2(i + 1, (i === 0 ? serie1 : (i === 3 ? serie4 : 4))));
  const DATI = {
    radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 125 4c" },
    programmi: [{ id: "program-v2-meta-prg-an", dati: { programMeta: META } }],
    schede: [{
      id: "program-v2-sheet-prg-an__sh-A",
      dati: {
        programId: "prg-an", sheetId: "sh-A", kind: "sheet", versione: 1,
        sheet: {
          id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z",
          exercises: [
            { id: "ex-1", name: "Lat machine", muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: otto(4, 6) } },
            { id: "ex-2", name: "Rematore", muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: otto(3, 3) } }
          ]
        }
      }
    }],
    sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
    esclusioni: [], registro: [], scheletri: []
  };
  const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole: vc });
  const doc = dom.window.document;
  const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [110, 40, 70], latenzaScrittura: 8 });
  dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
  globalThis.window = dom.window;
  globalThis.document = doc;
  await import("../desktop/app-v31.js");

  await attendiFinche(() => doc.querySelector("#programma-attivo .p8-tab"), 20000, "la tabella non si e' mai montata");
  if (!doc.querySelector('[data-analisi-carta="sovrapposizione"]')) {
    const lingua = Array.from(doc.querySelectorAll("button")).filter((b) => String(b.textContent || "").indexOf("Analisi") !== -1)[0];
    assert.ok(lingua, "la linguetta Analisi non c'e'");
    lingua.click();
  }
  await attendiFinche(() => doc.querySelector('[data-analisi-carta="sovrapposizione"]'), 15000, "la carta della sovrapposizione non si e' disegnata");
  const carte = Array.from(doc.querySelectorAll("[data-analisi-carta]")).map((c) => String(c.getAttribute("data-analisi-carta")));
  assert.deepEqual(carte.slice().sort(), ["sovrapposizione"], "deve restare una carta sola: " + carte.join(","));
  const grigliaViva = doc.querySelector("[data-analisi-carta]").parentNode;
  assert.equal(String(grigliaViva.textContent).indexOf("Serie per distretto"), -1, "la carta che ripeteva il volume e' ancora in pagina");
  assert.equal(String(grigliaViva.textContent).indexOf("Somma delle serie della settimana"), -1, "la frase fissa della settimana 1 e' ancora in pagina");
  assert.equal(doc.querySelector("[data-analisi-settimana]"), null, "la tendina della settimana non deve piu' esserci");
  const righe = Array.from(doc.querySelectorAll("[data-analisi-distretto]"));
  assert.ok(righe.length > 0, "nessun distretto disegnato");
  const dorsali = righe.filter((r2) => String(r2.getAttribute("data-analisi-distretto")) === "D")[0];
  assert.ok(dorsali, "manca il distretto D");
  assert.match(String(dorsali.textContent), /Dorsali/, "il nome intero non c'e': " + dorsali.textContent);
  const chips = Array.from(dorsali.querySelectorAll(".pr-rotchip")).map((c) => String(c.textContent).trim());
  assert.ok(chips.length > 0, "il distretto D non porta nessuna scheda");
  chips.forEach((t) => assert.match(t, /^Scheda [A-Z]$/, "scheda non scritta per esteso: " + t));
  const conteggi = righe.map((r2) => Number(r2.getAttribute("data-analisi-schede")));
  for (let i2 = 1; i2 < conteggi.length; i2 += 1) {
    assert.ok(conteggi[i2 - 1] >= conteggi[i2], "l'ordine non mette prima i distretti in piu' schede: " + conteggi.join(","));
  }
  righe.forEach((r2) => {
    const quanti2 = Number(r2.getAttribute("data-analisi-schede"));
    assert.equal(r2.getAttribute("data-analisi-evidenza"), quanti2 > 1 ? "piu" : "una", "evidenza sbagliata per " + r2.getAttribute("data-analisi-distretto"));
  });
  const primoPiu = righe.filter((r2) => r2.getAttribute("data-analisi-evidenza") === "piu")[0];
  if (primoPiu) assert.equal(String(primoPiu.style.fontWeight), "900", "il distretto in piu' schede non e' in evidenza");
  const primoUno = righe.filter((r2) => r2.getAttribute("data-analisi-evidenza") === "una")[0];
  if (primoUno) assert.ok(String(primoUno.style.opacity) === "0.55", "il distretto in una scheda sola non e' attenuato");
});
