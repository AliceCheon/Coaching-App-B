/* Barbell Diva B — PASSO 14 (versione semplice): «Patologie o infortuni».
 *
 * Una cosa sola, fatta come su un foglio: l'atleta scrive a parole cosa le fa
 * male, e quelle parole restano.
 *
 * PASSO 14d — dove vivono: nel REGISTRO, non in un documento nuovo.
 * `bdB_atleti/{uid}/registro` si scrive da tutti i passi e funziona; una
 * raccolta nuova avrebbe voluto una regola nuova, e in produzione il documento
 * `anamnesi-lite` non tornava dopo la ricarica. Quindi:
 *
 *   voce { tipo: "dichiarazione-anamnesi", campo: "anamnesi-lite",
 *          prima, dopo, versionePrima, versioneDopo, quando }
 *
 * Il testo corrente e' il `dopo` dell'ultima dichiarazione che nessuna voce
 * successiva ha annullato (l'Annulla cita la sua con `annullaDi`).
 *
 * Qui non si scrive niente: funzioni PURE. La scrittura la fa la pagina, con
 * scriviVoceRegistro di comune/scritture-b.js.
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

/* Una voce del registro, comunque sia arrivata (con `dati` o piatta). */
function datiVoce(voce) {
  if (!voce || typeof voce !== "object") return null;
  const dati = voce.dati && typeof voce.dati === "object" ? voce.dati : voce;
  if (!dati || typeof dati !== "object") return null;
  if (testo(dati.campo) !== "anamnesi-lite") return null;
  return dati;
}

function versioneVoce(dati) {
  const n = Number(dati && dati.versioneDopo);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  const m = Number(dati && dati.versione);
  return Number.isFinite(m) && m > 0 ? Math.floor(m) : 0;
}

/* Le dichiarazioni e gli annullamenti, in ordine di data. Il registro puo'
 * arrivare in ordine sparso: si ordina qui, una volta. */
function vociOrdinatе(registro) {
  const elenco = Array.isArray(registro) ? registro : [];
  const fuori = [];
  elenco.forEach((voce) => {
    const dati = datiVoce(voce);
    if (!dati) return;
    fuori.push({ dati: dati, quando: testo(dati.quando) });
  });
  fuori.sort((a, b) => (a.quando < b.quando ? -1 : a.quando > b.quando ? 1 : 0));
  return fuori;
}

/* La dichiarazione letta dal registro.
 *
 * - `errore` non nullo quando il registro non e' un elenco: nullo ≠ errore, e
 *   la pagina deve dire «non ho potuto leggere», non «non dichiarato».
 * - `presente`: esiste una dichiarazione che nessuno ha annullato.
 * - `testo`: il `dopo` di quella dichiarazione (stringa vuota se svuotata).
 */
export function dichiarazioneDalRegistro(registro) {
  if (!Array.isArray(registro)) {
    return {
      presente: false, testo: "", aggiornato: "", versione: 0, voce: null, idVoce: "",
      errore: "il registro non e' un elenco leggibile"
    };
  }
  const voci = vociOrdinatе(registro);
  /* Gli annullamenti citano la voce che annullano: quella dichiarazione non
   * vale piu'. Se un annullamento cita una voce che non c'e', non cancella
   * niente (e non si inventa un testo). */
  const annullate = [];
  voci.forEach((v) => {
    if (testo(v.dati.tipo) !== "annulla-modifica") return;
    const citata = testo(v.dati.annullaDi);
    if (citata) annullate.push(citata);
  });
  let scelta = null;
  voci.forEach((v) => {
    if (testo(v.dati.tipo) === "annulla-modifica") return;
    const tipo = testo(v.dati.tipo);
    if (tipo !== "dichiarazione-anamnesi" && tipo !== "anamnesi-lite") return;
    const id = testo(v.dati.idVoce);
    if (id && annullate.indexOf(id) !== -1) return;
    scelta = v;
  });
  if (!scelta) {
    return { presente: false, testo: "", aggiornato: "", versione: 0, voce: null, idVoce: "", errore: null };
  }
  const dopo = scelta.dati.dopo;
  return {
    presente: true,
    testo: typeof dopo === "string" ? dopo : testo(dopo),
    aggiornato: scelta.quando,
    versione: versioneVoce(scelta.dati),
    voce: scelta.dati,
    idVoce: testo(scelta.dati.idVoce),
    prima: typeof scelta.dati.prima === "string" ? scelta.dati.prima : testo(scelta.dati.prima),
    errore: null
  };
}

/* Un nome per la lettura fallita: la pagina lo stampa com'e', col codice. */
export function motivoLettura(errore) {
  if (!errore) return "motivo non riportato";
  const codice = testo(errore.code || errore.codice);
  const messaggio = testo(errore.message || errore.messaggio || errore);
  if (codice && messaggio) return codice + ": " + messaggio;
  return messaggio || codice || "errore senza messaggio";
}

/* Come si legge la dichiarazione a schermo: il testo, o «non dichiarato». */
export function testoDichiarazione(dichiarazione) {
  const d = dichiarazione && typeof dichiarazione === "object" ? dichiarazione : null;
  if (!d || d.errore) return NON_DICHIARATO;
  if (!d.presente || !testo(d.testo)) return NON_DICHIARATO;
  return testo(d.testo);
}

