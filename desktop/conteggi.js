/* Barbell Diva B — pagina dei conteggi e della fotografia (passo 1, SOLA LETTURA).
 *
 * Cosa fa: legge il documento radice di A, i programmi, le schede e le sedute
 * (documenti grezzi), conta le tre famiglie, le mostra a schermo e — solo se
 * tutte e tre le letture sono andate a buon fine — prepara il file da scaricare
 * sul PC della coach.
 *
 * Cosa non fa: nessuna scrittura, nessun ascoltatore sui dati, nessun
 * IndexedDB. `tests/02` scandisce questo file e fallisce se compare una
 * chiamata di scrittura: è la cintura, e resta tesa.
 */

import { applicaTema, temaSalvato, alternaTema } from "../comune/tema.js";
import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato } from "../comune/accesso.js";
import { leggiDocumentoAtleta } from "../comune/lettura-dati.js";
import { leggiSeduteGrezze, leggiProgrammiGrezzi, leggiSchedeGrezze } from "../comune/lettura-grezza.js";
import {
  contaSchede,
  contaProgrammi,
  contaSedute,
  confrontoConRadice,
  costruisciBackup,
  nomeFileBackup,
  righeConteggi,
  testoBackup
} from "../comune/conteggi-copia.js";

const NON_REGISTRATO = "non registrato";

function nodo(doc, tag, classe, contenuto) {
  const n = doc.createElement(tag);
  if (classe) n.className = classe;
  n.textContent = contenuto == null ? "" : String(contenuto);
  return n;
}

/* Una riga della tabella: le cinque colonne, più la nota sotto il numero. */
function rigaTabella(doc, riga) {
  const tr = doc.createElement("tr");
  tr.appendChild(nodo(doc, "td", "c-che", riga.cosa));

  const inA = nodo(doc, "td", "c-num", riga.inA);
  tr.appendChild(inA);

  const letto = nodo(doc, "td", "c-num", riga.lettoOra);
  if (riga.nota) letto.appendChild(nodo(doc, "span", "sotto", riga.nota));
  tr.appendChild(letto);

  tr.appendChild(nodo(doc, "td", "c-dove", riga.dove));
  tr.appendChild(nodo(doc, "td", "c-nuova", riga.zonaNuova));
  return tr;
}

/* Disegna tabella e stato. `letto` porta i tre conteggi grezzi e la radice;
 * `problemi` è l'elenco delle letture fallite (se c'è, il file non si scarica). */
export function renderConteggi(doc, contenitore, letto, problemi) {
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const elenco = Array.isArray(problemi) ? problemi : [];
  const righe = righeConteggi(letto);
  righe.forEach((r) => contenitore.appendChild(rigaTabella(doc, r)));
  const totale = {
    schede: letto && letto.schede ? letto.schede.documenti : 0,
    programmi: letto && letto.programmi ? letto.programmi.documenti : 0,
    sedute: letto && letto.sedute ? letto.sedute.documenti : 0,
    problemi: elenco
  };
  return totale;
}

function mostraErrore(span, testo) {
  if (!span) return;
  span.textContent = testo || "";
  span.dataset.vuoto = testo ? "no" : "si";
}

/* Scarica il file sul PC. Nessuna rete: il testo è già in memoria. */
function scarica(win, doc, testo, nome) {
  const blob = new win.Blob([testo], { type: "application/json" });
  const url = win.URL.createObjectURL(blob);
  const a = doc.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
  win.setTimeout(() => win.URL.revokeObjectURL(url), 4000);
}

