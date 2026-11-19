// 122 — il cancello del push: «bash suite.sh totale» deve essere una lettura
// che non azzera niente e che dice FALLITO quando i conti non tornano.
// Regola del 19/11/2026: il push e' `bash suite.sh totale && git push`, quindi
// e' il cancello che deve sbagliarsi da solo, non l'occhio di chi legge.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const qui = path.dirname(fileURLToPath(import.meta.url));
const script = path.join(qui, "..", "scripts", "totale.cjs");

// Banco: file di prova veri (nomi finti, contenuto vuoto) in una cartella.
function banco(nomi) {
  const radice = fs.mkdtempSync(path.join(os.tmpdir(), "totale-"));
  const dir = path.join(radice, "tests");
  fs.mkdirSync(dir);
  for (const n of nomi) fs.writeFileSync(path.join(dir, n), "");
  return { dir, log: path.join(radice, "log-suite.txt"), fette: path.join(radice, "fette.txt") };
}

function scriviLog(b, righe) {
  fs.writeFileSync(b.log, righe.join("\n") + "\n");
}

// fette.txt come lo scrive suite.sh: nome<TAB>quanti<TAB>file separati da spazio.
function scriviFette(b, fette) {
  const righe = fette.map((f) => f.nome + "\t" + f.file.length + "\t" + f.file.join(" "));
  fs.writeFileSync(b.fette, righe.join("\n") + "\n");
}

function corri(b) {
  return spawnSync(process.execPath, [script, "--log", b.log, "--dir", b.dir], { encoding: "utf8" });
}

function corriConFette(b) {
  return spawnSync(process.execPath, [script, "--log", b.log, "--dir", b.dir, "--fette", b.fette], {
    encoding: "utf8",
  });
}

const TRE = ["01-a.test.mjs", "02-b.test.mjs", "03-c.test.mjs"];
const COMPLETO = [
  "fetta veloce1-1: pass 5 fail 0 file 2",
  "fetta veloce2-1: pass 3 fail 0 file 1",
];

test("122.1 log completo: TOTALE giusto e uscita 0", () => {
  const b = banco(TRE);
  scriviLog(b, COMPLETO);
  const r = corri(b);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^TOTALE pass 8 fail 0 file 3\/3$/m);
});

test("122.2 due letture di fila: stesso risultato e log intatto", () => {
  const b = banco(TRE);
  scriviLog(b, COMPLETO);
  const prima = fs.readFileSync(b.log, "utf8");
  const uno = corri(b);
  const due = corri(b);
  assert.equal(uno.stdout, due.stdout);
  assert.equal(uno.status, due.status);
  assert.equal(fs.readFileSync(b.log, "utf8"), prima, "il cancello non deve toccare il log");
});

test("122.3 log incompleto (manca una fetta): FALLITO e uscita 1", () => {
  const b = banco(TRE);
  scriviLog(b, ["fetta veloce1-1: pass 5 fail 0 file 2"]);
  const r = corri(b);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^TOTALE FALLITO pass 5 fail 0 file 2\/3/m);
  assert.match(r.stdout, /fette senza riga nel log:\s*veloce2-1/);
});

test("122.4 una fetta con fail: FALLITO anche se i file tornano", () => {
  const b = banco(TRE);
  scriviLog(b, ["fetta veloce1-1: pass 5 fail 2 file 2", "fetta veloce2-1: pass 3 fail 0 file 1"]);
  const r = corri(b);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^TOTALE FALLITO pass 8 fail 2 file 3\/3/m);
});

test("122.5 fetta MANCATA nel log: FALLITO col suo nome", () => {
  const b = banco(TRE);
  scriviLog(b, [
    "fetta veloce1-1: pass 5 fail 0 file 2",
    "fetta veloce2-1: MANCATA (nessun risultato da --test, vedi log-slice-veloce2-1.txt)",
  ]);
  const r = corri(b);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /fette fallite o non coerenti:\s*veloce2-1/);
});

test("122.6 i conti dei file di una fetta non tornano: FALLITO, e dice quale fetta", () => {
  const b = banco(TRE);
  scriviLog(b, ["fetta veloce1-1: pass 5 fail 0 file 3", "fetta veloce2-1: pass 3 fail 0 file 1"]);
  const r = corri(b);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /veloce1-1 \(log file 3, attesi 2\)/);
});

// Il caso che conta: un file sul disco che nessuna fetta dichiarata copre.
// Le fette le dichiara il banco (come fette.txt), cosi' restano quelle anche
// quando sul disco compare un file in piu'.
test("122.7 un file sul disco che nessuna fetta copre: FALLITO, e il file e' nominato", () => {
  const b = banco(TRE.concat(["04-d.test.mjs"]));
  scriviFette(b, [
    { nome: "veloce1-1", file: [b.dir + "/01-a.test.mjs", b.dir + "/02-b.test.mjs"] },
    { nome: "veloce2-1", file: [b.dir + "/03-c.test.mjs"] },
  ]);
  scriviLog(b, COMPLETO);
  const r = corriConFette(b);
  assert.equal(r.status, 1, "un file mai coperto deve far fallire il cancello");
  assert.match(r.stdout, /^TOTALE FALLITO/m);
  assert.match(r.stdout, /04-d\.test\.mjs/, "il messaggio deve nominare il file scoperto: " + r.stdout);
});

test("122.8 un file tolto dal disco: FALLITO, non un falso verde", () => {
  const b = banco(TRE);
  fs.unlinkSync(path.join(b.dir, "03-c.test.mjs"));
  scriviLog(b, COMPLETO);
  const r = corri(b);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^TOTALE FALLITO/m);
  assert.match(r.stdout, /non coperti/);
});

test("122.9 un file elencato in fette.txt che sul disco non esiste: FALLITO", () => {
  const b = banco(TRE);
  scriviFette(b, [
    { nome: "veloce1-1", file: [b.dir + "/01-a.test.mjs", b.dir + "/02-b.test.mjs"] },
    { nome: "veloce2-1", file: [b.dir + "/03-c.test.mjs", b.dir + "/05-e.test.mjs"] },
  ]);
  scriviLog(b, ["fetta veloce1-1: pass 5 fail 0 file 2", "fetta veloce2-1: pass 3 fail 0 file 2"]);
  const r = corriConFette(b);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^TOTALE FALLITO/m);
  assert.match(r.stdout, /05-e\.test\.mjs/, "il messaggio deve nominare il file inesistente: " + r.stdout);
});

// Il caso vero: si lancia `bash suite.sh` normale (senza fette.txt), la corsa si
// ferma a meta' e il log resta corto. Qui le fette le ricava il cancello dal
// disco, quindi il file rimasto senza fetta deve uscire fuori per nome.
test("122.10 log corto senza --fette: file sul disco non coperti, FALLITO e nome del file", () => {
  const b = banco(TRE);
  scriviLog(b, ["fetta veloce1-1: pass 5 fail 0 file 2"]);
  const r = corri(b); // niente --fette: le fette le calcola dal disco
  assert.equal(r.status, 1, "un file rimasto senza fetta nel log deve far fallire il cancello: " + r.stdout);
  assert.match(r.stdout, /^TOTALE FALLITO/m);
  assert.match(r.stdout, /03-c\.test\.mjs/, "il messaggio deve nominare il file scoperto: " + r.stdout);
  assert.match(r.stdout, /non coperti/);
});
