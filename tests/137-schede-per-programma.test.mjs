/* tests/137-schede-per-programma.test.mjs — PASSO 9.
 *
 * Il doppio id: la zona B puo' legare le schede all'id del programma
 * (`prg900`) oppure all'id del DOCUMENTO (`program-v2-meta-prg900`).
 * `schedePerProgramma` e' la ricerca unica che usano il riepilogo del
 * programma e la carta RED-S. Qui si prova che le schede si trovano in tutti
 * e quattro i legami, che la pagina vera (Riepilogo volume e
 * Specializzazione) mostra le otto settimane con numeri veri, e che un
 * legame davvero assente resta dichiarato col motivo.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { riepilogoProgramma, schedePerProgramma } from "../comune/programma.js";
import { renderVolume } from "../comune/vista-volume.js";
import { renderSpecializzazione } from "../comune/vista-specializzazione.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");
const sorgenteReds = readFileSync(join(radice, "comune", "vista-reds.js"), "utf8");
const sorgenteProgramma = readFileSync(join(radice, "comune", "programma.js"), "utf8");

const meta = {
  id: "prg900", name: "Forza novembre", status: "active", active: true,
  daysPerWeek: 4, durationWeeks: 8, rotation: ["A", "B"]
};
const sett = (serie) => Array.from({ length: 8 }, (_, i) => ({ numero: i + 1, serie, ripetizioni: 10 }));
const schedaManica = (cod, esercizi) => ({ codice: cod, nome: "Seduta " + cod, esercizi });

/* La forma che la zona B produce quando lega le schede all'id del documento. */
function zonaBAlDocumento(idDoc) {
  const schede = [
    schedaManica("A", [
      { nome: "Rematore bilanciere", muscolo: "dorsali", settimane: sett(4) },
      { nome: "Trazioni", muscolo: "dorsali", settimane: sett(3) }
    ]),
    schedaManica("B", [{ nome: "Panca piana", muscolo: "pettorali", settimane: sett(4) }])
  ];
  return { perProgramma: { [idDoc]: { programId: idDoc, schede, archiviate: [] } } };
}

const opt = (schedeV2) => ({ schedeV2, indice: 0, totaleProgrammi: 1, oggi: new Date(Date.UTC(2026, 10, 4)), quante: 8 });

test("137.1 zona B legata all'id del documento: il riepilogo trova le schede e lo dichiara", () => {
  const r = riepilogoProgramma(meta, [], opt(zonaBAlDocumento("program-v2-meta-prg900")));
  assert.ok(Array.isArray(r.schede), "schede non e' piu' null");
  assert.equal(r.schede.length, 2, "le due sedute scritte nella zona B: " + r.schede.length);
  assert.equal(r.schedeMotivo, null, "non c'e' un motivo di vuoto: " + r.schedeMotivo);
  assert.match(String(r.fonteSchede), /legame: id del documento/, "la fonte dice come le ha legate: " + r.fonteSchede);
  assert.equal(r.legameSchede.come, "id del documento", "il legame e' dichiarato nel risultato");
  assert.equal(r.legameSchede.idCercato, "prg900", "l'id cercato e' quello del programma");
  assert.equal(r.legameSchede.legate, 2, "due schede legate su " + r.legameSchede.lette + " lette");
});

test("137.2 la ricerca unica copre i quattro legami, id esatto compreso", () => {
  const gruppo = (programId) => ({ programId, schede: [{ id: "s1" }], archiviate: [] });
  const casi = [
    [{ prg900: gruppo("prg900") }, "prg900", "id esatto"],
    [{ "program-v2-meta-prg900": gruppo("program-v2-meta-prg900") }, "prg900", "id del documento"],
    [{ "x-prg900": gruppo("x-prg900") }, "prg900", "id in coda alla chiave"],
    [{ prg900: gruppo("prg900") }, "program-v2-meta-prg900", "id nudo del documento"]
  ];
  casi.forEach(([per, id, come]) => {
    const c = schedePerProgramma({ perProgramma: per }, { id });
    assert.ok(c.gruppo, "trovato cercando " + id + " in " + Object.keys(per)[0]);
    assert.equal(c.come, come, "dichiarato: " + come);
    assert.equal(c.legate, 1, "e la scheda c'e'");
  });
});

test("137.3 legame davvero assente: il vuoto resta dichiarato col motivo", () => {
  const r = riepilogoProgramma(meta, [], opt(zonaBAlDocumento("program-v2-meta-prg-altro")));
  assert.equal(r.schede, null, "non si prende il programma di un'altra: schede null");
  assert.equal(r.schedeMotivo, "nessuna scheda letta per questo programma", "il motivo: " + r.schedeMotivo);
  assert.equal(r.legameSchede.legate, 0, "zero legate");
  assert.equal(r.legameSchede.lette, 2, "ma due lette: " + r.legameSchede.lette);
  assert.equal(r.legameSchede.come, null, "nessun legame da dichiarare");
});

test("137.4 pagina vera: Riepilogo volume e Specializzazione mostrano le otto settimane con numeri veri", () => {
  const r = riepilogoProgramma(meta, [], opt(zonaBAlDocumento("program-v2-meta-prg900")));
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const volume = doc.querySelector("#rv-vivo");
  const spec = doc.querySelector("#sp-corpo");
  assert.ok(volume, "la pagina vera ha #rv-vivo");
  assert.ok(spec, "la pagina vera ha #sp-corpo");
  renderVolume(doc, volume, r.schede, { quante: 8 });
  renderSpecializzazione(doc, spec, r.schede, { quante: 8 });
  const settimane = Array.from(volume.querySelectorAll(".rv-hh")).map((x) => x.textContent.trim()).filter((t) => /^S\d+$/.test(t));
  assert.deepEqual(settimane, ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"], "le otto settimane: " + settimane.join(" "));
  assert.equal(volume.querySelectorAll(".pg-vuoto").length, 0, "il volume non e' vuoto");
  const celle = Array.from(volume.querySelectorAll(".rv-hc")).map((x) => x.textContent.trim());
  assert.ok(celle.some((t) => /\d/.test(t)), "le celle portano numeri veri: " + celle.slice(0, 8).join(", "));
  const media = Array.from(volume.querySelectorAll(".rv-kpi *")).map((x) => x.textContent.trim()).join(" ");
  assert.doesNotMatch(media, /Media settimana\s*—/, "la media settimana non e' un trattino");
  assert.equal(spec.querySelectorAll(".pg-vuoto").length, 0, "la Specializzazione non e' vuota");
  assert.ok(spec.querySelector(".sp-kpi"), "e mostra i suoi KPI");
  assert.ok(spec.querySelectorAll(".sp-r").length >= 1, "con la classifica dei distretti");
});

test("137.5 una sola ricerca: vista-reds non tiene piu' il suo duplicato", () => {
  assert.match(sorgenteProgramma, /export function schedePerProgramma/, "programma.js la esporta");
  assert.equal((sorgenteProgramma.match(/PREFISSO_PROGRAMMA =/g) || []).length, 1, "un solo prefisso in tutto il progetto");
  assert.doesNotMatch(sorgenteReds, /function gruppoDelProgramma|function gruppiDiSchede|function contaSchede\b/, "via le copie locali");
  assert.doesNotMatch(sorgenteReds, /PREFISSO_PROGRAMMA/, "via anche il prefisso copiato");
  assert.match(sorgenteReds, /schedePerProgramma/, "la usa");
  assert.match(sorgenteReds, /from "\.\/programma\.js"/, "importandola da programma.js");
});
