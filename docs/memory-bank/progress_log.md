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
  commit `2f8d71a`, 28 file, ramo `main` su la repo B dell'account della coach.
  Imprevisti risolti dall'assistente direttamente sul PC: firma Git assente
  (impostata `account-coach` + email noreply) ed estrazione con cartella doppia
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


## b0.2-fase1-sedute — fase 1, punto 1: sedute e programmi dalla loro sottoraccolta (2 novembre 2026, sera)

- Decisione presa con la coach dopo la verifica del codice di A: la card
  «Sedute registrate» mostrava 0 perché leggeva `state.training.sessions`, che
  A azzera a ogni salvataggio (r.5888). La verità è la sottoraccolta `sessions`.
- Sedute: lettura dalla sottoraccolta con `session.id` valido (come A, r.5581)
  e senza doppioni per id (si tiene la revision più alta). Il `sessionCount`
  della radice (r.5937) resta come CONTROLLO visibile: se non coincide con i
  documenti validi, la card lo dichiara con la differenza.
- Ultima seduta, settimana e numero passato alla Diva Bot: dalle stesse sedute.
- Programmi: aggiunto all'elenco chiuso il percorso `nutritionPhotos` in sola
  lettura, con due query per intervallo di id (`program-v2-meta-…` e
  `program-v1-…`). Mai la sottoraccolta intera: contiene le foto di nutrizione.
  La regola del programma attivo resta quella di A (r.7019-7027).
- Etichette di fonte corrette riga per riga su A (verificate sul sorgente):
  sedute r.6257/r.6365/r.5581, sessionCount r.5937, ultima seduta r.6894-6898,
  programmi r.5224-5234/r.5396-5417/r.7019-7027, settimana r.6882-6899.
- Aggiornati test 03 (pipeline con radice vuota e sessionCount), nuovi test 10
  (sedute: conteggi, doppioni, senza id, controllo, lettura fallita) e 11
  (programmi: query per prefisso, esclusione foto, attivo/ripiego, settimana).
- Sistemato anche un guasto PRE-ESISTENTE della guardia privacy (test 08): il
  brief di consegna conteneva percorsi assoluti Windows, che la guardia vieta.
  Sostituiti con la forma `~/…` (nessun cambio di contenuto informativo).
- Nessun push: si attende l'accordo della coach. Nessuna scrittura su Firebase,
  A non toccata (solo lettura del sorgente pubblico).
- Da verificare sul campo (non provabile da qui): numeri veri nel browser dopo
  il deploy — 123 sedute attese, ultima seduta, settimana, programma attivo.

## b0.2-fase1-programmi — 2 novembre 2026 (revisione delle regole sui programmi)

La lettura delle sedute era già corretta; la lettura dei programmi copiava la
query ma non due regole di A (`loadCloudPrograms`, r.5586-5642). Verifica della
coach su una copia ricostruita: con programma attuale (v2-meta), la sua copia
v1 e un programma cancellato con id che viene prima in ordine alfabetico, B
leggeva 3 programmi e poteva scegliere come attivo il cancellato.

- `leggiDocumentoAtleta` ritorna anche `programCount` e `programIds` di primo
  livello (r.5932-5935).
- `leggiProgrammi(db, uid, radice)` filtra per `programIds` (r.5591, r.5600:
  elenco assente o vuoto = nessun filtro), deduplica per `programId` col v2 che
  vince sul v1 (r.5636-5639), e ritorna i conteggi: documenti letti, scartati
  dal filtro, v1 doppioni, v2 doppioni, fonte.
- Controllo `programCount` ↔ programmi ricostruiti: se la radice ne dichiara e
  non se ne trova nessuno, la card scrive «programmi mancanti nel cloud» con la
  formula di A «cloud programs missing» (r.5640); se il numero non coincide, la
  differenza è dichiarata.
- `programmaAttivo` non dipende più dall'ordine dei documenti: l'elenco è
  ordinato per id prima di applicare la regola di A (r.7019-7027); con un solo
  programma attivo l'esito è identico ad A.
- Formato vecchio (`programStorage` diverso da v1/v2): i programmi si leggono da
  `state.programs` come A (r.5587), senza toccare la sottoraccolta.
- Test: nuovo `tests/12-programmi-regole-A.test.mjs` (14 prove), che riproduce
  il caso della coach e fallisce sulla stesura precedente. Suite 46/46.
