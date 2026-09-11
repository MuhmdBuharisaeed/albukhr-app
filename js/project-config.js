/* =========================================================
   ALBUKHR PROJECT CONFIG COMPATIBILITY LAYER
   Source of truth: server-authoritative public project registry.
   This file is NOT a static project registry.

   Destination: /js/project-config.js
========================================================= */
(function (window) {
  "use strict";

  const CONFIG = {};
  window.PROJECT_CONFIG = CONFIG;

  function env() {
    const e = window.ALBukhrEnvironment;
    if (!e || typeof e.getNetwork !== "function" || !e.isKnown()) {
      throw new Error("ALBUKHR environment is unavailable.");
    }
    const network = String(e.getNetwork() || "").toLowerCase();
    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }
    return network;
  }

  function client() {
    const core = window.ALBUKHR_SUPABASE;
    const db = core?.client || core;
    if (!db || typeof db.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return db;
  }

  function normalizeProject(p) {
    if (!p || !p.id || !p.project_code || !p.slug || !p.name) return null;
    return {
      id: String(p.id),
      code: String(p.project_code),
      slug: String(p.slug),
      title: String(p.name),
      description: p.description ? String(p.description) : "",
      type: p.project_type ? String(p.project_type) : "project",
      status: p.status ? String(p.status).toLowerCase() : "",
      core_slot: p.core_slot == null ? null : Number(p.core_slot),
      network: String(p.network || "").toLowerCase(),
      logo_url: p.logo_url ? String(p.logo_url) : "",
      liquidity: Number(p.liquidity || 0),
      investors: Number(p.investors || 0)
    };
  }

  async function load() {
    const network = env();
    const { data, error } = await client().rpc("get_public_project_registry", {
      p_network: network
    });
    if (error) throw error;

    const list = Array.isArray(data) ? data : [];
    Object.keys(CONFIG).forEach(k => delete CONFIG[k]);

    list.map(normalizeProject).filter(Boolean).forEach(project => {
      if (project.network !== network) return;
      CONFIG[project.code] = project;
    });

    return Object.values(CONFIG);
  }

  function render(list) {
    const popular = document.getElementById("popularProjects");
    const assets = document.getElementById("assetsContainer");
    if (!popular || !assets) return;

    popular.innerHTML = "";
    assets.innerHTML = "";

    list.slice(0, 10).forEach((p, index) => {
      const card = document.createElement("div");
      card.className = "popular-card";
      card.dataset.rank = `#${index + 1}`;
      card.innerHTML = `
        <div class="popular-icon"><img src="${escapeHtml(p.logo_url)}" alt="" loading="lazy"></div>
        <div class="popular-name">${escapeHtml(p.title)}</div>
        <div class="popular-amount">${escapeHtml(p.status.toUpperCase())}</div>`;
      card.addEventListener("click", () => {
        location.href = "project.html?project=" + encodeURIComponent(p.code);
      });
      popular.appendChild(card);

      const item = document.createElement("div");
      item.className = "asset-item";
      item.innerHTML = `
        <div class="asset-icon"><img src="${escapeHtml(p.logo_url)}" alt="" loading="lazy"></div>
        <div class="asset-left">
          <div class="asset-header">
            <div class="asset-info">
              <div class="asset-name">${escapeHtml(p.title)}</div>
              <div class="asset-stake">${escapeHtml(p.code)} · ${escapeHtml(p.status.toUpperCase())}</div>
            </div>
            <div class="asset-mini-chart" aria-hidden="true"></div>
          </div>
          <div class="asset-status">${escapeHtml(p.type.toUpperCase())} · ${escapeHtml(p.network.toUpperCase())}</div>
        </div>`;
      item.addEventListener("click", () => {
        location.href = "project.html?project=" + encodeURIComponent(p.code);
      });
      assets.appendChild(item);
    });
  }

  function escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;")
      .replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  window.AlbukhrProjectRegistry = Object.freeze({
    load,
    getAll: () => Object.values(CONFIG),
    getByCode: code => CONFIG[String(code || "").trim()] || null
  });

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const list = await load();
      render(list);
      console.info("ALBUKHR project registry loaded", {
        network: env(),
        projects: list.length
      });
    } catch (error) {
      console.error("ALBUKHR project registry unavailable:", error);
    }
  });
})(window);
