/* Passo 21 — le progressioni custom nella pagina vera, col finto Firestore.
 *
 * Guarda quello che vede Alice: il pannello, la tabella di «Vedi», il duplicato,
 * la custom nell'elenco, l'applicazione alla riga, la modifica di una cella e
 * l'eliminazione con la conferma. E rilegge i documenti del finto per controllare
 * che quello che si vede a schermo sia davvero in B.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    let p = decodeURIComponent(u.pathname);
    if (p.endsWith("/")) p += "index.html";
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(await readFile(join(radice, p)));
  } catch {
    res.writeHead(404);
    res.end("no");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port;
let browser = null;
for (const c of ["chrome", "msedge", null]) {
  try { browser = await chromium.launch(c ? { channel: c } : {}); break; } catch { /* prossimo */ }
}
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errori = [];
page.on("pageerror", (e) => errori.push(String(e.message).slice(0, 160)));
await page.route(/gstatic\.com/, (r) => r.abort());
await page.addInitScript({ path: join(radice, "tests", "finti", "zona-b-finta-browser.js") });
await page.goto(base + "/desktop/index.html");
await page.waitForTimeout(2600);
await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(1200);

const DOC_PROGRAMMA = "program-v2-meta-prg-intensita";
/* Il nome della zona si chiede al contratto dei dati: qui non si riscrive. */
const ZONA_B = await page.evaluate(async () => (await import("/comune/modello-dati.js")).ZONA_B);
const leggiPhone = () => page.evaluate(async (roba) => {
  const doc = window.firebase.app("B").firestore().collection(roba.zona).doc("alice-prova");
  const snap = await doc.collection("programmi").doc(roba.id).get();
  return snap.data();
}, { zona: ZONA_B, id: DOC_PROGRAMMA });
const leggoFoglio = () => page.evaluate(async (zona) => {
  const doc = window.firebase.app("B").firestore().collection(zona).doc("alice-prova");
  const snap = await doc.collection("schede").doc("program-v2-sheet-prg-intensita__sh-A").get();
  return snap.data();
}, ZONA_B);

/* La pagina porta anche pannelli vuoti del v31: il nostro è quello con le righe. */
const pannello = () => page.locator(".prog-panel:not([data-progp])").filter({ has: page.locator(".prog-row") }).first();
async function apriPannello() {
  /* Si porta la riga in vista PRIMA, poi si apre senza far scorrere altro:
   * lo scorrimento del v31 nasconde i pannelli (comportamento di sempre). */
  await page.locator("#programma-attivo button.btn-prog").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const b = document.querySelector("#programma-attivo button.btn-prog");
    if (b && typeof b.__bdApriProgressioni === "function") b.__bdApriProgressioni();
    else if (b) b.click();
  });
  await page.waitForTimeout(600);
  await pannello().waitFor({ state: "visible", timeout: 8000 });
}
async function rigaVoce(nome) {
  return pannello().locator(".prog-row").filter({ has: page.locator(".prog-item b", { hasText: nome }) }).first();
}
async function tastoIn(ambito, parola) {
  return ambito.locator("button").filter({ hasText: new RegExp("^" + parola + "$") }).first();
}

console.log("=== 1. il pannello");
await apriPannello();
console.log("voci nel pannello:", await pannello().locator(".prog-row").count(), "(attese 20 formule della riga: 21)");
const voce = await rigaVoce("Doppia progressione");
console.log("tasti della voce:", await voce.locator("button").allTextContents());

console.log("=== 2. Vedi: la tabella della formula");
await (await tastoIn(voce, "Vedi")).click();
const modale = page.locator(".prog-modal");
await modale.waitFor({ state: "visible", timeout: 5000 });
const tabella = await modale.locator("table.prog-table").first();
const serie = await tabella.locator("tbody tr").nth(0).locator("td.prog-cell").allTextContents();
const reps = await tabella.locator("tbody tr").nth(1).locator("td.prog-cell").allTextContents();
console.log("serie S1..S8:", serie.join(" | "));
console.log("reps  S1..S8:", reps.join(" | "));
console.log("campi scrivibili nella tabella:", await modale.locator("input").count(), "(attesi 0)");
console.log("frase d'origine:", (await modale.locator(".prog-origine").first().textContent() || "").trim().slice(0, 90));

console.log("=== 3. Duplica → custom salvata");
await (await tastoIn(modale, "Duplica in custom")).click();
const edit = page.locator(".prog-modal");
await edit.waitFor({ state: "visible", timeout: 5000 });
console.log("nome proposto:", await edit.locator("input.prog-in").first().inputValue());
console.log("celle:", await edit.locator("input.prog-in-cella").count(), "(attese 16)");
await (await tastoIn(edit, "Salva")).click();
await page.waitForTimeout(2200);
let doc = await leggiPhone();
const custom = (doc.programMeta && doc.programMeta.progressioniCustom) || [];
console.log("custom salvate in B:", custom.length, "| nome:", custom[0] && custom[0].nome);
console.log("versione del programma:", doc.versione, "| marchio:", doc.modificatoInB && doc.modificatoInB.ultima);
console.log("S1 della custom:", custom[0] && JSON.stringify(custom[0].settimane[0]));

console.log("=== 4. la custom è nell'elenco, con l'etichetta");
await apriPannello();
const ultima = pannello().locator(".prog-row").filter({ has: page.locator(".prog-tag") }).first();
console.log("nome:", (await ultima.locator(".prog-item b").textContent() || "").trim(),
  "| etichetta:", (await ultima.locator(".prog-tag").textContent() || "").trim(),
  "| tasti:", (await ultima.locator("button").allTextContents()).join(" "));

