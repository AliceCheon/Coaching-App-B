/* tests/107-metti-in-bozza.test.mjs — B.21 PASSO 2c: il tasto dice l'azione.
 *
 * La richiesta di Alice: quando il programma e' attivo, il tasto a destra non
 * ripete «Attivo» (due «Attivo» uno accanto all'altro confondono): diventa
 * «Metti in bozza». Lo stato lo dice solo la riga col pallino. E il ciclo si
 * prova davvero sulla pagina vera: attivo → «Metti in bozza» → bozza →
 * «Attiva» → di nuovo attivo, con l'Annulla in tutti e due i passaggi.
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
import { creaEditorSchede } from "../comune/editor-schede-b.js";
import { ultimaAnnullabile } from "../comune/modifiche-b.js";
import { pianificaBozza, pianificaRipristino } from "../comune/attiva-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg107", name: "Forza novembre", status: "active", active: true, phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-16T18:12:00.000Z"
};
const schedaDoc = () => ({ id: "s-prg107-A", dati: { programId: "prg107", sheetId: "sh-A", kind: "sheet", sheet: { id: "sh-A", code: "A", name: "Dorsali A", exercises: [] } } });

function scena() {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  dom.window.setTimeout = () => 0;
  const chiamate = { attiva: [], bozza: [] };
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => ({ codice: "A", esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    svuotaProgramma: () => Promise.resolve({ ok: true }),
    onAttiva: (id) => { chiamate.attiva.push(id); return Promise.resolve({ ok: true, nome: "Forza novembre" }); },
    onBozza: (id) => { chiamate.bozza.push(id); return Promise.resolve({ ok: true, nome: "Forza novembre" }); }
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");
  function mostra(status) {
    contenitore.innerHTML = "";
    const r = riepilogoProgramma(Object.assign({}, meta, { status: status, active: status === "active" }), [], {
      schedeV2: ricostruisciSchede([schedaDoc()]), indice: 0, totaleProgrammi: 1,
      oggi: new Date(Date.UTC(2026, 10, 16)), quante: 8
    });
    renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
    return r;
  }
  return { doc, contenitore, chiamate, mostra };
}

const tasto = (s, parola) => Array.from(s.contenitore.querySelectorAll(".pr-acts button"))
  .filter((b) => b.textContent.trim() === parola)[0] || null;
const statoScritto = (s) => String((s.contenitore.querySelector(".pr-stato b") || {}).textContent || "").trim();
const riquadro = (s) => s.contenitore.querySelector(".pr-acts .pr-conf");

test("107.1 attivo: lo stato lo dice la riga, il tasto dice l'azione", () => {
  const s = scena();
  s.mostra("active");
  assert.equal(statoScritto(s), "Attivo", "la riga di stato dice Attivo");
  assert.equal(tasto(s, "Attivo"), null, "nessun tasto che ripete lo stato");
  const b = tasto(s, "Metti in bozza");
  assert.ok(b, "il tasto a destra dice cosa fa");
  assert.equal(b.disabled, false, "ed e' acceso");
  assert.match(String(b.title || ""), /bozza/i, "il tooltip dice cosa fa: " + b.title);
  const nelRiquadro = Array.from(s.contenitore.querySelectorAll(".pr-acts button")).map((x) => x.textContent.trim());
  assert.equal(nelRiquadro.filter((t) => t === "Attivo").length, 0, "due «Attivo» non ci sono piu': " + JSON.stringify(nelRiquadro));
});

test("107.2 il riquadro chiede il permesso e l'Annulla non scrive niente", () => {
  const s = scena();
  s.mostra("active");
  tasto(s, "Metti in bozza").click();
  const box = riquadro(s);
  assert.ok(box, "il riquadro si apre dentro la pagina");
  const testo = String(box.textContent || "").replace(/\s+/g, " ");
  assert.match(testo, /Metto \u00abForza novembre\u00bb in bozza in B\?/, "chiede il permesso col nome: " + testo);
  assert.match(testo, /Sul telefono di oggi non cambia niente: legge ancora A/, "dice che il telefono di oggi non cambia");
  assert.match(testo, /non lo vedr\u00e0 pi\u00f9/, "e che il telefono non lo vedra' piu'");
  assert.match(testo, /solo in bdB_atleti/, "dichiara la zona che tocca");
  box.querySelector('[data-igiene="annulla"]').click();
  assert.equal(riquadro(s), null, "il riquadro si chiude");
  assert.deepEqual(s.chiamate.bozza, [], "l'Annulla non scrive niente");
  assert.equal(statoScritto(s), "Attivo", "e lo stato resta quello");
});

test("107.3 conferma: il programma va in bozza, la riga lo dice, il tasto torna «Attiva»", () => {
  const s = scena();
  s.mostra("active");
  tasto(s, "Metti in bozza").click();
  riquadro(s).querySelector('[data-igiene="bozza"]').click();
  assert.deepEqual(s.chiamate.bozza, ["prg107"], "una chiamata, con l'id vero");
  assert.equal(riquadro(s), null, "il riquadro si chiude");
  s.mostra("draft");
  assert.equal(statoScritto(s), "In bozza", "la riga di stato diventa In bozza");
  assert.equal(tasto(s, "Metti in bozza"), null, "il tasto non dice piu' quella bozza");
  assert.ok(tasto(s, "Attiva"), "torna «Attiva»: e' l'azione possibile adesso");
  const guida = String(s.contenitore.textContent || "").replace(/\s+/g, " ");
  assert.match(guida, /Il telefono non la vede/, "la pagina dichiara che il telefono non la vede: " + guida);
});

test("107.4 dalla bozza si riattiva, e l'Annulla anche qui non scrive", () => {
  const s = scena();
  s.mostra("draft");
  assert.equal(statoScritto(s), "In bozza");
  tasto(s, "Attiva").click();
  const box = riquadro(s);
  box.querySelector('[data-igiene="annulla"]').click();
  assert.deepEqual(s.chiamate.attiva, [], "l'Annulla non scrive niente");
  assert.equal(statoScritto(s), "In bozza", "e la bozza resta bozza");
  tasto(s, "Attiva").click();
  riquadro(s).querySelector('[data-igiene="attiva"]').click();
  assert.deepEqual(s.chiamate.attiva, ["prg107"], "una chiamata, con l'id vero");
  s.mostra("active");
  assert.equal(statoScritto(s), "Attivo", "si torna attivo");
  assert.ok(tasto(s, "Metti in bozza"), "e il tasto torna quello dell'azione opposta");
});

/* ---------- il modello ---------- */

