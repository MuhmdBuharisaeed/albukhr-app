/* ALBUKHR External Project Owner Amendments — Mainnet v1
 * Owner requests contact/team changes; nothing is applied until AAL2 Admin approval.
 * Pi identity/network/owner IDs are never supplied as authority by the browser.
 */
(function (window, document) {
  "use strict";

  const MAINNET = "mainnet";
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const state = { applicationId: "", application: null, team: [], requests: [], saving: false };
  const $ = (id) => document.getElementById(id);

  function clean(value) { return String(value == null ? "" : value).trim(); }
  function asRows(value) { return Array.isArray(value) ? value : []; }
  function setStatus(message, type) {
    const el = $("ownerAmendmentsStatus");
    if (!el) return;
    el.textContent = message || "";
    el.className = "owner-inline-status" + (type ? " " + type : "");
  }
  function requireMainnet() {
    const env = window.ALBukhrEnvironment;
    const auth = window.AlbukhrPageAuthGuard;
    if (!env || typeof env.isKnown !== "function" || !env.isKnown() ||
        String(env.getNetwork() || "").toLowerCase() !== MAINNET) {
      throw new Error("Owner amendments are available on verified MAINNET only.");
    }
    if (!auth || typeof auth.waitForAuth !== "function") {
      throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    }
  }
  function api() {
    const value = window.AlbukhrApi;
    if (!value || typeof value.get !== "function" || typeof value.post !== "function") {
      throw new Error("ALBUKHR API Core is unavailable.");
    }
    return value;
  }
  function applicationRow(value) {
    if (Array.isArray(value)) return value[0] || null;
    if (value && Array.isArray(value.application)) return value.application[0] || null;
    if (value && value.application && typeof value.application === "object") return value.application;
    return value && typeof value === "object" ? value : null;
  }
  function addTeamRow(member) {
    const host = $("ownerAmendmentTeamList");
    if (!host) return;
    if (host.querySelectorAll(".owner-amend-team-row").length >= 30) {
      setStatus("A team amendment can contain no more than 30 members.", "error");
      return;
    }
    const item = member || {};
    const row = document.createElement("div");
    row.className = "owner-amend-team-row";
    const fields = [
      ["full_name", "Full name", item.full_name, true],
      ["role", "Role", item.role, true],
      ["title", "Title", item.title, false],
      ["email", "Email", item.email, false],
      ["bio", "Bio", item.bio, false]
    ];
    fields.forEach(([key, label, value, required]) => {
      const wrap = document.createElement("label");
      wrap.textContent = label;
      const input = key === "bio" ? document.createElement("textarea") : document.createElement("input");
      input.dataset.field = key;
      input.value = clean(value);
      if (required) input.required = true;
      if (key === "full_name") input.maxLength = 200;
      if (key === "role" || key === "title") input.maxLength = 120;
      if (key === "email") { input.type = "email"; input.maxLength = 254; }
      if (key === "bio") { input.rows = 2; input.maxLength = 2000; }
      wrap.appendChild(input);
      row.appendChild(wrap);
    });
    const primaryLabel = document.createElement("label");
    primaryLabel.className = "owner-amend-primary";
    const primary = document.createElement("input");
    primary.type = "checkbox";
    primary.dataset.field = "is_primary_contact";
    primary.checked = item.is_primary_contact === true;
    primaryLabel.append(primary, document.createTextNode(" Primary contact"));
    row.appendChild(primaryLabel);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "owner-button secondary small";
    remove.textContent = "Remove member";
    remove.addEventListener("click", () => row.remove());
    row.appendChild(remove);
    host.appendChild(row);
  }
  function collectTeam() {
    const rows = [...($("ownerAmendmentTeamList")?.querySelectorAll(".owner-amend-team-row") || [])];
    if (!rows.length) throw new Error("Keep at least one project team member.");
    if (rows.length > 30) throw new Error("A team amendment can contain no more than 30 members.");
    const list = rows.map((row) => {
      const get = (key) => row.querySelector(`[data-field="${key}"]`);
      return {
        full_name: clean(get("full_name")?.value),
        role: clean(get("role")?.value),
        title: clean(get("title")?.value),
        email: clean(get("email")?.value),
        bio: clean(get("bio")?.value),
        is_primary_contact: Boolean(get("is_primary_contact")?.checked)
      };
    });
    if (list.some((m) => !m.full_name || m.full_name.length > 200 || !m.role || m.role.length > 120)) {
      throw new Error("Every team member needs a valid full name and role.");
    }
    if (list.filter((m) => m.is_primary_contact).length > 1) {
      throw new Error("Only one team member can be the primary contact.");
    }
    if (list.some((m) => m.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.email))) {
      throw new Error("Enter a valid email address for each team member.");
    }
    return list;
  }
  function renderRequests() {
    const host = $("ownerAmendmentHistory");
    if (!host) return;
    host.replaceChildren();

    if (!state.requests.length) {
      const empty = document.createElement("p");
      empty.className = "owner-inline-status";
      empty.textContent = "No owner contact or team amendment requests have been submitted.";
      host.appendChild(empty);
    } else {
      state.requests.forEach((request) => {
        const card = document.createElement("article");
        card.className = "owner-amend-request-card";
        const heading = document.createElement("strong");
        heading.textContent = (request.request_type === "owner_contact" ? "Owner contact details" : "Project team") + " · " + String(request.status || "pending").toUpperCase();
        const date = document.createElement("small");
        date.textContent = request.requested_at ? new Date(request.requested_at).toLocaleString() : "";
        const reason = document.createElement("p");
        reason.textContent = request.reason || "";
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = "View requested changes";
        const pre = document.createElement("pre");
        pre.textContent = JSON.stringify(request.requested_values || {}, null, 2);
        details.append(summary, pre);
        card.append(heading, date, reason, details);
        if (request.decision_reason) {
          const decision = document.createElement("p");
          decision.className = "owner-inline-status";
          decision.textContent = "Admin decision: " + request.decision_reason;
          card.appendChild(decision);
        }
        host.appendChild(card);
      });
    }

    const pendingTypes = new Set(state.requests.filter((r) => r.status === "pending").map((r) => r.request_type));
    const contactSubmit = $("submitOwnerContactAmendment");
    const teamSubmit = $("submitOwnerTeamAmendment");
    if (contactSubmit) contactSubmit.disabled = pendingTypes.has("owner_contact") || state.saving;
    if (teamSubmit) teamSubmit.disabled = pendingTypes.has("project_team") || state.saving;
    $("ownerContactPendingNote").hidden = !pendingTypes.has("owner_contact");
    $("ownerTeamPendingNote").hidden = !pendingTypes.has("project_team");
  }
  async function loadWorkspace() {
    requireMainnet();
    await window.AlbukhrPageAuthGuard.waitForAuth();
    state.applicationId = clean(new URLSearchParams(window.location.search).get("application_id"));
    if (!UUID.test(state.applicationId)) throw new Error("A valid application_id is required.");
    const applicationData = await window.ALBukhrExternalProjectApi.getApplication(state.applicationId);
    state.application = applicationRow(applicationData);
    if (!state.application || clean(state.application.network).toLowerCase() !== MAINNET) {
      throw new Error("Only the authenticated owner of a Mainnet External Project can request amendments.");
    }
    if (!["approved", "converted"].includes(clean(state.application.status).toLowerCase())) {
      return false;
    }
    const [teamData, amendmentData] = await Promise.all([
      window.ALBukhrExternalProjectApi.getTeam(state.applicationId),
      api().get("/api/external-project/" + encodeURIComponent(state.applicationId) + "/amendments")
    ]);
    state.team = asRows(teamData);
    state.requests = asRows(amendmentData?.requests);
    $("ownerContactEmail").value = state.application.contact_email || "";
    $("ownerContactPhone").value = state.application.contact_phone || "";
    $("ownerAmendmentTeamList").replaceChildren();
    state.team.forEach(addTeamRow);
    renderRequests();
    $("ownerAmendmentsPanel").hidden = false;
    setStatus("Owner contact and team amendment workspace loaded. Changes require Admin approval.", "success");
  }
  async function submitRequest(type) {
    if (state.saving) return;
    try {
      requireMainnet();
      const reasonId = type === "owner_contact" ? "ownerContactAmendmentReason" : "ownerTeamAmendmentReason";
      const reason = clean($(reasonId).value);
      if (reason.length < 10 || reason.length > 2000) throw new Error("Explain the requested change in 10 to 2,000 characters.");
      let requestedValues;
      if (type === "owner_contact") {
        const email = clean($("ownerContactEmail").value).toLowerCase();
        const phone = clean($("ownerContactPhone").value);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error("Enter a valid owner contact email.");
        if (phone.length > 40) throw new Error("Owner contact phone must be 40 characters or fewer.");
        requestedValues = { contact_email: email, contact_phone: phone || null };
      } else {
        requestedValues = { team: collectTeam() };
      }
      state.saving = true;
      renderRequests();
      setStatus("Submitting your amendment request for ALBUKHR review…", "active");
      const result = await api().post("/api/external-project/" + encodeURIComponent(state.applicationId) + "/amendments", {
        request_type: type,
        reason,
        requested_values: requestedValues
      });
      if (result?.success === false) throw new Error(result.message || "An amendment request could not be created.");
      $(reasonId).value = "";
      const refreshed = await api().get("/api/external-project/" + encodeURIComponent(state.applicationId) + "/amendments");
      state.requests = asRows(refreshed?.requests);
      renderRequests();
      setStatus("Your request has been submitted. Current project details remain unchanged until ALBUKHR approves it.", "success");
    } catch (error) {
      setStatus(error?.message || "Unable to submit the amendment request.", "error");
    } finally {
      state.saving = false;
      renderRequests();
    }
  }
  function bind() {
    $("addOwnerAmendmentTeamMember").addEventListener("click", () => addTeamRow({}));
    $("submitOwnerContactAmendment").addEventListener("click", () => submitRequest("owner_contact"));
    $("submitOwnerTeamAmendment").addEventListener("click", () => submitRequest("project_team"));
    $("refreshOwnerAmendmentHistory").addEventListener("click", async () => {
      try {
        const refreshed = await api().get("/api/external-project/" + encodeURIComponent(state.applicationId) + "/amendments");
        state.requests = asRows(refreshed?.requests);
        renderRequests();
        setStatus("Amendment history refreshed.", "success");
      } catch (error) { setStatus(error?.message || "Unable to refresh amendment history.", "error"); }
    });
  }
  async function init() {
    const panel = $("ownerAmendmentsPanel");
    if (!panel) return;
    try {
      bind();
      await loadWorkspace();
    } catch (error) {
      const environment = window.ALBukhrEnvironment;
      const onMainnet = Boolean(environment && typeof environment.isKnown === "function" &&
        environment.isKnown() && String(environment.getNetwork() || "").toLowerCase() === MAINNET);
      if (!onMainnet) {
        panel.hidden = true;
        return;
      }
      panel.hidden = false;
      setStatus(error?.message || "Owner amendment workspace is unavailable.", "error");
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window, document);
