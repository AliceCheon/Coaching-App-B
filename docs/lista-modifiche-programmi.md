# Programmi — le richieste di Alice, in quest'ordine (8 novembre 2026)

Elenco dettato da Alice, nell'ordine in cui vanno fatte. La quarta sta per ultima
perche' chiede un campo nuovo nei dati.

Nota sulla verifica, da leggere prima delle quattro righe «nel v31»: il sorgente
del v31 non e' su questa macchina (la cartella con `src/app-main.js` non c'e'
piu'), e la copia congelata che B tiene in `desktop-vecchio-b0.39/app.js` e' solo
il guscio, 447 righe, senza l'editor delle schede: la parola «recupero» li' non
compare nemmeno una volta. Quindi dove la riga dice «non verificabile» vuol dire
che non ho potuto aprire il codice giusto, non che la funzione manchi.

## 1. Rec — freccetta a tendina con i valori preimpostati

Cosa chiede: una tendina con 30", 1', 1'30", 2', 2'30", 3', piu' due voci speciali
«1'30" e cambio gamba» e «1'30" e cambio braccio», e una voce «Scrivi libero» per
il testo libero. I pulsanti + e − restano e vanno avanti e indietro di 30".

Nel v31: non verificabile — il codice dell'editor non e' qui, e nel guscio
congelato non c'e' traccia del recupero ne' di una tendina con quei valori.

## 2. TUT — tendina con gli schemi, e via i pulsanti

Cosa chiede: il TUT e' un tempo di esecuzione, non una durata. Tendina con
2-0-2, 2-1-0, 0-1-2, 3-0-1, 3-1-1, 4-0-1 e «Scrivi libero». I pulsanti + e − del
TUT vanno tolti: non servono.

Nel v31: non verificabile — stessa ragione della voce 1; nel guscio congelato non
c'e' nessun campo TUT.

## 3. «Inserisci progressione sotto» → Custom

Cosa chiede: oggi ricopia la settimana 1 in tutte le settimane. Deve invece
aggiungere UNA riga sotto, collegata all'esercizio corrispondente.

Nel v31: non verificabile — la funzione vive nell'editor, che qui non c'e'; in B
la barra la mostra spenta (`comune/vista-programma.js`, «+ Nuova progressione»).

## 4. Superserie — tastino con le frecce verso il basso (per ultima)

Cosa chiede: al posto della scritta dx/sx sotto i pulsantini T F R P, un tastino
con le frecce verso il basso che crea una superserie con l'esercizio subito sotto.
La superserie evidenzia con un colore leggermente piu' chiaro o piu' scuro (secondo
il tema) tutte le righe coinvolte, comprese le 8 settimane. Serve un campo nuovo
nei dati: quindi si fa per ultima.

Nel v31: non verificabile — nel guscio congelato non ci sono ne' la scritta dx/sx
ne' un campo di superserie; la scritta dx/sx nell'editor vero non l'ho potuta
leggere.
