# Barbell Diva B — fase 0 (sola lettura)

B è l'evoluzione dell'app di Allenamento Barbell Diva (A, repo Coaching-App-):
stesso progetto Firebase, stesso login Google, stessi dati — ma struttura nuova
(PC + telefono) e, in fase 0, **occhi soltanto**: B legge i dati veri e non
scrive nulla da nessuna parte.

## Cosa c'è in fase 0

1. Accesso con Google (popup su PC, redirect su telefono, come in A).
2. Dashboard di lettura PC (`desktop/index.html`): card con numeri veri e
   l'etichetta della **fonte** di ogni numero (percorso del dato in A).
3. Dashboard di lettura telefono (`mobile/index.html`): la stessa vista in
   colonna, nel browser del telefono. Niente APK.
4. Doppio tema identico ad A (scuro di default; chiaro «Lavender Diva 2026»):
   `data-theme` su `<html>` E su `<body>`, gradienti token, mai bianco di fondo.
5. Diva Bot con verdetti di lettura («sto guardando i numeri, non tocco nulla»).

Le letture sono **una tantum** all'avvio e al pulsante «Ricarica»: nessun
ascoltatore sui dati. Dove un dato non c'è, la card dice «non registrato»:
nessun numero di riempimento.

## Prova locale (senza pubblicare niente)

I moduli ES vogliono un server (non il doppio clic sul file). Porta diversa da
quella di A (che usa la 8767, vedi LEGGIMI-AVVIO-SICURO di A):

```
cd Coaching-App-B
py -m http.server 8769        # oppure: python3 -m http.server 8769
                              # oppure: npx http-server -p 8769
```

Aprire `http://127.0.0.1:8769/desktop/` (PC) e
`http://127.0.0.1:8769/mobile/` (telefono). Con la porta 8769 l'origine è
`localhost`, che Firebase autorizza per lo sviluppo: il login Google si prova
davvero, senza toccare la console.

## Pubblicazione (quando vuoi)

1. Crea su GitHub la repository **vuota** `Coaching-App-B` (pubblica, senza
   README iniziale).
2. Lancia `PRIMO-PUSH.bat` (ti viene consegnato accanto a questa cartella):
   fa git init, primo commit, collega il telecomando e porta `main` su GitHub.
3. Impostazioni → Pages → sorgente: branch `main`, cartella radice (root).
4. Apri `https://<tuo-sito-github-io>/Coaching-App-B/desktop/` e `.../mobile/`.

## Cosa legge B (percorsi esatti, con il riferimento nel codice di A)

| Card | Percorso del dato in A | Riferimento (src/app-main.js di main, verificato il 2/11/2026) |
|---|---|---|
| Sedute registrate | `state.training.sessions` (lunghezza) | r.3069 (lettura dell'elenco), merge/dedupe r.3173-3182 |
| Sedute per-seduta | sottoraccolta `sessions`, campo `session` | r.6257 (accesso alla sottoraccolta), r.6365 (`data()?.session \|\| data()`) |
| Ultima seduta | `state.training.sessions` — campi `dateInput`, `sessionCode`, `sessionName` | ordinamento come latestAppWorkout r.6894-6898; i nomi dei campi sono quelli del tool di diagnosi della repo |
| Peso corrente | `state.metrics.weight` | scrittore dal v148.38 r.15034; timbratura sulle sedute r.15603 |
| Ultimo check-in | `state.quiz.questionnaireHistory` | nome canonico r.4777; struttura voce (date/createdAt/questionnaireId/answers/wellness) r.15021 |
| Programma attivo | `state.programs` — esplicito: `status === "active"` oppure `active === true`, non archiviato | regola r.7019-7022; ripiego (etichettato in B) r.7023-7027 |
| Settimana | campo `week` della seduta App più recente, altrimenti il numero in coda al codice scheda | r.6882-6892; senza sedute App B mostra «non registrata» |
| Blobbi di stato | sottoraccolta `stateBlobs`, documenti `blob-v1-<campo>` | campi di stato sopra 120000 byte (r.5340-5365); B ricarica dai blob i campi mancanti in radice |

Il documento radice porta lo stato dentro il campo `state` (commento a
r.6080); per prudenza B accetta anche il formato piatto dei documenti più
vecchi. Le regole Firestore di A (solo proprietario, sottoalbero
`barbellDivaAccounts/{uid}/**`) restano quelle: B non le tocca.

## Sessione di login (verifica e limite)

- A inizializza l'app Firebase con il nome **predefinito** (r.5114) e usa la
  persistenza LOCAL (r.5128).
- L'SDK salva la sessione con una chiave che include l'apiKey e il **nome
  dell'app** (il noto formato `firebase:authUser:<apiKey>:<nomeApp>`; per A lo
  slot è `[DEFAULT]`).
- B si registra con `initializeApp(config, "B")`: chiave attesa
  `firebase:authUser:<apiKey>:B`, quindi sessione separata da quella di A.
- **Limite onesto**: la separazione della sessione va confermata al primo
  accesso vero (qui non è provabile). Come la controlli: DevTools →
  Application → IndexedDB → `firebaseLocalStorageDb` → store
  `firebaseLocalStorage`: devono esistere DUE chiavi distinte (quella di A con
  `[DEFAULT]`, quella di B con `B`), e uscendo da B la sessione di A in un'altra
  scheda deve restare. Il test 05 piantona il nome «B» nel codice.

## Account di prova (per le fasi con scritture)

Quando B inizierà a scrivere (fase 1+): account Google di prova, usato SOLO in
un **profilo Chrome separato** (mai nel profilo di tutti i giorni), su origine
di prova. In fase 0 non serve: nessuna scrittura esiste.

## Versione a sorgente unico

La build vive solo in `app-config-b.js` (`build: "b0.1-fase0"`); i file HTML
la leggono da lì. Bump: `bash scripts/bump-b.sh "b0.2-nome-scelto"` (aggiorna
solo quel file e rilancia il test di guardia).

## Test

```
npm install
npm test
```

Suite `node --test` con jsdom e Firestore finto: letture senza scritture,
elenco chiuso dei percorsi, prefisso `bd-b.v1.` delle chiavi (mai le chiavi di
A), nome app «B», rendering con stati vuoti, tema doppio, manifest, scansione
di privacy (seme di dati, email, chiavi, percorsi Windows).

## Cosa NON è verificabile da qui (e come lo provi tu)

| Cosa | Come la provi |
|---|---|
| Login Google vero | Primo accesso su `desktop/` o `mobile/` dopo il deploy (o su 127.0.0.1:8769) |
| Firestore reale (numeri veri) | Aprire la dashboard: le card mostrano i tuoi numeri con la fonte; su console Firebase, scheda Utilizzo, le letture |
| Telefono fisico (Z Flip) | Aprire `mobile/` nel browser del telefono; girare e piegare; tema chiaro/scuro |
| Sessione Auth separata | DevTools → Application → IndexedDB (vedi sopra) |
| Service worker | DevTools → Application → Service Workers sulla pagina di B: B non ne registra nessuno; se comparisse quello di A, segnalalo (non deve) |

## Fuori dal perimetro di fase 0

Scritture, quiz e check-in nuovi, promemoria/notifiche, allenamento live,
pagina Alimentazione, migrazioni di dati, APK, service worker, IndexedDB.
