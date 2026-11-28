import { separaRecupero, separaTempo } from "./tut-rec.js";
/* Barbell Diva B — le modifiche alle schede, dentro la zona B (passo 9). PURE.
 *
 * Niente rete, niente DOM: entrano documenti scheda letti dalla zona B, escono
 * il documento nuovo, la voce del registro e il peso. Cosi' le prove possono
 * verificare ogni regola senza aprire un browser.
 *
 * Le regole di questo passo, decise da Alice l'8/11/2026:
 *  - si toccano serie e ripetizioni di una settimana, e il recupero e il TUT
 *    dell'esercizio (passo 10): quei due campi stanno sull'ESERCIZIO, non sulla
 *    settimana, quindi cambiarli vale per tutte le settimane. Tecniche, nota,
 *    sostituzione, aggiungi/togli restano spenti.
 *  - ogni scheda ha il suo documento: si scrive la scheda, non una fotografia
 *    di tutto l'atleta.
 *  - la scheda porta un numero di `versione`: prima di scrivere si rilegge il
 *    documento e se la versione non e' quella attesa si rifiuta, invece di
 *    sovrascrivere alla cieca (il guaio gia' visto in A).
 *  - ogni modifica lascia una voce nel registro con il valore prima e dopo.
 *    L'annullamento non cancella la voce: ne aggiunge una che la cita.
 *  - una scheda con il marchio "modificatoInB" e' protetta: la Copia da A non
 *    la sovrascrive e la dichiara a schermo.
 */

import { prescrizione } from "./schede-v2.js";

import { rigaTecnica as costruisciRigaTecnica, nomeTecnica, tecnicaCambiata, notaAutomatica as notaAutoTecnica, parametriValidi, eTecnica } from "./tecniche-b.js";
import {
  coppieRiga, coppieScheda, baseDaSettimane, nomeProgressione, voceScheda,
  PREFISSO_CUSTOM, CAMPO_CUSTOM
} from "./progressioni-b.js";

/* Il nome del campo che dice "a questa scheda ho messo mano in B". */
import { validaSettimana, validaVolume, settimaneScheda, leggiPiano } from "./piano-scheda.js";

export const MARCHIO_B = "modificatoInB";

/* Un documento Firestore regge 1 MiB. Qui la soglia di avviso sta un po'
 * sotto, per non arrivarci mai con un salvataggio gia' partito. */
export const LIMITE_PESO = 1048576;
export const SOGLIA_PESO = 900000;

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

function intero(valore) {
  const t = testo(valore);
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* --- Il peso --------------------------------------------------------------
 * Contato a mano: in pagina non c'e' Buffer, e il numero deve essere lo stesso
 * qui e nel browser. Le virgolette del JSON contano anche loro, come nella
 * realta'. */
export function byteDi(grezzo) {
  const t = String(grezzo == null ? "" : grezzo);
  let n = 0;
  for (let i = 0; i < t.length; i += 1) {
    const c = t.charCodeAt(i);
    if (c < 128) n += 1;
    else if (c < 2048) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i += 1; }
    else n += 3;
  }
  return n;
}

export function pesoUno(dati) {
  if (dati == null) return 0;
  let serializzato = "";
  try {
    serializzato = JSON.stringify(dati);
  } catch (e) {
    return LIMITE_PESO + 1;
  }
  return byteDi(serializzato);
}

/* Prima di scrivere: quanto pesano la radice e la scheda piu' grossa. Non e'
 * un controllo formale, e' un numero dichiarato a schermo. */
export function misuraPeso(fotografia, schede) {
  const radice = pesoUno(fotografia);
  const elenco = Array.isArray(schede) ? schede : [];
  const schedePesi = elenco.map((d) => pesoUno(d && d.dati ? d.dati : d));
  const scheda = schedePesi.length ? Math.max.apply(null, schedePesi) : 0;
  const sopra = radice > LIMITE_PESO || scheda > LIMITE_PESO;
  return {
    radice: radice,
    scheda: scheda,
    limite: LIMITE_PESO,
    sotto: !sopra,
    avviso: radice > LIMITE_PESO
      ? "la radice della zona B pesa " + radice + " byte: oltre il limite di un documento (1 MiB)."
      : (scheda > LIMITE_PESO
        ? "una scheda pesa " + scheda + " byte: oltre il limite di un documento (1 MiB)."
        : (radice > SOGLIA_PESO || scheda > SOGLIA_PESO
          ? "la zona B e' vicina al limite di un documento (1 MiB): radice " + radice + ", scheda piu' grossa " + scheda + "."
          : ""))
  };
}

/* --- Versione e marchio --------------------------------------------------- */

export function versioneDi(dati) {
  const v = Number((dati || {}).versione);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

export function eProtetta(dati) {
  const m = (dati || {})[MARCHIO_B];
  return Boolean(m && typeof m === "object");
}

export function quandoProtetta(dati) {
  const m = (dati || {})[MARCHIO_B];
  return m && m.quando ? String(m.quando) : null;
}

/* --- La scheda dentro il documento --------------------------------------- */

export function foglioDi(dati) {
  const s = (dati || {}).sheet;
  return s && typeof s === "object" ? s : null;
}

/* La chiave dell'elenco esercizi: A usa "exercises", i documenti vecchi
 * "esercizi". Si legge quella che c'e', non si inventa. */
export function chiaveEsercizi(foglio) {
  if (Array.isArray(foglio.exercises)) return "exercises";
  if (Array.isArray(foglio.esercizi)) return "esercizi";
  return "";
}

export function codiceScheda(dati) {
  const f = foglioDi(dati);
  if (!f) return "";
  return testo(f.code || f.codice || f.letter || f.id);
}

/* Dove stanno le settimane dentro un esercizio: prima la progressione, poi i
 * campi che A accetta davanti. Se non ce n'e' nessuno, non si crea niente: si
 * dice che la scheda non porta le settimane. */
function posizioneSettimane(esercizio) {
  const e = esercizio || {};
  const prog = e.progression;
  if (prog && typeof prog === "object" && Array.isArray(prog.weeks)) {
    return { oggetto: prog, chiave: "weeks" };
  }
  const chiavi = ["weeks", "manuale", "manualWeeks"];
  for (let i = 0; i < chiavi.length; i += 1) {
    if (Array.isArray(e[chiavi[i]])) return { oggetto: e, chiave: chiavi[i] };
  }
  return null;
}

function nomeDi(esercizio) {
  const e = esercizio || {};
  return testo(e.name || e.nome || e.exercise);
}

/* Un esercizio si ritrova per id; se l'id manca, per nome esatto. Mai per
 * posizione quando la posizione potrebbe essere un'altra: la scheda mostrata
 * e' ordinata, il documento no. */
function trovaEsercizio(elenco, richiesta) {
  const id = testo(richiesta.idEsercizio);
  if (id) {
    for (let i = 0; i < elenco.length; i += 1) {
      if (testo(elenco[i] && elenco[i].id) === id) return i;
    }
    return -1;
  }
  const nome = testo(richiesta.esercizio);
  if (!nome || nome === "—") return -1;
  const trovati = [];
  for (let i = 0; i < elenco.length; i += 1) {
    if (nomeDi(elenco[i]) === nome) trovati.push(i);
  }
  return trovati.length === 1 ? trovati[0] : -1;
}

export function idVoceRegistro(quando) {
  return "mod-" + String(quando || "").replace(/[:.]/g, "-");
}

/* --- La modifica: serie o ripetizioni di una settimana -------------------- */

/* Richiesta: { idScheda, idEsercizio, esercizio, campo: "serie"|"ripetizioni",
 *              settimana: 1..8, valore }
 * Esito: { ok:true, dati, voce, prima, dopo } oppure { ok:false, motivo }. */
export function cambiaSerieRipetizioni(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };

  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const esercizio = elenco[indice];
  if (!esercizio || typeof esercizio !== "object") return { ok: false, motivo: "l'esercizio non e' leggibile" };
  if (esercizio.deletedAt) return { ok: false, motivo: "l'esercizio e' cancellato" };

  const campo = r.campo === "serie" ? "serie" : (r.campo === "ripetizioni" ? "ripetizioni" : "");
  if (!campo) return { ok: false, motivo: "in questo passo si toccano solo serie e ripetizioni" };

  const posto = posizioneSettimane(esercizio);
  if (!posto) return { ok: false, motivo: "questa scheda non porta le settimane scritte: la modifica si apre in un passo successivo" };

  const k = Number(r.settimana) - 1;
  if (!Number.isInteger(k) || k < 0 || k > 30) return { ok: false, motivo: "settimana non valida" };

  const grezze = posto.chiave === "weeks" ? posto.oggetto.weeks : posto.oggetto[posto.chiave];
  const normalizzate = prescrizione(esercizio).elencoSettimane;
  const prima = k < normalizzate.length ? testo(normalizzate[k][campo]) : "";
  const dopo = testo(r.valore).replace(/\s+/g, " ");

  if (dopo === prima.replace(/\s+/g, " ")) return { ok: false, motivo: "il valore non e' cambiato" };

  if (campo === "serie") {
    if (dopo !== "") {
      const n = intero(dopo);
      if (n == null || n < 1 || n > 99) return { ok: false, motivo: "le serie si scrivono con un numero da 1 a 99" };
    }
  } else if (dopo !== "") {
    /* Passo 25: le ripetizioni sono un TESTO, non un numero. "10-x",
     * "10-8-x", "Test 12rm, poi 1x8" sono valori veri e gia' presenti nelle
     * schede: vanno accettati come li scrive Alice. Si rifiuta solo cio' che
     * romperebbe la riga (testo troppo lungo, a capo o caratteri di controllo). */
    if (dopo.length > 40) return { ok: false, motivo: "le ripetizioni stanno in 40 caratteri: per esempio 8, 8-10, 10-x-x" };
    if (/[\u0000-\u001f\u007f]/.test(dopo)) return { ok: false, motivo: "le ripetizioni si scrivono su una riga sola" };
  }

  const nuoveSettimane = grezze.map((w) => (w && typeof w === "object" ? Object.assign({}, w) : {}));
  while (nuoveSettimane.length <= k) nuoveSettimane.push({});
  const settimana = Object.assign({}, nuoveSettimane[k]);
  if (campo === "serie") settimana.sets = dopo === "" ? { cleared: true } : Number(dopo);
  else settimana.reps = dopo === "" ? { cleared: true } : dopo;
  nuoveSettimane[k] = settimana;

  const nuovoEsercizio = Object.assign({}, esercizio);
  if (posto.oggetto === esercizio) {
    nuovoEsercizio[posto.chiave] = nuoveSettimane;
  } else {
    nuovoEsercizio.progression = Object.assign({}, esercizio.progression, { weeks: nuoveSettimane });
  }
  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = nuovoEsercizio;
  const nuovoFoglio = Object.assign({}, f);
  nuovoFoglio[chiave] = nuovoElenco;

  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = versioneDi(dati);
  const nuovo = Object.assign({}, dati, { sheet: nuovoFoglio });
  nuovo.versione = versionePrima + 1;
  nuovo[MARCHIO_B] = {
    quando: quando,
    da: o.uid == null ? null : String(o.uid),
    ultima: "S" + (k + 1) + " " + campo
  };

  const idVoce = idVoceRegistro(quando);
  const voce = {
    idVoce: idVoce,
    quando: quando,
    tipo: "modifica-serie-ripetizioni",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nomeDi(esercizio),
    idEsercizio: testo(esercizio.id),
    settimana: k + 1,
    campo: campo,
    prima: prima,
    dopo: dopo,
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };

  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: dopo };
}

/* --- La modifica: recupero o TUT, comuni all'esercizio -------------------- */

/* In A e in B il recupero e il TUT stanno sull'esercizio, non sulla settimana:
 * `recupero` (oppure `rest`, `pausa`) e `tempo` (oppure `cadenza`), anche
 * dentro `prescription`. E' il valore che la tabella mostra: cambiarlo vale per
 * tutte le settimane. Le settimane possono portare un `rec` loro (A lo scrive):
 * quello resta com'e', e' l'eccezione della singola settimana.
 */
const CAMPI_RECUPERO = Object.freeze(["rest", "recupero", "pausa"]);
const CAMPI_TEMPO = Object.freeze(["tempo", "cadenza"]);

function haCampo(oggetto, nome) {
  return Boolean(oggetto) && typeof oggetto === "object"
    && Object.prototype.hasOwnProperty.call(oggetto, nome) && oggetto[nome] != null;
}

/* Dove sta il campo: prima dentro `prescription` (il lettore guarda li' per
 * primo), poi sull'esercizio. Se non c'e' da nessuna parte si crea sull'esercizio
 * con il nome che usa A: `recupero` e `tempo`. */
function postoCampo(esercizio, nomi, nomeNuovo) {
  const dentro = esercizio && esercizio.prescription && typeof esercizio.prescription === "object"
    ? esercizio.prescription : null;
  for (let i = 0; i < nomi.length; i += 1) {
    if (haCampo(dentro, nomi[i])) return { dentro: true, chiave: nomi[i] };
  }
  for (let i = 0; i < nomi.length; i += 1) {
    if (haCampo(esercizio, nomi[i])) return { dentro: false, chiave: nomi[i] };
  }
  return { dentro: false, chiave: nomeNuovo };
}

/* Il testo che si accetta in queste due celle: puo' essere una frase di coach
 * (il v31 lo permette), ma corta e su una riga sola. */
function testoBreve(valore, massimo) {
  const t = testo(valore).replace(/\s+/g, " ");
  if (t.length > massimo) return null;
  if (/[\u0000-\u001f]/.test(t)) return null;
  return t;
}

/* Richiesta: { idScheda, idEsercizio, esercizio, campo: "recupero"|"tempo", valore }
 * Esito come cambiaSerieRipetizioni: dati nuovi, voce del registro, prima, dopo.
 * Non c'e' la settimana: questi due campi sono dell'esercizio. */
