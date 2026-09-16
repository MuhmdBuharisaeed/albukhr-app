/* ALBUKHR — INVESTOR DASHBOARD V5
   API/registry-authoritative investor dashboard.
   Dock navigation is intentionally untouched.
*/
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const clean = v => String(v ?? "").trim();
  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const pi = v => `${num(v).toFixed(2)} Pi`;
  const esc = v => clean(v).replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");

  function dockSetup() {
    let lastScroll = 0;
    const dock = document.querySelector(".dock-nav");
    if (dock) {
      window.addEventListener("scroll", () => {
        const current = window.pageYOffset;
        if (Math.abs(current - lastScroll) <= 10) return;
        dock.classList.toggle("hide", current > lastScroll);
        lastScroll = current;
      }, {passive:true});
    }
    const currentPage = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".dock-item").forEach(link => {
      if (link.getAttribute("href") === currentPage) link.classList.add("active");
    });
  }

  function getUser() {
    return window.AlbukhrPageAuthGuard?.getCurrentUser?.()
      || window.AlbukhrPiAuth?.getUser?.()
      || null;
  }

  function projectConfig(stake) {
    const registry = window.getProjectConfig;
    if (typeof registry !== "function") return null;
    const candidates = [
      stake.project_id, stake.project_code, stake.project,
      stake.slug, stake.project_name, stake.name
    ].filter(Boolean);
    for (const value of candidates) {
      const cfg = registry(value);
      if (cfg?.project_code || cfg?.project_id || cfg?.slug || cfg?.title) return cfg;
    }
    return null;
  }

  function stakeProjectKey(stake, cfg) {
    return clean(
      cfg?.project_code || cfg?.slug || cfg?.project_id ||
      stake.project_code || stake.project_id || stake.project ||
      stake.project_name || stake.name || "Unnamed Project"
    );
  }

  function stakeProjectName(stake, cfg) {
    return clean(cfg?.title || stake.project_name || stake.project_name ||
      stake.project || stake.name || cfg?.project_code || "Unnamed Project");
  }

  function stakeReward(stake) {
    return num(stake.reward_amount ?? stake.reward);
  }

  function stakeWithdrawnReward(stake) {
    return num(stake.withdrawn_reward ?? stake.withdrawnReward ?? 0);
  }

  function stakeStatus(stake, cfg) {
    return clean(stake.status || cfg?.status || "active").toLowerCase();
  }

  function isInvestmentRecord(stake) {
    const type = clean(stake.type).toLowerCase();
    return !type || type === "stake" || type === "investment";
  }

  async function ensureAuth() {
    if (window.AlbukhrPageAuthGuard?.waitForAuth) {
      const user = await window.AlbukhrPageAuthGuard.waitForAuth();
      if (!user) throw new Error("Authentication is required.");
      return user;
    }
    if (window.AlbukhrPiAuth?.ensurePiAuth) {
      return window.AlbukhrPiAuth.ensurePiAuth();
    }
    throw new Error("ALBUKHR authentication core is unavailable.");
  }

  async function loadRegistry() {
    if (typeof window.loadProjectRegistry !== "function") return;
    const result = await window.loadProjectRegistry();
    if (result?.ok === false) console.warn("Project registry unavailable:", result.error);
  }

  async function loadStakes() {
    if (typeof window.getAllStakesMerged !== "function") {
      throw new Error("Investment data engine is unavailable.");
    }
    const rows = await window.getAllStakesMerged();
    if (!Array.isArray(rows)) throw new Error("Invalid investment data.");
    return rows;
  }

  function renderCard(project, data) {
    const cfg = data.cfg;
    const name = esc(data.name);
    const code = esc(cfg?.project_code || data.key);
    const logo = clean(cfg?.logo_url);
    const type = clean(cfg?.project_type || "project").toLowerCase();
    const status = data.status === "active" ? "Active" : (data.status || "Pending");
    const roi = data.invest > 0 ? ((data.earn / data.invest) * 100).toFixed(2) : "0.00";
    const projectURL = `project.html?project=${encodeURIComponent(
      cfg?.project_code || cfg?.slug || cfg?.project_id || data.key
    )}`;

    const card = document.createElement("div");
    card.className = "invest-card";
    card.innerHTML = `
      <div class="investment-top">
        <div class="investment-project">
          <div class="investment-icon">
            ${logo
              ? `<img src="${esc(logo)}" alt="${name}" loading="lazy">`
              : `<span aria-hidden="true">${esc(code.slice(0,1) || "A")}</span>`}
          </div>
          <div>
            <div class="investment-name">${name}</div>
            <div class="investment-status">
              <span class="status-dot">${esc(status)}</span>
              <span class="project-badge">${esc(type)}</span>
            </div>
          </div>
        </div>
        <div class="investment-profit">
          <b>${data.earn.toFixed(2)} Pi</b>
          <span>Current Earnings</span>
        </div>
      </div>
      <div class="investment-grid">
        <div><span>Invested</span><b>${data.invest.toFixed(2)} Pi</b></div>
        <div><span>Earnings</span><b>${data.earn.toFixed(2)} Pi</b></div>
        <div><span>ROI</span><b>${roi}%</b></div>
        <div><span>Records</span><b>${data.count}</b></div>
      </div>
      <div class="progress-header">
        <span>Investment Records</span><span>${data.count}</span>
      </div>
      <div class="investment-progress">
        <div class="investment-progress-bar" style="width:100%"></div>
      </div>
      <button class="investment-btn" type="button">View Details</button>
    `;
    card.querySelector(".investment-btn")?.addEventListener("click", () => {
      location.href = projectURL;
    });
    return card;
  }

  async function renderInvestorDashboard() {
    const container = $("investments");
    if (!container) return;

    container.innerHTML = `<div class="invest-card dashboard-loading">Loading investments...</div>`;

    try {
      const user = await ensureAuth();
      if (!user?.id || !user?.pi_uid) throw new Error("Authenticated investor identity is incomplete.");

      await loadRegistry();
      const stakes = await loadStakes();

      let totalInvest = 0;
      let totalEarn = 0;
      const projects = new Map();

      stakes.filter(isInvestmentRecord).forEach(stake => {
        const amount = num(stake.amount);
        const reward = Math.max(0, stakeReward(stake) - stakeWithdrawnReward(stake));
        const cfg = projectConfig(stake);
        const key = stakeProjectKey(stake, cfg);
        const name = stakeProjectName(stake, cfg);

        if (!projects.has(key)) {
          projects.set(key, {
            key, name, cfg, invest:0, earn:0, count:0,
            status: stakeStatus(stake, cfg)
          });
        }
        const p = projects.get(key);
        p.invest += amount;
        p.earn += reward;
        p.count += 1;
        if (stakeStatus(stake, cfg) === "active") p.status = "active";
        totalInvest += amount;
        totalEarn += reward;
      });

      const portfolio = totalInvest + totalEarn;

      $("heroUserName") && ($("heroUserName").textContent = clean(user.username || "Investor"));
      $("totalPortfolio") && ($("totalPortfolio").textContent = pi(portfolio));
      $("totalInvest") && ($("totalInvest").textContent = pi(totalInvest));
      $("totalEarn") && ($("totalEarn").textContent = pi(totalEarn));
      $("totalProjects") && ($("totalProjects").textContent = String(
        [...projects.values()].filter(p => p.status === "active").length
      ));
      $("heroPortfolio") && ($("heroPortfolio").textContent = pi(portfolio));
      $("todayProfit") && ($("todayProfit").textContent = `+${totalEarn.toFixed(2)} Pi`);

      container.innerHTML = "";
      if (!projects.size) {
        container.innerHTML = `
          <div class="invest-card empty-investments">
            <h3>No investments yet</h3>
            <p>Start by exploring approved projects.</p>
            <button class="wallet-btn" type="button"
              onclick="location.href='marketplace.html'">Explore Marketplace</button>
          </div>`;
        return;
      }

      [...projects.values()]
        .sort((a,b) => a.name.localeCompare(b.name))
        .forEach(p => container.appendChild(renderCard(p, p)));
    } catch (error) {
      console.error("Investor Dashboard Error:", error);
      container.innerHTML = `
        <div class="invest-card dashboard-error">
          <h3>Unable to load investments</h3>
          <p>${esc(error?.message || "Please try again later.")}</p>
          <button class="wallet-btn" type="button" id="retryInvestorDashboard">Retry</button>
        </div>`;
      $("retryInvestorDashboard")?.addEventListener("click", renderInvestorDashboard);
    }
  }

  function setupBalanceToggle() {
    const button = $("toggleBalance");
    if (!button) return;
    let visible = true;
    const refresh = () => {
      const el = $("heroPortfolio");
      if (!el) return;
      if (visible) {
        el.dataset.hiddenValue = "";
        button.setAttribute("aria-label", "Hide portfolio balance");
        button.setAttribute("title", "Hide portfolio balance");
      } else {
        el.dataset.hiddenValue = el.textContent;
        el.textContent = "••••••";
        button.setAttribute("aria-label", "Show portfolio balance");
        button.setAttribute("title", "Show portfolio balance");
      }
    };
    button.addEventListener("click", () => {
      const el = $("heroPortfolio");
      if (!el) return;
      if (!visible && el.dataset.hiddenValue) {
        el.textContent = el.dataset.hiddenValue;
        el.dataset.hiddenValue = "";
      }
      visible = !visible;
      refresh();
    });
  }

  function setupGreeting() {
    const el = $("greetingText");
    if (!el) return;
    const h = new Date().getHours();
    el.textContent = h < 12 ? "Good Morning," : h < 18 ? "Good Afternoon," : "Good Evening,";
  }

  dockSetup();
  setupGreeting();
  setupBalanceToggle();
  renderInvestorDashboard();
  window.renderInvestorDashboard = renderInvestorDashboard;
})();