/* Una riga sola per la carta: cosa si e' riconosciuto, o «non dichiarato». */
export function fraseArticolazioniDaAnamnesi(dichiarazione) {
  const d = dichiarazione && typeof dichiarazione === "object" ? dichiarazione : null;
  if (!d || d.errore) return NON_DICHIARATO;
  if (!d.presente || !testo(d.testo)) return NON_DICHIARATO;
  const r = riconosciArticolazioni(d.testo);
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

/* L'ora come la legge una persona: HH:MM da una data ISO. */
export function oraBreve(quando) {
  const t2 = testo(quando);
  const m = /T(\d\d):(\d\d)/.exec(t2);
  if (m) return m[1] + ":" + m[2];
  return t2 ? t2 : "";
}

/* La data come la legge una persona: 23/11/2026 da una data ISO. */
export function dataBreve(quando) {
  const t2 = testo(quando);
  const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(t2);
  if (m) return m[3] + "/" + m[2] + "/" + m[1];
  return "";
}

/* Il salvataggio: UNA voce di registro, con prima, dopo e le due versioni.
 * Non scrive: la voce la consegna la pagina a scriviVoceRegistro.
 *
 * `opzioni.versioneAttesa`: se chi salva ha letto la versione N e nel
 * frattempo il registro dice N+1, non si scrive e si dice perche'. */
export function salvaAnamnesi(dichiarazione, testoNuovo, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const letto = dichiarazione && typeof dichiarazione === "object" ? dichiarazione : null;
  if (letto && letto.errore) {
    return { ok: false, motivo: "non ho potuto leggere la dichiarazione: " + motivoLettura(letto.errore) };
  }
  const nuovoTesto = testo(testoNuovo);
  if (nuovoTesto.length > MASSIMO_TESTO) {
    return { ok: false, motivo: "il testo e' troppo lungo: il campo tiene " + MASSIMO_TESTO + " caratteri" };
  }
  const versionePrima = letto ? Number(letto.versione) || 0 : 0;
  if (o.versioneAttesa != null && Number(o.versioneAttesa) !== versionePrima) {
    return {
      ok: false,
      motivo: "la dichiarazione e' cambiata nel frattempo (versione " + versionePrima
        + " invece di " + Number(o.versioneAttesa) + "): non ho scritto niente"
    };
  }
  const prima = letto && letto.presente ? testo(letto.testo) : "";
  if (letto && letto.presente && nuovoTesto === prima) {
    return { ok: false, motivo: "il testo non e' cambiato: non ho scritto niente" };
  }
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versioneDopo = versionePrima + 1;
  const riconosciute = riconosciArticolazioni(nuovoTesto);
  const voce = {
    /* L'id porta la versione: due salvataggi nello stesso millisecondo non si
     * sovrascrivono piu' (in produzione si vedrebbe come «salvato ma riletto
     * diverso», ed e' esattamente il genere di bug che non si vede). */
    idVoce: "mod-" + quando.replace(/[:.]/g, "-") + "-v" + versioneDopo,
    quando: quando,
    tipo: "dichiarazione-anamnesi",
    origine: "anamnesi-dichiarata-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "anamnesi-lite",
    prima: prima,
    dopo: nuovoTesto,
    primaTesto: prima ? prima : NON_DICHIARATO,
    dopoTesto: nuovoTesto ? nuovoTesto : NON_DICHIARATO,
    articolazioni: riconosciute.articolazioni,
    versionePrima: versionePrima,
    versioneDopo: versioneDopo
  };
  return { ok: true, voce: voce, articolazioni: riconosciute.articolazioni };
}

/* L'Annulla: una voce nuova che cita la dichiarazione e rimette il `prima`.
 * Non cancella niente dal registro: la storia resta intera. */
export function annullaAnamnesi(dichiarazione, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const letto = dichiarazione && typeof dichiarazione === "object" ? dichiarazione : null;
  if (!letto || !letto.presente || !letto.voce) {
    return { ok: false, motivo: "non c'e' nessuna dichiarazione da annullare" };
  }
  if (letto.errore) {
    return { ok: false, motivo: "non ho potuto leggere la dichiarazione: " + motivoLettura(letto.errore) };
  }
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = Number(letto.versione) || 0;
  if (o.versioneAttesa != null && Number(o.versioneAttesa) !== versionePrima) {
    return {
      ok: false,
      motivo: "la dichiarazione e' cambiata nel frattempo (versione " + versionePrima
        + " invece di " + Number(o.versioneAttesa) + "): non ho scritto niente"
    };
  }
  const prima = testo(letto.testo);
  const dopo = letto.prima == null ? "" : testo(letto.prima);
  const voce2 = {
    idVoce: "mod-" + quando.replace(/[:.]/g, "-") + "-v" + (versionePrima + 1),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "anamnesi-lite",
    prima: prima,
    dopo: dopo,
    primaTesto: prima ? prima : "nessuna dichiarazione",
    dopoTesto: dopo ? dopo : NON_DICHIARATO,
    annullaDi: testo(letto.idVoce),
    versionePrima: versionePrima,
    versioneDopo: versionePrima + 1
  };
  return { ok: true, voce: voce2 };
}
