/* =========================================================
   ALBUKHR — PROJECT CONFIG / LOGO REGISTRY BRIDGE
   File:
   js/project-config.js

   Purpose:
   - Preserve the ALBUKHR 7-project catalog used by the UI.
   - Remove project emoji/icon identity completely.
   - Use official project logo_url as the only project identity.
   - Merge authoritative public registry metadata from Supabase.
   - Automatically accept future registered Core/Internal/External
     projects without editing this file.
   - Preserve existing Popular Projects / Assets renderers.
   - Never make APPROVED projects investable; ACTIVE is required.
   - Respect the current ALBUKHR environment/network.

   Important:
   This file does NOT render project cards and does NOT replace the
   existing project catalog with the database registry.

   Required load order:
   1. Supabase JS SDK
   2. js/core/environment-core.js
   3. js/core/supabase-core.js
   4. js/project-config.js
========================================================= */

(function (window) {

  "use strict";

  /* =======================================================
     CONSTANTS
  ======================================================= */

  const REGISTRY_RPC = "get_public_project_registry";

  const DEFAULT_DURATIONS = Object.freeze([30, 60, 90]);

  const RAHEEM_LOGO_URL =
    "https://ribpntyqdleytsyktdfb.supabase.co/storage/v1/object/public/project-logos/projects/25af782e-d91b-467a-9219-3dd45294aaff/logo";


  /* =======================================================
     LEGACY CATALOG

     These entries preserve the existing ALBUKHR ecosystem
     catalog used by the home page.

     No emoji/icon is used anywhere.
  ======================================================= */

  const BASE_PROJECTS = {

    Azman: {
      title: "Azman Futures Makers Lab",
      desc:
        "Long-term science, technology, and innovation project focused on future invention and engineering.",
      info:
        "Azman supports research labs, prototyping, and advanced engineering capacity building.",
      durations: [180, 365, 430],
      project_code: "AZMAN",
      slug: "azman-futures-makers-lab",
      logo_url: null
    },

    Labbaika: {
      title: "Labbaika Bakery Center",
      desc:
        "Food production project focused on modern bread and flour processing.",
      info:
        "Labbaika enables scalable bakery production within the ALBUKHR ecosystem.",
      durations: [30, 60, 90],
      project_code: "LABBAIKA",
      slug: "labbaika-bakery-center",
      logo_url: null
    },

    Barsh: {
      title: "Barsh Agro & Livestock",
      desc:
        "Mechanized farming and livestock project for large-scale agricultural production.",
      info:
        "Barsh integrates modern farming, livestock, and sustainable agriculture systems.",
      durations: [30, 60, 90],
      project_code: "BARSH",
      slug: "barsh-agro-livestock",
      logo_url: null
    },

    Urban: {
      title: "Urban Mobility System",
      desc:
        "Infrastructure project focused on modern transportation of people and goods.",
      info:
        "Urban improves accessibility and builds sustainable mobility networks.",
      durations: [30, 60, 90],
      project_code: "URBAN",
      slug: "urban-mobility-system",
      logo_url: null
    },

    Khairat: {
      title: "Khairat Fertiliser",
      desc:
        "Agricultural supply project improving fertiliser access and farm productivity.",
      info:
        "Khairat supports transparent distribution systems and sustainable farming inputs.",
      durations: [30, 60, 90],
      project_code: "KHAIRAT",
      slug: "khairat-fertiliser",
      logo_url: null
    },

    Hauwal: {
      title: "Hauwal Maize Processing",
      desc:
        "Agro-processing project modernizing maize milling into scalable production.",
      info:
        "Hauwal focuses on clean processing, packaging, and food system efficiency.",
      durations: [30, 60, 90],
      project_code: "HAUWAL",
      slug: "hauwal-maize-processing",
      logo_url: null
    },

    Raheem: {
      title: "Raheem Pharmacy",
      desc:
        "Healthcare project improving access to essential medicines.",
      info:
        "Raheem provides transparent, community-driven pharmaceutical distribution.",
      durations: [30, 60, 90],
      project_code: "RAHEEM-25",
      slug: "raheem-pharmacy",
      project_id: "25af782e-d91b-467a-9219-3dd45294aaff",
      core_slot: 1,
      network: "mainnet",
      logo_url: RAHEEM_LOGO_URL
    }

  };


  /* =======================================================
     PUBLIC CONFIG OBJECT

     Kept as a normal object because existing index.html
     uses Object.keys(PROJECT_CONFIG).
  ======================================================= */

  const PROJECT_CONFIG = {};

  Object.keys(BASE_PROJECTS).forEach(function (key) {
    PROJECT_CONFIG[key] = {
      ...BASE_PROJECTS[key],
      key
    };
  });


  /* =======================================================
     NORMALIZATION
  ======================================================= */

  function cleanString(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizeNetwork(value) {
    return cleanString(value).toLowerCase();
  }

  function normalizeProjectCode(value) {
    return cleanString(value).toUpperCase();
  }

  function normalizeSlug(value) {
    return cleanString(value).toLowerCase();
  }

  function normalizeRegistryRow(row) {
    if (!row || typeof row !== "object") {
      return null;
    }

    const id = cleanString(row.id);
    const projectCode = normalizeProjectCode(row.project_code);
    const slug = normalizeSlug(row.slug);
    const name = cleanString(row.name);
    const network = normalizeNetwork(row.network);
    const status = cleanString(row.status).toLowerCase();

    if (!id && !projectCode && !slug && !name) {
      return null;
    }

    return {
      id: id || null,
      project_code: projectCode || null,
      slug: slug || null,
      name: name || null,
      project_type: cleanString(row.project_type).toLowerCase() || null,
      core_slot: row.core_slot == null ? null : row.core_slot,
      network: network || null,
      status: status || null,
      logo_url: cleanString(row.logo_url) || null
    };
  }


  /* =======================================================
     MATCHING
  ======================================================= */

  function findCatalogKey(registryRow) {

    const row = normalizeRegistryRow(registryRow);

    if (!row) {
      return null;
    }

    const keys = Object.keys(PROJECT_CONFIG);

    /* 1. Exact project code */
    if (row.project_code) {
      for (const key of keys) {
        const cfg = PROJECT_CONFIG[key];

        if (
          normalizeProjectCode(cfg.project_code) ===
          row.project_code
        ) {
          return key;
        }
      }
    }

    /* 2. Exact slug */
    if (row.slug) {
      for (const key of keys) {
        const cfg = PROJECT_CONFIG[key];

        if (
          normalizeSlug(cfg.slug) ===
          row.slug
        ) {
          return key;
        }
      }
    }

    /* 3. Exact name/title */
    if (row.name) {
      for (const key of keys) {
        const cfg = PROJECT_CONFIG[key];

        if (
          cleanString(cfg.title).toLowerCase() ===
          row.name.toLowerCase()
        ) {
          return key;
        }
      }
    }

    return null;
  }


  /* =======================================================
     SAFE MERGE

     Registry is authoritative for identity/registry fields.
     Local catalog remains authoritative for legacy UI copy
     and duration definitions unless explicitly supplied by
     the registry in the future.
  ======================================================= */

  function mergeRegistryProject(row) {

    const registry = normalizeRegistryRow(row);

    if (!registry) {
      return null;
    }

    const existingKey = findCatalogKey(registry);

    if (existingKey) {

      const current = PROJECT_CONFIG[existingKey];

      PROJECT_CONFIG[existingKey] = {
        ...current,

        project_id:
          registry.id || current.project_id || null,

        project_code:
          registry.project_code ||
          current.project_code ||
          null,

        slug:
          registry.slug ||
          current.slug ||
          null,

        title:
          registry.name ||
          current.title,

        project_type:
          registry.project_type ||
          current.project_type ||
          null,

        core_slot:
          registry.core_slot != null
            ? registry.core_slot
            : (current.core_slot ?? null),

        network:
          registry.network ||
          current.network ||
          null,

        status:
          registry.status ||
          current.status ||
          null,

        /*
         * Official registry logo always wins.
         * If the registry does not yet expose one, preserve
         * an already trusted local official logo.
         */
        logo_url:
          registry.logo_url ||
          current.logo_url ||
          null
      };

      return existingKey;
    }


    /* =====================================================
       FUTURE REGISTERED PROJECT

       No manual project-config.js edit is required.
    ===================================================== */

    const key =
      registry.slug ||
      registry.project_code ||
      registry.id ||
      registry.name;

    if (!key) {
      return null;
    }

    PROJECT_CONFIG[key] = {

      key,

      project_id:
        registry.id || null,

      project_code:
        registry.project_code || null,

      slug:
        registry.slug || null,

      title:
        registry.name || "ALBUKHR Project",

      desc:
        "ALBUKHR Project",

      info:
        "Project information is available from the ALBUKHR project registry.",

      durations:
        DEFAULT_DURATIONS.slice(),

      project_type:
        registry.project_type || null,

      core_slot:
        registry.core_slot != null
          ? registry.core_slot
          : null,

      network:
        registry.network || null,

      status:
        registry.status || null,

      logo_url:
        registry.logo_url || null

    };

    return key;
  }


  /* =======================================================
     REGISTRY LOADER
  ======================================================= */

  let registryPromise = null;

  async function loadProjectRegistry(options) {

    options = options || {};

    const force =
      options.force === true;

    if (registryPromise && !force) {
      return registryPromise;
    }

    registryPromise = (async function () {

      const core =
        window.ALBUKHR_SUPABASE;

      if (
        !core ||
        !core.client ||
        typeof core.rpc !== "function"
      ) {
        console.warn(
          "ALBUKHR Project Config: Supabase Core is not ready."
        );

        return {
          ok: false,
          projects: [],
          error:
            "ALBUKHR_SUPABASE is not available."
        };
      }

      const network =
        normalizeNetwork(core.network);

      if (
        network !== "mainnet" &&
        network !== "testnet"
      ) {
        console.error(
          "ALBUKHR Project Config: invalid network.",
          network
        );

        return {
          ok: false,
          projects: [],
          error: "Invalid ALBUKHR network."
        };
      }

      try {

        const result =
          await core.rpc(
            REGISTRY_RPC,
            {
              p_network: network
            }
          );

        if (result && result.error) {
          throw result.error;
        }

        let data =
          result ? result.data : null;

        /*
         * SECURITY: never accept a non-array registry payload.
         */
        if (!Array.isArray(data)) {
          data = [];
        }

        const merged = [];

        data.forEach(function (row) {

          const key =
            mergeRegistryProject(row);

          if (key) {
            merged.push(
              PROJECT_CONFIG[key]
            );
          }

        });

        /*
         * Notify existing UI engines without owning/rendering
         * their DOM. index.html can listen if it needs a
         * post-registry refresh.
         */
        try {
          window.dispatchEvent(
            new CustomEvent(
              "albukhr:project-registry-ready",
              {
                detail: {
                  network,
                  projects: merged
                }
              }
            )
          );
        }
        catch (eventError) {
          console.warn(
            "ALBUKHR Project Config: registry event failed.",
            eventError
          );
        }

        return {
          ok: true,
          network,
          projects: merged,
          count: merged.length
        };

      }
      catch (error) {

        console.error(
          "ALBUKHR Project Config: registry load failed.",
          error
        );

        return {
          ok: false,
          projects: [],
          error
        };

      }

    })();

    return registryPromise;
  }


  /* =======================================================
     SAFE ACCESS
  ======================================================= */

  function getProjectConfig(name) {

    const requested =
      cleanString(name);

    if (!requested) {
      return {
        key: null,
        title: "ALBUKHR Project",
        desc: "ALBUKHR Project",
        info: "Project information not available.",
        durations: DEFAULT_DURATIONS.slice(),
        logo_url: null,
        project_code: null,
        slug: null,
        project_id: null,
        project_type: null,
        core_slot: null,
        network: null,
        status: null
      };
    }

    if (PROJECT_CONFIG[requested]) {
      return PROJECT_CONFIG[requested];
    }

    const requestedCode =
      normalizeProjectCode(requested);

    const requestedSlug =
      normalizeSlug(requested);

    const keys =
      Object.keys(PROJECT_CONFIG);

    for (const key of keys) {

      const cfg =
        PROJECT_CONFIG[key];

      if (
        normalizeProjectCode(cfg.project_code) ===
        requestedCode
      ) {
        return cfg;
      }

      if (
        normalizeSlug(cfg.slug) ===
        requestedSlug
      ) {
        return cfg;
      }

      if (
        cleanString(cfg.title).toLowerCase() ===
        requested.toLowerCase()
      ) {
        return cfg;
      }

    }

    return {
      key: requested,
      title: requested,
      desc: "ALBUKHR Project",
      info: "Project information not available.",
      durations: DEFAULT_DURATIONS.slice(),
      logo_url: null,
      project_code: null,
      slug: null,
      project_id: null,
      project_type: null,
      core_slot: null,
      network: null,
      status: null
    };
  }


  /* =======================================================
     LOOKUP
  ======================================================= */

  function findProject(criteria) {

    const value =
      cleanString(criteria);

    if (!value) {
      return null;
    }

    const valueCode =
      normalizeProjectCode(value);

    const valueSlug =
      normalizeSlug(value);

    return (
      Object.values(PROJECT_CONFIG).find(function (cfg) {

        return (
          cleanString(cfg.project_id) === value ||
          normalizeProjectCode(cfg.project_code) === valueCode ||
          normalizeSlug(cfg.slug) === valueSlug ||
          cleanString(cfg.title).toLowerCase() ===
            value.toLowerCase()
        );

      }) || null
    );
  }


  /* =======================================================
     LOGO ACCESS
  ======================================================= */

  function getProjectLogo(name) {

    const cfg =
      getProjectConfig(name);

    return (
      cleanString(cfg.logo_url) ||
      null
    );
  }


  /* =======================================================
     LOGO VALIDATION

     No fake/default project icon is generated.
  ======================================================= */

  function hasOfficialLogo(name) {

    return Boolean(
      getProjectLogo(name)
    );
  }


  /* =======================================================
     INVESTMENT GATE

     APPROVED = visible/read-only.
     ACTIVE   = investment eligible.
  ======================================================= */

  function isProjectActive(projectOrName) {

    const cfg =
      typeof projectOrName === "object" &&
      projectOrName !== null
        ? projectOrName
        : getProjectConfig(projectOrName);

    return (
      cleanString(cfg.status).toLowerCase() ===
      "active"
    );
  }


  function canInvest(projectOrName) {
    return isProjectActive(projectOrName);
  }


  /* =======================================================
     CURRENT NETWORK FILTER
  ======================================================= */

  function getCurrentNetwork() {

    const core =
      window.ALBUKHR_SUPABASE;

    if (core && core.network) {
      return normalizeNetwork(core.network);
    }

    const environment =
      window.ALBukhrEnvironment;

    if (
      environment &&
      typeof environment.getNetwork === "function"
    ) {
      return normalizeNetwork(
        environment.getNetwork()
      );
    }

    return null;
  }


  function getProjectsForCurrentNetwork() {

    const network =
      getCurrentNetwork();

    if (!network) {
      return [];
    }

    return Object.values(
      PROJECT_CONFIG
    ).filter(function (cfg) {

      /*
       * Legacy catalog entries without registry network
       * remain available to the existing catalog renderer.
       * Once registered, their authoritative network is used.
       */
      return (
        !cfg.network ||
        normalizeNetwork(cfg.network) === network
      );

    });
  }


  /* =======================================================
     EXPORTS
  ======================================================= */

  window.PROJECT_CONFIG =
    PROJECT_CONFIG;

  window.ALBukhrProjectConfig = {

    registryRpc:
      REGISTRY_RPC,

    baseProjects:
      BASE_PROJECTS,

    config:
      PROJECT_CONFIG,

    get:
      getProjectConfig,

    find:
      findProject,

    getLogo:
      getProjectLogo,

    hasOfficialLogo:
      hasOfficialLogo,

    isActive:
      isProjectActive,

    canInvest:
      canInvest,

    getCurrentNetwork:
      getCurrentNetwork,

    getProjectsForCurrentNetwork:
      getProjectsForCurrentNetwork,

    loadRegistry:
      loadProjectRegistry

  };


  /* =======================================================
     INITIAL REGISTRY LOAD

     This is intentionally asynchronous. The file itself
     never owns the page DOM.
  ======================================================= */

  loadProjectRegistry();


  /* =======================================================
     DEVELOPMENT LOG
  ======================================================= */

  console.info(
    "ALBUKHR Project Config initialized.",
    {
      catalogProjects:
        Object.keys(PROJECT_CONFIG).length,
      network:
        getCurrentNetwork()
    }
  );

})(window);
