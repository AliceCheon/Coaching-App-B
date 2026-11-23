/* Barbell Diva B — PASSO 14 (versione semplice): «Patologie o infortuni».
 *
 * Una cosa sola, fatta come su un foglio: l'atleta scrive a parole cosa le fa
 * male, e quelle parole si salvano. Il documento e' uno per atleta,
 * `bdB_atleti/{uid}/anamnesi-lite`:
 *
 *   { testo: "...", aggiornato: ISO, versione: n }
 *
 * Qui non si scrive niente: funzioni PURE. La scrittura passa da
 * comune/scritture-b.js (scriviAnamnesiLite), il registro da
 * scriviVoceRegistro. Ogni salvataggio = UNA voce con `prima` e `dopo` (il
 * testo, non un elenco): l'Annulla rimette il testo di prima in un colpo solo.
 *
 * Il ponte con la carta Stress e il RED-S: dal testo si ricavano le otto
 * articolazioni con una TABELLA DI PAROLE. Non e' un indovino: quello che la
 * tabella non conosce resta dichiarato come «frase non riconosciuta», cosi' si
 * vede cosa l'app non ha capito invece di far finta di niente.
 *
 * Regole del filone: niente Map, niente Set, nessun numero inventato, e se il
 * campo e' vuoto si dice «non dichiarato» (mai uno zero al posto di un dato).
 */

import { TOLLERANZE } from "./tolleranze-b.js";

/* Le otto articolazioni: le stesse delle tolleranze, un elenco solo. */
export const ARTICOLAZIONI = Object.freeze(Object.keys(TOLLERANZE));

export const NON_DICHIARATO = "non dichiarato";

/* La tabella delle parole. Una voce per articolazione; l'ultima ha
 * `articolazione: ""` perche' la parola e' nota ma l'articolazione non e' nel
 * modello: il collo si riconosce, e si dice che non si conta. */
const TABELLA = Object.freeze([
  { articolazione: "colonna lombare", parole: ["lombare", "lombari", "lombalgia", "lombalgie", "lombaralgia", "lombosciatalgia", "schiena", "basso schiena", "zona lombare", "rachide lombare"] },
  { articolazione: "ginocchio", parole: ["ginocchio", "ginocchia", "ginocchietto"] },
  { articolazione: "spalla", parole: ["spalla", "spalle"] },
  { articolazione: "gomito", parole: ["gomito", "gomiti", "epicondilite", "epitrocleite"] },
  { articolazione: "anca", parole: ["anca", "anche", "coxalgia"] },
  { articolazione: "caviglia", parole: ["caviglia", "caviglie"] },
  { articolazione: "polso", parole: ["polso", "polsi", "tunnel carpale"] },
  { articolazione: "", parole: ["collo", "cervicale", "cervicali", "rachide cervicale"] }
]);

const MASSIMO_TESTO = 4000;

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* Minuscole, senza accenti, apostrofi diventati spazi: cosi' «all'anca» e
 * «all anca» sono la stessa cosa e «caviglia» trova «caviglie» no, quella e'
 * gia' in tabella. */
function normalizzaParole(valore) {
  return testo(valore)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['\u2019`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function confine(parola) {
  const corpo = parola.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp("(^|[^a-z])" + corpo + "([^a-z]|$)");
}

/* «anche» e' anche una parola italiana che vuol dire «also»: si accetta solo
 * dove vuol dire anca davvero. Meglio perdere un caso che segnare un'anca
 * perche' la frase diceva «mi fa male anche il ginocchio». */
function ancaEsplicita(frase) {
  return /(^|[^a-z])(all|alle|dall|dalle|sull|sulle)\s+anche([^a-z]|$)/.test(frase)
    || /(^|[^a-z])anche\s+(destra|sinistra|dx|sx|destro|sinistro|destre|sinistre)([^a-z]|$)/.test(frase);
}

/* Le parole trovate in una frase, in ordine di tabella. */
function paroleDellaFrase(frase) {
  const trovate = [];
  TABELLA.forEach((voce) => {
    const colpita = voce.parole.some((parola) => {
      if (parola === "anche") return ancaEsplicita(frase);
      return confine(parola).test(frase);
    });
    if (colpita) trovate.push(voce);
  });
  return trovate;
}

/* Le frasi: si spezza su riga, punto, punto e virgola, due punti, punto
 * esclamativo e virgola. Ogni pezzo resta intero per poterlo riportare. */
export function frasiDelTesto(valore) {
  return testo(valore)
    .split(/[\n\r]+|[.;:!?]+|,/)
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && /[a-z]/i.test(f));
}

