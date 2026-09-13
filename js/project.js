/* =========================================================
   ALBUKHR PROJECT PAGE ENGINE v4
   Mainnet/Testnet-aware integration boundary
   ---------------------------------------------------------
   - Uses Environment Core / Supabase Core / Pi Auth Core
   - Uses authoritative Project Registry metadata
   - APPROVED is read-only; ACTIVE is investable
   - No LocalStorage
   - No browser-authoritative financial ledger
   - No guessed Supabase tables/RPCs
   - Preserves existing project.html DOM/CSS contract
========================================================= */
(function(window, document){
  "use strict";

  if (window.AlbukhrProjectPage) return;

  const params = new URLSearchParams(window.location.search);
  const requestedProject = (params.get("project") || "").trim();

  const $ = id => document.getElementById(id);

  function clean(v){ return String(v == null ? "" : v).trim(); }
  function network(){
    return clean(window.ALBukhrEnvironment?.getNetwork?.()).toLowerCase();
  }
  function isMainnet(){ return network() === "mainnet"; }

  function alertUser(title, text){
    if (typeof window.showAlert === "function") {
      window.showAlert(title, text);
    } else {
      window.alert(`${title}\n\n${text}`);
    }
  }

  function projectConfig(){
    if (typeof window.getProjectConfig !== "function") return null;
    return window.getProjectConfig(requestedProject);
  }

  async function loadRegistry(){
    if (typeof window.loadProjectRegistry !== "function") return null;
    return window.loadProjectRegistry();
  }

  async function resolveProject(){
    const registry = await loadRegistry();
    const cfg = projectConfig();
    if (!cfg) throw new Error("Project configuration is unavailable.");

    let project = cfg;

    if (typeof window.getProjectMeta === "function") {
      try {
        const meta = await window.getProjectMeta(
          cfg.project_code || requestedProject
        );
        if (meta) project = {...cfg, ...meta};
      } catch (_) {}
    }

    return {
      ...project,
      network: clean(project.network || network()).toLowerCase(),
      status: clean(project.status).toLowerCase()
    };
  }

  function applyProjectUI(project){
    const title = clean(project.title || project.name) || "ALBUKHR Project";
    const desc = clean(project.desc);
    const info = clean(project.info);

    if ($("txTitle")) $("txTitle").innerText = `${title} Transactions`;
    document.title = `${title} • ALBUKHR`;
    if ($("projectTitle")) $("projectTitle").innerText = title;
    if ($("projectDescription")) $("projectDescription").innerText = desc;
    if ($("infoTitle")) $("infoTitle").innerText = `About ${title}`;
    if ($("infoText")) $("infoText").innerText = info;
    if ($("stakeTitle")) $("stakeTitle").innerText = `Stake in ${title}`;

    const status = clean(project.status).toUpperCase();
    const statusText = $("stakeStatus");
    if (statusText) {
      if (status === "ACTIVE") {
        statusText.innerText = "Investment available.";
      } else if (status === "APPROVED") {
        statusText.innerText = "Approved project — investment is not active yet.";
      } else if (status) {
        statusText.innerText = `Investment unavailable: ${status}.`;
      } else {
        statusText.innerText = "Project investment status is unavailable.";
      }
    }
  }

  function openModal(){
    const cfg = projectConfig() || {};
    if ($("amountInput")) $("amountInput").value = "";

    const min = typeof window.getMinStake === "function"
      ? Number(window.getMinStake(requestedProject))
      : 0;

    if ($("minHint")) {
      $("minHint").innerText = min > 0
        ? `Minimum stake: ${min} Pi`
        : "Minimum stake is determined by the active investment contract.";
    }

    if ($("durationSelect")) {
      $("durationSelect").innerHTML = "";
      (Array.isArray(cfg.durations) ? cfg.durations : [30,60,90]).forEach(d => {
        const o = document.createElement("option");
        o.value = d;
        o.textContent = `${d} Days`;
        $("durationSelect").appendChild(o);
      });
    }

    $("stakeModal") && ($("stakeModal").style.display = "flex");
  }

  function closeModal(){ if ($("stakeModal")) $("stakeModal").style.display = "none"; }
  function closeSuccess(){ if ($("successModal")) $("successModal").style.display = "none"; }
  function openInfo(){ if ($("infoModal")) $("infoModal").style.display = "flex"; }
  function closeInfo(){ if ($("infoModal")) $("infoModal").style.display = "none"; }
  function closeWithdraw(){ if ($("withdrawModal")) $("withdrawModal").style.display = "none"; }
  function openCapitalModal(){ if ($("capitalModal")) $("capitalModal").style.display = "flex"; }
  function closeCapitalModal(){ if ($("capitalModal")) $("capitalModal").style.display = "none"; }

  async function openWithdrawModal(){
    if ($("availableBalance")) $("availableBalance").innerText = "Available: 0.00 Pi";
    if ($("withdrawModal")) $("withdrawModal").style.display = "flex";
  }

  async function confirmStake(){
    const project = await resolveProject();
    const status = clean(project.status).toLowerCase();

    if (!isMainnet()) {
      alertUser("Mainnet Only", "Investment is available only on ALBUKHR Mainnet.");
      return;
    }

    if (status !== "active") {
      alertUser(
        "Investment Unavailable",
        status === "approved"
          ? "This project is approved but not active for investment yet."
          : "This project is not currently available for investment."
      );
      return;
    }

    if (typeof window.addStake !== "function") {
      alertUser("Stake Unavailable", "The staking engine is not available.");
      return;
    }

    const amount = Number($("amountInput")?.value);
    const duration = Number($("durationSelect")?.value);
    const btn = $("stakeModal")?.querySelector(".primary");

    if (btn) {
      btn.disabled = true;
      btn.innerText = "Processing...";
    }

    try {
      const result = await window.addStake({
        project: requestedProject,
        amount,
        duration
      });

      if (result?.error) {
        alertUser("Stake Unavailable", result.error);
        return;
      }

      if ($("successText")) {
        $("successText").innerText =
          `Your ${amount} Pi investment was accepted by the authoritative system.`;
      }
      closeModal();
      if ($("successModal")) $("successModal").style.display = "flex";
      await load();
    } catch (e) {
      alertUser("Stake Failed", e?.message || "Unable to create stake.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Confirm";
      }
    }
  }

  async function confirmWithdraw(){
    alertUser(
      "Withdrawal Unavailable",
      "Reward withdrawals are not enabled until the authoritative rewards/withdrawal contract is deployed."
    );
  }

  async function confirmCapitalWithdraw(){
    alertUser(
      "Capital Withdrawal Unavailable",
      "Capital withdrawals are not enabled until the authoritative withdrawal contract is deployed."
    );
  }

  async function load(){
    try {
      const project = await resolveProject();
      applyProjectUI(project);

      if ($("aStake")) $("aStake").innerText = "0.00 Pi";
      if ($("aReward")) $("aReward").innerText = "0.00 Pi";

      if ($("projectHistory")) {
        $("projectHistory").innerHTML =
          `<div style="text-align:center;padding:20px;color:#777">` +
          `${clean(project.title || project.name) || "ALBUKHR Project"}<br><br>` +
          `No authoritative user transactions available yet` +
          `</div>`;
      }
    } catch (e) {
      console.warn("ALBUKHR Project load:", e);
      if ($("stakeStatus")) {
        $("stakeStatus").innerText = "Project data could not be loaded.";
      }
    }
  }

  window.manualRefresh = load;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.closeSuccess = closeSuccess;
  window.openInfo = openInfo;
  window.closeInfo = closeInfo;
  window.openWithdrawModal = openWithdrawModal;
  window.closeWithdraw = closeWithdraw;
  window.openCapitalModal = openCapitalModal;
  window.closeCapitalModal = closeCapitalModal;
  window.confirmStake = confirmStake;
  window.confirmWithdraw = confirmWithdraw;
  window.confirmCapitalWithdraw = confirmCapitalWithdraw;

  window.AlbukhrProjectPage = { load, resolveProject };

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      if (window.AlbukhrPiAuth?.ensurePiAuth) {
        await window.AlbukhrPiAuth.ensurePiAuth();
      }
    } catch (e) {
      console.warn("ALBUKHR Project auth:", e);
    }

    await load();
  });
})(window, document);