- `docs/fase1-brief.md`: i segnaposto non sembrano più indirizzi veri
  (`<utente-github>.github.io`).

## b0.3-fase2-tema — fase 2, la pelle «Lift. Slay. Repeat.» (2 novembre 2026, notte)

Fase 2 sul fronte estetico, senza toccare la logica: `comune/tema-b.css` è il
sistema visivo condiviso (carte di vetro sopra il gradiente, numero in
monospazio con cifre tabulari, pastiglia verde per la controprova, fonte in
nota di laboratorio in fondo alla carta), e i due `index.html` portano i
token, il marchio BD e la tipografia di sistema — nessun font da CDN, così B
resta identica anche senza rete.

Cosa NON è cambiato, di proposito: letture, controlli dei conteggi, guardie
anti-scrittura, identificativi. Suite: 46/46.

Difetti visti in anteprima e corretti: la barretta rosa del contenitore
d'errore vuoto (ora `.errore:empty` non si disegna), il riquadro del check-in
largo quanto la carta (ora si stringe sul contenuto), le fonti troppo spente,
la barra del telefono che poteva coprire l'ultima carta (coda di 190px).

Anteprime con dati di prova: desktop 1440px e telefono 390px, entrambe
fotografate e controllate a occhio prima della consegna.

## b0.3-fase2-tema — bump di rilascio e finiture del tema chiaro (2 novembre 2026, notte)

- Build: `b0.2-fase1-programmi` → `b0.3-fase2-tema`, sempre e solo in `app-config-b.js`.
- Tema chiaro, contrasto misurato: numero grande con gradiente scurito (72% rosa acceso + testo), occhiello, note di fonte, fondo pagina, pastiglia verde e pulsanti secondari con superficie piena e bordo visibile. Tutto scoped con `body[data-theme="light"]`: nessun token toccato, guardia 07 intatta.
- La rotaia resta scura anche in chiaro: scelta editoriale, da confermare con Alice.
- Suite: 46/46.
- Aperto: push in attesa del sì esplicito; fase 2b (letture nuove: rischio strutturale, questionari, cosa fare questa settimana) non iniziata.

## b0.4-fase2b-struttura — quadro strutturale e semaforo onesto (3 novembre 2026, notte)

Fase 2b, prima porta: il carico si conta, il rischio non si inventa.
- nuovo `comune/struttura.js`: modello puro (nessuna rete, nessun DOM, nessuna scrittura).
  Conteggi su 8 settimane ISO: media settimanale, ultimi 7 giorni, giorni dall'ultima
  seduta, settimane vuote, pausa più lunga, distribuzione per scheda.
- soglie DICHIARATE in `SOGLIE` (3 sedute/settimana, 8 giorni di attenzione, 15 di pausa
  lunga, 2 settimane vuote di fila) e sbilanciamento > 35 punti percentuali.
- `DATI_SEMAFORO`: elenco esplicito dei dati che un semaforo RED-S richiederebbe e che A
  non registra (disponibilità energetica, ciclo, sonno, limitazioni, serie dei carichi).
  La card «Cosa manca» li mostra invece di simulare un semaforo.
- tre card nuove in PC e telefono (stesso modulo, nessuna duplicazione): Quadro
  strutturale, Semaforo strutturale, Cosa manca per il semaforo completo.
  Ogni riga del semaforo chiude con «non una diagnosi».
- guardia `tests/13-struttura.test.mjs` (date impossibili, zero inventati, pausa lunga,
  distribuzione, assenza di scritture/DOM/rete nel modulo).
- build `b0.4-fase2b-struttura`; suite verde.

## b0.5-fase2c-voce — la Diva Bot dice la frase che conta (3 novembre 2026, notte)

Fase 2c: il quadro strutturale smette di essere solo numeri e diventa una voce.
- `voceDelQuadro(quadro)` in `comune/diva-bot.js`: una frase sola, scelta da una
  scala di priorità dichiarata (pausa lunga > settimane vuote di fila > pausa oltre
  la settimana > distribuzione storta > struttura che tiene > sotto soglia > vuoto).
  Ogni numero pronunciato viene dal quadro; ogni assenza la dichiara.
- tono `bene | attenzione | neutro` come attributo `data-tono` sulla bolla: il colore
  dice quanto pesa la frase, il testo non cambia di una parola. Stile in `tema-b.css`
  con i token esistenti (`--verde`, `--pink`), nessun token nuovo, nessuna forzatura di stile.
