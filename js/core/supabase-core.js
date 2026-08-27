/* =========================================================
   ALBUKHR SUPABASE CORE
   ---------------------------------------------------------
   MAINNET
   app.albukhr.com
   → App Albukhr project

   TESTNET
   test.albukhr.com
   → Test Albukhr project

   IMPORTANT SECURITY RULES
   ---------------------------------------------------------
   1. Environment is determined by environment.js.
   2. MAINNET can only use MAINNET Supabase.
   3. TESTNET can only use TESTNET Supabase.
   4. Unknown environment is blocked.
   5. No service-role/secret key belongs in frontend code.
   6. All application engines should use this shared client.
   ========================================================= */

(function (window) {
    "use strict";

    /* -----------------------------------------------------
       REQUIRE ENVIRONMENT ENGINE
       ----------------------------------------------------- */

    if (!window.ALBUKHR_ENV) {
        throw new Error(
            "ALBUKHR: environment.js must load before supabase-core.js"
        );
    }

    const env = window.ALBUKHR_ENV.requireValidEnvironment();

    /* -----------------------------------------------------
       SUPABASE CONFIGURATION
       -----------------------------------------------------
       These are PUBLIC publishable keys intended for
       browser-side use.

       NEVER place a Supabase service-role/secret key here.
       ----------------------------------------------------- */

    const CONFIG = Object.freeze({

        mainnet: Object.freeze({
            name: "mainnet",
            url: "https://ribpntyqdleytsyktdfb.supabase.co",
            publishableKey:
                "sb_publishable_6pRDCPwk97eCz2Fpu1cadg__XIQlZX2"
        }),

        testnet: Object.freeze({
            name: "testnet",
            url: "https://vhvkwvngmrlgyzwemttt.supabase.co",
            publishableKey:
                "sb_publishable_5YNtKXSpO1xvPXbpLTo2Nw_mrxDp1qT"
        })

    });


    /* -----------------------------------------------------
       SELECT CONFIGURATION
       ----------------------------------------------------- */

    const selectedConfig = CONFIG[env.name];

    if (!selectedConfig) {
        throw new Error(
            "ALBUKHR: No Supabase configuration exists for " +
            env.name
        );
    }


    /* -----------------------------------------------------
       EXTRA ENVIRONMENT SAFETY CHECK
       ----------------------------------------------------- */

    if (env.name === "mainnet") {

        if (env.host !== "app.albukhr.com") {
            throw new Error(
                "ALBUKHR SECURITY: Mainnet host mismatch."
            );
        }

    }

    if (env.name === "testnet") {

        if (env.host !== "test.albukhr.com") {
            throw new Error(
                "ALBUKHR SECURITY: Testnet host mismatch."
            );
        }

    }


    /* -----------------------------------------------------
       SUPABASE LIBRARY CHECK
       ----------------------------------------------------- */

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        throw new Error(
            "ALBUKHR: Supabase JavaScript library is not loaded."
        );
    }


    /* -----------------------------------------------------
       CREATE CLIENT
       ----------------------------------------------------- */

    const client = window.supabase.createClient(
        selectedConfig.url,
        selectedConfig.publishableKey,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            }
        }
    );


    /* -----------------------------------------------------
       PUBLIC API
       ----------------------------------------------------- */

    const api = Object.freeze({

        client,

        environment: env.name,

        environmentLabel: env.label,

        supabaseUrl: selectedConfig.url,

        isMainnet: env.name === "mainnet",

        isTestnet: env.name === "testnet"

    });


    /* -----------------------------------------------------
       EXPOSE SHARED ALBUKHR SUPABASE CORE
       ----------------------------------------------------- */

    window.ALBUKHR_SUPABASE = api;


    /* -----------------------------------------------------
       DEVELOPMENT INFORMATION
       -----------------------------------------------------
       This does not expose credentials beyond the already
       public browser configuration.
       ----------------------------------------------------- */

    console.info(
        "ALBUKHR Supabase Core:",
        env.label
    );

})(window);
