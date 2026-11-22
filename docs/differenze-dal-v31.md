# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri del file attuale, desktop/index.html)

: Blocchi rigenerati dal diff vero (git diff --no-index -U0 pc/index.html desktop/index.html) al passo 8 del 22 novembre 2026.

: Passo 8 - Curve di forza: via i punti del mockup e la frase «dati veri del backup 30/10/2026»; la pagina dichiara che i grafici non sono calcolati e che i punti arriveranno dal logbook, carico massimo per seduta.

: Passo 8 - Pianificazione: via il calendario scritto in HTML; dentro #pianificazione-viva disegna comune/vista-pianificazione.js con la rotazione che i logbook dimostrano.

: Passo 8 - Misure: via il seme demo (178 cm, 31 anni, cinque sedute) e la scritta «5 sessioni dalla scheda della coach»; senza misure dall'app la pagina resta vuota e lo dice.

: Passo 8 - Dashboard: via la readiness 72, «Sei pronta, Alice!» e le chips 4/5 scritte nel file; al loro posto il trattino e lo stato dichiarato.

- righe 39-9373

