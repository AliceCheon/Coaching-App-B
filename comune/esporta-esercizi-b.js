/* Barbell Diva B — passo 35: «Esporta esercizi».
 *
 * Perche' esiste. Alice non ha il backup di B e le sue schede stanno nel suo
 * account Firebase: da qui non si leggono. Invece di chiederle un file che non
 * ha, la pagina produce il file: un JSON con tutti gli esercizi delle schede
 * del programma aperto (nome, distretto, scheda, serie della prima settimana,
 * quante settimane, articolazioni conosciute). Cosi' il lavoro sulle
 * articolazioni continua senza il backup.
 *
 * Regole di casa, le stesse di tutto il resto di B:
 *  - la funzione che costruisce il file e' PURA: entra il programma letto,
 *    esce l'oggetto. Niente DOM, niente Firestore, niente rete;
 *  - niente `undefined` (Firestore e i file non li vogliono): un dato che
 *    l'app non ha e' `null`, mai una stringa vuota e mai uno zero finto;
 *  - il distretto e' QUELLO CHE L'APP MOSTRA: `codiceDistretto` +
 *    `nomeDistretto`, non una seconda mappa;
 *  - le articolazioni sono quelle del catalogo dell'app (`articolazioniDi`):
 *    un nome che l'app non conosce resta senza articolazioni, dichiarato;
 *  - il file e' dato dell'utente: si compone in memoria e si scarica, non si
 *    mette nel repository.
 */

import { codiceDistretto, nomeDistretto } from "./distretti-b.js";
import { articolazioniDi } from "./articolazioni-b.js";
import { nomePulito } from "./nome-pulito.js";
import { scaricaTesto } from "./impostazioni-b.js";

const SENZA_NOME = "non registrato";

function testo(valore) {
  return String(valore == null ? "" : valore).trim();
}

/* La prima settimana come numero, quando e' un numero solo. «4» -> 4;
 * «4-5», «4/5», vuoto o assente -> null (la forma scritta resta in
 * `serieTesto`): il file non deve inventare un numero che non c'e'. */
