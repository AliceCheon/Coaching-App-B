/* Guardia 152 (passo 26) — l'anagrafica si scrive davvero.
 *
 *  152.1  le voci del registro si leggono: l'ultima per campo vince
 *  152.2  una voce ben formata: tipo, campo, prima, dopo, versioni che avanzano
 *  152.3  niente scritture inutili: valore vuoto o identico non produce voce
 *  152.4  la pagina vera: i tasti del sesso, della lingua e dell'obiettivo
 *         scrivono; «Riporta il cognome» scrive il cognome e aggiorna la riga
 *  152.5  se la scrittura fallisce, la pagina NON mostra il valore scelto
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { anagraficaDalRegistro, voceAnagrafica, versioneDi, montaAnagrafica, CAMPI_ANAGRAFICA } from "../comune/anagrafica-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const voce = (campo, dopo, quando) => ({ tipo: "dati-anagrafica", campo, prima: "", dopo, quando: quando || "2026-11-25T10:00:00.000Z", versionePrima: 0, versioneDopo: 1 });

test("152.1 l'ultima voce per campo vince", () => {
  const letto = anagraficaDalRegistro([
    voce("sesso", "Donna", "2026-11-20T10:00:00.000Z"),
    voce("lingua", "Italiano", "2026-11-21T10:00:00.000Z"),
    voce("sesso", "Uomo", "2026-11-24T10:00:00.000Z"),
    { tipo: "dichiarazione-anamnesi", campo: "anamnesi-lite", dopo: "lombalgia" }
  ]);
  assert.equal(letto.sesso.valore, "Uomo");
  assert.equal(letto.lingua.valore, "Italiano");
  assert.equal(letto.anamnesi, undefined, "non deve leggere tipi che non sono suoi");
});

test("152.2 una voce ben formata, con le versioni che avanzano", () => {
  const e = voceAnagrafica({ campo: "obiettivo", prima: "Mantenimento", dopo: "Aumento Massa", quando: "2026-11-25T11:00:00.000Z", versionePrima: 2 });
  assert.equal(e.ok, true);
  assert.equal(e.voce.tipo, "dati-anagrafica");
  assert.equal(e.voce.campo, "obiettivo");
  assert.equal(e.voce.prima, "Mantenimento");
  assert.equal(e.voce.dopo, "Aumento Massa");
  assert.equal(e.voce.versionePrima, 2);
  assert.equal(e.voce.versioneDopo, 3);
  assert.equal(versioneDi([voce("obiettivo", "x"), voce("obiettivo", "y"), voce("sesso", "Donna")], "obiettivo"), 2);
});

test("152.3 niente voci inutili", () => {
  assert.equal(voceAnagrafica({ campo: "sesso", prima: "Donna", dopo: "Donna" }).ok, false, "valore identico: non si scrive");
  assert.equal(voceAnagrafica({ campo: "sesso", prima: "Donna", dopo: "   " }).ok, false, "valore vuoto: non si scrive");
  assert.equal(voceAnagrafica({ campo: "", prima: "", dopo: "Donna" }).ok, false, "campo vuoto: non si scrive");
});

function pagina() {
  const dom = new JSDOM(sorgente, { runScripts: "outside-only", url: "http://localhost/desktop/index.html" });
  return dom.window.document;
}

test("152.4 la pagina vera: i tre gruppi scrivono, e il cognome pure", async () => {
  const doc = pagina();
  const scritte = [];
  /* PASSO 19 — il cognome ora si prende dall'ACCOUNT in uso: qui l'account
   * ha un nome e un cognome, come quello vero. */
  const montati = montaAnagrafica(doc, {
    stato: {},
    account: { displayName: "Alice Clemente" },
    onCambia: (campo, valore, prima) => { scritte.push([campo, valore, prima]); return Promise.resolve(true); }
  });
  for (const chiave of ["cognome", "lingua", "obiettivo", "sesso", "eta", "altezza", "peso", "lbm", "data-nascita", "note", "livello", "anni-allenamento", "sedute-settimana", "attrezzatura"]) {
    assert.equal(montati.includes(chiave), true, "manca il campo " + chiave);
  }

  /* sesso */
  const gruppoSesso = [...doc.querySelectorAll(".dc-seg")].find((g) => [...g.querySelectorAll("button")].some((b) => b.textContent.trim() === "Uomo"));
  const uomo = [...gruppoSesso.querySelectorAll("button")].find((b) => b.textContent.trim() === "Uomo");
  uomo.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(uomo.classList.contains("on"), true, "il tasto scelto non si accende");
  assert.equal(scritte.some(([c, v]) => c === "sesso" && v === "Uomo"), true, "il sesso non è stato scritto");
  assert.equal(uomo.getAttribute("aria-pressed"), "true");

  /* lingua */
  const gruppoLingua = [...doc.querySelectorAll(".dc-seg")].find((g) => [...g.querySelectorAll("button")].some((b) => b.textContent.trim() === "English"));
  const inglese = [...gruppoLingua.querySelectorAll("button")].find((b) => b.textContent.trim() === "English");
  inglese.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(scritte.some(([c, v]) => c === "lingua" && v === "English"), true, "la lingua non è stata scritta");

  /* obiettivo */
  const gruppoObiettivo = [...doc.querySelectorAll(".dc-seg")].find((g) => [...g.querySelectorAll("button")].some((b) => b.textContent.trim() === "Dimagrimento"));
  const dimagrimento = [...gruppoObiettivo.querySelectorAll("button")].find((b) => b.textContent.trim() === "Dimagrimento");
  dimagrimento.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(scritte.some(([c, v]) => c === "obiettivo" && v === "Dimagrimento"), true, "l'obiettivo non è stato scritto");

  /* cognome: il banner c'è (campo vuoto, account con cognome) e scrive il
   * cognome dell'account; poi sparisce, non resta spento a dire «riportato». */
  const bottoneCognome = doc.querySelector("#dc-banner-cognome button");
  assert.ok(bottoneCognome, "manca il tasto «Riporta il cognome»");
  bottoneCognome.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(scritte.some(([c, v]) => c === "cognome" && v === "Clemente"), true, "il cognome non è stato scritto");
  const rigaCognome = [...doc.querySelectorAll(".dc-f")].find((f) => /Cognome/.test(f.textContent || ""));
  assert.equal(rigaCognome.querySelector(".dc-val").textContent.trim(), "Clemente", "la riga del cognome non si aggiorna");
  const banner = doc.getElementById("dc-banner-cognome");
  assert.ok(!banner || banner.hidden || banner.isConnected === false, "il banner resta a schermo dopo il salvataggio");
});

