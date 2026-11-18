/* PASSO 4a — i campi vivi della testata: scarico, test, data di inizio, fase.
 *
 * La vista disegna i segnaposto `data-pr-c`; questo modulo li trasforma in
 * controlli veri. Sta fuori da desktop/app-v31.js per una ragione precisa:
 * qui non c'e' Firebase, quindi i test possono provarlo davvero con jsdom.
 *
 * Regole (difetto del 18/11/2026 — il valore spariva uscendo dal campo):
 *  - si scrive sul «cambio» (change/blur o Invio), mai a ogni tasto;
 *  - mentre il campo ha il fuoco la pagina NON si ridisegna: il ridisegno
 *    arriva quando il fuoco esce, cosi' quello che Alice ha scritto resta;
 *  - un rifiuto non e' mai un silenzio: la riga di stato dice «Scarico non
 *    salvato: <motivo>» e il campo tiene quello che Alice ha scritto finche'
 *    non lo corregge;
 *  - dopo un ridisegno e dopo un Annulla il campo mostra il valore SALVATO.
 */

export const MESSAGGIO_SCARICO = "Scarico non salvato: scegli la settimana e scrivi la percentuale (un numero da 0 a 100)";
export const MESSAGGIO_TEST = "Test non salvato: scegli la settimana del test";
export const MESSAGGIO_DATA = "Data di inizio non salvata: scrivila come gg/mm/aaaa, per esempio 05/10/2026";

/* "S4" / "s 4" / "4" -> 4. Vuoto o storto -> null. */
function numeroSettimana(valore) {
  const t = String(valore == null ? "" : valore).trim().replace(/^[Ss]\s*/, "");
  if (!t) return null;
  return /^\d+$/.test(t) ? Number(t) : null;
}

function numeroPuro(valore) {
  const t = String(valore == null ? "" : valore).trim().replace(/[\u2212-]/g, "").replace(/%/g, "");
  if (!t) return null;
  return /^\d+$/.test(t) ? Number(t) : null;
}

/* "05/10/2026" → "2026-10-05". Vuoto → "". Non riconosciuta → null. */
export function inIso(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (!t) return "";
  let m = /^(\d{1,2})[/\-.]+(\d{1,2})[/\-.]+(\d{4})$/.exec(t);
  if (m) return m[3] + "-" + ("0" + m[2]).slice(-2) + "-" + ("0" + m[1]).slice(-2);
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  return m ? t : null;
}

/* "2026-10-05" → "05/10/2026". Vuoto resta vuoto. */
export function inItaliano(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso == null ? "" : iso).trim());
  return m ? m[3] + "/" + m[2] + "/" + m[1] : "";
}

