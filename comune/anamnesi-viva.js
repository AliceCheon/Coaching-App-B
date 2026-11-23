/* Barbell Diva B — PASSO 14d: il ponte fra la pagina e il registro.
 *
 * Il registro e' la fonte unica della dichiarazione. Qui c'e' l'orchestrazione,
 * in un posto solo, cosi' la si puo' provare senza browser:
 *
 *   caricaDichiarazione -> legge il registro e ne ricava la dichiarazione;
 *                          se la lettura FALLISCE lo dice (`erroreLettura`),
 *                          non restituisce un elenco vuoto: nullo ≠ errore.
 *   creaPonteAnamnesi   -> salva (una voce), rilegge, confronta; annulla
 *                          (una voce che cita la sua). Ogni passo lascia uno
 *                          `esito` che la pagina stampa accanto al tasto.
 *
 * Nessun accesso diretto a Firestore: le letture e le scritture arrivano da
 * comune/scritture-b.js, come tutto il resto della zona B.
 */

import { leggiZonaB, scriviVoceRegistro } from "./scritture-b.js";
import {
  dichiarazioneDalRegistro,
  salvaAnamnesi,
  annullaAnamnesi,
  motivoLettura,
  oraBreve
} from "./anamnesi-b.js";

function testo(v) { return v == null ? "" : String(v).trim(); }

/* Legge il registro e ne fa la dichiarazione. Non lancia: l'errore torna
 * dentro il risultato, con il codice (permission-denied compreso). */
export async function caricaDichiarazione(db, uid, opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const leggi = typeof o.leggi === "function" ? o.leggi : () => leggiZonaB(db, uid, "registro");
  try {
    const elenco = await leggi();
    const dichiarazione = dichiarazioneDalRegistro(elenco);
    if (dichiarazione.errore) {
      return { ok: false, registro: elenco, dichiarazione: null, erroreLettura: dichiarazione.errore };
    }
    return { ok: true, registro: elenco, dichiarazione: dichiarazione, erroreLettura: null };
  } catch (e) {
    return { ok: false, registro: null, dichiarazione: null, erroreLettura: motivoLettura(e) };
  }
}

/* L'esito come va scritto accanto al tasto. Una funzione sola, cosi' la riga e
 * la riga di stato in cima non possono dire due cose diverse. */
export function testoEsito(stato) {
  const s = stato && typeof stato === "object" ? stato : {};
  if (s.erroreLettura) return "Non ho potuto leggere la dichiarazione: " + s.erroreLettura;
  if (s.scrivendo) return "Sto salvando\u2026";
  const e = s.esito;
  if (e && typeof e === "object") {
    if (e.tipo === "errore") return "Non ho salvato: " + testo(e.motivo || "motivo non riportato");
    if (e.tipo === "diverso") {
      return "Salvato, ma riletto diverso: il registro dice \u00ab" + (testo(e.testoRiletto) || "niente") + "\u00bb";
    }
    if (e.tipo === "salvato") return "Salvato alle " + (oraBreve(e.quando) || "ora non nota");
  }
  if (!s.dichiarazione || !s.dichiarazione.presente) return "non dichiarato";
  const quando = oraBreve(s.dichiarazione.aggiornato);
  return quando ? "Salvato alle " + quando : "Salvato (ora non nota)";
}

