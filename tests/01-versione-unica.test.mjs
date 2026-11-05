/* Fase 0 · guardia: la versione vive SOLO in app-config-b.js. */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = readFileSync(join(radice, "app-config-b.js"), "utf8");

test("la build è dichiarata una sola volta, in app-config-b.js", () => {
  const righe = config.split("\n").filter((r) => r.includes('build: "'));
  assert.equal(righe.length, 1, "build dichiarata " + righe.length + " volte");
  assert.match(config, /build: "b\d+\.\d+-[a-z0-9-]+"/);
});

test("gli ingressi HTML non contengono versioni hardcoded e caricano la config", () => {
  /* desktop/index.html ora e' il v31: non carica app-config-b.js, le sue forme le guarda il test 42. */
  for (const ingresso of ["mobile/index.html"]) {
    const html = readFileSync(join(radice, ingresso), "utf8");
    assert.ok(html.includes('src="../app-config-b.js"'), ingresso + " non carica app-config-b.js");
    assert.ok(!/b\d+\.\d+-[a-z0-9-]+/.test(html.replace('b0.1-fase0', "").replace(/build \+ config/g, "")), ingresso + " contiene una versione hardcoded");
    const stili = html.split("<style>").length - 1;
    const moduli = html.split('type="module"').length - 1;
    assert.equal(stili, 1, ingresso + " deve avere esattamente un blocco <style>");
    assert.equal(moduli, 1, ingresso + " deve avere esattamente un modulo");
  }
});

test("lo script di bump esiste e punta alla fonte unica", () => {
  assert.ok(existsSync(join(radice, "scripts", "bump-b.sh")), "manca scripts/bump-b.sh");
  const sh = readFileSync(join(radice, "scripts", "bump-b.sh"), "utf8");
  assert.ok(sh.includes("app-config-b.js"));
});
