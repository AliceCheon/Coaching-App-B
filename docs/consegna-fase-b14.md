# Fase B.14 — documento di consegna

Data: 13/11/2026. La fase si chiama «il volume conta davvero» e ha riportato
i conteggi del programma sotto controllo: volume, sinergie, Logbook,
riepilogo, Progressioni, zebra. Repo locale Coaching-App-B, nessun push:
la copia buona sta qui.

## I passi, in ordine

| Passo | Commit | Cosa ha fatto |
|---|---|---|
| B.14 | `6884bf1` | il volume conta davvero |
| B.14d | `765e565` | le sinergie tornano a contare: 1 punto al bersaglio, 0,5 ai secondari |
| B.14e | `0a192aa` | il volume legge anche il Logbook: serie chiuse e ripetizioni vere |
| B.14f | `924b452` | il riepilogo volume legge solo il programmato |
| B.14g | `04ec5ab` | via il tastino P, la pagina Progressioni dice la verità |
| B.14h | `36047a5` | la zebra alterna per esercizio |
| B.14i | questo passo | pulizia (file di servizio, cartelle b0.39, zip), regole aggiornate, archivio, diario corretto, elenco delle 22 pagine |

Poi: B.14j (curve di forza) e B.14k (Specializzazione), quindi le fasi
B.15–B.20.

## Le quattro cose da sapere

1. **Il test 69.2 è instabile sotto carico, non rotto.** Da solo è sempre
   verde (7/7). Nella suite completa, con tutti gli altri test in parallelo,
   a volte scatta solo per questioni di tempi. Non è un difetto del codice
   e non si tocca: rilanciata la suite, passa.
2. **Il Quadro atleta non è una pagina vuota: è una pagina con numeri finti.**
   Le cifre che vedi senza dati veri (la ciambella con 84 serie, i totali)
   sono scritte nel markup del v31 in attesa che la pagina diventi viva.
   Non è un bug da cercare: sono numeri demo.
3. **I muscoli secondari hanno DUE fonti, che possono non concordare.**
   I pallini statici del Database esercizi (179 esercizi) e `muscoli-b.js`
   (79 esercizi). Prima di fidarsi dei secondari va scelta la fonte buona:
   è uno dei nodi dei passi B.14j/B.14k.
4. **Il Logbook non è una pagina.** È quello che Alice scrive sull'APK e che
   arriva sul PC dentro Overview atleta. Non creare — e non aspettarsi —
   una pagina «Logbook».

## Le 22 pagine di `desktop/index.html`

Stati: **dati veri** = collegata alla lettura viva di `bdB_`; **numeri finti
del v31** = cifre scritte a mano nel markup; **vuota/da costruire** = guscio o
segnaposto. Le date del backup incorporato (30/10/2026) sono dati veri ma
congelati: sono segnate a parte.

### Collegate a dati veri (6)

| Pagina | id | Stato |
|---|---|---|
| Programma attivo | `pag-programma-1` | dati veri: letture vive, editor, progressioni, «Ultima» dal logbook |
| Archivio programmi | `pag-archivio` | dati veri (`vista-archivio`); Sedute e Ultima sono «non registrato», dichiarato |
| Riepilogo volume | `pag-riepilogo-volume` | dati veri (`vista-volume`, B.14f) |
| Progressioni | `pag-progressioni` | dati veri: la libreria si disegna al volo (B.14g) |
| Database esercizi | `pag-database-esercizi` | dati veri: catalogo di riferimento (statico per natura) + selettore attivo |
| Overview atleta | `pag-overview-atleta` | dati veri SOLO nel Logbook «Tutto insieme» (sedute vere); il resto della pagina aspetta `vista-overview.js` |

### Numeri finti del v31 o del backup congelato (9)

