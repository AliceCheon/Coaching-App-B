/* Passo 4 · guardia della zona B.
 *
 * Tre cose, in ordine di importanza:
 *  1. nel sorgente di B SOLO comune/scritture-b.js puo' contenere un verbo di
 *     scrittura Firestore;
 *  2. dentro quel modulo ogni verbo di scrittura sta su una riga che nasce da
 *     riferimentoB( o radiceB(, e il nome di una raccolta di A non compare;
 *  3. le funzioni rifiutano uid e id che proverebbero a uscire dalla zona.
 *
 * Nota di contesto: le regole Firestore sono del progetto e non distinguono le
 * due app (oggi: una sola regola, tutto aperto). Il "no" a scrivere sui dati di
 * A vive qui, non li'.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  ZONA_B,
  SOTTO_B,
  percorsoB,
  ErroreZonaNonAmmessa
} from "../comune/modello-dati.js";
import {
  radiceB,
  copiaProgramma,
  copiaScheda,
  copiaSeduta,
  copiaEsercizio,
  scriviVoceRegistro,
  scriviFotografia,
  leggiZonaB
} from "../comune/scritture-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MODULO_SCRITTURA = join(radice, "comune", "scritture-b.js");

const VERBI = [
  { nome: ".set(", regex: /\.set\s*\(/ },
  { nome: ".update(", regex: /\.update\s*\(/ },
  { nome: ".delete(", regex: /\.delete\s*\(/ },
  { nome: ".add(", regex: /\.add\s*\(/ },
  { nome: ".commit(", regex: /\.commit\s*\(/ },
  { nome: "setDoc/addDoc/updateDoc/deleteDoc", regex: /\b(setDoc|addDoc|updateDoc|deleteDoc)\s*\(/ },
  { nome: "writeBatch/runTransaction", regex: /\b(writeBatch|runTransaction)\s*\(/ }
];

function fileSorgente(dir = radice, elenco = []) {
  for (const nome of readdirSync(dir)) {
    if (nome === "node_modules" || nome === ".git" || nome === "package-lock.json") continue;
    const percorso = join(dir, nome);
    if (statSync(percorso).isDirectory()) fileSorgente(percorso, elenco);
    else if (/\.(js|mjs|html)$/.test(nome)) elenco.push(percorso);
  }
  return elenco.filter((p) => !p.includes(join(radice, "tests"))
    && !p.includes(join(radice, "pc"))
    && !p.includes(join(radice, "tests-vecchio-b0.39"))
    && !p.includes(join(radice, "desktop-vecchio-b0.39"))
    && p !== join(radice, "desktop", "index.html"));
}

/* ---------- 47.1 · il recinto: un solo file che scrive ---------- */

test("47.1 solo comune/scritture-b.js contiene verbi di scrittura", () => {
  const colpevoli = [];
  for (const file of fileSorgente()) {
    if (file === MODULO_SCRITTURA) continue;
    const testo = readFileSync(file, "utf8");
    for (const v of VERBI) {
      if (v.regex.test(testo)) colpevoli.push(file.replace(radice, "") + " → " + v.nome);
    }
  }
  assert.deepEqual(colpevoli, [], "scritture fuori dal modulo confinato:\n" + colpevoli.join("\n"));
});

test("47.2 il modulo confinato esiste ed e' uno solo", () => {
  assert.ok(existsSync(MODULO_SCRITTURA), "manca comune/scritture-b.js");
});

/* ---------- 47.3 · dentro il modulo: ogni scrittura nasce dalla zona B ------ */

