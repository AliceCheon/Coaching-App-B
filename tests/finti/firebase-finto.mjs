/* Finto Firebase per i test di B: SOLO LETTURA, con registratore di tentativi.
 * Ogni chiamata fuori dalle letture ammesse viene registrata e rifiutata:
 * i test di guardia controllano che il registratore resti vuoto.
 *
 * Il finto sa fare anche le query per intervallo di id usate sui programmi
 * (`where("__name__", ">=", …)` / `where("__name__", "<", …)`) e registra se
 * qualcuno tenta una lettura INTEGRALE della sottoraccolta (vietata: contiene
 * le foto di nutrizione). */

function confrontaId(id, filtro) {
  const valore = String(filtro.valore);
  if (filtro.operatore === ">=") return id >= valore;
  if (filtro.operatore === ">") return id > valore;
  if (filtro.operatore === "<=") return id <= valore;
  if (filtro.operatore === "<") return id < valore;
  if (filtro.operatore === "==") return id === valore;
  return false;
}

/* Sottoraccolta con query: `documenti` sono { id, data() }. */
function collezioneConQuery(nome, documenti, registri, filtri = []) {
  const query = {
    // Ogni where produce una query NUOVA (come l'SDK vero): due query di
    // intervallo consecutive non devono sommarsi nella stessa catena.
    where: (campo, operatore, valore) => {
      if (campo !== "__name__" && campo !== "id") {
        registri.scritture.push({ nome: "filtro-non-ammesso:" + nome + ":" + campo });
        throw new Error("Filtro non ammesso (sola lettura): " + campo);
      }
      registri.filtri.push({ collezione: nome, campo, operatore, valore });
      return collezioneConQuery(nome, documenti, registri, filtri.concat([{ campo, operatore, valore }]));
    },
    get: async () => {
      registri.letture.push(nome + (filtri.length ? ":query" : ":integrale"));
      return { docs: documenti.filter((d) => filtri.every((f) => confrontaId(String(d.id), f))) };
    }
  };
  return query;
}

function collezioneFinta(nome, registri, opzioni) {
  if (nome !== "barbellDivaAccounts") {
    registri.scritture.push({ nome: "collezione-non-ammessa:" + nome });
    throw new Error("Collezione non ammessa: " + nome);
  }
  return {
    doc: (uid) => ({
      get: async () => {
        registri.letture.push("radice:" + uid);
        return opzioni.datiRadice == null
          ? { exists: false, data: () => null }
          : { exists: true, data: () => opzioni.datiRadice };
      },
      collection: (sotto) => {
        if (sotto === "sessions") {
          return {
            get: async () => {
              registri.letture.push("sessions");
              return { docs: (opzioni.sedute || []).map((s) => ({ id: s.id, data: () => ({ session: s }) })) };
            }
          };
        }
        if (sotto === "stateBlobs") {
          return { get: async () => { registri.letture.push("stateBlobs"); return { docs: opzioni.blobbi || [] }; } };
        }
        if (sotto === "nutritionPhotos") {
          return collezioneConQuery("nutritionPhotos", opzioni.documentiNutrizione || [], registri);
        }
        registri.scritture.push({ nome: "sottoraccolta-non-ammessa:" + sotto });
        throw new Error("Sottoraccolta non ammessa: " + sotto);
      }
    })
  };
}

export function creaFirebaseFinto(opzioni = {}) {
  const registri = { scritture: [], letture: [], filtri: [], nomiApp: [], configs: [], persistenze: [] };
  const authFinto = {
    setPersistence: async (modalita) => { registri.persistenze.push(modalita); return "ok"; },
    onAuthStateChanged: (cb) => { registri.callback = cb; cb(opzioni.utente || null); return () => {}; },
    signInWithPopup: async () => ({ user: opzioni.utente || null }),
    signInWithRedirect: async () => ({ via: "redirect" }),
    signOut: async () => ({ via: "uscita" })
  };
  const firestoreFinto = { collection: (nome) => collezioneFinta(nome, registri, opzioni) };
  const creaApp = (nome) => ({
    name: nome,
    auth: () => authFinto,
    firestore: () => firestoreFinto
  });
  const sdk = {
    apps: [],
    app: (nome) => sdk.apps.find((a) => a.name === nome),
    auth: Object.assign(function authNamespace() { return authFinto; }, {
      GoogleAuthProvider: class GoogleAuthProviderFinto {},
      Auth: { Persistence: { LOCAL: "local" } }
    }),
    initializeApp: (config, nome) => {
      registri.nomiApp.push(nome);
      registri.configs.push(config);
      const app = creaApp(nome);
      sdk.apps.push(app);
      return app;
    }
  };
  return { sdk, registri, authFinto, firestoreFinto };
}
