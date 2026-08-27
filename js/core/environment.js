/* =========================================================
   ALBUKHR ENVIRONMENT ENGINE
   ---------------------------------------------------------
   MAINNET:
   https://app.albukhr.com

   TESTNET:
   https://test.albukhr.com

   IMPORTANT:
   - This engine only identifies the environment.
   - It does NOT create a Supabase client.
   - Unknown hosts fail closed.
   ========================================================= */

(function (window) {
    "use strict";

    const MAINNET_HOST = "app.albukhr.com";
    const TESTNET_HOST = "test.albukhr.com";

    function normalizeHost(host) {
        return String(host || "")
            .trim()
            .toLowerCase()
            .replace(/\.$/, "");
    }

    function detectEnvironment() {
        const host = normalizeHost(window.location.hostname);

        if (host === MAINNET_HOST) {
            return {
                name: "mainnet",
                label: "MAINNET",
                host: MAINNET_HOST,
                isMainnet: true,
                isTestnet: false
            };
        }

        if (host === TESTNET_HOST) {
            return {
                name: "testnet",
                label: "TESTNET",
                host: TESTNET_HOST,
                isMainnet: false,
                isTestnet: true
            };
        }

        return {
            name: "unknown",
            label: "UNKNOWN",
            host,
            isMainnet: false,
            isTestnet: false
        };
    }

    const environment = Object.freeze(detectEnvironment());

    function requireValidEnvironment() {
        if (environment.name === "unknown") {
            throw new Error(
                "ALBUKHR: Unknown environment. " +
                "Application execution has been blocked."
            );
        }

        return environment;
    }

    const api = Object.freeze({
        MAINNET_HOST,
        TESTNET_HOST,
        environment,
        detectEnvironment,
        requireValidEnvironment
    });

    window.ALBUKHR_ENV = api;

})(window);