function numeroSerie(valore) {
  const t = testo(valore).replace(",", ".");
  if (!t) return null;
  const m = /^(\d+(?:\.\d+)?)$/.exec(t);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/* Il distretto che l'app mostra: la sigla della colonna DIST. e il nome
 * intero della mappa dei distretti. Quello che l'app non riconosce non
 * diventa una lettera inventata: resta null. */
function distrettoDi(esercizio) {
  const codice = codiceDistretto(esercizio && esercizio.muscolo);
  if (!codice || codice === "—") return { codice: null, nome: null };
  return { codice: codice, nome: nomeDistretto(codice) };
}

/* Le articolazioni dell'app per quell'esercizio. `nonMappato` vuol dire che
 * il catalogo non lo conosce: allora il campo e' null, non un oggetto vuoto
 * che sembra «nessuna articolazione». */
function articolazioniDiEsercizio(nome) {
  const art = articolazioniDi(nome);
  if (!art || art.nonMappato === true) return null;
  return {
    principale: testo(art.principale) || null,
    secondarie: Array.isArray(art.secondarie) && art.secondarie.length
      ? art.secondarie.map((a) => testo(a)).filter(Boolean)
      : [],
    cardio: art.cardio === true
  };
}

/* Un esercizio come lo legge il file. `scheda` e' la scheda che lo contiene. */
function esercizioEsportato(esercizio, scheda) {
  const e = esercizio && typeof esercizio === "object" ? esercizio : {};
  const p = e.prescrizione && typeof e.prescrizione === "object" ? e.prescrizione : {};
  const settimane = Array.isArray(p.elencoSettimane) ? p.elencoSettimane : [];
  const prima = settimane[0] || null;
  const nome = nomePulito(e.nome);
  const nomeValido = nome && nome !== SENZA_NOME ? nome : null;
  const distretto = distrettoDi(e);
  return {
    nome: nomeValido,
    distretto: distretto.nome,
    distrettoCodice: distretto.codice,
    scheda: {
      codice: testo(scheda && scheda.codice) || null,
      nome: nomePulito(scheda && scheda.nome) || null,
      archiviata: scheda && scheda.archiviata === true
    },
    serie: numeroSerie(prima && prima.serie),
    serieTesto: testo(prima && prima.serie) || null,
    ripetizioni: testo(prima && prima.ripetizioni) || null,
    settimane: settimane.length ? settimane.length : null,
    articolazioni: articolazioniDiEsercizio(e.nome)
  };
}

/* Il blocco di testa: nome del programma, settimane, schede con quanti
 * esercizi ha ciascuna. Le settimane sono quelle dichiarate; se il profilo
 * non le dichiara, la piu' lunga delle schede lette (un dato, non un'ipotesi). */
function testaProgramma(programmaLetto, schede, esercizi) {
  const profilo = (programmaLetto && programmaLetto.profilo) || {};
  const dichiarate = Number(profilo.durata);
  const dallaSchede = esercizi.reduce((acc, e) => Math.max(acc, e.settimane || 0), 0);
  const settimane = Number.isFinite(dichiarate) && dichiarate > 0
    ? dichiarate
    : (dallaSchede > 0 ? dallaSchede : null);
  return {
    nome: nomePulito(profilo.nome) || null,
    settimane: settimane,
    schede: schede.map((s) => ({
      codice: testo(s && s.codice) || null,
      nome: nomePulito(s && s.nome) || null,
      esercizi: esercizi.filter((e) => e.scheda.codice === (testo(s && s.codice) || null)).length,
      archiviata: s && s.archiviata === true
    }))
  };
}

/* LA funzione pura. Entra il programma letto (la forma che usa la pagina:
 * `{ profilo, schede, archiviate }`), escono i dati del file.
 * `opzioni.oggi` serve alle prove: una data fissa, niente orologio nascosto. */
export function costruisciEsportazione(programmaLetto, opzioni) {
  const o = opzioni || {};
  const p = programmaLetto && typeof programmaLetto === "object" ? programmaLetto : {};
  const attive = Array.isArray(p.schede) ? p.schede : [];
  /* Le schede archiviate restano schede del programma: entrano nel file con
   * `archiviata: true`, cosi' nessun esercizio sparisce di nascosto. */
  const archiviate = (Array.isArray(p.archiviate) ? p.archiviate : []).map((s) => Object.assign({}, s, { archiviata: true }));
  const schede = attive.concat(archiviate).filter((s) => s && typeof s === "object");
  const esercizi = [];
  schede.forEach((scheda) => {
    ((scheda && scheda.esercizi) || []).forEach((e) => {
      if (!e || typeof e !== "object") return;
      esercizi.push(esercizioEsportato(e, scheda));
    });
  });
  return {
    programma: testaProgramma(p, schede, esercizi),
    esportatoIl: o.oggi instanceof Date && !Number.isNaN(o.oggi.getTime()) ? dataIso(o.oggi) : null,
    legenda: {
      distretto: "il distretto come lo mostra l'app (colonna DIST. e suo nome)",
      serie: "le serie della prima settimana, quando sono un numero solo; la forma scritta sta in serieTesto",
      settimane: "quante settimane ha quell'esercizio nella scheda",
      articolazioni: "principale e secondarie che l'app conosce per quell'esercizio; null se non le conosce",
      null: "un dato che l'app non ha: non è zero e non è una stringa vuota"
    },
    esercizi: esercizi
  };
}

/* aaaa-mm-gg nella data locale: e' il giorno che Alice vede sul calendario. */
function dataIso(data) {
  const d = data instanceof Date && !Number.isNaN(data.getTime()) ? data : null;
  if (!d) return "";
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const g = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + g;
}

/* «Esercizi Barbell Diva B - 2026-11-28.json». I caratteri che i sistemi
 * operativi non accettano in un nome di file diventano un trattino; gli
 * accenti si ripiegano sulla lettera semplice (Caffè -> Caffe) e i trattini
 * lunghi su un trattino: alcuni browser scartano del tutto un nome con
 * caratteri non ASCII e scaricano un anonimo «download». Meglio un nome che
 * arriva davvero, con dentro il programma e il giorno. */
function nomePerFile(valore) {
  return String(valore == null ? "" : valore)
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2013\u2014]/g, " - ")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/[^A-Za-z0-9 ._-]+/g, "")
    .replace(/\s+/g, " ").trim();
}

export function nomeFileEsportazione(nomeProgramma, data) {
  const nome = nomePerFile(nomePulito(nomeProgramma)) || "programma";
  return "Esercizi " + nome + " - " + dataIso(data) + ".json";
}

/* Il clic vero: costruisce il file e lo fa scaricare con Blob + a.download
 * (la stessa strada dell'esportazione del registro). Ritorna
 * `{ ok, nomeFile, schede, esercizi }` oppure `{ ok: false, motivo }`.
 * Nessun dato esce dal dispositivo: il file si compone qui, in memoria. */
export function esportaProgramma(doc, programmaLetto, opzioni) {
  const o = opzioni || {};
  const dati = costruisciEsportazione(programmaLetto, o);
  if (!dati.esercizi.length) {
    return { ok: false, motivo: "non c'è nessun esercizio da esportare: il programma non è stato letto" };
  }
  const nomeFile = nomeFileEsportazione(dati.programma.nome, o.oggi instanceof Date ? o.oggi : new Date());
  const contenuto = JSON.stringify(dati, null, 2);
  const scaricato = scaricaTesto(doc, nomeFile, contenuto);
  if (!scaricato) {
    return { ok: false, motivo: "questo browser non permette di scaricare il file" };
  }
  return { ok: true, nomeFile: nomeFile, schede: dati.programma.schede.length, esercizi: dati.esercizi.length, dati: dati };
}
