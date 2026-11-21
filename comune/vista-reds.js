/* Barbell Diva B - PASSO 6b: la carta «Rischio strutturale (RED-S)».
 *
 * Riempe UNA carta sola della Dashboard (#pag-dashboard .ck-red) dentro
 * desktop/index.html: il numero grande (media delle percentuali), la riga
 * «Articolazione più sollecitata» (nome e percentuale) e la nota in fondo.
 * Il resto della Dashboard non si tocca e il riquadro MRV resta com'è.
 *
 * Modulo di sola presentazione: riceve la scheda già letta, chiama il conto
 * puro di comune/articolazioni-b.js e scrive. Nessun Firestore, nessuna
 * scrittura, nessun tasto. Se la scheda non è leggibile la carta dice perché
 * e non mostra zeri.
 */

import { stressRiepilogo } from "./articolazioni-b.js";
import { programmaAttivo, settimanaCorrente } from "./lettura-dati.js";
import { nomePulito } from "./nome-pulito.js";

const NON = "\u2014";

function aggiorna(nodo, testo) {
  if (nodo) nodo.textContent = String(testo);
}

export function riempiRischioStrutturale(doc, scheda, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const carta = doc.querySelector("#pag-dashboard .ck-red");
  if (!carta) return null;
  const num = carta.querySelector("[data-reds-num]");
  const stato = carta.querySelector("[data-reds-stato]");
  const piu = carta.querySelector("[data-reds-piu]");
  const nota = carta.querySelector("[data-reds-nota]");

  const riepilogo = scheda && typeof scheda === "object" ? stressRiepilogo(scheda) : null;

  if (!riepilogo || riepilogo.leggibile !== true) {
    const motivo = o.motivo
      ? String(o.motivo)
      : (!scheda || typeof scheda !== "object"
        ? "nessuna scheda da leggere: la scheda attiva non è arrivata alla carta"
        : (riepilogo && riepilogo.motivo) || "la scheda non si riesce a leggere");
    aggiorna(num, NON);
    aggiorna(stato, "non calcolabile");
    aggiorna(piu, "non calcolabile");
    const diagnosi = o.diagnosi ? " " + String(o.diagnosi) : "";
    aggiorna(nota, "Non calcolato: " + motivo + "." + diagnosi + " Nessuno zero al posto di un dato che manca.");
    carta.setAttribute("data-reds", "non-calcolabile");
    return riepilogo;
  }

  aggiorna(num, riepilogo.mediaIntera + "%");
  aggiorna(stato, "media delle 8 articolazioni");
  const massima = riepilogo.piuSollecitata;
  /* Tutte a zero non vuol dire «spalla 0%»: vuol dire che nessuno degli
   * esercizi letti ha dato punti (nomi non riconosciuti, o solo cardio). */
  if (riepilogo.tutteAZero === true) {
    aggiorna(piu, "nessun esercizio ha dato punti");
  } else {
    aggiorna(piu, massima
      ? massima.articolazione + " · " + Math.round(massima.percentuale) + "%"
      : "non registrata");
  }
  const sopra = riepilogo.sopraCento.length
    ? " Sopra il 100%: " + riepilogo.sopraCento.join(", ") + "."
    : "";
  /* PASSO 6c-fix-3 — i numeri veri della mappatura dei nomi, cosi' in un colpo
   * si vede se il problema sono i nomi. I nomi passano da nomePulito perche'
   * vengono dai dati (regola 44). */
  const nonRiconosciuti = Array.isArray(riepilogo.nomiNonRiconosciuti) ? riepilogo.nomiNonRiconosciuti : [];
  const nomi = nonRiconosciuti.map((n) => "\u00ab" + nomePulito(n) + "\u00bb").join(", ");
  const mappatura = " Nomi: " + riepilogo.righeConArticolazione + " righe con articolazione, "
    + riepilogo.righeSenza + " senza"
    + (nonRiconosciuti.length ? " (non riconosciuti: " + nomi
      + (riepilogo.nomiNonRiconosciutiTotale > nonRiconosciuti.length
        ? " e altri " + (riepilogo.nomiNonRiconosciutiTotale - nonRiconosciuti.length) : "")
      + ")" : "")
    + ".";
  aggiorna(nota, "Calcolato sulla scheda attiva: 8 articolazioni, tolleranze di partenza"
    + " (serie equivalenti a settimana, " + riepilogo.righeContate + " righe lette)." + mappatura + sopra);
  carta.setAttribute("data-reds", "calcolato");
  return riepilogo;
}

