/* comune/nuovo-programma-b.js — passo 35: da uno scheletro nasce un PROGRAMMA NUOVO.
 *
 * La regola che conta, detta da Alice: lo scheletro non finisce dentro il
 * programma che sta usando — ne nasce uno nuovo, in bozza, e quello attivo
 * resta com'è finché non decide lei di aprirlo. Qui si costruiscono solo
 * documenti NUOVI: nessuna funzione tocca un programma o una scheda che esiste
 * già (l'apertura passa da `editor.attivaProgramma`, che ha la sua voce di
 * registro e il suo Annulla).
 *
 * Forme dei documenti (le stesse che lettura-b.js sa leggere):
 *   programmi/program-v2-meta-<pid>   { programId, programMeta: {...} }
 *   schede/program-v2-sheet-<pid>__<sh> { programId, sheetId, kind: "sheet", sheet: {...} }
 * Le schede si scrivono PRIMA del programma: se una scrittura si ferma, in B
 * non resta un programma senza schede.
 */

import { copiaProgramma, copiaScheda } from "./scritture-b.js";
import { testoPulito } from "./scheletri.js";

export const SETTIMANE_NUOVO_PROGRAMMA = 8;

function due(x) {
  return String(x).padStart(2, "0");
}

function dataIso(quando) {
  return quando.getFullYear() + "-" + due(quando.getMonth() + 1) + "-" + due(quando.getDate());
}

function dataInChiaro(quando) {
  return due(quando.getDate()) + "/" + due(quando.getMonth() + 1) + "/" + quando.getFullYear();
}

/* Un nome c'è sempre: se non l'ha scritto, il programma si chiama col giorno. */
export function nomeProgrammaNuovo(nome, quando) {
  const n = testoPulito(nome);
  if (n) return n;
  const d = quando instanceof Date && !isNaN(quando.getTime()) ? quando : new Date();
  return "Programma del " + dataInChiaro(d);
}

function lettera(i) {
  return String.fromCharCode(65 + (i % 26));
}

function esercizioDaRiga(r, i, sigla, quando, settimane) {
  const serie = r && r.serie != null && Number.isFinite(Number(r.serie)) ? Number(r.serie) : null;
  const weeks = Array.from({ length: settimane }, (_, k) => ({
    week: k + 1,
    sets: serie,
    reps: "",
    rest: { seconds: 120 },
    type: "normal",
    note: "",
    source: "scheletro"
  }));
  return {
    id: "sk-" + sigla + "-" + (i + 1) + "-" + quando.getTime().toString(36),
    name: testoPulito(r && r.nome),
    muscle: testoPulito(r && r.distretto),
    nota: "",
    prescription: { sets: serie, rest: { seconds: 120 } },
    progression: { weeks: weeks }
  };
}

/* Lo scheletro (con le sue schede A/B/C, oppure l'elenco piatto) diventa il
 * piano di un programma nuovo: metadati + documenti delle schede. */
