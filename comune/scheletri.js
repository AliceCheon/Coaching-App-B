/* comune/scheletri.js — B.21 commit 2: «Salva come scheletro».
 *
 * Uno scheletro e' la STRUTTURA di una scheda, sola: nome, data, e per ogni
 * esercizio nome, distretto, serie, ripetizioni, nota, righe tecniche figlie
 * e legami di superserie. Non porta carichi, non porta dati del Logbook, non
 * porta le settimane con i kg e non porta la lettera della scheda (A/B/C...):
 * si applica a qualunque scheda.
 *
 * La difesa non e' una pulizia dopo: e' una lista CHIUSA. La riga si costruisce
 * chiave per chiave qui dentro, quindi un carico non ha nessuna strada per
 * uscire, nemmeno se un giorno il documento di A cambia forma.
 */
import { salvaScheletroConVersione } from "./scritture-b.js";

export function testoPulito(valore) {
  return typeof valore === "string" ? valore.trim() : "";
}

function numeroOppure(valore, vuoto) {
  const n = Number(valore);
  return Number.isFinite(n) ? n : vuoto;
}

/* Il nome proposto: «Scheletro dalla scheda A · 16/11/2026» */
export function nomeProposto(codice, oggi) {
  const d = oggi instanceof Date && !isNaN(oggi.getTime()) ? oggi : new Date();
  const g = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const c = testoPulito(codice);
  return "Scheletro dalla scheda" + (c ? " " + c : "") + " \u00b7 " + g + "/" + m + "/" + d.getFullYear();
}

/* Le settimane servono solo a LEGGERE serie e ripetizioni: non escono mai.
 * Per questo i kg delle settimane non hanno nessuna strada per uscire. */
function settimaneDi(ex) {
  const prog = ex && ex.progression;
  if (!prog || !Array.isArray(prog.weeks) || !prog.weeks.length) return [];
  return prog.weeks;
}

function serieDi(ex) {
  const w = settimaneDi(ex)[0];
  const s = w && w.sets != null ? w.sets : (ex && ex.prescription ? ex.prescription.sets : null);
  return numeroOppure(s, null);
}

function ripetizioniDi(ex) {
  const w = settimaneDi(ex)[0];
  const r = w && w.reps ? w.reps : (ex && ex.prescription ? ex.prescription.reps : null);
  if (r == null) return "";
  if (typeof r === "string") return testoPulito(r);
  if (Array.isArray(r)) return r.map((x) => testoPulito(x)).filter(Boolean).join("-");
  return testoPulito(r.label || r.testo || r.text || "");
}

function vive(elenco) {
  return elenco.filter((r) => r && !r.deletedAt);
}

function eTecnica(riga) {
  return Boolean(riga) && (riga.tipo === "tecnica" || Boolean(riga.padreId) || Boolean(riga.padre));
}

/* Le figlie tecniche: sia quelle annidate dentro l'esercizio, sia quelle che
 * vivono come RIGHE sorelle con il padreId (la forma vera delle schede). */
function figlieDi(ex, elenco) {
  const dentro = ex && (ex.tecniche || ex.tecnica || ex.children);
  const annidate = Array.isArray(dentro) ? dentro : [];
  const id = textoId(ex);
  const sorelle = id ? elenco.filter((r) => eTecnica(r) && String(r.padreId || r.padre || "") === id) : [];
  const tutte = annidate.concat(sorelle);
  return tutte.map((f) => {
    const o = f || {};
    return {
      tecnica: testoPulito(o.nome || o.name || o.tecnica || o.tipo || ""),
      serie: numeroOppure(o.serie != null ? o.serie : (settimaneDi(o)[0] || {}).sets, null)
    };
  }).filter((f) => f.tecnica || f.serie != null);
}

function textoId(riga) {
  const o = riga || {};
  const id = o.id != null ? o.id : (o.exerciseId != null ? o.exerciseId : null);
  return id == null ? "" : String(id);
}