console.log("=== 5. applicare la custom scrive le settimane");
const primaFoglio = await leggoFoglio();
await ultima.locator(".prog-item").click();
await page.waitForTimeout(2600);
const dopoFoglio = await leggoFoglio();
const riga = dopoFoglio.sheet.exercises[0];
console.log("reps della prima riga dopo l'applicazione:", (riga.progression.weeks || []).map((w) => w.reps).join(" | "));
console.log("la scheda è cambiata:", JSON.stringify(primaFoglio.sheet.exercises[0].progression.weeks) !== JSON.stringify(riga.progression.weeks));
const registro = await page.evaluate(async (zona) => {
  const doc = window.firebase.app("B").firestore().collection(zona).doc("alice-prova");
  const snap = await doc.collection("registro").get();
  return snap.docs.map((d) => d.data()).slice(-3).map((v) => ({ tipo: v.tipo, campo: v.campo, prog: v.progressione, nome: v.nomeProgressione }));
}, ZONA_B);
console.log("ultime voci del registro:", JSON.stringify(registro));

console.log("=== 6. modifica di una cella");
await apriPannello();
const ultima2 = pannello().locator(".prog-row").filter({ has: page.locator(".prog-tag") }).first();
await (await tastoIn(ultima2, "Modifica")).click();
const ed2 = page.locator(".prog-modal");
await ed2.waitFor({ state: "visible", timeout: 5000 });
const cellaReps1 = ed2.locator('input[data-settimana="1"][data-campo="ripetizioni"]');
await cellaReps1.fill("6");
await (await tastoIn(ed2, "Salva")).click();
await page.waitForTimeout(2200);
doc = await leggiPhone();
const c2 = (doc.programMeta.progressioniCustom || [])[0];
console.log("S1 reps dopo la modifica:", c2.settimane[0].ripetizioni, "| S2:", c2.settimane[1].ripetizioni, "(S2 deve restare 9)");

console.log("=== 7. eliminare chiede conferma");
await apriPannello();
const ultima3 = pannello().locator(".prog-row").filter({ has: page.locator(".prog-tag") }).first();
await (await tastoIn(ultima3, "Elimina")).click();
const conf = page.locator(".prog-modal");
await conf.waitFor({ state: "visible", timeout: 5000 });
console.log("domanda:", (await conf.locator("b").first().textContent() || "").trim());
const primaDellaConferma = (await leggiPhone()).programMeta.progressioniCustom.length;
await (await tastoIn(conf, "Elimina")).click();
await page.waitForTimeout(2200);
doc = await leggiPhone();
console.log("custom prima della conferma:", primaDellaConferma, "| dopo:", (doc.programMeta.progressioniCustom || []).length);

console.log("=== 8. Annulla rimette la custom eliminata");
console.log("il tasto Annulla:", await page.locator("#programma-attivo button.pg-undo").count());
await page.locator("#programma-attivo button.pg-undo").first().click();
await page.waitForTimeout(2600);
doc = await leggiPhone();
console.log("custom dopo l'Annulla:", (doc.programMeta.progressioniCustom || []).length, "| versione:", doc.versione);

console.log("=== 9. rinomina (solo il nome, tabella ferma)");
doc = await leggiPhone();
const idCustom = ((doc.programMeta && doc.programMeta.progressioniCustom) || [])[0] && doc.programMeta.progressioniCustom[0].id;
await apriPannello();
const ultima4 = pannello().locator(".prog-row").filter({ has: page.locator(".prog-tag") }).first();
await (await tastoIn(ultima4, "Modifica")).click();
const ed3 = page.locator(".prog-modal");
await ed3.waitFor({ state: "visible", timeout: 5000 });
await page.screenshot({ path: "/tmp/passo21-modifica.png" });
await ed3.locator("input.prog-in").first().fill("Prova rinominata");
await (await tastoIn(ed3, "Salva")).click();
await page.waitForTimeout(2200);
doc = await leggiPhone();
console.log("nome dopo la rinomina:", ((doc.programMeta.progressioniCustom || [])[0] || {}).nome, "| id:", idCustom);

console.log("=== 10. la pagina Progressioni del menu");
await page.evaluate(() => window.BDVAI("progressioni"));
await page.waitForTimeout(700);
console.log("conteggio:", (await page.locator("#pr-libn").textContent() || "").trim());
console.log("carte:", await page.locator("#pr-libgrid .pr-card").count(), "(21 riga + 13 scheda + custom)");
const carta = page.locator("#pr-libgrid .pr-card").filter({ hasText: "Doppia progressione" }).first();
await carta.locator("button[data-lib-vedi]").click();
await page.waitForTimeout(400);
console.log("tabella dalla pagina: settimane", await page.locator(".prog-modal table.prog-table thead th").count());
await page.locator(".prog-modal .pr-mx").click();
await page.waitForTimeout(300);
await carta.locator("button[data-lib-duplica]").click();
await page.waitForTimeout(400);
await page.locator(".prog-modal button", { hasText: /^Salva$/ }).click();
await page.waitForTimeout(2600);
console.log("dopo il salvataggio:", (await page.locator("#pr-libn").textContent() || "").trim(), "| carte:", await page.locator("#pr-libgrid .pr-card").count());
doc = await leggiPhone();
console.log("custom in B:", (doc.programMeta.progressioniCustom || []).length);
await page.screenshot({ path: "/tmp/passo21-pagina.png" });

await page.evaluate(() => window.BDVAI("programma-1"));
await page.waitForTimeout(800);
await page.screenshot({ path: "/tmp/passo21.png" });
console.log("errori di pagina:", errori.length ? errori.join(" | ") : "nessuno");
await browser.close();
server.close();
process.exit(0);
