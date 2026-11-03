/* Barbell Diva B — carichi per esercizio (fase 2d, SOLA LETTURA).
 *
 * Cosa fa: dalle sedute già lette nella sottoraccolta `sessions` tira fuori i
 * PESI che A registra esercizio per esercizio, e ne guarda l'andamento nel
 * tempo. Nessuna rete, nessun DOM, nessuna scrittura: solo aritmetica su
 * oggetti già in memoria.
 *
 * Perché è scritto così, e non come un lettore con un solo schema fisso:
 * il contratto delle sedute di A non è documentato riga per riga per la parte
 * esercizi. Allora qui i nomi di campo che B prova a leggere sono DICHIARATI in
 * CAMPI_CARICHI, e il modulo conta anche gli esercizi che ha visto senza
 * riuscire a leggerne il peso. La card mostra questi due numeri: così, se un
 * giorno i campi hanno altri nomi, si vede subito dalla schermata invece di
 * ricevere un «zero» silenzioso.
 *
 * Regola di casa: un peso che non c'è vale «non registrato». Mai 0, mai una
 * stima, mai un carico dedotto dal programma. E nessun confronto tra esercizi
 * diversi: due esercizi non si sommano, non si mediano, non si mettono in gara.
 */

import { dataSeduta } from "./struttura.js";

const GIORNO_MS = 86400000;

/* Soglie dichiarate, non nascoste nel codice. */
export const SOGLIE_CARICHI = Object.freeze({
  finestraSettimane: 8,
  minOccorrenze: 3,
  variazioneAttenzione: 0.05,
  minSeriePerMassimo: 1
});

/* I nomi di campo che B accetta, in ordine di preferenza. Sono dichiarati qui
 * e non sparsi nel codice: se A cambia nome a un campo, si cambia una riga. */
export const CAMPI_CARICHI = Object.freeze({
  esercizi: Object.freeze(["exercises", "esercizi", "exerciseList"]),
  nome: Object.freeze(["name", "nome", "exercise", "esercizio", "exerciseName"]),
  serie: Object.freeze(["sets", "serie", "setList"]),
  peso: Object.freeze(["weight", "peso", "kg", "carico", "load"]),
  ripetizioni: Object.freeze(["reps", "ripetizioni", "rip", "repetitions"])
});

const NON_REGISTRATO = "non registrato";

/* Primo campo presente tra quelli accettati. Non indovina: se nessuno c'è,
 * torna undefined e chi chiama lo tratta come dato assente. */
function primoCampo(oggetto, nomi) {
  if (!oggetto || typeof oggetto !== "object") return undefined;
  for (let i = 0; i < nomi.length; i += 1) {
    const nome = nomi[i];
    if (Object.prototype.hasOwnProperty.call(oggetto, nome) && oggetto[nome] != null) return oggetto[nome];
  }
  return undefined;
}

/* Peso numerico o null. Accetta "40", "40 kg", "40,5", "40 kg x 8": il primo
 * numero della stringa è il carico. Una virgola vale come separatore decimale
 * (si scrive così in palestra). Zero è un peso vero (corpo libero), un testo
 * senza cifre non lo è. */
export function numeroCarico(valore) {
  if (typeof valore === "number") return Number.isFinite(valore) ? valore : null;
  if (valore == null || valore === "") return null;
  const testo = String(valore).replace(/\s+/g, " ").replace(",", ".");
  const trovato = testo.match(/-?\d+(?:\.\d+)?/);
  if (!trovato) return null;
  const numero = Number(trovato[0]);
  return Number.isFinite(numero) ? numero : null;
}

function ripetizioniDi(valore) {
  const n = numeroCarico(valore);
  if (n == null || n < 0) return null;
  return Math.round(n);
}

function arrotondaKg(valore) {
  return Math.round(valore * 10) / 10;
}

function percentuale(da, a) {
  if (da == null || a == null || da === 0) return null;
  return Math.round(((a - da) / da) * 1000) / 10;
}

/* Un oggetto-serie può essere una numero ("40"), una stringa ("40 kg x 8")
 * oppure un oggetto {weight, reps}. Qui si normalizza in {peso, ripetizioni}. */
function serieNormalizzata(serie) {
  if (serie == null) return null;
  if (typeof serie === "number" || typeof serie === "string") {
    return { peso: numeroCarico(serie), ripetizioni: null };
  }
  if (typeof serie !== "object") return null;
  const peso = numeroCarico(primoCampo(serie, CAMPI_CARICHI.peso));
  const ripetizioni = ripetizioniDi(primoCampo(serie, CAMPI_CARICHI.ripetizioni));
  if (peso == null && ripetizioni == null) return null;
  return { peso, ripetizioni };
}

