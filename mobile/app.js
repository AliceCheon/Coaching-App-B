/* Barbell Diva B — ingresso telefono (SOLA LETTURA).
 * Stessa pipeline di lettura del desktop, vista in colonna per il telefono.
 * Nessun service worker, nessun IndexedDB, nessuna scrittura.
 *
 * Fase 1: le sedute e i programmi arrivano dalle LORO sottoraccolte (sessions,
 * nutritionPhotos), non più dalla radice — vedi comune/modello-dati.js.
 */

import { applicaTema, temaSalvato, alternaTema } from "../comune/tema.js";
import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato, eMobile } from "../comune/accesso.js";
import { leggiDocumentoAtleta, leggiSedute, leggiProgrammi, riepilogoDati } from "../comune/lettura-dati.js";
import { frasiPerDati, montaDivaBot, voceDelQuadro, voceDelGiorno, voceDelCarico, tonoPeggiore } from "../comune/diva-bot.js";
import { collegaVociDiVista } from "../comune/voci-vista.js";
import { carichiPerEsercizio, righeCarichi } from "../comune/carichi.js";
import { quadroStrutturale, righeQuadro, righeSemaforo, righeDatiMancanti } from "../comune/struttura.js";

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

/* Le stesse righe del desktop: numero dalla sottoraccolta, sessionCount della
 * radice come controprova dichiarata. */
function righeSedute(modello) {
  if (!modello.presente) return [{ testo: NON_REGISTRATO, classe: "valore" }];
  if (modello.seduteNonLette) {
    return [
      { testo: "lettura non riuscita", classe: "valore" },
      { testo: "la sottoraccolta sessions non ha risposto: nessun numero inventato, riprova con «Ricarica».", classe: "errore" }
    ];
  }
  const righe = [
    { testo: modello.numeroSedute == null ? NON_REGISTRATO : modello.numeroSedute, classe: "valore" },
    { testo: "sottoraccolta sessions: " + modello.numeroSedute + " sedute valide su " + (modello.numeroDocumentiSedute == null ? "?" : modello.numeroDocumentiSedute) + " documenti" }
  ];
  if (modello.seduteSenzaId || modello.seduteDuplicate) {
    righe.push({ testo: "scartati come in A: " + modello.seduteSenzaId + " senza id · " + modello.seduteDuplicate });
  }
  const controllo = modello.controlloSessioni;
  if (!controllo) {
    righe.push({ testo: "controllo · sessionCount nella radice: non registrato" });
  } else if (controllo.coincide) {
    righe.push({ testo: "controllo · sessionCount nella radice: " + controllo.radice + " · coincide", classe: "lemmacarta" });
  } else {
    righe.push({ testo: "controllo · sessionCount nella radice: " + controllo.radice + " · NON coincide (differenza " + (controllo.radice - controllo.sottoraccolta) + ")", classe: "errore" });
  }
  return righe;
}

/* Stessa logica del desktop: nome dalla sottoraccolta, programCount della
 * radice come controprova; se la radice dichiara programmi e non se ne trova
 * nessuno, lo dice come A («cloud programs missing», r.5640). */
function righeProgramma(modello) {
  if (!modello.presente) return [{ testo: NON_REGISTRATO, classe: "valore" }];
  if (modello.programmiNonLetti) {
    return [
      { testo: "lettura non riuscita", classe: "valore" },
      { testo: "la sottoraccolta nutritionPhotos non ha risposto: nessun nome inventato, riprova con «Ricarica».", classe: "errore" }
    ];
  }
  const pr = modello.programma;
  const controllo = modello.controlloProgrammi;
  const righe = [];
  if (pr) {
    righe.push({ testo: pr.nome, classe: "valore" });
    righe.push({ testo: pr.esplicito ? "attivo (marcato esplicitamente)" : "aggiornato più di recente (ripiego di A, non marcato attivo)", classe: "lemmacarta" });
    righe.push({ testo: "Settimana: " + (pr.settimana == null ? NON_REGISTRATA : pr.settimana) });
  } else if (controllo && controllo.mancanti) {
    righe.push({ testo: "programmi mancanti nel cloud", classe: "valore" });
    righe.push({ testo: "la radice dichiara " + controllo.radice + " programmi (programCount) ma nei documenti-programma non ne resta nessuno: come A, «cloud programs missing» — nessun nome inventato.", classe: "errore" });
  } else {
    righe.push({ testo: NON_REGISTRATO, classe: "valore" });
  }
  if (modello.numeroProgrammi != null) {
    righe.push({ testo: "programmi letti dai documenti-programma: " + modello.numeroProgrammi + " su " + (modello.documentiProgrammi == null ? "?" : modello.documentiProgrammi) + " documenti" });
  }
  if (!controllo) {
    righe.push({ testo: "controllo · programCount nella radice: non registrato" });
  } else if (controllo.coincide) {
    righe.push({ testo: "controllo · programCount nella radice: " + controllo.radice + " · coincide", classe: "lemmacarta" });
  } else {
    righe.push({ testo: "controllo · programCount nella radice: " + controllo.radice + " · NON coincide (differenza " + (controllo.radice - controllo.letti) + ")", classe: "errore" });
  }
  if (modello.programmiScartatiFiltro || modello.programmiV1Doppioni) {
    righe.push({ testo: "scartati come in A: " + modello.programmiScartatiFiltro + " fuori da programIds (programmi cancellati) · " + modello.programmiV1Doppioni + " v1 già presenti in v2" });
  }
  return righe;
}

