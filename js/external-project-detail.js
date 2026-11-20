/* ALBUKHR EXTERNAL PROJECT DETAIL ENGINE
 * Mainnet applicant operations use the trusted API adapter.
 * Testnet keeps the existing applicant RPC contract until its trusted
 * External Project gateway is provisioned.
 * Page Auth Guard is intentionally not modified.
 */
(function (window, document) {
  "use strict";

  const state = {
    applicationId: null,
    user: null,
    network: null,
    application: null,
    team: [],
    loading: false,
    submitting: false,
    savingTeam: false,
    teamLoadFailed: false
  };

  const $ = (id) => document.getElementById(id);
  const e = {
    name: $("projectName"),
    code: $("applicationCode"),
    network: $("applicationNetwork"),
    projectCode: $("projectCode"),
    status: $("applicationStatus"),
    message: $("detailStatus"),
    content: $("detailContent"),
    loading: $("detailLoading"),
    statusText: $("reviewStatusText"),
    reviewStatusTitle: $("reviewStatusTitle"),
    project: $("projectInformation"),
    business: $("businessInformation"),
    funding: $("fundingInformation"),
    description: $("projectDescription"),
    team: $("projectTeam"),
    teamEditor: $("teamEditor"),
    teamEditorList: $("teamEditorList"),
    teamStatus: $("teamEditorStatus"),
    history: $("reviewHistory"),
    edit: $("editApplicationButton"),
    submit: $("submitApplicationButton"),
    dashboard: $("dashboardButton"),
    retry: $("retryButton"),
    error: $("detailError"),
    errorMessage: $("detailErrorMessage"),
    idDisplay: $("applicationIdDisplay"),
    avatar: $("authAvatar"),
    username: $("authUsername"),
    authNetwork: $("authNetwork"),
    networkIndicator: $("networkIndicator"),
    addTeam: $("addTeamMemberButton"),
    saveTeam: $("saveTeamButton"),
    fundingWorkspace: $("fundingWorkspaceButton")
  };

  function deps() {
    if (!window.ALBukhrEnvironment) {
      throw new Error("ALBUKHR Environment Core is unavailable.");
    }
    if (!window.ALBUKHR_SUPABASE) {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    if (!window.AlbukhrPageAuthGuard) {
      throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    }
    if (!window.ALBukhrExternalProjectApi) {
      throw new Error("ALBUKHR External Project API is unavailable.");
    }
    if (!window.ALBukhrEnvironment.isKnown()) {
      throw new Error("ALBUKHR environment is not recognized.");
    }
  }

  function net() {
    const value = String(
      window.ALBukhrEnvironment.getNetwork() || ""
    ).trim().toLowerCase();
    if (!["mainnet", "testnet"].includes(value)) {
      throw new Error("Invalid ALBUKHR network.");
    }
    return value;
  }

  function uid() {
    const value =
      window.AlbukhrPageAuthGuard?.getPiUid?.() ||
      state.user?.pi_uid ||
      state.user?.uid;
    if (!value) {
      throw new Error("Authenticated Pi user identity is unavailable.");
    }
    return String(value).trim();
  }

  function norm(value) {
    return String(value || "draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function editable(value) {
    return ["draft", "needs_revision"].includes(norm(value));
  }

  function safe(value) {
    return Array.isArray(value) ? value : [];
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function st(value) {
    return String(value || "draft")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function date(value) {
    if (!value) return "—";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
  }

  function money(value, asset) {
    const amount = Number(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat("en", { maximumFractionDigits: 7 }).format(amount) +
          " " + String(asset || "PI").toUpperCase()
      : "—";
  }

  function msg(value, type) {
    if (!e.message) return;
    e.message.hidden = !value;
    e.message.textContent = String(value || "");
    e.message.dataset.type = type || "info";
  }

  function loadState(on, label) {
    state.loading = Boolean(on);
    if (e.loading) {
      e.loading.hidden = !on;
      if (on && label) {
        e.loading.querySelector("strong")?.replaceChildren(
          document.createTextNode(label)
        );
      }
    }
    if (on && e.content) e.content.hidden = true;
  }

  function fail(error) {
    if (e.error) e.error.hidden = false;
    if (e.errorMessage) {
      e.errorMessage.textContent =
        error?.message || "Unable to load the external project application.";
    }
    if (e.loading) e.loading.hidden = true;
    if (e.content) e.content.hidden = true;
  }

  async function rpc(name, params) {
    const response = await window.ALBUKHR_SUPABASE.rpc(name, params);
    if (response.error) throw response.error;
    return response.data;
  }

  function params(extra) {
    return Object.assign(
      {
        p_application_id: state.applicationId,
        p_pi_uid: uid(),
        p_network: state.network
      },
      extra || {}
    );
  }

  async function application() {
    const data = state.network === "mainnet"
      ? await window.ALBukhrExternalProjectApi.getApplication(state.applicationId)
      : await rpc("get_my_external_project_detail", params());
    const row = safe(data)[0];
    if (!row) {
      throw new Error("Application was not found or access is denied.");
    }
    if (String(row.network || "").toLowerCase() !== state.network) {
      throw new Error("Network isolation check failed.");
    }
    return row;
  }

  async function team() {
    return safe(
      state.network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.getTeam(state.applicationId)
        : await rpc("get_my_external_project_team", params())
    );
  }

  async function docs() {
    return safe(
      state.network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.getDocuments(state.applicationId)
        : await rpc("get_my_external_project_documents", params())
    );
  }

  async function reviews() {
    return safe(
      state.network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.getReviews(state.applicationId)
        : await rpc("get_my_external_project_reviews", params())
    );
  }

  async function history() {
    return safe(
      state.network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.getReviewHistory(state.applicationId)
        : await rpc("get_my_external_project_review_history", params())
    );
  }

  async function audit() {
    return safe(
      state.network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.getAuditLog(state.applicationId)
        : await rpc("get_my_external_project_audit_log", params())
    );
  }

  function grid(container, fields) {
    if (!container) return;
    container.innerHTML = "";
    fields.forEach((field) => {
      if (!field) return;
      const wrapper = document.createElement("div");
      const label = document.createElement("span");
      const value = document.createElement("strong");
      wrapper.className = "detail-field";
      label.textContent = field.label;
      value.textContent =
        field.value == null || field.value === "" ? "—" : String(field.value);
      wrapper.append(label, value);
      container.appendChild(wrapper);
    });
  }

  function header() {
    const app = state.application;
    if (!app) return;
    const status = norm(app.status);

    if (e.name) e.name.textContent = app.project_name || app.business_name || "External Project";
    if (e.code) e.code.textContent = app.application_code || "—";
    if (e.projectCode) e.projectCode.textContent = app.project_code || "—";
    if (e.network) e.network.textContent = String(app.network || state.network).toUpperCase();
    if (e.status) {
      e.status.textContent = st(status);
      e.status.className = "detail-status status-" + status;
    }
    if (e.reviewStatusTitle) e.reviewStatusTitle.textContent = st(status);
    if (e.statusText) {
      e.statusText.textContent = ({
        draft: "This application is still a draft. Continue building it before submission.",
        needs_revision: "ALBUKHR requested changes. Update the application, then review your team and documents before resubmitting.",
        submitted: "This application has been submitted and is awaiting ALBUKHR review.",
        under_review: "This application is currently under administrative review.",
        approved: "This application has been approved through the ALBUKHR review framework.",
        rejected: "This application was not approved. Review history may contain the decision information."
      })[status] || "Application status is managed by the ALBUKHR backend.";
    }
    if (e.idDisplay) e.idDisplay.textContent = state.applicationId;

    const username = state.user?.username || "ALBUKHR User";
    if (e.username) e.username.textContent = username;
    if (e.avatar) e.avatar.textContent = username.charAt(0).toUpperCase();
    if (e.authNetwork) {
      e.authNetwork.textContent = "Authenticated with Pi • " + state.network.toUpperCase();
    }
    if (e.networkIndicator) e.networkIndicator.textContent = state.network.toUpperCase();
  }

  function info() {
    const app = state.application;
    grid(e.project, [
      { label: "Project Name", value: app.project_name },
      { label: "Application Code", value: app.application_code },
      { label: "Project Code", value: app.project_code },
      { label: "Project Slug", value: app.project_slug },
      { label: "Industry", value: app.industry },
      { label: "Category", value: app.category },
      { label: "Project Duration", value: app.project_duration_days ? app.project_duration_days + " days" : null },
      { label: "Created", value: date(app.created_at) }
    ]);

    if (e.description) {
      e.description.textContent = app.project_description || "No project description provided.";
    }

    grid(e.business, [
      { label: "Business Name", value: app.business_name },
      { label: "Registration Number", value: app.business_registration_number },
      { label: "Country", value: app.country },
      { label: "State", value: app.state },
      { label: "City", value: app.city },
      { label: "Business Address", value: app.business_address },
      { label: "Website", value: app.website },
      { label: "Contact Email", value: app.contact_email },
      { label: "Contact Phone", value: app.contact_phone },
      { label: "Pi Wallet", value: app.pi_wallet }
    ]);

    grid(e.funding, [
      { label: "Funding Required", value: money(app.funding_required, app.funding_asset) },
      { label: "Funding Asset", value: app.funding_asset },
      { label: "Investment Model", value: app.investment_model },
      { label: "Project Duration", value: app.project_duration_days ? app.project_duration_days + " days" : null }
    ]);
  }

  function addRow(member) {
    const item = member || {};
    if (!e.teamEditorList) return;

    const row = document.createElement("div");
    row.className = "team-editor-row";
    row.innerHTML = `
      <div class="team-editor-grid">
        <label>Full Name<input data-field="full_name" value="${esc(item.full_name || "")}" required></label>
        <label>Role<input data-field="role" value="${esc(item.role || "")}" required></label>
        <label>Title<input data-field="title" value="${esc(item.title || "")}"></label>
        <label>Email<input data-field="email" type="email" value="${esc(item.email || "")}"></label>
        <label class="team-editor-wide">Bio<textarea data-field="bio" rows="3">${esc(item.bio || "")}</textarea></label>
        <label class="team-primary"><input data-field="is_primary_contact" type="checkbox" ${item.is_primary_contact ? "checked" : ""}> Primary contact</label>
      </div>
      <button type="button" class="ghost-action team-remove-button">Remove</button>
    `;
    row.querySelector(".team-remove-button")?.addEventListener("click", () => row.remove());
    e.teamEditorList.appendChild(row);
  }

  function renderTeam(list) {
    if (!e.team) return;
    if (!list.length) {
      e.team.innerHTML = '<div class="detail-empty">No project team members registered.</div>';
    } else {
      e.team.innerHTML = list.map((member) => `
        <div class="detail-row">
          <strong>${esc(member.full_name)}</strong>
          <span>${esc(member.role)}${member.title ? " • " + esc(member.title) : ""}</span>
          ${member.email ? `<p>${esc(member.email)}</p>` : ""}
          ${member.is_primary_contact ? "<p>Primary Contact</p>" : ""}
          ${member.bio ? `<p>${esc(member.bio)}</p>` : ""}
        </div>
      `).join("");
    }

    if (e.teamEditor) {
      const canEdit = editable(state.application?.status) && !state.teamLoadFailed;
      e.teamEditor.hidden = !canEdit;
      if (canEdit) {
        e.teamEditorList.innerHTML = "";
        (list.length ? list : [{ is_primary_contact: true }]).forEach(addRow);
      }
    }
  }

  async function saveTeam() {
    if (state.savingTeam || !editable(state.application?.status)) return;
    state.savingTeam = true;

    try {
      const rows = [
        ...(e.teamEditorList?.querySelectorAll(".team-editor-row") || [])
      ];
      const list = rows.map((row) => ({
        full_name: row.querySelector('[data-field="full_name"]')?.value.trim() || "",
        email: row.querySelector('[data-field="email"]')?.value.trim() || "",
        role: row.querySelector('[data-field="role"]')?.value.trim() || "",
        title: row.querySelector('[data-field="title"]')?.value.trim() || "",
        bio: row.querySelector('[data-field="bio"]')?.value.trim() || "",
        is_primary_contact: Boolean(row.querySelector('[data-field="is_primary_contact"]')?.checked)
      }));

      if (!list.length) throw new Error("Add at least one team member.");
      if (list.some((member) => !member.full_name || !member.role)) {
        throw new Error("Each team member must have a full name and role.");
      }
      if (list.filter((member) => member.is_primary_contact).length > 1) {
        throw new Error("Only one primary contact is allowed.");
      }

      if (e.saveTeam) {
        e.saveTeam.disabled = true;
        e.saveTeam.textContent = "Saving...";
      }

      if (state.network === "mainnet") {
        await window.ALBukhrExternalProjectApi.replaceTeam(state.applicationId, list);
      } else {
        const result = await rpc("replace_my_external_project_team", params({ p_team: list }));
        if (result !== true) throw new Error("Team update was not accepted.");
      }

      if (e.teamStatus) e.teamStatus.textContent = "Team saved successfully.";
      await loadPageData();
    } catch (error) {
      if (e.teamStatus) e.teamStatus.textContent = error?.message || "Unable to save team.";
    } finally {
      state.savingTeam = false;
      if (e.saveTeam) {
        e.saveTeam.disabled = false;
        e.saveTeam.textContent = "Save Team";
      }
    }
  }

  function renderHistory(reviewsList, historyList, auditList) {
    if (!e.history) return;
    const events = [];

    reviewsList.forEach((item) => events.push({
      type: "Review",
      title: item.decision || item.review_type || "Review Activity",
      msg: item.comments || "",
      at: item.created_at
    }));
    historyList.forEach((item) => events.push({
      type: item.event_type || "Review History",
      title: item.decision || "Review Activity",
      msg: item.comments || "",
      at: item.created_at
    }));
    auditList.forEach((item) => events.push({
      type: "System",
      title: item.action || "Application Activity",
      msg: typeof item.details === "string"
        ? item.details
        : (item.details ? JSON.stringify(item.details) : ""),
      at: item.created_at
    }));

    events.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    e.history.innerHTML = events.length
      ? events.map((item) => `
          <div class="detail-row">
            <strong>${esc(st(item.title))}</strong>
            <span>${esc(item.type)} • ${esc(date(item.at))}</span>
            ${item.msg ? `<p>${esc(item.msg)}</p>` : ""}
          </div>
        `).join("")
      : '<div class="detail-empty">No review activity yet.</div>';
  }

  function actions() {
    const canEdit = editable(state.application?.status);
    const fundingEligible =
      state.network === "mainnet" &&
      ["approved", "converted"].includes(norm(state.application?.status));

    if (e.edit) e.edit.hidden = !canEdit;
    if (e.submit) e.submit.hidden = !canEdit;
    if (e.addTeam) e.addTeam.disabled = !canEdit;
    if (e.saveTeam) e.saveTeam.disabled = !canEdit;

    if (e.fundingWorkspace) {
      e.fundingWorkspace.hidden = !fundingEligible;
      e.fundingWorkspace.disabled = !fundingEligible;
    }
  }

  async function submit() {
    if (state.submitting || !editable(state.application?.status)) return;
    if (!window.confirm("Submit this external project application for ALBUKHR review?")) return;

    state.submitting = true;
    if (e.submit) {
      e.submit.disabled = true;
      e.submit.textContent = "Submitting...";
    }

    try {
      const result = state.network === "mainnet"
        ? await window.ALBukhrExternalProjectApi.submitApplication(state.applicationId)
        : await rpc("submit_my_external_project_application", params());
      if (result !== true) throw new Error("Application submission was not accepted.");
      msg("Application submitted successfully.", "success");
      await loadPageData();
    } catch (error) {
      msg("❌ " + (error?.message || "Unable to submit the application."), "error");
    } finally {
      state.submitting = false;
      if (e.submit) {
        e.submit.disabled = false;
        e.submit.textContent = "Submit Application";
      }
      actions();
    }
  }

  async function loadPageData() {
    loadState(true, "Loading application...");
    try {
      state.application = await application();
      const results = await Promise.allSettled([
        team(),
        docs(),
        reviews(),
        history(),
        audit()
      ]);

      state.teamLoadFailed = results[0].status !== "fulfilled";
      state.team = results[0].status === "fulfilled" ? results[0].value : [];
      const reviewRows = results[2].status === "fulfilled" ? results[2].value : [];
      const historyRows = results[3].status === "fulfilled" ? results[3].value : [];
      const auditRows = results[4].status === "fulfilled" ? results[4].value : [];

      results
        .filter((item) => item.status === "rejected")
        .forEach((item) => console.warn("External project supplementary data failed:", item.reason));

      header();
      info();
      renderTeam(state.team);
      actions();
      renderHistory(reviewRows, historyRows, auditRows);
      loadState(false);
      if (e.content) e.content.hidden = false;

      window.dispatchEvent(new CustomEvent("albukhr:external-project-detail-ready", {
        detail: {
          application: state.application,
          applicationId: state.applicationId,
          network: state.network
        }
      }));
    } catch (error) {
      loadState(false);
      fail(error);
      throw error;
    }
  }

  function bind() {
    e.edit?.addEventListener("click", () => {
      location.assign("external-create.html?application_id=" + encodeURIComponent(state.applicationId));
    });
    e.submit?.addEventListener("click", submit);
    e.dashboard?.addEventListener("click", () => location.assign("external-project-dashboard.html"));
    e.retry?.addEventListener("click", () => loadPageData().catch(() => {}));
    e.addTeam?.addEventListener("click", () => addRow());
    e.saveTeam?.addEventListener("click", saveTeam);
    e.fundingWorkspace?.addEventListener("click", () => {
      const eligible =
        state.network === "mainnet" &&
        ["approved", "converted"].includes(norm(state.application?.status));
      if (!eligible || !state.applicationId) return;
      location.assign(
        "external-project-funding.html?application_id=" +
        encodeURIComponent(state.applicationId)
      );
    });
  }

  async function init() {
    try {
      deps();
      state.applicationId = new URLSearchParams(location.search).get("application_id");
      if (!state.applicationId) throw new Error("Application ID is missing.");

      state.network = net();
      if (e.networkIndicator) e.networkIndicator.textContent = state.network.toUpperCase();
      state.user = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!state.user) return;

      bind();
      await loadPageData();
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL PROJECT DETAIL]", error);
      fail(error);
    }
  }

  window.ALBukhrExternalProjectDetail = Object.freeze({
    getState: () => Object.freeze({ ...state }),
    reload: () => loadPageData()
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})(window, document);
