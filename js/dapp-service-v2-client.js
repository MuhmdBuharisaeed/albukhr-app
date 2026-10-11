/* Load after ALBUKHR Environment Core and Pi Auth Core. */
(function (window) {
  "use strict";
  if (window.AlbukhrDappServiceV2) return;

  function authAndNetwork() {
    const auth = window.AlbukhrPiAuth;
    const env = window.ALBukhrEnvironment;
    if (!auth || typeof auth.getAccessToken !== "function" || !auth.isAuthenticated()) {
      throw new Error("Please sign in with Pi first.");
    }
    if (!env || typeof env.isKnown !== "function" || !env.isKnown()) {
      throw new Error("ALBUKHR environment is not recognized.");
    }
    const network = env.getNetwork();
    if (network !== "mainnet" && network !== "testnet") throw new Error("Invalid ALBUKHR network.");
    const token = auth.getAccessToken();
    if (!token) throw new Error("Pi access token is unavailable; sign in again.");
    return { network, token };
  }

  async function call(path, options = {}) {
    const state = authAndNetwork();
    const apiBase = String(window.ALBUKHR_API_BASE || "https://albukhr-api.onrender.com").replace(/\/+$/, "");
    const response = await fetch(apiBase + "/api/dapp-service/v2" + path, {
      ...options, cache: "no-store", credentials: "omit",
      headers: {
        "Accept": "application/json", "Content-Type": "application/json",
        "Authorization": "Bearer " + state.token, ...(options.headers || {})
      }
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.success !== true) {
      throw new Error(body && body.error ? body.error : "dApp service request failed.");
    }
    if (body.network && body.network !== state.network) throw new Error("Network mismatch. Request blocked.");
    return body;
  }

  window.AlbukhrDappServiceV2 = Object.freeze({
    getCatalog: () => call("/catalog"),
    createRequest: payload => call("/requests", { method: "POST", body: JSON.stringify(payload || {}) }),
    listMyRequests: () => call("/requests")
  });
})(window);
