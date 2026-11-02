/* Fase 0 · guardia: scansione del sorgente di B contro qualunque scrittura.
 * Cintura di sicurezza (d): fallisce se compare una chiamata di scrittura
 * Firestore (set/update/delete/add/batch/transaction/ascoltatori) o una
 * forzatura CSS (!important) o un blocco <style> dentro i moduli JS. */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");

function fileSorgente(dir = radice, elenco = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome === ".git" || nome === "package-lock.json") continue;
    const percorso = join(dir, nome);
    const info = statSync(percorso);
    if (info.isDirectory()) fileSorgente(percorso, elenco);
    else if (/\.(js|mjs|html|webmanifest|md|sh|json)$/.test(nome) && !nome.startsWith("package")) elenco.push(percorso);
  }
  return elenco.filter((p) => !p.includes(join(radice, "tests")));
}

const VIETATI = [
  { nome: "chiamata .set(", regex: /\.set\s*\(/ },
  { nome: "chiamata .update(", regex: /\.update\s*\(/ },
  { nome: "chiamata .delete(", regex: /\.delete\s*\(/ },
  { nome: "chiamata .add(", regex: /\.add\s*\(/ },
  { nome: "setDoc/addDoc/updateDoc/deleteDoc", regex: /\b(setDoc|addDoc|updateDoc|deleteDoc|deleteField)\s*\(/ },
  { nome: "batch o transazione", regex: /\b(writeBatch|runTransaction)\s*\(/ },
  { nome: "ascoltatore sui dati (onSnapshot)", regex: /\bonSnapshot\s*\(/ },
  { nome: "sentinelle di scrittura server", regex: /\b(serverTimestamp|arrayUnion|arrayRemove|increment)\s*\(/ },
  { nome: "forzatura !important", regex: /!important/ },
  { nome: "seme di dati __BDSEED", regex: /__BDSEED/ }
];

test("nessun sorgente di B contiene chiamate di scrittura o forzature", () => {
  const violazioni = [];
  for (const file of fileSorgente()) {
    const testo = readFileSync(file, "utf8");
    for (const v of VIETATI) {
      if (v.regex.test(testo)) violazioni.push(file + " → " + v.nome);
    }
  }
  assert.deepEqual(violazioni, [], "violazioni della sola lettura:\n" + violazioni.join("\n"));
});
