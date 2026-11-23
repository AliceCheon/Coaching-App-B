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

import { stressSettimana, serieInParola } from "./articolazioni-b.js";
import { schedePerProgramma } from "./programma.js";
import { programmaAttivo, settimanaCorrente } from "./lettura-dati.js";
import { nomePulito } from "./nome-pulito.js";

const NON = "\u2014";

function aggiorna(nodo, testo) {
  if (nodo) nodo.textContent = String(testo);
}

/* PASSO 6e — la carta legge la SETTIMANA, non una scheda.
 *
 * Entra un elenco di schede (o una sola, per le prove vecchie): il conto le
 * somma, il numero grande e' la percentuale della struttura piu' caricata e
 * sotto c'e' la classifica delle otto, con le serie della settimana e la barra
 * proporzionata alla piu' carica. La tacca al 100% della tolleranza compare
 * solo quando serve (cioe' quando qualcosa passa il 100%).
 *
 * opzioni.calcolo = { codici: ["A","B"], settimana: 3 } dice alla nota su cosa
 * si e' calcolato. Se manca, la nota parla de «la scheda attiva». */
/* PASSO 14 — da dove vengono le articolazioni segnate: dall'anamnesi scritta a
 * parole. Se non c'e', la carta dice «non dichiarato» invece di far credere che
 * nessuno abbia niente. */
function notaAnamnesi(doc, carta, dove, dichiarate) {
  if (!doc || !carta) return null;
  let riga = typeof carta.querySelector === "function" ? carta.querySelector("[data-anamnesi-carte=\"" + dove + "\"]") : null;
  if (!riga) {
    riga = doc.createElement("p");
    riga.className = "ck-anam-n";
    riga.setAttribute("data-anamnesi-carte", dove);
    carta.appendChild(riga);
  }
  const elenco = Array.isArray(dichiarate) ? dichiarate : [];
  riga.textContent = elenco.length
    ? "Articolazioni dichiarate in anamnesi: " + elenco.join(", ") + "."
    : "Anamnesi: non dichiarato.";
  return riga;
}

