/* Barbell Diva B — il volume conta davvero (passo B.14, 13/11/2026).
 * Aggiornato al passo B.14f: una fonte sola, la scheda (il programma).
 *
 * Cosa e': la funzione che trasforma righe di serie in numeri, raggruppati per
 * distretto e per settimana.
 *
 * Il volume e' SERIE x RIPETIZIONI. Il tonnellaggio non c'e' piu' (Alice,
 * 13/11/2026: «il tonnellaggio non serve, serve il volume settimanale che si fa
 * in serie x ripetizioni»). Se un giorno torna, torna come campo a parte.
 *
 * Regole del filone:
 *  - funzione PURA: entrano righe, escono numeri. Niente DOM, niente rete;
 *  - entra qualunque origine (dal B.14f solo la scheda): il conto non sa da
 *    dove arrivano le righe;
 *  - chi entra lo decide SOLO contaNelVolume() di tecniche-b.js;
 *  - la regola delle sinergie: 1 punto al distretto bersaglio, 0,5 a ciascuno
 *    dei secondari. E' una costante sola, qui sotto;
 *  - una settimana non scritta NON vale zero: non entra nel conto;
 *  - peso e ripetizioni mancanti non fermano il conto delle serie: il volume e'
 *    serie x ripetizioni, e quando le ripetizioni non ci sono la riga conta le
 *    serie e dichiara le ripetizioni mancanti.
 */

import { contaNelVolume, eTecnica } from "./tecniche-b.js";
import { muscoliEsercizio } from "./muscoli-b.js";

/* La regola delle sinergie, in un punto solo. */
export const PUNTO_BERSAGLIO = 1;
export const PUNTO_SECONDARIO = 0.5;

export const VOLUME_NON_REGISTRATO = "non registrato";

export const CAMPI_VOLUME = Object.freeze({
  id: Object.freeze(["id", "rigaId"]),
  padre: Object.freeze(["padreId", "parentId"]),
  nome: Object.freeze(["nome", "name", "esercizio"]),
  distretto: Object.freeze(["distretto", "muscolo", "gruppoMuscolare", "gruppo", "muscle"]),
  settimane: Object.freeze(["settimane", "weeks", "elencoSettimane"]),
  numeroSettimana: Object.freeze(["settimana", "week", "weekNumber", "numero"]),
  serie: Object.freeze(["serie", "sets", "set"]),
  ripetizioni: Object.freeze(["ripetizioni", "reps", "repsTesto"]),
  ripetizioniTotali: Object.freeze(["ripetizioniTotali", "repsTotali"]),
  ripetizioniMancanti: Object.freeze(["ripetizioniMancanti", "repsMancanti"])
});

function primoCampo(oggetto, nomi) {
  if (!oggetto || typeof oggetto !== "object") return undefined;
  for (let i = 0; i < nomi.length; i += 1) {
    const nome = nomi[i];
    if (!Object.prototype.hasOwnProperty.call(oggetto, nome)) continue;
    const v = oggetto[nome];
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
    return v;
  }
  return undefined;
}

function testo(valore) {
  if (valore == null) return "";
  return String(valore).trim();
}

