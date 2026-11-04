import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { chromium } from "playwright";
const { renderDashboardV31 } = await import("./comune/vista-dashboard.js");
const { montaDivaBot } = await import("./comune/diva-bot.js");
const tema = process.argv[2] || "light";
const fuori = process.argv[3] || "/tmp/tema.png";
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
const font = ["nunito-sans-latin", "nunito-sans-latin-ext", "nunito-sans-corsivo-latin", "nunito-sans-corsivo-latin-ext"];
let cssText = "";
for (const f of ["comune/tema-b.css", "comune/dashboard-b.css", "comune/testata-diva.css"]) {
  let t = fs.readFileSync(f, "utf8");
  for (const p of font) t = t.split(`url("font/${p}.woff2")`).join(`url(data:font/woff2;base64,${b64("comune/font/" + p + ".woff2")})`);
  cssText += `\n/* ${f} */\n` + t;
}
const dom = new JSDOM(h, { runScripts: "outside-only" });
const doc = dom.window.document;
doc.documentElement.setAttribute("data-theme", tema);
doc.body.setAttribute("data-theme", tema);
doc.querySelector("#vistaLogin").hidden = true;
doc.querySelector("#vistaDash").hidden = false;
doc.querySelector("#vistaOverview").hidden = true;
renderDashboardV31(doc, doc.querySelector("#griglia"), modello, opz);
montaDivaBot(doc.querySelector("#divaContenitore"), ["Mercoledì. Se la settimana fosse una serie, sarebbe la terza: quella in cui si capisce il carico."], "neutro");
const nome = "/tmp/pagina-" + tema + ".html";
fs.writeFileSync(nome, dom.serialize().replace("</head>", `<style>\n${cssText}\n</style>\n</head>`));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
await p.goto("file://" + nome);
await p.waitForTimeout(900);
await p.screenshot({ path: fuori, clip: { x: 0, y: 0, width: 420, height: 1000 } });
const m = await p.evaluate(() => {
  const r = document.querySelector(".rail");
  const v = document.querySelector(".voce.spenta .tx");
  const e = document.querySelector(".gruppo>.etichetta");
  return { railBg: getComputedStyle(r).backgroundColor, voce: getComputedStyle(v).color, etichetta: getComputedStyle(e).color, marchio: getComputedStyle(document.querySelector(".marchio-nome")).color };
});
await b.close();
console.log(tema, JSON.stringify(m));
