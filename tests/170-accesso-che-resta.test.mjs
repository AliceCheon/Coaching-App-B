/* Guardia 170 (passo 18) — «l'accesso che resta».
 *
 * Il difetto che questa guardia difende, misurato il 26/11/2026 sul codice di
 * prima (b0.61): con la sessione già aperta, la carta d'accesso veniva dipinta
 * lo stesso all'avvio — restava a schermo finché l'SDK non rispondeva (900 ms
 * nella prova con un finto SDK lento, di più con la rete vera e l'SDK da
 * scaricare). La pagina sembrava chiedere il login a ogni apertura, e chi la
 * apriva non aveva modo di sapere se la sessione era sua o no.
 *
 * Le prove, in fila, come li fa Alice:
 *   170.1  primo avvio, nessuna sessione: la carta chiede l'accesso UNA volta
 *   170.2  l'accesso si fa: l'email resta ricordata sul dispositivo
 *   170.3  secondo avvio, sessione già aperta: la carta NON viene mai dipinta
 *          e non si entra di nuovo (è la prova che sul codice di prima è rossa)
 *   170.4  la sessione cade: la carta propone «Entra come …», non un modulo vuoto
 *   170.5  «Non sei tu?» toglie solo l'email: la sessione non si tocca
 *   170.6  l'uscita esplicita chiude la sessione E cancella il promemoria
 *   170.7  nessuna password finisce da nessuna parte
 *
 * Il finto SDK ha una sessione che vive fuori dalle pagine (come il browser):
 * due caricamenti consecutivi vedono lo stesso utente, e `signInWithPopup`
 * viene contato. Senza questa memoria condivisa la prova non direbbe niente.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { creaZonaBFinta } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const PREFISSO = "bd-b.prova-accesso.";
const CHIAVE_EMAIL = PREFISSO + "accesso.email";
const EMAIL = "alice.prova@example.com";

/* La zona B minima che la pagina accetta come «completa» (come la 168). */
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 170" },
  programmi: [], schede: [], esclusioni: [], registro: [], scheletri: [],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }]
};
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [10, 5, 15], latenzaScrittura: 3 });

/* La sessione del «dispositivo»: vive fuori dalle pagine, come quella vera.
 * `ritardo` è il tempo che l'SDK ci mette a dire chi è entrato. */
function creaSessioneFinta(opzioni = {}) {
  const s = {
    utente: opzioni.utente || null,
    accessi: 0,
    uscite: 0,
    persistenze: [],
    callback: null,
    ritardo: opzioni.ritardo == null ? 40 : opzioni.ritardo
  };
  s.sdk = () => {
    const auth = {
      setPersistence: async (tipo) => { s.persistenze.push(tipo); return "ok"; },
      /* Lo stato arriva DOPO: è il tempo in cui, prima, la carta restava a schermo. */
      onAuthStateChanged: (cb) => {
        s.callback = cb;
        setTimeout(() => { if (s.callback === cb) cb(s.utente); }, s.ritardo);
        return () => {};
      },
      signInWithPopup: async () => {
        s.accessi += 1;
        s.utente = { uid: "alice-prova", email: EMAIL };
        setTimeout(() => { if (s.callback) s.callback(s.utente); }, 5);
        return { user: s.utente };
      },
      signInWithRedirect: async () => ({ via: "redirect" }),
      signOut: async () => {
        s.uscite += 1;
        s.utente = null;
        setTimeout(() => { if (s.callback) s.callback(null); }, 5);
        return { via: "uscita" };
      }
    };
    const sdk = {
      apps: [],
      auth: Object.assign(function authNamespace() { return auth; }, {
        GoogleAuthProvider: function GoogleAuthProviderFinto() {},
        Auth: { Persistence: { LOCAL: "local" } }
      }),
      app: (nome) => sdk.apps.find((a) => a.name === nome) || null,
      initializeApp: (config, nome) => {
        const app = { name: nome || "[Default]", auth: () => auth, firestore: () => zona.db };
        sdk.apps.push(app);
        return app;
      }
    };
    return sdk;
  };
  return s;
}

/* Un caricamento della pagina: DOM nuovo, moduli nuovi, la memoria del
 * dispositivo e la sessione portate da fuori (come un F5 nel browser). */
const memoria = Object.create(null);
let caricamenti = 0;

/* Quello che il browser terrebbe: si riporta fuori dal DOM per il
 * caricamento dopo (e per le asserzioni, che altrimenti leggerebbero una
 * fotografia vecchia: l'accesso scrive DOPO il caricamento). */
