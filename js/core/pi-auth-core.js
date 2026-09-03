/* =========================================================
   ALBUKHR PI AUTH CORE
   File:
   js/core/pi-auth-core.js

   Purpose:
   - Initialize Pi SDK
   - Authenticate ALBUKHR users
   - Record successful Pi login through Supabase RPC
   - Resolve ALBUKHR users.id from Pi identity
   - Provide one shared authenticated-user state
   - Keep Mainnet/Testnet context explicit
   - No LocalStorage authentication persistence
   - No sessionStorage authentication persistence
   - No UI manipulation

   Depends on:
   1. Pi SDK
   2. js/core/environment-core.js
   3. js/core/supabase-core.js

   Required RPC:
   public.record_pi_login(
     p_pi_uid text,
     p_username text,
     p_wallet_address text,
     p_network text,
     p_status text
   )

   Public API:
   window.AlbukhrPiAuth
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     PREVENT DUPLICATE INITIALIZATION
  ======================================================= */

  if (window.AlbukhrPiAuth) {

    console.warn(
      "⚠️ ALBUKHR Pi Auth Core already initialized."
    );

    return;

  }


  /* =======================================================
     INTERNAL STATE

     IMPORTANT:

     This state is memory-only.

     It is intentionally NOT stored in:

     - LocalStorage
     - sessionStorage
     - Cookies
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


    if (
      typeof environment.isKnown !== "function"
    ) {

      throw new Error(
        "ALBUKHR Environment Core is invalid."
      );

    }


    if (!environment.isKnown()) {

      throw new Error(
        "ALBUKHR environment is not recognized."
      );

    }


    return environment;

  }


  /* =======================================================
     SUPABASE CORE
  ======================================================= */

  function getSupabaseCore() {

    const supabaseCore =
      window.ALBUKHR_SUPABASE;


    if (!supabaseCore) {

      throw new Error(
        "ALBUKHR Supabase Core is not loaded."
      );

    }


    if (
      typeof supabaseCore.rpc !== "function"
    ) {

      throw new Error(
        "ALBUKHR Supabase Core is invalid."
      );

    }


    return supabaseCore;

  }


  /* =======================================================
     ENVIRONMENT
  ======================================================= */

  function getEnvironment() {

    return getEnvironmentCore();

  }


  /* =======================================================
     NETWORK
  ======================================================= */

  function getNetwork() {

    return getEnvironment()
      .getNetwork();

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


    if (
      typeof window.Pi.init !== "function"
    ) {

      throw new Error(
        "Pi SDK initialization method is unavailable."
      );

    }


    if (
      typeof window.Pi.authenticate !== "function"
    ) {

      throw new Error(
        "Pi SDK authentication method is unavailable."
      );

    }


    return window.Pi;

  }


  /* =======================================================
     VALIDATE NETWORK
  ======================================================= */

  function validateNetwork(network) {

    const normalizedNetwork =
      String(network || "")
        .trim()
        .toLowerCase();


    if (
      normalizedNetwork !== "mainnet" &&
      normalizedNetwork !== "testnet"
    ) {

      throw new Error(
        "Invalid ALBUKHR network."
      );

    }


    return normalizedNetwork;

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
      validateNetwork(
        environment.getNetwork()
      );


    console.info(
      "🔐 Initializing ALBUKHR Pi SDK.",
      {
        environment:
          environment.getName(),

        network
      }
    );


    /* ---------------------------------------------------
       PI ENVIRONMENT

       MAINNET:
       sandbox: false

       TESTNET:
       sandbox: true
    --------------------------------------------------- */

    await Pi.init({

      version: "2.0",

      sandbox:
        environment.isTestnet()

    });


    initialized = true;


    console.info(
      "✅ ALBUKHR Pi SDK initialized.",
      {
        network
      }
    );


    return true;

  }


  /* =======================================================
     INCOMPLETE PAYMENT CALLBACK
  ======================================================= */

  function onIncompletePaymentFound(payment) {

    console.warn(
      "⚠️ ALBUKHR incomplete Pi payment found.",
      payment
    );

  }


  /* =======================================================
     NORMALIZE TEXT
  ======================================================= */

  function normalizeText(value) {

    if (
      value === null ||
      value === undefined
    ) {

      return null;

    }


    const normalized =
      String(value)
        .trim();


    return normalized || null;

  }


  /* =======================================================
     NORMALIZE PI USER
  ======================================================= */

  function normalizePiUser(authResult) {

    const rawUser =
      authResult?.user ||
      authResult ||
      null;


    if (!rawUser) {

      throw new Error(
        "Pi authentication returned no user."
      );

    }


    const piUid =
      normalizeText(
        rawUser.uid
      );


    const username =
      normalizeText(
        rawUser.username
      );


    const walletAddress =
      normalizeText(
        rawUser.wallet_address
      );


    if (!piUid) {

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

      pi_uid:
        piUid,

      username,

      wallet_address:
        walletAddress

    });

  }


  /* =======================================================
     RECORD FAILED LOGIN

     IMPORTANT:

     record_pi_login supports:

     p_status = "failed"

     However, if Pi authentication itself fails before
     we obtain a valid Pi UID, we cannot safely call
     the RPC because p_pi_uid is required.
  ======================================================= */

  async function recordFailedLogin(
    piUser,
    error
  ) {

    if (
      !piUser ||
      !piUser.pi_uid
    ) {

      console.warn(
        "⚠️ Failed Pi login cannot be recorded because Pi UID is unavailable."
      );

      return null;

    }


    try {

      const supabase =
        getSupabaseCore();


      const network =
        validateNetwork(
          getNetwork()
        );


      const response =
        await supabase.rpc(
          "record_pi_login",
          {

            p_pi_uid:
              piUser.pi_uid,

            p_username:
              piUser.username,

            p_wallet_address:
              piUser.wallet_address,

            p_network:
              network,

            p_status:
              "failed"

          }
        );


      if (response.error) {

        console.error(
          "❌ Failed login event could not be recorded.",
          response.error
        );

        return null;

      }


      console.info(
        "⚠️ Failed Pi login event recorded."
      );


      return response.data;

    }
    catch (recordError) {

      console.error(
        "❌ Failed login recording error.",
        {
          originalError:
            error,

          recordError
        }
      );


      return null;

    }

  }


  /* =======================================================
     RECORD SUCCESSFUL LOGIN

     RPC:

     record_pi_login(...)

     Returns:

     users.id UUID
  ======================================================= */

  async function recordSuccessfulLogin(
    piUser
  ) {

    if (
      !piUser ||
      !piUser.pi_uid
    ) {

      throw new Error(
        "Pi user identity is required."
      );

    }


    const supabase =
      getSupabaseCore();


    const network =
      validateNetwork(
        getNetwork()
      );


    /* ---------------------------------------------------
       STRICT NETWORK CROSS-CHECK
    --------------------------------------------------- */

    if (
      !supabase.isNetwork(network)
    ) {

      throw new Error(
        "Supabase network does not match ALBUKHR environment."
      );

    }


    console.info(
      "🗄️ Recording ALBUKHR Pi login.",
      {
        pi_uid:
          piUser.pi_uid,

        username:
          piUser.username,

        network
      }
    );


    const response =
      await supabase.rpc(
        "record_pi_login",
        {

          p_pi_uid:
            piUser.pi_uid,

          p_username:
            piUser.username,

          p_wallet_address:
            piUser.wallet_address,

          p_network:
            network,

          p_status:
            "success"

        }
      );


    if (response.error) {

      throw new Error(
        response.error.message ||
        "Unable to record Pi login."
      );

    }


    const userId =
      normalizeText(
        response.data
      );


    if (!userId) {

      throw new Error(
        "ALBUKHR login RPC returned no user ID."
      );

    }


    return userId;

  }


  /* =======================================================
     BUILD ALBUKHR AUTHENTICATED USER
  ======================================================= */

  function buildAuthenticatedUser(
    userId,
    piUser
  ) {

    const environment =
      getEnvironment();


    const network =
      validateNetwork(
        environment.getNetwork()
      );


    if (!userId) {

      throw new Error(
        "ALBUKHR user ID is required."
      );

    }


    if (!piUser) {

      throw new Error(
        "Pi user is required."
      );

    }


    return Object.freeze({

      /* ---------------------------------------------
         ALBUKHR DATABASE ID

         public.users.id
      --------------------------------------------- */

      id:
        userId,


      /* ---------------------------------------------
         PI IDENTITY
      --------------------------------------------- */

      pi_uid:
        piUser.pi_uid,

      username:
        piUser.username,

      wallet_address:
        piUser.wallet_address,


      /* ---------------------------------------------
         ENVIRONMENT
      --------------------------------------------- */

      environment:
        environment.getKey(),

      network

    });

  }


  /* =======================================================
     AUTHENTICATE
  ======================================================= */

  async function authenticate() {

    /* ---------------------------------------------------
       PREVENT MULTIPLE SIMULTANEOUS AUTH REQUESTS
    --------------------------------------------------- */

    if (authenticationPromise) {

      return authenticationPromise;

    }


    authenticationPromise =
      (async function () {

        let piUser = null;


        try {

          /* ---------------------------------------------
             INITIALIZE PI SDK
          --------------------------------------------- */

          await initPi();


          const Pi =
            requirePiSDK();


          const environment =
            getEnvironment();


          const network =
            validateNetwork(
              environment.getNetwork()
            );


          /* ---------------------------------------------
             PI AUTHENTICATION
          --------------------------------------------- */

          console.info(
            "🔐 Authenticating ALBUKHR Pi user.",
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


          /* ---------------------------------------------
             NORMALIZE PI USER
          --------------------------------------------- */

          piUser =
            normalizePiUser(
              authResult
            );


          /* ---------------------------------------------
             ACCESS TOKEN

             MEMORY ONLY
          --------------------------------------------- */

          accessToken =
            normalizeText(
              authResult.accessToken
            );


          /* ---------------------------------------------
             RECORD LOGIN

             This returns:

             public.users.id
          --------------------------------------------- */

          const userId =
            await recordSuccessfulLogin(
              piUser
            );


          /* ---------------------------------------------
             BUILD AUTHENTICATED IDENTITY
          --------------------------------------------- */

          authenticatedUser =
            buildAuthenticatedUser(
              userId,
              piUser
            );


          console.info(
            "✅ ALBUKHR authentication successful.",
            {

              user_id:
                authenticatedUser.id,

              pi_uid:
                authenticatedUser.pi_uid,

              username:
                authenticatedUser.username,

              network:
                authenticatedUser.network

            }
          );


          /* ---------------------------------------------
             DISPATCH EVENT
          --------------------------------------------- */

          window.dispatchEvent(

            new CustomEvent(
              "albukhr:auth-success",
              {

                detail: {

                  user:
                    authenticatedUser

                }

              }
            )

          );


          return authenticatedUser;

        }
        catch (error) {

          /* ---------------------------------------------
             RECORD FAILURE WHEN POSSIBLE
          --------------------------------------------- */

          if (piUser) {

            await recordFailedLogin(
              piUser,
              error
            );

          }


          authenticatedUser =
            null;

          accessToken =
            null;


          console.error(
            "❌ ALBUKHR Pi authentication failed.",
            error
          );


          /* ---------------------------------------------
             AUTH FAILURE EVENT
          --------------------------------------------- */

          window.dispatchEvent(

            new CustomEvent(
              "albukhr:auth-failed",
              {

                detail: {

                  error

                }

              }
            )

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
     CURRENT ALBUKHR USER ID
  ======================================================= */

  function getCurrentUserId() {

    if (!authenticatedUser) {

      return null;

    }


    return authenticatedUser.id;

  }


  /* =======================================================
     PI UID
  ======================================================= */

  function getPiUid() {

    if (!authenticatedUser) {

      return null;

    }


    return authenticatedUser.pi_uid;

  }


  /* =======================================================
     USERNAME
  ======================================================= */

  function getUsername() {

    if (!authenticatedUser) {

      return null;

    }


    return authenticatedUser.username;

  }


  /* =======================================================
     WALLET ADDRESS
  ======================================================= */

  function getWalletAddress() {

    if (!authenticatedUser) {

      return null;

    }


    return authenticatedUser.wallet_address;

  }


  /* =======================================================
     ACCESS TOKEN
  ======================================================= */

  function getAccessToken() {

    return accessToken;

  }


  /* =======================================================
     AUTHENTICATION STATUS
  ======================================================= */

  function isAuthenticated() {

    return (
      authenticatedUser !== null
    );

  }


  /* =======================================================
     REQUIRE AUTHENTICATION
  ======================================================= */

  async function requireAuth(
    redirectUrl = "login.html"
  ) {

    /* -----------------------------------------------
       EXISTING MEMORY AUTH
    ------------------------------------------------ */

    if (authenticatedUser) {

      return authenticatedUser;

    }


    try {

      return await ensurePiAuth();

    }
    catch (error) {

      console.error(
        "❌ ALBUKHR authentication required.",
        error
      );


      /* -----------------------------------------------
         REDIRECT

         Prevent redirect loop.
      ------------------------------------------------ */

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

     Clears ALBUKHR memory-only state.

     IMPORTANT:

     This does not log the user out of Pi Browser itself.
  ======================================================= */

  function logout() {

    authenticatedUser =
      null;

    accessToken =
      null;

    authenticationPromise =
      null;


    document.documentElement.removeAttribute(
      "data-albukhr-auth"
    );


    window.dispatchEvent(

      new CustomEvent(
        "albukhr:logout"
      )

    );


    console.info(
      "🔒 ALBUKHR authentication state cleared."
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
     AUTH SNAPSHOT

     Safe identity snapshot for ALBUKHR engines.
  ======================================================= */

  function getAuthSnapshot() {

    if (!authenticatedUser) {

      return null;

    }


    return Object.freeze({

      id:
        authenticatedUser.id,

      pi_uid:
        authenticatedUser.pi_uid,

      username:
        authenticatedUser.username,

      wallet_address:
        authenticatedUser.wallet_address,

      environment:
        authenticatedUser.environment,

      network:
        authenticatedUser.network

    });

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  const AlbukhrPiAuth =
    Object.freeze({

      /* Pi */

      initPi,


      /* Authentication */

      authenticate,

      ensurePiAuth,

      requireAuth,

      logout,


      /* Authentication state */

      isAuthenticated,

      isInitialized,


      /* User */

      getCurrentUser,

      getCurrentUserId,

      getPiUid,

      getUsername,

      getWalletAddress,


      /* Token */

      getAccessToken,


      /* Environment */

      getNetwork,

      getEnvironmentInfo,


      /* Snapshot */

      getAuthSnapshot

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