const ATTIVO = { id: "p2", name: "Bulk", status: "active", active: true, updatedAt: "2026-10-01T08:00:00.000Z" };
const ALTRO = { id: "p1", name: "Forza", status: "available", active: false, updatedAt: "2026-11-01T08:00:00.000Z" };

test("107.5 il piano mette in bozza spegnendo status E active, e non tocca gli altri", () => {
  const piano = pianificaBozza([ATTIVO, ALTRO], "p2", { quando: "2026-11-16T10:00:00.000Z" });
  assert.equal(piano.ok, true);
  assert.equal(piano.gia, false);
  assert.equal(piano.daScrivere.length, 1, "un documento solo");
  assert.equal(piano.daScrivere[0].id, "p2");
  assert.equal(piano.daScrivere[0].dati.status, "draft");
  assert.equal(piano.daScrivere[0].dati.active, false, "active:true va spento, non basta lo status");
  assert.equal(piano.voce.tipo, "bozza-programma");
  assert.equal(piano.voce.campo, "programma");
  assert.equal(piano.voce.prima[0].status, "active", "la voce porta il valore di prima");
  assert.equal(piano.voce.dopoTesto, "programma in bozza: Bulk");

  const gia = pianificaBozza([{ id: "p3", name: "Gia' bozza", status: "draft" }], "p3", {});
  assert.equal(gia.gia, true, "chi e' gia' in bozza non si riscrive");
  assert.equal(gia.daScrivere.length, 0);
  const arch = pianificaBozza([{ id: "p4", name: "Vecchio", status: "archived" }], "p4", {});
  assert.equal(arch.ok, false, "un archiviato si rifiuta");
  assert.match(arch.motivo, /archiviato/);
});