test("152.4b senza account non c'è nessun cognome da riportare: niente banner", () => {
  const doc = pagina();
  montaAnagrafica(doc, { stato: {}, onCambia: () => Promise.resolve(true) });
  const banner = doc.getElementById("dc-banner-cognome");
  assert.ok(!banner || banner.hidden, "il banner compare anche senza un cognome d'account da riportare");
});

test("152.5 se la scrittura fallisce la pagina non finge", async () => {
  const doc = pagina();
  montaAnagrafica(doc, { stato: {}, onCambia: () => Promise.resolve(false) });
  const gruppoSesso = [...doc.querySelectorAll(".dc-seg")].find((g) => [...g.querySelectorAll("button")].some((b) => b.textContent.trim() === "Uomo"));
  const uomo = [...gruppoSesso.querySelectorAll("button")].find((b) => b.textContent.trim() === "Uomo");
  uomo.click();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(uomo.classList.contains("on"), false, "la pagina mostra come scelto un valore che non è stato salvato");
});

test("152.6 i campi dichiarati sono quelli che la pagina mostra", () => {
  const attesi = ["altezza", "cognome", "data-nascita", "eta", "lbm", "lingua", "note", "obiettivo", "peso", "sesso", "livello", "anni-allenamento", "sedute-settimana", "attrezzatura"];
  assert.deepEqual(Object.keys(CAMPI_ANAGRAFICA).sort(), attesi.sort());
});

test("152.7 i riquadri col trattino si aprono e salvano", async () => {
  const doc = pagina();
  const scritte = [];
  montaAnagrafica(doc, { stato: {}, onCambia: (campo, valore, prima) => { scritte.push([campo, valore, prima]); return Promise.resolve(true); } });
  const riga = [...doc.querySelectorAll('[data-pan="anagrafica"] .dc-f')].find((f) => {
    const l = f.querySelector(".dc-lbl"); return l && l.textContent.trim() === "Età";
  });
  assert.ok(riga, "manca il riquadro dell'età");
  riga.querySelector(".dc-val").click();
  const casella = riga.querySelector("input");
  assert.ok(casella, "il tocco sull'età non apre la casella");
  assert.equal(casella.type, "number", "l'età deve essere un numero");
  casella.value = "31";
  [...riga.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salva").click();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(scritte[0], ["eta", "31", ""]);
  assert.equal(riga.querySelector(".dc-val").textContent, "31", "la riga non mostra il valore salvato");
});
