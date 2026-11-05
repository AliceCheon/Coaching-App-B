import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";

const OGGI = new Date(Date.UTC(2026, 10, 4));
const meta = {
  id: "prg-intensita", name: "Intensità ottobre-dicembre", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "",
  message: "", rotation: ["A", "B", "C", "D"],
  createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const sett = (n, sets, reps, sec, type) => ({ week: n, sets, reps, rest: { seconds: sec }, type: type || "normal", note: "", source: "manual" });
const otto = (reps, sec) => Array.from({ length: 8 }, (_, i) => sett(i + 1, i + 1 === 4 ? 3 : 4, reps, sec, i + 1 === 4 ? "deload" : "normal"));
const E = (nome, muscolo, nota, settimane, base) => ({
  name: nome, muscle: muscolo, note2: nota || "",
  prescription: Object.assign({ sets: 4, reps: { min: 0, max: 0, sequence: [], label: "10-8-x" }, rest: { seconds: 120 } }, base || {}),
  progression: { weeks: settimane }
});
const esercizi = [
  E("Trazioni assistite", "dorsali", "presa prona, fermo in alto", otto({ label: "10-8-x", min: 0, max: 0, sequence: [] }, 120)),
  E("Lat machine presa neutra", "centro schiena", "", otto({ label: "8-6", min: 0, max: 0, sequence: [] }, 120).slice(0, 6), { reps: { label: "8-6", min: 0, max: 0, sequence: [] } }),
  E("Rematore bilanciere", "dorso", "fermo a terra", otto({ min: 12, max: 8, sequence: [], label: "" }, 180), { reps: { min: 12, max: 8, sequence: [], label: "" } }),
  E("Pulley basso", "dorso", "", []),
  E("Curl bilanciere", "bicipiti", "", otto({ min: 10, max: 10, sequence: [], label: "" }, 90), { reps: { min: 10, max: 10, sequence: [], label: "" } }),
  E("Curl a martello", "brachiale", "", otto({ min: 12, max: 12, sequence: [12, 10, 8], label: "" }, 60), { reps: { min: 0, max: 0, sequence: [12, 10, 8], label: "" } }),
  E("Alzate laterali", "spalle", "", otto({ min: 12, max: 12, sequence: [], label: "" }, 60)),
  E("Calf machine", "polpacci", "", otto({ min: 15, max: 15, sequence: [], label: "" }, 45)),
  E("Crunch machine", "addominali", "", otto({ min: 15, max: 15, sequence: [], label: "" }, 45))
];
const docs = [{ id: "program-v2-sheet-prg-intensita__sh-A", dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet",
  sheet: { id: "sh-A", code: "A", name: "Dorsali, spalle, braccia", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } } }];