/* Esercizi di una seduta, normalizzati. Ritorna anche quanti esercizi sono
 * stati VISTI e quanti avevano un peso leggibile: la differenza è il segnale
 * che i nomi di campo non combaciano. */
export function eserciziDellaSeduta(seduta) {
  const elenco = primoCampo(seduta, CAMPI_CARICHI.esercizi);
  if (!Array.isArray(elenco)) return { esercizi: [], visti: 0, conPeso: 0 };
  const esercizi = [];
  let visti = 0;
  elenco.forEach((voce) => {
    if (!voce || typeof voce !== "object") return;
    visti += 1;
    const nomeGrezzo = primoCampo(voce, CAMPI_CARICHI.nome);
    const nome = String(nomeGrezzo == null ? "" : nomeGrezzo).trim();
    if (!nome) return;
    const serieGrezze = primoCampo(voce, CAMPI_CARICHI.serie);
    let serie = [];
    if (Array.isArray(serieGrezze)) {
      serie = serieGrezze.map(serieNormalizzata).filter(Boolean);
    } else {
      const singola = serieNormalizzata({
        [CAMPI_CARICHI.peso[0]]: primoCampo(voce, CAMPI_CARICHI.peso),
        [CAMPI_CARICHI.ripetizioni[0]]: primoCampo(voce, CAMPI_CARICHI.ripetizioni)
      });
      if (singola && (singola.peso != null || singola.ripetizioni != null)) serie = [singola];
    }
    const conPeso = serie.filter((s) => s.peso != null);
    const ripetizioni = serie.reduce((tot, s) => tot + (s.ripetizioni == null ? 0 : s.ripetizioni), 0);
    if (!conPeso.length) {
      esercizi.push({ nome, serie: serie.length, serieConPeso: 0, massimo: null, ripetizioni });
      return;
    }
    const massimo = conPeso.reduce((max, s) => (s.peso > max ? s.peso : max), conPeso[0].peso);
    esercizi.push({ nome, serie: serie.length, serieConPeso: conPeso.length, massimo: arrotondaKg(massimo), ripetizioni });
  });
  return {
    esercizi,
    visti,
    conPeso: esercizi.filter((e) => e.massimo != null).length
  };
}

function chiaveEsercizio(nome) {
  return String(nome).trim().toLowerCase().replace(/\s+/g, " ");
}

/* Carichi per esercizio, con l'andamento dentro la finestra dichiarata.
 *
 * opzioni: { oggi: Date, settimane: number }
 * Ritorna:
 *   { esercizi, visti, conPeso, seduteConCarichi, occorrenze, fuoriFinestra,
 *     finestraSettimane, oggi }
 * Ogni esercizio porta: nome, chiave, occorrenze (dalla più vecchia alla più
 * recente), ultimoMassimo, massimoStorico, variazione (percentuale tra la prima
 * e l'ultima occorrenza della finestra), giorniDallUltima, serieUltima.
 */
