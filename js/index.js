(function(){
"use strict";

/* =======================================================
   DOCK NAVIGATION
======================================================= */

let lastScroll=0;
const threshold=10;
const dock=document.querySelector(".dock-nav");

function onScroll(){

  if(!dock) return;

  const current=window.pageYOffset;

  if(Math.abs(current-lastScroll)<=threshold) return;

  dock.classList.toggle("hide",current>lastScroll);

  lastScroll=current;
}

window.addEventListener(
  "scroll",
  onScroll,
  {passive:true}
);

const currentPage=
  location.pathname.split("/").pop() ||
  "index.html";

document
  .querySelectorAll(".dock-item")
  .forEach(link=>{

    if(
      link.getAttribute("href")===
      currentPage
    ){

      link.classList.add("active");

    }

  });

/* =======================================================
   DRAWER
======================================================= */

function openDrawer(){

  document
    .getElementById("sideDrawer")
    ?.classList.add("open");

  document
    .getElementById("drawerOverlay")
    ?.classList.add("show");
}

function closeDrawer(){

  document
    .getElementById("sideDrawer")
    ?.classList.remove("open");

  document
    .getElementById("drawerOverlay")
    ?.classList.remove("show");
}

window.openDrawer=openDrawer;
window.closeDrawer=closeDrawer;

document.addEventListener(
  "DOMContentLoaded",
  ()=>{

    document
      .querySelector(".menu-icon")
      ?.addEventListener(
        "click",
        openDrawer
      );

  }
);

/* -------------------------------------------------------
   ASSET VISIBILITY
   Session memory only: no LocalStorage persistence.
------------------------------------------------------- */

let assetsHidden=false;

function applyVisibility(){

  document
    .getElementById("homeStake")
    ?.classList.toggle(
      "hidden-amount",
      assetsHidden
    );

  document
    .getElementById("homeReward")
    ?.classList.toggle(
      "hidden-amount",
      assetsHidden
    );

  document
    .querySelectorAll(".asset-stake")
    .forEach(el=>
      el.classList.toggle(
        "hidden-amount",
        assetsHidden
      )
    );
}

window.toggleAssetsVisibility=function(){

  assetsHidden=!assetsHidden;

  applyVisibility();
};

window.applyVisibility=applyVisibility;


/* -------------------------------------------------------
   POPULAR PROJECTS — LOADING / EMPTY STATE
------------------------------------------------------- */

function showPopularProjectsMessage(message) {
  const container = document.getElementById("popularProjects");
  if (!container) return;

  container.replaceChildren();
  container.setAttribute("aria-busy", "false");

  const notice = document.createElement("div");
  notice.className = "project-loading-error";
  notice.setAttribute("role", "status");
  notice.textContent = message;

  container.appendChild(notice);
}

/* -------------------------------------------------------
   MAINNET HOME DATA HELPERS

   This path is deliberately separate from the existing Testnet
   loader below. It consumes only the Mainnet public aggregate RPC
   and the signed-in user's Mainnet-only /api/my-stakes endpoint.
------------------------------------------------------- */

function getHomeNetwork(){
  const coreNetwork = String(
    window.ALBUKHR_SUPABASE?.network || ""
  ).trim().toLowerCase();

  if(coreNetwork === "mainnet" || coreNetwork === "testnet"){
    return coreNetwork;
  }

  const environmentNetwork = String(
    window.ALBukhrEnvironment?.getNetwork?.() || ""
  ).trim().toLowerCase();

  return environmentNetwork;
}

function resolveMainnetStakeProjectKey(stake){
  if(!stake || typeof stake !== "object") return null;

  const candidates = [
    stake.project_code,
    stake.project_id,
    stake.project,
    stake.slug
  ].filter(Boolean);

  const projectConfig = window.ALBukhrProjectConfig;

  for(const candidate of candidates){
    const match =
      typeof projectConfig?.find === "function"
        ? projectConfig.find(candidate)
        : null;

    if(match && match.key){
      if(
        !match.network ||
        String(match.network).toLowerCase() === "mainnet"
      ){
        return match.key;
      }
    }

    if(
      typeof PROJECT_CONFIG !== "undefined" &&
      PROJECT_CONFIG[candidate]
    ){
      const cfg = PROJECT_CONFIG[candidate];
      if(
        !cfg.network ||
        String(cfg.network).toLowerCase() === "mainnet"
      ){
        return candidate;
      }
    }
  }

  return null;
}

async function loadMainnetHome(){
  const projectConfig = window.ALBukhrProjectConfig;

  /*
   * Await the same registry promise that project-config.js starts
   * during page initialization. If the aggregate RPC is unavailable,
   * project-config.js falls back to the old Mainnet catalogue RPC.
   */
  if(typeof projectConfig?.loadRegistry === "function"){
    let registry = await projectConfig.loadRegistry();

    /* A first call can occur before Supabase Core finishes initializing. */
    if(!registry?.ok){
      registry = await projectConfig.loadRegistry({ force:true });
    }

    if(!registry?.ok){
      console.warn(
        "ALBUKHR Mainnet project registry is unavailable; keeping the available catalogue.",
        registry?.error || null
      );
    }
  }

  const globalMap = {};
  const userMap = {};
  let totalStake = 0;
  let totalReward = 0;

  if(typeof PROJECT_CONFIG !== "undefined"){
    Object.keys(PROJECT_CONFIG).forEach(project=>{
      const config = PROJECT_CONFIG[project];
      if(!config) return;

      if(
        config.network &&
        String(config.network).trim().toLowerCase() !== "mainnet"
      ){
        return;
      }

      const metricsAvailable =
        config.investment_metrics_available === true;

      globalMap[project] = {
        total: metricsAvailable
          ? Math.max(0, Number(config.total_invested_pi) || 0)
          : 0,
        investors: metricsAvailable
          ? Math.max(0, Number(config.investor_count) || 0)
          : 0,
        metricsAvailable
      };
    });
  }

  /*
   * The API Core and staking engine return the authenticated user's
   * own Mainnet stakes. Raw database fields use project_code and
   * reward_amount; they do not contain the legacy s.project property.
   * Keep this mapping local to Home so Investor Dashboard and Unified
   * Transactions continue receiving the unchanged raw stake contract.
   */
  if(typeof getAllStakesMerged === "function"){
    let stakes = [];
    let withdrawals = [];

    try{
      const rows = await getAllStakesMerged();
      stakes = Array.isArray(rows) ? rows : [];
    }catch(error){
      console.warn("ALBUKHR Mainnet personal stakes unavailable:", error);
    }

    /*
     * Use the existing authenticated Mainnet withdrawal-history route
     * to calculate remaining principal/reward. Pending, approved and paid
     * withdrawals reserve or consume the same amount used by the database
     * withdrawal validator (requested_amount + fee_amount).
     */
    try{
      if(typeof window.AlbukhrApi?.get === "function"){
        const rows = await window.AlbukhrApi.get(
          "/api/my-withdrawals?network=mainnet"
        );
        withdrawals = Array.isArray(rows) ? rows : [];
      }
    }catch(error){
      console.warn("ALBUKHR Mainnet withdrawal history unavailable:", error);
    }

    const withdrawalDeductions = new Map();

    withdrawals.forEach(withdrawal=>{
      if(!withdrawal || typeof withdrawal !== "object") return;
      if(String(withdrawal.network || "mainnet").toLowerCase() !== "mainnet") return;

      const status = String(withdrawal.status || "").trim().toLowerCase();
      if(!["pending", "approved", "paid"].includes(status)) return;

      const stakeId = String(withdrawal.stake_id || "").trim();
      if(!stakeId) return;

      const type = String(withdrawal.withdrawal_type || "").trim().toLowerCase();
      if(type !== "capital" && type !== "reward") return;

      const requested = Number(withdrawal.requested_amount) || 0;
      const fee = Number(withdrawal.fee_amount) || 0;
      const deduction = Math.max(0, requested + fee);

      if(!withdrawalDeductions.has(stakeId)){
        withdrawalDeductions.set(stakeId, {capital:0, reward:0});
      }

      withdrawalDeductions.get(stakeId)[type] += deduction;
    });

    stakes.forEach(stake=>{
      if(!stake || typeof stake !== "object") return;

      const recordNetwork = String(stake.network || "mainnet").trim().toLowerCase();
      if(recordNetwork !== "mainnet") return;

      const status = String(stake.status || "").trim().toLowerCase();
      if(!["active", "matured", "capital_withdrawn"].includes(status)) return;

      const projectKey = resolveMainnetStakeProjectKey(stake);
      if(!projectKey || !globalMap[projectKey]) return;

      const amount = Number(stake.amount);
      if(!Number.isFinite(amount) || amount <= 0) return;

      const deductions = withdrawalDeductions.get(String(stake.id || "")) || {
        capital:0,
        reward:0
      };

      if(status === "active" || status === "matured"){
        const remainingCapital = Math.max(0, amount - deductions.capital);
        if(remainingCapital > 0){
          userMap[projectKey] = (userMap[projectKey] || 0) + remainingCapital;
          totalStake += remainingCapital;
        }
      }

      const reward = Number(
        stake.reward_amount != null
          ? stake.reward_amount
          : stake.reward
      ) || 0;

      const remainingReward = Math.max(0, reward - deductions.reward);
      totalReward += remainingReward;
    });
  }

  document
    .getElementById("homeStake")
    ?.replaceChildren(
      document.createTextNode(
        Math.max(0, totalStake).toFixed(2) + " Pi"
      )
    );

  document
    .getElementById("homeReward")
    ?.replaceChildren(
      document.createTextNode(
        Math.max(0, totalReward).toFixed(2) + " Pi"
      )
    );

  if(typeof renderPopular === "function"){
    renderPopular(globalMap);
  }

  if(typeof renderAssets === "function"){
    renderAssets(userMap, globalMap);
  }

  applyVisibility();
}

/* -------------------------------------------------------
   HOME DATA
------------------------------------------------------- */

async function loadHome(){

  try{

    /* Mainnet-only Stage 2 path. Testnet remains on its old path. */
    if(getHomeNetwork() === "mainnet"){
      await loadMainnetHome();
      return;
    }

    /* -----------------------------------------------------
       EXISTING TESTNET / LEGACY HOME DATA FLOW
       Kept unchanged by the Mainnet-only Stage 2 work.
    ----------------------------------------------------- */

    if (typeof getAllStakesMerged !== "function") {
      console.warn("getAllStakesMerged missing");

      // Projects can still render from the existing catalog.
      renderPopular({});

      return;
    }

    let stakes =
      await getAllStakesMerged();

    const globalStakes =
      typeof getGlobalStakes === "function"
        ? await getGlobalStakes()
        : [];

    if(!Array.isArray(stakes))
      stakes=[];

    const userMap={};
    const globalMap={};
    const popularMap={};
    const countMap={};

    let totalStake=0;
    let totalReward=0;

    stakes.forEach(s=>{

      if(!s||!s.project)
        return;

      const type=
        s.type||"stake";

      const amount=
        Number(s.amount)||0;

      if(type==="stake"){

        totalStake+=amount;

        userMap[s.project]=
          (userMap[s.project]||0)+amount;

        if(!globalMap[s.project])
          globalMap[s.project]={
            total:0,
            investors:0
          };

        globalMap[s.project].total+=amount;

        const reward=
          Number(s.reward)||0;

        const withdrawn=
          Number(s.withdrawnReward)||0;

        totalReward+=
          Math.max(
            0,
            reward-withdrawn
          );
      }

      if(type==="capital"){

        totalStake-=
          Math.abs(amount);

        userMap[s.project]=
          (userMap[s.project]||0)-
          Math.abs(amount);

        if(globalMap[s.project])
          globalMap[s.project].total-=
            Math.abs(amount);
      }

      countMap[s.project]=
        (countMap[s.project]||0)+1;

    });

    if(Array.isArray(globalStakes)){

      globalStakes.forEach(s=>{

        if(
          !s||
          s.type!=="stake"||
          !s.project
        )
          return;

        if(!popularMap[s.project])
          popularMap[s.project]={
            total:0,
            investors:0
          };

        popularMap[s.project].total+=
          Number(s.amount)||0;

      });

    }

    Object.keys(globalMap).forEach(
      project=>{

        globalMap[project].investors=
          countMap[project]||0;

      }
    );

    document
      .getElementById("homeStake")
      ?.replaceChildren(
        document.createTextNode(
          Math.max(
            0,
            totalStake
          ).toFixed(2)+" Pi"
        )
      );

    document
      .getElementById("homeReward")
      ?.replaceChildren(
        document.createTextNode(
          totalReward.toFixed(2)+" Pi"
        )
      );

    if(typeof renderPopular==="function")
      renderPopular(popularMap);

    if(typeof renderAssets==="function")
      renderAssets(
        userMap,
        globalMap
      );

    applyVisibility();


  } catch (err) {
    console.error("loadHome error:", err);

    // Clear the loading skeleton and show the existing project catalog.
    // Do not leave the user staring at an endless loading state.
    renderPopular({});
  }

}

/* =======================================================
   POPULAR PROJECTS
   PROJECT_CONFIG is the project catalog.
   The supplied map contains live/global statistics where available.
   Registered projects remain visible even when they have no investments.
======================================================= */

function renderPopular(globalMap) {
  const container = document.getElementById("popularProjects");
  if (!container) return;

  if (typeof PROJECT_CONFIG === "undefined") {
    showPopularProjectsMessage(
      "Unable to load projects. Please refresh and try again."
    );
    return;
  }

  container.replaceChildren();
  container.setAttribute("aria-busy", "false");

  const entries=Object.keys(PROJECT_CONFIG).map(project=>[
    project,
    (globalMap&&globalMap[project])||{
      total:0,
      investors:0
    }
  ]);

  entries
    .sort((a,b)=>{
      const totalDifference =
        (Number(b[1]?.total)||0) - (Number(a[1]?.total)||0);

      if(totalDifference !== 0) return totalDifference;

      /* Investor-count tie-breaker is a Mainnet aggregate-only rule. */
      if(getHomeNetwork() === "mainnet"){
        const investorDifference =
          (Number(b[1]?.investors)||0) - (Number(a[1]?.investors)||0);
        if(investorDifference !== 0) return investorDifference;

        const aSlot = Number(a[0] && PROJECT_CONFIG[a[0]]?.core_slot);
        const bSlot = Number(b[0] && PROJECT_CONFIG[b[0]]?.core_slot);
        const safeASlot = Number.isFinite(aSlot) && aSlot > 0 ? aSlot : Number.MAX_SAFE_INTEGER;
        const safeBSlot = Number.isFinite(bSlot) && bSlot > 0 ? bSlot : Number.MAX_SAFE_INTEGER;
        if(safeASlot !== safeBSlot) return safeASlot - safeBSlot;
      }

      return 0;
    })
    .slice(0,10)
    .forEach(([project,data],index)=>{

      const config=PROJECT_CONFIG[project];

      if(!config) return;

      const div=document.createElement("div");

      div.className="popular-card";

      div.setAttribute(
        "data-rank",
        "#"+(index+1)
      );

      div.onclick=function(){
        const projectKey =
          PROJECT_CONFIG[project]?.slug ||
          PROJECT_CONFIG[project]?.project_code ||
          project;

        window.location.href =
          "project.html?project="+
          encodeURIComponent(projectKey);
      };

      const amountText = Number(data.total||0).toFixed(2) + " Pi";
      const metricText = data.metricsAvailable === false
        ? "Investment metrics unavailable"
        : data.metricsAvailable === true
          ? amountText + " · " + (Number(data.investors)||0) + " Investors"
          : amountText;

      div.innerHTML=
        '<div class="popular-icon">'+
        (config.icon||"")+
        '</div>'+
        '<div class="popular-name">'+
        config.title+
        '</div>'+
        '<div class="popular-amount">'+
        metricText+
        '</div>';

      container.appendChild(div);
    });

  if (container.children.length === 0) {
    showPopularProjectsMessage(
      "No projects are available right now."
    );
  }
}

/* =======================================================
   ASSETS
   Existing card structure retained.
======================================================= */

function renderAssets(userMap,globalMap){

  if(typeof PROJECT_CONFIG==="undefined")
    return;

  const container=
    document.getElementById(
      "assetsContainer"
    );

  if(!container)
    return;

  container.innerHTML="";

  const merged=
    Object.keys(PROJECT_CONFIG)
      .map(project=>({

        name:project,

        config:
          PROJECT_CONFIG[project],

        globalTotal:
          Number(
            globalMap[project]?.total
          )||0,

        userAmount:
          Math.max(
            0,
            Number(
              userMap[project]
            )||0
          )

      }));

  merged.sort((a,b)=>{

    if(
      a.userAmount>0&&
      b.userAmount===0
    )
      return -1;

    if(
      a.userAmount===0&&
      b.userAmount>0
    )
      return 1;

    if(
      a.userAmount!==
      b.userAmount
    )
      return (
        b.userAmount-
        a.userAmount
      );

    return (
      b.globalTotal-
      a.globalTotal
    );

  });

  merged.forEach(item=>{

    if(!item.config)
      return;

    const div=
      document.createElement("div");

    div.className=
      "asset-item";

    div.onclick=function(){
      const projectKey =
        item.config?.slug ||
        item.config?.project_code ||
        item.name;

      window.location.href =
        "project.html?project="+
        encodeURIComponent(projectKey);
    };

    div.innerHTML=
      '<div class="asset-icon">'+
      (item.config.icon||"")+
      '</div>'+
      '<div class="asset-left">'+
      '<div class="asset-header">'+
      '<div class="asset-info">'+
      '<div class="asset-name">'+
      item.config.title+
      '</div>'+
      '<div class="asset-stake">'+
      (
        item.userAmount>0
        ?item.userAmount.toFixed(2)+
          " Pi Staked"
        :"Not Staked"
      )+
      '</div>'+
      '</div>'+
      '<div class="asset-mini-chart">'+
      '<svg viewBox="0 0 120 36" preserveAspectRatio="none">'+
      '<polyline fill="none" stroke="'+
      (
        item.userAmount>0
        ?" #19b36b"
        :"#b8b8b8"
      ).trim()+
      '" stroke-width="2.2" points="0,28 15,26 30,24 45,22 60,18 75,20 90,14 105,12 120,8"/>'+
      '</svg>'+
      '</div>'+
      '</div>'+
      '<div class="asset-status">'+
      (
        item.userAmount>0
        ?"🟢 Active"
        :"⚪ Inactive"
      )+
      '</div>'+
      '</div>';

    container.appendChild(div);

  });
}

/* -------------------------------------------------------
   AUTH — shared Pi Auth Core only.
   No LocalStorage auth state.
------------------------------------------------------- */

async function initializeAuthenticatedHome(){

  if(!window.AlbukhrPiAuth){

    window.location.replace(
      "login.html"
    );

    return;
  }

  const user=
    await window.AlbukhrPiAuth
      .requireAuth(
        "login.html"
      );

  if(!user)
    return;

  const el=
    document.getElementById(
      "piUser"
    );

  if(el)
    el.textContent=
      user.username;

  await loadHome();

  console.info(
    "🚀 HOME LOAD",
    {
      uid:user.uid,

      username:user.username,

      environment:
        window.ALBUKHR_SUPABASE
          ?.environment,

      network:
        window.ALBUKHR_SUPABASE
          ?.network
    }
  );
}

window.openAlbukhrAI=function(){

  const note=
    document.getElementById(
      "aiDevNote"
    );

  if(!note)
    return;

  note.classList.add(
    "show"
  );

  window.setTimeout(
    ()=>
      note.classList.remove(
        "show"
      ),
    2500
  );
};

/* -------------------------------------------------------
   AI button position — memory only;
   no LocalStorage.
------------------------------------------------------- */

const ai=
  document.getElementById(
    "albukhrAI"
  );

let isDragging=false;
let offsetX=0;
let offsetY=0;

function startDrag(e){

  if(!ai)
    return;

  isDragging=true;

  const point=
    e.touches
      ?e.touches[0]
      :e;

  const rect=
    ai.getBoundingClientRect();

  offsetX=
    point.clientX-
    rect.left;

  offsetY=
    point.clientY-
    rect.top;
}

function drag(e){

  if(
    !isDragging||
    !ai
  )
    return;

  const point=
    e.touches
      ?e.touches[0]
      :e;

  ai.style.left=
    (
      point.clientX-
      offsetX
    )+"px";

  ai.style.top=
    (
      point.clientY-
      offsetY
    )+"px";

  ai.style.right=
    "auto";

  ai.style.bottom=
    "auto";
}

function stopDrag(){

  if(
    !isDragging||
    !ai
  )
    return;

  isDragging=false;

  const rect=
    ai.getBoundingClientRect();

  ai.style.left=
    (
      rect.left<
      window.innerWidth/2
      ?10
      :window.innerWidth-
       rect.width-
       10
    )+"px";

  window.setTimeout(
    ()=>
      ai.classList.add(
        "minimized"
      ),
    2000
  );
}

if(ai){

  ai.addEventListener(
    "touchstart",
    startDrag,
    {passive:true}
  );

  ai.addEventListener(
    "mousedown",
    startDrag
  );

  document.addEventListener(
    "touchmove",
    drag,
    {passive:true}
  );

  document.addEventListener(
    "mousemove",
    drag
  );

  document.addEventListener(
    "touchend",
    stopDrag
  );

  document.addEventListener(
    "mouseup",
    stopDrag
  );

  ai.addEventListener(
    "click",
    ()=>
      ai.classList.remove(
        "minimized"
      )
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initializeAuthenticatedHome
);

})();
