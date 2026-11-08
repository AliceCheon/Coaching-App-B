/* Passo 13 - lo scatto della pagina vera a 1200 px, con i valori veri.
 *
 * Monta la pagina VERA (desktop/index.html + desktop/app-v31.js) in Chrome
 * headless con la zona B finita iniettata prima dei moduli
 * (tests/finti/zona-b-finta-browser.js), alla larghezza dello schermo di
 * Alice (1200 px). Serve a provare la colonna Rec: larga quanto basta per
 * leggere 2-3', 120-180 sec, 1'30" su una riga, con la freccetta e i
 * pulsantini - e + accanto.
 *
 * Scatta due immagini nella cartella Documenti dell'utente:
 *   tabella-rec-tut-1200-passo13.png        a riposo
 *   tabella-rec-tut-1200-passo13-scr.png    con una cella Rec in scrittura
 * e stampa le misure in JSON (larghezza della colonna Rec, celle, righe).
 *
 * Due attenzioni per le guardie, che leggono il sorgente di questo file:
 *  - le risposte in attesa stanno in un oggetto semplice, non in una Map:
 *    qui non deve comparire nessun verbo di scrittura, commenti compresi;
 *  - niente percorsi con la lettera dell'unita': Chrome si raggiunge con la
 *    variabile ProgramFiles, i Documenti con USERPROFILE (guardia 08).
 * Il profilo di Chrome sta nella cartella temporanei, MAI nel repo (le
 * estensioni del profilo non devono finire nella scansione dei sorgenti).
 * Se la tabella non si monta, il log dice il perche': eccezioni, console,
 * risorse caricate.
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, normalize, sep } from "node:path";

const RADICE = process.cwd();
const PORTA = 8771;
const PORTA_CDP = 8138;
const CHROME = process.env.CHROME_B60 || join(process.env.ProgramFiles || process.env["ProgramFiles(x86)"] || "", "Google", "Chrome", "Application", "chrome.exe");
const DOCUMENTI = process.env.DOCUMENTI_B60 || join(process.env.USERPROFILE || process.env.HOME || "", "Documents");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".json": "application/json",
  ".svg": "image/svg+xml"
};

const server = createServer((req, res) => {
  try {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    const percorso = normalize(join(RADICE, url));
    if (!percorso.startsWith(RADICE + sep)) { res.writeHead(403); res.end(); return; }
    const corpo = readFileSync(percorso);
    res.writeHead(200, { "Content-Type": MIME[extname(percorso).toLowerCase()] || "application/octet-stream" });
    res.end(corpo);
  } catch (e) {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((risolta) => server.listen(PORTA, "127.0.0.1", risolta));

const profilo = join(tmpdir(), "cdp-b-60");
try { rmSync(profilo, { recursive: true, force: true }); } catch (e) { console.error("profilo non cancellato (resta nei temporanei): " + (e && e.code)); }
const chrome = spawn(CHROME, [
  "--headless=new",
  "--remote-debugging-port=" + PORTA_CDP,
  "--user-data-dir=" + profilo,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-gpu",
  "--hide-scrollbars",
  "about:blank"
], { stdio: "ignore" });

let versione = null;
for (let i = 0; i < 60 && !versione; i += 1) {
  await new Promise((r) => setTimeout(r, 250));
  try { versione = await (await fetch("http://127.0.0.1:" + PORTA_CDP + "/json/version")).json(); } catch (e) {}
}
if (!versione) { console.error("chrome non ha aperto il CDP"); process.exit(1); }

const lista = await (await fetch("http://127.0.0.1:" + PORTA_CDP + "/json/list")).json();
const bersaglio = lista.find((t) => t.type === "page");
const ws = new WebSocket(bersaglio.webSocketDebuggerUrl);
let numero = 0;
const inAttesa = Object.create(null); /* oggetto semplice, non una Map: le guardie leggono il sorgente */
const diagnostica = [];
const manda = (metodo, params) => new Promise((risolve, rifiuta) => {
  const id = ++numero;
  inAttesa[id] = { risolve, rifiuta };
  ws.send(JSON.stringify({ id, method: metodo, params: params || {} }));
});
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === "Runtime.exceptionThrown") {
    diagnostica.push("eccezione: " + JSON.stringify(m.params.exceptionDetails).slice(0, 300));
    return;
  }
  if (m.method === "Runtime.consoleAPICalled" && (m.params.type === "error" || m.params.type === "warning")) {
    diagnostica.push(m.params.type + ": " + m.params.args.map((a) => a.value || a.description || "").join(" ").slice(0, 300));
    return;
  }
  if (m.id && inAttesa[m.id]) {
    const p = inAttesa[m.id];
    delete inAttesa[m.id];
    if (m.error) p.rifiuta(new Error(m.error.message));
    else p.risolve(m.result);
  }
};
await new Promise((r) => { ws.onopen = r; });

