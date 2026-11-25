/* Barbell Diva B — il check-in di oggi: una fonte sola (passo 18).
 *
 * Il check-in sono cinque voci (energia, sonno, DOMS, stress, fame) su una
 * scala sola, 1-5, come le scrive il questionario di A (A r.15021: l'oggetto
 * `wellness`). Qui la scala si dichiara una volta e vale per tutte le pagine:
 * niente «5 / 10», niente barre al 50% per un 5 su 5.
 *
 * Tre stati, mai confusi:
 *   "letto"     -> c'è un check-in con almeno una voce valida
 *   "vuoto"     -> la lettura è riuscita ma non c'è nessun check-in
 *   "non-letto" -> la lettura non è arrivata o non esiste ancora
 * E un quarto fatto, separato dallo stato: `diOggi`. Un check-in vecchio non
 * si presenta mai come quello di oggi: si scrive la sua data.
 *
 * Oggi la zona B (bdB_atleti) non contiene check-in: nessuna sottoraccolta li
 * porta e la pagina non li legge. Per questo, senza opzioni, lo stato è
 * "non-letto" con il motivo scritto. Quando il telefono scriverà la
 * sottoraccolta `checkin-giornaliero` (contratto in modello-dati.js), basterà
 * passare il documento a leggiCheckin({ checkin }).
 *
 * Script classico (non modulo ES), come peso-b.js: espone window.BDCheckinB
 * e, per le prove, module.exports.
 */
(function (radice) {
  "use strict";

  var SCALA = Object.freeze({ min: 1, max: 5, testo: "scala 1-5" });

  var MOTIVO_ASSENTE = "nella zona B non ci sono ancora check-in, arriveranno dal telefono";

  /* L'ordine del questionario. `meglio`: "basso" = più basso è meglio. */
  var VOCI = Object.freeze([
    Object.freeze({ chiave: "energy", nome: "Energia", meglio: "alto" }),
    Object.freeze({ chiave: "sleep", nome: "Sonno", meglio: "alto" }),
    Object.freeze({ chiave: "doms", nome: "DOMS", meglio: "basso" }),
    Object.freeze({ chiave: "stress", nome: "Stress", meglio: "basso" }),
    Object.freeze({ chiave: "hunger", nome: "Fame", meglio: "alto" })
  ]);

  function due(n) { return (n < 10 ? "0" : "") + n; }

  /* La data di oggi nel fuso del dispositivo, in ISO: "2026-11-25". */
  function oggiISO(adesso) {
    var d = adesso instanceof Date ? adesso : new Date();
    return d.getFullYear() + "-" + due(d.getMonth() + 1) + "-" + due(d.getDate());
  }

  /* "2026-10-21", "21/10/2026" o un timestamp ISO -> "2026-10-21"; altro -> null. */
  function dataISO(v) {
    var s = String(v == null ? "" : v).trim();
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return m[1] + "-" + m[2] + "-" + m[3];
    m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
    if (m) return m[3] + "-" + m[2] + "-" + m[1];
    return null;
  }
  function dataBreve(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    return m ? m[3] + "/" + m[2] + "/" + m[1] : "—";
  }

  /* Un voto vale solo se è un intero dentro la scala: un 7 non diventa un 5,
     un «bene» non diventa un 4. Fuori scala = non registrato. */
  function voto(v) {
    var n = typeof v === "number" ? v : (typeof v === "string" && v.trim() !== "" ? Number(v) : NaN);
    if (!isFinite(n) || Math.round(n) !== n || n < SCALA.min || n > SCALA.max) return null;
    return n;
  }

  function leggiCheckin(opzioni) {
    var o = opzioni || {};
    var oggi = o.oggi ? dataISO(o.oggi) || oggiISO() : oggiISO(o.adesso);
    var base = { stato: "non-letto", motivo: null, data: null, diOggi: false, oggi: oggi, voci: [], registrate: 0 };
    if (o.errore !== undefined && o.errore !== null) {
      base.motivo = "non ho potuto leggere il check-in: " + String(o.errore);
      return base;
    }
    if (o.checkin === undefined) {
      base.motivo = MOTIVO_ASSENTE;
      return base;
    }
    if (o.checkin === null) {
      base.stato = "vuoto";
      return base;
    }
    var ck = o.checkin || {};
    var w = ck.wellness && typeof ck.wellness === "object" ? ck.wellness : {};
    var voci = VOCI.map(function (v) {
      var n = voto(w[v.chiave]);
      return { chiave: v.chiave, nome: v.nome, meglio: v.meglio, valore: n, registrato: n !== null };
    });
    var registrate = voci.filter(function (v) { return v.registrato; }).length;
    var data = dataISO(ck.date) || dataISO(ck.data) || dataISO(ck.createdAt);
    if (!registrate) {
      base.stato = "vuoto";
      base.data = data;
      base.diOggi = data === oggi;
      base.voci = voci;
      return base;
    }
    return { stato: "letto", motivo: null, data: data, diOggi: data !== null && data === oggi, oggi: oggi, voci: voci, registrate: registrate };
  }

  /* Il nome del check-in come si può dire: «di oggi» solo se la data è oggi. */
  function etichetta(st) {
    if (st.stato !== "letto") return "check-in di oggi non arrivato";
    if (st.diOggi) return "check-in di oggi";
    return st.data ? "ultimo check-in del " + dataBreve(st.data) + ", non di oggi" : "check-in senza data: non so se è di oggi";
  }

  /* La frase unica per tutte le pagine. */
  function testoCheckin(st) {
    if (st.stato === "non-letto") return "Il check-in di oggi non è arrivato: " + (st.motivo || MOTIVO_ASSENTE) + ".";
    if (st.stato === "vuoto") return "Il check-in di oggi non è arrivato: la lettura è riuscita ma non c'è nessuna risposta.";
    var quante = st.registrate === VOCI.length ? "tutte e cinque le voci" : st.registrate + " voci su " + VOCI.length + " (le altre: non registrato)";
    return (st.diOggi ? "Check-in di oggi" : etichetta(st).charAt(0).toUpperCase() + etichetta(st).slice(1)) + ": " + quante + ", " + SCALA.testo + ".";
  }

  /* "4 / 5" oppure "—". */
  function votoTesto(v) { return v === null || v === undefined ? "—" : v + " / " + SCALA.max; }
  /* Larghezza della barra: 5 su 5 = 100%. */
  function percento(v) { return v === null || v === undefined ? 0 : Math.round(100 * v / SCALA.max); }

  /* La media per la Readiness: solo con tutte e cinque le voci, come la regola
     della Dashboard (vista-dashboard.js, readiness). */
  function media(st) {
    if (st.stato !== "letto" || st.registrate !== VOCI.length) return null;
    var s = st.voci.reduce(function (a, v) { return a + v.valore; }, 0) / VOCI.length;
    return { media: s, punteggio: Math.round(100 * s / SCALA.max) };
  }

  var API = {
    SCALA: SCALA,
    VOCI: VOCI,
    MOTIVO_ASSENTE: MOTIVO_ASSENTE,
    oggiISO: oggiISO,
    dataISO: dataISO,
    dataBreve: dataBreve,
    voto: voto,
    leggiCheckin: leggiCheckin,
    etichetta: etichetta,
    testoCheckin: testoCheckin,
    votoTesto: votoTesto,
    percento: percento,
    media: media
  };

  radice.BDCheckinB = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
