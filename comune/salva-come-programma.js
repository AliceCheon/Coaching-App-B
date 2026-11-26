/* comune/salva-come-programma.js — PASSO 42: «Salva come nuovo programma».
 *
 * Alice: da un programma consultato (archiviato o no) deve nascere un programma
 * NUOVO in bozza, con le stesse schede, gli stessi esercizi, le stesse serie e
 * gli stessi recuperi — senza toccare niente che esista già.
 *
 * La strada è quella di comune/nuovo-programma-b.js: si costruiscono SOLO
 * documenti nuovi e si scrivono le schede PRIMA del programma, così in B non
 * resta un programma senza schede. Le scritture passano tutte da
 * comune/scritture-b.js (`copiaScheda`, `copiaProgramma`): qui non c'è nessun
 * altro modo di parlare con la zona B.
 *
 * Le schede si copiano dal documento VERO (dati.sheet): si clona il foglio
 * intero e si cambiano solo gli id, così note, tecniche, superserie e campi che
 * questa pagina non legge viaggiano con la copia invece di perdersi.
 */

import { copiaProgramma, copiaScheda } from "./scritture-b.js";
import { decodificaId } from "./schede-v2.js";
import { profiloProgramma } from "./programma.js";

export const SETTIMANE_COPIA = 8;

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* Copia strutturale: oggetti e array nuovi, il resto (date, riferimenti) resta
 * quello che è. JSON.parse(JSON.stringify()) no: butterebbe via i tipi veri. */
function clona(valore) {
  if (Array.isArray(valore)) return valore.map(clona);
  if (valore && typeof valore === "object" && Object.getPrototypeOf(valore) === Object.prototype) {
    const out = {};
    Object.keys(valore).forEach((k) => { out[k] = clona(valore[k]); });
    return out;
  }
  return valore;
}

/* Le schede grezze di un programma, nell'ordine dei documenti letti da B:
 * {id, dati:{programId, sheetId, kind, sheet}}. Le archiviate restano fuori. */
export function documentiDelProgramma(documenti, programId) {
  const id = testo(programId);
  if (!id) return [];
  /* Lo stesso id può arrivare in tre forme: nudo (`prg-x`), col prefisso del
   * documento (`program-v2-meta-prg-x`) o già dentro l'id del documento. Le
   * accettiamo tutte e tre, come fa schedePerProgramma: cercare solo la prima
   * lasciava la copia senza schede e senza un motivo vero. */
  const nudo = id.indexOf("program-v2-meta-") === 0 ? id.slice("program-v2-meta-".length) : id;
  const forme = [id, nudo, "program-v2-meta-" + nudo];
  return (Array.isArray(documenti) ? documenti : []).filter((d) => {
    const dati = (d && d.dati) || {};
    const dec = decodificaId(testo(d && d.id));
    const suo = testo(dati.programId) || (dec ? testo(dec.programId) : "");
    if (forme.indexOf(suo) === -1) return false;
    if (dati.kind === "archived") return false;
    if (testo(d && d.id).indexOf("program-v2-archived-") === 0) return false;
    return Boolean(dati.sheet && typeof dati.sheet === "object");
  }).sort((a, b) => testo(a.id).localeCompare(testo(b.id)));
}

/* Il nome proposto: «<nome> · copia». Non si tocca il nome originale. */
export function nomeCopia(nome) {
  const n = testo(nome);
  return n ? n + " · copia" : "Copia di un programma";
}

function due(x) {
  return String(x).padStart(2, "0");
}

function dataIso(quando) {
  return quando.getFullYear() + "-" + due(quando.getMonth() + 1) + "-" + due(quando.getDate());
}

function idNuovo(quando, casuale) {
  const coda = testo(casuale) || Math.random().toString(36).slice(2, 6);
  return "prg-" + quando.getTime().toString(36) + "-" + coda;
}

/* Gli esercizi di un foglio copiato: stessi campi, id nuovi, e i legami
 * padreId/parentId rimessi sugli id nuovi (le righe tecniche non si staccano
 * dal loro esercizio). */
function eserciziCopiati(elenco, pid, codice) {
  const originali = Array.isArray(elenco) ? elenco : [];
  const mappa = Object.create(null);
  const nuovi = originali.map((e, i) => {
    const copia = clona(e) || {};
    const vecchioId = testo(e && e.id);
    const nuovo = "ex-" + pid + "-" + codice + "-" + (i + 1);
    if (vecchioId) mappa[vecchioId] = nuovo;
    copia.id = nuovo;
    return copia;
  });
  nuovi.forEach((e) => {
    ["padreId", "parentId"].forEach((campo) => {
      const vecchio = testo(e[campo]);
      if (vecchio && mappa[vecchio]) e[campo] = mappa[vecchio];
    });
  });
  return nuovi;
}

