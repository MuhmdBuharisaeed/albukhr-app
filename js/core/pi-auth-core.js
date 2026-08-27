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
   - Keep authentication state in memory only
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

    const environment =
      window.ALBukhrEnvironment;

    if (!environment) {

      throw new Error(
        "ALBUKHR Environment Core is not loaded."
      );

    }

    return environment;

  }


  /* =======================================================
     ENVIRONMENT
  ======================================================= */

  function getEnvironment() {

    const environment =
      getEnvironmentCore();

    if (
      typeof environment.isKnown !== "function" ||
      !environment.isKnown()
    ) {

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


    const network =
      environment.getNetwork();


    if (
      network !== "mainnet" &&
      network !== "testnet"
    ) {

      throw new Error(
        "Invalid ALBUKHR Pi network."
      );

    }


    console.info(
      "🔐 Initializing Pi SDK:",
      {
        environment:
          environment.getName(),

        network
      }
    );


    /*
     * ALBUKHR environment determines whether
     * Pi SDK runs against Mainnet or Testnet.
     *
     * Mainnet  → sandbox:false
     * Testnet  → sandbox:true
     */

    await Pi.init({

      version: "2.0",

      sandbox:
        environment.isTestnet()

    });


    initialized = true;


    console.info(
      "✅ Pi SDK initialized:",
      network
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


          const network =
            environment.getNetwork();


          console.info(
            "🔐 Authenticating Pi user:",
            {
              environment:
                environment.getName(),

              network
            }
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


          if (!authResult) {

            throw new Error(
              "Pi authentication returned no result."
            );

          }


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
           * to LocalStorage, sessionStorage,
           * cookies, or any persistent store.
           */

          accessToken =
            authResult?.accessToken ||
            null;


          authenticatedUser =
            user;


          console.info(
            "✅ Pi authentication successful:",
            {
              uid:
                user.uid,

              username:
                user.username,

              network
            }
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


      if (redirectUrl) {

        const currentPath =
          window.location.pathname;

        const targetPath =
          new URL(
            redirectUrl,
            window.location.href
          ).pathname;


        if (
          currentPath !== targetPath
        ) {

          window.location.replace(
            redirectUrl
          );

        }

      }


      return null;

    }

  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  function logout() {

    /*
     * Clear only ALBUKHR in-memory
     * authentication state.
     *
     * No LocalStorage cleanup is needed
     * because this core does not persist auth.
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
