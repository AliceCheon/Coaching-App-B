/* tests/108-pillola-in-arrivo.test.mjs — B.21 PASSO 3: la pillola «in arrivo».
 *
 * Richiesta di Alice (17/11/2026): sui controlli che restano spenti ma che ha
 * deciso di tenere, la pillola «in arrivo» sta DENTRO il tasto, a destra del
 * testo, con lo stesso taglio della vecchia pillola «demo». Il tooltip dice cosa
 * fara' il tasto quando ci sara'. Non va su «Suggerimenti: ON» (spento di
 * proposito, ha il suo tooltip) ne' su «Spiegazioni (4/4)» (pannello che resta).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma } from "../comune/programma.js";
import { ricostruisciSchede } from "../comune/schede-v2.js";
import { renderProgramma } from "../comune/vista-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const css = readFileSync(join(radice, "comune", "dashboard-b.css"), "utf8");

const meta = {
  id: "prg108", name: "Forza novembre", status: "active", active: true, phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-16T18:12:00.000Z"
};
const schedaDoc = () => ({ id: "s-prg108-A", dati: { programId: "prg108", sheetId: "sh-A", kind: "sheet", sheet: { id: "sh-A", code: "A", name: "Dorsali A", exercises: [] } } });

function scena() {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => ({ codice: "A", esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    svuotaProgramma: () => Promise.resolve({ ok: true })
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");
  const r = riepilogoProgramma(Object.assign({}, meta), [], {
    schedeV2: ricostruisciSchede([schedaDoc()]), indice: 0, totaleProgrammi: 1,
    oggi: new Date(Date.UTC(2026, 10, 16)), quante: 8
  });
  /* Caso (a): la vista NON riceve l'elenco degli scheletri. Il caso (b), con
   * l'elenco, sta nella 128.8 sulla pagina vera. */
  delete r.scheletri;
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  return { doc, contenitore, r };
}

/* Il tasto che contiene quella parola, dentro la zona indicata. */
function tasto(s, zona, parola) {
  const dentro = s.contenitore.querySelectorAll(zona + " button");
  const b = Array.from(dentro).find((x) => (x.textContent || "").indexOf(parola) !== -1);
  assert.ok(b, "manca il tasto \u00ab" + parola + "\u00bb in " + zona);
  return b;
}
const pillola = (b) => b.querySelector("i.pr-arrivo");

test("108.1 la pillola sta dentro i tasti che restano spenti", () => {
  const s = scena();
  [
    [".pr-acts", "Confronta con\u2026"],
    [".pr-acts", "Copia da Prog\u2026"],
    [".pr-acts", "Salva in Libreria"],
    [".pr-bar", "Periodizzazione"]
  ].forEach(([zona, parola]) => {
    const b = tasto(s, zona, parola);
    assert.equal(b.disabled, true, "\u00ab" + parola + "\u00bb resta spento");
    const p = pillola(b);
    assert.ok(p, "\u00ab" + parola + "\u00bb porta la pillola in arrivo");
    assert.equal(p.textContent, "in arrivo", "il testo della pillola e' \u00abin arrivo\u00bb");
    assert.equal(p.closest("button"), b, "la pillola sta DENTRO il tasto, non accanto");
  });
});

test("108.2 il tooltip dice cosa fara' il tasto", () => {
  const s = scena();
  const attesi = [
    [".pr-acts", "Confronta con\u2026", "affiancati"],
    [".pr-acts", "Copia da Prog\u2026", "copia gli esercizi"],
    [".pr-acts", "Salva in Libreria", "libreria"],
    [".pr-bar", "Periodizzazione", "otto settimane"]
  ];
  attesi.forEach(([zona, parola, pezzo]) => {
    const b = tasto(s, zona, parola);
    assert.ok(b.title.indexOf("in arrivo:") !== -1, "\u00ab" + parola + "\u00bb dice \u00abin arrivo:\u00bb nel tooltip");
    assert.ok(b.title.indexOf(pezzo) !== -1, "\u00ab" + parola + "\u00bb spiega cosa fa: manca \u00ab" + pezzo + "\u00bb in \u00ab" + b.title + "\u00bb");
    assert.ok(b.title.indexOf("spento") !== -1, "resta dichiarato spento");
  });
});

