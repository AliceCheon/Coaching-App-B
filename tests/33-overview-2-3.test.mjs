import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  dataSeduta, giorniTra, riepilogoOverview, settimane, settimaneAttive,
  schedeUsate, ultimeSedute, seduteUltimiGiorni
} from "../comune/overview.js";

const html = readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../desktop/app.js", import.meta.url), "utf8");
const vista = readFileSync(new URL("../comune/vista-overview.js", import.meta.url), "utf8");
const conti = readFileSync(new URL("../comune/overview.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../comune/dashboard-b.css", import.meta.url), "utf8");

const oggi = new Date(Date.UTC(2026, 10, 4));
const sedute = [
  { dateInput: "2026-11-03", sessionCode: "S1", sessionName: "Spinta A" },
  { dateInput: "2026-11-01", sessionCode: "S2", sessionName: "Tirata A" },
  { dateInput: "2026-10-28", sessionCode: "S1", sessionName: "Spinta A" },
  { date: "27/10/2026", sessionCode: "S1", sessionName: "Spinta A" },
  { date: "2026-10-14", sessionCode: "S3" },
  { sessionCode: "S4" }
];

test("33.01 le date si leggono in ISO e all'italiana, il resto è nullo", () => {
  assert.equal(dataSeduta("2026-11-03").toISOString().slice(0, 10), "2026-11-03");
  assert.equal(dataSeduta("27/10/2026").toISOString().slice(0, 10), "2026-10-27");
  assert.equal(dataSeduta("boh"), null);
  assert.equal(dataSeduta(null), null);
  assert.equal(giorniTra(new Date(Date.UTC(2026, 10, 3)), oggi), 1);
});

test("33.02 il riepilogo conta le sedute e dichiara quelle senza data", () => {
  const r = riepilogoOverview(sedute, { oggi });
  assert.equal(r.totale, 6);
  assert.equal(r.conData, 5);
  assert.equal(r.senzaData, 1);
  assert.equal(r.ultimi28, 5);
  assert.equal(r.giorniUltima, 1);
});

test("33.03 le settimane sono blocchi di sette giorni che finiscono oggi", () => {
  const b = settimane(sedute, 8, oggi);
  assert.equal(b.length, 8);
  assert.equal(b[7].numero, 2, "questa settimana: 3/11 e 1/11");
  assert.equal(b[6].numero, 2, "settimana prima: 28/10 e 27/10");
  assert.equal(b[5].numero, 0);
  assert.equal(b[4].numero, 1, "14/10");
  assert.equal(b[7].ultima, true);
  assert.deepEqual(settimaneAttive(b), { attive: 3, totali: 8 });
});

test("33.04 il ritmo è una media dichiarata, non un'aderenza", () => {
  const r = riepilogoOverview(sedute, { oggi });
  assert.equal(r.ritmo, 0.6);
  assert.match(vista, /media, non aderenza/, "la schermata deve dire che non è aderenza");
});

test("33.05 le schede si contano per codice, la più usata per prima", () => {
  assert.deepEqual(schedeUsate(sedute), [
    { codice: "S1", numero: 3 },
    { codice: "S2", numero: 1 },
    { codice: "S3", numero: 1 },
    { codice: "S4", numero: 1 }
  ]);
});

test("33.06 le ultime sedute arrivano dalla più recente e rispettano il limite", () => {
  const u = ultimeSedute(sedute, 2);
  assert.equal(u.length, 2);
  assert.equal(u[0].codice, "S1");
  assert.equal(u[0].data.toISOString().slice(0, 10), "2026-11-03");
  assert.equal(u[1].codice, "S2");
  assert.equal(ultimeSedute([], 5).length, 0);
});

test("33.07 la finestra dei 28 giorni è inclusiva del primo giorno", () => {
  const m = seduteUltimiGiorni(sedute, 28, oggi);
  assert.equal(m.numero, 5);
  assert.equal(seduteUltimiGiorni([], 28, oggi).numero, 0);
});

test("33.08 con zero sedute non si inventa nessun numero", () => {
  const r = riepilogoOverview([], { oggi });
  assert.equal(r.totale, 0);
  assert.equal(r.giorniUltima, null);
  assert.equal(r.ritmo, 0);
  assert.deepEqual(r.schede, []);
  assert.deepEqual(r.ultime, []);
});

test("33.09 i conti e la vista non scrivono niente", () => {
  for (const fonte of [conti, vista, app]) {
    assert.doesNotMatch(fonte, /setDoc\s*\(|addDoc\s*\(|updateDoc\s*\(|deleteDoc\s*\(|writeBatch\s*\(/, "trovata una scrittura");
  }
  assert.match(conti, /export function riepilogoOverview/);
  assert.match(vista, /export function renderOverviewAtleta/);
});

test("33.10 la voce è viva, il pannello esiste e il cambio di schermata è dichiarato", () => {
  assert.match(html, /<button class="voce" data-vista="overview-atleta" type="button">/);
  assert.doesNotMatch(html, /data-vista="overview-atleta" type="button" disabled/);
  assert.match(html, /<div id="vistaOverview" hidden>/);
  assert.match(html, /<div id="overviewGriglia" class="ck"><\/div>/);
  assert.match(app, /export function mostraVista/);
  assert.match(app, /renderOverviewAtleta\(doc, grigliaOverview/);
  assert.match(css, /\.ov-bars\{/);
  assert.match(css, /\.ov-donut\{/);
});
