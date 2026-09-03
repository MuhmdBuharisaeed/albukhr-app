/* =========================================================
   ALBUKHR PAGE AUTH GUARD
   File:
   js/core/page-auth-guard.js

   Purpose:
   - Protect authenticated ALBUKHR pages
   - Use AlbukhrPiAuth as the authentication authority
   - Redirect unauthenticated users to login.html
   - No LocalStorage dependency
   - No direct Supabase client creation
   - No UI authentication logic

   Depends on:
   1. js/core/environment-core.js
   2. js/core/pi-auth-core.js
========================================================= */

(function (window) {

  "use strict";


  /* =======================================================
     PROTECT PAGE
  ======================================================= */

  async function protectPage() {

    /* -----------------------------------------------
       PI AUTH CORE CHECK
    ------------------------------------------------ */

    if (!window.AlbukhrPiAuth) {

      console.error(
        "❌ ALBUKHR Pi Auth Core is missing."
      );

      window.location.replace(
        "login.html"
      );

      return;

    }


    try {

      /* -----------------------------------------------
         REQUIRE AUTHENTICATION

         pi-auth-core.js expects:
         requireAuth("login.html")
      ------------------------------------------------ */

      const user =
        await window.AlbukhrPiAuth.requireAuth(
          "login.html"
        );


      /* -----------------------------------------------
         AUTHENTICATION FAILED
      ------------------------------------------------ */

      if (!user) {

        return;

      }


      /* -----------------------------------------------
         PAGE AUTH STATE
      ------------------------------------------------ */

      document.documentElement.dataset.albukhrAuth =
        "authenticated";


      /* -----------------------------------------------
         AUTHENTICATED EVENT
      ------------------------------------------------ */

      window.dispatchEvent(

        new CustomEvent(
          "albukhr:authenticated",
          {

            detail: {

              user,

              network:
                window.AlbukhrPiAuth.getNetwork(),

              environment:
                window.AlbukhrPiAuth.getEnvironmentInfo()

            }

          }
        )

      );


      console.info(
        "✅ ALBUKHR page authentication confirmed.",
        {

          uid:
            user.uid,

          username:
            user.username,

          network:
            window.AlbukhrPiAuth.getNetwork()

        }
      );

    }
    catch (error) {

      console.error(
        "❌ ALBUKHR page authentication guard failed:",
        error
      );


      window.location.replace(
        "login.html"
      );

    }

  }


  /* =======================================================
     DOM READY
  ======================================================= */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      protectPage,
      {
        once: true
      }
    );

  }
  else {

    protectPage();

  }


  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.AlbukhrPageAuthGuard =
    Object.freeze({

      protectPage

    });


})(window);
