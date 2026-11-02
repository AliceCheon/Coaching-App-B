/* Barbell Diva B — quadro strutturale (fase 2b, SOLA LETTURA).
 *
 * Cosa fa: trasforma le sedute già lette dalla sottoraccolta `sessions` in
 * conteggi onesti sul CARICO e sulla CONTINUITÀ. Niente rete, niente DOM,
 * niente scritture: solo aritmetica su date e codici scheda.
 *
 * Cosa NON fa, ed è la parte importante: non calcola un «semaforo RED-S».
 * Un semaforo di rischio richiede dati che in A non esistono (disponibilità
 * energetica, ciclo, densità ossea, variazioni ponderali continue). Inventarli
 * sarebbe esattamente il peccato che questo progetto vieta. Qui si contano i
 * dati che ci sono, si dichiarano le soglie, e si elenca ciò che manca.
 *
 * Regola di casa: un dato assente vale «non registrato», mai zero, mai una
 * stima. Le soglie sono dichiarate in SOGLIE e mostrate all'utente.
 */

const GIORNO_MS = 86400000;

/* Soglie dichiarate, non nascoste nel codice. */
export const SOGLIE = Object.freeze({
  settimaneOsservate: 8,
  seduteSettimanaPiene: 3,
  giorniPausaAttenzione: 8,
  giorniPausaLunga: 15,
  settimaneVuoteAttenzione: 2
});

/* I dati che servirebbero per un semaforo strutturale vero. `inA: false`
 * significa: A non li registra oggi, quindi B non li può leggere. */
export const DATI_SEMAFORO = Object.freeze([
  { nome: "peso corporeo nel tempo", inA: true, nota: "state.metrics è un valore corrente, non una serie storica" },
  { nome: "disponibilità energetica", inA: false, nota: "serve introito calorico contro dispendio: A non lo registra" },
  { nome: "ciclo mestruale", inA: false, nota: "sottoraccolta «ciclo» dichiarata nel contratto, mai scritta" },
  { nome: "sonno e stress percepito", inA: false, nota: "sottoraccolta «sonno» dichiarata, mai scritta" },
  { nome: "infortuni e dolore", inA: false, nota: "sottoraccolta «limitazioni» dichiarata, mai scritta" },
  { nome: "prestazione in calo", inA: false, nota: "richiede carichi per esercizio nel tempo" }
]);

/* ---------- date ---------- */

/* Accetta "AAAA-MM-GG", "AAAA-MM-GGTHH:mm" o millisecondi. Restituisce una
 * data a mezzanotte UTC oppure null: nessuna data indovinata. */
export function dataSeduta(valore) {
  if (valore == null || valore === "") return null;
  if (typeof valore === "number" && Number.isFinite(valore)) {
    const d = new Date(valore);
    return Number.isNaN(d.getTime()) ? null : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }
  const testo = String(valore).trim();
  const m = testo.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const anno = Number(m[1]);
  const mese = Number(m[2]);
  const giorno = Number(m[3]);
  if (mese < 1 || mese > 12 || giorno < 1 || giorno > 31) return null;
  const d = new Date(Date.UTC(anno, mese - 1, giorno));
  if (d.getUTCFullYear() !== anno || d.getUTCMonth() !== mese - 1 || d.getUTCDate() !== giorno) return null;
  return d;
}

/* Lunedì della settimana che contiene la data (settimana ISO, lunedì = 0). */
export function lunediDi(data) {
  if (!(data instanceof Date) || Number.isNaN(data.getTime())) return null;
  const giorno = (data.getUTCDay() + 6) % 7;
  return new Date(data.getTime() - giorno * GIORNO_MS);
}

function etichettaSettimana(lunedi) {
  const d = String(lunedi.getUTCDate()).padStart(2, "0");
  const m = String(lunedi.getUTCMonth() + 1).padStart(2, "0");
  return d + "/" + m;
}

function differenzaGiorni(da, a) {
  return Math.round((a.getTime() - da.getTime()) / GIORNO_MS);
}

/* ---------- sedute ---------- */

function seduteValide(sedute) {
  const elenco = Array.isArray(sedute) ? sedute : [];
  const conData = [];
  elenco.forEach((s) => {
    if (!s || typeof s !== "object") return;
    const data = dataSeduta(s.dateInput);
    if (!data) return;
    conData.push({ data, codice: String(s.sessionCode || "").trim() || null });
  });
  return conData.sort((a, b) => a.data.getTime() - b.data.getTime());
}

/* ---------- quadro ---------- */