/* Un numero vero, o niente. «8-10» e «rest pause» non sono numeri. */
export function numeroDaTesto(valore) {
  const t = testo(valore).replace(",", ".");
  if (!t || !/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* I numeri come li legge un coach: migliaia col punto, decimali con la virgola. */
export function formattaNumero(valore) {
  const n = Number(valore);
  if (!Number.isFinite(n)) return VOLUME_NON_REGISTRATO;
  const arrotondato = Math.round(n * 100) / 100;
  const segno = arrotondato < 0 ? "-" : "";
  const assoluto = Math.abs(arrotondato);
  const intero = Math.trunc(assoluto);
  const decimali = Math.round((assoluto - intero) * 100);
  const testoIntero = String(intero).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (!decimali) return segno + testoIntero;
  let coda = String(decimali).padStart(2, "0");
  if (coda.charAt(1) === "0") coda = coda.charAt(0);
  return segno + testoIntero + "," + coda;
}

/* Il volume come va scritto: numero o «non registrato». */
export function testoVolume(valore) {
  if (valore == null) return VOLUME_NON_REGISTRATO;
  const n = Number(valore);
  if (!Number.isFinite(n)) return VOLUME_NON_REGISTRATO;
  return formattaNumero(n);
}

function settimaneDellaRiga(riga) {
  const dirette = primoCampo(riga, CAMPI_VOLUME.settimane);
  if (Array.isArray(dirette)) return dirette;
  const prescrizione = riga && riga.prescrizione && typeof riga.prescrizione === "object" ? riga.prescrizione : null;
  if (prescrizione) {
    const dentro = primoCampo(prescrizione, CAMPI_VOLUME.settimane);
    if (Array.isArray(dentro)) return dentro;
  }
  return [];
}

function cella() {
  return { serie: 0, ripetizioni: 0, ripetizioniMancanti: 0, dirette: 0, indirette: 0 };
}

function chiudi(c) {
  const dirette = Math.round(c.dirette * 100) / 100;
  const indirette = Math.round(c.indirette * 100) / 100;
  return {
    serie: Math.round(c.serie * 100) / 100,
    ripetizioni: Math.round(c.ripetizioni * 100) / 100,
    ripetizioniMancanti: c.ripetizioniMancanti,
    dirette,
    indirette,
    totale: Math.round((dirette + indirette) * 100) / 100
  };
}

/* Somma una riga dentro una cella: le serie vanno sui primari a punto pieno,
 * sui secondari a mezzo punto. Un distretto che e' gia' primario non prende
 * anche il mezzo punto. */
function sommaRiga(c, serie, ripetizioni, primari, secondari, totali, mancanti) {
  c.serie += serie;
  if (totali != null && Number.isFinite(totali)) c.ripetizioni += totali;
  else if (ripetizioni != null) c.ripetizioni += serie * ripetizioni;
  else c.ripetizioniMancanti += serie;
  if (Number.isFinite(mancanti) && mancanti > 0) c.ripetizioniMancanti += mancanti;
  c.dirette += PUNTO_BERSAGLIO * serie * primari.length;
  const secondariUtili = secondari.filter((d) => primari.indexOf(d) === -1);
  c.indirette += PUNTO_SECONDARIO * serie * secondariUtili.length;
  return secondariUtili;
}

/* Il conto.
 * `righe`: elenco piatto, ognuna con settimane, primari e secondari.
 *   { id, padreId?, tipo?, distretto?, primari: [...], secondari: [...],
 *     settimane: [{ settimana?, serie, ripetizioni }] }
 * `opzioni.soloDiretto` = true: l'indiretto non entra nel totale (lo switch).
 * `opzioni.quante` = quante colonne mostrare; le settimane mai scritte restano
 * vuote, con serie 0 e nessuna diretta: non valgono zero, non valgono niente. */
export function contaVolume(righe, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quante = Number.isFinite(Number(o.quante)) && Number(o.quante) > 0 ? Math.floor(Number(o.quante)) : 0;
  const soloDiretto = o.soloDiretto === true;
  const elenco = Array.isArray(righe) ? righe.filter((r) => r && typeof r === "object") : [];
  const perId = Object.create(null);
  elenco.forEach((r) => {
    const id = testo(primoCampo(r, CAMPI_VOLUME.id));
    if (id) perId[id] = r;
  });

  const settimane = Object.create(null);
  const distretti = Object.create(null);
  const mappa = Object.create(null);
  const totale = cella();
  let fuoriVolume = 0;
  let contate = 0;
  let senzaSecondari = 0;
  let senzaDistretto = 0;

  const cellaDistretto = (d) => {
    if (!distretti[d]) { distretti[d] = cella(); mappa[d] = Object.create(null); }
    return distretti[d];
  };

  elenco.forEach((riga) => {
    if (!contaNelVolume(riga)) {
      fuoriVolume += 1;
      return;
    }
    contate += 1;
    const padreId = testo(primoCampo(riga, CAMPI_VOLUME.padre));
    const padre = padreId ? perId[padreId] || null : null;
    let primari = Array.isArray(riga.primari) ? riga.primari.slice() : [];
    let secondari = Array.isArray(riga.secondari) ? riga.secondari.slice() : [];
    if (!primari.length) {
      const noto = testo(primoCampo(riga, CAMPI_VOLUME.distretto));
      if (noto) primari = [noto];
    }
    if ((!primari.length || !secondari.length) && padre) {
      if (!primari.length && Array.isArray(padre.primari)) primari = padre.primari.slice();
      if (!secondari.length && Array.isArray(padre.secondari)) secondari = padre.secondari.slice();
    }
    if (!primari.length) {
      senzaDistretto += 1;
      return;
    }
    if (!secondari.length) senzaSecondari += 1;

    const suo = settimaneDellaRiga(riga);
    for (let k = 0; k < suo.length; k += 1) {
      const grezza = suo[k] && typeof suo[k] === "object" ? suo[k] : null;
      if (!grezza) continue;
      const serie = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.serie));
      if (serie == null || serie <= 0) continue;
      const ripetizioni = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.ripetizioni));
      const totali = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.ripetizioniTotali));
      const mancanti = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.ripetizioniMancanti));
      const numeroGrezzo = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.numeroSettimana));
      const numero = numeroGrezzo != null && numeroGrezzo >= 0 ? Math.floor(numeroGrezzo) : k + 1;

      if (!settimane[numero]) settimane[numero] = cella();
      const utili = sommaRiga(settimane[numero], serie, ripetizioni, primari, secondari);
      primari.forEach((d) => {
        const c = cellaDistretto(d);
        sommaRiga(c, serie, ripetizioni, [d], [], totali, mancanti);
        if (!mappa[d][numero]) mappa[d][numero] = cella();
        sommaRiga(mappa[d][numero], serie, ripetizioni, [d], [], totali, mancanti);
      });
      utili.forEach((d) => {
        const c = cellaDistretto(d);
        sommaRiga(c, serie, ripetizioni, [], [d], totali, mancanti);
        if (!mappa[d][numero]) mappa[d][numero] = cella();
        sommaRiga(mappa[d][numero], serie, ripetizioni, [], [d], totali, mancanti);
      });
      /* il totale del programma: una volta sola, con primari e secondari */
      sommaRiga(totale, serie, ripetizioni, primari, secondari, totali, mancanti);
    }
  });

  const numeri = Object.keys(settimane).map(Number).sort((a, b) => a - b);
  const ultima = numeri.length ? numeri[numeri.length - 1] : 0;
  for (let w = ultima + 1; w <= quante; w += 1) if (!settimane[w]) settimane[w] = cella();
  const elencoSettimane = Object.keys(settimane).map(Number).sort((a, b) => a - b).map((n) => Object.assign({ numero: n }, chiudi(settimane[n])));

  const elencoDistretti = Object.keys(distretti)
    .map((d) => Object.assign({ distretto: d }, chiudi(distretti[d])))
    .sort((a, b) => b.totale - a.totale || a.distretto.localeCompare(b.distretto, "it"));

  const perDistrettoSettimana = Object.create(null);
  Object.keys(mappa).forEach((d) => {
    perDistrettoSettimana[d] = Object.keys(mappa[d]).map(Number).sort((a, b) => a - b).map((n) => Object.assign({ numero: n }, chiudi(mappa[d][n])));
  });

  const chiuso = chiudi(totale);
  const fuoriSettimana = settimane[0] ? chiudi(settimane[0]) : null;
  const dirette = soloDiretto ? chiuso.dirette : chiuso.dirette;
  const indirette = soloDiretto ? 0 : chiuso.indirette;
  /* La settimana 0 e' il secchio senza settimana: entra nel totale, non nella media. */
  const settimaneViste = elencoSettimane.filter((s) => s.serie > 0 && s.numero > 0);
  const picco = settimaneViste.reduce((max, s) => {
    const v = soloDiretto ? s.dirette : s.totale;
    const m = max ? (soloDiretto ? max.dirette : max.totale) : -1;
    return v > m ? s : max;
  }, null);
  const sommaDirette = settimaneViste.reduce((a, s) => a + s.dirette, 0);
  const sommaIndirette = settimaneViste.reduce((a, s) => a + s.indirette, 0);
  const sommaTotale = settimaneViste.reduce((a, s) => a + s.totale, 0);

  return {
    soloDiretto,
    totale: { serie: chiuso.serie, ripetizioni: chiuso.ripetizioni, ripetizioniMancanti: chiuso.ripetizioniMancanti, dirette, indirette, totale: Math.round((dirette + indirette) * 100) / 100 },
    settimane: elencoSettimane.map((s) => Object.assign({}, s, { totale: soloDiretto ? s.dirette : s.totale, indirette: soloDiretto ? 0 : s.indirette })),
    distretti: elencoDistretti.map((d) => Object.assign({}, d, { totale: soloDiretto ? d.dirette : d.totale, indirette: soloDiretto ? 0 : d.indirette })),
    perDistrettoSettimana,
    senzaSettimana: fuoriSettimana,
    settimaneContate: settimaneViste.length,
    mediaDirette: settimaneViste.length ? Math.round((sommaDirette / settimaneViste.length) * 10) / 10 : null,
    mediaTotale: settimaneViste.length ? Math.round(((soloDiretto ? sommaDirette : sommaTotale) / settimaneViste.length) * 10) / 10 : null,
    sinergiePct: soloDiretto || !(sommaTotale > 0) ? (soloDiretto ? 0 : null) : Math.round((sommaIndirette / sommaTotale) * 1000) / 10,
    picco: picco ? { numero: picco.numero, valore: soloDiretto ? picco.dirette : picco.totale } : null,
    righeContate: contate,
    fuoriVolume,
    righeSenzaSecondari: senzaSecondari,
    righeSenzaDistretto: senzaDistretto
  };
}

