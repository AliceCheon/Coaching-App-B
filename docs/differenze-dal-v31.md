# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri del file attuale, desktop/index.html)

- righe 1487: La voce di menu «Programma 1» diventa «Programma attivo · in corso», con sotto l'identificativo #nomeProgrammaAttivo per il nome letto da Firestore (modifica approvata da Alice).
- righe 3684: La sezione Programma 1 apre il contenitore dinamico #programma-attivo e nasconde l'editor statico dentro #programma-strumenti (hidden): i dati di esempio non si vedono più; il resto del blocco resta nel file, intatto.
- righe 3946: Chiusura di #programma-strumenti prima della sezione Programma 2 (la seconda </div> è la nuova).
- righe 6535: La mappa delle etichette del menu allinea la voce del programma al nuovo nome.
- righe 7936: Regola di a-capo solo per la cella Recupero (.rec) e il nome esercizio (.ese-name) dentro la tabella del Programma 1: overflow-wrap:anywhere per le stringhe senza spazi (es. eccentrica_controllata_e_poi_esplosiva).
- righe 10777-10781: Prima di </body>: carico di app-config-b.js, dell'SDK Firebase compat 10.12.5 (app, auth, firestore) e del modulo desktop/app-v31.js (login + lettura in sola lettura).

Ultimo aggiornamento: passo 3a (5 novembre 2026).
