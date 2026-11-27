/* tests/118-caricatore-moduli.test.mjs — la pagina carica i moduli veri, e li
 * carica tutti (19/11/2026).
 *
 * Perche' esiste: il 19/11 la pagina vera non si apriva piu' (il velo di
 * accesso restava su, e ogni clic andava in timeout). La causa era un modulo
 * di comune/ che la pagina importava e che, dentro, lanciava un ReferenceError:
 * un errore che nessun test statico vedeva, perche' nessuno guardava il grafo
 * dei moduli che la pagina carica davvero.
 *
 * Regola di casa (scritta in docs/consegna-b21.md): ogni modulo nuovo di
 * comune/ va registrato nell'elenco del caricatore, cioe' deve stare nel
 * grafo di import che parte da desktop/app-v31.js — l'unico ingresso della
 * pagina. Un file che nessuno importa non si carica; un file importato che
 * non esiste rompe TUTTA la pagina, non solo la sua vista.
 *
 * Qui si legge il grafo degli import statici (senza eseguire niente), si
 * risolve ogni percorso e si controlla che:
 *   118.1 la pagina ha UN solo ingresso: desktop/app-v31.js;
 *   118.2 ogni modulo importato esiste davvero sul disco;
 *   118.3 nessun import e' dinamico o costruito con una variabile (il grafo
 *         deve poter essere letto tutto qui);
 *   118.4 i moduli di questa settimana (piano-vivo, settimane-test) sono
 *         raggiungibili dall'ingresso.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative, sep } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Gli import statici di un modulo: `import ... from "x"` e `export ... from "x"`,
 * piu' il caso `import "x"`. Non si esegue il file: si legge il testo. */
function importDi(file) {
  const testo = readFileSync(file, "utf8");
  const trovati = [];
  const re = /(?:^|[\s;}])(?:import|export)\s+(?:[^"'();]*?\s+from\s+)?["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(testo)) !== null) trovati.push(m[1]);
  return { trovati, testo };
}

/* Il grafo: dalla entry, in profondita'. Restituisce i file visitati e i
 * riferimenti che non si possono risolvere a un file che esiste. */
function grafo(entry) {
  const visitati = new Set();
  const mancanti = [];
  const dinamici = [];
  const coda = [entry];
  while (coda.length) {
    const file = coda.pop();
    if (visitati.has(file)) continue;
    visitati.add(file);
    const { trovati, testo } = importDi(file);
    if (/import\s*\(/.test(testo)) dinamici.push(file);
    trovati.forEach((spec) => {
      if (!spec.startsWith(".")) return; /* solo file locali: niente pacchetti */
      /* Passo 26 — la query della build non fa parte del percorso. */
      const pieno = resolve(dirname(file), spec.split("?")[0]);
      if (!existsSync(pieno)) { mancanti.push({ da: file, spec }); return; }
      coda.push(pieno);
    });
  }
  return { visitati, mancanti, dinamici };
}

const INGRESSO = join(radice, "desktop", "app-v31.js");
const rel = (p) => relative(radice, p).split(sep).join("/");

test("118.1 la pagina ha un solo ingresso: desktop/app-v31.js", () => {
  const html = readFileSync(join(radice, "desktop", "index.html"), "utf8");
  /* Passo 26 — il tag porta la build in fondo (`./app-v31.js?v=b0.70-…`): è
   * la versione nella URL che impedisce a una copia vecchia in cache di
   * servire il codice di ieri. Il percorso del file resta quello, e l'ingresso
   * resta uno solo. */
  const grezzi = [...html.matchAll(/<script[^>]+type=["']module["'][^>]*src=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter((s) => s.startsWith(".")); /* i beacon esterni (Cloudflare) non sono moduli dell'app */
  const moduli = grezzi.map((s) => s.split("?")[0]);
  assert.deepEqual(moduli, ["./app-v31.js"], "la pagina deve caricare un solo modulo: " + grezzi.join(", "));
  assert.match(grezzi[0], /^\.\/app-v31\.js\?v=\S+$/, "l'ingresso deve portare la build nella URL: " + grezzi[0]);
  assert.ok(existsSync(INGRESSO), "manca il file d'ingresso " + rel(INGRESSO));
});

test("118.2 ogni modulo importato esiste davvero sul disco", () => {
  const { visitati, mancanti } = grafo(INGRESSO);
  assert.deepEqual(mancanti, [], "import che portano a un file inesistente: "
    + mancanti.map((x) => rel(x.da) + " -> " + x.spec).join(" | "));
  assert.ok(visitati.size > 10, "il grafo letto e' troppo piccolo: " + visitati.size + " file");
});

test("118.3 nessun import dinamico dentro il grafo della pagina", () => {
  const { dinamici } = grafo(INGRESSO);
  assert.deepEqual(dinamici, [], "import() con percorso calcolato: " + dinamici.map(rel).join(", "));
});

test("118.4 piano-vivo e settimane-test sono raggiungibili dall'ingresso", () => {
  const { visitati } = grafo(INGRESSO);
  const nomi = [...visitati].map(rel);
  ["comune/piano-vivo.js", "comune/settimane-test.js", "comune/vista-programma.js",
    "comune/piano-scheda.js", "comune/modifiche-b.js"].forEach((atteso) => {
    assert.ok(nomi.includes(atteso), "modulo non registrato nel caricatore: " + atteso);
  });
});
