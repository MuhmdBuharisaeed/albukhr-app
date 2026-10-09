
/* ALBUKHR EXTERNAL PROJECT CREATE / EDIT
 * Mainnet uses the trusted External Project API adapter.
 * Testnet retains the existing applicant RPC contract.
 *
 * Logo lifecycle:
 * - Mainnet requires one valid logo for a new application.
 * - Existing editable applications may replace their logo.
 * - Logo upload uses the trusted Mainnet API gateway.
 * - Pi UID and network authority are never sent through the
 *   Mainnet browser API adapter.
 */
(function (window, document) {
  "use strict";

  let user = null;
  let id = null;
  let status = "draft";
  let edit = false;
  let saving = false;

  const logoState = {
    url: null,
    path: null,
    width: null,
    height: null,
    format: null,
    size_bytes: null
  };

  const $ = id => document.getElementById(id);

  function setStatus(message, type) {
    const element = $("formStatus");

    if (element) {
      element.textContent = String(message || "");
      element.className =
        "form-status" + (type ? " " + type : "");
    }
  }

  function setLogoStatus(message, type) {
    const element = $("externalCreateLogoStatus");

    if (element) {
      element.textContent = String(message || "");
      element.className =
        "form-status" + (type ? " " + type : "");
    }
  }

  function deps() {
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

    if (!window.ALBukhrExternalProjectApi) {
      throw new Error(
        "ALBUKHR External Project API is unavailable."
      );
    }

    if (!window.ALBukhrEnvironment.isKnown()) {
      throw new Error(
        "ALBUKHR environment is not recognized."
      );
    }
  }

  function net() {
    const network = String(
      window.ALBukhrEnvironment.getNetwork() || ""
    ).trim().toLowerCase();

    if (!["mainnet", "testnet"].includes(network)) {
      throw new Error("Invalid ALBUKHR network.");
    }

    return network;
  }

  function uid() {
    const value =
      window.AlbukhrPageAuthGuard?.getPiUid?.() ||
      user?.pi_uid ||
      user?.uid;

    if (!value) {
      throw new Error(
        "Authenticated Pi UID is unavailable."
      );
    }

    return String(value).trim();
  }

  function val(key) {
    const element = $(key);

    return element
      ? String(element.value || "").trim()
      : "";
  }

  function norm(value) {
    return String(value || "draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function editable(value) {
    return ["draft", "needs_revision"].includes(
      norm(value)
    );
  }

  function payload() {
    return {
      p_project_name: val("projectName"),
      p_business_name: val("businessName"),
      p_country: val("country"),
      p_contact_email: val("contactEmail"),

      p_project_code: val("projectCode") || null,
      p_project_slug: val("projectSlug") || null,
      p_project_description:
        val("projectDescription") || null,

      p_business_registration_number:
        val("businessRegistrationNumber") || null,

      p_industry: val("industry") || null,
      p_category: val("category") || null,
      p_state: val("state") || null,
      p_city: val("city") || null,

      p_business_address:
        val("businessAddress") || null,

      p_website: val("website") || null,
      p_contact_phone: val("contactPhone") || null,
      p_pi_wallet: val("piWallet") || null,

      p_funding_required: val("fundingRequired")
        ? Number(val("fundingRequired"))
        : null,

      p_funding_asset: val("fundingAsset") || "PI",

      p_investment_model:
        val("investmentModel") || null,

      p_project_duration_days:
        val("projectDurationDays")
          ? Number(val("projectDurationDays"))
          : null
    };
  }

  function validate(data) {
    for (const key of [
      "p_project_name",
      "p_business_name",
      "p_country",
      "p_contact_email"
    ]) {
      if (!String(data[key] || "").trim()) {
        throw new Error(
          "Please complete all required fields."
        );
      }
    }

    if (
      (data.p_project_description || "").length > 10000
    ) {
      throw new Error(
        "Project description is too long."
      );
    }

    if (
      data.p_funding_required !== null &&
      (
        !Number.isFinite(data.p_funding_required) ||
        data.p_funding_required <= 0
      )
    ) {
      throw new Error(
        "Funding Required must be greater than zero."
      );
    }

    if (
      data.p_project_duration_days !== null &&
      (
        !Number.isInteger(data.p_project_duration_days) ||
        data.p_project_duration_days < 1
      )
    ) {
      throw new Error(
        "Project Duration must be at least 1 day."
      );
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        data.p_contact_email
      )
    ) {
      throw new Error(
        "Please provide a valid contact email."
      );
    }
  }

  function map(row) {
    const values = {
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

    Object.entries(values).forEach(([key, value]) => {
      const element = $(key);

      if (
        element &&
        value !== null &&
        value !== undefined
      ) {
        element.value = value;
      }
    });

    setLogoState(row);
  }

  function setLogoState(value) {
    const row = value || {};

    logoState.url = row.logo_url || null;
    logoState.path = row.logo_path || null;
    logoState.width = row.logo_width ?? null;
    logoState.height = row.logo_height ?? null;
    logoState.format = row.logo_format || null;
    logoState.size_bytes = row.logo_size_bytes ?? null;

    renderLogo();
  }

  function logoIsReady() {
    return !!(
      logoState.url &&
      Number(logoState.width) >= 400 &&
      Number(logoState.height) >= 400 &&
      ["png", "jpg", "jpeg"].includes(
        String(logoState.format || "").toLowerCase()
      ) &&
      Number(logoState.size_bytes) > 0 &&
      Number(logoState.size_bytes) <= 1048576
    );
  }

  function renderLogo() {
    const image = $("externalCreateLogoImage");
    const empty = $("externalCreateLogoEmpty");

    if (image) {
      if (logoState.url) {
        image.src =
          logoState.url +
          (logoState.url.includes("?") ? "&" : "?") +
          "v=" +
          Date.now();

        image.hidden = false;
      } else {
        image.removeAttribute("src");
        image.hidden = true;
      }
    }

    if (empty) {
      empty.hidden = !!logoState.url;
    }

    if (net() === "testnet") {
      setLogoStatus(
        "Project logo is handled by the Mainnet External Project flow.",
        "info"
      );
      return;
    }

    if (logoIsReady()) {
      setLogoStatus(
        "Logo registered: " +
          logoState.width +
          " × " +
          logoState.height +
          " px • " +
          String(logoState.format || "").toUpperCase() +
          " • " +
          Math.round(
            Number(logoState.size_bytes) / 1024
          ) +
          " KB.",
        "success"
      );
    } else {
      setLogoStatus(
        edit
          ? "A valid project logo is required before this application can be submitted."
          : "A valid project logo is required for Mainnet application creation.",
        "error"
      );
    }
  }

  function allowedLogoMime(file) {
    const type = String(file?.type || "").toLowerCase();

    if (type === "image/png" || type === "image/jpeg") {
      return type;
    }

    const name = String(file?.name || "").toLowerCase();

    if (name.endsWith(".png")) {
      return "image/png";
    }

    if (
      name.endsWith(".jpg") ||
      name.endsWith(".jpeg")
    ) {
      return "image/jpeg";
    }

    return "";
  }

  function inspectLogo(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("Select a project logo first."));
        return;
      }

      if (file.size <= 0) {
        reject(
          new Error("The selected project logo is empty.")
        );
        return;
      }

      if (file.size > 1048576) {
        reject(
          new Error(
            "Project logo must be no larger than 1 MB."
          )
        );
        return;
      }

      const mime = allowedLogoMime(file);

      if (!mime) {
        reject(
          new Error(
            "Project logo must be PNG or JPG/JPEG only."
          )
        );
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const width = Number(
          image.naturalWidth || image.width || 0
        );

        const height = Number(
          image.naturalHeight || image.height || 0
        );

        URL.revokeObjectURL(objectUrl);

        if (width < 400 || height < 400) {
          reject(
            new Error(
              "Project logo must be at least 400 × 400 pixels."
            )
          );
          return;
        }

        resolve({ mime, width, height });
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);

        reject(
          new Error(
            "The selected project logo could not be read as a valid image."
          )
        );
      };

      image.src = objectUrl;
    });
  }

  function previewLogo(file) {
    const image = $("externalCreateLogoImage");
    const empty = $("externalCreateLogoEmpty");

    if (!image) return;

    if (!file) {
      if (!logoState.url) {
        image.removeAttribute("src");
        image.hidden = true;

        if (empty) {
          empty.hidden = false;
        }
      }

      return;
    }

    const url = URL.createObjectURL(file);

    image.src = url;
    image.hidden = false;

    if (empty) {
      empty.hidden = true;
    }

    image.onload = () => URL.revokeObjectURL(url);
  }

  async function loadLogo() {
    if (net() !== "mainnet" || !id) return;

    try {
      const data =
        await window.ALBukhrExternalProjectApi.getLogo(id);

      const row = Array.isArray(data) ? data[0] : data;

      if (row) {
        setLogoState(row);
      }
    } catch (error) {
      console.warn(
        "[ALBUKHR EXTERNAL CREATE] Logo load failed:",
        error
      );
    }
  }

  async function rpc(name, parameters) {
    const result =
      await window.ALBUKHR_SUPABASE.rpc(
        name,
        parameters
      );

    if (result.error) {
      throw result.error;
    }

    return result.data;
  }

  function params(extra) {
    return Object.assign(
      {
        p_application_id: id,
        p_pi_uid: uid(),
        p_network: net()
      },
      extra || {}
    );
  }

  async function load() {
    setStatus(
      "Loading your external project application..."
    );

    const data = net() === "mainnet"
      ? await window.ALBukhrExternalProjectApi
          .getApplication(id)
      : await rpc(
          "get_my_external_project_detail",
          params()
        );

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      throw new Error(
        "Application was not found or access was denied."
      );
    }

    status = norm(row.status);

    if (!editable(status)) {
      throw new Error(
        "This application cannot be edited in its current status."
      );
    }

    map(row);

    if (net() === "mainnet") {
      await loadLogo();
    }

    setStatus(
      status === "needs_revision"
        ? "ALBUKHR requested changes. Update the application, then continue from the detail page."
        : "Application loaded successfully. You can continue editing.",
      "success"
    );
  }

  async function create(data) {
    const result = net() === "mainnet"
      ? await window.ALBukhrExternalProjectApi
          .createApplication(data)
      : await rpc(
          "create_my_external_project_application",
          Object.assign(
            {
              p_pi_uid: uid(),
              p_network: net()
            },
            data
          )
        );

    const candidate =
      result && typeof result === "object"
        ? (
            result.application_id ||
            result.id ||
            result.data?.application_id ||
            result.data?.id ||
            result.data ||
            ""
          )
        : result;

    const applicationId =
      String(candidate || "").trim();

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(applicationId)
    ) {
      throw new Error(
        "The server did not return a valid application ID. The logo cannot be safely attached."
      );
    }

    return applicationId;
  }

  async function update(data) {
    const result = net() === "mainnet"
      ? await window.ALBukhrExternalProjectApi
          .updateApplication(id, data)
      : await rpc(
          "update_my_external_project_application",
          Object.assign(
            {
              p_application_id: id,
              p_pi_uid: uid(),
              p_network: net()
            },
            data
          )
        );

    if (result !== true) {
      throw new Error(
        "Application update was not accepted."
      );
    }
  }

  async function uploadLogoForApplication(
    applicationId,
    file
  ) {
    if (net() !== "mainnet") {
      throw new Error(
        "Secure External Project logo upload is currently available on MAINNET only."
      );
    }

    const metadata = await inspectLogo(file);

    setLogoStatus(
      "Uploading and registering project logo securely.",
      "loading"
    );

    const result =
      await window.ALBukhrExternalProjectApi.uploadLogo(
        applicationId,
        file
      );

    const data = result || {};

    setLogoState({
      logo_url: data.logo_url,
      logo_path: data.logo_path,
      logo_width: data.logo_width ?? metadata.width,
      logo_height: data.logo_height ?? metadata.height,
      logo_format:
        data.logo_format ||
        (metadata.mime === "image/png" ? "png" : "jpg"),
      logo_size_bytes: data.logo_size_bytes ?? file.size
    });

    if (!logoIsReady()) {
      throw new Error(
        "The upload response did not confirm a valid registered logo."
      );
    }

    setLogoStatus(
      "Project logo uploaded and registered successfully.",
      "success"
    );
  }

  function ui() {
    $("externalProjectForm")?.addEventListener(
      "submit",
      save
    );

    $("saveProjectLogoButton")?.addEventListener(
      "click",
      event => save(event, { logoOnly: true })
    );

    $("cancelButton")?.addEventListener(
      "click",
      () => location.assign(
        "external-project-dashboard.html"
      )
    );

    const nameInput = $("projectName");
    const slugInput = $("projectSlug");

    nameInput?.addEventListener("input", () => {
      if (slugInput && !slugInput.value.trim()) {
        slugInput.value = String(nameInput.value || "")
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }
    });

    $("externalCreateLogoFile")?.addEventListener(
      "change",
      async () => {
        const file =
          $("externalCreateLogoFile")?.files?.[0] || null;

        if (!file) {
          renderLogo();
          return;
        }

        previewLogo(file);

        try {
          const metadata = await inspectLogo(file);

          setLogoStatus(
            "Selected logo: " +
              metadata.width +
              " × " +
              metadata.height +
              " px • " +
              metadata.mime
                .toUpperCase()
                .replace("IMAGE/", "") +
              ". Ready to save.",
            "success"
          );
        } catch (error) {
          setLogoStatus(
            error?.message || "Invalid project logo.",
            "error"
          );
        }
      }
    );
  }

  function auth() {
    const network = net();
    const username =
      user?.username ||
      user?.pi_username ||
      "ALBUKHR User";

    if ($("networkIndicator")) {
      $("networkIndicator").textContent =
        network.toUpperCase();
    }

    if ($("authUsername")) {
      $("authUsername").textContent = username;
    }

    if ($("authNetwork")) {
      $("authNetwork").textContent =
        "Authenticated with Pi • " +
        network.toUpperCase();
    }

    if ($("authAvatar")) {
      $("authAvatar").textContent =
        username.charAt(0).toUpperCase();
    }

    if (edit) {
      if ($("modeEyebrow")) {
        $("modeEyebrow").textContent =
          "EXTERNAL PROJECT APPLICATION";
      }

      if ($("pageTitle")) {
        $("pageTitle").textContent =
          "Edit External Project";
      }
    }

    const logoSection =
      document.querySelector(".external-logo-section");

    if (logoSection) {
      logoSection.hidden = network === "testnet";
    }

    renderLogo();
  }

  function keepEditingAfterCreate(applicationId) {
    id = applicationId;
    edit = true;
    status = "draft";

    const next =
      "external-create.html?application_id=" +
      encodeURIComponent(id);

    window.history.replaceState(
      { applicationId: id },
      "",
      next
    );

    if ($("modeEyebrow")) {
      $("modeEyebrow").textContent =
        "EXTERNAL PROJECT APPLICATION";
    }

    if ($("pageTitle")) {
      $("pageTitle").textContent =
        "Edit External Project";
    }

    if ($("saveDraftButton")) {
      $("saveDraftButton").textContent =
        "Save Changes";
    }
  }

  async function save(event, options) {
    if (
      event &&
      typeof event.preventDefault === "function"
    ) {
      event.preventDefault();
    }

    if (saving) return;
    saving = true;

    const logoOnly = options?.logoOnly === true;

    const button = $(
      logoOnly
        ? "saveProjectLogoButton"
        : "saveDraftButton"
    );

    const form = $("externalProjectForm");

    let mainnet = false;
    let selectedLogo = null;
    let uploadStarted = false;

    try {
      mainnet = net() === "mainnet";

      selectedLogo =
        $("externalCreateLogoFile")?.files?.[0] || null;

      /*
       * Independent Save Logo operation.
       * A new project needs a draft ID before the logo can
       * be securely associated with its application.
       */
      if (logoOnly) {
        if (!mainnet) {
          throw new Error(
            "Secure External Project logo upload is currently available on MAINNET only."
          );
        }

        if (!selectedLogo) {
          throw new Error("Select a project logo first.");
        }

        await inspectLogo(selectedLogo);

        if (!id) {
          if (form && !form.checkValidity()) {
            form.reportValidity();

            throw new Error(
              "Complete all required fields before creating the draft and saving its logo."
            );
          }

          const data = payload();
          validate(data);

          if (button) {
            button.disabled = true;
            button.textContent = "Creating Draft...";
          }

          id = await create(data);
          keepEditingAfterCreate(id);
        }

        if (!id) {
          throw new Error(
            "Application ID is unavailable. The logo cannot be saved."
          );
        }

        if (button) {
          button.disabled = true;
          button.textContent = "Uploading Logo...";
        }

        uploadStarted = true;

        await uploadLogoForApplication(
          id,
          selectedLogo
        );

        setStatus(
          "Project logo saved successfully. Your application draft is available to continue editing.",
          "success"
        );

        renderLogo();
        return;
      }

      /*
       * Explicit validation is needed because the form uses
       * novalidate. This checks required fields and input types.
       */
      if (form && !form.checkValidity()) {
        form.reportValidity();

        throw new Error(
          "Complete all required fields and correct any invalid values."
        );
      }

      const data = payload();
      validate(data);

      if (mainnet) {
        if (!edit && !selectedLogo) {
          throw new Error(
            "Project logo is required before creating a Mainnet application. Select a logo or use Save Logo."
          );
        }

        if (
          edit &&
          !logoIsReady() &&
          !selectedLogo
        ) {
          throw new Error(
            "Project logo is required before this Mainnet application can continue. Select a logo and use Save Logo to retry."
          );
        }

        if (selectedLogo) {
          await inspectLogo(selectedLogo);
        }
      }

      if (button) {
        button.disabled = true;
        button.textContent =
          edit ? "Saving..." : "Creating...";
      }

      if (edit) {
        await update(data);

        if (mainnet && selectedLogo) {
          if (button) {
            button.textContent = "Uploading Logo...";
          }

          uploadStarted = true;

          await uploadLogoForApplication(
            id,
            selectedLogo
          );
        }

        setStatus(
          mainnet && !logoIsReady()
            ? "Application changes saved, but a valid project logo is still required. Use Save Logo to retry the upload."
            : "Application changes saved successfully.",
          mainnet && !logoIsReady()
            ? "error"
            : "success"
        );

        renderLogo();
      } else {
        id = await create(data);

        /*
         * Keep the application ID and URL before upload.
         * If the upload fails, retrying won't create a new ID.
         */
        keepEditingAfterCreate(id);

        if (mainnet) {
          if (button) {
            button.textContent = "Uploading Logo...";
          }

          uploadStarted = true;

          await uploadLogoForApplication(
            id,
            selectedLogo
          );
        }

        location.replace(
          "external-project-detail.html?application_id=" +
          encodeURIComponent(id)
        );

        return;
      }
    } catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL CREATE]",
        error
      );

      if (uploadStarted && selectedLogo && mainnet) {
        setLogoStatus(
          "Logo upload was not confirmed: " +
            (error?.message || "Unknown error"),
          "error"
        );
      }

      if (id && edit && mainnet && !logoIsReady()) {
        setStatus(
          "Application draft exists, but the project logo is not registered: " +
            (error?.message || "Unknown error") +
            " Select the logo and use Save Logo to retry without creating another application.",
          "error"
        );
      } else {
        setStatus(
          "Unable to save application: " +
            (error?.message || "Unknown error"),
          "error"
        );
      }
    } finally {
      saving = false;

      if (button) {
        button.disabled = false;

        button.textContent = logoOnly
          ? "Save Logo"
          : edit
            ? "Save Changes"
            : "Create Application";
      }
    }
  }

  async function init() {
    try {
      deps();

      user =
        await window.AlbukhrPageAuthGuard.waitForAuth();

      if (!user) return;

      id = new URLSearchParams(
        location.search
      ).get("application_id");

      edit = !!id;

      ui();
      auth();

      if (edit) {
        await load();
      } else {
        renderLogo();

        setStatus(
          "Complete the project information and create your application."
        );
      }
    } catch (error) {
      console.error(
        "[ALBUKHR EXTERNAL CREATE]",
        error
      );

      setStatus(
        "Application form unavailable: " +
          (error?.message || "Unknown error"),
        "error"
      );

      if ($("saveDraftButton")) {
        $("saveDraftButton").disabled = true;
      }

      if ($("saveProjectLogoButton")) {
        $("saveProjectLogoButton").disabled = true;
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init,
      { once: true }
    );
  } else {
    init();
  }

})(window, document);
