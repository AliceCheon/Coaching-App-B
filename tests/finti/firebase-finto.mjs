/* Finto Firebase per i test di B: SOLO LETTURA, con registratore di tentativi.
 * Ogni chiamata fuori dalle letture ammesse viene registrata e rifiutata:
 * i test di guardia controllano che il registratore resti vuoto. */

function collezioneFinta(nome, registri, opzioni) {
  if (nome !== "barbellDivaAccounts") {
    registri.scritture.push({ nome: "collezione-non-ammessa:" + nome });
    throw new Error("Collezione non ammessa in fase 0: " + nome);
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
          return { get: async () => ({ docs: opzioni.blobbi || [] }) };
        }
        registri.scritture.push({ nome: "sottoraccolta-non-ammessa:" + sotto });
        throw new Error("Sottoraccolta non ammessa in fase 0: " + sotto);
      }
    })
  };
}

export function creaFirebaseFinto(opzioni = {}) {
  const registri = { scritture: [], letture: [], nomiApp: [], configs: [], persistenze: [] };
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
