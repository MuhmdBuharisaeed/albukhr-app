/* =========================================================
   ALBUKHR EXTERNAL PROJECT DASHBOARD
   File: js/external-project-dashboard.js

   Purpose:
   - Protected applicant dashboard
   - Uses shared ALBUKHR Page Auth Guard
   - Reads only the authenticated applicant's applications
   - RLS is the ownership authority
   - MAINNET / TESTNET aware
   - No LocalStorage authentication
   - No admin RPC access
========================================================= */

(function (window) {
  "use strict";

  let currentUser = null;
  let currentApplications = [];

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    const el = byId("dashboardStatus");
    if (!el) return;
    el.textContent = String(message || "");
    el.className = "dashboard-status" + (type ? " " + type : "");
  }

  function requireDependencies() {
    if (!window.ALBukhrEnvironment) {
      throw new Error("ALBUKHR Environment Core is unavailable.");
    }

    if (!window.ALBUKHR_SUPABASE) {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }

    if (!window.AlbukhrPageAuthGuard) {
      throw new Error("ALBUKHR Page Auth Guard is unavailable.");
    }

    if (!window.ALBukhrEnvironment.isKnown()) {
      throw new Error("ALBUKHR environment is not recognized.");
    }
  }

  function getStatusValue(item) {
    return String(
      item.status ||
      item.application_status ||
      item.review_status ||
      "draft"
    ).trim().toLowerCase().replace(/\s+/g, "_");
  }

  function statusLabel(value) {
    return String(value || "draft")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function (character) {
        return character.toUpperCase();
      });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  }

  /* =======================================================
     LOAD APPLICATIONS

     IMPORTANT:
     - Do not call admin review RPCs.
     - Do not send applicant_user_id from the browser.
     - RLS + auth.uid() remain the database ownership boundary.
  ======================================================= */

  async function loadApplications() {
    setStatus("Loading your secure project applications...");

    const network = window.ALBukhrEnvironment.getNetwork();

    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }

    const { data, error } =
      await window.ALBUKHR_SUPABASE
        .from("external_project_applications")
        .select(
          [
            "id",
            "application_code",
            "project_code",
            "project_slug",
            "project_name",
            "project_description",
            "business_name",
            "industry",
            "category",
            "country",
            "state",
            "city",
            "funding_required",
            "funding_asset",
            "investment_model",
            "project_duration_days",
            "network",
            "status",
            "submitted_at",
            "review_started_at",
            "approved_at",
            "rejected_at",
            "converted_at",
            "created_at",
            "updated_at"
          ].join(",")
        )
        .eq("network", network)
        .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    currentApplications =
      Array.isArray(data) ? data : [];

    renderApplications();

    setStatus(
      currentApplications.length
        ? "Applications loaded securely."
        : "No external project applications found.",
      "success"
    );
  }

  function renderApplications() {
    const list = byId("projectsList");
    const empty = byId("emptyState");
    const subtitle = byId("applicationsSubtitle");
    const count = byId("sectionCount");

    if (!list || !empty) return;

    list.innerHTML = "";

    const total = currentApplications.length;

    if (subtitle) {
      subtitle.textContent =
        total
          ? total + " application" +
            (total === 1 ? "" : "s") +
            " in your workspace"
          : "Your applications will appear here.";
    }

    if (count) {
      count.textContent = total;
    }

    const inProgress =
      currentApplications.filter(function (item) {
        const status = getStatusValue(item);

        return ![
          "approved",
          "rejected",
          "converted"
        ].includes(status);
      }).length;

    const approved =
      currentApplications.filter(function (item) {
        return getStatusValue(item) === "approved";
      }).length;

    byId("totalCount").textContent = total;
    byId("progressCount").textContent = inProgress;
    byId("approvedCount").textContent = approved;

    if (!total) {
      empty.hidden = false;
      return;
    }

    empty.hidden = true;

    currentApplications.forEach(function (item) {
      const status = getStatusValue(item);

      const name =
        item.project_name ||
        item.business_name ||
        item.project_code ||
        "External Project";

      const code =
        item.project_code ||
        item.application_code ||
        item.id ||
        "Pending code";

      const description =
        item.project_description ||
        "No project description available.";

      const category =
        item.category ||
        item.industry ||
        "External";

      const created =
        formatDate(item.created_at);

      const card =
        document.createElement("article");

      card.className = "project-card";

      card.innerHTML = `
        <div class="project-card-top">
          <div>
            <h3>${escapeHtml(name)}</h3>
            <div class="project-code">${escapeHtml(code)}</div>
          </div>
          <span class="status-chip status-${escapeHtml(status)}">
            ${escapeHtml(statusLabel(status))}
          </span>
        </div>

        <p class="project-description">
          ${escapeHtml(description)}
        </p>

        <div class="project-meta">
          <span class="meta-chip">
            ${escapeHtml(category)}
          </span>

          <span class="meta-chip">
            ${escapeHtml(
              window.ALBukhrEnvironment
                .getNetwork()
                .toUpperCase()
            )}
          </span>
        </div>

        <div class="project-card-footer">
          <span>Created ${escapeHtml(created)}</span>
          <span class="view-link">View details →</span>
        </div>
      `;

      card.addEventListener(
        "click",
        function () {
          openModal(item);
        }
      );

      list.appendChild(card);
    });
  }

  function detail(label, value, full) {
    return `
      <div class="detail-item${full ? " full" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong>
          ${escapeHtml(value || "Not available")}
        </strong>
      </div>
    `;
  }

  function openModal(item) {
    const modal = byId("projectModal");

    if (!modal) return;

    const status =
      getStatusValue(item);

    const name =
      item.project_name ||
      item.business_name ||
      "External Project";

    byId("modalTitle").textContent =
      name;

    byId("modalStatus").innerHTML = `
      <span class="status-chip status-${escapeHtml(status)}">
        ${escapeHtml(statusLabel(status))}
      </span>
    `;

    byId("modalGrid").innerHTML =
      detail(
        "Project Code",
        item.project_code ||
        item.application_code ||
        item.id
      ) +

      detail(
        "Status",
        statusLabel(status)
      ) +

      detail(
        "Business",
        item.business_name
      ) +

      detail(
        "Industry",
        item.industry ||
        item.category
      ) +

      detail(
        "Country",
        item.country
      ) +

      detail(
        "Location",
        [item.state, item.city]
          .filter(Boolean)
          .join(", ")
      ) +

      detail(
        "Funding Required",
        item.funding_required
          ? item.funding_required +
            " " +
            (item.funding_asset || "")
          : null
      ) +

      detail(
        "Investment Model",
        item.investment_model
      ) +

      detail(
        "Duration",
        item.project_duration_days
          ? item.project_duration_days +
            " days"
          : null
      ) +

      detail(
        "Created",
        formatDate(item.created_at)
      ) +

      detail(
        "Description",
        item.project_description,
        true
      );

    const edit =
      byId("modalEditButton");

    const editable = [
      "draft",
      "revision_requested",
      "revision",
      "changes_requested"
    ].includes(status);

    edit.hidden = !editable;

    edit.onclick = function () {
      window.location.href =
        "external-create.html?application_id=" +
        encodeURIComponent(item.id || "");
    };

    modal.hidden = false;

    modal.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  function closeModal() {
    const modal =
      byId("projectModal");

    if (!modal) return;

    modal.hidden = true;

    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  function setupUI() {
    byId("createProjectButton")
      .addEventListener(
        "click",
        function () {
          window.location.href =
            "external-create.html";
        }
      );

    byId("emptyCreateButton")
      .addEventListener(
        "click",
        function () {
          window.location.href =
            "external-create.html";
        }
      );

    byId("refreshButton")
      .addEventListener(
        "click",
        async function () {
          this.disabled = true;

          try {
            await loadApplications();
          }
          catch (error) {
            setStatus(
              "Unable to refresh applications: " +
              (error.message || "Unknown error"),
              "error"
            );
          }
          finally {
            this.disabled = false;
          }
        }
      );

    byId("modalCloseButton")
      .addEventListener(
        "click",
        closeModal
      );

    byId("modalCloseAction")
      .addEventListener(
        "click",
        closeModal
      );

    document.addEventListener(
      "click",
      function (event) {
        if (
          event.target &&
          event.target.dataset.closeModal === "true"
        ) {
          closeModal();
        }
      }
    );

    document.addEventListener(
      "keydown",
      function (event) {
        if (event.key === "Escape") {
          closeModal();
        }
      }
    );
  }

  async function initialize() {
    try {
      requireDependencies();
      setupUI();

      /* Shared protected-page identity.
         Do not use a page-local Pi authentication path. */
      currentUser =
        await window.AlbukhrPageAuthGuard
          .waitForAuth();

      if (!currentUser) {
        return;
      }

      const network =
        window.ALBukhrEnvironment
          .getNetwork();

      byId("networkIndicator").textContent =
        network.toUpperCase();

      byId("summaryUsername").textContent =
        currentUser.username ||
        "ALBUKHR User";

      byId("summaryNetwork").textContent =
        "Authenticated with Pi • " +
        network.toUpperCase();

      byId("summaryAvatar").textContent =
        String(
          currentUser.username || "A"
        )
          .charAt(0)
          .toUpperCase();

      await loadApplications();
    }
    catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL DASHBOARD]",
        error
      );

      setStatus(
        "Dashboard unavailable: " +
        (error.message || "Unknown error"),
        "error"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  }
  else {
    initialize();
  }

})(window);
