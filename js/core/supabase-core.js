/* =========================================================
   ALBUKHR SUPABASE CORE
   File:
   js/core/supabase-core.js

   Purpose:
   - Central Supabase client
   - Environment-aware connection
   - Strict MAINNET / TESTNET isolation
   - Single client per page
   - No LocalStorage dependency
   - No direct authentication logic
   - No direct table-write logic
   - Compatible with ALBUKHR Environment Core

   Required before this file:
   1. Supabase JS SDK
   2. js/core/environment-core.js

   MAINNET
   https://app.albukhr.com
   → App Albukhr Supabase

   TESTNET
   https://test.albukhr.com
   → Test Albukhr Supabase
   ========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     PREVENT DUPLICATE INITIALIZATION
  ======================================================= */

  if (window.ALBUKHR_SUPABASE) {

    console.warn(
      "⚠️ ALBUKHR Supabase Core already initialized."
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

  const environment =
    window.ALBukhrEnvironment;


  if (!environment) {

    console.error(
      "❌ ALBUKHR Environment Core is not loaded."
    );

    return;

  }


  /* =======================================================
     ENVIRONMENT VALIDATION
  ======================================================= */

  if (
    typeof environment.isKnown !== "function" ||
    !environment.isKnown()
  ) {

    console.error(
      "❌ ALBUKHR environment is unknown."
    );

    return;

  }


  /* =======================================================
     CURRENT ENVIRONMENT
  ======================================================= */

  const currentEnvironment =
    environment.getKey();


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

  const CONFIG = Object.freeze({

    mainnet: Object.freeze({

      name:
        "App Albukhr",

      url:
        "https://ribpntyqdleytsyktdfb.supabase.co",

      key:
        "sb_publishable_6pRDCPwk97eCz2Fpu1cadg__XIQlZX2",

      network:
        "mainnet"

    }),


    testnet: Object.freeze({

      name:
        "Test Albukhr",

      url:
        "https://vhvkwvngmrlgyzwemttt.supabase.co",

      key:
        "sb_publishable_5YNtKXSpO1xvPXbpLTo2Nw_mrxDp1qT",

      network:
        "testnet"

    })

  });


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
     CROSS-CHECK ENVIRONMENT CORE
  ======================================================= */

  const environmentSupabaseUrl =
    environment.getSupabaseUrl();


  if (
    environmentSupabaseUrl !==
    selectedConfig.url
  ) {

    console.error(
      "❌ Supabase URL mismatch between environment-core and supabase-core.",
      {
        environment:
          currentEnvironment,

        environmentUrl:
          environmentSupabaseUrl,

        configuredUrl:
          selectedConfig.url
      }
    );

    return;

  }


  /* =======================================================
     NETWORK CROSS-CHECK
  ======================================================= */

  const environmentNetwork =
    environment.getNetwork();


  if (
    environmentNetwork !==
    selectedConfig.network
  ) {

    console.error(
      "❌ Network mismatch.",
      {
        environmentNetwork,
        configuredNetwork:
          selectedConfig.network
      }
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

  }
  catch (error) {

    console.error(
      "❌ Failed to create Supabase client:",
      error
    );

    return;

  }


  /* =======================================================
     PUBLIC CORE
  ======================================================= */

  const core = {

    /* -----------------------------------------------
       SUPABASE CLIENT
    ------------------------------------------------ */

    client,


    /* -----------------------------------------------
       ENVIRONMENT
    ------------------------------------------------ */

    environment:
      currentEnvironment,


    /* -----------------------------------------------
       NETWORK
    ------------------------------------------------ */

    network:
      selectedConfig.network,


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
       ENVIRONMENT CHECK
    ------------------------------------------------ */

    isMainnet() {

      return (
        this.environment ===
        "mainnet"
      );

    },


    isTestnet() {

      return (
        this.environment ===
        "testnet"
      );

    },


    /* -----------------------------------------------
       NETWORK CHECK
    ------------------------------------------------ */

    isNetwork(network) {

      return (
        this.network ===
        String(network || "")
          .trim()
          .toLowerCase()
      );

    },


    /* -----------------------------------------------
       RPC
    ------------------------------------------------ */

    async rpc(
      functionName,
      params = {}
    ) {

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
       DATABASE TABLE ACCESS
    ------------------------------------------------ */

    from(tableName) {

      if (!tableName) {

        throw new Error(
          "Supabase table name is required."
        );

      }


      return this.client.from(
        tableName
      );

    },


    /* -----------------------------------------------
       AUTH ACCESS
    ------------------------------------------------ */

    get auth() {

      return this.client.auth;

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

    },


    /* -----------------------------------------------
       CONFIG SNAPSHOT
    ------------------------------------------------ */

    getConfig() {

      return Object.freeze({

        environment:
          this.environment,

        network:
          this.network,

        project:
          this.project,

        url:
          this.url

      });

    }

  };


  /* =======================================================
     FREEZE CORE
  ======================================================= */

  Object.freeze(core);


  /* =======================================================
     GLOBAL EXPORT
  ======================================================= */

  window.ALBUKHR_SUPABASE =
    core;


  /* =======================================================
     COMPATIBILITY ALIAS
     
     Existing engines can temporarily access:

       window.supabaseClient

     New architecture should use:

       ALBUKHR_SUPABASE.client

       ALBUKHR_SUPABASE.from(...)

       ALBUKHR_SUPABASE.rpc(...)
  ======================================================= */

  if (!window.supabaseClient) {

    window.supabaseClient =
      core.client;

  }


  /* =======================================================
     DEVELOPMENT LOG
  ======================================================= */

  console.info(
    "✅ ALBUKHR Supabase Core initialized.",
    {
      environment:
        core.environment,

      network:
        core.network,

      project:
        core.project
    }
  );


})(window);