export function cambiaRecTempo(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };

  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const esercizio = elenco[indice];
  if (!esercizio || typeof esercizio !== "object") return { ok: false, motivo: "l'esercizio non e' leggibile" };
  if (esercizio.deletedAt) return { ok: false, motivo: "l'esercizio e' cancellato" };

  const campo = r.campo === "recupero" ? "recupero" : (r.campo === "tempo" ? "tempo" : "");
  if (!campo) return { ok: false, motivo: "in questo passo si toccano solo serie, ripetizioni, recupero e TUT" };

  const prescr = prescrizione(esercizio);
  const prima = campo === "recupero" ? prescr.recupero : prescr.tempo;
  const massimo = campo === "recupero" ? 40 : 24;
  /* Il limite vale per il VALORE, non per la frase del coach: in cella c'e'
   * solo il valore (2-0-1), la frase resta nel testo e non fa fallire la
   * scrittura (Alice, 10/11/2026). */
  const grezzo = testo(r.valore).replace(/\s+/g, " ");
  /* Svuotare la cella e' una modifica legittima: il campo resta vuoto. */
  if (/[\u0000-\u001f]/.test(grezzo)) return { ok: false, motivo: "il valore si scrive in una riga sola" };
  const parti = campo === "recupero" ? separaRecupero(grezzo) : separaTempo(grezzo);
  if (!parti.valore && grezzo) {
    return {
      ok: false,
      motivo: (campo === "recupero" ? "il recupero" : "il TUT") + " non e' un valore: scrivi "
        + (campo === "recupero" ? "per esempio 2-3' oppure 90\"" : "per esempio 2-0-1")
    };
  }
  if (parti.valore.length > massimo) {
    return {
      ok: false,
      motivo: (campo === "recupero" ? "il recupero" : "il TUT") + " si scrive in una riga sola, al massimo "
        + massimo + " caratteri"
    };
  }
  const dopo = grezzo;
  if (dopo === prima) return { ok: false, motivo: "il valore non e' cambiato" };

  const nomi = campo === "recupero" ? CAMPI_RECUPERO : CAMPI_TEMPO;
  const posto = postoCampo(esercizio, nomi, campo === "recupero" ? "recupero" : "tempo");
  const nuovoEsercizio = Object.assign({}, esercizio);
  /* Passo 15 (9/11/2026): la lettura prende il PRIMO campo che trova, dentro
   * prescription e poi fuori. Le schede importate ne portano piu' di uno
   * (rest + recupero, tempo + cadenza): scriverne uno solo lascia gli altri
   * col valore vecchio e la cella torna indietro da sola. Il valore nuovo va
   * su TUTTI quelli che esistono; se non ne esiste nessuno si crea dove la
   * lettura lo cerca per primo. Il rec della singola settimana e' un'altra
   * cosa (un'eccezione della settimana) e non si tocca. */
  const dentro = esercizio && esercizio.prescription && typeof esercizio.prescription === "object"
    ? esercizio.prescription : null;
  let scritto = false;
  if (dentro) {
    let copia = null;
    for (let i = 0; i < nomi.length; i += 1) {
      if (!haCampo(dentro, nomi[i])) continue;
      if (!copia) copia = Object.assign({}, dentro);
      copia[nomi[i]] = dopo;
      scritto = true;
    }
    if (copia) nuovoEsercizio.prescription = copia;
  }
  for (let i = 0; i < nomi.length; i += 1) {
    if (!haCampo(esercizio, nomi[i])) continue;
    nuovoEsercizio[nomi[i]] = dopo;
    scritto = true;
  }
  if (!scritto) nuovoEsercizio[posto.chiave] = dopo;
  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = nuovoEsercizio;
  const nuovoFoglio = Object.assign({}, f);
  nuovoFoglio[chiave] = nuovoElenco;

  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = versioneDi(dati);
  const nuovo = Object.assign({}, dati, { sheet: nuovoFoglio });
  nuovo.versione = versionePrima + 1;
  nuovo[MARCHIO_B] = {
    quando: quando,
    da: o.uid == null ? null : String(o.uid),
    ultima: campo === "recupero" ? "rec" : "tut"
  };

  const idVoce = idVoceRegistro(quando);
  const voce = {
    idVoce: idVoce,
    quando: quando,
    tipo: "modifica-rec-tut",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nomeDi(esercizio),
    idEsercizio: testo(esercizio.id),
    settimana: null,
    campo: campo,
    prima: prima,
    dopo: dopo,
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };

  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: dopo };
}



/* --- Le progressioni del v31 (passo 20) ----------------------------------
 * Il tastino "+" della riga ("inserisci progressione sotto") e "Applica
 * progressione a tutta la scheda" non inventano niente: applicano una voce
 * delle due liste del v31 (r.7252-7298 e r.9043-9060, copiate alla lettera in
 * progressioni-b.js) alle otto settimane.
 *
 * Una scrittura sola: le 8 coppie [serie, reps] si calcolano in memoria, il
 * documento si scrive una volta con la versione nuova, e nel registro va UNA
 * voce che porta prima e dopo come array di 8 coppie. Cosi' l'Annulla del v31
 * riporta indietro tutto in un colpo, non una settimana per volta.
 */

/* Una settimana come la legge la tabella: [serie, ripetizioni] di testo. */
function coppiaDiSettimana(s) {
  const w = s && typeof s === "object" ? s : {};
  /* Le settimane portano sets/reps (e alcuni documenti serie/ripetizioni):
   * la coppia legge ENTRAMBE le forme, senno' i valori di prima escono vuoti
   * e l'Annulla cancella invece di rimettere. */
  return [testo(w.sets != null ? w.sets : w.serie), testo(w.reps != null ? w.reps : w.ripetizioni)];
}

/* Le otto coppie che l'esercizio ha adesso (le mancanti restano vuote). */
function coppieAttuali(esercizio) {
  const elenco = prescrizione(esercizio).elencoSettimane;
  const out = [];
  for (let k = 0; k < 8; k += 1) out.push(coppiaDiSettimana(elenco[k]));
  return out;
}

function stesseCoppie(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (testo(a[i][0]) !== testo(b[i][0])) return false;
    if (testo(a[i][1]) !== testo(b[i][1])) return false;
  }
  return true;
}

/* Le coppie di prima sono TUTTE vuote? E' la firma delle voci nate quando la
 * coppia leggeva i campi sbagliati (riparato il 10/11/2026): rimetterle
 * cancellerebbe le settimane invece di riportarle indietro. */
function coppieVuote(coppie) {
  const elenco = Array.isArray(coppie) ? coppie : [];
  if (!elenco.length) return true;
  return elenco.every((c) => testo(c && c[0]) === "" && testo(c && c[1]) === "");
}

/* Passo 21 — le otto coppie di una progressione custom, controllate. Se non
 * sono otto coppie, torna null e il motore non scrive niente. */
function coppieDaRichiesta(valore) {
  if (!Array.isArray(valore) || valore.length !== 8) return null;
  const out = [];
  for (let w = 0; w < 8; w += 1) {
    const c = valore[w];
    if (!Array.isArray(c) || c.length < 2) return null;
    out.push([testo(c[0]), testo(c[1])]);
  }
  return out;
}

/* Il numero resta numero quando il testo e' un numero: cosi' l'Annulla
 * riscrive il valore com'era, non "4" al posto di 4. */
function valoreCella(scritto) {
  const t = testo(scritto);
  if (t === "") return "";
  const n = Number(t);
  return String(n) === t ? n : t;
}

/* Scrive le otto coppie nelle settimane dell'esercizio, senza toccare il resto
 * della settimana (riposo, tipo, nota) e senza toccare gli altri esercizi.
 * Ritorna una COPIA: il documento di partenza non si modifica. */
function scriviCoppie(esercizio, coppie) {
  const posto = posizioneSettimane(esercizio);
  if (!posto) return null;
  const grezze = posto.chiave === "weeks" ? posto.oggetto.weeks : posto.oggetto[posto.chiave];
  const nuove = (Array.isArray(grezze) ? grezze : []).map((w) => (w && typeof w === "object" ? Object.assign({}, w) : {}));
  while (nuove.length < 8) nuove.push({});
  for (let k = 0; k < 8; k += 1) {
    const coppia = coppie[k] || ["", ""];
    const settimana = Object.assign({}, nuove[k]);
    const s = valoreCella(coppia[0]);
    const rp = testo(coppia[1]);
    settimana.sets = s === "" ? { cleared: true } : s;
    settimana.reps = rp === "" ? { cleared: true } : rp;
    nuove[k] = settimana;
  }
  const nuovoEsercizio = Object.assign({}, esercizio);
  if (posto.oggetto === esercizio) nuovoEsercizio[posto.chiave] = nuove;
  else nuovoEsercizio.progression = Object.assign({}, esercizio.progression, { weeks: nuove });
  return nuovoEsercizio;
}

/* Il documento nuovo: una versione in piu' e il marchio che ferma la Copia. */
export function chiudiDocumento(dati, foglio, chiave, elenco, quando, uid, ultima) {
  const nuovoFoglio = Object.assign({}, foglio);
  nuovoFoglio[chiave] = elenco;
  const nuovo = Object.assign({}, dati, { sheet: nuovoFoglio });
  nuovo.versione = versioneDi(dati) + 1;
  nuovo[MARCHIO_B] = { quando: quando, da: uid == null ? null : String(uid), ultima: ultima };
  return nuovo;
}

function indicePerId(elenco, id) {
  const k = testo(id);
  if (!k) return -1;
  for (let i = 0; i < elenco.length; i += 1) if (testo(elenco[i] && elenco[i].id) === k) return i;
  return -1;
}

/* Il tastino "+": una voce del v31, le otto settimane di QUELLA riga. */
/* Fase 1 — la riga figlia della tecnica. E' legata al padre SOLO da padreId:
 * niente nome, niente distretto. Nei conti NON esiste, con la progressione
 * NON si mescola: se la tocchiamo e' un errore, non un campo vuoto. */
export function eFigliaTecnica(e) {
  return Boolean(e) && typeof e === "object"
    && (e.tipo === "tecnica" || (e.padreId != null && String(e.padreId) !== ""));
}

export function applicaProgressione(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const esercizio = elenco[indice];
  if (!esercizio || typeof esercizio !== "object") return { ok: false, motivo: "l'esercizio non e' leggibile" };
  if (esercizio.deletedAt) return { ok: false, motivo: "l'esercizio e' cancellato" };
  if (eFigliaTecnica(esercizio)) return { ok: false, motivo: "la riga della tecnica non prende la progressione: si regola dal pannello della tecnica. Non ho scritto niente" };
  if (!posizioneSettimane(esercizio)) {
    return { ok: false, motivo: "questa scheda non porta le settimane scritte: la progressione si apre in un passo successivo" };
  }
  const pid = testo(r.progressione);
  /* Passo 21 — una custom non è una formula: le otto coppie arrivano dalla
   * pagina (lette dallo stesso documento del programma) e qui si controlla che
   * siano davvero otto. Senza, non si scrive niente. */
  const custom = pid.indexOf(PREFISSO_CUSTOM) === 0;
  const coppie = custom
    ? coppieDaRichiesta(r.coppieCustom)
    : coppieRiga(pid, baseDaSettimane(prescrizione(esercizio).elencoSettimane));
  if (!coppie) {
    return {
      ok: false,
      motivo: custom
        ? "la progressione custom non porta le otto settimane: non ho scritto niente"
        : "la progressione «" + pid + "» non esiste: non ho scritto niente"
    };
  }
  const nome = custom ? (testo(r.nomeProgressione) || "progressione custom") : (nomeProgressione(pid) || pid);
  const prima = coppieAttuali(esercizio);
  if (stesseCoppie(prima, coppie)) {
    return {
      ok: false,
      motivo: custom
        ? "la progressione custom «" + nome + "» non cambia nessuna cella di questa riga: non ho scritto niente."
        : "la progressione «" + nome + "» non cambia nessuna cella: come nel v31 parla di carico, non di serie e ripetizioni. Non ho scritto niente."
    };
  }
  const nuovoEsercizio = scriviCoppie(esercizio, coppie);
  if (!nuovoEsercizio) return { ok: false, motivo: "questa scheda non porta le settimane scritte" };
  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = nuovoEsercizio;
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "progressione");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "modifica-progressione",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nomeDi(esercizio),
    idEsercizio: testo(esercizio.id),
    settimana: null,
    campo: "progressione",
    progressione: pid,
    nomeProgressione: nome,
    prima: prima,
    dopo: coppie,
    dopoTesto: "8 settimane",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: coppie };
}

/* Il "x": la riga si marca come tolta, non si cancella dal documento. Le
 * settimane restano scritte (i dati non si buttano via) e le sedute passate non
 * c'entrano nulla: il Logbook tiene i nomi dentro di se', non punta qui. */
export function cancellaEsercizio(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const esercizio = elenco[indice];
  if (!esercizio || typeof esercizio !== "object") return { ok: false, motivo: "l'esercizio non e' leggibile" };
  if (esercizio.deletedAt) return { ok: false, motivo: "l'esercizio e' gia' tolto" };
  const copia = Object.assign({}, esercizio);
  copia.deletedAt = quando;
  /* La figlia segue il padre: senza questo resterebbe viva, con il padre
   * tolto, e l'annullamento la rimetterebbe sola. */
  const figli = [];
  const nuovoElenco = elenco.map((e, i) => {
    if (i === indice) return copia;
    if (eFigliaTecnica(e) && !e.deletedAt && String(e.padreId || "") === String(esercizio.id || "")) {
      figli.push(testo(e.id));
      return Object.assign({}, e, { deletedAt: quando });
    }
    return e;
  });
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "cancella-riga",
    figli: figli,
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nomeDi(esercizio),
    idEsercizio: testo(esercizio.id),
    settimana: null,
    campo: "riga",
    prima: { deletedAt: esercizio.deletedAt == null ? null : esercizio.deletedAt },
    dopo: quando,
    dopoTesto: "riga tolta",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

/* --- L'aggiunta di una riga dal Database esercizi (passo B, 12/11/2026) ---
 * Il clic su un esercizio del selettore aggiunge IN FONDO alla scheda una
 * riga nuova: il nome scelto, il distretto del catalogo scritto VERBATIM nel
 * campo muscolo (il catalogo e' l'unica fonte: nessuna traduzione, nessuna
 * normalizzazione delle righe gia' presenti), serie e ripetizioni vuote, le
 * otto settimane come le altre righe, e un id nuovo assegnato alla creazione
 * e MAI riutilizzato: non prende neanche l'id di una riga cancellata. */

/* Un id che non esiste ancora nella scheda, neanche su una riga tolta. */
function idNuovoEsercizio(elenco, genera) {
  for (let tentativo = 0; tentativo < 20; tentativo += 1) {
    const id = testo(genera(tentativo));
    if (!id) continue;
    const gia = elenco.some((e) => e && typeof e === "object" && testo(e.id) === id);
    if (!gia) return id;
  }
  return "";
}

function generaIdDiDefault() {
  return "bdb-ex-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function numeroDi(valore) {
  const n = Number(valore);
  return Number.isFinite(n) ? n : null;
}

/* Richiesta: { idScheda, esercizio: nome scelto, muscolo: distretto del catalogo }
 * Esito come le altre scritture: dati nuovi, voce del registro, id assegnato. */
export function aggiungiEsercizio(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const nome = testo(r.esercizio).replace(/\s+/g, " ");
  if (!nome) return { ok: false, motivo: "il selettore non ha passato nessun nome di esercizio: non ho scritto niente" };
  if (nome.length > 80) return { ok: false, motivo: "il nome dell'esercizio sta in 80 caratteri: non ho scritto niente" };
  const muscolo = testo(r.muscolo).replace(/\s+/g, " ");
  const elenco = f[chiave];

  const id = idNuovoEsercizio(elenco, typeof o.generaId === "function" ? o.generaId : generaIdDiDefault);
  if (!id) return { ok: false, motivo: "non ho trovato un identificativo libero: non ho scritto niente" };

  /* In fondo: l'ordine segue quello che la tabella mostra (chi non porta
   * `order` conta la sua posizione) e la riga nuova sta dopo l'ultimo. */
  let massimo = -1;
  elenco.forEach((e, i) => {
    if (!e || typeof e !== "object") return;
    const v = numeroDi(e.order != null ? e.order : e.ordine);
    massimo = Math.max(massimo, v == null ? i : v);
  });
  const riga = { id: id, name: nome };
  if (muscolo) riga.muscle = muscolo;
  riga.order = massimo + 1;
  riga.progression = { weeks: [] };
  for (let k = 0; k < 8; k += 1) riga.progression.weeks.push({});
  riga.aggiuntoInB = quando;

  const nuovoElenco = elenco.concat([riga]);
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "aggiunta-riga",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nome,
    idEsercizio: id,
    settimana: null,
    campo: "riga",
    prima: null,
    dopo: { nome: nome, muscolo: muscolo },
    dopoTesto: "riga aggiunta",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, id: id };
}

