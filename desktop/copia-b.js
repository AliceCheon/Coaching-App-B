/* Barbell Diva B — la pagina di copia (passo 4). Solo DOM e orchestrazione:
 * nessuna scrittura scritta qui, tutto passa da comune/scritture-b.js.
 *
 * Due momenti SEPARATI:
 *   1) «Conta (sola lettura)» — legge A e mostra i numeri veri. Non scrive
 *      niente, in nessun caso.
 *   2) «Copia in B» — parte SOLO dopo un conteggio riuscito: e' disabilitato
 *      fino ad allora, e torna disabilitato se il conteggio si azzera.
 * Poi: rileggi B -> confronta -> scrivi la fotografia -> rileggi la fotografia
 * e mostra la data.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato, eMobile } from "../comune/accesso.js";
import { leggiProgrammiGrezzi, leggiSchedeGrezze, leggiSeduteGrezze } from "../comune/lettura-grezza.js";
import { leggiDocumentoAtleta } from "../comune/lettura-dati.js";
import { candidatiEsclusione, seduteNelBloccoLocale } from "../comune/esclusioni.js";
import {
  copiaProgramma,
  copiaScheda,
  copiaEsercizio,
  copiaSeduta,
  escludiSeduta,
  scriviVoceRegistro,
  scriviFotografia,
  leggiZonaB,
  leggiFotografia
} from "../comune/scritture-b.js";
import {
  pianoDiCopia,
  riepilogo,
  confrontaCopia,
  righeConfronto,
  fotografia,
  descriviFotografia,
  dataLeggibile
} from "../comune/copia-b.js";
import { protezioneCopia, testoProtezione } from "../comune/modifiche-b.js";

const config = window.BD_B || {};
const sdk = window.firebase;

const el = (id) => document.getElementById(id);
const mostra = (id, testo, classe) => {
  const nodo = el(id);
  if (!nodo) return;
  nodo.textContent = testo;
  nodo.className = classe || "";
};

let app = null;
let auth = null;
let db = null;
/* Il piano esiste solo dopo un conteggio riuscito: e' la chiave che apre la copia. */
let piano = null;

function uidCorrente() {
  return (auth && auth.currentUser && auth.currentUser.uid) || "";
}

function azzeraConteggio() {
  piano = null;
  el("conteggi-a").textContent = "Nessun conteggio: premi «Conta (sola lettura)».";
  el("esclusi").textContent = "";
  el("radice").textContent = "";
  el("esclusioni-a").textContent = "";
  el("cerca").disabled = true;
  el("escludi").disabled = true;
  el("escludi").textContent = "Escludi le sedute spuntate (scrive in B)";
  el("righe-esclusioni").textContent = "";
  el("tabella-esclusioni").hidden = true;
  el("esclusioni-stato").textContent = "Prima conta: la ricerca usa la stessa lettura del conteggio.";
  el("copia").disabled = true;
  el("avanzamento").value = 0;
  el("avanzamento").max = 1;
  mostra("stato", "", "");
}

function tabellaVuota() {
  const corpo = el("righe-confronto");
  corpo.textContent = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 5;
  td.className = "tenue";
  td.textContent = "nessuna copia eseguita in questa sessione";
  tr.appendChild(td);
  corpo.appendChild(tr);
}

function accendi(utente) {
  el("chi").textContent = utente ? (utente.email || utente.uid) : "non collegato";
  el("corpo").hidden = !utente;
  el("entra").hidden = !!utente;
  el("esci").hidden = !utente;
  el("uid").textContent = utente ? utente.uid : "—";
  if (!utente) {
    piano = null;
    tabellaVuota();
    return;
  }
  azzeraConteggio();
  tabellaVuota();
  /* La fotografia gia' presente si legge senza contare: e' una lettura. */
  leggiFotografia(db, utente.uid)
    .then((doc) => { el("fotografia").textContent = descriviFotografia(doc); })
    .catch(() => { el("fotografia").textContent = "Fotografia non leggibile in questo momento."; });
}

/* ---------- 1. CONTA (sola lettura) ---------- */

