/* =========================================================
   ALBUKHR ENVIRONMENT SWITCHER
   File:
   js/core/environment-switcher.js

   Depends on:
   js/core/environment-core.js

   Purpose:
   - Control MAINNET / TESTNET switching
   - Use ALBukhrEnvironment as the single source
   - Switch only between official ALBUKHR environments
   - Keep UI placement controlled by the existing HTML
   - Do not modify Dock Navigation
   - Do not store environment in LocalStorage
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     CORE DEPENDENCY CHECK
  ======================================================= */

  if (!window.ALBukhrEnvironment) {

    console.error(
      "❌ ALBUKHR Environment Core is missing."
    );

    return;

  }


  const Environment =
    window.ALBukhrEnvironment;


  /* =======================================================
     ELEMENT REFERENCES
  ======================================================= */

  function getSwitcher() {

    return document.getElementById(
      "environmentSwitcher"
    );

  }


  function getLabel() {

    return document.getElementById(
      "environmentLabel"
    );

  }


  function getDot() {

    return document.getElementById(
      "environmentDot"
    );

  }


  /* =======================================================
     UPDATE SWITCHER UI
  ======================================================= */

  function updateUI() {

    const switcher =
      getSwitcher();

    const label =
      getLabel();

    const dot =
      getDot();


    if (!switcher) {

      console.warn(
        "⚠️ ALBUKHR environment switcher element not found."
      );

      return;

    }


    const key =
      Environment.getKey();


    /* Remove previous state */

    switcher.classList.remove(
      "mainnet",
      "testnet"
    );


    /* =====================================================
       MAINNET
    ===================================================== */

    if (key === "mainnet") {

      switcher.classList.add(
        "mainnet"
      );

      if (label) {

        label.textContent =
          "MAINNET";

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


    /* =====================================================
       TESTNET
    ===================================================== */

    if (key === "testnet") {

      switcher.classList.add(
        "testnet"
      );

      if (label) {

        label.textContent =
          "TESTNET";

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


    /* =====================================================
       UNKNOWN ENVIRONMENT
    ===================================================== */

    if (label) {

      label.textContent =
        "UNKNOWN";

    }

    switcher.disabled = true;

    switcher.setAttribute(
      "aria-label",
      "Environment unavailable"
    );

  }


  /* =======================================================
     GET TARGET ENVIRONMENT
  ======================================================= */

  function getTargetEnvironment() {

    if (Environment.isMainnet()) {

      return Environment.environments.testnet;

    }


    if (Environment.isTestnet()) {

      return Environment.environments.mainnet;

    }


    return null;

  }


  /* =======================================================
     SWITCH ENVIRONMENT
  ======================================================= */

  function switchEnvironment() {

    const target =
      getTargetEnvironment();


    if (!target) {

      console.error(
        "❌ Cannot switch environment."
      );

      return;

    }


    const current =
      Environment.getKey();


    console.info(
      "🔄 ALBUKHR environment switch:",
      current,
      "→",
      target.key
    );


    /* =====================================================
       IMPORTANT

       No LocalStorage is used here.

       The destination environment is determined
       exclusively by the official environment
       configuration.
    ===================================================== */

    window.location.assign(
      target.appUrl
    );

  }


  /* =======================================================
     INITIALIZE SWITCHER
  ======================================================= */

  function init() {

    const switcher =
      getSwitcher();


    if (!switcher) {

      return;

    }


    /* Update current state */

    updateUI();


    /* Prevent duplicate listeners */

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


    switcher.dataset.environmentBound =
      "true";

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.ALBukhrEnvironmentSwitcher =
    Object.freeze({

      init,

      updateUI,

      switchEnvironment,

      getTargetEnvironment

    });


  /* =======================================================
     DOM READY
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init,
      {
        once: true
      }
    );

  } else {

    init();

  }


})(window);
