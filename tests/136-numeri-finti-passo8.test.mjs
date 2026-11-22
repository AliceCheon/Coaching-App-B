/* tests/136 — PASSO 8. Le quattro tab peggiori non mostrano piu` numeri finti.
 *
 * Regola: ogni numero scritto a mano che sembrava un dato o e` uno stato
 * dichiarato, o e` il contenitore che il modulo vero riempie. Qui si prova
 * che le frasi dichiarate ci sono e che i numeri finti non sono rimasti.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const app = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");

function sezione(id) {
  const i = pagina.indexOf('id="' + id + '"');
  assert.ok(i > -1, "manca la sezione #" + id);
  const j = pagina.indexOf("</section>", i);
  return pagina.slice(i, j > -1 ? j : undefined);
}

test("136.1 Curve di forza: la pagina dichiara che i grafici non sono calcolati", () => {
  const s = sezione("pag-curve-forza");
  assert.match(s, /data-curva="non-calcolata"/, "la carta dichiara lo stato");
  assert.match(s, /non ancora calcolato/, "e lo scrive nel titolo");
  assert.match(s, /arriveranno dal logbook/, "dice da dove verranno i punti");
  assert.match(s, /carico massimo delle serie completate/, "e quale misura: carico massimo per seduta");
});

test("136.2 Curve di forza: niente punti disegnati, niente data del backup", () => {
  assert.doesNotMatch(pagina, /dati veri del backup 30\/10\/2026/, "la frase del backup se n'e` andata");
  assert.doesNotMatch(pagina, /Fase B2: Curve dal logbook/, "lo script che disegnava i punti se n'e` andato");
  assert.doesNotMatch(sezione("pag-curve-forza"), /Row_machine_panatta/, "le serie scritte a mano se ne sono andate dalla pagina delle curve");
  assert.doesNotMatch(pagina, /"gen":"backup del 30\/10\/2026"/, "nemmeno il secondo blocco di punti");
  assert.doesNotMatch(pagina, /id="cv-real-svg"/, "il contenitore del grafico finto non c'e` piu`");
});

test("136.3 Pianificazione: dentro il modulo vero, non il calendario del mockup", () => {
  const s = sezione("pag-pianificazione");
  assert.match(s, /id="pianificazione-viva"/, "c'e` il punto di montaggio della vista");
  assert.doesNotMatch(s, /id="pl-blocks"/, "il calendario scritto in HTML non c'e` piu`");
  assert.doesNotMatch(s, /id="pl-prosp"/, "nemmeno il prospetto statico");
  assert.match(app, /renderPianificazione/, "la pagina importa e usa la vista vera");
  assert.match(app, /#pianificazione-viva/, "e la monta nel contenitore della pagina");
});

test("136.4 Misure: via il seme demo e la scritta delle cinque sessioni", () => {
  assert.doesNotMatch(pagina, /__BDSEED/, "nessun seme di dati nel file");
  assert.doesNotMatch(pagina, /5 sessioni dalla scheda della coach/, "la scritta se n'e` andata");
  assert.doesNotMatch(pagina, /178 cm &middot; 31 anni/, "altezza ed eta` scritte a mano se ne sono andate");
  const s = sezione("pag-misure");
  assert.match(s, /nessuna misura &egrave; arrivata dall'app telefono/, "al loro posto lo stato dichiarato");
});

test("136.5 Dashboard: via readiness 72, il titolo e le chips fissi", () => {
  assert.doesNotMatch(pagina, /Sei pronta, Alice!/, "il titolo fisso se n'e` andato");
  assert.doesNotMatch(pagina, /class="ck-gauge-num">72</, "il 72 sull'anello non c'e` piu`");
  assert.doesNotMatch(pagina, /72\/100/, "nemmeno il 72/100 scritto accanto");
  assert.doesNotMatch(pagina, /DATI SUFFICIENTI/, "la pillola non promette piu` 5/5");
  assert.doesNotMatch(pagina, /class="ck-chip"><em>[^<]+<\/em><b>\d/, "nessuna chip porta un voto scritto a mano");
  const s = sezione("pag-dashboard");
  assert.match(s, /class="ck-gauge-num">&mdash;</, "l'anello mostra il trattino");
  assert.match(s, /Il consiglio di oggi/, "il titolo e` un'etichetta, non una promessa");
  assert.match(s, /senza i cinque segnali non calcolo una media/, "e la frase dichiara cosa manca");
});