/* Il ponte con la scheda: prende le schede come le legge l'app e ne fa righe
 * per contaVolume. E' l'unico punto che sa com'e' fatta una scheda: il conto no.
 * Qui si aggancia anche la mappa dei muscoli: nome esercizio -> primari e
 * secondari. Senza voce in mappa resta il distretto della scheda, e la riga
 * conta solo come diretta. */
export function righeDalleSchede(schede) {
  const out = [];
  const elenco = Array.isArray(schede) ? schede : [];
  elenco.forEach((scheda) => {
    if (!scheda || typeof scheda !== "object") return;
    const esercizi = Array.isArray(scheda.esercizi) ? scheda.esercizi : [];
    esercizi.forEach((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return;
      const nome = testo(e.n != null ? e.n : primoCampo(e, CAMPI_VOLUME.nome));
      const distretto = testo(primoCampo(e, CAMPI_VOLUME.distretto));
      const muscoli = muscoliEsercizio(nome, distretto);
      const comune = {
        id: testo(primoCampo(e, CAMPI_VOLUME.id)),
        padreId: testo(primoCampo(e, CAMPI_VOLUME.padre)),
        nome,
        distretto,
        primari: muscoli ? muscoli.primari.slice() : [],
        secondari: muscoli ? muscoli.secondari.slice() : [],
        fonte: muscoli ? muscoli.fonte : "",
        contaVolume: e.contaVolume
      };
      const settimane = settimaneDellaRiga(e);
      if (eTecnica(e)) {
        out.push(Object.assign({}, comune, { tipo: "tecnica", tecnica: e.tecnica, settimane }));
        return;
      }
      out.push(Object.assign({}, comune, { settimane }));
    });
  });
  return out;
}
