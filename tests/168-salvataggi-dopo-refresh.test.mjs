/* Guardia 168 (passo 17) — i salvataggi tornano dopo il refresh.
 *
 * Il giro completo, con il finto Firestore che sopravvive ai due caricamenti:
 *   168.1  scrivo anagrafica e quaderno, il registro riceve le voci
 *   168.2  "refresh" (pagina nuova, stessi dati): i campi mostrano i valori
 *   168.3  la scelta (Sesso) torna accesa
 *   168.4  la versione riparte dal registro, non da zero: la voce nuova è v2
 *
 * Prima della correzione (b0.59) la 168.2 e la 168.3 cadevano: la pagina
 * leggeva il registro come elenco di voci piatte mentre arriva come
 * `{ id, dati }`, quindi `anagraficaDalRegistro` e `quadernoDalRegistro`
 * non trovavano niente e i campi mostravano «—». L'anagrafica, in più, non
 * veniva mai riempita dal registro: solo dalla memoria di sessione.
 *
 * La seconda pagina si carica con un indirizzo diverso del modulo: è un
 * caricamento nuovo davvero (stato di modulo azzerato), come il refresh.
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

const META = {
  id: "prg-viva", name: "Prova pagina viva", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, description: "", message: "",
  rotation: ["A"], createdAt: "2026-09-28T09:00:00.000Z", updatedAt: "2026-11-02T18:12:00.000Z"
};
const PROGRAMMA = {
  id: "prg-viva", name: "Prova pagina viva", status: "active", phase: "Bulk",
  startDate: "2026-10-05", durationWeeks: 8, daysPerWeek: 4, versione: 3, rotation: ["A"],
  sheets: [{ id: "sh-A", code: "A", name: "Dorsali" }]
};
const ESE = (id, nome) => ({ id: id, name: nome, muscle: "dorsali", prescription: { rest: "1'" } });
const DATI = {
  radice: { quando: "2026-11-05T09:00:00.000Z", fonte: "prova 168" },
  programmi: [
    { id: "program-v2-meta-prg-viva", dati: { programMeta: META } },
    { id: "prg-viva", dati: PROGRAMMA }
  ],
  schede: [{
    id: "program-v2-sheet-prg-viva__sh-A",
    dati: {
      programId: "prg-viva", sheetId: "sh-A", kind: "sheet", versione: 1,
      sheet: { id: "sh-A", code: "A", name: "Dorsali", updatedAt: "2026-11-02T18:12:00.000Z", exercises: [ESE("ex-1", "Lat machine")] }
    }
  }],
  /* La zona B è «completa» con almeno una seduta: senza, la pagina dichiara
   * «manca le sedute» e non monta niente (non è il guasto di questo passo). */
  sedute: [{ id: "sed-1", dati: { session: { id: "sed-1", dateInput: "2026-10-26", sessionCode: "A", exercises: [{ name: "Lat machine", kg: 40 }] } } }],
  esclusioni: [], registro: [], scheletri: []
};

const zona = creaZonaBFinta({ dati: DATI, latenzeLettura: [30, 15, 45], latenzaScrittura: 5 });

/* Un caricamento della pagina come lo fa il browser: DOM nuovo, moduli nuovi,
 * stesso Firestore (le voci scritte restano). */
async function carica(numero) {
  const vc = new VirtualConsole();
  vc.on("jsdomError", () => {});
  const dom = new JSDOM(HTML, { runScripts: "outside-only", virtualConsole: vc });
  dom.window.BD_B = { nomeAppAuth: "B", prefissoChiavi: "bd-b.prova" + numero + ".", firebase: { projectId: "prova", apiKey: "prova", appId: "prova:prova" } };
  dom.window.firebase = creaSdkFinto(zona, { uid: "alice-prova" });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  await import("../desktop/app-v31.js?caricamento=" + numero);
  return dom;
}

async function coda() {
  let quieto = 0;
  await attendiFinche(() => {
    if (zona.inVolo() === 0) quieto += 10; else quieto = 0;
    return quieto >= 400;
  }, 20000, "la coda delle scritture non si è mai svuotata");
}

