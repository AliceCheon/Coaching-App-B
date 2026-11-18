/* tests/115-tendine-tema.test.mjs — il menu bianco sul tema scuro (18/11/2026).
 *
 * Alice ha aperto la tendina dello Scarico: le voci S1...S8 c'erano, ma erano
 * grigio chiarissimo su fondo BIANCO. Il menu di una <select> lo disegna il
 * sistema, non il nostro CSS: il testo ereditava il chiaro del tema scuro e il
 * fondo restava quello di sistema. Qui si controlla che colore e fondo delle
 * voci siano ESPLICITI per i due temi, in un solo posto, e che il contrasto
 * superi 4,5:1 (stessa formula del test 86).
 *
 * Si controlla anche la testata della scheda: una riga, etichetta sopra,
 * quattro campi larghi uguali, «%» dentro il campo, pillola tolta.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const vista = readFileSync(join(radice, "comune", "vista-programma.js"), "utf8");
const vivo = readFileSync(join(radice, "comune", "piano-vivo.js"), "utf8");
const righe = pagina.split(String.fromCharCode(10)).map((l) => l.split(String.fromCharCode(13)).join(""));
const rigaEsatta = (testo) => righe.find((l) => l.trim() === testo) || "";

/* La formula del contrasto è quella del test 86, riga per riga. */
const lum = (h) => {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrasto = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const REGOLA_SCURO = "select,select option{color:#F3EAF9;background-color:#241634}";
const REGOLA_CHIARO = 'html[data-theme="light"] select,html[data-theme="light"] select option{color:#281738;background-color:#FFFFFF}';
const tinta = (r) => /color:(#[0-9A-Fa-f]{6})/.exec(r);
const fondo = (r) => /background-color:(#[0-9A-Fa-f]{6})/.exec(r);

test("115.1 colore e fondo delle voci stanno in UN solo posto, per i due temi", () => {
  assert.ok(rigaEsatta(REGOLA_SCURO), "manca la regola delle tendine sul tema scuro: " + REGOLA_SCURO);
  assert.ok(rigaEsatta(REGOLA_CHIARO), "manca la regola delle tendine sul tema chiaro: " + REGOLA_CHIARO);
  assert.ok(rigaEsatta('html[data-theme="dark"]{color-scheme:dark}'), "manca color-scheme scuro");
  assert.ok(rigaEsatta('html[data-theme="light"]{color-scheme:light}'), "manca color-scheme chiaro");

  /* il selettore e' d'elemento (`select option`): vale per ogni tendina, non
   * per quelle elencate una per una. Se un domani una regola nuova desse il
   * colore alle voci, qui si vedrebbe subito. */
  const regole = righe.filter((l) => /(^|[ ,>])option\s*\{/.test(l));
  assert.equal(regole.length, 2, "le voci delle tendine devono essere colorate in un posto solo, non in " + regole.length);
  regole.forEach((l) => assert.ok(/color:#[0-9A-Fa-f]{6}/.test(l) && /background-color:#[0-9A-Fa-f]{6}/.test(l),
    "ogni regola delle voci deve dichiarare colore E fondo espliciti"));
});

test("115.2 le voci si leggono: contrasto oltre 4,5:1 in tutti e due i temi", () => {
  for (const regola of [REGOLA_SCURO, REGOLA_CHIARO]) {
    const c = tinta(regola), f = fondo(regola);
    assert.ok(c && f, "regola incompleta: " + regola);
    const r = contrasto(c[1], f[1]);
    assert.ok(r >= 4.5, "contrasto " + r.toFixed(2) + ":1 tra " + c[1] + " e " + f[1] + " (serve 4,5:1)");
  }
});

test("115.3 la regola copre tutte le tendine dell'app, non solo quelle della testata", () => {
  /* le classi che l'app usa davvero (markup statico e righe scritte da JS) */
  const classi = ["pr-sel", "pr-psel", "sel", "db-sel", "lb-sel", "t8-sel", "cv-cerca"];
  classi.forEach((classe) => {
    assert.ok(pagina.indexOf(classe) !== -1, "la classe " + classe + " non esiste piu' nella pagina: aggiorna il test");
  });
  /* il selettore d'elemento `select` copre tutte: nessuna e' lasciata fuori */
  const copertura = righe.filter((l) => l.trim().indexOf("select,select option{") === 0);
  assert.equal(copertura.length, 1, "la copertura delle tendine deve essere una sola regola d'elemento");
  assert.ok(copertura[0].indexOf("select,") === 0, "la regola deve cominciare dall'elemento select, senza classi");
});

test("115.4 la testata sta in una riga: quattro campi, stessa larghezza, % dentro", () => {
  const riga = rigaEsatta("#pag-programma-1 .pr-shd-f{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-end;gap:10px}");
  assert.ok(riga, "la fila dei quattro campi non e' piu' in una riga sola");
  assert.equal(righe.filter((l) => l.indexOf(".pr-f-sm{width:") !== -1).length, 1, "le quattro larghezze devono venire da una regola sola");
  assert.ok(righe.some((l) => l.indexOf(".pr-f-sm{width:96px") !== -1), "i quattro campi devono essere larghi uguali");
  const guscio = righe.find((l) => l.indexOf(".pr-suf-box{") !== -1) || "";
  assert.ok(guscio.indexOf("position:relative") !== -1, "il guscio del % deve essere il riferimento del segno");
  const segno = righe.find((l) => l.indexOf(".pr-suf{") !== -1) || "";
  assert.ok(segno.indexOf("position:absolute") !== -1 && segno.indexOf("right:10px") !== -1, "il % deve stare DENTRO il campo, a destra");
});

test("115.5 la pillola non c'e' piu', e il volume parte spento", () => {
  assert.equal(vista.indexOf("scarico-chip"), -1, "la vista disegna ancora la pillola");
  assert.equal(vivo.indexOf("scarico-chip"), -1, "piano-vivo cerca ancora la pillola");
  assert.ok(vista.indexOf("pr-chip-s4") === -1, "la vista crea ancora la pillola");
  assert.ok(vivo.indexOf("aggiornaVolume") !== -1, "manca l'accensione del volume");
  assert.ok(vivo.indexOf("vol.disabled = !acceso") !== -1, "il volume non viene spento quando lo Scarico e' «—»");
  assert.ok(vivo.indexOf("scegli prima la settimana dello scarico") !== -1, "manca il tooltip del campo spento");
  assert.ok(vista.indexOf("disattivato: true") !== -1, "il campo volume non nasce spento");
});

test("115.6 l'ordine e' Settimane, Scarico, Vol, Test", () => {
  const iSett = vista.indexOf('"scarico-settimana"');
  const iVol = vista.indexOf('"scarico-volume"');
  const iTest = vista.indexOf('"test-settimana"');
  assert.ok(iSett > 0 && iVol > iSett && iTest > iVol, "l'ordine dei quattro campi non e' quello chiesto");
});