- `frasiPerDati(riepilogo, quadro)` mette la voce per prima: una bolla si legge una
  volta, e la prima frase deve essere quella che conta. Telefono e PC passano lo
  stesso `quadro` già calcolato per le card: una sola verità per schermata.
- guardia `tests/14-voce.test.mjs` (14 test): priorità rispettate, «ieri»/«oggi»
  senza «1 giorni fa», nessuna cifra estranea al quadro, frase entro 220 caratteri,
  tono applicato come attributo e testo sempre `textContent`.
- build `b0.5-fase2c-voce`; suite 70/70.

## b0.6-fase2d-giorno-carichi — il saluto del giorno e la voce dei chili (3 novembre 2026, notte)

Fase 2d: due voci nuove per la Diva Bot, entrambe in sola lettura.
- `voceDelGiorno(data)` in `comune/diva-bot.js`: calendario di sette registri (uno per
  giorno della settimana) con tre varianti ciascuno, scelte da settimana e anno.
  Deterministico: la stessa data da' la stessa frase, nessun sorteggio a ogni ricarica.
  Il saluto non pronuncia cifre e non giudica: il tono della bolla lo decidono i dati.
- nuovo `comune/carichi.js`: estrae dalle sedute i pesi per esercizio, raggruppa per nome
  normalizzato, confronta solo lo stesso esercizio con se stesso e calcola la variazione
  tra la prima e l'ultima occorrenza in una finestra dichiarata di 8 settimane (soglie in
  `SOGLIE_CARICHI`). I nomi di campo accettati sono elencati in `CAMPI_CARICHI`: se i campi
  non combaciano, la card mostra quanti esercizi ha visto e quanti con peso, invece di uno
  zero silenzioso. Niente stime, niente somme tra esercizi diversi, pesi fuori finestra
  esclusi e contati.
- `voceDelCarico(carichi)`: scala di priorita' (calo oltre il 5% > massimo in archivio >
  progressione > stallo); senza pesi dice «non registrato»; con meno di tre sedute non
  racconta un andamento.
- `tonoPeggiore(...)`: il tono della bolla e' il piu' severo tra quadro e carico.
- `frasiPerDati(riepilogo, quadro, extra)` ordina saluto, quadro, carico; senza `extra`
  resta identica alla fase 2c (i test 14 valgono ancora).
- card «Carichi per esercizio» su PC e telefono, dallo stesso modulo.
- guardie `tests/15-carichi.test.mjs` e `tests/16-voce-giorno.test.mjs`: determinismo del
  saluto, nessuna cifra nel saluto, estrazione tollerante ma dichiarata, nessun confronto
  tra esercizi, cifre della voce presenti nei dati.
- build `b0.6-fase2d-giorno-carichi`.

## b0.7-fase2e-volto — la Diva Bot ha una faccia (3 novembre 2026, mattina)

Fase 2e: la robottina smette di essere un emoji dentro un cerchio.
- nuovo `comune/diva-volto.js`: il personaggio è un DATO (`PARTI_VOLTO`, 15 parti
  dentro un viewBox 48x48) disegnato con `createElementNS`. Nessuna immagine, nessun
  font, nessun CDN: offline la faccia resta.
- tre stati dichiarati (`TONI_VOLTO` = bene | attenzione | neutro), gli stessi della
  bolla: il tono sceglie occhi (punti o archi che ridono) e bocca (linea, sorriso, "o").
  Le parti di un altro tono non vengono nemmeno create: nessuna lotta di `display` in CSS.
- inchiostro unico `var(--text)`: si legge sul gradiente rosa-viola in tema chiaro e
  scuro senza token nuovi, e senza valori di colore fissi nel modulo.
- CSS: bordo e alone del personaggio seguono il tono (verde / rosa / neutro), respiro
  lento solo con `prefers-reduced-motion: no-preference`, coda sulla b bolla.
- `montaDivaBot` passa il tono al personaggio e compone l'aria-label con
  `etichettaTono`: accessibile e coerente con la bolla.
- guardia `tests/17-volto.test.mjs` (9 test): niente emoji, geometria dentro il viewBox,
  tre bocche e due famiglie di occhi, nessun token nuovo, tre stati CSS, tono applicato.
- build `b0.7-fase2e-volto`.
