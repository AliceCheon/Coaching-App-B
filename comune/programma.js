/* Barbell Diva B — i conti di Programma 1/2/3 (fase 2.5).
 *
 * Funzioni pure: entrano i programmi già letti dalla sottoraccolta
 * `nutritionPhotos` e le sedute già lette da `sessions`, esce il profilo del
 * programma con i suoi conti. Niente rete, niente DOM, niente scrittura.
 *
 * Il punto delicato, e la ragione per cui questo modulo DICHIARA i campi
 * invece di indovinarli: A salva i programmi in due formati.
 *  - v1 (r.5601 di A): un documento intero per programma, con le schede e gli
 *    esercizi dentro.
 *  - v2 (r.5525, r.5602): il documento porta solo `programMeta`, cioè il
 *    programma SENZA schede; le schede viaggiano in documenti separati
 *    (r.5613-5623 di A) che questa fase non legge ancora — la lettura delle
 *    schede è il passo 4.
 * Quindi qui `schede` vale un elenco quando le schede sono nel documento, e
 * `null` quando non ci sono: la schermata mostra il vuoto dichiarato, non un
 * elenco inventato.
 *
 * Regola di casa: un campo che non c'è vale «non registrato». Il programma
 * non si ricostruisce dal nome, non si deduce dai logbook, non si riempie con
 * i valori del mockup.
 */

import { codiceScheda, settimaneOsservate } from "./pianificazione.js";
import { dataDiSeduta } from "./overview.js";

const NON = "non registrato";

/* I nomi di campo che B accetta, in ordine di preferenza: se A li cambia, si
 * cambia una riga qui e non si tocca la schermata. */
export const CAMPI_PROGRAMMA = Object.freeze({
  nome: Object.freeze(["name", "nome", "title"]),
  stato: Object.freeze(["status", "stato"]),
  fase: Object.freeze(["phase", "fase"]),
  inizio: Object.freeze(["startDate", "dataInizio", "start"]),
  durata: Object.freeze(["durationWeeks", "settimane", "weeks"]),
  giorni: Object.freeze(["daysPerWeek", "giorniSettimana", "giorni"]),
  descrizione: Object.freeze(["description", "descrizione", "notes", "note"]),
  messaggio: Object.freeze(["message", "messaggio", "athleteMessage", "messageForAthlete"]),
  schede: Object.freeze(["sheets", "schede"]),
  rotazione: Object.freeze(["rotation", "rotazione", "rotationOrder", "rotationCodes"]),
  codiceScheda: Object.freeze(["code", "codice", "letter"]),
  nomeScheda: Object.freeze(["name", "nome"]),
  settimanaScheda: Object.freeze(["week", "settimana"]),
  eserciziScheda: Object.freeze(["exercises", "esercizi"]),
  creato: Object.freeze(["createdAt", "created"]),
  aggiornato: Object.freeze(["updatedAt", "updated"])
});

function primoCampo(oggetto, nomi) {
  if (!oggetto || typeof oggetto !== "object") return undefined;
  for (let i = 0; i < nomi.length; i += 1) {
    const nome = nomi[i];
    if (Object.prototype.hasOwnProperty.call(oggetto, nome) && oggetto[nome] != null) return oggetto[nome];
  }
  return undefined;
}

function testo(valore) {
  if (valore == null) return "";
  return String(valore).trim();
}

function numeroOppureNull(valore) {
  if (valore == null || valore === "") return null;
  const n = Number(valore);
  return Number.isFinite(n) ? n : null;
}

/* Lo stato come lo scrive A (r.2586: «available» è il default), tradotto in
 * una parola leggibile. Uno stato sconosciuto si mostra com'è: non si corregge. */
export function statoInChiaro(stato) {
  const s = testo(stato).toLowerCase();
  if (!s) return { parola: NON, segno: "vuoto" };
  if (s === "active") return { parola: "attivo", segno: "vivo" };
  if (s === "draft") return { parola: "in bozza", segno: "bozza" };
  if (s === "available") return { parola: "disponibile", segno: "bozza" };
  if (s === "archived" || s === "archiviato") return { parola: "archiviato", segno: "archivio" };
  return { parola: testo(stato), segno: "altro" };
}

