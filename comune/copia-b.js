/* Barbell Diva B — piano, confronto e fotografia della copia (passo 4). PURE.
 *
 * Niente rete, niente DOM: entrano documenti grezzi letti da A, escono il
 * piano di copia, il confronto e il documento `fotografia`. Cosi' i numeri si
 * possono verificare senza aprire un browser, e la pagina non ha scuse per
 * inventarne uno.
 *
 * Cosa si copia in questo passo (deciso con la coach): programmi (metadati v2
 * e programmi interi v1), schede attive (program-v2-sheet-) e sedute. Restano
 * fuori, e vengono DICHIARATI a schermo con il loro conteggio: gli esercizi
 * sciolti (program-v2-exercise-, servono alle schede troppo grandi), le
 * archiviate (program-v2-archived-, storia che B non mostra ancora) e le foto
 * di nutrizione (non sono allenamento).
 */

export const FAMIGLIE = Object.freeze([
  { chiave: "programmi", etichetta: "Programmi", sottoraccolta: "programmi" },
  { chiave: "schede", etichetta: "Schede attive", sottoraccolta: "schede" },
  { chiave: "sedute", etichetta: "Sedute (logbook)", sottoraccolta: "sedute" }
]);

const PREFISSI = Object.freeze({
  metaV2: "program-v2-meta-",
  v1: "program-v1-",
  scheda: "program-v2-sheet-",
  esercizio: "program-v2-exercise-",
  archiviata: "program-v2-archived-"
});

/* Un id appartiene a una famiglia se cade nell'intervallo [prefisso, prefisso.) */
function inFamiglia(id, prefisso) {
  const testo = String(id || "");
  return testo >= prefisso && testo < prefisso.slice(0, -1) + ".";
}

/* Serializzazione stabile: stesse chiavi, stesso ordine, timestamp leggibili.
 * Serve solo a confrontare due documenti, non a produrre un hash crittografico. */
function serializza(valore) {
  if (valore && typeof valore === "object" && typeof valore.toMillis === "function") {
    return "@" + valore.toMillis();
  }
  if (Array.isArray(valore)) return "[" + valore.map(serializza).join(",") + "]";
  if (valore && typeof valore === "object") {
    return "{" + Object.keys(valore).sort()
      .map((k) => JSON.stringify(k) + ":" + serializza(valore[k]))
      .join(",") + "}";
  }
  return JSON.stringify(valore === undefined ? null : valore);
}

export function impronta(dati) {
  return serializza(dati || {});
}

function elenco(valore) {
  return Array.isArray(valore) ? valore.filter((d) => d && typeof d === "object") : [];
}

/* Il piano: cosa si scrive, con quale id, in quale sottoraccolta di B.
 * L'ordine e' stabile (id crescente) cosi' due esecuzioni fanno la stessa cosa. */
