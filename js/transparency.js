/* =========================================================
   ALBUKHR — PUBLIC TRANSPARENCY FEED CONTROLLER
   Stage 6C | Mainnet public-read adapter

   Security boundary:
   - Published updates are read from the public trusted API.
   - No Supabase table or Storage writes are performed here.
   - No LocalStorage / SessionStorage identity is read.
   - This page never requests Mainnet updates from Testnet.
   - Project type labels are resolved from the existing public
     Mainnet Project Registry through the shared Supabase Core.
========================================================= */
(function (window, document) {
  "use strict";

  const API_BASE = "https://albukhr-api.onrender.com/api/project-updates";
  const MAINNET = "mainnet";
  const MAINNET_STORAGE_HOST = "ribpntyqdleytsyktdfb.supabase.co";
  const PAGE_SIZE = 20;

  const $ = (id) => document.getElementById(id);

  let environment = null;
  let projectConfig = null;
  let registryReady = false;
  let items = [];
  let nextCursor = null;
  let hasMore = false;
  let loading = false;
  let currentSort = "latest";

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function setMessage(message, type) {
    const feed = $("projectFeed");
    if (!feed) return;
    feed.classList.remove("loading");
    const box = document.createElement("div");
    box.className = type === "error" ? "error-box" : (type === "empty" ? "empty-feed" : "loading");
    box.textContent = String(message || "");
    feed.replaceChildren(box);
  }

  function loadScriptOnce(src, ready) {
    if (typeof ready === "function" && ready()) return Promise.resolve();

    const absolute = new URL(src, window.location.href).href;
    const existing = Array.from(document.scripts).find((script) => script.src === absolute);

    return new Promise((resolve, reject) => {
      const script = existing || document.createElement("script");
      let settled = false;

      const finish = (error) => {
        if (settled) return;
        settled = true;
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        if (error) reject(error);
        else resolve();
      };

      const onLoad = () => {
        if (typeof ready === "function" && !ready()) {
          finish(new Error("Required ALBUKHR module did not initialize: " + src));
          return;
        }
        finish();
      };
      const onError = () => finish(new Error("Unable to load required ALBUKHR module: " + src));

      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });

      if (!existing) {
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
      } else if (typeof ready === "function" && ready()) {
        finish();
      }
    });
  }

  async function initializeEnvironment() {
    await loadScriptOnce("js/core/environment-core.js", () => Boolean(window.ALBukhrEnvironment));
    environment = window.ALBukhrEnvironment;

    if (!environment || typeof environment.isKnown !== "function" || !environment.isKnown()) {
      throw new Error("ALBUKHR environment could not be verified on this host.");
    }

    if (typeof environment.isMainnet !== "function" || !environment.isMainnet()) {
      return false;
    }

    return true;
  }

  async function initializeProjectMetadata() {
    try {
      await loadScriptOnce("js/core/supabase-core.js", () => Boolean(window.ALBUKHR_SUPABASE && window.ALBUKHR_SUPABASE.client));
      const core = window.ALBUKHR_SUPABASE;
      if (!core || String(core.network || "").toLowerCase() !== MAINNET) {
        throw new Error("The shared Supabase Core is not connected to Mainnet.");
      }

      await loadScriptOnce("js/project-config.js", () => Boolean(window.ALBukhrProjectConfig));
      projectConfig = window.ALBukhrProjectConfig;
      if (!projectConfig || typeof projectConfig.loadRegistry !== "function") {
        throw new Error("The public project registry adapter is unavailable.");
      }

      const result = await projectConfig.loadRegistry();
      if (!result || result.ok !== true) {
        throw new Error(result && result.error || "The Mainnet project registry could not be loaded.");
      }

      registryReady = true;
      const typeFilter = $("filterProjectType");
      if (typeFilter) {
        typeFilter.disabled = false;
        typeFilter.title = "Filter published updates by registered Mainnet project type.";
      }
    } catch (error) {
      registryReady = false;
      const typeFilter = $("filterProjectType");
      if (typeFilter) {
        typeFilter.disabled = true;
        typeFilter.value = "";
        typeFilter.title = "Project-type filtering is unavailable because the public Mainnet registry could not be verified.";
      }
      console.warn("[ALBUKHR TRANSPARENCY] Project-type metadata unavailable:", error);
    }
  }

  function resolveProjectType(item) {
    const direct = clean(item && item.project_type).toLowerCase();
    if (["core", "internal", "external"].includes(direct)) return direct;

    if (!registryReady || !projectConfig || typeof projectConfig.find !== "function") return "unknown";

    const key = clean(item && (item.project_code || item.project_id));
    if (!key) return "unknown";

    const project = projectConfig.find(key);
    const type = clean(project && project.project_type).toLowerCase();
    return ["core", "internal", "external"].includes(type) ? type : "unknown";
  }

  function safeImageUrl(value) {
    try {
      const url = new URL(clean(value));
      if (url.protocol !== "https:" || url.hostname !== MAINNET_STORAGE_HOST) return "";
      if (!url.pathname.startsWith("/storage/v1/object/public/project-updates/")) return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }).format(date);
  }

  function typeLabel(type) {
    if (type === "core") return "CORE PROJECT";
    if (type === "internal") return "INTERNAL PROJECT";
    if (type === "external") return "EXTERNAL PROJECT";
    return "PROJECT";
  }

  function typeClass(type) {
    if (type === "core") return "core-badge";
    if (type === "internal") return "internal-badge";
    if (type === "external") return "external-badge";
    return "";
  }

  function textElement(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = clean(value);
    return element;
  }

  function createFeedCard(item) {
    const card = document.createElement("article");
    card.className = "timeline-card";

    const header = document.createElement("div");
    header.className = "timeline-header";
    const left = document.createElement("div");
    left.className = "timeline-left";

    left.appendChild(textElement("div", "timeline-project", item.project_name || "ALBUKHR Project"));

    const meta = document.createElement("div");
    meta.className = "timeline-meta";
    const projectType = resolveProjectType(item);
    const badge = textElement("span", "timeline-type " + typeClass(projectType), typeLabel(projectType));
    meta.appendChild(badge);
    if (item.project_code) meta.appendChild(textElement("span", "project-code", item.project_code));
    left.appendChild(meta);
    header.appendChild(left);
    card.appendChild(header);

    card.appendChild(textElement("div", "timeline-title", item.title || "Project update"));

    const imageUrl = safeImageUrl(item.image_url);
    if (imageUrl) {
      const imageWrapper = document.createElement("div");
      imageWrapper.className = "image-wrapper";
      const image = document.createElement("img");
      image.className = "timeline-image";
      image.src = imageUrl;
      image.alt = clean(item.title || "Project update") + " evidence image";
      image.loading = "lazy";
      image.decoding = "async";
      image.referrerPolicy = "no-referrer";
      image.addEventListener("error", () => {
        imageWrapper.replaceChildren(textElement("div", "empty-feed", "Evidence image is temporarily unavailable."));
      }, { once: true });
      imageWrapper.appendChild(image);
      card.appendChild(imageWrapper);
    }

    card.appendChild(textElement("p", "timeline-desc", item.body || ""));

    const counts = document.createElement("div");
    counts.className = "timeline-meta";
    counts.appendChild(textElement("span", "muted", "Likes: " + Number(item.like_count || 0)));
    counts.appendChild(textElement("span", "muted", "Dislikes: " + Number(item.dislike_count || 0)));
    counts.appendChild(textElement("span", "muted", "Comments: " + Number(item.comments_count || 0)));
    card.appendChild(counts);

    const source = clean(item.source_label || "project_provided").replace(/_/g, " ").toUpperCase();
    card.appendChild(textElement("div", "timeline-time", source + " · " + formatDate(item.published_at)));

    return card;
  }

  function filteredItems() {
    const code = clean($("filterProjectCode") && $("filterProjectCode").value).toLowerCase();
    const type = clean($("filterProjectType") && $("filterProjectType").value).toLowerCase();

    return items.filter((item) => {
      if (code && !clean(item.project_code).toLowerCase().includes(code)) return false;
      if (type && resolveProjectType(item) !== type) return false;
      return true;
    });
  }

  function updateLoadMoreButton() {
    const button = $("loadMoreFeedBtn");
    if (!button) return;
    button.hidden = !hasMore;
    button.style.display = hasMore ? "block" : "none";
    button.disabled = loading;
    button.textContent = loading ? "Loading…" : "Load older updates";
  }

  function renderFeed() {
    const feed = $("projectFeed");
    if (!feed) return;

    const rows = filteredItems();
    const list = document.createElement("div");
    list.className = "timeline-feed";

    if (!rows.length) {
      const message = items.length
        ? (hasMore ? "No updates match these filters in the loaded results. Load older updates to continue searching." : "No published updates match the selected filters.")
        : "No published project updates are available yet.";
      list.appendChild(textElement("div", "empty-feed", message));
    } else {
      rows.forEach((item) => list.appendChild(createFeedCard(item)));
    }

    const status = document.createElement("div");
    status.className = "muted";
    status.textContent = "Showing " + rows.length + " of " + items.length + " loaded update(s)." +
      (hasMore ? " Older updates are available." : " You are viewing all available results.");

    feed.classList.remove("loading");
    feed.replaceChildren(list, status);
    updateLoadMoreButton();
  }

  function ensureLoadMoreButton() {
    let button = $("loadMoreFeedBtn");
    if (button) return button;

    button = document.createElement("button");
    button.id = "loadMoreFeedBtn";
    button.type = "button";
    button.className = "filter-btn";
    button.textContent = "Load older updates";
    button.hidden = true;

    const feed = $("projectFeed");
    if (feed && feed.parentNode) feed.parentNode.insertBefore(button, feed.nextSibling);
    return button;
  }

  async function fetchFeed(reset) {
    if (loading) return;
    if (reset) {
      items = [];
      nextCursor = null;
      hasMore = true;
    }

    loading = true;
    updateLoadMoreButton();
    if (!items.length) setMessage("Loading published Mainnet project updates…");

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), sort: currentSort });
      if (!reset && nextCursor) params.set("cursor", nextCursor);

      const response = await fetch(API_BASE + "/feed?" + params.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        credentials: "omit"
      });

      let payload;
      try { payload = await response.json(); }
      catch (_) { throw new Error("Project Updates service returned an unreadable response."); }

      if (!response.ok) {
        throw new Error(clean(payload && payload.error) || "Unable to load published project updates.");
      }
      if (!payload || payload.success !== true || String(payload.network || "").toLowerCase() !== MAINNET) {
        throw new Error("Project Updates service returned an invalid or non-Mainnet response.");
      }

      const data = payload.data || {};
      if (!Array.isArray(data.items)) throw new Error("Project Updates service returned an invalid feed list.");

      items = items.concat(data.items);
      nextCursor = clean(data.next_cursor) || null;
      hasMore = data.has_more === true && Boolean(nextCursor);
      renderFeed();
    } catch (error) {
      console.error("[ALBUKHR TRANSPARENCY FEED]", error);
      if (items.length) {
        renderFeed();
        const feed = $("projectFeed");
        if (feed) feed.appendChild(textElement("div", "error-box", error.message || "Unable to load older updates."));
      } else {
        setMessage(error && error.message || "Unable to load published project updates.", "error");
      }
    } finally {
      loading = false;
      updateLoadMoreButton();
    }
  }

  function bindControls() {
    $("refreshFeedBtn")?.addEventListener("click", () => fetchFeed(true));
    $("filterProjectCode")?.addEventListener("input", renderFeed);
    $("filterProjectType")?.addEventListener("change", renderFeed);
    $("filterSort")?.addEventListener("change", (event) => {
      const sort = clean(event.target.value).toLowerCase();
      currentSort = sort === "oldest" ? "oldest" : "latest";
      fetchFeed(true);
    });
    ensureLoadMoreButton()?.addEventListener("click", () => {
      if (hasMore && nextCursor) fetchFeed(false);
    });

    $("projectFeed")?.addEventListener("click", (event) => {
      const image = event.target.closest(".timeline-image");
      if (!image) return;
      openImageModal(image.src);
    });
  }

  function openImageModal(src) {
    const modal = $("imageModal");
    const image = $("modalImg");
    if (!modal || !image || !src) return;
    image.src = src;
    modal.classList.add("show");
    image.onclick = (event) => event.stopPropagation();
  }

  function closeImageModal() {
    const modal = $("imageModal");
    const image = $("modalImg");
    if (modal) modal.classList.remove("show");
    if (image) image.removeAttribute("src");
  }

  function closeAppAlert() {
    const alert = $("appAlert");
    if (alert) alert.classList.remove("show");
  }

  async function initialize() {
    bindControls();

    try {
      const mainnet = await initializeEnvironment();
      if (!mainnet) {
        setMessage("Project Updates are published on ALBUKHR Mainnet. Open app.albukhr.com to view the Mainnet public feed.");
        const controls = [$("filterProjectCode"), $("filterProjectType"), $("filterSort"), $("refreshFeedBtn")];
        controls.forEach((control) => { if (control) control.disabled = true; });
        return;
      }

      await initializeProjectMetadata();
      currentSort = clean($("filterSort") && $("filterSort").value).toLowerCase() === "oldest" ? "oldest" : "latest";
      await fetchFeed(true);
    } catch (error) {
      console.error("[ALBUKHR TRANSPARENCY INIT]", error);
      setMessage(error && error.message || "Project Transparency could not be initialized.", "error");
    }
  }

  window.openImageModal = openImageModal;
  window.closeImageModal = closeImageModal;
  window.closeAppAlert = closeAppAlert;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }
})(window, document);