/* Il piano della copia: metadati + documenti delle schede. Nessuna scrittura
 * qui dentro — scrive `scriviProgrammaCopiato`.
 * `programma` è il documento del programma (il programMeta letto da B),
 * `documentiSchede` sono i documenti grezzi delle schede letti da B. */
export function pianoCopiaProgramma(programma, documentiSchede, opzioni) {
  const o = opzioni || {};
  const profilo = profiloProgramma(programma);
  const quando = o.quando instanceof Date && !Number.isNaN(o.quando.getTime()) ? o.quando : new Date();
  const conSchede = documentiDelProgramma(documentiSchede, profilo.id);
  if (!conSchede.length) {
    return {
      ok: false,
      motivo: "questo programma non ha schede leggibili in B: non c'è niente da copiare e non ho scritto niente"
    };
  }
  const pid = testo(o.id) || idNuovo(quando, o.casuale);
  const iso = quando.toISOString();
  const nome = testo(o.nome) || nomeCopia(profilo.nome);
  const schede = [];
  const rotazione = [];
  conSchede.forEach((doc) => {
    const foglio = clona(doc.dati.sheet) || {};
    const dati = (doc && doc.dati) || {};
    const codice = testo(foglio.code) || testo(dati.sheetId) || "A";
    const sid = testo(foglio.id) || testo(dati.sheetId) || ("sh-" + codice);
    foglio.id = sid;
    foglio.code = codice;
    foglio.updatedAt = iso;
    const chiave = Array.isArray(foglio.exercises) ? "exercises" : (Array.isArray(foglio.esercizi) ? "esercizi" : "exercises");
    foglio[chiave] = eserciziCopiati(foglio[chiave], pid, codice);
    if (rotazione.indexOf(codice) === -1) rotazione.push(codice);
    schede.push({
      id: "program-v2-sheet-" + pid + "__" + sid,
      dati: { programId: pid, sheetId: sid, kind: "sheet", versione: 1, sheet: foglio }
    });
  });
  const durata = profilo.durata == null ? SETTIMANE_COPIA : profilo.durata;
  const meta = {
    id: pid,
    name: nome,
    status: "draft",
    active: false,
    phase: profilo.fase || "",
    startDate: dataIso(quando),
    durationWeeks: durata,
    daysPerWeek: schede.length,
    rotation: rotazione,
    description: profilo.descrizione || "",
    message: "",
    createdAt: iso,
    updatedAt: iso,
    copiatoDa: profilo.nome,
    copiatoDaId: profilo.id,
    copiatoIl: iso
  };
  const esercizi = schede.reduce((a, s) => a + ((s.dati.sheet.exercises || s.dati.sheet.esercizi || []).length), 0);
  return {
    ok: true,
    id: pid,
    nome: nome,
    schede: schede,
    esercizi: esercizi,
    origine: profilo.nome,
    programmi: [{ id: "program-v2-meta-" + pid, dati: { programId: pid, programMeta: meta } }]
  };
}

/* La scrittura: solo documenti nuovi, schede prima e programma dopo. Se una
 * scrittura si ferma, si dice quante sono passate e che il programma non c'è. */
export async function scriviProgrammaCopiato(db, uid, piano) {
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
        motivo: "scheda " + ((s.dati.sheet && s.dati.sheet.code) || "?") + " non scritta: "
          + ((e && e.message) || "errore") + " · il programma non è stato creato"
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

/* L'esito in una frase: cosa nasce e cosa NON viene toccato. */
export function fraseCopia(piano, nomeInUso) {
  const p = piano || {};
  const schede = Array.isArray(p.schede) ? p.schede.length : (Number(p.schede) || 0);
  const esercizi = Number(p.esercizi) || 0;
  const attivo = testo(nomeInUso);
  const da = testo(p.origine);
  return "Nasce «" + testo(p.nome) + "», in bozza: " + schede + (schede === 1 ? " scheda" : " schede")
    + ", " + esercizi + (esercizi === 1 ? " esercizio" : " esercizi")
    + (da ? ", copiati da «" + da + "»" : "") + ". "
    + (attivo ? "«" + attivo + "» non viene toccato." : "Il programma che stai usando non viene toccato.")
    + " Lo trovi in «Cambia» con il suo nome.";
}
