/* =========================================================
   ALBUKHR LOGIN PAGE CONTROLLER
   File:
   js/login.js

   Purpose:
   - Control Login page UI
   - Call shared Pi Auth Core
   - Never implement Pi authentication itself
   - Never create Supabase client
   - Never persist authentication in LocalStorage
   - Redirect authenticated users to index.html

   Required:
   - Pi SDK
   - environment-core.js
   - supabase-core.js
   - pi-auth-core.js
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     DOM HELPERS
  ======================================================= */

  function getStatusElement() {

    return document.getElementById("status");

  }


  function setStatus(message) {

    const status =
      getStatusElement();

    if (status) {

      status.textContent =
        String(message || "");

    }


    console.log(
      "[ALBUKHR LOGIN]",
      message
    );

  }


  /* =======================================================
     LOGIN BUTTON
  ======================================================= */

  function getLoginButton() {

    return document.getElementById(
      "piLoginButton"
    );

  }


  function setLoginButtonState(
    disabled,
    text
  ) {

    const button =
      getLoginButton();

    if (!button) return;


    button.disabled =
      Boolean(disabled);


    if (typeof text === "string") {

      button.textContent =
        text;

    }

  }


  /* =======================================================
     CORE DEPENDENCY CHECK
  ======================================================= */

  function checkDependencies() {

    if (!window.ALBukhrEnvironment) {

      throw new Error(
        "ALBUKHR Environment Core is unavailable."
      );

    }


    if (!window.ALBUKHR_SUPABASE) {

      throw new Error(
        "ALBUKHR Supabase Core is unavailable."
      );

    }


    if (!window.AlbukhrPiAuth) {

      throw new Error(
        "ALBUKHR Pi Auth Core is unavailable."
      );

    }

  }


  /* =======================================================
     ENVIRONMENT DISPLAY
  ======================================================= */

  function showEnvironment() {

    try {

      const environment =
        window.ALBukhrEnvironment;


      if (!environment.isKnown()) {

        setStatus(
          "❌ Unknown ALBUKHR environment."
        );

        return false;

      }


      console.info(
        "🌐 ALBUKHR Environment:",
        environment.getName()
      );


      console.info(
        "🧭 Network:",
        environment.getNetwork()
      );


      console.info(
        "🗄️ Supabase:",
        environment.getSupabaseUrl()
      );


      return true;

    }
    catch (error) {

      console.error(
        "Environment error:",
        error
      );

      return false;

    }

  }


  /* =======================================================
     LOGIN
  ======================================================= */

  async function login() {

    const button =
      getLoginButton();


    try {

      checkDependencies();


      if (!showEnvironment()) {

        throw new Error(
          "ALBUKHR environment validation failed."
        );

      }


      setLoginButtonState(
        true,
        "Connecting to Pi..."
      );


      setStatus(
        "🔄 Initializing secure Pi authentication..."
      );


      const user =
        await window.AlbukhrPiAuth.ensurePiAuth();


      if (!user || !user.uid) {

        throw new Error(
          "Pi authentication returned an invalid user."
        );

      }


      console.info(
        "✅ Authenticated user:",
        user
      );


      setStatus(
        "✅ Login successful: " +
        user.username
      );


      setLoginButtonState(
        true,
        "Opening Dashboard..."
      );


      /*
       * Give the user a short visual confirmation
       * before entering the application.
       */

      window.setTimeout(
        function () {

          window.location.replace(
            "index.html"
          );

        },
        700
      );

    }
    catch (error) {

      console.error(
        "❌ ALBUKHR LOGIN ERROR:",
        error
      );


      setLoginButtonState(
        false,
        "Login with Pi"
      );


      let message =
        "❌ Login failed.";


      if (
        error &&
        typeof error.message === "string" &&
        error.message.trim()
      ) {

        message =
          "❌ " +
          error.message;

      }


      setStatus(message);

    }

  }


  /* =======================================================
     EXISTING HTML COMPATIBILITY
     
     login.html already uses:

       onclick="login()"
  ======================================================= */

  window.login =
    login;


  /* =======================================================
     INITIAL PAGE SETUP
  ======================================================= */

  function initializeLoginPage() {

    try {

      checkDependencies();


      if (!showEnvironment()) {

        setStatus(
          "❌ ALBUKHR environment unavailable."
        );

        return;

      }


      /*
       * Do NOT read pi_user from LocalStorage.
       *
       * Authentication state belongs to
       * ALBUKHR Pi Auth Core.
       */

      setStatus(
        "Ready to login with Pi."
      );


      setLoginButtonState(
        false,
        "Login with Pi"
      );


      console.info(
        "✅ ALBUKHR Login Controller ready."
      );

    }
    catch (error) {

      console.error(
        "❌ Login initialization failed:",
        error
      );


      setLoginButtonState(
        true,
        "Login unavailable"
      );


      setStatus(
        "❌ Login system is unavailable."
      );

    }

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
      initializeLoginPage
    );

  }
  else {

    initializeLoginPage();

  }


})(window);
