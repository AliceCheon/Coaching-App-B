import { chromium } from "playwright";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1142, height: 1200 }, deviceScaleFactor: 2 });
await p.goto("file:///home/user/workspace/v31.html");
await p.waitForTimeout(2600);
await p.evaluate(() => {
  const pag = document.querySelector("#pag-programma-1");
  let e = pag; while (e && e !== document.body) { e.hidden = false; e.hidden = false; e.style.display = ""; e = e.parentElement; }
  document.querySelectorAll("body *").forEach((el) => { const st = getComputedStyle(el); if (st.position === "fixed" && el.offsetHeight > 40) el.style.display = "none"; });
});
await p.waitForTimeout(500);
await p.evaluate(() => { const pag = document.querySelector("#pag-programma-1"); pag.hidden = false; pag.style.display = "block"; });
await p.locator("#pag-programma-1 .pr-head").screenshot({ path: "/tmp/v31-head.png" });
const info = await p.evaluate(() => [...document.querySelectorAll("#pag-programma-1 .pg-top > *")].map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: String(el.className), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; }));
console.log(JSON.stringify(info));
await b.close();