export function creaPonteAnamnesi(opzioni) {
  const o = opzioni && typeof opzioni === "object" ? opzioni : {};
  const leggi = typeof o.leggi === "function" ? o.leggi : () => leggiZonaB(o.db, o.uid, "registro");
  const scrivi = typeof o.scrivi === "function" ? o.scrivi : (voce) => scriviVoceRegistro(o.db, o.uid, voce.idVoce, voce);
  const orologio = typeof o.orologio === "function" ? o.orologio : () => new Date().toISOString();

  let stato = {
    dichiarazione: o.dichiarazione && typeof o.dichiarazione === "object"
      ? o.dichiarazione
      : dichiarazioneDalRegistro([]),
    erroreLettura: o.erroreLettura == null ? null : String(o.erroreLettura),
    esito: o.esito || null,
    token: o.token || 0,
    scrivendo: false
  };

  const avvisa = () => {
    if (typeof o.monta === "function") o.monta(stato);
    if (typeof o.suStato === "function") o.suStato(stato);
  };

  const chiudi = (esito) => {
    stato.scrivendo = false;
    stato.esito = esito;
    stato.token = (stato.token || 0) + 1;
    avvisa();
    if (typeof o.segnala === "function") o.segnala(testoEsito(stato), esito && esito.tipo === "errore" ? "errore" : "ok");
  };

  async function salva(testoScritto) {
    if (stato.scrivendo) return { ok: false, motivo: "scrittura gia' in corso" };
    if (stato.erroreLettura) {
      chiudi({ tipo: "errore", motivo: "non ho potuto leggere la dichiarazione: " + stato.erroreLettura });
      return { ok: false };
    }
    const esito = salvaAnamnesi(stato.dichiarazione, testoScritto, { quando: orologio(), versioneAttesa: stato.dichiarazione.versione || 0 });
    if (!esito.ok) {
      chiudi({ tipo: "errore", motivo: esito.motivo });
      return { ok: false, motivo: esito.motivo };
    }
    const scritto = testo(esito.voce.dopo);
    stato.scrivendo = true;
    avvisa();
    try {
      await scrivi(esito.voce);
    } catch (e) {
      chiudi({ tipo: "errore", motivo: motivoLettura(e) });
      return { ok: false, motivo: motivoLettura(e) };
    }
    /* PASSO 14d — si rilegge: il campo mostra quello che c'e' nel registro, e
     * se il testo letto non e' quello scritto lo si dice. */
    const letto = await caricaDichiarazione(o.db, o.uid, { leggi: leggi });
    stato.erroreLettura = letto.erroreLettura;
    if (letto.ok) stato.dichiarazione = letto.dichiarazione;
    const riletto = letto.ok && letto.dichiarazione ? testo(letto.dichiarazione.testo) : "";
    if (!letto.ok) {
      chiudi({ tipo: "errore", motivo: "scritto, ma non ho potuto rileggere: " + letto.erroreLettura });
      return { ok: false, riletto: null };
    }
    if (riletto !== scritto) {
      chiudi({ tipo: "diverso", testoRiletto: riletto, quando: esito.voce.quando });
      if (typeof o.ricarica === "function") await o.ricarica();
      return { ok: false, motivo: "riletto diverso", riletto: riletto };
    }
    chiudi({ tipo: "salvato", quando: esito.voce.quando });
    if (typeof o.ricarica === "function") await o.ricarica();
    return { ok: true, voce: esito.voce, riletto: riletto };
  }

  async function annulla() {
    if (stato.scrivendo) return { ok: false, motivo: "scrittura gia' in corso" };
    const esito = annullaAnamnesi(stato.dichiarazione, { quando: orologio(), versioneAttesa: stato.dichiarazione ? stato.dichiarazione.versione || 0 : 0 });
    if (!esito.ok) {
      chiudi({ tipo: "errore", motivo: esito.motivo });
      return { ok: false, motivo: esito.motivo };
    }
    const atteso = testo(esito.voce.dopo);
    stato.scrivendo = true;
    avvisa();
    try {
      await scrivi(esito.voce);
    } catch (e) {
      chiudi({ tipo: "errore", motivo: motivoLettura(e) });
      return { ok: false, motivo: motivoLettura(e) };
    }
    const letto = await caricaDichiarazione(o.db, o.uid, { leggi: leggi });
    stato.erroreLettura = letto.erroreLettura;
    if (letto.ok) stato.dichiarazione = letto.dichiarazione;
    const riletto = letto.ok && letto.dichiarazione ? testo(letto.dichiarazione.testo) : "";
    if (!letto.ok) {
      chiudi({ tipo: "errore", motivo: "annullato, ma non ho potuto rileggere: " + letto.erroreLettura });
      return { ok: false };
    }
    if (riletto !== atteso) {
      chiudi({ tipo: "diverso", testoRiletto: riletto });
      if (typeof o.ricarica === "function") await o.ricarica();
      return { ok: false, riletto: riletto };
    }
    chiudi({ tipo: "salvato", quando: esito.voce.quando });
    if (typeof o.ricarica === "function") await o.ricarica();
    return { ok: true, riletto: riletto };
  }

  async function carica() {
    const letto = await caricaDichiarazione(o.db, o.uid, { leggi: leggi });
    stato.erroreLettura = letto.erroreLettura;
    if (letto.ok) stato.dichiarazione = letto.dichiarazione;
    avvisa();
    return letto;
  }

  return {
    salva: salva,
    annulla: annulla,
    carica: carica,
    get quadro() { return stato; }
  };
}