/* --- I gruppi veri (passo B.16a, 14/11/2026) ------------------------------
 * supAttivi restituisce gli id degli esercizi che stanno in un GRUPPO vero:
 * un tratto di fila di almeno DUE esercizi vivi con lo stesso campo sup. Le
 * righe tolte e le figlie delle tecniche non rompono la fila (sono
 * trasparenti) ma non contano come gruppo. Disegna solo chi e' nel tratto:
 * spostando una riga il campo resta, ma con un buco si vedono solo i tratti
 * da due in su, mai barre a buchi. */
export function supAttivi(elenco) {
  const attivi = {};
  let corrente = "";
  let tratto = [];
  const chiudi = () => {
    if (tratto.length >= 2) tratto.forEach((e) => { attivi[String(e.id || "")] = true; });
    tratto = [];
  };
  (Array.isArray(elenco) ? elenco : []).forEach((e) => {
    if (!e || typeof e !== "object" || e.deletedAt || String(e.padreId || "")) return;
    const sup = String(e.sup || "");
    if (sup && sup === corrente) tratto.push(e);
    else { chiudi(); corrente = sup; tratto = sup ? [e] : []; }
  });
  chiudi();
  return attivi;
}

/* --- La sostituzione di un esercizio (passo B.15, 14/11/2026) -------------
 * Il tasto ⇄ della riga apre il selettore del Database esercizi: alla scelta
 * la STESSA riga cambia nome e distretto. Restano id, ordine e tutti i
 * carichi gia' scritti (serie, ripetizioni, Rec, TUT, progression): chi
 * sostituisce tiene lo schema del posto e ricalibra a mano solo se serve.
 * Le righe tecniche figlie restano attaccate (puntano a padreId, che non
 * cambia): conto solo quante sono, per la voce del registro. Il Logbook non
 * si tocca: le sedute vecchie restano col nome di allora.
 * Richiesta: { idScheda, idEsercizio, esercizio: nome attuale (per il
 * ripescaggio senza id), nuovo: nome scelto dal selettore, muscolo:
 * distretto del catalogo }. */
