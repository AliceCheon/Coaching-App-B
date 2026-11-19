// scripts/totale.cjs — il cancello del push (19 novembre 2026).
//
// E' una SOLA LETTURA: legge il log della suite e lo confronta con i file di
// prova che stanno sul disco adesso. Non scrive niente, non spegne processi,
// non prende il blocco. Due chiamate di fila danno lo stesso risultato.
//
//   node scripts/totale.cjs [--log log-suite.txt] [--dir tests] [--fette fette.txt]
//
// Senza --fette le fette si ricavano dai file presenti in --dir (stesse regole
// di suite.sh: i "veloci" in due meta' a blocchi di 8, poi 6x e 7x a due).
// Con --fette si usano le fette elencate in quel file (una riga per fetta:
// nome<TAB>numero<TAB>file1 file2 ...) e in piu' si pretende che ogni file
// elencato esista davvero sul disco.
//
// Esce 0 solo se: ogni fetta attesa ha la sua riga, nessuna e' MANCATA, la riga
// dichiara lo stesso numero di file della fetta, i file coperti sono esattamente
// quelli sul disco (confronto per nome), e la somma dei fail e' zero.
//
// Riga finale:  TOTALE pass N fail M file X/Y

const fs = require("node:fs");

function leggiArgomenti(argv) {
  const opt = { log: "log-suite.txt", dir: "tests", fette: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--log") opt.log = argv[++i];
    else if (argv[i] === "--dir") opt.dir = argv[++i];
    else if (argv[i] === "--fette") opt.fette = argv[++i];
  }
  return opt;
}

const base = (p) => String(p).split(/[\\/]/).pop();

function fileSulDisco(dir) {
  let nomi = [];
  try {
    nomi = fs.readdirSync(dir);
  } catch (e) {
    return [];
  }
  return nomi
    .filter((n) => /\.test\.mjs$/.test(n))
    .sort()
    .map((n) => dir.replace(/[/\\]+$/, "") + "/" + n);
}

function blocchi(nome, passo, lista, uscita) {
  for (let i = 0, k = 1; i < lista.length; i += passo, k++) {
    uscita.push({ nome: nome + "-" + k, file: lista.slice(i, i + passo) });
  }
}

function fetteDaDisco(dir) {
  const tutti = fileSulDisco(dir);
  const veloci = tutti.filter((f) => !/^[67]/.test(base(f)));
  const sei = tutti.filter((f) => /^6/.test(base(f)));
  const sette = tutti.filter((f) => /^7/.test(base(f)));
  const meta = Math.ceil(veloci.length / 2);
  const uscita = [];
  if (veloci.length > 0) {
    blocchi("veloce1", 8, veloci.slice(0, meta), uscita);
    blocchi("veloce2", 8, veloci.slice(meta), uscita);
  }
  if (sei.length > 0) blocchi("6x", 2, sei, uscita);
  if (sette.length > 0) blocchi("7x", 2, sette, uscita);
  return uscita;
}

function fetteDaFile(file) {
  const testo = fs.readFileSync(file, "utf8").replace(/\r/g, "");
  const uscita = [];
  for (const riga of testo.split("\n")) {
    if (!riga.trim()) continue;
    const pezzi = riga.split("\t");
    const nome = (pezzi[0] || "").trim();
    if (!nome) continue;
    const file2 = (pezzi[2] || "").trim().split(/\s+/).filter(Boolean);
    uscita.push({ nome: nome, file: file2 });
  }
  return uscita;
}

function righeDelLog(file) {
  let testo = "";
  try {
    testo = fs.readFileSync(file, "utf8");
  } catch (e) {
    return new Map();
  }
  const mappa = new Map();
  for (const riga of testo.replace(/\r/g, "").split("\n")) {
    const m = /^fetta (\S+): (.*)$/.exec(riga);
    if (m) mappa.set(m[1], m[2]);
  }
  return mappa;
}

function numero(riga, parola) {
  const m = new RegExp(parola + " (\\d+)").exec(riga);
  return m ? Number(m[1]) : null;
}

function main() {
  const opt = leggiArgomenti(process.argv.slice(2));
  const sulDisco = fileSulDisco(opt.dir);
  const fette = opt.fette ? fetteDaFile(opt.fette) : fetteDaDisco(opt.dir);

  if (fette.length === 0) {
    console.log("TOTALE FALLITO pass 0 fail 0 file 0/" + sulDisco.length + " . nessuna fetta calcolabile");
    return 1;
  }

  const discoPerNome = new Map(sulDisco.map((f) => [base(f), f]));
  const viste = righeDelLog(opt.log);
  const problemi = [];
  const coperti = [];
  const senzaRiga = [];
  const incoerenti = [];
  let P = 0;
  let F = 0;
  let NF = 0;

  for (const f of fette) {
    const riga = viste.get(f.nome);
    if (riga === undefined) {
      senzaRiga.push(f.nome);
      continue;
    }
    if (/MANCATA/.test(riga)) {
      incoerenti.push(f.nome);
      continue;
    }
    const p = numero(riga, "pass");
    const fa = numero(riga, "fail");
    const nf = numero(riga, "file");
    P += p === null ? 0 : p;
    F += fa === null ? 0 : fa;
    NF += nf === null ? 0 : nf;
    if (nf !== f.file.length) {
      incoerenti.push(f.nome + " (log file " + nf + ", attesi " + f.file.length + ")");
      continue;
    }
    for (const nome of f.file) coperti.push(nome);
  }

  // File elencati in fette.txt che sul disco non ci sono.
  const inventati = opt.fette
    ? fette.flatMap((f) => f.file).filter((p) => !discoPerNome.has(base(p)))
    : [];

  const copertiPerNome = new Set(coperti.map(base));
  const nonCoperti = sulDisco.filter((f) => !copertiPerNome.has(base(f)));
  const inPiu = coperti.filter((p) => !discoPerNome.has(base(p)));

  if (senzaRiga.length) problemi.push("fette senza riga nel log: " + senzaRiga.join(" "));
  if (incoerenti.length) problemi.push("fette fallite o non coerenti: " + incoerenti.join(" "));
  if (nonCoperti.length) problemi.push("file sul disco non coperti: " + nonCoperti.join(" "));
  if (inPiu.length) problemi.push("file citati nelle fette e non sul disco: " + inPiu.join(" "));
  if (inventati.length) problemi.push("file elencati in fette.txt che non esistono: " + inventati.join(" "));
  if (NF !== coperti.length) {
    problemi.push("la somma delle fette dice " + NF + " file, i nomi raccolti sono " + coperti.length);
  }

  const copertura = [...copertiPerNome].filter((n) => discoPerNome.has(n)).length;
  const ok = F === 0 && problemi.length === 0 && copertiPerNome.size === sulDisco.length;
  const testa = "pass " + P + " fail " + F + " file " + copertura + "/" + sulDisco.length;

  if (!ok) {
    console.log("TOTALE FALLITO " + testa);
    for (const p of problemi) console.log("  " + p);
    return 1;
  }
  console.log("TOTALE " + testa);
  return 0;
}

process.exit(main());
