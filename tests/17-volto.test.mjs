import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  GEOMETRIA_VOLTO, TONI_VOLTO, ESPRESSIONI_VOLTO,
  etichettaTono, markupVolto, creaVolto
} from '../comune/diva-volto.js';

const modulo = fs.readFileSync(new URL('../comune/diva-volto.js', import.meta.url), 'utf8');

test('17.01 niente emoji: il volto è disegnato, non un carattere', () => {
  assert.ok(!/\u{1F916}|\uD83E\uDD16/.test(modulo), 'nessun emoji robot nel modulo');
  assert.ok(!/textContent\s*=\s*['"`][^'"`]*[\u{1F300}-\u{1FAFF}]/u.test(modulo), 'nessun emoji scritto via textContent');
  assert.match(modulo, /mockup/i, 'il modulo dichiara la sua fonte');
});

test('17.02 le due inquadrature sono quelle del mockup', () => {
  assert.equal(GEOMETRIA_VOLTO.intera, '0 18 240 256');
  assert.equal(GEOMETRIA_VOLTO.testa, '44 58 152 112');
  assert.match(markupVolto('happy', { testa: false }), /viewBox="0 18 240 256"/);
  assert.match(markupVolto('happy'), /viewBox="44 58 152 112"/);
});

test('17.03 il tono bene sorride, come nel mockup', () => {
  const s = markupVolto('happy');
  assert.match(s, /M80 119q13-21 26 0/, 'occhi che ridono');
  assert.match(s, /M101 135q19 24 38 0/, 'sorriso aperto');
});

test('17.04 il tono attenzione è preoccupato, come nel mockup', () => {
  const s = markupVolto('worried');
  assert.match(s, /M105 144q8-8 15 0t15 0/, 'bocca incerta');
  assert.match(s, /M172 98q-8 12 0 17/, 'goccia');
});

test('17.05 il tono neutro guarda dritto, come nel mockup', () => {
  const s = markupVolto('idle');
  assert.match(s, /cx="93" cy="117" r="8"/, 'occhi tondi');
  assert.match(s, /M103 137q17 15 34 0/, 'bocca lieve');
});

test('17.06 i tre toni danno tre disegni diversi', () => {
  const a = markupVolto('happy'), b = markupVolto('worried'), c = markupVolto('idle');
  assert.notEqual(a, b); assert.notEqual(b, c); assert.notEqual(a, c);
  assert.deepEqual([...TONI_VOLTO], ['bene', 'attenzione', 'neutro']);
});

test('17.07 espressione sconosciuta ricade su idle, senza inventare facce', () => {
  assert.equal(markupVolto('boh'), markupVolto('idle'));
  assert.equal(markupVolto(undefined), markupVolto('idle'));
  assert.deepEqual([...ESPRESSIONI_VOLTO], ['idle', 'happy', 'focus', 'tired', 'worried', 'cele']);
});

test('17.08 la tavolozza è quella del mockup, non una mia', () => {
  const s = markupVolto('happy', { testa: false });
  for (const c of ['#ff9ad5', '#ff72c2', '#241a2e', '#b9a6d0', '#fdfbff']) {
    assert.ok(s.includes(c), 'colore del mockup: ' + c);
  }
});

test('17.09 senza documento non si costruisce niente', () => {
  assert.equal(creaVolto(null), null);
  assert.equal(creaVolto({}), null);
  assert.equal(creaVolto(undefined), null);
});

test('17.10 le etichette dei toni sono tre frasi distinte', () => {
  const l = TONI_VOLTO.map(etichettaTono);
  assert.equal(new Set(l).size, 3);
  assert.equal(etichettaTono('boh'), 'nessun giudizio');
});