export function riempiRischioStrutturale(doc, schede, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const carta = doc.querySelector("#pag-dashboard .ck-red");
  if (!carta) return null;
  const num = carta.querySelector("[data-reds-num]");
  const stato = carta.querySelector("[data-reds-stato]");
  const piu = carta.querySelector("[data-reds-piu]");
  const nota = carta.querySelector("[data-reds-nota]");
  const classifica = carta.querySelector("[data-reds-classifica]");
  const dichiarate = Array.isArray(o.dichiarate) ? o.dichiarate : [];

  const elenco = (Array.isArray(schede) ? schede : (schede && typeof schede === "object" ? [schede] : []))
    .filter((x) => x && typeof x === "object");
  const riepilogo = elenco.length ? stressSettimana(elenco) : null;

  const svuotaClassifica = () => {
    if (!classifica) return;
    while (classifica.firstChild) classifica.removeChild(classifica.firstChild);
  };

  if (!riepilogo || riepilogo.leggibile !== true) {
    const motivo = o.motivo
      ? String(o.motivo)
      : (elenco.length === 0
        ? "nessuna scheda da leggere: la scheda attiva non \u00e8 arrivata alla carta"
        : (riepilogo && riepilogo.motivo) || "la scheda non si riesce a leggere");
    aggiorna(num, NON);
    aggiorna(stato, "non calcolabile");
    aggiorna(piu, "non calcolabile");
    svuotaClassifica();
    const diagnosi = o.diagnosi ? " " + String(o.diagnosi) : "";
    aggiorna(nota, "Non calcolato: " + motivo + "." + diagnosi + " Nessuno zero al posto di un dato che manca.");
    carta.setAttribute("data-reds", "non-calcolabile");
    /* PASSO 14 — anche quando la carta non sa calcolare, da dove vengono le
     * articolazioni segnate lo dice lo stesso. */
    notaAnamnesi(doc, carta, "reds", dichiarate);
    return riepilogo;
  }

  /* PASSO 6f — il numero grande e' in SERIE, non in percentuale: le serie
   * della settimana per la struttura piu' caricata. Le percentuali restano
   * solo nella soglia di partenza e nella tacca sulla barra. */
  const piuCaricata = riepilogo.piuCaricata;
  aggiorna(num, piuCaricata && !riepilogo.tutteAZero
    ? serieInParola(piuCaricata.massimo) + " serie"
    : NON);
  aggiorna(stato, piuCaricata && !riepilogo.tutteAZero ? piuCaricata.articolazione : "non calcolabile");
  /* Tutte a zero non vuol dire «spalla 0%»: vuol dire che nessuno degli
   * esercizi letti ha dato punti (nomi non riconosciuti, o solo cardio). */
  if (riepilogo.tutteAZero === true) {
    aggiorna(piu, "nessun esercizio ha dato punti");
  } else {
    aggiorna(piu, piuCaricata
      ? piuCaricata.articolazione + " · " + serieInParola(piuCaricata.massimo) + " serie"
      : "non registrata");
  }

  /* La classifica sotto: otto righe, dalla piu' carica alla meno. */
  svuotaClassifica();
  if (classifica) {
    const massimoSerie = piuCaricata ? piuCaricata.massimo : 0;
    riepilogo.classifica.forEach((voce) => {
      const riga = doc.createElement("div");
      riga.className = "ck-red-r" + (voce.sopraCento ? " su" : "");
      riga.setAttribute("data-reds-r", voce.articolazione);
      const nome = doc.createElement("span");
      nome.className = "ck-red-rn";
      const etichetta = doc.createElement("span");
      etichetta.className = "ck-red-rnm";
      etichetta.textContent = voce.articolazione;
      const soglia = doc.createElement("span");
      soglia.className = "ck-red-rs";
      soglia.textContent = "soglia di partenza: " + serieInParola(voce.tolleranza);
      nome.appendChild(etichetta);
      /* PASSO 14 — l'evidenza: chi compare nell'anamnesi porta il segno
       * accanto al nome. Se e' anche sopra soglia resta rosso e il segno resta. */
      if (dichiarate.indexOf(voce.articolazione) !== -1) {
        const segno = doc.createElement("span");
        segno.className = "ck-dol-p";
        segno.textContent = "dichiarata";
        nome.appendChild(segno);
      }
      nome.appendChild(soglia);
      const barra = doc.createElement("span");
      barra.className = "ck-red-rb";
      const pieno = doc.createElement("i");
      pieno.style.width = (massimoSerie > 0 ? (voce.massimo / massimoSerie) * 100 : 0).toFixed(2) + "%";
      barra.appendChild(pieno);
      /* la tacca segna il 100% della tolleranza: c'e' solo se la riga lo passa */
      if (voce.sopraCento && massimoSerie > 0) {
        const tacca = doc.createElement("em");
        tacca.style.left = (voce.tolleranza / massimoSerie) * 100 + "%";
        tacca.title = "100% della tolleranza";
        barra.appendChild(tacca);
      }
      const valore = doc.createElement("span");
      valore.className = "ck-red-rv";
      valore.textContent = serieInParola(voce.massimo) + " serie";
      riga.title = voce.articolazione + ": " + serieInParola(voce.massimo) + " serie su una soglia di partenza di "
        + serieInParola(voce.tolleranza) + " (" + Math.round(voce.percentuale) + "% della tolleranza)";
      riga.appendChild(nome);
      riga.appendChild(barra);
      riga.appendChild(valore);
      classifica.appendChild(riga);
    });
  }
  notaAnamnesi(doc, carta, "reds", dichiarate);

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
  const sopra = riepilogo.sopraCento.length
    ? " Oltre la soglia di partenza: " + riepilogo.sopraCento.join(", ") + "."
    : "";

  /* Su cosa e' calcolato: la settimana intera, dichiarata. */
  aggiorna(nota, aperturaCalcolo(riepilogo, elenco, o) + mappatura + sopra);
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
    const cerca = schedePerProgramma(l.schedeV2, "");
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
    const cerca = schedePerProgramma(l.schedeV2, programma.id);
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
  const cerca = schedePerProgramma(l.schedeV2, programma.id);
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
  /* PASSO 6e — TUTTE le schede della settimana, non la prima: con A/B/C/D il
   * carico di una settimana e' la somma delle quattro sedute. Se la settimana
   * corrente non si sa, o quella settimana non ha schede, si prendono tutte le
   * schede del programma e la nota lo dichiara. */
  const ordinate = schede.slice().sort(perSettimana);
  const dellaSettimana = settimana == null
    ? []
    : ordinate.filter((s) => Number(s.settimana) === settimana);
  const scelte = dellaSettimana.length ? dellaSettimana : ordinate;
  const codici = scelte
    .map((s) => String(s.codice == null ? "" : s.codice).trim())
    .filter((c) => c);
  let fonte;
  if (dellaSettimana.length) {
    fonte = "scheda della settimana " + settimana;
  } else if (settimana == null) {
    fonte = "prima scheda del programma: nessuna settimana corrente registrata";
  } else {
    fonte = "prima scheda del programma: la settimana " + settimana + " non ha una scheda";
  }
  if (!dellaSettimana.length) {
    fonte = (settimana == null
      ? "nessuna settimana corrente registrata"
      : "la settimana " + settimana + " non ha una scheda")
      + ": tutte le schede del programma";
  }
  return {
    schede: scelte,
    scheda: scelte[0] || null,
    codici: codici,
    calcolo: { codici: codici, settimana: dellaSettimana.length ? settimana : null },
    nSchede: scelte.length,
    motivo: null,
    diagnosi: null,
    numeri,
    programma: programma,
    settimana: dellaSettimana.length ? settimana : null,
    fonte: fonte,
    esplicito: attivo.esplicito === true,
    ripiego: attivo.ripiego === true
  };
}

