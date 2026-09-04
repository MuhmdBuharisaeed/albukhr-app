/* =========================================================
   ALBUKHR EXTERNAL PROJECT DASHBOARD
   File: js/external-project-dashboard.js

   Architecture:
   - Shared Page Auth Guard controls page authentication.
   - Pi authenticated identity provides pi_uid.
   - Database resolves the ALBUKHR public.users owner.
   - RPC enforces ownership and network isolation.
   - No LocalStorage application state.
   - Mainnet and Testnet are strictly separated.
========================================================= */

(function (window) {
  "use strict";


  /* =========================================================
     STATE
  ========================================================= */

  let currentUser = null;

  let currentNetwork = null;

  let applications = [];

  let activeStatus = "all";


  /* =========================================================
     DOM
  ========================================================= */

  function byId(id) {
    return document.getElementById(id);
  }


  /* =========================================================
     DEPENDENCY VALIDATION
  ========================================================= */

  function requireDependencies() {

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


    if (!window.AlbukhrPageAuthGuard) {
      throw new Error(
        "ALBUKHR Page Auth Guard is unavailable."
      );
    }


    if (!window.ALBukhrEnvironment.isKnown()) {
      throw new Error(
        "ALBUKHR environment is not recognized."
      );
    }

  }


  /* =========================================================
     NETWORK
  ========================================================= */

  function getNetwork() {

    const network =
      String(
        window.ALBukhrEnvironment.getNetwork() || ""
      )
        .trim()
        .toLowerCase();


    if (
      network !== "mainnet" &&
      network !== "testnet"
    ) {
      throw new Error(
        "Invalid ALBUKHR network."
      );
    }


    return network;

  }


  /* =========================================================
     PI UID
  ========================================================= */

  function getPiUid() {

    const piUid =
      currentUser &&
      (
        currentUser.pi_uid ||
        currentUser.uid ||
        currentUser.user_uid ||
        currentUser.id
      );


    const normalized =
      String(piUid || "")
        .trim();


    if (!normalized) {
      throw new Error(
        "Authenticated Pi user identity is unavailable."
      );
    }


    return normalized;

  }


  /* =========================================================
     STATUS
  ========================================================= */

  function normalizeStatus(status) {

    return String(
      status || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        "_"
      );

  }


  function statusLabel(status) {

    const normalized =
      normalizeStatus(status);


    const labels = {

      draft:
        "Draft",

      submitted:
        "Submitted",

      under_review:
        "Under Review",

      revision_requested:
        "Revision",

      revision:
        "Revision",

      changes_requested:
        "Revision",

      approved:
        "Approved",

      rejected:
        "Rejected",

      converted:
        "Converted"

    };


    return (
      labels[normalized] ||
      normalized
        .replace(
          /_/g,
          " "
        )
        .replace(
          /\b\w/g,
          function (letter) {
            return letter.toUpperCase();
          }
        )
    );

  }


  function statusClass(status) {

    const normalized =
      normalizeStatus(status);


    const aliases = {

      revision:
        "revision_requested",

      changes_requested:
        "revision_requested"

    };


    return (
      aliases[normalized] ||
      normalized ||
      "draft"
    );

  }


  function isEditableStatus(status) {

    return [

      "draft",

      "revision_requested",

      "revision",

      "changes_requested"

    ].includes(
      normalizeStatus(status)
    );

  }


  /* =========================================================
     STATUS MESSAGE
  ========================================================= */

  function setDashboardStatus(
    message,
    type
  ) {

    const status =
      byId("dashboardStatus");


    if (!status) {
      return;
    }


    status.textContent =
      String(message || "");


    status.className =
      "dashboard-status" +
      (
        type
          ? " " + type
          : ""
      );

  }


  /* =========================================================
     UI STATE
  ========================================================= */

  function showLoading() {

    const loading =
      byId("applicationsLoading");

    const empty =
      byId("emptyState");

    const list =
      byId("applicationsList");

    const error =
      byId("dashboardError");


    if (loading) {
      loading.hidden = false;
    }


    if (empty) {
      empty.hidden = true;
    }


    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }


    if (error) {
      error.hidden = true;
    }

  }


  function showEmpty() {

    const loading =
      byId("applicationsLoading");

    const empty =
      byId("emptyState");

    const list =
      byId("applicationsList");

    const error =
      byId("dashboardError");


    if (loading) {
      loading.hidden = true;
    }


    if (empty) {
      empty.hidden = false;
    }


    if (list) {
      list.hidden = true;
      list.innerHTML = "";
    }


    if (error) {
      error.hidden = true;
    }

  }


  function showApplications() {

    const loading =
      byId("applicationsLoading");

    const empty =
      byId("emptyState");

    const list =
      byId("applicationsList");

    const error =
      byId("dashboardError");


    if (loading) {
      loading.hidden = true;
    }


    if (empty) {
      empty.hidden = true;
    }


    if (list) {
      list.hidden = false;
    }


    if (error) {
      error.hidden = true;
    }

  }


  function showError(message) {

    const loading =
      byId("applicationsLoading");

    const empty =
      byId("emptyState");

    const list =
      byId("applicationsList");

    const error =
      byId("dashboardError");

    const errorMessage =
      byId("dashboardErrorMessage");


    if (loading) {
      loading.hidden = true;
    }


    if (empty) {
      empty.hidden = true;
    }


    if (list) {
      list.hidden = true;
    }


    if (error) {
      error.hidden = false;
    }


    if (errorMessage) {

      errorMessage.textContent =
        String(
          message ||
          "An unexpected error occurred."
        );

    }

  }


  /* =========================================================
     SAFE TEXT
  ========================================================= */

  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  /* =========================================================
     DATE
  ========================================================= */

  function formatDate(value) {

    if (!value) {
      return "—";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "—";
    }


    try {

      return new Intl.DateTimeFormat(
        "en",
        {
          year: "numeric",
          month: "short",
          day: "numeric"
        }
      ).format(date);

    }
    catch (error) {

      return date.toLocaleDateString();

    }

  }


  /* =========================================================
     NUMBER
  ========================================================= */

  function formatFunding(
    amount,
    asset
  ) {

    const number =
      Number(amount);


    if (
      !Number.isFinite(number)
    ) {
      return "—";
    }


    let formatted;


    try {

      formatted =
        new Intl.NumberFormat(
          "en",
          {
            maximumFractionDigits: 7
          }
        ).format(number);

    }
    catch (error) {

      formatted =
        String(number);

    }


    const normalizedAsset =
      String(asset || "PI")
        .trim()
        .toUpperCase();


    return (
      formatted +
      " " +
      normalizedAsset
    );

  }


  /* =========================================================
     SUMMARY
  ========================================================= */

  function updateSummary() {

    const total =
      applications.length;


    const drafts =
      applications.filter(
        function (application) {

          return (
            normalizeStatus(
              application.status
            ) === "draft"
          );

        }
      ).length;


    const underReview =
      applications.filter(
        function (application) {

          const status =
            normalizeStatus(
              application.status
            );


          return (

            status === "under_review" ||

            status === "submitted"

          );

        }
      ).length;


    const approved =
      applications.filter(
        function (application) {

          return (
            normalizeStatus(
              application.status
            ) === "approved"
          );

        }
      ).length;


    const totalElement =
      byId("totalApplications");

    const draftElement =
      byId("draftApplications");

    const reviewElement =
      byId("reviewApplications");

    const approvedElement =
      byId("approvedApplications");


    if (totalElement) {
      totalElement.textContent =
        total;
    }


    if (draftElement) {
      draftElement.textContent =
        drafts;
    }


    if (reviewElement) {
      reviewElement.textContent =
        underReview;
    }


    if (approvedElement) {
      approvedElement.textContent =
        approved;
    }

  }


  /* =========================================================
     FILTER
  ========================================================= */

  function getFilteredApplications() {

    if (
      activeStatus === "all"
    ) {
      return applications;
    }


    return applications.filter(
      function (application) {

        const status =
          normalizeStatus(
            application.status
          );


        if (
          activeStatus ===
          "revision_requested"
        ) {

          return [

            "revision_requested",

            "revision",

            "changes_requested"

          ].includes(status);

        }


        return (
          status === activeStatus
        );

      }
    );

  }


  function updateFilterUI() {

    const filters =
      document.querySelectorAll(
        ".status-filter"
      );


    filters.forEach(
      function (button) {

        const status =
          button.dataset.status;


        button.classList.toggle(
          "active",
          status === activeStatus
        );

      }
    );

  }


  /* =========================================================
     APPLICATION COUNT
  ========================================================= */

  function updateApplicationCount() {

    const countElement =
      byId(
        "applicationCountText"
      );


    if (!countElement) {
      return;
    }


    const filtered =
      getFilteredApplications();


    const total =
      applications.length;


    if (total === 0) {

      countElement.textContent =
        "No applications found on this network.";

      return;

    }


    if (
      activeStatus === "all"
    ) {

      countElement.textContent =
        total === 1
          ? "1 application on this network."
          : total +
            " applications on this network.";

      return;

    }


    countElement.textContent =
      filtered.length === 1
        ? "1 matching application."
        : filtered.length +
          " matching applications.";

  }


  /* =========================================================
     APPLICATION CARD
  ========================================================= */

  function createApplicationCard(
    application
  ) {

    const card =
      document.createElement(
        "article"
      );


    card.className =
      "application-card";


    const status =
      normalizeStatus(
        application.status
      );


    const id =
      String(
        application.id || ""
      );


    const projectName =
      application.project_name ||
      "Unnamed Project";


    const businessName =
      application.business_name ||
      "Business information unavailable";


    const projectCode =
      application.project_code ||
      application.application_code ||
      "—";


    const funding =
      formatFunding(
        application.funding_required,
        application.funding_asset
      );


    const duration =
      application.project_duration_days
        ? application.project_duration_days +
          " days"
        : "—";


    const created =
      formatDate(
        application.created_at
      );


    const editable =
      isEditableStatus(status);


    const primaryAction =
      editable
        ? "Edit"
        : "View";


    const primaryClass =
      editable
        ? "primary"
        : "";


    card.innerHTML = `

      <div
        class="application-card-header"
      >

        <div
          class="application-card-main"
        >

          <h3
            class="application-name"
          >
            ${escapeHtml(projectName)}
          </h3>


          <div
            class="application-business"
          >
            ${escapeHtml(businessName)}
          </div>


          <span
            class="application-code"
          >
            ${escapeHtml(projectCode)}
          </span>

        </div>


        <span
          class="
            application-status
            status-${escapeHtml(
              statusClass(status)
            )}
          "
        >
          ${escapeHtml(
            statusLabel(status)
          )}
        </span>

      </div>



      <div
        class="application-meta"
      >

        <div
          class="application-meta-item"
        >

          <span
            class="
              application-meta-label
            "
          >
            Funding
          </span>


          <strong
            class="
              application-meta-value
            "
          >
            ${escapeHtml(funding)}
          </strong>

        </div>



        <div
          class="application-meta-item"
        >

          <span
            class="
              application-meta-label
            "
          >
            Duration
          </span>


          <strong
            class="
              application-meta-value
            "
          >
            ${escapeHtml(duration)}
          </strong>

        </div>



        <div
          class="application-meta-item"
        >

          <span
            class="
              application-meta-label
            "
          >
            Industry
          </span>


          <strong
            class="
              application-meta-value
            "
          >
            ${escapeHtml(
              application.industry || "—"
            )}
          </strong>

        </div>

      </div>



      <div
        class="application-card-footer"
      >

        <span
          class="application-date"
        >
          Created ${escapeHtml(created)}
        </span>


        <div
          class="application-actions"
        >

          <button
            type="button"
            class="
              application-action
            "
            data-action="view"
            data-application-id="${escapeHtml(id)}"
          >
            Details
          </button>


          <button
            type="button"
            class="
              application-action
              ${primaryClass}
            "
            data-action="${
              editable
                ? "edit"
                : "view"
            }"
            data-application-id="${escapeHtml(id)}"
          >
            ${primaryAction}
          </button>

        </div>

      </div>

    `;


    return card;

  }


  /* =========================================================
     RENDER APPLICATIONS
  ========================================================= */

  function renderApplications() {

    const list =
      byId("applicationsList");


    if (!list) {
      return;
    }


    updateSummary();

    updateApplicationCount();


    const filtered =
      getFilteredApplications();


    list.innerHTML = "";


    if (
      applications.length === 0
    ) {

      showEmpty();

      setDashboardStatus(
        "You have not created any external project applications on " +
        currentNetwork.toUpperCase() +
        ".",
        "success"
      );

      return;

    }


    if (
      filtered.length === 0
    ) {

      showApplications();


      list.innerHTML = `

        <section
          class="empty-state"
        >

          <div
            class="empty-logo"
          >

            <span
              class="empty-logo-mark"
            >
              A
            </span>

          </div>


          <h2>
            No Matching Applications
          </h2>


          <p>
            No applications match the selected
            status filter.
          </p>

        </section>

      `;


      setDashboardStatus(
        "Applications loaded securely.",
        "success"
      );

      return;

    }


    filtered.forEach(
      function (application) {

        list.appendChild(
          createApplicationCard(
            application
          )
        );

      }
    );


    showApplications();


    setDashboardStatus(
      filtered.length +
      " application" +
      (
        filtered.length === 1
          ? ""
          : "s"
      ) +
      " loaded securely from " +
      currentNetwork.toUpperCase() +
      ".",
      "success"
    );

  }


  /* =========================================================
     LOAD APPLICATIONS
  ========================================================= */

  async function loadApplications() {

    const refreshButton =
      byId(
        "refreshApplicationsButton"
      );


    try {

      showLoading();


      if (refreshButton) {

        refreshButton.disabled =
          true;

        refreshButton.textContent =
          "Loading...";

      }


      setDashboardStatus(
        "Loading your secure external project applications..."
      );


      const piUid =
        getPiUid();


      const network =
        getNetwork();


      const {
        data,
        error
      } =
        await window
          .ALBUKHR_SUPABASE
          .rpc(
            "get_my_external_project_applications",
            {
              p_pi_uid:
                piUid,

              p_network:
                network
            }
          );


      if (error) {
        throw error;
      }


      if (
        data != null &&
        !Array.isArray(data)
      ) {
        throw new Error(
          "Invalid application data returned by the server."
        );
      }


      applications =
        Array.isArray(data)
          ? data
          : [];


      applications.sort(
        function (a, b) {

          const aTime =
            new Date(
              a.created_at || 0
            ).getTime();


          const bTime =
            new Date(
              b.created_at || 0
            ).getTime();


          return (
            bTime - aTime
          );

        }
      );


      renderApplications();

    }
    catch (error) {

      console.error(
        "[ALBUKHR EXTERNAL DASHBOARD]",
        error
      );


      applications = [];


      updateSummary();

      updateApplicationCount();


      const message =
        error &&
        error.message
          ? error.message
          : "Unknown error";


      setDashboardStatus(
        "Unable to load applications: " +
        message,
        "error"
      );


      showError(message);

    }
    finally {

      if (refreshButton) {

        refreshButton.disabled =
          false;

        refreshButton.textContent =
          "Refresh";

      }

    }

  }


  /* =========================================================
     NAVIGATION
  ========================================================= */

  function openCreateProject() {

    window.location.href =
      "external-create.html";

  }


  function openApplication(
    applicationId,
    action
  ) {

    if (!applicationId) {
      return;
    }


    const normalizedAction =
      String(
        action || ""
      ).toLowerCase();


    /*
      Editable applications use the existing
      external-create page in edit mode.

      Non-editable applications will continue
      to the dedicated detail page when that
      page is added.
    */

    if (
      normalizedAction === "edit"
    ) {

      window.location.href =
        "external-create.html?application_id=" +
        encodeURIComponent(
          applicationId
        );

      return;

    }


    /*
      Forward architecture:
      external-project-detail.html
    */

    window.location.href =
      "external-project-detail.html?application_id=" +
      encodeURIComponent(
        applicationId
      );

  }


  /* =========================================================
     APPLICATION ACTION EVENTS
  ========================================================= */

  function setupApplicationActions() {

    const list =
      byId("applicationsList");


    if (!list) {
      return;
    }


    list.addEventListener(
      "click",
      function (event) {

        const button =
          event.target.closest(
            "[data-action]"
          );


        if (!button) {
          return;
        }


        const action =
          button.dataset.action;


        const applicationId =
          button.dataset.applicationId;


        if (
          action !== "view" &&
          action !== "edit"
        ) {
          return;
        }


        openApplication(
          applicationId,
          action
        );

      }
    );

  }


  /* =========================================================
     FILTER EVENTS
  ========================================================= */

  function setupFilters() {

    const filters =
      document.querySelectorAll(
        ".status-filter"
      );


    filters.forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            const status =
              String(
                button.dataset.status ||
                "all"
              )
                .trim()
                .toLowerCase();


            activeStatus =
              status || "all";


            updateFilterUI();

            renderApplications();

          }
        );

      }
    );

  }


  /* =========================================================
     BUTTON EVENTS
  ========================================================= */

  function setupButtons() {

    const createButton =
      byId(
        "createProjectButton"
      );


    if (createButton) {

      createButton.addEventListener(
        "click",
        openCreateProject
      );

    }


    const emptyCreateButton =
      byId(
        "emptyCreateProjectButton"
      );


    if (emptyCreateButton) {

      emptyCreateButton.addEventListener(
        "click",
        openCreateProject
      );

    }


    const refreshButton =
      byId(
        "refreshApplicationsButton"
      );


    if (refreshButton) {

      refreshButton.addEventListener(
        "click",
        loadApplications
      );

    }


    const retryButton =
      byId(
        "retryApplicationsButton"
      );


    if (retryButton) {

      retryButton.addEventListener(
        "click",
        loadApplications
      );

    }


    const backButton =
      byId(
        "backButton"
      );


    if (backButton) {

      backButton.addEventListener(
        "click",
        function () {

          /*
            Forward navigation.

            Dashboard belongs to the
            external project service.
          */

          window.history.back();

        }
      );

    }

  }


  /* =========================================================
     AUTH UI
  ========================================================= */

  function updateAuthenticationUI() {

    const username =
      String(
        (
          currentUser &&
          currentUser.username
        ) ||
        "ALBUKHR User"
      );


    const authUsername =
      byId("authUsername");

    const authNetwork =
      byId("authNetwork");

    const authAvatar =
      byId("authAvatar");

    const networkIndicator =
      byId("networkIndicator");


    if (authUsername) {

      authUsername.textContent =
        username;

    }


    if (authNetwork) {

      authNetwork.textContent =
        "Authenticated with Pi • " +
        currentNetwork.toUpperCase();

    }


    if (authAvatar) {

      authAvatar.textContent =
        username
          .charAt(0)
          .toUpperCase();

    }


    if (networkIndicator) {

      networkIndicator.textContent =
        currentNetwork.toUpperCase();

    }

  }


  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function initialize() {

    try {

      requireDependencies();


      setDashboardStatus(
        "Verifying secure ALBUKHR access..."
      );


      /*
        Page Auth Guard remains the
        authentication boundary.
      */

      currentUser =
        await window
          .AlbukhrPageAuthGuard
          .waitForAuth();


      if (!currentUser) {
        return;
      }


      currentNetwork =
        getNetwork();


      updateAuthenticationUI();


      setupButtons();

      setupFilters();

      setupApplicationActions();

      updateSummary();

      updateFilterUI();


      await loadApplications();

    }
    catch (error) {

      console.error(
        "[ALBUKHR EXTERNAL DASHBOARD INIT]",
        error
      );


      const message =
        error &&
        error.message
          ? error.message
          : "Unknown error";


      setDashboardStatus(
        "Dashboard unavailable: " +
        message,
        "error"
      );


      showError(message);

    }

  }


  /* =========================================================
     BOOT
  ========================================================= */

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

  }
  else {

    initialize();

  }


})(window);