/* ---------------------------------------------------------------------------
 * PASSO 6c-fix — le schede si cercano con tolleranza, come trovaProgramma.
 *
 * L'id che il profilo conosce (`programMeta.id`) non e' sempre la chiave con
 * cui la zona B lega le schede: il documento si chiama `program-v2-meta-…`.
 * Cercare solo l'id nudo faceva rispondere «non ha schede leggibili» anche
 * quando le schede c'erano. Ordine: id esatto, id del documento, id in coda
 * alla chiave, e infine l'id nudo ricavato togliendo il prefisso.
 * La diagnosi porta i numeri, cosi' la carta spiega da sola cosa ha cercato.
 * ------------------------------------------------------------------------- */
function testoDi(valore) {
  return String(valore == null ? "" : valore).trim();
}

const PREFISSO_PROGRAMMA = "program-v2-meta-";

function gruppiDiSchede(ricostruzione) {
  const per = ricostruzione && typeof ricostruzione === "object" ? ricostruzione.perProgramma : null;
  if (!per || typeof per !== "object") return [];
  return Object.keys(per).map((k) => per[k]).filter((g) => g && typeof g === "object");
}

function contaSchede(gruppo) {
  if (!gruppo) return 0;
  return (Array.isArray(gruppo.schede) ? gruppo.schede.length : 0)
    + (Array.isArray(gruppo.archiviate) ? gruppo.archiviate.length : 0);
}

function gruppoDelProgramma(ricostruzione, programId) {
  const id = testoDi(programId);
  const gruppi = gruppiDiSchede(ricostruzione);
  const chiave = (g) => testoDi(g.programId);
  let gruppo = null;
  let come = null;
  if (id) {
    gruppo = gruppi.filter((g) => chiave(g) === id)[0] || null;
    if (gruppo) come = "id esatto";
    if (!gruppo) {
      gruppo = gruppi.filter((g) => chiave(g) === PREFISSO_PROGRAMMA + id)[0] || null;
      if (gruppo) come = "id del documento";
    }
    if (!gruppo) {
      gruppo = gruppi.filter((g) => chiave(g).endsWith(id))[0] || null;
      if (gruppo) come = "id in coda alla chiave";
    }
    if (!gruppo && id.indexOf(PREFISSO_PROGRAMMA) === 0) {
      const nudo = id.slice(PREFISSO_PROGRAMMA.length);
      gruppo = gruppi.filter((g) => chiave(g) === nudo)[0] || null;
      if (gruppo) come = "id nudo del documento";
    }
  }
  return {
    gruppo,
    come,
    idCercato: id,
    gruppi: gruppi.length,
    lette: gruppi.reduce((a, g) => a + contaSchede(g), 0),
    legate: contaSchede(gruppo)
  };
}

function quantiProgrammi(n) {
  return n + (n === 1 ? " programma" : " programmi");
}

/* ---------------------------------------------------------------------------
 * PASSO 6c — quale scheda guarda la carta RED-S.
 *
 * Sola lettura: entrano i dati della zona B gia' letti dalla pagina
 * (`programmi`, `sedute`, `schedeV2`) ed esce la scheda da passare a
 * riempiRischioStrutturale. Nessuna scrittura, nessuna rete, nessun DOM.
 *
 * Ordine dichiarato:
 *  1. il programma attivo (stessa regola di A: status "active", poi `active`,
 *     poi il non archiviato aggiornato per ultimo — la decide programmaAttivo);
 *  2. la scheda di quel programma nella settimana corrente (settimanaCorrente
 *     sulle sedute App);
 *  3. se la settimana corrente non c'e' o non ha una scheda, la PRIMA scheda
 *     del programma (per settimana, poi per ordine);
 *  4. se non c'e' nessun programma attivo, oppure il programma non ha schede
 *     leggibili, il motivo scritto in chiaro: la carta lo stampa e non mostra
 *     zeri.
 * ------------------------------------------------------------------------- */
