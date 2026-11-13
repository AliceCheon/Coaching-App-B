> Archiviato, non aggiornato dopo il 5/11/2026.

# Riepilogo per la nuova chat — Barbell Diva B

**Data:** 5 novembre 2026, ore 01:50 (Europe/Rome)
**Chi scrive:** Jenny, l'assistente che sta seguendo il lavoro
**Chi legge:** tu, Alice, e la nuova chat che aprirai

Questo file serve a far ripartire il lavoro senza perdere niente. Va letto dall'inizio: prima chi siamo e come lavoriamo, poi cosa è stato fatto, poi cosa resta.

---

## 1. In due righe

Stiamo portando **Barbell Diva B** (la nuova app, repo `Coaching-App-B`) a essere **identica al riferimento `v31`** in aspetto, struttura e testi, schermata per schermata. Abbiamo finito la prima schermata, **Programma attivo**, alla versione **b0.39.3**, applicata sul PC, test verdi e **push fatto** su GitHub. Il lavoro si è fermato lì: **niente Archivio**, in attesa del tuo «vai».

---

## 2. Come lavoriamo (regole fisse)

- Io sono **Jenny**, tu sei **Alice**, la coach. Parliamo in italiano semplice, diretto, senza tono commerciale.
- Il **v31 è il riferimento assoluto**: aspetto, struttura, testi, misure. Non si inventa niente.
- Le **uniche differenze ammesse** rispetto al v31 sono due:
  1. i **colori di B** (palette dell'app nuova);
  2. i **controlli spenti**: in B tutto si vede, niente si preme, perché i dati veri non sono ancora collegati.
- Dove un dato non esiste nei documenti, si scrive **«non registrato»** con la ragione, oppure si spegne il controllo. **Mai dati inventati.**
- I dati derivati si calcolano **dalle serie scritte nel programma**, e va dichiarato che sono calcolati.
- **Niente push** su GitHub senza la tua parola «push».
- **Niente fase nuova** senza la tua parola «via».
- Ogni consegna ha: **test verdi**, **commit locale**, **screenshot affiancato alla stessa larghezza**, **lista delle differenze** scritte una per una.
- La **robottina flottante resta** in B. Si toglie solo la carta Diva col fumetto in testa alla Dashboard.
- La carta «Guida Dashboard» del v31 **va tenuta**.
- Il build deve restare nella forma `b0.NN-passoX-nn-nome` (lo controllano i test): adesso è `b0.39-passo2-12-due`.

---

## 3. Dove sta il lavoro

**Sul tuo PC (repo canonico):**
```
Coaching-App-B (cartella Documents del PC)
```
- HEAD: `7ca7d54` — b0.39.3 (titoli carte, testata scheda nel riquadro, barretta linguette, robottina nello scatto)
- Sotto: `01b16e9` (b0.39.2) — «b0.39.2: la testata del v31, la rotazione con la jolly, le misure e le colonne, le note gialle»
- Sotto: `2c11223` (b0.39.1), `8be4d09` (b0.38)
- Test: **287 test, 286 pass, 1 saltata, 0 fail**
- File spuri non tracciati nella cartella: `b039.patch`, `b0391.patch`, `b0392.patch`, `nul`, `push-b33.log`. Si possono cancellare quando vuoi, non servono.

**Nella mia sandbox (copia di lavoro):**
```
/home/user/workspace/B2
```
- HEAD: `5432be6` con lo stesso contenuto di `01b16e9`
- Suite: **292 test, 292 pass**

**Il riferimento visivo:** `/home/user/workspace/v31.html` (5,7 MB, tutte le schermate dentro).
**L'analisi scritta:** `/home/user/workspace/ANALISI-v31-vs-B.md`.

---

## 4. Cosa è stato fatto, in ordine

### Prima parte — capire il terreno
- Confronto sistematico v31 contro B su **cinque schermate**: Programma attivo, Archivio, Pianificazione, Overview, Dashboard.
- Estratto dal v31 tutto il CSS utile (misure, font, colori, spaziature) e scritto in `ANALISI-v31-vs-B.md`.

### b0.35
- Un solo «Programma attivo»: spariscono Programma 1/2/3.
- Archivio programmi con la stessa scheda del Programma attivo.
- I gruppi del menu si aprono e si chiudono.

### b0.38
- Tabella delle schede rifatta sul modello del v31: colori per ruolo, codici distretto, colonna «Ultima» dal logbook, font JetBrains Mono servito in casa (niente CDN), larghezza 1504 px.
- Tabella delle settimane con le colonne del v31.

### b0.39
- Fila di strumenti e campi del v31 nel Programma attivo.
- Pulsanti visibili ma spenti.
- Rotazione prevista (dichiarata, non calcolata dal vivo).
- Serie per distretto e sovrapposizione.
- Tolte le carte che il v31 non ha.

### b0.39.1
- Campo «Programma» vuoto negli screenshot: **non era un bug dell'app**, era la proprietà `input.value` che si perde quando si serializza il documento per la cattura. Il valore vero c'era.
- Numeri del fixture chiariti: 1 scheda (A), 9 esercizi, rotazione dichiarata A–D. Il «4 in rotazione» contava le lettere dichiarate, non le schede presenti.
- Dichiarato che **Firestore reale non è leggibile dalla sandbox**: i conteggi veri delle schede non sono verificabili, solo fixture e codice.

### b0.39.3 (l'ultima, quella attuale)

Quattro differenze chiuse, misurate sul v31 nel browser: titoli delle carte in maiuscolo con lettere distanziate (13 px, letter-spacing .10em; nel v31 NON sono monospazio); testata della scheda dentro un riquadro chiuso, con Settimane/Scarico/2° a destra dentro; barretta verticale fra le linguette; robottina flottante che c'era già e ora compare anche nello scatto. Restano diversi: colori di B, controlli spenti, una sola scheda nel fixture, campo Test in più (da decidere), fumetto senza etichetta della pagina.

### b0.39.2 (quella prima)
Sei correzioni chieste da te, tutte fatte:

1. **Testata.** Io mi ero sbagliata: «Annulla ctrl z» va in alto a **destra**, accanto a «Database esercizi» (Annulla più spento, Database grande e luminoso); «Libreria Coach» va a **sinistra**, sotto la frase di presentazione. Misure pareggiate al v31: titolo 900 32 px, frase 600 13 px, Annulla 800 11 px con «ctrl z» 10 px in mono, i due pulsanti tondi 900 13,5 px con padding 13×22.
2. **Carta Rotazione.** Aggiunta la riga «8 sett di progressione = … settimane reali» (il numero esatto non sta nel documento, quindi dichiara «non registrato»); aggiunto il paragrafo sulle schede jolly e su Riposo; aggiunta la **lettera E tratteggiata**; le caselle del prospetto ora sono **span piatti senza freccina**.
3. **Dimensioni.** Linguette schede 12,5 px/700, padding 7×14, pillola 999; filtri distretto 11,5 px/800, padding 4×10, angoli 8; bottoni 12 px, padding 7×11, angoli 9; campi 13 px; etichette 10,5 px/700. Tutto come il v31.
4. **Tabella.** Colonne del v31: JS 40, Dist. 34, Esercizio 196, **Descr./Setup 178** (prima 216), Rec. 56, TUT 46, settimana 26+52, Ultima 68. Totale 1242 px. Così entrano **S1–S6**, come nel v31.
5. **Note scheda.** Riquadro con bordo giallo `#FFE066`, angoli 14, intestazione 10,5 px/800 «📌 NOTE SCHEDA — visibili nell'export/stampa», casella alta 58 px col suggerimento «Riscaldamento, prehab, note generali per l'atleta…». Spenta.
6. **Riga Tempo attivo/totale.** Via il verde: fondo neutro, bordo sottile, testo grigio, valori in bianco, nota in corsivo. Colori di B, forma del v31.

**Verifiche fatte su b0.39.2:**
- Suite sandbox 292/292, suite PC 286 pass + 1 saltata + 0 fail.
- Screenshot affiancati rigenerati, stessa larghezza (1058 px per lato). Il fumetto della Diva copriva la tabella del v31 nello scatto: risolto iniettando CSS che nasconde `#bd-diva`.
- Controllo d'immagine: a sinistra e a destra si vedono **S1–S6**, tabella libera.
- Crop del riquadro note: bordo giallo e suggerimento confermati.

---

## 5. Cosa resta aperto

### Domande tue a cui non ho ancora risposto
1. **Campo `rotazione`**: nei documenti programma reali bisogna verificare se il campo esiste davvero. Io leggo la rotazione dalle serie scritte, ma il campo esplicito va controllato sui tuoi dati veri.
2. **Archivio — «Sedute» e «Ultima»**: quando un codice scheda è condiviso fra più programmi, i due numeri sono ambigui e va dichiarato a schermo. Da fare quando si arriva all'Archivio.
3. **Domande §6.7** da girarti: provenienza della seduta, stato della seduta, decisioni settimanali.

### Cose che non si possono leggere (e quindi restano spente o «non registrato»)
Sono, passi, HRV e frequenza cardiaca, macro, ciclo, RPE per seduta, mappa articolare, provenienza seduta.
- **Peso**: l'ultimo valore sì, la curva a 60 giorni no.

### Prossime schermate, nell'ordine concordato
**Programma attivo (fatto)** → **Archivio** → **Pianificazione** → **Overview** → **Dashboard**.

### Piccole cose
- `docs/memory-bank/progress_log.md` sul PC è **fermo a b0.19**: mancano le voci 2.5 → 2.9. Va aggiornato, ma non l'ho toccato perché aspetto la tua risposta su come vuoi il diario.
- Sul PC **non c'è Playwright**: gli screenshot li faccio solo nella sandbox.
- La forma «N schede · M esercizi» resta al plurale fisso come il v31; se vuoi «1 scheda» si cambia, ma ci si allontana dal riferimento.

---

## 6. Come funziona la lettura dei dati in B (contratto tecnico)

Serve alla nuova chat per non ricominciare da zero. In B i dati arrivano così:

- Radice atleta → `nome`, `metrics.weight` (ultimo valore), `quiz.questionnaireHistory`.
- `sessions` → data, `sessionCode`, `exercises: [{name, kg, date}]`.
- `program-v2-meta-*` / `program-v1-*` → nome, fase, `startDate`, `durationWeeks`, `daysPerWeek`, rotazione, note, stato.
- `program-v2-sheet-*` / `-exercise-` / `-archived-` → schede, esercizi, serie, reps, recupero, TUT, distretto.
- Il **TUT** si prende da `CAMPI_ESERCIZIO.tempo` (accetta sia `tempo` sia `cadenza`).

---

## 7. Comandi utili (sul PC, dentro `Coaching-App-B`)

Test:
```
node --test tests/*.test.mjs
```
Applicare una patch che ti consegno (comando singolo, apici obbligatori):
```
gsk download 'https://www.genspark.ai/api/files/s/XXXXXXXX' --save 'b0399.patch'
```
Poi:
```
git am --3way --ignore-whitespace b0399.patch
```
La patch arriva nel workspace dell'app (`il workspace dell app`), va copiata nel repo con `cp` prima di applicarla.

---

## 8. Cosa dire alla nuova chat, per cominciare bene

Incolla questo file (o allegalo) e aggiungi una riga tipo:

> «Riprendiamo Barbell Diva B da b0.39.3. Leggi il riepilogo: Programma attivo è chiuso, pushato, con i test verdi. Adesso vogliamo fare l'Archivio.»

Con questo la nuova chat parte allineata: sa chi sei, sa che il v31 è il riferimento, sa che i controlli si vedono ma non si premono, sa che niente push senza la tua parola, e sa esattamente da quale schermata ripartire.

---

## 9. File di riferimento

| Cosa | Dove |
|---|---|
| Repo canonico | `Coaching-App-B (cartella Documents del PC)` |
| Riferimento visivo v31 | `/home/user/workspace/v31.html` (sandbox) |
| Analisi schermata per schermata | `/home/user/workspace/ANALISI-v31-vs-B.md` |
| Passaggio di consegne precedente | `/home/user/workspace/handover/PASSAGGIO-BARBELL-DIVA-B.md` |
| Screenshot affiancato b0.39.2 | `CONFRONTO-programma-b0392.png` (consegnato in chat) |
| Patch b0.39.2 | `b0392.patch` (consegnata e già applicata sul PC) |
| Regole del progetto | `docs/memory-bank/regole.md` |
| Diario del progetto | `docs/memory-bank/progress_log.md` (fermo a b0.19) |

---

*Riepilogo scritto alle 01:50 del 5 novembre 2026. Se qualcosa non torna, la prima cosa da fare è aprire il repo e guardare `git log --oneline -5`: i commit raccontano la storia meglio di qualsiasi riassunto.*
