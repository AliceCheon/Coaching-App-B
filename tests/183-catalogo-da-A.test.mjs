/* Guardia 183 (passo 32) — gli esercizi di Barbell Diva A entrano in B.
 *
 * Alice ha mandato il backup di Barbell Diva A (12 MB, 587 record di
 * `masterExerciseLibrary`). Il catalogo di B ne aveva già una parte; gli altri
 * mancavano. Il travaso è stato fatto con giudizio, e questo file è il conto
 * che deve tornare sempre:
 *
 *   183.1  i 587 record di A finiscono in UNA delle quattro categorie —
 *          già presente (167) / aggiunto (370) / da classificare (31) /
 *          scartato perché non è un esercizio (19) — e la somma fa 587;
 *   183.2  ogni esercizio aggiunto ha un distretto valido (le etichette della
 *          pagina) e non è un doppione, né per nome né come alias; i 176 di
 *          prima non hanno cambiato distretto;
 *   183.3  niente underscore nei nomi, la pagina dice lo stesso numero del
 *          catalogo (546) e le 370 voci nel blocco #db-aggiunte sono esattamente
 *          quelle aggiunte, nome per nome.
 *
 * Le liste qui sotto vengono dal backup e NON vanno rigenerate a mano: se un
 * giorno un nome cambia, questo file diventa rosso e si vede subito.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { JSDOM } from "jsdom";

import { CATALOGO_ESERCIZI_B, conteggioCatalogoB } from "../comune/catalogo-esercizi-b.js";
import { ALIAS_NOMI, normalizzaNome } from "../comune/riconoscimento-esercizio.js";

const radice = join(dirname(fileURLToPath(import.meta.url)), "..");
const HTML = readFileSync(join(radice, "desktop", "index.html"), "utf8");

/* I record del backup di A. */
const RECORD_A = 587;

/* Le etichette dei distretti come le scrive la pagina del Database esercizi:
 * «Petto» è il pettorale (il riconoscimento lo traduce in «Pettorali»). */
const DISTRETTI_PAGINA = [
  "Petto", "Dorsali", "Spalle", "Bicipiti", "Tricipiti", "Quadricipiti", "Femorali",
  "Glutei", "Adduttori", "Centro schiena", "Addominali", "Polpacci", "Cardio",
  "Attivazione", "Custom"
];