function raccogli(dom) {
  Object.keys(memoria).forEach((k) => { delete memoria[k]; });
  const ls = dom.window.localStorage;
  for (let i = 0; i < ls.length; i += 1) {
    const k = ls.key(i);
    memoria[k] = ls.getItem(k);
  }
}
async function carica(sessione) {
  caricamenti += 1;
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  /* L'indirizzo serve perché localStorage esista (in about:blank è negata). */
  const dom = new JSDOM(HTML, { url: "https://prova.local/desktop/", runScripts: "outside-only", virtualConsole: vc });
  Object.keys(memoria).forEach((k) => dom.window.localStorage.setItem(k, memoria[k]));
  dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: PREFISSO, firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = sessione.sdk();
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  await import("../desktop/app-v31.js?accesso=" + caricamenti);
  raccogli(dom);
  return dom;
}

const velo = (dom) => dom.window.document.querySelector("#veloAccesso31");
const visibile = (dom) => {
  const v = velo(dom);
  return !!v && v.style.display !== "none";
};
const testoVelo = (dom) => {
  const v = velo(dom);
  return v ? v.textContent.replace(/\s+/g, " ").trim() : "";
};
const bottone = (dom) => dom.window.document.querySelector("#veloAccesso31 button");

let sessione = creaSessioneFinta();
let pagina = null;

