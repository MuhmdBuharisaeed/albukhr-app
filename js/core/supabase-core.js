/* =========================================================
 * ALBUKHR — SUPABASE CORE
 * =========================================================
 *
 * Common Supabase connection layer for:
 *
 * MAINNET:
 *   https://app.albukhr.com
 *   → App Albukhr project
 *
 * TESTNET:
 *   https://test.albukhr.com
 *   → Test Albukhr project
 *
 * IMPORTANT:
 * - Browser-safe publishable keys only.
 * - NEVER put a service-role key here.
 * - Environment is determined by hostname.
 * - Mainnet and Testnet use completely separate
 *   Supabase projects/databases.
 * ========================================================= */

(function (window) {
    "use strict";

    /* =======================================================
     * SUPABASE PROJECT CONFIGURATION
     * ======================================================= */

    const SUPABASE_CONFIG = Object.freeze({

        mainnet: Object.freeze({
            name: "App Albukhr project",
            environment: "mainnet",
            appUrl: "https://app.albukhr.com",

            supabaseUrl:
                "https://ribpntyqdleytsyktdfb.supabase.co",

            publishableKey:
                "sb_publishable_6pRDCPwk97eCz2Fpu1cadg__XIQlZX2"
        }),

        testnet: Object.freeze({
            name: "Test Albukhr project",
            environment: "testnet",
            appUrl: "https://test.albukhr.com",

            supabaseUrl:
                "https://vhvkwvngmrlgyzwemttt.supabase.co",

            publishableKey:
                "sb_publishable_5YNtKXSpO1xvPXbpLTo2Nw_mrxDp1qT"
        })

    });


    /* =======================================================
     * HOSTNAME NORMALIZATION
     * ======================================================= */

    function getHostname() {
        return (
            window.location.hostname ||
            ""
        )
            .toLowerCase()
            .trim();
    }


    /* =======================================================
     * ENVIRONMENT DETECTION
     *
     * MAINNET:
     *   app.albukhr.com
     *
     * TESTNET:
     *   test.albukhr.com
     *
     * IMPORTANT:
     * Unknown production hosts are rejected.
     * ======================================================= */

    function detectEnvironment() {

        const hostname = getHostname();


        /* -----------------------------------------------
         * MAINNET
         * ----------------------------------------------- */

        if (
            hostname === "app.albukhr.com" ||
            hostname === "www.app.albukhr.com"
        ) {
            return "mainnet";
        }


        /* -----------------------------------------------
         * TESTNET
         * ----------------------------------------------- */

        if (
            hostname === "test.albukhr.com" ||
            hostname === "www.test.albukhr.com"
        ) {
            return "testnet";
        }


        /* -----------------------------------------------
         * LOCAL DEVELOPMENT
         *
         * Local development defaults to TESTNET.
         *
         * This prevents accidental connection to
         * Mainnet during development.
         * ----------------------------------------------- */

        if (
            hostname === "localhost" ||
            hostname === "127.0.0.1" ||
            hostname === "::1"
        ) {
            return "testnet";
        }


        /* -----------------------------------------------
         * UNKNOWN HOST
         * ----------------------------------------------- */

        throw new Error(
            "[ALBUKHR] Unknown application host. " +
            "Supabase environment cannot be determined."
        );
    }


    /* =======================================================
     * RESOLVE ACTIVE CONFIGURATION
     * ======================================================= */

    function getActiveConfig() {

        const environment = detectEnvironment();

        const config =
            SUPABASE_CONFIG[environment];

        if (!config) {
            throw new Error(
                "[ALBUKHR] Supabase configuration missing for environment: " +
                environment
            );
        }

        return config;
    }


    /* =======================================================
     * SUPABASE LIBRARY CHECK
     * ======================================================= */

    function assertSupabaseLibrary() {

        if (
            !window.supabase ||
            typeof window.supabase.createClient !== "function"
        ) {
            throw new Error(
                "[ALBUKHR] Supabase JS client is not loaded. " +
                "Load the Supabase library before supabase-core.js."
            );
        }
    }


    /* =======================================================
     * CREATE SINGLE CLIENT
     *
     * Singleton pattern:
     * The application receives one Supabase client for
     * the active environment.
     * ======================================================= */

    let supabaseClient = null;


    function createSupabaseClient() {

        if (supabaseClient) {
            return supabaseClient;
        }


        assertSupabaseLibrary();


        const config =
            getActiveConfig();


        /* -----------------------------------------------
         * Safety validation
         * ----------------------------------------------- */

        if (!config.supabaseUrl) {
            throw new Error(
                "[ALBUKHR] Supabase URL is missing."
            );
        }


        if (!config.publishableKey) {
            throw new Error(
                "[ALBUKHR] Supabase publishable key is missing."
            );
        }


        /* -----------------------------------------------
         * Create client
         * ----------------------------------------------- */

        supabaseClient =
            window.supabase.createClient(
                config.supabaseUrl,
                config.publishableKey,
                {
                    auth: {
                        persistSession: true,
                        autoRefreshToken: true,
                        detectSessionInUrl: true
                    },

                    global: {
                        headers: {
                            "x-albukhr-environment":
                                config.environment
                        }
                    }
                }
            );


        return supabaseClient;
    }


    /* =======================================================
     * PUBLIC ACCESSOR
     * ======================================================= */

    function getSupabase() {

        return createSupabaseClient();

    }


    /* =======================================================
     * ENVIRONMENT INFORMATION
     * ======================================================= */

    function getEnvironment() {

        return getActiveConfig().environment;

    }


    function isMainnet() {

        return getEnvironment() === "mainnet";

    }


    function isTestnet() {

        return getEnvironment() === "testnet";

    }


    /* =======================================================
     * ACTIVE PROJECT INFORMATION
     * ======================================================= */

    function getProjectInfo() {

        const config =
            getActiveConfig();

        return Object.freeze({

            name: config.name,

            environment:
                config.environment,

            appUrl:
                config.appUrl,

            supabaseUrl:
                config.supabaseUrl
        });
    }


    /* =======================================================
     * NETWORK GUARD
     *
     * Used by future engines before sensitive operations.
     *
     * Example:
     *
     * ALBUKHR.supabase.assertNetwork("testnet");
     *
     * ======================================================= */

    function assertNetwork(expectedNetwork) {

        const actualNetwork =
            getEnvironment();


        if (
            expectedNetwork !==
            actualNetwork
        ) {

            throw new Error(
                "[ALBUKHR] Network mismatch. " +
                "Expected " +
                expectedNetwork +
                " but active environment is " +
                actualNetwork +
                "."
            );
        }


        return true;
    }


    /* =======================================================
     * SAFE DATABASE HELPERS
     * ======================================================= */

    async function rpc(functionName, parameters) {

        if (
            typeof functionName !== "string" ||
            !functionName.trim()
        ) {
            throw new Error(
                "[ALBUKHR] RPC function name is required."
            );
        }


        const client =
            getSupabase();


        return await client.rpc(
            functionName,
            parameters || {}
        );
    }


    /* =======================================================
     * AUTH ACCESSOR
     * ======================================================= */

    function getAuth() {

        return getSupabase().auth;

    }


    /* =======================================================
     * SESSION
     * ======================================================= */

    async function getSession() {

        return await getAuth()
            .getSession();

    }


    /* =======================================================
     * CURRENT USER
     * ======================================================= */

    async function getUser() {

        return await getAuth()
            .getUser();

    }


    /* =======================================================
     * AUTH STATE LISTENER
     * ======================================================= */

    function onAuthStateChange(callback) {

        if (
            typeof callback !== "function"
        ) {
            throw new Error(
                "[ALBUKHR] Auth callback must be a function."
            );
        }


        return getAuth()
            .onAuthStateChange(callback);
    }


    /* =======================================================
     * SIGN OUT
     * ======================================================= */

    async function signOut() {

        return await getAuth()
            .signOut();

    }


    /* =======================================================
     * DEBUG INFORMATION
     *
     * Does NOT expose the publishable key.
     * Does NOT expose secrets.
     * ======================================================= */

    function getDebugInfo() {

        const config =
            getActiveConfig();


        return Object.freeze({

            hostname:
                getHostname(),

            environment:
                config.environment,

            project:
                config.name,

            appUrl:
                config.appUrl,

            supabaseUrl:
                config.supabaseUrl
        });
    }


    /* =======================================================
     * FREEZE PUBLIC API
     * ======================================================= */

    const ALBUKHR_SUPABASE =
        Object.freeze({

            /* Client */
            getSupabase,

            /* Environment */
            getEnvironment,
            isMainnet,
            isTestnet,

            /* Project */
            getProjectInfo,

            /* Security */
            assertNetwork,

            /* RPC */
            rpc,

            /* Auth */
            getAuth,
            getSession,
            getUser,
            onAuthStateChange,
            signOut,

            /* Debug */
            getDebugInfo

        });


    /* =======================================================
     * GLOBAL EXPORT
     * ======================================================= */

    window.ALBUKHR =
        window.ALBUKHR || {};


    window.ALBUKHR.supabase =
        ALBUKHR_SUPABASE;


    /* =======================================================
     * INITIALIZATION CHECK
     *
     * We intentionally do not create the client immediately.
     * It will be created when getSupabase() is called.
     * ======================================================= */

    try {

        const info =
            getDebugInfo();


        console.info(
            "[ALBUKHR] Supabase Core initialized:",
            info.environment,
            info.project
        );

    } catch (error) {

        console.error(
            "[ALBUKHR] Supabase Core initialization failed:",
            error
        );

    }

})(window);
