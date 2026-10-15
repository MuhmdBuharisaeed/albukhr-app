/* =========================================================
   ALBUKHR PI AUTH CORE — MAINNET TRUSTED IDENTITY PATCH
   File: js/core/pi-auth-core.js

   Purpose:
   - Initialize Pi SDK and authenticate the Pioneer.
   - Keep the Pi access token in memory only.
   - Verify/register identity through the trusted Mainnet API.
   - Never write Pi identity or login records directly from the browser.
   - Keep Mainnet and Testnet environments strictly separated.
   - Preserve the existing window.AlbukhrPiAuth public API.

   Dependencies:
   - Pi SDK
   - js/core/environment-core.js
   - js/core/supabase-core.js (network cross-check only)
========================================================= */

(function (window) {
  "use strict";

  if (window.AlbukhrPiAuth) {
    console.warn("ALBUKHR Pi Auth Core already initialized.");
    return;
  }

  const MAINNET = "mainnet";
  const MAINNET_IDENTITY_API = "https://albukhr-api.onrender.com/api/identity";

  let initialized = false;
  let authenticatedUser = null;
  let accessToken = null;
  let authenticationPromise = null;

  function getEnvironmentCore() {
    const environment = window.ALBukhrEnvironment;
    if (!environment || typeof environment.isKnown !== "function" || !environment.isKnown()) {
      throw new Error("ALBUKHR Environment Core is unavailable or invalid.");
    }
    return environment;
  }

  function getSupabaseCore() {
    const core = window.ALBUKHR_SUPABASE;
    if (!core || typeof core.isNetwork !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable or invalid.");
    }
    return core;
  }

  function getEnvironment() {
    return getEnvironmentCore();
  }

  function getNetwork() {
    return String(getEnvironment().getNetwork() || "").trim().toLowerCase();
  }

  function validateNetwork(value) {
    const network = String(value || "").trim().toLowerCase();
    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }
    return network;
  }

  function requireMainnet() {
    const network = validateNetwork(getNetwork());
    if (network !== MAINNET) {
      throw new Error("The Mainnet identity API cannot be used from Testnet.");
    }
    if (!getSupabaseCore().isNetwork(MAINNET)) {
      throw new Error("Supabase network does not match the Mainnet environment.");
    }
  }

  function requirePiSDK() {
    const Pi = window.Pi;
    if (!Pi || typeof Pi.init !== "function" || typeof Pi.authenticate !== "function") {
      throw new Error("Pi SDK is unavailable. Open ALBUKHR inside Pi Browser.");
    }
    return Pi;
  }

  async function initPi() {
    if (initialized) return true;

    const environment = getEnvironment();
    const Pi = requirePiSDK();
    const network = validateNetwork(environment.getNetwork());

    console.info("Initializing ALBUKHR Pi SDK.", {
      environment: environment.getName(),
      network
    });

    await Pi.init({
      version: "2.0",
      sandbox: environment.isTestnet()
    });

    initialized = true;
    console.info("ALBUKHR Pi SDK initialized.", { network });
    return true;
  }

  function onIncompletePaymentFound(payment) {
    // Payment recovery remains handled by the existing payment workflow.
    console.warn("ALBUKHR incomplete Pi payment found.", payment);
  }

  function normalizeText(value) {
    if (value === null || value === undefined) return null;
    const result = String(value).trim();
    return result || null;
  }

  function normalizePiUser(authResult) {
    const rawUser = authResult?.user || authResult || null;
    if (!rawUser) throw new Error("Pi authentication returned no user.");

    const piUid = normalizeText(rawUser.uid);
    const username = normalizeText(rawUser.username);
    const walletAddress = normalizeText(rawUser.wallet_address);

    if (!piUid) throw new Error("Pi UID is missing.");
    if (!username) throw new Error("Pi username is missing.");

    // These client-side values are used for UI consistency only. The API
    // independently verifies the token and derives its own authoritative UID.
    return Object.freeze({
      pi_uid: piUid,
      username,
      wallet_address: walletAddress
    });
  }

  async function identityRequest(action) {
    requireMainnet();

    const token = normalizeText(accessToken);
    if (!token) throw new Error("Pi authentication token is unavailable.");

    const response = await fetch(`${MAINNET_IDENTITY_API}/${action}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      },
      credentials: "omit",
      cache: "no-store",
      redirect: "error"
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success !== true) {
      const message = normalizeText(payload?.error) ||
        `ALBUKHR identity verification failed (${response.status}).`;
      throw new Error(message);
    }

    if (String(payload.network || "").toLowerCase() !== MAINNET) {
      throw new Error("ALBUKHR identity response returned the wrong network.");
    }

    return payload;
  }

  async function recordFailedLogin(piUser, originalError) {
    if (!piUser?.pi_uid || !accessToken || getNetwork() !== MAINNET) {
      console.warn("A failed login event could not be safely recorded by the trusted API.");
      return null;
    }

    try {
      // No client-supplied UID/network is sent. The API revalidates the token
      // with Pi /v2/me and records only the identity returned by Pi.
      return await identityRequest("login-failure");
    } catch (recordError) {
      console.warn("Failed login event could not be recorded through the trusted API.", {
        originalError: originalError?.message || String(originalError || ""),
        recordError: recordError?.message || String(recordError || "")
      });
      return null;
    }
  }

  async function recordSuccessfulLogin(piUser) {
    if (!piUser?.pi_uid) throw new Error("Pi user identity is required.");

    const result = await identityRequest("login");
    const verifiedUid = normalizeText(result.pi_uid);
    const userId = normalizeText(result.user_id);
    const verifiedUsername = normalizeText(result.username);

    if (!userId) throw new Error("Trusted Mainnet identity API returned no ALBUKHR user ID.");
    if (!verifiedUid || verifiedUid !== piUser.pi_uid) {
      throw new Error("Pi identity returned by the server does not match the SDK session.");
    }

    return Object.freeze({
      userId,
      piUid: verifiedUid,
      username: verifiedUsername || piUser.username
    });
  }

  function buildAuthenticatedUser(userId, piUser) {
    const environment = getEnvironment();
    const network = validateNetwork(environment.getNetwork());

    if (!userId) throw new Error("ALBUKHR user ID is required.");
    if (!piUser) throw new Error("Pi user is required.");

    return Object.freeze({
      id: userId,
      pi_uid: piUser.pi_uid,
      username: piUser.username,
      wallet_address: piUser.wallet_address,
      environment: environment.getKey(),
      network
    });
  }

  async function authenticate() {
    if (authenticationPromise) return authenticationPromise;

    authenticationPromise = (async function () {
      let piUser = null;

      try {
        await initPi();
        const Pi = requirePiSDK();
        const environment = getEnvironment();
        const network = validateNetwork(environment.getNetwork());

        console.info("Authenticating ALBUKHR Pi user.", {
          environment: environment.getName(),
          network
        });

        const authResult = await Pi.authenticate(
          ["username", "payments", "wallet_address"],
          onIncompletePaymentFound
        );

        if (!authResult) throw new Error("Pi authentication returned no result.");

        piUser = normalizePiUser(authResult);
        accessToken = normalizeText(authResult.accessToken);
        if (!accessToken) throw new Error("Pi authentication returned no access token.");

        const verified = await recordSuccessfulLogin(piUser);
        const trustedPiUser = Object.freeze({
          pi_uid: verified.piUid,
          username: verified.username,
          // Wallet address is retained only as an SDK-provided UI value. It is
          // never sent as proof of identity to the server.
          wallet_address: piUser.wallet_address
        });

        authenticatedUser = buildAuthenticatedUser(verified.userId, trustedPiUser);

        console.info("ALBUKHR authentication successful.", {
          user_id: authenticatedUser.id,
          pi_uid: authenticatedUser.pi_uid,
          username: authenticatedUser.username,
          network: authenticatedUser.network
        });

        window.dispatchEvent(new CustomEvent("albukhr:auth-success", {
          detail: { user: authenticatedUser }
        }));

        return authenticatedUser;
      } catch (error) {
        if (piUser) await recordFailedLogin(piUser, error);

        authenticatedUser = null;
        accessToken = null;

        console.error("ALBUKHR Pi authentication failed.", error);
        window.dispatchEvent(new CustomEvent("albukhr:auth-failed", {
          detail: { error }
        }));

        throw error;
      } finally {
        authenticationPromise = null;
      }
    })();

    return authenticationPromise;
  }

  async function ensurePiAuth() {
    if (authenticatedUser) return authenticatedUser;
    return authenticate();
  }

  function getCurrentUser() {
    return authenticatedUser;
  }

  function getCurrentUserId() {
    return authenticatedUser?.id || null;
  }

  function getPiUid() {
    return authenticatedUser?.pi_uid || null;
  }

  function getUsername() {
    return authenticatedUser?.username || null;
  }

  function getWalletAddress() {
    return authenticatedUser?.wallet_address || null;
  }

  function getAccessToken() {
    // Pi access token remains memory-only and is never persisted to storage.
    return accessToken;
  }

  function isAuthenticated() {
    return authenticatedUser !== null;
  }

  async function requireAuth(redirectUrl = "login.html") {
    if (authenticatedUser) return authenticatedUser;

    try {
      return await ensurePiAuth();
    } catch (error) {
      console.error("ALBUKHR authentication required.", error);

      if (redirectUrl) {
        const currentPath = window.location.pathname;
        const targetPath = new URL(redirectUrl, window.location.href).pathname;
        if (currentPath !== targetPath) window.location.replace(redirectUrl);
      }
      return null;
    }
  }

  function logout() {
    authenticatedUser = null;
    accessToken = null;
    authenticationPromise = null;

    document.documentElement.removeAttribute("data-albukhr-auth");
    window.dispatchEvent(new CustomEvent("albukhr:logout"));
    console.info("ALBUKHR authentication state cleared.");
  }

  function isInitialized() {
    return initialized;
  }

  function getEnvironmentInfo() {
    const environment = getEnvironment();
    return Object.freeze({
      key: environment.getKey(),
      name: environment.getName(),
      network: environment.getNetwork(),
      appUrl: environment.getAppUrl(),
      supabaseUrl: environment.getSupabaseUrl()
    });
  }

  function getAuthSnapshot() {
    if (!authenticatedUser) return null;
    return Object.freeze({
      id: authenticatedUser.id,
      pi_uid: authenticatedUser.pi_uid,
      username: authenticatedUser.username,
      wallet_address: authenticatedUser.wallet_address,
      environment: authenticatedUser.environment,
      network: authenticatedUser.network
    });
  }

  const AlbukhrPiAuth = Object.freeze({
    initPi,
    authenticate,
    ensurePiAuth,
    requireAuth,
    logout,
    isAuthenticated,
    isInitialized,
    getCurrentUser,
    getCurrentUserId,
    getPiUid,
    getUsername,
    getWalletAddress,
    getAccessToken,
    getNetwork,
    getEnvironmentInfo,
    getAuthSnapshot
  });

  window.AlbukhrPiAuth = AlbukhrPiAuth;
  console.info("ALBUKHR Pi Auth Core loaded.");
})(window);