/* LA lista chiusa. Se una chiave non e' scritta qui, non esiste. */
function rigaDaEsercizio(ex, elenco) {
  const o = ex || {};
  return {
    nome: testoPulito(o.nome || o.name),
    distretto: testoPulito(o.distretto || o.muscolo || o.muscle || o.gruppo),
    serie: serieDi(o),
    ripetizioni: ripetizioniDi(o),
    nota: testoPulito(o.nota),
    tecniche: figlieDi(o, elenco),
    superserie: testoPulito(o.sup || o.superserie || o.superset || "")
  };
}

export function scheletroDaScheda(schedaDati, opzioni) {
  const o = opzioni || {};
  const scheda = (schedaDati && schedaDati.sheet) || schedaDati || {};
  const elenco = vive(Array.isArray(scheda.exercises) ? scheda.exercises : []);
  const quando = o.quando instanceof Date && !isNaN(o.quando.getTime()) ? o.quando : new Date();
  const nome = testoPulito(o.nome) || nomeProposto("", quando);
  return {
    tipo: "scheletro",
    nome: nome,
    nomeScheda: testoPulito(scheda.name),
    notaScheda: testoPulito(scheda.nota || scheda.description),
    creatoIl: quando.toISOString(),
    esercizi: elenco.filter((r) => !eTecnica(r)).map((r) => rigaDaEsercizio(r, elenco)).filter((r) => r.nome)
  };
}

export function messaggioSalvato(nome) {
  return "Scheletro \u00ab" + testoPulito(nome) + "\u00bb salvato";
}

/* Mai «salvato» quando la scrittura non e' passata: il motivo si dice. */
export function messaggioNonSalvato(motivo) {
  return "Scheletro non salvato: " + (testoPulito(motivo) || "motivo non dichiarato");
}

function idScheletro(quando, seme) {
  const d = quando instanceof Date && !isNaN(quando.getTime()) ? quando : new Date();
  const coda = seme == null ? Math.floor(Math.random() * 1e9).toString(36) : String(seme);
  return "sk-" + d.getTime().toString(36) + "-" + coda;
}

/* La strada del salvataggio: costruisce, scrive, e se la scrittura fallisce
 * torna un motivo da leggere — non un successo. */
export async function salvaScheletroDaScheda(schedaDati, richiesta, contesto) {
  const r = richiesta || {};
  const c = contesto || {};
  const quando = c.quando instanceof Date ? c.quando : new Date();
  const documento = scheletroDaScheda(schedaDati, { nome: r.nome, quando: quando });
  if (!documento.esercizi.length) {
    const motivo = "la scheda non ha esercizi da salvare";
    return { ok: false, motivo: motivo, messaggio: messaggioNonSalvato(motivo) };
  }
  const id = r.id || idScheletro(quando, r.seme);
  try {
    const scritto = await salvaScheletroConVersione(c.db, c.uid, id, documento);
    return { ok: true, id: String(id), nome: documento.nome, versione: scritto.versione, messaggio: messaggioSalvato(documento.nome) };
  } catch (e) {
    const motivo = e && e.message ? e.message : "scrittura rifiutata";
    return { ok: false, motivo: motivo, messaggio: messaggioNonSalvato(motivo) };
  }
}

/* ---------- extra-3: la pagina Scheletri (elenco, Applica, Elimina) ------ */

export function dataInChiaro(iso) {
  const t = testoPulito(iso);
  if (!t) return "";
  const d = new Date(t);
  if (isNaN(d.getTime())) return t;
  const g = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return g + "/" + m + "/" + d.getFullYear();
}

export function elencoScheletri(documenti) {
  const fuori = (Array.isArray(documenti) ? documenti : [])
    .filter((d) => d && d.dati && (!d.dati.tipo || d.dati.tipo === "scheletro"))
    .map((d) => {
      const dati = d.dati || {};
      const esercizi = Array.isArray(dati.esercizi) ? dati.esercizi : [];
      return {
        id: String(d.id == null ? "" : d.id),
        nome: testoPulito(dati.nome) || "(senza nome)",
        creatoIl: testoPulito(dati.creatoIl),
        data: dataInChiaro(dati.creatoIl),
        esercizi: esercizi.length
      };
    })
    .filter((s) => s.id);
  fuori.sort((a, b) => String(b.creatoIl).localeCompare(String(a.creatoIl)));
  return fuori;
}

