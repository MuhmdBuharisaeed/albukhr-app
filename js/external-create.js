/* =========================================================
   ALBUKHR EXTERNAL PROJECT CREATE / EDIT / SUBMIT
   File: js/external-create.js

   Security:
   - Shared Page Auth Guard is the page identity boundary.
   - Database auth.uid() remains the ownership authority.
   - No applicant_user_id is sent from the browser.
   - No LocalStorage application state.
   - Network is read from shared environment core.
   - Submit is performed only through the security RPC.
========================================================= */

(function (window) {
  "use strict";

  let currentUser = null;
  let applicationId = null;
  let applicationStatus = null;
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
    const network = window.ALBukhrEnvironment.getNetwork();

    if (network !== "mainnet" && network !== "testnet") {
      throw new Error("Invalid ALBUKHR network.");
    }

    return network;
  }

  function value(key) {
    const input = byId(fields[key]);

    return String(
      (input && input.value) || ""
    ).trim();
  }

  function normalizeStatus(value) {
    return String(value || "draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function isEditableStatus(status) {
    return [
      "draft",
      "revision_requested",
      "revision",
      "changes_requested"
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
        value("businessRegistrationNumber") || null,

      industry: value("industry"),
      category: value("category"),

      state: value("state") || null,
      city: value("city") || null,

      business_address:
        value("businessAddress") || null,

      website: value("website") || null,

      contact_phone:
        value("contactPhone") || null,

      pi_wallet:
        value("piWallet") || null,

      funding_required:
        Number(value("fundingRequired")),

      funding_asset:
        value("fundingAsset"),

      investment_model:
        value("investmentModel"),

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
        throw new Error(
          "Please complete all required fields."
        );
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
      !Number.isInteger(
        payload.project_duration_days
      ) ||
      payload.project_duration_days < 1
    ) {
      throw new Error(
        "Project Duration must be at least 1 day."
      );
    }
  }

  function assertRpcSuccess(data, fallback) {
    if (
      !data ||
      typeof data !== "object" ||
      data.success !== true
    ) {
      throw new Error(
        (data && data.message) || fallback
      );
    }
  }

  function mapApplication(row) {
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

      businessAddress:
        row.business_address,

      contactEmail:
        row.contact_email,

      contactPhone:
        row.contact_phone,

      website:
        row.website,

      piWallet:
        row.pi_wallet,

      fundingRequired:
        row.funding_required,

      fundingAsset:
        row.funding_asset,

      investmentModel:
        row.investment_model,

      projectDurationDays:
        row.project_duration_days,

      projectDescription:
        row.project_description
    };

    Object.entries(mapping).forEach(
      function (entry) {
        const id = entry[0];
        const fieldValue = entry[1];
        const input = byId(id);

        if (
          fieldValue != null &&
          input
        ) {
          input.value = fieldValue;
        }
      }
    );
  }

  function updateActionState() {
    const saveButton = byId("saveDraftButton");
    const submitButton =
      byId("submitApplicationButton");

    if (!editMode) {
      if (saveButton) {
        saveButton.textContent =
          "Create Application";
      }

      if (submitButton) {
        submitButton.hidden = true;
      }

      return;
    }

    if (saveButton) {
      saveButton.textContent =
        "Save Changes";
    }

    if (submitButton) {
      submitButton.hidden =
        !isEditableStatus(applicationStatus);
    }
  }

  async function loadEditApplication() {
    setStatus(
      "Loading application for secure editing..."
    );

    const network = getNetwork();

    const { data, error } =
      await window.ALBUKHR_SUPABASE
        .from("external_project_applications")
        .select("*")
        .eq("id", applicationId)
        .eq("network", network)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error(
        "Application was not found or you do not have access to it."
      );
    }

    applicationStatus =
      normalizeStatus(data.status);

    if (!isEditableStatus(applicationStatus)) {
      throw new Error(
        "This application cannot be edited in its current status."
      );
    }

    mapApplication(data);
    updateActionState();

    setStatus(
      "Application loaded securely. Save changes or submit it for review.",
      "success"
    );
  }

  async function saveApplication(event) {
    event.preventDefault();

    const saveButton =
      byId("saveDraftButton");

    const submitButton =
      byId("submitApplicationButton");

    try {
      const payload = buildPayload();

      validatePayload(payload);

      setBusy(
        saveButton,
        true,
        editMode
          ? "Saving..."
          : "Creating..."
      );

      if (submitButton) {
        submitButton.disabled = true;
      }

      setStatus(
        editMode
          ? "Saving secure application changes..."
          : "Creating secure project application..."
      );

      let result;

      if (editMode) {
        result =
          await window.ALBUKHR_SUPABASE.rpc(
            "update_external_project_application",
            {
              p_application_id: applicationId,
              p_payload: payload
            }
          );
      }
      else {
        result =
          await window.ALBUKHR_SUPABASE.rpc(
            "create_external_project_application",
            payload
          );
      }

      if (result.error) {
        throw result.error;
      }

      assertRpcSuccess(
        result.data,
        editMode
          ? "Application update was not accepted."
          : "Application creation was not accepted."
      );

      if (!editMode) {
        applicationId =
          result.data.application_id;

        if (!applicationId) {
          throw new Error(
            "Application was created but no application ID was returned."
          );
        }

        editMode = true;
        applicationStatus =
          normalizeStatus(
            result.data.status || "draft"
          );

        const url =
          "external-create.html?application_id=" +
          encodeURIComponent(applicationId);

        window.history.replaceState(
          null,
          "",
          url
        );

        updateActionState();

        setStatus(
          "Draft created successfully. Review your information, then submit the application when ready.",
          "success"
        );

        setBusy(
          saveButton,
          false,
          "Save Changes"
        );

        if (submitButton) {
          submitButton.disabled = false;
        }

        return;
      }

      applicationStatus =
        normalizeStatus(
          result.data.status ||
          applicationStatus
        );

      updateActionState();

      setStatus(
        "Application changes saved successfully. You may now submit it for review.",
        "success"
      );
    }
    catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL CREATE]",
        error
      );

      setStatus(
        "Unable to save application: " +
        (error.message || "Unknown error"),
        "error"
      );
    }
    finally {
      if (saveButton) {
        saveButton.disabled = false;

        saveButton.textContent =
          editMode
            ? "Save Changes"
            : "Create Application";
      }

      if (
        submitButton &&
        isEditableStatus(applicationStatus)
      ) {
        submitButton.disabled = false;
      }
    }
  }

  async function submitApplication() {
    const submitButton =
      byId("submitApplicationButton");

    const saveButton =
      byId("saveDraftButton");

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

      setBusy(
        submitButton,
        true,
        "Submitting..."
      );

      if (saveButton) {
        saveButton.disabled = true;
      }

      setStatus(
        "Submitting application securely for ALBUKHR review..."
      );

      const { data, error } =
        await window.ALBUKHR_SUPABASE.rpc(
          "submit_external_project_application",
          {
            p_application_id: applicationId
          }
        );

      if (error) {
        throw error;
      }

      assertRpcSuccess(
        data,
        "Application submission was not accepted."
      );

      applicationStatus =
        normalizeStatus(
          data.status || "submitted"
        );

      updateActionState();

      setStatus(
        "Application submitted successfully for ALBUKHR review.",
        "success"
      );

      if (submitButton) {
        submitButton.hidden = true;
      }

      setTimeout(
        function () {
          window.location.replace(
            "external-project-dashboard.html"
          );
        },
        700
      );
    }
    catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL SUBMIT]",
        error
      );

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
        submitButton.textContent =
          "Submit Application";
      }
    }
    finally {
      if (
        saveButton &&
        isEditableStatus(applicationStatus)
      ) {
        saveButton.disabled = false;
      }
    }
  }

  function setupUI() {
    const form =
      byId("externalProjectForm");

    if (form) {
      form.addEventListener(
        "submit",
        saveApplication
      );
    }

    const submitButton =
      byId("submitApplicationButton");

    if (submitButton) {
      submitButton.addEventListener(
        "click",
        submitApplication
      );
    }

    const cancelButton =
      byId("cancelButton");

    if (cancelButton) {
      cancelButton.addEventListener(
        "click",
        function () {
          window.location.href =
            "external-project-dashboard.html";
        }
      );
    }

    const backButton =
      byId("backButton");

    if (backButton) {
      backButton.addEventListener(
        "click",
        function () {
          window.location.href =
            "external-project-dashboard.html";
        }
      );
    }

    const projectName =
      byId("projectName");

    if (projectName) {
      projectName.addEventListener(
        "input",
        function () {
          if (
            editMode ||
            value("projectSlug")
          ) {
            return;
          }

          const slug =
            this.value
              .toLowerCase()
              .trim()
              .replace(
                /[^a-z0-9]+/g,
                "-"
              )
              .replace(
                /^-+|-+$/g,
                ""
              );

          byId("projectSlug").value =
            slug;
        }
      );
    }
  }

  async function initialize() {
    try {
      requireDependencies();

      currentUser =
        await window.AlbukhrPageAuthGuard
          .waitForAuth();

      if (!currentUser) {
        return;
      }

      const network = getNetwork();

      byId("networkIndicator").textContent =
        network.toUpperCase();

      byId("authUsername").textContent =
        currentUser.username ||
        "ALBUKHR User";

      byId("authNetwork").textContent =
        "Authenticated with Pi • " +
        network.toUpperCase();

      byId("authAvatar").textContent =
        String(
          currentUser.username || "A"
        )
          .charAt(0)
          .toUpperCase();

      applicationId =
        new URLSearchParams(
          window.location.search
        ).get("application_id");

      editMode =
        Boolean(applicationId);

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
    }
    catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL CREATE INIT]",
        error
      );

      setStatus(
        "Application form unavailable: " +
        (error.message || "Unknown error"),
        "error"
      );

      const saveButton =
        byId("saveDraftButton");

      const submitButton =
        byId("submitApplicationButton");

      if (saveButton) {
        saveButton.disabled = true;
      }

      if (submitButton) {
        submitButton.disabled = true;
      }
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
