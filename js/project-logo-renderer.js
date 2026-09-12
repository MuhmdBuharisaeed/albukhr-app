/* =========================================================
   ALBUKHR — PROJECT LOGO RENDERER BRIDGE
   File:
   js/project-logo-renderer.js

   Purpose:
   - Safely migrate existing index.html project visuals from
     legacy icon/emoji output to official logo_url output.
   - Does not change the existing card HTML structure.
   - Does not change CSS, layout, navigation, staking ranking,
     auth, or environment switching.
   - Works with both initial catalog rendering and later
     registry-driven project additions.
========================================================= */

(function (window, document) {

  "use strict";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/'/g, "&#39;");
  }

  function getConfigByTitle(title) {
    if (
      window.ALBukhrProjectConfig &&
      typeof window.ALBukhrProjectConfig.find === "function"
    ) {
      return window.ALBukhrProjectConfig.find(title);
    }

    if (typeof window.PROJECT_CONFIG === "undefined") {
      return null;
    }

    const wanted = clean(title).toLowerCase();

    return Object.values(window.PROJECT_CONFIG).find(function (cfg) {
      return clean(cfg && cfg.title).toLowerCase() === wanted;
    }) || null;
  }

  function renderLogo(container, config, altText) {
    if (!container) return;

    const logoUrl = clean(config && config.logo_url);

    /*
     * No official logo:
     * remove any legacy icon/emoji and leave the existing
     * visual container intact so CSS/layout remain unchanged.
     */
    if (!logoUrl) {
      if (container.innerHTML !== "") {
        container.innerHTML = "";
      }
      return;
    }

    const existing = container.querySelector("img.project-logo");

    if (
      existing &&
      existing.getAttribute("src") === logoUrl
    ) {
      return;
    }

    container.innerHTML =
      '<img class="project-logo" ' +
      'src="' + escapeHtml(logoUrl) + '" ' +
      'alt="' + escapeHtml(altText || config.title || "ALBUKHR Project") + '" ' +
      'loading="lazy" ' +
      'decoding="async">';

    container.setAttribute("data-logo-source", "registry");
  }

  function processCard(card, iconSelector, titleSelector) {
    if (!card) return;

    const icon = card.querySelector(iconSelector);
    const titleNode = card.querySelector(titleSelector);

    if (!icon || !titleNode) return;

    const title = clean(titleNode.textContent);
    if (!title) return;

    const config = getConfigByTitle(title);
    if (!config) return;

    renderLogo(
      icon,
      config,
      title
    );
  }

  function processAll() {
    document.querySelectorAll(".popular-card").forEach(function (card) {
      processCard(
        card,
        ".popular-icon",
        ".popular-name"
      );
    });

    document.querySelectorAll(".asset-item").forEach(function (card) {
      processCard(
        card,
        ".asset-icon",
        ".asset-name"
      );
    });
  }

  function init() {
    processAll();

    /*
     * Existing index.html renders asynchronously. Observe only
     * the two project containers, not the whole document.
     */
    const popular = document.getElementById("popularProjects");
    const assets = document.getElementById("assetsContainer");

    if (typeof MutationObserver === "function") {

      const observer = new MutationObserver(function () {
        processAll();
      });

      [popular, assets].forEach(function (target) {
        if (target) {
          observer.observe(target, {
            childList: true,
            subtree: true
          });
        }
      });
    }

    window.addEventListener(
      "albukhr:project-registry-ready",
      processAll
    );

    window.addEventListener(
      "albukhr:project-logo-refresh",
      processAll
    );

    /*
     * Registry may finish immediately before the event listener
     * is attached; one deferred pass covers that race.
     */
    window.setTimeout(processAll, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

  window.ALBukhrProjectLogoRenderer = Object.freeze({
    refresh: processAll
  });

})(window, document);