export function carichiPerEsercizio(sedute, opzioni) {
  const opz = opzioni || {};
  const oggiRaw = opz.oggi instanceof Date ? opz.oggi : new Date();
  const oggi = new Date(Date.UTC(oggiRaw.getUTCFullYear(), oggiRaw.getUTCMonth(), oggiRaw.getUTCDate()));
  const settimane = Number.isFinite(Number(opz.settimane)) ? Number(opz.settimane) : SOGLIE_CARICHI.finestraSettimane;
  const inizioFinestra = oggi.getTime() - settimane * 7 * GIORNO_MS;

  const elenco = Array.isArray(sedute) ? sedute : [];
  const perChiave = Object.create(null);
  const ordine = [];
  let visti = 0;
  let conPeso = 0;
  let seduteConCarichi = 0;
  let fuoriFinestra = 0;

  elenco.forEach((seduta) => {
    if (!seduta || typeof seduta !== "object") return;
    const data = dataSeduta(seduta.dateInput);
    if (!data) return;
    const estratto = eserciziDellaSeduta(seduta);
    visti += estratto.visti;
    conPeso += estratto.conPeso;
    if (estratto.conPeso > 0) seduteConCarichi += 1;
    estratto.esercizi.forEach((esercizio) => {
      if (esercizio.massimo == null) return;
      if (data.getTime() < inizioFinestra) {
        fuoriFinestra += 1;
        return;
      }
      const chiave = chiaveEsercizio(esercizio.nome);
      if (!Object.prototype.hasOwnProperty.call(perChiave, chiave)) {
        perChiave[chiave] = { nome: esercizio.nome, chiave, occorrenze: [] };
        ordine.push(chiave);
      }
      perChiave[chiave].occorrenze.push({
        data,
        dateInput: String(seduta.dateInput || "").slice(0, 10),
        massimo: esercizio.massimo,
        serie: esercizio.serieConPeso,
        ripetizioni: esercizio.ripetizioni || null
      });
    });
  });

  const esercizi = ordine
    .map((chiave) => {
      const gruppo = perChiave[chiave];
      const occorrenze = gruppo.occorrenze.sort((a, b) => a.data.getTime() - b.data.getTime());
      const ultima = occorrenze[occorrenze.length - 1];
      const prima = occorrenze[0];
      const massimoStorico = occorrenze.reduce((max, o) => (o.massimo > max ? o.massimo : max), occorrenze[0].massimo);
      return {
        nome: gruppo.nome,
        chiave,
        occorrenze,
        numeroOccorrenze: occorrenze.length,
        ultimoMassimo: ultima.massimo,
        ultimaData: ultima.dateInput,
        massimoStorico: arrotondaKg(massimoStorico),
        primaData: prima.dateInput,
        variazione: occorrenze.length >= 2 ? percentuale(prima.massimo, ultima.massimo) : null,
        giorniDallUltima: Math.round((oggi.getTime() - ultima.data.getTime()) / GIORNO_MS),
        serieUltima: ultima.serie
      };
    })
    .sort((a, b) => b.numeroOccorrenze - a.numeroOccorrenze || b.ultimoMassimo - a.ultimoMassimo || a.chiave.localeCompare(b.chiave));

  return {
    oggi,
    finestraSettimane: settimane,
    esercizi,
    visti,
    conPeso,
    seduteConCarichi,
    occorrenze: esercizi.reduce((tot, e) => tot + e.numeroOccorrenze, 0),
    fuoriFinestra
  };
}

/* Un esercizio con abbastanza storia per dire qualcosa. La soglia è
 * dichiarata: sotto minOccorrenze non si commenta l'andamento. */
export function eserciziConStoria(carichi) {
  const elenco = carichi && Array.isArray(carichi.esercizi) ? carichi.esercizi : [];
  return elenco.filter((e) => e.numeroOccorrenze >= SOGLIE_CARICHI.minOccorrenze);
}

/* ---------- righe pronte per la card (condivise da PC e telefono) ---------- */

export function righeCarichi(carichi) {
  if (!carichi || !carichi.esercizi || !carichi.esercizi.length) {
    const righe = [{ testo: NON_REGISTRATO, classe: "valore" }];
    if (carichi && carichi.visti > 0) {
      righe.push({
        testo: carichi.visti + " esercizi letti nelle sedute, nessuno con un peso numerico riconoscibile: i campi del carico non sono registrati, e non li stimo.",
        classe: "errore"
      });
    } else {
      righe.push({ testo: "le sedute non portano esercizi con peso: nessun carico da leggere, e nessun carico dedotto dal programma.", classe: "riga" });
    }
    return righe;
  }
  const righe = [
    { testo: carichi.esercizi.length + " esercizi", classe: "valore" },
    {
      testo: "finestra: " + carichi.finestraSettimane + " settimane \u00b7 " + carichi.occorrenze + " pesi letti su " + carichi.seduteConCarichi + " sedute",
      classe: "riga"
    }
  ];
  carichi.esercizi.slice(0, 3).forEach((esercizio) => {
    const variazione = esercizio.variazione == null
      ? NON_REGISTRATO
      : (esercizio.variazione > 0 ? "+" : "") + esercizio.variazione + "%";
    righe.push({
      testo: esercizio.nome + " \u00b7 " + esercizio.ultimoMassimo + " kg \u00b7 " + esercizio.numeroOccorrenze + " volte \u00b7 " + variazione,
      classe: "riga"
    });
  });
  if (carichi.esercizi.length > 3) {
    righe.push({ testo: "e altri " + (carichi.esercizi.length - 3) + " esercizi con peso", classe: "riga" });
  }
  const senzaPeso = carichi.visti - carichi.conPeso;
  if (senzaPeso > 0) {
    righe.push({
      testo: "esercizi visti senza peso numerico: " + senzaPeso + " (restano fuori dai conti, non valgono zero)",
      classe: "riga"
    });
  }
  if (carichi.fuoriFinestra > 0) {
    righe.push({ testo: "pesi più vecchi della finestra: " + carichi.fuoriFinestra + " (fuori dai conti, non cancellati)", classe: "riga" });
  }
  return righe;
}
