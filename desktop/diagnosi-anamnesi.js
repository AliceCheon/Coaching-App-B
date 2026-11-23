/* Barbell Diva B — PASSO 14d: la pagina di diagnosi della dichiarazione.
 *
 * Legge il registro, scrive UNA voce di prova, la rilegge, la annulla, e dice
 * in italiano cosa e' riuscito e cosa no. Il percorso esatto e il codice
 * dell'errore (permission-denied compreso), e in chiaro se il problema e' la
 * regola di Firestore o il codice.
 *
 * Scrive solo la voce di prova e il suo annullamento, e solo nel registro.
 * Nessuna raccolta nuova: se questa pagina scrive, scrive dove scrive l'app.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato } from "../comune/accesso.js";
import { leggiZonaB, scriviVoceRegistro } from "../comune/scritture-b.js";
import {
  dichiarazioneDalRegistro, salvaAnamnesi, annullaAnamnesi, motivoLettura, oraBreve
} from "../comune/anamnesi-b.js";
import { ZONA_B } from "../comune/modello-dati.js";

const config = window.BD_B || {};
const sdk = window.firebase;
const el = (id) => document.getElementById(id);

let app = null;
let auth = null;
let db = null;

function uidCorrente() {
  return (auth && auth.currentUser && auth.currentUser.uid) || "";
}

function percorso(uid, id) {
  return ZONA_B + "/" + uid + "/registro" + (id ? "/" + id : "");
}

function passo(nome, ok, dettaglio) {
  const box = document.createElement("div");
  box.className = "passo " + (ok ? "ok" : "errore");
  const b = document.createElement("b");
  b.textContent = (ok ? "riuscito · " : "NON riuscito · ") + nome;
  const d = document.createElement("div");
  d.className = "dettaglio";
  d.textContent = dettaglio || "";
  box.appendChild(b);
  box.appendChild(d);
  el("passi").appendChild(box);
  return box;
}

function verdetto(classe, titolo, testo) {
  const box = el("verdetto");
  box.textContent = "";
  const v = document.createElement("div");
  v.className = "verdetto " + classe;
  const b = document.createElement("b");
  b.textContent = titolo;
  const p = document.createElement("p");
  p.textContent = testo;
  v.appendChild(b);
  v.appendChild(p);
  box.appendChild(v);
}

function codiceDi(errore) {
  return String((errore && (errore.code || errore.codice)) || "");
}

function disegnaCorrente(dichiarazione) {
  const d = dichiarazione || null;
  if (!d || d.errore) {
    el("corrente").textContent = d && d.errore ? "non ho potuto leggere: " + d.errore : "non dichiarato";
    el("corrente-dettaglio").textContent = "";
    return;
  }
  el("corrente").textContent = d.presente && d.testo ? d.testo : "non dichiarato";
  el("corrente-dettaglio").textContent = d.presente
    ? "voce " + (d.idVoce || "senza id") + " · versione " + d.versione
      + (d.aggiornato ? " · salvata alle " + (oraBreve(d.aggiornato) || d.aggiornato) : "")
    : "Nessuna voce di dichiarazione nel registro.";
}

async function leggiRegistro() {
  return leggiZonaB(db, uidCorrente(), "registro");
}

async function prova() {
  const uid = uidCorrente();
  if (!uid) return;
  el("passi").textContent = "";
  el("verdetto").textContent = "";
  el("stato").textContent = "provo…";
  el("prova").disabled = true;

  let erroreLettura = null;
  let voci = [];
  let dichiarazione = null;

  /* 1. lettura del registro */
  try {
    voci = await leggiRegistro();
    dichiarazione = dichiarazioneDalRegistro(voci);
    disegnaCorrente(dichiarazione);
    passo("lettura del registro", true, "percorso: " + percorso(uid)
      + "\n" + voci.length + (voci.length === 1 ? " voce" : " voci") + " lette"
      + " · dichiarazione: " + (dichiarazione.presente ? "«" + dichiarazione.testo + "»" : "non dichiarato"));
  } catch (e) {
    erroreLettura = e;
    const codice = codiceDi(e);
    disegnaCorrente({ errore: motivoLettura(e) });
    passo("lettura del registro", false, "percorso: " + percorso(uid)
      + "\ncodice: " + (codice || "nessuno") + "\n" + motivoLettura(e));
  }

  if (erroreLettura) {
    verdetto("regola", codiceDi(erroreLettura) === "permission-denied"
      ? "Il problema è la REGOLA di Firestore (lettura)"
      : "Il problema è la lettura, e il codice lo dice: " + (codiceDi(erroreLettura) || "nessun codice"),
    codiceDi(erroreLettura) === "permission-denied"
      ? "La lettura di " + percorso(uid) + " è negata per questo utente (permission-denied). "
        + "Il codice non c'entra: la regola della raccolta registro non lascia leggere a questo account. "
        + "Controlla la regola su Firestore per bdB_atleti/{uid}/registro e per l'utente autenticato."
      : "La lettura non passa (" + motivoLettura(erroreLettura) + "). Non è detto che sia la regola: "
        + "guarda il codice sopra. Se è permission-denied è la regola, altrimenti è rete o codice.");
    el("stato").textContent = "prova interrotta alla lettura";
    el("prova").disabled = false;
    return;
  }

  /* 2. scrittura di una voce di prova */
  const quando = new Date().toISOString();
  const testoProva = "Prova di scrittura della diagnosi delle " + (oraBreve(quando) || quando);
  const esitoSalva = salvaAnamnesi(dichiarazione, testoProva, { quando: quando, versioneAttesa: dichiarazione.versione || 0 });
  if (!esitoSalva.ok) {
    passo("preparazione della voce di prova", false, "il codice ha rifiutato di preparare la voce: " + esitoSalva.motivo);
    verdetto("codice", "Il problema è il CODICE", "La voce di prova non si è nemmeno preparata: " + esitoSalva.motivo);
    el("stato").textContent = "prova interrotta";
    el("prova").disabled = false;
    return;
  }
  const voce = Object.assign({}, esitoSalva.voce, { origine: "diagnosi-anamnesi" });
  try {
    await scriviVoceRegistro(db, uid, voce.idVoce, voce);
    passo("scrittura della voce di prova", true, "percorso: " + percorso(uid, voce.idVoce)
      + "\ntipo: " + voce.tipo + " · versione " + voce.versionePrima + " → " + voce.versioneDopo);
  } catch (e) {
    const codice = codiceDi(e);
    passo("scrittura della voce di prova", false, "percorso: " + percorso(uid, voce.idVoce)
      + "\ncodice: " + (codice || "nessuno") + "\n" + motivoLettura(e));
    verdetto("regola", codice === "permission-denied"
      ? "Il problema è la REGOLA di Firestore (scrittura)"
      : "Il problema è la scrittura, e il codice lo dice: " + (codice || "nessun codice"),
    codice === "permission-denied"
      ? "La scrittura su " + percorso(uid) + " è negata per questo utente (permission-denied). "
        + "È la regola, non il codice: l'app scrive già nel registro da tutti i passi, quindi la regola "
        + "che manca è quella che lascia scrivere a questo account su bdB_atleti/{uid}/registro."
      : "La scrittura non passa (" + motivoLettura(e) + "). Guarda il codice: se non è permission-denied, "
        + "la regola non c'entra e il problema sta nella richiesta.");
    el("stato").textContent = "prova interrotta alla scrittura";
    el("prova").disabled = false;
    return;
  }

  /* 3. rilettura: la voce si vede? */
  let riletto = null;
  try {
    const voci2 = await leggiRegistro();
    riletto = dichiarazioneDalRegistro(voci2);
    disegnaCorrente(riletto);
    const uguale = riletto.presente && String(riletto.testo).trim() === testoProva.trim();
    passo("rilettura della voce di prova", uguale, uguale
      ? "percorso: " + percorso(uid) + "\nla lettura ritrova il testo scritto: «" + riletto.testo + "»"
      : "percorso: " + percorso(uid) + "\nla lettura NON ritrova il testo scritto: legge «"
        + (riletto.presente ? riletto.testo : "niente") + "»");
    if (!uguale) {
      verdetto("codice", "Il problema è il CODICE (o l'ordine delle voci)",
        "La scrittura è passata ma la rilettura non ritrova il testo appena scritto. "
        + "La regola di Firestore non c'entra: se la scrittura passa, la regola lascia scrivere. "
        + "Guarda la lettura del registro: quante voci torna, in che ordine, e se il campo `dopo` "
        + "della voce appena scritta c'è.");
      el("stato").textContent = "prova interrotta: riletto diverso";
      el("prova").disabled = false;
      return;
    }
  } catch (e) {
    passo("rilettura della voce di prova", false, "percorso: " + percorso(uid)
      + "\ncodice: " + (codiceDi(e) || "nessuno") + "\n" + motivoLettura(e));
    verdetto("codice", "Il problema è il CODICE (lettura dopo scrittura)",
      "La scrittura è passata, la rilettura no. Se il codice è permission-denied la regola è incoerente "
      + "(scrive ma non legge); altrimenti è la lettura del codice.");
    el("stato").textContent = "prova interrotta alla rilettura";
    el("prova").disabled = false;
    return;
  }

  /* 4. annullamento: si torna al testo di prima */
  const esitoAnnulla = annullaAnamnesi(riletto, { quando: new Date().toISOString(), versioneAttesa: riletto.versione || 0 });
  if (!esitoAnnulla.ok) {
    passo("annullamento della voce di prova", false, "il codice ha rifiutato di preparare l'annullamento: " + esitoAnnulla.motivo);
    verdetto("codice", "Il problema è il CODICE", "L'annullamento non si è preparato: " + esitoAnnulla.motivo);
    el("stato").textContent = "prova interrotta";
    el("prova").disabled = false;
    return;
  }
  const voceAnnulla = Object.assign({}, esitoAnnulla.voce, { origine: "diagnosi-anamnesi" });
  try {
    await scriviVoceRegistro(db, uid, voceAnnulla.idVoce, voceAnnulla);
    const voci3 = await leggiRegistro();
    const dopo = dichiarazioneDalRegistro(voci3);
    disegnaCorrente(dopo);
    const tornato = String(dopo.testo || "").trim() === String(esitoAnnulla.voce.dopo || "").trim();
    passo("annullamento della voce di prova", tornato, "percorso: " + percorso(uid, voceAnnulla.idVoce)
      + "\nannulla: " + voceAnnulla.annullaDi
      + "\ntesto dopo l'annullamento: " + (dopo.presente ? "«" + dopo.testo + "»" : "non dichiarato"));
    if (tornato) {
      verdetto("ok", "Regola e codice a posto",
        "Lettura, scrittura, rilettura e annullamento funzionano su " + percorso(uid) + ". "
        + "Se in app il testo non resta dopo la ricarica, il problema non è questa strada: guarda "
        + "se la pagina legge il registro (e non un documento) e se l'errore di lettura viene mostrato.");
    } else {
      verdetto("codice", "Il problema è il CODICE (annullamento)",
        "L'annullamento è stato scritto ma la rilettura non torna al testo di prima: "
        + "guarda come si sceglie l'ultima dichiarazione e come `annullaDi` viene confrontato.");
    }
  } catch (e) {
    passo("annullamento della voce di prova", false, "percorso: " + percorso(uid, voceAnnulla.idVoce)
      + "\ncodice: " + (codiceDi(e) || "nessuno") + "\n" + motivoLettura(e));
    verdetto("regola", codiceDi(e) === "permission-denied"
      ? "Il problema è la REGOLA di Firestore (annullamento)"
      : "Il problema è la scrittura dell'annullamento",
    "La voce di prova è rimasta nel registro. " + motivoLettura(e));
  }
  el("stato").textContent = "prova finita alle " + (oraBreve(new Date().toISOString()) || "");
  el("prova").disabled = false;
}

