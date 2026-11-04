import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";
const { renderDashboardV31 } = await import("./comune/vista-dashboard.js");
const { renderPianificazione } = await import("./comune/vista-pianificazione.js");
const { riepilogoPianificazione } = await import("./comune/pianificazione.js");
const { montaDivaBot } = await import("./comune/diva-bot.js");

const oggi = new Date(Date.UTC(2026, 10, 4));
const codici = ["A", "B", "C", "D"];
const nomi = { A: "Spinta A", B: "Tirata A", C: "Gambe A", D: "Richiamo" };
const sedute = [];
for (let i = 0; i < 124; i += 1) {
  const d = new Date(Date.UTC(2026, 10, 3) - (123 - i) * 2 * 86400000);
  const c = codici[i % 4];
  sedute.push({ dateInput: d.toISOString().slice(0, 10), sessionCode: c, sessionName: nomi[c] });
}
const modello = {
  presente: true, numeroSedute: 124, numeroDocumentiSedute: 124, seduteSenzaId: 0, seduteDuplicate: 0,
  ultima: { data: "03/11/2026", codice: "S1" }, numeroProgrammi: 5,
  programma: { nome: "Intensità ottobre-dicembre", settimana: 1, esplicito: true },
  controlloProgrammi: { radice: 5, letti: 5, coincide: true, mancanti: false },
  controlloSessioni: { radice: 124, sottoraccolta: 124, coincide: true },
  peso: null, checkin: null
};
const opz = {
  righeQuadro: [{ etichetta: "Sedute negli ultimi 28 giorni", valore: "14" }, { etichetta: "Settimane senza sedute", valore: "0" }, { etichetta: "Giorni dall'ultima", valore: "1" }],
  righeSemaforo: [{ etichetta: "Carico", valore: "in continuità" }, { etichetta: "Pausa", valore: "1 giorno" }],
  righeMancanti: [{ etichetta: "Articolazione per esercizio", valore: "non registrata" }]
};

let h = fs.readFileSync("desktop/index.html", "utf8");
h = h.replace(/<link rel="stylesheet" href="\.\.\/comune\/[^"]+">\n?/g, "");
h = h.replace(/<script src="https:\/\/www\.gstatic\.com[^"]*"><\/script>\n?/g, "");
h = h.replace(/<script src="\.\.\/app-config-b\.js"><\/script>\n?/g, "");
h = h.replace(/<script type="module">[\s\S]*?<\/script>/g, "");
const b64 = (f) => fs.readFileSync(f).toString("base64");
const font = { "font/nunito-sans-latin.woff2": 1, "font/nunito-sans-latin-ext.woff2": 1, "font/nunito-sans-corsivo-latin.woff2": 1, "font/nunito-sans-corsivo-latin-ext.woff2": 1 };
let cssText = "";
for (const f of ["comune/tema-b.css", "comune/dashboard-b.css", "comune/testata-diva.css"]) {
  let t = fs.readFileSync(f, "utf8");
  for (const p of Object.keys(font)) t = t.split(`url("${p}")`).join(`url(data:font/woff2;base64,${b64("comune/" + p)})`);
  cssText += `\n/* ${f} */\n` + t;
}
const dom = new JSDOM(h, { runScripts: "outside-only" });
const doc = dom.window.document;
doc.querySelector("#vistaLogin").hidden = true;
doc.querySelector("#vistaDash").hidden = true;
doc.querySelector("#vistaOverview").hidden = true;
  doc.querySelector("#vistaPianificazione").hidden = false;
renderDashboardV31(doc, doc.querySelector("#griglia"), modello, opz);
renderPianificazione(doc, doc.querySelector("#pianificazioneGriglia"), modello, riepilogoPianificazione(sedute, { oggi, settimane: 8 }));
montaDivaBot(doc.querySelector("#divaContenitore"), ["Mercoledì. Se la settimana fosse una serie, sarebbe la terza: quella in cui si capisce il carico."], "neutro");
fs.writeFileSync("scatta-2-4.html", dom.serialize().replace("</head>", `<style>\n${cssText}\n</style>\n</head>`));

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto("file://" + path.resolve("scatta-2-4.html"));
await p.waitForTimeout(1500);
await p.screenshot({ path: "/tmp/pz-1440.png" });
await p.screenshot({ path: "/tmp/pz-1440-full.png", fullPage: true });
const m = await p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return { w: Math.round(x.width), h: Math.round(x.height) }; };
  return { sint: r(".pz-sint"), righe: document.querySelectorAll(".pz-riga").length, celle: document.querySelectorAll(".pz-cella").length, piene: document.querySelectorAll(".pz-cella.piena").length, testo: document.querySelector(".pz-sint-testo h3")?.textContent };
});
await b.close();
console.log(JSON.stringify(m));
