/* Barbell Diva B — il volume conta davvero (passo B.14, 13/11/2026).
 *
 * Cosa e': la funzione che trasforma righe di serie in numeri — serie,
 * ripetizioni, tonnellaggio (serie x ripetizioni x peso) — raggruppati per
 * distretto e per settimana.
 *
 * Regole del filone, scritte qui perche' valgono per sempre:
 *  - funzione PURA: entrano righe, escono totali. Niente DOM, niente rete,
 *    niente scritture;
 *  - entra qualunque origine: oggi la scheda (righeDalleSchede), domani il
 *    Logbook. Il conto non sa da dove arrivano le righe, e non deve saperlo:
 *    cambia solo chi le prepara;
 *  - chi entra nel volume lo decide SOLO contaNelVolume() di tecniche-b.js:
 *    le tecniche contano sempre (anche le righe vecchie con contaVolume
 *    false), il resto conta se il campo non dice il contrario;
 *  - una settimana non scritta NON vale zero: non entra nel conto. Lo zero e'
 *    un dato, il vuoto non lo e';
 *  - peso mancante: serie e ripetizioni contano, il tonnellaggio NO. La
 *    colonna dice «non registrato», mai zero (regola di casa, 13/11/2026).
 */

import { contaNelVolume, eTecnica } from "./tecniche-b.js";

export const VOLUME_NON_REGISTRATO = "non registrato";

/* I nomi di campo che il conto accetta, in ordine di preferenza: se A li
 * cambia, si cambia una riga qui e la schermata resta ferma. */
