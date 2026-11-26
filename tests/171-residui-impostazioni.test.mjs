/* Guardia 171 (passo 19) — i tre residui di Impostazioni e il cognome vero.
 *
 * Cosa difende, misurato sul codice di prima (b0.62):
 *  - il banner «Riporta il cognome» stava a schermo SEMPRE e il cognome era
 *    scritto a mano nel codice («Clemente»): un altro account avrebbe
 *    riportato il cognome sbagliato, e a cognome già scritto il banner
 *    restava lì per sempre, con «Cognome riportato» spento;
 *  - «Modifiche in coda» mostrava il conteggio di un vecchio elenco locale
 *    che su questa pagina non vuol dire più niente;
 *  - «Esporta modifiche» scaricava quel vecchio elenco (vuoto), non il
 *    registro vero che vive in B;
 *  - «Azzera modifiche locali» svuotava quel vecchio elenco senza dire prima
 *    cosa avrebbe toccato.
 *
 * Le prove, in fila come le fa Alice:
 *   171.1  cognome vuoto, account «Maria Rossi»: il banner c'è e il cognome
 *          da riportare è «Rossi», preso dall'account (non «Clemente»)
 *   171.2  la riga della coda dice la verità: 0 e la nota in chiaro
 *   171.3  esporta con il registro vuoto: nessun file, un messaggio chiaro
 *   171.4  azzera senza resti locali: dice che non c'è niente, non tocca né la
 *          sessione né la memoria del dispositivo, e non scrive in B
 *   171.5  «Riporta il cognome» scrive «Rossi» nel registro e il banner
 *          sparisce del tutto
 *   171.6  a cognome già nel registro il banner NON è a schermo
 *   171.7  esporta scarica il registro vero, dalla voce più vecchia
 *   171.8  azzera con resti locali: prima elenca, poi (alla conferma) toglie
 *          SOLO quelli — sessione e promemoria restano, B non si tocca
 *   171.9  con resti locali la riga della coda mostra il numero vero
 *
 * Il finto Firestore è quello della 168: la pagina è quella vera, l'SDK è
 * finto, e l'utente ha un nome e un cognome come un account Google.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { creaZonaBFinta, creaSdkFinto } from "./finti/zona-b-finta.mjs";
import { attendiFinche } from "./finti/attesa.mjs";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const PREFISSO = "bd-b.v1.";

/* L'account: un nome e un cognome, come li dà Google. Non è Alice: così una
 * costante «Clemente» nel codice si vedrebbe subito. */
const UTENTE = { uid: "maria-prova", email: "maria.prova@example.com", displayName: "Maria Rossi" };

/* La zona B minima che la pagina accetta come «completa» (come la 168):
 * fotografia, almeno un programma, una scheda e una seduta. */
function datiZona(registro) {
  return {
    radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 171" },
    programmi: [
      { id: "program-v2-meta-prg-171", dati: { programMeta: { id: "prg-171", name: "Prova 171", status: "active", phase: "Bulk", startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, rotation: ["A"] } } },
      { id: "prg-171", dati: { id: "prg-171", name: "Prova 171", status: "active", phase: "Bulk", startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, versione: 1, rotation: ["A"], sheets: [{ id: "sh-A", code: "A", name: "Dorsali" }] } }
    ],
    schede: [{
      id: "program-v2-sheet-prg-171__sh-A",
      dati: {
        programId: "prg-171", sheetId: "sh-A", kind: "sheet", versione: 1,
        sheet: { id: "sh-A", code: "A", name: "Dorsali", exercises: [{ id: "ex-1", name: "Lat machine", muscle: "dorsali", prescription: { rest: "1'" } }] }
      }
    }],
    esclusioni: [], registro: registro || [], scheletri: [],
    sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }]
  };
}

/* Le voci del registro, apposta FUORI ordine: la più nuova è la prima. */
const REGISTRO = [
  { id: "mod-cognome", dati: { tipo: "dati-anagrafica", campo: "cognome", prima: "", dopo: "Rossi", quando: "2026-11-20T10:00:00.000Z", versionePrima: 0, versioneDopo: 1 } },
  { id: "mod-serie", dati: { tipo: "modifica-serie-ripetizioni", campo: "A-1-s1", prima: "8", dopo: "10", quando: "2026-11-10T18:30:00.000Z", versionePrima: 2, versioneDopo: 3 } },
  { id: "mod-sesso", dati: { tipo: "dati-anagrafica", campo: "sesso", prima: "", dopo: "Donna", quando: "2026-11-02T09:00:00.000Z", versionePrima: 0, versioneDopo: 1 } }
];