/* 167 nomi di A che B aveva già (normalizzati come l'app). */
const PRESENTI = [
  "Ab Roll",
  "Abductor",
  "Addominali livello 1",
  "Adductor",
  "Affondi al multypower",
  "Affondi forntali manubri",
  "Affondo con rotazione busto triset",
  "Affondo front squat machine",
  "Affondo pesante triset",
  "Alzata laterale su panca inclinata 30°",
  "Alzate deltoidi posteriori",
  "Alzate laterali",
  "Alzate laterali + alzate frontali panca 70°",
  "Alzate laterali cavo basso cavigliera polso",
  "Alzate laterali macchinario",
  "Alzate laterali Seduta",
  "Arnold Press",
  "Bulgaro focus glutei",
  "Calf al multypower",
  "Calf Frog",
  "Calf machine",
  "Cardio tapins + corsa",
  "Chest press",
  "Clam shell side plank",
  "Croci ai cavi",
  "Croci inverse con uso delle scapole",
  "Croci inverse manubri",
  "Croci manubri",
  "Croci manubri su panca inclinata",
  "Cross over ai cavi",
  "Crunch classici",
  "Crunch gambe 90°",
  "Crunch machine",
  "crunch obliqui",
  "Curl cavo basso con bilancere piccolo",
  "Curl manubri",
  "Curls Bilaciere Z",
  "Curls manubri schiena al muro",
  "Curls martello in piedi",
  "Curls martello panca",
  "Curls martello panca inlinata 45°",
  "Curls panca 45°",
  "Curls panca scoot",
  "Curls trx",
  "Dead bug dinamico",
  "Dips inclinato in avanti",
  "Dips stretti",
  "Distensione manubri su inclinata",
  "Distensioni manubri su piana",
  "Donkey calf",
  "Dragon Flag",
  "Dragon Flag mono",
  "Face Pull",
  "Face pull reverse pec",
  "Farmer Walk",
  "Floor press bilanciere",
  "Floor press manubri",
  "French press bilanciere Z",
  "French press manubri",
  "French press panca 40°",
  "Frog Pump con elastico",
  "Front squat machine",
  "Gentlemen row",
  "Ghd",
  "GHD lateral crunch",
  "GHD sit up crunch",
  "Glutes machine",
  "Goblet squat",
  "Hack Squat con elastico",
  "Hamstring Destroyers",
  "Hip Thrust",
  "Hip Thrust statico",
  "Hip Trust mono",
  "Hollow position",
  "Hypersetensioni con cuscino",
  "Hyperstension con cuscinetto",
  "Jefferson Culs",
  "Kick back",
  "Krock Row",
  "Lat machine",
  "Lat Machine supina",
  "Lat machine Triangolo",
  "Lat mono braccio",
  "Leg curls",
  "Leg curls seduta",
  "Leg curls singolo",
  "Leg Curs Fitbal",
  "Leg Extension",
  "Leg extension singola",
  "Leg press steso",
  "Leg raise",
  "Lento avanti machine",
  "Lento avanti manubri",
  "Military al multypower panca70°",
  "Military press",
  "Panca inclinata",
  "Panca piana",
  "Passo del granchio",
  "Peck deck",
  "Pendaly Row",
  "Pendulum",
  "Pendulum focus glutei",
  "Piegamenti sulle braccia",
  "Plank statico",
  "Polpacci in piedi",
  "Polpacci seduto",
  "Pressa 45°",
  "Pressa mono gamba",
  "Pressa verticale panatta",
  "Pressa45° piedi alti schienale chiuso",
  "Pull Down corda",
  "Pull down sbarra",
  "Pulley mono",
  "Pulley sbarra presa larga supina",
  "Pulley triangolo",
  "Pullover bilanciere",
  "Pullover manubrio",
  "Push Press Ktb",
  "Push Up",
  "Push ups",
  "RDL Belt machine",
  "RDL focus Gluteo",
  "RDL focus Gluteo Belt machine",
  "Reamtore mono braccio corda bassa",
  "Rematore bilanciere",
  "Rematore Bilanciere Z",
  "Rematore Dead Stop",
  "Rematore manubri panca 30°",
  "Rematore supino",
  "Renegade row",
  "Rotazioni cavo medio",
  "Row machine panatta",
  "Scrollate con manubri",
  "Side Plank",
  "Sissy squat in piedi",
  "Slanci cavo basso",
  "Slanci laterali cavo basso",
  "Slancio laterale cavo basso triset",
  "Spider curls",
  "Squat",
  "Squat al multypower",
  "Squat Bulgaro focus quads",
  "Squez Press",
  "Stacco B Stance cavo",
  "Stacco B stance con cavo",
  "Stacco da rialzi",
  "Stacco gambe semi tese",
  "Stacco mono gamba",
  "Stacco RDL",
  "Stacco Regular",
  "Stacco Sumo",
  "Stretchers",
  "T bar",
  "Trazioni",
  "Trazioni assistite",
  "Trazioni gironda",
  "Trazioni neutre",
  "Trazioni supine",
  "Tricipiti cavo alto in corda",
  "Tricipiti cavo basso dietro la testa",
  "Tricipiti manubrio dietro la testa",
  "Tricipiti mono braccio cavo alto",
  "Tricipiti Pullover",
  "Triset glutei",
  "Vertical Traction",
  "Vogatore",
  "Y raises cavo alto"
];