/* Le schede del programma, quando il documento le porta (formato v1).
 * Un elenco vuoto con `null` significa «non sono in questo documento»: la
 * differenza conta, e la schermata la dice con parole diverse. */
export function schedeDelProgramma(programma) {
  const grezze = primoCampo(programma, CAMPI_PROGRAMMA.schede);
  if (!Array.isArray(grezze)) return null;
  return grezze
    .filter((s) => s && typeof s === "object" && !s.deletedAt)
    .map((s, i) => {
      const esercizi = primoCampo(s, CAMPI_PROGRAMMA.eserciziScheda);
      return {
        codice: testo(primoCampo(s, CAMPI_PROGRAMMA.codiceScheda)) || "scheda " + (i + 1),
        nome: testo(primoCampo(s, CAMPI_PROGRAMMA.nomeScheda)),
        settimana: numeroOppureNull(primoCampo(s, CAMPI_PROGRAMMA.settimanaScheda)),
        esercizi: Array.isArray(esercizi) ? esercizi.filter((e) => e && typeof e === "object" && !e.deletedAt).length : null,
        ordine: numeroOppureNull(s.order)
      };
    })
    .sort((a, b) => (a.ordine == null ? 0 : a.ordine) - (b.ordine == null ? 0 : b.ordine) || a.codice.localeCompare(b.codice));
}

/* La rotazione PREVISTA: si legge dal campo del programma se c'è, altrimenti
 * dai codici delle schede. Se non c'è né l'uno né l'altro resta `registrata:
 * false` — e la schermata lo dice, invece di dedurla dall'ordine dei logbook
 * (quella è la rotazione osservata, che è un'altra cosa). */
export function rotazionePrevista(programma, schede) {
  const grezza = primoCampo(programma, CAMPI_PROGRAMMA.rotazione);
  const codici = [];
  if (Array.isArray(grezza)) {
    grezza.forEach((voce) => {
      if (voce == null) return;
      const c = typeof voce === "object" ? testo(primoCampo(voce, CAMPI_PROGRAMMA.codiceScheda) || voce.code) : testo(voce);
      if (c && codici.indexOf(c) === -1) codici.push(c);
    });
  }
  if (codici.length) return { codici, registrata: true, fonte: "campo del programma" };
  const daSchede = (schede || []).map((s) => s.codice).filter(Boolean);
  if (daSchede.length) return { codici: daSchede, registrata: true, fonte: "codici delle schede lette" };
  return { codici: [], registrata: false, fonte: NON };
}

/* Quali codici scheda compaiono nei logbook, quante volte e quando l'ultima
 * volta. È l'unica cosa che B può dire di sicuro sulle schede: quello che
 * l'atleta ha davvero allenato. */
export function seduteOsservate(sedute, codici) {
  const elenco = Array.isArray(sedute) ? sedute.filter((s) => s && typeof s === "object") : [];
  const delProgramma = Array.isArray(codici) && codici.length ? codici : null;
  const perCodice = Object.create(null);
  let conCodice = 0;
  let dentro = 0;
  let fuori = 0;
  let senzaData = 0;
  elenco.forEach((s) => {
    const codice = codiceScheda(s);
    const data = dataDiSeduta(s);
    if (!data) senzaData += 1;
    if (!codice) return;
    conCodice += 1;
    const suo = !delProgramma || delProgramma.indexOf(codice) !== -1;
    if (suo) dentro += 1; else fuori += 1;
    if (!perCodice[codice]) perCodice[codice] = { codice, numero: 0, ultima: null, dentro: suo };
    perCodice[codice].numero += 1;
    if (data && (!perCodice[codice].ultima || data > perCodice[codice].ultima)) perCodice[codice].ultima = data;
  });
  const righe = Object.keys(perCodice).map((c) => perCodice[c]);
  righe.sort((a, b) => b.numero - a.numero || a.codice.localeCompare(b.codice));
  return { righe, conCodice, dentro, fuori, senzaData, totale: elenco.length };
}

/* L'ordine di lettura dei programmi: prima i creati prima, poi l'id. Serve a
 * dire quale è «Programma 1» senza inventare: l'ordine del v31 non è un campo
 * del documento, quindi si dichiara il criterio usato. */
