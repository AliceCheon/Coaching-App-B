# Regole fisse del progetto Barbell Diva B

Da rileggere **all'inizio di ogni fase**, prima di toccare qualsiasi file.

## 1. Il v31 è il riferimento per aspetto e struttura

Il v31 (`v31.html`, pagina Programma) resta il riferimento per aspetto, struttura
e testi. Le modifiche le decide e le chiede Alice, e vanno dichiarate nel diario
(`docs/differenze-dal-v31.md`). B scrive solo nella sua zona (`bdB_`): mai
toccare A — repo, branch, dati, regole Firestore.

## 2. Se una cosa non è chiara, lo dico e chiedo

Se qualcosa richiede dati che B non legge, oppure richiede una scelta che non
mi è stata chiesta, lo dico ad Alice e le chiedo come procedere. Non invento
un sostituto.

## 3. Solo due differenze ammesse di iniziativa mia: nessuna

Ogni differenza dal v31 che Alice non ha chiesto è un errore, anche se piccola.

## 4. Lista «Differenze rispetto al v31» a ogni consegna

Ogni volta che consegno una schermata scrivo la lista «Differenze rispetto al
v31»: o «nessuna», o l'elenco preciso, e ogni modifica decisa da Alice va
dichiarata nel diario. Se la lista contiene qualcosa che Alice non ha
approvato, la schermata non è finita.

## 5. Confronto affiancato

Ogni consegna visiva ha uno screenshot con la schermata nuova affiancata al v31,
con le stesse dimensioni.

## 6. Niente push, niente fasi nuove

Niente push senza un «push» esplicito di Alice. Nessuna fase nuova senza il suo
via. Una fase alla volta, test verdi, commit locale.

## Promemoria tecnici (non sono regole di disegno)

- B scrive solo in `bdB_`; dato mancante = «non registrato» o trattino come nel v31.
- I file restano CRLF: non cambiare i fine riga.
- File congelati: `pc/index.html` (guardia 42) e gli altri dichiarati di volta in volta.
- Blocchi del diario: ogni passo ha il suo blocco in `docs/differenze-dal-v31.md`.
- Backup mai su GitHub né a terzi; nessun progetto Firebase nuovo (`barbell-diva`).
- Testi semplici, in italiano, senza tono commerciale. Alice mi chiama «Jenny».

## 7. Il telefono: disegno suo, dati comuni

La versione telefono (APK) nasce dal mockup «Barbell Diva Telefono» — Dashboard,
Workout, Alimentazione, Corpo, Altro, Diva Bot. **Layout e navigazione sono suoi**: non
hanno niente a che vedere con la zona PC. PC e telefono sono collegati solo dai dati
(la stessa `bdB_atleti` dal «giorno del cambio»).

- **Palette condivisa:** viola scuri, rosa `#ff4fa3`, lilla `#c9a7ff`, tema chiaro con
  `#f8eafa`. Non si cambiano in modo diverso fra PC e telefono.
- **Metodo come per il PC:** il mockup si importa identico e congelato, con l'impronta
  `sha256` dichiarata, in una cartella a parte; poi si collega ai dati una sezione per
  volta. Ogni riga diversa dal mockup si dichiara nel diario, con una guardia come la 42.
- **`mobile/` e' una prova, non una base:** la pagina «Lettura (telefono)» verra'
  sostituita dal mockup collegato, non estesa.
- **Il logbook del telefono deve arrivare al PC:** oggi il mockup salva solo in locale
  (`bd-coda`, `bd-lim`). Servono la scrittura in `bdB_atleti` e la verifica delle regole
  Firestore della zona B, che oggi non sono verificate (rischio dichiarato).
- **Fino al «giorno del cambio» il telefono di oggi legge A.** Niente promesse sul
  telefono attuale: quello che B scrive in `bdB_atleti` si vedra' dal giorno del cambio.