/* 370 aggiunti: [nome pulito, distretto]. */
const AGGIUNTI = [
  ["Ab wheel rollout","Addominali"], ["Abduttori al cavo basso gamba avanti","Glutei"], ["Abduttori al cavo basso gamba dietro","Glutei"],
  ["Abduttori al macchinario busto piegato in avanti","Glutei"], ["Abduttori al macchinario posizione rialzata","Glutei"], ["Abduttori alla macchina da seduta","Glutei"],
  ["Abduttori alternati in piedi con elastico","Glutei"], ["Abduttori gamba piegata in quadrupedia","Glutei"], ["Abduttori macchinario in piedi","Glutei"],
  ["Abduttori seduto a terra con elastico","Glutei"], ["Abduttori seduto con elastico","Glutei"], ["Abduttori su fianco con disco","Glutei"],
  ["Abduttori su fianco corpo libero","Glutei"], ["Adductor plank","Adduttori"], ["Adduttori incrocio gambe","Adduttori"],
  ["Adduttori macchinario","Adduttori"], ["Affondi alternati all'indietro","Quadricipiti"], ["Affondi alternati in avanti","Quadricipiti"],
  ["Affondi alternati su step al multipower","Quadricipiti"], ["Affondi camminati","Quadricipiti"], ["Affondi curtsy","Quadricipiti"],
  ["Affondi inversi con manubri doppi","Quadricipiti"], ["Affondi laterali","Quadricipiti"], ["Affondi laterali singoli con manubri","Quadricipiti"],
  ["Affondi posteriori con bilanciere","Quadricipiti"], ["Affondi posteriori con manubri","Quadricipiti"], ["Affondi singoli al multipower","Quadricipiti"],
  ["Affondi singoli all'indietro","Quadricipiti"], ["Affondi singoli allo squat pendulum","Quadricipiti"], ["Affondi singoli con manubri sul posto","Quadricipiti"],
  ["Affondi singoli su step al multipower","Quadricipiti"], ["Affondi singoli sul posto con stance ampia","Quadricipiti"], ["Affondi sul posto","Quadricipiti"],
  ["Affondo alternato al multipower","Quadricipiti"], ["Alzate frontali con corda al cavo","Spalle"], ["Alzate frontali con disco","Spalle"],
  ["Alzate frontali con manubri in piedi","Spalle"], ["Alzate frontali con manubri su panca inclinata","Spalle"], ["Alzate frontali in piedi con bilanciere","Spalle"],
  ["Alzate frontali martello alternate con manubri","Spalle"], ["Alzate frontali martello con manubri in piedi","Spalle"], ["Alzate frontali singole","Spalle"],
  ["Alzate frontali singole a martello","Spalle"], ["Alzate frontali supine con bilanciere","Spalle"], ["Alzate laterali a martello","Spalle"],
  ["Alzate laterali al cavo","Spalle"], ["Alzate laterali al cavo basso in piedi","Spalle"], ["Alzate laterali al cavo dietro il corpo","Spalle"],
  ["Alzate laterali al macchinario con braccia distese","Spalle"], ["Alzate laterali al macchinario con braccia piegate","Spalle"], ["Alzate laterali alternate","Spalle"],
  ["Alzate laterali con manubri","Spalle"], ["Alzate laterali leaning","Spalle"], ["Alzate laterali posteriori singole al cavo basso","Spalle"],
  ["Alzate laterali singole","Spalle"], ["Alzate laterali su panca inclinata","Spalle"], ["Alzate posteriori al pec deck","Spalle"],
  ["Aperture posteriori con manubri prono su panca","Spalle"], ["Aperture posteriori singola al cavo basso","Spalle"], ["Aperture posteriori singole con manubrio","Spalle"],
  ["Arnold press da seduto","Spalle"], ["Arnold press in piedi","Spalle"], ["Back extension a 45°","Femorali"],
  ["Back squat","Quadricipiti"], ["Barbell strict press","Spalle"], ["Battle rope","Cardio"],
  ["Belt squat al macchinario","Quadricipiti"], ["Bench dip","Tricipiti"], ["Bicipiti con manubri su panca Scott","Bicipiti"],
  ["Bicipiti manubri con rotazione alternati","Bicipiti"], ["Box squat","Quadricipiti"], ["Bulgarian split squat","Quadricipiti"],
  ["Burpee","Cardio"], ["Cable pull-through","Glutei"], ["Calf raise alla leg press","Polpacci"],
  ["Calf raise da seduto","Polpacci"], ["Calf raise in piedi","Polpacci"], ["Calf raises monopodalici","Polpacci"],
  ["Camminata in salita","Cardio"], ["Cardio libero","Cardio"], ["Chest press ai cavi","Petto"],
  ["Chest press convergente","Petto"], ["Chest press inclinata","Petto"], ["Chest press presa neutra","Petto"],
  ["Chest supported row","Centro schiena"], ["Chin-up","Dorsali"], ["Clam shell con disco","Glutei"],
  ["Close grip bench press","Tricipiti"], ["Copenhagen plank","Adduttori"], ["Crab walk con elastico","Attivazione"],
  ["Croci ai cavi al macchinario","Petto"], ["Croci ai cavi bassi su panca inclinata 30°","Petto"], ["Croci ai cavi bassi su panca inclinata 45°","Petto"],
  ["Croci ai cavi bassi su panca piana","Petto"], ["Croci ai cavi busto a 90°","Petto"], ["Croci ai cavi da seduto","Petto"],
  ["Croci ai cavi su panca inclinata","Petto"], ["Croci basse ai cavi alti in piedi","Petto"], ["Croci basse ai cavi bassi su panca piana","Petto"],
  ["Croci basse al macchinario","Petto"], ["Croci con manubri su panca inclinata 45°","Petto"], ["Croci con manubri su panca piana","Petto"],
  ["Croci dal basso con manubri in piedi","Petto"], ["Crunch con mani avanti","Addominali"], ["Crunch inverso","Addominali"],
  ["Crunch laterale alternato","Addominali"], ["Crunch laterale singolo","Addominali"], ["Crunch obliqui gamba accavallata","Addominali"],
  ["Crunch obliqui sdraiato sul fianco","Addominali"], ["Crunch sollevato","Addominali"], ["Crunch su fitball","Addominali"],
  ["Curl a spalla flessa al cavo alto con barra","Bicipiti"], ["Curl ai cavi alti","Bicipiti"], ["Curl ai cavi bassi con maniglie","Bicipiti"],
  ["Curl al cavo basso","Bicipiti"], ["Curl al cavo basso con barra da seduto","Bicipiti"], ["Curl al cavo basso con corda","Bicipiti"],
  ["Curl al cavo basso singolo","Bicipiti"], ["Curl al pulley con barra da seduto","Bicipiti"], ["Curl al pulley con barra da supino su panca inclinata","Bicipiti"],
  ["Curl al pulley con corda da supino","Bicipiti"], ["Curl alternato su panca inclinata","Bicipiti"], ["Curl bicipiti al macchinario","Bicipiti"],
  ["Curl con bilanciere dritto","Bicipiti"], ["Curl con bilanciere EZ","Bicipiti"], ["Curl con bilanciere EZ presa prona","Bicipiti"],
  ["Curl concentrato","Bicipiti"], ["Curl inverso","Bicipiti"], ["Curl spider","Bicipiti"],
  ["Cyclette","Cardio"], ["Dead bug","Addominali"], ["Dip alle parallele","Petto"],
  ["Donkey kick al cavo","Glutei"], ["Fire hydrant","Glutei"], ["Floor press","Petto"],
  ["Front squat","Quadricipiti"], ["Glute bridge","Glutei"], ["Glute bridge con bilanciere","Glutei"],
  ["Glute ham raise","Femorali"], ["Good morning","Femorali"], ["Hack squat","Quadricipiti"],
  ["Hack squat inverso","Quadricipiti"], ["Hammer curl alternato con spalla intraruotata","Bicipiti"], ["Hammer curl con spalla intraruotata","Bicipiti"],
  ["Hammer curl in piedi","Bicipiti"], ["Hammer curl singolo","Bicipiti"], ["Hammer curl singolo con spalla intraruotata","Bicipiti"],
  ["Hamstring foam rolling","Femorali"], ["Hamstring walkout","Femorali"], ["Heel elevated squat","Quadricipiti"],
  ["Hip abduction al cavo","Glutei"], ["Hip adduction al cavo","Adduttori"], ["Hip thrust al macchinario leg extension","Glutei"],
  ["Hip thrust al multipower","Glutei"], ["Hip thrust al multipower su step","Glutei"], ["Hip thrust con bilanciere","Glutei"],
  ["Hip thrust con elastico","Glutei"], ["Hip thrust ingaggio tronco","Glutei"], ["Hip thrust monopodalico","Glutei"],
  ["Hollow body hold","Addominali"], ["Hyperextension a 45°","Femorali"], ["Hyperextension glute focus","Glutei"],
  ["Incline dumbbell press","Petto"], ["Jefferson curl","Femorali"], ["Jump squat","Quadricipiti"],
  ["L-sit","Addominali"], ["Lat machine presa supina","Dorsali"], ["Lat machine prona singola","Dorsali"],
  ["Lat machine singola","Dorsali"], ["Lat machine singola supina","Dorsali"], ["Lat machine su panca inclinata","Dorsali"],
  ["Lat machine T-bar","Dorsali"], ["Lat machine triangolo seduta inversa","Dorsali"], ["Lat pulldown presa larga","Dorsali"],
  ["Lat pulldown presa neutra","Dorsali"], ["Leg curl in piedi","Femorali"], ["Leg curl in piedi singolo alla leg extension","Femorali"],
  ["Leg curl sdraiato","Femorali"], ["Leg curl sdraiato con elastico","Femorali"], ["Leg curl sdraiato con manubrio","Femorali"],
  ["Leg curl sdraiato piedi stretti","Femorali"], ["Leg curl sdraiato singolo","Femorali"], ["Leg curl seduto","Femorali"],
  ["Leg curl seduto con punte dei piedi basse","Femorali"], ["Leg curl singola al cavo basso","Femorali"], ["Leg press a 45° stance alta e stretta","Quadricipiti"],
  ["Leg press a 45° stance bassa e stretta","Quadricipiti"], ["Leg press a 45° stance stretta","Quadricipiti"], ["Leg press a 45° sumo","Quadricipiti"],
  ["Leg press orizzontale","Quadricipiti"], ["Leg press orizzontale monopodalica","Quadricipiti"], ["Leg press orizzontale monopodalica sdraiato di lato","Quadricipiti"],
  ["Leg press orizzontale stance larga","Quadricipiti"], ["Leg press verticale al multipower","Quadricipiti"], ["Leg press verticale singola al multipower","Quadricipiti"],
  ["Leg raise alla sbarra","Addominali"], ["Leg raises da terra","Addominali"], ["Leg raises sui gomiti alle parallele","Addominali"],
  ["Lento avanti","Spalle"], ["Lento avanti al multipower","Spalle"], ["Low row","Centro schiena"],
  ["Low row presa neutra","Centro schiena"], ["Low row presa neutra singolo","Centro schiena"], ["Low row presa prona","Centro schiena"],
  ["Low row presa supina","Centro schiena"], ["Low row singolo presa neutra","Centro schiena"], ["Low row singolo presa prona","Centro schiena"],
  ["Low row singolo presa supina","Centro schiena"], ["Master gluteus","Glutei"], ["Meadows row","Centro schiena"],
  ["Military press in piedi","Spalle"], ["Mountain climber","Cardio"], ["Nordic curl","Femorali"],
  ["Overhead press","Spalle"], ["Pallof press","Addominali"], ["Panca inclinata al multipower","Petto"],
  ["Panca inclinata con bilanciere","Petto"], ["Panca inclinata con manubri","Petto"], ["Panca piana al multipower","Petto"],
  ["Panca piana con bilanciere","Petto"], ["Panca piana con manubri","Petto"], ["Panca piana presa stretta per tricipiti","Tricipiti"],
  ["Panca stretta al multipower","Tricipiti"], ["Panca stretta inclinata 45° al multipower","Tricipiti"], ["Peck back al macchinario","Spalle"],
  ["Pendlay row","Centro schiena"], ["Pendulum squat","Quadricipiti"], ["Pendulum squat stance stretta","Quadricipiti"],
  ["Pendulum squat sumo","Quadricipiti"], ["Plank","Addominali"], ["Plank laterale","Addominali"],
  ["Pull-up","Dorsali"], ["Pulley con presa supina al cavo basso","Centro schiena"], ["Pulley con triangolo","Centro schiena"],
  ["Pulley monolaterale","Centro schiena"], ["Pulley monolaterale con presa supina","Centro schiena"], ["Pulley singolo","Centro schiena"],
  ["Pulley T-bar","Centro schiena"], ["Pullover al cavo alto","Dorsali"], ["Pullover con manubri","Dorsali"],
  ["Pullover con manubrio singolo","Dorsali"], ["Pulses squat","Quadricipiti"], ["Push down con barra","Tricipiti"],
  ["Push down con barra presa supina","Tricipiti"], ["Push down con corda","Tricipiti"], ["Push down con corda su panca inclinata","Tricipiti"],
  ["Push down singolo con corda","Tricipiti"], ["Push down singolo con corda e spalla intraruotata","Tricipiti"], ["Push down singolo con maniglia","Tricipiti"],
  ["Push down supino singolo con maniglia","Tricipiti"], ["Push press con bilanciere","Spalle"], ["Rear delt row","Spalle"],
  ["Rematore al cavo basso","Centro schiena"], ["Rematore con bilanciere","Centro schiena"], ["Rematore con manubrio","Centro schiena"],
  ["Rematore su panca inclinata","Centro schiena"], ["Reverse fly ai cavi","Spalle"], ["Reverse hyperextension","Femorali"],
  ["Romanian deadlift","Femorali"], ["Russian twist","Addominali"], ["Seated cable row","Centro schiena"],
  ["Shoulder press al macchinario","Spalle"], ["Shoulder press con manubri","Spalle"], ["Side bend","Addominali"],
  ["Sissy squat","Quadricipiti"], ["Skull crusher","Tricipiti"], ["Sled drag","Cardio"],
  ["Sled push","Cardio"], ["Split squat","Quadricipiti"], ["Squat a piedi uniti al multipower","Quadricipiti"],
  ["Squat al cavo basso","Quadricipiti"], ["Squat al cavo basso con fermo","Quadricipiti"], ["Squat al multipower","Quadricipiti"],
  ["Squat al T-bar","Quadricipiti"], ["Squat bulgaro a corpo libero","Quadricipiti"], ["Squat bulgaro al macchinario","Quadricipiti"],
  ["Squat bulgaro al multipower","Quadricipiti"], ["Squat bulgaro con manubri","Quadricipiti"], ["Squat bulgaro con manubrio singolo","Quadricipiti"],
  ["Squat con bilanciere","Quadricipiti"], ["Squat con elastico","Quadricipiti"], ["Squat con manubri doppi","Quadricipiti"],
  ["Squat jump","Quadricipiti"], ["Squat press al T-bar","Quadricipiti"], ["Squat press con bilanciere","Quadricipiti"],
  ["Stacco a gambe tese al multipower","Femorali"], ["Stacco a gambe tese con bilanciere","Femorali"], ["Stacco da terra","Femorali"],
  ["Stacco da terra al macchinario","Femorali"], ["Stacco da terra con bilanciere","Femorali"], ["Stacco da terra con kettlebell","Femorali"],
  ["Stacco rumeno al cavo basso","Femorali"], ["Stacco rumeno al macchinario","Femorali"], ["Stacco rumeno al multipower","Femorali"],
  ["Stacco rumeno al multipower su step","Femorali"], ["Stacco rumeno al T-bar","Femorali"], ["Stacco rumeno B-stance","Femorali"],
  ["Stacco rumeno con bilanciere","Femorali"], ["Stacco rumeno con elastico","Femorali"], ["Stacco rumeno con manubri","Femorali"],
  ["Stacco rumeno monopodalico","Femorali"], ["Stacco rumeno monopodalico con manubrio","Femorali"], ["Stacco rumeno su step al multipower","Femorali"],
  ["Stacco sumo a gambe tese al multipower","Femorali"], ["Stacco sumo al multipower su step","Femorali"], ["Stacco sumo con bilanciere","Femorali"],
  ["Stacco sumo con bilanciere presa con schiena dritta","Femorali"], ["Stacco sumo con bilanciere presa mista","Femorali"], ["Stacco sumo con bilanciere presa prona","Femorali"],
  ["Stacco sumo con tirata bilanciere","Femorali"], ["Stacco sumo con tirata kettlebell","Femorali"], ["Stacco sumo su step al multipower","Femorali"],
  ["Standing cable crunch","Addominali"], ["Steering wheel in piedi con disco","Addominali"], ["Step down","Quadricipiti"],
  ["Step over sul box con doppio manubrio","Quadricipiti"], ["Step over sul box con manubrio singolo","Quadricipiti"], ["Step up alternati con manubrio singolo","Quadricipiti"],
  ["Step up alternato","Quadricipiti"], ["Step up alternato al multipower","Quadricipiti"], ["Step up alternato con manubri doppi","Quadricipiti"],
  ["Step up incrociato singolo","Petto"], ["Step up singolo","Quadricipiti"], ["Step up singolo al multipower","Quadricipiti"],
  ["Straight arm pulldown","Dorsali"], ["Stretch dei quadricipiti in piedi","Quadricipiti"], ["Stretch dorsali in piedi con supporto rack","Dorsali"],
  ["Stretch ischiocrurali al muro","Femorali"], ["Stretch polpacci al muro","Polpacci"], ["Stretch polpacci con disco","Polpacci"],
  ["Stretch quadricipiti da seduti","Quadricipiti"], ["Stretching dorsali con banda elastica","Dorsali"], ["Stretching dorsali con foam roller","Dorsali"],
  ["Stretching ischiocrurali con banda elastica","Femorali"], ["Stretching tricipiti con banda elastica","Tricipiti"], ["Sumo squat con manubrio","Quadricipiti"],
  ["T-bar row","Centro schiena"], ["Tapins + corsa","Cardio"], ["Tapis roulant","Cardio"],
  ["Tirate al mento 90° con bilanciere","Spalle"], ["Tirate al mento al cavo basso con barra","Spalle"], ["Tirate al mento al cavo basso con corda","Spalle"],
  ["Tirate al mento al multipower","Spalle"], ["Tirate al mento con bilanciere","Spalle"], ["Tirate al mento con corda al cavo alto","Spalle"],
  ["Tirate al mento con manubri","Spalle"], ["Tirate al mento larghe con manubri","Spalle"], ["Toes to bar","Addominali"],
  ["Total crunch","Addominali"], ["Trazione scapolare alla sbarra","Dorsali"], ["Trazioni alla sbarra","Dorsali"],
  ["Trazioni alla sbarra presa neutra","Dorsali"], ["Trazioni alla sbarra presa neutra larga","Dorsali"], ["Trazioni alla sbarra presa supina","Dorsali"],
  ["Trazioni orizzontali agli anelli","Centro schiena"], ["Triceps extension sopra la testa","Tricipiti"], ["Tuck-up","Addominali"],
  ["Upright row","Spalle"], ["V-up","Addominali"], ["V-up alternati","Addominali"],
  ["Vertical row machine","Centro schiena"], ["Vertical row machine presa neutra","Centro schiena"], ["Vertical row machine singolo","Centro schiena"],
  ["Vertical row machine singolo presa neutra","Centro schiena"], ["Walking calf raises con manubri","Polpacci"], ["Walking lunge","Quadricipiti"],
  ["Wall sit","Quadricipiti"], ["Wide chest press","Petto"], ["Zercher squat","Quadricipiti"],
  ["Zottman curl","Bicipiti"]
];

