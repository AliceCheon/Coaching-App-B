/* tests/123-guardia-ridisegno.test.mjs - la guardia sui verbi che ridisegnano.
 *
 * Regola del 19/11/2026: la pagina decide se rileggere e ridisegnare con UNA
 * funzione sola (comune/ridisegno-b.js, chiedeRilettura). Se qualcuno aggiunge
 * un verbo nuovo e lo mette solo nella pagina, o ne toglie uno dalla lista, la
 * pagina scrive in B e resta il disegno vecchio: il difetto di "+ Riga".
 *
 * Si controllano i 18 verbi, tempo compreso:
 *   15 cambiano le righe disegnate (devono far ridisegnare);
 *   4  la cella li mostra da sola (serie, ripetizioni, recupero, tempo): non
 *      devono far ridisegnare, altrimenti cancellano il campo aperto sotto le
 *      dita di chi scrive.
 * Nessun DOM, nessun finto: e' una guardia sui dati e sul sorgente.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { CAMPI_CHE_RIDISEGNANO, CAMPI_CHE_NON_RIDISEGNANO, chiedeRilettura } from "../comune/ridisegno-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const NL = String.fromCharCode(10);

const RIDISEGNANO = [
  "progressione", "progressione-scheda", "riga", "aggiunta-riga", "aggiunta-tecnica",
  "rimozione-tecnica", "tecnica-cambia", "tecnica-parametri", "tecnica-settimana",
  "tecnica-nota", "sostituzione-riga", "superserie", "svuota-scheda", "ripristina-scheda", "applica-scarico-tutte",
  "applica-scheletro", "elimina-scheletro"
];
const NON_RIDISEGNANO = ["serie", "ripetizioni", "recupero", "tempo"];

test("123.1 i diciassette verbi che ridisegnano sono quelli, nell'ordine, senza doppioni", () => {
  assert.deepEqual([...CAMPI_CHE_RIDISEGNANO], RIDISEGNANO, "la lista dei campi che ridisegnano e' cambiata: " + [...CAMPI_CHE_RIDISEGNANO].join(", "));
  assert.equal(new Set(CAMPI_CHE_RIDISEGNANO).size, CAMPI_CHE_RIDISEGNANO.length, "nella lista che ridisegna c'e' un doppione");
  assert.equal(Object.isFrozen(CAMPI_CHE_RIDISEGNANO), true, "la lista che ridisegna non e' congelata: si puo' cambiare a mano e la guardia non vale piu'");
});

test("123.2 i quattro verbi che NON ridisegnano, tempo compreso, e le due liste non si toccano", () => {
  assert.deepEqual([...CAMPI_CHE_NON_RIDISEGNANO], NON_RIDISEGNANO, "la lista dei campi che non ridisegnano e' cambiata: " + [...CAMPI_CHE_NON_RIDISEGNANO].join(", "));
  assert.equal(new Set(CAMPI_CHE_NON_RIDISEGNANO).size, CAMPI_CHE_NON_RIDISEGNANO.length, "nella lista che non ridisegna c'e' un doppione");
  assert.equal(Object.isFrozen(CAMPI_CHE_NON_RIDISEGNANO), true, "la lista che non ridisegna non e' congelata");
  const comuni = CAMPI_CHE_RIDISEGNANO.filter((c) => CAMPI_CHE_NON_RIDISEGNANO.indexOf(c) !== -1);
  assert.deepEqual(comuni, [], "un verbo sta in tutte e due le liste: " + comuni.join(", "));
  assert.equal(CAMPI_CHE_RIDISEGNANO.length + CAMPI_CHE_NON_RIDISEGNANO.length, 21, "i verbi coperti devono essere 21");
});

test("123.3 chiedeRilettura risponde il vero per tutti e ventuno i verbi", () => {
  for (const campo of RIDISEGNANO) {
    assert.equal(chiedeRilettura({ campo: campo }), true, "la pagina deve rileggere dopo \u00ab" + campo + "\u00bb e invece non lo fa");
  }
  for (const campo of NON_RIDISEGNANO) {
    assert.equal(chiedeRilettura({ campo: campo }), false, "la pagina non deve rileggere dopo \u00ab" + campo + "\u00bb: cancellerebbe il campo aperto");
  }
  assert.equal(chiedeRilettura(null), false, "senza richiesta non si rilegge niente");
  assert.equal(chiedeRilettura(undefined), false, "senza richiesta non si rilegge niente");
  assert.equal(chiedeRilettura({}), false, "una richiesta senza campo non deve far rileggere");
  assert.equal(chiedeRilettura({ campo: "" }), false, "un campo vuoto non debe far rileggere");
  assert.equal(chiedeRilettura({ campo: "campo-inventato" }), false, "un verbo sconosciuto non deve far rileggere");
});

test("123.4 la pagina chiede alla funzione unica e non tiene una seconda lista", () => {
  const sorgente = readFileSync(join(radice, "desktop", "app-v31.js"), "utf8");
  assert.ok(sorgente.indexOf("chiedeRilettura") !== -1, "desktop/app-v31.js non usa piu' chiedeRilettura");
  assert.ok(sorgente.indexOf("ridisegno-b.js") !== -1, "app-v31.js non importa da comune/ridisegno-b.js");
  assert.ok(sorgente.indexOf("chiedeRilettura(richiesta)") !== -1, "app-v31.js importa la funzione ma non la chiama sulla richiesta");
  const vecchiaFila = sorgente.split(NL).filter((riga) => (riga.split("campo ===").length - 1) >= 2);
  assert.deepEqual(vecchiaFila, [], "in app-v31.js e' tornata una fila di confronti sul campo (seconda lista): la decisione deve stare solo in comune/ridisegno-b.js");
});
