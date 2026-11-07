/* Barbell Diva B — passo 3c: il Logbook del v31 con le sedute vere (SOLA LETTURA).
 *
 * Perché questo modulo esiste: la carta Logbook del v31 (dentro «Tutto
 * insieme», Overview atleta) si nutre di un oggetto {fonte, sedute} con una
 * forma fissa: {id, d, pn, sc, nm, w, st, dur, jr, pg, ex, so} — la stessa che
 * il v31 usa per il suo seme di esempio e per l'import dei backup. Qui le
 * sedute vere lette dalla sottoraccolta `sessions` (leggiSedute) vengono
 * tradotte in quella forma: nessuna scrittura, nessun valore inventato —
 * ciò che il documento non porta resta vuoto, e la carta lo dichiara.
 *
 * La fonte scelta, dichiarata (6 novembre 2026): la sottoraccolta `sessions`
 * (124 sedute lette), NON `state.history` (363 voci). Perché:
 *  - il v31 disegna SEDUTE (data, scheda, programma, esercizi con le serie,
 *    journal, durata, provenienza): la forma è esattamente quella delle
 *    sedute della sottoraccolta — il seme di esempio del v31 era lui stesso
 *    una copia statica delle stesse sedute (120, backup del 30/10/2026);
 *  - `state.history` ha una voce PER ESERCIZIO (exercise, sets, notes,
 *    userNote, done, source, date, week, muscle, previous, average, card, id):
 *    non porta la seduta come unità, non porta il journal di seduta né la
 *    durata, e raggrupparla per data per ricavarne sedute sarebbe una
 *    ricostruzione con margine d'errore — B non ricostruisce, legge.
 * I due numeri non sono due conteggi della stessa cosa (363 voci di esercizio
 * contro 124 sedute): non si sommano e non si confrontano.
 *
 * Regole dichiarate:
 *  - stato (filtro Mostra): dal campo `status` della seduta; se il documento
 *    non lo porta ma porta `done`, true→completed e false→bozza (scelta
 *    chiesta da Alice: «probabile done per lo stato»). Se NESSUNA seduta
 *    porta né status né done, il filtro resta spento con «non registrato».
 *  - provenienza (filtro Fonte): dal campo `source`. Senza source in nessuna
 *    seduta, filtro spento con «non registrato».
 *  - programma: le sedute non portano il programma (già stabilito al passo 3b
 *    per l'Archivio). Si prova SOLO la derivazione dal codice della scheda,
 *    e solo quando quel codice appartiene a UN programma solo fra quelli
 *    letti (schede attive e archiviate): se il codice ricorre in più
 *    programmi, attribuire sarebbe una scommessa — la seduta resta «—» e il
 *    fatto è dichiarato nella carta.
 *  - journal: se la seduta porta un oggetto `journal` (gli stessi campi che
 *    il v31 legge nei backup: energy, rpe, mood, note) viene letto; se porta
 *    solo `journalId`, il diario non è nei dati letti e la seduta resta
 *    «non collegata».
 *  - durata: `totalDurationSeconds`, lo stesso campo che il v31 legge nei
 *    backup; assente o non positiva → «non registrata» (null).
 *  - Programmato (pg): solo col programma attribuito e la scheda trovata in
 *    quel programma per lo stesso codice; la settimana viene dalla seduta e,
 *    se il documento non la porta, la colonna resta a «—» senza inventare.
 *  - i nomi mostrati passano tutti da nomePulito; il nome vero dell'esercizio
 *    resta in `n` (il catalogo BD_LB_EXCAT del v31 è chiavato sul nome vero)
 *    e la versione pulita viaggia in `np`.
 */

import { nomePulito } from "./nome-pulito.js";
import { seduteSecondoA } from "./regola-sedute-a.js";
import { numeroCarico } from "./carichi.js";

const NON = "non registrato";

function testo(v) {
  return v == null ? "" : String(v).trim();
}

function numeroFinito(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/* 'yyyy-mm-dd' → 'gg/mm/aaaa' (la stessa conversione che il v31 fa sulle
 * date dei backup). Una data già 'gg/mm/aaaa' resta com'è; il resto resta
 * vuoto: una data che non si legge non si inventa. */
function dataItalianaDaInput(v) {
  const t = testo(v);
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) {
    return m[3].padStart(2, "0") + "/" + m[2].padStart(2, "0") + "/" + m[1];
  }
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(t);
  return m ? t : "";
}

function chiaveData(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(testo(d));
  return m ? m[3] + m[2] + m[1] : "";
}

/* I nomi di campo accettati per le serie completate: gli stessi dichiarati in
 * CAMPI_CARICHI (carichi.js) più i tre che il v31 legge nei backup (kg, rpe,
 * rir — dentro `completedSets`). Dichiarati qui in un posto solo. */
