/* Fase 2e · guardia: il volto della Diva Bot.
 * La faccia è un dato (PARTI_VOLTO) e un disegno SVG fatto con createElementNS.
 * Qui si difende: niente emoji, niente immagini esterne, tre stati dichiarati,
 * inchiostro unico per tema chiaro e scuro, tono applicato come attributo. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PARTI_VOLTO,
  TONI_VOLTO,
  GEOMETRIA_VOLTO,
  creaVolto,
  etichettaTono
} from "../comune/diva-volto.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const leggi = (p) => readFileSync(join(radice, p), "utf8");
const css = leggi("comune/tema-b.css");
const bot = leggi("comune/diva-bot.js");
const volto = leggi("comune/diva-volto.js");

test("nessuna emoji nel volto: il personaggio è disegnato, non incollato", () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  for (const parte of PARTI_VOLTO) {
    assert.ok(!emoji.test(parte.classi), "emoji nelle classi: " + parte.classi);
    for (const valore of Object.values(parte.attributi)) {
      assert.ok(!emoji.test(String(valore)), "emoji negli attributi: " + valore);
    }
  }
  assert.ok(!emoji.test(volto), "emoji nel modulo del volto");
});

test("la Diva Bot non è più un emoji dentro un cerchio", () => {
  assert.ok(!/pallino\.textContent\s*=\s*"\\ud83e\\udd16"/.test(bot), "resta l'emoji robot");
  assert.ok(!/\u{1F916}/u.test(bot), "resta il carattere robot nel modulo");
  assert.match(bot, /creaVolto\(/, "manca il disegno del volto");
});

test("il volto ha una geometria dichiarata e ogni parte sta dentro il viewBox", () => {
  assert.equal(GEOMETRIA_VOLTO.larghezza, 48);
  assert.equal(GEOMETRIA_VOLTO.altezza, 48);
  assert.ok(PARTI_VOLTO.length >= 12, "parti troppo poche: " + PARTI_VOLTO.length);
  for (const parte of PARTI_VOLTO) {
    for (const [nome, valore] of Object.entries(parte.attributi)) {
      if (!/^(cx|cy|x1|y1|x2|y2|r)$/.test(nome)) continue;
      const n = Number(valore);
      assert.ok(Number.isFinite(n), nome + " non numerico: " + valore);
      assert.ok(n >= 0 && n <= 48, nome + " fuori dal viewBox: " + valore);
    }
  }
});

test("tre toni, tre bocche, due famiglie di occhi", () => {
  assert.deepEqual([...TONI_VOLTO].sort(), ["attenzione", "bene", "neutro"]);
  const bocche = PARTI_VOLTO.filter((p) => p.classi.includes("bd-volto-bocca-"));
  assert.equal(bocche.length, 3, "bocche: " + bocche.length);
  for (const tono of TONI_VOLTO) {
    assert.equal(
      bocche.filter((p) => p.stato === tono).length,
      1,
      "bocca mancante per il tono " + tono
    );
  }
  const felici = PARTI_VOLTO.filter((p) => p.classi.includes("bd-volto-felice"));
  assert.equal(felici.length, 2, "occhi felici: " + felici.length);
  assert.ok(felici.every((p) => p.stato === "bene"), "gli occhi felici devono essere del tono bene");
});

test("inchiostro unico: il volto non inventa token di colore", () => {
  assert.ok(!/--[a-z-]+:[^;]*;/.test(volto), "il modulo del volto definische token");
  assert.ok(!/fill="#|stroke="#/.test(volto), "colori fissi nel modulo del volto");
  const sezione = css.slice(css.indexOf("/* ---------- Diva Bot"));
  assert.ok(!/--[a-z-]+\s*:/.test(sezione), "il CSS della Diva definische token nuovi");
});

test("il CSS dichiara i tre stati e rispetta chi non vuole animazioni", () => {
  for (const tono of ["bene", "attenzione", "neutro"]) {
    assert.ok(
      css.includes('.bd-diva[data-tono="' + tono + '"]'),
      "manca lo stato CSS per " + tono
    );
  }
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)/, "manca la guardia sul movimento");
  assert.ok(!css.includes("!important"), "forzatura di stile nel CSS");
  assert.match(css, /\.bd-volto\s*\{/, "manca la regola del volto");
});

test("montaDivaBot applica il tono al personaggio, non solo alla bolla", () => {
  assert.match(
    bot,
    /pallino\.setAttribute\("data-tono"/,
    "il tono non arriva al personaggio"
  );
  assert.match(bot, /etichettaTono\(/, "l'aria-label non dice il tono");
  assert.match(bot, /aria-label/, "manca l'etichetta accessibile");
});

test("due chiamate senza documento non rompono niente", () => {
  assert.equal(creaVolto(null), null);
  assert.equal(creaVolto({}), null);
  assert.equal(creaVolto(undefined), null);
});

test("ogni tono ha un'etichetta parlata, diversa dalle altre", () => {
  const etichette = TONI_VOLTO.map(etichettaTono);
  assert.equal(new Set(etichette).size, 3, "etichette indistinguibili: " + etichette.join(" / "));
  for (const testo of etichette) {
    assert.ok(testo.length > 3 && testo.length < 60, "etichetta implausibile: " + testo);
  }
  assert.equal(etichettaTono("boh"), etichettaTono("neutro"), "tono ignoto: ripiego sul neutro");
});
