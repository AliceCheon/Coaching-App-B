import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { chromium } from "playwright";
const radice = "/tmp/bdrepo";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
page.on("pageerror", (e) => console.log("ERRORE DI PAGINA:", String(e.message).slice(0, 200)));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 200)); });
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2800);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(1200);

console.log("tasti con Cambia:", await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /cambia/i.test(b.textContent || "")).map((b) => ({ t: (b.textContent || "").trim().slice(0, 30), id: b.id, d: b.getAttribute("data-cambia") }))));
await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x) => /^cambia/i.test((x.textContent || "").trim())); if (b) b.click(); });
await page.waitForTimeout(1500);
console.log("pannello aperto:", await page.evaluate(() => !!document.querySelector(".pr-elenco-schede, [data-progp], .prog-panel")));

console.log("tutti i cestini:", await page.evaluate(() => [...document.querySelectorAll(".pr-cestino")].map((b) => {
  const r = b.getBoundingClientRect();
  return { scheda: b.getAttribute("data-cestino-scheda"), visibile: r.width > 0 && r.height > 0,
    dentro: (() => { let n = b.parentElement, out = []; while (n && out.length < 4) { out.push((n.className || n.tagName || "").toString().slice(0, 24)); n = n.parentElement; } return out.join(" < "); })() };
})));
const cliccato = await page.evaluate(() => {
  const b = document.querySelector(".pr-cestino");
  if (!b) return "nessun cestino";
  /* un clic vero, con l'evento che arriva come dal mouse */
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true, view: window });
  const esito = b.dispatchEvent(ev);
  return "cliccato su scheda " + b.getAttribute("data-cestino-scheda") + " (disabled=" + b.disabled + ", titolo=" + b.title + ")";
});
console.log(cliccato);
await page.waitForTimeout(800);
console.log("esiste un modale?", await page.evaluate(() => {
  const m = document.querySelector(".cestino-modale");
  if (!m) return { presente: false };
  const r = m.getBoundingClientRect();
  const st = getComputedStyle(m);
  return { presente: true, padre: m.parentElement && m.parentElement.className, display: st.display, visibilita: st.visibility,
    z: st.zIndex, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
}));
console.log("modale:", await page.evaluate(() => {
  const m = document.querySelector(".cestino-modale");
  if (!m) return "nessuna";
  return {
    domanda: (m.querySelector(".cestino-domanda") || {}).textContent,
    nota: (m.querySelector(".cestino-nota") || {}).textContent,
    conferma: (m.querySelector("[data-cestino-conferma]") || {}).textContent
  };
}));
await browser.close(); server.close(); process.exit(0);
