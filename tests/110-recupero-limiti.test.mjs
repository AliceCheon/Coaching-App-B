/* PASSO 3c (17/11/2026) — il recupero da 0" a 10', gli intervalli che si
 * spostano insieme, il pulsantino spento con il motivo scritto.
 *
 * Alice, 17/11/2026: i limiti sono 0 minuti e 10 minuti; su un intervallo si
 * spostano tutti e due gli estremi insieme, cosi' non capita mai un estremo
 * sopra l'altro; quando la cella non contiene un tempo il pulsantino si spegne
 * e il tooltip dice perche'; il tempo totale della scheda si ricalcola dal
 * recupero vero (prima contava il primo numero della cella: 1'30" valeva 1
 * secondo, 2-3' valeva 2 secondi).
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  REC_MIN, REC_MAX, REC_PASSO,
  testoSecondi, secondiRecupero, intervalloSecondi, testoIntervallo,
  passoRecupero, motivoPassoRecupero,
  normalizzaValoreRecupero, separaRecupero, recuperoScrittoValido
} from "../comune/tut-rec.js";

test("110.1 i limiti sono 0\" e 10', e lo zero si scrive 0\"", () => {
  assert.equal(REC_MIN, 0, "il recupero parte da zero");
  assert.equal(REC_MAX, 600, "il recupero arriva a dieci minuti");
  assert.equal(REC_PASSO, 30);
  assert.equal(testoSecondi(0), '0"', "lo zero e' un valore: si vede 0\"");
  assert.equal(testoSecondi(30), '30"');
  assert.equal(testoSecondi(600), "10'");
  assert.equal(testoSecondi(599), '9\'59"');
});

test("110.2 i pulsantini si fermano a 0\" e a 10'", () => {
  assert.equal(secondiRecupero('2"'), 2, "sotto i 30 secondi il valore resta un tempo");
  assert.equal(passoRecupero('2"', 30), '32"', "il passo e' sempre di 30\", anche in basso");
  assert.equal(passoRecupero('30"', -30), '0"', "da 30\" si scende a zero, non si blocca prima");
  assert.equal(passoRecupero('0"', -30), "", "sotto lo zero non si scende");
  assert.match(motivoPassoRecupero('0"', -30), /sotto 0/);
  assert.equal(passoRecupero("10'", 30), "", "sopra i dieci minuti non si sale");
  assert.match(motivoPassoRecupero("10'", 30), /10'/);
  assert.equal(passoRecupero("9'30\"", 30), "10'", "l'ultimo gradino si chiama 10'");
  assert.equal(motivoPassoRecupero("2'", 30), "", "in mezzo ai limiti il pulsantino e' acceso");
});

test("110.3 su un intervallo si spostano tutti e due gli estremi insieme", () => {
  assert.deepEqual(intervalloSecondi("2-3'"), { da: 120, a: 180 });
  assert.deepEqual(intervalloSecondi("1'-2'"), { da: 60, a: 120 });
  assert.deepEqual(intervalloSecondi("120-180 sec"), { da: 120, a: 180 });
  assert.deepEqual(intervalloSecondi("2-3"), { da: 120, a: 180 }, "senza segni, sotto il minuto sono minuti");

  assert.equal(passoRecupero("2-3'", 30), '150-210"');
  assert.equal(passoRecupero("2-3'", -30), '90-150"');
  assert.equal(passoRecupero(passoRecupero("2-3'", 30), 30), "3-4'", "due passi da 30: tornano minuti tondi e si riscrive 3-4'");
  assert.equal(passoRecupero("1'-2'", 30), '90-150"');
  assert.equal(passoRecupero("120-180 sec", 30), '150-210"');

  /* l'ordine resta quello: mai un estremo sopra l'altro, ne' prima ne' dopo */
  assert.equal(intervalloSecondi("3-2'"), null, "un intervallo rovesciato non e' un intervallo");
  assert.match(motivoPassoRecupero("3-2'", 30), /non e'/);

  /* i due estremi si fermano insieme ai limiti */
  assert.equal(passoRecupero("9'-10'", 30), "", "il tetto vale per l'estremo alto");
  assert.match(motivoPassoRecupero("9'-10'", 30), /sopra 10'/);
  assert.equal(passoRecupero('0"-1\'', -30), "", "il fondo vale per l'estremo basso");
  assert.match(motivoPassoRecupero('0"-1\'', -30), /sotto 0/);
});

test("110.4 con un valore che non e' un tempo il pulsantino e' spento, e dice perche'", () => {
  assert.equal(passoRecupero('1\'30" e cambio gamba', 30), "", "la frase non si tocca");
  assert.match(motivoPassoRecupero('1\'30" e cambio gamba', 30), /non e' un tempo/);
  assert.equal(passoRecupero("", 30), "", "la cella vuota non si muove");
  assert.match(motivoPassoRecupero("", 30), /vuoto/);
});

test("110.5 il testo nuovo si rilegge come valore, lo zero buttato li' resta una frase", () => {
  assert.equal(normalizzaValoreRecupero('150-210"'), '150-210"');
  assert.equal(separaRecupero('150-210"').valore, '150-210"');
  assert.equal(separaRecupero('150-210"').frase, "");
  assert.equal(recuperoScrittoValido('150-210"'), true);
  assert.equal(normalizzaValoreRecupero("3-4'"), "3-4'");
  assert.equal(normalizzaValoreRecupero('0"'), '0"', "lo zero con il segno e' un valore");
  assert.equal(normalizzaValoreRecupero("0'"), '0"');
  assert.equal(normalizzaValoreRecupero("0"), "", "lo zero buttato li' resta una frase senza valore (passo 14)");
  assert.equal(normalizzaValoreRecupero("0 sec"), "");
});

test("110.6 i secondi del recupero, per la stima del tempo totale", () => {
  assert.equal(secondiRecupero('1\'30"'), 90, "prima la stima contava 1 secondo");
  assert.equal(secondiRecupero("2'"), 120);
  assert.equal(secondiRecupero("90\""), 90);
  assert.equal(secondiRecupero("2 min"), 120);
  assert.equal(secondiRecupero("1,30'"), 90, "la virgola del v31");
  assert.equal(secondiRecupero("2-3'"), null, "un intervallo non e' un valore singolo");
  assert.equal(secondiRecupero("cambio gamba"), null);
  assert.equal(testoIntervallo(120, 180), "2-3'");
  assert.equal(testoIntervallo(150, 210), '150-210"');
  assert.equal(testoIntervallo(210, 150), "", "estremi rovesciati: non si scrive niente");
});