const CAMPI_SERIE = Object.freeze({
  peso: Object.freeze(["kg", "weight", "peso", "carico", "load"]),
  ripetizioni: Object.freeze(["reps", "ripetizioni", "rip", "repetitions"]),
  rpe: Object.freeze(["rpe"]),
  rir: Object.freeze(["rir"])
});

function primoCampo(oggetto, nomi) {
  if (!oggetto || typeof oggetto !== "object") return undefined;
  for (let i = 0; i < nomi.length; i += 1) {
    if (Object.prototype.hasOwnProperty.call(oggetto, nomi[i]) && oggetto[nomi[i]] != null) return oggetto[nomi[i]];
  }
  return undefined;
}

/* Una serie → [kg, reps, rpe, rir], la forma che il v31 disegna nel cassetto.
 * Ciò che il documento non porta vale null (a schermo «—»), mai 0: l'unico
 * zero vero è un peso registrato 0, cioè corpo libero. */
function serieCs(serie) {
  if (serie == null) return null;
  if (typeof serie === "number") return [Number.isFinite(serie) ? serie : null, null, null, null];
  if (typeof serie === "string") return [numeroCarico(serie), null, null, null];
  if (typeof serie !== "object") return null;
  const kg = numeroFinito(primoCampo(serie, CAMPI_SERIE.peso));
  const reps = numeroFinito(primoCampo(serie, CAMPI_SERIE.ripetizioni));
  const rpe = numeroFinito(primoCampo(serie, CAMPI_SERIE.rpe));
  const rir = numeroFinito(primoCampo(serie, CAMPI_SERIE.rir));
  if (kg == null && reps == null && rpe == null && rir == null) return null;
  return [kg, reps, rpe, rir];
}

/* Gli esercizi di una seduta → [{n, np, cs}]. `n` resta il nome VERO (il
 * catalogo del v31 è chiavato così), `np` è quello pulito per lo schermo. */
function eserciziDella(s) {
  const elenco = primoCampo(s, ["exercises", "esercizi", "exerciseList"]);
  if (!Array.isArray(elenco)) return [];
  const out = [];
  elenco.forEach((e) => {
    if (!e || typeof e !== "object") return;
    const nome = testo(primoCampo(e, ["name", "nome", "exercise", "esercizio", "exerciseName"]));
    if (!nome) return;
    const grezze = e.completedSets != null ? e.completedSets : primoCampo(e, ["sets", "serie", "setList"]);
    const cs = (Array.isArray(grezze) ? grezze : []).map(serieCs).filter(Boolean);
    out.push({ n: nome, np: nomePulito(nome), cs });
  });
  return out;
}

function statoDi(s) {
  if (s.status != null && testo(s.status) !== "") return testo(s.status);
  if (s.done === true) return "completed";
  if (s.done === false) return "bozza";
  return "";
}

function settimanaDi(s) {
  const m = /(\d+)/.exec(testo(s.week));
  const n = m ? parseInt(m[1], 10) : null;
  return n != null && n > 0 ? n : null;
}

/* Il codice scheda in forma confrontabile: senza il prefisso «scheda», senza
 * spazi, maiuscolo. Serve solo a riconoscere lo stesso codice scritto uguale;
 * non interpreta nulla. */
function codiceNorm(v) {
  return testo(v).replace(/^scheda\s+/i, "").replace(/\s+/g, "").toUpperCase();
}

/* La traduzione. `opzioni`: { programmi, schedeV2, oggi, infoSedute }.
 * Ritorna { fonte, sedute, dichiarazioni }: fonte = giorno della lettura
 * (il v31 stampa «dati veri del <fonte>»), dichiarazioni = i conti e i
 * flag che la carta mostra per dire cosa è acceso e cosa no. */
