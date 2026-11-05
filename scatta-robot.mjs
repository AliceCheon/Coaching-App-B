import path from "node:path";
import { chromium } from "playwright";
const b = await chromium.launch();
const pB = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await pB.goto("file://" + path.resolve("scatta-prog-conf.html"));
await pB.evaluate(() => document.fonts.ready);
await pB.waitForTimeout(900);
await pB.screenshot({ path: "/tmp/robot-b.png" });
const p31 = await b.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await p31.goto("file://" + path.resolve("../v31.html"));
await p31.waitForTimeout(2800);
await p31.evaluate(() => {
  const pag = document.querySelector("#pag-programma-1");
  let e = pag; while (e && e !== document.body) { e.hidden = false; e.style.display = ""; e = e.parentElement; }
  pag.hidden = false; pag.style.display = "block";
  window.scrollTo(0, 0);
});
await p31.waitForTimeout(900);
await p31.evaluate(() => document.fonts.ready);
await p31.screenshot({ path: "/tmp/robot-v31.png" });
await b.close();
console.log("robot ok");
