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
const tag=process.argv[2]||"studio";
for (const [W,H] of [[1440,900],[1280,800]]) {
  const page=await browser.newPage({viewport:{width:W,height:H}});
  await page.route(/gstatic\.com/,r=>r.abort());
  await page.addInitScript({path:join(radice,"tests","finti","zona-b-finta-browser.js")});
  await page.goto(base+"/desktop/index.html"); await page.waitForTimeout(2600);
  await page.evaluate(()=>document.querySelector('.voce[data-vista="study-time"]').click());
  await page.waitForTimeout(900);
  await page.evaluate(()=>document.querySelector('#pag-study-time .st-fig img')?.scrollIntoView({block:'center'}));
  await page.waitForTimeout(2600);
  await page.screenshot({path:"/tmp/blocco2-"+tag+"-studio-carte-"+W+".png"});
  const m=await page.evaluate(()=>{
    const c=[...document.querySelectorAll('#pag-study-time .st-grid > .st-card')].slice(0,6).map(x=>{
      const r=x.getBoundingClientRect(), f=x.querySelector('.st-fig'), i=x.querySelector('.st-fig img');
      const fr=f.getBoundingClientRect(), ir=i.getBoundingClientRect();
      const z=x.querySelector('.st-zoom'), zr=z?z.getBoundingClientRect():null;
      return {h4:(x.querySelector('h4')||{}).textContent.slice(0,28), card:Math.round(r.height), fig:[Math.round(fr.width),Math.round(fr.height)], img:[Math.round(ir.width),Math.round(ir.height)], badge: zr? {fuoriFigura: zr.left>=fr.right||zr.right<=fr.left||zr.top>=fr.bottom||zr.bottom<=fr.top, sopraImmagine: !(zr.right<ir.left||zr.left>ir.right||zr.bottom<ir.top||zr.top>ir.bottom)}:null};
    });
    return c;
  });
  console.log(W, JSON.stringify(m,null,0));
  await page.close();
}
await browser.close(); server.close(); process.exit(0);
