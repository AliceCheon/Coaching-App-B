import { chromium } from "playwright";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
let browser=null; for(const c of ["chrome",null]){try{browser=await chromium.launch(c?{channel:c}:{});break;}catch{}}
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errori=[]; page.on("pageerror",e=>errori.push(String(e.message).slice(0,120)));
await page.route(/gstatic\.com/,r=>r.abort());
await page.addInitScript({path:join(radice,"tests","finti","zona-b-finta-browser.js")});
/* L'indirizzo pubblico non si scrive qui: la guardia 08 vieta il nome
 * dell'account GitHub nel repository. Si passa da BD_URL se serve. */
const indirizzo = process.env.BD_URL || "http://127.0.0.1:8123/desktop/";
await page.goto(indirizzo, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);
console.log("build:", await page.evaluate(()=>document.getElementById('bd-ver').textContent));
for (const v of ["misure","study-time","impostazioni"]) {
  await page.evaluate(v=>document.querySelector('.voce[data-vista="'+v+'"]').click(),v);
  await page.waitForTimeout(1400);
  const r = await page.evaluate(()=>{
    const b=document.getElementById('dv-fumetto'), br=b.getBoundingClientRect();
    const off=b.classList.contains('off');
    const pag=document.querySelector('.voce-pag.on');
    let coperti=0;
    if(!off) pag.querySelectorAll('input,select,textarea,button').forEach(n=>{const q=n.getBoundingClientRect(); if(q.width<3)return; if(q.left<br.right&&br.left<q.right&&q.top<br.bottom&&br.top<q.bottom) coperti++;});
    return {off, coperti, dove:(document.getElementById('dv-where')||{}).textContent, testo:(document.getElementById('dv-testo').textContent||'').slice(0,60)};
  });
  console.log(v, JSON.stringify(r));
}
console.log("errori:", JSON.stringify(errori));
await browser.close(); process.exit(0);