export function sostituisciEsercizio(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const nome = testo(r.nuovo || r.esercizio).replace(/\s+/g, " ");
  if (!nome) return { ok: false, motivo: "il selettore non ha passato nessun nome di esercizio: non ho scritto niente" };
  if (nome.length > 80) return { ok: false, motivo: "il nome dell'esercizio sta in 80 caratteri: non ho scritto niente" };
  const muscolo = testo(r.muscolo).replace(/\s+/g, " ");
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const esercizio = elenco[indice];
  if (!esercizio || typeof esercizio !== "object") return { ok: false, motivo: "l'esercizio non e' leggibile" };
  if (esercizio.deletedAt) return { ok: false, motivo: "la riga e' tolta: non si sostituisce" };
  const nomeVecchio = nomeDi(esercizio);
  const muscoloVecchio = testo(esercizio.muscle || esercizio.muscolo || "");
  const figli = [];
  elenco.forEach((e) => {
    if (e && typeof e === "object" && !e.deletedAt && String(e.padreId || "") === String(esercizio.id || "")) figli.push(testo(e.id));
  });
  const copia = Object.assign({}, esercizio);
  copia.name = nome;
  if (muscolo) copia.muscle = muscolo;
  else delete copia.muscle;
  copia.sostituitoInB = quando;
  const nuovoElenco = elenco.map((e, i) => (i === indice ? copia : e));
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "sostituzione-riga",
    figli: figli,
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nome,
    idEsercizio: testo(esercizio.id),
    settimana: null,
    campo: "riga",
    prima: { nome: nomeVecchio, muscolo: muscoloVecchio },
    dopo: { nome: nome, muscolo: muscolo },
    dopoTesto: "esercizio sostituito",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

/* --- Le superserie (passo B.16a, 14/11/2026) ------------------------------
 * Il tasto anello sulla riga collega o scollega l'esercizio con quello
 * SUBITO sotto: le righe tolte e le figlie delle tecniche si saltano. Un
 * clic = UNA voce di registro = un Annulla. Il legame sta nel campo sup di
 * OGNI riga del gruppo (stesso valore). Scollegare toglie il campo alla
 * riga premuta; se una riga resta sola, il gruppo non esiste piu' e il
 * campo va via anche a lei. Due gruppi di fila che si toccano si fondono.
 * Lo spostamento non tocca il campo: il disegno guarda solo i tratti di
 * fila (supAttivi). La cancellazione (B.15 compresa) non tocca il campo
 * delle altre righe: se ne resta una sola, il tratto sparisce da solo.
 * Richiesta: { idScheda, idEsercizio, esercizio }. */
export function cambiaSuperserie(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const riga = elenco[indice];
  if (!riga || typeof riga !== "object" || riga.deletedAt) return { ok: false, motivo: "la riga non e' un esercizio vivo: il tasto superserie non agisce qui" };
  if (testo(riga.padreId)) return { ok: false, motivo: "la riga e' di una tecnica: il tasto superserie sta solo sugli esercizi" };
  let vicino = null;
  for (let i = indice + 1; i < elenco.length; i += 1) {
    const e = elenco[i];
    if (e && typeof e === "object" && !e.deletedAt && !testo(e.padreId)) { vicino = e; break; }
  }
  if (!vicino) return { ok: false, motivo: "e' l'ultimo esercizio della scheda: non c'e' nessun esercizio sotto da collegare" };
  const supA = testo(riga.sup);
  const supB = testo(vicino.sup);
  const cambi = {};
  let stacca = false;
  if (supA && supA === supB) { stacca = true; cambi[testo(riga.id)] = ""; }
  else if (supA && supB) { elenco.forEach((e) => { if (e && typeof e === "object" && testo(e.sup) === supB) cambi[testo(e.id)] = supA; }); }
  else if (supA) { cambi[testo(vicino.id)] = supA; }
  else if (supB) { cambi[testo(riga.id)] = supB; }
  else {
    const nuovo = "ss-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
    const gia = elenco.some((e) => e && typeof e === "object" && testo(e.sup) === nuovo);
    const id = gia ? nuovo + "-" + Math.random().toString(36).slice(2, 6) : nuovo;
    cambi[testo(riga.id)] = id;
    cambi[testo(vicino.id)] = id;
  }
  const copiaRiga = (e) => {
    const id = testo(e.id);
    if (Object.prototype.hasOwnProperty.call(cambi, id)) {
      const c = Object.assign({}, e);
      if (cambi[id]) c.sup = cambi[id]; else delete c.sup;
      return c;
    }
    return e;
  };
  let nuovoElenco = elenco.map(copiaRiga);
  /* Le righe rimaste sole non sono un gruppo: campo via. Le tolte e le
   * figlie sono trasparenti: non rompono la fila e non contano. */
  const cambi2 = {};
  let corrente = "";
  let lunghezza = 0;
  let singola = null;
  nuovoElenco.forEach((e) => {
    const viva = e && typeof e === "object" && !e.deletedAt && !testo(e.padreId);
    if (!viva) return;
    const sup = testo(e.sup);
    if (sup && sup === corrente) { lunghezza += 1; singola = null; }
    else {
      if (lunghezza === 1 && singola) cambi2[testo(singola.id)] = "";
      corrente = sup;
      lunghezza = sup ? 1 : 0;
      singola = sup ? e : null;
    }
  });
  if (lunghezza === 1 && singola) cambi2[testo(singola.id)] = "";
  if (Object.keys(cambi2).length) {
    nuovoElenco = nuovoElenco.map((e) => {
      const id = testo(e.id);
      if (Object.prototype.hasOwnProperty.call(cambi2, id)) { const c = Object.assign({}, e); delete c.sup; return c; }
      return e;
    });
  }
  const prima = [];
  const dopo = [];
  elenco.forEach((e, i) => {
    const dopo2 = testo(nuovoElenco[i].sup);
    const prima2 = testo(e.sup);
    if (prima2 !== dopo2) {
      prima.push({ id: testo(e.id), sup: prima2, nome: nomeDi(e) });
      dopo.push({ id: testo(e.id), sup: dopo2, nome: nomeDi(e) });
    }
  });
  if (!prima.length) return { ok: false, motivo: "non c'e' niente da cambiare: non ho scritto niente" };
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "superserie",
    figli: [],
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nomeDi(riga),
    con: nomeDi(vicino),
    idEsercizio: testo(riga.id),
    settimana: null,
    campo: "superserie",
    prima: prima,
    dopo: dopo,
    dopoTesto: (stacca ? "scollegate " : "collegate ") + nomeDi(riga) + " e " + nomeDi(vicino),
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

/* "Applica progressione a tutta la scheda" (r.3771, r.9965-10024): le otto
 * settimane di TUTTE le righe, e una voce sola con tutte le righe dentro. */
export function applicaProgressioneScheda(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  /* Passo 21 — anche una custom si applica a tutta la scheda: la sua tabella
   * è una sola, uguale per ogni riga (una formula, invece, parte dalla S1 di
   * ogni riga). */
  const pid = testo(r.progressione);
  const custom = pid.indexOf(PREFISSO_CUSTOM) === 0;
  const voceProg = custom ? null : voceScheda(pid);
  if (!custom && !voceProg) return { ok: false, motivo: "questa progressione di scheda non esiste: non ho scritto niente" };
  const coppieFisse = custom ? coppieDaRichiesta(r.coppieCustom) : null;
  if (custom && !coppieFisse) {
    return { ok: false, motivo: "la progressione custom non porta le otto settimane: non ho scritto niente" };
  }
  const nomeProg = custom ? (testo(r.nomeProgressione) || "progressione custom") : voceProg.n;

  const vive = [];
  for (let i = 0; i < elenco.length; i += 1) {
    const e = elenco[i];
    if (!e || typeof e !== "object" || e.deletedAt || eFigliaTecnica(e)) continue;
    vive.push(i);
  }
  if (!vive.length) return { ok: false, motivo: "la scheda non ha esercizi da toccare" };
  for (let k = 0; k < vive.length; k += 1) {
    if (!posizioneSettimane(elenco[vive[k]])) {
      return { ok: false, motivo: "la riga " + (vive[k] + 1) + " non porta le settimane scritte: non ho scritto niente" };
    }
  }

  const nuove = elenco.slice();
  const righe = [];
  let cambia = false;
  for (let k = 0; k < vive.length; k += 1) {
    const i = vive[k];
    const esercizio = elenco[i];
    const coppie = custom ? coppieFisse : coppieScheda(voceProg.id, baseDaSettimane(prescrizione(esercizio).elencoSettimane));
    const prima = coppieAttuali(esercizio);
    nuove[i] = scriviCoppie(esercizio, coppie);
    if (!stesseCoppie(prima, coppie)) cambia = true;
    righe.push({ idEsercizio: testo(esercizio.id), esercizio: nomeDi(esercizio), prima: prima, dopo: coppie });
  }
  if (!cambia) {
    return { ok: false, motivo: "la progressione «" + nomeProg + "» non cambia nessuna cella di questa scheda: non ho scritto niente" };
  }
  const nuovo = chiudiDocumento(dati, f, chiave, nuove, quando, o.uid, "progressione-scheda");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "modifica-progressione-scheda",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: String(righe.length) + " righe",
    idEsercizio: "",
    settimana: null,
    campo: "progressione-scheda",
    progressione: custom ? pid : voceProg.id,
    nomeProgressione: nomeProg,
    righe: righe,
    dopoTesto: String(righe.length) + " righe",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

/* --- L'annullamento delle tre scritture nuove --------------------------- */

/* Riporta indietro tutto quello che la voce dice: le otto settimane di una
 * riga, la riga tolta, o le otto settimane di tutte le righe. Un colpo solo. */
function annullaProgressione(dati, v, quando, uid) {
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  let elenco = f[chiave].slice();
  const tipo = testo(v.tipo);
  let ultima = "annulla";
  let manca = "";

  if (tipo === "cancella-riga") {
    const i = indicePerId(elenco, v.idEsercizio);
    if (i < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
    const copia = Object.assign({}, elenco[i]);
    if (v.prima && v.prima.deletedAt != null) copia.deletedAt = v.prima.deletedAt;
    else delete copia.deletedAt;
    elenco[i] = copia;
    elenco = elenco.map((e) => {
      if (eFigliaTecnica(e) && e.deletedAt && String(e.padreId || "") === String(v.idEsercizio || "")
        && (!Array.isArray(v.figli) || !v.figli.length || v.figli.indexOf(testo(e.id)) !== -1)) {
        const c = Object.assign({}, e);
        delete c.deletedAt;
        return c;
      }
      return e;
    });
    ultima = "riga rimessa";
  } else if (tipo === "modifica-progressione") {
    const i = indicePerId(elenco, v.idEsercizio);
    if (i < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
    if (coppieVuote(Array.isArray(v.prima) ? v.prima : [])) return { ok: false, motivo: "la voce non porta i valori di prima (nata prima della correzione del 10/11/2026): il ripristino non scrive niente, le celle si rimettono a mano" };
    const riportato = scriviCoppie(elenco[i], Array.isArray(v.prima) ? v.prima : []);
    if (!riportato) return { ok: false, motivo: "questa scheda non porta le settimane scritte" };
    elenco[i] = riportato;
    ultima = "progressione annullata";
  } else if (tipo === "modifica-progressione-scheda") {
    const righe = Array.isArray(v.righe) ? v.righe : [];
    if (!righe.length) return { ok: false, motivo: "la voce del registro non dice quali righe annullare" };
    const nuove = elenco.slice();
    for (let k = 0; k < righe.length; k += 1) {
      // Passo 32 B: nessuna identita valida, nessun ripristino parziale.
      if (!testo(righe[k] && righe[k].idEsercizio)) {
        return { ok: false, motivo: "ripristino non eseguito: manca un identificativo nella voce del registro (riga " + (k + 1) + "). Non ho ripristinato nessuna riga e non ho scritto niente" };
      }
      const i = indicePerId(elenco, righe[k].idEsercizio);
      if (i < 0) { manca = String(righe[k].idEsercizio || ""); break; }
      if (coppieVuote(Array.isArray(righe[k].prima) ? righe[k].prima : [])) { manca = "SENZA-PRIMA"; break; }
      const riportato = scriviCoppie(elenco[i], Array.isArray(righe[k].prima) ? righe[k].prima : []);
      if (!riportato) { manca = String(righe[k].idEsercizio || ""); break; }
      nuove[i] = riportato;
    }
    if (manca === "SENZA-PRIMA") return { ok: false, motivo: "una riga della voce non porta i valori di prima (voce nata prima della correzione del 10/11/2026): il ripristino non scrive niente, le celle si rimettono a mano" };
    if (manca) return { ok: false, motivo: "una riga della progressione non si ritrova piu' (" + manca + "): non ho scritto niente" };
    elenco = nuove;
    ultima = "progressione di scheda annullata";
  } else if (tipo === "modifica-tecnica") {
    /* La riga tecnica torna com'era: la voce porta la riga INTERA di prima. */
    const i = indicePerId(elenco, v.idEsercizio);
    if (i < 0) return { ok: false, motivo: "la riga della tecnica non si ritrova piu' in questa scheda: non ho scritto niente" };
    if (!v.prima || typeof v.prima !== "object" || !v.prima.padreId) return { ok: false, motivo: "la voce non porta la riga di prima: non ho scritto niente" };
    elenco[i] = Object.assign({}, v.prima);
    ultima = "tecnica rimessa";
  } else if (tipo === "aggiunta-riga") {
    /* La riga aggiunta si TOGLIE (per id, non per posizione): e' l'unico
     * annullamento che toglie una riga invece di rimettere i valori. */
    const i = indicePerId(elenco, v.idEsercizio);
    if (i < 0) return { ok: false, motivo: "la riga aggiunta non si ritrova piu' in questa scheda: non ho scritto niente" };
    elenco.splice(i, 1);
    ultima = "riga aggiunta tolta";
  } else {
    return { ok: false, motivo: "la voce del registro non dice cosa annullare" };
  }

  const nuovo = chiudiDocumento(dati, f, chiave, elenco, quando, uid, ultima);
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    scheda: testo(v.scheda),
    codice: codiceScheda(nuovo),
    esercizio: testo(v.esercizio),
    idEsercizio: testo(v.idEsercizio),
    settimana: null,
    campo: testo(v.campo),
    prima: v.dopo == null ? null : v.dopo,
    dopo: v.prima == null ? null : v.prima,
    dopoTesto: "prima",
    annullaDi: String(v.idVoce || ""),
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}
/* --- L'annullamento ------------------------------------------------------- */

/* Riporta il campo al valore di prima. Non cancella la voce del registro: ne
 * aggiunge una che la cita, cosi' la storia resta intera. */
export function annullaModifica(dati, voce, opzioni) {
  const v = voce || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const tipo = testo(v.tipo);
  /* PASSO 4a — il piano della scheda e la testata del programma si
   * annullano sul loro documento, non su un elenco di esercizi. */
  if (tipo === "piano-scheda" || tipo === "testata-programma") return annullaPianoETestata(dati, v, quando, o.uid);
  /* Passo 21 — l'Annulla di una voce VECCHIA sulla progressione: prima del
   * passo 31 le custom stavano nel documento del programma. Le voci nuove
   * hanno il tipo `progressioni-libreria` e si annullano sulla raccolta. */
  if (tipo === "progressioni-custom") return annullaProgressioniCustom(dati, v, quando, o.uid);

  /* B.21 — i comandi dell'igiene portano l'elenco INTERO di prima:
   * l'annullamento lo rimette in blocco, una volta sola, e con lui tornano
   * esercizi, righe figlie della tecnica, superserie e le otto settimane
   * (che stanno dentro le righe). */
  if (tipo === "svuota-scheda" || tipo === "ripristina-scheda" || tipo === "svuota-programma" || tipo === "applica-scheletro") {
    return rimettiElenco(dati, v, quando, o.uid);
  }
  /* Passo 20: progressione di una riga, riga tolta, progressione di scheda. */
  if (tipo === "modifica-progressione" || tipo === "modifica-progressione-scheda" || tipo === "cancella-riga" || tipo === "aggiunta-riga" || tipo === "modifica-tecnica") {
    return annullaProgressione(dati, v, quando, o.uid);
  }
  /* Passo B.15: la sostituzione si annulla ri-sostituendo: stessa strada
   * (idEsercizio), nome e distretto di prima, una voce sola in piu'. */
  /* Passo B.16a: l'annullamento di una superserie rimette il campo sup
   * alle righe toccate, com'era nella voce. */
  if (tipo === "superserie") {
    const prima = Array.isArray(v.prima) ? v.prima : [];
    if (!prima.length) return { ok: false, motivo: "la voce del registro non dice quali righe rimettere" };
    const f2 = foglioDi(dati);
    const chiave2 = f2 ? chiaveEsercizi(f2) : "";
    if (!chiave2) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
    const elenco2 = f2[chiave2];
    const nuovoElenco = elenco2.map((e) => {
      const id = testo(e.id);
      const tro = prima.find((p) => p && String(p.id || "") === id);
      if (!tro) return e;
      const c = Object.assign({}, e);
      if (tro.sup) c.sup = String(tro.sup); else delete c.sup;
      return c;
    });
    const nuovo = chiudiDocumento(dati, f2, chiave2, nuovoElenco, quando, o.uid, "riga");
    const voce2 = {
      idVoce: idVoceRegistro(quando),
      quando: quando,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(v.idVoce || ""),
      scheda: testo(v.scheda),
      codice: codiceScheda(nuovo),
      esercizio: testo(v.esercizio),
      idEsercizio: testo(v.idEsercizio),
      settimana: null,
      campo: "superserie",
      prima: v.dopo,
      dopo: v.prima,
      dopoTesto: "superserie rimessa come prima",
      versionePrima: versioneDi(dati),
      versioneDopo: nuovo.versione
    };
    return { ok: true, dati: nuovo, voce: voce2 };
  }

  if (tipo === "sostituzione-riga") {
    const prima = v.prima && typeof v.prima === "object" ? v.prima : {};
    if (!testo(prima.nome)) return { ok: false, motivo: "la voce del registro non dice quale nome rimettere" };
    const richiesta = {
      idScheda: v.scheda,
      idEsercizio: v.idEsercizio,
      esercizio: testo(prima.nome),
      nuovo: testo(prima.nome),
      muscolo: testo(prima.muscolo || "")
    };
    const esito = sostituisciEsercizio(dati, richiesta, { quando: quando, uid: o.uid });
    if (!esito.ok) return esito;
    const voce2 = Object.assign({}, esito.voce, {
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(v.idVoce || ""),
      prima: esito.voce.prima,
      dopo: esito.voce.dopo
    });
    return { ok: true, dati: esito.dati, voce: voce2 };
  }
  /* Passo 20 — la nota della scheda e la scheda tolta dal programma si
   * annullano sul loro documento, senza passare dagli esercizi. */
  if (tipo === "nota-scheda") {
    const f = foglioDi(dati);
    if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
    const chiave = chiaveNota(f);
    const nuovoFoglio = Object.assign({}, f);
    const primaNota = v.primaPiano == null ? "" : testo(v.primaPiano);
    if (!primaNota) delete nuovoFoglio[chiave];
    else nuovoFoglio[chiave] = primaNota;
    const nuovoDati = Object.assign({}, dati, { sheet: nuovoFoglio });
    nuovoDati.versione = versioneDi(dati) + 1;
    nuovoDati[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: "nota" };
    const voceNota = {
      idVoce: idVoceRegistro(quando),
      quando: quando,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(v.idVoce || ""),
      programma: testo(v.programma),
      scheda: testo(v.scheda),
      codice: codiceScheda(nuovoDati),
      esercizio: "",
      idEsercizio: "",
      settimana: null,
      campo: "nota",
      prima: testo(v.dopo),
      dopo: primaNota,
      dopoTesto: primaNota ? "nota della scheda rimessa com'era" : "nota della scheda tolta",
      versionePrima: versioneDi(dati),
      versioneDopo: nuovoDati.versione
    };
    return { ok: true, dati: nuovoDati, voce: voceNota };
  }

  if (tipo === "nota-esercizio") {
    const f = foglioDi(dati);
    if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
    const chiave = chiaveEsercizi(f);
    const elenco = chiave && Array.isArray(f[chiave]) ? f[chiave] : null;
    if (!elenco) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
    const indice = trovaEsercizio(elenco, { idEsercizio: v.idEsercizio, esercizio: v.esercizio });
    if (indice < 0) return { ok: false, motivo: "l'esercizio della nota non si ritrova in questa scheda" };
    const esercizio = elenco[indice];
    const primaNota = v.primaPiano == null ? testo(v.prima) : testo(v.primaPiano);
    const nuovoEsercizio = Object.assign({}, esercizio);
    let scritto = 0;
    CHIAVI_NOTA.forEach((k) => {
      if (!Object.prototype.hasOwnProperty.call(esercizio, k)) return;
      scritto += 1;
      nuovoEsercizio[k] = primaNota;
    });
    if (!scritto) {
      if (!primaNota) return { ok: false, motivo: "la riga non ha una nota da rimettere" };
      nuovoEsercizio[CHIAVI_NOTA[0]] = primaNota;
    }
    const nuovoElenco = elenco.slice();
    nuovoElenco[indice] = nuovoEsercizio;
    const nuovoFoglio = Object.assign({}, f);
    nuovoFoglio[chiave] = nuovoElenco;
    const nuovoDati = Object.assign({}, dati, { sheet: nuovoFoglio });
    nuovoDati.versione = versioneDi(dati) + 1;
    nuovoDati[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: "nota-riga" };
    const voceNota = {
      idVoce: idVoceRegistro(quando),
      quando: quando,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(v.idVoce || ""),
      scheda: testo(v.scheda),
      codice: codiceScheda(nuovoDati),
      esercizio: testo(v.esercizio),
      idEsercizio: testo(v.idEsercizio),
      settimana: null,
      campo: "nota-esercizio",
      prima: testo(v.dopo),
      dopo: primaNota,
      dopoTesto: primaNota ? "nota della riga rimessa com'era" : "nota della riga tolta",
      versionePrima: versioneDi(dati),
      versioneDopo: nuovoDati.versione
    };
    return { ok: true, dati: nuovoDati, voce: voceNota };
  }

  if (tipo === "togli-scheda") {
    const prima = v.primaPiano && typeof v.primaPiano === "object" ? v.primaPiano : {};
    const nuovoDati = Object.assign({}, dati);
    nuovoDati.kind = testo(prima.kind) || "sheet";
    if (testo(prima.archivedAt)) nuovoDati.archivedAt = testo(prima.archivedAt);
    else delete nuovoDati.archivedAt;
    if (testo(prima.toltoDalProgramma)) nuovoDati.toltoDalProgramma = testo(prima.toltoDalProgramma);
    else delete nuovoDati.toltoDalProgramma;
    nuovoDati.versione = versioneDi(dati) + 1;
    nuovoDati[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: "scheda" };
    const voceScheda = {
      idVoce: idVoceRegistro(quando),
      quando: quando,
      tipo: "annulla-modifica",
      origine: "annullamento-in-B",
      annullaDi: String(v.idVoce || ""),
      programma: testo(v.programma),
      scheda: testo(v.scheda),
      codice: codiceScheda(nuovoDati),
      esercizio: "",
      idEsercizio: "",
      settimana: null,
      campo: "scheda",
      prima: "",
      dopo: testo(v.prima),
      dopoTesto: "scheda rimessa nel programma",
      documento: testo(v.documento),
      versionePrima: versioneDi(dati),
      versioneDopo: nuovoDati.versione
    };
    return { ok: true, dati: nuovoDati, voce: voceScheda };
  }

  const campo = testo(v.campo);
  const aSettimana = campo === "serie" || campo === "ripetizioni";
  const aEsercizio = campo === "recupero" || campo === "tempo";
  if (!aSettimana && !aEsercizio) return { ok: false, motivo: "la voce del registro non dice cosa annullare" };
  const richiesta = {
    idScheda: v.scheda,
    idEsercizio: v.idEsercizio,
    esercizio: v.esercizio,
    campo: campo,
    valore: v.prima == null ? "" : v.prima
  };
  if (aSettimana) {
    if (!v.settimana) return { ok: false, motivo: "la voce del registro non dice quale settimana annullare" };
    richiesta.settimana = v.settimana;
  }
  const esito = aSettimana
    ? cambiaSerieRipetizioni(dati, richiesta, { quando: quando, uid: o.uid })
    : cambiaRecTempo(dati, richiesta, { quando: quando, uid: o.uid });
  if (!esito.ok) return esito;
  const voce2 = Object.assign({}, esito.voce, {
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    annullaDi: String(v.idVoce || ""),
    prima: esito.prima,
    dopo: esito.dopo
  });
  return { ok: true, dati: esito.dati, voce: voce2, prima: esito.prima, dopo: esito.dopo };
}

/* L'ultima modifica ancora annullabile, letta dal registro. */
export function ultimaAnnullabile(registro) {
  const elenco = (Array.isArray(registro) ? registro : []).filter((d) => d && d.dati);
  const rifatte = Object.create(null);
  elenco.forEach((d) => { if (d.dati.annullaDi) rifatte[String(d.dati.annullaDi)] = true; });
  const candidate = elenco
    .map((d) => Object.assign({}, d.dati, { idVoce: String(d.dati.idVoce || d.id || "") }))
    .filter((v) => (v.tipo === "modifica-serie-ripetizioni" || v.tipo === "modifica-rec-tut" || v.tipo === "modifica-progressione" || v.tipo === "modifica-progressione-scheda" || v.tipo === "cancella-riga" || v.tipo === "aggiunta-riga" || v.tipo === "modifica-tecnica" || v.tipo === "sostituzione-riga" || v.tipo === "superserie" || v.tipo === "attiva-programma" || v.tipo === "bozza-programma" || v.tipo === "piano-scheda" || v.tipo === "testata-programma" || v.tipo === "copia-esercizi" || v.tipo === "sposta-esercizi" || v.tipo === "scarico-tutte" || v.tipo === "applica-scheletro" || v.tipo === "nota-scheda" || v.tipo === "nota-esercizio" || v.tipo === "togli-scheda" || v.tipo === "progressioni-custom" || v.tipo === "progressioni-libreria")
      && v.idVoce && !rifatte[v.idVoce]);
  candidate.sort((a, b) => String(a.quando || "").localeCompare(String(b.quando || "")));
  return candidate.length ? candidate[candidate.length - 1] : null;
}

/* --- La protezione della Copia ------------------------------------------- */

function tabellaDi(dati) {
  const f = foglioDi(dati);
  if (!f) return [];
  const chiave = chiaveEsercizi(f);
  if (!chiave) return [];
  return f[chiave]
    .filter((e) => e && typeof e === "object" && !e.deletedAt)
    .map((e) => {
      const p = prescrizione(e);
      return { nome: nomeDi(e), settimane: p.elencoSettimane, recupero: p.recupero, tempo: p.tempo };
    });
}

/* Cosa cambia fra la scheda di A e quella di B: si guarda il contenuto della
 * scheda (esercizi, serie, ripetizioni), non i campi di servizio come la
 * versione o il marchio, che per forza sono diversi. */
export function differenzeScheda(datiA, datiB, massimo) {
  const limite = Number.isFinite(Number(massimo)) ? Number(massimo) : 6;
  const a = tabellaDi(datiA);
  const b = tabellaDi(datiB);
  const righe = [];
  let totale = 0;
  const quanti = Math.max(a.length, b.length);
  for (let i = 0; i < quanti; i += 1) {
    const ea = a[i] || { nome: "", settimane: [] };
    const eb = b[i] || { nome: "", settimane: [] };
    if (ea.nome !== eb.nome) {
      totale += 1;
      if (righe.length < limite) righe.push("esercizio " + (i + 1) + ": " + (ea.nome || "—") + " \u2192 " + (eb.nome || "—"));
    }
    /* recupero e TUT stanno sull'esercizio: se cambiano, la scheda non e'
     * «identica ad A» e la Copia lo deve dire. */
    const aEsercizio = [["recupero", "recupero"], ["tempo", "TUT"]];
    for (let c = 0; c < aEsercizio.length; c += 1) {
      const k = aEsercizio[c][0];
      if (ea[k] === eb[k]) continue;
      totale += 1;
      if (righe.length < limite) {
        righe.push(aEsercizio[c][1] + " di " + (eb.nome || ea.nome || "esercizio " + (i + 1)) +
          " " + (ea[k] || "—") + " → " + (eb[k] || "—"));
      }
    }
    const quante = Math.max(ea.settimane.length, eb.settimane.length);
    for (let k = 0; k < quante; k += 1) {
      const sa = ea.settimane[k] || { serie: "", ripetizioni: "" };
      const sb = eb.settimane[k] || { serie: "", ripetizioni: "" };
      const campi = ["serie", "ripetizioni"];
      for (let c = 0; c < campi.length; c += 1) {
        const campo = campi[c];
        if (sa[campo] === sb[campo]) continue;
        totale += 1;
        if (righe.length < limite) {
          righe.push("S" + (k + 1) + " \u00b7 " + (eb.nome || ea.nome || "esercizio " + (i + 1)) +
            " \u00b7 " + campo + " " + (sa[campo] || "—") + " \u2192 " + (sb[campo] || "—"));
        }
      }
    }
  }
  return { righe: righe, totale: totale };
}

/* Quali schede del piano non vanno scritte: quelle che in B portano il marchio
 * "modificatoInB". Per ognuna si dice cosa cambia rispetto ad A. */
export function protezioneCopia(voci, presenti) {
  const perId = Object.create(null);
  (Array.isArray(presenti) ? presenti : []).forEach((d) => {
    if (d && d.id) perId[String(d.id)] = d;
  });
  const protette = [];
  const daScrivere = [];
  (Array.isArray(voci) ? voci : []).forEach((v) => {
    if (!v || !v.id) return;
    const inB = perId[String(v.id)];
    if (!inB || !eProtetta(inB.dati)) { daScrivere.push(v); return; }
    const diff = differenzeScheda(v.dati, inB.dati, 6);
    protette.push({
      id: String(v.id),
      codice: codiceScheda(inB.dati) || String(v.id),
      quando: quandoProtetta(inB.dati),
      diversa: diff.totale > 0,
      cambia: diff.righe,
      differenze: diff.totale
    });
  });
  return { protette: protette, daScrivere: daScrivere, protetteId: protette.map((p) => p.id) };
}

/* La frase a schermo. Niente trattini bassi: si dice «zona B». */
export function testoProtezione(esito, formattaData) {
  const p = (esito && esito.protette) || [];
  if (!p.length) return "";
  const righe = [p.length === 1
    ? "1 scheda protetta: e' stata modificata in B, la copia non la tocca."
    : p.length + " schede protette: sono state modificate in B, la copia non le tocca."];
  p.forEach((s) => {
    const quando = formattaData && s.quando ? formattaData(s.quando) : s.quando;
    let riga = "Scheda " + s.codice + (quando ? " \u00b7 modificata il " + quando : "");
    if (s.diversa) {
      riga += " \u00b7 diversa da A: " + s.cambia.join("; ");
      if (s.differenze > s.cambia.length) riga += "; e altre " + (s.differenze - s.cambia.length);
    } else {
      riga += " \u00b7 identica ad A nel contenuto";
    }
    righe.push(riga);
  });
  return righe.join("\n");
}

/* --- Una scrittura alla volta per scheda --------------------------------- */

/* Le modifiche si accodano per chiave: la seconda parte quando la prima ha
 * risposto, mai insieme. E' il rimedio ai salvataggi sovrapposti di A. */
export function creaCoda() {
  const per = Object.create(null);
  return {
    esegui(chiave, lavoro) {
      const k = String(chiave == null ? "" : chiave);
      const prima = per[k] || Promise.resolve();
      const dopo = prima.then(() => lavoro(), () => lavoro());
      per[k] = dopo.then(() => {}, () => {});
      return dopo;
    }
  };
}

/* --- Fase 1: le tecniche di intensita' ------------------------------------ */

/* Il piu' rotondo: sotto il padre nasce la riga figlia. Una sola per riga:
 * se ce n'e' gia' una viva, si rifiuta e si dice di aprire il pannello. */
export function aggiungiTecnica(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const padre = elenco[indice];
  if (!padre || typeof padre !== "object" || padre.deletedAt) return { ok: false, motivo: "l'esercizio e' cancellato" };
  if (eFigliaTecnica(padre)) return { ok: false, motivo: "sotto una tecnica non nasce un'altra tecnica" };
  const idPadre = testo(padre.id);
  if (!idPadre) return { ok: false, motivo: "l'esercizio non ha un id: non ho scritto niente" };
  for (let i = 0; i < elenco.length; i += 1) {
    if (eFigliaTecnica(elenco[i]) && !elenco[i].deletedAt && String(elenco[i].padreId) === idPadre) {
      return { ok: false, motivo: "questa riga ha gia' la sua tecnica: aprila dal badge per cambiarla" };
    }
  }
  const tecnica = testo(r.tecnica);
  if (!nomeTecnica(tecnica)) return { ok: false, motivo: "la tecnica " + tecnica + " non esiste: non ho scritto niente" };
  const figlia = costruisciRigaTecnica(tecnica, idPadre, null, o.generaId ? o.generaId() : null);
  if (!figlia) return { ok: false, motivo: "la tecnica " + tecnica + " non esiste: non ho scritto niente" };
  const nuovoElenco = elenco.slice();
  nuovoElenco.splice(indice + 1, 0, figlia);
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "tecnica aggiunta");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "aggiunta-riga",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: "\u21b3 " + nomeTecnica(tecnica),
    idEsercizio: figlia.id,
    settimana: null,
    campo: "riga",
    tecnica: tecnica,
    padreId: idPadre,
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, riga: figlia };
}

/* Cambiare tecnica, parametri, settimane e nota: UNA scrittura per volta, la
 * voce porta la riga INTERA di prima, cosi' l'annulla rimette tutto. */
export function scriviTecnica(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "la riga della tecnica non si ritrova in questa scheda: non ho scritto niente" };
  const riga = elenco[indice];
  if (!riga || typeof riga !== "object" || riga.deletedAt) return { ok: false, motivo: "la riga della tecnica e' tolta" };
  if (!eTecnica(riga)) return { ok: false, motivo: "questa riga non e' una tecnica" };
  const prima = JSON.parse(JSON.stringify(riga));
  const sottocampo = testo(r.sottocampo);
  let nuova = null;

  if (sottocampo === "cambia") {
    const tecnicaNuova = testo(r.tecnica);
    if (!nomeTecnica(tecnicaNuova)) return { ok: false, motivo: "la tecnica " + tecnicaNuova + " non esiste: non ho scritto niente" };
    if (tecnicaNuova === riga.tecnica) return { ok: false, motivo: "la tecnica non e' cambiata" };
    nuova = tecnicaCambiata(riga, tecnicaNuova);
  } else if (sottocampo === "parametri") {
    const parametri = r.parametri && typeof r.parametri === "object" ? r.parametri : null;
    if (!parametri) return { ok: false, motivo: "il pannello non ha passato i parametri" };
    const valida = parametriValidi(riga.tecnica, parametri);
    if (!valida.ok) return { ok: false, motivo: valida.motivo + ": non ho scritto niente" };
    nuova = Object.assign({}, riga, { parametri: parametri });
    /* La nota automatica segue i parametri; quella scritta a mano NO. */
    nuova.nota = { auto: notaAutoTecnica(riga.tecnica, parametri), manuale: riga["nota"] && riga["nota"].manuale != null ? String(riga["nota"].manuale) : null };
  } else if (sottocampo === "settimana") {
    const k = Number(r.settimana) - 1;
    if (!Number.isInteger(k) || k < 0 || k > 30) return { ok: false, motivo: "settimana non valida" };
    const campoCella = r.campoCella === "serie" ? "serie" : (r.campoCella === "reps" ? "reps" : "");
    if (!campoCella) return { ok: false, motivo: "in questo passo si toccano solo serie e ripetizioni della tecnica" };
    const valore = testo(r.valore).replace(/\s+/g, " ");
    const settimane = (Array.isArray(riga.settimane) ? riga.settimane : []).map((w) => (w && typeof w === "object" ? Object.assign({}, w) : {}));
    while (settimane.length <= k) settimane.push({});
    if (campoCella === "serie" && valore !== "") {
      const n = intero(valore);
      if (n == null || n < 1 || n > 99) return { ok: false, motivo: "le serie si scrivono con un numero da 1 a 99" };
    }
    if (campoCella === "reps" && valore !== "") {
      if (valore.length > 40) return { ok: false, motivo: "le ripetizioni stanno in 40 caratteri" };
      if (/[\u0000-\u001f\u007f]/.test(valore)) return { ok: false, motivo: "le ripetizioni si scrivono su una riga sola" };
    }
    settimane[k][campoCella] = valore === "" ? { cleared: true } : (campoCella === "serie" && String(Number(valore)) === valore ? Number(valore) : valore);
    nuova = Object.assign({}, riga, { settimane: settimane });
  } else if (sottocampo === "nota") {
    const manuale = r.manuale == null ? null : testo(r.manuale);
    nuova = Object.assign({}, riga, { nota: { auto: notaAutoTecnica(riga.tecnica, riga.parametri), manuale: manuale === "" ? null : manuale } });
  } else {
    return { ok: false, motivo: "la voce non dice cosa cambiare della tecnica" };
  }
  if (!nuova) return { ok: false, motivo: "non ho scritto niente" };

  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = nuova;
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "tecnica");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "modifica-tecnica",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: "\u21b3 " + nomeTecnica(nuova.tecnica),
    idEsercizio: testo(nuova.id),
    settimana: r.settimana == null ? null : Number(r.settimana),
    campo: "tecnica",
    tecnica: nuova.tecnica,
    padreId: testo(nuova.padreId),
    prima: prima,
    dopo: JSON.parse(JSON.stringify(nuova)),
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: nuova };
}

