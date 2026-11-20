/* 127d - 4d: «Applica sett./scarico a tutte le schede» sulla pagina viva.
 *
 * Cosa deve succedere, e cosa lo dimostra:
 *  1. il tasto della barra e' VIVO e apre la conferma con i numeri esatti:
 *     una riga per scheda, e la scheda corta dichiarata saltata;
 *  2. alla conferma lo scarico viene scritto nelle schede giuste, e la
 *     tabella ridisegnata lo MOSTRA (la settimana diventa colonna scarico);
 *  3. la scheda corta resta identica al byte;
 *  4. un solo Annulla rimette TUTTE le schede (la B torna al suo S2);
 *  5. Logbook e zona A non ricevono una sola scrittura: lo dice il finto.
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
const META = {
  id: "prg-4d", name: "Prova 4d", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 3, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const PROGRAMMA = {
  id: "prg-4d", name: "Prova 4d", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 3, versione: 3, rotation: ["A"],
  sheets: [{ id: "sh-A", code: "A", name: "Dorsali" }, { id: "sh-B", code: "B", name: "Petto" }, { id: "sh-C", code: "C", name: "Gambe" }]
};
const settimana = (n) => ({ week: n, sets: 4, reps: "10", rest: { seconds: 90 }, type: "normal", note: "", source: "manual" });
const sett = (quante) => Array.from({ length: quante }, (_, i) => settimana(i + 1));
const ESE = (id, nome, quante) => ({ id: id, name: nome, muscle: "dorsali", prescription: { rest: "1'" }, progression: { weeks: sett(quante) } });
const ID_A = "program-v2-sheet-prg-4d__sh-A";
const ID_B = "program-v2-sheet-prg-4d__sh-B";
const ID_C = "program-v2-sheet-prg-4d__sh-C";

/* La scheda B parte con uno scarico SUO (S2 al 30%): la conferma deve dire
 * che cosa toglie. La scheda C ha 3 settimane: S4 non ci sta, va saltata. */
const schedaDoc = (id, codice, nome, esercizi, pianoScarico) => ({
  id: id,
  dati: {
    programId: "prg-4d", sheetId: "sh-" + codice, kind: "sheet", versione: 1,
    sheet: Object.assign(
      { id: "sh-" + codice, code: codice, name: nome, updatedAt: "2026-11-02T18:12:00.000Z", exercises: esercizi },
      pianoScarico ? { pianoScarico: pianoScarico } : {}
    )
  }
});
const DATI = {
  radice: { quando: "2026-11-20T19:30:00.000Z", fonte: "prova 127d" },
  programmi: [
    { id: "program-v2-meta-prg-4d", dati: { programMeta: META } },
    { id: "prg-4d", dati: PROGRAMMA }
  ],
  schede: [
    schedaDoc(ID_A, "A", "Dorsali", [ESE("ex-1", "Trazioni assistite", 8), ESE("ex-2", "Lat machine", 8)]),
    schedaDoc(ID_B, "B", "Petto", [ESE("ex-9", "Panca piana", 8)], { settimana: 2, volume: 30 }),
    schedaDoc(ID_C, "C", "Gambe", [ESE("ex-20", "Squat", 3)])
  ],
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

const vc = new VirtualConsole();
vc.on("jsdomError", () => {});
const dom = new JSDOM(readFileSync(join(radice, "desktop", "index.html"), "utf8"), { runScripts: "outside-only", virtualConsole: vc });
const doc = dom.window.document;
const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [90, 30, 60], latenzaScrittura: 8 });
dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.v1.", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
globalThis.window = dom.window;
globalThis.document = doc;
await import("../desktop/app-v31.js");

const contenitore = doc.getElementById("programma-attivo");
const riquadro = () => contenitore.querySelector("[data-scarico-box]");
const esitoBox = () => contenitore.querySelector("[data-copia-esito] .pr-esito, .pr-esito");
const schedeCorpo = () => Array.from(contenitore.querySelectorAll("[data-pr-scheda]"));
const bottoneTesto = (t) => Array.from(contenitore.querySelectorAll("button"))
  .filter((b) => String(b.textContent || "").trim() === t)[0] || null;
const campoScarico = (chiave) => {
  const rq = schedeCorpo()[0];
  return rq ? rq.querySelector('[data-pr-c="' + chiave + '"]') : null;
};
const pianoDi = (id) => {
  const d = zona.datiDi("schede", id) || {};
  return (d.sheet && d.sheet.pianoScarico) || null;
};
const byteDi = (id) => JSON.stringify(zona.datiDi("schede", id) || {});
const scritture = () => (zona.registri && zona.registri.scritture) || [];
const percorsiScritti = () => scritture().map((w) => String(w.percorso || ""));

async function coda() {
  let quieto = 0;
  for (let i = 0; i < 90 && quieto < 4; i += 1) {
    const prima = scritture().length;
    await new Promise((r) => setTimeout(r, 40));
    if (scritture().length === prima) quieto += 1; else quieto = 0;
  }
}

/* La pagina si monta da sola: aspetto la tabella. */
await attendiFinche(() => contenitore.querySelectorAll("button").length > 4, 30000, "la pagina si e' montata (i tasti)");

