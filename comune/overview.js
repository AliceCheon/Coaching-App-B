/* Barbell Diva B — i conti della Overview atleta (fase 2.3).
 *
 * Funzioni pure: ricevono le sedute già lette e non parlano con Firebase.
 * Regola di casa: qui non si inventano soglie. Il piano settimanale non è nel
 * contratto di lettura, quindi non esiste un «dovuto»: si contano le sedute
 * che ci sono, e si chiama «ritmo», non «aderenza».
 */

const GIORNO = 86400000;

/* Una data di seduta può arrivare ISO (2026-10-27) o all'italiana (27/10/2026). */
export function dataSeduta(valore) {
  if (!valore) return null;
  const t = String(valore).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return null;
}

export function dataDiSeduta(seduta) {
  if (!seduta || typeof seduta !== "object") return null;
  return dataSeduta(seduta.dateInput) || dataSeduta(seduta.date);
}

function inizioGiorno(d) {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/* Giorni interi tra due date: la sottrazione, non una stima. */
export function giorniTra(prima, dopo) {
  if (!prima || !dopo) return null;
  return Math.round((inizioGiorno(dopo) - inizioGiorno(prima)) / GIORNO);
}

/* Le sedute con una data leggibile, dalla più vecchia alla più recente. */
export function seduteDatate(sedute) {
  const elenco = Array.isArray(sedute) ? sedute : [];
  const conData = [];
  for (const s of elenco) {
    const d = dataDiSeduta(s);
    if (d) conData.push({ data: d, seduta: s });
  }
  conData.sort((a, b) => inizioGiorno(a.data) - inizioGiorno(b.data));
  return conData;
}

/* Quante sedute negli ultimi N giorni, oggi compreso. */
export function seduteUltimiGiorni(sedute, giorni, oggi) {
  const rif = oggi || new Date();
  const conData = seduteDatate(sedute);
  if (!conData.length) return { numero: 0, da: null, a: null };
  const limite = inizioGiorno(rif) - (giorni - 1) * GIORNO;
  const dentro = conData.filter((x) => inizioGiorno(x.data) >= limite && inizioGiorno(x.data) <= inizioGiorno(rif));
  return { numero: dentro.length, da: limite, a: inizioGiorno(rif) };
}

export function giorniDallUltima(sedute, oggi) {
  const conData = seduteDatate(sedute);
  if (!conData.length) return null;
  return giorniTra(conData[conData.length - 1].data, oggi || new Date());
}

/* Le ultime N settimane come blocchi di sette giorni che finiscono oggi:
 * niente calendario ISO, così il conto resta leggibile e non dipende dalla
 * convenzione su quando comincia la settimana. */
export function settimane(sedute, quante, oggi) {
  const rif = inizioGiorno(oggi || new Date());
  const conData = seduteDatate(sedute);
  const blocchi = [];
  for (let i = quante - 1; i >= 0; i -= 1) {
    const fine = rif - i * 7 * GIORNO;
    const inizio = fine - 6 * GIORNO;
    const numero = conData.filter((x) => {
      const g = inizioGiorno(x.data);
      return g >= inizio && g <= fine;
    }).length;
    blocchi.push({ da: new Date(inizio), a: new Date(fine), numero, ultima: i === 0 });
  }
  return blocchi;
}

export function settimaneAttive(blocchi) {
  const elenco = Array.isArray(blocchi) ? blocchi : [];
  return { attive: elenco.filter((b) => b.numero > 0).length, totali: elenco.length };
}

/* Le schede davvero usate, con quante sedute ciascuna. */
export function schedeUsate(sedute) {
  const elenco = Array.isArray(sedute) ? sedute : [];
  const conta = Object.create(null);
  for (const s of elenco) {
    const codice = String((s && (s.sessionCode || s.code)) || "").trim();
    if (!codice) continue;
    conta[codice] = (conta[codice] || 0) + 1;
  }
  return Object.keys(conta)
    .map((codice) => ({ codice, numero: conta[codice] }))
    .sort((a, b) => b.numero - a.numero || a.codice.localeCompare(b.codice));
}

export function ultimeSedute(sedute, quante) {
  const conData = seduteDatate(sedute);
  return conData
    .slice(-quante)
    .reverse()
    .map((x) => ({
      data: x.data,
      codice: String((x.seduta && (x.seduta.sessionCode || x.seduta.code)) || "").trim() || null,
      nome: String((x.seduta && (x.seduta.sessionName || x.seduta.name)) || "").trim() || null
    }));
}

/* Un solo oggetto con tutti i numeri della schermata: la vista non calcola. */
export function riepilogoOverview(sedute, opzioni) {
  const opz = opzioni || {};
  const oggi = opz.oggi || new Date();
  const quante = opz.settimane || 8;
  const elenco = Array.isArray(sedute) ? sedute : [];
  const conData = seduteDatate(elenco);
  const blocchi = settimane(elenco, quante, oggi);
  const attive = settimaneAttive(blocchi);
  const mese = seduteUltimiGiorni(elenco, 28, oggi);
  return {
    totale: elenco.length,
    conData: conData.length,
    senzaData: elenco.length - conData.length,
    ultimi28: mese.numero,
    giorniUltima: giorniDallUltima(elenco, oggi),
    blocchi,
    settimaneAttive: attive.attive,
    settimaneTotali: attive.totali,
    ritmo: attive.totali ? Number((attive.attive ? blocchi.reduce((a, b) => a + b.numero, 0) / blocchi.length : 0).toFixed(1)) : null,
    schede: schedeUsate(elenco),
    ultime: ultimeSedute(elenco, opz.ultime || 8)
  };
}
