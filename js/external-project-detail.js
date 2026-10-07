/* =========================================================
   ALBUKHR EXTERNAL PROJECT DETAIL ENGINE
   Corrected applicant detail workflow.

   - Current HTML IDs are authoritative.
   - Canonical revision status: needs_revision.
   - Team edits use applicant RPCs only.
   - Documents are handled by the dedicated secure integration.
   - No LocalStorage / sessionStorage.
   - Submit response must be boolean true.
   - Environment/network remains server/core controlled.
   - Page Auth Guard is NOT modified.
========================================================= */

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

  const elements = {
    name: document.getElementById("projectName"),
    code: document.getElementById("applicationCode"),
    network: document.getElementById("applicationNetwork"),
    projectCode: document.getElementById("projectCode"),
    status: document.getElementById("applicationStatus"),
    message: document.getElementById("detailStatus"),
    content: document.getElementById("detailContent"),
    loading: document.getElementById("detailLoading"),
    statusText: document.getElementById("reviewStatusText"),
    reviewStatusTitle: document.getElementById("reviewStatusTitle"),
    project: document.getElementById("projectInformation"),
    business: document.getElementById("businessInformation"),
    funding: document.getElementById("fundingInformation"),
    projectDescription: document.getElementById("projectDescription"),
    team: document.getElementById("projectTeam"),
    teamEditor: document.getElementById("teamEditor"),
    teamEditorList: document.getElementById("teamEditorList"),
    teamStatus: document.getElementById("teamEditorStatus"),
    docs: document.getElementById("projectDocuments"),
    history: document.getElementById("reviewHistory"),
    edit: document.getElementById("editApplicationButton"),
    submit: document.getElementById("submitApplicationButton"),
    dashboard: document.getElementById("dashboardButton"),
    back: document.getElementById("backButton"),
    retry: document.getElementById("retryButton"),
    error: document.getElementById("detailError"),
    errorMessage: document.getElementById("detailErrorMessage"),
    applicationIdDisplay: document.getElementById("applicationIdDisplay"),
    authAvatar: document.getElementById("authAvatar"),
    authUsername: document.getElementById("authUsername"),
    authNetwork: document.getElementById("authNetwork"),
    networkIndicator: document.getElementById("networkIndicator"),
    addTeamMember: document.getElementById("addTeamMemberButton"),
    saveTeam: document.getElementById("saveTeamButton")
  };

  /*
   * -------------------------------------------------------
   * DEPENDENCY CHECK
   * -------------------------------------------------------
   *
   * IMPORTANT:
   * We intentionally do NOT immediately reject when
   * window.AlbukhrPageAuthGuard is not yet available.
   *
   * The Guard has its own initialization lifecycle.
   * requireAuthentication() below waits for the public
   * Guard API to become available.
   *
   * This avoids creating a false "Page Auth Guard is
   * unavailable" failure caused by script timing.
   */
  function checkDependencies() {
    if (!window.ALBukhrEnvironment) {
      throw new Error(
        "ALBUKHR Environment Core is unavailable."
      );
    }

    if (!window.ALBUKHR_SUPABASE) {
      throw new Error(
        "ALBUKHR Supabase Core is unavailable."
      );
    }

    if (!window.AlbukhrPiAuth) {
      throw new Error(
        "ALBUKHR Pi Auth Core is unavailable."
      );
    }
  }

  function normalizeStatus(status) {
    return String(status || "draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function isEditableStatus(status) {
    return [
      "draft",
      "needs_revision"
    ].includes(
      normalizeStatus(status)
    );
  }

  function getApplicationIdFromURL() {
    const id =
      new URLSearchParams(
        window.location.search
      ).get("application_id");

    if (!id || !String(id).trim()) {
      throw new Error(
        "Application ID is missing."
      );
    }

    return String(id).trim();
  }

  /*
   * -------------------------------------------------------
   * ENVIRONMENT / NETWORK
   * -------------------------------------------------------
   *
   * Mainnet/testnet is determined by the shared
   * ALBUKHR Environment Core.
   *
   * This page does not hard-code a Supabase project and
   * does not use LocalStorage/sessionStorage for network.
   */
  function getCurrentNetwork() {
    if (
      !window.ALBukhrEnvironment ||
      typeof window.ALBukhrEnvironment.isKnown !== "function"
    ) {
      throw new Error(
        "ALBUKHR Environment Core is unavailable."
      );
    }

    if (!window.ALBukhrEnvironment.isKnown()) {
      throw new Error(
        "ALBUKHR environment is not recognized."
      );
    }

    const network =
      String(
        window.ALBukhrEnvironment.getNetwork() || ""
      )
        .trim()
        .toLowerCase();

    if (
      ![
        "mainnet",
        "testnet"
      ].includes(network)
    ) {
      throw new Error(
        "Invalid ALBUKHR network."
      );
    }

    return network;
  }

  function getPiUID() {
    const fromGuard =
      typeof window.AlbukhrPageAuthGuard?.getPiUid === "function"
        ? window.AlbukhrPageAuthGuard.getPiUid()
        : null;

    const piUid =
      fromGuard ||
      state.user?.pi_uid ||
      state.user?.piUid ||
      state.user?.uid ||
      null;

    if (!piUid) {
      throw new Error(
        "Authenticated Pi user identity is unavailable."
      );
    }

    return String(piUid).trim();
  }

  function safeArray(value) {
    return Array.isArray(value)
      ? value
      : [];
  }

  function normalizeText(value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    return String(value);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatStatus(status) {
    return String(status || "draft")
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        letter => letter.toUpperCase()
      );
  }

  function formatDate(value) {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

    return date.toLocaleString();
  }

  function formatFunding(amount, asset) {
    const number = Number(amount);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return (
      new Intl.NumberFormat("en", {
        maximumFractionDigits: 7
      }).format(number) +
      " " +
      String(asset || "PI")
        .trim()
        .toUpperCase()
    );
  }

  function clearMessage() {
    if (!elements.message) {
      return;
    }

    elements.message.textContent = "";
    elements.message.hidden = true;
  }

  function showMessage(message, type) {
    if (!elements.message) {
      return;
    }

    elements.message.hidden = false;
    elements.message.textContent =
      String(message || "");

    elements.message.dataset.type =
      type || "info";
  }

  function showError(error) {
    const message =
      error?.message ||
      "Unable to load the external project application.";

    if (elements.error) {
      elements.error.hidden = false;
    }

    if (elements.errorMessage) {
      elements.errorMessage.textContent =
        message;
    }

    if (elements.loading) {
      elements.loading.hidden = true;
    }

    if (elements.content) {
      elements.content.hidden = true;
    }
  }

  function setLoading(loading, message) {
    state.loading = Boolean(loading);

    if (elements.loading) {
      elements.loading.hidden =
        !state.loading;

      if (
        state.loading &&
        message
      ) {
        elements.loading
          .querySelector("strong")
          ?.replaceChildren(
            document.createTextNode(
              message
            )
          );
      }
    }

    if (
      elements.content &&
      state.loading
    ) {
      elements.content.hidden = true;
    }
  }

  /*
   * -------------------------------------------------------
   * SUPABASE RPC
   * -------------------------------------------------------
   */
  async function callRPC(
    functionName,
    parameters
  ) {
    const response =
      await window.ALBUKHR_SUPABASE.rpc(
        functionName,
        parameters
      );

    if (response.error) {
      throw response.error;
    }

    return response.data;
  }

  function buildOwnerParameters() {
    return {
      p_application_id:
        state.applicationId,

      p_pi_uid:
        getPiUID(),

      p_network:
        state.network
    };
  }

  /*
   * -------------------------------------------------------
   * PAGE AUTH GUARD WAIT
   * -------------------------------------------------------
   *
   * We do NOT modify page-auth-guard.js.
   *
   * This function simply waits for its public API to become
   * available before asking it to authenticate the page.
   */
  async function waitForPageAuthGuard(
    timeoutMs = 10000
  ) {
    const startedAt = Date.now();

    while (
      Date.now() - startedAt <
      timeoutMs
    ) {
      const guard =
        window.AlbukhrPageAuthGuard;

      if (
        guard &&
        typeof guard.waitForAuth === "function"
      ) {
        return guard;
      }

      await new Promise(resolve =>
        setTimeout(resolve, 50)
      );
    }

    const guard =
      window.AlbukhrPageAuthGuard;

    if (
      guard &&
      typeof guard.waitForAuth === "function"
    ) {
      return guard;
    }

    throw new Error(
      "ALBUKHR Page Auth Guard failed to become available."
    );
  }

  async function requireAuthentication() {
    const guard =
      await waitForPageAuthGuard();

    const user =
      await guard.waitForAuth();

    if (!user) {
      return null;
    }

    return user;
  }

  /*
   * -------------------------------------------------------
   * APPLICATION DATA
   * -------------------------------------------------------
   */
  async function loadApplicationDetail() {
    const data =
      await callRPC(
        "get_my_external_project_detail",
        buildOwnerParameters()
      );

    const rows =
      safeArray(data);

    if (!rows.length) {
      throw new Error(
        "Application was not found or access is denied."
      );
    }

    const application =
      rows[0];

    /*
     * Second network-isolation validation.
     * The client/core determines the current network,
     * while the returned application must match it.
     */
    if (
      String(
        application.network || ""
      )
        .trim()
        .toLowerCase() !==
      state.network
    ) {
      throw new Error(
        "Network isolation check failed."
      );
    }

    return application;
  }

  async function loadTeam() {
    return safeArray(
      await callRPC(
        "get_my_external_project_team",
        buildOwnerParameters()
      )
    );
  }

  async function loadDocuments() {
    return safeArray(
      await callRPC(
        "get_my_external_project_documents",
        buildOwnerParameters()
      )
    );
  }

  async function loadReviews() {
    return safeArray(
      await callRPC(
        "get_my_external_project_reviews",
        buildOwnerParameters()
      )
    );
  }

  async function loadReviewHistory() {
    return safeArray(
      await callRPC(
        "get_my_external_project_review_history",
        buildOwnerParameters()
      )
    );
  }

  async function loadAuditLog() {
    return safeArray(
      await callRPC(
        "get_my_external_project_audit_log",
        buildOwnerParameters()
      )
    );
  }

  function getStatusDescription(status) {
    const descriptions = {
      draft:
        "This application is still a draft. Continue building it before submission.",

      needs_revision:
        "ALBUKHR requested changes. Update the application, then review your team and documents before resubmitting.",

      submitted:
        "This application has been submitted and is awaiting ALBUKHR review.",

      under_review:
        "This application is currently under administrative review.",

      approved:
        "This application has been approved through the ALBUKHR review framework.",

      rejected:
        "This application was not approved. Review history may contain the decision information."
    };

    return (
      descriptions[
        normalizeStatus(status)
      ] ||
      "Application status is managed by the ALBUKHR backend."
    );
  }

  /*
   * -------------------------------------------------------
   * ENVIRONMENT INDICATOR
   * -------------------------------------------------------
   *
   * This is updated before authentication starts so that
   * the page visibly reflects MAINNET/TESTNET as soon as
   * the Environment Core has resolved it.
   */
  function updateEnvironmentNetworkIndicator() {
    const network =
      String(
        state.network || ""
      )
        .trim()
        .toUpperCase();

    if (
      elements.networkIndicator
    ) {
      elements.networkIndicator.textContent =
        network || "NETWORK";
    }

    if (
      elements.authNetwork &&
      network
    ) {
      elements.authNetwork.textContent =
        network +
        " • Verifying secure Pi authentication...";
    }
  }

  /*
   * -------------------------------------------------------
   * HEADER RENDER
   * -------------------------------------------------------
   */
  function renderHeader() {
    const app =
      state.application;

    if (!app) {
      return;
    }

    const status =
      normalizeStatus(
        app.status
      );

    if (elements.name) {
      elements.name.textContent =
        app.project_name ||
        app.business_name ||
        "External Project";
    }

    if (elements.code) {
      elements.code.textContent =
        app.application_code ||
        "—";
    }

    if (elements.projectCode) {
      elements.projectCode.textContent =
        app.project_code ||
        "—";
    }

    if (elements.network) {
      elements.network.textContent =
        String(
          app.network ||
          state.network
        ).toUpperCase();
    }

    if (elements.status) {
      elements.status.textContent =
        formatStatus(status);

      elements.status.className =
        "detail-status status-" +
        status;
    }

    if (elements.statusText) {
      elements.statusText.textContent =
        getStatusDescription(
          status
        );
    }

    if (
      elements.reviewStatusTitle
    ) {
      elements.reviewStatusTitle.textContent =
        formatStatus(status);
    }

    if (
      elements.applicationIdDisplay
    ) {
      elements.applicationIdDisplay.textContent =
        state.applicationId;
    }

    const username =
      state.user?.username ||
      "ALBUKHR User";

    if (elements.authUsername) {
      elements.authUsername.textContent =
        username;
    }

    if (elements.authAvatar) {
      elements.authAvatar.textContent =
        username
          .charAt(0)
          .toUpperCase();
    }

    if (elements.authNetwork) {
      elements.authNetwork.textContent =
        "Authenticated with Pi • " +
        state.network.toUpperCase();
    }

    if (
      elements.networkIndicator
    ) {
      elements.networkIndicator.textContent =
        state.network.toUpperCase();
    }
  }

  /*
   * -------------------------------------------------------
   * GENERIC GRID RENDER
   * -------------------------------------------------------
   */
  function renderGrid(
    container,
    fields
  ) {
    if (!container) {
      return;
    }

    container.innerHTML = "";

    const list =
      fields.filter(
        field => field
      );

    if (!list.length) {
      container.innerHTML =
        '<div class="detail-empty">No information available.</div>';

      return;
    }

    list.forEach(field => {
      const wrapper =
        document.createElement("div");

      wrapper.className =
        "detail-field";

      const label =
        document.createElement("span");

      label.textContent =
        field.label;

      const value =
        document.createElement("strong");

      value.textContent =
        normalizeText(
          field.value
        );

      wrapper.append(
        label,
        value
      );

      container.appendChild(
        wrapper
      );
    });
  }

  function renderApplicationInfo() {
    const app =
      state.application;

    renderGrid(
      elements.project,
      [
        {
          label: "Project Name",
          value: app.project_name
        },
        {
          label: "Application Code",
          value: app.application_code
        },
        {
          label: "Project Code",
          value: app.project_code
        },
        {
          label: "Project Slug",
          value: app.project_slug
        },
        {
          label: "Industry",
          value: app.industry
        },
        {
          label: "Category",
          value: app.category
        },
        {
          label: "Project Duration",
          value:
            app.project_duration_days
              ? app.project_duration_days +
                " days"
              : null
        },
        {
          label: "Created",
          value:
            formatDate(
              app.created_at
            )
        }
      ]
    );

    if (
      elements.projectDescription
    ) {
      elements.projectDescription.textContent =
        app.project_description ||
        "No project description provided.";
    }

    renderGrid(
      elements.business,
      [
        {
          label: "Business Name",
          value: app.business_name
        },
        {
          label: "Registration Number",
          value:
            app.business_registration_number
        },
        {
          label: "Country",
          value: app.country
        },
        {
          label: "State",
          value: app.state
        },
        {
          label: "City",
          value: app.city
        },
        {
          label: "Business Address",
          value:
            app.business_address
        },
        {
          label: "Website",
          value: app.website
        },
        {
          label: "Contact Email",
          value:
            app.contact_email
        },
        {
          label: "Contact Phone",
          value:
            app.contact_phone
        },
        {
          label: "Pi Wallet",
          value: app.pi_wallet
        }
      ]
    );

    renderGrid(
      elements.funding,
      [
        {
          label: "Funding Required",
          value:
            formatFunding(
              app.funding_required,
              app.funding_asset
            )
        },
        {
          label: "Funding Asset",
          value:
            app.funding_asset
        },
        {
          label: "Investment Model",
          value:
            app.investment_model
        },
        {
          label: "Project Duration",
          value:
            app.project_duration_days
              ? app.project_duration_days +
                " days"
              : null
        }
      ]
    );
  }

  /*
   * -------------------------------------------------------
   * TEAM
   * -------------------------------------------------------
   */
  function renderTeam(team) {
    if (!elements.team) {
      return;
    }

    if (!team.length) {
      elements.team.innerHTML =
        '<div class="detail-empty">No team members registered.</div>';
    } else {
      elements.team.innerHTML =
        team
          .map(
            member => `
              <div class="detail-row">

                <strong>
                  ${escapeHTML(
                    member.full_name
                  )}
                </strong>

                <span>
                  ${escapeHTML(
                    member.role
                  )}
                  ${
                    member.title
                      ? " • " +
                        escapeHTML(
                          member.title
                        )
                      : ""
                  }
                </span>

                ${
                  member.email
                    ? `<p>${escapeHTML(
                        member.email
                      )}</p>`
                    : ""
                }

                ${
                  member.is_primary_contact
                    ? "<p>Primary Contact</p>"
                    : ""
                }

                ${
                  member.bio
                    ? `<p>${escapeHTML(
                        member.bio
                      )}</p>`
                    : ""
                }

              </div>
            `
          )
          .join("");
    }

    renderTeamEditor(
      team
    );
  }

  function renderTeamEditor(team) {
    if (
      !elements.teamEditor ||
      !elements.teamEditorList
    ) {
      return;
    }

    const editable =
      isEditableStatus(
        state.application?.status
      ) &&
      !state.teamLoadFailed;

    elements.teamEditor.hidden =
      !editable;

    if (!editable) {
      return;
    }

    const source =
      team.length
        ? team
        : [
            {
              full_name: "",
              email: "",
              role: "",
              title: "",
              bio: "",
              is_primary_contact: true
            }
          ];

    elements.teamEditorList.innerHTML =
      "";

    source.forEach(
      member =>
        addTeamEditorRow(
          member
        )
    );
  }

  function addTeamEditorRow(
    member = {}
  ) {
    const row =
      document.createElement(
        "div"
      );

    row.className =
      "team-editor-row";

    row.innerHTML = `
      <div class="team-editor-grid">

        <label>
          Full Name
          <input
            data-field="full_name"
            value="${escapeHTML(
              member.full_name || ""
            )}"
            required
          >
        </label>

        <label>
          Role
          <input
            data-field="role"
            value="${escapeHTML(
              member.role || ""
            )}"
            required
          >
        </label>

        <label>
          Title
          <input
            data-field="title"
            value="${escapeHTML(
              member.title || ""
            )}"
          >
        </label>

        <label>
          Email
          <input
            data-field="email"
            type="email"
            value="${escapeHTML(
              member.email || ""
            )}"
          >
        </label>

        <label class="team-editor-wide">
          Bio
          <textarea
            data-field="bio"
            rows="3"
          >${escapeHTML(
            member.bio || ""
          )}</textarea>
        </label>

        <label class="team-primary">
          <input
            data-field="is_primary_contact"
            type="checkbox"
            ${
              member.is_primary_contact
                ? "checked"
                : ""
            }
          >
          Primary contact
        </label>

      </div>

      <button
        type="button"
        class="ghost-action team-remove-button"
      >
        Remove
      </button>
    `;

    row
      .querySelector(
        ".team-remove-button"
      )
      ?.addEventListener(
        "click",
        () => row.remove()
      );

    elements.teamEditorList
      .appendChild(row);
  }

  async function saveTeam() {
    if (
      state.savingTeam ||
      !isEditableStatus(
        state.application?.status
      )
    ) {
      return;
    }

    state.savingTeam = true;

    const rows =
      Array.from(
        elements.teamEditorList?.querySelectorAll(
          ".team-editor-row"
        ) || []
      );

    const team =
      rows.map(row => ({
        full_name:
          row
            .querySelector(
              '[data-field="full_name"]'
            )
            ?.value.trim() || "",

        email:
          row
            .querySelector(
              '[data-field="email"]'
            )
            ?.value.trim() || "",

        role:
          row
            .querySelector(
              '[data-field="role"]'
            )
            ?.value.trim() || "",

        title:
          row
            .querySelector(
              '[data-field="title"]'
            )
            ?.value.trim() || "",

        bio:
          row
            .querySelector(
              '[data-field="bio"]'
            )
            ?.value.trim() || "",

        is_primary_contact:
          Boolean(
            row.querySelector(
              '[data-field="is_primary_contact"]'
            )?.checked
          )
      }));

    try {
      if (!team.length) {
        throw new Error(
          "Add at least one team member."
        );
      }

      if (
        team.some(
          member =>
            !member.full_name ||
            !member.role
        )
      ) {
        throw new Error(
          "Each team member must have a full name and role."
        );
      }

      if (
        team.filter(
          member =>
            member.is_primary_contact
        ).length > 1
      ) {
        throw new Error(
          "Only one primary contact is allowed."
        );
      }

      if (elements.saveTeam) {
        elements.saveTeam.disabled =
          true;

        elements.saveTeam.textContent =
          "Saving...";
      }

      if (elements.teamStatus) {
        elements.teamStatus.textContent =
          "Saving team...";
      }

      const result =
        await callRPC(
          "replace_my_external_project_team",
          {
            p_application_id:
              state.applicationId,

            p_pi_uid:
              getPiUID(),

            p_network:
              state.network,

            p_team:
              team
          }
        );

      if (result !== true) {
        throw new Error(
          "Team update was not accepted."
        );
      }

      if (elements.teamStatus) {
        elements.teamStatus.textContent =
          "Team saved successfully.";
      }

      await loadPageData();

    } catch (error) {
      console.error(
        "External team update failed:",
        error
      );

      if (elements.teamStatus) {
        elements.teamStatus.textContent =
          error?.message ||
          "Unable to save team.";
      }

    } finally {
      state.savingTeam = false;

      if (elements.saveTeam) {
        elements.saveTeam.disabled =
          false;

        elements.saveTeam.textContent =
          "Save Team";
      }
    }
  }

  /*
   * -------------------------------------------------------
   * DOCUMENTS
   * -------------------------------------------------------
   *
   * The actual secure upload workflow remains in:
   *
   * js/external-project-detail-document-integration.js
   *
   * This file only renders registered documents.
   */
  function renderDocuments(
    documents
  ) {
    if (!elements.docs) {
      return;
    }

    const list =
      safeArray(documents);

    if (!list.length) {
      elements.docs.innerHTML =
        '<div class="detail-empty">No supporting documents registered.</div>';

      return;
    }

    elements.docs.innerHTML =
      list
        .map(
          item => `
            <div class="detail-row">

              <strong>
                ${escapeHTML(
                  item.document_name ||
                  item.document_type ||
                  "Document"
                )}
              </strong>

              <span>
                ${escapeHTML(
                  formatStatus(
                    item.document_type ||
                    "other"
                  )
                )}
              </span>

              <p>
                Verification:
                ${escapeHTML(
                  formatStatus(
                    item.verification_status ||
                    "pending"
                  )
                )}
              </p>

              <p>
                Private storage document —
                available to authorized ALBUKHR workflows.
              </p>

            </div>
          `
        )
        .join("");
  }

  /*
   * -------------------------------------------------------
   * REVIEW / AUDIT HISTORY
   * -------------------------------------------------------
   */
  function renderHistory(
    reviews,
    reviewHistory,
    auditLog
  ) {
    if (!elements.history) {
      return;
    }

    const events = [];

    safeArray(
      reviews
    ).forEach(item => {
      events.push({
        type: "Review",
        title:
          item.decision ||
          item.review_type ||
          "Review Activity",
        message:
          item.comments || "",
        created_at:
          item.created_at
      });
    });

    safeArray(
      reviewHistory
    ).forEach(item => {
      events.push({
        type:
          item.event_type ||
          "Review History",
        title:
          item.decision ||
          "Review Activity",
        message:
          item.comments || "",
        created_at:
          item.created_at
      });
    });

    safeArray(
      auditLog
    ).forEach(item => {
      events.push({
        type: "System",
        title:
          item.action ||
          "Application Activity",
        message:
          typeof item.details ===
          "string"
            ? item.details
            : (
                item.details
                  ? JSON.stringify(
                      item.details
                    )
                  : ""
              ),
        created_at:
          item.created_at
      });
    });

    events.sort(
      (a, b) =>
        new Date(
          b.created_at || 0
        ).getTime() -
        new Date(
          a.created_at || 0
        ).getTime()
    );

    if (!events.length) {
      elements.history.innerHTML =
        '<div class="detail-empty">No review activity yet.</div>';

      return;
    }

    elements.history.innerHTML =
      events
        .map(
          event => `
            <div class="detail-row">

              <strong>
                ${escapeHTML(
                  formatStatus(
                    event.title
                  )
                )}
              </strong>

              <span>
                ${escapeHTML(
                  event.type
                )}
                •
                ${escapeHTML(
                  formatDate(
                    event.created_at
                  )
                )}
              </span>

              ${
                event.message
                  ? `<p>${escapeHTML(
                      event.message
                    )}</p>`
                  : ""
              }

            </div>
          `
        )
        .join("");
  }

  /*
   * -------------------------------------------------------
   * ACTION BUTTONS
   * -------------------------------------------------------
   */
  function updateActionButtons() {
    if (!state.application) {
      return;
    }

    const editable =
      isEditableStatus(
        state.application.status
      );

    const status =
      normalizeStatus(
        state.application.status
      );

    if (elements.edit) {
      elements.edit.hidden =
        !editable;
    }

    if (elements.submit) {
      elements.submit.hidden =
        !editable;
    }

    if (elements.teamEditor) {
      elements.teamEditor.hidden =
        !editable;
    }

    if (elements.addTeamMember) {
      elements.addTeamMember.disabled =
        !editable;
    }

    if (elements.saveTeam) {
      elements.saveTeam.disabled =
        !editable;
    }

    if (elements.submit) {
      elements.submit.dataset.status =
        status;
    }
  }

  function openEditor() {
    window.location.assign(
      "external-create.html?application_id=" +
      encodeURIComponent(
        state.applicationId
      )
    );
  }

  function openDashboard() {
    window.location.assign(
      "external-project-dashboard.html"
    );
  }

  /*
   * -------------------------------------------------------
   * SUBMIT APPLICATION
   * -------------------------------------------------------
   */
  async function submitApplication() {
    if (state.submitting) {
      return;
    }

    if (!state.applicationId) {
      return showMessage(
        "Application ID is unavailable.",
        "error"
      );
    }

    if (
      !isEditableStatus(
        state.application?.status
      )
    ) {
      return showMessage(
        "This application cannot be submitted in its current status.",
        "error"
      );
    }

    if (
      !window.confirm(
        "Submit this external project application for ALBUKHR review?"
      )
    ) {
      return;
    }

    state.submitting = true;

    if (elements.submit) {
      elements.submit.disabled =
        true;

      elements.submit.textContent =
        "Submitting...";
    }

    clearMessage();

    try {
      const result =
        await callRPC(
          "submit_my_external_project_application",
          buildOwnerParameters()
        );

      if (result !== true) {
        throw new Error(
          "Application submission was not accepted."
        );
      }

      showMessage(
        "Application submitted successfully.",
        "success"
      );

      await loadPageData();

    } catch (error) {
      console.error(
        "External project submission failed:",
        error
      );

      showMessage(
        "❌ " +
        (
          error?.message ||
          "Unable to submit the application."
        ),
        "error"
      );

    } finally {
      state.submitting = false;

      if (elements.submit) {
        elements.submit.disabled =
          false;

        elements.submit.textContent =
          "Submit Application";
      }

      updateActionButtons();
    }
  }

  /*
   * -------------------------------------------------------
   * FULL APPLICATION RENDER
   * -------------------------------------------------------
   */
  function renderApplication() {
    renderHeader();
    renderApplicationInfo();
    renderTeam(state.team);
    updateActionButtons();
  }

  /*
   * -------------------------------------------------------
   * LOAD COMPLETE PAGE DATA
   * -------------------------------------------------------
   */
  async function loadPageData() {
    setLoading(
      true,
      "Loading application..."
    );

    clearMessage();

    try {
      state.application =
        await loadApplicationDetail();

      const results =
        await Promise.allSettled([
          loadTeam(),
          loadDocuments(),
          loadReviews(),
          loadReviewHistory(),
          loadAuditLog()
        ]);

      state.teamLoadFailed =
        results[0].status !==
        "fulfilled";

      state.team =
        results[0].status ===
        "fulfilled"
          ? results[0].value
          : [];

      const documents =
        results[1].status ===
        "fulfilled"
          ? results[1].value
          : [];

      const reviews =
        results[2].status ===
        "fulfilled"
          ? results[2].value
          : [];

      const reviewHistory =
        results[3].status ===
        "fulfilled"
          ? results[3].value
          : [];

      const auditLog =
        results[4].status ===
        "fulfilled"
          ? results[4].value
          : [];

      results.forEach(
        result => {
          if (
            result.status ===
            "rejected"
          ) {
            console.warn(
              "External project supplementary data failed:",
              result.reason
            );
          }
        }
      );

      renderApplication();

      renderDocuments(
        documents
      );

      renderHistory(
        reviews,
        reviewHistory,
        auditLog
      );

      setLoading(false);

      if (elements.content) {
        elements.content.hidden =
          false;
      }

      /*
       * This event is consumed by:
       * external-project-detail-document-integration.js
       */
      window.dispatchEvent(
        new CustomEvent(
          "albukhr:external-project-detail-ready",
          {
            detail: {
              application:
                state.application,

              applicationId:
                state.applicationId,

              network:
                state.network
            }
          }
        )
      );

    } catch (error) {
      setLoading(false);
      showError(error);
      throw error;
    }
  }

  /*
   * -------------------------------------------------------
   * EVENTS
   * -------------------------------------------------------
   */
  function bindEvents() {
    elements.edit?.addEventListener(
      "click",
      openEditor
    );

    elements.submit?.addEventListener(
      "click",
      submitApplication
    );

    elements.dashboard?.addEventListener(
      "click",
      openDashboard
    );

    elements.back?.addEventListener(
      "click",
      () =>
        window.history.back()
    );

    elements.retry?.addEventListener(
      "click",
      () =>
        loadPageData()
          .catch(() => {})
    );

    elements.addTeamMember?.addEventListener(
      "click",
      () =>
        addTeamEditorRow()
    );

    elements.saveTeam?.addEventListener(
      "click",
      saveTeam
    );
  }

  /*
   * -------------------------------------------------------
   * INITIALIZATION
   * -------------------------------------------------------
   *
   * Order:
   *
   * 1. Core dependencies
   * 2. Application ID
   * 3. Environment/network
   * 4. Immediately display MAINNET/TESTNET
   * 5. Wait for Page Auth Guard
   * 6. Authenticate
   * 7. Load application
   * 8. Load supplementary data
   *
   * This does NOT alter the Page Auth Guard itself.
   */
  async function initialize() {
    try {
      checkDependencies();

      state.applicationId =
        getApplicationIdFromURL();

      state.network =
        getCurrentNetwork();

      /*
       * Show the resolved environment immediately.
       * This prevents the UI from remaining at the generic
       * "NETWORK" state while authentication is resolving.
       */
      updateEnvironmentNetworkIndicator();

      state.user =
        await requireAuthentication();

      if (!state.user) {
        return;
      }

      bindEvents();

      await loadPageData();

    } catch (error) {
      console.error(
        "ALBUKHR External Project Detail initialization failed:",
        error
      );

      showError(error);
    }
  }

  /*
   * -------------------------------------------------------
   * PUBLIC PAGE API
   * -------------------------------------------------------
   */
  window.ALBukhrExternalProjectDetail =
    Object.freeze({
      getState: () =>
        Object.freeze({
          ...state
        }),

      reload: () =>
        loadPageData()
    });

  /*
   * -------------------------------------------------------
   * DOM READY
   * -------------------------------------------------------
   */
  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );
  } else {
    initialize();
  }

})(window, document);