export async function avviaConteggi(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  if (!config || !sdk) throw new Error("Configurazione o SDK mancanti");

  doc.querySelectorAll("[data-versione]").forEach((n) => { n.textContent = config.build; });
  applicaTema(doc, temaSalvato(win.localStorage));

  const app = inizializzaAppB(sdk, config);
  const auth = authDi(app);
  persistenzaLocale(auth, sdk).catch(() => {});
  const db = firestoreDi(app);

  const vistaLogin = doc.querySelector("#vistaLogin");
  const vistaConteggi = doc.querySelector("#vistaConteggi");
  const statoUtente = doc.querySelector("#statoUtente");
  const oraLettura = doc.querySelector("#oraLettura");
  const dataLettura = doc.querySelector("#dataLettura");
  const messaggioErrore = doc.querySelector("#messaggioErrore");
  const erroreAccesso = doc.querySelector("#erroreAccesso");
  const bottoneBackup = doc.querySelector("#bottoneBackup");
  const fileNome = doc.querySelector("#fileNome");
  const corpoTabella = doc.querySelector("#righeConteggi");
  let utenteCorrente = null;
  let ultimaFotografia = null;

  const aggiornaVista = (utente) => {
    if (utente) {
      vistaLogin.hidden = true;
      vistaConteggi.hidden = false;
      statoUtente.textContent = "connessa/o come " + (utente.displayName || utente.email || utente.uid);
    } else {
      vistaLogin.hidden = false;
      vistaConteggi.hidden = true;
      statoUtente.textContent = "";
      bottoneBackup.disabled = true;
      ultimaFotografia = null;
    }
  };

  const leggi = async (utente) => {
    if (!utente) return;
    mostraErrore(messaggioErrore, "");
    bottoneBackup.disabled = true;
    ultimaFotografia = null;
    const problemi = [];
    let radice = null;
    let sedute = [];
    let programmi = [];
    let schede = [];
    try {
      radice = await leggiDocumentoAtleta(db, utente.uid);
    } catch (e) {
      problemi.push("radice: " + ((e && e.code) || (e && e.message) || "lettura fallita"));
    }
    try {
      sedute = await leggiSeduteGrezze(db, utente.uid);
    } catch (e) {
      problemi.push("sessions: " + ((e && e.code) || (e && e.message) || "lettura fallita"));
    }
    try {
      programmi = await leggiProgrammiGrezzi(db, utente.uid);
    } catch (e) {
      problemi.push("programmi: " + ((e && e.code) || (e && e.message) || "lettura fallita"));
    }
    try {
      schede = await leggiSchedeGrezze(db, utente.uid);
    } catch (e) {
      problemi.push("schede: " + ((e && e.code) || (e && e.message) || "lettura fallita"));
    }

    const letto = {
      radice: radice && radice.presente === false ? null : radice,
      schede: contaSchede(schede),
      programmi: contaProgrammi(programmi, radice && radice.presente === false ? null : radice),
      sedute: contaSedute(sedute)
    };
    letto.confronto = confrontoConRadice(letto, letto.radice);

    renderConteggi(doc, corpoTabella, letto, problemi);
    const quando = new Date();
    oraLettura.textContent = "lettura una tantum · " + quando.toLocaleTimeString("it-IT") + " · nessuna scrittura";
    dataLettura.textContent = "fotografia del " + quando.toLocaleDateString("it-IT");

    if (!(radice && radice.presente === false)) {
      // La fotografia si compone solo con letture complete: una fotografia a
      // metà è peggio di nessuna fotografia, perché sembra una sicurezza.
      ultimaFotografia = costruisciBackup({
        creatoIl: quando,
        build: config.build,
        progetto: config.firebase && config.firebase.projectId,
        uid: utente.uid,
        radice: letto.radice,
        sedute,
        programmi,
        schede
      });
      const nome = nomeFileBackup(quando);
      fileNome.textContent = problemi.length ? "" : "pronta da scaricare: " + nome;
      bottoneBackup.disabled = problemi.length > 0;
    } else {
      fileNome.textContent = "";
    }

    if (problemi.length) {
      mostraErrore(messaggioErrore, "lettura incompleta — " + problemi.join(" · ") + ". Non scaricare: una fotografia a metà non è una sicurezza.");
    } else if (radice && radice.presente === false) {
      mostraErrore(messaggioErrore, "documento dell'atleta " + NON_REGISTRATO + ": non c'è niente da fotografare per questo account.");
    }
  };

  ascoltaStato(auth, async (utente) => {
    utenteCorrente = utente;
    aggiornaVista(utente);
    await leggi(utente);
  });

  doc.querySelector("#bottoneEntra").addEventListener("click", () => {
    entraConGoogle(sdk, auth, { mobile: false }).catch((e) => {
      mostraErrore(erroreAccesso, "Accesso non riuscito: " + ((e && e.code) || (e && e.message) || ""));
    });
  });
  doc.querySelector("#bottoneRicarica").addEventListener("click", () => leggi(utenteCorrente));
  doc.querySelector("#bottoneEsci").addEventListener("click", () => esci(auth));
  doc.querySelector("#bottoneTema").addEventListener("click", () => alternaTema(doc, win.localStorage));
  bottoneBackup.addEventListener("click", () => {
    if (!ultimaFotografia) return;
    scarica(win, doc, testoBackup(ultimaFotografia), nomeFileBackup(new Date()));
  });
  return { app, auth, db };
}

if (typeof document !== "undefined" && document.querySelector && document.querySelector("[data-avvio-conteggi]")) {
  avviaConteggi(document, window);
}
