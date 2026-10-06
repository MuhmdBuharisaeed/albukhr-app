/* =========================================================
   ALBUKHR EXTERNAL PROJECT CREATE / EDIT / SUBMIT
   Corrected applicant workflow.

   - Supabase is the source of truth.
   - No LocalStorage / sessionStorage.
   - Canonical revision status: needs_revision.
   - Applicant identity comes from Page Auth Guard.
   - Draft creation/editing uses applicant RPCs only.
   - Submission is completed from the detail page so team and
     supporting-document requirements are visible before submit.
========================================================= */

(function (window, document) {
  "use strict";

  let currentUser = null;
  let applicationId = null;
  let applicationStatus = "draft";
  let editMode = false;
  let saving = false;

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
    const network = String(window.ALBukhrEnvironment.getNetwork() || "")
      .trim()
      .toLowerCase();
    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }
    return network;
  }

  function getPiUid() {
    const fromGuard =
      typeof window.AlbukhrPageAuthGuard?.getPiUid === "function"
        ? window.AlbukhrPageAuthGuard.getPiUid()
        : null;

    const piUid =
      fromGuard ||
      currentUser?.pi_uid ||
      currentUser?.piUid ||
      currentUser?.uid ||
      null;

    if (!piUid || !String(piUid).trim()) {
      throw new Error("Authenticated Pi UID is unavailable.");
    }

    return String(piUid).trim();
  }

  function value(key) {
    const input = byId(fields[key]);
    return input ? String(input.value || "").trim() : "";
  }

  function normalizeStatus(status) {
    return String(status || "draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function isEditableStatus(status) {
    return ["draft", "needs_revision"].includes(normalizeStatus(status));
  }

  function setBusy(button, busy, text) {
    if (!button) return;
    button.disabled = Boolean(busy);
    if (text) button.textContent = text;
  }

  function buildPayload() {
    return {
      p_project_name: value("projectName"),
      p_business_name: value("businessName"),
      p_country: value("country"),
      p_contact_email: value("contactEmail"),
      p_project_code: value("projectCode") || null,
      p_project_slug: value("projectSlug") || null,
      p_project_description: value("projectDescription") || null,
      p_business_registration_number: value("businessRegistrationNumber") || null,
      p_industry: value("industry") || null,
      p_category: value("category") || null,
      p_state: value("state") || null,
      p_city: value("city") || null,
      p_business_address: value("businessAddress") || null,
      p_website: value("website") || null,
      p_contact_phone: value("contactPhone") || null,
      p_pi_wallet: value("piWallet") || null,
      p_funding_required: value("fundingRequired")
        ? Number(value("fundingRequired"))
        : null,
      p_funding_asset: value("fundingAsset") || "PI",
      p_investment_model: value("investmentModel") || null,
      p_project_duration_days: value("projectDurationDays")
        ? Number(value("projectDurationDays"))
        : null
    };
  }

  function validatePayload(payload) {
    [
      "p_project_name",
      "p_business_name",
      "p_country",
      "p_contact_email"
    ].forEach(function (key) {
      if (!String(payload[key] || "").trim()) {
        throw new Error("Please complete all required fields.");
      }
    });

    if (payload.p_project_description?.length > 10000) {
      throw new Error("Project description is too long.");
    }

    if (
      payload.p_funding_required !== null &&
      (!Number.isFinite(payload.p_funding_required) || payload.p_funding_required <= 0)
    ) {
      throw new Error("Funding Required must be greater than zero.");
    }

    if (
      payload.p_project_duration_days !== null &&
      (!Number.isInteger(payload.p_project_duration_days) || payload.p_project_duration_days < 1)
    ) {
      throw new Error("Project Duration must be at least 1 day.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.p_contact_email)) {
      throw new Error("Please provide a valid contact email.");
    }
  }

  function mapApplication(row) {
    if (!row) return;

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
      businessRegistrationNumber: row.business_registration_number,
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

    Object.entries(mapping).forEach(function ([id, fieldValue]) {
      const input = byId(id);
      if (input && fieldValue !== null && fieldValue !== undefined) {
        input.value = fieldValue;
      }
    });
  }

  function updateActionState() {
    const saveButton = byId("saveDraftButton");
    const submitButton = byId("submitApplicationButton");

    if (!editMode) {
      if (saveButton) saveButton.textContent = "Create Application";
      if (submitButton) submitButton.hidden = true;
      return;
    }

    if (saveButton) saveButton.textContent = "Save Changes";
    if (submitButton) {
      submitButton.hidden = true;
    }
  }

  async function loadEditApplication() {
    setStatus("Loading your external project application...");

    const { data, error } = await window.ALBUKHR_SUPABASE.rpc(
      "get_my_external_project_detail",
      {
        p_application_id: applicationId,
        p_pi_uid: getPiUid(),
        p_network: getNetwork()
      }
    );

    if (error) throw error;

    const application = Array.isArray(data) ? data[0] : data;
    if (!application) {
      throw new Error("Application was not found or access was denied.");
    }

    applicationStatus = normalizeStatus(application.status);
    if (!isEditableStatus(applicationStatus)) {
      throw new Error("This application cannot be edited in its current status.");
    }

    mapApplication(application);
    updateActionState();

    setStatus(
      applicationStatus === "needs_revision"
        ? "ALBUKHR requested changes. Update the application, then continue from the detail page."
        : "Application loaded successfully. You can continue editing.",
      "success"
    );
  }

  async function createApplication(payload) {
    const { data, error } = await window.ALBUKHR_SUPABASE.rpc(
      "create_my_external_project_application",
      {
        p_pi_uid: getPiUid(),
        p_network: getNetwork(),
        ...payload
      }
    );

    if (error) throw error;
    if (!data) throw new Error("Application was created but no application ID was returned.");
    return String(data);
  }

  async function updateApplication(payload) {
    const { data, error } = await window.ALBUKHR_SUPABASE.rpc(
      "update_my_external_project_application",
      {
        p_application_id: applicationId,
        p_pi_uid: getPiUid(),
        p_network: getNetwork(),
        ...payload
      }
    );

    if (error) throw error;
    if (data !== true) throw new Error("Application update was not accepted.");
    return true;
  }

  async function saveApplication(event) {
    event.preventDefault();
    if (saving) return;
    saving = true;

    const saveButton = byId("saveDraftButton");
    const submitButton = byId("submitApplicationButton");

    try {
      const payload = buildPayload();
      validatePayload(payload);

      setBusy(saveButton, true, editMode ? "Saving..." : "Creating...");
      if (submitButton) submitButton.disabled = true;

      if (editMode) {
        setStatus("Saving application changes...");
        await updateApplication(payload);
        setStatus(
          applicationStatus === "needs_revision"
            ? "Changes saved. Open the project detail page to manage team/documents and resubmit."
            : "Application changes saved successfully.",
          "success"
        );
      } else {
        setStatus("Creating your external project application...");
        applicationId = await createApplication(payload);
        editMode = true;
        applicationStatus = "draft";
        window.location.replace(
          "external-project-detail.html?application_id=" + encodeURIComponent(applicationId)
        );
        return;
      }
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL CREATE]", error);
      setStatus(
        "Unable to save application: " + (error?.message || "Unknown error"),
        "error"
      );
    } finally {
      saving = false;
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = editMode ? "Save Changes" : "Create Application";
      }
      if (submitButton) submitButton.disabled = false;
    }
  }

  function generateSlug(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function setupUI() {
    const form = byId("externalProjectForm");
    if (form) form.addEventListener("submit", saveApplication);

    const submitButton = byId("submitApplicationButton");
    if (submitButton) {
      submitButton.hidden = true;
      submitButton.disabled = true;
    }

    const cancelButton = byId("cancelButton");
    if (cancelButton) {
      cancelButton.addEventListener("click", function () {
        window.location.href = "external-project-dashboard.html";
      });
    }

    const projectName = byId("projectName");
    const projectSlug = byId("projectSlug");
    if (projectName && projectSlug) {
      projectName.addEventListener("input", function () {
        if (!projectSlug.value.trim()) {
          projectSlug.value = generateSlug(projectName.value);
        }
      });
    }
  }

  function populateAuthUI() {
    const network = getNetwork();
    const username =
      currentUser?.username || currentUser?.pi_username || "ALBUKHR User";

    const avatar = String(username).charAt(0).toUpperCase();
    const networkIndicator = byId("networkIndicator");
    const authUsername = byId("authUsername");
    const authNetwork = byId("authNetwork");
    const authAvatar = byId("authAvatar");

    if (networkIndicator) networkIndicator.textContent = network.toUpperCase();
    if (authUsername) authUsername.textContent = username;
    if (authNetwork) authNetwork.textContent = "Authenticated with Pi • " + network.toUpperCase();
    if (authAvatar) authAvatar.textContent = avatar;
  }

  function setupEditModeUI() {
    if (!editMode) return;

    const eyebrow = byId("modeEyebrow");
    const title = byId("pageTitle");
    const description = byId("pageDescription");

    if (eyebrow) eyebrow.textContent = "EXTERNAL PROJECT APPLICATION";
    if (title) title.textContent = "Edit External Project";
    if (description) {
      description.textContent =
        "Update your application before continuing with team, document and submission requirements.";
    }
  }

  async function initialize() {
    try {
      requireDependencies();

      currentUser = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!currentUser) return;

      getPiUid();
      applicationId = new URLSearchParams(window.location.search).get("application_id");
      editMode = Boolean(applicationId);

      setupUI();
      populateAuthUI();
      setupEditModeUI();
      updateActionState();

      if (editMode) {
        await loadEditApplication();
      } else {
        setStatus("Complete the project information and create your application.");
      }
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL CREATE INIT]", error);
      setStatus(
        "Application form unavailable: " + (error?.message || "Unknown error"),
        "error"
      );

      const saveButton = byId("saveDraftButton");
      const submitButton = byId("submitApplicationButton");
      if (saveButton) saveButton.disabled = true;
      if (submitButton) submitButton.disabled = true;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window, document);
