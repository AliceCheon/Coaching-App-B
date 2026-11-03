/* Barbell Diva B — fonte unica di versione e configurazione.
 *
 * - La chiave API è la chiave web pubblica del progetto Firebase: copiata da
 *   app-config-v144.js di A (righe 19-24), dove vive già in un file pubblico.
 *   È normale per Firebase (come documentato in FIREBASE-LOGIN.md di A, r.25-27):
 *   la sicurezza dipende dalle regole Firestore, non dal segreto della chiave.
 * - Nessun dato personale in questo file: solo identificativi di progetto.
 */
window.BD_B = {
  build: "b0.22-passo2-1-testata-nunito",
  nomeAppAuth: "B",
  prefissoChiavi: "bd-b.v1.",
  // Nome IndexedDB riservato a B: NON viene aperto in fase 0 (nessuna scrittura).
  // Mai usare il nome dell'app A ("barbell-diva-workout-rescue").
  indexedDbRiservata: "coaching-app-b-dati",
  firebase: {
    apiKey: "AIzaSyDW347rOPjsCSnUSRREh9e3wkZm37Myxdo",
    authDomain: "barbell-diva.firebaseapp.com",
    projectId: "barbell-diva",
    storageBucket: "barbell-diva.firebasestorage.app",
    messagingSenderId: "411536425865",
    appId: "1:411536425865:web:17bcd9f10b6ba1a9b49758"
  }
};