/* 31 nomi che restano fuori: senza un distretto riconoscibile, o con due
 * esercizi in una riga. Non entrano nel catalogo e non si indovina. */
const DA_CLASSIFICARE = [
  "Abduzioni scapolari",
  "Affondo + squat al multipower",
  "Affondo indietro + rematore al cavo basso",
  "American swing",
  "Attivazione Y-T-A con banda elastica",
  "Bear crawl",
  "Bird dog",
  "Box jump",
  "Chest pull con corda",
  "Child's pose",
  "Clean and jerk",
  "Kettlebell swing",
  "Power clean",
  "Snatch",
  "Squat + rematore al cavo basso",
  "Squat + slanci laterali con banda elastica in abduzione",
  "Stacco rumeno + rematore con elastico",
  "Stacco rumeno + rematore con manubri",
  "Stretch a braccio esteso",
  "Stretch braccia a terra alternato",
  "Stretch ginocchio al petto singolo",
  "Superman",
  "Thruster con bilanciere",
  "Thruster con kettlebell",
  "Thruster con manubri",
  "Thruster con manubrio singolo",
  "Tibialis raise",
  "Toe touch",
  "Toe touch laterale in posizione supina",
  "Turkish get-up",
  "Wall-ball"
];

/* 19 scartati perché non sono esercizi: due frasi, un segnaposto e i sedici
 * nomi dei WOD di CrossFit. */
