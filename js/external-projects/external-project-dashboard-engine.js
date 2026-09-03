/* =========================================================
   ALBUKHR EXTERNAL PROJECT DASHBOARD ENGINE
   File:
   js/external-projects/external-project-dashboard-engine.js

   Depends on:
   1. js/core/environment-core.js
   2. js/core/supabase-core.js
   3. js/core/pi-auth-core.js
   4. js/core/page-auth-guard.js

   Purpose:
   - Load authenticated user's external project applications
   - Strict MAINNET / TESTNET isolation
   - No LocalStorage
   - Use backend RPC only
   - Navigate safely to detail page
========================================================= */

(function (window) {
  "use strict";

  const DashboardEngine = Object.freeze({

    async getContext() {
      if (!window.ALBukhrEnvironment) {
        throw new Error("ALBUKHR Environment Core is not loaded.");
      }

      if (!window.ALBUKHR_SUPABASE) {
        throw new Error("ALBUKHR Supabase Core is not loaded.");
      }

      if (!window.AlbukhrPiAuth) {
        throw new Error("ALBUKHR Pi Auth Core is not loaded.");
      }

      const environment = window.ALBukhrEnvironment;

      if (!environment.isKnown()) {
        throw new Error("ALBUKHR environment is unknown.");
      }

      const user = await window.AlbukhrPiAuth.ensurePiAuth();

      if (!user || !user.uid) {
        throw new Error("Pi authentication is required.");
      }

      const network = environment.getNetwork();

      if (network !== "mainnet" && network !== "testnet") {
        throw new Error("Invalid ALBUKHR network.");
      }

      return {
        user,
        network,
        supabase: window.ALBUKHR_SUPABASE
      };
    },


    async loadApplications() {
      const context = await this.getContext();

      const { data, error } =
        await context.supabase.rpc(
          "get_my_external_project_applications",
          {
            p_pi_uid: context.user.uid,
            p_network: context.network
          }
        );

      if (error) {
        throw error;
      }

      return Array.isArray(data) ? data : [];
    },


    getDetailUrl(applicationId) {
      if (!applicationId) {
        throw new Error("Application ID is required.");
      }

      const params = new URLSearchParams({
        application_id: applicationId
      });

      return (
        "external-project-detail.html?" +
        params.toString()
      );
    },


    openDetail(applicationId) {
      window.location.href =
        this.getDetailUrl(applicationId);
    },


    normalizeStatus(status) {
      return String(status || "unknown")
        .trim()
        .toLowerCase();
    },


    formatStatus(status) {
      return this.normalizeStatus(status)
        .replace(/_/g, " ")
        .replace(/\b\w/g, function (letter) {
          return letter.toUpperCase();
        });
    },


    formatDate(value) {
      if (!value) {
        return "—";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return new Intl.DateTimeFormat(
        "en",
        {
          year: "numeric",
          month: "short",
          day: "numeric"
        }
      ).format(date);
    },


    formatAmount(amount, asset) {
      if (
        amount === null ||
        amount === undefined ||
        amount === ""
      ) {
        return "—";
      }

      const number = Number(amount);

      const formatted =
        Number.isFinite(number)
          ? new Intl.NumberFormat("en", {
              maximumFractionDigits: 7
            }).format(number)
          : String(amount);

      return (
        formatted +
        " " +
        String(asset || "PI").toUpperCase()
      );
    },


    escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },


    renderCard(application) {
      const id =
        this.escapeHtml(application.id);

      const projectName =
        this.escapeHtml(
          application.project_name ||
          "Untitled Project"
        );

      const businessName =
        this.escapeHtml(
          application.business_name ||
          "—"
        );

      const status =
        this.normalizeStatus(application.status);

      const statusLabel =
        this.escapeHtml(
          this.formatStatus(status)
        );

      const funding =
        this.escapeHtml(
          this.formatAmount(
            application.funding_required,
            application.funding_asset
          )
        );

      const created =
        this.escapeHtml(
          this.formatDate(application.created_at)
        );

      return `
        <button
          type="button"
          class="external-project-dashboard-card"
          data-application-id="${id}"
          aria-label="Open ${projectName}"
        >
          <div class="external-project-card-top">
            <div>
              <div class="external-project-name">
                ${projectName}
              </div>

              <div class="external-project-business">
                ${businessName}
              </div>
            </div>

            <span
              class="external-project-status status-${status}"
            >
              ${statusLabel}
            </span>
          </div>

          <div class="external-project-card-meta">
            <span>
              Funding: ${funding}
            </span>

            <span>
              Created: ${created}
            </span>
          </div>

          <div class="external-project-card-footer">
            <span>
              ${this.escapeHtml(
                application.application_code || "Application"
              )}
            </span>

            <span class="external-project-open">
              View Details →
            </span>
          </div>
        </button>
      `;
    },


    bindCards(container) {
      container
        .querySelectorAll(
          "[data-application-id]"
        )
        .forEach((element) => {
          element.addEventListener(
            "click",
            () => {
              const applicationId =
                element.dataset.applicationId;

              if (applicationId) {
                this.openDetail(applicationId);
              }
            }
          );
        });
    },


    async render(options = {}) {
      const container =
        document.getElementById(
          options.containerId ||
          "externalProjectsList"
        );

      if (!container) {
        throw new Error(
          "External projects container was not found."
        );
      }

      const loadingId =
        options.loadingId ||
        "externalProjectsLoading";

      const emptyId =
        options.emptyId ||
        "externalProjectsEmpty";

      const errorId =
        options.errorId ||
        "externalProjectsError";

      const loading =
        document.getElementById(loadingId);

      const empty =
        document.getElementById(emptyId);

      const errorBox =
        document.getElementById(errorId);

      container.innerHTML = "";

      if (loading) loading.hidden = false;
      if (empty) empty.hidden = true;
      if (errorBox) errorBox.hidden = true;

      try {
        const applications =
          await this.loadApplications();

        if (loading) loading.hidden = true;

        if (!applications.length) {
          if (empty) empty.hidden = false;
          return applications;
        }

        container.innerHTML =
          applications
            .map((application) =>
              this.renderCard(application)
            )
            .join("");

        this.bindCards(container);

        return applications;
      }
      catch (error) {
        console.error(
          "❌ Failed to load external projects:",
          error
        );

        if (loading) loading.hidden = true;

        if (errorBox) {
          errorBox.hidden = false;
          errorBox.textContent =
            "Unable to load your external projects.";
        }

        throw error;
      }
    }

  });


  window.ALBukhrExternalProjectDashboard =
    DashboardEngine;


  console.info(
    "✅ ALBUKHR External Project Dashboard Engine loaded."
  );

})(window);