/* Restituisce solo numeri verificabili o null. `opzioni.oggi` serve ai test:
 * senza, si usa il giorno corrente. */
export function quadroStrutturale(sedute, opzioni) {
  const opz = opzioni || {};
  const oggiRaw = opz.oggi instanceof Date ? opz.oggi : new Date();
  const oggi = new Date(Date.UTC(oggiRaw.getUTCFullYear(), oggiRaw.getUTCMonth(), oggiRaw.getUTCDate()));
  const quante = Number.isFinite(Number(opz.settimane)) ? Number(opz.settimane) : SOGLIE.settimaneOsservate;

  const elenco = seduteValide(sedute);
  const senzaData = (Array.isArray(sedute) ? sedute.length : 0) - elenco.length;

  if (!elenco.length) {
    return {
      oggi,
      numeroSedute: 0,
      senzaData,
      giorniDallUltima: null,
      ultimi7: null,
      mediaSettimanale: null,
      settimane: [],
      settimaneVuote: null,
      settimaneVuoteDiFila: null,
      bucoMassimo: null,
      distribuzione: [],
      schedeDistinte: null
    };
  }

  const ultima = elenco[elenco.length - 1];
  const giorniDallUltima = differenzaGiorni(ultima.data, oggi);

  const da7 = new Date(oggi.getTime() - 7 * GIORNO_MS);
  const ultimi7 = elenco.filter((s) => s.data.getTime() > da7.getTime() && s.data.getTime() <= oggi.getTime()).length;

  /* Settimane osservate: dalla più vecchia alla corrente. */
  const lunediOggi = lunediDi(oggi);
  const settimane = [];
  for (let i = quante - 1; i >= 0; i -= 1) {
    const inizio = new Date(lunediOggi.getTime() - i * 7 * GIORNO_MS);
    const fine = new Date(inizio.getTime() + 7 * GIORNO_MS);
    const numero = elenco.filter((s) => s.data.getTime() >= inizio.getTime() && s.data.getTime() < fine.getTime()).length;
    settimane.push({ inizio, etichetta: etichettaSettimana(inizio), numero });
  }
  const settimaneVuote = settimane.filter((s) => s.numero === 0).length;

  /* Settimane vuote consecutive più recenti (a partire dalla corrente). */
  let settimaneVuoteDiFila = 0;
  for (let i = settimane.length - 1; i >= 0; i -= 1) {
    if (settimane[i].numero !== 0) break;
    settimaneVuoteDiFila += 1;
  }

  /* Buco più lungo tra due sedute, e buco aperto fino a oggi (null se non
   * ci sono almeno due sedute). */
  let bucoMassimo = null;
  for (let i = 1; i < elenco.length; i += 1) {
    const salto = differenzaGiorni(elenco[i - 1].data, elenco[i].data);
    if (bucoMassimo == null || salto > bucoMassimo) bucoMassimo = salto;
  }

  const sommaSettimane = settimane.reduce((tot, s) => tot + s.numero, 0);
  const mediaSettimanale = settimane.length ? Math.round((sommaSettimane / settimane.length) * 10) / 10 : null;

  const conteggio = Object.create(null);
  elenco.forEach((s) => {
    if (!s.codice) return;
    conteggio[s.codice] = (conteggio[s.codice] || 0) + 1;
  });
  const distribuzione = Object.keys(conteggio)
    .map((codice) => ({ codice, numero: conteggio[codice] }))
    .sort((a, b) => b.numero - a.numero || a.codice.localeCompare(b.codice));

  return {
    oggi,
    numeroSedute: elenco.length,
    senzaData: senzaData > 0 ? senzaData : 0,
    giorniDallUltima,
    ultimi7,
    mediaSettimanale,
    settimane,
    settimaneVuote,
    settimaneVuoteDiFila,
    bucoMassimo,
    distribuzione,
    schedeDistinte: distribuzione.length || null
  };
}

/* ---------- righe pronte per le card (condivise da PC e telefono) ---------- */

const NON_REGISTRATO = "non registrato";