/* Rimuovere la tecnica: la riga figlia si marca tolta, come gli esercizi. */
export function rimuoviTecnica(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "la riga della tecnica non si ritrova in questa scheda: non ho scritto niente" };
  const riga = elenco[indice];
  if (!riga || typeof riga !== "object") return { ok: false, motivo: "la riga non e' leggibile" };
  if (riga.deletedAt) return { ok: false, motivo: "la tecnica e' gia' tolta" };
  if (!eTecnica(riga)) return { ok: false, motivo: "questa riga non e' una tecnica" };
  const copia = Object.assign({}, riga);
  copia.deletedAt = quando;
  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = copia;
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "tecnica tolta");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "cancella-riga",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: "\u21b3 " + nomeTecnica(riga.tecnica),
    idEsercizio: testo(riga.id),
    settimana: null,
    campo: "riga",
    tecnica: riga.tecnica,
    padreId: testo(riga.padreId),
    prima: { deletedAt: riga.deletedAt == null ? null : riga.deletedAt },
    dopo: quando,
    dopoTesto: "tecnica tolta",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

/* --- B.21 · l'annullamento dell'igiene ---------------------------------- */

/* La voce porta `prima` = l'elenco intero com'era. Qui si rimette quello e
 * nient'altro: una voce nuova cita quella annullata, la storia resta intera. */
function rimettiElenco(dati, voce, quando, uid) {
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const prima = Array.isArray(voce.prima) ? voce.prima : null;
  if (!prima) return { ok: false, motivo: "la voce del registro non porta l'elenco di prima" };
  const nuovo = chiudiDocumento(dati, f, chiave, prima, quando, uid, "riga");
  const voce2 = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    annullaDi: String(voce.idVoce || ""),
    scheda: testo(voce.scheda),
    codice: codiceScheda(nuovo),
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "scheda",
    prima: null,
    dopo: null,
    dopoTesto: "scheda rimessa com'era",
    versionePrima: versioneDi(dati),
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce2 };
}


/* ---------- PASSO 4a: il piano della scheda e la testata del programma ---- */

/* Dove stanno le settimane di una riga: `progression.weeks`, `weeks` oppure
 * `prescription.weeks`. Si riscrivono nello stesso posto, senza spostarle. */
function postoWeeks(esercizio) {
  if (!esercizio || typeof esercizio !== "object") return null;
  if (Array.isArray(esercizio.weeks)) return { dentro: "riga", elenco: esercizio.weeks };
  if (esercizio.progression && Array.isArray(esercizio.progression.weeks)) return { dentro: "progression", elenco: esercizio.progression.weeks };
  if (esercizio.prescription && Array.isArray(esercizio.prescription.weeks)) return { dentro: "prescription", elenco: esercizio.prescription.weeks };
  return null;
}

function riscriviWeeks(esercizio, posto, nuove) {
  const copia = Object.assign({}, esercizio);
  if (posto.dentro === "progression") copia.progression = Object.assign({}, esercizio.progression, { weeks: nuove });
  else if (posto.dentro === "prescription") copia.prescription = Object.assign({}, esercizio.prescription, { weeks: nuove });
  else copia.weeks = nuove;
  return copia;
}

/* Storico di una percentuale/una settimana: '' vuol dire «non registrato».
 * Settimana vuota = si toglie il piano (e la settimana non resta segnata come
 * scarico). La percentuale NON tocca serie e ripetizioni: e' un'annotazione. */
