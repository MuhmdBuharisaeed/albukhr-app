/* ALBUKHR External Project Team Editor Visibility Compatibility Patch
 * Purpose:
 * - Keep the Team editor available for editable applications even when the
 *   supplementary team read fails.
 * - Does not modify Page Auth Guard or the existing team save contract.
 * - The active external-project-detail.js remains the source of truth.
 */
(function (window, document) {
  "use strict";

  function editable(status) {
    const value = String(status || "draft").trim().toLowerCase().replace(/\s+/g, "_");
    return value === "draft" || value === "needs_revision";
  }

  function ensureVisible(detail) {
    const application = detail?.application || {};
    if (!editable(application.status)) return;

    const editor = document.getElementById("teamEditor");
    if (!editor) return;

    editor.hidden = false;

    const list = document.getElementById("teamEditorList");
    const add = document.getElementById("addTeamMemberButton");

    if (list && !list.children.length && add) {
      // The active detail engine owns row creation and its click handler.
      add.click();
    }

    const status = document.getElementById("teamEditorStatus");
    if (status && detail?.teamLoadFailed) {
      status.textContent =
        "Existing team members could not be loaded. You can still add and save the project team.";
    }
  }

  window.addEventListener("albukhr:external-project-detail-ready", (event) => {
    ensureVisible(event.detail || {});
  });

  if (document.readyState !== "loading") {
    setTimeout(() => {
      const state = window.ALBukhrExternalProjectDetail?.getState?.();
      if (state?.application) ensureVisible(state);
    }, 0);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(() => {
        const state = window.ALBukhrExternalProjectDetail?.getState?.();
        if (state?.application) ensureVisible(state);
      }, 0);
    }, { once: true });
  }
})(window, document);