| Pagina | id | Stato — cosa serve per collegarla |
|---|---|---|
| Dashboard | `pag-dashboard` | numeri del v31 a mano (Quadro atleta, ciambella, radar, RED-S, questionari, biofeedback) — serve collegare `vista-dashboard.js` (esiste, non importata) e decidere le letture |
| Curve di forza | `pag-curve-forza` | 3.611 cifre del v31 a mano — le curve dalle serie vere sono il passo B.14j |
| Specializzazione | `pag-specializzazione` | numeri del v31 a mano — è il passo B.14k |
| Misure & plicometria | `pag-misure` | numeri del v31 a mano — A non registra le misure: serve una decisione di Alice sulla fonte |
| Salute e recupero | `pag-salute-recupero` | check-in e diario del backup (veri al 30/10, congelati) — serve leggere `questionnaireHistory` e il diario in una vista dedicata |
| Monitor peso | `pag-monitor-peso` | «5 pesate · 13/03 → 27/10/2026» scritti nel markup — serve collegare `metrics.weight` (l'ultimo valore esiste) e decidere la curva a 60 giorni |
| Monitor annuale | `pag-monitor-annuale` | KPI dal backup incorporato — serve la lettura viva di pesate e sedute per mese |
| Reset / Bulk / Cut | `pag-reset-bulk-cut` | calcoli su dati incorporati — serve decidere la fonte dei dati corporei (peso, altezza, età) |
| Dati cliente | `pag-dati-cliente` | nome, mail e dati del backup scritti nel markup — serve collegare il documento radice |

### Vuote / da costruire (5)

| Pagina | id | Stato — cosa serve per collegarla |
|---|---|---|
| Pianificazione | `pag-pianificazione` | guscio con la testata — serve collegare `vista-pianificazione.js` (esiste, non importata) alle settimane e alla rotazione del programma attivo |
| Scheletri | `pag-scheletri` | costruttore con i controlli spenti — serve collegarlo alle scritture di `bdB_` |
| Programma 2 | `pag-programma-2` | segnaposto dichiarato («qui non c'è ancora niente da mostrare») — ci va il blocco che comincerai |
| Programma 3 | `pag-programma-3` | come il Programma 2 |
| Integratori | `pag-integratori` | pagina descrittiva: l'elenco vero non esiste nei dati di A — serve decidere dove registrarlo |

### Di stato / autosufficienti (2)

| Pagina | id | Stato |
|---|---|---|
| Impostazioni | `pag-impostazioni` | mostra lo stato reale dell'app («solo locale»): corretta finché B resta locale, da aggiornare quando cambierà la sincronizzazione |
| Study time | `pag-study-time` | l'Excel della coach incorporato (104 figure e 5 fogli di testo): contenuto reale, autosufficiente, non serve collegarlo |

### I cinque moduli non collegati

Esistono in `comune/`, nessuno li importa in `app-v31.js`:

- **`gruppi-menu.js`** — i tre gruppi del menu che si aprono e si chiudono
  (freccina che ruota, voci che spariscono, stato nel browser). Oggi lo stesso
  comportamento vive nello script incorporato nella pagina.
- **`validazioni.js`** — intervalli validi e direzioni delle scale del check-in
  (del mockup telefono v1.2, confermate): serve a etichettare i valori e ai
  test; nessuna scrittura passa da qui.
- **`vista-dashboard.js`** — costruisce la Dashboard con le classi del v31:
  l'aspetto è quello, i numeri quelli dei dati; se un dato manca dichiara
  «non registrato».
- **`vista-overview.js`** — costruisce la schermata Overview atleta con le
  stesse classi della Dashboard; nessun numero inventato.
- **`vista-pianificazione.js`** — costruisce la Pianificazione: prospetto delle
  settimane e pillole della rotazione, mostrando le sedute che ci sono.

## Cosa resta in sospeso

- Contare sul backup sedute, voci e serie e dire quale totale fa 363
  (il percorso del backup lo dà Alice: non va scritto nel repo).
- B.14j: le curve di forza. B.14k: la Specializzazione.

## Come è tenuto il repo

- `desktop/index.html` è copia identica di `pc/index.html` (guardia 42);
  `pc/index.html` è congelato.
- Le regole del progetto sono in `docs/memory-bank/regole.md` (aggiornate
  in questo passo); i registri chiusi sono in `docs/archivio/`.
- Un passo = un commit = una suite verde. Niente push.
