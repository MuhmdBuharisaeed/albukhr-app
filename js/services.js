/* =========================================================
   ALBUKHR SERVICES PAGE CONTROLLER
   File: js/services.js

   Security and architecture:
   - Uses shared ALBUKHR Environment Core
   - Uses shared ALBUKHR Supabase Core
   - Uses shared AlbukhrPiAuth
   - No LocalStorage authentication
   - No LocalStorage authorization
   - No new Supabase client creation
   - Internal Project Creation remains restricted
   - ALB Token service remains closed
========================================================= */

(function (window, document) {
  "use strict";

  const LOGIN_PAGE = "login.html";
  const EXTERNAL_PROJECT_PAGE = "external-project-dashboard.html";
  const DAPP_SERVICE_PAGE = "pi-dapp-service-v2.html";
  const SIDRA_SERVICE_PAGE = "sidra-start-service.html";

  let initializationStarted = false;

  /* =======================================================
     SHARED CORE DEPENDENCIES
  ======================================================= */

  function checkDependencies() {
    const environment = window.ALBukhrEnvironment;
    const supabaseCore = window.ALBUKHR_SUPABASE;
    const auth = window.AlbukhrPiAuth;

    if (!environment) {
      throw new Error(
        "ALBUKHR Environment Core is unavailable."
      );
    }

    if (typeof environment.isKnown !== "function") {
      throw new Error(
        "ALBUKHR Environment Core does not expose isKnown()."
      );
    }

    if (typeof environment.getNetwork !== "function") {
      throw new Error(
        "ALBUKHR Environment Core does not expose getNetwork()."
      );
    }

    if (!supabaseCore) {
      throw new Error(
        "ALBUKHR Supabase Core is unavailable."
      );
    }

    if (!auth) {
      throw new Error(
        "ALBUKHR Pi Auth Core is unavailable."
      );
    }

    if (typeof auth.requireAuth !== "function") {
      throw new Error(
        "ALBUKHR Pi Auth Core does not expose requireAuth()."
      );
    }

    return {
      environment: environment,
      supabaseCore: supabaseCore,
      auth: auth
    };
  }

  /* =======================================================
     ENVIRONMENT VALIDATION
  ======================================================= */

  function validateEnvironment(dependencies) {
    const environment = dependencies.environment;
    const supabaseCore = dependencies.supabaseCore;

    if (!environment.isKnown()) {
      throw new Error(
        "ALBUKHR environment is unavailable."
      );
    }

    const network = String(
      environment.getNetwork() || ""
    ).toLowerCase();

    if (network !== "mainnet" && network !== "testnet") {
      throw new Error(
        "ALBUKHR returned an invalid network."
      );
    }

    /*
     * Validate network consistency when Supabase Core exposes
     * a documented isNetwork(network) method.
     *
     * Do not invent a Supabase client or bypass the shared core.
     */
    if (typeof supabaseCore.isNetwork === "function") {
      if (!supabaseCore.isNetwork(network)) {
        throw new Error(
          "ALBUKHR environment and Supabase network do not match."
        );
      }
    }

    return network;
  }

  /* =======================================================
     PI AUTH PROTECTION
  ======================================================= */

  async function protectServicesPage() {
    const dependencies = checkDependencies();

    const network = validateEnvironment(dependencies);

    /*
     * Shared authentication only.
     * The auth core remains responsible for determining
     * whether the user is authenticated.
     */
    const user = await dependencies.auth.requireAuth(
      LOGIN_PAGE
    );

    if (!user) {
      return null;
    }

    /*
     * Optional verification through the existing Auth Core.
     * Do not assume an undocumented method exists.
     */
    if (
      typeof dependencies.auth.isAuthenticated === "function" &&
      !dependencies.auth.isAuthenticated()
    ) {
      throw new Error(
        "ALBUKHR Pi authentication is not active."
      );
    }

    console.info(
      "ALBUKHR Services access granted.",
      {
        network: network,
        username: user.username || null
      }
    );

    return user;
  }

  /* =======================================================
     SERVICE NAVIGATION
  ======================================================= */

  function navigateToService(destination) {
    if (typeof destination !== "string" || !destination.trim()) {
      console.error(
        "ALBUKHR service destination is invalid."
      );
      return;
    }

    window.location.assign(destination);
  }

  function goCreateExternal() {
    navigateToService(EXTERNAL_PROJECT_PAGE);
  }

  function goDappService() {
    navigateToService(DAPP_SERVICE_PAGE);
  }

  function goSidraService() {
    navigateToService(SIDRA_SERVICE_PAGE);
  }

  /* =======================================================
     INTERNAL PROJECT ACCESS
  ======================================================= */

  function openInternalProject() {
    /*
     * This service remains restricted.
     *
     * No client-side user value, CSS class, local storage
     * entry, or page attribute grants internal permissions.
     *
     * Actual access must be enforced by the destination
     * and server-side/database authorization.
     */
    window.alert(
      "Restricted Access\n\n" +
      "Internal Project Creation is reserved for authorized " +
      "ALBUKHR core personnel.\n\n" +
      "Access has not been granted by this page."
    );
  }

  /* =======================================================
     KEYBOARD ACCESSIBILITY
  ======================================================= */

  function activateOnKeyboard(element, callback) {
    if (!element || typeof callback !== "function") {
      return;
    }

    if (element.dataset.keyboardSupportReady === "true") {
      return;
    }

    element.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      callback();
    });

    element.dataset.keyboardSupportReady = "true";
  }

  function initializeKeyboardSupport() {
    const externalCard = document.getElementById(
      "externalProjectCard"
    );

    const dappCard = document.querySelector(
      '.service-card[onclick="goDappService()"]'
    );

    const internalCard = document.getElementById(
      "internalProjectCard"
    );

    activateOnKeyboard(
      externalCard,
      goCreateExternal
    );

    activateOnKeyboard(
      dappCard,
      goDappService
    );

    activateOnKeyboard(
      internalCard,
      openInternalProject
    );
  }

  /* =======================================================
     DOCK NAVIGATION
  ======================================================= */

  function initializeDockScrollBehavior() {
    const dock = document.querySelector(".dock-nav");

    if (!dock) {
      return;
    }

    /*
     * Preserve the existing hide-on-scroll-down behaviour.
     * Avoid changing the first scroll event unexpectedly.
     */
    let lastScroll =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      0;

    const threshold = 10;

    window.addEventListener(
      "scroll",
      function () {
        const current =
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          0;

        if (
          Math.abs(current - lastScroll) <= threshold
        ) {
          return;
        }

        if (current > lastScroll && current > 80) {
          dock.classList.add("hide");
        } else {
          dock.classList.remove("hide");
        }

        lastScroll = Math.max(current, 0);
      },
      { passive: true }
    );
  }

  function initializeActiveDockItem() {
    const current =
      window.location.pathname.split("/").pop() ||
      "index.html";

    document.querySelectorAll(".dock-item").forEach(
      function (link) {
        const destination = link.getAttribute("href");

        if (destination === current) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        } else {
          link.classList.remove("active");
          link.removeAttribute("aria-current");
        }
      }
    );
  }

  /* =======================================================
     NOTIFICATION BUTTON
  ======================================================= */

  function initializeNotificationButton() {
    const button = document.getElementById(
      "notificationsButton"
    );

    if (!button) {
      return;
    }

    /*
     * The HTML currently calls openNotifications()
     * through its onclick attribute.
     *
     * Keep the global function contract intact and do not
     * attach a second click handler here.
     */
    button.setAttribute(
      "aria-label",
      "Open notifications"
    );
  }

  /* =======================================================
     ALB TOKEN SERVICE STATE
  ======================================================= */

  function initializeAlbTokenService() {
    const tokenCard = document.getElementById(
      "albTokenService"
    );

    if (!tokenCard) {
      return;
    }

    /*
     * The ALB Token card is a display-only placeholder.
     *
     * Do not add navigation, mining, conversion, wallet,
     * payment or token issuance actions here.
     */
    tokenCard.setAttribute("aria-disabled", "true");
    tokenCard.classList.add("locked");
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  async function initializeServicesPage() {
    if (initializationStarted) {
      return;
    }

    initializationStarted = true;

    try {
      const user = await protectServicesPage();

      if (!user) {
        return;
      }

      initializeDockScrollBehavior();
      initializeActiveDockItem();
      initializeKeyboardSupport();
      initializeNotificationButton();
      initializeAlbTokenService();

      document.documentElement.setAttribute(
        "data-albukhr-services-ready",
        "true"
      );

      console.info(
        "ALBUKHR Services Controller ready."
      );

    } catch (error) {
      console.error(
        "Services initialization failed:",
        error
      );

      document.documentElement.removeAttribute(
        "data-albukhr-services-ready"
      );

      const currentPage =
        window.location.pathname.split("/").pop();

      if (currentPage !== LOGIN_PAGE) {
        window.location.replace(LOGIN_PAGE);
      }
    }
  }

  /* =======================================================
     PUBLIC FUNCTIONS
     Preserve functions used by services.html.
  ======================================================= */

  window.goCreateExternal = goCreateExternal;
  window.goDappService = goDappService;
  window.goSidraService = goSidraService;
  window.openInternalProject = openInternalProject;

  /*
   * Do not overwrite an existing notification handler
   * supplied by notifications.js.
   *
   * If no handler is available, provide a safe fallback
   * instead of causing a ReferenceError from the HTML.
   */
  if (typeof window.openNotifications !== "function") {
    window.openNotifications = function () {
      console.info(
        "ALBUKHR notifications handler is not available."
      );
    };
  }

  /* =======================================================
     START PAGE
  ======================================================= */

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
