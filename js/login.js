/* ALBUKHR MAINNET LOGIN PAGE CONTROLLER — BOUNDED PI AUTH
 * Keeps the existing Mainnet login, Testnet handoff, and Owner Proof flows.
 */
(function (window) {
  "use strict";

  let loginInProgress = false;

  function el(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function setStatus(message) {
    const node = el("status");
    if (node) node.textContent = String(message || "");
  }

  function setLoading(loading, text) {
    const button = el("piLoginButton");
    if (!button) return;
    button.disabled = Boolean(loading);
    const label = button.querySelector(".pi-login-text");
    if (label && typeof text === "string") label.textContent = text;
  }

  function checkDependencies() {
    const environment = window.ALBukhrEnvironment;
    if (!environment || typeof environment.isKnown !== "function" || !environment.isKnown()) {
      throw new Error("ALBUKHR_ENVIRONMENT_UNAVAILABLE");
    }
    if (typeof environment.isMainnet !== "function" || !environment.isMainnet()) {
      throw new Error("MAINNET_ENVIRONMENT_REQUIRED");
    }
    if (!window.ALBUKHR_SUPABASE || typeof window.ALBUKHR_SUPABASE.isNetwork !== "function") {
      throw new Error("ALBUKHR_SUPABASE_CORE_UNAVAILABLE");
    }
    if (!window.ALBUKHR_SUPABASE.isNetwork("mainnet")) {
      throw new Error("MAINNET_SUPABASE_NETWORK_MISMATCH");
    }
    if (!window.AlbukhrPiAuth || typeof window.AlbukhrPiAuth.ensurePiAuth !== "function") {
      throw new Error("ALBUKHR_PI_AUTH_CORE_UNAVAILABLE");
    }
  }

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function isTestnetReturn() {
    return params().get("returnTo") === "testnet";
  }

  function isOwnerProofReturn() {
    return params().get("returnTo") === "owner-proof";
  }

  function ownerProofProjectCode() {
    const value = clean(params().get("project_code")).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{1,63}$/.test(value)) {
      throw new Error("OWNER_PROOF_PROJECT_CODE_INVALID");
    }
    return value;
  }

  function getTarget() {
    const target = params().get("returnTo");
    return target && target.startsWith("/") && !target.startsWith("//")
      ? target
      : "index.html";
  }

  function describeError(error) {
    const code = clean(error && error.message) || "MAINNET_LOGIN_FAILED";
    const messages = {
      PI_SDK_SCRIPT_LOAD_FAILED:
        "Pi SDK could not be downloaded. Check your connection and reload this Pi Browser tab.",
      PI_SDK_UNAVAILABLE:
        "Pi SDK is not available in this browser tab. Open ALBUKHR inside Pi Browser and reload.",
      PI_SDK_INIT_TIMEOUT:
        "Pi SDK did not finish initializing within 15 seconds. Its original initialization is still protected from duplicate calls. Reload this tab in Pi Browser before trying again.",
      PI_AUTHENTICATION_TIMEOUT:
        "Pi account approval did not finish within 60 seconds. The current request may still be pending; reload this tab before starting a fresh attempt.",
      ALBUKHR_IDENTITY_API_TIMEOUT:
        "Pi responded, but ALBUKHR identity verification timed out. No Testnet access code was issued. Check the connection and retry.",
      PI_AUTHENTICATION_CANCELLED:
        "The authentication attempt was cancelled because the login state changed. Reload the page before trying again.",
      MAINNET_ENVIRONMENT_REQUIRED:
        "This login flow is available only on the ALBUKHR Mainnet domain.",
      MAINNET_SUPABASE_NETWORK_MISMATCH:
        "The Mainnet environment and Supabase network do not match. Authentication has been stopped for safety."
    };
    return messages[code] || ("Login failed: " + code);
  }

  function handleAuthStage(event) {
    const detail = event && event.detail ? event.detail : {};
    const stage = clean(detail.stage);
    const message = clean(detail.message);
    if (!message) return;

    if (stage === "sdk-initializing") {
      setLoading(true, "Connecting to Pi...");
      setStatus(message);
    } else if (stage === "sdk-initialized") {
      setLoading(true, "Verifying with Pi...");
      setStatus(message);
    } else if (stage === "pi-authenticating") {
      setLoading(true, "Waiting for Pi...");
      setStatus(message);
    } else if (stage === "identity-verifying") {
      setLoading(true, "Verifying identity...");
      setStatus(message);
    } else if (stage === "complete") {
      setStatus(message);
    }
  }

  async function login() {
    if (loginInProgress) return;
    loginInProgress = true;

    try {
      checkDependencies();
      const ownerProofMode = isOwnerProofReturn();
      const projectCode = ownerProofMode ? ownerProofProjectCode() : "";

      setLoading(true, "Connecting to Pi...");
      setStatus(ownerProofMode
        ? "Verifying Mainnet ownership for " + projectCode + "..."
        : (isTestnetReturn()
          ? "Preparing secure Mainnet authentication for Testnet access..."
          : "Preparing secure Pi authentication..."));

      const user = await window.AlbukhrPiAuth.ensurePiAuth();
      if (!user || !user.pi_uid) {
        throw new Error("PI_AUTHENTICATION_RETURNED_INVALID_USER");
      }

      if (ownerProofMode) {
        const handoff = window.AlbukhrTestnetHandoff;
        if (!handoff || typeof handoff.issueProjectOwnerProof !== "function") {
          throw new Error("MAINNET_OWNER_PROOF_HANDOFF_UNAVAILABLE");
        }
        setStatus("Mainnet Pi identity verified. Issuing a short-lived ownership proof...");
        setLoading(true, "Verifying ownership...");
        await handoff.issueProjectOwnerProof(projectCode);
        return;
      }

      if (isTestnetReturn()) {
        const handoff = window.AlbukhrTestnetHandoff;
        if (!handoff || typeof handoff.handoffToTestnet !== "function") {
          throw new Error("TESTNET_HANDOFF_MODULE_UNAVAILABLE");
        }
        setStatus("Mainnet Pi identity verified. Creating secure Testnet access...");
        setLoading(true, "Opening Testnet...");
        await handoff.handoffToTestnet();
        return;
      }

      setStatus("Login successful: " + (user.username || user.pi_uid));
      setLoading(true, "Opening Dashboard...");
      window.setTimeout(function () {
        window.location.replace(getTarget());
      }, 600);
    } catch (error) {
      console.error("[ALBUKHR LOGIN]", error);
      setLoading(false, isOwnerProofReturn() ? "Verify ownership with Pi" : "Login with Pi");
      setStatus(describeError(error));
    } finally {
      loginInProgress = false;
    }
  }

  window.login = login;

  function init() {
    window.addEventListener("albukhr:pi-auth-stage", handleAuthStage);

    try {
      checkDependencies();
      if (isOwnerProofReturn()) {
        const code = ownerProofProjectCode();
        setStatus("Ready to verify Mainnet ownership for " + code + ". Continue with your Mainnet Pi account.");
        setLoading(false, "Verify project ownership");
      } else {
        setStatus(isTestnetReturn()
          ? "Ready to verify your Pi identity for Testnet."
          : "Ready to login with Pi.");
        setLoading(false, isTestnetReturn() ? "Continue to Testnet" : "Login with Pi");
      }
    } catch (error) {
      console.error("[ALBUKHR LOGIN INIT]", error);
      setLoading(true, "Login unavailable");
      setStatus(describeError(error));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window);
