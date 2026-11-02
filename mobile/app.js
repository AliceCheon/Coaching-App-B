/* Barbell Diva B — ingresso telefono (fase 0, SOLA LETTURA).
 * Stessa pipeline di lettura del desktop, vista in colonna per il telefono.
 * Nessun service worker, nessun IndexedDB, nessuna scrittura. */

import { applicaTema, temaSalvato, alternaTema } from "../comune/tema.js";
import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato, eMobile } from "../comune/accesso.js";
import { leggiDocumentoAtleta, leggiSedute, riepilogoDati } from "../comune/lettura-dati.js";
import { frasiPerDati, montaDivaBot } from "../comune/diva-bot.js";

const NON_REGISTRATO = "non registrato";
const NON_REGISTRATA = "non registrata (in A si calcola dalle sedute; nessun numero indovinato)";

function nodo(doc, tag, classe, contenuto) {
  const n = doc.createElement(tag);
  if (classe) n.className = classe;
  n.textContent = contenuto == null ? "" : String(contenuto);
  return n;
}

function carta(doc, titolo, righe, fonte) {
  const c = nodo(doc, "article", "carta");
  c.appendChild(nodo(doc, "h2", "", titolo));
  righe.forEach((r) => {
    if (r && r.testo != null) c.appendChild(nodo(doc, r.tag || "div", r.classe || "riga", r.testo));
  });
  c.appendChild(nodo(doc, "div", "fonte", "fonte: " + fonte));
  return c;
}

/* Vista telefono: le stesse card del desktop, layout in colonna. */
export function renderDashboard(doc, contenitore, modello) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const presente = modello.presente === true;

  contenitore.appendChild(carta(doc, "Sedute registrate", [
    { testo: presente ? (modello.numeroSedute == null ? NON_REGISTRATO : modello.numeroSedute) : NON_REGISTRATO, classe: "valore" },
    { testo: "sottoraccolta sessions: " + (modello.numeroSeduteSottoraccolta == null ? NON_REGISTRATO : modello.numeroSeduteSottoraccolta + " documenti") }
  ], "state.training.sessions · A, src/app-main.js r.3069; sessions/ · r.6257"));

  const u = modello.ultima;
  contenitore.appendChild(carta(doc, "Ultima seduta", [
    { testo: u ? u.data : NON_REGISTRATO, classe: "valore" },
    u ? { testo: "scheda " + u.codice + (u.nome ? " · " + u.nome : "") } : null
  ], "state.training.sessions — dateInput/sessionCode/sessionName · r.6894"));

  contenitore.appendChild(carta(doc, "Peso corrente", [
    { testo: modello.peso ? modello.peso + " kg" : NON_REGISTRATO, classe: "valore" }
  ], "state.metrics.weight · r.15034 (scrittore dal v148.38)"));

  const ck = modello.checkin;
  const righeCheckin = [];
  if (ck) {
    righeCheckin.push({ testo: ck.data, classe: "valore" });
    righeCheckin.push({ testo: "questionario: " + ck.questionario });
    const voci = Object.entries(ck.risposte || {}).map(([k, v]) => k + ": " + v);
    if (ck.wellness) voci.push("wellness: " + JSON.stringify(ck.wellness));
    if (voci.length) righeCheckin.push({ testo: voci.join("\n"), classe: "pre" });
  }
  contenitore.appendChild(carta(doc, "Ultimo check-in", righeCheckin.length ? righeCheckin : [{ testo: NON_REGISTRATO, classe: "valore" }],
    "state.quiz.questionnaireHistory · r.4777 e r.15021"));

  const pr = modello.programma;
  contenitore.appendChild(carta(doc, "Programma attivo", pr ? [
    { testo: pr.nome, classe: "valore" },
    { testo: pr.esplicito ? "attivo (marcato esplicitamente)" : "aggiornato più di recente (ripiego di A, non marcato attivo)", classe: "lemmacarta" },
    { testo: "Settimana: " + (pr.settimana == null ? NON_REGISTRATA : pr.settimana) }
  ] : [{ testo: NON_REGISTRATO, classe: "valore" }],
    "state.programs · r.7019-7027; settimana r.6882-6892"));

  if (!presente) {
    contenitore.appendChild(carta(doc, "Documento di A", [
      { testo: "Non risulta un documento per questo account: mostro il vuoto, senza numeri inventati." }
    ], "barbellDivaAccounts/{uid} · r.24 e r.6080"));
  }
  return contenitore;
}

export async function avvia(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  if (!config || !sdk) throw new Error("Configurazione o SDK mancanti");

  doc.querySelectorAll("[data-build]").forEach((n) => { n.textContent = "build " + config.build; });
  applicaTema(doc, temaSalvato(win.localStorage));

  const app = inizializzaAppB(sdk, config);
  const auth = authDi(app);
  persistenzaLocale(auth, sdk).catch(() => {});
  const db = firestoreDi(app);

  const vistaLogin = doc.querySelector("#vistaLogin");
  const vistaDash = doc.querySelector("#vistaDash");
  const statoUtente = doc.querySelector("#statoUtente");
  const messaggioErrore = doc.querySelector("#messaggioErrore");
  const contenitoreDiva = doc.querySelector("#divaContenitore");
  let utenteCorrente = null;

  const leggi = async (utente) => {
    if (!utente) return;
    messaggioErrore.textContent = "";
    try {
      const radice = await leggiDocumentoAtleta(db, utente.uid);
      let sedute = [];
      try { sedute = await leggiSedute(db, utente.uid); } catch (e) { sedute = []; }
      const modello = riepilogoDati(radice.stato, sedute);
      renderDashboard(doc, doc.querySelector("#griglia"), modello);
      contenitoreDiva.textContent = "";
      montaDivaBot(contenitoreDiva, frasiPerDati({ numeroSedute: modello.numeroSedute || 0, pesoPresente: Boolean(modello.peso), checkinPresente: Boolean(modello.checkin) }));
    } catch (errore) {
      messaggioErrore.textContent = "Errore di lettura: " + (errore && errore.code ? errore.code : (errore && errore.message) || "sconosciuto");
    }
  };

  ascoltaStato(auth, async (utente) => {
    utenteCorrente = utente;
    if (utente) {
      vistaLogin.hidden = true;
      vistaDash.hidden = false;
      statoUtente.textContent = "connessa/o come " + (utente.displayName || utente.email || utente.uid);
      await leggi(utente);
    } else {
      vistaLogin.hidden = false;
      vistaDash.hidden = true;
      statoUtente.textContent = "";
    }
  });

  doc.querySelector("#bottoneEntra").addEventListener("click", () => {
    entraConGoogle(sdk, auth, { mobile: eMobile(win.navigator) }).catch((e) => {
      messaggioErrore.textContent = "Accesso non riuscito: " + (e && e.code ? e.code : (e && e.message) || "");
    });
  });
  doc.querySelector("#bottoneRicarica").addEventListener("click", () => leggi(utenteCorrente));
  doc.querySelector("#bottoneEsci").addEventListener("click", () => esci(auth));
  doc.querySelector("#bottoneTema").addEventListener("click", () => alternaTema(doc, win.localStorage));
  return { app, auth, db };
}

if (typeof document !== "undefined" && document.querySelector && document.querySelector("[data-avvio-b]")) {
  avvia(document, window);
}
