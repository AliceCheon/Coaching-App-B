/* Fase 0 · guardia: le chiavi locali di B hanno tutte il prefisso bd-b.v1. e
 * le chiavi dell'app A (la chiave di stato dell'app A) non vengono mai toccate. */

import test from "node:test";
import assert from "node:assert/strict";
import { chiaveBD, salvaChiaveBD, leggiChiaveBD } from "../comune/tema.js";

function storageFinto() {
  const contenuti = {};
  return {
    getItem: (k) => (k in contenuti ? contenuti[k] : null),
    memorizza: contenuti,
    setItem: (k, v) => { contenuti[k] = String(v); }
  };
}

test("ogni chiave scritta da B comincia con bd-b.v1.", () => {
  const storage = storageFinto();
  salvaChiaveBD(storage, "tema", "light");
  salvaChiaveBD(storage, "preferenza-di-prova", "valore-di-prova");
  const chiavi = Object.keys(storage.memorizza);
  assert.deepEqual(chiavi.filter((k) => !k.startsWith("bd-b.v1.")), []);
  assert.equal(leggiChiaveBD(storage, "tema"), "light");
});

test("B non scrive mai nelle chiavi di A", () => {
  const storage = storageFinto();
  storage.setItem("alice-method-" + "app.v8", "valore-di-prova-inventato");
  storage.setItem("alice-method-" + "app.v8.lastAccountUid", "uid-di-prova");
  assert.throws(() => salvaChiaveBD(storage, "alice-method-" + "app.v8", "sovrascrittura"), /non si toccano mai|prefisso|non ammessa/);
  assert.throws(() => chiaveBD("alice-method-" + "app.v8.lastAccountUid", "bd-b.v1."), /non si toccano mai/);
  assert.equal(storage.getItem("alice-method-" + "app.v8"), "valore-di-prova-inventato");
  assert.equal(storage.getItem("alice-method-" + "app.v8.lastAccountUid"), "uid-di-prova");
  const chiaviScritteDaB = Object.keys(storage.memorizza).filter((k) => k.startsWith("bd-b.v1."));
  assert.deepEqual(chiaviScritteDaB, [], "nessuna chiave di B deve esistere in questo test");
});
