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
  const requestedProject = (
  params.get("project") ||
  params.get("slug") ||
  params.get("project_code") ||
  params.get("project_id") ||
  ""
).trim();

let resolvedProjectKey = "";

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
  if(typeof window.getProjectConfig !== "function") return null;

  return window.getProjectConfig(
    resolvedProjectKey || requestedProject
  );
  }

  async function loadRegistry(){
    if (typeof window.loadProjectRegistry !== "function") return null;
    return window.loadProjectRegistry();
  }

   async function resolveProjectKey(){

  if(typeof window.getProjectConfig !== "function"){
    return "";
  }

  const value = clean(requestedProject);

  if(!value){
    return "";
  }

  /*
   * Resolve from the local project catalog FIRST.
   *
   * This prevents a slow/failed registry request from
   * preventing an already-known project such as Raheem
   * from opening.
   */
  const configs = window.PROJECT_CONFIG;

  if(configs && typeof configs === "object"){

    const wanted = value.toLowerCase();

    for(const key of Object.keys(configs)){

      const cfg = configs[key] || {};

      if(
        String(key).toLowerCase() === wanted ||
        clean(cfg.project_id).toLowerCase() === wanted ||
        clean(cfg.project_code).toLowerCase() === wanted ||
        clean(cfg.slug).toLowerCase() === wanted ||
        clean(cfg.title).toLowerCase() === wanted
      ){

        return key;

      }

    }

  }

  /*
   * getProjectConfig() also supports project code,
   * slug and title matching.
   */
  const cfg =
    window.getProjectConfig(value);

  if(
    cfg &&
    (
      cfg.project_code ||
      cfg.project_id ||
      cfg.slug
    )
  ){

    return cfg.key || value;

  }

  return "";
   }

  async function resolveProject(){

  /*
   * Resolve the project immediately from the catalog.
   * Do NOT block project-page rendering on the registry RPC.
   */
  resolvedProjectKey =
    await resolveProjectKey();

  if(!resolvedProjectKey){

    throw new Error(
      "Project could not be identified from the page URL."
    );

  }

  const cfg =
    projectConfig();

  if(!cfg){

    throw new Error(
      "Project configuration is unavailable."
    );

  }

  let project = {
    ...cfg
  };

  /*
   * Registry enrichment is optional.
   *
   * If the authoritative registry is available,
   * merge its metadata.
   *
   * If it fails, the known project configuration
   * remains usable and the page still renders.
   */
  try{

    await loadRegistry();

    if(typeof window.getProjectMeta === "function"){

      const meta =
        await window.getProjectMeta(
          cfg.project_code ||
          requestedProject
        );

      if(meta){

        project = {
          ...cfg,
          ...meta
        };

      }

    }

  }catch(_){

    /*
     * Do not prevent a known registered/catalog project
     * from rendering because of a registry/network error.
     */

  }

  return {
    ...project,

    network:
      clean(
        project.network ||
        network()
      ).toLowerCase(),

    status:
      clean(
        project.status
      ).toLowerCase()
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
      ? Number(window.getMinStake(
  resolvedProjectKey || requestedProject
))
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
        project: resolvedProjectKey,
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

      const totals = typeof window.getProjectTotals === "function"
        ? await window.getProjectTotals(
  resolvedProjectKey || requestedProject
)
        : {stake:0,reward:0};

      if ($("aStake")) $("aStake").innerText = `${(Number(totals.stake)||0).toFixed(2)} Pi`;
      if ($("aReward")) $("aReward").innerText = `${(Number(totals.reward)||0).toFixed(2)} Pi`;

      if ($("projectHistory")) {
        const rows = typeof window.getProjectStakes === "function"
          ? await window.getProjectStakes(
  resolvedProjectKey || requestedProject
)
          : [];
        if (!rows.length) {
          $("projectHistory").innerHTML =
            `<div style="text-align:center;padding:20px;color:#777">` +
            `${clean(project.title || project.name) || "ALBUKHR Project"}<br><br>` +
            `No investment transactions yet` +
            `</div>`;
        } else {
          $("projectHistory").innerHTML = rows.map(row => {
            const amount = (Number(row.amount)||0).toFixed(2);
            const reward = (Number(row.reward_amount)||0).toFixed(2);
            const status = clean(row.status).toUpperCase();
            const unlock = row.unlock_at ? new Date(row.unlock_at).toLocaleDateString() : "—";
            return `<div style="padding:12px;border-bottom:1px solid #eee">` +
              `<strong>${amount} Pi</strong> • ${Number(row.duration_days)||0} Days<br>` +
              `<span>Reward: ${reward} Pi • ${status}</span><br>` +
              `<small>Unlock: ${unlock}</small>` +
              `</div>`;
          }).join("");
        }
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
