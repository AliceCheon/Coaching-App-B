/* Fase 0 · guardia: manifest minimo, standalone, mai fullscreen, nessun
 * orientamento forzato, tutto dentro la propria cartella. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

test("manifest: standalone, senza orientamento, senza fullscreen, in proprio ambito", () => {
  const manifest = JSON.parse(readFileSync(join(radice, "mobile", "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.ok(!("orientation" in manifest), "nessun orientamento forzato");
  assert.ok(!JSON.stringify(manifest).toLowerCase().includes("fullscreen"), "mai fullscreen nel manifest");
  assert.equal(manifest.background_color, "#090918", "fondo opaco scuro, come l'html del tema");
  assert.ok(!("serviceworker" in manifest), "nessun service worker in fase 0");
});

test("nessun file di B registra un service worker e nessuno apre IndexedDB", () => {
  for (const file of ["desktop/index.html", "desktop/app.js", "mobile/index.html", "mobile/app.js", "comune/firebase-client.js"]) {
    const testo = readFileSync(join(radice, file), "utf8");
    assert.ok(!/serviceWorker|navigator\.serviceWorker/i.test(testo), file + " menziona la registrazione di un service worker");
    assert.ok(!/indexedDB\.open/i.test(testo), file + " apre un database IndexedDB");
    assert.ok(!/barbell-diva-workout-rescue/.test(testo), file + " cita il nome del database di A");
  }
});