/* La scorciatoia usata dalla pagina: sceglie la scheda e riempie la carta.
 * `riempiRischioDaZonaBSicuro` e' la stessa cosa, ma un difetto della carta
 * (un conto che lancia) non deve portarsi dietro il resto della Dashboard:
 * la nota scrive «Errore nel calcolo: <messaggio>» e la pagina va avanti. */
/* L'apertura della nota: su cosa e' calcolato. Una sola funzione, cosi' le
 * due carte (RED-S e Stress allenamento) dicono la stessa frase. */
function aperturaCalcolo(riepilogo, elenco, o) {
  const calcolo = o && o.calcolo && typeof o.calcolo === "object" ? o.calcolo : null;
  if (calcolo) {
    const codici = Array.isArray(calcolo.codici) ? calcolo.codici.filter((c) => String(c == null ? "" : c).trim()) : [];
    const quante = elenco.length;
    const dove = codici.length ? "sedute " + codici.join(", ") : (quante === 1 ? "1 scheda" : quante + " schede");
    let apertura = calcolo.settimana != null && codici.length
      ? "Calcolato sulle " + dove + " della settimana " + calcolo.settimana
      : "Calcolato su tutte le schede del programma" + (codici.length ? " (" + codici.join(", ") + ")" : "");
    apertura += " \u2014 " + quante + (quante === 1 ? " seduta" : " sedute")
      + ", " + riepilogo.righeContate + " righe lette.";
    return apertura;
  }
  return "Calcolato sulla scheda attiva: 8 articolazioni, tolleranze di partenza"
    + " (serie equivalenti a settimana, " + riepilogo.righeContate + " righe lette).";
}

/* PASSO 6h — la carta «Stress allenamento»: le otto articolazioni.
 *
 * Riceve il riepilogo GIA' calcolato da stressSettimana: nessun secondo conto,
 * quindi gli stessi numeri della carta RED-S. Otto righe, dalla piu' caricata
 * alla meno, con la tacca della soglia di partenza solo dove la struttura la
 * passa. Se il riepilogo non e' leggibile la carta dice il motivo, come il RED-S.
 */
