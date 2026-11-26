/* comune/programma-consultabile.js — PASSO 42: guardare un programma senza aprirlo.
 *
 * Alice (26/11/2026): un programma archiviato deve essere «cliccabile e
 * consultabile», e due programmi devono poter essere confrontati su grandezze
 * che esistono davvero nei dati — volume per distretto, numero di esercizi e
 * schede, densità — non su numeri inventati.
 *
 * Questo modulo è PURO: entrano il profilo del programma e il gruppo di schede
 * letto da B (la stessa ricostruzione di schede-v2.js), escono testi e numeri.
 * Niente DOM, niente rete, nessuna scrittura: qui si legge e si conta.
 *
 * Regole di casa:
 *  - un dato che manca non è zero: si dichiara con il motivo (NON / motivo);
 *  - i carichi NON stanno nelle schede (vivono nel logbook): l'intensità di
 *    carico non si calcola dal programma e la riga lo DICE, non la inventa;
 *  - la densità si calcola solo dai recuperi scritti, e la formula sta qui
 *    sotto, scritta una volta, così la pagina può mostrarla.
 *
 * La serie della settimana 1 è la stessa che conta la colonna «Serie» della
 * pagina Archivio: serie scritte nella prima settimana dell'esercizio, oppure —
 * se le settimane non ci sono — le serie della prescrizione. Un esercizio che
 * non dichiara le serie non vale zero: la sua scheda resta «a buchi» e il
 * numero dichiara il buco.
 */

import { rotazionePrevista, profiloProgramma } from "./programma.js";
import { settimanePerTabella } from "./schede-v2.js";

export const NON = "non registrato";

/* La formula della densità, in un punto solo: la mostra la pagina.
 * E' un «serie al minuto di recupero», non un minuto di seduta intero: il
 * tempo di esecuzione (ripetizioni, TUT) non è nei dati e quindi non entra. */
export const FORMULA_DENSITA =
  "densità = serie programmate (settimana 1) ÷ minuti di recupero scritti "
  + "(Σ serie × recupero ÷ 60). Il tempo di esecuzione non è nei dati: non entra nel conto.";

export const MOTIVO_CARICO =
  "i carichi non stanno nelle schede: vivono nel logbook, quindi dal programma "
  + "l'intensità di carico non si può calcolare";

function testo(valore) {
  return valore == null ? "" : String(valore).trim();
}

