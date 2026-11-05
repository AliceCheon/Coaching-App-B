import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { JSDOM } from "jsdom";
import { prescrizione, settimaneNormalizzate, settimanePerTabella, indiceScarico, testoSerie, testoRipetizioni, testoRecupero, ricostruisciSchede } from "../comune/schede-v2.js";
import { riepilogoProgramma, coseNonRegistrateProgramma, prestazioniUltime, chiavePrestazione } from "../comune/programma.js";
import { renderProgramma, codiceDistretto } from "../comune/vista-programma.js";

const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A", "B", "C", "D"],
  description: "", message: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n, sets, reps, sec, type) => ({ week: n, sets, reps, rest: { seconds: sec }, type: type || "normal", note: "", source: "manual" });
const otto = (reps, sec) => Array.from({ length: 8 }, (_, i) => sett(i + 1, i + 1 === 4 ? 3 : 4, reps, sec, i + 1 === 4 ? "deload" : "normal"));
const ESE = (nome, muscolo, settimane, base) => ({
  name: nome, muscle: muscolo,
  prescription: Object.assign({ sets: 4, reps: { min: 0, max: 0, sequence: [], label: "10-8-x" }, rest: { seconds: 120 } }, base || {}),
  progression: { weeks: settimane }
});
const esercizi = [
  ESE("Trazioni assistite", "dorsali", otto({ label: "10-8-x", min: 0, max: 0, sequence: [] }, 120)),
  ESE("Lat machine", "centro schiena", otto({ label: "test 12rm → 8", min: 0, max: 0, sequence: [] }, 120).slice(0, 6)),
  ESE("Rematore", "dorso", otto({ min: 12, max: 8, sequence: [], label: "" }, 180), { reps: { min: 12, max: 8, sequence: [], label: "" } }),
  ESE("Pulley basso", "dorso", [])
];
const docs = [{ id: "program-v2-sheet-prg-intensita__sh-A", dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali e braccia", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
const sedute = [
  { dateInput: "2026-10-12", sessionCode: "A", exercises: [{ name: "Trazioni assistite", kg: 45 }] },
  { dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Trazioni assistite", kg: 50 }, { name: "Rematore", kg: 62.5 }] },
  { dateInput: "2026-10-19", sessionCode: "B", exercises: [{ name: "Lat machine", kg: 99 }] }
];

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"g\"></div></body></html>");
  const doc = dom.window.document;
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 5, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });
  renderProgramma(doc, doc.querySelector("#g"), { presente: true, numeroSedute: sedute.length }, r);
  return doc;
}

test("41.01 ripetizioni e recupero si leggono come li scrive il v31", () => {
  const p = prescrizione(esercizi[2]);
  assert.equal(p.serie, "4");
  assert.equal(p.ripetizioni, "12-8");
  assert.equal(p.recupero, "2'");
  assert.ok(!JSON.stringify(p).includes("[object Object]"));
  assert.equal(testoRipetizioni({ sequence: [10, 8] }), "10-8");
  assert.equal(testoRipetizioni({ label: "10-8-x" }), "10-8-x");
  assert.equal(testoRipetizioni({ label: "test 12rm → 8" }), "test 12rm → 8");
  assert.equal(testoRecupero({ seconds: 90 }), "90 sec");
  assert.equal(testoRecupero({ seconds: 120 }), "2'");
  assert.equal(testoSerie({ value: 5 }), "5");
});

test("41.02 le otto settimane si leggono tutte, le mancanti restano un trattino", () => {
  const p = prescrizione(esercizi[1]);
  const tabella = settimanePerTabella(p.elencoSettimane, 8);
  assert.equal(tabella.length, 8);
  assert.equal(tabella[5].registrata, true);
  assert.equal(tabella[6].registrata, false);
  assert.equal(indiceScarico(settimaneNormalizzate(otto({ min: 12, max: 8 }, 120))), 3);
});

