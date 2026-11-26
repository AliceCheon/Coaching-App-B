/* Barbell Diva B — client Firebase in SOLA LETTURA (fase 0).
 *
 * Cintura di sicurezza (a): questo modulo usa soltanto le funzioni di lettura
 * e di sessione dell'SDK compat (inizializzazione, auth, firestore .get()).
 * Nessuna funzione di scrittura viene chiamata: il test di scansione
 * (tests/02-sola-lettura-scansione.test.mjs) fallisce se nel sorgente di B
 * compare una qualunque chiamata di scrittura (set/update/delete/add/batch/
 * transaction e simili).
 *
 * Stesso SDK compat di A (10.12.5 da gstatic, caricato dagli script dei file
 * HTML). L'app di B si registra con un NOME DIVERSO ("B"): quella di A usa il
 * nome predefinito (src/app-main.js:5114 di A chiama initializeApp senza nome).
 *
 * Sessione di login: la persistenza dell'Auth usa chiavi distinte per nome
 * app (`firebase:authUser:<apiKey>:<nomeApp>`; per A: `...:[DEFAULT]`). Stesso
 * progetto, stessa origine, ma chiavi separate: da confermare al primo accesso
 * vero (vedi README, "Cosa non è verificabile da qui").
 */

export function inizializzaAppB(sdk, config) {
  const nome = config.nomeAppAuth || "B";
  const giaRegistrata = (sdk.apps || []).some((a) => a && a.name === nome);
  if (giaRegistrata) return sdk.app(nome);
  return sdk.initializeApp(config.firebase, nome);
}

export function authDi(app) {
  return app.auth();
}

export function firestoreDi(app) {
  return app.firestore();
}

/* La persistenza deve essere la stessa di A (che chiama setPersistence(LOCAL)
 * su src/app-main.js:5128): sessione sul dispositivo.
 *
 * Passo 18 — due cinture in più, perché un rifiuto non deve sparire:
 * - il tipo si legge dall'SDK ma con un ripiego sulla costante "local";
 * - un SDK che non sa fare setPersistence non deve far cadere l'avvio intero:
 *   l'errore torna come promessa rifiutata, e chi chiama lo dice sulla carta. */
export function persistenzaLocale(auth, sdk) {
  const tipo = (sdk && sdk.auth && sdk.auth.Auth && sdk.auth.Auth.Persistence && sdk.auth.Auth.Persistence.LOCAL) || "local";
  return Promise.resolve().then(() => {
    if (!auth || typeof auth.setPersistence !== "function") {
      throw new Error("questo SDK non sa mantenere la sessione");
    }
    return auth.setPersistence(tipo);
  });
}
