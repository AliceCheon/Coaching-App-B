import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => { try { const u=new URL(req.url,"http://x"); let p=decodeURIComponent(u.pathname); if(p.endsWith("/"))p+="index.html"; res.writeHead(200,{"content-type":MIME[extname(p)]||"application/octet-stream"}); res.end(await readFile(join(radice,p))); } catch { res.writeHead(404); res.end("no"); } });
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const base="http://127.0.0.1:"+server.address().port;
let browser=null; for(const c of ["chrome",null]){try{browser=await chromium.launch(c?{channel:c}:{});break;}catch{}}
const page=await browser.newPage({viewport:{width:1440,height:900}});
await page.route(/gstatic\.com/,r=>r.abort());
await page.addInitScript({path:join(radice,"tests","finti","zona-b-finta-browser.js")});
await page.goto(base+"/desktop/index.html"); await page.waitForTimeout(2600);
await page.evaluate(()=>document.querySelector('.voce[data-vista="overview-atleta"]').click());
await page.waitForTimeout(1400);
const stato = async (t) => console.log(t, await page.evaluate(()=>{
  const b=document.getElementById('dv-fumetto'); const r=b.getBoundingClientRect();
  return { off:b.classList.contains('off'), x:Math.round(r.x), y:Math.round(r.y), w:Math.round(r.width), h:Math.round(r.height) };
}));
await stato("dopo apertura pagina:");
await page.evaluate(()=>document.getElementById('dv-ava').click());
await page.waitForTimeout(400);
await stato("dopo clic sulla Diva:");
await page.waitForTimeout(9200);
await stato("dopo 9 secondi:");
await browser.close(); server.close(); process.exit(0);
