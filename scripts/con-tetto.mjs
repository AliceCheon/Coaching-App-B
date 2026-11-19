/* Tetto di tempo per una fetta (richiesta di Alice, 19/11/2026).
 *
 * Prima si usava --test-timeout=0: una prova che si bloccava non scadeva MAI e
 * la suite restava appesa per sempre. Ora:
 *   - ogni prova ha 60 secondi (--test-timeout=60000): quando scade, node
 *     stampa il NOME della prova bloccata;
 *   - ogni file ha il tetto passato come secondo argomento (240 s di norma):
 *     se lo supera, lo si spegne con tutto il suo albero di processi
 *     (taskkill /T su Windows) e lo script esce con 124 dicendo quale file.
 *
 * Uso: node scripts/con-tetto.mjs <log> <secondi> <file.test.mjs> [...]
 */
import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";

const [log, secondi, ...files] = process.argv.slice(2);
if (!log || !secondi || !files.length) {
  console.error("uso: node scripts/con-tetto.mjs <log> <secondi> <file...>");
  process.exit(2);
}
const fd = openSync(log, "w");
const tetto = Math.max(10, Number(secondi) || 240) * 1000;

function giro(file) {
  return new Promise((resolve) => {
    let finito = false;
    const chiudi = (codice) => { if (!finito) { finito = true; resolve(codice); } };
    const p = spawn(process.execPath, ["--test", "--test-timeout=60000", file], {
      stdio: ["ignore", fd, fd]
    });
    const t = setTimeout(() => {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(p.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        try { process.kill(-p.pid, "SIGKILL"); } catch { try { p.kill("SIGKILL"); } catch {} }
      }
      chiudi(124);
    }, tetto);
    p.on("close", () => { clearTimeout(t); chiudi(0); });
    p.on("error", () => { clearTimeout(t); chiudi(1); });
  });
}

let bloccato = null;
for (const f of files) {
  const esito = await giro(f);
  if (esito === 124) { bloccato = f; break; }
}
closeSync(fd);
if (bloccato) {
  console.error("BLOCCATO: " + bloccato);
  process.exit(124);
}
process.exit(0);
