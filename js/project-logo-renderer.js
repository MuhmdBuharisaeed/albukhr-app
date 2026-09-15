/* =========================================================
   ALBUKHR — PROJECT LOGO + NAVIGATION BRIDGE
   File: js/project-logo-renderer.js

   - Preserves existing logo rendering and card UX.
   - Adds defensive project-card navigation.
   - Resolves project_code/slug/project_id/title from PROJECT_CONFIG.
   - Does not change CSS, Dock Navigation, auth, staking,
     withdrawal, Supabase, or environment switching.
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

  function findConfig(value) {
    if (window.ALBukhrProjectConfig && typeof window.ALBukhrProjectConfig.find === "function") {
      const found = window.ALBukhrProjectConfig.find(value);
      if (found) return found;
    }

    const catalog = window.PROJECT_CONFIG;
    if (!catalog || typeof catalog !== "object") return null;

    const wanted = clean(value).toLowerCase();
    if (!wanted) return null;

    for (const key of Object.keys(catalog)) {
      const cfg = catalog[key] || {};
      const candidates = [key, cfg.project_code, cfg.slug, cfg.project_id, cfg.id, cfg.title];
      if (candidates.some(v => clean(v).toLowerCase() === wanted)) {
        return cfg;
      }
    }
    return null;
  }

  function stableKey(value) {
    const cfg = findConfig(value);
    if (!cfg) return clean(value);
    return clean(cfg.project_code) || clean(cfg.slug) || clean(cfg.project_id) || clean(value);
  }

  function projectUrl(value) {
    const key = stableKey(value);
    return key ? "project.html?project=" + encodeURIComponent(key) : null;
  }

  function renderLogo(container, config, altText) {
    if (!container) return;
    const logoUrl = clean(config && config.logo_url);

    if (!logoUrl) {
      if (container.innerHTML !== "") container.innerHTML = "";
      return;
    }

    const existing = container.querySelector("img.project-logo");
    if (existing && existing.getAttribute("src") === logoUrl) return;

    container.innerHTML =
      '<img class="project-logo" src="' + escapeHtml(logoUrl) +
      '" alt="' + escapeHtml(altText || config.title || "ALBUKHR Project") +
      '" loading="lazy" decoding="async">';
    container.setAttribute("data-logo-source", "registry");
  }

  function processCard(card, iconSelector, titleSelector) {
    if (!card) return;
    const icon = card.querySelector(iconSelector);
    const titleNode = card.querySelector(titleSelector);
    if (!icon || !titleNode) return;

    const title = clean(titleNode.textContent);
    if (!title) return;

    const config = findConfig(title);
    if (!config) return;

    renderLogo(icon, config, title);

    const key = stableKey(title);
    const url = projectUrl(title);
    if (key) card.setAttribute("data-project-key", key);
    if (clean(config.project_code)) card.setAttribute("data-project-code", clean(config.project_code));
    if (clean(config.slug)) card.setAttribute("data-project-slug", clean(config.slug));
    if (clean(config.project_id)) card.setAttribute("data-project-id", clean(config.project_id));
    if (url) card.setAttribute("data-project-url", url);
  }

  function processAll() {
    document.querySelectorAll(".popular-card").forEach(card => processCard(card, ".popular-icon", ".popular-name"));
    document.querySelectorAll(".asset-item").forEach(card => processCard(card, ".asset-icon", ".asset-name"));
  }

  function handleCardClick(event) {
    const card = event.target.closest(".popular-card, .asset-item");
    if (!card) return;
    if (event.target.closest("a, button, input, textarea, select")) return;

    const key = card.getAttribute("data-project-key") ||
      card.getAttribute("data-project-code") ||
      card.getAttribute("data-project-slug") ||
      card.getAttribute("data-project-id") ||
      clean(card.querySelector(".popular-name, .asset-name")?.textContent);

    const url = projectUrl(key);
    if (!url) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(url);
  }

  function init() {
    processAll();

    const popular = document.getElementById("popularProjects");
    const assets = document.getElementById("assetsContainer");

    if (typeof MutationObserver === "function") {
      const observer = new MutationObserver(processAll);
      [popular, assets].forEach(target => {
        if (target) observer.observe(target, { childList: true, subtree: true });
      });
    }

    window.addEventListener("click", handleCardClick, true);
    window.addEventListener("albukhr:project-registry-ready", processAll);
    window.addEventListener("albukhr:project-logo-refresh", processAll);
    window.setTimeout(processAll, 0);
    window.setTimeout(processAll, 250);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.ALBukhrProjectLogoRenderer = Object.freeze({ refresh: processAll });
  window.AlbukhrProjectNavigation = Object.freeze({
    resolveKey: stableKey,
    buildProjectUrl: projectUrl,
    navigate: function (value) {
      const url = projectUrl(value);
      if (url) window.location.assign(url);
    }
  });
})(window, document);
