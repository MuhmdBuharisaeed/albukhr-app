/* ALBUKHR Marketplace staking acceptance redirect.
 * Marketplace cards cannot capture the exact immutable offer acceptance.
 * Route the investor to project.html where the published contract is shown.
 */
(function (window) {
  "use strict";
  if (window.__ALBUKHR_MARKETPLACE_ACCEPTANCE_REDIRECT__) return;
  window.__ALBUKHR_MARKETPLACE_ACCEPTANCE_REDIRECT__ = true;

  window.openInvestModal = async function (projectCode) {
    try {
      if (!window.AlbukhrMarketplace || typeof window.AlbukhrMarketplace.getProject !== "function") {
        throw new Error("Marketplace project data is unavailable.");
      }
      const project = await window.AlbukhrMarketplace.getProject(projectCode);
      if (!project || !project.project_code) throw new Error("The selected project could not be resolved.");
      if (String(project.network || "").toLowerCase() !== "mainnet") {
        throw new Error("This investment acceptance flow is Mainnet only.");
      }
      if (String(project.status || "").toLowerCase() !== "active") {
        throw new Error("This project is not ACTIVE for investment.");
      }
      const target = new URL("project.html", window.location.href);
      target.searchParams.set("project", project.project_code);
      window.location.assign(target.href);
    } catch (error) {
      const message = error?.message || "Unable to open the project's staking offer page.";
      if (typeof window.showAlert === "function") window.showAlert("Review staking offer", message);
      else window.alert(message);
    }
  };
})(window);