async function conta(uid) {
  el("conta").disabled = true;
  el("copia").disabled = true;
  piano = null;
  tabellaVuota();
  mostra("stato", "Leggo A (sola lettura)…", "");

  try {
    const [radiceDoc, programmi, schede, sedute, esclusioni, schedeInB] = await Promise.all([
      leggiDocumentoAtleta(db, uid),
      leggiProgrammiGrezzi(db, uid),
      leggiSchedeGrezze(db, uid),
      leggiSeduteGrezze(db, uid),
      leggiZonaB(db, uid, "esclusioni"),
      leggiZonaB(db, uid, "schede")
    ]);
    const nuovo = pianoDiCopia({ programmi: programmi, schede: schede, sedute: sedute, esclusioni: esclusioni });
    nuovo.radice = radiceDoc;

    /* Passo 9 — le schede modificate in B non si sovrascrivono. Si dichiara
     * quali sono e cosa cambia rispetto ad A; la copia non decide da sola. */
    const protezione = protezioneCopia(
      nuovo.voci.filter((v) => v.famiglia === "schede"),
      schedeInB
    );
    nuovo.protezione = protezione;
    const rigaProtette = el("protette");
    if (rigaProtette) {
      const testoProt = testoProtezione(protezione, dataLeggibile);
      rigaProtette.textContent = testoProt;
      rigaProtette.hidden = !testoProt;
    }

    el("conteggi-a").textContent = riepilogo(nuovo).map((r) => r.etichetta + ": " + r.quante).join(" · ") +
      " · totale da scrivere: " + nuovo.totaleScritture;
    el("esclusi").textContent = "Restano in A e non si copiano: " +
      nuovo.esclusi.archiviate + " schede archiviate e le foto di nutrizione. " +
      "v1 doppioni saltati: " + (nuovo.conteggi.v1DoppioniSaltati || 0) + ". " +
      (nuovo.conteggi.esercizi === 0
        ? "Esercizi sciolti: 0, quindi nessuna scheda grande resta monca per questo motivo."
        : "");

    const sed = nuovo.conteggiSedute || {};
    const vive = sed.valideNonCancellate == null ? (sed.valide || 0) : sed.valideNonCancellate;
    const perA = sed.visibili == null ? vive : sed.visibili;
    el("sedute-a").textContent = "Logbook in A: " + (sed.valide || 0) + " sedute distinte · " +
      "di cui con cancellazione logica: " + (sed.cancellate || 0) + " · " +
      "sedute valide (non cancellate): " + vive + " · " +
      "sedute che A mostra: " + perA +
      ((sed.doppioniId || 0) ? " · doppioni per id: " + sed.doppioniId : "") +
      ((sed.senzaCestino || []).length
        ? ". In A senza cestino (fonte non App, id vecchio): " + (sed.senzaCestino || []).map((e) => e.id + " (" + e.fonte + (e.data ? ", " + e.data : "") + ")").join(" / ")
        : ".");

    const esc = sed.esclusioni || {};
    el("esclusioni-a").textContent = "escluse da Alice: " + (esc.escluseDaAlice || 0) +
      " · valide risultanti: " + (esc.valideRisultanti == null ? vive : esc.valideRisultanti) +
      (esc.sovrapposte ? " (" + esc.sovrapposte + " erano già cancellate: non si tolgono due volte)" : "") +
      ((esc.senzaCorrispondenza || []).length
        ? " · esclusioni senza seduta in A: " + esc.senzaCorrispondenza.join(", ")
        : "");

    const viveOra = sed.valideNonCancellate == null ? (sed.valide || 0) : sed.valideNonCancellate;
    const perAOra = sed.visibili == null ? viveOra : sed.visibili;
    const confrontoSedute = nuovo.confronto && nuovo.confronto.sessioni ? nuovo.confronto.sessioni : null;
    if (!radiceDoc || radiceDoc.sessionCount == null) {
      el("radice").textContent = "A non dichiara sessionCount nella radice: nessun confronto possibile.";
    } else {
      const nA = Number(radiceDoc.sessionCount);
      let testo = "A dichiara " + nA + " sedute (numeri della sua lista in memoria) · qui in radice: " +
        (sed.valide || 0) + " documenti, " + viveOra + " valide non cancellate, " + perAOra + " che A mostra";
      if (nA === perAOra) {
        testo += ". Il conto coincide.";
      } else {
        testo += ". Differenza: " + (perAOra - nA) +
          ". Non e' un errore da correggere: il numero di A e' la lunghezza della sua lista al momento del salvataggio, non un riconteggio dei documenti.";
      }
      if (confrontoSedute && confrontoSedute.elencoDiA) {
        const mancanti = confrontoSedute.soloNeiDocumenti || [];
        const fantasmi = confrontoSedute.soloInElenco || [];
        testo += mancanti.length
          ? " In radice ma non nella lista di A: " + mancanti.map((e) => e.id + (e.data ? " (" + e.data + ")" : "")).join(" / ") + "."
          : " Nessuna seduta in radice manca dalla lista di A.";
        if (fantasmi.length) testo += " Nella lista di A ma non in radice: " + fantasmi.map((e) => e.id).join(" / ") + ".";
      } else {
        testo += " Il payload di A non porta l'elenco delle sedute: il confronto id per id non e' possibile da qui.";
      }
      const blocco = seduteNelBloccoLocale(sedute || []);
      el("radice").textContent = testo + " " + blocco.spiegazione;
    }

    piano = nuovo;
    el("cerca").disabled = false;
    el("copia").disabled = nuovo.totaleScritture === 0;
    mostra("stato", nuovo.totaleScritture === 0
      ? "Conteggio finito: in A non c'e' niente da copiare. La copia resta spenta."
      : "Conteggio finito. Pronto a scrivere " + nuovo.totaleScritture + " documenti in bdB_atleti/" + uid + ".",
      nuovo.totaleScritture === 0 ? "errore" : "pronto");
  } finally {
    el("conta").disabled = false;
  }
}