test("47.3 ogni verbo di scrittura nasce da riferimentoB( o radiceB(", () => {
  const righe = readFileSync(MODULO_SCRITTURA, "utf8").split(/\r?\n/);
  const sospette = [];
  righe.forEach((riga, indice) => {
    const codice = riga.replace(/\/\/.*$/, "");
    if (!VERBI.some((v) => v.regex.test(codice))) return;
    if (/riferimentoB\(|radiceB\(/.test(codice)) return;
    sospette.push((indice + 1) + ": " + riga.trim());
  });
  assert.deepEqual(sospette, [], "scritture con percorso non costruito dalla zona B:\n" + sospette.join("\n"));
});

test("47.4 il modulo non nomina le raccolte di A", () => {
  const testo = readFileSync(MODULO_SCRITTURA, "utf8");
  assert.ok(!/barbellDivaAccounts/.test(testo), "il modulo di scrittura nomina barbellDivaAccounts");
  assert.ok(!/nutritionPhotos/.test(testo), "il modulo di scrittura nomina nutritionPhotos");
  assert.ok(!/["']sessions["']/.test(testo), "il modulo di scrittura nomina sessions");
});

test("47.5 la zona B ha un nome solo e sta nel contratto dei dati", () => {
  assert.equal(ZONA_B, "bdB_atleti");
  assert.equal(percorsoB("u1", SOTTO_B.sedute, "s1"), "bdB_atleti/u1/sedute/s1");
  assert.equal(percorsoB("u1"), "bdB_atleti/u1");
  const contratto = readFileSync(join(radice, "comune", "modello-dati.js"), "utf8");
  assert.equal((contratto.match(/"bdB_atleti"/g) || []).length, 1, "il nome della zona deve comparire una volta sola");
  const altrove = fileSorgente().filter((f) => f !== join(radice, "comune", "modello-dati.js")
    && /"bdB_atleti"/.test(readFileSync(f, "utf8")));
  assert.deepEqual(altrove, [], "il nome della zona e' scritto anche fuori dal contratto");
});

/* ---------- 47.6 · il recinto regge: uid e id ostili vengono rifiutati ----- */

function dbFinto(scritte) {
  return {
    collection(nome) {
      return {
        doc(id) {
          return {
            collection(sotto) {
              return {
                doc(idInterno) {
                  return {
                    set(dati) {
                      scritte.push(nome + "/" + id + "/" + sotto + "/" + idInterno);
                      return Promise.resolve({ ok: true, dati });
                    }
                  };
                },
                get() {
                  return Promise.resolve({ docs: [] });
                }
              };
            },
            set(dati) {
              scritte.push(nome + "/" + id);
              return Promise.resolve({ ok: true, dati });
            },
            get() {
              return Promise.resolve({ exists: false });
            }
          };
        }
      };
    }
  };
}

test("47.6 le scritture finiscono tutte e sole dentro bdB_atleti/{uid}", () => {
  const scritte = [];
  const db = dbFinto(scritte);
  copiaProgramma(db, "u1", "p1", { a: 1 });
  copiaScheda(db, "u1", "s1", { a: 1 });
  copiaSeduta(db, "u1", "x1", { a: 1 });
  copiaEsercizio(db, "u1", "e1", { a: 1 });
  scriviVoceRegistro(db, "u1", "r1", { a: 1 });
  scriviFotografia(db, "u1", { a: 1 });
  assert.deepEqual(scritte, [
    "bdB_atleti/u1/programmi/p1",
    "bdB_atleti/u1/schede/s1",
    "bdB_atleti/u1/sedute/x1",
    "bdB_atleti/u1/esercizi/e1",
    "bdB_atleti/u1/registro/r1",
    "bdB_atleti/u1"
  ]);
  assert.ok(scritte.every((p) => p.startsWith("bdB_atleti/")), "una scrittura e' uscita dalla zona B");
});

test("47.7 uid e id ostili vengono rifiutati, non corretti", () => {
  const scritte = [];
  const db = dbFinto(scritte);
  const ostili = ["", null, "barbellDivaAccounts/u2", "../x", "u1/sessions", 42];
  ostili.forEach((valore) => {
    assert.throws(() => radiceB(db, valore), ErroreZonaNonAmmessa, "uid accettato: " + String(valore));
  });
  assert.throws(() => copiaSeduta(db, "u1", "a/b", {}), ErroreZonaNonAmmessa);
  assert.throws(() => copiaSeduta(db, "u1", "", {}), ErroreZonaNonAmmessa);
  assert.deepEqual(scritte, [], "una scrittura e' passata nonostante il rifiuto");
  assert.throws(() => leggiZonaB(db, "u1", "sessions"), ErroreZonaNonAmmessa, "sottoraccolta di A leggibile da qui");
});

/* ---------- 47.8 · la pagina di copia non scrive da sola ------------------ */

test("47.8 la pagina di copia delega al modulo e dichiara la fotografia", () => {
  const pagina = readFileSync(join(radice, "desktop", "copia-b.js"), "utf8");
  const html = readFileSync(join(radice, "desktop", "copia-b.html"), "utf8");
  assert.ok(!VERBI.some((v) => v.regex.test(pagina)), "la pagina contiene un verbo di scrittura");
  assert.ok(/descriviFotografia/.test(pagina), "la pagina non mostra la data della fotografia");
  assert.ok(/copia-b\.js/.test(html), "l'html non carica la pagina");
  assert.ok(!/!important/.test(html) && !/!important/.test(pagina), "forzatura !important");
});
