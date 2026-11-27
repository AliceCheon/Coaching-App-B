/* Barbell Diva B — LA settimana del blocco, una sola per tutte le pagine.
 *
 * PASSO 23 (giro di controllo). Prima ognuna la diceva a modo suo:
 *   - la Dashboard aveva «settimana 1 di 8» scritto nel file del v31;
 *   - l'Overview la calcolava dalla data d'inizio (e poteva dire «Settimana 8»);
 *   - la Pianificazione riceveva `settimana: null` e scriveva «non registrato».
 * Tre numeri, tre fonti. Qui c'è una funzione sola: entra la data d'inizio del
 * programma (con la durata, se il documento la dichiara) e l'oggi, ed esce la
 * stessa risposta per tutte e tre — numero, totale, e il motivo quando il conto
 * non si può fare. Chi disegna non ricalcola: usa `etichetta()`.
 *
 * Regola di casa: se il dato manca, si dichiara. Il motivo è la stessa frase
 * in tutte e tre le pagine, così una differenza non è più possibile.
 *
 * Script classico (non modulo ES) perché la Overview lo legge dallo script
 * inline di desktop/index.html: espone window.BDSettimana e, per le prove,
 * module.exports.
 */
(function (radice) {
  "use strict";

  var GIORNO = 86400000;

  function due(n) { return (n < 10 ? "0" : "") + n; }

  function numero(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isFinite(n) && n > 0 ? Math.round(n) : null;
  }

  /* Accetta gg/mm/aaaa (come lo scrive la pagina), aaaa-mm-gg (come lo porta
   * il documento) e una Date. Tutto il resto: null, mai una data indovinata. */
  function dataDa(valore) {
    if (valore instanceof Date && !isNaN(valore.getTime())) {
      return new Date(valore.getFullYear(), valore.getMonth(), valore.getDate());
    }
    var t = String(valore == null ? "" : valore).trim();
    var ita = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(t);
    if (ita) {
      var d1 = new Date(+ita[3], +ita[2] - 1, +ita[1]);
      return d1.getDate() === +ita[1] && d1.getMonth() === +ita[2] - 1 ? d1 : null;
    }
    var iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
    if (iso) {
      var d2 = new Date(+iso[1], +iso[2] - 1, +iso[3]);
      return d2.getDate() === +iso[3] && d2.getMonth() === +iso[2] - 1 ? d2 : null;
    }
    return null;
  }

  function mezzanotte(d) {
    var x = d instanceof Date && !isNaN(d.getTime()) ? d : new Date();
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
  }

  function breve(d) {
    return d ? due(d.getDate()) + "/" + due(d.getMonth() + 1) + "/" + d.getFullYear() : "—";
  }

  /* opzioni:
   *   programmaPresente  false = nessun programma letto (il motivo è quello);
   *   inizio             "gg/mm/aaaa" | "aaaa-mm-gg" | Date;
   *   durata             quante settimane dichiara il programma (o null);
   *   oggi               Date (per le prove; default adesso).
   * Ritorna { numero, totale, inizio, motivo, etichetta, etichettaMaiuscola }. */
  function settimanaDelBlocco(opzioni) {
    var o = opzioni && typeof opzioni === "object" ? opzioni : {};
    var totale = numero(o.durata);
    var base = { numero: null, totale: totale, inizio: null, motivo: null };

    if (o.programmaPresente === false) {
      base.motivo = "nessun programma letto";
      return conEtichetta(base);
    }
    var inizio = dataDa(o.inizio);
    if (!inizio) {
      base.motivo = "manca la data d'inizio del programma";
      return conEtichetta(base);
    }
    base.inizio = breve(inizio);
    var oggi = mezzanotte(o.oggi);
    var giorni = Math.round((oggi - inizio) / GIORNO);
    if (giorni < 0) {
      base.motivo = "il programma comincia il " + breve(inizio);
      return conEtichetta(base);
    }
    var n = Math.floor(giorni / 7) + 1;
    if (totale && n > totale) {
      base.motivo = "il programma è di " + totale + " settimane ed è finito: oggi sarebbe la settimana " + n;
      return conEtichetta(base);
    }
    base.numero = n;
    return conEtichetta(base);
  }

  function conEtichetta(r) {
    r.etichetta = r.numero == null
      ? "settimana non registrata: " + r.motivo
      : ("settimana " + r.numero + (r.totale ? " di " + r.totale : ""));
    r.etichettaMaiuscola = r.etichetta.charAt(0).toUpperCase() + r.etichetta.slice(1);
    return r;
  }

  /* La stessa frase, con la maiuscola dove serve (Overview) e senza dove la
   * frase è in mezzo a un periodo (Dashboard, Pianificazione). */
  function etichetta(risultato, maiuscola) {
    var r = risultato && typeof risultato === "object" ? risultato : settimanaDelBlocco({ programmaPresente: false });
    if (r.etichetta && r.etichettaMaiuscola) return maiuscola ? r.etichettaMaiuscola : r.etichetta;
    return conEtichetta({
      numero: r.numero == null ? null : Number(r.numero),
      totale: r.totale == null ? null : Number(r.totale),
      inizio: r.inizio || null,
      motivo: r.motivo || "motivo non registrato"
    })[maiuscola ? "etichettaMaiuscola" : "etichetta"];
  }

  var API = {
    dataDa: dataDa,
    breve: breve,
    settimanaDelBlocco: settimanaDelBlocco,
    etichetta: etichetta
  };

  radice.BDSettimana = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