const rigaAna = (doc, etichetta) => [...doc.querySelectorAll('[data-pan="anagrafica"] .dc-f')]
  .find((f) => { const l = f.querySelector(".dc-lbl"); return l && String(l.textContent).trim() === etichetta; }) || null;
const valoreAna = (doc, etichetta) => {
  const riga = rigaAna(doc, etichetta);
  if (!riga) return "(riga assente)";
  const nodo = riga.querySelector(".dc-val");
  return nodo ? String(nodo.textContent || "").trim() : "(valore assente)";
};
const rigaQuaderno = (doc, etichetta) => [...doc.querySelectorAll('[data-pan="anamnesi"] .dc-f')]
  .find((f) => { const l = f.querySelector(".dc-lbl"); return l && String(l.textContent).trim() === etichetta; }) || null;
const valoreQuaderno = (doc, etichetta) => {
  const riga = rigaQuaderno(doc, etichetta);
  if (!riga) return "(riga assente)";
  const nodo = riga.querySelector(".dc-val");
  return nodo ? String(nodo.textContent || "").trim() : "(valore assente)";
};
const tastoScelta = (doc, testo) => {
  const gruppo = [...doc.querySelectorAll(".dc-seg")].find((g) => [...g.querySelectorAll("button")].some((b) => String(b.textContent).trim() === testo));
  return gruppo ? [...gruppo.querySelectorAll("button")].find((b) => String(b.textContent).trim() === testo) || null : null;
};
/* Un clic vero: il gestore ascolta "click", non serve altro. */
const clic = (win, el) => el.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));

const PESO = "Peso (kg)";
const SONNO = "Come dormi e quante ore";
const PESO_SCRITTO = "62";
const SONNO_SCRITTO = "Sette ore, sveglia alle 6";

test("168.1 scrivendo, la voce finisce nel registro", async () => {
  const dom = await carica(1);
  const doc = dom.window.document;
  await attendiFinche(() => doc.getElementById("dc-ana-esito"), 20000, "l'anagrafica non si è montata");
  await coda();

  /* Sesso: un tasto a scelta */
  const donna = tastoScelta(doc, "Donna");
  assert.ok(donna, "manca il tasto «Donna»");
  clic(dom.window, donna);
  await coda();

  /* Peso: il riquadro si apre e si salva */
  const peso = rigaAna(doc, PESO);
  assert.ok(peso, "manca la riga «" + PESO + "»");
  clic(dom.window, peso.querySelector(".dc-val"));
  const casella = peso.querySelector("input");
  assert.ok(casella, "il riquadro del peso non si è aperto");
  casella.value = PESO_SCRITTO;
  clic(dom.window, [...peso.querySelectorAll("button")].find((b) => String(b.textContent).trim() === "Salva"));
  await coda();

  /* Quaderno: sonno */
  const sonno = rigaQuaderno(doc, SONNO);
  assert.ok(sonno, "manca la riga «" + SONNO + "»");
  clic(dom.window, sonno.querySelector(".dc-val"));
  const area = sonno.querySelector("textarea");
  assert.ok(area, "la casella del sonno non si è aperta");
  area.value = SONNO_SCRITTO;
  clic(dom.window, [...sonno.querySelectorAll("button")].find((b) => String(b.textContent).trim() === "Salva"));
  await coda();

  const voci = zona.elencoDi("registro");
  const delPeso = voci.filter((v) => v.dati && v.dati.tipo === "dati-anagrafica" && v.dati.campo === "peso");
  const delSonno = voci.filter((v) => v.dati && v.dati.tipo === "anamnesi-campo" && v.dati.campo === "sonno");
  assert.equal(delPeso.length, 1, "il peso non è nel registro: " + JSON.stringify(voci.map((v) => v.id)));
  assert.equal(delPeso[0].dati.dopo, PESO_SCRITTO, "il peso scritto non è quello");
  assert.equal(delSonno.length, 1, "il sonno non è nel registro");
  assert.equal(delSonno[0].dati.dopo, SONNO_SCRITTO, "il sonno scritto non è quello");
  /* e in pagina, appena scritto, si vede */
  assert.equal(valoreAna(doc, PESO), PESO_SCRITTO, "il peso non si vede in pagina dopo il salvataggio");
  assert.equal(valoreQuaderno(doc, SONNO), SONNO_SCRITTO, "il sonno non si vede in pagina dopo il salvataggio");
});

