// tests/26-accenti-e-spazi.test.mjs — Fase 2m: tre difetti piccoli, chiusi.
//  1. niente apostrofo al posto dell'accento (era «Martedi'», ora «Martedì»);
//  2. la pastiglia della versione sta dentro la barra anche con nomi lunghi;
//  3. il fumetto della Diva non copre il testo in fondo alle carte.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const radice = new URL("../", import.meta.url);
const leggi = (p) => readFileSync(new URL(p, radice), "utf8");

const SORGENTI = readdirSync(new URL("comune/", radice))
  .filter((n) => n.endsWith(".js"))
  .map((n) => "comune/" + n)
  .concat(["mobile/app.js", "desktop/app.js", "mobile/index.html", "desktop/index.html"]);

const desktop = leggi("desktop/index.html");
const mobile = leggi("mobile/index.html");
const bot = leggi("comune/diva-bot.js");

/* Le parole che in italiano vogliono l'accento e che l'apostrofo non sostituisce.
 * «po'» non è in elenco: lì l'apostrofo è corretto. */
const SENZA_ACCENTO = new RegExp(
  "(?<![\\wÀ-ÿ])(" +
  ["Martedi","Lunedi","Mercoledi","Giovedi","Venerdi","martedi","lunedi","mercoledi","giovedi","venerdi",
   "Sabato","sabato","perche","percio","piu","gia","cosi","cio","puo","pero","sara","fara","andra","potra","avra",
   "onesta","continuita","priorita","qualita","attivita","velocita","difficolta","possibilita","semplicita",
   "variabilita","verita","citta","meta","si","li","da","e","E"].join("|") +
  ")'(?![\\wÀ-ÿ])", "g");

test("26.01 nessun apostrofo al posto dell'accento nei sorgenti dell'app", () => {
  const colpevoli = [];
  SORGENTI.forEach((f) => {
    const righe = leggi(f).split("\n");
    righe.forEach((riga, i) => {
      const trovati = riga.match(SENZA_ACCENTO);
      if (trovati) colpevoli.push(f + ":" + (i + 1) + " → " + trovati.join(" "));
    });
  });
  assert.deepEqual(colpevoli, [], "apostrofo invece dell'accento:\n" + colpevoli.join("\n"));
});

test("26.02 i giorni nel saluto usano l'accento vero", () => {
  ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"].forEach((g) => {
    assert.ok(bot.includes(g), "manca «" + g + "» nel calendario della Diva");
  });
  assert.ok(!/Martedi'/.test(bot), "resta «Martedi'» con l'apostrofo");
});

test("26.03 la pastiglia della versione non esce dalla barra", () => {
  assert.match(desktop, /\.marchio\{[^}]*min-width:0\}/);
  assert.match(desktop, /\.marchio>\*\{min-width:0\}/);
  assert.match(desktop, /\.marchio-ver\{[^}]*max-width:100%/);
  assert.match(desktop, /\.marchio-ver\{[^}]*overflow:hidden/);
  assert.match(desktop, /\.marchio-ver\{[^}]*text-overflow:ellipsis/);
  assert.match(desktop, /\.marchio-ver\{[^}]*box-sizing:border-box/);
});

test("26.04 la barra riserva spazio alla Diva: il fumetto non copre le carte", () => {
  const maino = desktop.match(/\.maino\{[^}]*padding:34px 40px (\d+)px/);
  const stretto = desktop.match(/\.maino\{padding:24px 18px (\d+)px\}/);
  assert.ok(maino, "manca la regola di .maino");
  assert.ok(stretto, "manca la regola di .maino nella finestra stretta");
  assert.ok(Number(maino[1]) >= 240, "spazio in fondo troppo corto: " + maino[1] + "px");
  assert.ok(Number(stretto[1]) >= 240, "nella finestra stretta resta poco spazio: " + stretto[1] + "px");
  assert.match(mobile, /main\.colonna\{[^}]*padding:2px 14px 2\d\dpx/);
});

test("26.05 lo spazio riservato supera l'ingombro vero della Diva", () => {
  /* Ingombro dal bordo: 26 px di base + 104 px di figura + 10 px di distacco
   * + il fumetto. Sotto il desktop il fumetto può arrivare a 310 px di
   * larghezza, quindi a quattro o cinque righe. */
  const figura = Number((desktop.match(/\.bd-bolla\?/) || 0) && 104) || 104;
  const minimo = 26 + figura + 10 + 90;
  const riservato = Number(desktop.match(/\.maino\{[^}]*padding:34px 40px (\d+)px/)[1]);
  assert.ok(riservato >= minimo, "riservati " + riservato + "px, servono almeno " + minimo);
});

test("26.06 solo lettura, niente !important, niente percorsi di macchina", () => {
  assert.ok(!/!important/.test(desktop + mobile));
  assert.ok(!/\.set\(|\.add\(|\.update\(|\.delete\(|setDoc|addDoc/.test(bot));
  assert.ok(!/[A-Za-z]:\\/.test(desktop));
});
