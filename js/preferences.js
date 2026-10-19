/* =========================================================
   ALBUKHR PREFERENCES PAGE
   Read-only integration with the existing Environment Core.

   Safety constraints:
   - No localStorage or sessionStorage.
   - No new Supabase client or database writes.
   - No changes to authentication, wallet, investments or payments.
   - Does not claim to save unavailable preference controls.
========================================================= */
(function (window, document) {
  "use strict";

  const byId = (id) => document.getElementById(id);

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function resolveEnvironment() {
    const core = window.ALBukhrEnvironment;
    if (!core || typeof core.isKnown !== "function" || !core.isKnown()) {
      return {
        key: "unknown",
        name: "Environment not verified",
        network: "unknown",
        appUrl: "",
        detail: "This host is not recognized by ALBUKHR Environment Core. No network-dependent operation was attempted."
      };
    }

    const network = String(typeof core.getNetwork === "function" ? core.getNetwork() : "")
      .trim()
      .toLowerCase();
    const key = String(typeof core.getKey === "function" ? core.getKey() : network)
      .trim()
      .toLowerCase();
    const name = String(typeof core.getName === "function" ? core.getName() : network)
      .trim();
    const appUrl = String(typeof core.getAppUrl === "function" ? core.getAppUrl() : "").trim();

    if (network !== "mainnet" && network !== "testnet") {
      return {
        key: "unknown",
        name: "Environment not verified",
        network: "unknown",
        appUrl: "",
        detail: "Environment Core did not return a recognized Mainnet or Testnet network. No network-dependent operation was attempted."
      };
    }

    return {
      key: network,
      name: name || network.toUpperCase(),
      network,
      appUrl,
      detail: appUrl
        ? "Active application host: " + appUrl + ". Network switching remains in the main-page drawer."
        : "Network was identified by ALBUKHR Environment Core. Network switching remains in the main-page drawer."
    };
  }

  function renderEnvironment() {
    const environment = resolveEnvironment();
    const card = document.querySelector(".environment-card");

    if (card) card.dataset.network = environment.network;

    setText("environmentName", environment.name);
    setText("environmentDetail", environment.detail);
    setText("environmentStatus", environment.network === "mainnet"
      ? "Mainnet"
      : environment.network === "testnet"
        ? "Testnet"
        : "Not verified");

    const dot = byId("environmentDot");
    if (dot) {
      dot.setAttribute("aria-label", environment.network === "unknown"
        ? "Environment not verified"
        : environment.network + " environment");
    }
  }

  function renderDeviceInfo() {
    let language = "Not available";
    let timeZone = "Not available";

    try {
      if (typeof navigator !== "undefined" && navigator.language) {
        language = navigator.language;
      }
    } catch (_) {
      // Device metadata remains optional and is never required for this page.
    }

    try {
      const resolved = Intl.DateTimeFormat().resolvedOptions();
      if (resolved && resolved.timeZone) timeZone = resolved.timeZone;
    } catch (_) {
      // Some embedded browsers may not expose a time zone.
    }

    setText("deviceLanguage", language);
    setText("deviceTimezone", timeZone);
  }

  function bindActions() {
    const backButton = byId("preferencesBack");
    if (backButton) {
      backButton.addEventListener("click", function () {
        const referrer = document.referrer;
        let safeSameOrigin = false;

        if (referrer) {
          try {
            safeSameOrigin = new URL(referrer).origin === window.location.origin;
          } catch (_) {
            safeSameOrigin = false;
          }
        }

        if (safeSameOrigin && window.history.length > 1) {
          window.history.back();
        } else {
          window.location.assign("index.html");
        }
      });
    }

    const refreshButton = byId("refreshEnvironment");
    if (refreshButton) {
      refreshButton.addEventListener("click", function () {
        renderEnvironment();
        renderDeviceInfo();
        refreshButton.textContent = "Updated";
        refreshButton.disabled = true;
        window.setTimeout(function () {
          refreshButton.textContent = "Refresh";
          refreshButton.disabled = false;
        }, 1200);
      });
    }
  }

  function init() {
    renderEnvironment();
    renderDeviceInfo();
    bindActions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.AlbukhrPreferencesPage = Object.freeze({
    refreshEnvironment: renderEnvironment
  });
})(window, document);
