/* =========================================================
   ALBUKHR MARKETPLACE ENGINE — ADMIN PROJECT INTEGRATION
   File: js/marketplace/marketplace-engine.js

   Authoritative source:
     ALBUKHR Admin -> albukhr_security.create_project/update_project
                   -> public.projects
                   -> ALBUKHR App Marketplace

   Rules:
   - Uses ALBUKHR shared Supabase Core only.
   - Uses Environment Core as network authority.
   - Reads public.projects with network isolation.
   - No localStorage/sessionStorage.
   - No Pi payment execution.
   - No treasury writes.
   - Investment delegates to AlbukhrEcosystem.invest().
========================================================= */
"use strict";
(() => {
  const ENGINE = "ALBUKHR Marketplace Engine";
  const CACHE_MS = 10000;
  let projectsCache = [], cacheNetwork = null, cacheAt = 0;

  const str = (v, d = "") => v == null ? d : String(v);
  const arr = v => Array.isArray(v) ? v : [];
  const norm = v => str(v).trim().toLowerCase();
  const num = (v, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : d;
  };

  function getNetwork() {
    const env = window.ALBukhrEnvironment || window.ALBUKHR_ENVIRONMENT;
    let n = null;

    if (env) {
      if (typeof env.getNetwork === "function") n = env.getNetwork();
      else if (typeof env.network === "string") n = env.network;
      else if (typeof env.currentNetwork === "string") n = env.currentNetwork;
    }
    if (!n && typeof window.requireAlbukhrNetwork === "function") {
      n = window.requireAlbukhrNetwork();
    }

    n = norm(n);
    if (n !== "mainnet" && n !== "testnet") {
      throw new Error(`${ENGINE}: Environment Core did not provide a valid network.`);
    }
    return n;
  }

  function getSupabase() {
    const core = window.ALBUKHR_SUPABASE;
    let client = null;

    if (core) {
      if (typeof core.from === "function") client = core;
      else if (core.client && typeof core.client.from === "function") client = core.client;
      else if (typeof core.getClient === "function") client = core.getClient();
    }

    if (!client && typeof window.requireAlbukhrSupabaseClient === "function") {
      client = window.requireAlbukhrSupabaseClient();
    }

    if (!client || typeof client.from !== "function") {
      throw new Error(`${ENGINE}: ALBUKHR shared Supabase Core is unavailable.`);
    }
    return client;
  }

  function code(p) {
    return typeof p === "string" || typeof p === "number"
      ? str(p)
      : str(p?.project_code ?? p?.projectCode ?? p?.code ?? "");
  }
  function title(p) { return str(p?.name ?? p?.project_name ?? p?.projectName ?? p?.title ?? code(p) ?? "Unnamed Project"); }
  function type(p) { return norm(p?.project_type ?? p?.projectType ?? p?.type ?? "external"); }
  function clone(v) { return arr(v).map(x => ({ ...x })); }

  async function getProjects(options = {}) {
    const force = !!options.forceRefresh;
    const activeOnly = options.activeOnly !== false;
    const network = getNetwork();
    const now = Date.now();

    if (!force && cacheNetwork === network && now - cacheAt < CACHE_MS) {
      return activeOnly
        ? clone(projectsCache.filter(p => norm(p.status) === "active"))
        : clone(projectsCache);
    }

    let query = getSupabase()
      .from("projects")
      .select("*")
      .eq("network", network);

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;

    projectsCache = arr(data);
    cacheNetwork = network;
    cacheAt = now;

    return activeOnly
      ? clone(projectsCache.filter(p => norm(p.status) === "active"))
      : clone(projectsCache);
  }

  async function getProject(projectCode) {
    const wanted = norm(projectCode);
    if (!wanted) return null;
    return (await getProjects({ activeOnly: false }))
      .find(p => norm(code(p)) === wanted) || null;
  }

  async function getProjectMetrics(projectCode) {
    const project = await getProject(projectCode);
    if (!project) return null;

    const network = getNetwork();
    let stakes = [];
    try {
      const { data, error } = await getSupabase()
        .from("stakes")
        .select("amount,userid,status")
        .eq("project", code(project))
        .eq("network", network)
        .eq("status", "paid");
      if (error) throw error;
      stakes = arr(data);
    } catch (error) {
      console.warn(`${ENGINE}: stakes metrics unavailable for ${code(project)}`, error);
    }

    const liquidity = stakes.reduce((sum, s) => sum + num(s.amount), 0);
    const investors = new Set(stakes.map(s => str(s.userid)).filter(Boolean)).size;
    const roi = num(project.reward_rate ?? project.rewardRate ?? project.roi ?? project.reward, 0);

    return {
      ...project,
      code: code(project),
      title: title(project),
      type: type(project),
      liquidity,
      investors,
      roi,
      riskScore: 0,
      riskLevel: "UNKNOWN"
    };
  }

  async function getMarketMetrics(force = false) {
    const projects = await getProjects({ activeOnly: true, forceRefresh: force });
    return Promise.all(projects.map(p => getProjectMetrics(code(p))));
  }

  async function getMarketLeaderboard(sort = "default") {
    const list = (await getMarketMetrics()).filter(Boolean);
    const key = norm(sort);
    if (key === "roi") list.sort((a,b) => b.roi - a.roi);
    else if (key === "liquidity") list.sort((a,b) => b.liquidity - a.liquidity);
    else if (key === "investors") list.sort((a,b) => b.investors - a.investors);
    else list.sort((a,b) => str(a.title).localeCompare(str(b.title)));
    return list;
  }

  async function getMarketSummary() {
    const list = await getMarketMetrics();
    const total = list.reduce((s,p) => {
      s.liquidity += num(p.liquidity);
      s.investors += num(p.investors);
      s.roi += num(p.roi);
      return s;
    }, { liquidity: 0, investors: 0, roi: 0 });

    return {
      projects: list.length,
      liquidity: total.liquidity,
      investors: total.investors,
      averageROI: list.length ? total.roi / list.length : 0
    };
  }

  async function searchMarketProjects(keyword = "") {
    const q = norm(keyword);
    const list = await getMarketMetrics();
    if (!q) return list;
    return list.filter(p =>
      norm(p.code).includes(q) ||
      norm(p.title).includes(q) ||
      norm(p.type).includes(q) ||
      norm(p.description).includes(q)
    );
  }

  async function refreshMarketRanking() {
    projectsCache = [];
    cacheNetwork = null;
    cacheAt = 0;
    return getMarketMetrics(true);
  }

  async function invest(payload = {}) {
    if (!payload.project) throw new Error("Project is required.");
    const project = await getProject(payload.project);
    if (!project) throw new Error("Project not found in the current network.");

    const amount = num(payload.amount);
    if (amount <= 0) throw new Error("Investment amount must be greater than zero.");

    if (!window.AlbukhrEcosystem || typeof window.AlbukhrEcosystem.invest !== "function") {
      throw new Error("ALBUKHR investment engine is unavailable.");
    }

    const network = getNetwork();
    if (payload.network && norm(payload.network) !== network) {
      throw new Error(`Network mismatch: current environment is ${network}.`);
    }

    return window.AlbukhrEcosystem.invest({
      ...payload,
      project: code(project),
      amount,
      network
    });
  }

  const API = {
    getProjects,
    getProject,
    getActiveProjects: () => getProjects({ activeOnly: true }),
    getAllProjects: () => getProjects({ activeOnly: false }),
    getProjectMetrics,
    getMarketMetrics,
    getMarketLeaderboard,
    getMarketSummary,
    searchMarketProjects,
    refreshMarketRanking,
    invest
  };

  window.AlbukhrMarketplace = API;
  window.AlbukhrMarketplaceUI = {
    escapeHTML(v) {
      return str(v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
        .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
    },
    getProjectByCode(list, projectCode) {
      const q = norm(projectCode);
      return arr(list).find(p => norm(code(p)) === q) || null;
    },
    invest
  };

  window.AlbukhrMarketplaceHealth = () => {
    let network = null, networkReady = false, supabaseReady = false;
    try { network = getNetwork(); networkReady = true; } catch (_) {}
    try { supabaseReady = !!getSupabase(); } catch (_) {}
    return {
      ready: networkReady && supabaseReady,
      network,
      network_core_ready: networkReady,
      supabase_core_ready: supabaseReady,
      project_source: "public.projects",
      local_storage_used: false,
      session_storage_used: false
    };
  };

  try {
    console.info(`${ENGINE} loaded for ${getNetwork()}.`);
  } catch (_) {
    console.info(`${ENGINE} loaded; environment resolves on use.`);
  }
})();
