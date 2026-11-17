/* tests/105-attiva-programma.test.mjs — B.21 PASSO 2a: «Attiva» vivo, in B.
 *
 * Quattro test sulla pagina vera (il tasto e il riquadro sono quelli che Alice
 * vede) e quattro sul modello e sulla scrittura:
 *  - si attiva uno e si spegne l'altro, sempre scrivendo status E active;
 *  - una bozza si puo' attivare, un archiviato no;
 *  - nessuna scrittura fuori da bdB_atleti (il finto db rifiuta altro);
 *  - una voce di registro, e l'Annulla la rimette com'era (anche dopo ricarica).
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
import { pianificaAttivazione, pianificaRipristino, eAttivo } from "../comune/attiva-programma.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagina = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const meta = {
  id: "prg105", name: "Forza novembre", status: "available", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 2, rotation: ["A", "B"],
  description: "", createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const schedaDoc = () => ({ id: "s-prg105-A", dati: { programId: "prg105", sheetId: "sh-A", kind: "sheet", sheet: { id: "sh-A", code: "A", name: "Dorsali A", exercises: [] } } });

function paginaVera(status) {
  const dom = new JSDOM(pagina, { url: "https://alicecheon.github.io/Coaching-App-B/desktop/" });
  const doc = dom.window.document;
  const win = dom.window;
  win.setTimeout = () => 0;
  const attivate = [];
  const mod = {
    attivo: true,
    annullabile: false,
    conta: () => ({ codice: "A", esercizi: 0, tecniche: 0, righe: 0, modifiche: 0 }),
    onCambia: () => Promise.resolve({ ok: true }),
    svuotaProgramma: () => Promise.resolve({ ok: true }),
    onAttiva: (id) => { attivate.push(id); return Promise.resolve({ ok: true, nome: "Forza novembre" }); }
  };
  const contenitore = doc.querySelector("#programma-attivo");
  assert.ok(contenitore, "la pagina vera ha #programma-attivo");
  const r = riepilogoProgramma(Object.assign({}, meta, { status: status || meta.status }), [], {
    schedeV2: ricostruisciSchede([schedaDoc()]), indice: 0, totaleProgrammi: 2,
    oggi: new Date(Date.UTC(2026, 10, 16)), quante: 8
  });
  renderProgramma(doc, contenitore, { presente: true, numeroSedute: 0 }, Object.assign({}, r, { modifica: mod }));
  return { doc, attivate, contenitore };
}

const tasto = (s, parola) => Array.from(s.contenitore.querySelectorAll(".pr-acts button")).filter((b) => b.textContent.trim() === parola)[0] || null;

test("105.1 sulla pagina vera «Attiva» e' acceso e dice cosa fa", () => {
  const s = paginaVera();
  const b = tasto(s, "Attiva");
  assert.ok(b, "il tasto sta nella carta del programma");
  assert.equal(b.disabled, false, "ed e' acceso");
  assert.match(String(b.title || ""), /attivo/i, "il tooltip dice cosa fa: " + b.title);
});

test("105.2 il riquadro dice «in B» e che il telefono di oggi legge A", () => {
  const s = paginaVera();
  tasto(s, "Attiva").click();
  const box = s.contenitore.querySelector(".pr-acts .pr-conf");
  assert.ok(box, "il riquadro si apre dentro la pagina, non in una finestrella del browser");
  const testo = String(box.textContent || "").replace(/\s+/g, " ");
  assert.match(testo, /Rendi attivo «Forza novembre» in B\?/, "chiede il permesso col nome: " + testo);
  assert.match(testo, /Il telefono di oggi legge ancora i programmi di A/, "dice la tempistica vera");
  assert.match(testo, /giorno del cambio/, "e quando si vedra'");
  assert.match(testo, /solo in bdB_atleti/, "dichiara la zona che tocca");
  assert.equal(s.attivate.length, 0, "aprire il riquadro non scrive niente");
});

test("105.3 solo il tasto rosso attiva, e chiama l'editor con l'id del programma", () => {
  const s = paginaVera();
  tasto(s, "Attiva").click();
  const box = s.contenitore.querySelector(".pr-acts .pr-conf");
  const conferma = box.querySelector('[data-igiene="attiva"]');
  assert.ok(conferma, "c'e' il tasto di conferma");
  conferma.click();
  assert.deepEqual(s.attivate, ["prg105"], "una chiamata, con l'id vero");
  assert.equal(s.contenitore.querySelector(".pr-acts .pr-conf"), null, "il riquadro si chiude");
});

test("105.4 su chi e' gia' attivo il tasto dice l'azione, non lo stato", () => {
  const s = paginaVera("active");
  assert.equal(tasto(s, "Attiva"), null, "niente tasto Attiva su chi e' gia' attivo");
  assert.equal(tasto(s, "Attivo"), null, "nessun tasto che ripete lo stato: lo dice la riga col pallino");
  const b = tasto(s, "Metti in bozza");
  assert.ok(b, "il tasto dice cosa si puo' fare: \u00abMetti in bozza\u00bb");
  assert.equal(b.disabled, true, "spento quando la pagina non sa scrivere in bozza");
  assert.match(String(b.title || ""), /bozza/i, "il tooltip dice cosa fa: " + b.title);
  b.click();
  assert.equal(s.contenitore.querySelector(".pr-conf"), null, "nessun riquadro");
  assert.equal(s.attivate.length, 0, "nessuna scrittura");
});

/* ---------- il modello e la scrittura ---------- */

