/* =========================================================
   ALBUKHR USER PROFILE
   - Uses the existing Environment Core, Supabase Core,
     Pi Auth Core and Page Auth Guard.
   - Displays only values available from the guarded session.
   - Does not infer Contributor, KYC, 2FA or biometric status.
   - Never stores authentication identity in browser storage.
========================================================= */
(function (window, document) {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let currentUser = null;
  let toastTimer = null;

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function valueOr(value, fallback) {
    return clean(value) || fallback;
  }

  function shortValue(value, lead = 9, tail = 7) {
    const text = clean(value);
    if (!text) return "Not available";
    if (text.length <= lead + tail + 3) return text;
    return `${text.slice(0, lead)}…${text.slice(-tail)}`;
  }

  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }

  function showToast(message) {
    const toast = $("profileToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function showError(message) {
    const section = $("profileError");
    const stateLine = document.querySelector(".profile-status-line");
    if (section) section.classList.remove("hidden");
    setText("profileErrorMessage", message || "Please reload the page or sign in again.");
    setText("profileSessionStatus", "Session unavailable");
    if (stateLine) stateLine.classList.add("is-error");
    setText("profileAuthState", "Unavailable");
  }

  function initials(username) {
    const name = clean(username).replace(/^@/, "");
    if (!name) return "A";
    const chunks = name.split(/[\s._-]+/).filter(Boolean);
    return (chunks.length > 1 ? chunks[0][0] + chunks[1][0] : chunks[0].slice(0, 2)).toUpperCase();
  }

  function displayNetwork(user) {
    const env = window.ALBukhrEnvironment;
    const environmentNetwork = typeof env?.getNetwork === "function"
      ? clean(env.getNetwork()).toLowerCase()
      : "";
    const userNetwork = clean(user?.network).toLowerCase();

    if (!userNetwork || (userNetwork !== "mainnet" && userNetwork !== "testnet")) {
      throw new Error("The authenticated account has no valid network identity.");
    }
    if (environmentNetwork && environmentNetwork !== userNetwork) {
      throw new Error("Your signed-in account network does not match the current ALBUKHR environment.");
    }

    const networkNode = $("profileNetwork");
    if (networkNode) {
      networkNode.textContent = userNetwork.toUpperCase();
      networkNode.classList.toggle("is-testnet", userNetwork === "testnet");
    }
    setText("profileEnvironment", valueOr(user?.environment, userNetwork).toUpperCase());
  }

  function renderUser(user) {
    if (!user || !user.id || !user.pi_uid || !user.username || !user.network) {
      throw new Error("The authenticated ALBUKHR profile is incomplete. Please sign in again.");
    }

    currentUser = user;
    const username = clean(user.username);
    const wallet = clean(user.wallet_address);

    setText("profileDisplayName", username || "ALBUKHR User");
    setText("profileUsername", username ? `@${username.replace(/^@/, "")}` : "Pi username not available");
    setText("profileAvatar", initials(username));
    setText("profileUserId", shortValue(user.id, 10, 8));
    setText("profilePiUsername", username || "Not available");
    setText("profilePiUid", shortValue(user.pi_uid, 10, 7));
    setText("profileSessionStatus", "Authenticated session");
    setText("profileAuthState", "Authenticated");
    displayNetwork(user);

    const walletNode = $("profileWalletAddress");
    const walletCopyButton = document.querySelector('[data-copy-target="profileWalletAddress"]');
    if (wallet) {
      if (walletNode) {
        walletNode.textContent = shortValue(wallet, 12, 8);
        walletNode.dataset.copyValue = wallet;
        walletNode.title = wallet;
      }
      if (walletCopyButton) walletCopyButton.disabled = false;
      setText("walletFootnote", "The address above was supplied by the current authenticated Pi session. It is shown for reference only; this page does not initiate a wallet connection or transaction.");
    } else {
      setText("profileWalletAddress", "Not provided by current session");
      if (walletNode) delete walletNode.dataset.copyValue;
      if (walletCopyButton) walletCopyButton.disabled = true;
      setText("walletFootnote", "No wallet address was provided by the current authenticated session. This page does not initiate a wallet connection or transaction.");
    }

    const idNode = $("profileUserId");
    if (idNode) idNode.dataset.copyValue = clean(user.id);
    const piUidNode = $("profilePiUid");
    if (piUidNode) piUidNode.dataset.copyValue = clean(user.pi_uid);

    const environmentDot = document.querySelector(".profile-status-dot");
    if (environmentDot) environmentDot.setAttribute("aria-label", "Authenticated session");
  }

  async function loadProfile() {
    const retry = $("profileRetry");
    if (retry) retry.disabled = true;
    if (document.querySelector(".profile-status-line")) {
      document.querySelector(".profile-status-line").classList.remove("is-error");
    }
    setText("profileSessionStatus", "Checking authenticated identity…");

    try {
      const env = window.ALBukhrEnvironment;
      const supabase = window.ALBUKHR_SUPABASE;
      const auth = window.AlbukhrPiAuth;
      const guard = window.AlbukhrPageAuthGuard;

      if (!env || typeof env.isKnown !== "function" || !env.isKnown()) {
        throw new Error("ALBUKHR cannot identify this website environment. Open the official Mainnet or Testnet site.");
      }
      if (!supabase || typeof supabase.isNetwork !== "function") {
        throw new Error("ALBUKHR Supabase Core is unavailable. Reload the page and try again.");
      }
      if (!auth || typeof auth.ensurePiAuth !== "function") {
        throw new Error("ALBUKHR Pi Auth Core is unavailable. Reload the page and sign in again.");
      }
      if (!guard || typeof guard.waitForAuth !== "function") {
        throw new Error("ALBUKHR Page Auth Guard is unavailable. Reload the page and sign in again.");
      }

      setText("profileSessionStatus", "Waiting for Pi authentication…");
      setText("profileAuthState", "Waiting for Pi");

      /*
       * Fail visibly if the Pi prompt or trusted identity API never completes.
       * This does not bypass authentication or invent an identity.
       */
      const authTimeoutMs = 30000;
      let authTimer;
      const authTimeout = new Promise((_, reject) => {
        authTimer = window.setTimeout(() => {
          reject(new Error(
            "Pi authentication did not finish within 30 seconds. Open this page in Pi Browser, complete the sign-in prompt, or return to login and sign in again."
          ));
        }, authTimeoutMs);
      });

      let user;
      try {
        user = await Promise.race([guard.waitForAuth(), authTimeout]);
      } finally {
        window.clearTimeout(authTimer);
      }

      if (!user) throw new Error("A verified ALBUKHR sign-in is required to view this profile.");
      if (!supabase.isNetwork(user.network)) {
        throw new Error("Your profile network does not match the active ALBUKHR data environment.");
      }

      renderUser(user);
      const errorPanel = $("profileError");
      if (errorPanel) errorPanel.classList.add("hidden");
      return true;
    } catch (error) {
      console.error("ALBUKHR User Profile: unable to load authenticated identity.", error);
      showError(error?.message || "Profile information could not be loaded.");
      return false;
    } finally {
      if (retry) retry.disabled = false;
    }
  }

  async function copyField(button) {
    const targetId = button?.dataset?.copyTarget;
    const target = targetId ? $(targetId) : null;
    if (!target || button.disabled) return;
    const value = clean(target.dataset.copyValue);
    if (!value) {
      showToast("This value is not available to copy.");
      return;
    }

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard access is not available in this browser.");
      }
      await navigator.clipboard.writeText(value);
      showToast("Copied to clipboard.");
    } catch (error) {
      console.warn("ALBUKHR Profile: clipboard copy failed.", error);
      showToast("Copy was blocked by the browser. Please select the value manually.");
    }
  }

  function navigateBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = "index.html";
  }

  async function logout() {
    const confirmed = window.confirm("Sign out of your current ALBUKHR session?");
    if (!confirmed) return;

    const button = $("profileLogout");
    if (button) {
      button.disabled = true;
      button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Signing out…';
    }

    try {
      // Clear ALBUKHR's in-memory identity through its shared auth core.
      if (window.AlbukhrPiAuth && typeof window.AlbukhrPiAuth.logout === "function") {
        window.AlbukhrPiAuth.logout();
      }
      if (window.AlbukhrPageAuthGuard && typeof window.AlbukhrPageAuthGuard.reset === "function") {
        window.AlbukhrPageAuthGuard.reset();
      }
      // Pi SDK logout is optional; do not block ALBUKHR state cleanup on it.
      if (window.Pi && typeof window.Pi.logout === "function") {
        try { await window.Pi.logout(); }
        catch (sdkError) { console.warn("Pi SDK logout did not complete.", sdkError); }
      }
    } finally {
      // Intentionally do not clear localStorage/sessionStorage wholesale.
      window.location.replace("login.html");
    }
  }

  function bindEvents() {
    $("profileBack")?.addEventListener("click", navigateBack);
    $("profileRetry")?.addEventListener("click", loadProfile);
    $("profileLogout")?.addEventListener("click", logout);
    document.querySelectorAll("[data-copy-target]").forEach(button => {
      button.addEventListener("click", () => copyField(button));
    });
  }

  bindEvents();
  loadProfile();
})(window, document);
