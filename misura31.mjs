import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1142, height: 1400 }, deviceScaleFactor: 1 });
await p.goto("file://" + path.resolve("../v31.html"));
await p.waitForTimeout(2600);
await p.evaluate(() => {
  const pag = document.querySelector("#pag-programma-1");
  let e = pag; while (e && e !== document.body) { e.hidden = false; e.style.display = ""; e = e.parentElement; }
  pag.hidden = false; pag.style.display = "block";
  document.querySelectorAll("body *").forEach((el) => { const st = getComputedStyle(el); if (st.position === "fixed" && el.offsetHeight > 40) el.style.display = "none"; });
  window.scrollTo(0, 0);
});
await p.waitForTimeout(600);
await p.evaluate(() => document.fonts.ready);
const html = await p.evaluate(() => document.querySelector("#pag-programma-1").outerHTML);
fs.writeFileSync("/tmp/v31-prog.html", html);
console.log("LEN", html.length);
const info = await p.evaluate(() => {
  const pag = document.querySelector("#pag-programma-1");
  const fmt = (el) => { if (!el) return null; const s = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: el.className && el.className.toString().slice(0,80), txt: (el.textContent||"").trim().slice(0,45),
      font: s.fontSize + "/" + s.fontWeight + " " + s.fontFamily.slice(0,24), pad: s.padding, h: Math.round(r.height), w: Math.round(r.width),
      radius: s.borderRadius, color: s.color, bg: s.backgroundColor, border: s.borderTopWidth + " " + s.borderTopColor }; };
  const byText = (t) => [...pag.querySelectorAll("button,a,span,div,label,input")].find((e) => (e.textContent||"").trim() === t && e.offsetHeight > 0);
  const res = {};
  ["Annulla ctrl z","Database esercizi","Libreria Coach"].forEach((t) => { const e = byText(t); res[t] = fmt(e); if (e) res[t].html = e.outerHTML.slice(0,600); });
  res.lingue = [...pag.querySelectorAll("button,[role=tab],a")].filter((e)=>/(Scheda [A-Z]|Stress)/.test((e.textContent||"").trim()) && e.offsetHeight>0).slice(0,6).map(fmt);
  res.filtri = [...pag.querySelectorAll("button")].filter((e)=>["Tutti","Q","G"].includes((e.textContent||"").trim()) && e.offsetHeight>0).slice(0,6).map(fmt);
  const th = [...pag.querySelectorAll("th")].map((e)=>({txt:(e.textContent||"").trim().slice(0,22), w: Math.round(e.getBoundingClientRect().width), font: getComputedStyle(e).fontSize, html: e.outerHTML.slice(0,300)}));
  res.th = th;
  res.inputs = [...pag.querySelectorAll("input,textarea")].slice(0,12).map((e)=>({...fmt(e), placeholder: e.placeholder, type: e.type}));
  return res;
});
console.log(JSON.stringify(info, null, 1));
await b.close();
