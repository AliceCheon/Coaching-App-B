/* Barbell Diva B — le modifiche alle schede, dentro la zona B (passo 9). PURE.
 *
 * Niente rete, niente DOM: entrano documenti scheda letti dalla zona B, escono
 * il documento nuovo, la voce del registro e il peso. Cosi' le prove possono
 * verificare ogni regola senza aprire un browser.
 *
 * Le regole di questo passo, decise da Alice l'8/11/2026:
 *  - si toccano SOLO serie e ripetizioni di una settimana di un esercizio che
 *    c'e' gia'. Il recupero no: in B porta frasi, non numeri, e i pulsanti −/+
 *    non avrebbero senso. Tecniche, nota, sostituzione, aggiungi/togli: spenti.
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
  const dopo = testo(r.valore).replace(/\s+/g, "");

  if (dopo === prima.replace(/\s+/g, "")) return { ok: false, motivo: "il valore non e' cambiato" };

  if (campo === "serie") {
    if (dopo !== "") {
      const n = intero(dopo);
      if (n == null || n < 1 || n > 99) return { ok: false, motivo: "le serie si scrivono con un numero da 1 a 99" };
    }
  } else if (dopo !== "" && !/^\d{1,3}([-\u2013/]\d{1,3})?$/.test(dopo)) {
    return { ok: false, motivo: "le ripetizioni si scrivono come 8 oppure 8-10" };
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

/* --- L'annullamento ------------------------------------------------------- */

/* Riporta il campo al valore di prima. Non cancella la voce del registro: ne
 * aggiunge una che la cita, cosi' la storia resta intera. */
export function annullaModifica(dati, voce, opzioni) {
  const v = voce || {};
  if (!v.campo || !v.settimana) return { ok: false, motivo: "la voce del registro non dice cosa annullare" };
  const o = opzioni || {};
  const quando = o.quando ? String(o.quando) : new Date().toISOString();
  const esito = cambiaSerieRipetizioni(dati, {
    idScheda: v.scheda,
    idEsercizio: v.idEsercizio,
    esercizio: v.esercizio,
    campo: v.campo,
    settimana: v.settimana,
    valore: v.prima == null ? "" : v.prima
  }, { quando: quando, uid: o.uid });
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
    .filter((v) => v.tipo === "modifica-serie-ripetizioni" && v.idVoce && !rifatte[v.idVoce]);
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
    .map((e) => ({ nome: nomeDi(e), settimane: prescrizione(e).elencoSettimane }));
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
