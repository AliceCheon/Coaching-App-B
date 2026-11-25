/* Guardia 153 (passo 29) — il quaderno: l'anamnesi si scrive.
 *
 *  153.1  ci sono tutti i campi che la pagina disegna (tranne Patologie, che ha
 *         il suo modulo perché da lì si ricavano le articolazioni)
 *  153.2  l'ultima dichiarazione per campo vince, e gli altri tipi si ignorano
 *  153.3  una voce ben formata; niente voce se il testo è identico o vuoto
 *  153.4  la pagina vera: il tocco apre la casella, Salva scrive una voce e la
 *         riga mostra il testo; Annulla non scrive niente
 *  153.5  se la scrittura fallisce la riga NON mostra il testo nuovo
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";
import { CAMPI_QUADERNO, quadernoDalRegistro, voceQuaderno, montaQuaderno } from "../comune/quaderno-b.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const sorgente = readFileSync(join(radice, "desktop", "index.html"), "utf8");

const pagina = () => new JSDOM(sorgente, { runScripts: "outside-only", url: "http://localhost/desktop/index.html" }).window.document;
const voce = (campo, dopo, quando) => ({ tipo: "anamnesi-campo", campo, prima: "", dopo, quando: quando || "2026-11-25T12:00:00.000Z", versionePrima: 0, versioneDopo: 1 });

test("153.1 i campi del quaderno ci sono nella pagina", () => {
  assert.equal(CAMPI_QUADERNO.length >= 13, true, "i campi sono " + CAMPI_QUADERNO.length);
  const doc = pagina();
  const montati = montaQuaderno(doc, { stato: {}, onSalva: () => Promise.resolve(true) });
  assert.equal(montati.length, CAMPI_QUADERNO.length, "attaccati " + montati.length + " su " + CAMPI_QUADERNO.length);
  assert.equal(montati.includes("patologie"), false, "Patologie non deve stare nel quaderno");
});

test("153.2 l'ultima dichiarazione per campo vince", () => {
  const letto = quadernoDalRegistro([
    voce("sonno", "6 ore", "2026-11-20T10:00:00.000Z"),
    voce("sonno", "7 ore e mezza", "2026-11-24T10:00:00.000Z"),
    { tipo: "anamnesi-lite", campo: "sonno", dopo: "da ignorare" },
    { tipo: "dati-anagrafica", campo: "sonno", dopo: "da ignorare" }
  ]);
  assert.equal(letto.sonno.valore, "7 ore e mezza");
});

test("153.3 niente voci inutili", () => {
  const buona = voceQuaderno({ campo: "sonno", prima: "", dopo: "7 ore", quando: "2026-11-25T13:00:00.000Z", versionePrima: 3 });
  assert.equal(buona.ok, true);
  assert.equal(buona.voce.tipo, "anamnesi-campo");
  assert.equal(buona.voce.versioneDopo, 4);
  assert.equal(voceQuaderno({ campo: "sonno", prima: "7 ore", dopo: "7 ore" }).ok, false);
  assert.equal(voceQuaderno({ campo: "sonno", prima: "", dopo: "   " }).ok, false);
});

test("153.4 il tocco apre la casella, Salva scrive, Annulla no", async () => {
  const doc = pagina();
  const scritte = [];
  montaQuaderno(doc, { stato: {}, onSalva: (campo, dopo, prima) => { scritte.push([campo, dopo, prima]); return Promise.resolve(true); } });

  const riga = [...doc.querySelectorAll(".dc-f")].find((f) => /Come dormi e quante ore/.test(f.textContent || ""));
  assert.ok(riga, "manca la riga del sonno");
  const valore = riga.querySelector(".dc-val");
  valore.click();
  const area = riga.querySelector("textarea");
  assert.ok(area, "il tocco non apre la casella");
  area.value = "dormo 7 ore, sveglia alle 7";
  const salva = [...riga.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salva");
  salva.click();
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(scritte[0], ["sonno", "dormo 7 ore, sveglia alle 7", ""]);
  assert.equal(riga.querySelector("textarea"), null, "la casella non si chiude dopo il salvataggio");
  assert.equal(riga.querySelector(".dc-val").textContent, "dormo 7 ore, sveglia alle 7", "la riga non mostra il testo salvato");

  /* Annulla non scrive */
  const prima = scritte.length;
  riga.querySelector(".dc-val").click();
  const area2 = riga.querySelector("textarea");
  area2.value = "testo che non voglio";
  const annulla = [...riga.querySelectorAll("button")].find((b) => b.textContent.trim() === "Annulla");
  annulla.click();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(scritte.length, prima, "Annulla ha scritto qualcosa");
  assert.equal(riga.querySelector(".dc-val").textContent, "dormo 7 ore, sveglia alle 7", "Annulla non ha rimesso il testo di prima");
});

test("153.5 se la scrittura fallisce la riga non finge", async () => {
  const doc = pagina();
  montaQuaderno(doc, { stato: {}, onSalva: () => Promise.resolve(false) });
  const riga = [...doc.querySelectorAll(".dc-f")].find((f) => /Come dormi e quante ore/.test(f.textContent || ""));
  riga.querySelector(".dc-val").click();
  const area = riga.querySelector("textarea");
  area.value = "un testo nuovo";
  [...riga.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salva").click();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(riga.querySelector(".dc-val").textContent, "—", "la riga mostra un testo che non è stato salvato");
  const esito = doc.getElementById("dc-quaderno-esito");
  assert.match(String(esito && esito.textContent), /Non ho salvato/, "manca il messaggio d'errore");
});
