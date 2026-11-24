/* ALBUKHR MARKETPLACE DASHBOARD UI */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const esc = v => window.AlbukhrMarketplaceUI?.escapeHTML
    ? window.AlbukhrMarketplaceUI.escapeHTML(v) : String(v ?? "");
  const state = {
    projects: [],
    filtered: [],
    selected: null,
    busy: false,
    infoReturnFocus: null
  };

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

    const code = p.project_code || p.slug || p.id;
    $("discoverySection").innerHTML = `
      <article class="featured-project">
        <div class="featured-title">
          <span>Project spotlight</span>
          <button type="button" class="market-info-btn featured-info-btn"
            data-project-info="${esc(String(code))}" aria-label="View full information for ${esc(p.name || code)}">INFOR</button>
        </div>
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
        <article class="project-card"
          data-project-code="${esc(String(code))}">
          <div class="project-header">
            <div class="project-icon">${logoHTML(p)}</div>
            <div class="project-heading-copy" style="min-width:0;flex:1">
              <div class="project-title">${esc(p.name || code)}</div>
              <div class="project-category">${esc(typeLabel(p.project_type))}</div>
              <div class="badge-group">
                <span class="${statusClass}">${esc(statusLabel(p.status))}</span>
                ${p.project_code ? `<span class="core-badge">${esc(p.project_code)}</span>` : ""}
              </div>
            </div>
          </div>
          <button type="button" class="market-info-btn card-info-btn"
            data-project-info="${esc(String(code))}"
            aria-label="View full information for ${esc(p.name || code)}">INFOR</button>
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

  function addDetailRow(container, label, value) {
    if (value === null || value === undefined || String(value).trim() === "") return;
    const row = document.createElement("div");
    row.className = "project-info-detail-row";
    const key = document.createElement("span");
    key.className = "project-info-detail-label";
    key.textContent = label;
    const content = document.createElement("strong");
    content.className = "project-info-detail-value";
    content.textContent = String(value);
    row.append(key, content);
    container.appendChild(row);
  }

  function safePublicLogoUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const parsed = new URL(raw, window.location.origin);
      return parsed.protocol === "https:" ? parsed.href : "";
    } catch (_) {
      return "";
    }
  }

  function openProjectInfo(code, trigger) {
    const wanted = String(code || "").trim().toLowerCase();
    const project = state.projects.find(p =>
      String(p.project_code || "").toLowerCase() === wanted ||
      String(p.slug || "").toLowerCase() === wanted ||
      String(p.id || "").toLowerCase() === wanted
    );
    if (!project) {
      showAlert("Project information unavailable", "The selected project could not be found in the current public registry.");
      return;
    }

    const modal = $("projectInfoModal");
    const content = $("projectInfoContent");
    if (!modal || !content) {
      showAlert("Project information unavailable", "The project information panel is not available on this page.");
      return;
    }

    content.replaceChildren();
    state.infoReturnFocus = trigger || document.activeElement;

    const intro = document.createElement("div");
    intro.className = "project-info-intro";
    const logoUrl = safePublicLogoUrl(project.logo_url);
    if (logoUrl) {
      const image = document.createElement("img");
      image.className = "project-info-logo";
      image.src = logoUrl;
      image.alt = `${project.name || project.project_code || "Project"} logo`;
      image.loading = "lazy";
      intro.appendChild(image);
    }

    const identity = document.createElement("div");
    identity.className = "project-info-identity";
    const name = document.createElement("h3");
    name.className = "project-info-name";
    name.textContent = project.name || project.project_code || "ALBUKHR Project";
    identity.appendChild(name);
    if (project.project_code) {
      const codeText = document.createElement("p");
      codeText.className = "project-info-code";
      codeText.textContent = String(project.project_code);
      identity.appendChild(codeText);
    }
    intro.appendChild(identity);
    content.appendChild(intro);

    const badges = document.createElement("div");
    badges.className = "project-info-badges";
    [typeLabel(project.project_type), statusLabel(project.status)].forEach(label => {
      const badge = document.createElement("span");
      badge.className = "project-info-badge";
      badge.textContent = label;
      badges.appendChild(badge);
    });
    content.appendChild(badges);

    const descriptionHeading = document.createElement("h4");
    descriptionHeading.className = "project-info-section-title";
    descriptionHeading.textContent = "Project Information";
    content.appendChild(descriptionHeading);

    const description = document.createElement("p");
    description.className = "project-info-full-description";
    description.textContent = String(project.description || "No project description has been published yet.");
    content.appendChild(description);

    const projectConfig = typeof window.getProjectConfig === "function"
      ? window.getProjectConfig(project.project_code || project.slug || project.id)
      : null;
    const additionalInfo = String(projectConfig?.info || "").trim();
    if (additionalInfo && additionalInfo !== description.textContent.trim()) {
      const additionalHeading = document.createElement("h4");
      additionalHeading.className = "project-info-section-title";
      additionalHeading.textContent = "Additional Project Information";
      content.appendChild(additionalHeading);
      const additionalDescription = document.createElement("p");
      additionalDescription.className = "project-info-full-description";
      additionalDescription.textContent = additionalInfo;
      content.appendChild(additionalDescription);
    }

    const detailsHeading = document.createElement("h4");
    detailsHeading.className = "project-info-section-title";
    detailsHeading.textContent = "Public Registry Details";
    content.appendChild(detailsHeading);

    const details = document.createElement("div");
    details.className = "project-info-detail-list";
    addDetailRow(details, "Project code", project.project_code);
    addDetailRow(details, "Project type", typeLabel(project.project_type));
    addDetailRow(details, "Network", String(project.network || "").toUpperCase());
    addDetailRow(details, "Project status", statusLabel(project.status));
    if (String(project.project_type || "").toLowerCase() === "core") {
      addDetailRow(details, "Core project slot", project.core_slot);
    }
    if (project.investment_metrics_available === true) {
      addDetailRow(details, "Verified total invested", `${money(project.total_invested_pi, 7)} Pi`);
      addDetailRow(details, "Investor count", money(project.investor_count, 0));
    }
    if (!details.childElementCount) {
      const note = document.createElement("p");
      note.className = "project-info-note";
      note.textContent = "Additional public registry details are not currently available for this project.";
      details.appendChild(note);
    }
    content.appendChild(details);

    const note = document.createElement("p");
    note.className = "project-info-note";
    note.textContent = "This information is provided from the ALBUKHR public project registry. Investment availability and financial terms remain subject to the authoritative project and staking systems.";
    content.appendChild(note);

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("market-info-open");
    $("closeProjectInfoButton")?.focus();
  }

  function closeProjectInfo() {
    const modal = $("projectInfoModal");
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("market-info-open");
    if (state.infoReturnFocus && typeof state.infoReturnFocus.focus === "function") {
      state.infoReturnFocus.focus();
    }
    state.infoReturnFocus = null;
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

  function handleProjectInfoClick(event) {
    const button = event.target?.closest?.("[data-project-info]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    openProjectInfo(button.getAttribute("data-project-info"), button);
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
  $("projectList")?.addEventListener("click", handleProjectInfoClick);
  $("discoverySection")?.addEventListener("click", handleProjectInfoClick);
  $("closeProjectInfoButton")?.addEventListener("click", closeProjectInfo);
  $("projectInfoModal")?.addEventListener("click", event => {
    if (event.target === $("projectInfoModal")) closeProjectInfo();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("projectInfoModal")?.classList.contains("show")) {
      closeProjectInfo();
    }
  });
  $("investModal")?.addEventListener("click", e => {
    if (e.target === $("investModal")) closeInvestModal();
  });
  $("appAlert")?.addEventListener("click", e => {
    if (e.target === $("appAlert")) closeAppAlert();
  });

  window.openInvestModal = openInvestModal;
  window.closeInvestModal = closeInvestModal;
  window.confirmInvestment = confirmInvestment;
  window.openProjectInfo = openProjectInfo;
  window.closeProjectInfo = closeProjectInfo;
  window.closeAppAlert = closeAppAlert;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
