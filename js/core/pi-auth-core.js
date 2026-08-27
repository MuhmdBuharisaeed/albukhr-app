/* =========================================================
   ALBUKHR PI AUTH CORE
   File:
   js/core/pi-auth-core.js

   Purpose:
   - Initialize Pi SDK
   - Authenticate ALBUKHR users
   - Provide shared authenticated-user state
   - Depend on ALBUKHR Environment Core
   - Keep Mainnet/Testnet network context explicit
   - No LocalStorage authentication persistence
   - No UI manipulation
   - No direct Supabase client creation

   Required before this file:
   1. Pi SDK
   2. js/core/environment-core.js

   Public API:
   window.AlbukhrPiAuth
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     INTERNAL STATE
  ======================================================= */

  let initialized = false;
  let authenticatedUser = null;
  let accessToken = null;
  let authenticationPromise = null;


  /* =======================================================
     ENVIRONMENT CORE
  ======================================================= */

  function getEnvironmentCore() {

    if (!window.ALBukhrEnvironment) {

      throw new Error(
        "ALBUKHR Environment Core is not loaded."
      );

    }

    return window.ALBukhrEnvironment;

  }


  /* =======================================================
     ENVIRONMENT
  ======================================================= */

  function getEnvironment() {

    const environment =
      getEnvironmentCore();

    if (!environment.isKnown()) {

      throw new Error(
        "ALBUKHR environment is not recognized."
      );

    }

    return environment;

  }


  function getNetwork() {

    return getEnvironment().getNetwork();

  }


  /* =======================================================
     PI SDK CHECK
  ======================================================= */

  function requirePiSDK() {

    if (
      typeof window.Pi === "undefined"
    ) {

      throw new Error(
        "Pi SDK is not available. Open ALBUKHR inside Pi Browser."
      );

    }

    return window.Pi;

  }


  /* =======================================================
     PI SDK INITIALIZATION
  ======================================================= */

  async function initPi() {

    if (initialized) {

      return true;

    }


    const environment =
      getEnvironment();

    const Pi =
      requirePiSDK();


    /*
     * ALBUKHR environment is already responsible
     * for Mainnet/Testnet application separation.
     *
     * Pi SDK initialization is kept here so
     * every page uses exactly one authentication core.
     */

    console.info(
      "🔐 Initializing Pi SDK"
    );

    console.info(
      "🌐 ALBUKHR Network:",
      environment.getNetwork()
    );


    await Pi.init({

      version: "2.0",

      sandbox:
        environment.isTestnet()

    });


    initialized = true;


    console.info(
      "✅ Pi SDK initialized"
    );


    return true;

  }


  /* =======================================================
     INCOMPLETE PAYMENT CALLBACK
  ======================================================= */

  function onIncompletePaymentFound(payment) {

    console.warn(
      "⚠️ Incomplete Pi payment found:",
      payment
    );

  }


  /* =======================================================
     NORMALIZE PI USER
  ======================================================= */

  function normalizeUser(authResult) {

    const rawUser =
      authResult?.user ||
      authResult ||
      null;


    if (!rawUser) {

      throw new Error(
        "Pi authentication returned no user."
      );

    }


    const uid =
      rawUser?.uid ||
      null;

    const username =
      rawUser?.username ||
      null;

    const walletAddress =
      rawUser?.wallet_address ||
      null;


    if (!uid) {

      throw new Error(
        "Pi UID is missing."
      );

    }


    if (!username) {

      throw new Error(
        "Pi username is missing."
      );

    }


    return Object.freeze({

      uid,

      username,

      wallet_address:
        walletAddress

    });

  }


  /* =======================================================
     AUTHENTICATE
  ======================================================= */

  async function authenticate() {

    /*
     * Prevent multiple simultaneous
     * Pi authentication requests.
     */

    if (authenticationPromise) {

      return authenticationPromise;

    }


    authenticationPromise =
      (async function () {

        try {

          await initPi();


          const Pi =
            requirePiSDK();


          const environment =
            getEnvironment();


          console.info(
            "🔐 Authenticating Pi user..."
          );

          console.info(
            "🧭 Network:",
            environment.getNetwork()
          );


          const scopes = [

            "username",

            "payments",

            "wallet_address"

          ];


          const authResult =
            await Pi.authenticate(
              scopes,
              onIncompletePaymentFound
            );


          console.log(
            "FULL PI AUTH RESULT:",
            authResult
          );


          const user =
            normalizeUser(authResult);


          /*
           * Access token remains memory-only.
           *
           * It is deliberately NOT written
           * to LocalStorage.
           */

          accessToken =
            authResult?.accessToken ||
            null;


          authenticatedUser =
            user;


          console.info(
            "✅ Pi authentication successful:",
            user.username
          );


          return user;

        }
        catch (error) {

          authenticatedUser =
            null;

          accessToken =
            null;


          console.error(
            "❌ Pi authentication failed:",
            error
          );


          throw error;

        }
        finally {

          authenticationPromise =
            null;

        }

      })();


    return authenticationPromise;

  }


  /* =======================================================
     ENSURE AUTHENTICATED
  ======================================================= */

  async function ensurePiAuth() {

    if (authenticatedUser) {

      return authenticatedUser;

    }


    return authenticate();

  }


  /* =======================================================
     CURRENT USER
  ======================================================= */

  function getCurrentUser() {

    return authenticatedUser;

  }


  /* =======================================================
     ACCESS TOKEN
  ======================================================= */

  function getAccessToken() {

    return accessToken;

  }


  /* =======================================================
     AUTH STATE
  ======================================================= */

  function isAuthenticated() {

    return (
      authenticatedUser !== null
    );

  }


  /* =======================================================
     REQUIRE AUTH
  ======================================================= */

  async function requireAuth(
    redirectUrl = "login.html"
  ) {

    if (isAuthenticated()) {

      return authenticatedUser;

    }


    try {

      return await ensurePiAuth();

    }
    catch (error) {

      console.error(
        "❌ Authentication required:",
        error
      );


      if (
        redirectUrl &&
        window.location.pathname !==
        redirectUrl
      ) {

        window.location.replace(
          redirectUrl
        );

      }


      return null;

    }

  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  function logout() {

    /*
     * Pi SDK does not provide an application-level
     * persistent login session that we should emulate
     * with LocalStorage here.
     *
     * We therefore clear only our in-memory state.
     */

    authenticatedUser =
      null;

    accessToken =
      null;

    authenticationPromise =
      null;


    console.info(
      "🔒 ALBUKHR Pi authentication state cleared."
    );

  }


  /* =======================================================
     INITIALIZATION STATUS
  ======================================================= */

  function isInitialized() {

    return initialized;

  }


  /* =======================================================
     ENVIRONMENT INFORMATION
  ======================================================= */

  function getEnvironmentInfo() {

    const environment =
      getEnvironment();


    return Object.freeze({

      key:
        environment.getKey(),

      name:
        environment.getName(),

      network:
        environment.getNetwork(),

      appUrl:
        environment.getAppUrl(),

      supabaseUrl:
        environment.getSupabaseUrl()

    });

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  const AlbukhrPiAuth =
    Object.freeze({

      initPi,

      authenticate,

      ensurePiAuth,

      requireAuth,

      getCurrentUser,

      getAccessToken,

      isAuthenticated,

      isInitialized,

      getNetwork,

      getEnvironmentInfo,

      logout

    });


  /* =======================================================
     GLOBAL EXPORT
  ======================================================= */

  window.AlbukhrPiAuth =
    AlbukhrPiAuth;


  console.info(
    "✅ ALBUKHR Pi Auth Core loaded."
  );


})(window);