test("168.2 dopo il refresh i campi mostrano i valori salvati", async () => {
  /* Pagina nuova: memoria di sessione vuota, stesso registro. */
  const dom = await carica(2);
  const doc = dom.window.document;
  await attendiFinche(() => doc.getElementById("dc-ana-esito"), 20000, "l'anagrafica non si è montata");
  await attendiFinche(() => String((doc.getElementById("st-sync-firebase") || {}).textContent || "").indexOf("collegato") === 0, 20000, "l'accesso non è arrivato");
  await coda();

  assert.equal(valoreAna(doc, PESO), PESO_SCRITTO,
    "dopo il refresh il peso mostra «" + valoreAna(doc, PESO) + "» invece di «" + PESO_SCRITTO + "»");
  assert.equal(valoreQuaderno(doc, SONNO), SONNO_SCRITTO,
    "dopo il refresh il sonno mostra «" + valoreQuaderno(doc, SONNO) + "» invece di «" + SONNO_SCRITTO + "»");
});

test("168.3 dopo il refresh la scelta resta accesa", async () => {
  const dom = await carica(3);
  const doc = dom.window.document;
  await attendiFinche(() => tastoScelta(doc, "Donna"), 20000, "i tasti a scelta non si sono montati");
  await attendiFinche(() => String((doc.getElementById("st-sync-firebase") || {}).textContent || "").indexOf("collegato") === 0, 20000, "l'accesso non è arrivato");
  await coda();

  const donna = tastoScelta(doc, "Donna");
  const uomo = tastoScelta(doc, "Uomo");
  assert.match(String(donna.className), /\bon\b/, "«Donna» non risulta acceso dopo il refresh");
  assert.match(String(uomo.className), /\boff\b/, "«Uomo» dovrebbe restare spento");
  assert.equal(donna.getAttribute("aria-pressed"), "true", "l'aria-pressed di «Donna» non è true");
});

test("168.4 la versione riparte dal registro: la voce nuova è v2", async () => {
  const prima = zona.elencoDi("registro").filter((v) => v.dati && v.dati.tipo === "dati-anagrafica" && v.dati.campo === "peso");
  assert.equal(prima.length, 1, "la prova si aspetta una sola voce del peso prima di scrivere");
  const dom = await carica(4);
  const doc = dom.window.document;
  await attendiFinche(() => doc.getElementById("dc-ana-esito"), 20000, "l'anagrafica non si è montata");
  await attendiFinche(() => valoreAna(doc, PESO) === PESO_SCRITTO, 20000, "il peso salvato non è tornato in pagina");
  await coda();

  const peso = rigaAna(doc, PESO);
  clic(dom.window, peso.querySelector(".dc-val"));
  const casella = peso.querySelector("input");
  casella.value = "63";
  clic(dom.window, [...peso.querySelectorAll("button")].find((b) => String(b.textContent).trim() === "Salva"));
  await coda();

  const voci = zona.elencoDi("registro").filter((v) => v.dati && v.dati.tipo === "dati-anagrafica" && v.dati.campo === "peso");
  assert.equal(voci.length, 2, "la seconda scrittura non è arrivata: " + JSON.stringify(voci.map((v) => v.id)));
  const ultima = voci[voci.length - 1].dati;
  assert.equal(ultima.dopo, "63", "il valore nuovo non è quello scritto");
  assert.equal(ultima.versionePrima, 1, "la versione riparte da zero: versionePrima " + ultima.versionePrima);
  assert.equal(ultima.versioneDopo, 2, "la voce nuova non è v2: " + ultima.versioneDopo);
  assert.equal(valoreAna(doc, PESO), "63", "in pagina non si vede il valore nuovo");
});
