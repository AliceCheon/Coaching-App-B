/* Barbell Diva B — il peso: una fonte sola.
 *
 * Le cinque pesate della scheda della coach sono l'unico storico che esiste:
 * non si inventa niente di nuovo, e nessuna pagina ne tiene una copia.
 *
 * Tre stati, mai confusi:
 *   "letto"     -> ci sono pesate (o ce ne sono zero, ma la lettura è riuscita)
 *   "vuoto"     -> letta e vuota: nessuna pesata registrata
 *   "non-letto" -> la lettura non è arrivata o è fallita
 *
 * Questo file è uno script classico (non un modulo ES) perché le pagine di
 * desktop/index.html lo leggono al volo, prima dei loro script inline: espone
 * window.BDPesoB e, per le prove, anche module.exports.
 */
(function (radice) {
  "use strict";

  var FONTE_SCHEDA = "scheda coach (importata)";

  /* L'unico storico che esiste: cinque pesate su carta, 13/03 -> 27/10. */
  var PESATE_SCHEDA = Object.freeze([
    { data: "2026-03-13", kg: 68.0, fonte: FONTE_SCHEDA },
    { data: "2026-05-05", kg: 67.4, fonte: FONTE_SCHEDA },
    { data: "2026-06-12", kg: 66.4, fonte: FONTE_SCHEDA },
    { data: "2026-07-11", kg: 66.0, fonte: FONTE_SCHEDA },
    { data: "2026-10-27", kg: 67.7, fonte: FONTE_SCHEDA }
  ]);

  function numero(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? n : null;
  }
  function numeroValido(iso) { return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || "")); }

  /* "2026-10-27" -> "27/10/2026" ; "27/10" per le etichette corte. */
  function dataBreve(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "—";
  }
  function dataCorta(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? m[3] + "/" + m[2] : "—";
  }
  function kg(v, cifre) {
    var n = numero(v);
    return n === null ? "—" : n.toFixed(cifre == null ? 1 : cifre).replace(".", ",");
  }

  /* Lo stato del peso. `pesate` permette alle prove di simulare pieno e vuoto;
     `errore` dichiara una lettura fallita (non uno zero). */
  function leggiPeso(opzioni) {
    var o = opzioni || {};
    if (o.errore !== undefined && o.errore !== null) {
      return { stato: "non-letto", pesate: [], motivo: String(o.errore), ultima: null, prima: null, anno: null };
    }
    var grezze = o.pesate === undefined ? PESATE_SCHEDA : o.pesate;
    if (!Array.isArray(grezze)) {
      return { stato: "non-letto", pesate: [], motivo: "lo storico non è un elenco", ultima: null, prima: null, anno: null };
    }
    var buone = [];
    for (var i = 0; i < grezze.length; i++) {
      var p = grezze[i] || {};
      var k = numero(p.kg);
      if (k === null || !numeroValido(p.data)) continue;
      buone.push({ data: p.data, kg: k, fonte: p.fonte || FONTE_SCHEDA });
    }
    buone.sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    var ultima = buone.length ? buone[buone.length - 1] : null;
    var prima = buone.length ? buone[0] : null;
    return {
      stato: buone.length ? "letto" : "vuoto",
      pesate: buone,
      motivo: null,
      ultima: ultima,
      prima: prima,
      anno: ultima ? Number(ultima.data.slice(0, 4)) : null
    };
  }

  /* La frase da mostrare: una sola, per tutte e cinque le pagine. */
  function testoPeso(stato) {
    var st = stato || leggiPeso();
    if (st.stato === "non-letto") {
      return st.motivo
        ? "non ho potuto leggere il peso: " + st.motivo
        : "non ho ancora letto il peso";
    }
    if (st.stato === "vuoto") return "letta e vuota: nessuna pesata registrata";
    var n = st.pesate.length;
    return n + (n === 1 ? " pesata" : " pesate") + ", l'ultima del " + dataBreve(st.ultima.data);
  }

  function riassunto(stato) {
    var st = stato || leggiPeso();
    var n = st.pesate ? st.pesate.length : 0;
    var titolo;
    if (st.stato === "letto") titolo = n + (n === 1 ? " pesata" : " pesate");
    else if (st.stato === "vuoto") titolo = "Nessuna pesata";
    else titolo = "Peso non letto";
    return {
      stato: st.stato,
      n: n,
      titolo: titolo,
      testo: testoPeso(st),
      ultima: st.ultima ? st.ultima.data : null,
      prima: st.prima ? st.prima.data : null,
      anno: st.anno
    };
  }

  /* Il profilo serve per altezza ed età: vale solo se è confermato.
     Finché nessuno lo conferma, i campi si dichiarano mancanti. */
  function leggiProfilo(profilo) {
    var p = profilo || null;
    var altezza = p ? numero(p.altezza) : null;
    var eta = p ? numero(p.eta) : null;
    var sesso = p && (p.sesso === "d" || p.sesso === "u") ? p.sesso : null;
    var mancanti = [];
    if (altezza === null || altezza < 120 || altezza > 230) mancanti.push("altezza");
    if (eta === null || eta < 12 || eta > 100) mancanti.push("età");
    if (!sesso) mancanti.push("sesso");
    var confermato = p != null && p.confermato === true && mancanti.length === 0;
    return {
      confermato: confermato,
      altezza: confermato ? altezza : null,
      eta: confermato ? eta : null,
      sesso: confermato ? sesso : null,
      mancanti: confermato ? [] : mancanti
    };
  }

  function profiloTesto(prof) {
    var p = prof || leggiProfilo();
    if (!p.confermato) return "altezza e età non registrate";
    return Math.round(p.altezza) + " cm · " + Math.round(p.eta) + " anni";
  }

  /* Peso medio per anno e mese, per Monitor annuale. */
  /* I mesi con le pesate che ci sono, dal più vecchio al più recente.
   * Passo 40: si raggruppa per CHIAVE, non per vicinanza nell'elenco — prima
   * due pesate dello stesso mese separate da un'altra data facevano due mesi
   * uguali, con due medie sbagliate. */
  function perMese(stato) {
    var st = stato || leggiPeso();
    var pesate = (st && Array.isArray(st.pesate) ? st.pesate : [])
      .filter(function (p) { return p && typeof p.data === "string" && p.data.length >= 7 && isFinite(p.kg); })
      .slice()
      .sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
    var per = {}, ordine = [];
    pesate.forEach(function (p) {
      var chiave = p.data.slice(0, 7);
      if (!per[chiave]) {
        per[chiave] = { chiave: chiave, anno: Number(p.data.slice(0, 4)), mese: Number(p.data.slice(5, 7)), somma: 0, n: 0 };
        ordine.push(chiave);
      }
      per[chiave].somma += p.kg;
      per[chiave].n += 1;
    });
    return ordine.map(function (k) {
      var m = per[k];
      m.media = m.somma / m.n;
      return m;
    });
  }

  var API = {
    FONTE_SCHEDA: FONTE_SCHEDA,
    PESATE_SCHEDA: PESATE_SCHEDA,
    leggiPeso: leggiPeso,
    testoPeso: testoPeso,
    riassunto: riassunto,
    leggiProfilo: leggiProfilo,
    profiloTesto: profiloTesto,
    perMese: perMese,
    dataBreve: dataBreve,
    dataCorta: dataCorta,
    kg: kg,
    numero: numero
  };

  radice.BDPesoB = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
