/* =========================================================
   ALBUKHR — EXPLORE PROJECTS
   File: js/explore-projects.js

   Purpose:
   - Load projects from the authoritative ALBUKHR registry.
   - Display Core, Internal and External projects together.
   - Do not classify projects by origin in the public UI.
   - Display only APPROVED or ACTIVE projects.
   - Keep APPROVED separate from investment eligibility.
   - Enforce current Mainnet/Testnet network matching.
   - Use official registry logos only.
   - Preserve stable project identity and navigation.
   - No LocalStorage.
   - No direct Supabase client creation.
   - No hardcoded project catalogue or fallback projects.
========================================================= */

(function (window, document) {
  "use strict";

  const state = {
    projects: [],
    ready: false,
    network: null
  };

  /* =======================================================
     NORMALIZATION AND SAFE OUTPUT
  ======================================================= */

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeStatus(project) {
    return normalize(project && project.status);
  }

  function getNetwork() {
    const environment = window.ALBukhrEnvironment;
    const supabaseCore = window.ALBUKHR_SUPABASE;

    if (
      !environment ||
      typeof environment.isKnown !== "function" ||
      !environment.isKnown()
    ) {
      return null;
    }

    if (typeof environment.getNetwork !== "function") {
      return null;
    }

    const environmentNetwork = normalize(
      environment.getNetwork()
    );

    const coreNetwork = normalize(
      supabaseCore && supabaseCore.network
    );

    if (
      environmentNetwork !== "mainnet" &&
      environmentNetwork !== "testnet"
    ) {
      return null;
    }

    /*
     * Both shared cores must agree.
     * Never silently fall back to another network.
     */
    if (coreNetwork !== environmentNetwork) {
      return null;
    }

    if (
      typeof supabaseCore.isNetwork === "function" &&
      !supabaseCore.isNetwork(environmentNetwork)
    ) {
      return null;
    }

    return environmentNetwork;
  }

  function getIdentity(project) {
    return (
      clean(project && project.project_code) ||
      clean(project && project.slug) ||
      clean(project && project.project_id) ||
      clean(project && project.id) ||
      clean(project && project.key)
    );
  }

  function getProjectName(project) {
    return (
      clean(project && project.name) ||
      clean(project && project.title) ||
      "ALBUKHR Project"
    );
  }

  function getProjectDescription(project) {
    return (
      clean(project && project.description) ||
      clean(project && project.desc) ||
      "Project information is available from the ALBUKHR project registry."
    );
  }

  function isPubliclyDisplayable(project) {
    const status = normalizeStatus(project);

    return status === "approved" || status === "active";
  }

  function isInvestmentEligible(project) {
    return normalizeStatus(project) === "active";
  }

  /* =======================================================
     PROJECT NAVIGATION
  ======================================================= */

  function buildProjectUrl(project) {
    const identity = getIdentity(project);

    if (!identity) {
      return null;
    }

    const navigation = window.AlbukhrProjectNavigation;

    if (
      navigation &&
      typeof navigation.buildProjectUrl === "function"
    ) {
      return navigation.buildProjectUrl(identity);
    }

    /*
     * Preserve the existing project page route.
     * project.html must still validate registry identity,
     * network and status before allowing protected actions.
     */
    return "project.html?project=" +
      encodeURIComponent(identity);
  }

  /* =======================================================
     OFFICIAL PROJECT LOGO
  ======================================================= */

  function getSafeLogoUrl(project) {
    const rawUrl = clean(project && project.logo_url);

    if (!rawUrl) {
      return null;
    }

    try {
      const parsed = new URL(rawUrl);

      if (parsed.protocol !== "https:") {
        return null;
      }

      return parsed.href;
    } catch (error) {
      return null;
    }
  }

  function renderLogo(project, name) {
    const logoUrl = getSafeLogoUrl(project);

    if (!logoUrl) {
      return `
        <div
          class="project-icon project-logo-wrap project-logo-missing"
          role="img"
          aria-label="${escapeHtml(name)} logo unavailable"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="3"></rect>
            <path d="M8 15l3-3 2 2 2-2 2 3"></path>
            <circle cx="9" cy="9" r="1.2"></circle>
          </svg>
        </div>
      `;
    }

    return `
      <div class="project-icon project-logo-wrap">
        <img
          class="project-logo"
          src="${escapeHtml(logoUrl)}"
          alt="${escapeHtml(name)} logo"
          loading="lazy"
          decoding="async"
          referrerpolicy="no-referrer"
          onerror="
            this.hidden = true;
            this.parentElement.classList.add('project-logo-missing');
            this.parentElement.setAttribute(
              'aria-label',
              'Project logo unavailable'
            );
          "
        >
      </div>
    `;
  }

  /* =======================================================
     STATUS PRESENTATION

     APPROVED:
       Publicly viewable, not investment eligible.

     ACTIVE:
       May proceed to investment eligibility checks.
       This label does not itself authorize an investment.
  ======================================================= */

  function renderStatus(project) {
    const active = isInvestmentEligible(project);

    const label = active ? "Active" : "Approved";

    const tag = active
      ? "Active Project"
      : "Approved · View Only";

    return {
      label: label,
      tag: tag,
      active: active
    };
  }

  /* =======================================================
     PROJECT CARD

     Intentionally does not display project_type.
     Core, Internal and External projects share one layout.
  ======================================================= */

  function renderCard(project) {
    const identity = getIdentity(project);
    const url = buildProjectUrl(project);

    if (!identity || !url) {
      return "";
    }

    const name = getProjectName(project);
    const description = getProjectDescription(project);
    const status = renderStatus(project);

    const logoMarkup = renderLogo(project, name);

    const actionLabel = status.active
      ? "View Project"
      : "View Details";

    return `
      <article
        class="project-card"
        data-project-code="${escapeHtml(clean(project.project_code))}"
        data-project-slug="${escapeHtml(clean(project.slug))}"
        data-project-id="${escapeHtml(
          clean(project.project_id || project.id)
        )}"
        data-project-key="${escapeHtml(identity)}"
      >
        ${logoMarkup}

        <div class="project-body">
          <div class="project-title">
            ${escapeHtml(name)}
          </div>

          <div class="project-desc">
            ${escapeHtml(description)}
          </div>

          <div class="project-meta">
            ${escapeHtml(status.label)}
          </div>

          <span class="project-tag">
            ${escapeHtml(status.tag)}
          </span>
        </div>

        <div class="project-action">
          <a
            href="${escapeHtml(url)}"
            aria-label="${escapeHtml(actionLabel)}: ${escapeHtml(name)}"
          >
            ${escapeHtml(actionLabel)}
          </a>
        </div>
      </article>
    `;
  }

  /* =======================================================
     DEDUPLICATION

     Prefer the stable registry identity so that one project
     is not displayed multiple times under the same code,
     slug or ID.
  ======================================================= */

  function deduplicateProjects(projects) {
    const seen = new Set();
    const unique = [];

    projects.forEach(function (project) {
      const identity = normalize(
        getIdentity(project)
      );

      if (!identity || seen.has(identity)) {
        return;
      }

      seen.add(identity);
      unique.push(project);
    });

    return unique;
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  function getFilteredProjects() {
    const input = document.getElementById("searchInput");
    const query = normalize(input ? input.value : "");

    if (!query) {
      return state.projects.slice();
    }

    return state.projects.filter(function (project) {
      const searchableValues = [
        getProjectName(project),
        getProjectDescription(project),
        project.project_code,
        project.slug,
        project.status
      ];

      const haystack = searchableValues
        .map(normalize)
        .join(" ");

      return haystack.includes(query);
    });
  }

  /* =======================================================
     RENDERING
  ======================================================= */

  function renderList(container, projects, emptyMessage) {
    if (!container) {
      return;
    }

    if (!projects.length) {
      container.innerHTML =
        '<div class="empty">' +
        escapeHtml(emptyMessage) +
        "</div>";

      return;
    }

    container.innerHTML = projects
      .map(renderCard)
      .filter(Boolean)
      .join("");

    /*
     * project-navigation.js handles clicks on project cards.
     * Explicit anchors remain the primary navigation action.
     */
  }

  function updateProjectCount(count) {
    const countElement = document.getElementById("projectCount");

    if (!countElement) {
      return;
    }

    countElement.textContent = String(count);
  }

  function setLoadingState(isLoading) {
    const container = document.getElementById("projectList");

    if (container) {
      container.setAttribute(
        "aria-busy",
        isLoading ? "true" : "false"
      );
    }
  }

  function render() {
    const container = document.getElementById("projectList");

    if (!container) {
      return;
    }

    const projects = getFilteredProjects();

    updateProjectCount(projects.length);

    renderList(
      container,
      projects,
      state.ready
        ? (
            state.projects.length
              ? "No registered projects match your search."
              : "No approved or active projects are currently available on this network."
          )
        : "Loading registered projects..."
    );

    setLoadingState(!state.ready);
  }

  function showRuntimeError(message) {
    state.ready = true;
    state.projects = [];

    updateProjectCount(0);

    const container = document.getElementById("projectList");

    if (container) {
      container.innerHTML =
        '<div class="empty">' +
        escapeHtml(message) +
        "</div>";
    }

    setLoadingState(false);
  }

  /* =======================================================
     LOAD AUTHORITATIVE REGISTRY
  ======================================================= */

  async function loadProjects() {
    const environment = window.ALBukhrEnvironment;
    const supabaseCore = window.ALBUKHR_SUPABASE;

    if (!environment || !supabaseCore) {
      showRuntimeError(
        "ALBUKHR shared environment services are unavailable."
      );
      return;
    }

    const network = getNetwork();

    if (network !== "mainnet" && network !== "testnet") {
      showRuntimeError(
        "ALBUKHR network could not be verified. Projects were not loaded."
      );
      return;
    }

    const registry = window.ALBukhrProjectConfig;

    if (
      !registry ||
      typeof registry.loadRegistry !== "function"
    ) {
      showRuntimeError(
        "ALBUKHR Project Registry is unavailable."
      );
      return;
    }

    try {
      /*
       * The existing registry bridge calls:
       *
       * get_public_project_registry(p_network)
       *
       * It uses the shared Supabase Core.
       * No direct table query or new client is introduced.
       */
      const result = await registry.loadRegistry();

      if (!result || result.ok !== true) {
        throw new Error(
          clean(result && result.error) ||
          "Project registry could not be loaded."
        );
      }

      const returnedNetwork = normalize(result.network);

      /*
       * Defense in depth: reject a result whose declared
       * network does not match the active application.
       */
      if (
        returnedNetwork &&
        returnedNetwork !== network
      ) {
        throw new Error(
          "Project registry returned a different network."
        );
      }

      const rows = Array.isArray(result.projects)
        ? result.projects
        : [];

      /*
       * Include all project types.
       * Do not filter by core/internal/external.
       *
       * Require an exact network match and a public status.
       * Missing network/status values are not trusted.
       */
      const eligibleRows = rows.filter(function (project) {
        const projectNetwork = normalize(project.network);

        return (
          projectNetwork === network &&
          isPubliclyDisplayable(project)
        );
      });

      state.projects = deduplicateProjects(eligibleRows);
      state.network = network;
      state.ready = true;

      render();

      console.info(
        "ALBUKHR Explore Projects loaded.",
        {
          network: network,
          count: state.projects.length
        }
      );

    } catch (error) {
      console.error(
        "ALBUKHR Explore Projects: registry load failed.",
        error
      );

      showRuntimeError(
        "Projects are temporarily unavailable. Please try again later."
      );
    }
  }

  /* =======================================================
     SEARCH EVENTS
  ======================================================= */

  function bindSearch() {
    const input = document.getElementById("searchInput");

    if (!input) {
      return;
    }

    input.addEventListener("input", function () {
      render();
    });
  }

  /* =======================================================
     INITIALIZATION
  ======================================================= */

  function init() {
    bindSearch();
    render();
    loadProjects();
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

})(window, document);
