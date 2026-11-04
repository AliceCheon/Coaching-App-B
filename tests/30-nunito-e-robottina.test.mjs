import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const radice = path.resolve(import.meta.dirname, "..");
const leggi = (f) => fs.readFileSync(path.join(radice, f), "utf8");
const esiste = (f) => fs.existsSync(path.join(radice, f));

test("30.01 i file del carattere sono nel repository", () => {
  const attesi = [
    "comune/font/nunito-sans-latin.woff2",
    "comune/font/nunito-sans-latin-ext.woff2",
    "comune/font/nunito-sans-corsivo-latin.woff2",
    "comune/font/nunito-sans-corsivo-latin-ext.woff2"
  ];
  attesi.forEach((f) => {
    assert.ok(esiste(f), "manca " + f);
    assert.ok(fs.statSync(path.join(radice, f)).size > 8000, f + " è troppo piccolo per essere un carattere vero");
  });
});

test("30.02 niente CDN: nessun indirizzo di font esterni in tutta l'app", () => {
  const gusci = ["desktop/index.html", "comune/tema-b.css", "comune/dashboard-b.css", "comune/testata-diva.css"];
  gusci.forEach((f) => {
    const t = leggi(f);
    assert.ok(!/fonts\.googleapis|fonts\.gstatic|@import\s+url\(["']?https?:/.test(t), f + " chiama un font da fuori");
  });
});

test("30.03 il foglio dichiara i quattro volti e li prende da comune/font", () => {
  const t = leggi("comune/tema-b.css");
  assert.equal((t.match(/@font-face/g) || []).length, 4, "i volti devono essere quattro");
  assert.ok(/font-family:"Nunito Sans"/.test(t), "nome della famiglia");
  assert.ok(/url\("font\/nunito-sans-latin\.woff2"\)/.test(t), "percorso relativo, non remoto");
  assert.ok(/font-weight:300 900/.test(t), "file variabile, tutti i pesi");
  assert.ok(/font-display:swap/.test(t), "il testo si legge mentre il font arriva");
});

test("30.04 la pila dei caratteri comincia da Nunito Sans", () => {
  const t = leggi("comune/tema-b.css");
  const m = t.match(/--sans\s*:\s*([^;}]+)/);
  assert.ok(m, "manca il token --sans");
  assert.ok(m[1].trim().startsWith('"Nunito Sans"'), "la testa della pila: " + m[1]);
});

test("30.05 la pagina del PC carica il foglio della testata", () => {
  const t = leggi("desktop/index.html");
  assert.ok(t.includes("../comune/testata-diva.css"), "manca il link a testata-diva.css");
  const pos = t.indexOf("testata-diva.css"), posTema = t.indexOf("tema-b.css");
  assert.ok(posTema < pos, "il foglio della testata va dopo il tema");
});

test("30.06 la robottina è nel riquadro d'apertura, prima del saluto", () => {
  const t = leggi("comune/vista-dashboard.js");
  assert.ok(t.includes("SVG_ROBOT"), "manca il disegno della robottina");
  assert.ok(/function testataDiva/.test(t), "manca il montaggio della testata");
  const i = t.indexOf("testataDiva(doc, modello)"), j = t.indexOf("testa(doc, modello)");
  assert.ok(i > 0 && j > 0, "le due testate devono esistere");
  assert.ok(t.indexOf("contenitore.appendChild(testataDiva") < t.indexOf("contenitore.appendChild(testa("), "la robottina deve venire prima del saluto");
});

test("30.07 il disegno è quello del mockup, faccia allegra compresa", () => {
  const t = leggi("comune/vista-dashboard.js");
  ["diva-bot-shell", "diva-bot-antenna", "diva-bot-barbell", "diva-bot-face-happy", "diva-bot-screen"].forEach((c) => {
    assert.ok(t.includes(c), "manca " + c);
  });
  assert.ok(t.includes('class="diva-bot"'), "manca il nodo radice del disegno");
});

test("30.08 la misura e la posizione vengono dal foglio del mockup, non da invenzioni", () => {
  const t = leggi("comune/testata-diva.css");
  assert.ok(/\.db-robot\{flex:none;width:86px\}/.test(t), "la robottina deve stare a 86px come nel v31");
  assert.ok(/\.db-diva\{[^}]*display:flex[^}]*padding:12px 18px/.test(t), "la carta d'apertura deve avere la misura del mockup");
  assert.ok(/\.db-balloon\{/.test(t), "manca la bolla");
  assert.ok(/@keyframes dvBob/.test(t), "manca il respiro della robottina");
  assert.ok(!t.includes("!important"), "niente !important");
  assert.ok(!/#bd-diva/.test(t), "le regole della Diva flottante non vanno toccate qui");
});

test("30.09 la Diva flottante resta la sua", () => {
  const t = leggi("desktop/app.js");
  assert.ok(/diva/i.test(t), "app.js deve continuare a montare la Diva");
  assert.ok(!/diva-volto/.test(leggi("comune/vista-dashboard.js")), "la Dashboard non deve disegnare la Diva flottante");
});

test("30.10 la bolla non inventa numeri quando il check-in manca", () => {
  const t = leggi("comune/vista-dashboard.js");
  assert.ok(/if \(!r\)/.test(t), "serve il ramo senza readiness");
  assert.ok(/non me li invento/.test(t), "senza segnali lo deve dire");
  const ramo = t.slice(t.indexOf("if (!r)"), t.indexOf("} else if (r.punteggio >= 65)"));
  assert.ok(!/\d{2}\/100/.test(ramo), "niente punteggio quando non c'è");
});

test("30.11 la build racconta cosa c'è dentro", () => {
  const t = leggi("app-config-b.js");
  assert.ok(/b0\.35-passo2-7-attivo-archivio/.test(t), "build attesa b0.35-passo2-7-attivo-archivio");
});
