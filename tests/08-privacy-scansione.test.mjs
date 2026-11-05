/* Fase 0 · guardia: scansione di privacy su tutti i file di B.
 * Vietati: seme di dati, email reali (esclusi i domini di esempio), chiavi di
 * servizio, password, percorsi Windows, il nome dell'account GitHub personale.
 * La chiave web pubblica del progetto Firebase vive SOLO in app-config-b.js. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function tuttiFile(dir = radice, elenco = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome === ".git" || nome === "tests" || nome === "tests-vecchio-b0.39" || nome === "pc" || nome === "package-lock.json" || nome === "package.json") continue;
    const percorso = join(dir, nome);
    const info = statSync(percorso);
    if (info.isDirectory()) tuttiFile(percorso, elenco);
    else if (/\.(js|mjs|html|webmanifest|md|sh)$/.test(nome)) elenco.push(percorso);
  }
  /* desktop/index.html e' la copia identica di pc/index.html (guardia 42). */
  return elenco.filter((p) => p !== join(radice, "desktop", "index.html"));
}

const VIETATI = [
  { nome: "seme di dati __BDSEED", regex: /__BDSEED/ },
  { nome: "email reale (i domini di esempio sono ammessi nei test)", regex: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, escludi: /@[A-Za-z0-9.-]*example\.(com|invalid|org)/ },
  { nome: "chiave di servizio o account di servizio", regex: /PRIVATE KEY|client_secret|serviceAccount|refresh_token/ },
  { nome: "chiave API fuori da app-config-b.js", regex: /AIza[0-9A-Za-z_-]{20,}/, soloNome: /app-config-b\.js$/ },
  { nome: "percorso Windows del PC", regex: /[A-Za-z]:\\[A-Za-z0-9]/ },
  { nome: "nome dell'account GitHub nel repository", regex: new RegExp("AliceC" + "heon|alicec" + "heon") }
];

test("nessun dato personale o segreto nei file di B", () => {
  const violazioni = [];
  for (const file of tuttiFile()) {
    const relativo = file.slice(radice.length + 1);
    const testo = readFileSync(file, "utf8");
    for (const v of VIETATI) {
      if (v.soloNome) {
        if (v.soloNome.test(relativo)) continue;
        if (v.regex.test(testo)) violazioni.push(relativo + " → " + v.nome);
        continue;
      }
      if (v.escludi) {
        for (const riga of testo.split("\n")) {
          const pulita = riga.replace(v.escludi, "");
          if (v.regex.test(pulita)) violazioni.push(relativo + " → " + v.nome + ": " + riga.trim().slice(0, 60));
        }
        continue;
      }
      if (v.regex.test(testo)) violazioni.push(relativo + " → " + v.nome);
    }
  }
  assert.deepEqual(violazioni, [], "violazioni di privacy:\n" + violazioni.join("\n"));
});