export function cambiaPianoScheda(dati, richiesta, opzioni) {
  /* PASSO 4c-anticipo: il test non si scrive piu': lo riconoscono le celle
   * della scheda. Il vecchio pianoTest resta nel documento, ignorato. */
  if (testo((richiesta || {}).campo) === "test") return { ok: false, motivo: "il test si legge dalle celle della scheda: non si scrive piu'" };
  const r = richiesta || {};
  const o = opzioni || {};
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const campo = r.campo === "scarico" ? "scarico" : (r.campo === "test" ? "test" : "");
  if (!campo) return { ok: false, motivo: "in questo passo si registrano solo scarico e test" };
  const quante = settimaneScheda(dati);
  const vuoto = testo(r.settimana) === "" && (campo === "test" || testo(r.volume) === "");

  let settimana = null;
  let volume = null;
  if (!vuoto) {
    const s = validaSettimana(r.settimana, quante);
    if (!s.ok) return { ok: false, motivo: s.motivo };
    settimana = s.settimana;
    if (campo === "scarico") {
      const v = validaVolume(r.volume);
      if (!v.ok) return { ok: false, motivo: v.motivo };
      volume = v.volume;
    }
  }

  const attuale = leggiPiano(dati);
  const prima = campo === "scarico"
    ? (attuale.scarico ? "S" + attuale.scarico.settimana + " · vol −" + attuale.scarico.volume + "%" : "")
    : (attuale.test ? "S" + attuale.test.settimana : "");
  const dopo = vuoto ? "" : (campo === "scarico" ? "S" + settimana + " · vol −" + volume + "%" : "S" + settimana);
  if (prima === dopo) return { ok: false, motivo: "il valore non e' cambiato" };

  const nuovoFoglio = Object.assign({}, f);
  const primaPiano = campo === "scarico"
    ? (f.pianoScarico == null ? null : Object.assign({}, f.pianoScarico))
    : (f.pianoTest == null ? null : Object.assign({}, f.pianoTest));
  const chiavePiano = campo === "scarico" ? "pianoScarico" : "pianoTest";

  /* Lo scarico segna anche la settimana come «deload» in ogni riga che ha
   * quella settimana: la settimana e il piano dicono la stessa cosa. Le serie
   * e le ripetizioni restano quelle scritte. */
  const tipiPrima = [];
  if (campo === "scarico") {
    const chiave = chiaveEsercizi(f);
    if (chiave && settimana != null) {
      const k = settimana - 1;
      nuovoFoglio[chiave] = f[chiave].map((e) => {
        const posto = postoWeeks(e);
        if (!posto || k >= posto.elenco.length) return e;
        const w = posto.elenco[k];
        tipiPrima.push({ id: testo(e && e.id), tipo: w && w.type ? testo(w.type) : "" });
        const nuove = posto.elenco.map((x, i) => (i === k ? Object.assign({}, x && typeof x === "object" ? x : {}, { type: vuoto ? "" : "deload" }) : x));
        return riscriviWeeks(e, posto, nuove);
      });
    } else if (chiave && vuoto === false) {
      /* nessuna riga con le settimane: il piano resta un'annotazione */
    }
  }

  if (vuoto) delete nuovoFoglio[chiavePiano];
  else nuovoFoglio[chiavePiano] = campo === "scarico" ? { settimana: settimana, volume: volume } : { settimana: settimana };

  const versionePrima = versioneDi(dati);
  const nuovo = Object.assign({}, dati, { sheet: nuovoFoglio });
  nuovo.versione = versionePrima + 1;
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  nuovo[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: campo };

  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "piano-scheda",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: "",
    idEsercizio: "",
    settimana: settimana,
    campo: campo,
    prima: prima,
    dopo: dopo,
    primaPiano: primaPiano,
    tipiPrima: tipiPrima,
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: dopo };
}

/* La testata del programma: data di inizio, fase, giorni a settimana,
 * settimane di durata e rotazione delle schede. Sono tutti campi del
 * documento-programma, non della scheda. */
const CAMPI_TESTATA = Object.freeze({
  inizio: "startDate",
  fase: "phase",
  giorni: "daysPerWeek",
  settimane: "durationWeeks",
  rotazione: "rotation",
  /* Passo 16 — la carta Programma le mostrava come testo da leggere: ora si
   * scrivono come gli altri campi della testata. */
  descrizione: "description",
  messaggio: "message"
});

/* I due testi liberi: quanto si può scrivere, per non gonfiare il documento. */
const LUNGHEZZA_MASSIMA = Object.freeze({ descrizione: 2000, messaggio: 1000 });

/* "A B C D" / "A,B,C,D" / "ABCD" -> ["A","B","C","D"].
 * Si normalizza in maiuscolo e si tolgono spazi, virgole, punto e virgola e
 * punto mediano. Qualunque altro carattere (numeri, simboli, lettere
 * accentate) e' un RIFIUTO: se si ripulisse di nascosto, "A1B" diventerebbe
 * "AB" e sembrerebbe giusto invece di essere un errore da correggere. */
export function lettereRotazione(valore) {
  const grezzo = testo(valore).toUpperCase();
  if (!grezzo) return { ok: true, lettere: [] };
  if (!/^[A-Z\s,;·]+$/.test(grezzo)) {
    return {
      ok: false,
      lettere: [],
      motivo: "la rotazione si scrive con le lettere delle schede (A-Z) separate da spazi o virgole, per esempio A B C D"
    };
  }
  const lettere = grezzo.replace(/[^A-Z]/g, "").split("");
  if (lettere.length > 7) {
    return { ok: false, lettere: [], motivo: "la rotazione ha " + lettere.length + " schede: il massimo e' 7" };
  }
  const doppie = lettere.filter((c, i) => lettere.indexOf(c) !== i)
    .filter((c, i, elenco) => elenco.indexOf(c) === i);
  if (doppie.length) {
    return { ok: false, lettere: [], motivo: "la rotazione ripete " + doppie.join(", ") + ": ogni lettera va scritta una volta sola" };
  }
  return { ok: true, lettere: lettere };
}

/* I programmi v2 tengono i campi della testata DENTRO `programMeta` (la lettura
 * restituisce proprio il meta come programma). Scriverli in cima al documento li
 * rendeva invisibili alla pagina e al telefono: la scrittura «riusciva» e il
 * valore non cambiava mai. Passo 15b. */
function contenitoreTestata(dati) {
  const d = dati || {};
  if (d.programMeta && typeof d.programMeta === "object") return d.programMeta;
  if (d.program && typeof d.program === "object") return d.program;
  return d;
}

export function cambiaTestataProgramma(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  if (!dati || typeof dati !== "object") return { ok: false, motivo: "questo documento non e' un programma" };
  const nomeCampo = testo(r.campo);
  const campo = Object.prototype.hasOwnProperty.call(CAMPI_TESTATA, nomeCampo) ? nomeCampo : "";
  if (!campo) return { ok: false, motivo: "i campi della testata sono data di inizio, fase, giorni a settimana, settimane, rotazione, descrizione e messaggio per l'atleta" };
  const FASI = ["Bulk", "Cut", "Recomp", "Mantenimento"];
  const grezzo = testo(r.valore);
  const chiave = CAMPI_TESTATA[campo];
  let valore;   /* quello che finisce nel documento */
  let dopo;     /* quello che si legge nella voce del registro */
  if (campo === "fase") {
    if (grezzo && FASI.indexOf(grezzo) === -1) return { ok: false, motivo: "la fase va scelta fra Bulk, Cut, Recomp e Mantenimento" };
    valore = grezzo || null;
    dopo = grezzo;
  } else if (campo === "inizio") {
    if (grezzo) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(grezzo);
      if (!m) return { ok: false, motivo: "la data va scritta come aaaa-mm-gg" };
      const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      if (d.getUTCFullYear() !== Number(m[1]) || d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCDate() !== Number(m[3])) {
        return { ok: false, motivo: "quella data non esiste nel calendario" };
      }
    }
    valore = grezzo || null;
    dopo = grezzo;
  } else if (campo === "giorni" || campo === "settimane") {
    const massimo = campo === "giorni" ? 7 : 52;
    if (!grezzo) {
      valore = null;
      dopo = "";
    } else {
      if (!/^\d{1,2}$/.test(grezzo) || Number(grezzo) < 1 || Number(grezzo) > massimo) {
        return {
          ok: false,
          motivo: campo === "giorni"
            ? "i giorni a settimana vanno da 1 a 7: scrivi un numero intero"
            : "le settimane vanno da 1 a 52: scrivi un numero intero"
        };
      }
      valore = Number(grezzo);
      dopo = String(valore);
    }
  } else if (campo === "descrizione" || campo === "messaggio") {
    /* Testo libero: si conservano gli a capo, si toglie solo lo spazio di
     * troppo ai bordi. Vuoto = campo tolto. */
    if (grezzo.length > LUNGHEZZA_MASSIMA[campo]) {
      return {
        ok: false,
        motivo: (campo === "descrizione" ? "la descrizione" : "il messaggio per l'atleta") +
          " supera i " + LUNGHEZZA_MASSIMA[campo] + " caratteri: accorcialo di " +
          (grezzo.length - LUNGHEZZA_MASSIMA[campo])
      };
    }
    valore = grezzo || null;
    dopo = grezzo;
  } else {
    const letto = lettereRotazione(grezzo);
    if (!letto.ok) return { ok: false, motivo: letto.motivo };
    valore = letto.lettere.length ? letto.lettere : null;
    dopo = valore ? valore.join(" \u00b7 ") : "";
  }

  /* Il valore di prima, nella stessa forma: per la rotazione un elenco, per i
   * numeri un numero. Serve all'Annulla per rimettere esattamente com'era. */
  const primaGrezza = contenitoreTestata(dati)[chiave];
  let primaPiano;
  let prima;
  if (campo === "rotazione") {
    const lettoPrima = lettereRotazione(primaGrezza);
    primaPiano = lettoPrima.ok ? lettoPrima.lettere : [];
    prima = primaPiano.join(" \u00b7 ");
  } else if (campo === "giorni" || campo === "settimane") {
    const n = primaGrezza == null || primaGrezza === "" ? null : Number(primaGrezza);
    primaPiano = n == null || !Number.isFinite(n) ? null : n;
    prima = primaPiano == null ? "" : String(primaPiano);
  } else {
    prima = testo(primaGrezza);
    primaPiano = prima === "" ? null : prima;
  }

  const uguale = campo === "rotazione"
    ? (primaPiano.join("|") === (valore == null ? "" : valore.join("|")))
    : (prima === dopo);
  if (uguale) return { ok: false, motivo: "il valore non e' cambiato" };

  const nuovo = Object.assign({}, dati);
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const dentro = contenitoreTestata(nuovo);
  if (dentro === nuovo) {
    if (valore == null || valore === "") delete nuovo[chiave];
    else nuovo[chiave] = valore;
  } else {
    const meta = Object.assign({}, dentro);
    if (valore == null || valore === "") delete meta[chiave];
    else meta[chiave] = valore;
    meta.updatedAt = quando;
    nuovo[dati.programMeta ? "programMeta" : "program"] = meta;
  }
  const versionePrima = Number(dati.versione) || 0;
  nuovo.versione = versionePrima + 1;
  nuovo[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: campo };

  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "testata-programma",
    origine: "modifica-fatta-in-B",
    programma: testo(r.idProgramma),
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: campo,
    prima: prima,
    dopo: dopo,
    primaPiano: primaPiano,
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: dopo };
}

/* ---------- La nota della scheda (passo 20) --------------------------------
 * Alice (26/11/2026): «nelle note della scheda in programmi non mi fa
 * scrivere». La textarea nasceva `readOnly` e la nota non aveva una strada di
 * scrittura. Qui c'e' quella strada, la stessa di un campo della testata:
 * si scrive DENTRO il foglio del documento («sheet»), che e' dove la lettura
 * la cerca (`scheda.note` di schede-v2), con versione +1, il marchio di B, la
 * voce del registro e l'Annulla. Scriverla un livello troppo in alto era il
 * guasto del passo 15b: la scrittura «riusciva» e il valore non tornava mai.
 *
 * Il testo conserva gli a capo e gli spazi interni; si tolgono solo quelli ai
 * bordi. Vuoto = nota tolta dalla scheda. Oltre il tetto si rifiuta, invece
 * di tagliare di nascosto.
 */
export const LUNGHEZZA_MASSIMA_NOTA = 2000;

/* Le chiavi con cui A ha scritto la nota, nell'ordine di schede-v2. Si scrive
 * quella che c'e' gia', cosi' non si crea un secondo campo che la lettura
 * preferirebbe al primo. */
const CHIAVI_NOTA = Object.freeze(["note", "nota", "note2"]);

function chiaveNota(foglio) {
  for (let i = 0; i < CHIAVI_NOTA.length; i += 1) {
    if (Object.prototype.hasOwnProperty.call(foglio, CHIAVI_NOTA[i])) return CHIAVI_NOTA[i];
  }
  return "note";
}

export function cambiaNotaScheda(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const valore = testo(r.valore);
  if (valore.length > LUNGHEZZA_MASSIMA_NOTA) {
    return {
      ok: false,
      motivo: "la nota della scheda supera i " + LUNGHEZZA_MASSIMA_NOTA + " caratteri: accorciala di " +
        (valore.length - LUNGHEZZA_MASSIMA_NOTA)
    };
  }
  const chiave = chiaveNota(f);
  const prima = testo(f[chiave]);
  if (prima === valore) return { ok: false, motivo: "il valore non e' cambiato" };

  const nuovoFoglio = Object.assign({}, f);
  if (!valore) delete nuovoFoglio[chiave];
  else nuovoFoglio[chiave] = valore;

  const versionePrima = versioneDi(dati);
  const nuovo = Object.assign({}, dati, { sheet: nuovoFoglio, versione: versionePrima + 1 });
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  nuovo[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: "nota" };

  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "nota-scheda",
    origine: "modifica-fatta-in-B",
    programma: testo(r.idProgramma),
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "nota",
    prima: prima,
    dopo: valore,
    primaPiano: prima === "" ? null : prima,
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: valore };
}

/* ---------- La Descr./Setup della riga (passo 26) --------------------------
 * Alice (27/11/2026): «è in descrizione/setup che non mi fa scrivere». La
 * colonna della tabella mostra `e.nota`: la nota dell'ESERCIZIO, non quella
 * della scheda. Qui c'e' la strada di scrittura: si rilegge la scheda, si
 * scrive sull'esercizio che ha quell'id, con versione +1, il marchio di B, la
 * voce del registro e l'Annulla.
 *
 * Le chiavi sono le stesse che legge schede-v2 (note, nota, note2): si
 * scrivono TUTTE quelle che esistono gia', cosi' nessuna vista resta col
 * valore vecchio; se non ce n'e' nessuna si crea `note`, che e' la prima che
 * la lettura guarda. Vuoto = nota tolta dalla riga.
 */
export const LUNGHEZZA_MASSIMA_NOTA_RIGA = 1000;

function notaDiEsercizio(esercizio) {
  const e = esercizio && typeof esercizio === "object" ? esercizio : {};
  for (let i = 0; i < CHIAVI_NOTA.length; i += 1) {
    if (Object.prototype.hasOwnProperty.call(e, CHIAVI_NOTA[i])) return { chiave: CHIAVI_NOTA[i], valore: testo(e[CHIAVI_NOTA[i]]) };
  }
  return { chiave: "", valore: "" };
}

