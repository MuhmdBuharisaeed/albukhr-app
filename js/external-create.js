/* =========================================================
   ALBUKHR EXTERNAL PROJECT CREATE / EDIT / SUBMIT
   File: js/external-create.js

   Architecture:
   - Shared Page Auth Guard establishes the authenticated session.
   - Supabase/Postgres remains the source of truth.
   - No LocalStorage application state.
   - Browser never sends applicant_user_id.
   - Pi identity and network are passed only to the public
     ownership-boundary RPCs where required by the current
     ALBUKHR Pi identity architecture.
   - Mainnet/Testnet isolation is enforced by p_network.
   - Application lifecycle:
       draft -> submitted -> reviewing -> approved/rejected
       needs_revision -> draft/editable -> submitted
========================================================= */

(function (window) {
  "use strict";

  let currentUser = null;
  let applicationId = null;
  let applicationStatus = "draft";
  let editMode = false;

  const fields = {
    projectCode: "projectCode",
    projectSlug: "projectSlug",
    projectName: "projectName",
    businessName: "businessName",
    country: "country",
    state: "state",
    city: "city",
    industry: "industry",
    category: "category",
    businessRegistrationNumber: "businessRegistrationNumber",
    businessAddress: "businessAddress",
    contactEmail: "contactEmail",
    contactPhone: "contactPhone",
    website: "website",
    piWallet: "piWallet",
    fundingRequired: "fundingRequired",
    fundingAsset: "fundingAsset",
    investmentModel: "investmentModel",
    projectDurationDays: "projectDurationDays",
    projectDescription: "projectDescription"
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function setStatus(message, type) {
    const status = byId("formStatus");
    if (!status) return;

    status.textContent = String(message || "");
    status.className = "form-status" + (type ? " " + type : "");
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

  function getNetwork() {
    const network = String(
      window.ALBukhrEnvironment.getNetwork() || ""
    ).trim().toLowerCase();

    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }

    return network;
  }

  function getPiUid() {
    const candidates = [
      currentUser && currentUser.pi_uid,
      currentUser && currentUser.piUid,
      currentUser && currentUser.uid,
      currentUser && currentUser.user_uid,
      currentUser && currentUser.username
    ];

    const piUid = candidates.find(function (item) {
      return typeof item === "string" && item.trim();
    });

    if (!piUid) {
      throw new Error(
        "Verified Pi identity is unavailable for this session."
      );
    }

    return String(piUid).trim();
  }

  function value(key) {
    const input = byId(fields[key]);

    return String(
      (input && input.value) || ""
    ).trim();
  }

  function nullableValue(key) {
    const item = value(key);
    return item || null;
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
    ].includes(normalizeStatus(status));
  }

  function setBusy(button, busy, text) {
    if (!button) return;

    button.disabled = Boolean(busy);

    if (text) {
      button.textContent = text;
    }
  }

  function buildPayload() {
    return {
      project_code: value("projectCode"),
      project_slug: value("projectSlug"),
      project_name: value("projectName"),
      business_name: value("businessName"),
      country: value("country"),
      contact_email: value("contactEmail"),
      project_description: value("projectDescription"),
      business_registration_number:
        nullableValue("businessRegistrationNumber"),
      industry: value("industry"),
      category: value("category"),
      state: nullableValue("state"),
      city: nullableValue("city"),
      business_address: nullableValue("businessAddress"),
      website: nullableValue("website"),
      contact_phone: nullableValue("contactPhone"),
      pi_wallet: nullableValue("piWallet"),
      funding_required: Number(value("fundingRequired")),
      funding_asset: value("fundingAsset"),
      investment_model: value("investmentModel"),
      project_duration_days:
        Number(value("projectDurationDays"))
    };
  }

  function validatePayload(payload) {
    const required = [
      "project_code",
      "project_slug",
      "project_name",
      "business_name",
      "country",
      "contact_email",
      "project_description",
      "industry",
      "category",
      "funding_asset",
      "investment_model"
    ];

    required.forEach(function (key) {
      if (!String(payload[key] || "").trim()) {
        throw new Error("Please complete all required fields.");
      }
    });

    if (
      !Number.isFinite(payload.funding_required) ||
      payload.funding_required <= 0
    ) {
      throw new Error(
        "Funding Required must be greater than zero."
      );
    }

    if (
      !Number.isInteger(payload.project_duration_days) ||
      payload.project_duration_days < 1
    ) {
      throw new Error(
        "Project Duration must be at least 1 day."
      );
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(
        payload.project_slug
      )
    ) {
      throw new Error(
        "Project Slug may contain letters, numbers and hyphens only."
      );
    }
  }

  function mapApplication(row) {
    if (!row || typeof row !== "object") return;

    const mapping = {
      projectCode: row.project_code,
      projectSlug: row.project_slug,
      projectName: row.project_name,
      businessName: row.business_name,
      country: row.country,
      state: row.state,
      city: row.city,
      industry: row.industry,
      category: row.category,
      businessRegistrationNumber:
        row.business_registration_number,
      businessAddress: row.business_address,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      website: row.website,
      piWallet: row.pi_wallet,
      fundingRequired: row.funding_required,
      fundingAsset: row.funding_asset,
      investmentModel: row.investment_model,
      projectDurationDays: row.project_duration_days,
      projectDescription: row.project_description
    };

    Object.keys(mapping).forEach(function (id) {
      const input = byId(id);

      if (
        input &&
        mapping[id] !== null &&
        mapping[id] !== undefined
      ) {
        input.value = mapping[id];
      }
    });
  }

  function updateActionState() {
    const saveButton = byId("saveDraftButton");
    const submitButton = byId("submitApplicationButton");

    if (!editMode) {
      if (saveButton) {
        saveButton.textContent = "Create Application";
      }

      if (submitButton) {
        submitButton.hidden = true;
      }

      return;
    }

    const editable = isEditableStatus(applicationStatus);

    if (saveButton) {
      saveButton.textContent = "Save Changes";
      saveButton.disabled = !editable;
    }

    if (submitButton) {
      submitButton.hidden = !editable;
      submitButton.disabled = !editable;
    }
  }

  function createRpcArgs(payload) {
    return {
      p_pi_uid: getPiUid(),
      p_network: getNetwork(),
      p_project_name: payload.project_name,
      p_business_name: payload.business_name,
      p_country: payload.country,
      p_contact_email: payload.contact_email,
      p_project_code: payload.project_code,
      p_project_slug: payload.project_slug,
      p_project_description: payload.project_description,
      p_business_registration_number:
        payload.business_registration_number,
      p_industry: payload.industry,
      p_category: payload.category,
      p_state: payload.state,
      p_city: payload.city,
      p_business_address: payload.business_address,
      p_website: payload.website,
      p_contact_phone: payload.contact_phone,
      p_pi_wallet: payload.pi_wallet,
      p_funding_required: payload.funding_required,
      p_funding_asset: payload.funding_asset,
      p_investment_model: payload.investment_model,
      p_project_duration_days:
        payload.project_duration_days
    };
  }

  function updateRpcArgs(payload) {
    return Object.assign(
      {
        p_application_id: applicationId
      },
      createRpcArgs(payload)
    );
  }

  async function loadEditApplication() {
    setStatus("Loading application securely...");

    const { data, error } =
      await window.ALBUKHR_SUPABASE.rpc(
        "get_my_external_project_detail",
        {
          p_application_id: applicationId,
          p_pi_uid: getPiUid(),
          p_network: getNetwork()
        }
      );

    if (error) throw error;

    const row = Array.isArray(data)
      ? data[0]
      : data;

    if (!row) {
      throw new Error(
        "Application was not found or you do not have access to it."
      );
    }

    applicationStatus = normalizeStatus(row.status);

    if (!isEditableStatus(applicationStatus)) {
      throw new Error(
        "This application cannot be edited in its current status."
      );
    }

    mapApplication(row);
    updateActionState();

    setStatus(
      "Application loaded securely. Save changes or submit it for review.",
      "success"
    );
  }

  async function saveApplication(event) {
    event.preventDefault();

    const saveButton = byId("saveDraftButton");
    const submitButton = byId("submitApplicationButton");

    try {
      const payload = buildPayload();
      validatePayload(payload);

      setBusy(
        saveButton,
        true,
        editMode ? "Saving..." : "Creating..."
      );

      if (submitButton) {
        submitButton.disabled = true;
      }

      setStatus(
        editMode
          ? "Saving application changes..."
          : "Creating secure project application..."
      );

      let result;

      if (editMode) {
        result =
          await window.ALBUKHR_SUPABASE.rpc(
            "update_my_external_project_application",
            updateRpcArgs(payload)
          );
      } else {
        result =
          await window.ALBUKHR_SUPABASE.rpc(
            "create_my_external_project_application",
            createRpcArgs(payload)
          );
      }

      if (result.error) throw result.error;

      if (editMode) {
        if (result.data !== true) {
          throw new Error(
            "Application update was not accepted."
          );
        }
      } else {
        applicationId = result.data;

        if (!applicationId) {
          throw new Error(
            "Application was created but no application ID was returned."
          );
        }

        editMode = true;
        applicationStatus = "draft";

        window.history.replaceState(
          null,
          "",
          "external-create.html?application_id=" +
          encodeURIComponent(applicationId)
        );
      }

      updateActionState();

      setStatus(
        editMode
          ? "Application saved successfully. You may submit it for review when ready."
          : "Application created successfully.",
        "success"
      );
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL CREATE]", error);

      setStatus(
        "Unable to save application: " +
        (error.message || "Unknown error"),
        "error"
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent =
          editMode ? "Save Changes" : "Create Application";
      }

      if (
        submitButton &&
        editMode &&
        isEditableStatus(applicationStatus)
      ) {
        submitButton.disabled = false;
      }
    }
  }

  async function submitApplication() {
    const submitButton = byId("submitApplicationButton");
    const saveButton = byId("saveDraftButton");

    try {
      if (!applicationId) {
        throw new Error(
          "Create and save the application before submitting it."
        );
      }

      if (!isEditableStatus(applicationStatus)) {
        throw new Error(
          "This application cannot be submitted in its current status."
        );
      }

      setBusy(submitButton, true, "Submitting...");

      if (saveButton) {
        saveButton.disabled = true;
      }

      setStatus(
        "Submitting application securely for ALBUKHR review..."
      );

      const { data, error } =
        await window.ALBUKHR_SUPABASE.rpc(
          "submit_my_external_project_application",
          {
            p_application_id: applicationId,
            p_pi_uid: getPiUid(),
            p_network: getNetwork()
          }
        );

      if (error) throw error;

      if (data !== true) {
        throw new Error(
          "Application submission was not accepted."
        );
      }

      applicationStatus = "submitted";
      updateActionState();

      setStatus(
        "Application submitted successfully for ALBUKHR review.",
        "success"
      );

      if (submitButton) {
        submitButton.hidden = true;
      }

      window.setTimeout(function () {
        window.location.replace(
          "external-project-dashboard.html"
        );
      }, 700);

    } catch (error) {
      console.error("[ALBUKHR EXTERNAL SUBMIT]", error);

      setStatus(
        "Unable to submit application: " +
        (error.message || "Unknown error"),
        "error"
      );

      if (
        submitButton &&
        isEditableStatus(applicationStatus)
      ) {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Application";
      }
    } finally {
      if (
        saveButton &&
        isEditableStatus(applicationStatus)
      ) {
        saveButton.disabled = false;
      }
    }
  }

  function setupUI() {
    const form = byId("externalProjectForm");

    if (form) {
      form.addEventListener("submit", saveApplication);
    }

    const submitButton = byId("submitApplicationButton");

    if (submitButton) {
      submitButton.addEventListener(
        "click",
        submitApplication
      );
    }

    ["cancelButton", "backButton"].forEach(function (id) {
      const button = byId(id);

      if (button) {
        button.addEventListener("click", function () {
          window.location.href =
            "external-project-dashboard.html";
        });
      }
    });

    const projectName = byId("projectName");
    const projectSlug = byId("projectSlug");

    if (projectName && projectSlug) {
      projectName.addEventListener("input", function () {
        if (editMode || projectSlug.value.trim()) {
          return;
        }

        projectSlug.value =
          this.value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
      });
    }
  }

  function renderIdentity() {
    const network = getNetwork();
    const username =
      currentUser.username ||
      currentUser.pi_username ||
      "ALBUKHR User";

    byId("networkIndicator").textContent =
      network.toUpperCase();

    byId("authUsername").textContent = username;

    byId("authNetwork").textContent =
      "Authenticated with Pi • " +
      network.toUpperCase();

    byId("authAvatar").textContent =
      String(username).charAt(0).toUpperCase();
  }

  async function initialize() {
    try {
      requireDependencies();

      currentUser =
        await window.AlbukhrPageAuthGuard.waitForAuth();

      if (!currentUser) return;

      getPiUid();
      renderIdentity();

      applicationId =
        new URLSearchParams(
          window.location.search
        ).get("application_id");

      editMode = Boolean(applicationId);

      if (editMode) {
        byId("modeEyebrow").textContent =
          "EXTERNAL PROJECT APPLICATION";

        byId("pageTitle").textContent =
          "Edit External Project";

        byId("pageDescription").textContent =
          "Review and update your application before submitting it to the ALBUKHR review framework.";
      }

      setupUI();
      updateActionState();

      if (editMode) {
        await loadEditApplication();
      }

    } catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL CREATE INIT]",
        error
      );

      setStatus(
        "Application form unavailable: " +
        (error.message || "Unknown error"),
        "error"
      );

      const saveButton = byId("saveDraftButton");
      const submitButton = byId("submitApplicationButton");

      if (saveButton) saveButton.disabled = true;
      if (submitButton) submitButton.disabled = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

})(window);
