/* Barbell Diva B — la pagina di copia (passo 4). Solo DOM e orchestrazione:
 * nessuna scrittura scritta qui, tutto passa da comune/scritture-b.js.
 *
 * Ordine: leggi A (grezzo) -> mostra i conteggi -> copia in sequenza
 * (programmi, schede, sedute) -> rileggi B -> confronta -> scrivi la
 * fotografia -> rileggi la fotografia e mostra la data.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato, eMobile } from "../comune/accesso.js";
import { leggiProgrammiGrezzi, leggiSchedeGrezze, leggiSeduteGrezze } from "../comune/lettura-grezza.js";
import { leggiDocumentoAtleta } from "../comune/lettura-dati.js";
import {
  copiaProgramma,
  copiaScheda,
  copiaSeduta,
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
  descriviFotografia
} from "../comune/copia-b.js";

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
let piano = null;

function accendi(utente) {
  el("chi").textContent = utente ? (utente.email || utente.uid) : "non collegato";
  el("corpo").hidden = !utente;
  el("entra").hidden = !!utente;
  el("esci").hidden = !utente;
  el("uid").textContent = utente ? utente.uid : "—";
  if (!utente) return;
  leggiA(utente.uid).catch((e) => mostra("stato", "Lettura di A fallita: " + (e && e.message ? e.message : e), "errore"));
}

/* ---------- 1. leggo A, conto, mostro ---------- */

async function leggiA(uid) {
  mostra("stato", "Leggo A (sola lettura)…", "");
  el("copia").disabled = true;
  const [radiceDoc, programmi, schede, sedute] = await Promise.all([
    leggiDocumentoAtleta(db, uid),
    leggiProgrammiGrezzi(db, uid),
    leggiSchedeGrezze(db, uid),
    leggiSeduteGrezze(db, uid)
  ]);
  piano = pianoDiCopia({ programmi, schede, sedute });
  piano.radice = radiceDoc;

  const righe = riepilogo(piano).map((r) => r.etichetta + ": " + r.quante).join(" · ");
  el("conteggi-a").textContent = righe + " · totale scritture: " + piano.totaleScritture;
  el("esclusi").textContent = "Non copiati in questo passo: " +
    piano.esclusi.esercizi + " documenti di esercizio (servono alle schede troppo grandi), " +
    piano.esclusi.archiviate + " schede archiviate, " +
    "le foto di nutrizione. Restano in A, non si toccano.";

  const confrontoRadice = radiceDoc && radiceDoc.sessionCount != null
    ? "A dichiara " + radiceDoc.sessionCount + " sedute, B ne legge " + piano.conteggi.sedute + " documenti."
    : "A non dichiara sessionCount nella radice: nessun confronto possibile.";
  el("radice").textContent = confrontoRadice;

  el("copia").disabled = piano.totaleScritture === 0;
  mostra("stato", "Pronto: " + piano.totaleScritture + " documenti da scrivere in bdB_atleti/" + uid + ".", "pronto");

  const esistente = await leggiFotografia(db, uid).catch(() => null);
  el("fotografia").textContent = descriviFotografia(esistente);
}

/* ---------- 2. copio, una famiglia dopo l'altra ---------- */

async function copia(uid) {
  if (!piano) return;
  el("copia").disabled = true;
  const voci = piano.voci;
  let fatte = 0;
  for (const voce of voci) {
    if (voce.famiglia === "programmi") await copiaProgramma(db, uid, voce.id, voce.dati);
    else if (voce.famiglia === "schede") await copiaScheda(db, uid, voce.id, voce.dati);
    else await copiaSeduta(db, uid, voce.id, voce.dati);
    fatte += 1;
    el("avanzamento").value = fatte;
    el("avanzamento").max = voci.length;
    mostra("stato", "Copiati " + fatte + " di " + voci.length + " documenti…", "");
  }

  mostra("stato", "Rileggo B e confronto…", "");
  const [programmiB, schedeB, seduteB] = await Promise.all([
    leggiZonaB(db, uid, "programmi"),
    leggiZonaB(db, uid, "schede"),
    leggiZonaB(db, uid, "sedute")
  ]);
  const confronto = confrontaCopia(piano, { programmi: programmiB, schede: schedeB, sedute: seduteB });

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
    uid,
    quando: new Date(),
    build: config.build,
    progetto: config.firebase ? config.firebase.projectId : null,
    conteggi: piano.conteggi,
    esclusi: piano.esclusi,
    confronto
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
  mostra("stato", doc.coincide
    ? "Copia finita e confronto a posto."
    : "Copia finita, ma il confronto NON coincide: guarda la tabella.", doc.coincide ? "pronto" : "errore");
  el("copia").disabled = false;
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
  el("copia").addEventListener("click", () => {
    const uid = (auth.currentUser && auth.currentUser.uid) || "";
    copia(uid).catch((e) => {
      mostra("stato", "Copia interrotta: " + (e && e.message ? e.message : e), "errore");
      el("copia").disabled = false;
    });
  });

  ascoltaStato(auth, (utente) => accendi(utente));
}

avvia().catch((e) => mostra("stato", "Avvio fallito: " + (e && e.message ? e.message : e), "errore"));
