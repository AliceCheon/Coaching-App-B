import { chromium } from "playwright";
const radice = "/tmp";
let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }
if (!browser) { console.log("nessun browser"); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("errore:", String(e.message).slice(0, 140)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.goto("file:///tmp/mockup-confronto-v2.html");
await page.waitForTimeout(900);
await page.screenshot({ path: "/tmp/mockup-confronto-v2.png", fullPage: true });
const misure = await page.evaluate(() => {
  const m = document.querySelector(".modale").getBoundingClientRect();
  return { larghezza: Math.round(m.width), altezza: Math.round(m.height), settimane: document.querySelectorAll(".sett").length,
    altezzaPagina: Math.round(document.documentElement.scrollHeight), overflowOrizz: document.documentElement.scrollWidth > window.innerWidth };
});
console.log("misure:", JSON.stringify(misure));
await browser.close();