export function pianoDiCopia(ingresso) {
  const i = ingresso || {};
  const programmi = elenco(i.programmi).map((d) => ({
    famiglia: "programmi",
    sottoraccolta: "programmi",
    id: String(d.id || ""),
    dati: d.dati || {}
  })).filter((v) => v.id);

  const schedeGrezze = elenco(i.schede);
  const schede = schedeGrezze
    .filter((d) => inFamiglia(d.id, PREFISSI.scheda))
    .map((d) => ({
      famiglia: "schede",
      sottoraccolta: "schede",
      id: String(d.id || ""),
      dati: d.dati || {}
    }));

  const sedute = elenco(i.sedute).map((d) => ({
    famiglia: "sedute",
    sottoraccolta: "sedute",
    id: String(d.id || ""),
    dati: d.dati || {}
  })).filter((v) => v.id);

  const voci = programmi.concat(schede, sedute).sort((a, b) => {
    if (a.famiglia !== b.famiglia) return a.famiglia < b.famiglia ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  const esclusi = {
    esercizi: schedeGrezze.filter((d) => inFamiglia(d.id, PREFISSI.esercizio)).length,
    archiviate: schedeGrezze.filter((d) => inFamiglia(d.id, PREFISSI.archiviata)).length,
    schedeV1Intere: elenco(i.programmi).filter((d) => inFamiglia(d.id, PREFISSI.v1)).length
  };

  return {
    voci,
    conteggi: { programmi: programmi.length, schede: schede.length, sedute: sedute.length },
    esclusi,
    totaleScritture: voci.length
  };
}

/* Quante voci per famiglia: le stesse tre righe della tabella a schermo. */
export function riepilogo(piano) {
  const p = piano || {};
  const voci = elenco(p.voci);
  return FAMIGLIE.map((f) => ({
    chiave: f.chiave,
    etichetta: f.etichetta,
    quante: voci.filter((v) => v.famiglia === f.chiave).length
  }));
}

/* Confronto finale: atteso (cio' che si e' copiato) contro scritto (cio' che B
 * contiene adesso). Non aggiusta niente: dichiara mancanti, in piu' e diversi. */
export function confrontaCopia(piano, scritto) {
  const p = piano || {};
  const s = scritto || {};
  const voci = elenco(p.voci);

  return FAMIGLIE.map((f) => {
    const attese = voci.filter((v) => v.famiglia === f.chiave);
    const lette = elenco(s[f.chiave]);
    const perId = Object.create(null);
    let inPiu = 0;
    let diversi = 0;
    let uguali = 0;

    lette.forEach((d) => {
      perId[String(d.id || "")] = d;
    });

    attese.forEach((a) => {
      const trovato = perId[a.id];
      if (!trovato) return;
      if (impronta(trovato.dati) === impronta(a.dati)) uguali += 1;
      else diversi += 1;
    });

    const attesiId = Object.create(null);
    attese.forEach((a) => { attesiId[a.id] = true; });
    Object.keys(perId).forEach((id) => {
      if (!attesiId[id]) inPiu += 1;
    });

    const mancanti = attese.filter((a) => !perId[a.id]).map((a) => a.id);
    return {
      chiave: f.chiave,
      etichetta: f.etichetta,
      atteso: attese.length,
      scritto: lette.length,
      uguali,
      diversi,
      inPiu,
      mancanti,
      esito: mancanti.length === 0 && diversi === 0 && inPiu === 0 && lette.length === attese.length
        ? "coincide"
        : "no"
    };
  });
}

/* Una riga per famiglia, pronta da mostrare. */
export function righeConfronto(confronto) {
  return elenco(confronto).map((c) => ({
    etichetta: c.etichetta,
    atteso: String(c.atteso),
    scritto: String(c.scritto),
    esito: c.esito === "coincide" ? "coincide" : "NON coincide",
    dettaglio: c.esito === "coincide"
      ? "stessi id, stesso contenuto"
      : [
          c.mancanti.length ? c.mancanti.length + " mancanti" : null,
          c.diversi ? c.diversi + " diversi" : null,
          c.inPiu ? c.inPiu + " in piu'" : null
        ].filter(Boolean).join(" · ")
  }));
}

/* Il documento `fotografia`: la carta d'identita' della copia, con la data. */
export function fotografia(ingresso) {
  const i = ingresso || {};
  const quando = i.quando instanceof Date ? i.quando : new Date();
  const confronto = elenco(i.confronto);
  const tuttoCoincide = confronto.length > 0 && confronto.every((c) => c.esito === "coincide");
  return {
    tipo: "fotografia-copia",
    versioneFormato: 1,
    creatoIl: quando.toISOString(),
    build: i.build == null ? null : String(i.build),
    progetto: i.progetto == null ? null : String(i.progetto),
    atleta: { uid: i.uid == null ? null : String(i.uid) },
    origine: "app A · barbellDivaAccounts/{uid}",
    destinazione: "zona B · bdB_atleti/{uid}",
    copiati: i.conteggi || { programmi: 0, schede: 0, sedute: 0 },
    confronto: confronto.map((c) => ({
      famiglia: c.chiave,
      atteso: c.atteso,
      scritto: c.scritto,
      esito: c.esito
    })),
    coincide: tuttoCoincide,
    esclusi: i.esclusi || { esercizi: 0, archiviate: 0, schedeV1Intere: 0 },
    nota: "Questa e' una fotografia: le sedute registrate dopo non arrivano qui da sole."
  };
}

const MESI = Object.freeze([
  "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
  "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
]);

/* Data leggibile senza dipendere dal locale del browser: la stessa stringa
 * ovunque. Ritorna null se la data non e' leggibile (mai una data inventata). */
export function dataLeggibile(iso) {
  if (!iso) return null;
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return null;
  const giorno = d.getDate();
  const ora = String(d.getHours()).padStart(2, "0");
  const minuti = String(d.getMinutes()).padStart(2, "0");
  return giorno + " " + MESI[d.getMonth()] + " " + d.getFullYear() + " alle " + ora + ":" + minuti;
}

/* La riga a schermo (passo 5): dichiara SEMPRE da dove vengono i dati e di
 * quando sono, oppure dice che la fotografia non c'e'. */
export function descriviFotografia(doc) {
  if (!doc || !doc.creatoIl) return "Nessuna fotografia in B: i dati non sono ancora stati copiati.";
  const quando = dataLeggibile(doc.creatoIl);
  if (!quando) return "Fotografia presente ma con una data illeggibile: da rifare.";
  const c = doc.copiati || {};
  return "Fotografia del " + quando + " — programmi " + (c.programmi || 0) +
    ", schede " + (c.schede || 0) + ", sedute " + (c.sedute || 0) +
    (doc.coincide === true ? " · confronto: coincide" : " · confronto: da controllare");
}
