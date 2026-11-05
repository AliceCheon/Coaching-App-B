/* Guardia della rotta nuova: desktop/index.html e' la copia identica di
 * pc/index.html (il v31). Vale finche' non si comincia il passo 2: da lì
 * questa uguaglianza si rompe DI PROPOSITO, una riga per volta e dichiarata. */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

test("desktop/index.html e' identico a pc/index.html (sha256)", () => {
  const a = createHash("sha256").update(readFileSync(join(radice, "desktop", "index.html"))).digest("hex");
  const b = createHash("sha256").update(readFileSync(join(radice, "pc", "index.html"))).digest("hex");
  assert.equal(a, b, "desktop/index.html non e' piu' identico a pc/index.html: cambiato a mano?");
});