export const CAMPI_VOLUME = Object.freeze({
  id: Object.freeze(["id", "rigaId"]),
  padre: Object.freeze(["padreId", "parentId"]),
  distretto: Object.freeze(["distretto", "muscolo", "gruppoMuscolare", "gruppo", "muscle"]),
  settimane: Object.freeze(["settimane", "weeks", "elencoSettimane"]),
  numeroSettimana: Object.freeze(["settimana", "week", "weekNumber", "numero"]),
  serie: Object.freeze(["serie", "sets", "set"]),
  ripetizioni: Object.freeze(["ripetizioni", "reps", "repsTesto"]),
  peso: Object.freeze(["peso", "pesoKg", "kg", "carico", "weight", "load"])
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

/* Un numero vero, o niente. «8-10» e «rest pause» non sono numeri: il conto
 * non li indovina e li tratta come vuoti. La virgola italiana vale. */
export function numeroDaTesto(valore) {
  const t = testo(valore).replace(",", ".");
  if (!t || !/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* I numeri come li legge un coach: migliaia col punto, decimali con la
 * virgola, e niente zeri appesi. */
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

/* Il tonnellaggio come va scritto: numero con «kg», oppure «non registrato».
 * Mai «0 kg» al posto di un peso che non c'e'. */
export function testoTonnellaggio(valore) {
  if (valore == null) return VOLUME_NON_REGISTRATO;
  const n = Number(valore);
  if (!Number.isFinite(n)) return VOLUME_NON_REGISTRATO;
  return formattaNumero(n) + " kg";
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

function distrettoDellaRiga(riga) {
  return testo(primoCampo(riga, CAMPI_VOLUME.distretto));
}

function nuovaCella() {
  return { serie: 0, ripetizioni: 0, tonnellaggio: 0, conTonnellaggio: false, senzaTonnellaggio: 0 };
}

function aggiungi(cella, serie, ripetizioni, tonnellaggio) {
  cella.serie += serie;
  if (ripetizioni != null) cella.ripetizioni += ripetizioni * serie;
  if (tonnellaggio == null) cella.senzaTonnellaggio += serie;
  else {
    cella.tonnellaggio += tonnellaggio;
    cella.conTonnellaggio = true;
  }
}

function chiudiCella(cella) {
  return {
    serie: cella.serie,
    ripetizioni: cella.ripetizioni,
    tonnellaggio: cella.conTonnellaggio ? Math.round(cella.tonnellaggio * 100) / 100 : null,
    senzaTonnellaggio: cella.senzaTonnellaggio
  };
}

/* Il conto. `righe` e' un elenco piatto di righe, ognuna con le sue settimane:
 *   { id, padreId?, tipo?: "tecnica", distretto?, contaVolume?, settimane: [
 *       { settimana?, serie, ripetizioni, peso? }, ... ] }
 * `opzioni.quante` aggiunge in fondo le settimane vuote che mancano (serve alla
 * schermata, che mostra sempre otto colonne: qui restano vuote, non a zero). */
export function contaVolume(righe, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const quante = Number.isFinite(Number(o.quante)) && Number(o.quante) > 0 ? Math.floor(Number(o.quante)) : 0;
  const elenco = Array.isArray(righe) ? righe.filter((r) => r && typeof r === "object") : [];
  const perId = Object.create(null);
  elenco.forEach((r) => {
    const id = testo(primoCampo(r, CAMPI_VOLUME.id));
    if (id) perId[id] = r;
  });

  const settimane = Object.create(null);
  const distretti = Object.create(null);
  const totale = nuovaCella();
  let fuoriVolume = 0;
  let contate = 0;
  let righeSenzaDistretto = 0;

  elenco.forEach((riga) => {
    if (!contaNelVolume(riga)) {
      fuoriVolume += 1;
      return;
    }
    contate += 1;
    const padreId = testo(primoCampo(riga, CAMPI_VOLUME.padre));
    const padre = padreId ? perId[padreId] || null : null;
    let distretto = distrettoDellaRiga(riga);
    if (!distretto && padre) distretto = distrettoDellaRiga(padre);
    if (!distretto) righeSenzaDistretto += 1;

    const suo = settimaneDellaRiga(riga);
    for (let k = 0; k < suo.length; k += 1) {
      const grezza = suo[k] && typeof suo[k] === "object" ? suo[k] : null;
      if (!grezza) continue;
      const serie = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.serie));
      if (serie == null || serie <= 0) continue;
      const ripetizioni = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.ripetizioni));
      const peso = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.peso));
      const tonnellaggio = ripetizioni != null && peso != null ? serie * ripetizioni * peso : null;
      const numeroGrezzo = numeroDaTesto(primoCampo(grezza, CAMPI_VOLUME.numeroSettimana));
      const numero = numeroGrezzo != null && numeroGrezzo > 0 ? Math.floor(numeroGrezzo) : k + 1;

      if (!settimane[numero]) settimane[numero] = nuovaCella();
      aggiungi(settimane[numero], serie, ripetizioni, tonnellaggio);
      if (distretto) {
        if (!distretti[distretto]) distretti[distretto] = nuovaCella();
        aggiungi(distretti[distretto], serie, ripetizioni, tonnellaggio);
      }
      aggiungi(totale, serie, ripetizioni, tonnellaggio);
    }
  });

  const numeri = Object.keys(settimane).map(Number).sort((a, b) => a - b);
  const ultima = numeri.length ? numeri[numeri.length - 1] : 0;
  for (let w = ultima + 1; w <= quante; w += 1) if (!settimane[w]) settimane[w] = nuovaCella();
  const elencoSettimane = Object.keys(settimane).map(Number).sort((a, b) => a - b).map((n) => Object.assign({ numero: n }, chiudiCella(settimane[n])));

  const elencoDistretti = Object.keys(distretti)
    .map((codice) => Object.assign({ distretto: codice }, chiudiCella(distretti[codice])))
    .sort((a, b) => b.serie - a.serie || a.distretto.localeCompare(b.distretto, "it"));

  const conSerie = elencoSettimane.filter((s) => s.serie > 0);
  const picco = conSerie.reduce((max, s) => (max == null || s.serie > max.serie ? s : max), null);
  const sommaSerie = Object.keys(settimane).map(Number).reduce((a, n) => a + settimane[n].serie, 0);

  return {
    totale: chiudiCella(totale),
    settimane: elencoSettimane,
    distretti: elencoDistretti,
    settimaneContate: conSerie.length,
    mediaSerie: conSerie.length ? Math.round((sommaSerie / conSerie.length) * 10) / 10 : null,
    picco: picco ? { numero: picco.numero, serie: picco.serie } : null,
    righeContate: contate,
    fuoriVolume,
    righeSenzaDistretto
  };
}

/* Il ponte con la scheda: prende le schede come le legge l'app e ne fa righe
 * per contaVolume. È l'unico punto che sa com'è fatta una scheda: il conto no. */
export function righeDalleSchede(schede) {
  const out = [];
  const elenco = Array.isArray(schede) ? schede : [];
  elenco.forEach((scheda) => {
    if (!scheda || typeof scheda !== "object") return;
    const esercizi = Array.isArray(scheda.esercizi) ? scheda.esercizi : [];
    esercizi.forEach((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return;
      const comune = {
        id: testo(primoCampo(e, CAMPI_VOLUME.id)),
        padreId: testo(primoCampo(e, CAMPI_VOLUME.padre)),
        distretto: distrettoDellaRiga(e),
        contaVolume: e.contaVolume
      };
      if (eTecnica(e)) {
        out.push(Object.assign({}, comune, { tipo: "tecnica", tecnica: e.tecnica, settimane: settimaneDellaRiga(e) }));
        return;
      }
      out.push(Object.assign({}, comune, { settimane: settimaneDellaRiga(e) }));
    });
  });
  return out;
}