/* Vista telefono: le stesse card del desktop, layout in colonna. */
export function renderDashboard(doc, contenitore, modello, opzioni) {
  const opz = opzioni || {};
  while (contenitore.firstChild) contenitore.firstChild.remove();
  const presente = modello.presente === true;

  contenitore.appendChild(carta(doc, "Sedute registrate", righeSedute(modello),
    "sottoraccolta sessions, campo session.id · A r.6257, r.6365, filtro r.5581 · controllo sessionCount r.5937"));

  const u = modello.ultima;
  contenitore.appendChild(carta(doc, "Ultima seduta", [
    { testo: u ? u.data : NON_REGISTRATO, classe: "valore" },
    u ? { testo: "scheda " + u.codice + (u.nome ? " · " + u.nome : "") } : null
  ], "sottoraccolta sessions — dateInput/sessionCode/sessionName · ordinamento A r.6894-6898"));

  contenitore.appendChild(carta(doc, "Peso corrente", [
    { testo: modello.peso ? modello.peso + " kg" : NON_REGISTRATO, classe: "valore" }
  ], "state.metrics.weight · A r.15034 (scrittore dal v148.38)"));

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
    "state.quiz.questionnaireHistory · A r.4777 e r.15021"));

  contenitore.appendChild(carta(doc, "Programma attivo", righeProgramma(modello),
    "nutritionPhotos, soli documenti program-v1- e program-v2-meta- · filtro programIds r.5591/5600 · v1 scartato se già in v2 r.5636 · controllo programCount r.5633/5640 · regola attivo r.7019-7027 · settimana r.6882-6899"));

  if (!presente) {
    contenitore.appendChild(carta(doc, "Documento di A", [
      { testo: "Non risulta un documento per questo account: mostro il vuoto, senza numeri inventati." }
    ], "barbellDivaAccounts/{uid} · A r.24 e r.6080"));
  }
  if (opz.quadro) {
    contenitore.appendChild(carta(doc, "Quadro strutturale", righeQuadro(opz.quadro),
      "sottoraccolta sessions — dateInput e sessionCode · 8 settimane ISO · soglie dichiarate in comune/struttura.js"));
    contenitore.appendChild(carta(doc, "Semaforo strutturale", righeSemaforo(opz.quadro),
      "conteggi di carico e continuita, non una diagnosi · nessun dato inventato"));
    contenitore.appendChild(carta(doc, "Cosa manca per il semaforo completo", righeDatiMancanti(),
      "DATI_SEMAFORO · comune/struttura.js — dati che in A non sono registrati"));
  }
  if (opz.carichi) {
    contenitore.appendChild(carta(doc, "Carichi per esercizio", righeCarichi(opz.carichi),
      "sottoraccolta sessions \u2014 esercizi e serie con peso \u00b7 finestra di 8 settimane \u00b7 campi accettati dichiarati in comune/carichi.js"));
  }
  return contenitore;
}

/* Fase 2i: l'osservatore delle carte. Uno solo per volta — a ogni lettura il
 * vecchio viene staccato, altrimenti si accumulano su nodi già buttati via. */
let vociVista = null;

export async function avvia(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  if (!config || !sdk) throw new Error("Configurazione o SDK mancanti");

  doc.querySelectorAll("[data-build]").forEach((n) => { n.textContent = "build " + config.build; });
  doc.querySelectorAll("[data-versione]").forEach((n) => { n.textContent = config.build; });
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
      let sedute = { sedute: [], documenti: 0, senzaId: 0, duplicati: 0 };
      let seduteNonLette = false;
      try {
        sedute = await leggiSedute(db, utente.uid);
      } catch (e) {
        seduteNonLette = true;
      }
      let programmi = { programmi: [], documenti: 0, scartatiFiltro: 0, v1Doppioni: 0, fonte: null };
      let programmiNonLetti = false;
      try {
        // programIds/programCount/programStorage stanno nella radice (r.5932-5935).
        programmi = await leggiProgrammi(db, utente.uid, radice);
      } catch (e) {
        programmiNonLetti = true;
      }
      const modello = riepilogoDati({
        stato: radice.stato,
        sedute: sedute.sedute,
        documentiSedute: sedute.documenti,
        seduteSenzaId: sedute.senzaId,
        seduteDuplicate: sedute.duplicati,
        seduteNonLette,
        programmi: programmi.programmi,
        documentiProgrammi: programmi.documenti,
        programmiScartatiFiltro: programmi.scartatiFiltro,
        programmiV1Doppioni: programmi.v1Doppioni,
        programmiFonte: programmi.fonte,
        programmiNonLetti,
        sessionCount: radice.sessionCount,
        programCount: radice.programCount
      });
      const quadro = quadroStrutturale(sedute.sedute, { oggi: new Date(), peso: modello.peso });
      const carichi = carichiPerEsercizio(sedute.sedute, { oggi: new Date() });
      renderDashboard(doc, doc.querySelector("#griglia"), modello, { quadro, carichi });
      contenitoreDiva.textContent = "";
      const voceQuadro = voceDelQuadro(quadro);
      const voceCarico = voceDelCarico(carichi);
      const saluto = voceDelGiorno(new Date());
      const bot = montaDivaBot(
        contenitoreDiva,
        frasiPerDati({
          numeroSedute: modello.numeroSedute || 0,
          pesoPresente: Boolean(modello.peso),
          checkinPresente: Boolean(modello.checkin)
        }, quadro, { giornata: saluto, carichi }),
        tonoPeggiore(voceQuadro.tono, voceCarico.tono),
        { striscia: true }
      );
      /* La frase segue la carta che stai guardando; il tono non migliora mai
       * quello del quadro: scorre, non assolve. */
      if (vociVista) vociVista.stacca();
      vociVista = collegaVociDiVista(doc, win, bot, tonoPeggiore(voceQuadro.tono, voceCarico.tono));
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
