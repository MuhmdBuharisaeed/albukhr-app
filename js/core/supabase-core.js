/* =========================================================
   ALBUKHR SUPABASE CORE
   File:
   js/core/supabase-core.js

   Purpose:
   - Central Supabase client
   - Environment-aware connection
   - Strict MAINNET / TESTNET isolation
   - Single client per page
   - Explicitly disables Supabase Auth persistence
   - No LocalStorage dependency
   - No direct authentication logic
   - No direct table-write logic
   - Compatible with ALBUKHR Environment Core
   ========================================================= */

(function (window) {
  "use strict";

  if (window.ALBUKHR_SUPABASE) {
    console.warn("⚠️ ALBUKHR Supabase Core already initialized.");
    return;
  }

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("❌ Supabase SDK is not loaded.");
    return;
  }

  const environment = window.ALBukhrEnvironment;

  if (!environment) {
    console.error("❌ ALBUKHR Environment Core is not loaded.");
    return;
  }

  if (typeof environment.isKnown !== "function" || !environment.isKnown()) {
    console.error("❌ ALBUKHR environment is unknown.");
    return;
  }

  const currentEnvironment = environment.getKey();

  if (currentEnvironment !== "mainnet" && currentEnvironment !== "testnet") {
    console.error("❌ Invalid ALBUKHR environment:", currentEnvironment);
    return;
  }

  const CONFIG = Object.freeze({
    mainnet: Object.freeze({
      name: "App Albukhr",
      url: "https://ribpntyqdleytsyktdfb.supabase.co",
      key: "sb_publishable_6pRDCPwk97eCz2Fpu1cadg__XIQlZX2",
      network: "mainnet"
    }),
    testnet: Object.freeze({
      name: "Test Albukhr",
      url: "https://vhvkwvngmrlgyzwemttt.supabase.co",
      key: "sb_publishable_5YNtKXSpO1xvPXbpLTo2Nw_mrxDp1qT",
      network: "testnet"
    })
  });

  const selectedConfig = CONFIG[currentEnvironment];

  if (!selectedConfig) {
    console.error("❌ Supabase configuration missing for:", currentEnvironment);
    return;
  }

  const environmentSupabaseUrl = environment.getSupabaseUrl();

  if (environmentSupabaseUrl !== selectedConfig.url) {
    console.error(
      "❌ Supabase URL mismatch between environment-core and supabase-core.",
      {
        environment: currentEnvironment,
        environmentUrl: environmentSupabaseUrl,
        configuredUrl: selectedConfig.url
      }
    );
    return;
  }

  const environmentNetwork = environment.getNetwork();

  if (environmentNetwork !== selectedConfig.network) {
    console.error("❌ Network mismatch.", {
      environmentNetwork,
      configuredNetwork: selectedConfig.network
    });
    return;
  }

  let client;

  try {
    /*
      IMPORTANT:
      ALBUKHR does not use Supabase Auth as the application's
      persistent identity/session store. Pi authentication and
      ALBUKHR auth state remain memory-only.

      These options prevent the Supabase JS client from creating
      or restoring browser-persistent Auth sessions.
    */
    client = window.supabase.createClient(
      selectedConfig.url,
      selectedConfig.key,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  } catch (error) {
    console.error("❌ Failed to create Supabase client:", error);
    return;
  }

  const core = {
    client,
    environment: currentEnvironment,
    network: selectedConfig.network,
    project: selectedConfig.name,
    url: selectedConfig.url,

    isMainnet() {
      return this.environment === "mainnet";
    },

    isTestnet() {
      return this.environment === "testnet";
    },

    isNetwork(network) {
      return this.network === String(network || "").trim().toLowerCase();
    },

    async rpc(functionName, params = {}) {
      if (!functionName) {
        throw new Error("Supabase RPC function name is required.");
      }
      return await this.client.rpc(functionName, params);
    },

    from(tableName) {
      if (!tableName) {
        throw new Error("Supabase table name is required.");
      }
      return this.client.from(tableName);
    },

    get auth() {
      return this.client.auth;
    },

    get storage() {
      return this.client.storage;
    },

    getClient() {
      return this.client;
    },

    getConfig() {
      return Object.freeze({
        environment: this.environment,
        network: this.network,
        project: this.project,
        url: this.url
      });
    }
  };

  Object.freeze(core);

  window.ALBUKHR_SUPABASE = core;

  if (!window.supabaseClient) {
    window.supabaseClient = core.client;
  }

  console.info("✅ ALBUKHR Supabase Core initialized.", {
    environment: core.environment,
    network: core.network,
    project: core.project,
    authPersistence: "disabled"
  });
})(window);
