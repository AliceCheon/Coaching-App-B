/* Barbell Diva B — passo 3a: Programma attivo con i dati veri, in sola lettura.
 *
 * Il file è il v31: qui si collegano solo tre cose, nient'altro.
 *  1. il login Google, con la card di accesso (sola quando non c'è sessione);
 *  2. la lettura una tantum di documento radice, sedute, programmi e schede,
 *     con i moduli che già esistono in comune/ (niente riscritture);
 *  3. il render del Programma attivo dentro #programma-attivo, con i
 *     controlli che scrivono spenti (la vista li mostra ma non li attiva).
 *
 * Dove un dato non c'è: "non registrato". Mai inventato.
 */

import { inizializzaAppB, authDi, firestoreDi, persistenzaLocale } from "../comune/firebase-client.js";
import { entraConGoogle, ascoltaStato } from "../comune/accesso.js";
import { leggiDocumentoAtleta, leggiSedute, leggiProgrammi, programmaAttivo } from "../comune/lettura-dati.js";
import { leggiSchedeProgrammi } from "../comune/schede-v2.js";
import { riepilogoProgramma } from "../comune/programma.js";
import { renderProgramma } from "../comune/vista-programma.js";

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

export async function avvia(doc, win) {
  const config = win.BD_B;
  const sdk = win.firebase;
  const carta = montaCartaAccesso(doc);
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
    if (contenitore) renderProgramma(doc, contenitore, { presente: Boolean(attivo) }, rp);
    if (nomeVoce) nomeVoce.textContent = attivo ? rp.profilo.nome : "nessun programma letto";
    if (strumenti) strumenti.hidden = true;
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