const test1 = "127d.1 il tasto e' vivo: la conferma dice i numeri scheda per scheda e salta la scheda corta";
test(test1, async () => {
  const tasto = bottoneTesto("Applica sett./scarico a tutte le schede");
  assert.equal(Boolean(tasto), true, "il tasto non c'e'");
  assert.equal(tasto.disabled, false, "il tasto e' ancora spento");
  assert.equal(tasto.hasAttribute("data-scarico-tutte"), true);

  /* Alice scrive lo scarico nella scheda aperta: S4 al 50%. */
  const s = campoScarico("scarico-settimana");
  const v = campoScarico("scarico-volume");
  assert.equal(Boolean(s), true, "campo settimana mancante");
  s.value = "S4";
  v.value = "50";
  tasto.click();

  await attendiFinche(() => riquadro() && riquadro().querySelector("[data-scarico-conferma]"), 20000, "la conferma dello scarico si apre");
  const box = riquadro();
  assert.equal(Boolean(box), true, "la conferma non si e' aperta");
  const testo = String(box.textContent || "").replace(/\s+/g, " ");
  assert.match(testo, /Tocchi 2 schede/, "il conto delle schede non e' esatto: " + testo);
  const righe = Array.from(box.querySelectorAll("[data-scarico-riga]")).map((p) => String(p.textContent || "").replace(/\s+/g, " ").trim());
  assert.equal(righe.length, 3, "una riga per scheda: attese 3, trovate " + JSON.stringify(righe));
  assert.equal(righe.some((r) => /Scheda A: S4/.test(r)), true, "manca la riga della scheda A: " + JSON.stringify(righe));
  assert.equal(righe.some((r) => /Scheda B: S4/.test(r) && /toglie S2/.test(r)), true, "la riga della B non dice cosa toglie: " + JSON.stringify(righe));
  assert.equal(righe.some((r) => /Scheda C: ha 3 settimane/.test(r) && /saltata/.test(r)), true, "la scheda corta non e' dichiarata saltata: " + JSON.stringify(righe));
  assert.match(testo, /Il test non si copia/, "l'avviso sul test non c'e'");
});

const test2 = "127d.2 la conferma scrive lo scarico e la tabella ridisegnata lo mostra";
test(test2, async () => {
  const byteC = byteDi(ID_C);
  const ok = riquadro().querySelector("[data-scarico-conferma]");
  assert.equal(Boolean(ok), true, "il tasto di conferma non c'e'");
  ok.click();
  await coda();
  await attendiFinche(() => {
    const a = pianoDi(ID_A);
    const b = pianoDi(ID_B);
    return Boolean(a) && a.settimana === 4 && Boolean(b) && b.settimana === 4 && b.volume === 50;
  }, 20000, "le schede A e B prendono lo scarico S4 al 50%");
  assert.deepEqual(pianoDi(ID_A), { settimana: 4, volume: 50 }, "la scheda A non ha preso lo scarico");
  assert.deepEqual(pianoDi(ID_B), { settimana: 4, volume: 50 }, "la scheda B non ha preso lo scarico");
  assert.equal(pianoDi(ID_C), null, "la scheda corta e' stata toccata");
  assert.equal(byteDi(ID_C), byteC, "la scheda corta non e' identica al byte");
  /* Il disegno: dopo la rilettura la settimana S4 e' una colonna di scarico. */
  await attendiFinche(() => contenitore.querySelectorAll("td.sc-col, th.sc-col").length > 0, 20000, "la tabella ridisegnata mostra la colonna scarico");
  assert.equal(contenitore.querySelectorAll("td.sc-col, th.sc-col").length > 0, true, "la tabella ridisegnata non mostra lo scarico");
  /* Logbook e zona A: zero scritture. */
  const percorsi = percorsiScritti();
  assert.equal(percorsi.filter((p) => /registro/i.test(p)).length, 1, "la scrittura ha lasciato " + percorsi.filter((p) => /registro/i.test(p)).length + " voci di registro invece di una");
  assert.equal(percorsi.some((p) => /sedute|logbook|atleti|zona-a/i.test(p)), false, "scritture fuori dalle schede: " + JSON.stringify(percorsi));
});

const test3 = "127d.3 un solo Annulla rimette tutte le schede toccate";
test(test3, async () => {
  const tastoAnnulla = () => { const elenco = Array.from(contenitore.querySelectorAll("button.pg-undo")); return elenco.length ? elenco[elenco.length - 1] : null; };
  const annulla = tastoAnnulla();
  assert.equal(Boolean(annulla), true, "il tasto Annulla non c'e'");
  assert.equal(annulla.disabled, false, "l'Annulla e' spento dopo la scrittura");
  annulla.click();
  await coda();
  await attendiFinche(() => {
    const b = pianoDi(ID_B);
    return pianoDi(ID_A) === null && b && b.settimana === 2 && b.volume === 30;
  }, 20000, "l'Annulla rimette A e B");
  assert.equal(pianoDi(ID_A), null, "la scheda A non e' tornata com'era");
  assert.deepEqual(pianoDi(ID_B), { settimana: 2, volume: 30 }, "la scheda B non e' tornata al suo S2 30%");
  assert.equal(pianoDi(ID_C), null, "la scheda corta e' stata toccata dall'Annulla");
});
