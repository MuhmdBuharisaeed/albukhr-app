/* =========================================================
   ALBUKHR API CORE
   Mainnet trusted gateway client.

   Security rule:
   - Pi access token is read from the Pi Auth Core memory.
   - Browser NEVER supplies p_pi_uid to the API.
   - API derives Pi UID from Pi /v2/me.
   - Mainnet only.
========================================================= */
(function (window) {
  "use strict";

  if (window.AlbukhrApi) return;

  const API_BASE = "https://albukhr-api.onrender.com";

  function authCore() {
    if (!window.AlbukhrPiAuth) {
      throw new Error("ALBUKHR Pi Auth Core is not loaded.");
    }
    return window.AlbukhrPiAuth;
  }

  async function request(path, options = {}) {
    const auth = authCore();
    if (typeof auth.getAccessToken !== "function") {
      throw new Error("ALBUKHR Pi Auth Core does not expose a gateway token accessor.");
    }

    const network = typeof auth.getNetwork === "function"
      ? auth.getNetwork()
      : auth.getUser?.()?.network;

    if (String(network || "").toLowerCase() !== "mainnet") {
      throw new Error("The Mainnet API gateway cannot be used from Testnet.");
    }

    const token = auth.getAccessToken();
    if (!token) throw new Error("Pi authentication is required.");

    const headers = new Headers(options.headers || {});
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("Accept", "application/json");

    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "omit"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || `ALBUKHR API request failed (${response.status}).`);
    }

    return data?.data;
  }

  function json(path, method, value) {
    return request(path, {
      method,
      body: JSON.stringify(value || {})
    });
  }

  window.AlbukhrApi = Object.freeze({
    request,
    get: (path) => request(path),
    post: (path, value) => json(path, "POST", value),
    patch: (path, value) => json(path, "PATCH", value),
    put: (path, value) => json(path, "PUT", value),
    delete: (path) => request(path, { method: "DELETE" })
  });
})(window);