/* Il riconoscimento. Ritorna:
 *  - articolazioni: le otto (o meno), nell'ordine delle tolleranze, senza
 *    doppioni;
 *  - nonRiconosciute: le frasi che non hanno trovato nessuna parola;
 *  - note: le parole riconosciute che pero' non sono un'articolazione del
 *    modello (il collo), dette come stanno;
 *  - frasi: frase per frase, cosa ha trovato (per la diagnosi a schermo). */
export function riconosciArticolazioni(valore) {
  const frasi = frasiDelTesto(valore);
  const trovate = [];
  const nonRiconosciute = [];
  const note = [];
  const dettaglio = [];
  frasi.forEach((frase) => {
    const normalizzata = normalizzaParole(frase);
    const voci = paroleDellaFrase(normalizzata);
    if (!voci.length) {
      nonRiconosciute.push(frase);
      dettaglio.push({ frase: frase, articolazioni: [] });
      return;
    }
    const dentro = [];
    voci.forEach((voce) => {
      if (!voce.articolazione) {
        const parola = voce.parole.filter((p) => confine(p).test(normalizzata))[0] || "collo";
        if (note.indexOf(parola) === -1) note.push(parola);
        return;
      }
      dentro.push(voce.articolazione);
      if (trovate.indexOf(voce.articolazione) === -1) trovate.push(voce.articolazione);
    });
    dettaglio.push({ frase: frase, articolazioni: dentro });
  });
  return {
    articolazioni: ARTICOLAZIONI.filter((a) => trovate.indexOf(a) !== -1),
    nonRiconosciute: nonRiconosciute,
    collo: note,
    frasi: dettaglio,
    vuoto: testo(valore) === ""
  };
}

/* Il documento letto, senza fidarsi: testo come stringa, versione come numero. */
export function normalizzaAnamnesi(documento) {
  if (!documento || typeof documento !== "object") {
    return { presente: false, testo: "", aggiornato: "", versione: 0 };
  }
  const n = Number(documento.versione);
  return {
    presente: true,
    testo: testo(documento.testo),
    aggiornato: testo(documento.aggiornato),
    versione: Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  };
}

/* Come si legge la riga a schermo: il testo, o «non dichiarato». */
export function testoAnamnesi(documento) {
  const letto = normalizzaAnamnesi(documento);
  if (!letto.presente) return NON_DICHIARATO;
  if (!letto.testo) return NON_DICHIARATO;
  return letto.testo;
}

/* Una riga sola per la carta: «dichiarato: ginocchio, spalla — 2 frasi non
 * riconosciute» oppure «non dichiarato». */
export function fraseArticolazioniDaAnamnesi(documento) {
  const letto = normalizzaAnamnesi(documento);
  if (!letto.presente || !letto.testo) return NON_DICHIARATO;
  const r = riconosciArticolazioni(letto.testo);
  if (!r.articolazioni.length) {
    return r.nonRiconosciute.length
      ? "dichiarato, ma nessuna delle otto articolazioni si riconosce nel testo"
      : "dichiarato, ma nessuna articolazione";
  }
  const base = "dichiarate in anamnesi: " + r.articolazioni.join(", ");
  return r.nonRiconosciute.length
    ? base + " \u00b7 " + r.nonRiconosciute.length + (r.nonRiconosciute.length === 1 ? " frase non riconosciuta" : " frasi non riconosciute")
    : base;
}