export function riempiStressArticolazioni(doc, riepilogo, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const carta = doc.querySelector("#pag-dashboard .ck-st");
  if (!carta) return null;
  const righe = carta.querySelector("[data-stress-righe]");
  const nota = carta.querySelector("[data-stress-nota]");
  const svuota = () => {
    if (!righe) return;
    while (righe.firstChild) righe.removeChild(righe.firstChild);
  };

  if (!riepilogo || riepilogo.leggibile !== true) {
    const motivo = o.motivo
      ? String(o.motivo)
      : ((riepilogo && riepilogo.motivo) || "la scheda non si riesce a leggere");
    svuota();
    aggiorna(nota, "Non calcolato: " + motivo + ". Nessuno zero al posto di un dato che manca.");
    carta.setAttribute("data-stress", "non-calcolabile");
    return riepilogo;
  }

  const piuCaricata = riepilogo.piuCaricata;
  const massimoSerie = piuCaricata ? piuCaricata.massimo : 0;
  svuota();
  const dichiarate = Array.isArray(o.dichiarate) ? o.dichiarate : [];
  riepilogo.classifica.forEach((voce) => {
    const riga = doc.createElement("div");
    riga.className = "ck-st-r" + (voce.sopraCento ? " su" : "");
    riga.setAttribute("data-stress-r", voce.articolazione);
    const nome = doc.createElement("span");
    nome.className = "ck-st-rn";
    const etichetta = doc.createElement("span");
    etichetta.className = "ck-st-rnm";
    etichetta.textContent = voce.articolazione;
    const soglia = doc.createElement("span");
    soglia.className = "ck-st-rs";
    soglia.textContent = "soglia di partenza: " + serieInParola(voce.tolleranza);
    nome.appendChild(etichetta);
    /* PASSO 14 — l'evidenza: chi ha dichiarato di sentire male porta il segno
     * accanto al nome. Se e' anche sopra soglia resta rosso (classe «su») e il
     * segno resta: le due cose non si escludono. */
    if (dichiarate.indexOf(voce.articolazione) !== -1) {
      const segno = doc.createElement("span");
      segno.className = "ck-dol-p";
      segno.textContent = "dichiarata";
      segno.style.border = "1px solid currentColor";
      segno.style.borderRadius = "999px";
      segno.style.padding = "0 6px";
      segno.style.fontSize = "10px";
      segno.style.marginLeft = "6px";
      nome.appendChild(segno);
    }
    nome.appendChild(soglia);
    const barra = doc.createElement("span");
    barra.className = "ck-st-rb";
    const pieno = doc.createElement("i");
    pieno.style.width = (massimoSerie > 0 ? (voce.massimo / massimoSerie) * 100 : 0).toFixed(2) + "%";
    barra.appendChild(pieno);
    /* la tacca segna il 100% della tolleranza: c'e' solo se la riga lo passa */
    if (voce.sopraCento && massimoSerie > 0) {
      const tacca = doc.createElement("em");
      tacca.style.left = (voce.tolleranza / massimoSerie) * 100 + "%";
      tacca.title = "100% della tolleranza";
      barra.appendChild(tacca);
    }
    const valore = doc.createElement("span");
    valore.className = "ck-st-rv";
    valore.textContent = serieInParola(voce.massimo) + " serie";
    riga.title = voce.articolazione + ": " + serieInParola(voce.massimo) + " serie su una soglia di partenza di "
      + serieInParola(voce.tolleranza) + " (" + Math.round(voce.percentuale) + "% della tolleranza)";
    riga.appendChild(nome);
    riga.appendChild(barra);
    riga.appendChild(valore);
    if (righe) righe.appendChild(riga);
  });
  notaAnamnesi(doc, carta, "stress", dichiarate);

  const elenco = Array.isArray(o.schede) ? o.schede.filter((x) => x && typeof x === "object") : [];
  const sopra = riepilogo.sopraCento.length
    ? " Oltre la soglia di partenza: " + riepilogo.sopraCento.join(", ") + "."
    : "";
  aggiorna(nota, aperturaCalcolo(riepilogo, elenco, o)
    + " Le otto articolazioni, dalla pi\u00f9 caricata alla meno: le serie sono le stesse"
    + " della carta Rischio strutturale, un conto solo."
    + (riepilogo.tutteAZero === true ? " Nessun esercizio letto ha dato punti." : sopra));
  carta.setAttribute("data-stress", "calcolato");
  return riepilogo;
}

export function riempiRischioDaZonaB(doc, letture) {
  const scelta = schedaPerRischio(letture);
  /* PASSO 14 (versione semplice) — le articolazioni non si scelgono con i
   * bottoni: si leggono dal testo scritto in anamnesi. Chi le riconosce e'
   * anamnesi-b.js, una volta sola. */
  const dichiarate = Array.isArray(letture && letture.dichiarate) ? letture.dichiarate : [];
  const riepilogo = riempiRischioStrutturale(doc, scelta.schede, {
    motivo: scelta.motivo,
    diagnosi: scelta.diagnosi,
    calcolo: scelta.calcolo,
    dichiarate: dichiarate
  });
  riempiStressArticolazioni(doc, riepilogo, {
    motivo: scelta.motivo,
    calcolo: scelta.calcolo,
    schede: scelta.schede,
    dichiarate: dichiarate
  });
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
    try {
      riempiStressArticolazioni(doc, null, { motivo: "errore nel calcolo: " + messaggio });
    } catch (e2) { /* la carta stress non deve fermare il resto della Dashboard */ }
    return { scheda: null, motivo: "errore nel calcolo", errore: messaggio, riepilogo: null };
  }
}
