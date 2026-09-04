/* =========================================================
   ALBUKHR EXTERNAL PROJECT CREATE / EDIT / SUBMIT
   File: js/external-create.js

   Applicant Architecture:
   - Uses applicant-facing public RPC functions.
   - Application ownership is resolved by the database.
   - Browser never sends applicant_user_id.
   - Pi UID + network are supplied to applicant RPCs.
   - Mainnet/Testnet isolation is enforced by RPC functions.
   - No LocalStorage application state.
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

    businessRegistrationNumber:
      "businessRegistrationNumber",

    businessAddress:
      "businessAddress",

    contactEmail: "contactEmail",
    contactPhone: "contactPhone",

    website: "website",
    piWallet: "piWallet",

    fundingRequired:
      "fundingRequired",

    fundingAsset:
      "fundingAsset",

    investmentModel:
      "investmentModel",

    projectDurationDays:
      "projectDurationDays",

    projectDescription:
      "projectDescription"
  };

  /* =========================================================
     DOM
  ========================================================= */

  function byId(id) {
    return document.getElementById(id);
  }

  /* =========================================================
     STATUS
  ========================================================= */

  function setStatus(message, type) {
    const status = byId("formStatus");

    if (!status) {
      return;
    }

    status.textContent =
      String(message || "");

    status.className =
      "form-status" +
      (type ? " " + type : "");
  }

  /* =========================================================
     DEPENDENCIES
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

    if (
      !window.ALBukhrEnvironment.isKnown()
    ) {
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
      window.ALBukhrEnvironment.getNetwork();

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

    if (!currentUser) {
      throw new Error(
        "Authenticated user is unavailable."
      );
    }

    const piUid =
      currentUser.pi_uid ||
      currentUser.piUid ||
      currentUser.uid ||
      currentUser.user_uid ||
      currentUser.id;

    if (
      !piUid ||
      !String(piUid).trim()
    ) {
      throw new Error(
        "Authenticated Pi UID is unavailable."
      );
    }

    return String(piUid).trim();
  }

  /* =========================================================
     FORM VALUE
  ========================================================= */

  function value(key) {

    const input =
      byId(fields[key]);

    if (!input) {
      return "";
    }

    return String(
      input.value || ""
    ).trim();
  }

  /* =========================================================
     STATUS NORMALIZATION
  ========================================================= */

  function normalizeStatus(status) {

    return String(
      status || "draft"
    )
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  /* =========================================================
     EDITABLE STATUS
  ========================================================= */

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
     BUTTON BUSY STATE
  ========================================================= */

  function setBusy(
    button,
    busy,
    text
  ) {

    if (!button) {
      return;
    }

    button.disabled =
      Boolean(busy);

    if (text) {
      button.textContent =
        text;
    }
  }

  /* =========================================================
     BUILD RPC ARGUMENTS
  ========================================================= */

  function buildPayload() {

    return {

      p_project_name:
        value("projectName"),

      p_business_name:
        value("businessName"),

      p_country:
        value("country"),

      p_contact_email:
        value("contactEmail"),

      p_project_code:
        value("projectCode") || null,

      p_project_slug:
        value("projectSlug") || null,

      p_project_description:
        value("projectDescription") || null,

      p_business_registration_number:
        value(
          "businessRegistrationNumber"
        ) || null,

      p_industry:
        value("industry") || null,

      p_category:
        value("category") || null,

      p_state:
        value("state") || null,

      p_city:
        value("city") || null,

      p_business_address:
        value(
          "businessAddress"
        ) || null,

      p_website:
        value("website") || null,

      p_contact_phone:
        value(
          "contactPhone"
        ) || null,

      p_pi_wallet:
        value("piWallet") || null,

      p_funding_required:
        value("fundingRequired")
          ? Number(
              value(
                "fundingRequired"
              )
            )
          : null,

      p_funding_asset:
        value("fundingAsset") ||
        "PI",

      p_investment_model:
        value(
          "investmentModel"
        ) || null,

      p_project_duration_days:
        value(
          "projectDurationDays"
        )
          ? Number(
              value(
                "projectDurationDays"
              )
            )
          : null
    };
  }

  /* =========================================================
     VALIDATION
  ========================================================= */

  function validatePayload(payload) {

    const required = [
      "p_project_name",
      "p_business_name",
      "p_country",
      "p_contact_email"
    ];

    required.forEach(function (key) {

      if (
        !String(
          payload[key] || ""
        ).trim()
      ) {
        throw new Error(
          "Please complete all required fields."
        );
      }

    });

    if (
      payload.p_project_description &&
      payload.p_project_description.length >
        10000
    ) {
      throw new Error(
        "Project description is too long."
      );
    }

    if (
      payload.p_funding_required !== null &&
      (
        !Number.isFinite(
          payload.p_funding_required
        ) ||
        payload.p_funding_required <= 0
      )
    ) {
      throw new Error(
        "Funding Required must be greater than zero."
      );
    }

    if (
      payload.p_project_duration_days !==
        null &&
      (
        !Number.isInteger(
          payload.p_project_duration_days
        ) ||
        payload.p_project_duration_days <
          1
      )
    ) {
      throw new Error(
        "Project Duration must be at least 1 day."
      );
    }

    const email =
      payload.p_contact_email;

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      throw new Error(
        "Please provide a valid contact email."
      );
    }
  }

  /* =========================================================
     APPLICATION MAPPING
  ========================================================= */

  function mapApplication(row) {

    if (!row) {
      return;
    }

    const mapping = {

      projectCode:
        row.project_code,

      projectSlug:
        row.project_slug,

      projectName:
        row.project_name,

      businessName:
        row.business_name,

      country:
        row.country,

      state:
        row.state,

      city:
        row.city,

      industry:
        row.industry,

      category:
        row.category,

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

    Object.entries(mapping)
      .forEach(function (entry) {

        const id =
          entry[0];

        const fieldValue =
          entry[1];

        const input =
          byId(id);

        if (
          input &&
          fieldValue !== null &&
          fieldValue !== undefined
        ) {
          input.value =
            fieldValue;
        }

      });
  }

  /* =========================================================
     ACTION STATE
  ========================================================= */

  function updateActionState() {

    const saveButton =
      byId("saveDraftButton");

    const submitButton =
      byId(
        "submitApplicationButton"
      );

    if (!editMode) {

      if (saveButton) {
        saveButton.textContent =
          "Create Application";
      }

      if (submitButton) {
        submitButton.hidden =
          true;
      }

      return;
    }

    if (saveButton) {

      saveButton.textContent =
        "Save Changes";

    }

    if (submitButton) {

      submitButton.hidden =
        !isEditableStatus(
          applicationStatus
        );

    }
  }

  /* =========================================================
     LOAD APPLICATION
  ========================================================= */

  async function loadEditApplication() {

    setStatus(
      "Loading your external project application..."
    );

    const network =
      getNetwork();

    const piUid =
      getPiUid();

    const { data, error } =
      await window.ALBUKHR_SUPABASE.rpc(
        "get_my_external_project_detail",
        {
          p_application_id:
            applicationId,

          p_pi_uid:
            piUid,

          p_network:
            network
        }
      );

    if (error) {
      throw error;
    }

    /*
     * PostgreSQL TABLE-returning RPC
     * returns an array.
     */

    const application =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!application) {

      throw new Error(
        "Application was not found or access was denied."
      );

    }

    applicationStatus =
      normalizeStatus(
        application.status
      );

    if (
      !isEditableStatus(
        applicationStatus
      )
    ) {

      throw new Error(
        "This application cannot be edited in its current status."
      );

    }

    mapApplication(
      application
    );

    updateActionState();

    setStatus(
      "Application loaded successfully. You can continue editing.",
      "success"
    );
  }

  /* =========================================================
     CREATE APPLICATION
  ========================================================= */

  async function createApplication(
    payload
  ) {

    const network =
      getNetwork();

    const piUid =
      getPiUid();

    const { data, error } =
      await window.ALBUKHR_SUPABASE.rpc(
        "create_my_external_project_application",
        {

          p_pi_uid:
            piUid,

          p_network:
            network,

          p_project_name:
            payload.p_project_name,

          p_business_name:
            payload.p_business_name,

          p_country:
            payload.p_country,

          p_contact_email:
            payload.p_contact_email,

          p_project_code:
            payload.p_project_code,

          p_project_slug:
            payload.p_project_slug,

          p_project_description:
            payload.p_project_description,

          p_business_registration_number:
            payload.p_business_registration_number,

          p_industry:
            payload.p_industry,

          p_category:
            payload.p_category,

          p_state:
            payload.p_state,

          p_city:
            payload.p_city,

          p_business_address:
            payload.p_business_address,

          p_website:
            payload.p_website,

          p_contact_phone:
            payload.p_contact_phone,

          p_pi_wallet:
            payload.p_pi_wallet,

          p_funding_required:
            payload.p_funding_required,

          p_funding_asset:
            payload.p_funding_asset,

          p_investment_model:
            payload.p_investment_model,

          p_project_duration_days:
            payload.p_project_duration_days
        }
      );

    if (error) {
      throw error;
    }

    if (!data) {

      throw new Error(
        "Application was created but no application ID was returned."
      );

    }

    return data;
  }

  /* =========================================================
     UPDATE APPLICATION
  ========================================================= */

  async function updateApplication(
    payload
  ) {

    const network =
      getNetwork();

    const piUid =
      getPiUid();

    const { data, error } =
      await window.ALBUKHR_SUPABASE.rpc(
        "update_my_external_project_application",
        {

          p_application_id:
            applicationId,

          p_pi_uid:
            piUid,

          p_network:
            network,

          p_project_name:
            payload.p_project_name,

          p_business_name:
            payload.p_business_name,

          p_country:
            payload.p_country,

          p_contact_email:
            payload.p_contact_email,

          p_project_code:
            payload.p_project_code,

          p_project_slug:
            payload.p_project_slug,

          p_project_description:
            payload.p_project_description,

          p_business_registration_number:
            payload.p_business_registration_number,

          p_industry:
            payload.p_industry,

          p_category:
            payload.p_category,

          p_state:
            payload.p_state,

          p_city:
            payload.p_city,

          p_business_address:
            payload.p_business_address,

          p_website:
            payload.p_website,

          p_contact_phone:
            payload.p_contact_phone,

          p_pi_wallet:
            payload.p_pi_wallet,

          p_funding_required:
            payload.p_funding_required,

          p_funding_asset:
            payload.p_funding_asset,

          p_investment_model:
            payload.p_investment_model,

          p_project_duration_days:
            payload.p_project_duration_days
        }
      );

    if (error) {
      throw error;
    }

    if (data !== true) {

      throw new Error(
        "Application update was not accepted."
      );

    }

    return true;
  }

  /* =========================================================
     SAVE APPLICATION
  ========================================================= */

  async function saveApplication(
    event
  ) {

    event.preventDefault();

    const saveButton =
      byId("saveDraftButton");

    const submitButton =
      byId(
        "submitApplicationButton"
      );

    try {

      const payload =
        buildPayload();

      validatePayload(
        payload
      );

      setBusy(
        saveButton,
        true,
        editMode
          ? "Saving..."
          : "Creating..."
      );

      if (submitButton) {
        submitButton.disabled =
          true;
      }

      if (editMode) {

        setStatus(
          "Saving application changes..."
        );

        await updateApplication(
          payload
        );

        applicationStatus =
          "draft";

        updateActionState();

        setStatus(
          "Application changes saved successfully.",
          "success"
        );

      } else {

        setStatus(
          "Creating your external project application..."
        );

        const newApplicationId =
          await createApplication(
            payload
          );

        applicationId =
          String(
            newApplicationId
          );

        editMode =
          true;

        applicationStatus =
          "draft";

        const url =
          "external-create.html?application_id=" +
          encodeURIComponent(
            applicationId
          );

        window.history.replaceState(
          null,
          "",
          url
        );

        updateActionState();

        setStatus(
          "Application created successfully. You can now add your project team and supporting documents.",
          "success"
        );
      }

    }
    catch (error) {

      console.error(
        "[ALBUKHR EXTERNAL CREATE]",
        error
      );

      setStatus(
        "Unable to save application: " +
        (
          error.message ||
          "Unknown error"
        ),
        "error"
      );

    }
    finally {

      if (saveButton) {

        saveButton.disabled =
          false;

        saveButton.textContent =
          editMode
            ? "Save Changes"
            : "Create Application";

      }

      if (
        submitButton &&
        editMode &&
        isEditableStatus(
          applicationStatus
        )
      ) {

        submitButton.disabled =
          false;

      }
    }
  }

  /* =========================================================
     SUBMIT APPLICATION
  ========================================================= */

  async function submitApplication() {

    const submitButton =
      byId(
        "submitApplicationButton"
      );

    const saveButton =
      byId(
        "saveDraftButton"
      );

    try {

      if (!applicationId) {

        throw new Error(
          "Create the application before submitting it."
        );

      }

      if (
        !isEditableStatus(
          applicationStatus
        )
      ) {

        throw new Error(
          "This application cannot be submitted in its current status."
        );

      }

      const network =
        getNetwork();

      const piUid =
        getPiUid();

      setBusy(
        submitButton,
        true,
        "Submitting..."
      );

      if (saveButton) {
        saveButton.disabled =
          true;
      }

      setStatus(
        "Submitting application for ALBUKHR review..."
      );

      const { data, error } =
        await window.ALBUKHR_SUPABASE.rpc(
          "submit_my_external_project_application",
          {

            p_application_id:
              applicationId,

            p_pi_uid:
              piUid,

            p_network:
              network
          }
        );

      if (error) {
        throw error;
      }

      if (data !== true) {

        throw new Error(
          "Application submission was not accepted."
        );

      }

      applicationStatus =
        "submitted";

      updateActionState();

      setStatus(
        "Application submitted successfully for ALBUKHR review.",
        "success"
      );

      if (submitButton) {
        submitButton.hidden =
          true;
      }

      /*
       * Short delay for user feedback.
       */

      setTimeout(
        function () {

          window.location.replace(
            "external-project-dashboard.html"
          );

        },
        900
      );

    }
    catch (error) {

      console.error(
        "[ALBUKHR EXTERNAL SUBMIT]",
        error
      );

      setStatus(
        "Unable to submit application: " +
        (
          error.message ||
          "Unknown error"
        ),
        "error"
      );

      if (
        submitButton &&
        isEditableStatus(
          applicationStatus
        )
      ) {

        submitButton.disabled =
          false;

        submitButton.textContent =
          "Submit Application";

      }

    }
    finally {

      if (
        saveButton &&
        isEditableStatus(
          applicationStatus
        )
      ) {

        saveButton.disabled =
          false;

      }
    }
  }

  /* =========================================================
     AUTO SLUG
  ========================================================= */

  function generateSlug(
    text
  ) {

    return String(text || "")
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
  }

  /* =========================================================
     UI
  ========================================================= */

  function setupUI() {

    const form =
      byId(
        "externalProjectForm"
      );

    if (form) {

      form.addEventListener(
        "submit",
        saveApplication
      );

    }

    const submitButton =
      byId(
        "submitApplicationButton"
      );

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

    const projectSlug =
      byId("projectSlug");

    if (
      projectName &&
      projectSlug
    ) {

      projectName.addEventListener(
        "input",
        function () {

          /*
           * Do not overwrite an existing slug.
           */

          if (
            projectSlug.value.trim()
          ) {
            return;
          }

          projectSlug.value =
            generateSlug(
              projectName.value
            );

        }
      );

    }
  }

  /* =========================================================
     AUTH UI
  ========================================================= */

  function populateAuthUI() {

    const network =
      getNetwork();

    const username =
      currentUser.username ||
      currentUser.pi_username ||
      "ALBUKHR User";

    const avatar =
      String(username)
        .charAt(0)
        .toUpperCase();

    const networkIndicator =
      byId("networkIndicator");

    const authUsername =
      byId("authUsername");

    const authNetwork =
      byId("authNetwork");

    const authAvatar =
      byId("authAvatar");

    if (networkIndicator) {

      networkIndicator.textContent =
        network.toUpperCase();

    }

    if (authUsername) {

      authUsername.textContent =
        username;

    }

    if (authNetwork) {

      authNetwork.textContent =
        "Authenticated with Pi • " +
        network.toUpperCase();

    }

    if (authAvatar) {

      authAvatar.textContent =
        avatar;

    }
  }

  /* =========================================================
     EDIT MODE UI
  ========================================================= */

  function setupEditModeUI() {

    if (!editMode) {
      return;
    }

    const eyebrow =
      byId("modeEyebrow");

    const title =
      byId("pageTitle");

    const description =
      byId("pageDescription");

    if (eyebrow) {

      eyebrow.textContent =
        "EXTERNAL PROJECT APPLICATION";

    }

    if (title) {

      title.textContent =
        "Edit External Project";

    }

    if (description) {

      description.textContent =
        "Review and update your project application before continuing with the ALBUKHR application process.";

    }
  }

  /* =========================================================
     INITIALIZE
  ========================================================= */

  async function initialize() {

    try {

      requireDependencies();

      currentUser =
        await window.AlbukhrPageAuthGuard
          .waitForAuth();

      if (!currentUser) {
        return;
      }

      /*
       * Confirm Pi identity is available.
       */

      getPiUid();

      applicationId =
        new URLSearchParams(
          window.location.search
        ).get(
          "application_id"
        );

      editMode =
        Boolean(applicationId);

      setupUI();

      populateAuthUI();

      setupEditModeUI();

      updateActionState();

      if (editMode) {

        await loadEditApplication();

      } else {

        setStatus(
          "Complete the project information and create your application."
        );

      }

    }
    catch (error) {

      console.error(
        "[ALBUKHR EXTERNAL CREATE INIT]",
        error
      );

      setStatus(
        "Application form unavailable: " +
        (
          error.message ||
          "Unknown error"
        ),
        "error"
      );

      const saveButton =
        byId(
          "saveDraftButton"
        );

      const submitButton =
        byId(
          "submitApplicationButton"
        );

      if (saveButton) {

        saveButton.disabled =
          true;

      }

      if (submitButton) {

        submitButton.disabled =
          true;

      }
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

  } else {

    initialize();

  }

})(window);