const SCARTATI = [
  "Amanda",
  "Angie",
  "Annie",
  "Barbara",
  "Chelsea",
  "Cindy",
  "Esercizio custom",
  "Helen",
  "Isabel",
  "Jackie",
  "Karen",
  "Kelly",
  "Linda",
  "Lynne",
  "Mary",
  "Nancy",
  "Nicole",
  "sai già fare 10 push up a terra?",
  "Se sai fare già 10 push up o sei arrivato a terra segui questa riga e quella sotto"
];

test("183.1 i 587 record di A sono tutti contati, e la somma torna", () => {
  assert.equal(PRESENTI.length, 167, "i già presenti devono essere 167");
  assert.equal(AGGIUNTI.length, 370, "gli aggiunti devono essere 370");
  assert.equal(DA_CLASSIFICARE.length, 31, "i da classificare devono essere 31");
  assert.equal(SCARTATI.length, 19, "gli scartati devono essere 19");
  const somma = PRESENTI.length + AGGIUNTI.length + DA_CLASSIFICARE.length + SCARTATI.length;
  assert.equal(somma, RECORD_A, "i record di A contati non tornano: " + somma + " invece di " + RECORD_A);
  /* Nessun nome sta in due categorie. */
  const tutti = PRESENTI.concat(AGGIUNTI.map((x) => x[0]), DA_CLASSIFICARE, SCARTATI).map(normalizzaNome);
  assert.equal(new Set(tutti).size, tutti.length, "un nome di A è finito in due categorie");
});

