/* ALBUKHR EXTERNAL PROJECT DASHBOARD
 * Mainnet: trusted External Project API adapter.
 * Testnet: existing applicant RPC path retained until a trusted
 * Testnet External Project gateway/schema is provisioned.
 */
(function (window, document) {
  "use strict";

  let user = null;
  let network = null;
  let applications = [];
  let active = "all";
  const $ = (id) => document.getElementById(id);

  function deps() {
    if (!window.ALBukhrEnvironment) throw new Error("ALBUKHR Environment Core is unavailable.");
    if (!window.ALBUKHR_SUPABASE) throw new Error("ALBUKHR Supabase Core is unavailable.");
    if (!window.AlbukhrPageAuthGuard) throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    if (!window.ALBukhrExternalProjectApi) throw new Error("ALBUKHR External Project API is unavailable.");
    if (!window.ALBukhrEnvironment.isKnown()) throw new Error("ALBUKHR environment is not recognized.");
  }

  function net() {
    const value = String(window.ALBukhrEnvironment.getNetwork() || "").trim().toLowerCase();
    if (!["mainnet", "testnet"].includes(value)) throw new Error("Invalid ALBUKHR network.");
    return value;
  }

  function uid() {
    const value = window.AlbukhrPageAuthGuard?.getPiUid?.() || user?.pi_uid || user?.uid;
    if (!value) throw new Error("Authenticated Pi user identity is unavailable.");
    return String(value).trim();
  }

  function norm(value) {
    return String(value || "").toLowerCase().trim().replace(/\s+/g, "_");
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function label(value) {
    const status = norm(value);
    const map = {
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
    return map[status] || status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function editable(value) {
    return ["draft", "needs_revision"].includes(norm(value));
  }

  function statusClass(value) {
    const status = norm(value);
    return ["needs_revision", "revision_requested", "revision", "changes_requested"].includes(status)
      ? "revision_requested"
      : (status || "draft");
  }

  function date(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "—"
      : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(parsed);
  }

  function funding(value, asset) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat("en", { maximumFractionDigits: 7 }).format(amount) + " " + String(asset || "PI").toUpperCase()
      : "—";
  }

  function setStatus(message, type) {
    const element = $("dashboardStatus");
    if (!element) return;
    element.textContent = String(message || "");
    element.className = "dashboard-status" + (type ? " " + type : "");
  }

  function show(stateName) {
    $("applicationsLoading")?.toggleAttribute("hidden", stateName !== "loading");
    $("emptyState")?.toggleAttribute("hidden", stateName !== "empty");
    $("applicationsList")?.toggleAttribute("hidden", stateName !== "list");
    $("dashboardError")?.toggleAttribute("hidden", stateName !== "error");
  }

  function authUI() {
    const username = user?.username || user?.pi_username || "ALBUKHR User";
    if ($("networkIndicator")) $("networkIndicator").textContent = network.toUpperCase();
    if ($("authUsername")) $("authUsername").textContent = username;
    if ($("authNetwork")) $("authNetwork").textContent = "Authenticated with Pi • " + network.toUpperCase();
    if ($("authAvatar")) $("authAvatar").textContent = username.charAt(0).toUpperCase();
  }

  async function testList() {
    const response = await window.ALBUKHR_SUPABASE.rpc(
      "get_my_external_project_applications",
      { p_pi_uid: uid(), p_network: network }
    );
    if (response.error) throw response.error;
    return Array.isArray(response.data) ? response.data : [];
  }

  async function load() {
    const button = $("refreshApplicationsButton");
    try {
      show("loading");
      if (button) {
        button.disabled = true;
        button.textContent = "Loading...";
      }
      setStatus("Loading your secure external project applications...");

      applications = network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.listApplications()
        : await testList();
      if (!Array.isArray(applications)) {
        throw new Error("Invalid application data returned by the server.");
      }

      applications.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      render();
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL PROJECT DASHBOARD]", error);
      if ($("dashboardErrorMessage")) {
        $("dashboardErrorMessage").textContent = error?.message || "Unable to load external project applications.";
      }
      show("error");
      setStatus(error?.message || "Unable to load applications.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Refresh";
      }
    }
  }

  function filtered() {
    if (active === "all") return applications;
    if (active === "revision_requested") {
      return applications.filter((item) =>
        ["needs_revision", "revision_requested", "revision", "changes_requested"].includes(norm(item.status))
      );
    }
    return applications.filter((item) => norm(item.status) === active);
  }

  /* Logo rendering is presentation-only and uses the trusted Mainnet API. */
  function safeLogoUrl(value) {
    try {
      const url = new URL(String(value || ""), window.location.href);
      return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  async function decorateCardLogo(app, cardElement) {
    if (network !== "mainnet" || typeof window.ALBukhrExternalProjectApi?.getLogo !== "function") return;
    const id = String(app?.id || "").trim();
    if (!id || !cardElement?.isConnected) return;

    const header = cardElement.querySelector(".application-card-header");
    if (!header || header.querySelector(".application-card-logo")) return;

    try {
      const response = await window.ALBukhrExternalProjectApi.getLogo(id);
      const logo = Array.isArray(response) ? response[0] : (response?.data || response);
      const source = safeLogoUrl(logo?.logo_url);
      if (!source || !cardElement.isConnected || header.querySelector(".application-card-logo")) return;

      const image = document.createElement("img");
      image.className = "application-card-logo";
      image.src = source;
      image.alt = String(app.project_name || "External Project") + " logo";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => image.remove(), { once: true });
      header.prepend(image);
    } catch (error) {
      console.warn("[ALBUKHR EXTERNAL PROJECT DASHBOARD] Logo load failed:", error);
    }
  }

  function summary() {
    const counts = {
      totalApplications: applications.length,
      draftApplications: applications.filter((item) => norm(item.status) === "draft").length,
      reviewApplications: applications.filter((item) => ["submitted", "under_review"].includes(norm(item.status))).length,
      approvedApplications: applications.filter((item) => norm(item.status) === "approved").length
    };
    Object.entries(counts).forEach(([id, value]) => {
      if ($(id)) $(id).textContent = value;
    });
  }

  function card(app) {
    const id = String(app.id || "");
    const status = norm(app.status);
    const canEdit = editable(status);
    const element = document.createElement("article");
    element.className = "application-card";
    element.innerHTML = `
      <div class="application-card-header">
        <div class="application-card-main">
          <h3 class="application-name">${esc(app.project_name || "Unnamed Project")}</h3>
          <div class="application-business">${esc(app.business_name || "Business information unavailable")}</div>
          <span class="application-code">${esc(app.project_code || app.application_code || "—")}</span>
        </div>
        <span class="application-status status-${esc(statusClass(status))}">${esc(label(status))}</span>
      </div>
      <div class="application-meta">
        <div class="application-meta-item"><span class="application-meta-label">Funding</span><strong class="application-meta-value">${esc(funding(app.funding_required, app.funding_asset))}</strong></div>
        <div class="application-meta-item"><span class="application-meta-label">Duration</span><strong class="application-meta-value">${esc(app.project_duration_days ? app.project_duration_days + " days" : "—")}</strong></div>
        <div class="application-meta-item"><span class="application-meta-label">Industry</span><strong class="application-meta-value">${esc(app.industry || "—")}</strong></div>
      </div>
      <div class="application-card-footer">
        <span class="application-date">Created ${esc(date(app.created_at))}</span>
        <div class="application-actions">
          <button type="button" class="application-action" data-application-id="${esc(id)}" data-open-mode="details">Details</button>
          <button type="button" class="application-action ${canEdit ? "primary" : ""}" data-application-id="${esc(id)}" data-open-mode="${canEdit ? "edit" : "details"}">${canEdit ? "Edit" : "View"}</button>
        </div>
      </div>
    `;
    return element;
  }

  function render() {
    summary();
    const list = $("applicationsList");
    const rows = filtered();
    if ($("applicationCountText")) {
      $("applicationCountText").textContent = `${rows.length} matching application${rows.length === 1 ? "" : "s"}.`;
    }

    document.querySelectorAll(".status-filter").forEach((button) => {
      button.classList.toggle("active", String(button.dataset.status || "all") === active);
    });

    if (!applications.length) {
      show("empty");
      setStatus("You have not created any external project applications on " + network.toUpperCase() + ".", "success");
      return;
    }

    show("list");
    list.innerHTML = "";
    if (!rows.length) {
      list.innerHTML = '<section class="empty-state"><h2>No Matching Applications</h2><p>No application matches the selected status.</p></section>';
      return;
    }

    rows.forEach((app) => {
      const element = card(app);
      list.appendChild(element);
      void decorateCardLogo(app, element);
    });
  }

  function bind() {
    $("createProjectButton")?.addEventListener("click", () => location.assign("external-create.html"));
    $("emptyCreateProjectButton")?.addEventListener("click", () => location.assign("external-create.html"));
    $("refreshApplicationsButton")?.addEventListener("click", load);
    $("retryApplicationsButton")?.addEventListener("click", load);

    $("statusFilters")?.addEventListener("click", (event) => {
      const button = event.target.closest(".status-filter");
      if (!button) return;
      active = String(button.dataset.status || "all").toLowerCase();
      render();
    });

    $("applicationsList")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-application-id]");
      if (!button) return;
      const applicationId = encodeURIComponent(button.dataset.applicationId || "");
      if (!applicationId) return;

      if (button.dataset.openMode === "edit") {
        location.assign("external-create.html?application_id=" + applicationId);
      } else {
        location.assign("external-project-detail.html?application_id=" + applicationId);
      }
    });
  }

  async function init() {
    try {
      deps();
      network = net();
      if ($("networkIndicator")) $("networkIndicator").textContent = network.toUpperCase();
      user = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!user) return;
      authUI();
      bind();
      await load();
    } catch (error) {
      console.error(error);
      if ($("dashboardErrorMessage")) {
        $("dashboardErrorMessage").textContent = error?.message || "Application unavailable.";
      }
      show("error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.ALBukhrExternalProjectDashboard = Object.freeze({ reload: load });
})(window, document);