const sedute = [
  { dateInput: "2026-10-05", sessionCode: "A", exercises: [{ name: "Trazioni assistite", kg: 42.5 }, { name: "Rematore bilanciere", kg: 60 }] },
  { dateInput: "2026-10-19", sessionCode: "A", exercises: [{ name: "Trazioni assistite", kg: 47.5 }, { name: "Lat machine presa neutra", kg: 55 }] },
  { dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Trazioni assistite", kg: 50 }, { name: "Rematore bilanciere", kg: 62.5 }, { name: "Curl bilanciere", kg: 30 }] }
];

const b64 = (f) => fs.readFileSync(f).toString("base64");
const font = ["font/nunito-sans-latin.woff2", "font/nunito-sans-latin-ext.woff2", "font/nunito-sans-corsivo-latin.woff2", "font/nunito-sans-corsivo-latin-ext.woff2", "font/jetbrains-mono-400.woff2", "font/jetbrains-mono-500.woff2", "font/jetbrains-mono-600.woff2"];
let cssText = "";
for (const f of ["comune/tema-b.css", "comune/dashboard-b.css", "comune/testata-diva.css"]) {
  let t = fs.readFileSync(f, "utf8");
  for (const p of font) t = t.split(`url("${p}")`).join(`url(data:font/woff2;base64,${b64("comune/" + p)})`);
  cssText += `\n/* ${f} */\n` + t;
}

const { renderProgramma } = await import("./comune/vista-programma.js");
const { riepilogoProgramma } = await import("./comune/programma.js");
const { ricostruisciSchede } = await import("./comune/schede-v2.js");

let h = fs.readFileSync("desktop/index.html", "utf8");
h = h.replace(/<link rel="stylesheet" href="\.\.\/comune\/[^"]+">\n?/g, "");
h = h.replace(/<script src="https:\/\/www\.gstatic\.com[^"]*"><\/script>\n?/g, "");
h = h.replace(/<script src="\.\.\/app-config-b\.js"><\/script>\n?/g, "");
h = h.replace(/<script type="module">[\s\S]*?<\/script>/g, "");
const dom = new JSDOM(h, { runScripts: "outside-only" });
const doc = dom.window.document;
["#vistaLogin", "#vistaDash", "#vistaOverview", "#vistaPianificazione", "#vistaArchivio"].forEach((s) => { const e = doc.querySelector(s); if (e) e.hidden = true; });
doc.querySelector("#vistaProgramma1").hidden = false;
doc.querySelectorAll("[data-versione]").forEach((x) => { x.textContent = "b0.39"; });
const r = riepilogoProgramma(meta, sedute, { schedeV2: ricostruisciSchede(docs), indice: 0, totaleProgrammi: 5, oggi: OGGI, quante: 8 });
renderProgramma(doc, doc.querySelector("#programma1Griglia"), { presente: true, numeroSedute: sedute.length }, r);
doc.querySelectorAll("input, textarea, select").forEach((el) => {
  if (el.tagName === "SELECT") {
    Array.prototype.forEach.call(el.options, (o) => { if (o.selected) o.setAttribute("selected", ""); else o.removeAttribute("selected"); });
  } else if (el.tagName === "TEXTAREA") { el.textContent = el.value; }
  else { el.setAttribute("value", el.value); }
});
fs.writeFileSync("scatta-prog-conf.html", dom.serialize().replace("</head>", `<style>\n${cssText}\n</style>\n</head>`));

const b = await chromium.launch();
const pB = await b.newPage({ viewport: { width: 2098, height: 1200 }, deviceScaleFactor: 1 });
await pB.goto("file://" + path.resolve("scatta-prog-conf.html"));
await pB.evaluate(() => document.fonts.ready);
await pB.waitForTimeout(400);
const area = await pB.$("#vistaProgramma1");
await area.screenshot({ path: "/tmp/prog-b.png" });

const p31 = await b.newPage({ viewport: { width: 1142, height: 1200 }, deviceScaleFactor: 1 });
await p31.goto("file://" + path.resolve("../v31.html"));
await p31.waitForTimeout(2800);
await p31.evaluate(() => {
  const pag = document.querySelector("#pag-programma-1");
  let e = pag; while (e && e !== document.body) { e.hidden = false; e.style.display = ""; e = e.parentElement; }
  pag.hidden = false; pag.style.display = "block";
  document.querySelectorAll("body *").forEach((el) => { const st = getComputedStyle(el); if (st.position === "fixed" && el.offsetHeight > 40) el.style.display = "none"; });
  window.scrollTo(0, 0);
});
await p31.waitForTimeout(700);
await p31.evaluate(() => document.fonts.ready);
const area31 = await p31.$("#pag-programma-1");
await area31.screenshot({ path: "/tmp/prog-v31.png" });

const dim = await pB.evaluate(() => ({ b: document.querySelector("#vistaProgramma1").getBoundingClientRect().width }));
const dim31 = await p31.evaluate(() => ({ v31: document.querySelector("#pag-programma-1").getBoundingClientRect().width }));
await b.close();
console.log(JSON.stringify({ b: dim, v31: dim31 }));