test("183.2 ogni aggiunto ha un distretto valido e non è un doppione", () => {
  const validi = new Set(DISTRETTI_PAGINA);
  const perNorma = new Map();
  CATALOGO_ESERCIZI_B.forEach((v) => perNorma.set(normalizzaNome(v.n), v.n));
  const aliasNorma = new Set(Object.keys(ALIAS_NOMI).map(normalizzaNome));

  AGGIUNTI.forEach(([nome, distretto]) => {
    assert.ok(validi.has(distretto), "distretto non valido per «" + nome + "»: " + distretto);
    assert.equal(nome.indexOf("_"), -1, "il nome aggiunto porta ancora un underscore: " + nome);
    const k = normalizzaNome(nome);
    assert.ok(k.length > 0, "nome aggiunto vuoto");
    const nelCatalogo = perNorma.get(k);
    assert.ok(nelCatalogo, "l'aggiunto non è nel catalogo: " + nome);
    assert.equal(nelCatalogo, nome, "l'aggiunto è nel catalogo con un altro nome: " + nome + " → " + nelCatalogo);
    assert.equal(aliasNorma.has(k), false, "l'aggiunto è anche un alias: " + nome);
  });

  /* Il catalogo non ha due voci che si leggono uguale. */
  const letti = CATALOGO_ESERCIZI_B.map((v) => normalizzaNome(v.n));
  assert.equal(new Set(letti).size, letti.length, "il catalogo ha due nomi che si leggono uguale");

  /* I 176 di prima ci sono ancora tutti, con il loro distretto. */
  const perNome = new Map(CATALOGO_ESERCIZI_B.map((v) => [v.n, v.g]));
  const prima = [
    ["Panca piana", "Petto"], ["Squat", "Quadricipiti"], ["Hip Thrust", "Glutei"],
    ["Leg curls", "Femorali"], ["Lat machine", "Dorsali"], ["Pulley triangolo", "Centro schiena"],
    ["Curl manubri", "Bicipiti"], ["French press manubri", "Tricipiti"], ["Push Up", "Petto"],
    ["Trazioni", "Dorsali"], ["Plank statico", "Addominali"], ["Calf machine", "Polpacci"],
    ["Vogatore", "Cardio"], ["Pendulum focus glutei", "Glutei"], ["Affondo front squat machine", "Quadricipiti"],
    ["Pulley mono", "Centro schiena"], ["Slanci laterali cavo basso", "Glutei"],
    ["Curl bilanciere", "Bicipiti"], ["Lat machine presa neutra", "Dorsali"]
  ];
  prima.forEach(([n, g]) => assert.equal(perNome.get(n), g, "una voce di prima ha cambiato nome o distretto: " + n));
});