export function cambiaNotaEsercizio(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  const chiave = chiaveEsercizi(f);
  if (!chiave) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const elenco = f[chiave];
  if (!Array.isArray(elenco)) return { ok: false, motivo: "la scheda non ha un elenco di esercizi" };
  const indice = trovaEsercizio(elenco, r);
  if (indice < 0) return { ok: false, motivo: "l'esercizio non si ritrova in questa scheda: non ho scritto niente" };
  const esercizio = elenco[indice];
  if (!esercizio || typeof esercizio !== "object") return { ok: false, motivo: "l'esercizio non e' leggibile" };
  if (esercizio.deletedAt) return { ok: false, motivo: "l'esercizio e' cancellato" };

  const valore = String(r.valore == null ? "" : r.valore).replace(/\r\n?/g, "\n").trim();
  if (valore.length > LUNGHEZZA_MASSIMA_NOTA_RIGA) {
    return {
      ok: false,
      motivo: "la descrizione supera i " + LUNGHEZZA_MASSIMA_NOTA_RIGA + " caratteri: accorciala di " +
        (valore.length - LUNGHEZZA_MASSIMA_NOTA_RIGA)
    };
  }
  const letto = notaDiEsercizio(esercizio);
  const prima = letto.valore;
  if (prima === valore) return { ok: false, motivo: "il valore non e' cambiato" };

  const nuovoEsercizio = Object.assign({}, esercizio);
  let scritto = 0;
  CHIAVI_NOTA.forEach((k) => {
    if (!Object.prototype.hasOwnProperty.call(esercizio, k)) return;
    scritto += 1;
    /* La chiave resta anche quando il testo si svuota: la riga torna com'era
     * senza cambiare forma, e l'Annulla può rimetterci il testo. */
    nuovoEsercizio[k] = valore;
  });
  if (!scritto) {
    if (!valore) return { ok: false, motivo: "il valore non e' cambiato" };
    nuovoEsercizio[CHIAVI_NOTA[0]] = valore;
  }

  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = nuovoEsercizio;
  const nuovoFoglio = Object.assign({}, f);
  nuovoFoglio[chiave] = nuovoElenco;

  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = versioneDi(dati);
  const nuovo = Object.assign({}, dati, { sheet: nuovoFoglio });
  nuovo.versione = versionePrima + 1;
  nuovo[MARCHIO_B] = {
    quando: quando,
    da: o.uid == null ? null : String(o.uid),
    ultima: "nota-riga"
  };

  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "nota-esercizio",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idScheda),
    codice: codiceScheda(nuovo),
    esercizio: nomeDi(esercizio),
    idEsercizio: testo(esercizio.id),
    settimana: null,
    campo: "nota-esercizio",
    prima: prima,
    dopo: valore,
    primaPiano: prima === "" ? null : prima,
    dopoTesto: valore ? "nota della riga salvata" : "nota della riga tolta",
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };

  return { ok: true, dati: nuovo, voce: voce, prima: prima, dopo: valore };
}

/* Quante serie sono scritte nella scheda, sommando le settimane di ogni riga.
 * Serve alla conferma del cestino: una scheda che esce si porta via questo
 * numero, e Alice lo legge prima di dire di si'. Le righe di tecnica non
 * portano serie proprie e non si contano. Un valore che non e' un numero non
 * si conta: meglio un totale un filo basso che un numero inventato. */
export function serieDellaScheda(dati) {
  const f = foglioDi(dati);
  if (!f) return 0;
  const chiave = chiaveEsercizi(f);
  if (!chiave) return 0;
  let totale = 0;
  (Array.isArray(f[chiave]) ? f[chiave] : []).forEach((e) => {
    if (!e || typeof e !== "object" || e.deletedAt || e.tipo === "tecnica") return;
    const posto = posizioneSettimane(e);
    if (!posto) return;
    (Array.isArray(posto.oggetto[posto.chiave]) ? posto.oggetto[posto.chiave] : []).forEach((w) => {
      const n = Number(w && w.sets);
      if (Number.isFinite(n) && n > 0) totale += n;
    });
  });
  return totale;
}

/* ---------- Togliere una scheda dal programma (passo 20) -------------------
 * Alice (26/11/2026): «aggiungere pulsante elimina accanto alle schede».
 *
 * Cosa vuol dire «togliere», e cosa NON vuol dire: la scheda esce dal
 * programma, ma il documento non si cancella — nessun dato si perde. Il
 * documento prende `toltoDalProgramma` (il quando), `kind: "archived"` e il
 * marchio di B, con versione +1; da quel momento la ricostruzione delle schede
 * lo salta, quindi la scheda non compare piu' in Programmi, ne' nei conti
 * dell'Archivio, ne' nel Confronto. L'Annulla rimette il documento com'era
 * (kind di prima, `toltoDalProgramma` via), e con lui tornano esercizi e
 * settimane: sono ancora li', intatti.
 *
 * Non si tocca niente d'altro: il documento del programma resta com'e'
 * (compresa la rotazione, che se cita la lettera tolta lo dice a schermo),
 * il Logbook, le sedute e lo storico non si sfiorano. E l'ultima scheda di un
 * programma non si toglie: un programma senza schede non si puo' usare.
 */
export function togliSchedaDalProgramma(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
  if (testo(dati && dati.toltoDalProgramma)) {
    return { ok: false, motivo: "questa scheda e' gia' fuori dal programma" };
  }
  /* `schedeAttive` e' quante schede il programma ha ADESSO, questa compresa:
   * con una sola scheda non si toglie niente, perche' resterebbe un programma
   * senza schede, che non si puo' usare. */
  if (Number(r.schedeAttive) === 1) {
    return {
      ok: false,
      motivo: "e' l'ultima scheda del programma: un programma senza schede non si puo' usare, quindi non la tolgo"
    };
  }
  const codice = codiceScheda(dati);
  const nome = testo(f.name || f.nome);
  const versionePrima = versioneDi(dati);
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const nuovo = Object.assign({}, dati, {
    kind: "archived",
    archivedAt: quando,
    toltoDalProgramma: quando,
    versione: versionePrima + 1
  });
  nuovo[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: "scheda" };

  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "togli-scheda",
    origine: "modifica-fatta-in-B",
    programma: testo(r.idProgramma),
    scheda: testo(r.idScheda),
    codice: codice,
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "scheda",
    prima: "Scheda " + codice + (nome ? " — " + nome : ""),
    dopo: "",
    /* Il documento da rimettere, per id: la scheda tolta non e' piu' nella
     * mappa delle schede attive, quindi l'Annulla non puo' ritrovarla per id
     * di scheda. E qui c'e' com'era: `kind` di prima e nessun `toltoDalProgramma`. */
    documento: testo(r.idDocumento),
    primaPiano: {
      kind: testo(dati.kind) || "sheet",
      archivedAt: testo(dati.archivedAt),
      toltoDalProgramma: testo(dati.toltoDalProgramma)
    },
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, codice: codice, nome: nome };
}

/* ---------- Eliminare un programma (passo 25) ------------------------------
 * Alice (27/11/2026): «1 cestino solo per programma, e lo voglio solo
 * nell'archivio che poi se lo cancello da lì sparisce automaticamente da tutte
 * le parti».
 *
 * Cosa vuol dire «eliminare», e cosa NON vuol dire: il programma esce da ogni
 * vista (Archivio, Cambia, Confronto, Prospetto, e non risulta più attivo),
 * ma il documento non si cancella e le regole Firestore non si toccano. Il
 * documento prende il marchio `eliminato` con quando e chi, piu' il marchio di
 * B e la versione +1; da quel momento ogni lettura lo salta
 * (comune/lettura-b.js, `programmiDaDocumenti`). Resta in B: un giro futuro
 * lo puo' recuperare senza aver perso niente.
 *
 * Il programma IN USO non si elimina: lo dice il documento stesso (status
 * active / active: true) e lo dice la pagina (`richiesta.attivo`). Non si
 * inventa un «programma attivo» vuoto.
 *
 * Non si tocca niente d'altro: le schede restano in B, il Logbook, le sedute e
 * lo storico pure. Se torna, torna com'era.
 */
export function eliminaProgrammaDocumento(dati, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  if (!dati || typeof dati !== "object") return { ok: false, motivo: "questo documento non e' un programma" };
  if (dati.eliminato === true || testo(dati.eliminato)) {
    return { ok: false, motivo: "questo programma e' gia' marcato eliminato" };
  }
  const meta = contenitoreTestata(dati);
  const inUso = r.attivo === true
    || String(meta.status == null ? "" : meta.status).toLowerCase() === "active"
    || meta.active === true;
  if (inUso) {
    return {
      ok: false,
      motivo: "e' il programma in uso: aprine un altro, poi eliminalo"
    };
  }
  const nome = testo(meta.name || meta.nome);
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const versionePrima = versioneDi(dati);
  const nuovo = Object.assign({}, dati, {
    eliminato: true,
    eliminatoIl: quando,
    eliminatoDa: o.uid == null ? null : String(o.uid),
    versione: versionePrima + 1
  });
  nuovo[MARCHIO_B] = { quando: quando, da: o.uid == null ? null : String(o.uid), ultima: "elimina-programma" };

  const conta = r.conta && typeof r.conta === "object" ? r.conta : {};
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "elimina-programma",
    origine: "modifica-fatta-in-B",
    programma: testo(r.idDocumento),
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "programma",
    nome: nome,
    prima: "Programma" + (nome ? " «" + nome + "»" : ""),
    dopo: "",
    dopoTesto: "programma marcato eliminato: il documento resta in B",
    conta: {
      schede: conta.schede == null ? null : Number(conta.schede),
      esercizi: conta.esercizi == null ? null : Number(conta.esercizi),
      serie: conta.serie == null ? null : Number(conta.serie)
    },
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce, nome: nome };
}

/* L'annullamento delle modifiche qui sopra. */
/* Passo 21 — l'Annulla di una scrittura sulle progressioni custom: si rimette
 * l'elenco INTERO di prima (creare, duplicare, modificare, rinominare ed
 * eliminare si annullano tutti allo stesso modo). Niente si cancella: la voce
 * dell'Annulla cita quella che ha annullato. */
function annullaProgressioniCustom(dati, v, quando, uid) {
  const nuovo = Object.assign({}, dati);
  const elenco = (Array.isArray(v.prima) ? v.prima : []).map((x) => {
    const voce = x && typeof x === "object" ? x : {};
    const settimane = [];
    const lette = Array.isArray(voce.settimane) ? voce.settimane : [];
    for (let w = 0; w < 8; w += 1) {
      const s = lette[w] && typeof lette[w] === "object" ? lette[w] : {};
      settimane.push({ serie: testo(s.serie), ripetizioni: testo(s.ripetizioni) });
    }
    return { id: testo(voce.id), nome: testo(voce.nome), da: testo(voce.da), settimane: settimane };
  });
  if (nuovo.programMeta && typeof nuovo.programMeta === "object") {
    const meta = Object.assign({}, nuovo.programMeta);
    if (elenco.length) meta[CAMPO_CUSTOM] = elenco; else delete meta[CAMPO_CUSTOM];
    meta.updatedAt = quando;
    nuovo.programMeta = meta;
  } else if (nuovo.program && typeof nuovo.program === "object") {
    const prog = Object.assign({}, nuovo.program);
    if (elenco.length) prog[CAMPO_CUSTOM] = elenco; else delete prog[CAMPO_CUSTOM];
    prog.updatedAt = quando;
    nuovo.program = prog;
  } else if (elenco.length) {
    nuovo[CAMPO_CUSTOM] = elenco;
  } else {
    delete nuovo[CAMPO_CUSTOM];
  }
  const versionePrima = versioneDi(dati);
  nuovo.versione = versionePrima + 1;
  nuovo[MARCHIO_B] = { quando: quando, da: uid == null ? null : String(uid), ultima: "progressioni-custom" };
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    annullaDi: testo(v.idVoce),
    programma: testo(v.programma),
    scheda: "",
    codice: "",
    esercizio: "",
    idEsercizio: "",
    settimana: null,
    campo: "progressioni-custom",
    prima: Array.isArray(v.dopo) ? v.dopo : [],
    dopo: elenco,
    dopoTesto: "progressioni custom rimesse com'erano",
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

function annullaPianoETestata(dati, v, quando, uid) {
  const campo = testo(v.campo);
  const nuovo = Object.assign({}, dati);
  if (testo(v.tipo) === "testata-programma") {
    const chiave = CAMPI_TESTATA[campo] || "";
    if (!chiave) return { ok: false, motivo: "la voce del registro non dice quale campo rimettere" };
    if (campo === "rotazione") {
      const lettere = Array.isArray(v.primaPiano)
        ? v.primaPiano.map(testo).filter(Boolean)
        : lettereRotazione(v.primaPiano).lettere;
      if (!lettere.length) delete nuovo[chiave];
      else nuovo[chiave] = lettere;
    } else if (campo === "giorni" || campo === "settimane") {
      const n = v.primaPiano == null || v.primaPiano === "" ? null : Number(v.primaPiano);
      if (n == null || !Number.isFinite(n)) delete nuovo[chiave];
      else nuovo[chiave] = n;
    } else if (v.primaPiano == null || testo(v.primaPiano) === "") {
      delete nuovo[chiave];
    } else {
      nuovo[chiave] = testo(v.primaPiano);
    }
  } else {
    const f = foglioDi(dati);
    if (!f) return { ok: false, motivo: "questo documento non contiene una scheda" };
    const nf = Object.assign({}, f);
    if (campo === "scarico" || campo === "test") {
      const chiavePiano = campo === "scarico" ? "pianoScarico" : "pianoTest";
      if (v.primaPiano == null) delete nf[chiavePiano];
      else nf[chiavePiano] = Object.assign({}, v.primaPiano);
    } else {
      return { ok: false, motivo: "la voce del registro non dice quale campo rimettere" };
    }
    const tipi = Array.isArray(v.tipiPrima) ? v.tipiPrima : [];
    if (tipi.length && campo === "scarico") {
      const chiave = chiaveEsercizi(nf);
      if (chiave) {
        nf[chiave] = nf[chiave].map((e) => {
          const t = tipi.filter((x) => x && testo(x.id) === testo(e && e.id))[0];
          if (!t) return e;
          const posto = postoWeeks(e);
          if (!posto) return e;
          const nuove = posto.elenco.map((w, i) => {
            if (i !== (Number(v.settimana) || 0) - 1) return w;
            const c = Object.assign({}, w && typeof w === "object" ? w : {});
            if (t.tipo) c.type = t.tipo; else delete c.type;
            return c;
          });
          return riscriviWeeks(e, posto, nuove);
        });
      }
    }
    nuovo.sheet = nf;
  }
  const versionePrima = Number(dati.versione) || 0;
  nuovo.versione = versionePrima + 1;
  nuovo[MARCHIO_B] = { quando: quando, da: uid == null ? null : String(uid), ultima: campo };
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "annulla-modifica",
    origine: "annullamento-in-B",
    annullaDi: testo(v.idVoce),
    scheda: testo(v.scheda),
    codice: testo(v.codice),
    esercizio: "",
    idEsercizio: "",
    settimana: v.settimana == null ? null : v.settimana,
    campo: campo,
    prima: testo(v.dopo),
    dopo: testo(v.prima),
    dopoTesto: "«" + campo + "» rimesso com'era",
    versionePrima: versionePrima,
    versioneDopo: nuovo.versione
  };
  return { ok: true, dati: nuovo, voce: voce };
}

