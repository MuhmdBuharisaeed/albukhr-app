/* =========================================================
   ALBUKHR EXTERNAL PROJECT DASHBOARD
   Corrected canonical status handling.
========================================================= */

(function (window, document) {
  "use strict";

  let currentUser = null;
  let currentNetwork = null;
  let applications = [];
  let activeStatus = "all";

  function byId(id) { return document.getElementById(id); }

  function requireDependencies() {
    if (!window.ALBukhrEnvironment) throw new Error("ALBUKHR Environment Core is unavailable.");
    if (!window.ALBUKHR_SUPABASE) throw new Error("ALBUKHR Supabase Core is unavailable.");
    if (!window.AlbukhrPageAuthGuard) throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    if (!window.ALBukhrEnvironment.isKnown()) throw new Error("ALBUKHR environment is not recognized.");
  }

  function getNetwork() {
    const network = String(window.ALBukhrEnvironment.getNetwork() || "").trim().toLowerCase();
    if (!['mainnet','testnet'].includes(network)) throw new Error("Invalid ALBUKHR network.");
    return network;
  }

  function getPiUid() {
    const guardUid = typeof window.AlbukhrPageAuthGuard?.getPiUid === "function"
      ? window.AlbukhrPageAuthGuard.getPiUid() : null;
    const value = guardUid || currentUser?.pi_uid || currentUser?.uid || null;
    if (!value) throw new Error("Authenticated Pi user identity is unavailable.");
    return String(value).trim();
  }

  function normalizeStatus(status) {
    return String(status || "").trim().toLowerCase().replace(/\s+/g, "_");
  }

  function statusLabel(status) {
    const normalized = normalizeStatus(status);
    const labels = {
      draft: "Draft",
      submitted: "Submitted",
      under_review: "Under Review",
      needs_revision: "Revision Required",
      revision_requested: "Revision Required",
      revision: "Revision Required",
      changes_requested: "Revision Required",
      approved: "Approved",
      rejected: "Rejected",
      converted: "Converted"
    };
    return labels[normalized] || normalized.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function statusClass(status) {
    const normalized = normalizeStatus(status);
    if (["needs_revision", "revision_requested", "revision", "changes_requested"].includes(normalized)) {
      return "revision_requested";
    }
    return normalized || "draft";
  }

  function isEditableStatus(status) {
    return ["draft", "needs_revision"].includes(normalizeStatus(status));
  }

  function setDashboardStatus(message, type) {
    const status = byId("dashboardStatus");
    if (!status) return;
    status.textContent = String(message || "");
    status.className = "dashboard-status" + (type ? " " + type : "");
  }

  function showLoading() {
    const loading = byId("applicationsLoading");
    const empty = byId("emptyState");
    const list = byId("applicationsList");
    const error = byId("dashboardError");
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    if (list) { list.hidden = true; list.innerHTML = ""; }
    if (error) error.hidden = true;
  }

  function showEmpty() {
    const loading = byId("applicationsLoading");
    const empty = byId("emptyState");
    const list = byId("applicationsList");
    const error = byId("dashboardError");
    if (loading) loading.hidden = true;
    if (empty) empty.hidden = false;
    if (list) { list.hidden = true; list.innerHTML = ""; }
    if (error) error.hidden = true;
  }

  function showApplications() {
    const loading = byId("applicationsLoading");
    const empty = byId("emptyState");
    const list = byId("applicationsList");
    const error = byId("dashboardError");
    if (loading) loading.hidden = true;
    if (empty) empty.hidden = true;
    if (list) list.hidden = false;
    if (error) error.hidden = true;
  }

  function showError(message) {
    const loading = byId("applicationsLoading");
    const empty = byId("emptyState");
    const list = byId("applicationsList");
    const error = byId("dashboardError");
    const errorMessage = byId("dashboardErrorMessage");
    if (loading) loading.hidden = true;
    if (empty) empty.hidden = true;
    if (list) list.hidden = true;
    if (error) error.hidden = false;
    if (errorMessage) errorMessage.textContent = String(message || "An unexpected error occurred.");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(date);
  }

  function formatFunding(amount, asset) {
    const number = Number(amount);
    if (!Number.isFinite(number)) return "—";
    const formatted = new Intl.NumberFormat("en", { maximumFractionDigits: 7 }).format(number);
    return formatted + " " + String(asset || "PI").trim().toUpperCase();
  }

  function updateSummary() {
    const total = applications.length;
    const drafts = applications.filter(a => normalizeStatus(a.status) === "draft").length;
    const underReview = applications.filter(a => ["submitted", "under_review"].includes(normalizeStatus(a.status))).length;
    const revisions = applications.filter(a => ["needs_revision", "revision_requested", "revision", "changes_requested"].includes(normalizeStatus(a.status))).length;
    const approved = applications.filter(a => normalizeStatus(a.status) === "approved").length;

    const mapping = {
      totalApplications: total,
      draftApplications: drafts,
      reviewApplications: underReview,
      approvedApplications: approved,
      revisionApplications: revisions
    };

    Object.entries(mapping).forEach(([id, value]) => {
      const el = byId(id);
      if (el) el.textContent = value;
    });
  }

  function getFilteredApplications() {
    if (activeStatus === "all") return applications;
    if (activeStatus === "revision_requested") {
      return applications.filter(a => ["needs_revision", "revision_requested", "revision", "changes_requested"].includes(normalizeStatus(a.status)));
    }
    return applications.filter(a => normalizeStatus(a.status) === activeStatus);
  }

  function updateFilterUI() {
    document.querySelectorAll(".status-filter").forEach(button => {
      const status = String(button.dataset.status || "all").trim().toLowerCase();
      button.classList.toggle("active", status === activeStatus);
    });
  }

  function updateApplicationCount() {
    const countElement = byId("applicationCountText");
    if (!countElement) return;
    const total = applications.length;
    const filtered = getFilteredApplications();
    if (total === 0) {
      countElement.textContent = "No applications found on this network.";
    } else if (activeStatus === "all") {
      countElement.textContent = total === 1 ? "1 application on this network." : total + " applications on this network.";
    } else {
      countElement.textContent = filtered.length === 1 ? "1 matching application." : filtered.length + " matching applications.";
    }
  }

  function createApplicationCard(application) {
    const card = document.createElement("article");
    card.className = "application-card";

    const status = normalizeStatus(application.status);
    const id = String(application.id || "");
    const editable = isEditableStatus(status);
    const projectName = application.project_name || "Unnamed Project";
    const businessName = application.business_name || "Business information unavailable";
    const projectCode = application.project_code || application.application_code || "—";
    const funding = formatFunding(application.funding_required, application.funding_asset);
    const duration = application.project_duration_days ? application.project_duration_days + " days" : "—";
    const created = formatDate(application.created_at);

    card.innerHTML = `
      <div class="application-card-header">
        <div class="application-card-main">
          <h3 class="application-name">${escapeHtml(projectName)}</h3>
          <div class="application-business">${escapeHtml(businessName)}</div>
          <span class="application-code">${escapeHtml(projectCode)}</span>
        </div>
        <span class="application-status status-${escapeHtml(statusClass(status))}">
          ${escapeHtml(statusLabel(status))}
        </span>
      </div>
      <div class="application-meta">
        <div class="application-meta-item"><span class="application-meta-label">Funding</span><strong class="application-meta-value">${escapeHtml(funding)}</strong></div>
        <div class="application-meta-item"><span class="application-meta-label">Duration</span><strong class="application-meta-value">${escapeHtml(duration)}</strong></div>
        <div class="application-meta-item"><span class="application-meta-label">Industry</span><strong class="application-meta-value">${escapeHtml(application.industry || "—")}</strong></div>
      </div>
      <div class="application-card-footer">
        <span class="application-date">Created ${escapeHtml(created)}</span>
        <div class="application-actions">
          <button type="button" class="application-action" data-action="view" data-application-id="${escapeHtml(id)}">Details</button>
          <button type="button" class="application-action ${editable ? "primary" : ""}" data-action="${editable ? "edit" : "view"}" data-application-id="${escapeHtml(id)}">
            ${editable ? "Edit" : "View"}
          </button>
        </div>
      </div>
    `;

    return card;
  }

  function renderApplications() {
    const list = byId("applicationsList");
    if (!list) return;

    updateSummary();
    updateApplicationCount();
    const filtered = getFilteredApplications();
    list.innerHTML = "";

    if (!applications.length) {
      showEmpty();
      setDashboardStatus("You have not created any external project applications on " + currentNetwork.toUpperCase() + ".", "success");
      return;
    }

    if (!filtered.length) {
      showApplications();
      list.innerHTML = `<section class="empty-state"><div class="empty-logo"><span class="empty-logo-mark">A</span></div><h2>No Matching Applications</h2><p>No applications match the selected status filter.</p></section>`;
      setDashboardStatus("Applications loaded securely.", "success");
      return;
    }

    filtered.forEach(application => list.appendChild(createApplicationCard(application)));
    showApplications();
    setDashboardStatus(
      filtered.length + " application" + (filtered.length === 1 ? "" : "s") + " loaded securely from " + currentNetwork.toUpperCase() + ".",
      "success"
    );
  }

  async function loadApplications() {
    const refreshButton = byId("refreshApplicationsButton");
    try {
      showLoading();
      if (refreshButton) { refreshButton.disabled = true; refreshButton.textContent = "Loading..."; }
      setDashboardStatus("Loading your secure external project applications...");

      const { data, error } = await window.ALBUKHR_SUPABASE.rpc("get_my_external_project_applications", {
        p_pi_uid: getPiUid(),
        p_network: getNetwork()
      });

      if (error) throw error;
      if (data != null && !Array.isArray(data)) throw new Error("Invalid application data returned by the server.");

      applications = Array.isArray(data) ? data : [];
      applications.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      renderApplications();
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL DASHBOARD]", error);
      applications = [];
      updateSummary();
      updateApplicationCount();
      const message = error?.message || "Unknown error";
      setDashboardStatus("Unable to load applications: " + message, "error");
      showError(message);
    } finally {
      if (refreshButton) { refreshButton.disabled = false; refreshButton.textContent = "Refresh"; }
    }
  }

  function openCreateProject() {
    window.location.href = "external-create.html";
  }

  function openApplication(applicationId, action) {
    if (!applicationId) return;
    const normalizedAction = String(action || "").toLowerCase();
    const target = normalizedAction === "edit"
      ? "external-create.html?application_id=" + encodeURIComponent(applicationId)
      : "external-project-detail.html?application_id=" + encodeURIComponent(applicationId);
    window.location.href = target;
  }

  function setupApplicationActions() {
    const list = byId("applicationsList");
    if (!list) return;
    list.addEventListener("click", function (event) {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      openApplication(button.dataset.applicationId, button.dataset.action);
    });
  }

  function setupFilters() {
    document.querySelectorAll(".status-filter").forEach(button => {
      button.addEventListener("click", function () {
        activeStatus = String(button.dataset.status || "all").trim().toLowerCase() || "all";
        updateFilterUI();
        renderApplications();
      });
    });
  }

  function setupButtons() {
    const createButton = byId("createProjectButton");
    if (createButton) createButton.addEventListener("click", openCreateProject);

    const emptyCreateButton = byId("emptyCreateProjectButton");
    if (emptyCreateButton) emptyCreateButton.addEventListener("click", openCreateProject);

    const refreshButton = byId("refreshApplicationsButton");
    if (refreshButton) refreshButton.addEventListener("click", loadApplications);

    const retryButton = byId("retryApplicationsButton");
    if (retryButton) retryButton.addEventListener("click", loadApplications);

    const backButton = byId("backButton");
    if (backButton) backButton.addEventListener("click", () => window.history.back());
  }

  function updateAuthenticationUI() {
    const username = currentUser?.username || "ALBUKHR User";
    const authUsername = byId("authUsername");
    const authNetwork = byId("authNetwork");
    const authAvatar = byId("authAvatar");
    const networkIndicator = byId("networkIndicator");
    if (authUsername) authUsername.textContent = username;
    if (authNetwork) authNetwork.textContent = "Authenticated with Pi • " + currentNetwork.toUpperCase();
    if (authAvatar) authAvatar.textContent = username.charAt(0).toUpperCase();
    if (networkIndicator) networkIndicator.textContent = currentNetwork.toUpperCase();
  }

  async function initialize() {
    try {
      requireDependencies();
      setDashboardStatus("Verifying secure ALBUKHR access...");
      currentUser = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!currentUser) return;
      currentNetwork = getNetwork();
      updateAuthenticationUI();
      setupButtons();
      setupFilters();
      setupApplicationActions();
      updateFilterUI();
      await loadApplications();
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL DASHBOARD INIT]", error);
      const message = error?.message || "Unknown error";
      setDashboardStatus("Dashboard unavailable: " + message, "error");
      showError(message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window, document);
