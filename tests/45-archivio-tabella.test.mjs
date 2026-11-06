import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { elencoArchivio, renderArchivio, dataItaliana } from "../comune/vista-archivio.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";

/* La tabella dell'Archivio come il v31: Programma · Schede · Esercizi ·
 * Serie · Sedute · Ultima, attivo evidenziato con «(attiva)», «non
 * registrato» dove il dato non c'è. I dati qui sono di forma (come i test
 * 41/43), la pagina reale legge i programmi e le schede di Alice. */

const ESE = (nome, muscolo, serie, settimane) => ({
  name: nome, muscle: muscolo,
  prescription: { sets: serie, reps: { label: "10" }, rest: { seconds: 120 } },
  progression: { weeks: settimane }
});
const sett = (n, sets) => ({ week: n, sets, reps: { label: "10" }, rest: { seconds: 120 }, type: "normal", note: "", source: "manual" });
const otto = (sets) => Array.from({ length: 8 }, (_, i) => sett(i + 1, i === 3 ? 2 : sets));
const scheda = (programId, code, nome, esercizi) => ({ programId, sheetId: "sh-" + code, kind: "sheet",
  sheet: { id: "sh-" + code, code, name: nome, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } });
const docs = [
  { id: "program-v2-sheet-prg-att__sh-A", dati: scheda("prg-att", "A", "Spalle_e_petto", [
    ESE("panca_piana", "petto", 4, otto(4)),
    ESE("lat_machine_triangolo", "dorsali", 3, otto(3))
  ]) },
  { id: "program-v2-sheet-prg-att__sh-B", dati: scheda("prg-att", "B", "Gambe", [
    ESE("hip_thrust", "glutei", 4, otto(4))
  ]) },
  { id: "program-v2-sheet-prg-vec__sh-A", dati: scheda("prg-vec", "A", "Vecchia", [
    ESE("rematore_bilanciere", "dorso", 3, otto(3))
  ]) }
];
const programmi = [
  { id: "prg-att", name: "Intensita_ottobre-dicembre", status: "active", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z" },
  { id: "prg-vec", name: "Blocco_precedente", status: "completed", createdAt: "2026-06-01T09:00:00.000Z", updatedAt: "2026-08-01T18:00:00.000Z" }
];

function righe() {
  return elencoArchivio(programmi, { attivoId: "prg-att", schedeV2: ricostruisciSchede(docs) });
}

function schermo() {
  const dom = new JSDOM("<!doctype html><html><body><section id=\"pag-archivio\">" +
    "<table class=\"pg-tab\"><thead><tr><th>Programma</th><th>Schede</th><th>Esercizi</th><th>Serie</th><th>Sedute</th><th>Ultima</th></tr></thead>" +
    "<tbody id=\"archivio-corpo\"></tbody></table>" +
    "<div class=\"v-tre\"><span data-lb-pg=\"sedute:Senza programma\">\u2026</span></div></section></body></html>");
  const doc = dom.window.document;
  renderArchivio(doc, doc.getElementById("archivio-corpo"), { righe: righe() });
  return doc;
}

test("45.01 le righe comprendono anche l'attivo, con i conti dalle schede lette", () => {
  const r = righe();
  assert.equal(r.length, 2);
  assert.equal(r[0].id, "prg-att");
  assert.equal(r[0].attivo, true);
  assert.equal(r[1].attivo, false);
  assert.equal(r[0].schede, 2);
  assert.equal(r[0].esercizi, 3);
  assert.equal(r[0].serie, 11);
  assert.equal(r[1].schede, 1);
  assert.equal(r[1].esercizi, 1);
  assert.equal(r[1].serie, 3);
  assert.ok(!JSON.stringify(r).includes("[object Object]"));
});

test("45.02 un programma senza schede leggibili scrive «non registrato», non uno zero", () => {
  const r = elencoArchivio(programmi, { attivoId: "prg-att", schedeV2: { perProgramma: {} } });
  const vuota = r.find((x) => x.id === "prg-att");
  assert.equal(vuota.schede, null);
  assert.equal(vuota.esercizi, null);
  assert.equal(vuota.serie, null);
});

test("45.03 la tabella è quella del v31: sei colonne, attivo evidenziato, «non registrato» dove manca", () => {
  const doc = schermo();
  const tab = doc.querySelector("table.pg-tab");
  const testa = Array.from(tab.querySelectorAll("thead th")).map((th) => th.textContent.trim());
  assert.deepEqual(testa, ["Programma", "Schede", "Esercizi", "Serie", "Sedute", "Ultima"]);
  const righeTab = Array.from(tab.querySelectorAll("tbody tr"));
  assert.equal(righeTab.length, 2);
  const celle = (tr) => Array.from(tr.querySelectorAll("td.pg-m")).map((td) => td.textContent);
  assert.ok(righeTab[0].querySelector("td.pg-tdnome").textContent.includes("(attiva)"));
  assert.ok(!righeTab[1].querySelector("td.pg-tdnome").textContent.includes("(attiva)"));
  assert.deepEqual(celle(righeTab[0]), ["2", "3", "11", "non registrato", "non registrato"]);
  assert.deepEqual(celle(righeTab[1]), ["1", "1", "3", "non registrato", "non registrato"]);
  assert.ok(!doc.body.textContent.includes("_"), "nessun trattino basso a schermo");
  assert.ok(doc.body.textContent.includes("Intensita ottobre-dicembre"));
  assert.ok(doc.body.textContent.includes("Blocco precedente"));
});

test("45.04 la Nota del v31 non resta con i puntini: si dichiara «non registrato»", () => {
  const doc = schermo();
  doc.querySelectorAll("[data-lb-pg]").forEach((el) => assert.equal(el.textContent, "non registrato"));
});

test("45.05 senza programmi letti la tabella lo dice, con una riga sola", () => {
  const dom = new JSDOM("<!doctype html><html><body><section><table class=\"pg-tab\"><tbody id=\"c\"></tbody></table></section></body></html>");
  const doc = dom.window.document;
  renderArchivio(doc, doc.getElementById("c"), { righe: [] });
  const tr = doc.querySelector("tbody tr");
  assert.equal(tr.children.length, 1);
  assert.equal(tr.firstElementChild.colSpan, 6);
  assert.ok(tr.textContent.includes("Nessun programma letto"));
});

test("45.06 le date si leggono all'italiana e una data che non c'è è «non registrato»", () => {
  assert.equal(dataItaliana("2026-10-05"), "05/10/2026");
  assert.equal(dataItaliana(""), "non registrato");
  assert.equal(dataItaliana(null), "non registrato");
});