test("170.1 — primo avvio senza sessione: la carta chiede l'accesso, una volta", async () => {
  pagina = await carica(sessione);
  await attendiFinche(() => visibile(pagina), 4000, "la carta d'accesso del primo avvio");
  assert.equal(bottone(pagina).textContent, "Entra con Google", "senza email ricordata il tasto è quello di sempre");
  assert.match(testoVelo(pagina), /l'accesso resta su questo dispositivo/, "la carta dice cosa fa la pagina");
  assert.doesNotMatch(testoVelo(pagina), /niente viene salvato/, "la frase vecchia era falsa: la pagina ora scrive");
  assert.equal(sessione.accessi, 0, "la carta non deve aver già provato a entrare");
});

test("170.2 — l'accesso si fa: dell'utente resta ricordata solo l'email", async () => {
  bottone(pagina).dispatchEvent(new pagina.window.MouseEvent("click", { bubbles: true }));
  await attendiFinche(() => !visibile(pagina), 4000, "la carta che sparisce dopo l'accesso");
  assert.equal(sessione.accessi, 1, "un solo accesso");
  raccogli(pagina);
  assert.ok(memoria[CHIAVE_EMAIL], "l'email deve restare sul dispositivo (chiave " + CHIAVE_EMAIL + ")");
  const voce = JSON.parse(memoria[CHIAVE_EMAIL]);
  assert.deepEqual(Object.keys(voce).sort(), ["email", "quando"], "si ricorda l'email e quando, nient'altro");
  assert.equal(voce.email, EMAIL);
});

test("170.3 — secondo avvio con la sessione aperta: la carta non compare mai e non si rientra", async () => {
  pagina = await carica(sessione);
  /* Il momento che conta: subito dopo il caricamento, prima che l'SDK risponda. */
  assert.equal(visibile(pagina), false, "la carta non deve essere dipinta mentre l'SDK sta rispondendo (era il difetto)");
  await attendiFinche(() => /^collegato/.test((pagina.window.document.getElementById("st-sync-firebase") || {}).textContent || ""), 6000, "l'SDK che dice chi è entrato");
  assert.equal(visibile(pagina), false, "con la sessione aperta la carta resta nascosta");
  assert.equal(sessione.accessi, 1, "al secondo avvio non si entra di nuovo");
});

test("170.4 — se la sessione cade, la carta propone chi era entrata", async () => {
  sessione.utente = null; /* scaduta, o il browser ha svuotato la sessione */
  pagina = await carica(sessione);
  await attendiFinche(() => visibile(pagina), 4000, "la carta dopo la caduta della sessione");
  assert.equal(bottone(pagina).textContent, "Entra come " + EMAIL, "invece del modulo vuoto, l'ultima entrata");
  assert.match(testoVelo(pagina), /ricordo l'accesso su questo dispositivo/, "la carta dice in chiaro cosa ricorda");
  assert.equal(sessione.accessi, 1, "proporre non è entrare: nessun accesso nuovo");
});

test("170.5 — «Non sei tu?» toglie l'email ricordata, non la sessione", async () => {
  const cambia = [...pagina.window.document.querySelectorAll("#veloAccesso31 button")]
    .find((b) => /Non sei tu/.test(b.textContent));
  assert.ok(cambia && cambia.style.display !== "none", "con un'email ricordata il tasto «Non sei tu?» è visibile");
  cambia.dispatchEvent(new pagina.window.MouseEvent("click", { bubbles: true }));
  raccogli(pagina);
  assert.equal(bottone(pagina).textContent, "Entra con Google", "tornato il tasto neutro");
  assert.equal(memoria[CHIAVE_EMAIL], undefined, "l'email è stata dimenticata");
  assert.equal(sessione.uscite, 0, "«Non sei tu?» non è un'uscita: non c'era una sessione da chiudere");
});

test("170.6 — l'uscita esplicita chiude la sessione e cancella il promemoria", async () => {
  /* Si rientra (la carta è a schermo), poi si esce dal tasto in Impostazioni. */
  bottone(pagina).dispatchEvent(new pagina.window.MouseEvent("click", { bubbles: true }));
  await attendiFinche(() => !visibile(pagina), 4000, "l'accesso prima dell'uscita");
  assert.equal(sessione.accessi, 2);
  raccogli(pagina);
  assert.ok(memoria[CHIAVE_EMAIL], "l'email è stata ricordata di nuovo");

  /* Il tasto vive in Impostazioni e chiama questa: nel browser è `window`,
   * qui i moduli girano nel processo di Node. */
  assert.equal(typeof globalThis.BD_ESCI, "function", "l'uscita esplicita è esposta alla pagina");
  await globalThis.BD_ESCI();
  await attendiFinche(() => visibile(pagina), 4000, "la carta che torna dopo l'uscita");
  raccogli(pagina);
  assert.equal(sessione.uscite, 1, "una sola uscita");
  assert.equal(sessione.utente, null, "la sessione è chiusa davvero");
  assert.equal(memoria[CHIAVE_EMAIL], undefined, "uscire toglie anche l'email ricordata");
  assert.equal(bottone(pagina).textContent, "Entra con Google", "dopo l'uscita la carta riparte da zero");

  /* Il tasto vive in Impostazioni, accanto a «Firebase». */
  const tasto = pagina.window.document.getElementById("st-esci");
  assert.ok(tasto, "in Impostazioni c'è il tasto per uscire");
  assert.match(tasto.textContent, /Esci da questo dispositivo/);

  /* E l'avvio dopo chiede l'accesso come il primo giorno. */
  pagina = await carica(sessione);
  await attendiFinche(() => visibile(pagina), 4000, "la carta al primo avvio dopo l'uscita");
  assert.equal(bottone(pagina).textContent, "Entra con Google");
});

test("170.7 — nessuna password: il promemoria non può portarsela dietro", async () => {
  const { ricordaAccesso, promemoriaAccesso } = await import("../comune/promemoria-accesso.js");
  const finto = () => {
    const dentro = {};
    return {
      dentro,
      getItem: (k) => (k in dentro ? dentro[k] : null),
      setItem: (k, v) => { dentro[k] = String(v); },
      removeItem: (k) => { delete dentro[k]; }
    };
  };
  const storage = finto();
  const scritto = ricordaAccesso(storage, { uid: "uid-1", email: EMAIL, password: "segreta-mai-scritta" }, "2026-11-26T20:00:00.000Z");
  assert.equal(scritto.email, EMAIL);
  const grezzo = JSON.stringify(storage.dentro);
  assert.doesNotMatch(grezzo, /segreta-mai-scritta/, "una password eventualmente presente non viene copiata");
  assert.deepEqual(Object.keys(promemoriaAccesso(storage)).sort(), ["email", "quando"]);

  /* E nel codice dell'accesso non esiste nessun campo password da scrivere. */
  const sorgenti = ["desktop/app-v31.js", "comune/promemoria-accesso.js", "comune/accesso.js", "comune/firebase-client.js"]
    .map((f) => readFileSync(join(radice, f), "utf8"))
    .join("\n");
  assert.doesNotMatch(sorgenti, /password\s*[:=]/i, "nessuna assegnazione di password nei moduli dell'accesso");
  assert.doesNotMatch(sorgenti, /localStorage\.setItem\([^)]*pass/i, "nessuna password scritta nella memoria del dispositivo");
});