export function elencoProgrammiOrdinato(programmi) {
  const elenco = Array.isArray(programmi) ? programmi.filter((p) => p && typeof p === "object") : [];
  const perData = (a, b) => testo(primoCampo(a, CAMPI_PROGRAMMA.creato)).localeCompare(testo(primoCampo(b, CAMPI_PROGRAMMA.creato)))
    || testo(a.id).localeCompare(testo(b.id));
  return elenco.slice().sort(perData);
}

/* Il profilo del programma: quello che il documento dice, campo per campo. */
export function profiloProgramma(programma) {
  if (!programma || typeof programma !== "object") {
    return {
      presente: false, nome: NON, stato: statoInChiaro(""), fase: "", inizio: "", durata: null,
      giorni: null, descrizione: "", messaggio: "", aggiornato: "", id: "", archiviato: false
    };
  }
  const stato = statoInChiaro(primoCampo(programma, CAMPI_PROGRAMMA.stato));
  const inizioGrezzo = testo(primoCampo(programma, CAMPI_PROGRAMMA.inizio));
  return {
    presente: true,
    id: testo(programma.id),
    nome: testo(primoCampo(programma, CAMPI_PROGRAMMA.nome)) || NON,
    stato: stato.parola,
    segno: stato.segno,
    fase: testo(primoCampo(programma, CAMPI_PROGRAMMA.fase)),
    inizio: inizioGrezzo,
    durata: numeroOppureNull(primoCampo(programma, CAMPI_PROGRAMMA.durata)),
    giorni: numeroOppureNull(primoCampo(programma, CAMPI_PROGRAMMA.giorni)),
    descrizione: testo(primoCampo(programma, CAMPI_PROGRAMMA.descrizione)),
    messaggio: testo(primoCampo(programma, CAMPI_PROGRAMMA.messaggio)),
    aggiornato: testo(primoCampo(programma, CAMPI_PROGRAMMA.aggiornato)),
    archiviato: Boolean(programma.archivedAt) || stato.segno === "archivio"
  };
}

function dataItaliana(d) {
  if (!d) return null;
  return String(d.getUTCDate()).padStart(2, "0") + "/" + String(d.getUTCMonth() + 1).padStart(2, "0") + "/" + d.getUTCFullYear();
}

/* Riepilogo pronto per la schermata.
 * `o.schedeV2` è la ricostruzione dei documenti v2 (comune/schede-v2.js): quando
 * il documento-programma non porta le schede — succede sempre, nel formato v2 —
 * si usano quelle, lette in sola lettura. `o.oggi` e `o.quante` servono al
 * prospetto delle settimane. */
/* L'ultima volta che un esercizio è stato fatto. Si guardano le sedute con il
 * codice di una scheda del programma, si prende quella con la data più recente
 * e il kg scritto su quell'esercizio. Se il kg manca resta la data; se la
 * seduta non c'è la riga resta vuota: qui non si inventa niente. */
export function chiavePrestazione(codice, nome) {
  const c = testo(codice).toUpperCase();
  const n = testo(nome).toLowerCase().replace(/\s+/g, " ").trim();
  return c + "|" + n;
}

function dataDaTesto(valore) {
  const t = testo(valore);
  const ita = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
  if (ita) return new Date(Date.UTC(Number(ita[3]), Number(ita[2]) - 1, Number(ita[1])));
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  return null;
}

function kgInTesto(valore) {
  if (valore == null) return null;
  const n = Number(valore);
  if (!Number.isFinite(n)) return null;
  return String(Math.round(n * 100) / 100).replace(".", ",");
}

export function prestazioniUltime(sedute, codici) {
  const elenco = Array.isArray(sedute) ? sedute : [];
  const delProgramma = Array.isArray(codici) && codici.length ? codici.map((c) => String(c).toUpperCase()) : null;
  const mappa = Object.create(null);
  elenco.forEach((s) => {
    if (!s || typeof s !== "object") return;
    const codice = String(codiceScheda(s) || "").toUpperCase();
    if (!codice) return;
    if (delProgramma && delProgramma.indexOf(codice) === -1) return;
    const dataSeduta = dataDiSeduta(s) || dataDaTesto(s.dateInput || s.date);
    const esercizi = Array.isArray(s.exercises) ? s.exercises : [];
    esercizi.forEach((e) => {
      if (!e || typeof e !== "object") return;
      const nome = testo(e.name || e.nome || e.exercise);
      if (!nome) return;
      const kg = kgInTesto(e.kg != null ? e.kg : e.maxKg);
      const sua = dataDaTesto(e.date) || dataSeduta;
      const chiave = chiavePrestazione(codice, nome);
      const prima = mappa[chiave];
      if (!prima) { mappa[chiave] = { data: sua, kg }; return; }
      if (sua && (!prima.data || sua > prima.data)) { prima.data = sua; prima.kg = kg; return; }
      if (!prima.data && !sua && prima.kg == null && kg != null) prima.kg = kg;
    });
  });
  const out = Object.create(null);
  Object.keys(mappa).forEach((k) => {
    const p = mappa[k];
    out[k] = { data: p.data ? dataItaliana(p.data) : null, kg: p.kg };
  });
  return out;
}