async function carica(numero, opzioni = {}) {
  const o = opzioni || {};
  const zona = o.zona || creaZonaBFinta({ dati: datiZona(o.registro), latenzeLettura: [20, 10, 30], latenzaScrittura: 3 });
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(HTML, { url: "https://esempio.test/desktop/", runScripts: "outside-only", virtualConsole: vc });
  const win = dom.window;
  win.scrollTo = () => {};
  /* jsdom non sa leggere un Blob: si prende il contenuto al momento in cui il
   * file viene composto, come lo vedrebbe il disco. */
  const scaricati = [];
  class BlobFinto {
    constructor(parti, opzioni) { this.parti = Array.isArray(parti) ? parti : [parti]; this.type = opzioni && opzioni.type; }
    contenuto() { return this.parti.join(""); }
  }
  win.Blob = BlobFinto;
  win.URL.createObjectURL = (blob) => { scaricati.push(blob); return "blob:prova-" + scaricati.length; };
  win.URL.revokeObjectURL = () => {};
  Object.keys(o.locale || {}).forEach((k) => win.localStorage.setItem(k, o.locale[k]));
  win.BD_B = { nomeAppAuth: "B", prefissoChiavi: PREFISSO, firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  win.firebase = creaSdkFinto(zona, o.utente || UTENTE);
  globalThis.window = win;
  globalThis.document = win.document;
  await import("../desktop/app-v31.js?caricamento=171-" + numero);
  return { dom, win, doc: win.document, zona, scaricati };
}

const clic = (win, el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));
const banner = (doc) => doc.getElementById("dc-banner-cognome");
const bannerVisibile = (doc) => {
  const b = banner(doc);
  return !!b && !b.hidden && b.isConnected !== false;
};
const valoreAna = (doc, etichetta) => {
  const riga = [...doc.querySelectorAll('[data-pan="anagrafica"] .dc-f')]
    .find((f) => { const l = f.querySelector(".dc-lbl"); return l && String(l.textContent).trim() === etichetta; });
  const nodo = riga ? riga.querySelector(".dc-val") : null;
  return nodo ? String(nodo.textContent || "").trim() : "(assente)";
};

test("171.1 cognome vuoto: il banner c'è e prende il cognome dall'account", async () => {
  const { doc } = await carica(1);
  await attendiFinche(() => bannerVisibile(doc), 20000, "il banner del cognome non è comparso");
  const b = banner(doc);
  const testo = String(b.textContent || "");
  assert.match(testo, /Maria Rossi/, "il banner non nomina l'account in uso");
  assert.match(testo, /«Rossi»/, "il cognome da riportare non è quello dell'account");
  assert.doesNotMatch(testo, /Clemente/, "il cognome è ancora una costante nel codice");
  assert.equal(b.dataset.cognomeDaRiportare, "Rossi");
});