export function schedaPerRischio(letture) {
  const l = letture && typeof letture === "object" ? letture : {};
  const elenco = Array.isArray(l) ? l : (Array.isArray(l.programmi) ? l.programmi : []);
  const attivo = programmaAttivo(elenco);
  if (!attivo || !attivo.programma) {
    const cerca = gruppoDelProgramma(l.schedeV2, "");
    return {
      scheda: null,
      motivo: "nessun programma attivo",
      diagnosi: cerca.lette
        ? "Ho letto " + cerca.lette + " schede in " + quantiProgrammi(cerca.gruppi)
          + ", ma nessuno \u00e8 attivo: non c'\u00e8 un legame da seguire."
        : "La zona B non portava nessuna scheda da leggere.",
      numeri: { gruppi: cerca.gruppi, lette: cerca.lette, legate: 0, idCercato: "" },
      programma: null,
      settimana: null,
      fonte: null
    };
  }
  const programma = attivo.programma;
  /* Un programma archiviato non e' "attivo": meglio il motivo che i numeri di
   * un programma che Alice ha messo da parte. */
  if (programma.archivedAt || String(programma.status || "") === "archived") {
    const cerca = gruppoDelProgramma(l.schedeV2, programma.id);
    return {
      scheda: null,
      motivo: "nessun programma attivo: c'\u00e8 solo un programma archiviato",
      diagnosi: "id cercato \u00ab" + (cerca.idCercato || "nessuno") + "\u00bb: " + cerca.legate
        + " schede legate; " + cerca.lette + " schede lette in tutto su " + quantiProgrammi(cerca.gruppi) + ".",
      numeri: { gruppi: cerca.gruppi, lette: cerca.lette, legate: cerca.legate, idCercato: cerca.idCercato },
      programma: programma,
      settimana: null,
      fonte: null
    };
  }
  const nome = nomePulito(programma.name || programma.nome || "");
  const cerca = gruppoDelProgramma(l.schedeV2, programma.id);
  const gruppo = cerca.gruppo;
  const archiviate = gruppo && Array.isArray(gruppo.archiviate) ? gruppo.archiviate.length : 0;
  const schede = gruppo && Array.isArray(gruppo.schede) ? gruppo.schede.slice() : [];
  const numeri = { gruppi: cerca.gruppi, lette: cerca.lette, legate: cerca.legate, idCercato: cerca.idCercato };
  if (!schede.length) {
    const dove = gruppo
      ? "gruppo trovato (" + cerca.come + ") con " + schede.length + " schede attive e "
        + archiviate + " archiviate"
      : "nessun gruppo trovato, 0 schede legate";
    return {
      scheda: null,
      motivo: "il programma attivo" + (nome ? " \u00ab" + nome + "\u00bb" : "") + " non ha schede leggibili",
      diagnosi: "id cercato \u00ab" + (cerca.idCercato || "nessuno") + "\u00bb: " + dove + "; "
        + cerca.lette + " schede lette in tutto su " + quantiProgrammi(cerca.gruppi) + ".",
      numeri,
      programma: programma,
      settimana: null,
      fonte: null
    };
  }
  const settimana = settimanaCorrente(Array.isArray(l.sedute) ? l.sedute : []);
  const perSettimana = (a, b) => (Number(a.settimana) || 0) - (Number(b.settimana) || 0)
    || (Number(a.ordine) || 0) - (Number(b.ordine) || 0)
    || String(a.codice || "").localeCompare(String(b.codice || ""));
  let scelta = settimana == null ? null : (schede.filter((s) => Number(s.settimana) === settimana)[0] || null);
  let fonte = scelta ? "scheda della settimana " + settimana : null;
  if (!scelta) {
    scelta = schede.slice().sort(perSettimana)[0];
    fonte = settimana == null
      ? "prima scheda del programma: nessuna settimana corrente registrata"
      : "prima scheda del programma: la settimana " + settimana + " non ha una scheda";
  }
  return {
    scheda: scelta,
    motivo: null,
    diagnosi: null,
    numeri,
    programma: programma,
    settimana: settimana,
    fonte: fonte,
    esplicito: attivo.esplicito === true,
    ripiego: attivo.ripiego === true
  };
}

/* La scorciatoia usata dalla pagina: sceglie la scheda e riempie la carta.
 * `riempiRischioDaZonaBSicuro` e' la stessa cosa, ma un difetto della carta
 * (un conto che lancia) non deve portarsi dietro il resto della Dashboard:
 * la nota scrive «Errore nel calcolo: <messaggio>» e la pagina va avanti. */
export function riempiRischioDaZonaB(doc, letture) {
  const scelta = schedaPerRischio(letture);
  const riepilogo = riempiRischioStrutturale(doc, scelta.scheda, { motivo: scelta.motivo, diagnosi: scelta.diagnosi });
  return Object.assign({}, scelta, { riepilogo: riepilogo });
}

export function riempiRischioDaZonaBSicuro(doc, letture) {
  try {
    return riempiRischioDaZonaB(doc, letture);
  } catch (e) {
    const messaggio = e && e.message ? String(e.message) : String(e || "errore");
    const carta = doc && typeof doc.querySelector === "function" ? doc.querySelector("#pag-dashboard .ck-red") : null;
    if (carta) {
      aggiorna(carta.querySelector("[data-reds-num]"), NON);
      aggiorna(carta.querySelector("[data-reds-stato]"), "non calcolabile");
      aggiorna(carta.querySelector("[data-reds-piu]"), "non calcolabile");
      aggiorna(carta.querySelector("[data-reds-nota]"),
        "Errore nel calcolo: " + messaggio + ". La carta si ferma qui: il resto della Dashboard non \u00e8 toccato.");
      carta.setAttribute("data-reds", "errore");
    }
    return { scheda: null, motivo: "errore nel calcolo", errore: messaggio, riepilogo: null };
  }
}
