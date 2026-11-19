/* Barbell Diva B - PASSO 4c: il conto dell'Analisi programmazione.
 *
 * Perche' esiste. Fino a stasera il conto stava DENTRO la vista
 * (vista-programma.js, funzione analisi): un conto dentro il disegno non si
 * puo' provare senza montare una pagina, ignorava contaNelVolume(e) — quindi
 * poteva dire un numero diverso dal Volume per lo stesso distretto — e
 * guardava solo la settimana 1, che non e' la domanda vera di chi prepara un
 * blocco.
 *
 * Qui non c'e' DOM ne' Firebase: entrano le schede, esce il conto. Le serie
 * passano SOLO da contaNelVolume(e), la stessa funzione che usa il Volume:
 * cosi' i due numeri non possono divergere (regola della funzione unica).
 */

import { contaNelVolume } from "./tecniche-b.js";
import { codiceDistretto } from "./distretti-b.js";

/* Le settimane di un esercizio, dalla prima lista che ne porta i valori.
 * Le schede vecchie le tengono in posti diversi: leggerne una sola faceva
 * sparire righe vere dal conto. */
export function settimaneDiEsercizio(e) {
  if (!e || typeof e !== "object") return [];
  const candidati = [
    e.prescrizione && e.prescrizione.elencoSettimane,
    e.elencoSettimane,
    e.weeks,
    e.progression && e.progression.weeks,
    e.prescription && e.prescription.weeks
  ];
  for (let i = 0; i < candidati.length; i += 1) {
    if (Array.isArray(candidati[i]) && candidati[i].length) return candidati[i];
  }
  return [];
}

function numero(testo) {
  if (testo == null || testo === "") return null;
  const n = Number(String(testo).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function serieDi(w) {
  if (!w || typeof w !== "object") return null;
  const v = numero(w.serie != null ? w.serie : w.sets);
  return v != null && v >= 0 ? v : null;
}

function ripetizioniDi(w) {
  if (!w || typeof w !== "object") return null;
  const grezzo = w.ripetizioni != null ? w.ripetizioni : (w.reps != null ? w.reps : "");
  const trovato = String(grezzo).match(/\d+(?:[.,]\d+)?/);
  if (!trovato) return null;
  return numero(trovato[0]);
}

function pesoDi(w) {
  if (!w || typeof w !== "object") return null;
  const primo = w.peso != null ? w.peso : (w.kg != null ? w.kg : w.carico);
  const v = numero(primo);
  return v != null && v > 0 ? v : null;
}

/* Quante settimane hanno le schede: il massimo fra le righe, mai meno di 8
 * (la tabella del programma ne mostra sempre otto). */
export function settimaneDelleSchede(schede) {
  let quante = 8;
  (Array.isArray(schede) ? schede : []).forEach((s) => {
    ((s && s.esercizi) || []).forEach((e) => {
      const sett = settimaneDiEsercizio(e);
      if (sett.length > quante) quante = sett.length;
    });
  });
  return quante;
}

/* Il conto. opzioni.settimana: 1..N, oppure null / "blocco" per tutto il
 * blocco. Per ogni distretto: serie della settimana scelta, serie del blocco
 * intero, tonnellaggio (serie x ripetizioni x peso) e le schede in cui il
 * distretto compare. Il tonnellaggio non conosce lo zero: se un peso manca
 * dice "non registrato", come l'Archivio. */
export function analisiProgrammazione(schede, opzioni) {
  const o = opzioni || {};
  const quante = settimaneDelleSchede(schede);
  let settimana = o.settimana == null ? null : Number(o.settimana);
  if (settimana != null && (!Number.isInteger(settimana) || settimana < 1 || settimana > quante)) settimana = 1;
  const perDistretto = Object.create(null);
  let righeContate = 0;

  (Array.isArray(schede) ? schede : []).forEach((s) => {
    const codiceScheda = String((s && (s.codice || s.code)) || "");
    ((s && s.esercizi) || []).forEach((e) => {
      if (!e || typeof e !== "object" || e.deletedAt) return;
      const cod = codiceDistretto(e.muscolo != null ? e.muscolo : e.muscle);
      if (cod === "\u2014") return;
      /* La riga che non conta nel volume non entra nel conto: e' la stessa
       * regola del Volume, ed e' il punto che la 125.2 sorveglia. */
      if (!contaNelVolume(e)) return;
      const sett = settimaneDiEsercizio(e);
      if (!sett.length) return;
      const voce = perDistretto[cod] || (perDistretto[cod] = {
        codice: cod, serie: 0, serieBlocco: 0, tonnellaggio: 0,
        tonnellaggioNoto: true, schede: []
      });
      if (codiceScheda && voce.schede.indexOf(codiceScheda) === -1) voce.schede.push(codiceScheda);

      sett.forEach((w, indice) => {
        const serie = serieDi(w);
        if (serie == null) return;
        righeContate += 1;
        voce.serieBlocco += serie;
        const nellaScelta = settimana == null || indice === settimana - 1;
        if (nellaScelta) voce.serie += serie;
        const rip = ripetizioniDi(w);
        const peso = pesoDi(w);
        if (rip == null || peso == null) { voce.tonnellaggioNoto = false; return; }
        if (nellaScelta) voce.tonnellaggio += serie * rip * peso;
      });
    });
  });

  const distretti = Object.keys(perDistretto)
    .map((k) => perDistretto[k])
    .sort((a, b) => b.serie - a.serie || b.serieBlocco - a.serieBlocco || a.codice.localeCompare(b.codice));

  const totaleSerie = distretti.reduce((acc, d) => acc + d.serie, 0);
  const totaleSerieBlocco = distretti.reduce((acc, d) => acc + d.serieBlocco, 0);
  const tonnellaggioNoto = distretti.every((d) => d.tonnellaggioNoto);
  const totaleTonnellaggio = distretti.reduce((acc, d) => acc + d.tonnellaggio, 0);

  return {
    settimana: settimana,
    blocco: settimana == null,
    quante: quante,
    distretti: distretti,
    righeContate: righeContate,
    totaleSerie: totaleSerie,
    totaleSerieBlocco: totaleSerieBlocco,
    totaleTonnellaggio: totaleTonnellaggio,
    tonnellaggioNoto: tonnellaggioNoto
  };
}

/* Il tonnellaggio in parola: o il numero, o "non registrato". Mai zero al
 * posto di un peso che nessuno ha scritto. */
export function tonnellaggioInParola(kg, noto) {
  if (!noto) return "non registrato";
  return Math.round(Number(kg) || 0) + " kg";
}
