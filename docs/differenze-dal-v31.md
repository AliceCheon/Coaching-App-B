# Differenze del desktop dal v31

Regola di casa (guardia 42): `desktop/index.html` può differire da `pc/index.html` — il v31 congelato — **solo nelle righe elencate qui sotto**. Ogni modifica futura aggiunge un blocco a questo documento, altrimenti la suite è rossa.

- `pc/index.html` resta congelato — sha256 di pc/index.html: `c612e2bbdae952546a250ed0ea58d7eab825178e6b1551b0bc6a6981af78a7c8`
- file nuovo (non cambia il v31): `desktop/app-v31.js` — login Google + lettura in sola lettura + render del Programma attivo
- `tests/09` continua a guardare `desktop/index.html`; `tests/01` e le scansioni di `tests/02` e `tests/08` lo lasciano escluso come prima (l'editor statico nascosto porta dentro il seme di esempio del v31: finché resta nascosto non viene mostrato, e le scansioni non lo leggono)
- i dati di esempio del Programma attivo non si vedono più (editor statico nascosto); `window.BD_LB_SEED` resta nel file: lo usano le schermate non ancora collegate (Dashboard, Overview, Riepilogo volume…)

## Le righe cambiate (numeri di desktop/index.html)

Ogni blocco qui sotto e un pezzo di diff vero fra `pc/index.html` (il v31 congelato) e `desktop/index.html`: il numero e la riga che cambia, non un margine largo. Se un blocco non combacia piu, si corregge il numero guardando il diff, mai allargando il blocco.

### Passo 8 - via i numeri del mockup da Curve di forza, Pianificazione, Misure e Dashboard

Curve di forza: sezione ridotta a `data-curva="non-calcolata"`. Pianificazione: `#pianificazione-viva` con `renderPianificazione`/`riepilogoPianificazione` e CSS `.pz-*`. Misure: via `__BDSEED`. Dashboard: readiness a trattino, «non registrato», nessuna media inventata.

### Riparazione del passo 8 - le quattro tab tornate al v31

Scheletri, Programma 1 (`#programma-attivo`), Impostazioni e Study time erano state cancellate per errore insieme alle sezioni riscritte: sono state ripristinate identiche al v31, e per questo nel diff non compaiono come righe cambiate.

### I blocchi

- righe 40-44 — token --zebra-a
- righe 46-48 — token --sup-cornice-a
- righe 75-79 — token --zebra-a
- righe 81-83 — token --sup-cornice-a
- righe 142-151 — /* ---- TENDINE: il menu nativo segue il tema (UN SOLO pos
- righe 612-634 — .ck-red-cla{margin-top:11px;border-top:1px solid var(--lin
- righe 1485-1588 — #bd-stampa-css
- righe 1640-1640 — #nomeProgrammaAttivo
- righe 1682-1683 — <b class="db-titolo">Sei pronta, Alice!</b>
- righe 1705-1706 — <text x="48" y="52" text-anchor="middle" class="ck-gauge-n
- righe 1712-1713 — <h3>Readiness media <span class="ck-slash">—</span> <b>72/
- righe 1715-1715 — <p class="ck-frase">I segnali di oggi reggono il carico.</
- righe 1720-1720 — <div class="ck-chips">            <span class="ck-chip"><e
- righe 1781-1781 — <div class="ck-red-num"><b>—</b><span class="ck-pill mute"
- righe 1784-1784 — <div class="ck-red-cla" data-reds-classifica></div>
- righe 1787-1787 — <div class="ck-dove-r"><svg class="ck-ic" viewBox="0 0 16 
- righe 1791-1792 — <div class="ck-avviso"><svg class="ck-ic" viewBox="0 0 16 
- righe 1826-1826 — <div class="ck-fare-link spento"><svg class="ck-ic" viewBo
- righe 1907-1907 — <article class="ck-card">
- righe 1909-1911 — <p>carico per articolazione · la tacca sarebbe il 100% del
- righe 2132-2132 — <div class="ms-who"><b>Alice Clemente</b> · 178 cm · 31 an
- righe 2256-2257 — window.__BDSEED={"config": {"altezza": 178, "sesso": "d", 
- righe 2329-2329 — var S=(typeof window!=="undefined")?window.__BDSEED:null;
- righe 2337-2337 — var S=(typeof window!=="undefined")?window.__BDSEED:null;
- righe 2883-2883 — #lb-nota-b
- righe 2897-2900 — var sed=(window.BD_LB_SEED&&window.BD_LB_SEED.sedute)//[];
- righe 2914-2914 — var cand=sed.filter(function(x){return x.d===dd;});
- righe 2927-2927 — aggiornaMappa();
- righe 2940-2940 — if(cnt&&(fv//fo))cnt.textContent=vis+" di "+sed.length+" s
- righe 2952-2952 — #pl-nome
- righe 2994-2994 — <p class="pr-sub">Le regole con cui le settimane salgono. 
- righe 3004-3004 — #rv-guida
- righe 3219-3219 — #sp-corpo
- righe 3219-3220 — </div>
- righe 3222-3223 — <style>.cvx{display:block}
- righe 3226-3226 — <div class="v-occhiello">Programmi · Curve di forza</div>
- righe 3228-3228 — #cv-guida
- righe 3228-3229 — #cv-lista2
- righe 3231-3233 — #cv-real
- righe 3233-3234 — #cvp-mappa
- righe 3236-3236 — #pag-scheletri
- righe 3293-3293 — #pag-programma-1
- righe 3380-3380 — #t8-appprog
- righe 3413-3413 — #box-A
- righe 3424-3424 — #t8-skel-n
- righe 3456-3457 — #t9-an
- righe 3537-3537 — #pag-programma-2
- righe 4214-4214 — <p class="v-testo">Tutti i programmi del backup, attivo co
- righe 4218-4218 — #archivio-corpo
- righe 5371-5379 — document.getElementById("fr-nastro").textContent =
- righe 6075-6075 — var LABEL={"pag-dashboard":"Dashboard","pag-dati-cliente":
- righe 6450-6454 — .tb-test{display:none;font:800 9.5px/1 'Nunito Sans',sans-
- righe 7262-7298 — #pag-programma-1 .pr-shd-f{display:flex;align-items:flex-e
- righe 7439-7440 — html body #pag-programma-1 .p8-r .tb-test{font-size:8px;pa
- righe 7467-7494 — /* ---- zebra: riga chiara / riga leggermente più scura --
- righe 7539-7539 — html body #pag-programma-1 td.c-rec .rec,html body #pag-pr
- righe 7584-7585 — html body #pag-programma-1 .p8-r .tb-test i{width:6px;heig
- righe 7635-7636 — /* ---- Test: si vede solo se c'e' davvero ---- */
- righe 7987-7987 — window.BD_LB_SEED = {"fonte":"backup del 30/10/2026","sedu
- righe 8144-8144 — ese.push('<div class="lb-ex"><b>' + sc(e.n) + '</b>' + (wi
- righe 8532-8533 — ['#pr-print1','#pr-print2'].forEach(function(id){
- righe 8986-8986 — var SEED = window.__BDSEED // {config:{}, sessioni:[]};
- righe 9447-9447 — '<div class="ese-chips2"><span class="chlat">\u21c4 DX/SX<
- righe 10177-10186 — // Passo 30: nei campi si lascia al browser la cronologia 
- righe 10295-10296 — /* === Fase B2: Archivio + Curve dal logbook (dati veri, c
- righe 10341-10345 — <script src="../app-config-b.js"></script>