test("108.3 Suggerimenti resta spento e senza pillola; Spiegazioni ora apre (passo 33)", () => {
  const s = scena();
  const sug = tasto(s, ".pr-bar", "Suggerimenti: ON");
  assert.equal(sug.disabled, true, "\u00abSuggerimenti\u00bb resta spento in attesa della robottina");
  assert.equal(pillola(sug), null, "\u00abSuggerimenti\u00bb NON porta la pillola in arrivo");
  /* Passo 33: le quattro spiegazioni sono scritte e si aprono: il tasto non e'
     piu' spento, ma non porta nessuna pillola perche' non c'e' niente in arrivo. */
  const sp = tasto(s, ".pr-bar", "Spiegazioni (4/4)");
  assert.equal(sp.disabled, false, "\u00abSpiegazioni (4/4)\u00bb e' acceso: apre il pannello");
  assert.equal(pillola(sp), null, "\u00abSpiegazioni (4/4)\u00bb NON porta la pillola in arrivo");
});

test("108.4 senza elenco le linguette spente portano la pillola: Stress, Scheletri, Periodizzazione", () => {
  const s = scena();
  assert.equal(Array.isArray(s.r.scheletri), false, "questa prova guarda il caso senza elenco (la faccia con l'elenco sta nella 128.8)");
  const linguette = Array.from(s.contenitore.querySelectorAll(".pr-ntab-extra"));
  const trova = (parola) => linguette.find((b) => (b.textContent || "").indexOf(parola) === 0);
  [["Stress", "stress percepito"], ["Scheletri", "raccolta salvata in B"], ["Periodizzazione", "otto settimane"]].forEach(([parola, pezzo]) => {
    const b = trova(parola);
    assert.ok(b, "la linguetta " + parola + " c'e'");
    assert.equal(b.disabled, true, "la linguetta " + parola + " resta spenta");
    const p = pillola(b);
    assert.ok(p, "la linguetta " + parola + " porta la pillola in arrivo");
    assert.equal(p.closest("button"), b, "la pillola sta dentro la linguetta " + parola);
    assert.ok(b.title.indexOf("in arrivo:") !== -1, parola + " lo dichiara nel tooltip");
    assert.ok(b.title.indexOf(pezzo) !== -1, parola + " spiega cosa fa: manca " + pezzo + " in " + b.title);
  });
  const analisi = trova("Analisi programmazione");
  assert.ok(analisi, "la linguetta Analisi programmazione c'e'");
  assert.notEqual(analisi.disabled, true, "Analisi programmazione e' viva");
  assert.equal(pillola(analisi), null, "Analisi programmazione e' viva: niente pillola");
});


test("108.5 la regola CSS e' quella della pillola demo, in lilla", () => {
  assert.ok(/\.pr-arrivo\{/.test(css), "il foglio ha .pr-arrivo");
  const blocco = css.slice(css.indexOf(".pr-arrivo{"), css.indexOf(".pr-arrivo{") + 320);
  assert.ok(blocco.indexOf("font-size:8px") !== -1, "8px come la pillola demo");
  assert.ok(blocco.indexOf("text-transform:uppercase") !== -1, "maiuscoletto come la pillola demo");
  assert.ok(blocco.indexOf("#c9a7ff") !== -1, "lilla della palette");
});

test("108.6 la pillola non e' un tasto: nessun clic, nessun cambio di stato", () => {
  const s = scena();
  const b = tasto(s, ".pr-acts", "Salva in Libreria");
  const p = pillola(b);
  assert.equal(p.tagName.toLowerCase(), "i", "la pillola e' un <i>, non un <button>");
  assert.equal(b.getAttribute("aria-disabled"), "true", "il tasto resta dichiarato spento");
});