function mostraAccesso(utente) {
  if (utente) {
    el("chi").textContent = utente.displayName || utente.email || utente.uid;
    el("uid").textContent = utente.uid;
    el("entra").hidden = true;
    el("esci").hidden = false;
    el("corpo").hidden = false;
    leggiRegistro().then((voci) => {
      disegnaCorrente(dichiarazioneDalRegistro(voci));
    }, (e) => {
      disegnaCorrente({ errore: motivoLettura(e) });
    });
  } else {
    el("chi").textContent = "non collegato";
    el("uid").textContent = "—";
    el("entra").hidden = false;
    el("esci").hidden = true;
    el("corpo").hidden = true;
  }
}

async function avvia() {
  app = inizializzaAppB(config, sdk);
  auth = authDi(app);
  db = firestoreDi(app);
  el("entra").onclick = () => entraConGoogle(auth).catch((e) => { el("stato").textContent = motivoLettura(e); });
  el("esci").onclick = () => esci(auth);
  el("prova").onclick = () => { prova().catch((e) => { el("stato").textContent = motivoLettura(e); el("prova").disabled = false; }); };
  ascoltaStato(auth, mostraAccesso);
}

avvia().catch((e) => {
  el("stato").textContent = "avvio non riuscito: " + motivoLettura(e);
});
