/* =========================================================
   ALBUKHR — PROJECT CATALOG + SERVER REGISTRY BRIDGE

   Purpose:
   - Preserve the seven-project Home catalog used by index.html.
   - Keep legacy project keys stable for existing staking/UI code.
   - Overlay server-authoritative registry metadata when available.
   - Never treat this client catalog as an authorization authority.
   - No LocalStorage.
   - Network is always resolved from ALBUKHR Environment Core.
========================================================= */
(function (window) {
  "use strict";

  const PROJECT_CONFIG = {
    Azman: {
      title: "Azman Futures Makers Lab",
      icon: "🧪",
      desc: "Long-term science, technology, and innovation project focused on future invention and engineering.",
      info: "Azman supports research labs, prototyping, and advanced engineering capacity building.",
      durations: [180, 365, 430],
      project_code: "AZMAN",
      slug: "azman-futures-makers-lab"
    },
    Labbaika: {
      title: "Labbaika Bakery Center",
      icon: "🍞",
      desc: "Food production project focused on modern bread and flour processing.",
      info: "Labbaika enables scalable bakery production within the ALBUKHR ecosystem.",
      durations: [30, 60, 90],
      project_code: "LABBAIKA",
      slug: "labbaika-bakery-center"
    },
    Barsh: {
      title: "Barsh Agro & Livestock",
      icon: "🌾",
      desc: "Mechanized farming and livestock project for large-scale agricultural production.",
      info: "Barsh integrates modern farming, livestock, and sustainable agriculture systems.",
      durations: [30, 60, 90],
      project_code: "BARSH",
      slug: "barsh-agro-livestock"
    },
    Urban: {
      title: "Urban Mobility System",
      icon: "🚍",
      desc: "Infrastructure project focused on modern transportation of people and goods.",
      info: "Urban improves accessibility and builds sustainable mobility networks.",
      durations: [30, 60, 90],
      project_code: "URBAN",
      slug: "urban-mobility-system"
    },
    Khairat: {
      title: "Khairat Fertiliser",
      icon: "♻️",
      desc: "Agricultural supply project improving fertiliser access and farm productivity.",
      info: "Khairat supports transparent distribution systems and sustainable farming inputs.",
      durations: [30, 60, 90],
      project_code: "KHAIRAT",
      slug: "khairat-fertiliser"
    },
    Hauwal: {
      title: "Hauwal Maize Processing",
      icon: "🌽",
      desc: "Agro-processing project modernizing maize milling into scalable production.",
      info: "Hauwal focuses on clean processing, packaging, and food system efficiency.",
      durations: [30, 60, 90],
      project_code: "HAUWAL",
      slug: "hauwal-maize-processing"
    },
    Raheem: {
      title: "Raheem Pharmacy",
      // The official project logo is the visual identity for Raheem.
      // The existing index renderer consumes `icon`, so keep this field as
      // a trusted HTML logo bridge until index.html is migrated to a native
      // logo_url renderer. No project emoji/icon is used for Raheem.
      icon: '<img class="project-logo" src="https://ribpntyqdleytsyktdfb.supabase.co/storage/v1/object/public/project-logos/projects/25af782e-d91b-467a-9219-3dd45294aaff/logo" alt="Raheem Pharmacy" loading="lazy">',
      logo_url: "https://ribpntyqdleytsyktdfb.supabase.co/storage/v1/object/public/project-logos/projects/25af782e-d91b-467a-9219-3dd45294aaff/logo",
      desc: "Healthcare project improving access to essential medicines.",
      info: "Raheem provides transparent, community-driven pharmaceutical distribution.",
      durations: [30, 60, 90],
      project_code: "RAHEEM-25",
      slug: "raheem-pharmacy",
      project_id: "25af782e-d91b-467a-9219-3dd45294aaff",
      core_slot: 1,
      network: "mainnet"
    }
  };

  window.PROJECT_CONFIG = PROJECT_CONFIG;

  let registry = [];
  let registryReady = false;
  let registryPromise = null;

  function getEnvironment() {
    const env = window.AlbukhrEnvironment;
    if (!env || !env.isKnown || !env.isKnown()) {
      throw new Error("ALBUKHR environment is unavailable.");
    }
    return env;
  }

  function getNetwork() {
    const network = String(getEnvironment().getNetwork() || "").toLowerCase();
    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }
    return network;
  }

  function getClient() {
    const core = window.ALBUKHR_SUPABASE;
    const client = core?.client || core;
    if (!client || typeof client.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return client;
  }

  function applyRegistry(rows) {
    registry = Array.isArray(rows) ? rows : [];

    registry.forEach(function (row) {
      if (!row || !row.project_code) return;
      if (String(row.network || "").toLowerCase() !== getNetwork()) return;

      const code = String(row.project_code);
      const key = Object.keys(PROJECT_CONFIG).find(function (name) {
        return String(PROJECT_CONFIG[name].project_code || "").toLowerCase() === code.toLowerCase()
          || String(PROJECT_CONFIG[name].slug || "").toLowerCase() === String(row.slug || "").toLowerCase()
          || String(name).toLowerCase() === code.toLowerCase().replace(/-25$/, "");
      });

      if (!key) return;

      PROJECT_CONFIG[key].server = Object.freeze({
        id: row.id || null,
        project_code: row.project_code,
        slug: row.slug,
        name: row.name,
        project_type: row.project_type || null,
        core_slot: row.core_slot == null ? null : Number(row.core_slot),
        network: String(row.network || "").toLowerCase(),
        status: String(row.status || "").toLowerCase(),
        logo_url: row.logo_url || null
      });

      if (row.logo_url) {
        PROJECT_CONFIG[key].logo_url = row.logo_url;
        PROJECT_CONFIG[key].icon = '<img class="project-logo" src="' + String(row.logo_url)
          .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
          .replace(/</g, "&lt;").replace(/>/g, "&gt;") + '" alt="'
          + String(row.name || PROJECT_CONFIG[key].title || "Project")
            .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
            .replace(/</g, "&lt;").replace(/>/g, "&gt;")
          + '" loading="lazy">';
      }
      if (row.name) PROJECT_CONFIG[key].title = row.name;
      if (row.description) PROJECT_CONFIG[key].desc = row.description;
    });

    registryReady = true;
    return Object.freeze(registry.slice());
  }

  async function loadRegistry() {
    if (registryPromise) return registryPromise;

    registryPromise = (async function () {
      const network = getNetwork();
      const result = await getClient().rpc("get_public_project_registry", {
        p_network: network
      });
      if (result.error) throw result.error;
      return applyRegistry(Array.isArray(result.data) ? result.data : []);
    })();

    try {
      return await registryPromise;
    } catch (error) {
      registryReady = false;
      console.error("ALBUKHR public project registry unavailable:", error);
      return [];
    }
  }

  function getProjectConfig(name) {
    return PROJECT_CONFIG[name] || {
      title: name,
      icon: "📦",
      desc: "ALBUKHR Project",
      info: "Project information not available.",
      durations: [30, 60, 90]
    };
  }

  window.getProjectConfig = getProjectConfig;
  window.AlbukhrProjectRegistry = Object.freeze({
    load: loadRegistry,
    getAll: function () { return Object.values(PROJECT_CONFIG); },
    getByKey: function (key) { return PROJECT_CONFIG[String(key || "").trim()] || null; },
    getByCode: function (code) {
      const target = String(code || "").trim().toLowerCase();
      return Object.values(PROJECT_CONFIG).find(function (p) {
        return String(p.project_code || "").toLowerCase() === target
          || String(p.server?.project_code || "").toLowerCase() === target;
      }) || null;
    },
    isReady: function () { return registryReady; }
  });

  /* Keep the seven-project catalog immediately available to index.html.
     The server registry is an overlay, never a replacement for the catalog. */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { void loadRegistry(); }, { once: true });
  } else {
    void loadRegistry();
  }
})(window);