/* --- PASSO 4b (commit 1): la copia degli esercizi fra schede --------------
 * Alice copia (o sposta) uno o piu' esercizi da una scheda all'altra, dentro
 * il programma attivo. Il motore non conosce schermate: riceve i due
 * documenti e l'elenco degli id scelti e restituisce i due documenti nuovi
 * piu' UNA voce di registro per l'intera operazione (l'Annulla rimette a
 * posto tutti e due i lati).
 *
 * Regole tenute qui, cosi' la pagina non le ripete:
 *  - id NUOVI per ogni riga copiata, mai un id gia' esistente in nessuna
 *    delle due schede, neanche su una riga tolta;
 *  - le righe tecniche figlie seguono SEMPRE il padre e puntano al SUO id
 *    nuovo (mai a quello vecchio);
 *  - una superserie si copia solo INTERA, e la copia prende un identificativo
 *    di gruppo NUOVO; se ne spunti solo una parte, la copia arriva senza
 *    legame e il motivo si legge nel risultato;
 *  - con lo sposta le righe escono dalla partenza e un gruppo che resta con
 *    un solo membro vivo perde il legame (stessa regola del tasto superserie);
 *  - il Logbook non si tocca mai: qui si scrivono solo le due schede. */

function copiaProfonda(valore) {
  if (valore == null || typeof valore !== "object") return valore;
  try {
    return JSON.parse(JSON.stringify(valore));
  } catch (e) {
    return Array.isArray(valore) ? valore.slice() : Object.assign({}, valore);
  }
}

function nomeRigaEsercizio(riga) {
  if (!riga || typeof riga !== "object") return "";
  return testo(riga.name != null ? riga.name : riga.nome);
}

function chiaveNomeRiga(riga) {
  return testo(nomeRigaEsercizio(riga)).replace(/\s+/g, " ").trim().toLowerCase();
}

function righeVive(elenco) {
  return (Array.isArray(elenco) ? elenco : []).filter((e) => e && typeof e === "object" && !e.deletedAt && !eFigliaTecnica(e));
}

function figlieViveDi(elenco, idPadre) {
  const k = testo(idPadre);
  if (!k) return [];
  return (Array.isArray(elenco) ? elenco : []).filter((e) => e && typeof e === "object" && !e.deletedAt && eFigliaTecnica(e) && testo(e.padreId) === k);
}

/* Un gruppo di superserie che resta con un solo membro vivo non e' piu' un
 * gruppo: il legame se ne va, come fa il tasto superserie quando stacca. */
export function pulisciGruppiSoli(elenco) {
  const conta = {};
  righeVive(elenco).forEach((e) => { const s = testo(e.sup); if (s) conta[s] = (conta[s] || 0) + 1; });
  return (Array.isArray(elenco) ? elenco : []).map((e) => {
    if (!e || typeof e !== "object") return e;
    const s = testo(e.sup);
    if (!s || conta[s] > 1) return e;
    const c = Object.assign({}, e);
    delete c.sup;
    return c;
  });
}

/* 3 esercizi e 1 riga tecnica copiati nella Scheda B: i numeri esatti. */
function contoInParole(conto, modo, dove) {
  const esercizi = Number(conto.esercizi) || 0;
  const tecniche = Number(conto.tecniche) || 0;
  const pezzi = [esercizi === 1 ? "1 esercizio" : String(esercizi) + " esercizi"];
  if (tecniche) pezzi.push(tecniche === 1 ? "1 riga tecnica" : String(tecniche) + " righe tecniche");
  const plurale = esercizi + tecniche > 1;
  const verbo = modo === "sposta" ? (plurale ? "spostati" : "spostato") : (plurale ? "copiati" : "copiato");
  return pezzi.join(" e ") + " " + verbo + " nella " + dove;
}

export function copiaEsercizi(datiPartenza, datiDestinazione, richiesta, opzioni) {
  const r = richiesta || {};
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const modo = testo(r.modo) === "sposta" ? "sposta" : "copia";
  const fP = foglioDi(datiPartenza);
  if (!fP) return { ok: false, motivo: "la scheda di partenza non e' leggibile: non ho scritto niente" };
  const fD = foglioDi(datiDestinazione);
  if (!fD) return { ok: false, motivo: "la scheda di destinazione non e' leggibile: non ho scritto niente" };
  const chiaveP = chiaveEsercizi(fP);
  const chiaveD = chiaveEsercizi(fD);
  if (!chiaveP) return { ok: false, motivo: "la scheda di partenza non ha un elenco di esercizi: non ho scritto niente" };
  if (!chiaveD) return { ok: false, motivo: "la scheda di destinazione non ha un elenco di esercizi: non ho scritto niente" };
  const elencoP = fP[chiaveP];
  const elencoD = fD[chiaveD];
  const scelti = Array.isArray(r.idEsercizi) ? r.idEsercizi.map((x) => testo(x)).filter(Boolean) : [];
  if (!scelti.length) return { ok: false, motivo: "non hai spuntato nessun esercizio: non ho scritto niente" };

  /* Le righe scelte: solo esercizi vivi, mai le figlie di una tecnica. */
  const prese = [];
  scelti.forEach((id) => {
    const i = indicePerId(elencoP, id);
    if (i < 0) return;
    const e = elencoP[i];
    if (!e || typeof e !== "object" || e.deletedAt || eFigliaTecnica(e)) return;
    if (prese.some((x) => x.indice === i)) return;
    prese.push({ indice: i, riga: e });
  });
  if (!prese.length) return { ok: false, motivo: "gli esercizi scelti non si ritrovano vivi in questa scheda: non ho scritto niente" };
  prese.sort((a, b) => a.indice - b.indice);
  const presoId = {};
  prese.forEach((x) => { presoId[testo(x.riga.id)] = true; });

  /* Tutti gli id gia' in giro: nessuna copia li riusa. */
  const usati = {};
  elencoP.concat(elencoD).forEach((e) => { const id = testo(e && e.id); if (id) usati[id] = true; });
  const genera = typeof o.generaId === "function" ? o.generaId : generaIdDiDefault;
  function idLibero() {
    for (let t = 0; t < 40; t += 1) {
      const id = testo(genera(t));
      if (id && !usati[id]) { usati[id] = true; return id; }
    }
    return "";
  }

  /* Le superserie: intere o niente. */
  const membri = {};
  righeVive(elencoP).forEach((e) => {
    const s = testo(e.sup);
    if (!s) return;
    if (!membri[s]) membri[s] = [];
    membri[s].push(testo(e.id));
  });
  const nuovoSup = {};
  const gruppiTagliati = [];
  Object.keys(membri).forEach((s) => {
    const tutti = membri[s];
    const presi = tutti.filter((id) => presoId[id]).length;
    if (!presi) return;
    if (presi === tutti.length && tutti.length >= 2) {
      for (let t = 0; t < 20; t += 1) {
        const nuovo = "ss-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
        if (!usati[nuovo]) { usati[nuovo] = true; nuovoSup[s] = nuovo; break; }
      }
    } else {
      gruppiTagliati.push(tutti.map((id) => {
        const i = indicePerId(elencoP, id);
        return i < 0 ? "" : nomeRigaEsercizio(elencoP[i]);
      }).filter(Boolean));
    }
  });

  /* I doppioni: se il nome c'e' gia' nella destinazione il motore NON scrive
   * e li restituisce; la scelta la fa Alice, per tutti insieme. */
  const nomiDest = {};
  righeVive(elencoD).forEach((e) => {
    const k = chiaveNomeRiga(e);
    if (!k) return;
    if (!nomiDest[k]) nomiDest[k] = [];
    nomiDest[k].push(e);
  });
  const doppioni = [];
  prese.forEach((x) => {
    const nome = nomeRigaEsercizio(x.riga);
    if (nomiDest[chiaveNomeRiga(x.riga)] && doppioni.indexOf(nome) === -1) doppioni.push(nome);
  });
  const sceltaDoppioni = testo(r.doppioni);
  if (doppioni.length && sceltaDoppioni !== "sostituisci" && sceltaDoppioni !== "aggiungi") {
    return {
      ok: false,
      doppioni: doppioni,
      motivo: (doppioni.length === 1
        ? "nella scheda di destinazione c'e' gia' " + doppioni[0]
        : "nella scheda di destinazione ci sono gia' " + doppioni.join(", ")) +
        ": scegli se sostituirli o aggiungerli ugualmente. Non ho scritto niente"
    };
  }

  /* Dove atterrano: in fondo, nell'ordine in cui compaiono nella partenza. */
  let massimo = -1;
  elencoD.forEach((e, i) => {
    if (!e || typeof e !== "object") return;
    const v = numeroDi(e.order != null ? e.order : e.ordine);
    massimo = Math.max(massimo, v == null ? i : v);
  });
  const nuove = [];
  let copiati = 0;
  let tecnicheCopiate = 0;
  prese.forEach((x) => {
    const vecchioId = testo(x.riga.id);
    const nuovoId = idLibero();
    if (!nuovoId) return;
    const copia = copiaProfonda(x.riga);
    copia.id = nuovoId;
    delete copia.deletedAt;
    massimo += 1;
    copia.order = massimo;
    const sup = testo(copia.sup);
    if (sup && nuovoSup[sup]) copia.sup = nuovoSup[sup];
    else delete copia.sup;
    nuove.push(copia);
    copiati += 1;
    figlieViveDi(elencoP, vecchioId).forEach((figlia) => {
      const idF = idLibero();
      if (!idF) return;
      const cf = copiaProfonda(figlia);
      cf.id = idF;
      cf.padreId = nuovoId;
      delete cf.deletedAt;
      massimo += 1;
      cf.order = massimo;
      nuove.push(cf);
      tecnicheCopiate += 1;
    });
  });
  if (copiati !== prese.length) return { ok: false, motivo: "non ho trovato identificativi liberi per tutti gli esercizi: non ho scritto niente" };

  /* Sostituisci: l'esistente esce (con le sue righe tecniche) e la copia
   * prende il suo posto. Aggiungi ugualmente: resta anche l'esistente. */
  const nomiCopiati = {};
  prese.forEach((x) => { const k = chiaveNomeRiga(x.riga); if (k) nomiCopiati[k] = true; });
  const sostituiti = [];
  let elencoFinaleD = elencoD.slice();
  if (sceltaDoppioni === "sostituisci" && doppioni.length) {
    elencoFinaleD = elencoD.map((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return e;
      if (eFigliaTecnica(e)) {
        const iP = indicePerId(elencoD, e.padreId);
        const padre = iP < 0 ? null : elencoD[iP];
        if (padre && !padre.deletedAt && nomiCopiati[chiaveNomeRiga(padre)]) {
          sostituiti.push(testo(e.id));
          return Object.assign({}, e, { deletedAt: quando });
        }
        return e;
      }
      if (!nomiCopiati[chiaveNomeRiga(e)]) return e;
      sostituiti.push(testo(e.id));
      return Object.assign({}, e, { deletedAt: quando });
    });
  }
  const elencoNuovoD = elencoFinaleD.concat(nuove);

  let elencoNuovoP = elencoP;
  if (modo === "sposta") {
    elencoNuovoP = pulisciGruppiSoli(elencoP.filter((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return true;
      if (eFigliaTecnica(e)) return !presoId[testo(e.padreId)];
      return !presoId[testo(e.id)];
    }));
  }

  const nuovoD = chiudiDocumento(datiDestinazione, fD, chiaveD, elencoNuovoD, quando, o.uid,
    modo === "sposta" ? "esercizi spostati" : "esercizi copiati");
  const nuovoP = modo === "sposta"
    ? chiudiDocumento(datiPartenza, fP, chiaveP, elencoNuovoP, quando, o.uid, "esercizi tolti")
    : datiPartenza;

  const conto = { esercizi: copiati, tecniche: tecnicheCopiate };
  const dove = testo(r.codiceDestinazione) ? "Scheda " + testo(r.codiceDestinazione) : "scheda di destinazione";
  const testoEsito = contoInParole(conto, modo, dove);

  /* Le due fotografie: servono all'Annulla, che rimette ENTRAMBI i lati. */
  const documentiPrima = [];
  documentiPrima.push({
    documento: testo(r.documentoDestinazione),
    scheda: testo(r.idSchedaDestinazione),
    esercizi: copiaProfonda(elencoD)
  });
  if (modo === "sposta") {
    documentiPrima.push({
      documento: testo(r.documentoPartenza),
      scheda: testo(r.idSchedaPartenza),
      esercizi: copiaProfonda(elencoP)
    });
  }

  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: modo === "sposta" ? "sposta-esercizi" : "copia-esercizi",
    origine: "modifica-fatta-in-B",
    scheda: testo(r.idSchedaPartenza),
    codice: codiceScheda(nuovoP),
    esercizio: testoEsito,
    idEsercizio: "",
    settimana: null,
    campo: "copia-esercizi",
    da: testo(r.idSchedaPartenza),
    a: testo(r.idSchedaDestinazione),
    modo: modo,
    eserciziCopiati: prese.map((x) => nomeRigaEsercizio(x.riga)),
    tecnicheCopiate: tecnicheCopiate,
    sostituiti: sostituiti,
    doppioni: sceltaDoppioni || "",
    prima: { documenti: documentiPrima },
    dopoTesto: modo === "sposta" ? "esercizi spostati" : "esercizi copiati",
    versionePrima: versioneDi(datiPartenza),
    versioneDopo: versioneDi(nuovoD)
  };

  return {
    ok: true,
    datiPartenza: nuovoP,
    datiDestinazione: nuovoD,
    voce: voce,
    testo: testoEsito,
    conto: conto,
    sostituiti: sostituiti,
    gruppiTagliati: gruppiTagliati
  };
}

/* L'Annulla di una copia o di uno spostamento: si rimette l'elenco di prima
 * di ogni documento che la voce porta. Non si cancella niente: la storia
 * resta intera e la voce nuova dice che cosa e' stato rimesso. */
export function rimettiElencoEsercizi(dati, elencoPrima, quando, uid, nota) {
  const f = foglioDi(dati);
  if (!f) return { ok: false, motivo: "il documento non contiene una scheda: non ho scritto niente" };
  const chiave = chiaveEsercizi(f);
  if (!chiave || !Array.isArray(elencoPrima)) return { ok: false, motivo: "la voce del registro non porta l'elenco di prima: non ho scritto niente" };
  const nuovo = chiudiDocumento(dati, f, chiave, copiaProfonda(elencoPrima), quando, uid, nota || "esercizi rimessi com'erano");
  return { ok: true, dati: nuovo };
}
