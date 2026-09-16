/* ALBUKHR MARKETPLACE DASHBOARD UI */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const esc = v => window.AlbukhrMarketplaceUI?.escapeHTML
    ? window.AlbukhrMarketplaceUI.escapeHTML(v) : String(v ?? "");
  const state = { projects: [], filtered: [], selected: null, busy: false };

  const DEFAULT_DURATIONS = [30, 60, 90, 180, 365, 430];

  function money(v, digits = 2) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString(undefined, {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    }) : "0.00";
  }

  function typeLabel(v) {
    const s = String(v || "").trim().toLowerCase();
    if (s === "core") return "Core Project";
    if (s === "internal") return "Internal Project";
    if (s === "external") return "External Project";
    return "Project";
  }

  function statusLabel(v) {
    const s = String(v || "").trim().toLowerCase();
    return s ? s.toUpperCase() : "UNKNOWN";
  }

  function logoHTML(project) {
    const url = String(project?.logo_url || "").trim();
    if (url) {
      return `<img src="${esc(url)}" alt="" loading="lazy"
        onerror="this.remove();this.parentElement.innerHTML='<svg class=&quot;project-icon-fallback&quot; viewBox=&quot;0 0 24 24&quot; aria-hidden=&quot;true&quot;><path d=&quot;M12 3v18M3 12h18&quot;/></svg>'">`;
    }
    return `<svg class="project-icon-fallback" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v18M3 12h18"/></svg>`;
  }

  function renderLoading() {
    $("projectList").innerHTML =
      '<div class="loading-card"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>';
  }

  function renderInsights() {
    const list = state.projects;
    const liquidity = list.reduce((s,p) => s + Number(p.liquidity || 0), 0);
    const investors = list.reduce((s,p) => s + Number(p.investors || 0), 0);
    const avgROI = list.length ? list.reduce((s,p) => s + Number(p.roi || 0), 0) / list.length : 0;

    $("marketInsights").innerHTML = `
      <article class="market-box">
        <h3>Projects</h3>
        <div class="market-item"><span>Registered on this network</span><b>${list.length}</b></div>
        <div class="market-item"><span>Active for investment</span><b>${list.filter(p => String(p.status).toLowerCase() === "active").length}</b></div>
      </article>
      <article class="market-box">
        <h3>Liquidity</h3>
        <div class="market-item"><span>Marketplace liquidity</span><b>${money(liquidity)} Pi</b></div>
      </article>
      <article class="market-box">
        <h3>Participation</h3>
        <div class="market-item"><span>Investors</span><b>${money(investors,0)}</b></div>
        <div class="market-item"><span>Average listed ROI</span><b>${money(avgROI)}%</b></div>
      </article>`;
  }

  function renderSpotlight() {
    const active = state.projects.find(p => String(p.status).toLowerCase() === "active");
    const p = active || state.projects[0];
    if (!p) { $("discoverySection").innerHTML = ""; return; }

    const activeNow = String(p.status).toLowerCase() === "active";
    $("discoverySection").innerHTML = `
      <article class="featured-project">
        <div class="featured-title">Project spotlight</div>
        <div class="featured-name">${esc(p.name || p.project_code)}</div>
        <div class="featured-desc">${esc(p.description || "Project information is available from the ALBUKHR public registry.")}</div>
        <div class="featured-stats">
          <div class="featured-stat"><span>Status</span><b>${statusLabel(p.status)}</b></div>
          <div class="featured-stat"><span>ROI</span><b>${money(p.roi)}%</b></div>
          <div class="featured-stat"><span>Liquidity</span><b>${money(p.liquidity)} Pi</b></div>
        </div>
        <button type="button" class="featured-btn" onclick="window.location.href='project.html?project=${encodeURIComponent(p.project_code || p.slug || p.id)}'">
          View Project
        </button>
      </article>`;
  }

  function renderProjects() {
    const list = state.filtered;
    if (!list.length) {
      $("projectList").innerHTML =
        '<div class="empty"><strong>No matching projects</strong><br>Try another search or clear the filter.</div>';
      return;
    }

    $("projectList").innerHTML = list.map(p => {
      const active = String(p.status || "").toLowerCase() === "active";
      const statusClass = active ? "roi-badge" : "liquidity-badge";
      const code = p.project_code || p.slug || p.id;
      return `
        <article class="project-card">
          <div class="project-header">
            <div class="project-icon">${logoHTML(p)}</div>
            <div style="min-width:0;flex:1">
              <div class="project-title">${esc(p.name || code)}</div>
              <div class="project-category">${esc(typeLabel(p.project_type))}</div>
              <div class="badge-group">
                <span class="${statusClass}">${esc(statusLabel(p.status))}</span>
                ${p.project_code ? `<span class="core-badge">${esc(p.project_code)}</span>` : ""}
              </div>
            </div>
          </div>
          <div class="project-desc">${esc(p.description || "No project description has been published yet.")}</div>
          <div class="project-info">
            <div class="info-box"><span>ROI</span><b>${money(p.roi)}%</b></div>
            <div class="info-box"><span>Liquidity</span><b>${money(p.liquidity)} Pi</b></div>
            <div class="info-box"><span>Investors</span><b>${money(p.investors,0)}</b></div>
            <div class="info-box"><span>Status</span><b>${esc(statusLabel(p.status))}</b></div>
          </div>
          <button type="button" class="invest-btn" ${active ? "" : "disabled"}
            onclick="openInvestModal('${esc(String(code))}')">
            ${active ? "Invest Now" : "Not Available for Investment"}
          </button>
        </article>`;
    }).join("");
  }

  function applyFilters() {
    const q = String($("projectSearch").value || "").trim().toLowerCase();
    const sort = String($("sortProjects").value || "").toLowerCase();

    state.filtered = state.projects.filter(p => {
      if (!q) return true;
      return [p.project_code,p.name,p.slug,p.project_type,p.description]
        .some(v => String(v || "").toLowerCase().includes(q));
    });

    if (sort === "roi") state.filtered.sort((a,b) => Number(b.roi||0) - Number(a.roi||0));
    else if (sort === "liquidity") state.filtered.sort((a,b) => Number(b.liquidity||0) - Number(a.liquidity||0));
    else if (sort === "investors") state.filtered.sort((a,b) => Number(b.investors||0) - Number(a.investors||0));

    renderProjects();
  }

  function durationsFor(project) {
    const cfg = typeof window.getProjectConfig === "function"
      ? window.getProjectConfig(project.project_code || project.slug || project.id) : null;
    const values = Array.isArray(cfg?.durations) && cfg.durations.length
      ? cfg.durations : DEFAULT_DURATIONS;
    return [...new Set(values.map(Number).filter(v => Number.isFinite(v) && v > 0))];
  }

  function minStakeFor(project) {
    const registryMin = Number(project?.min_stake);
    if (Number.isFinite(registryMin) && registryMin > 0) return registryMin;
    if (typeof window.getMinStake === "function") {
      const v = Number(window.getMinStake(project.project_code || project.slug || project.id));
      if (Number.isFinite(v) && v > 0) return v;
    }
    return 10;
  }

  function updatePreview() {
    const p = state.selected;
    if (!p) return;
    const amount = Number($("investAmount").value);
    const duration = Number($("investDuration").value);
    const min = minStakeFor(p);
    if (!Number.isFinite(amount) || amount <= 0) {
      $("investPreview").textContent = `Minimum investment: ${money(min)} Pi.`;
      return;
    }
    if (amount < min) {
      $("investPreview").textContent = `Minimum investment: ${money(min)} Pi.`;
      return;
    }
    const rate = typeof window.getRewardRate === "function"
      ? Number(window.getRewardRate(p.project_code, duration)) : 0;
    $("investPreview").textContent = rate > 0
      ? `Selected term: ${duration} days • configured reward rate: ${money(rate)}%.`
      : `Selected term: ${duration} days. Reward terms are enforced by the investment configuration.`;
  }

  function openInvestModal(code) {
    const q = String(code || "").trim().toLowerCase();
    const p = state.projects.find(x =>
      String(x.project_code || "").toLowerCase() === q ||
      String(x.slug || "").toLowerCase() === q ||
      String(x.id || "").toLowerCase() === q);
    if (!p || String(p.status).toLowerCase() !== "active") {
      showAlert("Investment unavailable", "This project is not ACTIVE for investment.");
      return;
    }

    state.selected = p;
    $("investProjectName").textContent = p.name || p.project_code || "Project";
    $("investAmount").value = "";
    const durations = durationsFor(p);
    $("investDuration").innerHTML = durations.map(d => `<option value="${d}">${d} days</option>`).join("");
    $("investAmount").min = String(minStakeFor(p));
    $("investPreview").textContent = `Minimum investment: ${money(minStakeFor(p))} Pi.`;
    $("investModal").classList.add("show");
    $("investAmount").focus();
  }

  function closeInvestModal() {
    $("investModal").classList.remove("show");
    state.selected = null;
  }

  async function confirmInvestment() {
    if (state.busy || !state.selected) return;
    const p = state.selected;
    const amount = Number($("investAmount").value);
    const duration = Number($("investDuration").value);
    const min = minStakeFor(p);

    if (!Number.isFinite(amount) || amount < min) {
      showAlert("Invalid amount", `Minimum investment is ${money(min)} Pi.`);
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      showAlert("Invalid duration", "Please select a valid investment duration.");
      return;
    }

    state.busy = true;
    const btn = $("investConfirmButton");
    btn.disabled = true;
    btn.textContent = "Processing...";

    try {
      const result = await window.AlbukhrMarketplace.invest({
        project: p.project_code,
        amount,
        duration,
        network: window.ALBukhrEnvironment?.getNetwork?.()
      });

      if (result?.error) throw new Error(result.error);
      closeInvestModal();
      showAlert("Investment started", "The Pi payment flow has completed the server-authoritative investment step.");
    } catch (error) {
      console.error("ALBUKHR Marketplace investment:", error);
      showAlert("Investment failed", error?.message || "The investment could not be completed.");
    } finally {
      state.busy = false;
      btn.disabled = false;
      btn.textContent = "Invest Now";
    }
  }

  function showAlert(title, message) {
    $("appAlertTitle").textContent = title;
    $("appAlertText").textContent = message;
    $("appAlert").classList.add("show");
  }

  function closeAppAlert() {
    $("appAlert").classList.remove("show");
  }

  async function init() {
    renderLoading();
    try {
      if (!window.AlbukhrMarketplace) throw new Error("Marketplace engine is unavailable.");
      state.projects = await window.AlbukhrMarketplace.getAllProjects();
      state.filtered = [...state.projects];
      renderInsights();
      renderSpotlight();
      renderProjects();
    } catch (error) {
      console.error("ALBUKHR Marketplace:", error);
      $("marketInsights").innerHTML = "";
      $("discoverySection").innerHTML = "";
      $("projectList").innerHTML =
        `<div class="empty"><strong>Marketplace unavailable</strong><br>${esc(error?.message || "Project data could not be loaded.")}</div>`;
    }
  }

  $("projectSearch")?.addEventListener("input", applyFilters);
  $("sortProjects")?.addEventListener("change", applyFilters);
  $("investAmount")?.addEventListener("input", updatePreview);
  $("investDuration")?.addEventListener("change", updatePreview);
  $("investModal")?.addEventListener("click", e => {
    if (e.target === $("investModal")) closeInvestModal();
  });
  $("appAlert")?.addEventListener("click", e => {
    if (e.target === $("appAlert")) closeAppAlert();
  });

  window.openInvestModal = openInvestModal;
  window.closeInvestModal = closeInvestModal;
  window.confirmInvestment = confirmInvestment;
  window.closeAppAlert = closeAppAlert;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
