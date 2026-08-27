/* =========================================================
   ALBUKHR SUPABASE CORE
   =========================================================

   Purpose:
   - Central Supabase client
   - Environment-aware connection
   - MAINNET / TESTNET isolation
   - Single client per page
   - No direct table-write logic
   - Designed for ALBUKHR new architecture

   Environments:

   MAINNET
   https://app.albukhr.com
   → App Albukhr Supabase

   TESTNET
   https://test.albukhr.com
   → Test Albukhr Supabase

   ========================================================= */

(function () {

  "use strict";


  /* =======================================================
     PREVENT DUPLICATE INITIALIZATION
  ======================================================= */

  if (window.ALBUKHR_SUPABASE) {
    console.warn(
      "ALBUKHR Supabase Core already initialized."
    );

    return;
  }


  /* =======================================================
     SUPABASE SDK CHECK
  ======================================================= */

  if (
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {

    console.error(
      "❌ Supabase SDK is not loaded."
    );

    return;
  }


  /* =======================================================
     ENVIRONMENT CORE CHECK
  ======================================================= */

  if (!window.ALBUKHR_ENVIRONMENT) {

    console.error(
      "❌ ALBUKHR Environment Core is not loaded."
    );

    return;
  }


  /* =======================================================
     ENVIRONMENT
  ======================================================= */

  const environment =
    window.ALBUKHR_ENVIRONMENT;


  const currentEnvironment =
    typeof environment.getEnvironment === "function"
      ? environment.getEnvironment()
      : environment.environment;


  if (
    currentEnvironment !== "mainnet" &&
    currentEnvironment !== "testnet"
  ) {

    console.error(
      "❌ Invalid ALBUKHR environment:",
      currentEnvironment
    );

    return;
  }


  /* =======================================================
     SUPABASE CONFIGURATION
  ======================================================= */

  const CONFIG = {

    mainnet: {

      name: "App Albukhr",

      url:
        "https://ribpntyqdleytsyktdfb.supabase.co",

      key:
        "sb_publishable_6pRDCPwk97eCz2Fpu1cadg__XIQlZX2"

    },


    testnet: {

      name: "Test Albukhr",

      url:
        "https://vhvkwvngmrlgyzwemttt.supabase.co",

      key:
        "sb_publishable_5YNtKXSpO1xvPXbpLTo2Nw_mrxDp1qT"

    }

  };


  /* =======================================================
     SELECT CURRENT BACKEND
  ======================================================= */

  const selectedConfig =
    CONFIG[currentEnvironment];


  if (!selectedConfig) {

    console.error(
      "❌ Supabase configuration missing for:",
      currentEnvironment
    );

    return;
  }


  /* =======================================================
     CREATE SUPABASE CLIENT
  ======================================================= */

  let client;

  try {

    client =
      window.supabase.createClient(
        selectedConfig.url,
        selectedConfig.key
      );

  } catch (error) {

    console.error(
      "❌ Failed to create Supabase client:",
      error
    );

    return;
  }


  /* =======================================================
     PUBLIC CORE OBJECT
  ======================================================= */

  const core = {

    /* -----------------------------------------------
       CLIENT
    ------------------------------------------------ */

    client,


    /* -----------------------------------------------
       ENVIRONMENT
    ------------------------------------------------ */

    environment:
      currentEnvironment,


    /* -----------------------------------------------
       PROJECT NAME
    ------------------------------------------------ */

    project:
      selectedConfig.name,


    /* -----------------------------------------------
       SUPABASE URL
    ------------------------------------------------ */

    url:
      selectedConfig.url,


    /* -----------------------------------------------
       ENVIRONMENT CHECKS
    ------------------------------------------------ */

    isMainnet() {

      return this.environment === "mainnet";

    },


    isTestnet() {

      return this.environment === "testnet";

    },


    /* -----------------------------------------------
       RPC HELPER
    ------------------------------------------------ */

    async rpc(functionName, params = {}) {

      if (!functionName) {

        throw new Error(
          "Supabase RPC function name is required."
        );

      }

      return await this.client.rpc(
        functionName,
        params
      );

    },


    /* -----------------------------------------------
       AUTH CLIENT ACCESS
    ------------------------------------------------ */

    get auth() {

      return this.client.auth;

    },


    /* -----------------------------------------------
       DATABASE ACCESS
    ------------------------------------------------ */

    from(tableName) {

      if (!tableName) {

        throw new Error(
          "Supabase table name is required."
        );

      }

      return this.client.from(tableName);

    },


    /* -----------------------------------------------
       STORAGE ACCESS
    ------------------------------------------------ */

    get storage() {

      return this.client.storage;

    },


    /* -----------------------------------------------
       RAW CLIENT
    ------------------------------------------------ */

    getClient() {

      return this.client;

    }

  };


  /* =======================================================
     FREEZE CORE
  ======================================================= */

  Object.freeze(core);


  /* =======================================================
     EXPOSE GLOBAL CORE
  ======================================================= */

  window.ALBUKHR_SUPABASE = core;


  /* =======================================================
     COMPATIBILITY ALIAS
     
     Existing engines can temporarily use:

       supabase.from(...)
       supabase.rpc(...)

     while migration is being completed.

     New code should use:

       ALBUKHR_SUPABASE.client

     or:

       ALBUKHR_SUPABASE.from(...)
  ======================================================= */

  if (!window.supabaseClient) {

    window.supabaseClient =
      core.client;

  }


  /* =======================================================
     DEVELOPMENT LOG
  ======================================================= */

  console.log(
    "✅ ALBUKHR Supabase Core initialized:",
    {
      environment: core.environment,
      project: core.project
    }
  );


})();
