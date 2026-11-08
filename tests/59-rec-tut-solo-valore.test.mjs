/* Passo 11 — in Rec e TUT solo il valore; la frase del coach in Descr./Setup.
 *
 * Regola di Alice dell'8/11/2026, provata sui testi veri del v31. Il disegno
 * della cella si guarda qui nel sorgente; la prova a schermo e' fatta sulla
 * pagina vera (desktop/index.html con app-v31.js) a 1280, 1440 e 1920 px.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  separaRecupero, separaTempo, sostituisciRecupero, sostituisciTempo,
  normalizzaValoreRecupero, normalizzaValoreTempo, recuperoInColonna, tempoInColonna
} from "../comune/tut-rec.js";

const radice = new URL("../", import.meta.url);
const sorgenteVista = readFileSync(new URL("comune/vista-programma.js", radice), "utf8");
const css = readFileSync(new URL("comune/dashboard-b.css", radice), "utf8");

/* ---- i casi veri del v31 ------------------------------------------------ */

test("59.01 il recupero con la frase davanti: valore in fondo, frase in Descr./Setup", () => {
  const p = separaRecupero("No recupero tra le braccia e poi 1,30'");
  assert.equal(p.valore, "1'30\"");
  assert.equal(p.frase, "No recupero tra le braccia e poi");
});

test("59.02 due valori nella stessa frase: vale l'ultimo, il resto e' frase", () => {
  const p = separaRecupero("1' a braccio poi 2'");
  assert.equal(p.valore, "2'");
  assert.equal(p.frase, "1' a braccio poi");
});

test("59.03 i recuperi veri restano interi, senza frase", () => {
  const casi = ["2-3'", "120-180 sec", "90\"", "1'30\"", "2'30\"", "1'-2'", "90 sec", "2 min"];
  casi.forEach((t) => {
    const p = separaRecupero(t);
    assert.equal(p.frase, "", "frase trovata in " + t);
    assert.ok(p.valore, "valore perso in " + t);
  });
  assert.equal(separaRecupero("90").valore, "90");
});

test("59.04 il TUT: schema di cifre in cella, frase del coach fuori", () => {
  ["2-0-1", "3-1-1", "2-1-0-1", "2 - 0 - 1", "2/0/1"].forEach((t) => {
    const p = separaTempo(t);
    assert.equal(p.frase, "", "frase trovata in " + t);
    assert.equal(p.valore, normalizzaValoreTempo(t));
  });
  const conFrase = separaTempo("eccentrica controllata poi esplosiva 3-1-1");
  assert.equal(conFrase.valore, "3-1-1");
  assert.equal(conFrase.frase, "eccentrica controllata poi esplosiva");
});

test("59.05 una frase senza valori: cella vuota e frase intera", () => {
  const p = separaTempo("Partenza al ginocchio, cerca di accelerare");
  assert.equal(p.valore, "");
  assert.equal(p.frase, "Partenza al ginocchio, cerca di accelerare");
  const q = separaRecupero("Eccentrica controllata, 1\" concentrica");
  assert.equal(q.frase, "Eccentrica controllata, 1\" concentrica");
  assert.equal(recuperoInColonna("Eccentrica controllata, 1\" concentrica"), false);
  assert.equal(tempoInColonna("Partenza al ginocchio, cerca di accelerare"), false);
});

test("59.06 la virgola del v31 diventa il tempo di sempre", () => {
  assert.equal(normalizzaValoreRecupero("1,30'"), "1'30\"");
  assert.equal(normalizzaValoreRecupero("2,30'"), "2'30\"");
  assert.equal(normalizzaValoreRecupero("1\u203230\u2033"), "1'30\"");
});

/* ---- la scrittura che conserva la frase -------------------------------- */

test("59.07 cambiando il valore la frase resta parola per parola", () => {
  assert.equal(
    sostituisciRecupero("No recupero tra le braccia e poi 1,30'", "2'"),
    "No recupero tra le braccia e poi 2'"
  );
  assert.equal(
    sostituisciTempo("eccentrica controllata poi esplosiva 3-1-1", "2-0-2"),
    "eccentrica controllata poi esplosiva 2-0-2"
  );
});

test("59.08 senza valore il valore nuovo va in fondo alla frase", () => {
  assert.equal(
    sostituisciRecupero("No recupero tra le braccia e poi", "1'30\""),
    "No recupero tra le braccia e poi 1'30\""
  );
  assert.equal(sostituisciRecupero("", "90\""), "90\"");
  assert.equal(
    sostituisciTempo("Partenza al ginocchio, cerca di accelerare", "3-0-1"),
    "Partenza al ginocchio, cerca di accelerare 3-0-1"
  );
});

test("59.09 la frase da sola non si prende un valore inventato", () => {
  assert.equal(sostituisciRecupero("tieni il fiato", ""), "tieni il fiato");
  assert.equal(sostituisciTempo("tieni il fiato", ""), "tieni il fiato");
});

/* ---- quello che la tabella disegna ------------------------------------- */

test("59.10 la cella riceve il solo valore e il testo intero per la scrittura", () => {
  assert.ok(sorgenteVista.indexOf("const recParti = separaRecupero(recTesto);") >= 0);
  assert.ok(sorgenteVista.indexOf("const tutParti = separaTempo(tutTesto);") >= 0);
  assert.ok(sorgenteVista.indexOf("valore: recMostrato, intero: recTesto") >= 0);
  assert.ok(sorgenteVista.indexOf("valore: tutMostrato, intero: tutTesto") >= 0);
});

test("59.11 la frase va in Descr./Setup una volta sola, anche con l'editor acceso", () => {
  assert.ok(sorgenteVista.indexOf("notaTesto.indexOf(recFrase) === -1") >= 0);
  assert.ok(sorgenteVista.indexOf("notaTesto.indexOf(tutFrase) === -1") >= 0);
  assert.ok(!/if \(!mod && !recInColonna\)/.test(sorgenteVista), "la frase spostata dipende ancora dalla sola lettura");
  assert.ok(sorgenteVista.indexOf('etichettaSpostata("REC", recFrase)') >= 0);
  assert.ok(sorgenteVista.indexOf('etichettaSpostata("TUT", tutFrase)') >= 0);
});

test("59.12 freccetta e pulsantini cambiano il valore, non la frase", () => {
  assert.ok(sorgenteVista.indexOf("sostituisciRecupero(intero, nuovoValore)") >= 0);
  assert.ok(sorgenteVista.indexOf("sostituisciTempo(intero, nuovoValore)") >= 0);
  assert.ok(sorgenteVista.indexOf('{ campo: "recupero", prima: info.valore || "" }') >= 0);
  assert.ok(sorgenteVista.indexOf('{ campo: "tempo", prima: info.valore || "" }') >= 0);
  assert.ok(sorgenteVista.indexOf("valore: esito.dopo, prima: esito.prima") >= 0);
});

test("59.13 le colonne restano larghe e la tabella non si stringe", () => {
  assert.ok(/\.p8-tab\{[^}]*min-width:1470px/.test(css));
  assert.ok(/\.p8-tab col\.w-rec\{width:136px\}/.test(css));
  assert.ok(/\.p8-tab col\.w-tut\{width:124px\}/.test(css));
  assert.ok(/\.p8-tab col\.w-note\{width:210px\}/.test(css));
});
