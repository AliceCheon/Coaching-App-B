/* comune/igiene-scheda.js — B.21 · l'igiene della scheda.
 *
 * Tre comandi distruttivi: svuota la scheda, svuota tutto il programma,
 * riporta la scheda com'era all'apertura della pagina. Ognuno produce UNA voce
 * di registro con l'elenco INTERO di prima: un solo Annulla rimette tutto —
 * esercizi, righe figlie della tecnica, superserie e le otto settimane (che
 * stanno dentro le righe, non in una tavola a parte).
 *
 * Regole che non si negoziano:
 *  - il Logbook non si tocca: le sedute portano i nomi dentro di se' e non
 *    puntano a queste righe, quindi qui non si scrive mai su `sedute`;
 *  - si scrive solo il documento della scheda, dentro la zona B;
 *  - la fotografia di APERTURA non si rinfresca: la pagina rilegge il
 *    documento dopo ogni scrittura (app-v31.js: sincronizza), quindi una
 *    fotografia aggiornata coinciderebbe sempre con lo stato attuale e
 *    «Ripristina scheda» non farebbe mai niente.
 */
import { foglioDi, chiaveEsercizi, chiudiDocumento, versioneDi, idVoceRegistro, codiceScheda } from "./modifiche-b.js";

function testo(v) { return v == null ? "" : String(v).trim(); }
function vivo(e) { return Boolean(e) && typeof e === "object" && !e.deletedAt; }
function figlia(e) {
  return vivo(e) && (e.tipo === "tecnica" || (e.padreId != null && String(e.padreId) !== ""));
}

/* L'impronta di un elenco: serve a dire «è già com'era» senza guardare
 * l'ordine delle chiavi, che Firestore non garantisce. */
function canonico(v) {
  if (Array.isArray(v)) return v.map(canonico);
  if (v && typeof v === "object") {
    const o = {};
    Object.keys(v).sort().forEach((k) => { o[k] = canonico(v[k]); });
    return o;
  }
  return v;
}
export function improntaElenco(elenco) {
  return JSON.stringify(canonico(Array.isArray(elenco) ? elenco : []));
}

function elencoDi(dati) {
  const f = foglioDi(dati);
  if (!f) return null;
  const chiave = chiaveEsercizi(f);
  if (!chiave) return null;
  return { foglio: f, chiave: chiave, elenco: f[chiave] };
}

/* I conti che si leggono nella conferma: esercizi vivi, righe della tecnica
 * (che sono righe figlie, non esercizi) e righe vive in tutto. */
export function contaElenco(elenco) {
  const vivi = (Array.isArray(elenco) ? elenco : []).filter(vivo);
  const tecniche = vivi.filter(figlia).length;
  return { esercizi: vivi.length - tecniche, tecniche: tecniche, righe: vivi.length };
}

/* Quante righe sono diverse fra lo stato attuale e la fotografia: righe
 * aggiunte, tolte o cambiate. È questo il numero che Alice legge in
 * «Perdi N modifiche». */
function perId(elenco) {
  const m = Object.create(null);
  (Array.isArray(elenco) ? elenco : []).forEach((e, i) => {
    if (!e || typeof e !== "object") return;
    const id = testo(e.id) || ("pos-" + String(i));
    m[id] = JSON.stringify(canonico(e));
  });
  return m;
}
export function contaDifferenze(attuale, foto) {
  const a = perId(attuale);
  const b = perId(foto);
  const id = Object.keys(a).concat(Object.keys(b));
  const visti = Object.create(null);
  let n = 0;
  id.forEach((k) => {
    if (visti[k]) return;
    visti[k] = true;
    if (a[k] !== b[k]) n += 1;
  });
  return n;
}

/* Un conto per una scheda, con la fotografia di apertura se c'e'. */
export function contaScheda(dati, apertura) {
  const e = elencoDi(dati);
  const codice = codiceScheda(dati);
  if (!e) return { codice: codice, esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 };
  const c = contaElenco(e.elenco);
  const foto = apertura && Array.isArray(apertura.elenco) ? apertura.elenco : null;
  c.codice = codice;
  c.modifiche = foto ? contaDifferenze(e.elenco, foto) : 0;
  return c;
}

