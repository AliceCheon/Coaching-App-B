/* Barbell Diva B — PASSO 11: la pagina di diagnosi degli esercizi.
 *
 * Solo DOM e orchestrazione, e SOLO lettura: qui non c'e' una sola scrittura,
 * ne' su A ne' sulla zona B. Le letture sono quelle dell'app:
 *   leggiZonaBCompleta -> programmi, schede v2, sedute, esclusioni
 *   leggiZonaB(..., "schede") -> i documenti veri, per i nomi com'e' scritti
 *   programmaAttivo + riepilogoProgramma -> la scheda del programma attivo
 * Poi le funzioni pure di comune/diagnostica-esercizi.js fanno il resto.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, esci, ascoltaStato, eMobile } from "../comune/accesso.js";
import { leggiZonaBCompleta } from "../comune/lettura-b.js";
import { leggiZonaB } from "../comune/scritture-b.js";
import { programmaAttivo } from "../comune/lettura-dati.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { righeDalleSchede, contaVolume } from "../comune/volume-b.js";
import {
  indiceNomiGrezzi,
  origineSchede,
  righeDiagnosi,
  riepilogoDiagnosi,
  fraseRiepilogoVolume,
  testoDiagnosi
} from "../comune/diagnostica-esercizi.js";

const config = window.BD_B || {};
const sdk = window.firebase;
const el = (id) => document.getElementById(id);

let app = null;
let auth = null;
let db = null;
/* L'ultimo testo copiabile: si riempie a ogni lettura, non si calcola due volte. */
let ultimoTesto = "";

function uidCorrente() {
  return (auth && auth.currentUser && auth.currentUser.uid) || "";
}

function mostra(id, testo, classe) {
  const nodo = el(id);
  if (!nodo) return;
  nodo.textContent = testo;
  nodo.className = classe || "";
}

function cella(valore, classe) {
  const td = document.createElement("td");
  td.textContent = valore;
  if (classe) td.className = classe;
  return td;
}

function testoResolver(r) {
  if (r.voce) return r.voce + " (" + (r.passo || "?") + ")";
  const motivo = r.motivo === "ambiguo"
    ? "ambiguo: " + (r.candidati && r.candidati.length ? r.candidati.join(" / ") : "nessun candidato elencato")
    : "non riconosciuto: " + (r.motivo || "nessun candidato");
  return motivo;
}

function testoDistretto(r) {
  const primari = Array.isArray(r.primari) ? r.primari : [];
  if (!primari.length) return "nessun distretto";
  const secondari = Array.isArray(r.secondari) ? r.secondari : [];
  return primari.join(", ") + (secondari.length ? " (secondari: " + secondari.join(", ") + ")" : "");
}

/* Disegna la tabella: una riga per esercizio, nessun raggruppamento e nessuna
 * riga finta. Le righe fuori volume restano visibili ma spente. */
function disegnaTabella(righe) {
  const corpo = el("righe");
  corpo.textContent = "";
  righe.forEach((r) => {
    const tr = document.createElement("tr");
    if (!r.nelVolume) tr.className = "fuori";
    tr.appendChild(cella(r.scheda));
    tr.appendChild(cella(r.origine || "fonte non dichiarata"));
    /* il nome sta fra virgolette e NON si pulisce: spazi doppi compresi */
    tr.appendChild(cella("\u00AB" + r.nome + "\u00BB", "nome"));
    tr.appendChild(cella(r.distrettoRiga || "\u2014"));
    tr.appendChild(cella(testoResolver(r), r.voce ? "ok" : "errore"));
    tr.appendChild(cella(testoDistretto(r), (r.primari && r.primari.length) ? "ok" : "errore"));
    tr.appendChild(cella(r.articolazioniTesto, r.articolazioni && r.articolazioni.nonMappato ? "avviso" : ""));
    tr.appendChild(cella(r.nelVolume ? "s\u00EC" : "no"));
    corpo.appendChild(tr);
  });
}

