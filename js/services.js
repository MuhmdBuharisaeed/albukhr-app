/* =========================================================
   ALBUKHR SERVICES PAGE CONTROLLER
   File: js/services.js

   - Protects services.html with shared Pi Auth
   - No LocalStorage authentication
   - No LocalStorage authorization
   - No Supabase client creation
   - Keeps Dock Navigation UI unchanged
========================================================= */

(function (window, document) {
  "use strict";

  function checkDependencies() {
    if (!window.ALBukhrEnvironment) {
      throw new Error("ALBUKHR Environment Core is unavailable.");
    }
    if (!window.ALBUKHR_SUPABASE) {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    if (!window.AlbukhrPiAuth) {
      throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    }
  }

  async function protectServicesPage() {
    checkDependencies();

    const environment = window.ALBukhrEnvironment;

    if (!environment.isKnown()) {
      throw new Error("ALBUKHR environment is unavailable.");
    }

    const user = await window.AlbukhrPiAuth.requireAuth("login.html");

    if (!user) return null;

    console.info("ALBUKHR Services access granted.", {
      username: user.username,
      network: environment.getNetwork()
    });

    return user;
  }

  function goCreateExternal() {
    window.location.assign("external-create.html");
  }

  function goDappService() {
    window.location.assign("pi-dapp-service.html");
  }

  function goSidraService() {
    window.location.assign("sidra-start-service.html");
  }

  /*
   * Previous LocalStorage access control has been removed.
   * This remains restricted until server-side role binding
   * and database authorization are connected.
   */
  function openInternalProject() {
    alert(
      "⛔ Restricted Access\n\n" +
      "Internal Project Creation is reserved for authorized ALBUKHR core personnel."
    );
  }

  function initializeDockScrollBehavior() {
    const dock = document.querySelector(".dock-nav");
    if (!dock) return;

    let lastScroll = 0;
    const threshold = 10;

    window.addEventListener("scroll", function () {
      const current =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        0;

      if (Math.abs(current - lastScroll) <= threshold) return;

      if (current > lastScroll) {
        dock.classList.add("hide");
      } else {
        dock.classList.remove("hide");
      }

      lastScroll = Math.max(current, 0);
    }, { passive: true });
  }

  function initializeActiveDockItem() {
    const current =
      window.location.pathname.split("/").pop() || "index.html";

    document.querySelectorAll(".dock-item").forEach(function (link) {
      if (link.getAttribute("href") === current) {
        link.classList.add("active");
      }
    });
  }

  function initializeKeyboardSupport() {
    const externalCard = document.getElementById("externalProjectCard");
    if (!externalCard) return;

    externalCard.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        goCreateExternal();
      }
    });
  }

  async function initializeServicesPage() {
    try {
      const user = await protectServicesPage();
      if (!user) return;

      initializeDockScrollBehavior();
      initializeActiveDockItem();
      initializeKeyboardSupport();

      console.info("ALBUKHR Services Controller ready.");
    } catch (error) {
      console.error("Services initialization failed:", error);

      if (window.location.pathname.split("/").pop() !== "login.html") {
        window.location.replace("login.html");
      }
    }
  }

  window.goCreateExternal = goCreateExternal;
  window.goDappService = goDappService;
  window.goSidraService = goSidraService;
  window.openInternalProject = openInternalProject;

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeServicesPage,
      { once: true }
    );
  } else {
    initializeServicesPage();
  }

})(window, document);