const P1 = { id: "p1", name: "Forza", status: "available", updatedAt: "2026-11-01T08:00:00.000Z" };
const P2 = { id: "p2", name: "Bulk", status: "active", active: true, updatedAt: "2026-10-01T08:00:00.000Z" };

test("105.5 il piano attiva uno e spegne l'altro, scrivendo status E active", () => {
  const piano = pianificaAttivazione([P1, P2], "p1", { quando: "2026-11-16T10:00:00.000Z" });
  assert.equal(piano.ok, true);
  assert.equal(piano.gia, false);
  assert.deepEqual(piano.altri, ["Bulk"], "l'altro attivo e' dichiarato");
  const per = Object.fromEntries(piano.daScrivere.map((t) => [t.id, t.dati]));
  assert.equal(per.p1.status, "active");
  assert.equal(per.p1.active, true);
  assert.equal(per.p2.status, "available");
  assert.equal(per.p2.active, false, "active:true va spento, non basta lo status");
  assert.equal(eAttivo(per.p1), true);
  assert.equal(eAttivo(per.p2), false);
  assert.equal(piano.daScrivere[piano.daScrivere.length - 1].id, "p1", "il prescelto si scrive per ultimo");
  assert.equal(piano.voce.tipo, "attiva-programma");
  assert.equal(piano.voce.prima.length, 2, "la voce porta i due valori di prima");
});

test("105.6 una bozza si attiva, un archiviato no", () => {
  const bozza = pianificaAttivazione([{ id: "p3", name: "Bozza", status: "draft" }], "p3", {});
  assert.equal(bozza.ok, true, "una bozza si puo' attivare");
  assert.equal(bozza.daScrivere[0].dati.status, "active");
  const arch = pianificaAttivazione([{ id: "p4", name: "Vecchio", status: "archived" }], "p4", {});
  assert.equal(arch.ok, false, "un archiviato si rifiuta");
  assert.match(arch.motivo, /archiviato/);
  const gia = pianificaAttivazione([P2], "p2", {});
  assert.equal(gia.gia, true, "chi e' gia' attivo non si riscrive");
  assert.equal(gia.daScrivere.length, 0);
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

test("105.7 l'editor scrive solo in bdB_atleti, una voce di registro, e Annulla rimette com'era", async () => {
  const f = dbFinto([JSON.parse(JSON.stringify(P1)), JSON.parse(JSON.stringify(P2))]);
  const editor = creaEditorSchede({
    db: f.db, uid: "uid", documenti: [], scadenzaVoceMs: 2000,
    orologio: () => "2026-11-16T10:00:00.000Z"
  });
  const esito = await editor.attivaProgramma("p1");
  assert.equal(esito.ok, true, JSON.stringify(esito));
  assert.equal(esito.nome, "Forza");
  assert.deepEqual(esito.altri, ["Bulk"]);
  assert.ok(f.percorsi.length >= 3, "due programmi e una voce: " + JSON.stringify(f.percorsi));
  f.percorsi.forEach((p) => assert.ok(p.indexOf("bdB_atleti/") === 0, "scrittura fuori dalla zona B: " + p));
  assert.equal(f.scaffale.get("programmi/p1").status, "active");
  assert.equal(f.scaffale.get("programmi/p2").status, "available");
  assert.equal(f.scaffale.get("programmi/p2").active, false);
  const voci = Array.from(f.scaffale.keys()).filter((k) => k.indexOf("registro/") === 0);
  assert.equal(voci.length, 1, "una voce sola di registro");
  const voce = f.scaffale.get(voci[0]);
  assert.equal(voce.tipo, "attiva-programma");
  assert.equal(voce.campo, "programma");

  /* Ricarica: l'Annulla si rilegge dal registro e c'e' ancora. */
  const registroPrima = Array.from(f.scaffale.keys()).filter((k) => k.indexOf("registro/") === 0)
    .map((k) => ({ id: k.slice("registro/".length), dati: f.scaffale.get(k) }));
  const ultimaPrima = ultimaAnnullabile(registroPrima);
  assert.equal(ultimaPrima && ultimaPrima.tipo, "attiva-programma", "l'Annulla sopravvive alla ricarica");

  /* Annulla: si rimette com'era, e la voce nuova dice che ha annullato quella. */
  const undo = await editor.annulla();
  assert.equal(undo.ok, true, JSON.stringify(undo));
  assert.equal(f.scaffale.get("programmi/p1").status, "available", "p1 torna disponibile");
  assert.equal(f.scaffale.get("programmi/p2").status, "active", "p2 torna attivo");
  assert.equal(f.scaffale.get("programmi/p2").active, true);
  const dopo = Array.from(f.scaffale.keys()).filter((k) => k.indexOf("registro/") === 0).map((k) => f.scaffale.get(k));
  assert.equal(dopo.length, 2, "la storia resta: due voci, niente cancellato");
  const nuova = dopo.filter((v) => v && v.tipo === "annulla-modifica")[0];
  assert.ok(nuova, "c'e' la voce di annullamento");
  assert.equal(nuova.annullaDi, voce.idVoce);
  const ripristino = pianificaRipristino(ultimaPrima, [f.scaffale.get("programmi/p1"), f.scaffale.get("programmi/p2")]);
  assert.equal(ripristino.ok, true);
  assert.equal(ripristino.daScrivere.filter((x) => x.id === "p2")[0].dati.status, "active");
});
