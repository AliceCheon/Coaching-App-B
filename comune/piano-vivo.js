/* PASSO 4a — i campi vivi della testata: scarico, test, data di inizio, fase.
 *
 * La vista disegna i segnaposto `data-pr-c`; questo modulo li trasforma in
 * controlli veri. Sta fuori da desktop/app-v31.js per una ragione precisa:
 * qui non c'e' Firebase, quindi i test possono provarlo davvero con jsdom.
 *
 * Regole:
 *  - niente finestrelle del browser: un errore va nella riga di stato;
 *  - dopo ogni scrittura la pagina rilegge e ridisegna: il valore che si vede
 *    e' quello salvato, anche dopo un Annulla;
 *  - la percentuale di scarico e' un'annotazione: si scrive con la settimana,
 *    mai da sola, e non tocca serie e ripetizioni.
 */

export const MESSAGGIO_SCARICO = "lo scarico si scrive con la settimana e la percentuale: per esempio S4 e 20";
export const MESSAGGIO_TEST = "il test si scrive con la settimana: per esempio S8";
export const MESSAGGIO_DATA = "la data si scrive come gg/mm/aaaa: per esempio 05/10/2026";

function numeroSettimana(valore) {
  const t = String(valore == null ? "" : valore).trim().replace(/^[Ss]\s*/, "");
  if (!t) return null;
  return /^\d+$/.test(t) ? Number(t) : null;
}

function numeroPuro(valore) {
  const t = String(valore == null ? "" : valore).trim().replace(/[−-]/g, "").replace(/%/g, "");
  if (!t) return null;
  return /^\d+$/.test(t) ? Number(t) : null;
}

/* "05/10/2026" → "2026-10-05". Vuoto → "". Non riconosciuta → null. */
export function inIso(valore) {
  const t = String(valore == null ? "" : valore).trim();
  if (!t) return "";
  let m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(t);
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
    rimetti(sett, settScritta());
    rimetti(vol, volScritto());
    rimetti(tst, test ? "S" + test.settimana : "");
    if (chip) {
      chip.textContent = scarico
        ? "S" + scarico.settimana + " vol \u2212" + scarico.volume + "%"
        : "S\u2014 vol non registrato";
    }

    if (sett) {
      legati += 1;
      sett.addEventListener("change", () => {
        const s = numeroSettimana(sett.value);
        const v = numeroPuro(vol ? vol.value : "");
        const vuoto = String(sett.value == null ? "" : sett.value).trim() === ""
          && String(vol ? vol.value : "").trim() === "";
        if (!vuoto && (s == null || v == null)) {
          rimetti(sett, settScritta());
          rimetti(vol, volScritto());
          segnala(MESSAGGIO_SCARICO, "errore");
          return;
        }
        editor.modifica({
          campo: "scarico",
          idScheda: idScheda,
          settimana: vuoto ? "" : s,
          volume: vuoto ? "" : v
        }).then((esito) => {
          if (!esito || !esito.ok) {
            rimetti(sett, settScritta());
            rimetti(vol, volScritto());
            segnala((esito && esito.motivo) || "non ho scritto niente", "errore");
            return;
          }
          segnala(vuoto
            ? "scarico tolto dalla scheda"
            : "scarico: S" + s + " \u00b7 volume \u2212" + v + "%" + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
          return sincronizza();
        }, (e) => {
          rimetti(sett, settScritta());
          rimetti(vol, volScritto());
          segnala("scrittura non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
        });
      });
    }

    if (vol) {
      legati += 1;
      vol.addEventListener("change", () => {
        /* La percentuale da sola non vale: si scrive insieme alla settimana,
         * che e' quella che segna la settimana di scarico nella scheda. */
        const s = numeroSettimana(sett ? sett.value : "");
        const v = numeroPuro(vol.value);
        const vuoto = String(sett ? sett.value : "").trim() === "" && String(vol.value == null ? "" : vol.value).trim() === "";
        if (!vuoto && (s == null || v == null)) {
          rimetti(sett, settScritta());
          rimetti(vol, volScritto());
          segnala(MESSAGGIO_SCARICO, "errore");
          return;
        }
        editor.modifica({
          campo: "scarico",
          idScheda: idScheda,
          settimana: vuoto ? "" : s,
          volume: vuoto ? "" : v
        }).then((esito) => {
          if (!esito || !esito.ok) {
            rimetti(sett, settScritta());
            rimetti(vol, volScritto());
            segnala((esito && esito.motivo) || "non ho scritto niente", "errore");
            return;
          }
          segnala(vuoto ? "scarico tolto dalla scheda"
            : "scarico: S" + s + " \u00b7 volume \u2212" + v + "%" + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
          return sincronizza();
        }, (e) => {
          rimetti(sett, settScritta());
          rimetti(vol, volScritto());
          segnala("scrittura non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
        });
      });
    }

    if (tst) {
      legati += 1;
      tst.addEventListener("change", () => {
        const s = numeroSettimana(tst.value);
        const vuoto = String(tst.value == null ? "" : tst.value).trim() === "";
        if (!vuoto && s == null) {
          rimetti(tst, test ? "S" + test.settimana : "");
          segnala(MESSAGGIO_TEST, "errore");
          return;
        }
        editor.modifica({ campo: "test", idScheda: idScheda, settimana: vuoto ? "" : s }).then((esito) => {
          if (!esito || !esito.ok) {
            rimetti(tst, test ? "S" + test.settimana : "");
            segnala((esito && esito.motivo) || "non ho scritto niente", "errore");
            return;
          }
          segnala(vuoto ? "test tolto dalla scheda"
            : "test: S" + s + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
          return sincronizza();
        }, (e) => {
          rimetti(tst, test ? "S" + test.settimana : "");
          segnala("scrittura non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
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

    const scrivi = (campo, valore, messaggio) => {
      editor.testataProgramma({ idProgramma: programma.id, campo: campo, valore: valore }).then((esito) => {
        if (!esito || !esito.ok) {
          rimetti(inizio, inizioSalvato);
          if (fase) fase.value = FASI.indexOf(faseSalvata) === -1 ? "" : faseSalvata;
          segnala((esito && esito.motivo) || "non ho scritto niente", "errore");
          return;
        }
        segnala(messaggio + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
        return sincronizza();
      }, (e) => {
        rimetti(inizio, inizioSalvato);
        if (fase) fase.value = FASI.indexOf(faseSalvata) === -1 ? "" : faseSalvata;
        segnala("scrittura non riuscita: " + (e && e.message ? e.message : "errore"), "errore");
      });
    };

    if (inizio) {
      legati += 1;
      inizio.addEventListener("change", () => {
        const iso = inIso(inizio.value);
        if (iso === null) {
          rimetti(inizio, inizioSalvato);
          segnala(MESSAGGIO_DATA, "errore");
          return;
        }
        scrivi("inizio", iso, iso ? "data di inizio: " + inItaliano(iso) : "data di inizio tolta dal programma");
      });
    }

    if (fase) {
      legati += 1;
      fase.addEventListener("change", () => {
        const valore = String(fase.value || "");
        scrivi("fase", valore, valore ? "fase: " + valore : "fase tolta dal programma");
      });
    }
  }

  return legati;
}
