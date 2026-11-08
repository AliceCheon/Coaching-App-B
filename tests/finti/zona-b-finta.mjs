/* Finto Firestore della zona B per i test della pagina vera (passo 13).
 *
 * Perche' esiste: il finto tests/finti/firebase-finto.mjs e' SOLO LETTURA e
 * serve alle guardie. Qui serve invece un finto che SI SCRIVE come l'SDK vero:
 *  - una scrittura `set()` diventa visibile alle letture SOLO all'ack
 *    (latenzaScrittura): prima di li' una get() legge lo stato di prima,
 *    come nel browser quando il server e' in ritardo;
 *  - le letture hanno latenze a rotazione, perche' nel browser reale le
 *    letture non arrivano tutte nell'ordine in cui sono partite;
 *  - i registri dicono ogni lettura e ogni scrittura, nell'ordine.
 *
 * Accetta solo `bdB_atleti`: qualunque altra raccolta e' un errore, cosi'
 * il test fallisce se qualcuno prova a leggere o scrivere fuori dalla zona.
 */

export function creaZonaBFinta(opzioni = {}) {
  const o = opzioni || {};
  const latenzeLettura = (o.latenzeLettura && o.latenzeLettura.length) ? o.latenzeLettura : [110, 40, 70];
  const latenzaScrittura = o.latenzaScrittura == null ? 12 : o.latenzaScrittura;
  const dati = o.dati || {}; /* { radice, programmi, schede, sedute, esclusioni, registro } */
  const registri = {
    letture: [],
    scritture: [], /* { percorso, dati } nell'ordine di arrivo all'ack */
    lettureInVolo: 0,
    scrittureInVolo: 0
  };
  let rotazione = 0;
  const attesa = (ms) => new Promise((risolta) => setTimeout(risolta, ms));
  const latenzaLettura = () => latenzeLettura[rotazione++ % latenzeLettura.length];

  /* Lo scaffale: id -> dati, per sottoraccolta. Copia profonda in entrata e in
   * uscita: chi scrive non puo' cambiare lo stato a mano dopo il fatto. */
  const scaffale = Object.create(null);
  function documentiDi(sotto) {
    if (!scaffale[sotto]) {
      scaffale[sotto] = new Map();
      (dati[sotto] || []).forEach((d) => {
        scaffale[sotto].set(String(d.id), d.dati == null ? null : JSON.parse(JSON.stringify(d.dati)));
      });
    }
    return scaffale[sotto];
  }

  function docFinto(sotto, id) {
    return {
      get: async () => {
        registri.lettureInVolo += 1;
        registri.letture.push(sotto + "/" + id);
        await attesa(latenzaLettura());
        registri.lettureInVolo -= 1;
        const valore = documentiDi(sotto).get(id) || null;
        return valore == null
          ? { exists: false, data: () => null }
          : { exists: true, data: () => JSON.parse(JSON.stringify(valore)) };
      },
      set: async (nuovi) => {
        registri.scrittureInVolo += 1;
        await attesa(latenzaScrittura);
        documentiDi(sotto).set(id, JSON.parse(JSON.stringify(nuovi || {})));
        registri.scritture.push({ percorso: sotto + "/" + id, dati: JSON.parse(JSON.stringify(nuovi || {})) });
        registri.scrittureInVolo -= 1;
      }
    };
  }

  function collezioneFinta(sotto) {
    return {
      get: async () => {
        registri.lettureInVolo += 1;
        registri.letture.push(sotto);
        await attesa(latenzaLettura());
        registri.lettureInVolo -= 1;
        const elenco = [];
        documentiDi(sotto).forEach((valore, chiave) => {
          if (valore != null) elenco.push({ id: chiave, data: () => JSON.parse(JSON.stringify(valore)) });
        });
        return { docs: elenco };
      },
      doc: (id) => docFinto(sotto, String(id))
    };
  }

  /* Il documento radice bdB_atleti/{uid}: la fotografia. Un documento solo. */
  function docRadice(uid) {
    const percorso = "radice/" + uid;
    return {
      get: async () => {
        registri.lettureInVolo += 1;
        registri.letture.push(percorso);
        await attesa(latenzaLettura());
        registri.lettureInVolo -= 1;
        return dati.radice == null
          ? { exists: false, data: () => null }
          : { exists: true, data: () => JSON.parse(JSON.stringify(dati.radice)) };
      },
      set: async (nuovi) => {
        registri.scrittureInVolo += 1;
        await attesa(latenzaScrittura);
        dati.radice = JSON.parse(JSON.stringify(nuovi || {}));
        registri.scritture.push({ percorso: percorso, dati: JSON.parse(JSON.stringify(dati.radice)) });
        registri.scrittureInVolo -= 1;
      },
      collection: (sotto) => collezioneFinta(String(sotto))
    };
  }

  const db = {
    collection: (nome) => {
      if (nome !== "bdB_atleti") throw new Error("fuori dalla zona B: " + nome);
      return { doc: (uid) => docRadice(String(uid)) };
    }
  };

  return {
    registri,
    db,
    inVolo: () => registri.lettureInVolo + registri.scrittureInVolo,
    datiDi: (sotto, id) => {
      const valore = documentiDi(String(sotto)).get(String(id)) || null;
      return valore == null ? null : JSON.parse(JSON.stringify(valore));
    },
    elencoDi: (sotto) => {
      const elenco = [];
      documentiDi(String(sotto)).forEach((valore, chiave) => {
        elenco.push({ id: chiave, dati: valore == null ? null : JSON.parse(JSON.stringify(valore)) });
      });
      return elenco;
    }
  };
}

/* L'SDK finto: initializeApp come l'SDK compat, sessione gia' aperta. */
export function creaSdkFinto(zona, utente) {
  const auth = {
    setPersistence: async () => "ok",
    onAuthStateChanged: (cb) => { cb(utente || null); return () => {}; },
    signInWithPopup: async () => ({ user: utente || null }),
    signInWithRedirect: async () => ({ via: "redirect" }),
    signOut: async () => ({ via: "uscita" })
  };
  const sdk = {
    apps: [],
    auth: Object.assign(function authNamespace() { return auth; }, {
      GoogleAuthProvider: function GoogleAuthProviderFinto() {},
      Auth: { Persistence: { LOCAL: "local" } }
    }),
    app: (nome) => sdk.apps.find((a) => a.name === nome) || null,
    initializeApp: (config, nome) => {
      const app = { name: nome || "[Default]", auth: () => auth, firestore: () => zona.db };
      sdk.apps.push(app);
      return app;
    }
  };
  return sdk;
}
