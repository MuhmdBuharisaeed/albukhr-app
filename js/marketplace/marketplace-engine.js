/* =========================================================
   ALBUKHR MARKETPLACE ENGINE — SERVER AUTHORITATIVE
   Destination: /js/marketplace/marketplace-engine.js

   Public project data is obtained only through the controlled
   get_public_project_registry RPC. No direct public.projects
   table reads. Network is supplied by Environment Core.

   Lifecycle:
   - APPROVED: visible/read-only
   - ACTIVE: visible and eligible for investment delegation
========================================================= */
"use strict";
(() => {
  const norm = v => String(v ?? "").trim().toLowerCase();
  const arr = v => Array.isArray(v) ? v : [];
  let cache = [];
  let cacheNetwork = null;
  let cacheAt = 0;
  const CACHE_MS = 10000;

  function network() {
    const e = window.ALBukhrEnvironment;
    if (!e || !e.isKnown()) throw new Error("ALBUKHR environment is unavailable.");
    const n = norm(e.getNetwork());
    if (n !== "mainnet" && n !== "testnet") throw new Error("Invalid ALBUKHR network.");
    return n;
  }

  function db() {
    const core = window.ALBUKHR_SUPABASE;
    const client = core?.client || core;
    if (!client || typeof client.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return client;
  }

  async function getProjects(options = {}) {
    const force = !!options.forceRefresh;
    const activeOnly = options.activeOnly === true;
    const n = network();
    const now = Date.now();

    if (!force && cacheNetwork === n && now - cacheAt < CACHE_MS) {
      return cache.filter(p => !activeOnly || norm(p.status) === "active").map(p => ({...p}));
    }

    const { data, error } = await db().rpc("get_public_project_registry", { p_network: n });
    if (error) throw error;

    cache = arr(data).filter(p => norm(p.network) === n);
    cacheNetwork = n;
    cacheAt = now;

    return cache
      .filter(p => !activeOnly || norm(p.status) === "active")
      .map(p => ({...p}));
  }

  async function getProject(code) {
    const q = norm(code);
    if (!q) return null;
    return (await getProjects()).find(p =>
      norm(p.project_code) === q ||
      norm(p.slug) === q ||
      norm(p.id) === q
    ) || null;
  }

  async function getProjectMetrics(code) {
    const p = await getProject(code);
    if (!p) return null;
    return {
      ...p,
      code: p.project_code,
      title: p.name,
      type: p.project_type,
      liquidity: Number(p.liquidity || 0),
      investors: Number(p.investors || 0),
      roi: Number(p.roi || 0),
      riskScore: 0,
      riskLevel: "UNKNOWN"
    };
  }

  async function getMarketMetrics() {
    return (await getProjects()).map(p => ({
      ...p,
      code: p.project_code,
      title: p.name,
      type: p.project_type,
      liquidity: Number(p.liquidity || 0),
      investors: Number(p.investors || 0),
      roi: Number(p.roi || 0),
      riskScore: 0,
      riskLevel: "UNKNOWN"
    }));
  }

  async function getMarketLeaderboard(sort = "default") {
    const list = await getMarketMetrics();
    const key = norm(sort);
    if (key === "liquidity") list.sort((a,b) => b.liquidity - a.liquidity);
    else if (key === "investors") list.sort((a,b) => b.investors - a.investors);
    else if (key === "roi") list.sort((a,b) => b.roi - a.roi);
    else list.sort((a,b) => String(a.title).localeCompare(String(b.title)));
    return list;
  }

  async function getMarketSummary() {
    const list = await getMarketMetrics();
    return {
      projects: list.length,
      liquidity: list.reduce((s,p) => s + Number(p.liquidity || 0), 0),
      investors: list.reduce((s,p) => s + Number(p.investors || 0), 0),
      averageROI: list.length ? list.reduce((s,p) => s + Number(p.roi || 0), 0) / list.length : 0
    };
  }

  async function searchMarketProjects(keyword = "") {
    const q = norm(keyword);
    const list = await getMarketMetrics();
    if (!q) return list;
    return list.filter(p => [p.project_code,p.name,p.slug,p.project_type,p.description]
      .some(v => norm(v).includes(q)));
  }

  async function refreshMarketRanking() {
    cache = [];
    cacheNetwork = null;
    cacheAt = 0;
    return getMarketMetrics();
  }

  async function invest(payload = {}) {
    if (!payload.project) throw new Error("Project is required.");
    const p = await getProject(payload.project);
    if (!p) throw new Error("Project not found in the current network.");
    if (norm(p.status) !== "active") {
      throw new Error("This project is not ACTIVE and cannot accept investment yet.");
    }

    const amount = Number(payload.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Investment amount must be greater than zero.");
    }

    const currentNetwork = network();
    if (payload.network && norm(payload.network) !== currentNetwork) {
      throw new Error("Network mismatch.");
    }

    if (!window.AlbukhrEcosystem || typeof window.AlbukhrEcosystem.invest !== "function") {
      throw new Error("ALBUKHR investment engine is unavailable.");
    }

    return window.AlbukhrEcosystem.invest({
      ...payload,
      project: p.project_code,
      amount,
      network: currentNetwork
    });
  }

  window.AlbukhrMarketplace = Object.freeze({
    getProjects,
    getProject,
    getActiveProjects: () => getProjects({activeOnly:true}),
    getAllProjects: () => getProjects({activeOnly:false}),
    getProjectMetrics,
    getMarketMetrics,
    getMarketLeaderboard,
    getMarketSummary,
    searchMarketProjects,
    refreshMarketRanking,
    invest
  });

  window.AlbukhrMarketplaceUI = Object.freeze({
    escapeHTML(v) {
      return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    },
    getProjectByCode(list, code) {
      const q = norm(code);
      return arr(list).find(p => norm(p.project_code) === q) || null;
    },
    invest
  });
})();