export function righeQuadro(quadro) {
  if (!quadro || quadro.numeroSedute === 0) {
    return [{ testo: NON_REGISTRATO, classe: "valore" }];
  }
  const righe = [{ testo: quadro.mediaSettimanale + " sedute", classe: "valore" }];
  righe.push({ testo: "media delle ultime " + quadro.settimane.length + " settimane · soglia dichiarata: " + SOGLIE.settimanePiene + " per una settimana piena" });
  righe.push({ testo: "ultimi 7 giorni: " + quadro.ultimi7 });
  righe.push({ testo: "giorni dall'ultima seduta: " + (quadro.giorniDallUltima == null ? NON_REGISTRATO : quadro.giorniDallUltima) });
  righe.push({ testo: "settimane senza sedute: " + quadro.settimaneVuote + " su " + quadro.settimane.length });
  if (quadro.bucoMassimo != null) {
    righe.push({ testo: "pausa più lunga tra due sedute: " + quadro.bucoMassimo + " giorni" });
  }
  if (quadro.distribuzione.length) {
    righe.push({ testo: "schede: " + quadro.distribuzione.map((d) => d.codice + " " + d.numero).join(" · ") });
  }
  if (quadro.senzaData > 0) {
    righe.push({ testo: "sedute senza data leggibile: " + quadro.senzaData + " (non entrano nei conteggi)", classe: "errore" });
  }
  return righe;
}

/* Un segnale per riga. Le classi usano il vocabolario già esistente:
 * «lemmacarta» (verde) = regolare, «errore» = da guardare, «riga» = neutro. */
export function righeSemaforo(quadro) {
  if (!quadro || quadro.numeroSedute === 0) {
    return [{ testo: "Nessuna seduta con data leggibile: niente semaforo, " + NON_REGISTRATO + ".", classe: "riga" }];
  }
  const segnali = [];

  const frequenza = quadro.mediaSettimanale;
  if (frequenza == null) {
    segnali.push({ testo: "Frequenza: " + NON_REGISTRATO, classe: "riga" });
  } else if (frequenza >= SOGLIE.seduteSettimanaPiene) {
    segnali.push({ testo: "Frequenza regolare: " + frequenza + " sedute a settimana.", classe: "lemmacarta" });
  } else if (frequenza >= 1) {
    segnali.push({ testo: "Frequenza sotto la soglia di " + SOGLIE.seduteSettimanaPiene + ": " + frequenza + " a settimana.", classe: "errore" });
  } else {
    segnali.push({ testo: "Nessuna seduta nelle settimane osservate.", classe: "errore" });
  }

  if (quadro.giorniDallUltima != null) {
    if (quadro.giorniDallUltima >= SOGLIE.giorniPausaLunga) {
      segnali.push({ testo: "Pausa lunga: " + quadro.giorniDallUltima + " giorni dall'ultima seduta.", classe: "errore" });
    } else if (quadro.giorniDallUltima >= SOGLIE.giorniPausaAttenzione) {
      segnali.push({ testo: "Oltre una settimana di pausa: " + quadro.giorniDallUltima + " giorni.", classe: "errore" });
    } else {
      segnali.push({ testo: "Continuità: ultima seduta " + (quadro.giorniDallUltima === 0 ? "oggi" : quadro.giorniDallUltima + " giorni fa") + ".", classe: "lemmacarta" });
    }
  }

  if (quadro.settimaneVuoteDiFila >= SOGLIE.settimaneVuoteAttenzione) {
    segnali.push({ testo: "Interruzione: " + quadro.settimaneVuoteDiFila + " settimane di fila senza sedute.", classe: "errore" });
  }

  if (quadro.distribuzione.length && quadro.numeroSedute >= 8) {
    const quote = quadro.distribuzione.map((d) => d.numero / quadro.numeroSedute);
    const piu = Math.max.apply(null, quote);
    const meno = Math.min.apply(null, quote);
    if (quadro.distribuzione.length >= 2 && piu - meno > 0.35) {
      const max = quadro.distribuzione[0];
      const min = quadro.distribuzione[quadro.distribuzione.length - 1];
      segnali.push({ testo: "Distribuzione sbilanciata: " + max.codice + " " + max.numero + " sedute contro " + min.codice + " " + min.numero + ".", classe: "errore" });
    } else {
      segnali.push({ testo: "Distribuzione tra le schede equilibrata (" + quadro.distribuzione.length + " schede).", classe: "lemmacarta" });
    }
  }

  segnali.push({ testo: "Questi sono conteggi sulle sedute, non una diagnosi: il semaforo strutturale completo richiede i dati qui sotto.", classe: "riga" });
  return segnali;
}

/* Righe della card «Cosa manca»: un dato per riga, con il perché. */
export function righeDatiMancanti() {
  return DATI_SEMAFORO.map((d) => {
    const stato = d.inA ? "in A esiste solo il valore corrente" : "in A non è registrato";
    return { testo: d.nome + " — " + stato + " · " + d.nota, classe: d.inA ? "riga" : "riga" };
  });
}
