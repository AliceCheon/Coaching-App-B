# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri di desktop/index.html)

Ogni blocco qui sotto e un pezzo di diff vero fra `pc/index.html` (il v31 congelato) e `desktop/index.html`: il numero e la riga che cambia, non un margine largo. Se un blocco non combacia piu, si corregge il numero guardando il diff, mai allargando il blocco.

### Passo 8 - via i numeri del mockup da Curve di forza, Pianificazione, Misure e Dashboard

Curve di forza: sezione ridotta a `data-curva="non-calcolata"`. Pianificazione: `#pianificazione-viva` con `renderPianificazione`/`riepilogoPianificazione` e CSS `.pz-*`. Misure: non si seminano piu' le misure di esempio. Dashboard: readiness a trattino, «non registrato», nessuna media inventata.

### Riparazione del passo 8 - le quattro tab tornate al v31

Scheletri, Programma 1 (`#programma-attivo`), Impostazioni e Study time erano state cancellate per errore insieme alle sezioni riscritte: sono state ripristinate identiche al v31, e per questo nel diff non compaiono come righe cambiate.

### I blocchi

Una riga per blocco: il numero di riga (o l'intervallo) in `desktop/index.html` e la prima riga cambiata. Se una modifica futura non sta qui, la guardia `tests/42-identita-desktop-pc.test.mjs` diventa rossa.

- righe 40-48 — --zebra-a: #fffafd;
- righe 75-83 — --zebra-a: #14132d;
- righe 142-151 — /* ---- TENDINE: il menu nativo segue il tema (UN SOLO posto) ----
- righe 612-634 — .ck-red-cla{margin-top:11px;border-top:1px solid var(--linea);padding-top:9px;display:flex;flex-dire
- righe 816-818 — /* Passo 34: una linguetta spenta si vede che è spenta (e il motivo sta nel tooltip). */
- righe 830-832 — /* Passo 36: qui c'era overflow:hidden - l'elenco degli esercizi, che esce sotto la
- righe 866-869 — .sk-sug.on{display:block;z-index:90}
- righe 885-892 — /* Passo 35: il secondo tasto - crea un programma nuovo, non tocca l'attivo. */
- righe 897-900 — /* Passo 39: la riga che dice «stai modificando questo scheletro». */
- righe 918 — #sk-legenda{padding:0 12px 10px;display:flex;flex-direction:column;gap:5px}
- righe 1067-1069 — /* La guida che si apre sotto il tasto (passo 19): un riquadro di testo, niente di piu'. */
- righe 1508-1629 — </style>
- righe 1645 — var b=document.getElementById('bd-ver');if(b)b.textContent=(window.BD_VERSIONE//'')+' \u00b7 '+id;
- righe 1649-1660 — /* Versione dell'app: un punto solo. Il menu qui sotto, Impostazioni -> Build e
- righe 1667 — <div id="bd-ver" style="margin-top:8px;font:600 10px/1 'JetBrains Mono',monospace;letter-spacing:.06
- righe 1692 — <button class="voce" data-vista="programma-1" onclick="BDVAI(this.getAttribute('data-vista'),this)">
- righe 1711 — <span style="display:inline-block;margin-top:7px;color:#8A6FA8">Versione B &middot; in prova sui tuo
- righe 1734-1735 — <b class="db-titolo">Il consiglio di oggi</b>
- righe 1757-1758 — <text x="48" y="52" text-anchor="middle" \1&mdash;\2/text>
- righe 1764-1767 — <h3>Readiness media <span class="ck-slash">-</span> <b>non registrato</b></h3>
- righe 1772 — <div class="ck-chips"><span class="ck-chip"><em>Energia</em><b>&mdash;</b></span><span class="ck-chi
- righe 1784 — <div class="ck-mets">            <article class="ck-met"><div class="ck-met-t"><svg class="ck-ic" vi
- righe 1806 — <!-- ============ 4 · PESO + SONNO ============ -->
- righe 1809-1813 — <header class="ck-h"><h4><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" s
- righe 1833 — <div class="ck-red-num"><b data-reds-num>-</b><span class="ck-pill mute" data-reds-stato>non calcola
- righe 1836 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1839 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" str
- righe 1843-1844 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" str
- righe 1862-1864 — <p data-ck-bio-sotto>check-in · scala 1-5 · non ancora letto</p></div></header>
- righe 1874-1877 — <div class="ck-fare-tit">Nessuna decisione automatica <span class="ck-tag">motore non attivo</span><
- righe 1956-1962 — <button class="ck-link" type="button" data-vai="riepilogo-volume">Apri analisi completa →</button>
- righe 1984-1986 — <div class="dc-mail">scaniscrini@gmail.com</div>
- righe 1991 — <p>Anagrafica, Anamnesi, Biofeedback e Questionari</p>
- righe 1997 — <button class="dc-tab" data-dc="biofeedback">Biofeedback</button>
- righe 2056-2062 — <!-- Passo 25: «Domande» esce (tornerà quando ci sarà un senso), e
- righe 2092-2093 — <div class="dc-pan" data-pan="biofeedback"><div class="dc-card"><div class="dc-vuot"><b>Biofeedback:
- righe 2104 — <div class="sr-who"><b>Alice Clemente</b> · <span data-sr-ck>check-in non ancora letto</span> · <spa
- righe 2113-2116 — <div class="sr-i" data-sr-i="sleep"><span>Sonno percepito</span><b>-</b><i>non registrato</i></div>
- righe 2121-2129 — <div class="sr-boxh"><b data-sr-ck-tit>Check-in di oggi</b><span class="sr-legend">scala 1-5 · 5 = i
- righe 2147 — <p class="sr-legend" style="margin:10px 0 0">RPE medio <b style="color:var(--core)" id="sr-mrpe">-</
- righe 2155 — <p class="sr-note"><b>Nessun giudizio senza il dato.</b> RPE medio <span id="sr-nota-rpe">-</span> (
- righe 2158 — <script>
- righe 2181 — <div class="ms-who"><b>Alice Clemente</b> &middot; altezza, et&agrave; e sessioni non registrate: ne
- righe 2306 — (riga vuota)
- righe 2378 — var S=null;
- righe 2386 — var S=null;
- righe 2719 — <div class="p7-note3"><b>Da dove vengono i numeri:</b> il peso dalle rilevazioni <b>della scheda del
- righe 2730-2732 — <div class="mp-who"><b>Alice Clemente</b> · <span data-peso-profilo>altezza e età non registrate</sp
- righe 2738 — <div class="mp-boxh"><b>Andamento peso</b><span class="mp-legend">linea del peso · le pesate registr
- righe 2744-2746 — <!-- Passo 24: la coppia «Pesate / Mesi» torna com'era. Il passo 21 l'aveva tolta
- righe 2768-2770 — <div class="mp-note"><b>Perché qui non c'è la media a 7 giorni.</b> Le pesate sono poche e distanti 
- righe 2783 — <div class="v-stato">Cosa conterr&agrave;: nome, dose, orario, periodo, note e l&rsquo;avviso di fin
- righe 2800 — <div class="dperche" id="ov-p1">programma non ancora letto</div>
- righe 2807 — <div class="dperche" id="ov-p2">logbook non ancora letto</div>
- righe 2841 — <p class="p7-note2" id="lb-nota-b" hidden></p>
- righe 2855-2858 — var sed=function(){return (window.BD_LB_SEED&&window.BD_LB_SEED.sedute)//[];};
- righe 2872 — var cand=sed().filter(function(x){return x.d===dd;});
- righe 2885 — aggiornaMappa();
- righe 2898 — if(cnt&&(fv//fo))cnt.textContent=vis+" di "+sed().length+" sedute";
- righe 2910 — <div id="pianificazione-viva"></div>
- righe 2920 — </div><button class="db-btn" id="db-guida">Guida DB Esercizi</button></div>
- righe 2952 — <p class="pr-sub">Le regole con cui le settimane salgono. Per applicare una progressione alla singol
- righe 2962 — <div class="rv" id="rv-vivo"></div><style>.rv,.sp,.db2{display:block}
- righe 3176-3177 — </div><button class="sp-btn" id="sp-guida">Guida Specializzazione</button></div>
- righe 3181 — (riga vuota)
- righe 3184-3186 — <div class="v-occhiello">Programmi &middot; Curve di forza</div>
- righe 3189-3191 — <div class="cv-card" id="cv-real" data-curva="non-calcolata">
- righe 3194 — <section class="voce-pag" id="pag-scheletri">
- righe 3200 — scegli le serie. Quando salvi, lo scheletro entra nella tua raccolta e da lì lo applichi a una sched
- righe 3204-3205 — <button class="sk-tab" type="button" disabled aria-disabled="true" title="spento: i template della l
- righe 3221-3223 — <label class="sk-check" title="C'è una sola atleta: non c'è a chi altro renderlo disponibile"><input
- righe 3226 — <button class="sk-crea" id="sk-crea-programma" type="button" title="dallo scheletro nasce un program
- righe 3237-3238 — <div class="sk-qh">Questionario</div>
- righe 3248 — <section class="voce-pag" id="pag-programma-1"><div class="pg-wrap"><div id="programma-attivo"></div
- righe 3335 — <button class="pr-btn" id="t8-appprog" type="button">Applica progressione a tutta la scheda</button>
- righe 3368 — <div class="p8-box" id="box-A"><div class="p8-head"><div><div class="p8-nome">Scheda A - Dorsali, Sp
- righe 3379 — (riga vuota)
- righe 3412 — (riga vuota)
- righe 3432-3433 — <div><b>Scarico</b><p>La settimana che la scheda segna come scarico tiene la tecnica e toglie volume
- righe 3492 — </div></div></section><section class="voce-pag" id="pag-impostazioni">
- righe 3513 — <div class="st-row"><span>Build</span><b id="st-ver"></b></div>
- righe 4169 — <p class="v-testo">Tutti i programmi del backup, attivo compreso: si leggono, non si modificano. Ser
- righe 4173 — <tbody id="archivio-corpo"></tbody>
- righe 5326-5334 — { /* B.14l: il testo a pezzi, la data dentro uno span vero: prima il tag si
- righe 5420 — (riga vuota)
- righe 5422-5425 — /* Passo 39: quando uno scheletro viene riaperto dal suo elenco, qui resta il
- righe 5523 — (riga vuota)
- righe 5588 — apriSug(sug, t);
- righe 5605 — apriSug(sug, t);
- righe 5609-5636 — /* L'elenco si apre sotto, ma se la riga è in fondo alla finestra si apre
- righe 5639-5640 — function rinumera(){
- righe 5650 — stato.idModificato = null;
- righe 5655 — (riga vuota)
- righe 5658-5706 — /* Passo 34: «Salva Scheletro» scrive nella raccolta vera (comune/vista-scheletri-pagina.js).
- righe 6039 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":"Dati cliente","pag-salute-recupero":"Salu
- righe 6297 — if(navigator.userActivation&&navigator.userActivation.hasBeenActive===false)return;/* niente audio p
- righe 6414-6418 — /* la spia «Test» (B.16a-2): un insieme solo - nascosta senza .on, visibile
- righe 7097-7098 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages chiamava il collettore RUM di Cloudflare e
- righe 7226-7262 — #pag-programma-1 .pr-shd-f{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-end
- righe 7404 — (riga vuota)
- righe 7431-7458 — /* ---- zebra (B.14h): un tono per esercizio, classi z-a/z-b; i due toni per
- righe 7503 — html body #pag-programma-1 td.c-rec .rec,html body #pag-programma-1 td.c-ese .ese-name{white-space:n
- righe 7549 — (riga vuota)
- righe 7599-7600 — /* ---- settimane: due celle, SER e REPS affiancate (niente RM) ---- */
- righe 7673 — html body .p7-donut .dperche{max-width:150px;text-align:center;font:500 9px/1.3 'Inter',system-ui,sa
- righe 7952 — window.BD_LB_SEED = null; /* passo 3c: tolto il seme di esempio del logbook; le sedute vere arrivano
- righe 8109 — ese.push('<div class="lb-ex"><b>' + sc(e.np // e.n) + '</b>' + (window.BD_LB_EXCAT && BD_LB_EXCAT[e.
- righe 8497-8498 — /* Passo B.20b: anche la Stampa da Compilare vive in comune/vista-programma.js
- righe 8951 — var SEED = {config:{}, sessioni:[]};
- righe 8966-8969 — var P_ST = window.BDPesoB ? window.BDPesoB.leggiPeso() : { stato:'non-letto', pesate:[], motivo:'il 
- righe 8993-8996 — var P_PROF = window.BDPesoB ? window.BDPesoB.leggiProfilo(null) : { confermato:false, altezza:null, 
- righe 9003-9030 — /* ---------- Passo 18: l'Overview conta dal programma letto e dal logbook ----------
- righe 9033-9038 — function logbookVivo(){
- righe 9041-9044 — function pittaOverview(){
- righe 9047-9073 — var aderE = OV ? OV.aderenza({ sedute: LV.sedute, letto: LV.letto, motivoLogbook: LV.motivo, giorni:
- righe 9086-9088 — var delta = (ultimo && primo) ? (ultimo.w - primo.w) : null;
- righe 9094-9096 — {l:'Carico', v: cOk ? it(carE.serie) : '-', u: cOk ? 'serie S' + carE.settimana : '',
- righe 9099 — return '<div class="p7-k' + (k.on ? '' : ' nd') + '"' + (k.id ? ' id="' + k.id + '"' : '') + '><div 
- righe 9105 — PV.righe.forEach(function(r){ var v = r.serie[0]; if(!r.dist // r.dist === '-' // v === null) return
- righe 9113-9115 — el('ov-barsn').textContent = PV.letto
- righe 9118-9121 — /* Passo 32: disegno nelle misure vere del riquadro (prima era un 100x34
- righe 9125-9132 — var xdi = function(i){ return 8 + i * ((W - 18) / (pesi.length - 1)); };
- righe 9135 — el('ov-pesot').textContent = 'Andamento peso · ' + P_TESTO;
- righe 9143-9163 — el('ov-sed').innerHTML = '<span class="p7-chip">' + (LV.letto ? 'nessuna seduta nel logbook' : LV.mo
- righe 9166-9178 — if(el('tb-bmr') && (!P_PROF.confermato // P_PROF.mancanti.length // PESO === null)){
- righe 9217 — bf = GRASSO === null ? ' · massa magra non registrata: Katch non calcolabile' : ' · grasso stimato '
- righe 9268 — if(false){
- righe 9465 — '<div class="ese-chips2">' +
- righe 10016-10019 — /* I riquadri dell'analisi non sono in pagina (la linguetta mostra la tabella):
- righe 10024 — kpi.innerHTML =
- righe 10199-10208 — // Passo 30: nei campi si lascia al browser la cronologia del testo.
- righe 10318 — (riga vuota)
- righe 10362-10681 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages chiamava il collettore RUM di Cloudflare e

### Cosa è cambiato, per passi (prosa, non blocchi)












- **Passo 8** — via i numeri del mockup da Curve di forza, Pianificazione, Misure e Dashboard; le quattro tab cancellate per errore (Scheletri, Programma 1, Impostazioni, Study time) sono state ripristinate identiche al v31.
- **Passo 15** — Dati cliente: tolte le linguette Wearable e Personalizzati con i loro pannelli.
- **Passo 16** — via dal codice il questionario personale di Scheletri, il link Cloudflare dell'email, le tre versioni ridotte a una (`window.BD_VERSIONE`), e la funzione che scriveva in riquadri inesistenti (`#t9-kpi`).
- **Passo 16b** — via la quarta versione rimasta nel menu, il beacon Cloudflare, un'icona mancante, e l'`AudioContext` creato prima di un gesto dell'utente.
- **Passo 17** — il peso ha una fonte sola (`comune/peso-b.js`): via le cinque pesate scritte nella pagina, via «178 cm · 31 anni», via il ripiego del profilo nei calcoli.
- **Passo 18** — nessun numero fisso si presenta come dato di oggi: la carta «Biofeedback settimanale» della Dashboard e il «Check-in di oggi» di Salute & recupero leggono il check-in da una fonte sola (`comune/checkin-b.js`, scala 1-5 dichiarata) e, senza check-in, dicono che non è arrivato; via «21/10/2026 · 6 note», i punteggi «/ 10» e il giudizio «la scala dice metà»; l'Overview conta aderenza e carico dal logbook e dal programma vivi (`comune/overview-vivo-b.js`) invece che dalla tabella nascosta del mockup, e dove il conto non si fa scrive il perché.
- **Passo 19** — i quattro tasti «? Guida» che non facevano niente ora aprono un riquadro con la spiegazione.
- **Passo 20** — via il «?» dai tasti Guida; anche Dashboard, Overview e Pianificazione ora spiegano invece di restare spenti.
- **Passo 26** — anagrafica scrivibile (sesso, lingua, obiettivo, cognome) con le voci nel registro; «Compila / Modifica» apre l'editor dell'anamnesi.
- **Passo 28** — i due «Apri» della carta «Cosa fare questa settimana» sembrano tasti (bordo, freccia, animazione, tastiera), e la frase della carta invita invece di scoraggiare.
- **Passo 29** — il quaderno: i quattordici campi dell'anamnesi si scrivono (voci `anamnesi-campo` nel registro); i due tasti si attaccano al caricamento, non più dopo l'accesso; badge della carta riscritti.
- **Passo 31** — Integratori: via la frase «mandami lo screen»; i due tasti spenti del Logbook dicono perché; la casella «Rendi disponibile» spenta con il motivo.
- **Passo 32** — la linea del peso si disegna nelle misure vere del riquadro (larghezza in pixel del contenitore, altezza uguale al riquadro, punti e spessore coerenti). Prima il disegno era un riquadro 100×N allungato a sette volte l'altezza senza rapporto: dentro la carta Peso, in «Andamento peso» e in Monitor peso usciva una striscia schiacciata con macchie al posto dei punti. Ora si ridisegna anche quando il riquadro cambia larghezza.
- **Passo 33** — «Spiegazioni (4/4)» è acceso: apre un pannello con le quattro voci (TUT, ondata 10-x, scarico, rotazione schede), si chiude col ×, col clic fuori e con Esc, e il fuoco torna al tasto. I testi di scarico e rotazione dicono solo cose vere: la settimana e la percentuale dello scarico si leggono dai campi «Scarico» e «Vol −%» della scheda (non da un «qui S4» fisso), e la rotazione prevista non essendo nei documenti letti si vede solo quella osservata nel logbook. «Suggerimenti» resta al suo posto: serve alla robottina.
- **Passo 34** — la pagina Scheletri parla con la zona B. «Miei scheletri» è acceso e mostra la raccolta vera (nome, data, esercizi, schede, serie), con il conteggio letto e non più scritto a mano; «Template» e «Libreria Coach» restano spenti col motivo nel tooltip e senza i numeri 5 e 34. «Salva Scheletro» scrive lo scheletro nella raccolta (`bdB_atleti/<uid>/scheletri`) con la stessa strada della scheda, lo mostra subito in «Miei scheletri» e non crea più un «Programma 2» in memoria: la frase «ti ho portato lì» e la promessa «diventa un programma nuovo» sono sparite. Sistemato anche `leggiScheletriB`, che chiedeva un id a un riferimento di raccolta e quindi non riusciva a leggere niente.
- **Passo 34b** — un rifiuto di permesso non si mostra più in inglese: la linguetta «Miei scheletri» dice che manca un permesso alla raccolta degli scheletri e che il resto della pagina funziona.
- **Passo 35** — dallo scheletro nasce un **programma nuovo**. La pagina Scheletri ha il tasto «Crea un programma nuovo»: chiede conferma dicendo nome, schede ed esercizi e che il programma in uso non viene toccato; scrive solo documenti nuovi (`schede` prima, `programmi` dopo, in zona B), il programma nasce in **bozza** e non attivo. Aprirlo è una seconda scelta esplicita, che passa dall'«Attiva» già esistente (una voce di registro e l'Annulla che rimette com'era). Il tasto «Salva Scheletro» resta com'è: salva lo scheletro nella sua raccolta.
- **Passo 36** — l'elenco degli esercizi della pagina Scheletri non resta più tagliato: la scheda non ha più `overflow:hidden` (era quello a nascondere le voci sulle ultime righe), l'elenco sta sopra il resto della pagina e, quando la riga è in fondo allo schermo, si apre verso l'alto.
- **Passo 37** — «Miei scheletri» non è più un elenco muto: ogni riga ha «Vedi gli esercizi» (il dettaglio vero, con le schede, gli esercizi e le serie scritte), «Rinomina» (campo + Salva, scrive in B), «Modifica nel costruttore» (riapre lo scheletro nel costruttore per rimetterlo a posto) ed «Elimina» (con conferma: toglie lo scheletro dalla raccolta, non tocca nessuna scheda). Dopo una scrittura la pagina Programmi si rilegge da sola, così lo scheletro nuovo compare anche lì senza ricaricare. Inoltre l'elenco degli esercizi si chiude uscendo dal campo o con Esc, e non copre più il tasto «Salva Scheletro».
- **Passo 38** — «Modifica nel costruttore» funziona davvero: caricava i dati ma lasciava visibile la linguetta della raccolta, quindi sembrava non fare niente. Ora porta alla linguetta «Scheletri», scorre al costruttore, riempie nome, schede ed esercizi e lo dice con una riga d'esito; se il costruttore non prende lo scheletro, il motivo si legge.
- **Passo 39** — «Salva Scheletro» aggiorna lo scheletro che stai modificando (stesso documento, versione che avanza) invece di crearne un altro identico. Sopra i tasti una riga dice «Stai modificando «X»: «Salva Scheletro» lo aggiorna. «Annulla» ricomincia da uno nuovo», e l'esito dice «aggiornato» quando è un aggiornamento e «salvato» quando è nuovo.
