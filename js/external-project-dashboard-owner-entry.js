/* ALBUKHR External Project Dashboard — Converted-owner entry link.
 * Adds an Owner Dashboard link only to applications already converted to a
 * canonical External Project. It does not grant access; the destination page
 * independently verifies Pi authentication, network, ownership and publisher grant.
 */
(function (window, document) {
  "use strict";

  if (window.__ALBUKHR_EXTERNAL_OWNER_ENTRY__) return;
  window.__ALBUKHR_EXTERNAL_OWNER_ENTRY__ = true;

  function isVerifiedMainnet() {
    const environment = window.ALBukhrEnvironment;
    return Boolean(
      environment &&
      typeof environment.isKnown === "function" &&
      environment.isKnown() &&
      typeof environment.getNetwork === "function" &&
      String(environment.getNetwork() || "").trim().toLowerCase() === "mainnet"
    );
  }

  function decorate() {
    // Keep Testnet unchanged. The owner dashboard is Mainnet-only.
    if (!isVerifiedMainnet()) return;

    document.querySelectorAll(".application-card").forEach((card) => {
      const status = card.querySelector(".application-status");
      const actions = card.querySelector(".application-actions");
      const sourceButton = card.querySelector("[data-application-id]");
      if (!status || !actions || !sourceButton) return;
      if (!status.classList.contains("status-converted")) return;
      if (actions.querySelector("[data-external-owner-dashboard]") ||
          actions.querySelector("[data-owner-dashboard-link]")) return;

      const applicationId = String(sourceButton.dataset.applicationId || "").trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) return;

      const button = document.createElement("button");
      button.type = "button";
      button.className = "application-action primary";
      button.dataset.externalOwnerDashboard = "true";
      button.textContent = "Owner Dashboard";
      button.addEventListener("click", () => {
        const query = new URLSearchParams({ application_id: applicationId });
        window.location.assign("external-project-owner-dashboard.html?" + query.toString());
      });
      actions.appendChild(button);
    });
  }

  function init() {
    decorate();
    const list = document.getElementById("applicationsList");
    if (!list || typeof MutationObserver !== "function") return;
    const observer = new MutationObserver(decorate);
    observer.observe(list, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
