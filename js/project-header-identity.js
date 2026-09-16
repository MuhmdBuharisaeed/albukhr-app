/* =========================================================
   ALBUKHR — PROJECT HEADER IDENTITY FIX v1
   File:
   js/project-header-identity.js

   Purpose:
   - Show the actual selected project name in project.html header.
   - Works for Core, Internal, and External registered projects.
   - Uses the authoritative public project registry.
   - Supports project, slug, project_code, and project_id URL values.
   - Falls back to project-config.js when registry data is unavailable.
   - Does NOT modify logos, staking, withdrawals, authentication,
     Supabase schema, RLS, or Dock Navigation.
   - Does NOT use LocalStorage.
========================================================= */
(function (window, document) {
  "use strict";

  if (window.AlbukhrProjectHeaderIdentity) return;

  const RPC = "get_public_project_registry";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function getRequestedIdentity() {
    const params = new URLSearchParams(window.location.search);

    return clean(
      params.get("project") ||
      params.get("slug") ||
      params.get("project_code") ||
      params.get("project_id")
    );
  }

  function getNetwork() {
    const env = window.ALBukhrEnvironment;

    if (env && typeof env.getNetwork === "function") {
      return normalize(env.getNetwork());
    }

    const core = window.ALBUKHR_SUPABASE;

    if (core && core.network) {
      return normalize(core.network);
    }

    return "";
  }

  function setHeaderName(name) {
    const title = clean(name);

    if (!title) return false;

    const node = document.getElementById("projectTitle");

    if (!node) return false;

    /*
     * textContent is intentional:
     * - no HTML injection
     * - the registry name is rendered as plain text
     * - preserves the existing header/CSS contract
     */
    node.textContent = title;

    document.title = `${title} • ALBUKHR`;

    const txTitle = document.getElementById("txTitle");
    if (txTitle) {
      txTitle.textContent = `${title} Transactions`;
    }

    const infoTitle = document.getElementById("infoTitle");
    if (infoTitle) {
      infoTitle.textContent = `About ${title}`;
    }

    const stakeTitle = document.getElementById("stakeTitle");
    if (stakeTitle) {
      stakeTitle.textContent = `Stake in ${title}`;
    }

    return true;
  }

  function findInConfig(identity) {
    const wanted = normalize(identity);

    if (!wanted) return null;

    const catalog = window.PROJECT_CONFIG;

    if (!catalog || typeof catalog !== "object") {
      return null;
    }

    for (const [key, cfg] of Object.entries(catalog)) {
      if (!cfg || typeof cfg !== "object") continue;

      const candidates = [
        key,
        cfg.project_id,
        cfg.project_code,
        cfg.slug,
        cfg.title,
        cfg.name
      ];

      if (candidates.some(value => normalize(value) === wanted)) {
        return cfg;
      }
    }

    return null;
  }

  function findInRegistry(rows, identity) {
    const wanted = normalize(identity);

    if (!wanted || !Array.isArray(rows)) {
      return null;
    }

    return rows.find(row => {
      if (!row || typeof row !== "object") return false;

      const candidates = [
        row.id,
        row.project_id,
        row.project_code,
        row.slug,
        row.name,
        row.title
      ];

      return candidates.some(value => normalize(value) === wanted);
    }) || null;
  }

  async function loadRegistry() {
    const core = window.ALBUKHR_SUPABASE;

    if (!core || typeof core.rpc !== "function") {
      return [];
    }

    const network = getNetwork();

    if (network !== "mainnet" && network !== "testnet") {
      return [];
    }

    try {
      const result = await core.rpc(RPC, {
        p_network: network
      });

      if (result && result.error) {
        throw result.error;
      }

      return Array.isArray(result?.data) ? result.data : [];
    } catch (error) {
      console.warn(
        "ALBUKHR Project Header: registry lookup failed.",
        error
      );
      return [];
    }
  }

  async function resolveAndApply() {
    const identity = getRequestedIdentity();

    if (!identity) {
      return false;
    }

    /*
     * First use the already-loaded project config so the header
     * can become visible immediately for known projects.
     */
    const localConfig = findInConfig(identity);

    if (localConfig) {
      setHeaderName(
        localConfig.name ||
        localConfig.title
      );
    }

    /*
     * Then load the authoritative network-specific registry.
     * Registry name wins over local catalog title.
     *
     * This is what guarantees that a selected project such as
     * RAHEEM-25 resolves to the registry name:
     * RAHEEM PHARMACY.
     */
    const registryRows = await loadRegistry();
    const registryProject = findInRegistry(
      registryRows,
      identity
    );

    if (registryProject) {
      return setHeaderName(
        registryProject.name ||
        registryProject.title
      );
    }

    /*
     * If the registry is temporarily unavailable, retain the
     * local project-config title already applied above.
     */
    return !!localConfig;
  }

  async function boot() {
    /*
     * Wait briefly for the shared Supabase Core and
     * project-config.js to become available.
     */
    for (let attempt = 0; attempt < 30; attempt++) {
      if (
        window.ALBUKHR_SUPABASE &&
        window.PROJECT_CONFIG
      ) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await resolveAndApply();
  }

  window.AlbukhrProjectHeaderIdentity = Object.freeze({
    resolveAndApply
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot,
      { once: true }
    );
  } else {
    boot();
  }

})(window, document);
