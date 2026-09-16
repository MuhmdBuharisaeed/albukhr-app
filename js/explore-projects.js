/* =========================================================
   ALBUKHR — EXPLORE PROJECTS
   File:
   js/explore-projects.js

   Purpose:
   - Render the public Explore Projects page from the
     authoritative ALBUKHR project registry.
   - Use the current Environment Core + Supabase Core.
   - Keep MAINNET / TESTNET isolated.
   - Support registered Core and External projects.
   - Preserve project identity through project_code / slug / id.
   - Use official registry logo_url only.
   - Never use LocalStorage.
   - Never make APPROVED projects investable.
   - Do not modify Dock Navigation or global app architecture.
========================================================= */

(function (window, document) {
  "use strict";

  const state = {
    projects: [],
    ready: false
  };

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return clean(value).toLowerCase();
  }

  function normalizeType(project) {
    return normalize(project && project.project_type);
  }

  function normalizeStatus(project) {
    return normalize(project && project.status);
  }

  function getNetwork() {
    const core = window.ALBUKHR_SUPABASE;

    if (core && core.network) {
      return normalize(core.network);
    }

    const environment = window.ALBukhrEnvironment;

    if (environment && typeof environment.getNetwork === "function") {
      return normalize(environment.getNetwork());
    }

    return null;
  }

  function getIdentity(project) {
    return (
      clean(project && project.project_code) ||
      clean(project && project.slug) ||
      clean(project && project.id)
    );
  }

  function buildProjectUrl(project) {
    const identity = getIdentity(project);

    if (!identity) {
      return null;
    }

    if (
      window.AlbukhrProjectNavigation &&
      typeof window.AlbukhrProjectNavigation.buildProjectUrl === "function"
    ) {
      return window.AlbukhrProjectNavigation.buildProjectUrl(identity);
    }

    return "project.html?project=" + encodeURIComponent(identity);
  }

  function formatType(type) {
    if (type === "core") return "Core Project";
    if (type === "external") return "External Project";
    if (type === "internal") return "Internal Project";
    return "ALBUKHR Project";
  }

  function formatStatus(status) {
    if (status === "active") return "Active";
    if (status === "approved") return "Approved";
    if (!status) return "Verified";
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      });
  }

  function renderCard(project) {
    const identity = getIdentity(project);
    const url = buildProjectUrl(project);

    if (!identity || !url) {
      return "";
    }

    const name = clean(project.name) || clean(project.title) || "ALBUKHR Project";
    const description =
      clean(project.description) ||
      clean(project.desc) ||
      "Project information is available from the ALBUKHR public registry.";

    const type = normalizeType(project);
    const status = normalizeStatus(project);
    const logo = clean(project.logo_url);

    const logoMarkup = logo
      ? `
        <div class="project-icon project-logo-wrap">
          <img
            class="project-logo"
            src="${escapeHtml(logo)}"
            alt="${escapeHtml(name)} logo"
            loading="lazy"
            decoding="async"
          >
        </div>
      `
      : `
        <div class="project-icon project-logo-wrap project-logo-missing"
             aria-label="Project logo unavailable">
          <span>Logo</span>
        </div>
      `;

    const investmentLabel =
      status === "active" ? "Active" : "View Project";

    return `
      <article
        class="project-card"
        data-project-code="${escapeHtml(clean(project.project_code))}"
        data-project-slug="${escapeHtml(clean(project.slug))}"
        data-project-id="${escapeHtml(clean(project.id))}"
        data-project-key="${escapeHtml(identity)}"
      >
        ${logoMarkup}

        <div class="project-body">
          <div class="project-title">${escapeHtml(name)}</div>
          <div class="project-desc">${escapeHtml(description)}</div>

          <div class="project-meta">
            ${escapeHtml(formatType(type))}
            ·
            ${escapeHtml(formatStatus(status))}
          </div>

          <span class="project-tag${type === "external" ? " external" : ""}">
            ${escapeHtml(status === "active" ? "Investment Eligible" : "Registry Verified")}
          </span>
        </div>

        <div class="project-action">
          <a href="${escapeHtml(url)}"
             aria-label="Open ${escapeHtml(name)}">
            ${escapeHtml(investmentLabel)}
          </a>
        </div>
      </article>
    `;
  }

  function renderList(container, projects, emptyMessage) {
    if (!container) return;

    if (!projects.length) {
      container.innerHTML =
        '<div class="empty">' + escapeHtml(emptyMessage) + "</div>";
      return;
    }

    container.innerHTML = projects.map(renderCard).join("");
  }

  function getFilteredProjects() {
    const input = document.getElementById("searchInput");
    const query = normalize(input ? input.value : "");

    if (!query) {
      return state.projects.slice();
    }

    return state.projects.filter(function (project) {
      const haystack = [
        project.name,
        project.project_code,
        project.slug,
        project.project_type,
        project.status
      ]
        .map(normalize)
        .join(" ");

      return haystack.includes(query);
    });
  }

  function render() {
    const projects = getFilteredProjects();

    const coreProjects = projects.filter(function (project) {
      return normalizeType(project) === "core";
    });

    const externalProjects = projects.filter(function (project) {
      return normalizeType(project) === "external";
    });

    renderList(
      document.getElementById("internalList"),
      coreProjects,
      state.ready
        ? "No registered Core Projects match your search."
        : "Loading Core Projects..."
    );

    renderList(
      document.getElementById("externalList"),
      externalProjects,
      state.ready
        ? "No verified External Projects match your search."
        : "Loading Verified External Projects..."
    );
  }

  function showRuntimeError(message) {
    state.ready = true;
    state.projects = [];

    const text =
      '<div class="empty">' + escapeHtml(message) + "</div>";

    const internal = document.getElementById("internalList");
    const external = document.getElementById("externalList");

    if (internal) internal.innerHTML = text;
    if (external) external.innerHTML = text;
  }

  async function loadProjects() {
    if (!window.ALBukhrEnvironment) {
      showRuntimeError("ALBUKHR Environment Core is unavailable.");
      return;
    }

    if (!window.ALBUKHR_SUPABASE) {
      showRuntimeError("ALBUKHR Supabase Core is unavailable.");
      return;
    }

    const network = getNetwork();

    if (network !== "mainnet" && network !== "testnet") {
      showRuntimeError("ALBUKHR environment could not be verified.");
      return;
    }

    const registry =
      window.ALBukhrProjectConfig;

    if (
      !registry ||
      typeof registry.loadRegistry !== "function"
    ) {
      showRuntimeError("ALBUKHR Project Registry is unavailable.");
      return;
    }

    try {
      /*
       * project-config.js uses the authoritative
       * get_public_project_registry RPC with p_network.
       * No direct table query is introduced here.
       */
      const result = await registry.loadRegistry();

      if (!result || result.ok === false) {
        throw new Error(
          clean(result && result.error) ||
          "Project registry could not be loaded."
        );
      }

      const rows = Array.isArray(result.projects)
        ? result.projects
        : [];

      /*
       * Defense in depth:
       * never render a project belonging to another network.
       */
      state.projects = rows.filter(function (project) {
        const projectNetwork = normalize(project.network);

        return (
          projectNetwork === network &&
          (normalizeType(project) === "core" ||
           normalizeType(project) === "external") &&
          (normalizeStatus(project) === "approved" ||
           normalizeStatus(project) === "active")
        );
      });

      state.ready = true;
      render();
    } catch (error) {
      console.error(
        "ALBUKHR Explore Projects: registry load failed.",
        error
      );

      showRuntimeError(
        "Projects are temporarily unavailable. Please try again."
      );
    }
  }

  function bindSearch() {
    const input = document.getElementById("searchInput");

    if (!input) return;

    input.addEventListener("input", function () {
      render();
    });
  }

  function init() {
    bindSearch();
    render();
    loadProjects();
  }

  document.addEventListener("DOMContentLoaded", init);

})(window, document);
