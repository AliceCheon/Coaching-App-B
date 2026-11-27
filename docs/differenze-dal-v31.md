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
- righe 1097 — .dc-banner[hidden]{display:none}
- righe 1457-1458 — .st-nota{margin:2px 0 0;font:600 11.5px/1.45 'Nunito Sans',sans-serif;color:#C7AEE2}
- righe 1511-1632 — </style>
- righe 1648 — var b=document.getElementById('bd-ver');if(b)b.textContent=buildVera()+' \u00b7 '+id;
- righe 1652-1668 — /* Versione dell'app: un punto solo. Il menu qui sotto, Impostazioni -> Build e
- righe 1674-1675 — <div class="chi">atleta<em>coach</em></div>
- righe 1700 — <button class="voce" data-vista="programma-1" onclick="BDVAI(this.getAttribute('data-vista'),this)">
- righe 1719 — <span style="display:inline-block;margin-top:7px;color:#8A6FA8">Versione B &middot; in prova sui tuo
- righe 1742-1743 — <b class="db-titolo">Il consiglio di oggi</b>
- righe 1752-1753 — <h2>Benvenuta, <i id="ck-nome">atleta</i>!</h2>
- righe 1765-1766 — <text x="48" y="52" text-anchor="middle" \1&mdash;\2/text>
- righe 1772-1775 — <h3>Readiness media <span class="ck-slash">-</span> <b>non registrato</b></h3>
- righe 1780 — <div class="ck-chips"><span class="ck-chip"><em>Energia</em><b>&mdash;</b></span><span class="ck-chi
- righe 1792 — <div class="ck-mets">            <article class="ck-met"><div class="ck-met-t"><svg class="ck-ic" vi
- righe 1814 — <!-- ============ 4 · PESO + SONNO ============ -->
- righe 1817-1821 — <header class="ck-h"><h4><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" s
- righe 1841 — <div class="ck-red-num"><b data-reds-num>-</b><span class="ck-pill mute" data-reds-stato>non calcola
- righe 1844 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1847 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" str
- righe 1851-1852 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 16" width="12" height="12" fill="none" str
- righe 1870-1872 — <p data-ck-bio-sotto>check-in · scala 1-5 · non ancora letto</p></div></header>
- righe 1882-1885 — <div class="ck-fare-tit">Nessuna decisione automatica <span class="ck-tag">motore non attivo</span><
- righe 1964-1970 — <button class="ck-link" type="button" data-vai="riepilogo-volume">Apri analisi completa →</button>
- righe 1989-1994 — <div class="dc-av">-</div>
- righe 1999 — <p>Anagrafica, Anamnesi, Biofeedback e Questionari</p>
- righe 2005 — <button class="dc-tab" data-dc="biofeedback">Biofeedback</button>
- righe 2020-2022 — <div class="dc-banner" id="dc-banner-cognome" hidden>
- righe 2064-2070 — <!-- Passo 25: «Domande» esce (tornerà quando ci sarà un senso), e
- righe 2100-2101 — <div class="dc-pan" data-pan="biofeedback"><div class="dc-card"><div class="dc-vuot"><b>Biofeedback:
- righe 2112 — <div class="sr-who"><b>atleta</b> · <span data-sr-ck>check-in non ancora letto</span> · <span data-s
- righe 2121-2124 — <div class="sr-i" data-sr-i="sleep"><span>Sonno percepito</span><b>-</b><i>non registrato</i></div>
- righe 2129-2137 — <div class="sr-boxh"><b data-sr-ck-tit>Check-in di oggi</b><span class="sr-legend">scala 1-5 · 5 = i
- righe 2155 — <p class="sr-legend" style="margin:10px 0 0">RPE medio <b style="color:var(--core)" id="sr-mrpe">-</
- righe 2163 — <p class="sr-note"><b>Nessun giudizio senza il dato.</b> RPE medio <span id="sr-nota-rpe">-</span> (
- righe 2166 — <script>
- righe 2189 — <div class="ms-who"><b>atleta</b> &middot; altezza, et&agrave; e sessioni non registrate: nessuna mi
- righe 2214-2216 — <div class="ms-k"><span>BMI</span><b id="ms-bmi">-</b><i id="ms-bmih">mancano altezza e peso</i></di
- righe 2225 — <div id="ms-copy-esito" role="status"></div>
- righe 2305 — <div id="ms-import-esito" role="status"></div>
- righe 2316 — (riga vuota)
- righe 2388 — var S=null;
- righe 2396 — var S=null;
- righe 2460-2462 — b.innerHTML='<i></i>Caricati dalla scheda · '+ST.sessioni.length+(ST.sessioni.length===1?' sessione'
- righe 2487-2498 — if(q("ms-bmih")){
- righe 2542 — '<br><span id="ms-cn">Ora: '+serie7.length+' rilevazion'+(serie7.length===1?"e":"i")+' utilizzabil'+
- righe 2569-2573 — function report(r,txt,dove){
- righe 2578-2583 — var corpo=h+(txt?'<p class="ms-note2">'+txt+'</p>':"");
- righe 2669-2675 — render(); report(res,"Import fatto. Le righe scartate sono quelle che non riesco a leggere: nessuna 
- righe 2679-2694 — var de=q("ms-copy-esito");
- righe 2763 — <div class="p7-note3"><b>Da dove vengono i numeri:</b> il peso dalle rilevazioni <b>della scheda del
- righe 2774-2776 — <div class="mp-who"><b>atleta</b> · <span data-peso-profilo>altezza e età non registrate</span> · <s
- righe 2782 — <div class="mp-boxh"><b>Andamento peso</b><span class="mp-legend">linea del peso · le pesate registr
- righe 2788-2790 — <!-- Passo 24: la coppia «Pesate / Mesi» torna com'era. Il passo 21 l'aveva tolta
- righe 2812-2814 — <div class="mp-note"><b>Perché qui non c'è la media a 7 giorni.</b> Le pesate sono poche e distanti 
- righe 2827 — <div class="v-stato">Cosa conterr&agrave;: nome, dose, orario, periodo, note e l&rsquo;avviso di fin
- righe 2844 — <div class="dperche" id="ov-p1">programma non ancora letto</div>
- righe 2851 — <div class="dperche" id="ov-p2">logbook non ancora letto</div>
- righe 2885 — <p class="p7-note2" id="lb-nota-b" hidden></p>
- righe 2899-2902 — var sed=function(){return (window.BD_LB_SEED&&window.BD_LB_SEED.sedute)//[];};
- righe 2916 — var cand=sed().filter(function(x){return x.d===dd;});
- righe 2929 — aggiornaMappa();
- righe 2942 — if(cnt&&(fv//fo))cnt.textContent=vis+" di "+sed().length+" sedute";
- righe 2954 — <div id="pianificazione-viva"></div>
- righe 2962-2965 — <h2>DB Esercizi <i>176 esercizi</i></h2>
- righe 2970 — <span class="rv-ch"><span id="db-conta" style="font-size:11px;color:var(--fioco);font-weight:700">17
- righe 2979-3154 — </thead><tbody id="db-body"><tr class="riga" data-n="curl cavo basso con bilancere piccolo" data-g="
- righe 3158 — <p class="rv-nota">Nel tuo gestionale la testata dice <b>267 esercizi · 62 prehab</b>; qui ci sono i
- righe 3171 — <p class="pr-sub">Le regole con cui le settimane salgono. Per applicare una progressione alla singol
- righe 3181 — <div class="rv" id="rv-vivo"></div><style>.rv,.sp,.db2{display:block}
- righe 3395-3396 — </div><button class="sp-btn" id="sp-guida">Guida Specializzazione</button></div>
- righe 3400 — (riga vuota)
- righe 3403-3405 — <div class="v-occhiello">Programmi &middot; Curve di forza</div>
- righe 3408-3410 — <div class="cv-card" id="cv-real" data-curva="non-calcolata">
- righe 3413 — <section class="voce-pag" id="pag-scheletri">
- righe 3419 — scegli le serie. Quando salvi, lo scheletro entra nella tua raccolta e da lì lo applichi a una sched
- righe 3423-3424 — <button class="sk-tab" type="button" disabled aria-disabled="true" title="spento: i template della l
- righe 3440-3442 — <label class="sk-check" title="C'è una sola atleta: non c'è a chi altro renderlo disponibile"><input
- righe 3445 — <button class="sk-crea" id="sk-crea-programma" type="button" title="dallo scheletro nasce un program
- righe 3456-3457 — <div class="sk-qh">Questionario</div>
- righe 3467 — <section class="voce-pag" id="pag-programma-1"><div class="pg-wrap"><div id="programma-attivo"></div
- righe 3509 — <div class="pr-acts"><button class="pr-btn" id="pr-confronta" type="button">Confronta con un altro p
- righe 3553-3554 — <button class="pr-btn" id="pr-sugg" type="button" title="spento: i suggerimenti automatici non ci so
- righe 3587 — <div class="p8-box" id="box-A"><div class="p8-head"><div><div class="p8-nome">Scheda A - Dorsali, Sp
- righe 3598 — (riga vuota)
- righe 3631 — (riga vuota)
- righe 3635 — <p class="pr-mhint">I programmi salvati. La libreria degli esercizi sta nel <b>Database esercizi</b>
- righe 3651-3652 — <div><b>Scarico</b><p>La settimana che la scheda segna come scarico tiene la tecnica e toglie volume
- righe 3711 — </div></div></section><section class="voce-pag" id="pag-impostazioni">
- righe 3716-3718 — <p><span class="st-badge on" id="st-sync-badge">● cloud · zona B</span></p>
- righe 3721-3722 — <p class="st-nota" id="st-coda-nota" role="status">Sto controllando la coda locale…</p>
- righe 3725 — <p class="st-nota" id="st-esporta-nota" role="status" hidden></p>
- righe 3734-3738 — <div class="st-row"><span>Build</span><b id="st-ver"></b></div>
- righe 3742-3746 — <p>Quello che questa pagina non fa ancora, e il motivo vero.</p>
- righe 4391 — <p class="v-testo">Tutti i programmi del backup, attivo compreso: si leggono, non si modificano. Ser
- righe 4395 — <tbody id="archivio-corpo"></tbody>
- righe 4400 — <li>Le sedute del 2026 che non hanno un programma associato vengono dallo storico Excel, prima che l
- righe 5548-5556 — { /* B.14l: il testo a pezzi, la data dentro uno span vero: prima il tag si
- righe 5642 — (riga vuota)
- righe 5644-5647 — /* Passo 39: quando uno scheletro viene riaperto dal suo elenco, qui resta il
- righe 5745 — (riga vuota)
- righe 5810 — apriSug(sug, t);
- righe 5827 — apriSug(sug, t);
- righe 5831-5858 — /* L'elenco si apre sotto, ma se la riga è in fondo alla finestra si apre
- righe 5861-5862 — function rinumera(){
- righe 5872 — stato.idModificato = null;
- righe 5877 — (riga vuota)
- righe 5880-5928 — /* Passo 34: «Salva Scheletro» scrive nella raccolta vera (comune/vista-scheletri-pagina.js).
- righe 6104-6106 — /* Passo 40: le tabelle dentro i pannelli hanno la loro intestazione (thead):
- righe 6251 — "pag-database-esercizi":[["Centosettantasei esercizi veri.","Nell'OVERLAP il pallino pieno è il bers
- righe 6264 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":"Dati cliente","pag-salute-recupero":"Salu
- righe 6522 — if(navigator.userActivation&&navigator.userActivation.hasBeenActive===false)return;/* niente audio p
- righe 6639-6643 — /* la spia «Test» (B.16a-2): un insieme solo - nascosta senza .on, visibile
- righe 6778 — <input id="bdsw-q" type="text" placeholder="cerca un esercizio nel catalogo…" autocomplete="off">
- righe 7150 — (riga vuota)
- righe 7161 — (riga vuota)
- righe 7314-7315 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages chiamava il collettore RUM di Cloudflare e
- righe 7380-7386 — #pag-programma-1 .pr-sw.off,
- righe 7449-7485 — #pag-programma-1 .pr-shd-f{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:flex-end
- righe 7597-7795 — /* Passo 41/42: il pannello di «Cambia» - l'elenco dei programmi di B.
- righe 7826 — (riga vuota)
- righe 7853-7880 — /* ---- zebra (B.14h): un tono per esercizio, classi z-a/z-b; i due toni per
- righe 7925 — html body #pag-programma-1 td.c-rec .rec,html body #pag-programma-1 td.c-ese .ese-name{white-space:n
- righe 7971 — (riga vuota)
- righe 8021-8022 — /* ---- settimane: due celle, SER e REPS affiancate (niente RM) ---- */
- righe 8095 — html body .p7-donut .dperche{max-width:150px;text-align:center;font:500 9px/1.3 'Inter',system-ui,sa
- righe 8374 — window.BD_LB_SEED = null; /* passo 3c: tolto il seme di esempio del logbook; le sedute vere arrivano
- righe 8531 — ese.push('<div class="lb-ex"><b>' + sc(e.np // e.n) + '</b>' + (window.BD_LB_EXCAT && BD_LB_EXCAT[e.
- righe 8633 — if (cont) cont.textContent = this.filtrate().length + (this.filtrate().length === 1 ? ' seduta' : ' 
- righe 8637-8639 — for (i2 = 0; i2 < a2.length; i2++) a2[i2].textContent = (this.fonte // 'istantanea incorporata') + '
- righe 8838 — listaModal('Confronta con un altro programma', 'Confronto tra programmi: nel mockup la vista di diff
- righe 8843 — listaModal('Copia da un altro programma', 'I programmi della Libreria: la copia reale non è collegat
- righe 8919-8920 — /* Passo B.20b: anche la Stampa da Compilare vive in comune/vista-programma.js
- righe 9373 — var SEED = {config:{}, sessioni:[]};
- righe 9388-9391 — var P_ST = window.BDPesoB ? window.BDPesoB.leggiPeso() : { stato:'non-letto', pesate:[], motivo:'il 
- righe 9415-9418 — var P_PROF = window.BDPesoB ? window.BDPesoB.leggiProfilo(null) : { confermato:false, altezza:null, 
- righe 9425-9455 — /* ---------- Passo 18: l'Overview conta dal programma letto e dal logbook ----------
- righe 9458-9463 — function logbookVivo(){
- righe 9466-9469 — function pittaOverview(){
- righe 9472-9511 — var aderE = OV ? OV.aderenza({ sedute: LV.sedute, letto: LV.letto, motivoLogbook: LV.motivo, giorni:
- righe 9524-9526 — var delta = (ultimo && primo) ? (ultimo.w - primo.w) : null;
- righe 9532-9534 — {l:'Carico', v: cOk ? it(carE.serie) : '-', u: cOk ? 'serie S' + carE.settimana : '',
- righe 9537 — return '<div class="p7-k' + (k.on ? '' : ' nd') + '"' + (k.id ? ' id="' + k.id + '"' : '') + '><div 
- righe 9543 — PV.righe.forEach(function(r){ var v = r.serie[0]; if(!r.dist // r.dist === '-' // v === null) return
- righe 9551-9553 — el('ov-barsn').textContent = PV.letto
- righe 9556-9559 — /* Passo 32: disegno nelle misure vere del riquadro (prima era un 100x34
- righe 9563-9570 — var xdi = function(i){ return 8 + i * ((W - 18) / (pesi.length - 1)); };
- righe 9573 — el('ov-pesot').textContent = 'Andamento peso · ' + P_TESTO;
- righe 9581-9601 — el('ov-sed').innerHTML = '<span class="p7-chip">' + (LV.letto ? 'nessuna seduta nel logbook' : LV.mo
- righe 9604-9616 — if(el('tb-bmr') && (!P_PROF.confermato // P_PROF.mancanti.length // PESO === null)){
- righe 9655 — bf = GRASSO === null ? ' · massa magra non registrata: Katch non calcolabile' : ' · grasso stimato '
- righe 9706 — if(false){
- righe 9903 — '<div class="ese-chips2">' +
- righe 10454-10457 — /* I riquadri dell'analisi non sono in pagina (la linguetta mostra la tabella):
- righe 10462 — kpi.innerHTML =
- righe 10637-10646 — // Passo 30: nei campi si lascia al browser la cronologia del testo.
- righe 10756 — (riga vuota)
- righe 10800-11135 — <!-- beacon Cloudflare tolto (passo 16b): su GitHub Pages chiamava il collettore RUM di Cloudflare e

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
- **Passo 40** — «Mesi» in Monitor peso funziona: le due linguette «Pesate / Mesi» accendono i loro pannelli (prima erano due disegni e il clic non faceva niente), e la tabella dei mesi mostra, per ogni mese con pesate, quante rilevazioni, la media, il minimo e il massimo, e la differenza dal mese prima. Nessun mese inventato: se un mese non ha pesate non compare. Sistemato anche il raggruppamento (`perMese` ora raggruppa per chiave e ordina, prima due pesate dello stesso mese separate da un'altra data facevano due mesi uguali) e la collisione di nome fra `.pg-tab` (tabella) e `.pg-tab` (linguetta del cruscotto), che rendeva inline-flex ogni tabella della pagina: le righe finivano schiacciate a destra.
- **Passo 41** — «Cambia» in Programmi non è più «in arrivo»: apre l'elenco dei programmi che stanno in B, con nome, stato (in uso, in bozza, disponibile, archiviato), quante schede e il tasto «Apri». Il programma in uso è segnato e non si riapre; un archiviato resta spento col motivo; l'apertura passa dalla conferma di sempre («quello di adesso resta salvato com'è») e dalla scrittura in zona B con la voce di registro. Con un programma solo il pannello lo dice. Collegata anche l'apertura del programma creato dallo scheletro: adesso c'è sempre una strada per tornare indietro.
- **Passo 42** — il pannello di «Cambia» sta **sopra** la pagina invece di allungarla: è una finestrella ancorata al tasto (posizione fissa, z-index alto), non entra più nella carta, si apre verso l'alto quando sotto non c'è spazio e si chiude col clic fuori, con Esc e con «Chiudi»; a 1280 px le voci restano leggibili. I programmi **archiviati si guardano**: «Guarda» (nel pannello e nella tabella dell'Archivio) apre una vista di sola lettura con nome, periodo, fase, rotazione e le schede con esercizi, serie, ripetizioni e recuperi presi dai documenti veri — non attiva niente e non scrive niente. Dalla stessa vista «Confronta con quello in uso» affianca i due programmi solo su grandezze che stanno nei dati: schede, esercizi, serie a settimana (totale e per distretto, contate sul distretto scritto nell'esercizio) e densità = serie ÷ minuti di recupero scritti (Σ serie × recupero ÷ 60, formula dichiarata), con la variazione in % dove il valore c'è da entrambe le parti; l'**intensità di carico** è dichiarata non disponibile col motivo (i carichi vivono nel logbook, non nelle schede) e dove i recuperi mancano la densità non si calcola invece di valere zero. «Salva come nuovo programma» crea un programma **nuovo in bozza** copiando schede ed esercizi di quello scelto (nome proposto «<nome> · copia», id nuovi, legami delle tecniche rimessi): scrive solo documenti nuovi, schede prima e programma dopo, con le funzioni di `comune/scritture-b.js`. «Confronta con…» nella carta del programma non è più «in arrivo»: apre lo stesso elenco in modo confronto.
- **Passo 43** — il confronto fra due programmi diventa quello del mockup approvato: si apre in una **finestra alta quanto lo schermo** (88vh, fino a 1080 px) che **scorre dentro di sé**, con la barra delle settimane ferma in cima, e non allunga la pagina. I tasti delle settimane sono tanti quante sono quelle dei due programmi (il massimo fra i due, mai meno di 8; dieci se i dati ne hanno dieci), ognuno col **range di ripetizioni** scritto in quella settimana oppure «**scarico**» quando la settimana è segnata così nei dati, e quello scelto resta evidenziato. Dentro, i due programmi sono **impilati** (il consultato sopra, quello in uso sotto): una riga compatta di pastiglie col distretto e la somma delle serie di quella settimana; poi le **schede vere**, una sotto l'altra, col titolo «Scheda A — <nome>» e la tabella Esercizio · Distretto · Serie · Rip. · Rec. coi valori **della settimana scelta** presi da `progression.weeks` (i recuperi come sono scritti, senza normalizzarli; «—» dove la progressione non scrive quella settimana, mai uno zero); poi i **totali** (serie a settimana, esercizi, densità = serie × recupero ÷ 60, formula dichiarata). Sotto, le **differenze per distretto** della settimana scelta con Δ verde/rosso, e «**non registrato**» dove il distretto sta in un programma solo. Restano le dichiarazioni: intensità di carico **non disponibile** (i carichi vivono nel logbook) e, se in una scheda i recuperi mancano, la densità non si calcola e si dice in quale scheda. Restano i tasti «Confronta con quello in uso» e «Salva come nuovo programma»; la vista di sola lettura lascia il posto alla finestra del confronto invece di impilarcisi sopra.
- **Passo 43c** — il confronto cambia disposizione, come ha chiesto Alice: **due colonne**, il programma consultato a sinistra e quello in uso a destra (nome, pallino e stato in cima a ogni colonna, e i due nomi anche nell'intestazione ferma), e **due file di tab in cima**, tutte e due ferme mentre il corpo scorre: prima le **settimane** (col range di ripetizioni o «scarico»), subito sotto le **schede** — tutte le lettere presenti in almeno uno dei due programmi, in ordine alfabetico (una scheda senza lettera finisce in fondo come «Senza lettera»). Settimana e scheda scelte valgono per tutte e due le colonne, così si guarda «settimana 1, scheda C» nei due programmi affiancati. Ogni colonna mostra le pastiglie del volume di quella settimana, il titolo della scheda («Scheda A — …») e la tabella Esercizio · Serie · Rip. · Rec. (il distretto su una riga piccola sotto il nome), coi valori di quella settimana e «—» dove la progressione non li scrive. Le righe delle due colonne sono **allineate**: si costruisce un ordine unico (prima gli esercizi della colonna di sinistra nel loro ordine, poi quelli che stanno solo a destra) e ogni colonna riempie la sua cella col trattino dove l'esercizio non c'è. Se un programma non ha quella scheda, la sua colonna lo dice in chiaro («Scheda C non presente in questo programma») invece di mostrare una tabella vuota. Restano i totali per colonna (serie, esercizi, densità in serie/min), il blocco delle differenze per distretto con Δ e «non registrato», le dichiarazioni (carico non disponibile, formula della densità), la finestra a 88vh con lo scorrimento dentro e la chiusura con ×, Esc e clic fuori. Sotto i ~900 px le due colonne si mettono una sopra l'altra.

- **Passo 43e · punto 15 della lista** — nella carta «Programma» **giorni a settimana**, **settimane** e **rotazione delle schede** si scrivono come Data inizio e Fase: «Gg/sett» è una tendina da 1 a 7, «Settimane» un campo numerico (1…52), «Rotazione schede» un campo di testo che accetta «A B C D», «A,B,C,D» e «ABCD» (normalizza in maiuscolo e toglie spazi e virgole). Le pastiglie restano come anteprima di quello che è scritto e il «+» aggiunge al campo la lettera successiva. La scrittura passa dalla stessa strada di Data e Fase (`cambiaTestataProgramma` → `comune/scritture-b.js`, versione che avanza, marchio e voce di registro con `prima`/`dopo`), quindi lo stesso Annulla rimette il valore di prima — rotazione compresa. Il campo vuoto toglie il valore («giorni a settimana tolti dal programma», «rotazione tolta dal programma»); un rifiuto (0 giorni, 99 settimane, lettere ripetute o più di sette) non scrive niente, dice il motivo in italiano accanto al campo e lascia il valore scritto per correggerlo. Il prospetto delle settimane segue `durationWeeks` (8 settimane = 8 righe, 12 = 12) e con 7 giorni a settimana mostra 7 colonne. Schede, scarico e il resto della pagina restano come sono.
- **Passo 43f · i salvataggi (primo punto della lista)** — quello che si scrive in **anagrafica** e nel **quaderno** torna dopo il refresh. Prima la voce finiva nel registro e la pagina, a pagina nuova, mostrava «—»: la lettura consegna `{ id, dati }` e i due lettori (`anagraficaDalRegistro`, `quadernoDalRegistro`) cercavano `tipo` e `dopo` sul contenitore invece che dentro `dati`, quindi non trovavano niente. Ora leggono le due forme (piatto e `{ id, dati }`, come fa già `datiVoce` dell'anamnesi) e prendono l'ultima voce **per data**, non per posizione nell'elenco. In più, dopo ogni lettura riuscita la pagina riapplica i valori ai campi già montati: l'anagrafica si riempie dal registro (prima solo dalla memoria di sessione), il quaderno pure, e i tasti a scelta (Sesso, Lingua, Obiettivo) tornano accesi. Il contatore delle versioni riparte dal registro, così la voce nuova dopo un refresh è `v2` e non di nuovo `v1`. Una casella aperta non si tocca: chi sta scrivendo non perde una lettera. «Patologie o infortuni» funzionava già e resta com'è.
- **Passo 23 (giro di controllo, primo blocco)** — le voci che si potevano correggere senza decidere niente di nuovo, una per una. (1) Il nastro non dice più «35 esercizi» dal costruttore d'esempio del v31: conta gli esercizi del programma aperto (lo stesso numero della carta, «1 scheda · 6 esercizi») e, senza programma, dice che non c'è; la data dell'ultima seduta resta quella vera del logbook. (2) «Compila / Modifica» in Dati cliente → Anamnesi non è più muto: apre la riga «Patologie o infortuni», le mette il fuoco e lo dice nella riga d'avviso; non scrive niente da sé. (3) «Importa» e «Copia i dati (JSON)» di Misure scrivono l'esito DOVE SI GUARDA: accanto al tasto e nella riga di stato (prima finiva nella linguetta Misure, nascosta); l'errore del JSON e il rifiuto degli appunti si leggono anche loro lì. (4) Il Database esercizi usa il catalogo condiviso col selettore: i dieci doppioni da codifica (il simbolo ° letto come «Â°») sono uniti, 186 → **176** voci, e restano come alias nel riconoscimento; la tabella è rigenerata dal catalogo, con i sette esercizi del passo 20 che prima mancavano (senza BS/TUT, dichiarato nella riga). (5) La settimana del blocco è UNA funzione, `comune/settimana-blocco.js`, usata da Dashboard, Overview e Pianificazione: le tre dicono «settimana 8 di 8» (o la stessa frase col motivo quando i dati mancano). (6) Archivio: Sedute e Ultima leggono lo stesso logbook dell'Overview (una seduta si attribuisce a un programma solo se il codice della scheda è di un programma solo) — 1 e 26/10/2026, non più «non registrato»; quelle non attribuibili restano fuori e la nota lo dice. (7) Impostazioni mostra la build vera di `app-config-b.js` e conta schede ed esercizi dai dati; «Alice Clemente» scritto a mano in cinque punti (barra laterale, Dati cliente, Salute, Misure, Monitor peso) ora viene dall'account e dall'anagrafica: senza cognome nel profilo si legge solo «Alice». (9) La nota da sviluppatori nell'Overview è una frase per l'utente: «1 seduta letta dal logbook; il diario non è collegato». (12) Il BMI dice QUALE dato manca (con il peso e senza altezza: «manca l'altezza»), e «SESSIONI» è diventato «Sessioni di plicometria». Minori: «Suggerimenti: non disponibili» col perché nel titolo, il pannello «Applica progressione» si chiude con Esc, i singolari («1 seduta», «1 sessione»), e «Confronta con un altro programma» / «Copia da un altro programma» scritti interi. Mascotte, fumetto, Study time e lampadina restano al blocco dopo (impaginazione da guardare insieme).