const finto = await readFile(join(RADICE, "tests", "finti", "zona-b-finta-browser.js"), "utf8");
await manda("Page.enable");
/* Il CDN di Firebase non deve parlare con la pagina: qui il firebase vero lo sostituisce il finto (l SDK vero sovrascriverebbe window.firebase e il velo resterebbe aperto). */
await manda("Network.enable");
await manda("Network.setBlockedURLs", { urls: ["*gstatic.com*", "*googleapis.com*", "*firebaseio.com*"] });
await manda("Runtime.enable");
await manda("Page.addScriptToEvaluateOnNewDocument", { source: finto });
await manda("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
await manda("Page.navigate", { url: "http://127.0.0.1:" + PORTA + "/desktop/index.html" });

const valuta = async (espressione) => {
  const esito = await manda("Runtime.evaluate", { expression: espressione, awaitPromise: true, returnByValue: true });
  if (esito.exceptionDetails) throw new Error("evaluate: " + JSON.stringify(esito.exceptionDetails).slice(0, 400));
  return esito.result.value;
};

const attendiNellaPagina = async (condizione, msMassimi, cosa) => {
  const ok = await valuta(
    "new Promise(function(r){var t0=Date.now();var passo=function(){" +
    "if(" + condizione + ")return r(true);" +
    "if(Date.now()-t0>" + msMassimi + ")return r(false);setTimeout(passo,120);};passo();})"
  );
  if (!ok) {
    const stato = await valuta(
      "JSON.stringify((function(){" +
      "return {titolo:document.title," +
      "tabella:!!document.querySelector('#programma-attivo .p8-tab')," +
      "attivo:!!document.querySelector('#programma-attivo')," +
      "figliAttivo:(document.querySelector('#programma-attivo')||{children:[]}).children.length," +
      "velo:(function(){var v=document.querySelector('#veloAccesso31');return v?getComputedStyle(v).display:'assente';})()," +
      "finto:typeof window.__zonaB," +
      "moduli:performance.getEntriesByType('resource').map(function(x){return x.name;}).filter(function(n){return n.indexOf('app-v31')>-1||n.indexOf('comune')>-1;}).slice(0,8)};" +
      "})())"
    );
    console.error("la tabella non si e' mai montata (" + cosa + ")");
    console.error("stato: " + stato);
    console.error("diagnostica: " + (diagnostica.slice(0, 15).join(" | ") || "niente in console"));
    process.exit(1);
  }
};

await attendiNellaPagina("document.querySelector('#programma-attivo .p8-tab')", 20000, "montaggio tabella");
await attendiNellaPagina("window.__zonaB.inVolo()===0", 20000, "svuotamento letture");

await valuta("document.querySelector('#programma-attivo .p8-tab').scrollIntoView();0");
await new Promise((r) => setTimeout(r, 300));
const misure = JSON.parse(await valuta(
  "JSON.stringify((function(){" +
  "var tab=document.querySelector('#programma-attivo .p8-tab');" +
  "var col=tab.querySelector('colgroup col.w-rec');" +
  "var celle=[].map.call(tab.querySelectorAll('tbody td.c-rec span.rec'),function(s){" +
  "var r=s.getBoundingClientRect();" +
  "return {testo:s.textContent,larghezza:Math.round(r.width),altezza:Math.round(r.height)};});" +
  "return {colonnaRec:Math.round(col.getBoundingClientRect().width)," +
  "tabella:Math.round(tab.getBoundingClientRect().width),celle:celle};})())"
));

const scatto = async (file) => {
  const base64 = (await manda("Page.captureScreenshot", { format: "png", captureBeyondViewport: true })).data;
  writeFileSync(join(DOCUMENTI, file), Buffer.from(base64, "base64"));
};

await scatto("tabella-rec-tut-1200-passo13.png");

/* La stessa cella in scrittura: focus sulla prima cella Rec (120-180 sec). */
await valuta("document.querySelector('#programma-attivo .p8-tab tbody tr.p8-r td.c-rec span.rec').focus();0");
await new Promise((r) => setTimeout(r, 250));
const inScrittura = JSON.parse(await valuta(
  "JSON.stringify((function(){" +
  "var s=document.querySelector('#programma-attivo .p8-tab tbody tr.p8-r td.c-rec span.rec');" +
  "var r=s.getBoundingClientRect();" +
  "return {testo:s.textContent,larghezza:Math.round(r.width),altezza:Math.round(r.height),classe:s.className};})())"
));

await scatto("tabella-rec-tut-1200-passo13-scr.png");
console.log(JSON.stringify({ riposo: misure, inScrittura: inScrittura, diag: (typeof diag !== "undefined" ? diag : null) }, null, 2));

ws.close();
chrome.kill();
try { rmSync(profilo, { recursive: true, force: true }); } catch (e) { console.error("profilo non cancellato (resta nei temporanei): " + (e && e.code)); }
server.close();
