/* =========================================================
   ALBUKHR PAGE AUTH GUARD
   File:
   js/core/page-auth-guard.js

   Purpose:
   - Protect authenticated ALBUKHR pages
   - Require ALBUKHR Pi authentication
   - Require a valid ALBUKHR users.id
   - Verify Mainnet/Testnet consistency
   - Expose authenticated page identity
   - Prevent protected page engines from starting early
   - No LocalStorage dependency
   - No sessionStorage dependency
   - No direct Supabase client creation
   - No UI authentication logic

   Depends on:
   1. js/core/environment-core.js
   2. js/core/pi-auth-core.js

   Public API:
   window.AlbukhrPageAuthGuard

   Events:
   albukhr:authenticated
   albukhr:auth-guard-failed
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     PREVENT DUPLICATE INITIALIZATION
  ======================================================= */

  if (window.AlbukhrPageAuthGuard) {

    console.warn(
      "⚠️ ALBUKHR Page Auth Guard already initialized."
    );

    return;

  }


  /* =======================================================
     INTERNAL STATE
  ======================================================= */

  let protectionPromise = null;

  let protectedUser = null;

  let protectionCompleted = false;


  /* =======================================================
     GET ENVIRONMENT CORE
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
     GET PI AUTH CORE
  ======================================================= */

  function getPiAuthCore() {

    const auth =
      window.AlbukhrPiAuth;


    if (!auth) {

      throw new Error(
        "ALBUKHR Pi Auth Core is not loaded."
      );

    }


    if (
      typeof auth.ensurePiAuth !== "function"
    ) {

      throw new Error(
        "ALBUKHR Pi Auth Core is invalid."
      );

    }


    return auth;

  }


  /* =======================================================
     NORMALIZE NETWORK
  ======================================================= */

  function normalizeNetwork(network) {

    const normalized =
      String(network || "")
        .trim()
        .toLowerCase();


    if (
      normalized !== "mainnet" &&
      normalized !== "testnet"
    ) {

      throw new Error(
        "Invalid ALBUKHR network."
      );

    }


    return normalized;

  }


  /* =======================================================
     VALIDATE AUTHENTICATED USER
  ======================================================= */

  function validateUser(user) {

    if (!user) {

      throw new Error(
        "No authenticated ALBUKHR user."
      );

    }


    if (!user.id) {

      throw new Error(
        "Authenticated ALBUKHR user ID is missing."
      );

    }


    if (!user.pi_uid) {

      throw new Error(
        "Authenticated Pi UID is missing."
      );

    }


    if (!user.username) {

      throw new Error(
        "Authenticated Pi username is missing."
      );

    }


    if (!user.network) {

      throw new Error(
        "Authenticated user network is missing."
      );

    }


    return true;

  }


  /* =======================================================
     VALIDATE ENVIRONMENT CONSISTENCY
  ======================================================= */

  function validateEnvironment(user) {

    const environment =
      getEnvironmentCore();


    const environmentNetwork =
      normalizeNetwork(
        environment.getNetwork()
      );


    const userNetwork =
      normalizeNetwork(
        user.network
      );


    /* ---------------------------------------------------
       STRICT NETWORK ISOLATION
    --------------------------------------------------- */

    if (
      environmentNetwork !==
      userNetwork
    ) {

      throw new Error(
        "Authenticated user network does not match the current ALBUKHR environment."
      );

    }


    /* ---------------------------------------------------
       ENVIRONMENT KEY CHECK
    --------------------------------------------------- */

    if (user.environment) {

      const environmentKey =
        String(
          environment.getKey() || ""
        )
          .trim()
          .toLowerCase();


      const userEnvironment =
        String(
          user.environment || ""
        )
          .trim()
          .toLowerCase();


      if (
        environmentKey !==
        userEnvironment
      ) {

        throw new Error(
          "Authenticated user environment does not match the current ALBUKHR environment."
        );

      }

    }


    return true;

  }


  /* =======================================================
     BUILD SAFE PAGE USER
  ======================================================= */

  function buildPageUser(user) {

    return Object.freeze({

      /* ALBUKHR DATABASE USER ID */

      id:
        user.id,


      /* PI IDENTITY */

      pi_uid:
        user.pi_uid,

      username:
        user.username,

      wallet_address:
        user.wallet_address ||
        null,


      /* ENVIRONMENT */

      environment:
        user.environment,

      network:
        user.network

    });

  }


  /* =======================================================
     APPLY PAGE AUTH STATE
  ======================================================= */

  function applyAuthenticatedState(
    user
  ) {

    document.documentElement.dataset.albukhrAuth =
      "authenticated";


    document.documentElement.dataset.albukhrUserId =
      user.id;


    document.documentElement.dataset.albukhrNetwork =
      user.network;


    document.documentElement.dataset.albukhrEnvironment =
      user.environment;

  }


  /* =======================================================
     CLEAR PAGE AUTH STATE
  ======================================================= */

  function clearAuthenticatedState() {

    document.documentElement.removeAttribute(
      "data-albukhr-auth"
    );


    document.documentElement.removeAttribute(
      "data-albukhr-user-id"
    );


    document.documentElement.removeAttribute(
      "data-albukhr-network"
    );


    document.documentElement.removeAttribute(
      "data-albukhr-environment"
    );

  }


  /* =======================================================
     REDIRECT TO LOGIN
  ======================================================= */

  function redirectToLogin(
    redirectUrl = "login.html"
  ) {

    if (!redirectUrl) {

      return;

    }


    const currentUrl =
      window.location.href;


    let targetUrl;


    try {

      targetUrl =
        new URL(
          redirectUrl,
          currentUrl
        );

    }
    catch (error) {

      console.error(
        "❌ Invalid login redirect URL:",
        redirectUrl
      );

      return;

    }


    const currentPath =
      window.location.pathname;


    const targetPath =
      targetUrl.pathname;


    /* Prevent redirect loop */

    if (
      currentPath === targetPath
    ) {

      return;

    }


    window.location.replace(
      targetUrl.href
    );

  }


  /* =======================================================
     DISPATCH AUTHENTICATED EVENT
  ======================================================= */

  function dispatchAuthenticatedEvent(
    user
  ) {

    window.dispatchEvent(

      new CustomEvent(
        "albukhr:authenticated",
        {

          detail:
            Object.freeze({

              user,

              userId:
                user.id,

              piUid:
                user.pi_uid,

              username:
                user.username,

              network:
                user.network,

              environment:
                user.environment

            })

        }
      )

    );

  }


  /* =======================================================
     DISPATCH FAILURE EVENT
  ======================================================= */

  function dispatchFailureEvent(
    error
  ) {

    window.dispatchEvent(

      new CustomEvent(
        "albukhr:auth-guard-failed",
        {

          detail: {

            error

          }

        }
      )

    );

  }


  /* =======================================================
     PROTECT PAGE
  ======================================================= */

  async function protectPage(
    options = {}
  ) {

    /* ---------------------------------------------------
       RETURN EXISTING RESULT
    --------------------------------------------------- */

    if (
      protectionCompleted &&
      protectedUser
    ) {

      return protectedUser;

    }


    /* ---------------------------------------------------
       PREVENT MULTIPLE PROTECTION REQUESTS
    --------------------------------------------------- */

    if (protectionPromise) {

      return protectionPromise;

    }


    const redirectUrl =
      options.redirectUrl ||
      "login.html";


    protectionPromise =
      (async function () {

        try {

          /* ---------------------------------------------
             ENVIRONMENT
          --------------------------------------------- */

          const environment =
            getEnvironmentCore();


          const environmentNetwork =
            normalizeNetwork(
              environment.getNetwork()
            );


          /* ---------------------------------------------
             PI AUTH CORE
          --------------------------------------------- */

          const auth =
            getPiAuthCore();


          console.info(
            "🔐 Protecting ALBUKHR page.",
            {

              environment:
                environment.getName(),

              network:
                environmentNetwork

            }
          );


          /* ---------------------------------------------
             ENSURE PI AUTH

             This returns:

             {
               id,
               pi_uid,
               username,
               wallet_address,
               environment,
               network
             }
          --------------------------------------------- */

          const authenticatedUser =
            await auth.ensurePiAuth();


          /* ---------------------------------------------
             VALIDATE USER
          --------------------------------------------- */

          validateUser(
            authenticatedUser
          );


          /* ---------------------------------------------
             VALIDATE NETWORK
          --------------------------------------------- */

          validateEnvironment(
            authenticatedUser
          );


          /* ---------------------------------------------
             CREATE SAFE PAGE USER
          --------------------------------------------- */

          protectedUser =
            buildPageUser(
              authenticatedUser
            );


          /* ---------------------------------------------
             APPLY PAGE STATE
          --------------------------------------------- */

          applyAuthenticatedState(
            protectedUser
          );


          protectionCompleted =
            true;


          /* ---------------------------------------------
             AUTHENTICATED EVENT

             Page engines can listen for:

             albukhr:authenticated
          --------------------------------------------- */

          dispatchAuthenticatedEvent(
            protectedUser
          );


          console.info(
            "✅ ALBUKHR page access granted.",
            {

              user_id:
                protectedUser.id,

              username:
                protectedUser.username,

              network:
                protectedUser.network

            }
          );


          return protectedUser;

        }
        catch (error) {

          protectedUser =
            null;

          protectionCompleted =
            false;


          clearAuthenticatedState();


          console.error(
            "❌ ALBUKHR page access denied.",
            error
          );


          dispatchFailureEvent(
            error
          );


          redirectToLogin(
            redirectUrl
          );


          return null;

        }
        finally {

          protectionPromise =
            null;

        }

      })();


    return protectionPromise;

  }


  /* =======================================================
     REQUIRE PAGE AUTH
  ======================================================= */

  async function requirePageAuth(
    options = {}
  ) {

    return protectPage(
      options
    );

  }


  /* =======================================================
     GET AUTHENTICATED PAGE USER
  ======================================================= */

  function getCurrentUser() {

    return protectedUser;

  }


  /* =======================================================
     GET CURRENT USER ID
  ======================================================= */

  function getCurrentUserId() {

    return protectedUser
      ? protectedUser.id
      : null;

  }


  /* =======================================================
     GET PI UID
  ======================================================= */

  function getPiUid() {

    return protectedUser
      ? protectedUser.pi_uid
      : null;

  }


  /* =======================================================
     GET USERNAME
  ======================================================= */

  function getUsername() {

    return protectedUser
      ? protectedUser.username
      : null;

  }


  /* =======================================================
     GET NETWORK
  ======================================================= */

  function getNetwork() {

    return protectedUser
      ? protectedUser.network
      : null;

  }


  /* =======================================================
     GET ENVIRONMENT
  ======================================================= */

  function getEnvironment() {

    return protectedUser
      ? protectedUser.environment
      : null;

  }


  /* =======================================================
     AUTH STATUS
  ======================================================= */

  function isProtected() {

    return (
      protectionCompleted === true &&
      protectedUser !== null
    );

  }


  /* =======================================================
     WAIT FOR AUTH

     Useful for page engines.

     Example:

     const user =
       await AlbukhrPageAuthGuard.waitForAuth();
  ======================================================= */

  async function waitForAuth() {

    if (
      protectionCompleted &&
      protectedUser
    ) {

      return protectedUser;

    }


    return protectPage();

  }


  /* =======================================================
     RESET

     Used internally if a page needs to
     clear page-level authentication state.
  ======================================================= */

  function reset() {

    protectedUser =
      null;

    protectionCompleted =
      false;

    protectionPromise =
      null;


    clearAuthenticatedState();

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  const PageAuthGuard =
    Object.freeze({

      protectPage,

      requirePageAuth,

      waitForAuth,

      getCurrentUser,

      getCurrentUserId,

      getPiUid,

      getUsername,

      getNetwork,

      getEnvironment,

      isProtected,

      reset

    });


  /* =======================================================
     GLOBAL EXPORT
  ======================================================= */

  window.AlbukhrPageAuthGuard =
    PageAuthGuard;


  /* =======================================================
     AUTOMATIC PROTECTION

     IMPORTANT:

     Protected pages can simply load this file.

     Authentication starts automatically.
  ======================================================= */

  function initialize() {

    protectPage();

  }


  /* =======================================================
     DOM READY
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );

  }
  else {

    initialize();

  }


})(window);
