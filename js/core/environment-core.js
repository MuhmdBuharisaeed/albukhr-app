/* =========================================================
   ALBUKHR ENVIRONMENT CORE
   File:
   js/core/environment-core.js

   Purpose:
   - Detect ALBUKHR environment from hostname
   - Keep Mainnet and Testnet strictly separated
   - Provide one shared environment configuration
   - No LocalStorage dependency
   - No Supabase client creation
   - No UI manipulation

   MAINNET:
   https://app.albukhr.com
   Supabase:
   https://ribpntyqdleytsyktdfb.supabase.co

   TESTNET:
   https://test.albukhr.com
   Supabase:
   https://vhvkwvngmrlgyzwemttt.supabase.co
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     ENVIRONMENT DEFINITIONS
  ======================================================= */

  const ENVIRONMENTS = Object.freeze({

    mainnet: Object.freeze({
      key: "mainnet",

      name: "MAINNET",

      host: "app.albukhr.com",

      appUrl:
        "https://app.albukhr.com",

      supabaseUrl:
        "https://ribpntyqdleytsyktdfb.supabase.co",

      network:
        "mainnet"
    }),


    testnet: Object.freeze({
      key: "testnet",

      name: "TESTNET",

      host: "test.albukhr.com",

      appUrl:
        "https://test.albukhr.com",

      supabaseUrl:
        "https://vhvkwvngmrlgyzwemttt.supabase.co",

      network:
        "testnet"
    })

  });


  /* =======================================================
     HOSTNAME NORMALIZATION
  ======================================================= */

  function normalizeHostname(hostname) {

    return String(hostname || "")
      .trim()
      .toLowerCase()
      .replace(/\.$/, "");

  }


  /* =======================================================
     DETECT ENVIRONMENT
  ======================================================= */

  function detectEnvironment() {

    const hostname =
      normalizeHostname(window.location.hostname);


    /* -------------------------------
       MAINNET
    -------------------------------- */

    if (
      hostname === "app.albukhr.com"
    ) {

      return ENVIRONMENTS.mainnet;

    }


    /* -------------------------------
       TESTNET
    -------------------------------- */

    if (
      hostname === "test.albukhr.com"
    ) {

      return ENVIRONMENTS.testnet;

    }


    /* =====================================================
       LOCAL DEVELOPMENT
       
       IMPORTANT:
       Localhost is NOT automatically Mainnet.
       We deliberately avoid silently connecting
       development builds to production data.
    ===================================================== */

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    ) {

      return null;

    }


    /* =====================================================
       UNKNOWN HOST
    ===================================================== */

    return null;

  }


  /* =======================================================
     CURRENT ENVIRONMENT
  ======================================================= */

  const currentEnvironment =
    detectEnvironment();


  /* =======================================================
     ENVIRONMENT STATUS
  ======================================================= */

  const isKnownEnvironment =
    currentEnvironment !== null;


  /* =======================================================
     PUBLIC API
  ======================================================= */

  const EnvironmentCore = Object.freeze({

    /* Environment definitions */

    environments:
      ENVIRONMENTS,


    /* Current environment */

    current:
      currentEnvironment,


    /* Environment key */

    getKey() {

      return currentEnvironment
        ? currentEnvironment.key
        : null;

    },


    /* Environment name */

    getName() {

      return currentEnvironment
        ? currentEnvironment.name
        : null;

    },


    /* Network value for database */

    getNetwork() {

      return currentEnvironment
        ? currentEnvironment.network
        : null;

    },


    /* Application URL */

    getAppUrl() {

      return currentEnvironment
        ? currentEnvironment.appUrl
        : null;

    },


    /* Supabase URL */

    getSupabaseUrl() {

      return currentEnvironment
        ? currentEnvironment.supabaseUrl
        : null;

    },


    /* Current hostname */

    getHostname() {

      return normalizeHostname(
        window.location.hostname
      );

    },


    /* Environment validity */

    isKnown() {

      return isKnownEnvironment;

    },


    /* Mainnet check */

    isMainnet() {

      return (
        currentEnvironment?.key ===
        "mainnet"
      );

    },


    /* Testnet check */

    isTestnet() {

      return (
        currentEnvironment?.key ===
        "testnet"
      );

    },


    /* Return complete configuration */

    getConfig() {

      if (!currentEnvironment) {
        return null;
      }

      return Object.freeze({
        ...currentEnvironment
      });

    }

  });


  /* =======================================================
     SAFETY CHECK
     
     Do not allow the application to silently continue
     without a recognized ALBUKHR environment.
  ======================================================= */

  function enforceEnvironment() {

    if (EnvironmentCore.isKnown()) {

      console.info(
        "🌐 ALBUKHR Environment:",
        EnvironmentCore.getName()
      );

      console.info(
        "🔗 Application:",
        EnvironmentCore.getAppUrl()
      );

      console.info(
        "🗄️ Supabase:",
        EnvironmentCore.getSupabaseUrl()
      );

      console.info(
        "🧭 Network:",
        EnvironmentCore.getNetwork()
      );

      return true;

    }


    console.error(
      "❌ ALBUKHR environment could not be determined."
    );

    console.error(
      "Current hostname:",
      EnvironmentCore.getHostname()
    );

    return false;

  }


  /* =======================================================
     GLOBAL EXPORT
  ======================================================= */

  window.ALBukhrEnvironment =
    EnvironmentCore;


  /* =======================================================
     INITIAL ENVIRONMENT CHECK
  ======================================================= */

  enforceEnvironment();


})(window);