export function fraseApplica(nome, quanti, codice, sostituite) {
  return "Applichi lo scheletro \u00ab" + testoPulito(nome) + "\u00bb (" + quanti + (quanti === 1 ? " esercizio" : " esercizi")
    + ") alla scheda " + testoPulito(codice) + ": sostituisce " + sostituite + (sostituite === 1 ? " riga" : " righe") + ", senza carichi.";
}

export function fraseElimina(nome, quanti) {
  return "Elimini lo scheletro \u00ab" + testoPulito(nome) + "\u00bb (" + quanti + (quanti === 1 ? " esercizio" : " esercizi")
    + ")? Dalla raccolta sparisce: la scheda non si tocca.";
}

export function messaggioApplicato(nome, codice) {
  return "Scheletro \u00ab" + testoPulito(nome) + "\u00bb applicato alla scheda " + testoPulito(codice) + ": righe senza carichi";
}

export function messaggioNonApplicato(motivo) {
  return "Scheletro non applicato: " + (testoPulito(motivo) || "motivo non dichiarato");
}

export function messaggioEliminato(nome) {
  return "Scheletro \u00ab" + testoPulito(nome) + "\u00bb eliminato";
}

export function messaggioNonEliminato(motivo) {
  return "Scheletro non eliminato: " + (testoPulito(motivo) || "motivo non dichiarato");
}

/* Quante settimane ha la scheda: le righe nuove si portano dietro lo stesso
 * numero, cosi' la tabella non cambia larghezza sotto le dita. */
function settimaneDellaScheda(scheda) {
  const ex = (Array.isArray(scheda.exercises) ? scheda.exercises : [])
    .filter((r) => r && !r.deletedAt && !eTecnica(r));
  let quante = 0;
  ex.forEach((r) => { const n = settimaneDi(r).length; if (n > quante) quante = n; });
  return quante || 8;
}

/* La scheda nuova: struttura dallo scheletro, ZERO carichi. Ogni settimana
 * nasce con serie e ripetizioni e nient'altro: il kg non ha nessuna strada
 * per entrare, perche' non e' scritto in nessuna chiave qui sotto. */
export function applicaScheda(schedaDati, scheletro, opzioni) {
  const o = opzioni || {};
  const scheda = Object.assign({}, (schedaDati && schedaDati.sheet) || schedaDati || {});
  const prima = (Array.isArray(scheda.exercises) ? scheda.exercises : []).filter((r) => r && !r.deletedAt);
  const sostituite = prima.filter((r) => !eTecnica(r)).length;
  const quante = settimaneDellaScheda(scheda);
  const righe = Array.isArray(scheletro && scheletro.esercizi) ? scheletro.esercizi : [];
  const quando = testoPulito(o.quando);
  const coda = quando ? quando.replace(/[^0-9]/g, "").slice(-6) : "000000";
  const nuove = [];
  righe.forEach((r, i) => {
    const idEx = "sk-" + (i + 1) + "-" + coda;
    const weeks = Array.from({ length: quante }, (_, k) => ({
      week: k + 1,
      sets: r.serie == null ? null : numeroOppure(r.serie, null),
      reps: testoPulito(r.ripetizioni),
      type: "normal",
      note: "",
      source: "scheletro"
    }));
    const ex = {
      id: idEx,
      name: testoPulito(r.nome),
      muscle: testoPulito(r.distretto),
      nota: testoPulito(r.nota),
      prescription: {},
      progression: { weeks: weeks }
    };
    if (testoPulito(r.superserie)) ex.sup = testoPulito(r.superserie);
    nuove.push(ex);
    (Array.isArray(r.tecniche) ? r.tecniche : []).forEach((t, k) => {
      nuove.push({ id: idEx + "-t" + (k + 1), name: testoPulito(t.tecnica), tipo: "tecnica", padreId: idEx, serie: t.serie == null ? null : t.serie });
    });
  });
  scheda.exercises = nuove;
  delete scheda.pianoScarico;
  if (quando) scheda.updatedAt = quando;
  return { sheet: scheda, sostituite: sostituite, aggiunte: righe.length, righe: nuove.length };
}
