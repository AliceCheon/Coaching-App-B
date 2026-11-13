
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const sorgente = fs.readFileSync(new URL("../desktop/index.html", import.meta.url), "utf8");

test("91.1 nessun textContent con un tag dentro: il nastro non mostra markup grezzo", () => {
  for (const m of sorgente.matchAll(/.textContents*=s*`[^`]*?<[a-z][^`]*?`/gs)) {
    assert.ok(!/<(span|b|i|em|strong)/i.test(m[0]), "tag dentro textContent: " + m[0].slice(0, 90));
  }
});

test("91.2 la data del nastro sta in uno span vero creato con createElement", () => {
  assert.ok(sorgente.includes('kpiUltima.setAttribute("data-lb-kpi", "ultima")'));
  assert.ok(sorgente.includes("frn.appendChild(kpiUltima)"));
});