test("171.2 la riga «Modifiche in coda» dice la verità (zero, senza coda)", async () => {
  const { doc } = await carica(2);
  await attendiFinche(() => {
    const n = doc.getElementById("st-coda-nota");
    return n && String(n.textContent || "").trim().length > 0;
  }, 20000, "la nota della coda non è mai stata scritta");
  assert.equal(String(doc.getElementById("st-sync-queue").textContent).trim(), "0");
  const nota = String(doc.getElementById("st-coda-nota").textContent || "");
  assert.match(nota, /non c'è una coda da svuotare/);
  assert.match(nota, /B/);
});

test("171.3 esporta col registro vuoto: nessun file, un messaggio chiaro", async () => {
  const { win, doc, scaricati, zona } = await carica(3);
  await attendiFinche(() => doc.getElementById("st-esporta"), 20000, "Impostazioni non si è montata");
  clic(win, doc.getElementById("st-esporta"));
  await attendiFinche(() => String(doc.getElementById("st-esporta-nota").textContent || "").trim().length > 0, 20000, "esporta non ha risposto");
  const nota = String(doc.getElementById("st-esporta-nota").textContent || "");
  assert.match(nota, /registro delle modifiche è vuoto/i);
  assert.equal(scaricati.length, 0, "è stato scaricato un file vuoto");
  assert.equal(doc.getElementById("st-esporta").disabled, false);
  assert.equal(String(doc.getElementById("st-esporta").textContent).trim(), "Esporta modifiche");
  assert.deepEqual(zona.registri.scritture, [], "esportare non deve scrivere in B");
});

test("171.4 azzera senza resti locali: lo dice e non tocca niente", async () => {
  const { win, doc, zona } = await carica(4, {
    locale: { "firebase:authUser:prova:[B]": "sessione-finta", [PREFISSO + "accesso.email"]: JSON.stringify({ email: UTENTE.email, quando: "2026-11-25T08:00:00.000Z" }) }
  });
  await attendiFinche(() => doc.getElementById("st-azzera"), 20000, "Impostazioni non si è montata");
  clic(win, doc.getElementById("st-azzera"));
  await attendiFinche(() => String(doc.getElementById("st-azzera-nota").textContent || "").trim().length > 0, 20000, "azzera non ha risposto");
  const nota = String(doc.getElementById("st-azzera-nota").textContent || "");
  assert.match(nota, /Non c'è niente in locale da azzerare/);
  assert.match(nota, /i dati stanno in B/);
  /* Due secondi dopo (se avesse un timer), la memoria è intatta. */
  await attesa(120);
  assert.equal(win.localStorage.getItem("firebase:authUser:prova:[B]"), "sessione-finta");
  assert.ok(win.localStorage.getItem(PREFISSO + "accesso.email"), "il promemoria d'accesso è stato toccato");
  assert.deepEqual(zona.registri.scritture, [], "azzerare non deve scrivere in B");
});

test("171.5 «Riporta il cognome» scrive «Rossi» in B e il banner sparisce", async () => {
  const { win, doc, zona } = await carica(5);
  await attendiFinche(() => bannerVisibile(doc), 20000, "il banner del cognome non è comparso");
  const tasto = banner(doc).querySelector("button");
  assert.ok(tasto, "manca il tasto «Riporta il cognome»");
  clic(win, tasto);
  await attendiFinche(() => zona.registri.scritture.length > 0, 20000, "il cognome non è arrivato in B");
  const voce = zona.registri.scritture[0];
  assert.match(voce.percorso, /registro/);
  assert.equal(voce.dati.tipo, "dati-anagrafica");
  assert.equal(voce.dati.campo, "cognome");
  assert.equal(voce.dati.dopo, "Rossi", "il cognome scritto non è quello dell'account");
  assert.equal(voce.dati.prima, "");
  await attendiFinche(() => !bannerVisibile(doc), 20000, "il banner è rimasto a schermo dopo il salvataggio");
  assert.equal(valoreAna(doc, "Cognome"), "Rossi", "la riga Cognome non si è aggiornata");
  const esito = String(doc.getElementById("dc-ana-esito").textContent || "");
  assert.match(esito, /Salvato: Cognome · Rossi/);
  assert.equal(zona.registri.scritture.length, 1, "una sola voce: niente doppioni");
});

test("171.6 a cognome già nel registro il banner non è a schermo", async () => {
  const { doc } = await carica(6, { registro: REGISTRO });
  /* Il registro arriva dopo l'accesso: si aspetta il fatto, non il tempo. */
  await attendiFinche(() => valoreAna(doc, "Cognome") === "Rossi", 20000, "il cognome del registro non è arrivato alla riga");
  assert.equal(bannerVisibile(doc), false, "il banner del cognome è comparso con il cognome già scritto");
});

test("171.7 esporta scarica il registro vero, dalla voce più vecchia", async () => {
  const { win, doc, scaricati, zona } = await carica(7, { registro: REGISTRO });
  await attendiFinche(() => doc.getElementById("st-esporta"), 20000, "Impostazioni non si è montata");
  await attendiFinche(() => {
    const r = doc.getElementById("st-esporta-nota");
    return r != null;
  }, 5000, "manca la riga dell'esito");
  clic(win, doc.getElementById("st-esporta"));
  await attendiFinche(() => scaricati.length === 1, 20000, "esporta non ha preparato il file");
  const testoFile = scaricati[0].contenuto();
  const dati = JSON.parse(testoFile);
  assert.equal(dati.totale, 3);
  assert.equal(dati.modifiche.length, 3);
  assert.deepEqual(dati.modifiche.map((m) => m.data), [
    "2026-11-02T09:00:00.000Z",
    "2026-11-10T18:30:00.000Z",
    "2026-11-20T10:00:00.000Z"
  ], "le voci non sono dalla più vecchia alla più recente");
  const prima = dati.modifiche[0];
  assert.equal(prima.tipo, "dati-anagrafica");
  assert.equal(prima.campo, "sesso");
  assert.equal(prima.prima, "");
  assert.equal(prima.dopo, "Donna");
  assert.equal(prima.versione, 1);
  assert.equal(dati.modifiche[1].versione, 3);
  const nota = String(doc.getElementById("st-esporta-nota").textContent || "");
  assert.match(nota, /^Scaricato «Modifiche Barbell Diva B — \d{4}-\d{2}-\d{2}\.json»: 3 voci/);
  assert.deepEqual(zona.registri.scritture, [], "esportare non deve scrivere in B");
});

test("171.8 azzera con resti locali: prima elenca, poi toglie solo quelli", async () => {
  const { win, doc, zona } = await carica(8, {
    locale: {
      "firebase:authUser:prova:[B]": "sessione-finta",
      [PREFISSO + "accesso.email"]: JSON.stringify({ email: UTENTE.email, quando: "2026-11-25T08:00:00.000Z" }),
      "bd.edit.v27": JSON.stringify({ "A-1-s1": "10", "A-1-r1": "8" }),
      "bd.saved": "2026-11-20T10:00:00.000Z"
    }
  });
  await attendiFinche(() => doc.getElementById("st-azzera"), 20000, "Impostazioni non si è montata");
  const tasto = doc.getElementById("st-azzera");
  clic(win, tasto);
  await attendiFinche(() => String(doc.getElementById("st-azzera-nota").textContent || "").trim().length > 0, 20000, "azzera non ha elencato niente");
  let nota = String(doc.getElementById("st-azzera-nota").textContent || "");
  assert.match(nota, /Sto per togliere solo dal browser/);
  assert.match(nota, /2 voci/);
  assert.match(nota, /ultimo salvataggio locale/);
  assert.match(nota, /Confermi\?/);
  /* Il primo clic NON tocca niente: la conferma è un passo vero. */
  assert.ok(win.localStorage.getItem("bd.edit.v27"), "il primo clic ha già tolto le modifiche locali");
  assert.ok(win.localStorage.getItem("bd.saved"), "il primo clic ha già tolto l'ora del salvataggio");
  assert.equal(String(tasto.textContent).trim(), "Conferma: togli solo questi dati locali");
  /* La conferma. */
  clic(win, tasto);
  await attendiFinche(() => !win.localStorage.getItem("bd.edit.v27"), 20000, "le modifiche locali non sono state tolte");
  nota = String(doc.getElementById("st-azzera-nota").textContent || "");
  assert.match(nota, /Fatto: ho tolto 2 resti locali/);
  assert.equal(win.localStorage.getItem("bd.saved"), null);
  /* La sessione e il promemoria NON si toccano: si chiudono da «Esci». */
  assert.equal(win.localStorage.getItem("firebase:authUser:prova:[B]"), "sessione-finta");
  assert.ok(win.localStorage.getItem(PREFISSO + "accesso.email"), "il promemoria d'accesso è stato toccato");
  /* E B non è stata sfiorata. */
  assert.deepEqual(zona.registri.scritture, [], "azzerare non deve scrivere in B");
  /* La riga della coda torna a dire la verità. */
  assert.equal(String(doc.getElementById("st-sync-queue").textContent).trim(), "0");
});

test("171.9 con resti locali la coda mostra il numero vero", async () => {
  const { doc } = await carica(9, {
    locale: { "bd.edit.v27": JSON.stringify({ "A-1-s1": "10", "A-1-r1": "8", "A-2-nome": "Lat machine" }) }
  });
  await attendiFinche(() => {
    const n = doc.getElementById("st-coda-nota");
    return n && String(n.textContent || "").trim().length > 0;
  }, 20000, "la nota della coda non è mai stata scritta");
  assert.equal(String(doc.getElementById("st-sync-queue").textContent).trim(), "3");
  const nota = String(doc.getElementById("st-coda-nota").textContent || "");
  assert.match(nota, /Resti del vecchio salvataggio locale \(3 voci\)/);
});
