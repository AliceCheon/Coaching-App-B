/* tests/111-programma-ricerca-id.test.mjs — PASSO 3d.
 *
 * Il rifiuto che non si capiva: «il programma scelto non e' fra quelli di B».
 * Il programma c'era, ma la pagina passava l'id DENTRO il documento
 * (`programMeta.id`) e l'editor cercava l'id del DOCUMENTO (`program-v2-meta-…`).
 * Qui si prova la ricerca per tutti e due, e il riquadro che dice il motivo
 * con il nome e il numero dei programmi di B.
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
import { pianificaAttivazione, pianificaBozza } from "../comune/attiva-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

/* La forma vera: il documento si chiama `program-v2-meta-prg111`, l'id del
 * programma sta dentro `programMeta.id`. L'editor aggiunge `idInterno`. */
const docB = (idInterno, extra) => Object.assign({
  id: "program-v2-meta-" + idInterno,
  idInterno: idInterno,
  programMeta: { id: idInterno, name: "Forza novembre", status: "active", active: true, daysPerWeek: 2, durationWeeks: 8, rotation: ["A", "B"] },
  status: "active",
  active: true,
  name: "Forza novembre",
  updatedAt: "2026-11-16T18:12:00.000Z"
}, extra || {});

test("111.1 «Metti in bozza» trova il programma con l'id che la pagina conosce", () => {
  const elenco = [docB("prg111")];
  const piano = pianificaBozza(elenco, "prg111", { quando: "2026-11-17T10:00:00.000Z" });
  assert.equal(piano.ok, true, "il programma si trova: " + piano.motivo);
  assert.equal(piano.daScrivere.length, 1, "una sola scrittura");
  assert.equal(piano.daScrivere[0].id, "program-v2-meta-prg111", "si scrive sul DOCUMENTO, non sull'id interno");
  assert.equal(piano.daScrivere[0].dati.status, "draft", "lo stato diventa bozza");
  assert.equal(piano.daScrivere[0].dati.active, false, "e active si spegne: due campi, sempre");
});

test("111.2 «Attiva» trova il programma con l'id interno e spegne l'altro", () => {
  const elenco = [
    docB("prgAltro", { name: "Vecchio", programMeta: { id: "prgAltro", name: "Vecchio", status: "active", active: true } }),
    docB("prg111")
  ];
  const piano = pianificaAttivazione(elenco, "prg111", { quando: "2026-11-17T10:00:00.000Z" });
  assert.equal(piano.ok, true, "si trova: " + piano.motivo);
  assert.equal(piano.daScrivere.length, 2, "spengo l'altro e accendo questo");
  assert.equal(piano.daScrivere[0].id, "program-v2-meta-prgAltro", "prima si spegne l'altro");
  assert.equal(piano.daScrivere[1].id, "program-v2-meta-prg111", "per ultimo si accende il prescelto");
  assert.deepEqual(piano.altri, ["Vecchio"], "l'altro attivo si nomina");
});

test("111.3 un id che non esiste davvero: rifiuto con il numero dei programmi di B", () => {
  const elenco = [docB("prg111"), docB("prg222")];
  const piano = pianificaBozza(elenco, "prgFantasma", {});
  assert.equal(piano.ok, false, "non si inventa un programma");
  assert.equal(piano.nonInB, true, "il rifiuto si riconosce: non e' un errore di scrittura");
  assert.equal(piano.quantiB, 2, "e porta il numero dei programmi di B: " + piano.quantiB);
  assert.equal(piano.daScrivere, undefined, "niente da scrivere");
});

test("111.4 pagina vera: il riquadro dice nome, numero e che non ha scritto niente", async () => {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const docT = dom.window.document;
  dom.window.setTimeout = () => 0;
  const meta = { id: "prg111", name: "Forza novembre", status: "active", active: true, daysPerWeek: 2, durationWeeks: 8, rotation: ["A", "B"] };
  const scheda = { id: "s-prg111-A", dati: { programId: "prg111", sheetId: "sh-A", kind: "sheet", sheet: { id: "sh-A", code: "A", name: "Dorsali A", exercises: [] } } };
  const mod = {
    attivo: true, annullabile: false,
    conta: () => ({ codice: "A", esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    svuotaProgramma: () => Promise.resolve({ ok: true }),
    onAttiva: () => Promise.resolve({ ok: true }),
    onBozza: () => Promise.resolve({ ok: false, nonInB: true, quantiB: 3, idScelto: "prgFantasma", motivo: "il programma scelto non e' fra quelli di B: non ho scritto niente" })
  };
  const contenitore = docT.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");
  const r = riepilogoProgramma(meta, [], { schedeV2: ricostruisciSchede([scheda]), indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 17)), quante: 8 });
  renderProgramma(docT, contenitore, { presente: true }, Object.assign({}, r, { modifica: mod }));
  const bozza = Array.from(contenitore.querySelectorAll(".pr-acts button")).filter((b) => b.textContent.trim() === "Metti in bozza")[0];
  assert.ok(bozza, "il tasto c'e'");
  bozza.click();
  const conferma = contenitore.querySelector('.pr-acts .pr-conf [data-igiene="bozza"]');
  assert.ok(conferma, "il riquadro di conferma si apre nella pagina");
  conferma.click();
  await new Promise((res) => setImmediate(res));
  const box = contenitore.querySelector(".pr-acts .pr-conf");
  assert.ok(box, "dopo il rifiuto si apre il riquadro del motivo");
  const testo = String(box.textContent || "").replace(/\s+/g, " ");
  assert.match(testo, /non e' fra i documenti di B/, "dice che non e' in B: " + testo);
  assert.match(testo, /Forza novembre/, "col nome del programma");
  assert.match(testo, /in B ce ne sono 3/, "e col numero dei programmi di B");
  assert.match(testo, /non ho toccato niente/, "e che non ha scritto niente");
  assert.doesNotMatch(testo, /scelto non e' fra quelli di B/, "non ripete la frase che non si capiva");
});
