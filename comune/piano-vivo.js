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

import { lettereRotazione } from "./modifiche-b.js";

export const MESSAGGIO_SCARICO = "Scarico non salvato: scegli la settimana e scrivi la percentuale (un numero da 0 a 100)";
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

    const settScritta = () => (scarico ? "S" + scarico.settimana : "");
    const volScritto = () => (scarico ? String(scarico.volume) : "");
    /* Il volume non vive da solo: si accende quando c'è la settimana di
     * scarico; finché non c'è resta spento, con il perché nel tooltip. */
    const aggiornaVolume = () => {
      if (!vol) return;
      const acceso = String(sett ? sett.value : "").trim() !== "";
      vol.disabled = !acceso;
      if (acceso) { vol.removeAttribute("disabled"); vol.title = "di quanto togli il volume in quella settimana, es. 40"; }
      else { vol.setAttribute("disabled", ""); vol.title = "scegli prima la settimana dello scarico"; }
    };
    rimetti(sett, settScritta());
    rimetti(vol, volScritto());
    aggiornaVolume();

    /* Legge i due campi insieme: la percentuale non vive da sola. */
    const leggiScarico = () => {
      const s = numeroSettimana(sett ? sett.value : "");
      const v = numeroPuro(vol ? vol.value : "");
      const vuoto = String(sett ? sett.value : "").trim() === ""
        && String(vol ? vol.value : "").trim() === "";
      return { s: s, v: v, vuoto: vuoto };
    };

    const scriviScarico = (elemento, daSettimana) => {
      const q = leggiScarico();
      /* La settimana scelta e la percentuale non ancora scritta: non è un
       * errore, è un passo intermedio. Si accende il volume e lo si dice. */
      if (daSettimana && q.s != null && q.v == null) {
        aggiornaVolume();
        segnala("S" + q.s + " scelta: scrivi la percentuale di volume", "ok");
        return Promise.resolve();
      }
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
        aggiornaVolume();
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
      sett.addEventListener("change", () => { scriviScarico(sett, true); });
    }

    if (vol) {
      legati += 1;
      vol.addEventListener("change", () => { scriviScarico(vol); });
    }

    /* PASSO 20 — la nota della scheda si scrive. Si salva al cambio (uscendo
     * dal campo, o con Ctrl+Invio), mai a ogni tasto; mentre il fuoco e'
     * dentro la pagina non si ridisegna (cellaInModifica in app-v31), cosi'
     * il testo non si perde a metà. Un rifiuto si dice, e il testo scritto
     * resta nel campo per correggerlo. */
    const nota = riquadro.querySelector('[data-pr-c="scheda-nota"]');
    if (nota && typeof editor.notaScheda === "function") {
      legati += 1;
      let salvata = String(nota.value || "");
      const salvaNota = () => {
        const valore = String(nota.value || "");
        if (valore === salvata) return Promise.resolve();
        return Promise.resolve(editor.notaScheda({ idScheda: idScheda, valore: valore })).then((esito) => {
          if (!esito || !esito.ok) {
            segnala("Nota non salvata: " + ((esito && esito.motivo) || "non ho scritto niente"), "errore");
            return null;
          }
          salvata = valore;
          segnala((valore.trim() ? "nota della scheda salvata" : "nota tolta dalla scheda")
            + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
          return dopoIlFuoco(nota, () => sincronizza());
        }, (e) => {
          segnala("Nota non salvata: " + (e && e.message ? e.message : "scrittura non riuscita"), "errore");
          return null;
        });
      };
      nota.addEventListener("change", salvaNota);
      nota.addEventListener("keydown", (ev) => {
        if (ev && (ev.key === "Enter" || ev.key === "Invio") && (ev.ctrlKey || ev.metaKey)) {
          if (ev.preventDefault) ev.preventDefault();
          if (typeof nota.blur === "function") nota.blur();
        }
      });
    }

  });

  /* ---------- la testata del programma --------------------------------- */
  if (typeof editor.testataProgramma === "function" && programma.id) {
    const inizio = doc.querySelector('[data-pr-c="programma-inizio"]');
    const fase = doc.querySelector('[data-pr-c="programma-fase"]');
    const giorni = doc.querySelector('[data-pr-c="programma-giorni"]');
    const settimane = doc.querySelector('[data-pr-c="programma-settimane"]');
    const rotazione = doc.querySelector('[data-pr-c="programma-rotazione"]');
    /* Passo 16 — i due testi liberi della carta Programma. */
    const descrizione = doc.querySelector('[data-pr-c="programma-descrizione"]');
    const messaggio = doc.querySelector('[data-pr-c="programma-messaggio"]');
    const inizioSalvato = inItaliano(programma.inizio);
    const faseSalvata = String(programma.fase || "");
    rimetti(inizio, inizioSalvato);
    if (fase) {
      fase.value = FASI.indexOf(faseSalvata) === -1 ? "" : faseSalvata;
    }
    rimetti(giorni, programma.giorni == null ? "" : String(programma.giorni));
    rimetti(settimane, programma.settimane == null ? "" : String(programma.settimane));
    rimetti(rotazione, programma.rotazione == null ? "" : String(programma.rotazione));
    rimetti(descrizione, programma.descrizione == null ? "" : String(programma.descrizione));
    rimetti(messaggio, programma.messaggio == null ? "" : String(programma.messaggio));

    /* Le pastiglie sono l'ANTEPRIMA del campo: quando si scrive, si
     * ridisegnano subito, senza aspettare la rilettura della pagina. */
    const chipsRotazione = doc.querySelector(".pr-chips");
    const mostraAnteprima = (valore) => {
      if (!chipsRotazione) return;
      Array.from(chipsRotazione.querySelectorAll("[data-pr-rotchip]")).forEach((c) => c.remove());
      const letto = lettereRotazione(valore);
      const lettere = letto.ok ? letto.lettere : [];
      const ancora = chipsRotazione.querySelector(".jolly, [data-pr-rot-piu]") || null;
      lettere.forEach((cod) => {
        const chip = doc.createElement("span");
        chip.className = "pr-rotchip";
        chip.setAttribute("data-pr-rotchip", cod);
        chip.textContent = cod;
        chip.title = "anteprima di quello che \u00e8 scritto nel campo";
        chipsRotazione.insertBefore(chip, ancora);
      });
    };

    const scrivi = (elemento, campo, valore, messaggio, cosa, rifiuto) => {
      editor.testataProgramma({ idProgramma: programma.id, campo: campo, valore: valore }).then((esito) => {
        if (!esito || !esito.ok) {
          /* Il valore scritto RESTA nel campo: si corregge da l\u00ec. */
          segnala((rifiuto || (cosa + " non salvata")) + ": " + ((esito && esito.motivo) || "non ho scritto niente"), "errore");
          return null;
        }
        segnala(messaggio + (esito.avvisoRegistro ? " \u00b7 MA: " + esito.avvisoRegistro : ""), "ok");
        return dopoIlFuoco(elemento, () => sincronizza());
      }, (e) => {
        segnala((rifiuto || (cosa + " non salvata")) + ": " + (e && e.message ? e.message : "scrittura non riuscita"), "errore");
        return null;
      });
    };

    const messaggioRotazione = (valore) => {
      if (!String(valore).trim()) return "rotazione tolta dal programma";
      const letto = lettereRotazione(valore);
      return "rotazione: " + (letto.ok ? letto.lettere.join(" \u00b7 ") : String(valore).trim());
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

    if (giorni) {
      legati += 1;
      giorni.addEventListener("change", () => {
        const valore = String(giorni.value || "").trim();
        scrivi(giorni, "giorni", valore, valore ? "giorni a settimana: " + valore : "giorni a settimana tolti dal programma", "Gg/sett", "Giorni a settimana non salvati");
      });
    }

    if (settimane) {
      legati += 1;
      settimane.addEventListener("change", () => {
        const valore = String(settimane.value || "").trim();
        scrivi(settimane, "settimane", valore, valore ? "settimane: " + valore : "settimane tolte dal programma", "Settimane", "Settimane non salvate");
      });
    }

    if (rotazione) {
      legati += 1;
      rotazione.addEventListener("input", () => mostraAnteprima(rotazione.value));
      rotazione.addEventListener("change", () => {
        const valore = String(rotazione.value || "").trim();
        mostraAnteprima(valore);
        scrivi(rotazione, "rotazione", valore, messaggioRotazione(valore), "Rotazione", "Rotazione non salvata");
      });
    }

    if (descrizione) {
      legati += 1;
      descrizione.addEventListener("change", () => {
        const valore = String(descrizione.value || "");
        scrivi(descrizione, "descrizione", valore,
          valore.trim() ? "descrizione salvata" : "descrizione tolta dal programma",
          "Descrizione", "Descrizione non salvata");
      });
    }

    if (messaggio) {
      legati += 1;
      messaggio.addEventListener("change", () => {
        const valore = String(messaggio.value || "");
        scrivi(messaggio, "messaggio", valore,
          valore.trim() ? "messaggio per l'atleta salvato" : "messaggio per l'atleta tolto dal programma",
          "Messaggio per l'atleta", "Messaggio non salvato");
      });
    }

    /* Passo 16 — l'interruttore della rotazione si preme: ON -> OFF toglie la
     * rotazione dal documento (le schede restano), OFF -> ON la rimette se nel
     * campo ci sono le lettere, altrimenti manda al campo. */
    const interruttore = doc.querySelector("[data-pr-interruttore]");
    if (interruttore && rotazione) {
      legati += 1;
      const disegnaInterruttore = (acceso) => {
        interruttore.setAttribute("aria-checked", acceso ? "true" : "false");
        interruttore.setAttribute("data-acceso", acceso ? "1" : "0");
        const etichetta = interruttore.querySelector("b");
        if (etichetta) etichetta.textContent = acceso ? "ON" : "OFF";
        interruttore.title = acceso
          ? "la rotazione è accesa: premi per spegnerla"
          : "la rotazione è spenta: premi per riaccenderla";
      };
      const accesoOra = () => interruttore.getAttribute("aria-checked") === "true";
      disegnaInterruttore(accesoOra());
      interruttore.addEventListener("click", () => {
        const acceso = accesoOra();
        const scritto = String(rotazione.value || "").trim();
        if (acceso) {
          disegnaInterruttore(false);
          mostraAnteprima("");
          scrivi(rotazione, "rotazione", "", "rotazione spenta: le schede restano, si smette solo di ruotarle",
            "Rotazione", "Rotazione non spenta");
          return;
        }
        /* Se il campo è vuoto, le lettere si prendono dall'anteprima delle
         * schede lette: accendere la rotazione le scrive nel programma. */
        const dallAnteprima = Array.from(doc.querySelectorAll("[data-pr-rotchip]"))
          .map((chip) => String(chip.getAttribute("data-pr-rotchip") || "").toUpperCase())
          .filter(Boolean).join(" ");
        const letto = lettereRotazione(scritto || dallAnteprima);
        if (!letto.ok || !letto.lettere.length) {
          disegnaInterruttore(false);
          segnala("per accendere la rotazione scrivi le lettere delle schede nel campo (per esempio A B C D)", "errore");
          rotazione.focus();
          return;
        }
        const nuovo = letto.lettere.join(" ");
        disegnaInterruttore(true);
        rimetti(rotazione, nuovo);
        mostraAnteprima(nuovo);
        scrivi(rotazione, "rotazione", nuovo, messaggioRotazione(nuovo), "Rotazione", "Rotazione non accesa");
      });
    }

    const piuRotazione = doc.querySelector("[data-pr-rot-piu]");
    if (piuRotazione) {
      legati += 1;
      piuRotazione.addEventListener("click", () => {
        const valore = String(rotazione ? rotazione.value : "").trim();
        const letto = lettereRotazione(valore);
        if (!letto.ok) {
          segnala("Rotazione non salvata: " + letto.motivo, "errore");
          return;
        }
        if (letto.lettere.length >= 7) {
          segnala("la rotazione ha gi\u00e0 7 schede: il massimo", "errore");
          return;
        }
        let successiva = "";
        for (let i = 0; i < 26 && !successiva; i += 1) {
          const lettera = String.fromCharCode(65 + i);
          if (letto.lettere.indexOf(lettera) === -1) successiva = lettera;
        }
        const nuovo = letto.lettere.concat(successiva ? [successiva] : []).join(" ");
        if (rotazione) rimetti(rotazione, nuovo);
        mostraAnteprima(nuovo);
        scrivi(rotazione, "rotazione", nuovo, messaggioRotazione(nuovo), "Rotazione", "Rotazione non salvata");
      });
    }
  }

  return legati;
}
