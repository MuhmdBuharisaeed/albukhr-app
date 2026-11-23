/* =====================================================================
 * ALBUKHR — Public Project Transparency & Updates
 * Stage 6D — Mainnet public feed, comments/replies, reactions and reports
 *
 * Security model:
 * - Public feed and comment reads use the trusted Mainnet API.
 * - Mutations use the Mainnet Pi Auth Core access token in memory only.
 * - API independently verifies Pi identity and derives the principal.
 * - No LocalStorage/SessionStorage, direct Supabase writes, or browser
 *   supplied principal IDs are used by this controller.
 * - Project type labels are read from the active-network public registry.
 * - This page is deliberately disabled on Testnet: Project Updates gateway
 *   and its trusted RPC contract are Mainnet-only.
 * ===================================================================== */
(function (window, document) {
  "use strict";

  const API_BASE = "https://albukhr-api.onrender.com/api/project-updates";
  const MAINNET = "mainnet";
  const PAGE_SIZE = 20;
  const COMMENT_LIMIT = 3000;
  const REPORT_DETAILS_LIMIT = 1500;

  const state = {
    initialized: false,
    loading: false,
    loadingMore: false,
    items: [],
    itemIds: new Set(),
    cursor: null,
    hasMore: false,
    sort: "latest",
    projectType: "",
    projectCode: "",
    projectTypesById: new Map(),
    auth: null,
    accessToken: null,
    authPromise: null,
    expandedComments: new Set(),
    commentsByUpdate: new Map(),
    commentsLoading: new Set(),
    openReports: new Set(),
    viewerReactions: new Map()
  };

  const $ = (id) => document.getElementById(id);

  function text(value, fallback = "") {
    return value == null ? fallback : String(value);
  }

  function create(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content != null) node.textContent = String(content);
    return node;
  }

function setFeedMessage(message, kind) {
  const status = $("feedStatus");
  if (!status) return;

  const messageText = text(message).trim();

  status.textContent = messageText;
  status.hidden = !messageText;

  // Ensure hidden status does not occupy space,
  // even when a stylesheet defines display for this element.
  status.style.display = messageText ? "" : "none";

  status.className =
    "project-feed-status" + (kind ? " " + kind : "");
}

  function setMainMessage(message, kind) {
    const feed = $("projectFeed");
    if (!feed) return;
    feed.className = "loading" + (kind ? " " + kind : "");
    feed.textContent = text(message);
  }

  function loadScript(src, ready) {
    if (typeof ready === "function" && ready()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find((script) => script.src === new URL(src, window.location.href).href);
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error("Unable to load " + src)), { once: true });
        if (typeof ready === "function" && ready()) resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load required ALBUKHR module: " + src));
      document.head.appendChild(script);
    });
  }

  function ensureStylesheet() {
    const href = new URL("css/project-updates-interactions.css", window.location.href).href;
    const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some((link) => link.href === href);
    if (exists) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "css/project-updates-interactions.css";
    document.head.appendChild(link);
  }

  async function ensureDependencies() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2", () => !!window.supabase?.createClient);
    }

    if (!window.ALBukhrEnvironment) {
      await loadScript("js/core/environment-core.js", () => !!window.ALBukhrEnvironment);
    }

    const environment = window.ALBukhrEnvironment;
    if (!environment || typeof environment.isKnown !== "function" || !environment.isKnown()) {
      throw new Error("ALBUKHR environment could not be verified on this host.");
    }

    const network = text(environment.getNetwork?.()).trim().toLowerCase();
    if (network !== MAINNET) {
      throw new Error("Project Updates public feed is currently available on ALBUKHR MAINNET only. Switch to app.albukhr.com.");
    }

    if (!window.ALBUKHR_SUPABASE) {
      await loadScript("js/core/supabase-core.js", () => !!window.ALBUKHR_SUPABASE);
    }
    if (!window.ALBUKHR_SUPABASE || text(window.ALBUKHR_SUPABASE.network).toLowerCase() !== MAINNET) {
      throw new Error("Mainnet Supabase Core could not be verified. The feed has been stopped to protect network isolation.");
    }

    if (!window.ALBukhrProjectConfig) {
      await loadScript("js/project-config.js", () => !!window.ALBukhrProjectConfig);
    }

    ensureStylesheet();
    return true;
  }

  async function ensurePiAuthDependencies() {
    if (!window.Pi) {
      await loadScript("https://sdk.minepi.com/pi-sdk.js", () => !!window.Pi);
    }
    if (!window.AlbukhrPiAuth) {
      await loadScript("js/core/pi-auth-core.js", () => !!window.AlbukhrPiAuth);
    }
    state.auth = window.AlbukhrPiAuth;
    if (!state.auth) throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    return state.auth;
  }

  function removeLegacyPageExports() {
    // transparency.html still includes the historical engine for backwards
    // compatibility. Disable its legacy write helpers on this page only; the
    // new controller below exclusively uses the trusted API gateway.
    const names = [
      "ALBUKHR_PROJECT_UPDATES",
      "getTransparencyViewerMeta",
      "uploadProjectUpdateToSupabase",
      "fetchProjectUpdatesFeed",
      "fetchTransparencyFeed",
      "fetchProjectUpdates",
      "fetchProjectUpdateComments",
      "addProjectUpdateComment",
      "postTransparencyComment",
      "toggleProjectUpdateReaction",
      "toggleTransparencyReaction",
      "getProjectUpdateStats",
      "deleteProjectUpdate",
      "setProjectUpdateVisibility",
      "resolveProjectMeta"
    ];
    names.forEach((name) => {
      try { delete window[name]; } catch (_) { window[name] = undefined; }
    });
  }

  function ensureUi() {
    const feed = $("projectFeed");
    if (!feed) throw new Error("Transparency feed container is missing from transparency.html.");
    feed.classList.remove("loading");
    feed.classList.add("timeline-feed");

    if (!$("feedStatus")) {
      const status = create("div", "project-feed-status", "Loading Mainnet project updates…");
      status.id = "feedStatus";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      feed.parentNode.insertBefore(status, feed);
    }

    if (!$("loadMoreProjectUpdates")) {
      const button = create("button", "filter-btn project-feed-more", "Load older updates");
      button.id = "loadMoreProjectUpdates";
      button.type = "button";
      button.hidden = true;
      feed.insertAdjacentElement("afterend", button);
    }

    const modal = $("imageModal");
    if (modal) {
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-label", "Project update image preview");
    }
  }

  function safeImageUrl(value) {
    try {
      const url = new URL(text(value), window.location.href);
      return url.protocol === "https:" ? url.href : "";
    } catch (_) {
      return "";
    }
  }

  function formatDate(value) {
    if (!value) return "Date unavailable";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    }).format(date);
  }

  function getProjectType(item) {
    const id = text(item && item.project_id);
    return text(state.projectTypesById.get(id)).toLowerCase();
  }

  async function loadProjectTypes() {
    const config = window.ALBukhrProjectConfig;
    if (!config || typeof config.loadRegistry !== "function") return false;

    try {
      const result = await config.loadRegistry();
      if (!result || result.ok !== true || result.network !== MAINNET || !Array.isArray(result.projects)) {
        return false;
      }
      const map = new Map();
      result.projects.forEach((project) => {
        if (!project || text(project.network).toLowerCase() !== MAINNET) return;
        const projectId = text(project.project_id || project.id).trim();
        const projectType = text(project.project_type).trim().toLowerCase();
        if (projectId && ["core", "internal", "external"].includes(projectType)) {
          map.set(projectId, projectType);
        }
      });
      state.projectTypesById = map;
      const selector = $("filterProjectType");
      if (selector) {
        selector.disabled = map.size === 0;
        selector.title = map.size ? "Filter using the Mainnet public project registry." : "Project type registry is unavailable; type filtering is disabled.";
      }
      return map.size > 0;
    } catch (error) {
      console.warn("[ALBUKHR TRANSPARENCY] Project type registry unavailable:", error);
      const selector = $("filterProjectType");
      if (selector) selector.disabled = true;
      return false;
    }
  }

  async function apiRequest(path, options = {}) {
    const method = text(options.method || "GET").toUpperCase();
    const headers = { Accept: "application/json" };
    const request = { method, headers, cache: "no-store", credentials: "omit" };

    if (options.auth === true) {
      const token = await requirePiAccessToken();
      headers.Authorization = "Bearer " + token;
    }
    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      request.body = JSON.stringify(options.body);
    }

    const response = await fetch(API_BASE + path, request);
    let payload;
    try { payload = await response.json(); }
    catch (_) { throw new Error("Project Updates API returned an unreadable response."); }

    if (!response.ok || payload?.success !== true) {
      const error = new Error(text(payload?.error, "Project Updates request failed."));
      error.status = response.status;
      error.code = text(payload?.code, "PROJECT_UPDATES_REQUEST_FAILED");
      throw error;
    }
    if (text(payload.network).toLowerCase() !== MAINNET) {
      throw new Error("The Project Updates API returned a non-Mainnet response. The request was stopped.");
    }
    return payload.data;
  }

  async function requirePiAccessToken() {
    if (state.authPromise) return state.authPromise;
    state.authPromise = (async () => {
      await ensurePiAuthDependencies();
      if (!state.auth || typeof state.auth.requireAuth !== "function" || typeof state.auth.getAccessToken !== "function") {
        throw new Error("ALBUKHR Pi Auth Core is unavailable. Reload the page and try again.");
      }
      // Empty redirect URL lets this page explain the sign-in requirement
      // without unexpectedly navigating away. Pi Auth still verifies identity
      // through its existing trusted Mainnet identity gateway.
      const user = await state.auth.requireAuth("");
      if (!user) throw new Error("Sign in with your Pi account to comment, react or report this update.");
      const token = text(state.auth.getAccessToken()).trim();
      if (!token) throw new Error("Pi sign-in did not provide a usable access token. Please try again.");
      state.accessToken = token;
      return token;
    })();
    try { return await state.authPromise; }
    finally { state.authPromise = null; }
  }

  function createButton(label, className, action, data) {
    const button = create("button", className || "interaction-button", label);
    button.type = "button";
    button.dataset.action = action;
    if (data) Object.entries(data).forEach(([key, value]) => { button.dataset[key] = text(value); });
    return button;
  }

  function appendMeta(meta, className, value) {
    const node = create("span", className, value);
    meta.appendChild(node);
    return node;
  }

  function renderCard(item) {
    const card = create("article", "timeline-card project-update-card");
    card.dataset.updateId = text(item.id);

    const header = create("div", "timeline-header");
    const left = create("div", "timeline-left");
    const projectName = create("div", "timeline-project", text(item.project_name, "ALBUKHR Project"));
    left.appendChild(projectName);

    const meta = create("div", "timeline-meta");
    const projectType = getProjectType(item);
    if (projectType) {
      const badgeClass = projectType === "core" ? "core-badge" : projectType === "external" ? "external-badge" : "internal-badge";
      appendMeta(meta, "timeline-type " + badgeClass, projectType.toUpperCase() + " PROJECT");
    } else {
      appendMeta(meta, "timeline-type", "PROJECT");
    }
    if (item.project_code) appendMeta(meta, "project-code-pill", text(item.project_code));
    appendMeta(meta, "update-kind-pill", text(item.update_kind, "progress").replace(/_/g, " ").toUpperCase());
    appendMeta(meta, "project-source-pill", text(item.source_label, "project_provided").replace(/_/g, " ").toUpperCase());
    left.appendChild(meta);
    header.appendChild(left);
    card.appendChild(header);

    card.appendChild(create("div", "timeline-title", text(item.title, "Project update")));

    const imageUrl = safeImageUrl(item.image_url);
    if (imageUrl) {
      const imageButton = create("button", "update-image-button");
      imageButton.type = "button";
      imageButton.setAttribute("aria-label", "Open project update evidence image");
      const image = create("img", "timeline-image");
      image.src = imageUrl;
      image.alt = text(item.project_name, "Project") + " — " + text(item.title, "Update evidence");
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => imageButton.remove(), { once: true });
      imageButton.appendChild(image);
      imageButton.addEventListener("click", () => openImageModal(imageUrl, image.alt));
      card.appendChild(imageButton);
    }

    card.appendChild(create("p", "timeline-desc", text(item.body)));
    card.appendChild(create("div", "timeline-time", formatDate(item.published_at)));

    const actions = create("div", "update-interactions");
    const likeButton = createButton("Like (" + Number(item.like_count || 0) + ")", "interaction-button", "like", { updateId: item.id });
    likeButton.dataset.likeCount = "true";
    const dislikeButton = createButton("Dislike (" + Number(item.dislike_count || 0) + ")", "interaction-button", "dislike", { updateId: item.id });
    dislikeButton.dataset.dislikeCount = "true";
    const commentsButton = createButton("Comments (" + Number(item.comments_count || 0) + ")", "interaction-button secondary", "comments", { updateId: item.id });
    const reportButton = createButton("Report", "interaction-button quiet", "report", { updateId: item.id });
    const activeReaction = state.viewerReactions.get(text(item.id));
    if (activeReaction === "like") likeButton.classList.add("selected");
    if (activeReaction === "dislike") dislikeButton.classList.add("selected");
    actions.append(likeButton, dislikeButton, commentsButton, reportButton);
    card.appendChild(actions);

    const commentsPanel = create("section", "update-comments-panel");
    commentsPanel.hidden = !state.expandedComments.has(text(item.id));
    commentsPanel.dataset.commentsPanel = text(item.id);
    card.appendChild(commentsPanel);
    if (!commentsPanel.hidden) {
      if (state.commentsByUpdate.has(text(item.id))) {
        renderCommentsIntoPanel(item.id, commentsPanel, state.commentsByUpdate.get(text(item.id)));
      } else {
        commentsPanel.appendChild(create("div", "comment-loading", "Loading comments…"));
      }
    }

    const reportPanel = create("section", "update-report-panel");
    reportPanel.hidden = !state.openReports.has(text(item.id));
    reportPanel.dataset.reportPanel = text(item.id);
    card.appendChild(reportPanel);
    if (!reportPanel.hidden) renderReportPanel(item, reportPanel);

    return card;
  }

  function findUpdateCard(updateId) {
    return Array.from(document.querySelectorAll(".project-update-card"))
      .find((card) => text(card.dataset.updateId) === text(updateId)) || null;
  }

  function filteredItems() {
    const code = state.projectCode.trim().toLowerCase();
    return state.items.filter((item) => {
      if (code && !text(item.project_code).toLowerCase().includes(code)) return false;
      if (state.projectType && getProjectType(item) !== state.projectType) return false;
      return true;
    });
  }

  function renderFeed() {
    const feed = $("projectFeed");
    if (!feed) return;
    feed.replaceChildren();
    feed.className = "timeline-feed";

    const items = filteredItems();
    if (!items.length) {
      feed.appendChild(create("div", "empty-feed", state.items.length
        ? "No loaded updates match these filters. Load older updates or change the filters."
        : "No published project updates are available yet."));
    } else {
      items.forEach((item) => {
        feed.appendChild(renderCard(item));
        if (state.expandedComments.has(text(item.id)) && !state.commentsByUpdate.has(text(item.id))) {
          void refreshComments(item.id);
        }
      });
    }

    const more = $("loadMoreProjectUpdates");
    if (more) {
      more.hidden = !state.hasMore;
      more.disabled = state.loadingMore;
      more.textContent = state.loadingMore ? "Loading…" : "Load older updates";
    }
  }

  async function loadFeed(reset = true) {
    if (state.loading || state.loadingMore) return;
    if (reset) {
      state.loading = true;
      state.items = [];
      state.itemIds.clear();
      state.cursor = null;
      state.hasMore = false;
      setFeedMessage("Loading published Mainnet project updates…");
      renderFeed();
    } else {
      if (!state.hasMore || !state.cursor) return;
      state.loadingMore = true;
    }

    try {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE), sort: state.sort });
      if (!reset && state.cursor) query.set("cursor", state.cursor);
      const data = await apiRequest("/feed?" + query.toString());
      const pageItems = Array.isArray(data?.items) ? data.items : [];
      pageItems.forEach((item) => {
        const id = text(item?.id);
        if (!id || state.itemIds.has(id)) return;
        state.itemIds.add(id);
        state.items.push(item);
      });
      state.cursor = data?.next_cursor || null;
      state.hasMore = data?.has_more === true && Boolean(state.cursor);
      renderFeed();
      
