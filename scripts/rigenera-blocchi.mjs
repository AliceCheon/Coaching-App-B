/* Rigenera l'elenco dei blocchi dichiarati in docs/differenze-dal-v31.md dal
 * diff vero contro pc/index.html. Uso: node scripts/rigenera-blocchi.mjs
 * Serve quando una modifica sposta le righe: la lista resta allineata da sola. */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = join(radice, "docs", "differenze-dal-v31.md");
const righeDoc = readFileSync(doc, "utf8").split("\n");
const inizio = righeDoc.indexOf("### I blocchi");
const fine = righeDoc.indexOf("### Cosa è cambiato, per passi (prosa, non blocchi)");
if (inizio < 0 || fine < 0) throw new Error("sezioni del documento non trovate");

let diff = "";
try {
  /* maxBuffer: con le voci di A (passo 32) il diff supera 1 MB, il default di
   * execFileSync, e arriverebbe troncato. */
  diff = execFileSync("git", ["diff", "--no-index", "-U0", join(radice, "pc", "index.html"), join(radice, "desktop", "index.html")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) { diff = String((e && e.stdout) || ""); }

const hunks = [...diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm)]
  .map((m) => [Number(m[1]), Number(m[1]) + (m[2] == null ? 1 : Number(m[2])) - 1])
  .sort((a, b) => a[0] - b[0]);

const desktop = readFileSync(join(radice, "desktop", "index.html"), "utf8").split("\n");
const etichetta = (a, b) => {
  for (let i = a - 1; i < Math.min(b, desktop.length); i += 1) {
    const t = desktop[i].trim();
    if (t) return t.replace(/\u2014/g, "-").replace(/\|/g, "/").slice(0, 100);
  }
  return "(riga vuota)";
};

const blocchi = [];
hunks.forEach(([a, b]) => {
  if (blocchi.length && a - blocchi[blocchi.length - 1][1] <= 2) blocchi[blocchi.length - 1][1] = b;
  else blocchi.push([a, b]);
});

const nuove = [
  "### I blocchi",
  "",
  "Una riga per blocco: il numero di riga (o l'intervallo) in `desktop/index.html` e la prima riga cambiata. Se una modifica futura non sta qui, la guardia `tests/42-identita-desktop-pc.test.mjs` diventa rossa.",
  ""
];
blocchi.forEach(([a, b]) => nuove.push("- righe " + a + (b > a ? "-" + b : "") + " \u2014 " + etichetta(a, b)));
nuove.push("");

writeFileSync(doc, [...righeDoc.slice(0, inizio), ...nuove, ...righeDoc.slice(fine)].join("\n"));
console.log("blocchi:", blocchi.length, "hunks:", hunks.length);
