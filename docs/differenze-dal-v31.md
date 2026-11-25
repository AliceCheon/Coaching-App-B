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

- righe 40-44 — token --zebra-a
- righe 46-48 — token --sup-cornice-a
- righe 75-79 — token --zebra-a
- righe 81-83 — token --sup-cornice-a
- righe 142-151 — /* ---- TENDINE: il menu nativo segue il tema (UN SOLO pos
- righe 612-898 — .ck-red-cla{margin-top:11px;border-top:1px solid var(--lin
- righe 1485-1623 — #bd-stampa-css
- righe 1648 — #nomeProgrammaAttivo
- righe 1690-1691 — <b class="db-titolo">Sei pronta, Alice!</b>
- righe 1713-1714 — <text x="48" y="52" text-anchor="middle" class="ck-gauge-n
- righe 1720-1721 — <h3>Readiness media <span class="ck-slash">—</span> <b>72/
- righe 1723 — <p class="ck-frase">I segnali di oggi reggono il carico.</
- righe 1728 — <div class="ck-chips">            <span class="ck-chip"><e
- righe 1789 — <div class="ck-red-num"><b>—</b><span class="ck-pill mute"
- righe 1792 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1795 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 
- righe 1799-1800 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 
- righe 1834 — <div class="ck-fare-link spento"><svg class="ck-ic" viewBo
- righe 1915 — <article class="ck-card">
- righe 1917-1941 — <p>carico per articolazione · la tacca sarebbe il 100% del
- righe 1948 — <p>Anagrafica, Anamnesi, Biofeedback e Questionari</p>
- righe 1954-1955 — tasti data-dc="wearable" e data-dc="personalizzati" tolti
- righe 2047-2113 — pannelli Biofeedback e Questionari riscritti (via i due gusci wearable/personalizzati)
- righe 2136 — <div class="ms-who"><b>Alice Clemente</b> · 178 cm · 31 an
- righe 2260-2261 — window.(seme di esempio)={"config": {"altezza": 178, "sesso": "d", 
- righe 2333 — var S=(typeof window!=="undefined")?window.(seme di esempio):null;
- righe 2341 — var S=(typeof window!=="undefined")?window.(seme di esempio):null;
- righe 2887 — #lb-nota-b
- righe 2901-2904 — var sed=(window.BD_LB_SEED&&window.BD_LB_SEED.sedute)//[];
- righe 2918 — var cand=sed.filter(function(x){return x.d===dd;});
- righe 2931 — aggiornaMappa();
- righe 2944 — if(cnt&&(fv//fo))cnt.textContent=vis+" di "+sed.length+" s
- righe 2956 — #pl-nome
- righe 2998 — <p class="pr-sub">Le regole con cui le settimane salgono. 
- righe 3008 — #rv-guida
- righe 3223 — #sp-corpo
- righe 3223-3224 — </div>
- righe 3226-3227 — <style>.cvx{display:block}
- righe 3230 — <div class="v-occhiello">Programmi · Curve di forza</div>
- righe 3232 — #cv-guida
- righe 3232-3233 — #cv-lista2
- righe 3235-3237 — #cv-real
- righe 3237-3238 — #cvp-mappa
- righe 3240-3282 — #pag-scheletri
- righe 3292 — #pag-programma-1
- righe 3379 — #t8-appprog
- righe 3412 — #box-A
- righe 3423 — #t8-skel-n
- righe 3455-3456 — #t9-an
- righe 3536-3557 — #pag-programma-2
- righe 4213 — <p class="v-testo">Tutti i programmi del backup, attivo co
- righe 4217 — #archivio-corpo
- righe 5370-5724 — document.getElementById("fr-nastro").textContent =
- righe 6057 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":
- righe 6432-6436 — .tb-test{display:none;font:800 9.5px/1 'Nunito Sans',sans-
- righe 7244-7280 — #pag-programma-1 .pr-shd-f{display:flex;align-items:flex-e
- righe 7421-7422 — html body #pag-programma-1 .p8-r .tb-test{font-size:8px;pa
- righe 7449-7476 — /* ---- zebra: riga chiara / riga leggermente più scura --
- righe 7521 — html body #pag-programma-1 td.c-rec .rec,html body #pag-pr
- righe 7566-7567 — html body #pag-programma-1 .p8-r .tb-test i{width:6px;heig
- righe 7617-7618 — /* ---- Test: si vede solo se c'e' davvero ---- */
- righe 7969 — window.BD_LB_SEED = {"fonte":"backup del 30/10/2026","sedu
- righe 8126 — ese.push('<div class="lb-ex"><b>' + sc(e.n) + '</b>' + (wi
- righe 8514-8515 — ['#pr-print1','#pr-print2'].forEach(function(id){
- righe 8968 — var SEED = window.(seme di esempio) // {config:{}, sessioni:[]};
- righe 9429-9988 — '<div class="ese-chips2"><span class="chlat">\u21c4 DX/SX<
- righe 10163-10172 — // Passo 30: nei campi si lascia al browser la cronologia 
- righe 10281-10282 — /* === Fase B2: Archivio + Curve dal logbook (dati veri, c
- righe 10326-10332 — <!-- beacon Cloudflare tolto --> + <link rel="icon"> inline (passo 16b)

### Passo 15 — Dati Cliente: via le linguette Wearable e Personalizzati

### Passo 16b — i residui del passo 16: la quarta versione, il beacon Cloudflare, l'icona, l'audio

- righe 1667 — <span ...>Anteprima in costruzione: non è ancora la versione in produzione.</span> (via «In produzione resta la v148.36»)
- righe 6315 — if(navigator.userActivation…hasBeenActive===false)return; prima di creare l'AudioContext (la Diva cinguetta dopo un gesto, non al caricamento)
- righe 7115-7116 — <!-- beacon Cloudflare tolto (passo 16b) --> al posto dei due <script> static.cloudflareinsights.com