/* Il salvataggio: documento nuovo + UNA voce di registro. Non scrive. */
export function salvaAnamnesi(documento, testoNuovo, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const letto = normalizzaAnamnesi(documento);
  const nuovoTesto = testo(testoNuovo);
  if (nuovoTesto.length > MASSIMO_TESTO) {
    return { ok: false, motivo: "il testo e' troppo lungo: il campo tiene " + MASSIMO_TESTO + " caratteri" };
  }
  if (letto.presente && nuovoTesto === letto.testo) {
    return { ok: false, motivo: "il testo non e' cambiato: non ho scritto niente" };
  }
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = letto.versione;
  const versioneDopo = versionePrima + 1;
  const nuovo = { testo: nuovoTesto, aggiornato: quando, versione: versioneDopo };
  const riconosciute = riconosciArticolazioni(nuovoTesto);
  const voce = {
    idVoce: "mod-" + quando.replace(/[:.]/g, "-"),
    quando: quando,
    tipo: "anamnesi-lite",
    origine: "anamnesi-scritta-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "anamnesi-lite",
    prima: letto.testo,
    dopo: nuovoTesto,
    primaTesto: letto.testo ? letto.testo : NON_DICHIARATO,
    dopoTesto: nuovoTesto ? nuovoTesto : NON_DICHIARATO,
    articolazioni: riconosciute.articolazioni,
    versionePrima: versionePrima,
    versioneDopo: versioneDopo
  };
  return {
    ok: true,
    documento: nuovo,
    voce: voce,
    articolazioni: riconosciute.articolazioni,
    esitoTesto: nuovoTesto
      ? "anamnesi salvata \u00b7 " + (riconosciute.articolazioni.length
        ? riconosciute.articolazioni.join(", ")
        : "nessuna delle otto articolazioni riconosciuta")
      : "anamnesi svuotata \u00b7 non dichiarato"
  };
}

/* L'Annulla: rimette il testo di prima. Non cancella la voce, ne aggiunge una
 * che la cita (la storia resta intera), e la versione avanza. */
export function annullaAnamnesi(documento, voce, opzioni) {
  const v = voce || {};
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  if (testo(v.campo) !== "anamnesi-lite" && testo(v.tipo) !== "anamnesi-lite") {
    return { ok: false, motivo: "la voce del registro non dice cosa annullare" };
  }
  if (typeof v.prima !== "string") {
    return { ok: false, motivo: "la voce non porta il testo di prima: non ho scritto niente" };
  }
  const letto = normalizzaAnamnesi(documento);
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = letto.versione;
  const versioneDopo = versionePrima + 1;
  const nuovo = { testo: v.prima, aggiornato: quando, versione: versioneDopo };
  const riconosciute = riconosciArticolazioni(nuovo.testo);
  const voce2 = {
    idVoce: "mod-" + quando.replace(/[:.]/g, "-"),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "anamnesi-lite",
    prima: letto.testo,
    dopo: nuovo.testo,
    primaTesto: letto.testo ? letto.testo : NON_DICHIARATO,
    dopoTesto: nuovo.testo ? nuovo.testo : NON_DICHIARATO,
    articolazioni: riconosciute.articolazioni,
    annullaDi: testo(v.idVoce),
    versionePrima: versionePrima,
    versioneDopo: versioneDopo
  };
  return {
    ok: true,
    documento: nuovo,
    voce: voce2,
    articolazioni: riconosciute.articolazioni,
    esitoTesto: "anamnesi riportata a prima"
  };
}

/* L'ultima dichiarazione salvata, per il tasto Annulla: nel registro le voci
 * arrivano in ordine sparso, quindi si tiene quella con la data piu' avanti. */
export function ultimaVoceAnamnesi(registro) {
  const elenco = Array.isArray(registro) ? registro : [];
  let scelta = null;
  elenco.forEach((voce) => {
    const dati = voce && voce.dati && typeof voce.dati === "object" ? voce.dati : voce;
    if (!dati || typeof dati !== "object") return;
    if (testo(dati.campo) !== "anamnesi-lite") return;
    if (testo(dati.tipo) === "annulla-modifica") return;
    if (scelta == null || testo(dati.quando) > testo(scelta.quando)) scelta = dati;
  });
  return scelta;
}