/* Un numero scritto a testo («4», «4,5»). Tutto il resto è «non scritto». */
export function numeroScritto(valore) {
  if (typeof valore === "number") return Number.isFinite(valore) ? valore : null;
  const t = testo(valore).replace(",", ".");
  if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* Il recupero scritto, in secondi. Le forme vere sono quelle di
 * schede-v2.js/testoRecupero: «90"», «2'», «1'30"», «1,30'», più un numero
 * nudo (secondi). Un testo libero («no recupero tra le braccia») NON è un
 * numero: torna null e chi chiama lo dichiara, invece di contarlo zero. */
export function secondiRecupero(valore) {
  if (valore == null) return null;
  if (typeof valore === "number") return Number.isFinite(valore) && valore > 0 ? valore : null;
  if (typeof valore === "object") {
    const dentro = secondiRecupero(valore.seconds != null ? valore.seconds : valore.minSeconds);
    return dentro;
  }
  const t = testo(valore).replace(/\s+/g, " ");
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t) > 0 ? Number(t) : null;
  let m = /^(\d{1,2})\s*['’:.,]\s*(\d{1,2})\s*["”']?$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(\d{1,3})\s*'$/.exec(t);
  if (m) return Number(m[1]) * 60;
  m = /^(\d{1,4})\s*["”]$/.exec(t);
  if (m) return Number(m[1]);
  return null;
}

/* gg/mm/aaaa, la stessa forma del resto dell'app; una data che non si
 * riconosce si mostra com'è (non si traduce a caso). */
export function dataBreve(valore) {
  const t = testo(valore);
  if (!t) return NON;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return iso[3] + "/" + iso[2] + "/" + iso[1];
  return t;
}

/* Le serie della settimana 1 di un esercizio normalizzato: quelle scritte
 * nella prima settimana, altrimenti quelle della prescrizione. */
function serieSettimanaUno(esercizio) {
  const p = (esercizio && esercizio.prescrizione) || {};
  const elenco = Array.isArray(p.elencoSettimane) ? p.elencoSettimane : [];
  const prima = elenco.length ? (settimanePerTabella(elenco, 1)[0] || {}) : {};
  const dallaSettimana = numeroScritto(prima.serie);
  if (dallaSettimana != null) return dallaSettimana;
  return numeroScritto(p.serie);
}

/* Il recupero di un esercizio: quello della settimana 1, altrimenti quello
 * della prescrizione. */
function recuperoEsercizio(esercizio) {
  const p = (esercizio && esercizio.prescrizione) || {};
  const elenco = Array.isArray(p.elencoSettimane) ? p.elencoSettimane : [];
  if (elenco.length) {
    const prima = settimanePerTabella(elenco, 1)[0] || {};
    const s = secondiRecupero(prima.recupero);
    if (s != null) return s;
  }
  return secondiRecupero(p.recupero);
}

/* Le schede di un programma normalizzate, solo quelle attive (le archiviate
 * restano fuori: un programma si legge per quello che programmava). */
export function schedeAttive(gruppo) {
  const g = gruppo && typeof gruppo === "object" ? gruppo : null;
  const elenco = g && Array.isArray(g.schede) ? g.schede
    : (g && Array.isArray(g.archiviate) ? g.archiviate : []);
  return elenco.filter((s) => s && typeof s === "object");
}

/* Il modello di sola lettura di un programma: nome, periodo, fase, rotazione e
 * le sue schede con esercizi, serie e recuperi. `gruppo` è
 * { schede, archiviate } come lo produce schedeDelProgrammaV2/ricostruisciSchede;
 * quando è null il modello dichiara che le schede non sono state lette. */
export function modelloConsultabile(programma, gruppo, opzioni) {
  const o = opzioni || {};
  const profilo = o.profilo || profiloProgramma(programma);
  /* Un gruppo assente («la lettura non è arrivata») e un gruppo vuoto («quel
   * programma in B non ha schede») sono due cose diverse: si dicono diverse. */
  const gruppoLetto = Boolean(gruppo && (Array.isArray(gruppo.schede) || Array.isArray(gruppo.archiviate)));
  const schede = schedeAttive(gruppo);
  const rot = rotazionePrevista(programma, schede);
  const durata = profilo.durata == null ? null : Number(profilo.durata);
  const periodo = profilo.inizio
    ? (dataBreve(profilo.inizio) + (durata > 0 ? " · " + durata + (durata === 1 ? " settimana" : " settimane") : " · durata non registrata"))
    : NON;
  const viste = schede.map((s) => {
    const esercizi = (Array.isArray(s.esercizi) ? s.esercizi : []).map((e) => {
      const p = (e && e.prescrizione) || {};
      const prima = Array.isArray(p.elencoSettimane) && p.elencoSettimane.length
        ? (settimanePerTabella(p.elencoSettimane, 1)[0] || {}) : {};
      return {
        nome: testo(e && e.nome) || NON,
        distretto: testo(e && e.muscolo),
        serie: testo(prima.serie) || testo(p.serie) || NON,
        ripetizioni: testo(prima.ripetizioni) || testo(p.ripetizioni) || NON,
        recupero: testo(prima.recupero) || testo(p.recupero) || NON,
        nota: testo(e && e.nota)
      };
    });
    return {
      codice: testo(s.codice) || NON,
      nome: testo(s.nome),
      esercizi: esercizi
    };
  });
  return {
    ok: true,
    id: testo(profilo.id),
    nome: profilo.nome,
    stato: profilo.stato,
    segno: profilo.segno,
    archiviato: profilo.archiviato === true,
    periodo: periodo,
    fase: profilo.fase || NON,
    rotazione: rot.codici.length ? rot.codici.join(" · ") : NON,
    rotazioneRegistrata: rot.registrata,
    schede: viste,
    numeroSchede: viste.length,
    numeroEsercizi: viste.reduce((a, s) => a + s.esercizi.length, 0),
    schedeLette: schede.length > 0,
    motivoSchede: schede.length ? null : (gruppoLetto
      ? "questo programma non ha schede attive in B: c'è solo il documento del programma"
      : "le schede di questo programma non sono state lette in B: non c'è niente da mostrare")
  };
}

/* I numeri veri di un programma, per il confronto.
 * `volume`: serie della settimana 1 per distretto (il distretto è quello
 * scritto sull'esercizio; un esercizio senza distretto non entra in nessuna
 * riga e viene contato a parte, dichiarato).
 * `densita`: serie ÷ minuti di recupero (vedi FORMULA_DENSITA). Se in una
 * scheda un esercizio non dichiara il recupero, la densità NON si calcola:
 * torna null con il motivo, mai uno zero. */
export function grandezzeProgramma(gruppo) {
  const schede = schedeAttive(gruppo);
  const perDistretto = Object.create(null);
  let esercizi = 0;
  let senzaDistretto = 0;
  let serieTotali = 0;
  let serieSenzaNumero = 0;
  let recuperiMancanti = 0;
  let serieConRecupero = 0;
  let secondiTotali = 0;
  const schedeIncomplete = [];

  schede.forEach((s) => {
    let mancantiQui = 0;
    (Array.isArray(s.esercizi) ? s.esercizi : []).forEach((e) => {
      esercizi += 1;
      const serie = serieSettimanaUno(e);
      const rec = recuperoEsercizio(e);
      const distretto = testo(e && e.muscolo);
      if (serie == null) {
        serieSenzaNumero += 1;
      } else {
        serieTotali += serie;
        if (distretto) {
          if (!perDistretto[distretto]) perDistretto[distretto] = 0;
          perDistretto[distretto] += serie;
        } else if (e && testo(e.nome)) {
          senzaDistretto += 1;
        }
        if (rec == null) {
          mancantiQui += 1;
          recuperiMancanti += 1;
        } else {
          serieConRecupero += serie;
          secondiTotali += serie * rec;
        }
      }
    });
    if (mancantiQui) schedeIncomplete.push({ codice: testo(s.codice) || NON, mancanti: mancantiQui });
  });

  const volume = Object.keys(perDistretto)
    .map((d) => ({ distretto: d, serie: Math.round(perDistretto[d] * 100) / 100 }))
    .sort((a, b) => b.serie - a.serie || a.distretto.localeCompare(b.distretto, "it"));

  const minuti = secondiTotali > 0 ? Math.round((secondiTotali / 60) * 100) / 100 : null;
  let densita = null;
  let motivoDensita = null;
  if (!schede.length) {
    motivoDensita = "le schede non sono state lette: la densità non si calcola";
  } else if (!serieTotali) {
    motivoDensita = "nessuna serie scritta nella settimana 1: la densità non si calcola";
  } else if (schedeIncomplete.length) {
    motivoDensita = "recupero non scritto in " + recuperiMancanti
      + (recuperiMancanti === 1 ? " esercizio" : " esercizi")
      + " (" + schedeIncomplete.map((x) => "scheda " + x.codice + ": " + x.mancanti).join(" · ")
      + "): la densità non si calcola invece di contare zero";
  } else if (!minuti) {
    motivoDensita = "i recuperi scritti non danno minuti: la densità non si calcola";
  } else {
    densita = Math.round((serieTotali / minuti) * 100) / 100;
  }

  const motivoVolume = serieSenzaNumero
    ? "serie non scritte in " + serieSenzaNumero + (serieSenzaNumero === 1 ? " esercizio" : " esercizi")
      + ": il volume è parziale"
    : null;
  return {
    schede: schede.length,
    esercizi: esercizi,
    volume: volume,
    motivoVolume: motivoVolume,
    serieSettimana: serieTotali,
    senzaDistretto: senzaDistretto,
    serieSenzaNumero: serieSenzaNumero,
    minutiRecupero: minuti,
    densita: densita,
    motivoDensita: motivoDensita,
    recuperiMancanti: recuperiMancanti,
    schedeIncomplete: schedeIncomplete
  };
}

/* La variazione in percentuale, solo dove ci sono entrambi i valori e quello
 * di partenza non è zero. Altrimenti null: la pagina scrive «—», non un
 * numero che sembra un dato. */
export function variazionePct(prima, dopo) {
  /* null/undefined non sono zero: senza un valore da una parte la percentuale
   * non esiste, e la pagina scrive «—». */
  const a = prima == null || prima === "" ? NaN : Number(prima);
  const b = dopo == null || dopo === "" ? NaN : Number(dopo);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
  return Math.round(((b - a) / a) * 1000) / 10;
}

function rigaNumerica(chiave, etichetta, uno, due, nota) {
  const variazione = variazionePct(uno, due);
  const genere = uno == null || due == null ? "solo-uno" : "confronto";
  return { chiave, etichetta, uno: uno == null ? null : uno, due: due == null ? null : due, variazione, genere, nota: nota || null };
}

/* Due programmi affiancati. `uno` e `due` sono il risultato di
 * grandezzeProgramma (più i nomi). Le righe sono SOLO grandezze che stanno nei
 * dati; l'intensità di carico è dichiarata non disponibile col motivo. */
export function confrontoProgrammi(uno, due, opzioni) {
  const o = opzioni || {};
  const a = uno || {};
  const b = due || {};
  const righe = [];
  righe.push(rigaNumerica("schede", "Schede", a.schede == null ? null : a.schede, b.schede == null ? null : b.schede));
  righe.push(rigaNumerica("esercizi", "Esercizi", a.esercizi == null ? null : a.esercizi, b.esercizi == null ? null : b.esercizi));
  righe.push(rigaNumerica("serie", "Serie a settimana (totale)",
    a.serieSettimana == null ? null : a.serieSettimana, b.serieSettimana == null ? null : b.serieSettimana,
    "serie scritte nella settimana 1"));

  const distretti = [];
  (Array.isArray(a.volume) ? a.volume : []).forEach((v) => { if (distretti.indexOf(v.distretto) === -1) distretti.push(v.distretto); });
  (Array.isArray(b.volume) ? b.volume : []).forEach((v) => { if (distretti.indexOf(v.distretto) === -1) distretti.push(v.distretto); });
  const serieDi = (programma, d) => {
    const voce = (Array.isArray(programma.volume) ? programma.volume : []).filter((v) => v.distretto === d)[0];
    return voce ? voce.serie : null;
  };
  distretti.forEach((d) => {
    righe.push(rigaNumerica("distretto:" + d, "Serie a settimana · " + d, serieDi(a, d), serieDi(b, d)));
  });

  righe.push({
    chiave: "densita",
    etichetta: "Densità (serie al minuto di recupero)",
    uno: a.densita == null ? null : a.densita,
    due: b.densita == null ? null : b.densita,
    variazione: a.densita == null || b.densita == null ? null : variazionePct(a.densita, b.densita),
    genere: a.densita == null || b.densita == null ? "non-calcolabile" : "confronto",
    nota: FORMULA_DENSITA,
    motivi: [a.motivoDensita, b.motivoDensita].filter(Boolean)
  });

  /* La riga che NON si può calcolare: dichiarata, col motivo, mai un numero. */
  righe.push({
    chiave: "carico",
    etichetta: "Intensità di carico",
    uno: null,
    due: null,
    variazione: null,
    genere: "non-disponibile",
    motivo: MOTIVO_CARICO
  });

  return {
    uno: { nome: o.nomeUno || "", id: o.idUno || "" },
    due: { nome: o.nomeDue || "", id: o.idDue || "" },
    righe: righe,
    formula: FORMULA_DENSITA,
    motivoCarico: MOTIVO_CARICO
  };
}
