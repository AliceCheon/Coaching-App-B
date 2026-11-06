/* Barbell Diva B — passo 3a: Programma attivo con i dati veri, in sola lettura.
 * Passo 3b: striscia in alto per pagina, ripulita dal markup, e guardia sulla Fase.
 *
 * Il file index.html è il v31: qui si collegano solo queste cose, nient'altro.
 *  1. il login Google, con la card di accesso (solo quando non c'è sessione);
 *  2. la lettura una tantum di documento radice, sedute, programmi e schede,
 *     con i moduli che già esistono in comune/ (niente riscritture);
 *  3. il render del Programma attivo dentro #programma-attivo, con i
 *     controlli che scrivono spenti (la vista li mostra ma non li attiva);
 *  4. il nastro in alto aggiornato al cambio pagina (nel file è scritto fisso
 *     per la Dashboard) e ripulito dal markup che il v31 stampa come testo;
 *  5. la Fase: se il campo del documento ripete il nome del programma, non è
 *     una fase — resta a «non registrato» invece di mostrare un valore sbagliato.
 *
 * Dove un dato non c'è: "non registrato". Mai inventato.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { nomePulito } from "../comune/nome-pulito.js";
import { entraConGoogle, ascoltaStato } from "../comune/accesso.js";
import { leggiDocumentoAtleta, leggiSedute, leggiProgrammi, programmaAttivo } from "../comune/lettura-dati.js";
import { leggiSchedeProgrammi } from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";
import { elencoArchivio, renderArchivio } from "../comune/vista-archivio.js";

/* La card di accesso: nasce solo quando manca la sessione, scompare quando c'è.
 * L'aspetto usa i gettoni del v31 (le stesse variabili CSS). */
function montaCartaAccesso(doc) {
  const velo = doc.createElement("div");
  velo.id = "veloAccesso31";
  velo.setAttribute("style", "position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;background:var(--bg,#101018)");
  const carta = doc.createElement("div");
  carta.setAttribute("style", "background:var(--card,#181822);border:1px solid var(--line,#2a2a38);border-radius:22px;padding:30px 32px;max-width:340px;text-align:center;color:var(--text,#eee);box-shadow:0 18px 50px rgba(0,0,0,.45)");
  const titolo = doc.createElement("div");
  titolo.setAttribute("style", "font-size:19px;font-weight:800;letter-spacing:.02em;margin-bottom:6px");
  titolo.textContent = "Barbell Diva B";
  const sottotitolo = doc.createElement("div");
  sottotitolo.setAttribute("style", "font-size:12px;opacity:.7;margin-bottom:22px");
  sottotitolo.textContent = "il quadro della coach, in sola lettura";
  const bottone = doc.createElement("button");
  bottone.type = "button";
  bottone.textContent = "Entra con Google";
  bottone.setAttribute("style", "font:700 14px/1 inherit;font-family:inherit;color:var(--text,#eee);background:var(--card-2,#20202c);border:1px solid var(--lav,#8b8bf5);border-radius:12px;padding:12px 22px;cursor:pointer");
  const nota = doc.createElement("div");
  nota.setAttribute("style", "font-size:11px;opacity:.6;margin-top:14px");
  nota.textContent = "sola lettura · niente viene salvato";
  const errore = doc.createElement("div");
  errore.setAttribute("style", "font-size:12px;color:var(--pink,#f06292);margin-top:12px;display:none");
  carta.appendChild(titolo);
  carta.appendChild(sottotitolo);
  carta.appendChild(bottone);
  carta.appendChild(nota);
  carta.appendChild(errore);
  velo.appendChild(carta);
  doc.body.appendChild(velo);
  return {
    velo,
    segnala(messaggio) {
      errore.textContent = messaggio;
      errore.style.display = "block";
    }
  };
}

/* ---------- il nastro in alto (la striscia) ----------
 * Nel file il nastro è scritto fisso per la Dashboard («Dashboard /
 * readiness, carico, questionari…») e nessun codice del v31 lo aggiorna al
 * cambio pagina; il pezzo destro (#fr-nastro) viene scritto con textContent
 * su una stringa che contiene un tag, e il browser lo stampa come testo.
 * Il vecchio B teneva il nastro con il suo app.js, per pagina: qui si rifà
 * quello. Il titolo è il testo della voce di menu del v31 (quella stessa che
 * la voce di menu mostra); il sottotitolo per le pagine previste è il testo
 * che usava il vecchio B; per le altre pagine il sottotitolo della Dashboard
 * sparisce invece di restare appiccicato. Nessun testo inventato. */
const SOTTOTITOLI_NASTRO = {
  "overview-atleta": "overview atleta · conti sulle sedute lette",
  "pianificazione": "pianificazione · il calendario che i logbook dimostrano",
  "programma-1": "programma attivo · il documento del programma e i logbook",
  "archivio": "archivio programmi · la stessa scheda, aperta per scelta"
};

