import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const radice = path.resolve(import.meta.dirname, "..");
const leggi = (f) => fs.readFileSync(path.join(radice, f), "utf8");

for (const pagina of ["desktop/index.html", "mobile/index.html"]) {
  test("31.0" + (pagina.startsWith("desktop") ? "1" : "2") + " " + pagina + " dichiara i gettoni interi nei due temi", () => {
    const t = leggi(pagina);
    const gettoni = ["--gradiente", "--surface", "--raised", "--text", "--muted", "--line", "--line-soft", "--campo", "--lav", "--verde", "--ombra"];
    for (const tema of ["dark", "light"]) {
      const m = t.match(new RegExp('body\\[data-theme="' + tema + '"\\]\\{([^}]*)\\}'));
      assert.ok(m, "manca il blocco " + tema);
      gettoni.forEach((g) => assert.ok(m[1].includes(g + ":"), pagina + " / " + tema + ": manca " + g));
    }
  });
}

test("31.03 la pelle del v31 trova tutti i suoi agganci", () => {
  const css = leggi("comune/dashboard-b.css");
  const pagina = leggi("desktop/index.html");
  ["--linea:var(--line)", "--testo:var(--text)", "--card:var(--surface)", "--card-2:var(--raised)", "--muto:var(--muted)"].forEach((a) => {
    assert.ok(css.includes(a), "alias mancante nel foglio: " + a);
  });
  const m = pagina.match(/body\[data-theme="dark"\]\{([^}]*)\}/);
  ["--line", "--text", "--surface", "--raised", "--muted"].forEach((g) => {
    assert.ok(m[1].includes(g + ":"), "il gettone " + g + " non è definito: la pelle resta senza colore");
  });
});