test("41.03 la tabella ha le colonne del v31, nello stesso ordine, e tutte e otto le settimane", () => {
  const doc = schermo();
  const tab = doc.querySelector("table.p8-tab");
  assert.ok(tab, "manca la tabella .p8-tab");
  const testa = Array.from(tab.querySelectorAll("thead tr:first-child th")).map((th) => th.textContent.trim());
  assert.deepEqual(testa, ["JS", "Dist.", "Esercizio", "Descr. / Setup", "Rec.", "TUT",
    "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "Ultima"]);
  const sotto = Array.from(tab.querySelectorAll("thead .p8h.sub")).map((th) => th.textContent.trim());
  assert.equal(sotto.length, 16);
  assert.equal(sotto[0], "ser");
  assert.equal(sotto[1], "reps");
  assert.equal(tab.querySelectorAll("colgroup col").length, 23);
  assert.equal(tab.querySelectorAll("tbody tr.p8-r").length, 4);
});

test("41.04 DIST. con i codici del v31, ULTIMA dal logbook, trattino dove manca", () => {
  assert.equal(codiceDistretto("dorsali"), "D");
  assert.equal(codiceDistretto("dorso"), "D");
  assert.equal(codiceDistretto("centro schiena"), "CS");
  assert.equal(codiceDistretto("bicipiti femorali"), "E");
  assert.equal(codiceDistretto("glutei"), "G");
  assert.equal(codiceDistretto("spalle"), "S");
  assert.equal(codiceDistretto("bicipiti"), "B");
  assert.equal(codiceDistretto("tricipiti"), "T");
  assert.equal(codiceDistretto("polpacci"), "C");
  assert.equal(codiceDistretto("addome"), "A");
  assert.equal(codiceDistretto("cardio"), "CA");
  assert.equal(codiceDistretto(""), "—");
  assert.equal(codiceDistretto("sconosciuto"), "—");

  const doc = schermo();
  const righe = doc.querySelectorAll("tbody tr.p8-r");
  assert.equal(righe[0].querySelector("td.c-dist .dist").textContent, "D");
  assert.equal(righe[1].querySelector("td.c-dist .dist").textContent, "CS");
  assert.equal(righe[0].querySelector("td.c-ult").textContent, "26/10/2026 · 50 kg");
  assert.equal(righe[1].querySelector("td.c-ult").textContent, "—");
  assert.equal(righe[2].querySelector("td.c-ult").textContent, "26/10/2026 · 62,5 kg");
  assert.equal(righe[3].querySelector("td.c-ult").textContent, "—");

  const mappa = prestazioniUltime(sedute, ["A"]);
  assert.equal(mappa[chiavePrestazione("A", "trazioni assistite")].kg, "50");
  assert.equal(mappa[chiavePrestazione("A", "lat machine")], undefined);
  assert.equal(mappa[chiavePrestazione("B", "lat machine")], undefined);
});

test("41.05 recupero in REC., scarico in evidenza, controlli spenti, nessuna frase sotto", () => {
  const doc = schermo();
  const prima = doc.querySelector("tbody tr.p8-r");
  assert.equal(prima.querySelector("td.c-rec .rec").textContent, "2'");
  assert.equal(prima.querySelector("td.c-tut .tut").textContent, "—");
  assert.equal(prima.querySelector("td.c-ser span").textContent, "4");
  assert.equal(prima.querySelector("td.c-reps span").textContent, "10-8-x");
  const wk = doc.querySelectorAll("thead th.p8h.wk");
  assert.equal(wk.length, 8);
  assert.ok(wk[3].classList.contains("ph-scar"));
  assert.ok(doc.querySelectorAll("tbody td.sc-col").length > 0);
  assert.ok(doc.querySelector(".btn-prog"));
  assert.equal(doc.querySelectorAll(".chchip").length, 16);
  const bottoni = Array.from(doc.querySelectorAll(".p8-r button"));
  assert.ok(bottoni.length >= 40);
  assert.ok(bottoni.every((b) => b.disabled === true));
  assert.equal(doc.querySelectorAll(".p8-r .p8-note").length, 4);
  assert.ok(!doc.body.textContent.includes("[object Object]"));
  assert.ok(!doc.querySelector(".p8-scroll").parentElement.textContent.includes("Otto settimane"));
});

test("41.06 font e larghezza: JetBrains Mono in casa e la tabella larga come il v31", () => {
  const css = fs.readFileSync("comune/tema-b.css", "utf8");
  assert.ok(/JetBrains Mono/.test(css));
  [400, 500, 600].forEach((w) => assert.ok(fs.existsSync("comune/font/jetbrains-mono-" + w + ".woff2")));
  const tab = fs.readFileSync("comune/dashboard-b.css", "utf8");
  assert.ok(/min-width:1504px/.test(tab));
  ["w-js{width:48px}", "w-reps{width:63px}", "w-ult{width:82px}"].forEach((f) => assert.ok(tab.indexOf(f) !== -1, f));
});

test("41.07 la voce «Cosa non c'è» sulle settimane è sparita", () => {
  const voci = coseNonRegistrateProgramma().map(([titolo]) => titolo);
  assert.ok(!voci.includes("Progressione settimana per settimana"));
  assert.ok(voci.length >= 4);
});
