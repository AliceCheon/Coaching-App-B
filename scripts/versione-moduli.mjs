/* Barbell Diva B — la build nella URL dell'ingresso della pagina (passo 26).
 *
 * Perché: GitHub Pages tiene i file in cache per dieci minuti. Dopo una
 * pubblicazione una copia vecchia può restare in memoria mentre l'HTML è
 * nuovo, e si guarda il codice di oggi con dentro il difetto di ieri.
 *
 * Qui la build di app-config-b.js va in fondo a due indirizzi di
 * desktop/index.html: il modulo d'ingresso (./app-v31.js) e la configurazione.
 * Il foglio comune/dashboard-b.css prende la stessa versione a runtime, in
 * desktop/app-v31.js (caricaFoglioB), leggendola da BD_B.build.
 *
 * Gli import DENTRO i moduli restano senza versione apposta: cambiare quelle
 * URL crea due copie dello stesso modulo (una con e una senza `?v=`) e le
 * classi non sono più le stesse fra chi scrive e chi controlla. La prova 47.7
 * lo ha mostrato subito. L'ingresso e il foglio bastano a non ripartire da
 * una pagina vecchia.
 *
 * Uso: node scripts/versione-moduli.mjs [cartella-repo]
 * Gira anche da scripts/bump-b.sh, così build e URL non divergono.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), "..");
const config = readFileSync(join(radice, "app-config-b.js"), "utf8");
/* Senza espressione regolare: la riga si legge e si taglia. (Il controllo
 * privacy di tests/08 scambia `:\s` per un percorso di Windows.) */
const rigaBuild = config.split("\n").filter((r) => r.trim().indexOf("build:") === 0)[0] || "";
const build = (rigaBuild.split('"')[1] || "").trim();
if (!build) {
  console.error("in app-config-b.js non c'è una riga `build: \"...\"`");
  process.exit(1);
}

const html = join(radice, "desktop", "index.html");
const prima = readFileSync(html, "utf8");
let quanti = 0;
const dopo = prima
  .replace(/(<script[^>]*src="\.\.?\/app-config-b\.js)(\?v=[^"]*)?(["'])/g, (tutto, inizio, vecchio, fine) => {
    quanti += 1;
    return inizio + "?v=" + build + fine;
  })
  .replace(/(<script[^>]*type="module"[^>]*src="\.\/app-v31\.js)(\?v=[^"]*)?(["'])/g, (tutto, inizio, vecchio, fine) => {
    quanti += 1;
    return inizio + "?v=" + build + fine;
  });
if (quanti < 2) {
  console.error("in desktop/index.html non ho trovato i due tag da versionare");
  process.exit(1);
}
if (dopo !== prima) writeFileSync(html, dopo);
console.log("build " + build + " nelle URL di ingresso: " + quanti + " tag");
