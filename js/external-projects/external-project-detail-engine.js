/* =========================================================
   ALBUKHR EXTERNAL PROJECT DETAIL ENGINE
   File:
   js/external-projects/external-project-detail-engine.js

   Purpose:
   - Load one external project application securely
   - Read application_id from URL
   - Require authenticated Pi user
   - Use ALBUKHR Environment Core + Supabase Core
   - Keep MAINNET / TESTNET isolated
   - Load detail, team, documents, reviews and audit history
   - No LocalStorage
   - No direct Supabase client creation

   Required:
   1. Supabase JS SDK
   2. js/core/environment-core.js
   3. js/core/supabase-core.js
   4. js/core/pi-auth-core.js
   5. js/core/page-auth-guard.js (recommended before page UI)
========================================================= */

(function (window, document) {
  "use strict";

  const Engine = {};
  let currentApplicationId = null;
  let currentUser = null;
  let currentNetwork = null;
  let loadingPromise = null;

  function requireDependency(value, name) {
    if (!value) throw new Error(name + " is not available.");
    return value;
  }

  function getEnvironment() {
    const env = requireDependency(window.ALBukhrEnvironment, "ALBUKHR Environment Core");
    if (!env.isKnown()) throw new Error("ALBUKHR environment is not recognized.");
    return env;
  }

  function getSupabase() {
    const core = requireDependency(window.ALBUKHR_SUPABASE, "ALBUKHR Supabase Core");
    return core;
  }

  function getPiAuth() {
    return requireDependency(window.AlbukhrPiAuth, "ALBUKHR Pi Auth Core");
  }

  function readApplicationId() {
    const params = new URLSearchParams(window.location.search);
    const value = String(params.get("application_id") || "").trim();
    if (!value) throw new Error("Missing application_id.");
    return value;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async function ensureUser() {
    const auth = getPiAuth();
    const user = await auth.ensurePiAuth();
    if (!user || !user.uid) throw new Error("Pi user authentication failed.");
    return user;
  }

  async function callRpc(functionName, params) {
    const supabase = getSupabase();
    const result = await supabase.rpc(functionName, params || {});
    if (result.error) throw result.error;
    return result.data;
  }

  function rpcParams() {
    return {
      p_application_id: currentApplicationId,
      p_pi_uid: currentUser.uid,
      p_network: currentNetwork
    };
  }

  async function loadDetail() {
    return callRpc("get_my_external_project_detail", rpcParams());
  }

  async function loadTeam() {
    return callRpc("get_my_external_project_team", rpcParams());
  }

  async function loadDocuments() {
    return callRpc("get_my_external_project_documents", rpcParams());
  }

  async function loadReviews() {
    return callRpc("get_my_external_project_reviews", rpcParams());
  }

  async function loadAuditLog() {
    return callRpc("get_my_external_project_audit_log", rpcParams());
  }

  function normalizeSingle(data) {
    if (Array.isArray(data)) return data[0] || null;
    return data || null;
  }

  async function loadAll() {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async function () {
      const env = getEnvironment();
      currentNetwork = env.getNetwork();
      currentApplicationId = readApplicationId();

      if (!isUuid(currentApplicationId)) {
        throw new Error("Invalid application_id.");
      }

      currentUser = await ensureUser();

      const [detailRaw, teamRaw, documentsRaw, reviewsRaw, auditRaw] =
        await Promise.all([
          loadDetail(),
          loadTeam(),
          loadDocuments(),
          loadReviews(),
          loadAuditLog()
        ]);

      const detail = normalizeSingle(detailRaw);

      if (!detail) {
        throw new Error("Project application was not found or access is denied.");
      }

      const payload = Object.freeze({
        application: detail,
        team: Array.isArray(teamRaw) ? teamRaw : (teamRaw ? [teamRaw] : []),
        documents: Array.isArray(documentsRaw) ? documentsRaw : (documentsRaw ? [documentsRaw] : []),
        reviews: Array.isArray(reviewsRaw) ? reviewsRaw : (reviewsRaw ? [reviewsRaw] : []),
        auditLog: Array.isArray(auditRaw) ? auditRaw : (auditRaw ? [auditRaw] : []),
        context: Object.freeze({
          applicationId: currentApplicationId,
          piUid: currentUser.uid,
          username: currentUser.username || null,
          network: currentNetwork,
          environment: env.getKey()
        })
      });

      window.dispatchEvent(new CustomEvent("albukhr:external-project-detail-loaded", {
        detail: payload
      }));

      return payload;
    })();

    try {
      return await loadingPromise;
    } finally {
      loadingPromise = null;
    }
  }

  async function reload() {
    return loadAll();
  }

  function getContext() {
    return Object.freeze({
      applicationId: currentApplicationId,
      piUid: currentUser ? currentUser.uid : null,
      network: currentNetwork
    });
  }

  Engine.load = loadAll;
  Engine.reload = reload;
  Engine.getContext = getContext;
  Engine.getApplicationId = function () { return currentApplicationId || readApplicationId(); };

  window.ALBukhrExternalProjectDetail = Object.freeze(Engine);

  console.info("ALBUKHR External Project Detail Engine loaded.");

})(window, document);
