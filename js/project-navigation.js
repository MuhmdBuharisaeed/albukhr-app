/* =========================================================
   ALBUKHR — PROJECT NAVIGATION BRIDGE
   File: js/project-navigation.js

   Purpose:
   - Preserve project identity from Marketplace cards to project.html.
   - Resolves project by stable project_code, slug, project_id or catalog key.
   - Supports .project-card without changing the Dock Navigation.
   - Does not interfere with buttons, links, or form controls.
   - Mainnet/Testnet remains controlled by existing environment core.
========================================================= */
(function (window, document) {
  "use strict";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function getConfig(key) {
    const catalog = window.PROJECT_CONFIG || {};
    const wanted = clean(key).toLowerCase();

    if (!wanted) return null;

    for (const [catalogKey, cfg] of Object.entries(catalog)) {
      if (!cfg) continue;

      const values = [
        catalogKey,
        cfg.slug,
        cfg.project_code,
        cfg.project_id,
        cfg.id,
        cfg.title,
        cfg.name
      ].map(clean).filter(Boolean);

      if (values.some(v => v.toLowerCase() === wanted)) {
        return {
          key: catalogKey,
          config: cfg
        };
      }
    }

    return null;
  }

  function resolveKey(key) {
    const resolved = getConfig(key);
    if (!resolved) return clean(key);

    const cfg = resolved.config;

    return clean(cfg.project_code) ||
           clean(cfg.slug) ||
           clean(cfg.project_id) ||
           clean(resolved.key);
  }

  function buildProjectUrl(key) {
    const resolvedKey = resolveKey(key);

    if (!resolvedKey) return null;

    return "project.html?project=" +
      encodeURIComponent(resolvedKey);
  }

  function navigate(key) {
    const url = buildProjectUrl(key);
    if (!url) return;

    window.location.assign(url);
  }

  window.AlbukhrProjectNavigation = Object.freeze({
    resolveKey,
    buildProjectUrl,
    navigate
  });

  document.addEventListener("click", function (event) {
    const card = event.target.closest(
      ".popular-card, .asset-item, .project-card"
    );

    if (!card) return;

    /*
     * Preserve existing actions such as Invest Now, View Project,
     * links, and form controls.
     */
    if (
      event.target.closest("a, button, input, textarea, select")
    ) {
      return;
    }

    /*
     * Prefer stable identifiers supplied by the renderer.
     * This is more reliable than resolving a visible project name.
     */
    let key =
      card.getAttribute("data-project-key") ||
      card.getAttribute("data-project-code") ||
      card.getAttribute("data-project-id") ||
      card.getAttribute("data-project-slug");

    /*
     * Backward-compatible fallback for older cards.
     */
    if (!key) {
      const titleNode = card.querySelector(
        ".popular-name, .asset-name, .project-title"
      );

      key = titleNode ? clean(titleNode.textContent) : "";
    }

    if (!key) return;

    const url = buildProjectUrl(key);
    if (!url) return;

    event.preventDefault();
    event.stopPropagation();

    window.location.assign(url);
  }, true);

})(window, document);