function aggiornaStriscia(doc, id) {
  const nastro = doc.querySelector(".nastro");
  if (!nastro) return;
  const titolo = nastro.querySelector("b");
  const sotto = nastro.querySelector("span:not([class])");
  if (id === "dashboard") {
    if (titolo) titolo.textContent = "Dashboard";
    if (sotto) { sotto.textContent = "readiness, carico, questionari, quadro atleta"; sotto.style.display = ""; }
    return;
  }
  const voce = doc.querySelector('.voce[data-vista="' + id + '"] .tx');
  if (titolo && voce) {
    const prima = voce.childNodes[0] && voce.childNodes[0].textContent ? voce.childNodes[0].textContent : voce.textContent;
    titolo.textContent = String(prima).trim();
  }
  if (sotto) {
    const s = SOTTOTITOLI_NASTRO[id];
    if (s) { sotto.textContent = s; sotto.style.display = ""; }
    else { sotto.textContent = ""; sotto.style.display = "none"; }
  }
}

/* Il pezzo destro del nastro: il v31 lo scrive con textContent su una stringa
 * che contiene un tag <span>; qui si toglie solo il markup, il contenuto
 * (conteggio esercizi e ultima seduta, o il puntino) resta quello calcolato
 * dal v31. */
function ripulisciNastroDestro(doc) {
  const fr = doc.getElementById("fr-nastro");
  if (!fr) return;
  const t = fr.textContent;
  if (t.indexOf('<span data-lb-kpi="ultima">') === -1) return;
  fr.textContent = t.replace('<span data-lb-kpi="ultima">', "").replace("</span>", "");
}

export async function avvia(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  const carta = montaCartaAccesso(doc);
  ripulisciNastroDestro(doc);
  doc.addEventListener("click", (e) => {
    const v = e.target && e.target.closest ? e.target.closest(".voce[data-vista]") : null;
    if (v) aggiornaStriscia(doc, v.getAttribute("data-vista"));
  }, true);
  if (!config || !sdk) {
    carta.segnala("configurazione o SDK mancanti: ricarica la pagina");
    return;
  }
  const app = inizializzaAppB(sdk, config);
  const auth = authDi(app);
  persistenzaLocale(auth, sdk).catch(() => {});
  const db = firestoreDi(app);

  carta.velo.querySelector("button").addEventListener("click", async () => {
    try {
      await entraConGoogle(sdk, auth, { mobile: false });
    } catch (e) {
      carta.segnala("accesso non riuscito: " + (e && e.code ? e.code : "errore sconosciuto"));
    }
  });

  const leggi = async (utente) => {
    const radice = await leggiDocumentoAtleta(db, utente.uid);
    const sedute = await leggiSedute(db, utente.uid);
    const programmi = await leggiProgrammi(db, utente.uid, radice);
    const schedeV2 = await leggiSchedeProgrammi(db, utente.uid);
    const attivo = programmaAttivo(programmi.programmi || []);
    const contenitore = doc.querySelector("#programma-attivo");
    const strumenti = doc.querySelector("#programma-strumenti");
    const nomeVoce = doc.querySelector("#nomeProgrammaAttivo");
    const rp = riepilogoProgramma(attivo ? attivo.programma : null, sedute.sedute, {
      indice: 0,
      totaleProgrammi: (programmi.programmi || []).length,
      schedeV2,
      oggi: new Date(),
      quante: 8
    });
    /* La Fase: se il campo del documento ripete il nome del programma, non è
     * una fase. Non lo mostro: il campo resta a «non registrato». La pagina
     * desktop/diagnosi.html (temporanea) dice quali nomi usa davvero il
     * documento; quando li sapremo si collega il campo giusto. */
    if (rp.profilo && rp.profilo.presente && rp.profilo.fase && rp.profilo.fase === rp.profilo.nome) rp.profilo.fase = "";
    if (contenitore) renderProgramma(doc, contenitore, { presente: Boolean(attivo) }, rp);
    if (nomeVoce) nomeVoce.textContent = attivo ? nomePulito(rp.profilo.nome) : "nessun programma letto";
    if (strumenti) strumenti.hidden = true;
    /* L'Archivio (passo 3b): la tabella del v31 con i programmi veri. */
    const corpoArchivio = doc.getElementById("archivio-corpo");
    if (corpoArchivio) renderArchivio(doc, corpoArchivio, { righe: elencoArchivio(programmi.programmi || [], { attivoId: attivo ? String(attivo.programma.id || "") : "", schedeV2 }) });
  };

  ascoltaStato(auth, (utente) => {
    if (!utente) {
      carta.velo.style.display = "flex";
      return;
    }
    carta.velo.style.display = "none";
    leggi(utente).catch((e) => {
      carta.velo.style.display = "flex";
      carta.segnala("lettura non riuscita: " + (e && e.code ? e.code : (e && e.message ? e.message : "errore sconosciuto")));
    });
  });
}

avvia(document, window).catch((e) => { if (typeof console !== "undefined") console.warn("avvio: ", e); });
