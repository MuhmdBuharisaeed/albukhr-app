/* =========================================================
   ALBUKHR — PROJECT PAGE IDENTITY BOOTSTRAP v4
   File:
   js/project-page-identity.js

   Purpose:
   - Recover a missing project identifier on project.html.
   - Uses the authoritative Mainnet/Testnet public registry RPC.
   - Only auto-resolves when exactly ONE public project exists.
   - Does NOT guess when multiple projects exist.
   - Preserves existing project.html UI/UX.
   - Does not touch staking, withdrawals, authentication, or CSS.
========================================================= */
(function (window, document) {
  "use strict";

  if (window.AlbukhrProjectIdentity) return;

  const RPC = "get_public_project_registry";
  let redirected = false;

  function clean(value) {
    return String(value == null ? "" : value).trim();
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

  function normalizeRegistry(data) {
    /*
     * Supabase JS normally returns the JSON array directly.
     * This also tolerates a JSON string/object wrapper so the
     * page is resilient to response-shape differences.
     */
    if (Array.isArray(data)) return data;

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }

    if (data && typeof data === "object") {
      if (Array.isArray(data.projects)) return data.projects;
      if (Array.isArray(data.data)) return data.data;
    }

    return [];
  }

  function currentNetwork() {
    const env = window.ALBukhrEnvironment;

    if (env && typeof env.getNetwork === "function") {
      return clean(env.getNetwork()).toLowerCase();
    }

    const core = window.ALBUKHR_SUPABASE;

    if (core && core.network) {
      return clean(core.network).toLowerCase();
    }

    return "";
  }

  function buildProjectUrl(project) {
    const key =
      clean(project.project_code) ||
      clean(project.slug) ||
      clean(project.id);

    if (!key) return null;

    return (
      "project.html?project=" +
      encodeURIComponent(key)
    );
  }

  async function recoverMissingIdentity() {
    /*
     * If the URL already identifies a project, do nothing.
     */
    if (getRequestedIdentity()) {
      return true;
    }

    const core = window.ALBUKHR_SUPABASE;

    if (
      !core ||
      typeof core.rpc !== "function"
    ) {
      console.error(
        "ALBUKHR Project Identity: Supabase Core unavailable."
      );
      return false;
    }

    const network = currentNetwork();

    if (
      network !== "mainnet" &&
      network !== "testnet"
    ) {
      console.error(
        "ALBUKHR Project Identity: invalid network.",
        network
      );
      return false;
    }

    try {
      const result = await core.rpc(
        RPC,
        {
          p_network: network
        }
      );

      if (result && result.error) {
        throw result.error;
      }

      const projects =
        normalizeRegistry(
          result ? result.data : null
        );

      /*
       * Safe resolution rule:
       * - 1 public project = deterministic recovery.
       * - 0 projects = no project exists.
       * - >1 projects = never guess.
       */
      if (projects.length !== 1) {
        console.warn(
          "ALBUKHR Project Identity: cannot auto-resolve.",
          {
            network,
            publicProjectCount: projects.length
          }
        );
        return false;
      }

      const url =
        buildProjectUrl(projects[0]);

      if (!url) {
        console.error(
          "ALBUKHR Project Identity: registry project has no stable identifier."
        );
        return false;
      }

      redirected = true;

      /*
       * replace() prevents an empty project.html entry from
       * remaining in browser history.
       */
      window.location.replace(url);

      return true;
    } catch (error) {
      console.error(
        "ALBUKHR Project Identity: registry lookup failed.",
        error
      );
      return false;
    }
  }

  async function boot() {
    if (redirected) return;

    /*
     * Supabase Core is loaded before this file by project.html.
     * Still wait defensively for asynchronous script/runtime
     * initialization instead of failing immediately.
     */
    for (let attempt = 0; attempt < 30; attempt++) {
      if (window.ALBUKHR_SUPABASE) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await recoverMissingIdentity();
  }

  window.AlbukhrProjectIdentity = Object.freeze({
    recover: recoverMissingIdentity
  });

  boot();

})(window, document);
