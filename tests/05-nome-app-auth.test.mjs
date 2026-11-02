/* Fase 0 · guardia: B inizializza l'app Firebase con il NOME "B" (quella di A
 * usa il nome predefinito, src/app-main.js:5114) e con persistenza LOCAL
 * (come A su src/app-main.js:5128). La chiave di persistenza dell'Auth include
 * il nome dell'app (slot [DEFAULT] per A): con il nome "B" la sessione resta
 * separata. La separazione va confermata al primo accesso vero (README). */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { inizializzaAppB, persistenzaLocale } from "../comune/firebase-client.js";
import { creaFirebaseFinto } from "./finti/firebase-finto.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

test("inizializzaAppB registra sempre l'app con nome 'B' e la config di progetto", () => {
  const { sdk, registri } = creaFirebaseFinto({});
  const config = JSON.parse('{"nomeAppAuth":"B","firebase":{"apiKey":"chiave-di-prova","projectId":"progetto-di-prova"}}');
  const app = inizializzaAppB(sdk, config);
  assert.equal(app.name, "B");
  assert.deepEqual(registri.nomiApp, ["B"]);
  assert.equal(registri.configs[0].projectId, "progetto-di-prova");
  const diNuovo = inizializzaAppB(sdk, config);
  assert.equal(diNuovo.name, "B");
  assert.equal(registri.nomiApp.length, 1, "una seconda inizializzazione non deve registrare un'altra app");
});

test("la persistenza è LOCAL, la stessa di A", async () => {
  const { sdk, registri, authFinto } = creaFirebaseFinto({});
  await persistenzaLocale(authFinto, sdk);
  assert.deepEqual(registri.persistenze, ["local"]);
});

test("il nome dell'app 'B' è piantonato nella configurazione", () => {
  const config = readFileSync(join(radice, "app-config-b.js"), "utf8");
  assert.ok(config.includes('nomeAppAuth: "B"'), "app-config-b.js deve dichiarare nomeAppAuth: 'B'");
  assert.ok(config.includes('prefissoChiavi: "bd-b.v1."'), "app-config-b.js deve dichiarare il prefisso delle chiavi");
});
