/* Guardia d'impianto: questa non legge le classi, guarda la pagina in un
 * browser vero. Il guasto che l'ha fatta nascere: un blocco «schermo stretto»
 * finito fuori dalla sua media query, che a 1440 px spezzava le due colonne e
 * mandava il menu in alto, largo come la pagina. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import net from "node:net";

const radice = path.resolve(import.meta.dirname, "..");

async function portaLibera() {
  return new Promise((ok) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => ok(p));
    });
  });
}

/* Il motore: se c'è Playwright con il suo Chromium, bene; altrimenti
 * playwright-core guidando il Chrome (o Edge) già installato sul computer.
 * Se non c'è nessuno dei due, la prova lo dice a voce alta e si salta: non
 * finge di aver guardato la pagina. */
async function apriBrowser() {
  for (const pacchetto of ["playwright", "playwright-core"]) {
    let chromium;
    try {
      ({ chromium } = await import(pacchetto));
    } catch {
      continue;
    }
    try {
      return await chromium.launch();
    } catch {
      for (const canale of ["chrome", "msedge"]) {
        try {
          return await chromium.launch({ channel: canale });
        } catch {}
      }
    }
  }
  return null;
}

test("32 impianto: menu a sinistra e pagina a destra, in un browser vero", async (t) => {
  const porta = await portaLibera();
  const server = spawn("python3", ["-m", "http.server", String(porta), "--bind", "127.0.0.1"], {
    cwd: radice,
    stdio: "ignore"
  });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await apriBrowser();
  if (!browser) {
    server.kill();
    t.skip("serve playwright o playwright-core col Chrome installato: prova non eseguita");
    return;
  }
  try {
    const pagina = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    // Fuori casa non si esce: la prova guarda l'impianto, non Firebase.
    await pagina.route("**/*", (r) => r.request().url().includes("127.0.0.1") ? r.continue() : r.abort());
    await pagina.goto(`http://127.0.0.1:${porta}/desktop/index.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await pagina.waitForSelector(".guscio .rail", { timeout: 10000 });
    await pagina.waitForTimeout(400);

    const misure = await pagina.evaluate(() => {
      const rail = document.querySelector(".rail");
      const area = document.querySelector("main.area");
      const r = rail.getBoundingClientRect();
      const a = area.getBoundingClientRect();
      const cs = getComputedStyle(rail);
      return {
        rail: { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom },
        area: { x: a.x, y: a.y, w: a.width, top: a.top },
        colonne: getComputedStyle(document.querySelector(".guscio")).gridTemplateColumns,
        display: cs.display,
        wrap: cs.flexWrap,
        altezzaFinestra: window.innerHeight
      };
    });

    await t.test("32.01 a 1440 px il menu sta a sinistra del contenuto", () => {
      assert.ok(
        misure.rail.right <= misure.area.x + 1,
        `il menu finisce a ${Math.round(misure.rail.right)} px, la Dashboard comincia a ${Math.round(misure.area.x)} px: si sovrappongono`
      );
    });

    await t.test("32.02 a 1440 px la barra è alta come la finestra", () => {
      assert.ok(
        misure.rail.h >= misure.altezzaFinestra * 0.95,
        `la barra è alta ${Math.round(misure.rail.h)} px su una finestra di ${misure.altezzaFinestra} px: non è a tutta altezza`
      );
    });

    await t.test("32.03 a 1440 px la barra è stretta, non una fascia", () => {
      assert.ok(
        misure.rail.w >= 200 && misure.rail.w <= 320,
        `larga ${Math.round(misure.rail.w)} px: nel v31 la rotaia è 262 px`
      );
    });

    await t.test("32.04 l'impianto è a due colonne, e la rotaia non va a capo", () => {
      const n = misure.colonne.trim().split(/\s+/).length;
      assert.equal(n, 2, "colonne della griglia: " + misure.colonne);
      assert.notEqual(misure.wrap, "wrap", "la rotaia sta andando a capo: è la regola dello schermo stretto");
    });

    await t.test("32.05 sotto i 980 px il menu passa in alto, come nel v31", async () => {
      const stretto = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await stretto.route("**/*", (r) => r.request().url().includes("127.0.0.1") ? r.continue() : r.abort());
      await stretto.goto(`http://127.0.0.1:${porta}/desktop/index.html`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await stretto.waitForSelector(".guscio .rail", { timeout: 10000 });
      const m = await stretto.evaluate(() => {
        const r = document.querySelector(".rail").getBoundingClientRect();
        const a = document.querySelector("main.area").getBoundingClientRect();
        return { railBottom: r.bottom, areaTop: a.top, larghezza: document.documentElement.scrollWidth, finestra: window.innerWidth };
      });
      assert.ok(m.railBottom <= m.areaTop + 2, "a 390 px il menu deve stare sopra il contenuto");
      assert.ok(m.larghezza <= m.finestra + 1, `la pagina scorre in orizzontale: ${m.larghezza} px su ${m.finestra}`);
      await stretto.close();
    });
  } finally {
    await browser.close();
    server.kill();
  }
});