export function seduteLogbook(sedute, opzioni) {
  const o = opzioni || {};
  const programmi = Array.isArray(o.programmi) ? o.programmi.filter((p) => p && typeof p === "object") : [];
  const ricostruzione = o.schedeV2 && o.schedeV2.perProgramma ? o.schedeV2 : null;
  const oggi = o.oggi instanceof Date ? o.oggi : new Date();

  /* codice scheda → programma che lo ha, solo se UNO: schede attive e
   * archiviate di tutti i programmi letti. Un codice che ricorre in più
   * programmi non attribuisce niente. */
  const proprietari = Object.create(null);
  programmi.forEach((p) => {
    const pid = testo(p.id);
    const nome = testo(p.name);
    const gruppo = ricostruzione && ricostruzione.perProgramma ? ricostruzione.perProgramma[pid] : null;
    if (!gruppo) return;
    const visti = [];
    (gruppo.schede || []).concat(gruppo.archiviate || []).forEach((s2) => {
      const cod = codiceNorm(s2 && s2.codice);
      if (!cod || cod === codiceNorm(NON) || visti.indexOf(cod) !== -1) return;
      visti.push(cod);
      const voce = proprietari[cod] || { nomi: [], id: pid };
      if (voce.nomi.indexOf(nome || pid) === -1) voce.nomi.push(nome || pid);
      proprietari[cod] = voce;
    });
  });

  let lette = 0;
  let senzaData = 0;
  let conProgramma = 0;
  let conJournal = 0;
  const stati = [];
  const fonti = [];
  const out = [];

  /* La catena di A: si scartano le sedute con `deletedAt` e si tiene un solo
   * documento per id. A non ha altri filtri di vista (r.14398 decide solo chi
   * ha il cestino), quindi il Logbook mostra quello che mostra A. La copia in
   * bdB_ resta fedele e non filtra nulla. */
  const perA = seduteSecondoA(sedute);
  const cancellate = perA.cancellate;
  const doppioniContenuto = perA.doppioniId;
  perA.visibili.forEach((s) => {
    if (!s || typeof s !== "object") return;
    lette += 1;
    const d = dataItalianaDaInput(testo(s.dateInput) || testo(s.date));
    if (!d) senzaData += 1;
    const st = statoDi(s);
    if (st && stati.indexOf(st) === -1) stati.push(st);
    const so = testo(s.source);
    if (so && fonti.indexOf(so) === -1) fonti.push(so);
    const cod = codiceNorm(s.sessionCode);
    const proprietario = cod ? proprietari[cod] : null;
    const attribuito = proprietario && proprietario.nomi.length === 1 ? proprietario : null;
    if (attribuito) conProgramma += 1;
    const jr = s.journal && typeof s.journal === "object"
      ? {
          e: numeroFinito(primoCampo(s.journal, ["energy", "energia"])),
          r: numeroFinito(primoCampo(s.journal, ["rpe"])),
          m: testo(primoCampo(s.journal, ["mood", "umore"])),
          nt: s.journal.note == null && s.journal.nota == null ? null : testo(s.journal.note != null ? s.journal.note : s.journal.nota)
        }
      : null;
    if (jr) conJournal += 1;
    const settimana = settimanaDi(s);
    const voce = {
      id: testo(s.id),
      d,
      pn: attribuito ? nomePulito(attribuito.nomi[0]) : "",
      sc: testo(s.sessionCode),
      nm: nomePulito(testo(primoCampo(s, ["sessionName", "name", "nome"]))),
      w: settimana || "",
      st,
      dur: (() => { const n = numeroFinito(s.totalDurationSeconds); return n != null && n > 0 ? n : null; })(),
      jr,
      pg: null,
      ex: eserciziDella(s),
      so
    };
    if (attribuito) {
      const gruppo = ricostruzione.perProgramma[attribuito.id];
      const scheda = ((gruppo.schede || []).concat(gruppo.archiviate || []))
        .find((sh) => sh && codiceNorm(sh.codice) === cod);
      if (scheda) {
        const righe = (scheda.esercizi || []).map((e2) => {
          const settimane = e2 && e2.prescrizione && e2.prescrizione.elencoSettimane ? e2.prescrizione.elencoSettimane : [];
          const sett = settimane.find((x) => x && x.numero === settimana) || null;
          return {
            n: nomePulito(e2 && e2.nome && e2.nome !== NON ? e2.nome : ""),
            tec: sett && sett.etichettaTipo ? sett.etichettaTipo : "",
            sets: sett && sett.registrata ? sett.serie : "",
            reps: sett && sett.registrata ? sett.ripetizioni : "",
            kg: ""
          };
        });
        voce.pg = { scheda: nomePulito(scheda.nome || scheda.codice), settimana, righe };
      }
    }
    out.push(voce);
  });

  out.sort((a, b) => chiaveData(b.d).localeCompare(chiaveData(a.d)) || (Number(b.id) || 0) - (Number(a.id) || 0));

  const dichiarazioni = {
    lette,
    cancellate,
    doppioniContenuto,
    tenute: out.length,
    senzaData,
    conProgramma,
    senzaProgramma: lette - conProgramma,
    haStato: stati.length > 0,
    statiValori: stati.slice().sort(),
    haFonte: fonti.length > 0,
    fontiValori: fonti.slice().sort(),
    conJournal,
    documenti: o.infoSedute && o.infoSedute.documenti != null ? Number(o.infoSedute.documenti) : null,
    senzaId: o.infoSedute ? Number(o.infoSedute.senzaId) || 0 : null,
    duplicati: o.infoSedute ? Number(o.infoSedute.duplicati) || 0 : null
  };

  const dueCifre = (n) => String(n).padStart(2, "0");
  return {
    fonte: dueCifre(oggi.getDate()) + "/" + dueCifre(oggi.getMonth() + 1) + "/" + oggi.getFullYear(),
    sedute: out,
    dichiarazioni
  };
}
