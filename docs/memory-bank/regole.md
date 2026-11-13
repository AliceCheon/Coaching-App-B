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
