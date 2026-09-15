/* =========================================================
   ALBUKHR — PROJECT NAVIGATION BRIDGE
   File: js/project-navigation.js

   Purpose:
   - Preserve project identity from Home cards to project.html.
   - Resolves project by slug, project_code, project_id or catalog key.
   - Does not change card HTML, CSS, Dock Navigation, or UX.
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
        cfg.title
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

    /*
     * Prefer the stable public project_code when available.
     * slug remains the next stable identifier.
     * Both are already supported by project.js.
     */
    return clean(cfg.project_code) ||
           clean(cfg.slug) ||
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

  /*
   * Public bridge for existing renderers.
   */
  window.AlbukhrProjectNavigation = Object.freeze({
    resolveKey,
    buildProjectUrl,
    navigate
  });

  /*
   * Defensive click bridge:
   * existing cards remain visually and structurally unchanged.
   * It only intervenes when a project card is clicked.
   */
  document.addEventListener("click", function (event) {
    const card = event.target.closest(
      ".popular-card, .asset-item"
    );

    if (!card) return;

    /*
     * Do not interfere with a real anchor/button inside a card.
     */
    if (
      event.target.closest("a, button, input, textarea, select")
    ) {
      return;
    }

    let key =
      card.getAttribute("data-project-key") ||
      card.getAttribute("data-project-code") ||
      card.getAttribute("data-project-id") ||
      card.getAttribute("data-project-slug");

    /*
     * Existing index.html does not currently expose a
     * data-project-* attribute, so resolve from the visible title.
     */
    if (!key) {
      const titleNode = card.querySelector(
        ".popular-name, .asset-name"
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
