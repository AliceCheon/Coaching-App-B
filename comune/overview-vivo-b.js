/* Barbell Diva B — Overview atleta: aderenza e carico dai dati veri (passo 18).
 *
 * Prima l'Overview contava da una tabella nascosta del mockup v31 (le schede
 * A-D scritte nell'HTML, con le date «Ultima» fisse): «Aderenza 7 giorni 0%»
 * e «Carico 86%» non venivano né dal logbook né dal programma letto.
 *
 * Qui solo conti puri, nessun DOM:
 *   - aderenza: sedute fatte negli ultimi 7 giorni (logbook) contro i giorni a
 *     settimana che il programma dichiara;
 *   - carico: serie previste nella settimana in corso contro la settimana più
 *     piena del programma letto; la settimana in corso si ricava dalla data
 *     d'inizio del programma, non si suppone «settimana 1».
 * Quando un conto non si può fare, il risultato porta il PERCHÉ e nessun
 * numero: uno 0% vale solo se il conto è stato fatto davvero.
 *
 * Script classico (non modulo ES), come peso-b.js: espone window.BDOverviewB
 * e, per le prove, module.exports.
 */
(function (radice) {
  "use strict";

  var GIORNO = 86400000;

  function due(n) { return (n < 10 ? "0" : "") + n; }

  /* "21/10/2026" -> Date locale a mezzanotte; altro -> null. */
  function dataDMY(s) {
    var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s == null ? "" : s).trim());
    if (!m) return null;
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getDate() === +m[1] && d.getMonth() === +m[2] - 1 ? d : null;
  }
  function mezzanotte(d) {
    var x = d instanceof Date ? d : new Date();
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
  }
  function breve(d) { return d ? due(d.getDate()) + "/" + due(d.getMonth() + 1) + "/" + d.getFullYear() : "—"; }
  function corta(d) { return d ? due(d.getDate()) + "/" + due(d.getMonth() + 1) : "—"; }
  function giorniFra(a, b) { return Math.round((mezzanotte(b) - mezzanotte(a)) / GIORNO); }

  /* Una seduta conta come fatta se è completata, oppure se il dato non porta
     nessuno stato (le sedute di A senza stato sono sedute registrate). Le
     bozze non contano. */
  function fatta(s) {
    var st = String((s && s.st) == null ? "" : s.st).trim().toLowerCase();
    return st === "" || st === "completed";
  }

  /* opzioni: { sedute: array|null, letto: bool, motivoLogbook, giorni: n|null, oggi: Date } */
  function aderenza(opzioni) {
    var o = opzioni || {};
    var oggi = mezzanotte(o.oggi);
    var da = new Date(oggi.getTime() - 6 * GIORNO);
    var finestra = breve(da) + " → " + breve(oggi);
    if (!o.letto || !Array.isArray(o.sedute)) {
      return { stato: "non-calcolabile", percento: null, fatte: null, previste: null, finestra: finestra,
        motivo: o.motivoLogbook || "il logbook non è ancora stato letto" };
    }
    if (!o.sedute.length) {
      return { stato: "non-calcolabile", percento: null, fatte: null, previste: null, finestra: finestra,
        motivo: o.motivoLogbook || "il logbook è letto ma non ha nessuna seduta" };
    }
    var datate = 0, ultima = null, fatte = 0;
    o.sedute.forEach(function (s) {
      var d = dataDMY(s && s.d);
      if (!d) return;
      datate += 1;
      if (fatta(s) && (!ultima || d > ultima)) ultima = d;
      if (fatta(s) && d >= da && d <= oggi) fatte += 1;
    });
    if (!datate) {
      return { stato: "non-calcolabile", percento: null, fatte: null, previste: null, finestra: finestra,
        motivo: "nessuna seduta del logbook ha una data leggibile" };
    }
    var g = typeof o.giorni === "number" && isFinite(o.giorni) && o.giorni > 0 ? Math.round(o.giorni) : null;
    if (g === null) {
      return { stato: "parziale", percento: null, fatte: fatte, previste: null, finestra: finestra, ultima: ultima,
        motivo: "il programma non dichiara quanti giorni a settimana: conto le sedute, non la percentuale" };
    }
    return { stato: "calcolata", percento: Math.min(100, Math.round(100 * fatte / g)), fatte: fatte, previste: g,
      finestra: finestra, ultima: ultima, motivo: null };
  }

  /* La settimana del programma in cui cade oggi: UNA funzione per tutte le
   * pagine, in comune/settimana-blocco.js (passo 23). Dashboard, Overview e
   * Pianificazione passano da qui, così il numero è lo stesso e, quando il
   * conto non si può fare, anche il motivo è lo stesso. */
  function settimanaInCorso(inizioDMY, oggi, quante) {
    var modulo = radice.BDSettimana;
    if (!modulo || typeof modulo.settimanaDelBlocco !== "function") {
      return { numero: null, inizio: dataDMY(inizioDMY), motivo: "manca il modulo della settimana: non so quale settimana è oggi" };
    }
    var r = modulo.settimanaDelBlocco({
      programmaPresente: true,
      inizio: inizioDMY,
      durata: quante == null ? null : quante,
      oggi: oggi || new Date()
    });
    return { numero: r.numero, inizio: dataDMY(inizioDMY), motivo: r.motivo, totale: r.totale, etichetta: r.etichetta };
  }

  /* opzioni: { letto: bool, motivoProgramma, serie: [[n per settimana] per riga], inizio: "gg/mm/aaaa", oggi } */
  function carico(opzioni) {
    var o = opzioni || {};
    if (!o.letto) return { stato: "non-calcolabile", percento: null, motivo: o.motivoProgramma || "il programma non è ancora stato letto" };
    var righe = Array.isArray(o.serie) ? o.serie : [];
    var quante = righe.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
    if (!righe.length || !quante) return { stato: "non-calcolabile", percento: null, motivo: "il programma letto non ha serie scritte" };
    var perSett = [];
    for (var k = 0; k < quante; k++) {
      perSett.push(righe.reduce(function (t, r) { var v = r[k]; return t + (typeof v === "number" && isFinite(v) ? v : 0); }, 0));
    }
    var max = Math.max.apply(null, perSett);
    var sett = settimanaInCorso(o.inizio, o.oggi, quante);
    if (sett.numero === null) return { stato: "non-calcolabile", percento: null, perSett: perSett, max: max, motivo: sett.motivo };
    if (!max) return { stato: "non-calcolabile", percento: null, perSett: perSett, max: max, settimana: sett.numero, motivo: "nessuna settimana del programma ha serie scritte" };
    var qui = perSett[sett.numero - 1];
    return { stato: "calcolata", percento: Math.round(100 * qui / max), serie: qui, max: max, perSett: perSett, settimana: sett.numero, motivo: null };
  }

  var API = {
    dataDMY: dataDMY,
    breve: breve,
    corta: corta,
    fatta: fatta,
    aderenza: aderenza,
    settimanaInCorso: settimanaInCorso,
    carico: carico
  };

  radice.BDOverviewB = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
