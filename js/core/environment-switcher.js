/* =========================================================
   ALBUKHR ENVIRONMENT SWITCHER
   Mainnet/Testnet navigation with secure Testnet handoff.

   IMPORTANT:
   - Mainnet -> Testnet MUST pass through Mainnet Pi login.
   - Testnet -> Mainnet may navigate directly to Mainnet.
   - No LocalStorage is used.
   - Dock Navigation is not modified.
========================================================= */

(function (window) {

  "use strict";

  if (!window.ALBukhrEnvironment) {
    console.error("❌ ALBUKHR Environment Core is missing.");
    return;
  }

  const Environment = window.ALBukhrEnvironment;

  function getSwitcher() {
    return document.getElementById("environmentSwitcher");
  }

  function getLabel() {
    return document.getElementById("environmentLabel");
  }

  function getDot() {
    return document.getElementById("environmentDot");
  }

  function updateUI() {

    const switcher = getSwitcher();
    const label = getLabel();

    if (!switcher) {
      console.warn("⚠️ ALBUKHR environment switcher element not found.");
      return;
    }

    const key = Environment.getKey();

    switcher.classList.remove("mainnet", "testnet");

    if (key === "mainnet") {

      switcher.classList.add("mainnet");

      if (label) {
        label.textContent = "MAINNET";
      }

      switcher.setAttribute(
        "aria-label",
        "Switch to Testnet"
      );

      switcher.setAttribute(
        "title",
        "Switch to Testnet"
      );

      return;
    }

    if (key === "testnet") {

      switcher.classList.add("testnet");

      if (label) {
        label.textContent = "TESTNET";
      }

      switcher.setAttribute(
        "aria-label",
        "Switch to Mainnet"
      );

      switcher.setAttribute(
        "title",
        "Switch to Mainnet"
      );

      return;
    }

    if (label) {
      label.textContent = "UNKNOWN";
    }

    switcher.disabled = true;

    switcher.setAttribute(
      "aria-label",
      "Environment unavailable"
    );
  }

  function getTargetEnvironment() {

    if (Environment.isMainnet()) {
      return Environment.environments.testnet;
    }

    if (Environment.isTestnet()) {
      return Environment.environments.mainnet;
    }

    return null;
  }

  function buildTestnetEntryUrl() {

    /*
      The Testnet application requires a short-lived,
      one-time access code.

      Therefore Mainnet cannot send the browser directly
      to test.albukhr.com. It must first authenticate the
      Pi user on Mainnet, then Mainnet login.js invokes
      mainnet-testnet-handoff.js.
    */

    return (
      Environment.environments.mainnet.appUrl +
      "/login.html?returnTo=testnet"
    );
  }

  function switchEnvironment() {

    if (Environment.isMainnet()) {

      console.info(
        "🔄 ALBUKHR environment switch: MAINNET → TESTNET AUTH GATE"
      );

      window.location.assign(
        buildTestnetEntryUrl()
      );

      return;
    }

    if (Environment.isTestnet()) {

      const target = Environment.environments.mainnet;

      console.info(
        "🔄 ALBUKHR environment switch: TESTNET → MAINNET"
      );

      window.location.assign(
        target.appUrl
      );

      return;
    }

    console.error(
      "❌ Cannot switch environment from an unknown environment."
    );
  }

  function init() {

    const switcher = getSwitcher();

    if (!switcher) {
      return;
    }

    updateUI();

    if (
      switcher.dataset.environmentBound ===
      "true"
    ) {
      return;
    }

    switcher.addEventListener(
      "click",
      function () {

        if (switcher.disabled) {
          return;
        }

        switchEnvironment();
      }
    );

    switcher.dataset.environmentBound = "true";
  }

  window.ALBukhrEnvironmentSwitcher = Object.freeze({

    init,
    updateUI,
    switchEnvironment,
    getTargetEnvironment,
    buildTestnetEntryUrl
  });

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );

  } else {

    init();

  }

})(window);