setFeedMessage(
  state.items.length
    ? "Project-provided updates from the ALBUKHR Mainnet public feed."
    : ""
);
    } catch (error) {
      console.error("[ALBUKHR TRANSPARENCY] Feed request failed:", error);
      setFeedMessage(error.message || "Unable to load project updates.", "error");
      if (reset) setMainMessage(error.message || "Unable to load project updates.", "error");
    } finally {
      state.loading = false;
      state.loadingMore = false;
      const more = $("loadMoreProjectUpdates");
      if (more) {
        more.disabled = false;
        more.hidden = !state.hasMore;
        more.textContent = "Load older updates";
      }
    }
  }

  function openImageModal(url, alt) {
    const modal = $("imageModal");
    const image = $("modalImg");
    if (!modal || !image) return;
    image.src = url;
    image.alt = text(alt, "Project update evidence");
    modal.classList.add("show");
  }

  function closeImageModal() {
    const modal = $("imageModal");
    const image = $("modalImg");
    if (modal) modal.classList.remove("show");
    if (image) image.removeAttribute("src");
  }

  window.closeImageModal = closeImageModal;

  function createActionStatus(message, kind) {
    return create("div", "interaction-status" + (kind ? " " + kind : ""), message);
  }

  function makeCommentNode(comment, allComments, depth, updateId) {
    const item = create("article", "project-comment");
    const head = create("div", "project-comment-head");
    head.appendChild(create("strong", "", text(comment.commenter_name, "ALBUKHR User")));
    head.appendChild(create("time", "", formatDate(comment.created_at)));
    item.appendChild(head);
    item.appendChild(create("p", "project-comment-text", text(comment.comment_text)));

    const actions = create("div", "project-comment-actions");
    const replyButton = createButton("Reply", "comment-reply-button", "reply", { commentId: comment.id });
    actions.appendChild(replyButton);
    item.appendChild(actions);

    const replyHost = create("div", "project-reply-host");
    item.appendChild(replyHost);
    replyButton.addEventListener("click", () => {
      const oldForm = replyHost.querySelector("form");
      if (oldForm) {
        oldForm.remove();
        return;
      }
      replyHost.replaceChildren(createCommentForm(updateId, text(comment.id), () => refreshComments(updateId)));
    });

    const childComments = allComments.filter((child) => text(child.parent_comment_id) === text(comment.id));
    if (childComments.length && depth < 6) {
      const children = create("div", "project-comment-children");
      childComments.forEach((child) => children.appendChild(makeCommentNode(child, allComments, depth + 1, updateId)));
      item.appendChild(children);
    }
    return item;
  }

  function createCommentForm(updateId, parentCommentId, onComplete) {
    const form = create("form", "project-comment-form");
    const textarea = create("textarea", "project-comment-input");
    textarea.rows = 3;
    textarea.maxLength = COMMENT_LIMIT;
    textarea.required = true;
    textarea.placeholder = parentCommentId ? "Write a reply…" : "Add a constructive comment…";
    const footer = create("div", "project-comment-form-footer");
    const hint = create("span", "interaction-hint", "Pi sign-in is required to post.");
    const submit = create("button", "interaction-submit", parentCommentId ? "Post reply" : "Post comment");
    submit.type = "submit";
    footer.append(hint, submit);
    form.append(textarea, footer);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const commentText = textarea.value.trim();
      if (!commentText || commentText.length > COMMENT_LIMIT) {
        hint.textContent = "Comment must contain 1–3,000 characters.";
        hint.className = "interaction-hint error";
        return;
      }
      submit.disabled = true;
      hint.textContent = "Verifying Pi identity and posting…";
      hint.className = "interaction-hint";
      try {
        await apiRequest("/updates/" + encodeURIComponent(updateId) + "/comments", {
          method: "POST",
          auth: true,
          body: { comment_text: commentText, parent_comment_id: parentCommentId || null }
        });
        const source = state.items.find((row) => text(row.id) === text(updateId));
        if (source) source.comments_count = Number(source.comments_count || 0) + 1;
        const card = findUpdateCard(updateId);
        const commentsButton = card?.querySelector('[data-action="comments"]');
        if (commentsButton && source) commentsButton.textContent = "Comments (" + source.comments_count + ")";
        hint.textContent = "Comment posted.";
        hint.className = "interaction-hint success";
        if (typeof onComplete === "function") await onComplete();
      } catch (error) {
        hint.textContent = error.message || "Comment could not be posted.";
        hint.className = "interaction-hint error";
      } finally {
        submit.disabled = false;
      }
    });
    return form;
  }

  function renderCommentsIntoPanel(updateId, panel, comments) {
    panel.replaceChildren();
    panel.appendChild(create("h3", "comments-heading", "Discussion (" + comments.length + ")"));
    panel.appendChild(createCommentForm(updateId, null, () => refreshComments(updateId)));
    if (!comments.length) {
      panel.appendChild(create("div", "empty-comments", "No comments yet. Start a constructive discussion."));
    } else {
      const roots = comments.filter((comment) => !comment.parent_comment_id || !comments.some((parent) => text(parent.id) === text(comment.parent_comment_id)));
      const list = create("div", "project-comment-list");
      roots.forEach((comment) => list.appendChild(makeCommentNode(comment, comments, 0, updateId)));
      panel.appendChild(list);
    }
  }

  async function refreshComments(updateId) {
    if (state.commentsLoading.has(text(updateId))) return;
    const panel = findUpdateCard(updateId)?.querySelector("[data-comments-panel]");
    if (!panel) return;
    state.commentsLoading.add(text(updateId));
    panel.replaceChildren(create("div", "comment-loading", "Loading comments…"));
    try {
      const detail = await apiRequest("/updates/" + encodeURIComponent(updateId));
      const comments = Array.isArray(detail?.comments) ? detail.comments : [];
      state.commentsByUpdate.set(text(updateId), comments);
      const currentPanel = findUpdateCard(updateId)?.querySelector("[data-comments-panel]");
      if (currentPanel && state.expandedComments.has(text(updateId))) {
        renderCommentsIntoPanel(updateId, currentPanel, comments);
      }
    } catch (error) {
      const currentPanel = findUpdateCard(updateId)?.querySelector("[data-comments-panel]");
      if (currentPanel) {
        currentPanel.replaceChildren(createActionStatus(error.message || "Comments could not be loaded.", "error"));
        const retry = createButton("Try again", "interaction-button", "reload-comments", { updateId });
        retry.addEventListener("click", () => refreshComments(updateId));
        currentPanel.appendChild(retry);
      }
    } finally {
      state.commentsLoading.delete(text(updateId));
    }
  }

  function renderReportPanel(item, panel) {
    panel.replaceChildren();
    panel.appendChild(create("h3", "report-heading", "Report this update"));
    panel.appendChild(create("p", "report-explainer", "Reports are reviewed through ALBUKHR moderation. Good-faith criticism is not a reason to remove an update."));
    const form = create("form", "project-report-form");
    const reason = create("select", "report-select");
    reason.required = true;
    [
      ["", "Choose a reason"],
      ["spam", "Spam"],
      ["abuse", "Abusive content"],
      ["misleading", "Potentially misleading information"],
      ["personal_data", "Personal data"],
      ["other", "Other concern"]
    ].forEach(([value, label]) => reason.appendChild(new Option(label, value)));
    const details = create("textarea", "report-details");
    details.rows = 3;
    details.maxLength = REPORT_DETAILS_LIMIT;
    details.placeholder = "Optional details (up to 1,500 characters)";
    const footer = create("div", "project-report-footer");
    const hint = create("span", "interaction-hint", "Pi sign-in is required to submit a report.");
    const submit = create("button", "interaction-submit", "Submit report");
    submit.type = "submit";
    footer.append(hint, submit);
    form.append(reason, details, footer);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!reason.value) {
        hint.textContent = "Choose a report reason.";
        hint.className = "interaction-hint error";
        return;
      }
      submit.disabled = true;
      hint.textContent = "Verifying Pi identity and submitting…";
      hint.className = "interaction-hint";
      try {
        const result = await apiRequest("/updates/" + encodeURIComponent(item.id) + "/reports", {
          method: "POST",
          auth: true,
          body: { reason: reason.value, details: details.value.trim() || null }
        });
        hint.textContent = result?.already_reported
          ? "A report from this account already exists for this update. No duplicate report was created."
          : "Report submitted for moderation review.";
        hint.className = "interaction-hint success";
        submit.disabled = true;
      } catch (error) {
        hint.textContent = error.message || "Report could not be submitted.";
        hint.className = "interaction-hint error";
        submit.disabled = false;
      }
    });
    panel.appendChild(form);
  }

  async function toggleReaction(updateId, voteType, button) {
    button.disabled = true;
    try {
      const result = await apiRequest("/updates/" + encodeURIComponent(updateId) + "/reaction", {
        method: "PUT",
        auth: true,
        body: { vote_type: voteType }
      });
      const item = state.items.find((row) => text(row.id) === text(updateId));
      if (item) {
        if (result?.action === "added") item[voteType === "like" ? "like_count" : "dislike_count"] = Number(item[voteType === "like" ? "like_count" : "dislike_count"] || 0) + 1;
        if (result?.action === "updated") {
          const opposite = voteType === "like" ? "dislike_count" : "like_count";
          item[opposite] = Math.max(0, Number(item[opposite] || 0) - 1);
          const target = voteType === "like" ? "like_count" : "dislike_count";
          item[target] = Number(item[target] || 0) + 1;
        }
        if (result?.action === "removed") {
          const target = voteType === "like" ? "like_count" : "dislike_count";
          item[target] = Math.max(0, Number(item[target] || 0) - 1);
        }
      }
      if (result?.action === "removed") state.viewerReactions.delete(text(updateId));
      else state.viewerReactions.set(text(updateId), voteType);
      const card = findUpdateCard(updateId);
      const likeButton = card?.querySelector('[data-action="like"]');
      const dislikeButton = card?.querySelector('[data-action="dislike"]');
      if (item && likeButton && dislikeButton) {
        likeButton.textContent = "Like (" + Number(item.like_count || 0) + ")";
        dislikeButton.textContent = "Dislike (" + Number(item.dislike_count || 0) + ")";
        likeButton.classList.toggle("selected", state.viewerReactions.get(text(updateId)) === "like");
        dislikeButton.classList.toggle("selected", state.viewerReactions.get(text(updateId)) === "dislike");
      }
      setFeedMessage(result?.action === "removed" ? "Your reaction was removed." : "Your reaction was recorded.", "success");
    } catch (error) {
      setFeedMessage(error.message || "Your reaction could not be saved.", "error");
    } finally {
      button.disabled = false;
    }
  }

  function bind() {
    $("refreshFeedBtn")?.addEventListener("click", () => loadFeed(true));
    $("filterSort")?.addEventListener("change", (event) => {
      const value = text(event.target.value).toLowerCase();
      state.sort = value === "oldest" ? "oldest" : "latest";
      loadFeed(true);
    });
    $("filterProjectType")?.addEventListener("change", (event) => {
      state.projectType = text(event.target.value).toLowerCase();
      renderFeed();
    });
    $("filterProjectCode")?.addEventListener("input", (event) => {
      state.projectCode = text(event.target.value);
      renderFeed();
    });
    $("loadMoreProjectUpdates")?.addEventListener("click", () => loadFeed(false));

    $("projectFeed")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const updateId = text(button.dataset.updateId);
      const action = text(button.dataset.action);
      if (!updateId) return;

      if (action === "like" || action === "dislike") {
        await toggleReaction(updateId, action, button);
        return;
      }
      if (action === "comments") {
        const panel = findUpdateCard(updateId)?.querySelector("[data-comments-panel]");
        if (!panel) return;
        if (state.expandedComments.has(updateId)) {
          state.expandedComments.delete(updateId);
          panel.hidden = true;
        } else {
          state.expandedComments.add(updateId);
          panel.hidden = false;
          await refreshComments(updateId);
        }
        return;
      }
      if (action === "report") {
        const panel = findUpdateCard(updateId)?.querySelector("[data-report-panel]");
        if (!panel) return;
        if (state.openReports.has(updateId)) {
          state.openReports.delete(updateId);
          panel.hidden = true;
        } else {
          state.openReports.add(updateId);
          panel.hidden = false;
          const item = state.items.find((row) => text(row.id) === updateId);
          if (item) renderReportPanel(item, panel);
        }
      }
    });

    $("imageModal")?.addEventListener("click", (event) => {
      if (event.target === $("imageModal")) closeImageModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeImageModal();
    });
  }

  async function initialize() {
    if (state.initialized) return;
    ensureUi();
    removeLegacyPageExports();
    setFeedMessage("Preparing the secure ALBUKHR Mainnet public feed…");
    try {
      await ensureDependencies();
      await loadProjectTypes();
      bind();
      state.initialized = true;
      await loadFeed(true);
    } catch (error) {
      console.error("[ALBUKHR TRANSPARENCY INIT]", error);
      setMainMessage(error.message || "Transparency service is unavailable.", "error");
      setFeedMessage(error.message || "Transparency service is unavailable.", "error");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  window.AlbukhrTransparency = Object.freeze({
    refresh: () => loadFeed(true),
    loadOlder: () => loadFeed(false)
  });
})(window, document);