test("183.3 niente underscore, i numeri della pagina tornano, e le voci sono quelle", () => {
  CATALOGO_ESERCIZI_B.forEach((v) => {
    assert.equal(v.n.indexOf("_"), -1, "nome con underscore nel catalogo: " + v.n);
  });

  /* Il numero del catalogo e quello della pagina sono lo stesso. */
  assert.equal(conteggioCatalogoB(), 546, "il catalogo deve avere 546 esercizi");
  const dom = new JSDOM(HTML, { url: "http://localhost/desktop/index.html" });
  const doc = dom.window.document;
  const testa = doc.querySelector("#pag-database-esercizi .db-testa h2");
  assert.match(testa.textContent, new RegExp(conteggioCatalogoB() + " esercizi"), "la testata della pagina non dice il numero del catalogo");
  assert.match(doc.querySelector('#pag-database-esercizi .db-tabs button[data-t="db"]').textContent,
    new RegExp("\\(" + conteggioCatalogoB() + "\\)"), "la linguetta della pagina non dice il numero del catalogo");

  /* Le voci di A stanno nel blocco #db-aggiunte, esattamente quelle aggiunte. */
  const blocco = doc.getElementById("db-aggiunte");
  assert.ok(blocco, "manca il blocco #db-aggiunte");
  const extra = [...new JSDOM("<table><tbody>" + blocco.textContent + "</tbody></table>").window.document.querySelectorAll("tr.riga")];
  assert.equal(extra.length, AGGIUNTI.length, "il blocco non porta tutte le voci aggiunte");
  const nomiBlocco = extra.map((r) => r.querySelector("td.nm").firstChild.textContent).sort((a, b) => a.localeCompare(b, "it"));
  const nomiAttesi = AGGIUNTI.map((x) => x[0]).sort((a, b) => a.localeCompare(b, "it"));
  assert.deepEqual(nomiBlocco, nomiAttesi, "il blocco e la lista degli aggiunti non hanno gli stessi nomi");
  extra.forEach((r) => {
    assert.ok(DISTRETTI_PAGINA.includes(r.getAttribute("data-g")), "riga aggiunta con distretto non valido: " + r.getAttribute("data-n"));
  });
});
