import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";

const OGGI = new Date(Date.UTC(2026, 10, 4));
const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4,
  description: "Blocco di intensità: quattro sedute, doppia progressione sui fondamentali.",
  message: "Nessuna serie al limite: se una serie sembra facile, la settimana dopo il carico sale.",
  rotation: ["A", "B", "C", "D"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
/* Otto settimane per esercizio, con la forma dei documenti veri: ripetizioni e
 * recupero sono oggetti ({min,max} e {seconds}), lo scarico è type:"deload". */
const sett = (n, sets, min, max, sec, type) => ({ week: n, sets, reps: { min, max, sequence: [], label: "" }, rest: { seconds: sec }, type: type || "normal", note: "", source: "manual" });
const sequenza = (deload) => Array.from({ length: 8 }, (_, i) => sett(i + 1, i + 1 === deload ? 3 : 4, 8, 10, 90, i + 1 === deload ? "deload" : "normal"));
const E = (nome, muscolo, nota, settimane) => ({ name: nome, muscle: muscolo, note2: nota || "", prescription: { sets: 4, reps: { min: 8, max: 10, sequence: [], label: "" }, rest: { seconds: 90 } }, progression: { weeks: settimane } });
const esercizi = [
  E("Trazioni assistite", "dorsali", "presa prona", sequenza(4)),
  E("Lat machine presa neutra", "dorsali", "", sequenza(4).slice(0, 6)),
  E("Rematore bilanciere", "dorso", "fermo a terra", sequenza(4)),
  E("Pulley basso", "dorso", "", []),
  E("Curl bilanciere", "bicipiti", "", sequenza(4)),
  E("Curl a martello", "brachiale", "", sequenza(4))
];
const docs = [{ id: "program-v2-sheet-prg-intensita__sh-A", dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali, spalle, braccia", focus: "dorso", day: 1, week: 1, order: 0, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
const sedute = [];
for (let s = 0; s < 6; s += 1) {
  const lunedi = Date.UTC(2026, 8, 21) + s * 7 * 86400000;
  sedute.push({ dateInput: new Date(lunedi).toISOString().slice(0, 10), sessionCode: "A", sessionName: "Dorsali, spalle, braccia" });
}

const b64 = (f) => fs.readFileSync(f).toString("base64");
const font = ["font/nunito-sans-latin.woff2", "font/nunito-sans-latin-ext.woff2", "font/nunito-sans-corsivo-latin.woff2", "font/nunito-sans-corsivo-latin-ext.woff2"];
let cssText = "";
for (const f of ["comune/tema-b.css", "comune/dashboard-b.css", "comune/testata-diva.css"]) {
  let t = fs.readFileSync(f, "utf8");
  for (const p of font) t = t.split(`url("${p}")`).join(`url(data:font/woff2;base64,${b64("comune/" + p)})`);
  cssText += `\n/* ${f} */\n` + t;
}
function paginaCss() { return cssText; }

async function costruisci(base, file) {
  const { renderProgramma } = await import(base + "/comune/vista-programma.js");
  const { riepilogoProgramma } = await import(base + "/comune/programma.js");
  const { ricostruisciSchede } = await import(base + "/comune/schede-v2.js");
  const ric = ricostruisciSchede(docs);
  let h = fs.readFileSync("desktop/index.html", "utf8");
  h = h.replace(/<link rel="stylesheet" href="\.\.\/comune\/[^"]+">\n?/g, "");
  h = h.replace(/<script src="https:\/\/www\.gstatic\.com[^"]*"><\/script>\n?/g, "");
  h = h.replace(/<script src="\.\.\/app-config-b\.js"><\/script>\n?/g, "");
  h = h.replace(/<script type="module">[\s\S]*?<\/script>/g, "");
  const dom = new JSDOM(h, { runScripts: "outside-only" });
  const doc = dom.window.document;
  ["#vistaLogin", "#vistaDash", "#vistaOverview", "#vistaPianificazione", "#vistaArchivio"].forEach((s) => { const e = doc.querySelector(s); if (e) e.hidden = true; });
  doc.querySelector("#vistaProgramma1").hidden = false;
  doc.querySelectorAll("[data-versione]").forEach((x) => { x.textContent = "b0.36 · settimane"; });
  const r = riepilogoProgramma(meta, sedute, { schedeV2: ric, indice: 0, totaleProgrammi: 5, oggi: OGGI, quante: 8 });
  renderProgramma(doc, doc.querySelector("#programma1Griglia"), { presente: true, numeroSedute: sedute.length }, r);
  fs.writeFileSync(file, dom.serialize().replace("</head>", `<style>\n${paginaCss()}\n</style>\n</head>`));
  return r;
}

const dopo = await costruisci(".", "scatta-settimane-dopo.html");
const prima = await costruisci("./prima", "scatta-settimane-prima.html");

const b = await chromium.launch();
const scatta = async (file, sel, out) => {
  const p = await b.newPage({ viewport: { width: 1620, height: 1100 }, deviceScaleFactor: 2 });
  await p.goto("file://" + path.resolve(file));
  await p.waitForTimeout(900);
  const el = await p.$(sel);
  await el.screenshot({ path: out });
  const m = await p.evaluate(() => ({
    settimane: document.querySelectorAll(".pr-wk-gruppo").length,
    recuperi: document.querySelectorAll(".pr-wk-recupero").length,
    oggetto: (document.body.textContent.match(/\[object Object\]/g) || []).length,
    manca: document.querySelectorAll(".pr-wk-manca").length,
    scarico: document.querySelectorAll(".pr-wk-gruppo.scarico").length
  }));
  await p.close();
  return m;
};
const mDopo = await scatta("scatta-settimane-dopo.html", ".pr-shell", "/tmp/pan-dopo.png");
const mPrima = await scatta("scatta-settimane-prima.html", ".pr-shell", "/tmp/pan-prima.png");

/* v31: si apre la sua pagina Programma e si prende la sua tabella delle settimane */
const p31 = await b.newPage({ viewport: { width: 1620, height: 1200 }, deviceScaleFactor: 2 });
await p31.goto("file://" + path.resolve("../v31.html"));
await p31.waitForTimeout(2500);
const mostrato = await p31.evaluate(() => {
  const pag = document.querySelector("#pag-programma-1");
  if (!pag) return false;
  let e = pag;
  while (e && e !== document.body) { e.hidden = false; e.style.display = ""; e = e.parentElement; }
  pag.hidden = false; pag.style.display = "block";
  document.querySelectorAll("body *").forEach((el) => {
    const st = getComputedStyle(el);
    if (st.position === "fixed" && el.offsetHeight > 40) el.style.display = "none";
  });
  window.scrollTo(0, 0);
  return true;
});
await p31.waitForTimeout(500);
const sel31 = await p31.evaluate(() => {
  const c = document.querySelector("#pag-programma-1 .p8-box .p8-scroll") || document.querySelector("#pag-programma-1 .p8-scroll");
  return c ? c.getBoundingClientRect().height : 0;
});
let m31 = { altezza: sel31 };
if (sel31 > 80) {
  await (await p31.$("#pag-programma-1 .p8-box .p8-scroll, #pag-programma-1 .p8-scroll")).screenshot({ path: "/tmp/pan-v31.png" });
  m31.righe = await p31.evaluate(() => document.querySelectorAll("#pag-programma-1 .p8-tab tbody tr").length);
}
await b.close();
console.log(JSON.stringify({ dopo: mDopo, prima: mPrima, v31: m31, mostrato, esercizi: dopo.esercizi }));