export function programmaDaScheletro(scheletro, opzioni) {
  const o = opzioni || {};
  const quando = o.quando instanceof Date && !isNaN(o.quando.getTime()) ? o.quando : new Date();
  const settimane = Number(o.settimane) > 0 ? Math.round(Number(o.settimane)) : SETTIMANE_NUOVO_PROGRAMMA;
  const sk = scheletro || {};
  const piatto = Array.isArray(sk.esercizi) ? sk.esercizi.filter((r) => r && testoPulito(r.nome)) : [];
  const gruppi = Array.isArray(sk.schede)
    ? sk.schede.filter((s) => s && Array.isArray(s.esercizi) && s.esercizi.some((r) => r && testoPulito(r.nome)))
    : [];
  if (!piatto.length && !gruppi.length) {
    return { ok: false, motivo: "lo scheletro non ha esercizi: un programma vuoto non serve" };
  }

  const pid = testoPulito(o.id) || ("prg-" + quando.getTime().toString(36));
  const iso = quando.toISOString();
  const nome = nomeProgrammaNuovo(o.nome || sk.nome, quando);
  const fogli = gruppi.length ? gruppi : [{ lettera: "A", gruppo: "", esercizi: piatto }];
  const schede = [];
  const rotazione = [];
  fogli.forEach((f, i) => {
    const sigla = lettera(i);
    const sid = "sh-" + sigla;
    rotazione.push(sigla);
    const esercizi = (Array.isArray(f.esercizi) ? f.esercizi : [])
      .filter((r) => r && testoPulito(r.nome))
      .map((r, k) => esercizioDaRiga({ nome: r.nome, distretto: r.distretto, serie: r.serie }, k, sigla, quando, settimane));
    schede.push({
      id: "program-v2-sheet-" + pid + "__" + sid,
      dati: {
        programId: pid,
        sheetId: sid,
        kind: "sheet",
        versione: 1,
        sheet: {
          id: sid,
          code: sigla,
          name: testoPulito(f.gruppo) || ("Scheda " + sigla),
          updatedAt: iso,
          exercises: esercizi
        }
      }
    });
  });

  const meta = {
    id: pid,
    name: nome,
    status: "draft",
    active: false,
    phase: "",
    startDate: dataIso(quando),
    durationWeeks: settimane,
    daysPerWeek: schede.length,
    rotation: rotazione,
    description: testoPulito(o.descrizione || sk.notaScheda),
    message: "",
    createdAt: iso,
    updatedAt: iso
  };
  return {
    ok: true,
    nome: nome,
    id: pid,
    meta: meta,
    programmi: [{ id: "program-v2-meta-" + pid, dati: { programId: pid, programMeta: meta } }],
    schede: schede,
    esercizi: schede.reduce((t, s) => t + s.dati.sheet.exercises.length, 0)
  };
}

/* La scrittura: solo documenti nuovi, schede prima e programma dopo. Se una
 * scrittura si ferma, si dice quante sono passate e che il programma non c'è. */
export async function scriviProgrammaNuovo(db, uid, piano) {
  const p = piano || {};
  if (!p.ok) return { ok: false, motivo: p.motivo || "piano non valido" };
  let scritte = 0;
  for (let i = 0; i < p.schede.length; i += 1) {
    const s = p.schede[i];
    try {
      await copiaScheda(db, uid, s.id, s.dati);
      scritte += 1;
    } catch (e) {
      return {
        ok: false,
        scritte: scritte,
        motivo: "scheda " + s.dati.sheet.code + " non scritta: " + ((e && e.message) || "errore")
          + " · il programma non è stato creato"
      };
    }
  }
  for (let i = 0; i < p.programmi.length; i += 1) {
    const d = p.programmi[i];
    try {
      await copiaProgramma(db, uid, d.id, d.dati);
      scritte += 1;
    } catch (e) {
      return {
        ok: false,
        scritte: scritte,
        motivo: "programma non scritto: " + ((e && e.message) || "errore")
          + " · restano " + p.schede.length + (p.schede.length === 1 ? " scheda scritta" : " schede scritte") + " senza programma"
      };
    }
  }
  return { ok: true, id: p.id, nome: p.nome, schede: p.schede.length, esercizi: p.esercizi, scritte: scritte };
}

/* La frase della conferma: dice cosa nasce e cosa NON viene toccato. */
export function fraseNuovoProgramma(piano, nomeAttivo) {
  const p = piano || {};
  const attivo = testoPulito(nomeAttivo);
  /* Accetta sia il piano (con l'elenco delle schede) sia i soli numeri. */
  const schede = Array.isArray(p.schede) ? p.schede.length : (Number(p.schede) || 0);
  const esercizi = Array.isArray(p.esercizi) ? p.esercizi.length : (Number(p.esercizi) || 0);
  return "Nasce un programma nuovo, «" + testoPulito(p.nome) + "»: " + schede
    + (schede === 1 ? " scheda" : " schede") + ", " + esercizi + (esercizi === 1 ? " esercizio" : " esercizi")
    + ", in bozza. " + (attivo ? "«" + attivo + "» non viene toccato." : "Il programma che stai usando non viene toccato.");
}