/* ---------- 2. COPIA (solo dopo il conteggio) ---------- */

async function copia(uid) {
  if (!piano) {
    mostra("stato", "Prima conta: senza i numeri non si copia.", "errore");
    return;
  }
  el("conta").disabled = true;
  el("copia").disabled = true;
  const protetteId = (piano.protezione && piano.protezione.protetteId) || [];
  const voci = piano.voci.slice();
  let fatte = 0;
  let saltate = 0;
  el("avanzamento").max = voci.length;

  try {
    for (const voce of voci) {
      if (protetteId.indexOf(voce.id) !== -1) { saltate += 1; continue; }
      if (voce.famiglia === "programmi") await copiaProgramma(db, uid, voce.id, voce.dati);
      else if (voce.famiglia === "schede") await copiaScheda(db, uid, voce.id, voce.dati);
      else if (voce.famiglia === "esercizi") await copiaEsercizio(db, uid, voce.id, voce.dati);
      else await copiaSeduta(db, uid, voce.id, voce.dati);
      fatte += 1;
      el("avanzamento").value = fatte;
      mostra("stato", "Copiati " + fatte + " di " + voci.length + " documenti…", "");
    }

    mostra("stato", "Rileggo B e confronto…", "");
    const [programmiB, schedeB, eserciziB, seduteB] = await Promise.all([
      leggiZonaB(db, uid, "programmi"),
      leggiZonaB(db, uid, "schede"),
      leggiZonaB(db, uid, "esercizi"),
      leggiZonaB(db, uid, "sedute")
    ]);
    const confronto = confrontaCopia(piano, {
      programmi: programmiB,
      schede: schedeB,
      esercizi: eserciziB,
      sedute: seduteB
    });

    const corpo = el("righe-confronto");
    corpo.textContent = "";
    righeConfronto(confronto).forEach((r) => {
      const tr = document.createElement("tr");
      [r.etichetta, r.atteso, r.scritto, r.esito, r.dettaglio].forEach((valore, indice) => {
        const td = document.createElement("td");
        td.textContent = valore;
        if (indice === 3) td.className = r.esito === "coincide" ? "ok" : "errore";
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });

    const doc = fotografia({
      uid: uid,
      quando: new Date(),
      build: config.build,
      progetto: config.firebase ? config.firebase.projectId : null,
      conteggi: piano.conteggi,
      esclusi: piano.esclusi,
      confronto: confronto
    });
    await scriviFotografia(db, uid, doc);
    await scriviVoceRegistro(db, uid, "copia-" + doc.creatoIl.replace(/[:.]/g, "-"), {
      quando: doc.creatoIl,
      totale: piano.totaleScritture,
      conteggi: piano.conteggi,
      esclusi: piano.esclusi,
      esito: doc.coincide ? "coincide" : "da controllare"
    });

    const riletto = await leggiFotografia(db, uid);
    el("fotografia").textContent = descriviFotografia(riletto);
    const notaProtette = saltate
      ? " Le schede protette (" + saltate + ") sono rimaste come sono: se il confronto le segnala diverse, e' quello che deve succedere."
      : "";
    mostra("stato", doc.coincide
      ? "Copia finita e confronto a posto." + notaProtette
      : "Copia finita, ma il confronto NON coincide: guarda la tabella." + notaProtette, doc.coincide ? "pronto" : "errore");
    const rigaProtette2 = el("protette");
    if (rigaProtette2 && saltate) {
      rigaProtette2.textContent = rigaProtette2.textContent + " Ultima copia: " + saltate +
        (saltate === 1 ? " scheda protetta saltata" : " schede protette saltate") + ", nessuna sovrascrittura.";
    }
  } finally {
    el("conta").disabled = false;
    el("copia").disabled = false;
  }
}


/* ---------- 2. ESCLUDI SEDUTE (scrive solo nella zona B) ---------- */

/* I candidati dell'ultima ricerca: per costruire il motivo della scrittura. */
let ultimeEsclusioni = [];

function caselleScelte() {
  const tutte = document.querySelectorAll("#righe-esclusioni input[type=checkbox]");
  const scelte = [];
  for (let i = 0; i < tutte.length; i += 1) {
    if (tutte[i].checked && !tutte[i].disabled) scelte.push(tutte[i].getAttribute("data-id"));
  }
  return scelte;
}

function aggiornaPulsanteEscludi() {
  const scelte = caselleScelte().length;
  const pulsante = el("escludi");
  pulsante.disabled = scelte === 0;
  pulsante.textContent = scelte === 0
    ? "Escludi le sedute spuntate (scrive in B)"
    : "Escludi " + scelte + (scelte === 1 ? " seduta" : " sedute") + " (scrive in B)";
}

function rigaTitolo(corpo, testo, avviso) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 7;
  td.className = avviso ? "intestazione-riga avviso" : "intestazione-riga";
  td.textContent = testo;
  tr.appendChild(td);
  corpo.appendChild(tr);
}

/* Cerca e disegna. Non scrive niente: questa e' la parte di sola lettura. */
function cercaEsclusioni() {
  if (!piano) return;
  const conteggiSedute = piano.conteggiSedute || {};
  const esito = candidatiEsclusione(conteggiSedute.elenco || []);
  const gia = (conteggiSedute.esclusioni && conteggiSedute.esclusioni.ids) || [];

  const corpo = el("righe-esclusioni");
  corpo.textContent = "";
  ultimeEsclusioni = [];

  esito.richieste.forEach((r) => {
    rigaTitolo(corpo, r.etichetta + " \u2014 " + r.messaggio +
      (r.modo === "settimana intera" ? " (trovata nella settimana: la data indicata non combaciava)" : "") +
      (r.nota ? " \u00b7 " + r.nota : ""), r.stato !== "uno");

    r.candidati.forEach((c) => {
      ultimeEsclusioni.push(c);
      const giaEsclusa = gia.indexOf(c.id) >= 0;
      const tr = document.createElement("tr");

      const tdScelta = document.createElement("td");
      const casella = document.createElement("input");
      casella.type = "checkbox";
      casella.setAttribute("data-id", c.id);
      /* Preselezione solo senza dubbio: un solo candidato, non gia' escluso. */
      casella.checked = r.stato === "uno" && !giaEsclusa;
      casella.disabled = giaEsclusa;
      casella.title = giaEsclusa ? "Gia\u2019 esclusa in B: non si tocca" : "Spunta per escludere la copia in B";
      casella.addEventListener("change", aggiornaPulsanteEscludi);
      tdScelta.appendChild(casella);
      tr.appendChild(tdScelta);

      const nota = giaEsclusa ? " \u00b7 gia\u2019 esclusa" : (c.giaCancellata ? " \u00b7 gia\u2019 cancellata" : "");
      const valori = [
        r.etichetta,
        c.id,
        c.data || "data illeggibile",
        c.scheda || "\u2014",
        c.settimana == null ? "\u2014" : String(c.settimana),
        (c.esercizi == null ? "\u2014" : String(c.esercizi)) + nota
      ];
      valori.forEach((valore) => {
        const td = document.createElement("td");
        td.textContent = valore;
        tr.appendChild(td);
      });
      corpo.appendChild(tr);
    });
  });

  el("tabella-esclusioni").hidden = esito.totaleCandidati === 0;
  el("esclusioni-stato").textContent = esito.totaleCandidati === 0
    ? "Nessun candidato in A per le cinque richieste: non c\u2019e\u2019 niente da escludere."
    : "Candidati trovati: " + esito.totaleCandidati + " \u00b7 richieste con zero o piu\u2019 di un candidato: " +
      esito.richiesteConProblemi + ". Controlla, spunta e conferma.";
  aggiornaPulsanteEscludi();
}

/* Scrive SOLO alla conferma, e solo nella zona B. */
async function escludiScelte() {
  const uid = uidCorrente();
  const scelte = caselleScelte();
  if (scelte.length === 0) {
    mostra("esclusioni-stato", "Nessuna casella spuntata: non si scrive niente.", "errore");
    return;
  }
  const dettagli = scelte.map((id) => ultimeEsclusioni.filter((c) => c.id === id)[0]).filter(Boolean);
  const elenco = dettagli.map((c) => c.id + " \u00b7 scheda " + (c.scheda || "?") + " \u00b7 " + (c.data || "data illeggibile")).join("\n");
  const conferma = window.confirm(
    "Escludere " + scelte.length + (scelte.length === 1 ? " seduta" : " sedute") + " dal Logbook di B?\n\n" +
    elenco + "\n\nSi scrive solo in bdB_atleti/" + uid + "/esclusioni e sulla copia. A non si tocca."
  );
  if (!conferma) {
    mostra("esclusioni-stato", "Nessuna scrittura: hai annullato.", "");
    return;
  }

  el("escludi").disabled = true;
  el("cerca").disabled = true;
  const quando = new Date().toISOString();
  let fatte = 0;
  try {
    for (let i = 0; i < dettagli.length; i += 1) {
      const c = dettagli[i];
      const motivo = "chiusa da Alice: scheda " + (c.scheda || "?") + " settimana " +
        (c.settimana == null ? "?" : c.settimana) + " del " + (c.data || "data illeggibile") +
        " \u00b7 richiesta " + c.richiesta;
      await escludiSeduta(db, uid, c.id, {
        idSeduta: c.id,
        data: c.data,
        scheda: c.scheda,
        settimana: c.settimana,
        motivo: motivo,
        richiesta: c.richiesta,
        quando: quando
      });
      fatte += 1;
      mostra("esclusioni-stato", "Escluse " + fatte + " di " + dettagli.length + "\u2026", "");
    }
    mostra("esclusioni-stato", "Escluse " + fatte + " \u00b7 scritte in bdB_atleti/" + uid + "/esclusioni. Rileggo i numeri\u2026", "pronto");
    await conta(uid);
    mostra("esclusioni-stato", "Escluse " + fatte + ". I numeri qui sopra sono riletti da A e da B.", "pronto");
  } finally {
    el("cerca").disabled = !piano;
    el("escludi").disabled = true;
  }
}

/* ---------- avvio ---------- */

async function avvia() {
  if (!sdk) {
    mostra("stato", "SDK Firebase non caricato: controlla la connessione.", "errore");
    return;
  }
  app = inizializzaAppB(sdk, config);
  auth = authDi(app);
  db = firestoreDi(app);
  await persistenzaLocale(auth, sdk);

  el("entra").addEventListener("click", () => {
    entraConGoogle(sdk, auth, { mobile: eMobile() })
      .catch((e) => mostra("stato", "Accesso non riuscito: " + (e && e.message ? e.message : e), "errore"));
  });
  el("esci").addEventListener("click", () => esci(auth));
  el("conta").addEventListener("click", () => {
    conta(uidCorrente()).catch((e) => {
      piano = null;
      el("copia").disabled = true;
      mostra("stato", "Conteggio non riuscito: " + (e && e.message ? e.message : e), "errore");
    });
  });
  el("copia").addEventListener("click", () => {
    copia(uidCorrente()).catch((e) => {
      mostra("stato", "Copia interrotta: " + (e && e.message ? e.message : e), "errore");
    });
  });
  el("cerca").addEventListener("click", () => {
    if (!piano) {
      mostra("esclusioni-stato", "Prima conta: la ricerca usa la stessa lettura del conteggio.", "errore");
      return;
    }
    cercaEsclusioni();
  });
  el("escludi").addEventListener("click", () => {
    escludiScelte().catch((e) => {
      mostra("esclusioni-stato", "Esclusione interrotta: " + (e && e.message ? e.message : e), "errore");
    });
  });

  ascoltaStato(auth, (utente) => accendi(utente));
}

avvia().catch((e) => mostra("stato", "Avvio fallito: " + (e && e.message ? e.message : e), "errore"));
