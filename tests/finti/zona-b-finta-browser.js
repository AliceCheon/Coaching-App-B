/* Finto Firestore della zona B per lo scatto della pagina vera (passo 13).
 * Si inietta PRIMA dei moduli con Page.addScriptToEvaluateOnNewDocument:
 * app-v31.js trova window.BD_B e window.firebase gia' pronti e monta la
 * tabella con i valori veri, senza toccare il cloud e senza che il v31
 * parli con il progetto vero (l'SDK e' finto). */
(function () {
  "use strict";
  var META = {
    id: "prg-intensita", name: "Intensita ottobre-dicembre", status: "active", phase: "Bulk",
    startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
    rotation: ["A", "B", "C", "D"],
    createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
  };
  var settimana = function (n) {
    return { week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: n === 4 ? "deload" : "normal", note: "", source: "manual" };
  };
  var otto = function () {
    var a = [], i;
    for (i = 0; i < 8; i += 1) a.push(settimana(i + 1));
    return a;
  };
  /* I valori veri di Alice, quelli che devono stare su una riga a 1200 px. */
  var esercizi = [
    { id: "ex-1", name: "Trazioni_assistite", muscle: "dorsali", note2: "presa prona", prescription: { rest: "120-180 sec", tempo: "2-0-1" }, progression: { weeks: otto() } },
    { id: "ex-2", name: "Lat_machine_presa_neutra", muscle: "centro schiena", prescription: { rest: "2-3'" }, progression: { weeks: otto() } },
    { id: "ex-3", name: "Rematore_bilanciere", muscle: "dorso", prescription: { rest: "1'30\"" }, progression: { weeks: otto() } },
    { id: "ex-4", name: "Pulley basso", muscle: "dorso", prescription: { rest: "90 sec" }, progression: { weeks: otto() } },
    { name: "Curl_bilanciere", muscle: "bicipiti", prescription: { rest: "1' a braccio poi 90\"", tempo: "3-1-1" }, progression: { weeks: otto() } },
    { id: "ex-6", name: "Alzate_laterali", muscle: "spalle", prescription: { rest: "No recupero tra le braccia e poi 1,30'" }, progression: { weeks: otto() } }
  ];
  var scheda = {
    id: "program-v2-sheet-prg-intensita__sh-A",
    dati: { programId: "prg-intensita", sheetId: "sh-A", kind: "sheet", versione: 1,
      sheet: { id: "sh-A", code: "A", name: "Dorsali, spalle, braccia", updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi } }
  };
  var zona = {
    radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "dati di prova dello scatto" },
    programmi: [{ id: "program-v2-meta-prg-intensita", dati: { programMeta: META } }],
    schede: [scheda],
    sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Trazioni_assistite", kg: 42.5 }] } } }],
    esclusioni: [],
    registro: []
  };

  var LETTURA = 60, SCRITTURA = 25;
  var inVolo = 0;
  var attesa = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var copia = function (x) { return JSON.parse(JSON.stringify(x == null ? null : x)); };
  /* Il Firestore vero rifiuta qualunque undefined: il finto lo dice anche lui,
   * cosi' le prove lo trovano prima di Alice. */
  var sguarda = function (v, dove) {
    if (v === undefined) throw new Error("Firestore vero rifiuta " + dove + ": valore undefined");
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i += 1) sguarda(v[i], dove); return; }
    if (v && typeof v === "object") { for (var k in v) { if (Object.prototype.hasOwnProperty.call(v, k)) sguarda(v[k], dove + "." + k); } }
  };
  var scaffale = {};
  /* La memoria resta dall'altra parte della navigazione (localStorage): e'
   * quello che serve alla prova del ripristino dopo la ricarica. */
  var CHIAVE_MEMORIA = "bd-b-finta-v1";
  var sottoTutte = ["programmi", "schede", "sedute", "esclusioni", "registro"];
  var salva = null;
  var documentiDi = function (sotto) {
    if (!scaffale[sotto]) {
      scaffale[sotto] = new Map();
      (zona[sotto] || []).forEach(function (d) { scaffale[sotto].set(String(d.id), copia(d.dati)); });
    }
    return scaffale[sotto];
  };
  salva = function () {
    try { window.localStorage.setItem(CHIAVE_MEMORIA, JSON.stringify((function () {
      var o = { radice: zona.radice };
      sottoTutte.forEach(function (sotto) { o[sotto] = {}; documentiDi(sotto).forEach(function (v, k) { o[sotto][k] = v; }); });
      return o;
    })())); } catch (e) {}
  };
  (function ripristinaMemoria() {
    var d = null;
    try { d = JSON.parse(window.localStorage.getItem(CHIAVE_MEMORIA) || "null"); } catch (e) { d = null; }
    if (!d) return;
    if (d.radice != null) zona.radice = d.radice;
    sottoTutte.forEach(function (sotto) {
      var t = d[sotto] || {};
      Object.keys(t).forEach(function (k) { documentiDi(sotto).set(k, t[k]); });
    });
  })();

  var docFinto = function (sotto, id) {
    return {
      get: function () {
        inVolo += 1;
        return attesa(LETTURA).then(function () {
          inVolo -= 1;
          var valore = documentiDi(sotto).get(id) || null;
          return valore == null
            ? { exists: false, data: function () { return null; } }
            : { exists: true, data: function () { return copia(valore); } };
        });
      },
      set: function (nuovi) {
        inVolo += 1;
        return attesa(SCRITTURA).then(function () {
          sguarda(nuovi || {}, sotto + "/" + id);
          documentiDi(sotto).set(id, copia(nuovi || {}));
          if (salva) salva();
          inVolo -= 1;
        });
      }
    };
  };
  var collezioneFinta = function (sotto) {
    return {
      get: function () {
        inVolo += 1;
        return attesa(LETTURA).then(function () {
          inVolo -= 1;
          var elenco = [];
          documentiDi(sotto).forEach(function (valore, chiave) {
            if (valore != null) elenco.push({ id: chiave, data: function () { return copia(valore); } });
          });
          return { docs: elenco };
        });
      },
      doc: function (id) { return docFinto(sotto, String(id)); }
    };
  };
  var docRadice = function (uid) {
    return {
      get: function () {
        inVolo += 1;
        return attesa(LETTURA).then(function () {
          inVolo -= 1;
          return zona.radice == null
            ? { exists: false, data: function () { return null; } }
            : { exists: true, data: function () { return copia(zona.radice); } };
        });
      },
      set: function (nuovi) {
        inVolo += 1;
        return attesa(SCRITTURA).then(function () {
          sguarda(nuovi || {}, "radice");
          zona.radice = copia(nuovi || {});
          if (salva) salva();
          inVolo -= 1;
        });
      },
      collection: function (sotto) { return collezioneFinta(String(sotto)); }
    };
  };
  var db = {
    collection: function (nome) {
      if (nome !== "bdB_atleti") throw new Error("fuori dalla zona B: " + nome);
      return { doc: function (uid) { return docRadice(String(uid)); } };
    }
  };

  window.__zonaB = {
    dati: zona,
    inVolo: function () { return inVolo; }
  };
  window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  var auth = {
    setPersistence: function () { return Promise.resolve("ok"); },
    onAuthStateChanged: function (cb) { cb({ uid: "alice-prova" }); return function () {}; },
    signInWithPopup: function () { return Promise.resolve({ user: { uid: "alice-prova" } }); },
    signInWithRedirect: function () { return Promise.resolve({ via: "redirect" }); },
    signOut: function () { return Promise.resolve({ via: "uscita" }); }
  };
  window.firebase = {
    apps: [],
    auth: Object.assign(function () { return auth; }, {
      GoogleAuthProvider: function () {},
      Auth: { Persistence: { LOCAL: "local" } }
    }),
    app: function (nome) { return window.firebase.apps.filter(function (a) { return a.name === nome; })[0] || null; },
    initializeApp: function (config, nome) {
      var app = { name: nome || "[Default]", auth: function () { return auth; }, firestore: function () { return db; } };
      window.firebase.apps.push(app);
      return app;
    }
  };
})();
