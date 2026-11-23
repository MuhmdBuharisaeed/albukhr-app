/* ALBUKHR External Project Owner Dashboard — Phase C1
 * Mainnet only. Reuses the existing trusted applicant API and the shared
 * Project Updates publisher gateway used by Internal Projects.
 * Does not enable the incomplete Owner Operations gateway, Pi liquidity
 * settlement or withdrawals.
 */
(function (window, document) {
  "use strict";

  const MAINNET = "mainnet";
  const PROJECT_UPDATES_API = "/api/project-updates";
  const PAGE_SIZE = 20;
  const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
  const state = {
    applicationId: "",
    user: null,
    application: null,
    network: null,
    projectId: null,
    project: null,
    publisherGranted: false,
    publishing: false,
    loadingFeed: false,
    loadingMore: false,
    items: [],
    itemIds: new Set(),
    cursor: null,
    hasMore: false
  };

  const $ = (id) => document.getElementById(id);

  function clean(value) { return String(value == null ? "" : value).trim(); }
  function text(value, fallback) { return value == null ? (fallback || "") : String(value); }
  function esc(value) {
    return text(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function validUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(clean(value));
  }
  function setStatus(message, kind) {
    const element = $("ownerStatus");
    if (!element) return;
    element.textContent = text(message);
    element.className = "owner-status-message" + (kind ? " " + kind : "");
  }
  function setPublisherStatus(message, kind) {
    const element = $("ownerPublisherStatus");
    if (!element) return;
    element.textContent = text(message);
    element.className = "owner-inline-status" + (kind ? " " + kind : "");
  }
  function setFeedStatus(message, kind) {
    const element = $("ownerFeedStatus");
    if (!element) return;
    element.textContent = text(message);
    element.className = "owner-inline-status" + (kind ? " " + kind : "");
  }
  function requireMainnet() {
    const environment = window.ALBukhrEnvironment;
    if (!environment || typeof environment.isKnown !== "function" || !environment.isKnown() ||
        typeof environment.getNetwork !== "function" || clean(environment.getNetwork()).toLowerCase() !== MAINNET) {
      throw new Error("External Project Owner Dashboard is available on verified MAINNET only.");
    }
    const auth = window.AlbukhrPiAuth;
    if (!auth || typeof auth.getNetwork !== "function" || clean(auth.getNetwork()).toLowerCase() !== MAINNET) {
      throw new Error("A verified Mainnet Pi session is required.");
    }
  }
  function requireApi() {
    const api = window.AlbukhrApi;
    if (!api || typeof api.get !== "function" || typeof api.post !== "function") {
      throw new Error("ALBUKHR API Core is unavailable.");
    }
    return api;
  }
  function requireStorage() {
    const core = window.ALBUKHR_SUPABASE;
    if (!core || clean(core.network).toLowerCase() !== MAINNET || !core.client?.storage ||
        typeof core.client.storage.from !== "function") {
      throw new Error("Mainnet Supabase Storage is unavailable. The evidence image was not uploaded.");
    }
    return core.client.storage;
  }
  function showWorkspace(show) {
    $("ownerLoading").hidden = true;
    $("ownerError").hidden = true;
    $("ownerWorkspace").hidden = !show;
  }
  function showError(error) {
    $("ownerLoading").hidden = true;
    $("ownerWorkspace").hidden = true;
    $("ownerError").hidden = false;
    $("ownerErrorMessage").textContent = error?.message || "The External Project owner workspace could not be loaded.";
    setStatus(error?.message || "Owner workspace unavailable.", "error");
  }
  function formatMoney(value, asset) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "—";
    return new Intl.NumberFormat("en", { maximumFractionDigits: 7 }).format(amount) + " " + text(asset, "PI").toUpperCase();
  }
  function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric" }).format(d);
  }
  function apiApplication(data) {
    if (Array.isArray(data)) return data[0] || null;
    if (data && Array.isArray(data.application)) return data.application[0] || null;
    if (data && data.application && typeof data.application === "object") return data.application;
    return data && typeof data === "object" ? data : null;
  }
  async function loadApplication() {
    const result = await window.ALBukhrExternalProjectApi.getApplication(state.applicationId);
    const application = apiApplication(result);
    if (!application) throw new Error("External Project application was not found or access was denied.");
    if (clean(application.network).toLowerCase() !== MAINNET) throw new Error("Application network isolation check failed.");
    if (clean(application.status).toLowerCase() !== "converted" || !validUuid(application.converted_project_id)) {
      throw new Error("The Owner Dashboard is available after ALBUKHR converts the approved application into an External Project.");
    }
    state.application = application;
    state.projectId = clean(application.converted_project_id);
    $("projectName").textContent = application.project_name || application.business_name || "External Project";
    $("projectSubtitle").textContent = (application.business_name || "External business") + " · " + (application.project_code || "Project code unavailable");
    $("projectStatus").textContent = "CONVERTED · MAINNET";
    $("projectCode").textContent = application.project_code || "—";
    $("applicationState").textContent = "Converted";
    $("fundingRequest").textContent = formatMoney(application.funding_required, application.funding_asset);
    const query = "?application_id=" + encodeURIComponent(state.applicationId);
    $("fundingLink").href = "external-project-funding.html" + query;
    $("detailsLink").href = "external-project-detail.html" + query;
  }
  async function verifyPublisherGrant() {
    const button = $("publishOwnerUpdateButton");
    const refresh = $("refreshOwnerFeedButton");
    if (button) button.disabled = true;
    if (refresh) refresh.disabled = false;
    state.publisherGranted = false;
    state.project = null;
    setPublisherStatus("Checking the server-side Mainnet publisher grant…", "active");

    const projects = await requireApi().get(PROJECT_UPDATES_API + "/publisher-projects");
    if (!Array.isArray(projects)) throw new Error("Publisher authorization service returned an invalid project list.");
    const code = clean(state.application.project_code).toLowerCase();
    const match = projects.find((candidate) => candidate &&
      clean(candidate.project_id) === state.projectId &&
      clean(candidate.project_code).toLowerCase() === code &&
      clean(candidate.project_type).toLowerCase() === "external" &&
      clean(candidate.network).toLowerCase() === MAINNET &&
      ["approved", "active"].includes(clean(candidate.status).toLowerCase()));

    if (!match) {
      setPublisherStatus("This converted External Project does not have an active Mainnet publisher grant for this owner account. Contact ALBUKHR administration to review the grant.", "error");
      state.project = Object.freeze({ project_id: state.projectId, project_code: state.application.project_code, name: state.application.project_name });
      updateComposerState();
      return false;
    }
    state.project = match;
    state.publisherGranted = true;
    setPublisherStatus("Mainnet publisher permission verified for " + match.project_code + ". Your updates will be visible in the public Transparency Hub.", "success");
    updateComposerState();
    return true;
  }
  function safeImageUrl(value) {
    try { const url = new URL(text(value), window.location.href); return url.protocol === "https:" ? url.href : ""; }
    catch (_) { return ""; }
  }
  function renderFeed() {
    const host = $("ownerUpdateFeed");
    if (!host) return;
    host.replaceChildren();
    state.items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "owner-update-card";
      const meta = document.createElement("div");
      meta.className = "owner-update-meta";
      meta.textContent = [text(item.update_kind, "progress").replace(/_/g, " ").toUpperCase(),
        text(item.source_label, "project_provided").replace(/_/g, " ").toUpperCase(), formatDate(item.published_at)].join(" · ");
      const title = document.createElement("h4");
      title.textContent = text(item.title, "Project update");
      card.append(meta, title);
      const imageUrl = safeImageUrl(item.image_url);
      if (imageUrl) {
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = text(state.application?.project_name, "External Project") + " — " + text(item.title, "Evidence image");
        image.loading = "lazy";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => image.remove(), { once: true });
        card.appendChild(image);
      }
      const body = document.createElement("p");
      body.textContent = text(item.body);
      card.appendChild(body);
      const counts = document.createElement("div");
      counts.className = "owner-update-counts";
      counts.textContent = "Likes: " + Number(item.like_count || 0) + " · Dislikes: " + Number(item.dislike_count || 0) + " · Comments: " + Number(item.comments_count || 0);
      card.appendChild(counts);
      host.appendChild(card);
    });
    const more = $("loadOlderOwnerUpdatesButton");
    more.hidden = !state.hasMore;
    more.disabled = state.loadingMore;
    more.textContent = state.loadingMore ? "Loading…" : "Load older updates";
  }
  async function loadFeed(reset) {
    if (state.loadingFeed || state.loadingMore) return;
    const firstPage = reset !== false;
    if (!state.projectId) return;
    if (firstPage) {
      state.loadingFeed = true;
      state.items = [];
      state.itemIds = new Set();
      state.cursor = null;
      state.hasMore = false;
      setFeedStatus("Loading published Mainnet project updates…", "active");
      renderFeed();
    } else {
      if (!state.hasMore || !state.cursor) return;
      state.loadingMore = true;
      renderFeed();
    }
    try {
      const query = new URLSearchParams({ project_id: state.projectId, limit: String(PAGE_SIZE), sort: "latest" });
      if (!firstPage && state.cursor) query.set("cursor", state.cursor);
      const data = await requireApi().get(PROJECT_UPDATES_API + "/feed?" + query.toString());
      if (!data || typeof data !== "object" || !Array.isArray(data.items)) throw new Error("Transparency feed returned an invalid response.");
      data.items.forEach((item) => {
        const id = clean(item?.id);
        if (!id || state.itemIds.has(id)) return;
        state.itemIds.add(id);
        state.items.push(item);
      });
      state.cursor = data.next_cursor || null;
      state.hasMore = data.has_more === true && Boolean(state.cursor);
      renderFeed();
      setFeedStatus(state.items.length ? "These project-provided updates are published in the Mainnet Transparency Hub." : "This External Project has not published any updates yet.", "");
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL OWNER DASHBOARD FEED]", error);
      setFeedStatus(error?.message || "Published project updates could not be loaded.", "error");
    } finally {
      state.loadingFeed = false;
      state.loadingMore = false;
      renderFeed();
    }
  }
  function imageMime(file) {
    const mime = clean(file?.type).toLowerCase();
    if (["image/jpeg", "image/png", "image/webp"].includes(mime)) return mime;
    const name = clean(file?.name).toLowerCase();
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
    if (name.endsWith(".png")) return "image/png";
    if (name.endsWith(".webp")) return "image/webp";
    throw new Error("Choose a JPEG, PNG or WEBP evidence image.");
  }
  function updateCounters() {
    $("ownerTitleCount").textContent = clean($("ownerUpdateTitle").value).length + " / 160";
    $("ownerBodyCount").textContent = clean($("ownerUpdateBody").value).length + " / 10,000";
  }
  function updateComposerState() {
    const button = $("publishOwnerUpdateButton");
    if (!button) return;
    button.disabled = !state.publisherGranted || state.publishing;
    button.textContent = state.publishing ? "Publishing…" : "Publish update";
  }
  async function publishUpdate(event) {
    event.preventDefault();
    if (state.publishing) return;
    try {
      requireMainnet();
      if (!state.publisherGranted || !state.projectId) throw new Error("Verified Mainnet publisher permission is required.");
      const title = clean($("ownerUpdateTitle").value);
      const body = clean($("ownerUpdateBody").value);
      const kind = clean($("ownerUpdateKind").value).toLowerCase();
      const file = $("ownerUpdateImage").files?.[0] || null;
      if (!title || title.length > 160) throw new Error("Update title must contain 1–160 characters.");
      if (!body || body.length > 10000) throw new Error("Update details must contain 1–10,000 characters.");
      if (!["progress", "milestone"].includes(kind)) throw new Error("Select a valid update type.");
      if (!file || !file.size) throw new Error("Choose one evidence image before publishing.");
      if (file.size > MAX_IMAGE_BYTES) throw new Error("Evidence image must not exceed 10 MiB.");
      const contentType = imageMime(file);

      state.publishing = true;
      updateComposerState();
      setPublisherStatus("Creating a one-time secure Mainnet upload…", "active");
      const projectId = state.projectId;
      const intent = await requireApi().post(PROJECT_UPDATES_API + "/projects/" + encodeURIComponent(projectId) + "/upload-intents", {
        content_type: contentType,
        file_size_bytes: file.size
      });
      if (!intent?.bucket || !intent?.path || !intent?.token || !intent?.upload_intent_id) {
        throw new Error("Trusted API did not return a complete signed upload intent.");
      }
      setPublisherStatus("Uploading the evidence image to the secure Mainnet path…", "active");
      const upload = await requireStorage().from(intent.bucket).uploadToSignedUrl(intent.path, intent.token, file, { contentType });
      if (upload?.error) throw upload.error;
      setPublisherStatus("Image uploaded. The trusted API is validating the file and publisher permission…", "active");
      await requireApi().post(PROJECT_UPDATES_API + "/projects/" + encodeURIComponent(projectId) + "/updates", {
        upload_intent_id: intent.upload_intent_id,
        update_kind: kind,
        title,
        body
      });

      $("ownerUpdateTitle").value = "";
      $("ownerUpdateBody").value = "";
      $("ownerUpdateKind").value = "progress";
      $("ownerUpdateImage").value = "";
      $("ownerUpdateImageName").textContent = "No evidence image selected.";
      updateCounters();
      setPublisherStatus("Project update published successfully to the Mainnet Transparency Hub.", "success");
      await loadFeed(true);
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL OWNER UPDATE PUBLISH]", error);
      setPublisherStatus(error?.message || "Project update could not be published.", "error");
    } finally {
      state.publishing = false;
      updateComposerState();
    }
  }
  async function init() {
    try {
      const query = new URLSearchParams(window.location.search);
      state.applicationId = clean(query.get("application_id"));
      if (!validUuid(state.applicationId)) throw new Error("A valid application_id is required to open this owner workspace.");
      requireMainnet();
      if (!window.AlbukhrPageAuthGuard || typeof window.AlbukhrPageAuthGuard.waitForAuth !== "function") throw new Error("ALBUKHR Page Auth Guard is unavailable.");
      if (!window.ALBukhrExternalProjectApi || typeof window.ALBukhrExternalProjectApi.getApplication !== "function") throw new Error("External Project API is unavailable.");
      state.user = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!state.user) throw new Error("Verified Pi authentication is required.");
      await loadApplication();
      showWorkspace(true);
      setStatus("Converted External Project owner workspace loaded securely.", "success");
      const refresh = $("refreshOwnerWorkspaceButton");
      refresh.addEventListener("click", async () => {
        refresh.disabled = true;
        try {
          await loadApplication();
          await Promise.allSettled([verifyPublisherGrant(), loadFeed(true)]);
          setStatus("Owner workspace refreshed.", "success");
        } catch (error) { setStatus(error?.message || "Workspace refresh failed.", "error"); }
        finally { refresh.disabled = false; }
      });
      $("ownerUpdateForm").addEventListener("submit", publishUpdate);
      $("ownerUpdateTitle").addEventListener("input", updateCounters);
      $("ownerUpdateBody").addEventListener("input", updateCounters);
      $("ownerUpdateImage").addEventListener("change", () => {
        const file = $("ownerUpdateImage").files?.[0];
        $("ownerUpdateImageName").textContent = file ? file.name + " · " + (file.size / 1024 / 1024).toFixed(2) + " MiB" : "No evidence image selected.";
      });
      $("refreshOwnerFeedButton").addEventListener("click", () => loadFeed(true));
      $("loadOlderOwnerUpdatesButton").addEventListener("click", () => loadFeed(false));
      updateCounters();
      const grantResult = await verifyPublisherGrant().catch((error) => {
        setPublisherStatus(error?.message || "Publisher permission could not be verified. Publishing is disabled.", "error");
        state.publisherGranted = false;
        updateComposerState();
        return false;
      });
      await loadFeed(true).catch((error) => setFeedStatus(error?.message || "Feed load failed.", "error"));
      if (!grantResult) updateComposerState();
    } catch (error) {
      console.error("[ALBUKHR EXTERNAL OWNER DASHBOARD INIT]", error);
      showError(error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window, document);
