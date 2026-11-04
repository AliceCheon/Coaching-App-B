/* Barbell Diva B — i conti della Pianificazione (fase 2.4).
 *
 * Funzioni pure: entrano le sedute già lette, escono settimane e rotazione.
 * Regola di casa, la stessa della Overview: qui non si inventa il piano.
 * Il documento-programma letto da B porta nome, stato e poco altro: la
 * rotazione PREVISTA, lo scarico e il test non sono nel contratto. Perciò
 * questa schermata racconta il calendario che i logbook dimostrano — sete
 * giorni per riga, la scheda che c'è stata davvero — e dichiara il resto
 * come non registrato, invece di disegnare un piano che nessuno ha scritto.
 */

import { seduteDatate, giorniTra } from "./overview.js";

const GIORNO = 86400000;
export const SETTIMANE_VISTA = 8;

const NON = "non registrato";

function soloGiorno(d) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/* Il lunedì della settimana di una data. La settimana comincia di lunedì:
 * è la convenzione italiana, non quella americana. */
export function lunediDiData(data) {
  if (!data) return null;
  const g = soloGiorno(data);
  const giorno = new Date(g).getUTCDay(); // 0 domenica … 6 sabato
  const scarto = (giorno + 6) % 7;
  return new Date(g - scarto * GIORNO);
}

/* Il codice della scheda come lo scrive A: sessionCode è il campo dei
 * logbook (r.6894), gli altri sono ripieghi dichiarati per i documenti
 * vecchi. Stringa vuota quando non c'è: il vuoto resta vuoto. */
export function codiceScheda(seduta) {
  if (!seduta || typeof seduta !== "object") return "";
  const grezzo = seduta.sessionCode || seduta.sheetCode || seduta.code || seduta.scheda;
  return grezzo == null ? "" : String(grezzo).trim();
}

function nomeScheda(seduta) {
  if (!seduta || typeof seduta !== "object") return "";
  const grezzo = seduta.sessionName || seduta.sheetName || seduta.name;
  return grezzo == null ? "" : String(grezzo).trim();
}

function dataItaliana(d) {
  if (!d) return "—";
  return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0");
}

/* Le ultime N settimane di calendario, lunedì→domenica, l'ultima è quella di
 * oggi. Ogni giorno porta la scheda che c'è stata: nessuna previsione. */
export function settimaneOsservate(sedute, quante, oggi) {
  const n = Number.isFinite(Number(quante)) && Number(quante) > 0 ? Math.floor(Number(quante)) : SETTIMANE_VISTA;
  const rif = lunediDiData(oggi || new Date());
  const conData = seduteDatate(sedute);
  const perGiorno = Object.create(null);
  conData.forEach((x) => {
    const chiave = String(soloGiorno(x.data));
    if (!perGiorno[chiave]) perGiorno[chiave] = [];
    perGiorno[chiave].push(x.seduta);
  });

  const settimane = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const lunedi = new Date(rif.getTime() - i * 7 * GIORNO);
    const giorni = [];
    for (let g = 0; g < 7; g += 1) {
      const data = new Date(lunedi.getTime() + g * GIORNO);
      const seduteDelGiorno = perGiorno[String(soloGiorno(data))] || [];
      const prima = seduteDelGiorno[0] || null;
      giorni.push({
        data,
        numero: seduteDelGiorno.length,
        codice: prima ? codiceScheda(prima) : "",
        nome: prima ? nomeScheda(prima) : "",
        oggi: soloGiorno(data) === soloGiorno(oggi || new Date())
      });
    }
    const codici = giorni.filter((g) => g.codice).map((g) => g.codice);
    settimane.push({
      lunedi,
      domenica: new Date(lunedi.getTime() + 6 * GIORNO),
      etichetta: dataItaliana(lunedi) + "–" + dataItaliana(new Date(lunedi.getTime() + 6 * GIORNO)),
      giorni,
      sedute: giorni.reduce((a, g) => a + g.numero, 0),
      attiva: giorni.some((g) => g.numero > 0),
      codici,
      corrente: i === 0
    });
  }
  return settimane;
}

/* La rotazione che si vede nei logbook: quali codici tornano, quante volte,
 * e in che ordine sono comparsi. Non è quella scritta nel programma. */
export function rotazioneOsservata(sedute) {
  const conData = seduteDatate(sedute);
  const perCodice = Object.create(null);
  const sequenza = [];
  conData.forEach((x) => {
    const codice = codiceScheda(x.seduta);
    if (!codice) return;
    sequenza.push({ codice, data: x.data });
    if (!perCodice[codice]) perCodice[codice] = { codice, numero: 0, primo: x.data, ultimo: x.data };
    perCodice[codice].numero += 1;
    perCodice[codice].ultimo = x.data;
  });
  const perNumero = Object.keys(perCodice).map((c) => perCodice[c]);
  perNumero.sort((a, b) => b.numero - a.numero || String(a.codice).localeCompare(String(b.codice)));
  return { elenco: perNumero, sequenza, distinte: perNumero.length, conCodice: sequenza.length };
}

/* Riepilogo pronto per la schermata. */
export function riepilogoPianificazione(sedute, opzioni) {
  const o = opzioni || {};
  const oggi = o.oggi || new Date();
  const quante = o.settimane || SETTIMANE_VISTA;
  const elenco = Array.isArray(sedute) ? sedute.filter((s) => s && typeof s === "object") : [];
  const conData = seduteDatate(elenco);
  const settimane = settimaneOsservate(elenco, quante, oggi);
  const rotazione = rotazioneOsservata(elenco);
  const coperte = settimane.filter((s) => s.attiva);
  const buchi = settimane.filter((s) => !s.attiva);
  const giorniCoperti = settimane.reduce((a, s) => a + s.giorni.filter((g) => g.numero > 0).length, 0);
  const ultima = conData.length ? conData[conData.length - 1].data : null;
  return {
    settimane,
    rotazione,
    totale: conData.length,
    senzaData: elenco.length - conData.length,
    settimaneCoperte: coperte.length,
    settimaneGuardate: settimane.length,
    settimaneVuote: buchi.map((s) => s.etichetta),
    giorniCoperti,
    giorniGuardati: settimane.length * 7,
    mediaSettimana: coperte.length ? Math.round((conData.length / coperte.length) * 10) / 10 : null,
    giorniDallUltima: ultima ? giorniTra(ultima, oggi) : null,
    ultima: ultima ? dataItaliana(ultima) : null,
    prima: conData.length ? dataItaliana(conData[0].data) : null
  };
}

/* Le sei cose che questa schermata non sa dire, e perché. */
export function coseNonRegistrate() {
  return [
    ["Rotazione prevista", "la sequenza A–B–C–D sta nel programma su A, non nei documenti che B legge: qui vedi quella che le sedute dimostrano"],
    ["Scarico e test", "il campo «scarico» della scheda non arriva nel documento-programma letto: nessuna settimana è marcata come scarico per finta"],
    ["Date del blocco", "inizio e fine del blocco non sono registrati nel documento: restano " + NON],
    ["Aderenza al piano", "senza il piano non esiste un dovuto: si contano le sedute, non le mancate"],
    ["Spostamenti e recuperi", "A non scrive perché una seduta è cambiata di giorno: qui non lo deduco"]
  ];
}

export const PIANIFICAZIONE_NON_REGISTRATO = NON;