export function riepilogoProgramma(programma, sedute, opzioni) {
  const o = opzioni || {};
  const profilo = profiloProgramma(programma);
  const dalDocumento = profilo.presente ? schedeDelProgramma(programma) : null;
  const v2 = o.schedeV2 && o.schedeV2.perProgramma ? (o.schedeV2.perProgramma[profilo.id] || null) : null;
  let schede = dalDocumento;
  let archiviate = [];
  let fonteSchede = dalDocumento ? "documento del programma (v1)" : null;
  if ((!schede || !schede.length) && v2) {
    schede = v2.schede;
    archiviate = v2.archiviate || [];
    fonteSchede = "documenti v2 · program-v2-sheet- / -exercise-";
  }
  let schedeMotivo = null;
  if (schede === null) {
    schedeMotivo = "nessuna scheda letta per questo programma";
  } else if (!schede.length) {
    schedeMotivo = "i documenti delle schede ci sono ma non ne resta nessuna attiva";
  }
  const rotazione = rotazionePrevista(programma, schede);
  const osservato = seduteOsservate(sedute, rotazione.codici);
  const codiciVisti = osservato.righe.map((x) => x.codice);
  const esercizi = schede && schede.length
    ? schede.reduce((a, s) => a + (s.numeroEsercizi != null ? s.numeroEsercizi : (s.esercizi == null ? 0 : s.esercizi)), 0)
    : (schede ? 0 : null);
  const viste = rotazione.codici.map((c) => {
    const riga = osservato.righe.find((r) => r.codice === c) || null;
    return { codice: c, numero: riga ? riga.numero : 0, ultima: riga && riga.ultima ? dataItaliana(riga.ultima) : null };
  });
  const settimaneGrezze = Array.isArray(o.settimane) ? o.settimane : settimaneOsservate(sedute, o.quante || 8, o.oggi || new Date());
  const settimane = settimaneGrezze.map((s, i) => ({
    numero: i + 1,
    etichetta: s.etichetta,
    codici: s.giorni ? s.giorni.filter((g) => g.codice).map((g) => g.codice) : [],
    sedute: s.sedute == null ? 0 : s.sedute
  }));
  return {
    indice: Number.isFinite(Number(o.indice)) ? Number(o.indice) : 0,
    totaleProgrammi: Number.isFinite(Number(o.totaleProgrammi)) ? Number(o.totaleProgrammi) : null,
    profilo,
    schede,
    archiviate,
    schedeMotivo,
    fonteSchede,
    rotazione,
    codiciVisti,
    osservato,
    prestazioni: prestazioniUltime(sedute, rotazione.codici),
    viste,
    settimane,
    esercizi,
    senzaData: osservato.senzaData
  };
}

/* Le cose che la schermata del programma non può dire, e perché. */
export function coseNonRegistrateProgramma() {
  return [
    ["Settimane rimaste", "la data di inizio e la durata ci sono, ma lo scarico e il test non sono nel documento: qui non si contano le settimane «di piano»"],
    ["Giorni della settimana", "il programma dice quanti giorni a settimana, non quali: la rotazione sui giorni la mostra la Pianificazione, e solo per le sedute fatte"],
    ["Visibilità all'atleta", "la data «visibile all'atleta dal» non è tra i campi che leggo: resta non registrata"],
    ["Ordine dei programmi", "il numero 1, 2, 3 non è un campo: qui l'ordine è per data di creazione, poi per id — dichiarato, non indovinato"]
  ];
}

export const PROGRAMMA_NON_REGISTRATO = NON;