function dbFinto(programmi) {
  const percorsi = [];
  const scaffale = new Map();
  (programmi || []).forEach((p) => scaffale.set("programmi/" + p.id, JSON.parse(JSON.stringify(p))));
  function sotto(nome) {
    return {
      doc: (id) => ({
        get: async () => (scaffale.has(nome + "/" + id)
          ? { exists: true, data: () => JSON.parse(JSON.stringify(scaffale.get(nome + "/" + id))) }
          : { exists: false, data: () => null }),
        set: async (nuovi) => {
          percorsi.push("bdB_atleti/uid/" + nome + "/" + id);
          scaffale.set(nome + "/" + id, JSON.parse(JSON.stringify(nuovi || {})));
        }
      }),
      get: async () => ({
        docs: Array.from(scaffale.keys()).filter((k) => k.indexOf(nome + "/") === 0).map((k) => {
          const id = k.slice(nome.length + 1);
          return { id: id, data: () => JSON.parse(JSON.stringify(scaffale.get(k))) };
        })
      })
    };
  }
  const db = {
    collection: (zona) => {
      assert.equal(zona, "bdB_atleti", "l'unica collezione ammessa e' la zona B");
      return { doc: () => ({ collection: (nome) => sotto(nome), set: async (nuovi) => { percorsi.push("bdB_atleti/uid"); scaffale.set("radice", nuovi); } }) };
    }
  };
  return { db, percorsi, scaffale };
}

test("107.6 l'editor scrive in bdB_atleti, una voce, e l'Annulla rimette attivo", async () => {
  const f = dbFinto([JSON.parse(JSON.stringify(ATTIVO)), JSON.parse(JSON.stringify(ALTRO))]);
  const editor = creaEditorSchede({
    db: f.db, uid: "uid", documenti: [], scadenzaVoceMs: 2000,
    orologio: () => "2026-11-16T10:00:00.000Z"
  });
  const esito = await editor.mettiInBozza("p2");
  assert.equal(esito.ok, true, JSON.stringify(esito));
  assert.equal(esito.nome, "Bulk");
  f.percorsi.forEach((p) => assert.ok(p.indexOf("bdB_atleti/") === 0, "scrittura fuori dalla zona B: " + p));
  assert.equal(f.scaffale.get("programmi/p2").status, "draft");
  assert.equal(f.scaffale.get("programmi/p2").active, false);
  assert.equal(f.scaffale.get("programmi/p1").status, "available", "l'altro programma non si tocca");
  const voci = Array.from(f.scaffale.keys()).filter((k) => k.indexOf("registro/") === 0);
  assert.equal(voci.length, 1, "una voce sola di registro");
  assert.equal(f.scaffale.get(voci[0]).tipo, "bozza-programma");

  const registroPrima = voci.map((k) => ({ id: k.slice("registro/".length), dati: f.scaffale.get(k) }));
  const ultimaPrima = ultimaAnnullabile(registroPrima);
  assert.equal(ultimaPrima && ultimaPrima.tipo, "bozza-programma", "l'Annulla sopravvive alla ricarica");

  const undo = await editor.annulla();
  assert.equal(undo.ok, true, JSON.stringify(undo));
  assert.equal(f.scaffale.get("programmi/p2").status, "active", "p2 torna attivo");
  assert.equal(f.scaffale.get("programmi/p2").active, true);
  assert.equal(undo.voce.dopoTesto, "programma in bozza rimesso com'era", "l'Annulla dice cosa ha rimesso: " + undo.voce.dopoTesto);
  const ripristino = pianificaRipristino(ultimaPrima, [f.scaffale.get("programmi/p2")]);
  assert.equal(ripristino.ok, true);
  assert.equal(ripristino.daScrivere[0].dati.status, "active");
});
