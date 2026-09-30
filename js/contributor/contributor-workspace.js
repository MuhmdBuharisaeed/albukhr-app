/* =========================================================
   ALBUKHR CONTRIBUTOR WORKSPACE
   - Mainnet Contributor workspace
   - No LocalStorage / sessionStorage
   - Pi Auth + Page Auth Guard for identity
   - ALBUKHR API Gateway for all protected Contributor data
   - No direct browser access to albukhr_security schema
   - No direct browser access to Supabase Storage
   - Contributor registration profile
   - Server-side Contributor entitlement and project authority
   ========================================================= */
(function(window){
  "use strict";

  let currentUser = null;
  let workspace = null;
  let project = null;
  let contributorProfile = null;

  /*
   * API Gateway contract:
   *
   * GET    /api/contributor/workspace
   * GET    /api/contributor/profile
   * POST   /api/contributor/profile
   * GET    /api/contributor/community?network=mainnet
   * POST   /api/contributor/project
   * POST   /api/contributor/project/update
   * POST   /api/contributor/project/logo?project_id=:projectId
   * POST   /api/contributor/project/submit
   * GET    /api/contributor/project/reviews?project_id=:projectId
   *
   * The browser never sends p_pi_uid. The gateway derives the Pi UID
   * from the verified Pi access token.
   *
   * IMPORTANT RESPONSE CONTRACT:
   * ALBUKHR API Core returns the gateway HTTP response's `data` field.
   * Contributor gateway routes then return:
   *
   * {
   *   success: true,
   *   network: "mainnet",
   *   data: { ...authoritative contributor payload... }
   * }
   *
   * gatewayRequest() below unwraps that second `data` envelope so the
   * rest of this file works with the actual Contributor payload.
   */

  const $ = (id) => document.getElementById(id);

  function setText(id, value){
    const el = $(id);
    if (el) el.textContent = value == null ? "—" : String(value);
  }

  function setStatus(message, kind="info"){
    const el = $("pageStatus");
    if (!el) return;

    el.textContent = String(message || "");
    el.className = `status${kind === "error" ? " error" : ""}`;
  }

  function setProfileStatus(message, kind="info"){
    const el = $("profileStatus");
    if (!el) return;

    el.textContent = String(message || "");
    el.className =
      `contributor-status-text${kind === "error" ? " error" : ""}`;
  }

  function setInlineStatus(message, kind="info"){
    const el = $("logoStatus");
    if (!el) return;

    el.textContent = String(message || "");
    el.className =
      `inline-status${kind === "error" ? " error" : ""}`;
  }

  function show(id, visible=true){
    const el = $(id);
    if (el) el.classList.toggle("hidden", !visible);
  }

  function formatDate(value){
    if (!value) return "—";

    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleString();
  }

  function normalizeError(error, fallback){
    if (error instanceof Error && error.message){
      return error.message;
    }

    const message =
      error?.message ||
      error?.error?.message ||
      error?.details?.message ||
      error?.data?.message;

    if (message) return String(message);

    if (typeof error === "string" && error.trim()){
      return error.trim();
    }

    return fallback || "Request failed.";
  }

  function maskValue(value, start=4, end=4){
    const text = String(value || "").trim();

    if (!text) return "—";

    if (text.length <= start + end + 3){
      return "••••••";
    }

    return `${text.slice(0,start)}••••••${text.slice(-end)}`;
  }

  function getApi(){
    const api = window.AlbukhrApi;

    if (!api || typeof api.request !== "function"){
      throw new Error(
        "ALBUKHR API Core is unavailable. Please reload the page."
      );
    }

    return api;
  }

  function assertMainnet(){
    const userNetwork = String(
      currentUser?.network ||
      window.AlbukhrPiAuth?.getNetwork?.() ||
      ""
    ).trim().toLowerCase();

    if (userNetwork && userNetwork !== "mainnet"){
      throw new Error(
        "The Contributor Workspace is available on Mainnet only."
      );
    }
  }

  function unwrapGatewayPayload(response){
    /*
     * ALBUKHR API Core returns the HTTP response's `data` field.
     *
     * Example after AlbukhrApi.request():
     * {
     *   success: true,
     *   network: "mainnet",
     *   data: {
     *     success: true,
     *     contributor: {...}
     *   }
     * }
     *
     * The actual Contributor payload is therefore response.data.
     *
     * Keep this tolerant so the frontend also works if a future API
     * Core version already unwraps the inner envelope.
     */
    if (
      response &&
      typeof response === "object" &&
      !Array.isArray(response) &&
      response.data &&
      typeof response.data === "object" &&
      !Array.isArray(response.data) &&
      response.success === true
    ){
      return response.data;
    }

    return response;
  }

  async function gatewayRequest(path, options={}){
    assertMainnet();

    const api = getApi();

    try {
      const response = await api.request(path, options);
      const data = unwrapGatewayPayload(response);

      if (data?.success === false){
        throw new Error(
          data?.message ||
          data?.error?.message ||
          "Contributor gateway request failed."
        );
      }

      return data;
    } catch (error){
      throw new Error(
        normalizeError(
          error,
          "Contributor gateway request failed."
        )
      );
    }
  }

  async function gatewayGet(path){
    return gatewayRequest(path, {
      method: "GET"
    });
  }

  async function gatewayJson(path, method, body){
    return gatewayRequest(path, {
      method,
      body: JSON.stringify(body || {})
    });
  }

  function renderLogo(url){
    const preview = $("projectLogoPreview");
    if (!preview) return;

    preview.replaceChildren();

    if (url){
      const img = document.createElement("img");

      img.src = url;
      img.alt = "Project logo";
      img.loading = "lazy";

      preview.appendChild(img);
      return;
    }

    preview.textContent =
      (project?.name || "A").slice(0,1).toUpperCase();
  }

  function renderContributorProfile(data){
    const identity = data?.identity || {};
    const profile = data?.profile || null;

    contributorProfile = profile;

    setText(
      "profilePiUsername",
      identity.username ||
      currentUser?.username ||
      "—"
    );

    setText(
      "profilePiUid",
      maskValue(
        identity.pi_uid ||
        currentUser?.pi_uid,
        5,
        4
      )
    );

    setText(
      "profileWallet",
      maskValue(
        identity.wallet_address ||
        currentUser?.wallet_address,
        6,
        4
      )
    );

    setText(
      "profileEmail",
      identity.email || "—"
    );

    const complete =
      data?.profile_complete === true;

    const badge =
      $("profileStatusBadge");

    if (badge){
      badge.textContent =
        complete
          ? "COMPLETED"
          : "INCOMPLETE";

      badge.classList.toggle(
        "success",
        complete
      );

      badge.classList.toggle(
        "warning",
        !complete
      );
    }

    const fields = {
      profileFullName:
        profile?.full_name || "",

      profileCountryCode:
        profile?.country_code || "",

      profilePhone:
        profile?.phone || "",

      profileOccupation:
        profile?.occupation || "",

      profileExpertise:
        profile?.primary_expertise || "",

      profileExperience:
        profile?.experience_summary || "",

      profileAreas:
        Array.isArray(profile?.contribution_areas)
          ? profile.contribution_areas.join(", ")
          : "",

      profileStatement:
        profile?.contribution_statement || ""
    };

    Object.entries(fields).forEach(
      ([id,value])=>{
        const el = $(id);

        if (
          el &&
          document.activeElement !== el
        ){
          el.value = value;
        }
      }
    );

    const confirm =
      $("profileConfirm");

    if (confirm && complete){
      confirm.checked = true;
    }

    const button =
      $("saveProfileButton");

    if (button){
      button.textContent =
        complete
          ? "Update Contributor Profile"
          : "Save & Complete Contributor Profile";
    }

    setProfileStatus(
      complete
        ? "Your Contributor registration profile is complete. You may update it at any time."
        : "Complete this profile before creating your one Internal Project."
    );
  }

  async function loadContributorProfile(){
    const data =
      await gatewayGet(
        "/api/contributor/profile"
      );

    if (!data?.success){
      throw new Error(
        data?.message ||
        "Contributor profile is unavailable."
      );
    }

    renderContributorProfile(data);

    return data;
  }

  function renderWorkspace(data){
    workspace = data || null;

    if (
      !data?.success ||
      !data?.contributor
    ){
      show("workspacePanel", false);
      show("accessDeniedPanel", true);

      setText(
        "authorization",
        "DENIED"
      );

      setText(
        "contributorStatus",
        "—"
      );

      setText(
        "entitlementStatus",
        "—"
      );

      return;
    }

    show(
      "workspacePanel",
      true
    );

    show(
      "accessDeniedPanel",
      false
    );

    const contributor =
      data.contributor;

    const entitlement =
      data.project_entitlement || {};

    project =
      data.project || null;

    setText(
      "authorization",
      "AUTHORIZED"
    );

    setText(
      "contributorStatus",
      String(
        contributor.status ||
        "unknown"
      ).toUpperCase()
    );

    setText(
      "entitlementStatus",
      String(
        entitlement.status ||
        "unknown"
      ).toUpperCase()
    );

    setText(
      "statusBadge",
      String(
        contributor.status ||
        "unknown"
      ).toUpperCase()
    );

    setText(
      "contributorId",
      contributor.id
    );

    setText(
      "workspaceContributorId",
      contributor.id
    );

    setText(
      "workspaceContributorStatus",
      String(
        contributor.status ||
        "unknown"
      ).toUpperCase()
    );

    setText(
      "registeredAt",
      formatDate(
        contributor.registered_at
      )
    );

    setText(
      "networkValue",
      "MAINNET"
    );

    setText(
      "entitlementValue",
      entitlement.status === "claimed"
        ? "CLAIMED · 1 / 1"
        : "AVAILABLE · 0 / 1"
    );

    const profileComplete =
      data.profile_complete === true;

    if (project){
      renderProject(project);

      show(
        "createPanel",
        false
      );

      show(
        "accessDeniedPanel",
        false
      );
    } else {
      show(
        "projectPanel",
        false
      );

      const canCreate =
        contributor.status === "active" &&
        entitlement.can_create === true &&
        profileComplete;

      show(
        "createPanel",
        canCreate
      );

      if (
        contributor.status !==
        "active"
      ){
        setText(
          "accessDeniedText",
          "Your Contributor record is not active. Project creation is unavailable until the Contributor status is active."
        );

        show(
          "accessDeniedPanel",
          true
        );
      } else if (!profileComplete){
        setText(
          "accessDeniedText",
          "Complete your Contributor Registration Profile before creating your Internal Project."
        );

        show(
          "accessDeniedPanel",
          true
        );
      } else if (!canCreate){
        setText(
          "accessDeniedText",
          "Your one-project Contributor entitlement is not currently available for a new Internal Project."
        );

        show(
          "accessDeniedPanel",
          true
        );
      } else {
        show(
          "accessDeniedPanel",
          false
        );
      }
    }

    loadCommunity().catch(
      (error)=>{
        console.warn(
          "[ALBUKHR CONTRIBUTOR COMMUNITY]",
          error
        );

        setText(
          "communityText",
          "Official Contributor community access is not currently configured."
        );

        show(
          "communityResource",
          false
        );
      }
    );
  }

  function renderProject(p){
    project = p;

    show(
      "projectPanel",
      true
    );

    show(
      "createPanel",
      false
    );

    setText(
      "projectTitle",
      p.name ||
      "Your Internal Project"
    );

    setText(
      "projectSubtitle",
      `${String(
        p.status ||
        "unknown"
      ).toUpperCase()} · Contributor-owned Internal Project`
    );

    setText(
      "projectStatusBadge",
      String(
        p.status ||
        "unknown"
      ).toUpperCase()
    );

    setText(
      "projectCode",
      p.project_code
    );

    setText(
      "internalNumber",
      p.internal_number ||
      "Internal number pending"
    );

    setText(
      "projectNetwork",
      String(
        p.network ||
        "mainnet"
      ).toUpperCase()
    );

    const status =
      String(
        p.status || ""
      ).toLowerCase();

    const editable =
      status === "draft";

    const logoUrl =
      p.logo_url || null;

    renderLogo(logoUrl);

    show(
      "editPanel",
      editable
    );

    show(
      "logoPanel",
      editable
    );

    show(
      "reviewPanel",
      status !== "draft"
    );

    if (editable){
      const slug =
        $("editProjectSlug");

      const name =
        $("editProjectName");

      const description =
        $("editProjectDescription");

      if (slug){
        slug.value =
          p.slug || "";
      }

      if (name){
        name.value =
          p.name || "";
      }

      if (description){
        description.value =
          p.description || "";
      }
    }

    const logoFormat =
      String(
        p.logo_format || ""
      ).toLowerCase();

    const ready =
      Boolean(
        String(
          p.description || ""
        ).trim() &&

        p.logo_url &&

        Number(p.logo_width) >= 400 &&

        Number(p.logo_height) >= 400 &&

        Number(p.logo_size_bytes) > 0 &&

        Number(p.logo_size_bytes) <= 1048576 &&

        [
          "png",
          "jpg",
          "jpeg",
          "image/png",
          "image/jpeg"
        ].includes(logoFormat)
      );

    const submit =
      $("submitProjectButton");

    if (submit){
      submit.disabled =
        !editable || !ready;

      submit.textContent =
        editable
          ? (
              ready
                ? "Submit for Review"
                : "Complete Logo & Description First"
            )
          : "Submission Locked";
    }

    if (status === "pending"){
      setText(
        "submissionText",
        "Your project is pending ALBUKHR review. Project details and logo changes are locked while it is under review."
      );
    } else if (status === "approved"){
      setText(
        "submissionText",
        "Your project has been approved into the governed project registry. Further activation and financial configuration remain separate governance steps."
      );
    } else if (status === "archived"){
      setText(
        "submissionText",
        "This project has been archived after a review decision. Your one-project Contributor entitlement remains consumed."
      );
    } else {
      setText(
        "submissionText",
        ready
          ? "Your project is ready to submit for ALBUKHR review."
          : "Complete your project details and compliant logo, then submit for ALBUKHR review."
      );
    }

    loadReviews(
      p.id
    ).catch(
      (error)=>{
        console.warn(
          "[ALBUKHR CONTRIBUTOR REVIEWS]",
          error
        );
      }
    );
  }

  async function loadWorkspace(){
    setStatus(
      "Loading Contributor workspace…"
    );

    const data =
      await gatewayGet(
        "/api/contributor/workspace"
      );

    if (!data?.success){
      throw new Error(
        data?.message ||
        "Contributor workspace is unavailable."
      );
    }

    renderWorkspace(data);

    setStatus("");
  }

  async function loadCommunity(){
    const data =
      await gatewayGet(
        "/api/contributor/community?network=mainnet"
      );

    const resources =
      Array.isArray(data?.resources)
        ? data.resources
        : [];

    const telegram =
      resources.find(
        (r)=>
          r?.resource_type ===
            "telegram_private_group" &&
          r?.invite_url
      );

    if (telegram){
      setText(
        "communityText",
        "Your active Contributor status provides access to the official private Contributor community."
      );

      setText(
        "communityName",
        telegram.resource_name ||
        "Private Contributor Group"
      );

      const button =
        $("communityButton");

      if (button){
        button.href =
          telegram.invite_url;

        button.target =
          "_blank";

        button.rel =
          "noopener noreferrer";
      }

      show(
        "communityResource",
        true
      );
    } else {
      setText(
        "communityText",
        "The private Contributor community link will appear here once the official resource is configured by ALBUKHR administration."
      );

      show(
        "communityResource",
        false
      );
    }
  }

  async function saveContributorProfile(event){
    event.preventDefault();

    const button =
      $("saveProfileButton");

    if (!button) return;

    const fullName =
      $("profileFullName")
        ?.value.trim() || "";

    const countryCode =
      $("profileCountryCode")
        ?.value.trim()
        .toUpperCase() || "";

    const phone =
      $("profilePhone")
        ?.value.trim() || "";

    const occupation =
      $("profileOccupation")
        ?.value.trim() || "";

    const expertise =
      $("profileExpertise")
        ?.value.trim() || "";

    const experience =
      $("profileExperience")
        ?.value.trim() || "";

    const areas =
      ($("profileAreas")?.value || "")
        .split(",")
        .map(
          value =>
            value.trim().toLowerCase()
        )
        .filter(Boolean)
        .filter(
          (value,index,array)=>
            array.indexOf(value) === index
        );

    const statement =
      $("profileStatement")
        ?.value.trim() || "";

    const confirmed =
      $("profileConfirm")
        ?.checked === true;

    if (
      !fullName ||
      countryCode.length !== 2 ||
      !occupation ||
      !expertise ||
      experience.length < 20 ||
      statement.length < 20 ||
      areas.length < 1 ||
      !confirmed
    ){
      setProfileStatus(
        "Complete all required fields, provide at least one contribution area, and confirm the information is accurate.",
        "error"
      );

      return;
    }

    try {
      button.disabled = true;
      button.textContent = "Saving…";

      setProfileStatus(
        "Saving your Contributor registration profile…"
      );

      const data =
        await gatewayJson(
          "/api/contributor/profile",
          "POST",
          {
            full_name:
              fullName,

            country_code:
              countryCode,

            phone,

            occupation,

            primary_expertise:
              expertise,

            experience_summary:
              experience,

            contribution_areas:
              areas,

            contribution_statement:
              statement,

            confirm_information:
              confirmed
          }
        );

      if (!data?.success){
        throw new Error(
          data?.message ||
          "Contributor profile could not be saved."
        );
      }

      await loadContributorProfile();
      await loadWorkspace();

      setProfileStatus(
        "Contributor profile completed successfully. Your Internal Project creation route is now available when the entitlement is available."
      );

      setStatus(
        "Contributor profile saved."
      );
    } catch (error){
      console.error(
        "[ALBUKHR CONTRIBUTOR PROFILE]",
        error
      );

      setProfileStatus(
        normalizeError(
          error,
          "Contributor profile could not be saved."
        ),
        "error"
      );
    } finally {
      button.disabled = false;

      const complete =
        contributorProfile?.profile_status ===
        "completed";

      button.textContent =
        complete
          ? "Update Contributor Profile"
          : "Save & Complete Contributor Profile";
    }
  }

  async function createProject(event){
    event.preventDefault();

    const button =
      $("createProjectButton");

    if (!button) return;

    try {
      button.disabled = true;
      button.textContent =
        "Creating draft…";

      setStatus(
        "Creating your single Internal Project entitlement claim…"
      );

      /*
       * The API route is:
       * POST /api/contributor/project
       *
       * The browser supplies project fields only.
       * The gateway supplies the verified Pi identity to the DB RPC.
       */
      const data =
        await gatewayJson(
          "/api/contributor/project",
          "POST",
          {
            project_code:
              $("createProjectCode")
                ?.value.trim() || "",

            slug:
              $("createProjectSlug")
                ?.value.trim() || "",

            name:
              $("createProjectName")
                ?.value.trim() || "",

            description:
              $("createProjectDescription")
                ?.value.trim() || ""
          }
        );

      if (!data?.success){
        throw new Error(
          data?.message ||
          "Project creation failed."
        );
      }

      /*
       * Reload authoritative state.
       * This must return the newly-created draft project.
       */
      await loadWorkspace();

      setStatus(
        "Internal Project draft created. Upload the required logo before submission."
      );
    } catch (error){
      console.error(
        "[ALBUKHR CREATE INTERNAL PROJECT]",
        error
      );

      setStatus(
        normalizeError(
          error,
          "Project creation failed."
        ),
        "error"
      );

      /*
       * Keep the form visible after an error.
       * Never silently return to the previous state.
       */
      button.disabled = false;
      button.textContent =
        "Create Internal Project Draft";
    }
  }

  async function saveProject(event){
    event.preventDefault();

    if (!project) return;

    const button =
      $("saveProjectButton");

    try {
      if (button){
        button.disabled = true;
      }

      setStatus(
        "Saving project details…"
      );

      /*
       * Actual gateway route:
       * POST /api/contributor/project/update
       */
      const data =
        await gatewayJson(
          "/api/contributor/project/update",
          "POST",
          {
            project_id:
              project.id,

            slug:
              $("editProjectSlug")
                ?.value.trim() || "",

            name:
              $("editProjectName")
                ?.value.trim() || "",

            description:
              $("editProjectDescription")
                ?.value.trim() || ""
          }
        );

      if (!data?.success){
        throw new Error(
          data?.message ||
          "Project update failed."
        );
      }

      await loadWorkspace();

      setStatus(
        "Project details saved."
      );
    } catch (error){
      console.error(
        "[ALBUKHR UPDATE INTERNAL PROJECT]",
        error
      );

      setStatus(
        normalizeError(
          error,
          "Project update failed."
        ),
        "error"
      );
    } finally {
      if (button){
        button.disabled = false;
      }
    }
  }

  function inspectImage(file){
    return new Promise(
      (resolve,reject)=>{
        const url =
          URL.createObjectURL(file);

        const img =
          new Image();

        img.onload = ()=>{
          const out = {
            width:
              img.naturalWidth,

            height:
              img.naturalHeight
          };

          URL.revokeObjectURL(url);

          resolve(out);
        };

        img.onerror = ()=>{
          URL.revokeObjectURL(url);

          reject(
            new Error(
              "The selected image could not be read."
            )
          );
        };

        img.src = url;
      }
    );
  }

  async function uploadLogo(){
    if (!project) return;

    const file =
      $("logoFile")
        ?.files?.[0];

    if (!file){
      setInlineStatus(
        "Select a PNG or JPG/JPEG logo first.",
        "error"
      );

      return;
    }

    const uploadButton =
      $("uploadLogoButton");

    try {
      setInlineStatus(
        "Validating logo…"
      );

      if (
        ![
          "image/png",
          "image/jpeg"
        ].includes(file.type)
      ){
        throw new Error(
          "Project logo must be PNG or JPG/JPEG."
        );
      }

      if (
        file.size <= 0 ||
        file.size > 1048576
      ){
        throw new Error(
          "Project logo must be no larger than 1 MB."
        );
      }

      const dimensions =
        await inspectImage(file);

      if (
        dimensions.width < 400 ||
        dimensions.height < 400
      ){
        throw new Error(
          "Project logo must be at least 400 × 400 pixels."
        );
      }

      if (uploadButton){
        uploadButton.disabled =
          true;

        uploadButton.textContent =
          "Uploading…";
      }

      /*
       * The deployed gateway expects RAW image bytes:
       *
       * POST /api/contributor/project/logo?project_id=<id>
       * Content-Type: image/png | image/jpeg
       *
       * Do not use FormData here.
       * The API gateway itself:
       *   1. verifies Pi identity
       *   2. validates the image
       *   3. uploads to Supabase Storage
       *   4. records authoritative logo metadata
       */
      const path =
        `/api/contributor/project/logo?project_id=${encodeURIComponent(project.id)}`;

      const data =
        await gatewayRequest(
          path,
          {
            method: "POST",
            body: file,
            headers: {
              "Content-Type":
                file.type,

              "Accept":
                "application/json"
            }
          }
        );

      if (!data?.success){
        throw new Error(
          data?.message ||
          "Project logo could not be uploaded."
        );
      }

      const fileInput =
        $("logoFile");

      if (fileInput){
        fileInput.value = "";
      }

      setInlineStatus(
        "Logo uploaded and recorded successfully."
      );

      await loadWorkspace();

      setStatus(
        "Project logo updated."
      );
    } catch (error){
      console.error(
        "[ALBUKHR CONTRIBUTOR LOGO]",
        error
      );

      setInlineStatus(
        normalizeError(
          error,
          "Project logo upload failed."
        ),
        "error"
      );
    } finally {
      if (uploadButton){
        uploadButton.disabled =
          false;

        uploadButton.textContent =
          "Upload Project Logo";
      }
    }
  }

  async function submitProject(){
    if (!project) return;

    const button =
      $("submitProjectButton");

    if (
      !button ||
      button.disabled
    ){
      return;
    }

    try {
      button.disabled =
        true;

      button.textContent =
        "Submitting…";

      setStatus(
        "Submitting project for ALBUKHR review…"
      );

      /*
       * Actual gateway route:
       * POST /api/contributor/project/submit
       */
      const data =
        await gatewayJson(
          "/api/contributor/project/submit",
          "POST",
          {
            project_id:
              project.id
          }
        );

      if (!data?.success){
        throw new Error(
          data?.message ||
          "Project submission failed."
        );
      }

      await loadWorkspace();

      setStatus(
        "Project submitted successfully and is now pending review."
      );
    } catch (error){
      console.error(
        "[ALBUKHR CONTRIBUTOR SUBMIT]",
        error
      );

      setStatus(
        normalizeError(
          error,
          "Project submission failed."
        ),
        "error"
      );

      button.disabled =
        false;

      button.textContent =
        "Submit for Review";
    }
  }

  async function loadReviews(projectId){
    if (!projectId) return;

    const panel =
      $("reviewPanel");

    if (
      !panel ||
      panel.classList.contains("hidden")
    ){
      return;
    }

    /*
     * Actual gateway route:
     * GET /api/contributor/project/reviews?project_id=<id>
     */
    const data =
      await gatewayGet(
        `/api/contributor/project/reviews?project_id=${encodeURIComponent(projectId)}`
      );

    if (!data?.success){
      throw new Error(
        data?.message ||
        "Project review history could not be loaded."
      );
    }

    const records =
      Array.isArray(data?.records)
        ? data.records
        : [];

    const list =
      $("reviewList");

    if (!list) return;

    list.replaceChildren();

    show(
      "reviewEmpty",
      records.length === 0
    );

    records.forEach(
      (record)=>{
        const row =
          document.createElement(
            "div"
          );

        row.className =
          "record";

        const icon =
          document.createElement(
            "div"
          );

        icon.className =
          "record-icon";

        icon.textContent =
          "✓";

        const content =
          document.createElement(
            "div"
          );

        const title =
          document.createElement(
            "b"
          );

        title.textContent =
          String(
            record.decision ||
            "review"
          ).toUpperCase();

        const meta =
          document.createElement(
            "span"
          );

        meta.textContent =
          `${String(record.previous_status || "").toUpperCase()} → ${String(record.new_status || "").toUpperCase()} · ${formatDate(record.created_at)}`;

        content.append(
          title,
          meta
        );

        if (record.reason){
          const reason =
            document.createElement(
              "span"
            );

          reason.textContent =
            `Reason: ${record.reason}`;

          content.appendChild(
            reason
          );
        }

        row.append(
          icon,
          content
        );

        list.appendChild(
          row
        );
      }
    );
  }

  function signOut(){
    try {
      if (
        window.AlbukhrPiAuth &&
        typeof window.AlbukhrPiAuth.logout ===
          "function"
      ){
        window.AlbukhrPiAuth.logout();
      }
    } finally {
      window.location.replace(
        "login.html"
      );
    }
  }

  async function init(){
    $("contributorProfileForm")
      ?.addEventListener(
        "submit",
        saveContributorProfile
      );

    $("createProjectForm")
      ?.addEventListener(
        "submit",
        createProject
      );

    $("editProjectForm")
      ?.addEventListener(
        "submit",
        saveProject
      );

    $("uploadLogoButton")
      ?.addEventListener(
        "click",
        uploadLogo
      );

    $("submitProjectButton")
      ?.addEventListener(
        "click",
        submitProject
      );

    $("signOutButton")
      ?.addEventListener(
        "click",
        signOut
      );

    try {
      if (
        !window.AlbukhrPageAuthGuard
      ){
        throw new Error(
          "ALBUKHR Page Auth Guard is unavailable."
        );
      }

      currentUser =
        await window.AlbukhrPageAuthGuard
          .waitForAuth();

      if (!currentUser){
        return;
      }

      assertMainnet();

      setText(
        "userHandle",
        currentUser.username ||
        "Contributor"
      );

      setText(
        "securityState",
        "SECURE · MAINNET"
      );

      setText(
        "authorization",
        "AUTHENTICATED"
      );

      const profileData =
        await loadContributorProfile();

      await loadWorkspace();

      if (
        profileData?.profile_complete !==
        true
      ){
        setProfileStatus(
          "Complete your Contributor registration profile before creating your one Internal Project."
        );
      }
    } catch (error){
      console.error(
        "[ALBUKHR CONTRIBUTOR WORKSPACE]",
        error
      );

      setStatus(
        normalizeError(
          error,
          "Contributor workspace could not be loaded."
        ),
        "error"
      );

      setText(
        "securityState",
        "ACCESS CHECK FAILED"
      );
    }
  }

  document.readyState === "loading"
    ? document.addEventListener(
        "DOMContentLoaded",
        init,
        { once:true }
      )
    : init();

})(window);
