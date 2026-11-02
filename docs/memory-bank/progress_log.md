# Barbell Diva B — registro dei lavori (memory bank)

## b0.1-fase0 — fase 0: dashboard di sola lettura (2 novembre 2026, pomeriggio)

- Costruito in locale: `git init` senza telecomandi, nessun push, nessuna repo
  creata su GitHub, nessun tocco ad A (repo, branch, regole Firestore).
- Contenuto: accesso Google (popup su PC, redirect su telefono, come in A);
  dashboard di lettura PC (`desktop/`) e telefono (`mobile/`) con card etichettate
  con la FONTE di ogni numero; tema doppio su `<html>` e `<body>` (scuro di
  default, chiaro «Lavender Diva 2026» con gradienti token, mai bianco di fondo,
  `viewport-fit=cover` con le aree sicure solo sugli elementi di interfaccia);
  Diva Bot con verdetti di lettura; pulsante «Ricarica»; letture una tantum
  (documento radice con ripiego sui blob `stateBlobs`, sottoraccolta `sessions`).
- Quattro cinture di sola lettura: (a) nessuna API di scrittura usata; (b) elenco
  chiuso dei percorsi con `ErrorePercorsoNonAmmesso`; (c) regole Firestore di A
  intoccate; (d) guardie in suite: scansione anti-scrittura dei sorgenti,
  Firestore finto con registratore, prefisso `bd-b.v1.` delle chiavi (mai le
  chiavi di A), nome app «B» per la sessione, manifest standalone senza
  fullscreen/orientamento, niente service worker né IndexedDB in fase 0.
- Versione a sorgente unico: `app-config-b.js` (build b0.1-fase0); bump con
  `scripts/bump-b.sh` + test di guardia 01.
- Suite: 20 test, 20 pass, 0 falliti, 0 saltati (node --test, questa macchina).
- Da verificare sul campo (non provabile da qui): login Google vero, Firestore
  reale (numeri veri e quota letture), telefono fisico e tema sul Flip,
  separazione della sessione Auth (nome app «B»; chiave attesa
  `firebase:authUser:<apiKey>:B` contro `[DEFAULT]` di A) — procedura nel README.
- Prossimi passi: primo push con il `.bat` consegnato; Pages da `main` (radice);
  primo accesso vero in sola lettura; poi le decisioni per la fase 1 (scritture
  sulle sottoraccolte nuove, solo con account di prova in profilo separato).
- ESITO SUL CAMPO (2 novembre 2026, ore ~14:50): primo push riuscito —
  commit `2f8d71a`, 28 file, ramo `main` su github.com/AliceCheon/Coaching-App-B.
  Imprevisti risolti dall'assistente direttamente sul PC: firma Git assente
  (impostata `AliceCheon` + email noreply) ed estrazione con cartella doppia
  (sistemata: `Coaching-App-B` ora è direttamente in Barbell-Diva-B).
  GitHub Pages attivo da `main`/radice; build riuscita (ore 13:48 UTC).
- Verificato dalla cliente: accesso Google OK; dashboard di lettura con dati
  VERI di A (sottoraccolta sessions: 123 documenti; ultimo check-in 2026-10-21,
  wellness stress=basso hunger=alta); tema doppio OK su PC e telefono;
  `mobile/` aperta sul telefono, ufficiale identica, si apre.
  Estetica «bruttina» registrata come NORMALE: è la fase 0, le fondamenta —
  la cura grafica e il branding (mockup) sono rimandati a fase successiva
  DI PROGETTO, non per dimenticanza.
- APPUNTO FASE 1 (primo in lista): la card «Sedute registrate» mostra
  0 (contatore nel documento radice di A) contro 123 documenti reali nella
  sottoraccolta — decidere quale delle due letture è la verità da mostrare.
- Rimasto facoltativo, non ancora fatto: verifica DevTools della separazione
  della sessione Auth (chiave attesa `firebase:authUser:<apiKey>:B`),
  procedura nel README. Nessun problema riscontrato in uso normale.