/* --- Svuota la scheda ---------------------------------------------------- */
export function svuotaScheda(dati, richiesta, opzioni) {
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const e = elencoDi(dati);
  if (!e) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const conta = contaElenco(e.elenco);
  if (!conta.righe) return { ok: false, motivo: "scheda già vuota: non ho scritto niente" };
  const nuovoElenco = e.elenco.map((x) => (vivo(x) ? Object.assign({}, x, { deletedAt: quando }) : x));
  const nuovo = chiudiDocumento(dati, e.foglio, e.chiave, nuovoElenco, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "svuota-scheda",
    origine: "modifica-fatta-in-B",
    scheda: codiceScheda(dati),
    codice: codiceScheda(nuovo),
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "scheda",
    conto: conta,
    prima: e.elenco,
    dopo: null,
    dopoTesto: "scheda svuotata",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, conto: conta };
}

/* --- Ripristina la scheda com'era all'apertura --------------------------- */
/* `richiesta.fotografia` è l'elenco preso alla PRIMA lettura della sessione.
 * Senza fotografia non si inventa niente: si dice e basta. */
export function ripristinaScheda(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const e = elencoDi(dati);
  if (!e) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const foto = Array.isArray(r.fotografia) ? r.fotografia : null;
  if (!foto) return { ok: false, motivo: "non ho la fotografia di apertura di questa scheda: non ho scritto niente" };
  if (improntaElenco(e.elenco) === improntaElenco(foto)) {
    return { ok: false, motivo: "scheda già com'era all'apertura: non ho scritto niente" };
  }
  const modifiche = contaDifferenze(e.elenco, foto);
  const nuovo = chiudiDocumento(dati, e.foglio, e.chiave, foto, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "ripristina-scheda",
    origine: "modifica-fatta-in-B",
    scheda: codiceScheda(dati),
    codice: codiceScheda(nuovo),
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "scheda",
    conto: { modifiche: modifiche },
    prima: e.elenco,
    dopo: null,
    dopoTesto: "scheda com'era all'apertura",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, conto: { modifiche: modifiche } };
}

/* --- Svuota tutto il programma ------------------------------------------- */
/* Una voce sola per tutte le schede: dentro la voce, per ogni scheda, l'elenco
 * di prima. L'annullamento rimette ognuna al suo posto (editor-schede-b.js).
 * documenti: [{ id, dati }] letti adesso dal disco. */
export function svuotaProgramma(documenti, richiesta, opzioni) {
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const elencoDoc = Array.isArray(documenti) ? documenti : [];
  const toccate = [];
  elencoDoc.forEach((d) => {
    const dati = d && d.dati ? d.dati : null;
    const e = elencoDi(dati);
    if (!e) return;
    const conta = contaElenco(e.elenco);
    if (!conta.righe) return;
    const nuovoElenco = e.elenco.map((x) => (vivo(x) ? Object.assign({}, x, { deletedAt: quando }) : x));
    toccate.push({
      documento: String((d && d.id) || ""),
      scheda: codiceScheda(dati),
      prima: e.elenco,
      dati: chiudiDocumento(dati, e.foglio, e.chiave, nuovoElenco, quando, o.uid, "riga"),
      versionePrima: versioneDi(dati),
      conto: conta
    });
  });
  if (!toccate.length) return { ok: false, motivo: "il programma è già vuoto: non ho scritto niente" };
  let esercizi = 0;
  let tecniche = 0;
  toccate.forEach((t) => { esercizi += t.conto.esercizi; tecniche += t.conto.tecniche; });
  const quanto = { schede: toccate.length, esercizi: esercizi, tecniche: tecniche };
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "svuota-programma",
    origine: "modifica-fatta-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "programma",
    quanto: quanto,
    schede: toccate.map((t) => ({ documento: t.documento, scheda: t.scheda, prima: t.prima })),
    prima: null,
    dopo: null,
    dopoTesto: "programma svuotato",
    versionePrima: 0,
    versioneDopo: 0
  };
  return { ok: true, schede: toccate, voce: voce, quanto: quanto };
}
