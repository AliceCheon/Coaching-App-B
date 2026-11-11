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
import { coppieRiga, coppieScheda, baseDaSettimane, nomeProgressione, voceScheda } from "./progressioni-b.js";

/* Il nome del campo che dice "a questa scheda ho messo mano in B". */
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
function chiaveEsercizi(foglio) {
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
function chiudiDocumento(dati, foglio, chiave, elenco, quando, uid, ultima) {
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
  if (!posizioneSettimane(esercizio)) {
    return { ok: false, motivo: "questa scheda non porta le settimane scritte: la progressione si apre in un passo successivo" };
  }
  const pid = testo(r.progressione);
  const coppie = coppieRiga(pid, baseDaSettimane(prescrizione(esercizio).elencoSettimane));
  if (!coppie) return { ok: false, motivo: "la progressione «" + pid + "» non esiste: non ho scritto niente" };
  const nome = nomeProgressione(pid) || pid;
  const prima = coppieAttuali(esercizio);
  if (stesseCoppie(prima, coppie)) {
    return {
      ok: false,
      motivo: "la progressione «" + nome + "» non cambia nessuna cella: come nel v31 parla di carico, non di serie e ripetizioni. Non ho scritto niente."
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
  const nuovoElenco = elenco.slice();
  nuovoElenco[indice] = copia;
  const nuovo = chiudiDocumento(dati, f, chiave, nuovoElenco, quando, o.uid, "riga");
  const voce = {
    idVoce: idVoceRegistro(quando),
    quando: quando,
    tipo: "cancella-riga",
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
  const voceProg = voceScheda(r.progressione);
  if (!voceProg) return { ok: false, motivo: "questa progressione di scheda non esiste: non ho scritto niente" };

  const vive = [];
  for (let i = 0; i < elenco.length; i += 1) {
    const e = elenco[i];
    if (!e || typeof e !== "object" || e.deletedAt) continue;
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
    const coppie = coppieScheda(voceProg.id, baseDaSettimane(prescrizione(esercizio).elencoSettimane));
    const prima = coppieAttuali(esercizio);
    nuove[i] = scriviCoppie(esercizio, coppie);
    if (!stesseCoppie(prima, coppie)) cambia = true;
    righe.push({ idEsercizio: testo(esercizio.id), esercizio: nomeDi(esercizio), prima: prima, dopo: coppie });
  }
  if (!cambia) {
    return { ok: false, motivo: "la progressione «" + voceProg.n + "» non cambia nessuna cella di questa scheda: non ho scritto niente" };
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
    progressione: voceProg.id,
    nomeProgressione: voceProg.n,
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
  /* Passo 20: progressione di una riga, riga tolta, progressione di scheda. */
  if (tipo === "modifica-progressione" || tipo === "modifica-progressione-scheda" || tipo === "cancella-riga") {
    return annullaProgressione(dati, v, quando, o.uid);
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
    .filter((v) => (v.tipo === "modifica-serie-ripetizioni" || v.tipo === "modifica-rec-tut" || v.tipo === "modifica-progressione" || v.tipo === "modifica-progressione-scheda" || v.tipo === "cancella-riga")
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
