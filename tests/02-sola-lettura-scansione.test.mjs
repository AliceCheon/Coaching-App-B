/* Fase 0 · guardia: scansione del sorgente di B contro qualunque scrittura.
 * Cintura di sicurezza (d): fallisce se compare una chiamata di scrittura
 * Firestore (set/update/delete/add/batch/transaction/ascoltatori) o una
 * forzatura CSS (!important) o un blocco <style> dentro i moduli JS.
 *
 * PASSO 4 (7/11/2026) — l'esenzione. Da qui in poi B ha UNA zona sua
 * (`bdB_atleti/{uid}`) e un solo modulo che puo' scrivere:
 * comune/scritture-b.js. L'esenzione vale per quel file e per i soli verbi di
 * scrittura: le altre regole (niente !important, niente seme __BDSEED) valgono
 * anche li'. Che dentro quel modulo ogni scrittura nasca dalla zona B lo
 * controlla tests/47-scritture-zona-b.test.mjs, piu' stretto di questa guardia:
 * qui si dice "uno solo", li' si dice "uno solo e solo dentro bdB_atleti".
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODULO_SCRITTURA = join(radice, "comune", "scritture-b.js");

function fileSorgente(dir = radice, elenco = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome === ".git" || nome === "package-lock.json") continue;
    const percorso = join(dir, nome);
    const info = statSync(percorso);
    if (info.isDirectory()) fileSorgente(percorso, elenco);
    else if (/\.(js|mjs|html|webmanifest|md|sh|json)$/.test(nome) && !nome.startsWith("package")) elenco.push(percorso);
  }
  /* desktop/index.html e' la copia identica di pc/index.html (guardia 42); il parcheggio non e' sorgente attivo. */
  return elenco.filter((p) => !p.includes(join(radice, "tests")) && !p.includes(join(radice, "pc")) && !p.includes(join(radice, "tests-vecchio-b0.39")) && p !== join(radice, "desktop", "index.html"));
}

const VIETATI = [
  { nome: "chiamata .set(", regex: /\.set\s*\(/ },
  { nome: "chiamata .update(", regex: /\.update\s*\(/ },
  { nome: "chiamata .delete(", regex: /\.delete\s*\(/ },
  { nome: "chiamata .add(", regex: /\.add\s*\(/ },
  { nome: "setDoc/addDoc/updateDoc/deleteDoc", regex: /\b(setDoc|addDoc|updateDoc|deleteDoc|deleteField)\s*\(/ },
  { nome: "batch o transazione", regex: /\b(writeBatch|runTransaction)\s*\(/ },
  { nome: "ascoltatore sui dati (onSnapshot)", regex: /\bonSnapshot\s*\(/ },
  { nome: "sentinelle di scrittura server", regex: /\b(serverTimestamp|arrayUnion|arrayRemove|increment)\s*\(/ }
];

/* Queste valgono anche nel modulo di scrittura. */
const SEMPRE_VIETATI = [
  { nome: "forzatura !important", regex: /!important/ },
  { nome: "seme di dati __BDSEED", regex: /__BDSEED/ }
];

test("nessun sorgente di B contiene chiamate di scrittura o forzature", () => {
  const violazioni = [];
  for (const file of fileSorgente()) {
    const testo = readFileSync(file, "utf8");
    const elenco = file === MODULO_SCRITTURA ? SEMPRE_VIETATI : VIETATI.concat(SEMPRE_VIETATI);
    for (const v of elenco) {
      if (v.regex.test(testo)) violazioni.push(file + " \u2192 " + v.nome);
    }
  }
  assert.deepEqual(violazioni, [], "violazioni della sola lettura:\n" + violazioni.join("\n"));
});

test("l'esenzione vale per un solo modulo e quel modulo esiste", () => {
  assert.ok(existsSync(MODULO_SCRITTURA), "l'esenzione punta a un file che non c'e'");
  const verbi = VIETATI.filter((v) => !/ascoltatore/.test(v.nome));
  const conScritture = fileSorgente().filter((file) => verbi.some((v) => v.regex.test(readFileSync(file, "utf8"))));
  assert.deepEqual(conScritture, [MODULO_SCRITTURA], "piu' di un file scrive: " + conScritture.join(", "));
});