export function collegaPiano(doc, opzioni) {
  const o = opzioni || {};
  const editor = o.editor || null;
  if (!doc || !editor || typeof editor.modifica !== "function") return 0;
  const piani = o.piani || Object.create(null);
  const programma = o.programma || { id: "", inizio: "", fase: "" };
  const segnala = typeof o.segnala === "function" ? o.segnala : () => {};
  const sincronizza = typeof o.sincronizza === "function" ? o.sincronizza : () => Promise.resolve();
  const FASI = ["Bulk", "Cut", "Recomp", "Mantenimento"];
  let legati = 0;

  const rimetti = (elemento, valore) => {
    if (!elemento) return;
    elemento.value = valore == null ? "" : String(valore);
  };

  /* Il ridisegno aspetta che il fuoco esca dal campo: sostituire l'elemento
   * sotto le dita e' il modo migliore per far sparire quello che si e' appena
   * scritto. */
  const dopoIlFuoco = (elemento, azione) => {
    if (elemento && doc.activeElement === elemento) {
      const via = () => {
        elemento.removeEventListener("blur", via);
        azione();
      };
      elemento.addEventListener("blur", via);
      return;
    }
    azione();
  };

  /* ---------- le schede ------------------------------------------------ */
  const riquadri = Array.from(doc.querySelectorAll("[data-pr-scheda]"));
  riquadri.forEach((riquadro) => {
    const idScheda = String(riquadro.getAttribute("data-pr-scheda") || "");
    if (!idScheda) return;
    const piano = piani[idScheda] || null;
    const scarico = piano && piano.scarico ? piano.scarico : null;
    const test = piano && piano.test ? piano.test : null;
    const sett = riquadro.querySelector('[data-pr-c="scarico-settimana"]');
    const vol = riquadro.querySelector('[data-pr-c="scarico-volume"]');
    const tst = riquadro.querySelector('[data-pr-c="test-settimana"]');
    const chip = riquadro.querySelector('[data-pr-c="scarico-chip"]');

    const settScritta = () => (scarico ? "S" + scarico.settimana : "");
    const volScritto = () => (scarico ? String(scarico.volume) : "");
    const testScritto = () => (test ? "S" + test.settimana : "");
    rimetti(sett, settScritta());
    rimetti(vol, volScritto());
    rimetti(tst, testScritto());
    if (chip) {
      chip.textContent = scarico
        ? "S" + scarico.settimana + " vol \u2212" + scarico.volume + "%"
        : "S\u2014 vol non registrato";
    }

    /* Legge i due campi insieme: la percentuale non vive da sola. */
    const leggiScarico = () => {
      const s = numeroSettimana(sett ? sett.value : "");
      const v = numeroPuro(vol ? vol.value : "");
      const vuoto = String(sett ? sett.value : "").trim() === ""
        && String(vol ? vol.value : "").trim() === "";
      return { s: s, v: v, vuoto: vuoto };
    };

    const scriviScarico = (elemento) => {
      const q = leggiScarico();
      if (!q.vuoto && (q.s == null || q.v == null)) {
        segnala(MESSAGGIO_SCARICO, "errore");
        return Promise.resolve();
      }
      return editor.modifica({
        campo: "scarico",
        idScheda: idScheda,
        settimana: q.vuoto ? "" : q.s,
        volume: q.vuoto ? "" : q.v
      }).then((esito) => {
        if (!esito || !esito.ok) {
          /* Il valore scritto RESTA: si corregge da li'. */
          segnala("Scarico non salvato: " + ((esito && esito.motivo) || "non ho scritto niente"), "errore");
          return null;
        }
        segnala(q.vuoto
          ? "scarico tolto dalla scheda"
          : "scarico salvato: S" + q.s + " \u00b7 volume \u2212" + q.v + "%" + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
        return dopoIlFuoco(elemento, () => sincronizza());
      }, (e) => {
        segnala("Scarico non salvato: " + (e && e.message ? e.message : "scrittura non riuscita"), "errore");
        return null;
      });
    };

    if (sett) {
      legati += 1;
      sett.addEventListener("change", () => { scriviScarico(sett); });
    }

    if (vol) {
      legati += 1;
      vol.addEventListener("change", () => { scriviScarico(vol); });
    }

    if (tst) {
      legati += 1;
      tst.addEventListener("change", () => {
        const s = numeroSettimana(tst.value);
        const vuoto = String(tst.value == null ? "" : tst.value).trim() === "";
        if (!vuoto && s == null) {
          segnala(MESSAGGIO_TEST, "errore");
          return;
        }
        editor.modifica({ campo: "test", idScheda: idScheda, settimana: vuoto ? "" : s }).then((esito) => {
          if (!esito || !esito.ok) {
            segnala("Test non salvato: " + ((esito && esito.motivo) || "non ho scritto niente"), "errore");
            return null;
          }
          segnala(vuoto ? "test tolto dalla scheda"
            : "test salvato: S" + s + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
          return dopoIlFuoco(tst, () => sincronizza());
        }, (e) => {
          segnala("Test non salvato: " + (e && e.message ? e.message : "scrittura non riuscita"), "errore");
          return null;
        });
      });
    }
  });

  /* ---------- la testata del programma --------------------------------- */
  if (typeof editor.testataProgramma === "function" && programma.id) {
    const inizio = doc.querySelector('[data-pr-c="programma-inizio"]');
    const fase = doc.querySelector('[data-pr-c="programma-fase"]');
    const inizioSalvato = inItaliano(programma.inizio);
    const faseSalvata = String(programma.fase || "");
    rimetti(inizio, inizioSalvato);
    if (fase) {
      fase.value = FASI.indexOf(faseSalvata) === -1 ? "" : faseSalvata;
    }

    const scrivi = (elemento, campo, valore, messaggio, cosa) => {
      editor.testataProgramma({ idProgramma: programma.id, campo: campo, valore: valore }).then((esito) => {
        if (!esito || !esito.ok) {
          segnala(cosa + " non salvata: " + ((esito && esito.motivo) || "non ho scritto niente"), "errore");
          return null;
        }
        segnala(messaggio + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
        return dopoIlFuoco(elemento, () => sincronizza());
      }, (e) => {
        segnala(cosa + " non salvata: " + (e && e.message ? e.message : "scrittura non riuscita"), "errore");
        return null;
      });
    };

    if (inizio) {
      legati += 1;
      inizio.addEventListener("change", () => {
        const iso = inIso(inizio.value);
        if (iso === null) {
          segnala(MESSAGGIO_DATA, "errore");
          return;
        }
        scrivi(inizio, "inizio", iso, iso ? "data di inizio: " + inItaliano(iso) : "data di inizio tolta dal programma", "Data di inizio");
      });
    }

    if (fase) {
      legati += 1;
      fase.addEventListener("change", () => {
        const valore = String(fase.value || "");
        scrivi(fase, "fase", valore, valore ? "fase: " + valore : "fase tolta dal programma", "Fase");
      });
    }
  }

  return legati;
}
