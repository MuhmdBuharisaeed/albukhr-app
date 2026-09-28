/* =========================================================
   ALBUKHR CONTRIBUTOR WORKSPACE
   - Mainnet contributor workspace
   - No LocalStorage / sessionStorage
   - Authenticated identity from Pi Auth + Page Auth Guard
   - Server-side Contributor entitlement and project authority
   ========================================================= */
(function(window){
  "use strict";

  let currentUser = null;
  let workspace = null;
  let project = null;

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

  function setInlineStatus(message, kind="info"){
    const el = $("logoStatus");
    if (!el) return;
    el.textContent = String(message || "");
    el.className = `inline-status${kind === "error" ? " error" : ""}`;
  }

  function show(id, visible=true){
    const el = $(id);
    if (el) el.classList.toggle("hidden", !visible);
  }

  function formatDate(value){
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }

  function normalizeError(error, fallback){
    return error?.message || fallback || "Request failed.";
  }

  function getCore(){
    const core = window.ALBUKHR_SUPABASE;
    if (!core || typeof core.rpc !== "function") {
      throw new Error("ALBUKHR Supabase Core is unavailable.");
    }
    return core;
  }

  async function rpc(name, params={}){
    const response = await getCore().rpc(name, params);
    if (response?.error) throw new Error(response.error.message || `RPC ${name} failed.`);
    return response?.data;
  }

  function renderLogo(url){
    const preview = $("projectLogoPreview");
    if (!preview) return;
    preview.replaceChildren();
    if (url){
      const img = document.createElement("img");
      img.src = url;
      img.alt = "Project logo";
      preview.appendChild(img);
      return;
    }
    preview.textContent = (project?.name || "A").slice(0,1).toUpperCase();
  }

  function renderWorkspace(data){
    workspace = data || null;
    if (!data?.success || !data?.contributor) {
      show("workspacePanel", false);
      show("accessDeniedPanel", true);
      setText("authorization", "DENIED");
      setText("contributorStatus", "—");
      setText("entitlementStatus", "—");
      return;
    }

    show("workspacePanel", true);
    show("accessDeniedPanel", false);

    const contributor = data.contributor;
    const entitlement = data.project_entitlement || {};
    project = data.project || null;

    setText("authorization", "AUTHORIZED");
    setText("contributorStatus", String(contributor.status || "unknown").toUpperCase());
    setText("entitlementStatus", String(entitlement.status || "unknown").toUpperCase());
    setText("statusBadge", String(contributor.status || "unknown").toUpperCase());
    setText("contributorId", contributor.id);
    setText("registeredAt", formatDate(contributor.registered_at));
    setText("networkValue", "MAINNET");
    setText("entitlementValue", entitlement.status === "claimed" ? "CLAIMED · 1 / 1" : "AVAILABLE · 0 / 1");

    if (project){
      renderProject(project);
      show("createPanel", false);
    } else {
      show("projectPanel", false);
      show("createPanel", contributor.status === "active" && entitlement.can_create === true);
      if (contributor.status !== "active") {
        setText("accessDeniedText", "Your Contributor record is not active. Project creation is unavailable until the Contributor status is active.");
        show("accessDeniedPanel", true);
      }
    }

    loadCommunity().catch((error)=>{
      console.warn("[ALBUKHR CONTRIBUTOR COMMUNITY]", error);
      setText("communityText", "Official Contributor community access is not currently configured.");
    });
  }

  function renderProject(p){
    project = p;
    show("projectPanel", true);
    show("createPanel", false);

    setText("projectTitle", p.name || "Your Internal Project");
    setText("projectSubtitle", `${String(p.status || "unknown").toUpperCase()} · Contributor-owned Internal Project`);
    setText("projectStatusBadge", String(p.status || "unknown").toUpperCase());
    setText("projectCode", p.project_code);
    setText("internalNumber", p.internal_number || "Internal number pending");
    setText("projectNetwork", String(p.network || "mainnet").toUpperCase());

    const status = String(p.status || "").toLowerCase();
    const editable = status === "draft";
    const logoUrl = p.logo_url || (p.logo_path ? getStoragePublicUrl(p.logo_path) : null);
    renderLogo(logoUrl);

    show("editPanel", editable);
    show("logoPanel", editable);
    show("reviewPanel", status !== "draft");

    if (editable){
      $("editProjectSlug").value = p.slug || "";
      $("editProjectName").value = p.name || "";
      $("editProjectDescription").value = p.description || "";
    }

    const ready = Boolean(
      String(p.description || "").trim() &&
      (p.logo_url || p.logo_path) &&
      Number(p.logo_width) >= 400 &&
      Number(p.logo_height) >= 400 &&
      Number(p.logo_size_bytes) > 0 && Number(p.logo_size_bytes) <= 1048576 &&
      ["png","jpg","jpeg","image/png","image/jpeg"].includes(String(p.logo_format || "").toLowerCase())
    );

    const submit = $("submitProjectButton");
    if (submit){
      submit.disabled = !editable || !ready;
      submit.textContent = editable ? (ready ? "Submit for Review" : "Complete Logo & Description First") : "Submission Locked";
    }

    if (status === "pending") {
      setText("submissionText", "Your project is pending ALBUKHR review. Project details and logo changes are locked while it is under review.");
    } else if (status === "approved") {
      setText("submissionText", "Your project has been approved into the governed project registry. Further activation and financial configuration remain separate governance steps.");
    } else if (status === "archived") {
      setText("submissionText", "This project has been archived after a review decision. Your one-project Contributor entitlement remains consumed.");
    } else {
      setText("submissionText", ready ? "Your project is ready to submit for ALBUKHR review." : "Complete your project details and compliant logo, then submit for ALBUKHR review.");
    }

    loadReviews(p.id).catch((error)=>console.warn("[ALBUKHR CONTRIBUTOR REVIEWS]", error));
  }

  function getStoragePublicUrl(path){
    try {
      const storage = getCore().storage;
      if (!storage) return null;
      const result = storage.from("project-logos").getPublicUrl(path);
      return result?.data?.publicUrl || null;
    } catch (_) {
      return null;
    }
  }

  async function loadWorkspace(){
    setStatus("Loading Contributor workspace…");
    const data = await rpc("get_my_contributor_workspace");
    if (!data?.success) throw new Error(data?.message || "Contributor workspace is unavailable.");
    renderWorkspace(data);
    setStatus("");
  }

  async function loadCommunity(){
    const data = await rpc("get_contributor_community_resources", { p_network: "mainnet" });
    const resources = Array.isArray(data?.resources) ? data.resources : [];
    const telegram = resources.find((r)=>r?.resource_type === "telegram_private_group" && r?.invite_url);
    if (telegram){
      setText("communityText", "Your active Contributor status provides access to the official private Contributor community.");
      setText("communityName", telegram.resource_name || "Private Contributor Group");
      const button = $("communityButton");
      if (button){ button.href = telegram.invite_url; }
      show("communityResource", true);
    } else {
      setText("communityText", "The private Contributor community link will appear here once the official resource is configured by ALBUKHR administration.");
      show("communityResource", false);
    }
  }

  async function createProject(event){
    event.preventDefault();
    const button = $("createProjectButton");
    if (!button) return;
    try {
      button.disabled = true;
      button.textContent = "Creating draft…";
      setStatus("Creating your single Internal Project entitlement claim…");
      const data = await rpc("create_my_internal_project", {
        p_project_code: $("createProjectCode").value,
        p_slug: $("createProjectSlug").value,
        p_name: $("createProjectName").value,
        p_description: $("createProjectDescription").value
      });
      if (!data?.success) throw new Error(data?.message || "Project creation failed.");
      await loadWorkspace();
      setStatus("Internal Project draft created. Upload the required logo before submission.");
    } catch (error){
      console.error("[ALBUKHR CREATE INTERNAL PROJECT]", error);
      setStatus(normalizeError(error,"Project creation failed."), "error");
      button.disabled = false;
      button.textContent = "Create Internal Project Draft";
    }
  }

  async function saveProject(event){
    event.preventDefault();
    if (!project) return;
    const button = $("saveProjectButton");
    try {
      button.disabled = true;
      setStatus("Saving project details…");
      const data = await rpc("update_my_internal_project", {
        p_project_id: project.id,
        p_slug: $("editProjectSlug").value,
        p_name: $("editProjectName").value,
        p_description: $("editProjectDescription").value
      });
      if (!data?.success) throw new Error(data?.message || "Project update failed.");
      await loadWorkspace();
      setStatus("Project details saved.");
    } catch (error){
      console.error("[ALBUKHR UPDATE INTERNAL PROJECT]", error);
      setStatus(normalizeError(error,"Project update failed."),"error");
    } finally {
      button.disabled = false;
    }
  }

  function inspectImage(file){
    return new Promise((resolve,reject)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{
        const out = { width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(out);
      };
      img.onerror = ()=>{
        URL.revokeObjectURL(url);
        reject(new Error("The selected image could not be read."));
      };
      img.src = url;
    });
  }

  async function uploadLogo(){
    if (!project) return;
    const file = $("logoFile")?.files?.[0];
    if (!file) {
      setInlineStatus("Select a PNG or JPG/JPEG logo first.", "error");
      return;
    }

    try {
      setInlineStatus("Validating logo…");
      if (!['image/png','image/jpeg'].includes(file.type)) throw new Error("Project logo must be PNG or JPG/JPEG.");
      if (file.size <= 0 || file.size > 1048576) throw new Error("Project logo must be no larger than 1 MB.");
      const dimensions = await inspectImage(file);
      if (dimensions.width < 400 || dimensions.height < 400) throw new Error("Project logo must be at least 400 × 400 pixels.");

      const storage = getCore().storage;
      if (!storage) throw new Error("ALBUKHR Supabase Storage is unavailable.");

      const uploadButton = $("uploadLogoButton");
      uploadButton.disabled = true;
      uploadButton.textContent = "Uploading…";

      const path = `projects/${project.id}/logo`;
      const upload = await storage.from("project-logos").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true
      });
      if (upload?.error) throw new Error(upload.error.message || "Logo upload failed.");

      const publicUrl = getStoragePublicUrl(path);
      const format = file.type === "image/png" ? "png" : "jpeg";
      const data = await rpc("attach_my_internal_project_logo", {
        p_project_id: project.id,
        p_logo_url: publicUrl,
        p_logo_path: path,
        p_logo_width: dimensions.width,
        p_logo_height: dimensions.height,
        p_logo_format: format,
        p_logo_size_bytes: file.size
      });
      if (!data?.success) throw new Error(data?.message || "Project logo metadata could not be recorded.");

      $("logoFile").value = "";
      setInlineStatus("Logo uploaded and recorded successfully.");
      await loadWorkspace();
      setStatus("Project logo updated.");
    } catch (error){
      console.error("[ALBUKHR CONTRIBUTOR LOGO]", error);
      setInlineStatus(normalizeError(error,"Project logo upload failed."), "error");
    } finally {
      const uploadButton = $("uploadLogoButton");
      if (uploadButton){ uploadButton.disabled = false; uploadButton.textContent = "Upload Project Logo"; }
    }
  }

  async function submitProject(){
    if (!project) return;
    const button = $("submitProjectButton");
    if (!button || button.disabled) return;
    try {
      button.disabled = true;
      button.textContent = "Submitting…";
      setStatus("Submitting project for ALBUKHR review…");
      const data = await rpc("submit_my_internal_project", { p_project_id: project.id });
      if (!data?.success) throw new Error(data?.message || "Project submission failed.");
      await loadWorkspace();
      setStatus("Project submitted successfully and is now pending review.");
    } catch (error){
      console.error("[ALBUKHR CONTRIBUTOR SUBMIT]", error);
      setStatus(normalizeError(error,"Project submission failed."), "error");
      button.disabled = false;
      button.textContent = "Submit for Review";
    }
  }

  async function loadReviews(projectId){
    if (!projectId) return;
    const panel = $("reviewPanel");
    if (!panel || panel.classList.contains("hidden")) return;
    const data = await rpc("get_my_contributor_project_reviews", { p_project_id: projectId });
    const records = Array.isArray(data?.records) ? data.records : [];
    const list = $("reviewList");
    if (!list) return;
    list.replaceChildren();
    show("reviewEmpty", records.length === 0);
    records.forEach((record)=>{
      const row = document.createElement("div");
      row.className = "record";
      const icon = document.createElement("div");
      icon.className = "record-icon";
      icon.textContent = "✓";
      const content = document.createElement("div");
      const title = document.createElement("b");
      title.textContent = String(record.decision || "review").toUpperCase();
      const meta = document.createElement("span");
      meta.textContent = `${String(record.previous_status || "").toUpperCase()} → ${String(record.new_status || "").toUpperCase()} · ${formatDate(record.created_at)}`;
      content.append(title, meta);
      if (record.reason){
        const reason = document.createElement("span");
        reason.textContent = `Reason: ${record.reason}`;
        content.appendChild(reason);
      }
      row.append(icon, content);
      list.appendChild(row);
    });
  }

  function signOut(){
    try {
      if (window.AlbukhrPiAuth?.logout) window.AlbukhrPiAuth.logout();
    } finally {
      window.location.replace("login.html");
    }
  }

  async function init(){
    $("createProjectForm")?.addEventListener("submit", createProject);
    $("editProjectForm")?.addEventListener("submit", saveProject);
    $("uploadLogoButton")?.addEventListener("click", uploadLogo);
    $("submitProjectButton")?.addEventListener("click", submitProject);
    $("signOutButton")?.addEventListener("click", signOut);

    try {
      if (!window.AlbukhrPageAuthGuard) throw new Error("ALBUKHR Page Auth Guard is unavailable.");
      currentUser = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!currentUser) return;

      setText("userHandle", currentUser.username || "Contributor");
      setText("securityState", "SECURE · MAINNET");
      setText("authorization", "AUTHENTICATED");
      await loadWorkspace();
    } catch (error){
      console.error("[ALBUKHR CONTRIBUTOR WORKSPACE]", error);
      setStatus(normalizeError(error,"Contributor workspace could not be loaded."), "error");
      setText("securityState", "ACCESS CHECK FAILED");
    }
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init, { once:true })
    : init();
})(window);