async function diagnostica(uid) {
  el("leggi").disabled = true;
  el("copia-tutto").disabled = true;
  ultimoTesto = "";
  mostra("stato", "Leggo la zona B (sola lettura)\u2026", "");
  try {
    const zona = await leggiZonaBCompleta(db, uid);
    const documentiSchede = await leggiZonaB(db, uid, "schede");
    const attivo = programmaAttivo(zona.programmi || []);
    const rp = riepilogoProgramma(attivo ? attivo.programma : null, zona.sedute ? zona.sedute.sedute : [], { schedeV2: zona.schedeV2 });

    /* l'origine si legge dalla risposta del riepilogo, non si indovina */
    const origine = origineSchede(rp);
    const nomiGrezzi = indiceNomiGrezzi(documentiSchede);
    const righe = righeDiagnosi(rp.schede, { nomiGrezzi, origine });
    const numeri = riepilogoDiagnosi(righe);

    /* il conto vero, per la frase del Riepilogo volume */
    const conto = contaVolume(righeDalleSchede(rp.schede), { quante: 8 });
    const frase = fraseRiepilogoVolume(conto);

    el("k-lette").textContent = String(numeri.lette);
    el("k-riconosciute").textContent = String(numeri.riconosciute);
    el("k-senza").textContent = String(numeri.senzaDistretto);
    el("k-distretti").textContent = String(numeri.distretti.length) +
      (numeri.distretti.length ? " \u00b7 " + numeri.distretti.join(", ") : "");
    el("k-fuori").textContent = String(numeri.fuoriVolume);
    el("fonte-schede").textContent = origine.fonte || "non dichiarata";
    el("programma").textContent = rp.profilo.presente
      ? (rp.profilo.nome + " \u00b7 id " + (origine.idProgramma || "\u2014") + (attivo && !attivo.esplicito ? " \u00b7 nessun programma dichiarato attivo: \u00e8 il pi\u00f9 recente" : ""))
      : "nessun programma letto";
    el("frase-volume").textContent = frase;
    el("legame").textContent = origine.tipo === "v2"
      ? "Legame usato dalla ricerca delle schede: " + (origine.come || "non dichiarato")
        + " \u00b7 gruppi in zona B: " + (origine.gruppi == null ? "\u2014" : origine.gruppi)
        + " \u00b7 schede legate: " + (origine.legate == null ? "\u2014" : origine.legate)
      : (origine.tipo === "v1" ? "Le schede stanno dentro il documento del programma." : "La fonte delle schede non \u00e8 dichiarata dal riepilogo.");

    el("testa").hidden = false;
    el("tabella").hidden = righe.length === 0;
    el("vuoto").hidden = righe.length !== 0;
    disegnaTabella(righe);

    ultimoTesto = testoDiagnosi({
      quando: new Date().toLocaleString("it-IT"),
      programma: rp.profilo.presente ? (rp.profilo.nome + " \u00b7 id " + (origine.idProgramma || "\u2014")) : "nessun programma letto",
      fonteSchede: origine.fonte,
      origine,
      frase,
      riepilogo: numeri,
      righe
    });
    el("copia-tutto").disabled = false;
    mostra("stato", "Lette " + numeri.lette + " righe \u00b7 riconosciute " + numeri.riconosciute +
      (numeri.senzaDistretto ? " \u00b7 " + numeri.senzaDistretto + " senza distretto" : "") + ".", "");
  } catch (e) {
    el("testa").hidden = true;
    el("tabella").hidden = true;
    el("vuoto").hidden = true;
    mostra("stato", "Lettura non riuscita: " + (e && e.message ? e.message : e), "errore");
  } finally {
    el("leggi").disabled = false;
  }
}

/* «Copia tutto»: mette negli appunti il testo gia' composto. Se il browser
 * non lascia usare gli appunti si mostra il testo in una finestrella di solo
 * testo, senza pulsanti che scrivono: l'utente seleziona e copia a mano. */
function copiaTutto() {
  if (!ultimoTesto) return;
  const fatto = () => mostra("stato", "Testo copiato negli appunti.", "ok");
  const ripiego = () => {
    const area = document.createElement("textarea");
    area.value = ultimoTesto;
    area.rows = 18;
    area.style.width = "100%";
    el("corpo").appendChild(area);
    area.focus();
    area.select();
    mostra("stato", "Appunti non disponibili: il testo \u00e8 qui sotto, selezionalo e copialo.", "avviso");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ultimoTesto).then(fatto).catch(ripiego);
    return;
  }
  ripiego();
}

function accendi(utente) {
  el("chi").textContent = utente ? (utente.email || utente.uid) : "non collegato";
  el("uid").textContent = utente ? utente.uid : "\u2014";
  el("corpo").hidden = !utente;
  el("entra").hidden = Boolean(utente);
  el("esci").hidden = !utente;
  if (!utente) {
    el("testa").hidden = true;
    el("tabella").hidden = true;
    el("copia-tutto").disabled = true;
    el("righe").textContent = "";
    ultimoTesto = "";
    return;
  }
  diagnostica(utente.uid).catch((e) => {
    mostra("stato", "Diagnosi non riuscita: " + (e && e.message ? e.message : e), "errore");
  });
}

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
  el("leggi").addEventListener("click", () => {
    const uid = uidCorrente();
    if (!uid) return;
    diagnostica(uid).catch((e) => mostra("stato", "Diagnosi non riuscita: " + (e && e.message ? e.message : e), "errore"));
  });
  el("copia-tutto").addEventListener("click", copiaTutto);

  ascoltaStato(auth, (utente) => accendi(utente));
}

avvia().catch((e) => mostra("stato", "Avvio fallito: " + (e && e.message ? e.message : e), "errore"));
