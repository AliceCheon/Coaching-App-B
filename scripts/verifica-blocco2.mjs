/* Verifica del secondo blocco (impaginazione) nella pagina vera.
 * Uso: node scripts/verifica-blocco2.mjs [--shot tag]
 * Controlla con getBoundingClientRect che il fumetto non copra campi/filtri/testi/immagini,
 * che il badge INGRANDISCI stia fuori dal riquadro della figura, che le carte di Study time
 * abbiano la stessa altezza, e che il nastro finisca prima della lampadina. */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try { const u = new URL(req.url, "http://x"); let p = decodeURIComponent(u.pathname); if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" }); res.end(await readFile(join(radice, p)));
  } catch { res.writeHead(404); res.end("no"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
const iShot = process.argv.indexOf("--shot");
const tag = iShot > 0 ? (process.argv[iShot + 1] || "verifica") : null;

let browser = null;
for (const c of ["chrome", "msedge", null]) { try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch {} }

let rossi = 0;
const ok = (cond, msg) => { console.log((cond ? "  ok   " : "  ROSSO ") + msg); if (!cond) rossi += 1; };

const APRI = `(function(){
  window.__ostacoli = function(){
    var sel='input,select,textarea,button,a[href],[contenteditable="true"],[contenteditable="plaintext-only"],'
      + 'h1,h2,h3,h4,h5,h6,p,li,td,th,label,legend,summary,dt,dd,img,figure';
    var pag=document.querySelector('.voce-pag.on'), out=[];
    if(!pag) return out;
    [].forEach.call(pag.querySelectorAll(sel), function(n){
      if(n.closest('#bd-diva')) return;
      if(n.querySelector(sel)) return;
      var s=getComputedStyle(n);
      if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity)<0.05) return;
      var r=n.getBoundingClientRect();
      if(r.width<3||r.height<3) return;
      if(r.bottom<0||r.top>innerHeight) return;
      out.push({tag:n.tagName, cls:(n.className||'').toString().slice(0,24), x:Math.round(r.x), y:Math.round(r.y), r:Math.round(r.right), b:Math.round(r.bottom)});
    });
    return out;
  };
})();`;

const viste = ["dashboard", "dati-cliente", "salute-recupero", "misure", "reset-bulk-cut", "monitor-annuale",
  "monitor-peso", "integratori", "overview-atleta", "pianificazione", "database-esercizi", "scheletri",
  "progressioni", "programma-1", "riepilogo-volume", "specializzazione", "curve-forza", "archivio",
  "study-time", "impostazioni"];

for (const [W, H] of [[1440, 900], [1280, 800]]) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.route(/gstatic\.com/, (r) => r.abort());
  await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
  page.on("pageerror", (e) => { console.log("  ROSSO errore pagina:", String(e.message).slice(0, 120)); rossi += 1; });
  await page.goto(base + "/desktop/index.html");
  await page.waitForTimeout(2800);
  await page.evaluate(APRI);
  console.log("\n== " + W + "x" + H + " ==");

  /* --- 1. il fumetto non copre niente, pagina per pagina --- */
  let copertiTot = 0; const chiusi = [];
  for (const vista of viste) {
    await page.evaluate((v) => { const b = document.querySelector('.voce[data-vista="' + v + '"]'); if (b) b.click(); }, vista);
    await page.waitForTimeout(1250);
    const r = await page.evaluate(() => {
      const b = document.getElementById('dv-fumetto'), br = b.getBoundingClientRect();
      if (b.classList.contains('off')) return { off: true };
      const bo = { x: br.x, y: br.y, r: br.right, b: br.bottom };
      const coperti = window.__ostacoli().filter((o) => o.x < bo.r && bo.x < o.r && o.y < bo.b && bo.y < o.b);
      return { off: false, bo, coperti };
    });
    if (r.off) { chiusi.push(vista); }
    else if (r.coperti.length) { copertiTot += r.coperti.length; console.log("  ROSSO " + vista + " coperti:", JSON.stringify(r.coperti.slice(0, 4))); }
    if (r.off && vista === "impostazioni") ok(false, "su Impostazioni il fumetto si chiude senza motivo");
  }
  ok(copertiTot === 0, "il fumetto non copre nulla su " + viste.length + " pagine (" + chiusi.length + " si chiudono da sole per mancanza di spazio: " + chiusi.join(", ") + ")");

  /* --- 2. chiuso non torna, per pagina e nella sessione --- */
  await page.evaluate(() => document.querySelector('.voce[data-vista="dashboard"]').click());
  await page.waitForTimeout(700);
  await page.evaluate(() => { document.getElementById('dv-x').click(); });
  let stato = await page.evaluate(() => ({ off: document.getElementById('dv-fumetto').classList.contains('off'), chiave: sessionStorage.getItem('bd.diva.chiusa.dashboard') }));
  ok(stato.off && stato.chiave === "1", "chiuso con la × resta chiuso e lo ricorda per la Dashboard");
  await page.evaluate(() => document.querySelector('.voce[data-vista="misure"]').click());
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('.voce[data-vista="dashboard"]').click());
  await page.waitForTimeout(1200);
  stato = await page.evaluate(() => ({ off: document.getElementById('dv-fumetto').classList.contains('off') }));
  ok(stato.off, "tornando sulla Dashboard il fumetto resta chiuso");
  await page.reload();
  await page.waitForTimeout(2600);
  stato = await page.evaluate(() => ({ off: document.getElementById('dv-fumetto').classList.contains('off') }));
  ok(stato.off, "anche dopo il ricaricamento, nella stessa sessione, resta chiuso");
  await page.evaluate(() => document.querySelector('.voce[data-vista="misure"]').click());
  await page.waitForTimeout(1200);
  stato = await page.evaluate(() => ({ off: document.getElementById('dv-fumetto').classList.contains('off') }));
  ok(!stato.off, "su un'altra pagina (Misure) invece parla");
  /* il tasto sempre visibile lo riapre */
  await page.evaluate(() => document.getElementById('dv-x').click());
  await page.evaluate(() => document.getElementById('dv-ava').click());
  await page.waitForTimeout(500);
  stato = await page.evaluate(() => ({ off: document.getElementById('dv-fumetto').classList.contains('off') }));
  ok(!stato.off, "il tasto della Diva riapre il fumetto");
  await page.evaluate(() => document.getElementById('dv-x').click());

  /* --- 3. il testo per Impostazioni è suo --- */
  await page.evaluate(() => document.querySelector('.voce[data-vista="impostazioni"]').click());
  await page.waitForTimeout(1000);
  const testoImp = await page.evaluate(() => ({
    dove: document.getElementById('dv-where').textContent,
    testo: document.getElementById('dv-testo').textContent
  }));
  ok(/Impostazioni/.test(testoImp.dove) && /Impostazioni\./.test(testoImp.testo) && !/Dashboard/i.test(testoImp.testo),
    "su Impostazioni dice una cosa sua: «" + testoImp.dove + "»");
  if (tag) await page.screenshot({ path: "/tmp/blocco2-" + tag + "-impostazioni-" + W + ".png" });

  /* --- 4. Study time: badge fuori, carte pari --- */
  await page.evaluate(() => document.querySelector('.voce[data-vista="study-time"]').click());
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('#pag-study-time .st-fig img') && document.querySelector('#pag-study-time .st-fig img').scrollIntoView({ block: "center" }));
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const out = { badge: [], righe: [] };
    document.querySelectorAll('#pag-study-time .st-zoom').forEach((z) => {
      const fig = z.closest('.st-fig'), im = fig && fig.querySelector('img');
      if (!fig || !im) return;
      const zr = z.getBoundingClientRect(), fr = fig.getBoundingClientRect(), ir = im.getBoundingClientRect();
      if (zr.width < 2) return;
      out.badge.push({
        dentro: zr.left >= fr.left - 0.5 && zr.right <= fr.right + 0.5 && zr.top >= fr.top - 0.5 && zr.bottom <= fr.bottom + 0.5,
        sopra: !(zr.right < ir.left || zr.left > ir.right || zr.bottom < ir.top || zr.top > ir.bottom)
      });
    });
    const griglia = document.querySelector('#pag-study-time .st-grid');
    if (griglia) {
      const perRiga = {};
      [].forEach.call(griglia.children, (c) => {
        const r = c.getBoundingClientRect(); if (r.height < 5) return;
        const k = Math.round(r.top);
        (perRiga[k] = perRiga[k] || []).push(r.height);
      });
      out.righe = Object.keys(perRiga).map((k) => perRiga[k]);
    }
    const f = document.querySelector('#pag-study-time .st-fig');
    out.figH = f ? Math.round(f.getBoundingClientRect().height) : 0;
    out.varH = getComputedStyle(document.getElementById('pag-study-time')).getPropertyValue('--st-fig-h').trim();
    return out;
  });
  ok(st.badge.length > 0 && st.badge.every((b) => !b.dentro), "il badge INGRANDISCI non sta dentro il riquadro della figura (" + st.badge.length + " badge)");
  ok(st.badge.every((b) => !b.sopra), "il badge non copre il disegno");
  ok(st.righe.every((h) => Math.max.apply(null, h) - Math.min.apply(null, h) <= 1), "le carte affiancate hanno la stessa altezza in ogni riga");
  ok(st.varH.length > 0, "altezza figura dichiarata una volta per tutte: " + st.varH);
  if (tag) await page.screenshot({ path: "/tmp/blocco2-" + tag + "-study-time-" + W + ".png" });

  /* --- 5. lampadina e nastro --- */
  await page.evaluate(() => document.querySelector('.voce[data-vista="dashboard"]').click());
  await page.waitForTimeout(800);
  const nl = await page.evaluate(() => {
    const g = (n) => { const r = n.getBoundingClientRect(); return { x: Math.round(r.x), r: Math.round(r.right), y: Math.round(r.y), b: Math.round(r.bottom) }; };
    return { lamp: g(document.getElementById('bd-tema')), nastro: g(document.querySelector('.nastro')), fr: g(document.getElementById('fr-nastro')) };
  });
  ok(nl.fr.r < nl.lamp.x && nl.nastro.r < nl.lamp.x, "il nastro finisce prima della lampadina (" + nl.nastro.r + " < " + nl.lamp.x + ")");
  if (tag) await page.screenshot({ path: "/tmp/blocco2-" + tag + "-dashboard-" + W + ".png" });

  await page.close();
}
await browser.close(); server.close();
console.log("\n" + (rossi ? "ROSSI: " + rossi : "tutto verde"));
process.exit(rossi ? 1 : 0);
